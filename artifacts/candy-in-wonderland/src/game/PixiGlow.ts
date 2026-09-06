/**
 * PixiGlow — WebGL lighting / atmosphere layer for Candy in Wonderland.
 *
 * Sits as a transparent canvas overlay on top of the Canvas-2D game canvas.
 * All sprites use BLEND_MODES.ADD (additive / "lighter") so they brighten the
 * scene beneath them — something Canvas 2D globalCompositeOperation cannot do
 * cleanly with complex draw sequences.
 *
 * Effects:
 *  • Candle halos        — warm amber/orange, pulsing flicker
 *  • Crack glow          — purple, slow pulse
 *  • Fountain bloom      — large blue-purple, breathing
 *  • Purple rift portal  — animated swirl (Level 1 only)
 *  • Ground sparks       — tiny purple fireflies, rise and fade
 *  • Vignette + edge fog — dark overlay (normal blend, screen-space)
 */

import * as PIXI from 'pixi.js';

const TILE = 48;

// ── Shared glow-texture factory ────────────────────────────────────────────────
// Draws a soft radial gradient on a temp Canvas, wraps as PIXI.Texture.
// Result is a white disc that fades to transparent — tint it any colour you like.
function makeGlowTex(r: number): PIXI.Texture {
  const size = r * 2;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0.0,  'rgba(255,255,255,1.0)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.6,  'rgba(255,255,255,0.25)');
  g.addColorStop(1.0,  'rgba(255,255,255,0.00)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return PIXI.Texture.from(c);
}

// ── Screen-space overlay (vignette + fog) texture ─────────────────────────────
function makeVignetteTex(W: number, H: number): PIXI.Texture {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(W/2, H/2, H*0.12, W/2, H/2, H*0.78);
  g.addColorStop(0,    'rgba(0,0,0,0)');
  g.addColorStop(0.5,  'rgba(0,0,0,0.12)');
  g.addColorStop(0.75, 'rgba(0,0,0,0.50)');
  g.addColorStop(1,    'rgba(0,0,0,0.84)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  return PIXI.Texture.from(c);
}

function makeTopFogTex(W: number, H: number): PIXI.Texture {
  const c = document.createElement('canvas');
  c.width = W; c.height = Math.ceil(H * 0.42);
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0,   'rgba(4,0,14,0.80)');
  g.addColorStop(0.6, 'rgba(4,0,14,0.18)');
  g.addColorStop(1,   'rgba(4,0,14,0.00)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  return PIXI.Texture.from(c);
}

function makeSideFogTex(W: number, H: number): PIXI.Texture {
  const c = document.createElement('canvas');
  c.width = Math.ceil(W * 0.22); c.height = H;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, c.width, 0);
  g.addColorStop(0,   'rgba(4,0,14,0.70)');
  g.addColorStop(1,   'rgba(4,0,14,0.00)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  return PIXI.Texture.from(c);
}

// ── Particle helper ────────────────────────────────────────────────────────────
interface Particle {
  s: PIXI.Sprite;
  vx: number; vy: number;
  life: number; maxLife: number;
  startX: number; startY: number;
}

// ── PixiGlow class ─────────────────────────────────────────────────────────────
export class PixiGlow {
  readonly app: PIXI.Application;

  // Camera-space container (translated with game camera each frame)
  private world: PIXI.Container;

  // Screen-space container (vignette, fog — never moves)
  private screen: PIXI.Container;

  // Glow textures (shared, cached)
  private texS: PIXI.Texture;  // 24 px radius
  private texM: PIXI.Texture;  // 48 px radius
  private texL: PIXI.Texture;  // 90 px radius
  private texXL: PIXI.Texture; // 150 px radius

  // Animated world-space sprites
  private candleSprites:  { s: PIXI.Sprite; baseAlpha: number }[] = [];
  private crackSprites:   PIXI.Sprite[] = [];
  private fountainSprites: PIXI.Sprite[] = [];
  private riftSprites:    PIXI.Sprite[] = [];
  private particleCont:   PIXI.Container;
  private particles:      Particle[] = [];

  private time = 0;
  private W: number;
  private H: number;

  constructor(host: HTMLElement, W: number, H: number) {
    this.W = W; this.H = H;

    this.app = new PIXI.Application({
      width: W, height: H,
      backgroundAlpha: 0,   // fully transparent — game canvas shows through
      antialias: false,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });

    const view = this.app.view as HTMLCanvasElement;
    view.style.cssText = `
      position:absolute; inset:0;
      width:100%; height:100%;
      pointer-events:none;
      z-index:16;
      opacity:0.72;
    `;
    host.appendChild(view);

    // Build glow textures
    this.texS  = makeGlowTex(24);
    this.texM  = makeGlowTex(48);
    this.texL  = makeGlowTex(90);
    this.texXL = makeGlowTex(150);

    // World container (moves with camera)
    this.world = new PIXI.Container();
    this.app.stage.addChild(this.world);

    // Particle container inside world
    this.particleCont = new PIXI.Container();
    this.world.addChild(this.particleCont);

    // Screen container (fixed position)
    this.screen = new PIXI.Container();
    this.app.stage.addChild(this.screen);

    this.buildScreenFx(W, H);
  }

  // ── Screen-space vignette + fog ─────────────────────────────────────────────
  private buildScreenFx(W: number, H: number) {
    this.screen.removeChildren();

    // Vignette
    const vig = new PIXI.Sprite(makeVignetteTex(W, H));
    vig.width = W; vig.height = H;
    this.screen.addChild(vig);

    // Top fog
    const topFog = new PIXI.Sprite(makeTopFogTex(W, H));
    topFog.width = W; topFog.height = Math.ceil(H * 0.42);
    this.screen.addChild(topFog);

    // Left fog
    const sideTex = makeSideFogTex(W, H);
    const fogL = new PIXI.Sprite(sideTex);
    fogL.width = Math.ceil(W * 0.22); fogL.height = H;
    this.screen.addChild(fogL);

    // Right fog (mirror)
    const fogR = new PIXI.Sprite(sideTex);
    fogR.scale.x = -1;
    fogR.x = W;
    fogR.width = Math.ceil(W * 0.22); fogR.height = H;
    this.screen.addChild(fogR);

    // Bottom fog
    const botH = Math.ceil(H * 0.22);
    const botC = document.createElement('canvas');
    botC.width = W; botC.height = botH;
    const bc = botC.getContext('2d')!;
    const bg = bc.createLinearGradient(0, 0, 0, botH);
    bg.addColorStop(0, 'rgba(2,0,8,0)');
    bg.addColorStop(1, 'rgba(2,0,8,0.7)');
    bc.fillStyle = bg;
    bc.fillRect(0, 0, W, botH);
    const botFog = new PIXI.Sprite(PIXI.Texture.from(botC));
    botFog.width = W; botFog.height = botH;
    botFog.y = H - botH;
    this.screen.addChild(botFog);

    // Purple ambient bloom from center (screen-space, subtle)
    const bloomC = document.createElement('canvas');
    bloomC.width = W; bloomC.height = H;
    const bctx = bloomC.getContext('2d')!;
    const bloomG = bctx.createRadialGradient(W/2, H*0.38, 0, W/2, H*0.38, H*0.42);
    bloomG.addColorStop(0,   'rgba(80,30,160,0.10)');
    bloomG.addColorStop(0.5, 'rgba(50,10,120,0.04)');
    bloomG.addColorStop(1,   'rgba(30,0,80,0.00)');
    bctx.fillStyle = bloomG;
    bctx.fillRect(0, 0, W, H);
    const bloom = new PIXI.Sprite(PIXI.Texture.from(bloomC));
    bloom.width = W; bloom.height = H;
    bloom.blendMode = PIXI.BLEND_MODES.ADD;
    this.screen.addChildAt(bloom, 1); // behind vignette
  }

  // ── Level setup ─────────────────────────────────────────────────────────────
  // Called once when a level loads. Pass the raw tile grid + level id.
  setupLevel(tiles: number[][], levelId: number) {
    // Remove old world children (keep particleCont)
    const keep = this.particleCont;
    while (this.world.children.length > 0) {
      const c = this.world.children[0];
      if (c === keep) { this.world.setChildIndex(c, 0); break; }
      this.world.removeChildAt(0);
    }
    this.candleSprites  = [];
    this.crackSprites   = [];
    this.fountainSprites = [];
    this.riftSprites    = [];
    this.particleCont.removeChildren();
    this.particles      = [];

    const rows = tiles.length;
    const cols = tiles[0]?.length ?? 0;

    // Track fountain tiles to compute center
    const fountainTiles: {r:number;c:number}[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = tiles[r][c];
        const cx = c * TILE + TILE / 2;
        const cy = r * TILE + TILE / 2;

        // ── Candle glow (tile 6) ─────────────────────────────────────────
        if (tile === 6) {
          // Main warm halo
          const halo = this.makeAddSprite(this.texM, 0xFF8830, cx, cy - 8, 0.6);
          halo.scale.set(1.4);
          this.world.addChildAt(halo, 0);

          // Tighter hot-core
          const core = this.makeAddSprite(this.texS, 0xFFCC66, cx, cy - 8, 0.55);
          this.world.addChildAt(core, 0);

          this.candleSprites.push({ s: halo, baseAlpha: 0.6 });
          this.candleSprites.push({ s: core, baseAlpha: 0.55 });
        }

        // ── Crack glow (tile 5) ──────────────────────────────────────────
        else if (tile === 5) {
          const cs = this.makeAddSprite(this.texM, 0x8822FF, cx, cy, 0.42);
          this.world.addChildAt(cs, 0);
          this.crackSprites.push(cs);

          // Extra thin purple inner
          const ci = this.makeAddSprite(this.texS, 0xCC66FF, cx, cy, 0.28);
          this.world.addChildAt(ci, 0);
          this.crackSprites.push(ci);
        }

        // ── Fountain (tile 3) ────────────────────────────────────────────
        else if (tile === 3) {
          fountainTiles.push({ r, c });
        }

        // ── Floor ambient (tile 0) — subtle purple ground glow ───────────
        else if (tile === 0 && ((r * 3 + c * 7) % 11 === 0)) {
          const fg = this.makeAddSprite(this.texS, 0x7722CC, cx, cy, 0.06);
          fg.scale.set(1.8);
          this.world.addChildAt(fg, 0);
        }
      }
    }

    // ── Fountain bloom (centered on fountain tile cluster) ───────────────
    if (fountainTiles.length > 0) {
      const avgR = fountainTiles.reduce((s,t) => s + t.r, 0) / fountainTiles.length;
      const avgC = fountainTiles.reduce((s,t) => s + t.c, 0) / fountainTiles.length;
      const fcx = (avgC + 0.5) * TILE;
      const fcy = (avgR + 0.5) * TILE;

      const f1 = this.makeAddSprite(this.texXL, 0x4422BB, fcx, fcy, 0.50);
      f1.scale.set(1.4);
      this.world.addChildAt(f1, 0);
      this.fountainSprites.push(f1);

      const f2 = this.makeAddSprite(this.texL,  0x6644CC, fcx, fcy, 0.40);
      this.world.addChildAt(f2, 0);
      this.fountainSprites.push(f2);

      const f3 = this.makeAddSprite(this.texM,  0x88AAFF, fcx, fcy, 0.35);
      this.world.addChildAt(f3, 0);
      this.fountainSprites.push(f3);
    }

    // ── Purple rift portal (Level 1 upper-left) ──────────────────────────
    if (levelId === 1) {
      const rx = 2.8 * TILE;
      const ry = 3.2 * TILE;

      // Outer soft halo
      const r0 = this.makeAddSprite(this.texXL, 0x6600BB, rx, ry, 0.38);
      r0.scale.set(1.6);
      this.world.addChildAt(r0, 0);
      this.riftSprites.push(r0);

      // Mid swirl
      const r1 = this.makeAddSprite(this.texL, 0x9933FF, rx, ry, 0.52);
      r1.scale.set(1.1);
      this.world.addChildAt(r1, 0);
      this.riftSprites.push(r1);

      // Core cyan
      const r2 = this.makeAddSprite(this.texM, 0x44BBFF, rx, ry, 0.38);
      this.world.addChildAt(r2, 0);
      this.riftSprites.push(r2);

      // Bright white centre
      const r3 = this.makeAddSprite(this.texS, 0xFFFFFF, rx, ry, 0.22);
      this.world.addChildAt(r3, 0);
      this.riftSprites.push(r3);
    }

    // ── Ambient particle system ──────────────────────────────────────────
    this.spawnParticles(tiles);
  }

  // ── Ambient particles ────────────────────────────────────────────────────────
  private spawnParticles(tiles: number[][]) {
    const rows = tiles.length;
    const cols = tiles[0]?.length ?? 0;
    const floor: {x:number;y:number}[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (tiles[r][c] === 0 || tiles[r][c] === 5)
          floor.push({ x: c * TILE + TILE/2, y: r * TILE + TILE/2 });

    if (!floor.length) return;

    const colors = [0xCC44FF, 0xFF55AA, 0x8844FF, 0xAA66FF, 0xFF88CC];
    for (let i = 0; i < 55; i++) {
      const base = floor[Math.floor(Math.random() * floor.length)];
      const s = new PIXI.Sprite(this.texS);
      s.anchor.set(0.5);
      const sc = 0.15 + Math.random() * 0.25;
      s.scale.set(sc);
      s.tint = colors[i % colors.length];
      s.blendMode = PIXI.BLEND_MODES.ADD;
      s.x = base.x + (Math.random() - 0.5) * 40;
      s.y = base.y + (Math.random() - 0.5) * 40;
      s.alpha = 0;
      this.particleCont.addChild(s);
      this.particles.push({
        s,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(0.25 + Math.random() * 0.35),
        life: Math.floor(Math.random() * 200),
        maxLife: 100 + Math.floor(Math.random() * 160),
        startX: base.x,
        startY: base.y,
      });
    }
  }

  // ── Sprite helper ─────────────────────────────────────────────────────────────
  private makeAddSprite(tex: PIXI.Texture, tint: number, x: number, y: number, alpha: number): PIXI.Sprite {
    const s = new PIXI.Sprite(tex);
    s.anchor.set(0.5);
    s.tint = tint;
    s.x = x; s.y = y;
    s.alpha = alpha;
    s.blendMode = PIXI.BLEND_MODES.ADD;
    return s;
  }

  // ── Per-frame update ─────────────────────────────────────────────────────────
  // Call this from GameEngine.render() passing the current camera scroll.
  update(camX: number, camY: number) {
    this.time++;
    const t = this.time;

    // Sync camera
    this.world.x = -Math.round(camX);
    this.world.y = -Math.round(camY);

    // ── Candle flicker ──────────────────────────────────────────────────
    for (let i = 0; i < this.candleSprites.length; i++) {
      const { s, baseAlpha } = this.candleSprites[i];
      const idx = Math.floor(i / 2);
      const flicker =
        0.88
        + Math.sin(t * 0.14 + idx * 1.1) * 0.08
        + Math.sin(t * 0.23 + idx * 0.7) * 0.04
        + (Math.random() < 0.03 ? (Math.random() - 0.5) * 0.12 : 0);
      s.alpha = baseAlpha * flicker;
      const pulse = 1 + Math.sin(t * 0.09 + idx * 0.6) * 0.06;
      s.scale.set(i % 2 === 0 ? 1.4 * pulse : pulse);
    }

    // ── Crack glow pulse ────────────────────────────────────────────────
    for (let i = 0; i < this.crackSprites.length; i++) {
      const s = this.crackSprites[i];
      const baseA = i % 2 === 0 ? 0.42 : 0.28;
      s.alpha = baseA * (0.75 + Math.sin(t * 0.05 + i * 0.9) * 0.25);
    }

    // ── Fountain bloom ──────────────────────────────────────────────────
    if (this.fountainSprites.length > 0) {
      const fp0 = 0.50 + Math.sin(t * 0.035) * 0.10;
      const fp1 = 0.40 + Math.sin(t * 0.04 + 1) * 0.08;
      const fp2 = 0.35 + Math.sin(t * 0.05 + 2) * 0.07;
      this.fountainSprites[0].alpha = fp0;
      this.fountainSprites[0].scale.set(1.4 + Math.sin(t * 0.03) * 0.04);
      if (this.fountainSprites[1]) this.fountainSprites[1].alpha = fp1;
      if (this.fountainSprites[2]) {
        this.fountainSprites[2].alpha = fp2;
        this.fountainSprites[2].rotation += 0.006;
      }
    }

    // ── Rift swirl ──────────────────────────────────────────────────────
    if (this.riftSprites.length >= 4) {
      this.riftSprites[0].alpha = 0.35 + Math.sin(t * 0.028) * 0.12;
      this.riftSprites[0].scale.set(1.6 + Math.sin(t * 0.025) * 0.08);
      this.riftSprites[1].rotation += 0.010;
      this.riftSprites[1].alpha = 0.50 + Math.sin(t * 0.04 + 1) * 0.10;
      this.riftSprites[2].rotation -= 0.014;
      this.riftSprites[2].alpha = 0.36 + Math.sin(t * 0.05 + 2) * 0.10;
      this.riftSprites[3].alpha = 0.18 + Math.sin(t * 0.07 + 3) * 0.08;
    }

    // ── Particles ───────────────────────────────────────────────────────
    for (const p of this.particles) {
      p.life++;
      if (p.life >= p.maxLife) {
        // Respawn
        p.life = 0;
        p.s.x = p.startX + (Math.random() - 0.5) * 48;
        p.s.y = p.startY + (Math.random() - 0.5) * 48;
        p.vx = (Math.random() - 0.5) * 0.25;
        p.vy = -(0.25 + Math.random() * 0.35);
      }
      p.s.x += p.vx;
      p.s.y += p.vy;
      const progress = p.life / p.maxLife;
      // Fade in first 20%, hold, fade out last 30%
      const fade =
        progress < 0.2  ? progress / 0.2 :
        progress > 0.70 ? (1 - progress) / 0.30 : 1;
      p.s.alpha = fade * 0.45;
    }
  }

  // ── Resize ───────────────────────────────────────────────────────────────────
  resize(W: number, H: number) {
    this.W = W; this.H = H;
    this.app.renderer.resize(W, H);
    this.buildScreenFx(W, H);
  }

  destroy() {
    try { this.app.destroy(true, { children: true, texture: true, baseTexture: true }); }
    catch { /* ignore */ }
  }
}
