/**
 * Lighting — 2D light accumulation, bloom and grade for Candy in Wonderland.
 *
 * The old glow layer was additive only: it could brighten a candle but nothing
 * in the scene ever went dark, so every part of the courtyard read at the same
 * flat exposure. This does what a real renderer does — accumulate every light
 * into an offscreen buffer, then MULTIPLY the finished scene by that buffer.
 * Unlit ground falls to the ambient tint, lit ground keeps its full colour, and
 * Candy is lit by whatever she is standing near.
 *
 * Per frame:
 *
 *   1. clear the light buffer to the level's ambient colour
 *   2. add every visible light into it with 'lighter' (they accumulate, and
 *      overlapping lights clip past white, which is what makes hot cores)
 *   3. multiply the scene by the buffer          -> shape and depth
 *   4. blur the lights alone and add them back    -> bloom, only on real lights
 *   5. lift the blacks slightly and grade         -> tone map
 *
 * Costs are kept honest:
 *   • the buffer runs at half resolution — light falloff is smooth, so nobody
 *     can see the difference, and it is a quarter of the fill
 *   • lights are drawn from a cached radial sprite per colour, not a fresh
 *     createRadialGradient() every light every frame
 *   • off-screen lights are culled before they touch the buffer
 */

export interface BakedLight {
  /** Normalised position within the background plate, 0..1. */
  u: number;
  v: number;
  /** Radius in world pixels. */
  radius: number;
  color: [number, number, number];
  intensity: number;
  /** 0 = steady, 1 = wild. Candles flicker, a rift breathes. */
  flicker: number;
  kind: string;
}

export interface Light {
  x: number;
  y: number;
  radius: number;
  color: [number, number, number];
  intensity: number;
  flicker: number;
  /** Keeps two candles side by side from flickering in lockstep. */
  seed: number;
}

export interface LightingQuality {
  /** Light buffer resolution as a fraction of the view. */
  bufferScale: number;
  /** Bloom blur radius in buffer pixels. 0 disables bloom. */
  bloomRadius: number;
  bloomStrength: number;
}

export const QUALITY: Record<'low' | 'medium' | 'high', LightingQuality> = {
  low:    { bufferScale: 0.34, bloomRadius: 0,  bloomStrength: 0    },
  medium: { bufferScale: 0.50, bloomRadius: 10, bloomStrength: 0.34 },
  high:   { bufferScale: 0.60, bloomRadius: 15, bloomStrength: 0.46 },
};

/** Does this browser support canvas filters? Safari only got them in 16.4. */
function supportsFilter(): boolean {
  try {
    const c = document.createElement('canvas').getContext('2d')!;
    c.filter = 'blur(2px)';
    return c.filter !== 'none';
  } catch {
    return false;
  }
}

export class Lighting {
  private buf: HTMLCanvasElement;
  private bctx: CanvasRenderingContext2D;
  private bloom: HTMLCanvasElement;
  private bloomCtx: CanvasRenderingContext2D;
  /** Second bloom buffer: the blur is done once, into here, at buffer res. */
  private blur: HTMLCanvasElement;
  private blurCtx: CanvasRenderingContext2D;

  /** One 128px radial sprite per light colour — a light "cookie". */
  private cookies = new Map<string, HTMLCanvasElement>();

  private q: LightingQuality = QUALITY.medium;
  private canFilter = supportsFilter();
  private viewW = 1;
  private viewH = 1;

  /** Lights considered this frame, before culling. Useful in the debug HUD. */
  lastLightCount = 0;
  lastDrawnCount = 0;

  constructor() {
    this.buf = document.createElement('canvas');
    this.bctx = this.buf.getContext('2d', { alpha: false })!;
    this.bloom = document.createElement('canvas');
    this.bloomCtx = this.bloom.getContext('2d')!;
    this.blur = document.createElement('canvas');
    this.blurCtx = this.blur.getContext('2d')!;
    this.resize(1, 1);
  }

  setQuality(q: LightingQuality) {
    this.q = q;
    this.resize(this.viewW, this.viewH);
  }

  resize(viewW: number, viewH: number) {
    this.viewW = Math.max(1, viewW);
    this.viewH = Math.max(1, viewH);
    const w = Math.max(1, Math.round(this.viewW * this.q.bufferScale));
    const h = Math.max(1, Math.round(this.viewH * this.q.bufferScale));
    if (this.buf.width !== w || this.buf.height !== h) {
      this.buf.width = w;
      this.buf.height = h;
      this.bloom.width = w;
      this.bloom.height = h;
      this.blur.width = w;
      this.blur.height = h;
    }
  }

  /**
   * Radial falloff sprite for a colour, built once and reused. The curve is
   * deliberately not linear — a linear ramp reads as a flat disc, this one
   * has a hot core and a long tail, like a real point light.
   */
  private cookie(color: [number, number, number]): HTMLCanvasElement {
    const key = `${color[0]},${color[1]},${color[2]}`;
    const hit = this.cookies.get(key);
    if (hit) return hit;

    const S = 128;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const cx = c.getContext('2d')!;
    const grd = cx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    const [r, g, b] = color;
    grd.addColorStop(0.00, `rgba(${r},${g},${b},1)`);
    grd.addColorStop(0.12, `rgba(${r},${g},${b},0.82)`);
    grd.addColorStop(0.32, `rgba(${r},${g},${b},0.40)`);
    grd.addColorStop(0.62, `rgba(${r},${g},${b},0.12)`);
    grd.addColorStop(1.00, `rgba(${r},${g},${b},0)`);
    cx.fillStyle = grd;
    cx.fillRect(0, 0, S, S);
    this.cookies.set(key, c);
    return c;
  }

  /**
   * Composite lighting over the scene already drawn into `ctx`.
   *
   * `ctx` must be in screen space (no camera transform active) and sized in
   * logical pixels — the device-pixel scale is applied by the caller's
   * transform, so the buffer stretches to fit it for free.
   */
  render(
    ctx: CanvasRenderingContext2D,
    lights: Light[],
    ambient: [number, number, number],
    cam: { x: number; y: number; zoom: number },
    time: number,
  ) {
    const { viewW, viewH } = this;
    const s = this.buf.width / viewW; // buffer pixels per logical pixel
    const b = this.bctx;

    // ── 1. ambient floor ─────────────────────────────────────────────────
    // Never black: this is the light that is in the scene before any lamp,
    // and pure black would just delete the artwork.
    b.globalCompositeOperation = 'source-over';
    b.fillStyle = `rgb(${ambient[0]},${ambient[1]},${ambient[2]})`;
    b.fillRect(0, 0, this.buf.width, this.buf.height);

    // ── 2. accumulate lights ─────────────────────────────────────────────
    // Both buffers are filled in ONE pass over the lights. The bloom buffer
    // gets the same cookies at a tighter radius and no ambient floor, which is
    // exactly "where the bright things are" — so the blur that follows never
    // has to threshold the scene.
    const wantBloom = this.q.bloomRadius > 0 && this.canFilter;
    const bl = this.bloomCtx;
    if (wantBloom) {
      bl.globalCompositeOperation = 'source-over';
      bl.clearRect(0, 0, this.bloom.width, this.bloom.height);
      bl.globalCompositeOperation = 'lighter';
    }

    b.globalCompositeOperation = 'lighter';
    this.lastLightCount = lights.length;
    let drawn = 0;

    for (const L of lights) {
      // Flicker: two offset sines beat against each other so it never loops
      // audibly-regularly the way a single sine does.
      const f = L.flicker
        ? 1 + (Math.sin(time * 0.19 + L.seed) * 0.6 + Math.sin(time * 0.47 + L.seed * 2.3) * 0.4) * L.flicker
        : 1;
      const radius = L.radius * cam.zoom * (0.97 + 0.03 * f);
      const sx = (L.x - cam.x) * cam.zoom;
      const sy = (L.y - cam.y) * cam.zoom;

      // Cull: nothing to add if the falloff never reaches the view.
      if (sx + radius < 0 || sy + radius < 0 || sx - radius > viewW || sy - radius > viewH) continue;

      const cookie = this.cookie(L.color);
      b.globalAlpha = Math.max(0, Math.min(1, L.intensity * f));
      const r = radius * s;
      b.drawImage(cookie, (sx * s) - r, (sy * s) - r, r * 2, r * 2);

      if (wantBloom) {
        // Tighter and dimmer: bloom should read as a halo around a source, not
        // as a second copy of the light.
        const br = r * 0.72;
        bl.globalAlpha = Math.max(0, Math.min(1, L.intensity * f * 0.85));
        bl.drawImage(cookie, (sx * s) - br, (sy * s) - br, br * 2, br * 2);
      }
      drawn++;
    }
    b.globalAlpha = 1;
    if (wantBloom) bl.globalAlpha = 1;
    this.lastDrawnCount = drawn;

    // ── 3. multiply the scene by the light buffer ────────────────────────
    // This is the step that creates shape. Everything the lights did not
    // reach falls to `ambient`; everything they did keeps its full value.
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(this.buf, 0, 0, viewW, viewH);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    // ── 4. bloom ─────────────────────────────────────────────────────────
    // ONE blur, at buffer resolution. The first version of this set ctx.filter
    // inside the light loop, which made the browser run a separate blur per
    // light — seventeen full blur passes a frame. Blurring the accumulated
    // buffer once is the same picture for a fraction of the cost, and doing it
    // at buffer resolution rather than at view resolution saves it again.
    if (wantBloom && drawn > 0) {
      const bx = this.blurCtx;
      bx.globalCompositeOperation = 'source-over';
      bx.clearRect(0, 0, this.blur.width, this.blur.height);
      bx.filter = `blur(${this.q.bloomRadius}px)`;
      bx.drawImage(this.bloom, 0, 0);
      bx.filter = 'none';

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.q.bloomStrength;
      ctx.drawImage(this.blur, 0, 0, viewW, viewH);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }
  }

  /**
   * Tone map: lift the crushed blacks back off the floor and push a gentle
   * colour grade through the midtones. Multiply alone drives shadows toward
   * pure black, which looks muddy on a phone in daylight; a small additive
   * lift keeps detail readable without flattening the contrast we just built.
   */
  grade(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    lift: [number, number, number],
    liftAmount: number,
  ) {
    if (liftAmount <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = liftAmount;
    ctx.fillStyle = `rgb(${lift[0]},${lift[1]},${lift[2]})`;
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }
}
