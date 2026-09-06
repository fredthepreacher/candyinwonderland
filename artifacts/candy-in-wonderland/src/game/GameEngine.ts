import type { Direction, GameState, Clue, DialogueLine, NPCData, InputState, Vec2 } from './types';
import { TILE_SIZE, PLAYER_SPEED, PLAYER_MAX_HP } from './types';
import type { LevelData } from './types';
import { AudioManager } from './AudioManager';
import type { PixiGlow } from './PixiGlow';
import { AssetPaths, COURTYARD_FOCAL_Y, bossSpriteFor, npcSpriteKey, portraitFor } from '../data/assets';
import { Lighting, QUALITY } from './Lighting';
import type { Light, LightingQuality } from './Lighting';
import { COURTYARD_LIGHTS } from '../data/courtyard-lights';

const WALK_FRAMES = 4;
const WALK_SPEED = 8; // frames per step
const ATTACK_DURATION = 20;
const DAMAGE_INVINCIBLE = 60;
const INTERACT_RANGE = 64;

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
}

interface Projectile {
  x: number; y: number; vx: number; vy: number; id: number;
}

export interface GameCallbacks {
  onStateChange: (state: GameState) => void;
  onClueCollected: (clue: Clue) => void;
  onDialogue: (lines: DialogueLine[] | null, index: number) => void;
  onHealthChange: (hp: number) => void;
  onBossChange: (hp: number, maxHp: number, active: boolean) => void;
  onGateOpen: () => void;
  onBossUnlock: () => void;
  onObjective: (text: string) => void;
  onLevelComplete: (fragment: string) => void;
  onClueCount: (count: number) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animId = 0;
  private lastTime = 0;
  private audio: AudioManager;
  private cb: GameCallbacks;

  // Level
  private level!: LevelData;
  private tiles: number[][] = [];
  private gateOpen = false;
  private bossUnlocked = false;
  private bossDefeated = false;
  private exitActive = false;

  // Player
  private px = 0; private py = 0;
  private playerHp = PLAYER_MAX_HP;
  private facing: Direction = 'down';
  private walkFrame = 0;
  private walkTimer = 0;
  private moving = false;
  private attacking = false;
  private attackTimer = 0;
  private damageTimer = 0;
  private playerFlash = false;

  // Debug overlay (toggle with 'D' key)
  private showDebug = false;

  // Input
  private keys: InputState = { up: false, down: false, left: false, right: false, attack: false, interact: false, pause: false };
  private mobileInput: InputState = { up: false, down: false, left: false, right: false, attack: false, interact: false, pause: false };
  private prevKeys: InputState = { up: false, down: false, left: false, right: false, attack: false, interact: false, pause: false };
  private prevMobile: InputState = { up: false, down: false, left: false, right: false, attack: false, interact: false, pause: false };

  // NPCs (runtime, index aligned with level.npcs)
  private npcInteracted: boolean[] = [];

  // Boss
  private bossActive = false;
  private bossX = 0; private bossY = 0;
  private bossHp = 10; private bossMaxHp = 10;
  private bossPhase = 1;
  private bossMoveTimer = 0;
  private bossAttackMode: 'idle' | 'charging' | 'recovering' = 'idle';
  private bossChargeTimer = 0;
  private bossChargeDir: Vec2 = { x: 0, y: 0 };
  private bossOrbitAngle = 0;
  private bossFlash = 0;
  private bossDead = false;
  private bossDeathTimer = 0;
  private projectiles: Projectile[] = [];
  private projId = 0;

  // Camera
  private camX = 0; private camY = 0;
  private cameraZoom = 0.68; // <1 = zoomed out (more world visible, smaller characters)

  // Viewport, in LOGICAL pixels. The canvas backing store is this multiplied by
  // `dpr`; everything in the engine works in logical pixels and the device-pixel
  // scale is applied once, as the base transform in render().
  private viewW = 1;
  private viewH = 1;
  private dpr = 1;

  // Lighting
  private lighting = new Lighting();
  /** Lights that never move for this level. Rebuilt on load, not per frame. */
  private staticLights: Light[] | null = null;
  private frameLights: Light[] = [];
  /** Ambient light — the exposure of everything no lamp reaches. Never black. */
  private ambient: [number, number, number] = [178, 168, 198];

  // Frame timing, for the debug HUD
  private fps = 60;
  private frameMs = 0;

  // PNG asset sprites (raw images + processed canvases with white bg removed)
  private assets: Record<string, HTMLImageElement> = {};
  private sprites: Record<string, HTMLCanvasElement> = {};

  // Particles
  private particles: Particle[] = [];
  private shakeX = 0; private shakeY = 0; private shakeTimer = 0;

  // Dialogue
  private dialogueLines: DialogueLine[] = [];
  private dialogueIndex = 0;
  private pendingClueId: string | null = null;

  // Clues
  private collectedClueIds: Set<string> = new Set();
  private hiddenClueCollected = false;
  private hiddenClueGlow = 0;

  // Animations
  private candleFlicker = 0;
  private fountainAnim = 0;
  private time = 0;

  // PixiJS glow overlay
  private pixiGlow: PixiGlow | null = null;

  // Level 1 static background cache
  private level1BgCache: HTMLCanvasElement | null = null;

  // Tinted boss plate cache (rebuilt when the level changes)
  private bossSpriteCanvas: HTMLCanvasElement | null = null;
  private bossSpriteKey = '';

  // Offscreen canvas for character outline rendering
  private charOfc: HTMLCanvasElement = document.createElement('canvas');

  // Game state
  private _gameState: GameState = 'exploring';

  get gameState(): GameState { return this._gameState; }

  private setGameState(s: GameState) {
    this._gameState = s;
    this.cb.onStateChange(s);
  }

  constructor(canvas: HTMLCanvasElement, audio: AudioManager, callbacks: GameCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.audio = audio;
    this.cb = callbacks;
    this.bindKeys();
    this.loadAssets();
  }

  private loadAssets() {
    // Every PNG under public/assets is produced by tools/build-assets.py and already
    // ships a clean alpha channel, trimmed to the artwork. The engine used to run a
    // full-image BFS flood-fill over five 1–3 MP images on every boot to strip white
    // backgrounds; that work now happens once at build time instead of on every load.
    this.loadSprite('candyFront', AssetPaths.characters.candyFront);
    this.loadSprite('candyBack',  AssetPaths.characters.candyBack);
    this.loadSprite('witness',    AssetPaths.npcs.witness);
    this.loadSprite('scholar',    AssetPaths.npcs.scholar);
    this.loadSprite('wanderer',   AssetPaths.npcs.wanderer);
    this.loadSprite('detective',  AssetPaths.npcs.detective);
    this.loadSprite('bench',      AssetPaths.props.bench);

    // Background is drawn straight from the <img>, not through the sprite cache.
    const bg = new Image();
    bg.src = AssetPaths.backgrounds.courtyard;
    this.assets['courtyard'] = bg;
  }

  /**
   * Load one PNG into the sprite cache. Assets are pre-cut by the build pipeline,
   * so this is a straight copy onto a canvas — no background stripping at runtime.
   */
  private loadSprite(key: string, src: string) {
    const img = new Image();
    img.onload = () => {
      const ofc = document.createElement('canvas');
      ofc.width = img.naturalWidth;
      ofc.height = img.naturalHeight;
      ofc.getContext('2d')!.drawImage(img, 0, 0);
      this.sprites[key] = ofc;
    };
    img.onerror = () => console.warn(`[assets] failed to load ${src}`);
    img.src = src;
    this.assets[key] = img;
  }

  /**
   * Boss plate tinted with the current level's suit colour, built once per level.
   * The tint is composited on an offscreen canvas so `source-atop` masks to the
   * sprite itself rather than to everything already painted on the main canvas.
   */
  private getBossSprite(): HTMLCanvasElement | null {
    const base = this.sprites['boss'];
    if (!base) return null;
    const tint = this.level?.bossConfig?.suitTint ?? '';
    const key = `${this.level?.id}:${tint}:${base.width}x${base.height}`;
    if (this.bossSpriteCanvas && this.bossSpriteKey === key) return this.bossSpriteCanvas;

    const ofc = document.createElement('canvas');
    ofc.width = base.width;
    ofc.height = base.height;
    const c = ofc.getContext('2d')!;
    c.drawImage(base, 0, 0);
    if (tint) {
      c.globalCompositeOperation = 'source-atop';
      c.globalAlpha = 0.34;
      c.fillStyle = tint;
      c.fillRect(0, 0, ofc.width, ofc.height);
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
    }
    this.bossSpriteCanvas = ofc;
    this.bossSpriteKey = key;
    return ofc;
  }

  loadLevel(level: LevelData) {
    this.level = level;
    this.tiles = level.tiles.map(row => [...row]);
    this.px = level.playerStart.x * TILE_SIZE + TILE_SIZE / 2;
    this.py = level.playerStart.y * TILE_SIZE + TILE_SIZE / 2;
    this.npcInteracted = level.npcs.map(() => false);
    this.gateOpen = true; // gate open from start — players explore freely; boss needs clues
    this.bossUnlocked = false;
    this.bossDefeated = false;
    this.exitActive = false;
    this.bossActive = false;
    this.bossDead = false;
    this.projectiles = [];
    this.particles = [];
    this.collectedClueIds.clear();
    this.hiddenClueCollected = false;
    this.playerHp = PLAYER_MAX_HP;
    this.bossHp = this.bossMaxHp = this.level.bossConfig?.hp ?? 10;
    this.cb.onHealthChange(this.playerHp);
    this.cb.onBossChange(0, 10, false);
    this.cb.onClueCount(0);
    this.cb.onObjective(level.objective);
    this.updateCamera(true);
    this.setGameState('exploring');
    this.level1BgCache = null;
    // This level's boss plate; the tint cache is keyed on level id so it rebuilds.
    this.bossSpriteCanvas = null;
    this.staticLights = null; // rebuilt lazily once this level's plate is loaded
    this.loadSprite('boss', bossSpriteFor(level.id));
    // Notify PixiGlow of new level data (if already attached)
    if (this.pixiGlow) {
      this.pixiGlow.setupLevel(this.tiles, level.id);
    }
  }

  /**
   * Tell the engine the viewport size in LOGICAL pixels and the device-pixel
   * ratio the canvas backing store was sized at. Rendering at device pixels is
   * what stops the browser upscaling the art on a Retina screen or a phone;
   * because the tilt transform also scales the canvas down, drawing at 2x and
   * letting the compositor resolve it is effectively free supersampling.
   */
  setViewport(logicalW: number, logicalH: number, dpr: number) {
    this.viewW = Math.max(1, logicalW);
    this.viewH = Math.max(1, logicalH);
    this.dpr = dpr;
    this.lighting.resize(this.viewW, this.viewH);
  }

  setLightingQuality(q: LightingQuality) {
    this.lighting.setQuality(q);
  }

  /**
   * Lights that do not move for this level, in world space.
   *
   * Level 1 is painted rather than tiled, so its lights come from the plate:
   * tools/bake-lights.py found the flames in the artwork and stored them as
   * normalised plate coordinates, which we push through the same transform
   * drawLevel1Scene() uses. That is what keeps a pool of light sitting on the
   * candle that was painted for it rather than floating somewhere near it.
   *
   * Returns false while the plate is still loading, so it is retried.
   */
  private buildStaticLights(): boolean {
    const S = TILE_SIZE;
    const mapW = this.tiles[0].length * S;
    const mapH = this.tiles.length * S;
    const out: Light[] = [];
    let seed = 0;

    if (this.level.id === 1) {
      const bg = this.assets['courtyard'];
      if (!bg?.complete || !bg.naturalWidth) return false;
      const drawH = mapW * (bg.naturalHeight / bg.naturalWidth);
      const offY = Math.min(0, Math.max(mapH - drawH, 7 * S - COURTYARD_FOCAL_Y * drawH));
      for (const L of COURTYARD_LIGHTS) {
        out.push({
          x: L.u * mapW,
          y: offY + L.v * drawH,
          radius: L.radius,
          color: L.color,
          intensity: L.intensity,
          flicker: L.flicker,
          seed: seed++ * 1.7,
        });
      }
    } else {
      // Tiled levels: candles are tile type 6 and are actually drawn there, so
      // tile coordinates are the right source here.
      let fx = 0, fy = 0, fn = 0;
      for (let ty = 0; ty < this.tiles.length; ty++) {
        for (let tx = 0; tx < this.tiles[ty].length; tx++) {
          const tile = this.tiles[ty][tx];
          if (tile === 6) {
            out.push({
              x: tx * S + S / 2, y: ty * S + S / 2,
              radius: 155, color: [255, 188, 112],
              intensity: 0.95, flicker: 0.34, seed: seed++ * 1.7,
            });
          } else if (tile === 3) {
            fx += tx * S + S / 2; fy += ty * S + S / 2; fn++;
          }
        }
      }
      // One broad light at the centroid of the water tiles — the fountain.
      if (fn > 0) {
        out.push({
          x: fx / fn, y: fy / fn,
          radius: 300, color: [126, 168, 255],
          intensity: 0.72, flicker: 0.07, seed: seed++ * 1.7,
        });
      }
    }

    this.staticLights = out;
    return true;
  }

  /** Parse the rgb out of an `rgba(r,g,b,a)` string from the boss config. */
  private static parseRgb(css: string, fallback: [number, number, number]): [number, number, number] {
    const m = css.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : fallback;
  }

  /**
   * Static lights plus everything that moves. Reuses one array so a full light
   * set does not allocate 20 objects every frame.
   */
  private collectLights(): Light[] {
    if (!this.staticLights) this.buildStaticLights();
    const lights = this.frameLights;
    lights.length = 0;
    if (this.staticLights) for (const L of this.staticLights) lights.push(L);

    // Candy carries a soft lamp of her own. Beyond looking right for a
    // detective in a dark courtyard, it guarantees the ground she is standing
    // on is readable wherever she walks — including the lower courtyard, which
    // has no painted candles near it.
    lights.push({
      x: this.px, y: this.py + 6, radius: 235,
      color: [156, 150, 214], intensity: 0.52, flicker: 0.04, seed: 11.3,
    });

    if (!this.hiddenClueCollected && this.level.hiddenCluePos) {
      lights.push({
        x: this.level.hiddenCluePos.x * TILE_SIZE + TILE_SIZE / 2,
        y: this.level.hiddenCluePos.y * TILE_SIZE + TILE_SIZE / 2,
        radius: 135, color: [255, 214, 120],
        intensity: 0.62, flicker: 0.30, seed: 5.1,
      });
    }

    if (this.gateOpen && this.level.gatePos) {
      lights.push({
        x: this.level.gatePos.x * TILE_SIZE + TILE_SIZE / 2,
        y: this.level.gatePos.y * TILE_SIZE + TILE_SIZE / 2,
        radius: 170, color: [186, 138, 255],
        intensity: 0.50, flicker: 0.10, seed: 8.6,
      });
    }

    if (this.bossActive && !this.bossDefeated) {
      lights.push({
        x: this.bossX, y: this.bossY, radius: 260,
        color: GameEngine.parseRgb(this.level.bossConfig?.aura ?? '', [190, 90, 255]),
        intensity: this.bossFlash > 0 ? 1 : 0.82,
        flicker: 0.22, seed: 2.9,
      });
    }

    return lights;
  }

  private bindKeys() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  unbindKeys() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    this.applyKey(e.key, true);
  };
  private onKeyUp = (e: KeyboardEvent) => { this.applyKey(e.key, false); };

  private applyKey(key: string, down: boolean) {
    if (key === 'ArrowUp' || key === 'w' || key === 'W') this.keys.up = down;
    if (key === 'ArrowDown' || key === 's' || key === 'S') this.keys.down = down;
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') this.keys.left = down;
    if (key === 'ArrowRight' || key === 'd' || key === 'D') this.keys.right = down;
    if (key === ' ') this.keys.attack = down;
    if (key === 'e' || key === 'E') this.keys.interact = down;
    if (key === 'Escape') this.keys.pause = down;
    // Toggle debug overlay with backtick
    if (key === '`' && down) this.showDebug = !this.showDebug;
  }

  setMobileInput(input: Partial<InputState>) {
    Object.assign(this.mobileInput, input);
  }

  private get inp(): InputState {
    return {
      up: this.keys.up || this.mobileInput.up,
      down: this.keys.down || this.mobileInput.down,
      left: this.keys.left || this.mobileInput.left,
      right: this.keys.right || this.mobileInput.right,
      attack: this.keys.attack || this.mobileInput.attack,
      interact: this.keys.interact || this.mobileInput.interact,
      pause: this.keys.pause || this.mobileInput.pause,
    };
  }

  private justPressed(key: keyof InputState): boolean {
    return this.inp[key] && !this.prevKeys[key] && !this.prevMobile[key];
  }

  start() {
    // Music is controlled externally by App.tsx; do not start 'explore' here
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    cancelAnimationFrame(this.animId);
    // Music lifecycle managed by App.tsx; do not stop here
  }

  private loop = (now: number) => {
    this.animId = requestAnimationFrame(this.loop);
    const dt = Math.min((now - this.lastTime) / 16.667, 3);
    this.lastTime = now;
    // `time` advances by dt, not by 1. It used to be a frame counter, which made
    // every animation driven off it — the walk bob, candle flicker, boss orbit,
    // fountain — run at the monitor's refresh rate. On a 144 Hz screen Candy's
    // legs pumped 2.4x faster than on a 60 Hz one. dt is normalised to 60 fps
    // units, so `time` now advances 60 per second on any display and every
    // multiplier tuned against the old counter stays correct.
    this.time += dt;
    const t0 = performance.now();
    this.update(dt);
    this.render();
    this.frameMs += (performance.now() - t0 - this.frameMs) * 0.1;
    this.fps += ((dt > 0 ? 60 / dt : 60) - this.fps) * 0.05;
    this.prevKeys = { ...this.keys };
    this.prevMobile = { ...this.mobileInput };
  };

  // ─── UPDATE ───────────────────────────────────────────────────────────────

  private update(dt: number) {
    this.candleFlicker = Math.sin(this.time * 0.12) * 0.3 + 0.7;
    this.fountainAnim = (this.time * 0.05) % (Math.PI * 2);
    this.hiddenClueGlow = Math.sin(this.time * 0.08) * 0.5 + 0.5;

    // Ambient floating particles (purple motes drifting upward)
    if (this.time % 40 === 0) this.spawnAmbientParticle();

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      this.shakeX = (Math.random() - 0.5) * 8;
      this.shakeY = (Math.random() - 0.5) * 8;
    } else { this.shakeX = 0; this.shakeY = 0; }

    this.updateParticles(dt);

    if (this._gameState === 'exploring') {
      this.updateExploring(dt);
    } else if (this._gameState === 'boss') {
      this.updateBoss(dt);
    } else if (this._gameState === 'dialogue') {
      this.updateDialogue();
    }

    if (this.justPressed('pause') && (this._gameState === 'exploring' || this._gameState === 'boss')) {
      this.setGameState('paused');
    }
  }

  private updateExploring(dt: number) {
    const inp = this.inp;

    // Interact
    if (this.justPressed('interact')) {
      this.checkInteract();
    }

    // Attack
    if (this.justPressed('attack') && !this.attacking) {
      this.attacking = true;
      this.attackTimer = ATTACK_DURATION;
      this.audio.playAttack();
      this.spawnAttackParticles();
    }
    if (this.attacking) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) this.attacking = false;
    }

    // Damage invincibility
    if (this.damageTimer > 0) {
      this.damageTimer -= dt;
      this.playerFlash = Math.floor(this.damageTimer / 4) % 2 === 0;
    } else { this.playerFlash = false; }

    // Boss entry: gate must be open, boss must be unlocked (all clues collected)
    if (this.gateOpen && this.bossUnlocked && !this.bossActive && !this.bossDefeated) {
      // Trigger boss when player crosses into the upper zone past the gate
      if (this.py < (this.level.gatePos.y - 0.5) * TILE_SIZE) {
        this.triggerBoss();
      }
    }

    // Exit check
    if (this.exitActive && this.bossDefeated) {
      const ex = this.level.exitPos.x * TILE_SIZE + TILE_SIZE / 2;
      const ey = this.level.exitPos.y * TILE_SIZE + TILE_SIZE / 2;
      if (Math.abs(this.px - ex) < TILE_SIZE && Math.abs(this.py - ey) < TILE_SIZE) {
        this.audio.playVictory();
        this.cb.onLevelComplete(this.level.truthFragment);
        this.setGameState('levelComplete');
        return;
      }
    }

    // Hidden clue check
    if (!this.hiddenClueCollected) {
      const hx = this.level.hiddenCluePos.x * TILE_SIZE + TILE_SIZE / 2;
      const hy = this.level.hiddenCluePos.y * TILE_SIZE + TILE_SIZE / 2;
      if (Math.abs(this.px - hx) < TILE_SIZE * 0.8 && Math.abs(this.py - hy) < TILE_SIZE * 0.8) {
        this.hiddenClueCollected = true;
        const hiddenClue = this.level.clues[this.level.clues.length - 1];
        if (hiddenClue) this.collectClue(hiddenClue.id);
      }
    }

    this.movePlayer(inp, dt);
    this.updateCamera(false);
  }

  private movePlayer(inp: InputState, dt: number) {
    let dx = 0, dy = 0;
    if (inp.left) { dx -= 1; this.facing = 'left'; }
    if (inp.right) { dx += 1; this.facing = 'right'; }
    if (inp.up) { dy -= 1; this.facing = 'up'; }
    if (inp.down) { dy += 1; this.facing = 'down'; }

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

    this.moving = dx !== 0 || dy !== 0;
    const speed = PLAYER_SPEED * dt;

    if (this.moving) {
      this.walkTimer += dt;
      if (this.walkTimer >= WALK_SPEED) {
        this.walkTimer = 0;
        this.walkFrame = (this.walkFrame + 1) % WALK_FRAMES;
      }

      const nx = this.px + dx * speed;
      const ny = this.py + dy * speed;
      const pw = 18, ph = 12;

      if (!this.collidesWithWorld(nx, this.py, pw, ph)) this.px = nx;
      if (!this.collidesWithWorld(this.px, ny, pw, ph)) this.py = ny;
    } else {
      this.walkFrame = 0;
    }
  }

  private collidesWithWorld(x: number, y: number, hw: number, hh: number): boolean {
    const left = x - hw, right = x + hw, top = y - hh, bottom = y + hh;
    const tileLeft = Math.floor(left / TILE_SIZE);
    const tileRight = Math.floor(right / TILE_SIZE);
    const tileTop = Math.floor(top / TILE_SIZE);
    const tileBottom = Math.floor(bottom / TILE_SIZE);

    for (let ty = tileTop; ty <= tileBottom; ty++) {
      for (let tx = tileLeft; tx <= tileRight; tx++) {
        if (ty < 0 || ty >= this.tiles.length || tx < 0 || tx >= this.tiles[0].length) return true;
        const tile = this.tiles[ty][tx];
        if (this.isSolid(tile, ty, tx)) return true;
      }
    }
    return false;
  }

  private isSolid(tile: number, ty: number, tx: number): boolean {
    // Tile 7 = gate: solid unless open
    if (tile === 7) return !this.gateOpen;
    return tile === 1 || tile === 2 || tile === 3;
  }

  private checkInteract() {
    const range = INTERACT_RANGE;
    let dx = 0, dy = 0;
    if (this.facing === 'up') dy = -range;
    else if (this.facing === 'down') dy = range;
    else if (this.facing === 'left') dx = -range;
    else dx = range;

    const checkX = this.px + dx;
    const checkY = this.py + dy;

    // Check NPCs
    for (let i = 0; i < this.level.npcs.length; i++) {
      const npc = this.level.npcs[i];
      const nx = npc.x * TILE_SIZE + TILE_SIZE / 2;
      const ny = npc.y * TILE_SIZE + TILE_SIZE / 2;
      if (Math.abs(checkX - nx) < 48 && Math.abs(checkY - ny) < 48) {
        this.startDialogue(npc, i);
        return;
      }
    }

    // Boss proximity check — if not yet unlocked, show evidence-needed hint
    if (!this.bossUnlocked && !this.bossActive && !this.bossDefeated) {
      const bx = this.level.bossStart.x * TILE_SIZE + TILE_SIZE / 2;
      const by = this.level.bossStart.y * TILE_SIZE + TILE_SIZE / 2;
      if (Math.abs(this.px - bx) < TILE_SIZE * 2.5 && Math.abs(this.py - by) < TILE_SIZE * 2.5) {
        const bossNpc: NPCData = {
          id: 'boss_locked', x: this.level.bossStart.x, y: this.level.bossStart.y,
          name: this.level.bossConfig?.name ?? 'The Boss',
          color: '#330033', skinColor: '#221122',
          dialogue: [{ speaker: this.level.bossConfig?.name ?? 'The Boss', text: 'You need more evidence before facing me. Find all the clues first.' }],
          interacted: false,
        };
        this.startDialogue(bossNpc, -1);
        return;
      }
    }
  }

  private startDialogue(npc: NPCData, index: number) {
    // Tag every line with the portrait for this NPC's slot so the dialogue UI
    // shows matching art on all 20 levels, not just where the NPC happens to be
    // named "Witness" / "Scholar" / "Wanderer".
    const portrait = portraitFor(npc.name, npcSpriteKey(this.level.id, index));
    this.dialogueLines = npc.dialogue.map(l => (l.portrait ? l : { ...l, portrait: portrait ?? undefined }));
    this.dialogueIndex = 0;
    this.pendingClueId = null;

    // Scan all dialogue lines for a clueId (clue is often on the last line)
    for (const line of npc.dialogue) {
      if (line.clueId && !this.collectedClueIds.has(line.clueId)) {
        this.pendingClueId = line.clueId;
        break;
      }
    }

    this.setGameState('dialogue');
    this.cb.onDialogue(this.dialogueLines, 0);
    this.audio.playDialogue();
  }

  advanceDialogue() {
    this.dialogueIndex++;
    if (this.dialogueIndex >= this.dialogueLines.length) {
      // End dialogue
      if (this.pendingClueId) {
        this.collectClue(this.pendingClueId);
        this.pendingClueId = null;
      }
      // Mark NPC as interacted
      const line = this.dialogueLines[0];
      const npcIdx = this.level.npcs.findIndex(n => n.dialogue[0] === line);
      if (npcIdx >= 0) this.npcInteracted[npcIdx] = true;

      this.setGameState('exploring');
      this.cb.onDialogue(null, 0);
    } else {
      this.cb.onDialogue(this.dialogueLines, this.dialogueIndex);
      this.audio.playDialogue();
    }
  }

  private collectClue(id: string) {
    if (this.collectedClueIds.has(id)) return;
    const clue = this.level.clues.find(c => c.id === id);
    if (!clue) return;

    this.collectedClueIds.add(id);
    clue.collected = true;
    this.audio.playClueCollected();
    this.cb.onClueCollected(clue);
    this.cb.onClueCount(this.collectedClueIds.size);
    this.spawnClueParticles(this.px, this.py);

    // Gate unlocks after first clue — lets player access the full map
    if (!this.gateOpen && this.collectedClueIds.size >= 1) {
      this.openGate();
    }
    // Boss unlocks after ALL clues (non-hidden) have been collected
    const requiredClues = Math.max(1, this.level.clues.length - 1);
    if (!this.bossUnlocked && this.collectedClueIds.size >= requiredClues) {
      this.bossUnlocked = true;
      this.cb.onBossUnlock();
      this.cb.onObjective('The truth is ready. Face the boss.');
    }
  }

  private openGate() {
    this.gateOpen = true;
    this.audio.playGateOpen();
    this.cb.onGateOpen();
    // Spawn gate particles
    const gx = this.level.gatePos.x * TILE_SIZE + TILE_SIZE / 2;
    const gy = this.level.gatePos.y * TILE_SIZE + TILE_SIZE / 2;
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      this.particles.push({
        x: gx, y: gy,
        vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4,
        life: 60, maxLife: 60,
        color: '#9B59B6', size: 6,
      });
    }
  }

  private triggerBoss() {
    if (this.bossActive) return;
    this.bossActive = true;
    this.bossHp = this.level.bossConfig?.hp ?? 10;
    this.bossMaxHp = this.level.bossConfig?.hp ?? 10;
    this.bossPhase = 1;
    this.bossX = this.level.bossStart.x * TILE_SIZE + TILE_SIZE / 2;
    this.bossY = this.level.bossStart.y * TILE_SIZE + TILE_SIZE / 2;
    this.bossAttackMode = 'idle';
    this.bossMoveTimer = 0;
    this.bossChargeTimer = 0;
    this.bossDead = false;
    this.bossDeathTimer = 0;
    this.cb.onBossChange(this.bossHp, this.bossMaxHp, true);
    this.audio.startMusic('boss');
    this.setGameState('boss');
  }

  private updateBoss(dt: number) {
    const inp = this.inp;

    // Player attack
    if (this.justPressed('attack') && !this.attacking) {
      this.attacking = true;
      this.attackTimer = ATTACK_DURATION;
      this.audio.playAttack();
      this.spawnAttackParticles();
    }
    if (this.attacking) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) this.attacking = false;
    }

    // Damage invincibility
    if (this.damageTimer > 0) {
      this.damageTimer -= dt;
      this.playerFlash = Math.floor(this.damageTimer / 4) % 2 === 0;
    } else { this.playerFlash = false; }

    if (this.justPressed('pause')) {
      this.setGameState('paused');
      return;
    }

    this.movePlayer(inp, dt);

    if (this.bossDead) {
      this.bossDeathTimer += dt;
      if (this.bossDeathTimer > 120) {
        this.finishBoss();
      }
      this.updateParticles(dt);
      this.updateCamera(false);
      return;
    }

    // Boss phase
    this.bossPhase = this.bossHp > 6 ? 1 : this.bossHp > 3 ? 2 : 3;

    // Boss orbit animation
    this.bossOrbitAngle += 0.04 * this.bossPhase * dt;

    // Boss movement
    this.bossMoveTimer -= dt;
    if (this.bossAttackMode === 'idle') {
      // Drift toward player
      const bdx = this.px - this.bossX;
      const bdy = this.py - this.bossY;
      const dist = Math.sqrt(bdx * bdx + bdy * bdy);
      if (dist > 80) {
        const spd = (0.8 + this.bossPhase * 0.4) * dt;
        this.bossX += (bdx / dist) * spd;
        this.bossY += (bdy / dist) * spd;
      }

      // Shoot projectiles periodically
      if (this.bossMoveTimer <= 0) {
        this.bossMoveTimer = Math.max(40, 90 - this.bossPhase * 20);
        this.shootProjectile();
        if (this.bossPhase >= 2) setTimeout(() => this.shootProjectile(), 200);
      }

      // Start charge
      if (Math.random() < 0.003 * this.bossPhase) {
        const bdx2 = this.px - this.bossX;
        const bdy2 = this.py - this.bossY;
        const d2 = Math.sqrt(bdx2 * bdx2 + bdy2 * bdy2);
        this.bossChargeDir = { x: bdx2 / d2, y: bdy2 / d2 };
        this.bossAttackMode = 'charging';
        this.bossChargeTimer = 40 + this.bossPhase * 10;
      }
    } else if (this.bossAttackMode === 'charging') {
      const spd = (5 + this.bossPhase * 1.5) * dt;
      this.bossX += this.bossChargeDir.x * spd;
      this.bossY += this.bossChargeDir.y * spd;
      this.bossChargeTimer -= dt;
      if (this.bossChargeTimer <= 0) {
        this.bossAttackMode = 'recovering';
        this.bossChargeTimer = 30;
      }
    } else if (this.bossAttackMode === 'recovering') {
      this.bossChargeTimer -= dt;
      if (this.bossChargeTimer <= 0) this.bossAttackMode = 'idle';
    }

    // Boss flash decay
    if (this.bossFlash > 0) this.bossFlash -= dt;

    // Check player attack hits boss
    if (this.attacking && this.attackTimer > ATTACK_DURATION - 8) {
      const ax = this.px + (this.facing === 'right' ? 40 : this.facing === 'left' ? -40 : 0);
      const ay = this.py + (this.facing === 'down' ? 40 : this.facing === 'up' ? -40 : 0);
      const bdist = Math.sqrt((ax - this.bossX) ** 2 + (ay - this.bossY) ** 2);
      if (bdist < 56 && this.bossFlash <= 0) {
        this.bossHp--;
        this.bossFlash = 15;
        this.audio.playHit();
        this.shakeTimer = 10;
        this.cb.onBossChange(this.bossHp, this.bossMaxHp, true);
        this.spawnHitParticles(this.bossX, this.bossY, '#FF4444');
        if (this.bossHp <= 0) {
          this.killBoss();
          return;
        }
      }
    }

    // Check boss/projectile hits player
    this.checkBossHitsPlayer();

    // Update projectiles
    this.projectiles = this.projectiles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const mapW = this.tiles[0].length * TILE_SIZE;
      const mapH = this.tiles.length * TILE_SIZE;
      return p.x > 0 && p.x < mapW && p.y > 0 && p.y < mapH;
    });

    this.updateCamera(false);
  }

  private shootProjectile() {
    const angles = this.bossPhase === 1 ? [0, Math.PI] :
      this.bossPhase === 2 ? [0, Math.PI / 2, Math.PI, Math.PI * 1.5] :
        Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2);

    for (const angle of angles) {
      const spd = 2.5 + this.bossPhase * 0.5;
      this.projectiles.push({
        x: this.bossX, y: this.bossY,
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        id: this.projId++,
      });
    }
  }

  private checkBossHitsPlayer() {
    if (this.damageTimer > 0) return;

    // Boss charge collision
    const bDist = Math.sqrt((this.px - this.bossX) ** 2 + (this.py - this.bossY) ** 2);
    if (bDist < 44 && this.bossAttackMode === 'charging') {
      this.hurtPlayer();
      return;
    }

    // Projectile collision
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const dist = Math.sqrt((this.px - p.x) ** 2 + (this.py - p.y) ** 2);
      if (dist < 24) {
        this.projectiles.splice(i, 1);
        this.hurtPlayer();
        return;
      }
    }
  }

  private hurtPlayer() {
    this.playerHp--;
    this.damageTimer = DAMAGE_INVINCIBLE;
    this.playerFlash = true;
    this.shakeTimer = 8;
    this.audio.playPlayerHit();
    this.cb.onHealthChange(this.playerHp);
    if (this.playerHp <= 0) {
      this.setGameState('menu'); // Game over → back to menu
    }
  }

  private killBoss() {
    this.bossDead = true;
    this.bossDeathTimer = 0;
    this.bossActive = false;
    this.audio.playBossDefeat();
    this.shakeTimer = 30;
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 6 + 2;
      this.particles.push({
        x: this.bossX, y: this.bossY,
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: 90 + Math.random() * 60, maxLife: 150,
        color: `hsl(${Math.random() * 60 + 260},80%,60%)`,
        size: Math.random() * 8 + 3,
      });
    }
  }

  private finishBoss() {
    this.bossDefeated = true;
    this.exitActive = true;
    this.projectiles = [];
    this.audio.startMusic('victory');
    this.cb.onBossChange(0, this.bossMaxHp, false);
    this.cb.onObjective('Truth restored. The next timeline opens.');
    this.setGameState('exploring');
    // Collect last clue if any remain
    const lastClue = this.level.clues.find(c => !this.collectedClueIds.has(c.id));
    if (lastClue) this.collectClue(lastClue.id);
    // Auto-advance to next level after victory celebration
    setTimeout(() => {
      this.cb.onLevelComplete(this.level.truthFragment);
    }, 2800);
  }

  private updateDialogue() {
    const inp = this.inp;
    if (this.justPressed('interact') || this.justPressed('attack')) {
      this.advanceDialogue();
    }
  }

  // ─── CAMERA ──────────────────────────────────────────────────────────────

  private updateCamera(snap: boolean) {
    const z = this.cameraZoom;
    const vpW = this.viewW / z;
    const vpH = this.viewH / z;
    const targetX = this.px - vpW / 2;
    const targetY = this.py - vpH / 2;
    const mapW = this.tiles[0].length * TILE_SIZE;
    const mapH = this.tiles.length * TILE_SIZE;
    const clampedX = Math.max(0, Math.min(targetX, mapW - vpW));
    const clampedY = Math.max(0, Math.min(targetY, mapH - vpH));

    if (snap) {
      this.camX = clampedX;
      this.camY = clampedY;
    } else {
      this.camX += (clampedX - this.camX) * 0.1;
      this.camY += (clampedY - this.camY) * 0.1;
    }
  }

  // ─── PARTICLES ───────────────────────────────────────────────────────────

  private updateParticles(dt: number) {
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= dt;
      return p.life > 0;
    });
  }

  private spawnClueParticles(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
        life: 40, maxLife: 40,
        color: '#FFD700', size: 5,
      });
    }
  }

  private spawnAttackParticles() {
    const ax = this.px + (this.facing === 'right' ? 30 : this.facing === 'left' ? -30 : 0);
    const ay = this.py + (this.facing === 'down' ? 30 : this.facing === 'up' ? -30 : 0);
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.particles.push({
        x: ax, y: ay,
        vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4,
        life: 15, maxLife: 15,
        color: '#E8E8FF', size: 4,
      });
    }
  }

  private spawnAmbientParticle() {
    // Spawn a slow-drifting purple mote in the visible viewport area
    const vx = (Math.random() - 0.5) * 0.6;
    const vy = -(Math.random() * 0.8 + 0.3);
    const spawnX = this.camX + Math.random() * (this.viewW / this.cameraZoom);
    const spawnY = this.camY + Math.random() * (this.viewH / this.cameraZoom);
    const hue = 260 + Math.floor(Math.random() * 60);
    this.particles.push({
      x: spawnX, y: spawnY,
      vx, vy,
      life: 90 + Math.random() * 60,
      maxLife: 150,
      color: `hsla(${hue},80%,65%,0.55)`,
      size: 2 + Math.random() * 3,
    });
  }

  private spawnHitParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
        life: 25, maxLife: 25,
        color, size: 5,
      });
    }
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  private render() {
    const ctx = this.ctx;
    const W = this.viewW;
    const H = this.viewH;

    // The one place the device-pixel scale is applied. Everything below this
    // line works in logical pixels, so no other code has to know about DPR.
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = this.level.levelTheme.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.scale(this.cameraZoom, this.cameraZoom);
    ctx.translate(Math.round(this.shakeX - this.camX), Math.round(this.shakeY - this.camY));

    if (this.level.id === 1) {
      this.drawLevel1Scene();
    } else {
      this.drawTiles();
      this.drawEnvironmentExtras();
    }
    this.drawHiddenClue();
    this.drawParticles();
    this.drawNPCs();
    if ((this.bossActive || this.bossDead) && !this.bossDefeated) this.drawBoss();
    if (!this.playerFlash) this.drawPlayer();
    this.drawProjectiles();
    if (this.exitActive) this.drawExit();

    ctx.restore();

    // ── LIGHTING ─────────────────────────────────────────────────────────────
    // Multiply the finished scene by the accumulated light buffer, then bloom
    // the lights and lift the blacks. This replaces the flat 10% purple wash
    // that used to stand in for atmosphere: that darkened every pixel equally,
    // which is why the courtyard read at one exposure everywhere.
    this.lighting.render(
      ctx,
      this.collectLights(),
      this.ambient,
      { x: this.camX - this.shakeX, y: this.camY - this.shakeY, zoom: this.cameraZoom },
      this.time,
    );
    this.lighting.grade(ctx, W, H, [64, 54, 92], 0.055);

    // ── POST-PROCESS ATMOSPHERE ──────────────────────────────────────────────

    // 2. Edge fog — narrow bands only so center of map stays visible
    const fogT = ctx.createLinearGradient(0, 0, 0, H * 0.18);
    fogT.addColorStop(0, 'rgba(4,0,12,0.45)');
    fogT.addColorStop(1, 'rgba(4,0,12,0)');
    ctx.fillStyle = fogT;
    ctx.fillRect(0, 0, W, H * 0.18);

    const fogB = ctx.createLinearGradient(0, H * 0.88, 0, H);
    fogB.addColorStop(0, 'rgba(2,0,6,0)');
    fogB.addColorStop(1, 'rgba(2,0,6,0.40)');
    ctx.fillStyle = fogB;
    ctx.fillRect(0, H * 0.88, W, H * 0.12);

    const fogL = ctx.createLinearGradient(0, 0, W * 0.10, 0);
    fogL.addColorStop(0, 'rgba(4,0,12,0.40)');
    fogL.addColorStop(1, 'rgba(4,0,12,0)');
    ctx.fillStyle = fogL;
    ctx.fillRect(0, 0, W * 0.10, H);

    const fogR = ctx.createLinearGradient(W * 0.90, 0, W, 0);
    fogR.addColorStop(0, 'rgba(4,0,12,0)');
    fogR.addColorStop(1, 'rgba(4,0,12,0.40)');
    ctx.fillStyle = fogR;
    ctx.fillRect(W * 0.90, 0, W * 0.10, H);

    // 3. The fountain used to get a hand-painted screen-space bloom pinned to a
    //    fixed point on screen, which slid off the fountain as the camera moved.
    //    It is a real world-space light now, so this is gone.

    // 4. Vignette — softer than before, because the light falloff now does most
    //    of this work in world space instead of as a fixed screen overlay
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.82);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.60, 'rgba(0,0,0,0.04)');
    vg.addColorStop(0.82, 'rgba(0,0,0,0.18)');
    vg.addColorStop(1,    'rgba(0,0,0,0.38)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    // 4. Ambient purple sparks (Canvas fallback; PixiGlow handles this when WebGL is active)
    if (!this.pixiGlow) {
      const sparkCount = 12;
      for (let s = 0; s < sparkCount; s++) {
        const sx = W * ((Math.sin(this.time * 0.008 + s * 2.4) * 0.5 + 0.5) * 0.85 + 0.075);
        const sy = H * ((Math.cos(this.time * 0.006 + s * 1.7) * 0.5 + 0.5) * 0.75 + 0.05);
        const sa = (Math.sin(this.time * 0.05 + s) * 0.5 + 0.5) * 0.5;
        const sr = 1.5 + Math.sin(this.time * 0.07 + s * 0.9) * 1;
        ctx.fillStyle = `rgba(180,100,255,${sa})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. PixiJS glow overlay update (WebGL: candle glow, cracks, rift, particles, vignette)
    if (this.pixiGlow) {
      this.pixiGlow.update(this.camX, this.camY);
    }

    // 6. Debug overlay (toggle with backtick key)
    if (this.showDebug) {
      const tileX = Math.floor(this.px / TILE_SIZE);
      const tileY = Math.floor(this.py / TILE_SIZE);
      const tile = (this.tiles[tileY]?.[tileX] ?? -1);
      const lines = [
        `FPS  ${this.fps.toFixed(0)}   frame ${this.frameMs.toFixed(2)} ms   dpr ${this.dpr}`,
        `VIEW ${this.viewW}x${this.viewH} logical  ->  ${this.canvas.width}x${this.canvas.height} device`,
        `LIGHTS  ${this.lighting.lastDrawnCount} drawn / ${this.lighting.lastLightCount} total`,
        `PARTICLES  ${this.particles.length}`,
        `POS  world:(${Math.round(this.px)}, ${Math.round(this.py)})  tile:(${tileX}, ${tileY})`,
        `FACING   ${this.facing}   MOVING ${this.moving}`,
        `GATE   ${this.gateOpen ? 'OPEN ✓' : 'CLOSED ✗'}   TILE at pos: ${tile}`,
        `BOSS   unlocked:${this.bossUnlocked}  active:${this.bossActive}`,
        `CLUES  ${this.collectedClueIds.size} / ${this.level.clues.length}`,
        `CAM  (${Math.round(this.camX)}, ${Math.round(this.camY)})`,
        `[backtick] = hide debug`,
      ];
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(8, 8, 400, lines.length * 18 + 12);
      ctx.font = '12px monospace';
      ctx.textBaseline = 'top';
      lines.forEach((line, i) => {
        ctx.fillStyle = i < 3 ? '#9ee8b0' : i === 6 ? (this.gateOpen ? '#88ff88' : '#ff8888') : '#e8e8ff';
        ctx.fillText(line, 14, 14 + i * 18);
      });
      ctx.restore();
    }
  }

  // ─── LEVEL 1 RICH SCENE PAINTER ────────────────────────────────────────────
  private drawLevel1Scene() {
    const ctx = this.ctx;
    const S = TILE_SIZE;
    const t = this.time;
    const mapW = 22 * S;   // 1056
    const mapH = 18 * S;   // 864
    const fcx = 8 * S;
    const fcy = 7 * S;

    // ── Courtyard background PNG ─────────────────────────────────────────
    const bgImg = this.assets['courtyard'];
    if (bgImg?.complete && bgImg.naturalWidth > 0) {
      // The plate is portrait and the map is landscape, so it can only cover the
      // map width. Pinned to the top it showed the arch and cut everything below
      // the fountain off the map — which is why the lower courtyard read as empty.
      // Anchor it on the painted fountain instead, so that fountain lands on the
      // fountain tile the animated overlays are drawn at and the benches, signs
      // and lower cobblestone all fall inside the playable area.
      const drawH = mapW * (bgImg.naturalHeight / bgImg.naturalWidth);
      const offY = Math.min(0, Math.max(mapH - drawH, fcy - COURTYARD_FOCAL_Y * drawH));
      ctx.drawImage(bgImg, 0, offY, mapW, drawH);
    } else {
      // Fallback: code-drawn static background while PNG loads
      if (!this.level1BgCache) {
        const bg = document.createElement('canvas');
        bg.width = mapW; bg.height = mapH;
        const bc = bg.getContext('2d')!;
        this.renderLevel1StaticBg(bc, S, mapW, mapH, fcx, fcy);
        this.level1BgCache = bg;
      }
      ctx.drawImage(this.level1BgCache, 0, 0);
    }

    // ── Animated overlays on top of background PNG ───────────────────────
    this.drawCrackNetwork(ctx, fcx, fcy, t);
    this.drawGateTile(ctx, 10 * S, 12 * S);
    this.drawFloatingCards();
    this.drawHiddenClue();
  }

  private renderLevel1StaticBg(
    bc: CanvasRenderingContext2D, S: number,
    mapW: number, mapH: number, fcx: number, fcy: number
  ) {
    // Deep background gradient
    const bgGrad = bc.createRadialGradient(fcx, fcy, 60, fcx, fcy, mapW * 0.75);
    bgGrad.addColorStop(0, '#0E0618'); bgGrad.addColorStop(0.5, '#070312'); bgGrad.addColorStop(1, '#03010A');
    bc.fillStyle = bgGrad; bc.fillRect(0, 0, mapW, mapH);

    // Outer stone walls
    bc.fillStyle = '#090508';
    bc.fillRect(0, 0, mapW, S); bc.fillRect(0, 17 * S, mapW, S);
    bc.fillRect(0, 0, S, mapH); bc.fillRect(21 * S, 0, S, mapH);
    bc.fillStyle = 'rgba(255,255,255,0.025)';
    for (let bx = 0; bx < 22; bx++) {
      bc.fillRect(bx * S + 2, 2, S - 4, S - 4);
      bc.fillRect(bx * S + 2, 17 * S + 2, S - 4, S - 4);
    }

    // Vegetation border rows 1 and 16
    for (let c = 1; c <= 20; c++) {
      this.drawHedgeTile(bc, c * S, 1 * S, (c * 17 + 31) | 0);
      this.drawHedgeTile(bc, c * S, 16 * S, (c * 17 + 496) | 0);
    }

    // Hedge ring
    for (let c = 2; c <= 19; c++) this.drawHedgeTile(bc, c * S, 2 * S, (c * 7 + 26) | 0);
    for (let r = 3; r <= 11; r++) {
      this.drawHedgeTile(bc, 2 * S, r * S, (14 + r * 13) | 0);
      this.drawHedgeTile(bc, 19 * S, r * S, (133 + r * 13) | 0);
    }
    for (let c = 2; c <= 9; c++) this.drawHedgeTile(bc, c * S, 12 * S, (c * 7 + 156) | 0);
    for (let c = 11; c <= 19; c++) this.drawHedgeTile(bc, c * S, 12 * S, (c * 7 + 156) | 0);

    // Cobblestone inner floor (rows 3-11, cols 3-18)
    this.drawCobblestoneFloor(bc, 3 * S, 3 * S, 16 * S, 9 * S);

    // Lower path (rows 13-15)
    bc.fillStyle = '#0C0916';
    bc.fillRect(2 * S, 13 * S, 17 * S, 3 * S);
    this.drawCobblestoneFloor(bc, 9 * S, 13 * S, S + 48, 3 * S);
    const pL = bc.createLinearGradient(2 * S, 0, 4.5 * S, 0);
    pL.addColorStop(0, 'rgba(0,0,0,0.55)'); pL.addColorStop(1, 'rgba(0,0,0,0)');
    bc.fillStyle = pL; bc.fillRect(2 * S, 13 * S, 2.5 * S, 3 * S);
    const pR = bc.createLinearGradient(16.5 * S, 0, 19 * S, 0);
    pR.addColorStop(0, 'rgba(0,0,0,0)'); pR.addColorStop(1, 'rgba(0,0,0,0.55)');
    bc.fillStyle = pR; bc.fillRect(16.5 * S, 13 * S, 2.5 * S, 3 * S);

    // Atmospheric purple tint
    const atm = bc.createRadialGradient(fcx, fcy, 30, fcx, fcy, mapW * 0.55);
    atm.addColorStop(0, 'rgba(100,40,160,0.08)');
    atm.addColorStop(0.5, 'rgba(60,20,100,0.05)');
    atm.addColorStop(1, 'rgba(20,5,40,0.1)');
    bc.fillStyle = atm; bc.fillRect(0, 0, mapW, mapH);
  }

  private drawVegetationRow(ctx: CanvasRenderingContext2D, row: number, t: number) {
    const S = TILE_SIZE;
    for (let c = 1; c <= 20; c++) {
      const tx = c * S, ty = row * S;
      const seed = c * 17 + row * 31;
      ctx.fillStyle = '#06090A';
      ctx.fillRect(tx, ty, S, S);
      // Dark soil
      ctx.fillStyle = '#0A0D0E';
      ctx.fillRect(tx + 2, ty + 2, S - 4, S - 4);
      // Scattered small flowers
      if (seed % 3 === 0) {
        const fx = tx + 6 + (seed % 30);
        const fy = ty + 8 + (seed % 24);
        ctx.fillStyle = `hsl(${260 + seed % 80},65%,38%)`;
        ctx.beginPath(); ctx.arc(fx, fy, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#B8A000';
        ctx.beginPath(); ctx.arc(fx, fy, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      // Sparse grass blades
      ctx.strokeStyle = `rgba(30,60,20,${0.5 + Math.sin(t * 0.02 + c) * 0.1})`;
      ctx.lineWidth = 1;
      for (let g = 0; g < 3; g++) {
        const gx = tx + 8 + g * 14 + (seed % 6);
        ctx.beginPath();
        ctx.moveTo(gx, ty + S - 4);
        ctx.quadraticCurveTo(gx + (seed % 5) - 2, ty + S / 2, gx + (seed % 4) - 2, ty + 4);
        ctx.stroke();
      }
    }
  }

  private drawHedgeTile(ctx: CanvasRenderingContext2D, tx: number, ty: number, seed: number) {
    const S = TILE_SIZE;
    // Very dark base
    ctx.fillStyle = '#030705';
    ctx.fillRect(tx, ty, S, S);
    // Layered bush circles — back (darkest)
    const shades = ['#0D2208','#102A09','#0E260A','#142E0C','#182F0B'];
    const lightShades = ['#1E4010','#244814','#1C3C0E','#285018'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = shades[(seed + i) % 5];
      ctx.beginPath();
      ctx.arc(tx + 6 + i * 10 + (seed % 5), ty + S - 12 + (seed * i) % 6, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    // Middle layer
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = shades[(seed + i + 1) % 5];
      ctx.beginPath();
      ctx.arc(tx + 4 + i * 12 + (seed % 4), ty + S / 2 + (seed % 6), 13, 0, Math.PI * 2);
      ctx.fill();
    }
    // Front layer (brightest)
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = lightShades[(seed + i) % 4];
      ctx.beginPath();
      ctx.arc(tx + 2 + i * 10 + (seed % 4), ty + 14 + (seed % 5), 14, 0, Math.PI * 2);
      ctx.fill();
    }
    // Specular green highlight on topmost
    ctx.fillStyle = 'rgba(60,140,30,0.12)';
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(tx + 8 + i * 22 + (seed % 4), ty + 8 + (seed % 5), 7, 0, Math.PI * 2);
      ctx.fill();
    }
    // Occasional purple flower
    if ((seed * 3) % 5 === 0) {
      const fx = tx + 5 + (seed % 34);
      const fy = ty + 6 + (seed % 22);
      ctx.fillStyle = `hsl(${265 + seed % 50},70%,42%)`;
      ctx.beginPath(); ctx.arc(fx, fy, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#D4A000';
      ctx.beginPath(); ctx.arc(fx, fy, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // Edge shadow (makes hedge look 3D)
    const shadowGrad = ctx.createLinearGradient(tx, ty + S - 8, tx, ty + S);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(tx, ty, S, S);
  }

  private drawCobblestoneFloor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    // Fill base
    ctx.fillStyle = '#13101E';
    ctx.fillRect(x, y, w, h);
    // Draw individual irregular stones
    const stoneW = 28, stoneH = 22;
    const cols2 = Math.ceil(w / stoneW) + 2;
    // Use a seeded pseudo-random placement for organic irregular stones
    const cellW = stoneW, cellH = stoneH;
    const numCols = Math.ceil(w / cellW) + 2;
    const numRows = Math.ceil(h / cellH) + 2;
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        // Deterministic jitter using hash
        const hash = (r * 1223 + c * 6271) & 0xFFFF;
        const h2   = (r * 3571 + c * 2017) & 0xFFFF;
        const h3   = (r * 7919 + c * 4001) & 0xFFFF;
        // Jitter position by up to ±30% of cell size
        const jx = ((hash % 200) / 200 - 0.5) * cellW * 0.55;
        const jy = ((h2  % 200) / 200 - 0.5) * cellH * 0.55;
        // Row offset alternates like a brick but with extra jitter
        const rowOff = r % 2 === 0 ? 0 : cellW * 0.5;
        const sx = x + c * cellW + rowOff + jx;
        const sy = y + r * cellH + jy;
        // Varied stone size: 60–100% of cell
        const sw2 = cellW * (0.62 + (hash % 100) / 260) - 2;
        const sh2 = cellH * (0.62 + (h2  % 100) / 280) - 2;
        if (sx + sw2 < x || sx > x + w || sy + sh2 < y || sy > y + h) continue;
        // Stone color: dark blue-grey with slight variation
        const lightness = 14 + (h3 % 10);
        const hue = 240 + (h3 % 30);
        ctx.fillStyle = `hsl(${hue},10%,${lightness}%)`;
        ctx.fillRect(sx, sy, sw2, sh2);
        // Top-left beveled highlight (gives 3D depth)
        ctx.fillStyle = `rgba(255,255,255,${0.04 + (h3 % 4) * 0.01})`;
        ctx.fillRect(sx, sy, sw2, 1);
        ctx.fillRect(sx, sy, 1, sh2);
        // Bottom-right shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(sx, sy + sh2 - 1, sw2, 1);
        ctx.fillRect(sx + sw2 - 1, sy, 1, sh2);
        // Occasional moss/dark spot
        if (h3 % 7 === 0) {
          ctx.fillStyle = 'rgba(20,40,10,0.3)';
          ctx.fillRect(sx + 2, sy + 2, sw2 * 0.4, sh2 * 0.4);
        }
      }
    }
    // Purple atmospheric tint overlay
    const atmGrad = ctx.createRadialGradient(x + w/2, y + h/2, 30, x + w/2, y + h/2, Math.max(w, h) * 0.7);
    atmGrad.addColorStop(0, 'rgba(80,40,120,0.07)');
    atmGrad.addColorStop(1, 'rgba(20,5,50,0.14)');
    ctx.fillStyle = atmGrad;
    ctx.fillRect(x, y, w, h);
  }

  private drawCrackNetwork(ctx: CanvasRenderingContext2D, fcx: number, fcy: number, t: number) {
    const pulse = 0.65 + Math.sin(t * 0.04) * 0.25;
    const pulse2 = 0.65 + Math.sin(t * 0.06 + 1.2) * 0.2;

    // Define major crack lines radiating from fountain
    const cracks: Array<[number, number, number, number, number][]> = [
      // [x1, y1, x2, y2, width_factor]
      [
        [fcx - 30, fcy + 40, fcx - 80, fcy + 120, 1.2],
        [fcx - 80, fcy + 120, fcx - 150, fcy + 200, 1.0],
        [fcx - 150, fcy + 200, fcx - 220, fcy + 240, 0.8],
      ],
      [
        [fcx + 20, fcy + 50, fcx + 100, fcy + 150, 1.1],
        [fcx + 100, fcy + 150, fcx + 200, fcy + 210, 0.9],
        [fcx + 200, fcy + 210, fcx + 280, fcy + 230, 0.7],
      ],
      [
        [fcx - 50, fcy - 30, fcx - 120, fcy - 80, 1.0],
        [fcx - 120, fcy - 80, fcx - 200, fcy - 100, 0.8],
        [fcx - 200, fcy - 100, fcx - 260, fcy - 60, 0.7],
      ],
      [
        [fcx + 40, fcy - 20, fcx + 130, fcy - 70, 1.0],
        [fcx + 130, fcy - 70, fcx + 240, fcy - 100, 0.8],
      ],
      [
        [fcx - 10, fcy + 60, fcx + 20, fcy + 180, 0.9],
        [fcx + 20, fcy + 180, fcx, fcy + 280, 0.7],
      ],
      // Short branch cracks
      [
        [fcx - 80, fcy + 120, fcx - 130, fcy + 130, 0.7],
      ],
      [
        [fcx + 100, fcy + 150, fcx + 120, fcy + 100, 0.6],
      ],
      [
        [fcx - 200, fcy - 100, fcx - 180, fcy - 160, 0.6],
      ],
      [
        [fcx + 200, fcy + 210, fcx + 220, fcy + 270, 0.65],
      ],
    ];

    // Outer glow pass
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const crack of cracks) {
      for (const [x1, y1, x2, y2, wf] of crack) {
        ctx.strokeStyle = `rgba(140,60,220,${pulse * 0.35})`;
        ctx.lineWidth = (8 + wf * 6);
        ctx.shadowBlur = 18;
        ctx.shadowColor = 'rgba(160,60,255,0.6)';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;

    // Inner bright crack line
    for (const crack of cracks) {
      for (const [x1, y1, x2, y2, wf] of crack) {
        ctx.strokeStyle = `rgba(200,120,255,${pulse2 * 0.7})`;
        ctx.lineWidth = wf * 2.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // Bright core line
    for (const crack of cracks) {
      for (const [x1, y1, x2, y2, wf] of crack) {
        ctx.strokeStyle = `rgba(230,180,255,${pulse * 0.5})`;
        ctx.lineWidth = wf * 0.8;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  private drawGrandFountain(ctx: CanvasRenderingContext2D, fcx: number, fcy: number, t: number) {
    const S = TILE_SIZE;
    const outerR  = S * 2.55;   // outermost stone rim
    const innerR  = S * 2.1;    // inner edge of rim / water start
    const midPlatR = S * 1.1;   // raised middle platform
    const pillarW = 30, pillarH = 72;
    const waterPulse = Math.sin(t * 0.04);
    const uPulse = 0.55 + Math.sin(t * 0.05) * 0.35;

    // ── Ground shadow ──────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(fcx + 8, fcy + 14, outerR + 12, outerR * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Outer stone basin (wide stone ring) ───────────────────────────────
    // Stone fill — medium grey-purple, clearly visible against floor
    const stoneGrad = ctx.createRadialGradient(fcx - outerR * 0.3, fcy - outerR * 0.3, 10, fcx, fcy, outerR);
    stoneGrad.addColorStop(0, '#4A3D60');
    stoneGrad.addColorStop(0.5, '#362A4C');
    stoneGrad.addColorStop(1, '#28203A');
    ctx.fillStyle = stoneGrad;
    ctx.beginPath();
    ctx.arc(fcx, fcy, outerR, 0, Math.PI * 2);
    ctx.fill();

    // Stone ring highlight — bright top-left bevel
    ctx.strokeStyle = 'rgba(200,180,240,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fcx, fcy, outerR - 2, Math.PI * 1.1, Math.PI * 0.1, false);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(80,60,110,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fcx, fcy, outerR - 2, Math.PI * 0.1, Math.PI * 1.1, false);
    ctx.stroke();

    // Outer rim decorative groove
    ctx.strokeStyle = 'rgba(160,130,210,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(fcx, fcy, outerR - 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(fcx, fcy, outerR - 12, 0, Math.PI * 2);
    ctx.stroke();

    // Stone block segments on rim (carved look)
    ctx.save();
    ctx.translate(fcx, fcy);
    for (let seg = 0; seg < 12; seg++) {
      const a1 = (seg / 12) * Math.PI * 2;
      const a2 = ((seg + 0.85) / 12) * Math.PI * 2;
      ctx.strokeStyle = seg % 2 === 0 ? 'rgba(100,80,140,0.3)' : 'rgba(50,40,70,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, outerR - 5, a1, a2);
      ctx.stroke();
    }
    ctx.restore();

    // ── Water (inside the stone rim) ──────────────────────────────────────
    const wg = ctx.createRadialGradient(fcx - 20, fcy - 20, 5, fcx, fcy, innerR);
    wg.addColorStop(0,   `rgba(80,200,255,0.92)`);
    wg.addColorStop(0.25,`rgba(40,150,220,0.88)`);
    wg.addColorStop(0.6, `rgba(15,80,160,0.82)`);
    wg.addColorStop(1,   `rgba(5,30,80,0.75)`);
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.arc(fcx, fcy, innerR - 2, 0, Math.PI * 2);
    ctx.fill();

    // Water surface shimmer lines
    for (let ring = 0; ring < 4; ring++) {
      const rr = innerR * (0.2 + ring * 0.18) + waterPulse * (ring + 1) * 2;
      const alpha = (0.28 - ring * 0.05) + Math.sin(t * 0.07 + ring * 1.8) * 0.08;
      ctx.strokeStyle = `rgba(160,230,255,${alpha})`;
      ctx.lineWidth = 1.2 - ring * 0.2;
      ctx.beginPath();
      ctx.ellipse(fcx, fcy + 5, rr, rr * 0.65, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Water caustic light patches
    for (let c = 0; c < 5; c++) {
      const ca = (c / 5) * Math.PI * 2 + t * 0.02;
      const cr = innerR * (0.3 + (c % 3) * 0.15);
      const cx3 = fcx + Math.cos(ca) * cr * 0.7;
      const cy3 = fcy + Math.sin(ca) * cr * 0.5;
      const cAlpha = (Math.sin(t * 0.08 + c * 1.3) * 0.5 + 0.5) * 0.12;
      ctx.fillStyle = `rgba(180,240,255,${cAlpha})`;
      ctx.beginPath();
      ctx.ellipse(cx3, cy3, 14, 8, ca, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Middle raised platform ────────────────────────────────────────────
    // Platform stone - clearly lighter than water
    const platG = ctx.createRadialGradient(fcx - 15, fcy - 15, 4, fcx, fcy, midPlatR);
    platG.addColorStop(0, '#5A4870');
    platG.addColorStop(0.6, '#42345A');
    platG.addColorStop(1, '#2E2240');
    ctx.fillStyle = platG;
    ctx.beginPath();
    ctx.arc(fcx, fcy, midPlatR, 0, Math.PI * 2);
    ctx.fill();
    // Platform bevel highlight
    ctx.strokeStyle = 'rgba(200,170,240,0.55)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(fcx, fcy, midPlatR - 2, Math.PI * 1.05, Math.PI * 0.15, false);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(40,30,60,0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(fcx, fcy, midPlatR - 2, Math.PI * 0.15, Math.PI * 1.05, false);
    ctx.stroke();
    // Inner groove
    ctx.strokeStyle = 'rgba(140,110,180,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(fcx, fcy, midPlatR - 7, 0, Math.PI * 2);
    ctx.stroke();

    // ── Stone pillar (tall central column) ───────────────────────────────
    const px = fcx - pillarW / 2;
    const py = fcy - pillarH;
    // Shadow behind pillar
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(px + 5, py + 6, pillarW + 3, pillarH + 5);
    // Pillar body with gradient (left-lit)
    const pGrad = ctx.createLinearGradient(px, 0, px + pillarW, 0);
    pGrad.addColorStop(0,    '#6A5485');
    pGrad.addColorStop(0.18, '#7E6499');
    pGrad.addColorStop(0.55, '#5C4470');
    pGrad.addColorStop(0.82, '#3E2E52');
    pGrad.addColorStop(1,    '#2C1E3A');
    ctx.fillStyle = pGrad;
    ctx.fillRect(px, py, pillarW, pillarH);
    // Left edge highlight
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(px, py, 3, pillarH);
    // Right edge shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(px + pillarW - 3, py, 3, pillarH);
    // Carved horizontal bands
    for (let b = 0; b < 4; b++) {
      const by = py + 10 + b * 14;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(px + 2, by, pillarW - 4, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(px + 2, by + 2, pillarW - 4, 1);
    }
    // Pillar cap (wider stone block on top)
    ctx.fillStyle = '#7A6090';
    ctx.fillRect(px - 6, py - 1, pillarW + 12, 8);
    ctx.fillStyle = '#8A7098';
    ctx.fillRect(px - 4, py - 3, pillarW + 8, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(px - 4, py - 3, pillarW + 8, 1);
    // Pillar base flare
    ctx.fillStyle = '#5A4870';
    ctx.fillRect(px - 4, py + pillarH - 6, pillarW + 8, 6);
    ctx.fillStyle = '#6A5880';
    ctx.fillRect(px - 2, py + pillarH - 4, pillarW + 4, 4);

    // ── "U" symbol — bright glowing carving ──────────────────────────────
    const ux = fcx, uy = py + 28, uR = 12;
    ctx.shadowBlur = 20;
    ctx.shadowColor = `rgba(200,120,255,${uPulse})`;
    // Outer glow ring
    ctx.strokeStyle = `rgba(180,100,255,${uPulse * 0.5})`;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ux - uR * 0.55, uy - uR);
    ctx.lineTo(ux - uR * 0.55, uy + 2);
    ctx.arc(ux, uy + 2, uR * 0.55, Math.PI, 0, false);
    ctx.lineTo(ux + uR * 0.55, uy - uR);
    ctx.stroke();
    // Bright inner stroke
    ctx.strokeStyle = `rgba(240,200,255,${0.85 + uPulse * 0.15})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(ux - uR * 0.55, uy - uR);
    ctx.lineTo(ux - uR * 0.55, uy + 2);
    ctx.arc(ux, uy + 2, uR * 0.55, Math.PI, 0, false);
    ctx.lineTo(ux + uR * 0.55, uy - uR);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // ── Mini candles around platform rim ─────────────────────────────────
    const rimCount = 6;
    for (let i = 0; i < rimCount; i++) {
      const a = (i / rimCount) * Math.PI * 2 - Math.PI / 6;
      const cx2 = fcx + Math.cos(a) * (midPlatR - 12);
      const cy2 = fcy + Math.sin(a) * (midPlatR - 12);
      this.drawMiniCandle(ctx, cx2, cy2, t + i * 0.9);
    }

    // ── Outer rim luminous edge ───────────────────────────────────────────
    const edgePulse = 0.4 + Math.sin(t * 0.035) * 0.15;
    ctx.strokeStyle = `rgba(140,100,220,${edgePulse})`;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(120,60,200,0.6)';
    ctx.beginPath();
    ctx.arc(fcx, fcy, outerR - 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }

  private drawMiniCandle(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
    const fl = 0.7 + Math.sin(t * 0.15) * 0.3;
    // Wax
    ctx.fillStyle = '#E8E0C0';
    ctx.fillRect(x - 2.5, y - 6, 5, 10);
    // Wick
    ctx.fillStyle = '#222';
    ctx.fillRect(x - 0.5, y - 8, 1, 3);
    // Flame outer
    ctx.fillStyle = `rgba(255,${130 + (fl * 80)|0},10,0.9)`;
    ctx.beginPath();
    ctx.moveTo(x - 2.5, y - 7);
    ctx.bezierCurveTo(x - 3, y - 11, x - 0.5, y - 14, x, y - 14.5);
    ctx.bezierCurveTo(x + 0.5, y - 14, x + 3, y - 11, x + 2.5, y - 7);
    ctx.closePath();
    ctx.fill();
    // Flame inner
    ctx.fillStyle = `rgba(255,235,80,0.95)`;
    ctx.beginPath();
    ctx.moveTo(x - 1, y - 7);
    ctx.bezierCurveTo(x - 1.5, y - 10, x - 0.3, y - 12.5, x, y - 13);
    ctx.bezierCurveTo(x + 0.3, y - 12.5, x + 1.5, y - 10, x + 1, y - 7);
    ctx.closePath();
    ctx.fill();
  }

  private drawCandelabra(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
    const fl = 0.6 + Math.sin(t * 0.12 + x * 0.01) * 0.3 + (Math.random() < 0.01 ? 0.3 : 0);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 14, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Base plate
    ctx.fillStyle = '#4A3800';
    ctx.fillRect(x - 8, y + 8, 16, 4);
    // Stem
    ctx.fillStyle = '#6B5200';
    ctx.fillRect(x - 2.5, y - 20, 5, 28);
    // Decorative knob
    ctx.fillStyle = '#8B7000';
    ctx.beginPath();
    ctx.arc(x, y - 6, 4, 0, Math.PI * 2);
    ctx.fill();
    // Top cup
    ctx.fillStyle = '#7A6400';
    ctx.fillRect(x - 7, y - 23, 14, 4);
    ctx.fillRect(x - 5, y - 27, 10, 5);
    // Candle wax
    ctx.fillStyle = '#EDE0B0';
    ctx.fillRect(x - 4, y - 38, 8, 13);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(x - 3, y - 37, 2, 11);
    // Wick
    ctx.fillStyle = '#222';
    ctx.fillRect(x - 0.5, y - 42, 1, 5);
    // Flame glow
    const fGlow = ctx.createRadialGradient(x, y - 44, 2, x, y - 40, 22);
    fGlow.addColorStop(0, `rgba(255,180,40,${0.4 * fl})`);
    fGlow.addColorStop(0.5, `rgba(255,100,0,${0.15 * fl})`);
    fGlow.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = fGlow;
    ctx.beginPath();
    ctx.arc(x, y - 40, 22, 0, Math.PI * 2);
    ctx.fill();
    // Flame outer
    const fh = 14 + fl * 5;
    ctx.fillStyle = `rgba(255,${120 + (fl * 100)|0},10,0.92)`;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 40);
    ctx.bezierCurveTo(x - 5, y - 40 - fh * 0.4, x - 1, y - 40 - fh, x, y - 40 - fh * 1.05);
    ctx.bezierCurveTo(x + 1, y - 40 - fh, x + 5, y - 40 - fh * 0.4, x + 4, y - 40);
    ctx.closePath();
    ctx.fill();
    // Flame inner
    ctx.fillStyle = 'rgba(255,240,60,0.95)';
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 40);
    ctx.bezierCurveTo(x - 2.5, y - 40 - fh * 0.3, x - 0.5, y - 40 - fh * 0.8, x, y - 40 - fh * 0.88);
    ctx.bezierCurveTo(x + 0.5, y - 40 - fh * 0.8, x + 2.5, y - 40 - fh * 0.3, x + 2, y - 40);
    ctx.closePath();
    ctx.fill();
  }

  private drawFlowerCluster(ctx: CanvasRenderingContext2D, tx: number, ty: number, seed: number) {
    const S = TILE_SIZE;
    ctx.fillStyle = '#0E0B14';
    ctx.fillRect(tx, ty, S, S);
    for (let f = 0; f < 4; f++) {
      const fx = tx + 7 + ((seed * (f + 1) * 7) % (S - 14));
      const fy = ty + 10 + ((seed * (f + 1) * 11) % (S - 20));
      ctx.fillStyle = '#2A4018';
      ctx.fillRect(fx - 1, fy + 3, 2, 9);
      const pHue = 255 + (seed + f * 17) % 70;
      ctx.fillStyle = `hsl(${pHue},70%,40%)`;
      ctx.beginPath(); ctx.arc(fx, fy, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `hsl(${pHue},60%,28%)`;
      ctx.beginPath(); ctx.arc(fx, fy, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#E8C200';
      ctx.beginPath(); ctx.arc(fx, fy, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }

  private drawGateTile(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
    const S = TILE_SIZE;
    if (this.gateOpen) {
      ctx.fillStyle = '#0E0B18';
      ctx.fillRect(tx, ty, S, S);
      ctx.strokeStyle = 'rgba(120,80,200,0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(tx + 4, ty + 4, S - 8, S - 8);
    } else {
      this.drawHedgeTile(ctx, tx, ty, 10 * 7 + 12 * 13);
      // Gate bars overlay
      ctx.fillStyle = '#1E1830';
      ctx.fillRect(tx + 3, ty + 3, S - 6, S - 6);
      ctx.fillStyle = '#9B59B6';
      for (let b = 0; b < 4; b++) ctx.fillRect(tx + 7 + b * 9, ty + 4, 3, S - 8);
      const gGlow = 0.5 + Math.sin(this.time * 0.1) * 0.3;
      ctx.strokeStyle = `rgba(155,89,182,${gGlow})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(tx + 2, ty + 2, S - 4, S - 4);
    }
  }

  private drawTiles() {
    const ctx = this.ctx;
    const rows = this.tiles.length;
    const cols = this.tiles[0].length;
    const startRow = Math.floor(this.camY / TILE_SIZE) - 1;
    const endRow = Math.ceil((this.camY + this.viewH / this.cameraZoom) / TILE_SIZE) + 1;
    const startCol = Math.floor(this.camX / TILE_SIZE) - 1;
    const endCol = Math.ceil((this.camX + this.viewW / this.cameraZoom) / TILE_SIZE) + 1;

    for (let row = Math.max(0, startRow); row < Math.min(rows, endRow); row++) {
      for (let col = Math.max(0, startCol); col < Math.min(cols, endCol); col++) {
        const tile = this.tiles[row][col];
        const tx = col * TILE_SIZE;
        const ty = row * TILE_SIZE;
        this.drawTile(ctx, tile, tx, ty, row, col);
      }
    }
  }

  private drawTile(ctx: CanvasRenderingContext2D, tile: number, tx: number, ty: number, row: number, col: number) {
    const S = TILE_SIZE;
    const th = this.level.levelTheme;
    switch (tile) {
      case 0: { // cobblestone floor
        ctx.fillStyle = th.floor;
        ctx.fillRect(tx, ty, S, S);
        // Individual cobblestones — 2×2 grid with row/col seed variation
        const seed0 = (row * 7 + col * 13) % 4;
        const off0 = seed0 * 2;
        // Four stone faces
        ctx.fillStyle = 'rgba(255,255,255,0.055)';
        ctx.fillRect(tx + 1,           ty + 1,           20 + off0 % 3, 21 + off0 % 2);
        ctx.fillRect(tx + 23 + off0%3, ty + 1,           S - 24 - off0%3, 21 + off0 % 2);
        ctx.fillRect(tx + 1,           ty + 24 + off0%2, 21 + off0 % 3, S - 25 - off0%2);
        ctx.fillRect(tx + 23 + off0%3, ty + 24 + off0%2, S - 24 - off0%3, S - 25 - off0%2);
        // Highlight top-left edges
        ctx.fillStyle = 'rgba(255,255,255,0.09)';
        ctx.fillRect(tx + 1,           ty + 1,           20 + off0 % 3, 1);
        ctx.fillRect(tx + 1,           ty + 1,           1, 21 + off0 % 2);
        ctx.fillRect(tx + 23 + off0%3, ty + 1,           S - 24 - off0%3, 1);
        ctx.fillRect(tx + 23 + off0%3, ty + 1,           1, 21 + off0 % 2);
        ctx.fillRect(tx + 1,           ty + 24 + off0%2, 21 + off0 % 3, 1);
        ctx.fillRect(tx + 1,           ty + 24 + off0%2, 1, S - 25 - off0%2);
        ctx.fillRect(tx + 23 + off0%3, ty + 24 + off0%2, S - 24 - off0%3, 1);
        ctx.fillRect(tx + 23 + off0%3, ty + 24 + off0%2, 1, S - 25 - off0%2);
        // Mortar / shadow between stones
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(tx + 22 + off0%2, ty, 2, S);
        ctx.fillRect(tx, ty + 22 + off0%2, S, 2);
        break;
      }
      case 1: { // outer wall
        ctx.fillStyle = th.wall;
        ctx.fillRect(tx, ty, S, S);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(tx + 2, ty + 2, S - 4, S - 4);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(tx, ty, S, 3);
        ctx.fillRect(tx, ty, 3, S);
        break;
      }
      case 2: { // inner wall / hedge
        if (this.level.id === 1) {
          // Level 1 Utah: lush green courtyard hedges
          ctx.fillStyle = '#060E04';
          ctx.fillRect(tx, ty, S, S);
          const seed2 = row * 31 + col * 17;
          const hShades = ['#1A3A0E','#1E4412','#163208','#244E16','#1C4010'];
          // Back row clusters
          for (let i = 0; i < 4; i++) {
            ctx.fillStyle = hShades[(seed2 + i) % 5];
            ctx.beginPath();
            ctx.arc(tx + 6 + i * 10 + (seed2 % 4), ty + S - 14 + (seed2 * i) % 5, 10, 0, Math.PI * 2);
            ctx.fill();
          }
          // Middle row clusters
          for (let i = 0; i < 4; i++) {
            ctx.fillStyle = hShades[(seed2 + i + 1) % 5];
            ctx.beginPath();
            ctx.arc(tx + 5 + i * 11 + (seed2 % 3), ty + S / 2 + (seed2 % 5), 11, 0, Math.PI * 2);
            ctx.fill();
          }
          // Front row (brightest)
          for (let i = 0; i < 4; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#2A5818' : '#205010';
            ctx.beginPath();
            ctx.arc(tx + 5 + i * 11 + (seed2 % 4), ty + 14 + (seed2 % 4), 13, 0, Math.PI * 2);
            ctx.fill();
          }
          // Leaf highlights
          ctx.fillStyle = 'rgba(80,160,40,0.11)';
          for (let i = 0; i < 2; i++) {
            ctx.beginPath();
            ctx.arc(tx + 10 + i * 20, ty + 10 + (seed2 % 3) * 2, 6, 0, Math.PI * 2);
            ctx.fill();
          }
          // Occasional purple flower
          if ((seed2 * 3) % 7 < 2) {
            const fx = tx + 4 + (seed2 % 36);
            const fy = ty + 8 + (seed2 % 24);
            ctx.fillStyle = `hsl(${270 + seed2 % 40},70%,50%)`;
            ctx.beginPath();
            ctx.arc(fx, fy, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.fillStyle = th.innerWall;
          ctx.fillRect(tx, ty, S, S);
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(tx + 3, ty + 3, S - 6, S - 6);
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              if ((i + j) % 2 === 0) ctx.fillRect(tx + 4 + i * 14, ty + 4 + j * 14, 12, 12);
            }
          }
        }
        break;
      }
      case 3: { // stone fountain / memorial
        // Stone base
        ctx.fillStyle = '#1E1638';
        ctx.fillRect(tx, ty, S, S);
        // Stone highlight bevel
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(tx + 2, ty + 2, S - 4, S - 4);
        // Dark inner pool
        ctx.fillStyle = th.water;
        ctx.beginPath();
        ctx.arc(tx + S / 2, ty + S / 2, S / 2 - 4, 0, Math.PI * 2);
        ctx.fill();
        // Water shimmer
        const wave = Math.sin(this.fountainAnim + col * 0.5 + row * 0.3) * 2;
        ctx.fillStyle = 'rgba(60,90,180,0.35)';
        ctx.fillRect(tx + 9, ty + 9 + wave, S - 18, S - 14);
        // Purple glow pulse
        const glowAlpha = 0.14 + Math.sin(this.time * 0.05 + col + row) * 0.06;
        const fg = ctx.createRadialGradient(tx + S / 2, ty + S / 2, 2, tx + S / 2, ty + S / 2, S / 2 + 2);
        fg.addColorStop(0, `rgba(155,89,182,${glowAlpha * 2})`);
        fg.addColorStop(1, `rgba(155,89,182,0)`);
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(tx + S / 2, ty + S / 2, S / 2 + 2, 0, Math.PI * 2);
        ctx.fill();
        // Stone rim
        ctx.strokeStyle = 'rgba(100,70,160,0.7)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(tx + 2, ty + 2, S - 4, S - 4);
        break;
      }
      case 4: { // purple flower accent patch
        ctx.fillStyle = th.accent;
        ctx.fillRect(tx, ty, S, S);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(tx, ty, S, S);
        const seed4 = row * 100 + col;
        const flowerCount = 2 + (seed4 % 3);
        for (let f = 0; f < flowerCount; f++) {
          const fx = tx + 8 + ((seed4 * (f + 1) * 7) % (S - 16));
          const fy = ty + 10 + ((seed4 * (f + 1) * 11) % (S - 20));
          // Stem
          ctx.fillStyle = '#2A4A18';
          ctx.fillRect(fx - 1, fy + 2, 2, 8);
          // Petals
          const pHue = 260 + (seed4 + f * 17) % 60;
          ctx.fillStyle = `hsl(${pHue},68%,46%)`;
          ctx.beginPath();
          ctx.arc(fx, fy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `hsl(${pHue},68%,30%)`;
          ctx.beginPath();
          ctx.arc(fx, fy, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        // Occasional sparkle
        if ((seed4 * 3 + row) % 5 === 0) {
          const sx4 = tx + 10 + (seed4 * 5 % 28);
          const sy4 = ty + 10 + (seed4 * 3 % 28);
          const spkA = (Math.sin(this.time * 0.12 + seed4) * 0.5 + 0.5) * 0.7;
          ctx.fillStyle = `rgba(180,100,255,${spkA})`;
          ctx.beginPath();
          ctx.arc(sx4, sy4, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 5: { // cracked stone with glowing purple fissures
        ctx.fillStyle = th.stone;
        ctx.fillRect(tx, ty, S, S);
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(tx + 2, ty + 2, S - 4, S - 4);
        const crackPulse = 0.5 + Math.sin(this.time * 0.08 + col * 0.5 + row * 0.7) * 0.35;
        // Outer glow pass
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(155,89,182,0.9)';
        ctx.strokeStyle = `rgba(155,89,182,${crackPulse * 0.7})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(tx + 5, ty + 5);
        ctx.lineTo(tx + 19, ty + 24);
        ctx.lineTo(tx + 33, ty + 13);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tx + 14, ty + 30);
        ctx.lineTo(tx + 30, ty + 43);
        ctx.stroke();
        // Inner bright line
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(210,160,255,${crackPulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx + 5, ty + 5);
        ctx.lineTo(tx + 19, ty + 24);
        ctx.lineTo(tx + 33, ty + 13);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tx + 14, ty + 30);
        ctx.lineTo(tx + 30, ty + 43);
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        break;
      }
      case 6: { // detailed candle with animated flame
        ctx.fillStyle = th.floor;
        ctx.fillRect(tx, ty, S, S);
        // Cobblestone texture under candle
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(tx + 1, ty + 1, S - 2, S - 2);
        const cx6 = tx + S / 2;
        const cy6 = ty + S / 2 + 6;
        const fl = this.candleFlicker;
        // Flame ambient glow
        const fGlow = ctx.createRadialGradient(cx6, cy6 - 14, 1, cx6, cy6 - 10, 18);
        fGlow.addColorStop(0, `rgba(255,180,40,${0.32 * fl})`);
        fGlow.addColorStop(1, 'rgba(255,100,0,0)');
        ctx.fillStyle = fGlow;
        ctx.beginPath();
        ctx.arc(cx6, cy6 - 10, 18, 0, Math.PI * 2);
        ctx.fill();
        // Candle holder (bronze cup)
        ctx.fillStyle = '#7A6400';
        ctx.fillRect(cx6 - 6, cy6 + 12, 12, 4);
        ctx.fillRect(cx6 - 4, cy6 + 10, 8, 3);
        // Wax cylinder
        ctx.fillStyle = '#EDE8C8';
        ctx.fillRect(cx6 - 4, cy6 - 8, 8, 19);
        // Wax highlight
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(cx6 - 3, cy6 - 7, 2, 17);
        // Wax shadow
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(cx6 + 2, cy6 - 8, 2, 19);
        // Wick
        ctx.fillStyle = '#222';
        ctx.fillRect(cx6 - 1, cy6 - 11, 2, 4);
        // Flame — outer orange
        const fw = 4 + fl * 1.5;
        const fh = 10 + fl * 3;
        ctx.fillStyle = `rgba(255,${110 + Math.floor(fl * 90)},10,0.94)`;
        ctx.beginPath();
        ctx.moveTo(cx6 - fw, cy6 - 8);
        ctx.bezierCurveTo(cx6 - fw - 2, cy6 - 8 - fh * 0.4, cx6 - 1, cy6 - 8 - fh, cx6, cy6 - 8 - fh * 1.1);
        ctx.bezierCurveTo(cx6 + 1, cy6 - 8 - fh, cx6 + fw + 2, cy6 - 8 - fh * 0.4, cx6 + fw, cy6 - 8);
        ctx.closePath();
        ctx.fill();
        // Flame — inner yellow
        ctx.fillStyle = 'rgba(255,235,60,0.96)';
        ctx.beginPath();
        ctx.moveTo(cx6 - 2, cy6 - 8);
        ctx.bezierCurveTo(cx6 - 3, cy6 - 8 - fh * 0.3, cx6 - 0.5, cy6 - 8 - fh * 0.8, cx6, cy6 - 8 - fh * 0.9);
        ctx.bezierCurveTo(cx6 + 0.5, cy6 - 8 - fh * 0.8, cx6 + 3, cy6 - 8 - fh * 0.3, cx6 + 2, cy6 - 8);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 7: { // gate
        if (this.gateOpen) {
          ctx.fillStyle = th.floor;
          ctx.fillRect(tx, ty, S, S);
          ctx.strokeStyle = th.glow.replace(/[\d.]+\)$/, '0.3)');
          ctx.lineWidth = 2;
          ctx.strokeRect(tx + 4, ty + 4, S - 8, S - 8);
        } else {
          ctx.fillStyle = th.innerWall;
          ctx.fillRect(tx, ty, S, S);
          ctx.fillStyle = th.gate;
          for (let b = 0; b < 4; b++) {
            ctx.fillRect(tx + 6 + b * 10, ty + 4, 4, S - 8);
          }
          const gGlow7 = Math.sin(this.time * 0.1) * 0.3 + 0.7;
          ctx.strokeStyle = th.glow.replace(/[\d.]+\)$/, `${gGlow7})`);
          ctx.lineWidth = 2;
          ctx.strokeRect(tx + 2, ty + 2, S - 4, S - 4);
        }
        break;
      }
      case 8: { // cobblestone path
        ctx.fillStyle = th.path;
        ctx.fillRect(tx, ty, S, S);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(tx + 2, ty + 2, S - 4, S - 4);
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx + S / 2, ty);
        ctx.lineTo(tx + S / 2, ty + S);
        ctx.stroke();
        break;
      }
      default: {
        ctx.fillStyle = th.wall;
        ctx.fillRect(tx, ty, S, S);
      }
    }
  }

  private drawNPCs() {
    const ctx = this.ctx;
    for (let i = 0; i < this.level.npcs.length; i++) {
      const npc = this.level.npcs[i];
      const x = npc.x * TILE_SIZE + TILE_SIZE / 2;
      const y = npc.y * TILE_SIZE + TILE_SIZE / 2;
      const interacted = this.npcInteracted[i];

      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.beginPath();
      ctx.ellipse(x, y + 16, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      const sprKey = npcSpriteKey(this.level.id, i);
      const spr = this.sprites[sprKey];
      const bobY = Math.sin(this.time * 0.07 + i * 1.2) * 2;

      if (spr) {
        const h = 84;
        const w = h * (spr.width / spr.height);
        ctx.save();
        ctx.translate(x, y + 16 + bobY);
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 6;
        ctx.drawImage(spr, -w / 2, -h, w, h);
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.restore();
      } else {
        // Fallback: code-drawn NPC
        const NW = 68, NH = 112, NCX = 34, NCY = 72;
        const nofc = this.charOfc;
        nofc.width = NW; nofc.height = NH;
        const noCtx = nofc.getContext('2d')!;
        noCtx.clearRect(0, 0, NW, NH);
        if (i === 0) this.drawNPC_Witness(noCtx, NCX, NCY);
        else if (i === 1) this.drawNPC_Scholar(noCtx, NCX, NCY);
        else this.drawNPC_Guard(noCtx, NCX, NCY);
        this.stampWithOutline(nofc, x - NCX, y - NCY);
      }

      // Interact indicator
      if (!interacted) {
        const bobY = Math.sin(this.time * 0.1) * 3;
        // Speech bubble
        ctx.fillStyle = 'rgba(240,235,255,0.97)';
        ctx.beginPath();
        (ctx as any).roundRect(x - 17, y - 62 + bobY, 34, 19, 5);
        ctx.fill();
        ctx.strokeStyle = 'rgba(180,140,255,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Bubble tail
        ctx.fillStyle = 'rgba(240,235,255,0.97)';
        ctx.beginPath();
        ctx.moveTo(x - 4, y - 44 + bobY);
        ctx.lineTo(x + 2, y - 38 + bobY);
        ctx.lineTo(x + 7, y - 44 + bobY);
        ctx.fill();
        // Dots
        ctx.fillStyle = '#6644AA';
        for (let d = 0; d < 3; d++) {
          ctx.beginPath();
          ctx.arc(x - 6 + d * 6, y - 52 + bobY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Checkmark badge
        ctx.fillStyle = 'rgba(40,180,100,0.8)';
        ctx.beginPath();
        ctx.arc(x, y - 42, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,255,160,0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('✓', x, y - 38);
      }

      // Name tag
      ctx.fillStyle = 'rgba(5,2,18,0.82)';
      const nameW = npc.name.length * 6 + 12;
      ctx.beginPath();
      (ctx as any).roundRect(x - nameW / 2, y - 80, nameW, 14, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(180,140,255,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#D8C0FF';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(npc.name, x, y - 70);
    }
  }

  // NPC 0: The Witness — young man, warm skin, tan detective coat, flat cap
  private drawNPC_Witness(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const p = (rx: number, ry: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color; ctx.fillRect(x + rx - w/2, y + ry - h/2, w, h);
    };
    const skin  = '#8B5A2B';
    const skinD = '#6A3F18';
    const skinL = '#A87040';
    const coat  = '#7A5A30';
    const coatD = '#5A3E1A';
    const coatL = '#9A7848';

    // ── SHOES ──────────────────────────────────────────────────────────────
    p(-5, 21, 10, 4, '#1C1008');
    p(5, 21, 10, 4, '#1C1008');
    p(-6, 20, 5, 3, '#28180C');
    p(6, 20, 5, 3, '#28180C');
    p(-7, 21, 3, 2, '#3A2410');  // toe highlight

    // ── TROUSERS ───────────────────────────────────────────────────────────
    p(-5, 11, 8, 13, '#2A2030');
    p(5, 11, 8, 13, '#2A2030');
    p(-4, 10, 2, 12, '#382840');  // left crease
    p(4, 10, 2, 12, '#382840');
    p(-5, 17, 8, 3, '#221828');   // cuffs
    p(5, 17, 8, 3, '#221828');

    // ── COAT BACK / TAILS ──────────────────────────────────────────────────
    p(0, 8, 24, 8, coatD);
    p(-10, 10, 6, 6, '#4A3018');  // left tail
    p(10, 10, 6, 6, '#4A3018');

    // ── COAT BODY ──────────────────────────────────────────────────────────
    p(0, -1, 22, 22, coat);
    p(8, -1, 7, 22, coatD);       // right shadow
    p(-9, -1, 5, 22, coatL);      // left highlight
    // Coat texture lines (tweed-like)
    for (let i = 0; i < 4; i++) {
      p(0, -4 + i * 5, 20, 1, 'rgba(0,0,0,0.12)');
    }
    // Coat bottom edge
    p(0, 9, 22, 3, coatD);

    // ── LAPELS & COLLAR ────────────────────────────────────────────────────
    p(-4, -7, 6, 12, '#5A3E20');  // left lapel
    p(4, -7, 6, 12, '#6A4E28');   // right lapel (lighter)
    p(0, -5, 4, 10, '#3A2810');   // center shadow/notch
    // Shirt collar
    p(-3, -12, 6, 5, '#E8DCBC');
    p(-2, -13, 4, 4, '#F5ECD0');
    // Necktie — dark amber
    p(0, -8, 4, 10, '#9A6010');
    p(0, -8, 2, 8, '#B87818');
    p(0, -9, 3, 3, '#C88820');    // tie knot

    // ── COAT SLEEVES & ARMS ────────────────────────────────────────────────
    p(-13, -1, 6, 16, coatD);
    p(-14, -1, 3, 14, coat);
    p(13, -1, 6, 16, coatD);
    p(14, -1, 3, 14, coat);
    // Cuffs
    p(-13, 8, 6, 5, '#C8BC9C');
    p(13, 8, 6, 5, '#C8BC9C');
    // Hands
    p(-13, 13, 6, 6, skin);
    p(-14, 12, 3, 4, skinL);
    p(13, 13, 6, 6, skin);
    p(12, 12, 3, 4, skinL);

    // ── WAISTCOAT BUTTONS ──────────────────────────────────────────────────
    p(1, -4, 3, 12, '#4A3018');
    for (let b = 0; b < 3; b++) {
      p(1, -2 + b * 4, 3, 3, '#D4A020');
      p(1, -1 + b * 4, 2, 2, '#E8B828');
    }
    // Pocket square
    p(-9, -6, 5, 5, '#C89A20');
    p(-8, -7, 4, 4, '#E8B030');

    // ── NECK ───────────────────────────────────────────────────────────────
    p(0, -16, 7, 5, skin);
    p(-2, -17, 4, 3, skinL);

    // ── HEAD ───────────────────────────────────────────────────────────────
    p(0, -26, 20, 18, skin);
    p(7, -26, 6, 16, skinD);      // right shadow
    p(-7, -29, 5, 8, skinL);      // left highlight / forehead
    // Ears
    p(-11, -24, 4, 7, skin);
    p(-12, -23, 3, 5, skinL);
    p(-11, -22, 2, 3, skinD);
    p(11, -24, 4, 7, skin);
    p(12, -23, 3, 5, skinD);

    // ── FACE ────────────────────────────────────────────────────────────────
    p(0, -25, 14, 12, skinL);     // face center lighter
    p(0, -28, 10, 6, '#C08048');  // forehead bright
    // Nose — rounded, friendly
    p(1, -22, 5, 5, skin);
    p(2, -21, 3, 3, skinD);
    p(-1, -22, 3, 2, skinL);
    // Mouth — warm slight smile
    p(0, -18, 9, 2, skinD);
    p(2, -17, 5, 2, '#7A3A18');
    p(-1, -18, 4, 1, '#A85A30');  // upper lip
    p(3, -16, 3, 1, '#8A4820');   // smile corner

    // ── EYES ────────────────────────────────────────────────────────────────
    // Whites
    p(-5, -26, 7, 5, '#F5EDCC');
    p(5, -26, 7, 5, '#F5EDCC');
    // Iris — warm dark brown
    p(-5, -26, 3, 5, '#1A0A04');
    p(5, -26, 3, 5, '#1A0A04');
    // Shines
    p(-6, -27, 2, 2, 'rgba(255,255,255,0.9)');
    p(4, -27, 2, 2, 'rgba(255,255,255,0.9)');
    // Lower lid warmth
    p(-4, -22, 5, 1, '#A87040');
    p(4, -22, 5, 1, '#A87040');
    // Eyelashes
    p(-5, -29, 7, 2, '#1A0804');
    p(5, -29, 7, 2, '#1A0804');
    // Eyebrows — short, arched, expressive
    p(-4, -31, 7, 2, '#2A1408');
    p(-3, -32, 5, 1, '#1A0C04');
    p(4, -31, 7, 2, '#2A1408');
    p(3, -32, 5, 1, '#1A0C04');

    // ── HAIR ────────────────────────────────────────────────────────────────
    // Short dark hair visible at sides under cap
    p(-9, -31, 5, 7, '#1C0C04');
    p(9, -31, 5, 7, '#1C0C04');
    p(-7, -29, 3, 5, '#28140A');

    // ── FLAT CAP ────────────────────────────────────────────────────────────
    // Cap body — warm tan/brown
    p(0, -37, 24, 10, '#4A3418');
    p(-1, -40, 20, 8, '#5A4022');
    p(-1, -42, 16, 6, '#6A4E2A');  // top panel
    p(-1, -43, 12, 3, '#7A5A30');  // top crown
    p(-1, -44, 8, 2, '#8A6A38');
    // Cap texture lines
    p(-7, -40, 14, 1, 'rgba(0,0,0,0.15)');
    p(-8, -38, 16, 1, 'rgba(0,0,0,0.12)');
    p(-8, -35, 18, 1, 'rgba(0,0,0,0.1)');
    // Cap side panel seam
    p(-10, -38, 2, 8, '#3A2810');
    p(9, -38, 2, 8, '#3A2810');
    // Cap brim (extended front)
    p(-2, -30, 26, 4, '#3A2410');
    p(-2, -29, 24, 2, '#4A3018');
    p(-2, -29, 20, 1, '#5A3C20');  // brim highlight
    // Cap button on top
    p(0, -44, 4, 4, '#382010');
    p(0, -45, 3, 3, '#4A2C14');
    // Cap highlight top-left
    p(-7, -43, 8, 2, 'rgba(255,255,255,0.08)');
  }

  // NPC 1: The Scholar — young woman, round glasses, dark blue academic robe
  private drawNPC_Scholar(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const p = (rx: number, ry: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x + rx - w/2, y + ry - h/2, w, h);
    };
    // Shoes — pointed black flats
    p(-4, 21, 8, 3, '#0C0C1A');
    p(5, 21, 8, 3, '#0C0C1A');
    p(-5, 20, 4, 2, '#1A1A2C');
    p(6, 20, 4, 2, '#1A1A2C');
    // Dark blue dress/robe
    p(0, 6, 18, 28, '#1A1A3C');
    p(7, 6, 5, 28, '#12122C'); // right shadow
    p(-8, 6, 4, 28, '#22224C'); // left highlight
    // Robe hem pattern
    p(0, 18, 18, 2, '#242450');
    p(0, 20, 16, 1, '#2E2E60');
    // Academic sash / belt
    p(0, -2, 18, 4, '#4A1A6A');
    p(0, -2, 14, 2, '#5C2280');
    // Sash buckle
    p(0, -2, 4, 4, '#C8A020');
    // Collar — white academic
    p(-3, -11, 7, 5, '#E0DCCC');
    p(0, -12, 4, 4, '#F0ECD8');
    // Robe upper body
    p(0, -5, 20, 14, '#1C1C40');
    p(7, -5, 6, 14, '#14143A');
    p(-8, -5, 5, 14, '#242454');
    // Sleeves — wide academic sleeves
    p(-13, 0, 6, 16, '#16163A');
    p(13, 0, 6, 16, '#16163A');
    p(-14, 0, 3, 14, '#1C1C44');
    p(14, 0, 3, 14, '#1C1C44');
    // Hands
    p(-14, 14, 5, 5, '#C49060');
    p(14, 14, 5, 5, '#C49060');
    // Book in left hand
    p(-14, 8, 8, 10, '#8B1A1A');
    p(-14, 8, 6, 8, '#A02020');
    p(-14, 8, 1, 8, '#C43030'); // spine highlight
    p(-12, 9, 4, 1, '#D4A8A8');
    p(-12, 11, 5, 1, '#D4A8A8');
    p(-12, 13, 3, 1, '#D4A8A8');
    // Neck
    p(0, -16, 6, 5, '#B87848');
    // Head — medium brown skin
    p(0, -24, 17, 16, '#C88A50');
    p(6, -24, 5, 14, '#A86A38'); // right shadow
    p(-7, -23, 3, 12, '#D89A60'); // left light
    // Ear
    p(-9, -22, 3, 5, '#B87848');
    p(9, -22, 3, 5, '#B87848');
    // Natural hair — large puff, dark brown
    p(0, -34, 22, 16, '#1C0C04');
    p(0, -34, 22, 16, '#1C0C04');
    p(-9, -29, 8, 12, '#140804');
    p(9, -29, 8, 12, '#140804');
    p(0, -40, 16, 10, '#140804');
    p(-5, -42, 10, 10, '#0C0402');
    p(5, -42, 10, 10, '#0C0402');
    // Hair sheen — dark reddish highlight
    p(-3, -36, 8, 5, '#2C1408');
    // Face — lighter center
    p(0, -23, 12, 10, '#D09058');
    // Nose
    p(0, -22, 4, 4, '#C08048');
    p(1, -21, 2, 2, '#A86838');
    // Round glasses frames — gold wire
    p(-5, -27, 7, 5, 'rgba(0,0,0,0)');
    // Left lens
    ctx.strokeStyle = '#D4A020';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 8.5, y - 30, 7, 6);
    // Right lens
    ctx.strokeRect(x + 1.5, y - 30, 7, 6);
    // Bridge
    ctx.fillStyle = '#D4A020';
    ctx.fillRect(x - 1, y - 28, 3, 1);
    // Eye left
    p(-5, -27, 5, 4, '#F5EED5');
    p(-5, -27, 2, 3, '#1A0800');
    p(-6, -27, 1, 1, 'rgba(255,255,255,0.8)');
    // Eye right
    p(5, -27, 5, 4, '#F5EED5');
    p(5, -27, 2, 3, '#1A0800');
    p(4, -27, 1, 1, 'rgba(255,255,255,0.8)');
    // Eyebrows — arched, thoughtful
    p(-4, -30, 6, 2, '#1A0C04');
    p(4, -30, 6, 2, '#1A0C04');
    // Mouth — small, slight smile
    p(0, -20, 5, 2, '#8A4828');
    p(2, -19, 2, 1, '#A85C38');
  }

  // NPC 2: The Guard — tall, armored figure, dark visor, crossed arms
  private drawNPC_Guard(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const p = (rx: number, ry: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x + rx - w/2, y + ry - h/2, w, h);
    };
    // Heavy boots
    p(-5, 21, 10, 5, '#0C0A14');
    p(5, 21, 10, 5, '#0C0A14');
    p(-6, 19, 5, 4, '#1A1628');
    p(6, 19, 5, 4, '#1A1628');
    p(-7, 22, 4, 2, '#24203A'); // toe cap highlight
    p(7, 22, 4, 2, '#24203A');
    // Armored greaves (shin guards)
    p(-5, 12, 8, 12, '#2A2640');
    p(5, 12, 8, 12, '#2A2640');
    p(-5, 10, 4, 10, '#3A3658'); // highlight left
    p(5, 12, 3, 8, '#1C1830'); // shadow right
    // Greave center ridge
    p(-5, 11, 2, 10, '#444068');
    p(5, 11, 2, 10, '#444068');
    // Body armor — dark purple-grey plate
    p(0, -2, 24, 26, '#1E1C2E');
    // Chest plate highlight
    p(-8, -5, 8, 20, '#2A2840');
    // Chest plate shadow
    p(8, -2, 6, 22, '#141220');
    // Armor segment lines
    p(0, -6, 22, 2, '#141220');
    p(0, 2, 22, 2, '#141220');
    p(0, 8, 22, 2, '#141220');
    // Shoulder pauldrons — wide
    p(-15, -10, 10, 10, '#26243C');
    p(15, -10, 10, 10, '#26243C');
    p(-16, -12, 6, 6, '#342E50');
    p(16, -12, 6, 6, '#342E50');
    p(-15, -14, 4, 3, '#3E3860');
    p(15, -14, 4, 3, '#3E3860');
    // Pauldron spikes / studs
    p(-15, -16, 3, 3, '#5A5478');
    p(15, -16, 3, 3, '#5A5478');
    // Crossed arms over chest
    p(-4, 2, 14, 5, '#2A2840');
    p(4, 4, 14, 5, '#1E1C30');
    // Gauntlets
    p(-12, 5, 7, 7, '#222038');
    p(12, 5, 7, 7, '#222038');
    p(-13, 4, 4, 5, '#2E2C48'); // highlight
    p(11, 6, 4, 5, '#181628');
    // Glove knuckles
    for (let k = 0; k < 3; k++) {
      p(-12 + k * 2, 3, 2, 2, '#3C3A58');
      p(10 + k * 2, 3, 2, 2, '#3C3A58');
    }
    // Purple cape / cloak hanging behind
    p(0, 8, 20, 30, '#3C1060');
    p(7, 10, 6, 28, '#2A0A44');
    p(-8, 8, 5, 28, '#4A1C70');
    // Cape clasp
    p(0, -10, 6, 4, '#D4A020');
    p(0, -10, 4, 2, '#E8B830');
    // Neck gorget (collar armor)
    p(0, -15, 10, 5, '#2A2840');
    p(0, -16, 8, 3, '#3A3858');
    // Helmet — full face, dark visor
    p(0, -28, 18, 18, '#252340');
    // Helmet sides
    p(-9, -28, 4, 16, '#1E1C38');
    p(9, -28, 4, 16, '#1E1C38');
    // Helmet top dome
    p(0, -34, 16, 10, '#1C1A30');
    p(-2, -36, 12, 8, '#252340');
    p(-2, -38, 8, 6, '#2E2C48');
    // Crest on top
    p(0, -42, 4, 8, '#7A1A1A');
    p(0, -44, 3, 4, '#A02020');
    p(0, -46, 2, 4, '#CC2828');
    // Dark visor — subtle eye slit glow
    p(0, -27, 14, 5, '#0C0A18');
    p(0, -27, 12, 3, '#080614');
    // Visor slit glow — purple
    p(-3, -27, 8, 2, 'rgba(140,80,200,0.5)');
    p(-2, -27, 6, 1, 'rgba(180,100,255,0.7)');
    // Helmet chin guard
    p(0, -22, 12, 5, '#1E1C30');
    p(0, -22, 10, 3, '#28263E');
    // Helmet rivets
    p(-7, -32, 2, 2, '#3C3A58');
    p(7, -32, 2, 2, '#3C3A58');
    p(-8, -27, 2, 2, '#3C3A58');
    p(8, -27, 2, 2, '#3C3A58');
    // Helmet highlight — top-left rim
    p(-6, -36, 5, 2, 'rgba(255,255,255,0.07)');
  }

  /** Render offscreen character canvas to main canvas with a 2px dark pixel outline. */
  private stampWithOutline(ofc: HTMLCanvasElement, destX: number, destY: number, scale = 1.28) {
    const ctx = this.ctx;
    const dw = Math.round(ofc.width * scale);
    const dh = Math.round(ofc.height * scale);
    // Shift so the character centre stays in the same screen position
    const dx = Math.round(destX - (dw - ofc.width) / 2);
    const dy = Math.round(destY - (dh - ofc.height) / 2);
    ctx.save();
    ctx.shadowColor = '#05010A';
    ctx.shadowBlur = 0;
    const o = 2;
    for (const [ox, oy] of [
      [-o, 0], [o, 0], [0, -o], [0, o],
      [-o, -o], [-o, o], [o, -o], [o, o],
    ] as [number, number][]) {
      ctx.shadowOffsetX = ox;
      ctx.shadowOffsetY = oy;
      ctx.drawImage(ofc, dx, dy, dw, dh);
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.drawImage(ofc, dx, dy, dw, dh);
    ctx.restore();
  }

  private drawPlayer() {
    const mx = Math.round(this.px);
    const my = Math.round(this.py);
    const ctx = this.ctx;

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(mx, my + 16, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Use PNG sprite if loaded
    const facingUp = this.facing === 'up';
    const facingLeft = this.facing === 'left';
    const sprKey = facingUp ? 'candyBack' : 'candyFront';
    const spr = this.sprites[sprKey];

    if (spr) {
      // Draw at ~92px tall, centered horizontally, feet at my+16
      const h = 92;
      const w = h * (spr.width / spr.height);
      // Walking animation: fast footstep bob + body sway + tilt
      const walkPhase = this.time * 0.42; // faster cycle for visible bounce
      const bobY   = this.moving
        ? Math.abs(Math.sin(walkPhase)) * -5   // lift up with each step (always upward)
        : Math.sin(this.time * 0.06) * 1.2;   // gentle idle breathe
      const swayX  = this.moving ? Math.sin(walkPhase) * 2.5 : 0;
      const tiltRad = this.moving ? Math.sin(walkPhase) * 0.055 : 0; // subtle body tilt

      // Shadow squash/stretch — wider when foot hits ground
      const shadowW = this.moving ? 22 + Math.abs(Math.sin(walkPhase)) * 6 : 22;
      const shadowH = this.moving ? 7  - Math.abs(Math.sin(walkPhase)) * 2 : 7;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(mx, my + 16, shadowW, shadowH, 0, 0, Math.PI * 2);
      ctx.fill();

      // No side-facing art exists for Candy, so left/right is faked by narrowing
      // the front sprite into a three-quarter turn. 0.62 still reads as a person;
      // the old 0.38 flattened her into a sliver. The mirror plus an opposite lean
      // and a small weight shift is what makes left and right tell apart.
      const isSideways = this.facing === 'left' || this.facing === 'right';
      const dir = facingLeft ? -1 : 1;
      const scaleX = isSideways ? dir * 0.62 : 1;
      const leanRad = isSideways ? dir * 0.06 : 0;
      const leadX   = isSideways ? dir * 3 : 0;

      ctx.save();
      ctx.translate(mx + swayX + leadX, my + 16 + bobY);
      // Rotate before scale so the lean stays in world space and does not flip
      // direction along with the mirrored sprite.
      ctx.rotate(tiltRad * dir + leanRad);
      ctx.scale(scaleX, 1);
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 5;
      ctx.drawImage(spr, -w / 2, -h, w, h);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.restore();

      // Debug-only directional arrow (hidden during normal gameplay)
      if (this.showDebug && isSideways) {
        ctx.save();
        ctx.fillStyle = 'rgba(220,150,255,0.8)';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.facing === 'right' ? '▶' : '◀', mx, my - h + 10);
        ctx.restore();
      }

      // Attack arc
      if (this.attacking && this.attackTimer > ATTACK_DURATION - 12) {
        ctx.strokeStyle = 'rgba(220,150,255,0.9)';
        ctx.lineWidth = 5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(180,80,255,0.8)';
        ctx.beginPath();
        const r = 38;
        if (this.facing === 'right')      { ctx.arc(mx + 8,  my,     r, -Math.PI / 2, Math.PI / 2); }
        else if (this.facing === 'left')  { ctx.arc(mx - 8,  my,     r,  Math.PI / 2, Math.PI * 1.5); }
        else if (this.facing === 'up')    { ctx.arc(mx,      my - 8, r,  Math.PI,     Math.PI * 2); }
        else                              { ctx.arc(mx,      my + 8, r,  0,           Math.PI); }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      }
      return;
    }

    // ── Fallback: code-drawn character ───────────────────────────────────
    {
    // Render character to offscreen canvas, then stamp with outline
    const OW = 76, OH = 126;
    const CX = 38, CY = 82; // local character centre within offscreen canvas
    const ofc = this.charOfc;
    ofc.width = OW; ofc.height = OH;
    const oCtx = ofc.getContext('2d')!;
    oCtx.clearRect(0, 0, OW, OH);

    // All drawing below uses offscreen ctx and local coords (x=CX, y=CY)
    const ctx = oCtx;
    const x = CX, y = CY;
    // Walk cycle: legs alternate, arms swing opposite
    const walkCycle = this.moving ? Math.sin(this.time * 0.28) : 0;
    const legL = walkCycle * 7;
    const legR = -walkCycle * 7;
    const armSwing = walkCycle * 5;
    const facingLeft = this.facing === 'left';
    const jacketBase = this.attacking ? '#A030E8' : '#7834CC';
    const jacketMid  = this.attacking ? '#8820C0' : '#5E28A8';
    const jacketDark = this.attacking ? '#6010A0' : '#421680';
    const jacketHigh = this.attacking ? '#C050FF' : '#9850E0'; // bright highlight
    const skin = '#5A2C14';
    const skinMid = '#7A3C1E';
    const skinLight = '#9A5030';
    const skinDark = '#3A1808';

    const p = (rx: number, ry: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x + rx - w/2, y + ry - h/2, w, h);
    };

    // ── BOOTS ─────────────────────────────────────────────────────────────
    // chunky platform boots for strong silhouette
    p(-6, 23 + legL, 11, 5, '#0A0818');  // left sole
    p(-6, 19 + legL, 10, 7, '#14102A');  // left upper
    p(-8, 20 + legL, 4, 4, '#1E1840');   // left toe cap highlight
    p(-5, 18 + legL, 4, 2, '#2A2248');   // left ankle highlight
    p(6, 23 + legR, 11, 5, '#0A0818');
    p(6, 19 + legR, 10, 7, '#14102A');
    p(4, 20 + legR, 4, 4, '#1E1840');
    p(5, 18 + legR, 4, 2, '#2A2248');

    // ── PANTS / LEGGINGS ──────────────────────────────────────────────────
    p(-6, 10 + legL, 9, 14, '#181228');
    p(-5, 9 + legL, 4, 12, '#201A34');
    p(6, 10 + legR, 9, 14, '#181228');
    p(5, 9 + legR, 4, 12, '#201A34');
    // cuff trim
    p(-6, 16 + legL, 9, 3, '#2C2450');
    p(6, 16 + legR, 9, 3, '#2C2450');

    // ── BACK ARM ──────────────────────────────────────────────────────────
    const backArm = facingLeft ? 1 : -1;
    p(backArm * 14, -5 + armSwing * backArm, 7, 16, jacketDark);
    // cuff
    p(backArm * 14, 4 + armSwing * backArm, 7, 4, '#2C2450');
    // hand
    p(backArm * 14, 8 + armSwing * backArm, 6, 6, skinMid);

    // ── JACKET BODY ───────────────────────────────────────────────────────
    // Wide torso, 4 panels for strong shading
    p(-11, -5, 9, 26, jacketDark);    // far left shadow
    p(-4,  -5, 9, 26, jacketMid);     // left-center
    p(4,   -5, 9, 26, jacketBase);    // right-center
    p(11,  -5, 6, 26, jacketHigh);    // right highlight edge
    // Bottom flare/coat tails
    p(0, 12, 26, 5, jacketDark);
    p(0, 14, 24, 4, '#300E60');
    // Wide shoulder panels
    p(-13, -10, 6, 8, jacketDark);
    p(13,  -10, 6, 8, jacketMid);

    // Lapels — deep V collar
    p(-5, -13, 6, 12, '#341270');
    p(5,  -13, 6, 12, '#482090');
    p(0,  -16, 5, 7,  '#200A50');  // center V shadow
    // Shirt at collar
    p(-1, -17, 6, 6, '#EEE8D8');
    p(0,  -18, 5, 4, '#F8F0E0');
    // Center seam
    p(0, -5, 2, 22, '#300E60');
    // Buttons — larger, more visible
    for (let b = 0; b < 4; b++) {
      p(0, -8 + b * 6, 4, 4, '#9040D0');
      p(0, -7 + b * 6, 3, 3, '#B060F0');
      p(-1, -8 + b * 6, 2, 2, 'rgba(200,150,255,0.5)'); // button shine
    }
    // Ornate purple brooch on left lapel
    p(-7, -11, 7, 7, '#CC44FF');
    p(-7, -11, 5, 5, '#EE88FF');
    p(-8, -12, 3, 3, 'rgba(255,220,255,0.9)');
    p(-6, -10, 2, 2, '#AA00CC');
    // Jacket lining/trim at bottom edge
    p(0, 14, 24, 2, '#7030B0');

    // Golden notebook — bigger, more detailed
    p(-10, 1, 8, 11, '#B07808');
    p(-10, 1, 6, 9, '#D09010');
    p(-11, 0, 3, 10, '#E8A820'); // spine
    p(-9, 2, 5, 1, '#7A5000');
    p(-9, 4, 5, 1, '#7A5000');
    p(-9, 6, 4, 1, '#7A5000');
    p(-11, 1, 2, 2, 'rgba(255,220,120,0.6)'); // spine shine

    // ── FRONT ARM ─────────────────────────────────────────────────────────
    const frontArm = facingLeft ? -1 : 1;
    p(frontArm * 14, -7 - armSwing * frontArm, 7, 17, jacketMid);
    p(frontArm * 16, -7 - armSwing * frontArm, 4, 15, jacketHigh); // outer edge highlight
    // cuff
    p(frontArm * 14, 1 - armSwing * frontArm, 7, 4, '#2C2450');
    // hand
    p(frontArm * 14, 6 - armSwing * frontArm, 6, 6, skinLight);

    // ── NECK ──────────────────────────────────────────────────────────────
    p(0, -22, 8, 6, skin);
    p(-2, -23, 5, 4, skinMid);

    // ── HEAD — oversized chibi, dominant feature ───────────────────────────
    // Wide round head
    p(0, -35, 26, 22, skin);       // main head block
    p(8, -35, 8, 20, skinDark);    // right side shadow
    p(-8, -39, 8, 10, skinMid);    // upper left highlight
    // Rounded corners with arcs
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(x - 10, y - 37, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 10, y - 37, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 10, y - 27, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 10, y - 27, 6, 0, Math.PI * 2); ctx.fill();
    // Ear left
    p(-15, -32, 5, 8, skin);
    p(-16, -31, 4, 5, skinMid);
    p(-15, -29, 2, 3, skinDark);
    // Ear right
    p(15, -32, 5, 8, skin);
    p(16, -31, 4, 5, skinDark);

    // ── FACE ──────────────────────────────────────────────────────────────
    // Face zone (center, brighter)
    p(0, -34, 18, 16, skinMid);
    p(0, -38, 14, 7, skinLight);   // bright forehead
    // Cute button nose
    p(1, -29, 5, 4, skin);
    p(2, -27, 4, 3, skinDark);
    p(-1, -29, 3, 2, skinMid);
    // Wide happy-but-determined mouth
    p(0, -24, 10, 2, skinDark);
    p(3, -23, 5, 2, '#5A2818');
    p(-2, -24, 4, 1, '#7A3820');  // upper lip
    // Chin dimple
    p(0, -22, 8, 3, skin);
    p(0, -21, 4, 2, skinDark);
    // Cheek blush — warm rose
    p(-9, -28, 7, 4, 'rgba(200,80,80,0.25)');
    p(9, -28, 7, 4, 'rgba(200,80,80,0.25)');

    // ── EYES — big expressive chibi ────────────────────────────────────────
    // Larger eye whites
    p(-7, -34, 9, 7, '#FAF5E0');
    p(7, -34, 9, 7, '#FAF5E0');
    // Dark iris fill
    p(-7, -34, 7, 7, '#100404');
    p(7, -34, 7, 7, '#100404');
    // Iris color — deep warm brown with purple tint
    p(-7, -34, 6, 6, '#280C04');
    p(7, -34, 6, 6, '#280C04');
    // Iris highlight ring
    p(-8, -35, 4, 3, '#401060');
    p(6, -35, 4, 3, '#401060');
    // Pupil
    p(-7, -34, 3, 4, '#000000');
    p(7, -34, 3, 4, '#000000');
    // Big eye shines — main + secondary
    p(-8, -36, 3, 3, 'rgba(255,255,255,0.95)');
    p(-6, -33, 2, 2, 'rgba(255,255,255,0.55)');
    p(6, -36, 3, 3, 'rgba(255,255,255,0.95)');
    p(8, -33, 2, 2, 'rgba(255,255,255,0.55)');
    // Lower lid crease
    p(-7, -30, 8, 1, skinDark);
    p(7, -30, 8, 1, skinDark);
    // Top eyelash band
    p(-7, -37, 10, 3, '#080202');
    p(7, -37, 10, 3, '#080202');
    // Eyelash tips — subtle flicks
    p(-11, -37, 3, 2, '#080202');
    p(12, -37, 3, 2, '#080202');
    // Bold expressive eyebrows with slight arch
    p(-7, -41, 10, 3, '#0E0404');
    p(-6, -42, 8, 2, '#000000');
    p(7, -41, 10, 3, '#0E0404');
    p(6, -42, 8, 2, '#000000');
    // Brow arch highlight
    p(-8, -40, 3, 1, '#3A1808');
    p(6, -40, 3, 1, '#3A1808');

    // ── AFRO — massive, signature silhouette ────────────────────────────────
    // Base mass — many overlapping large arcs for full volume
    ctx.fillStyle = '#0A0302';
    ctx.beginPath(); ctx.arc(x,      y - 50, 17, 0, Math.PI * 2); ctx.fill(); // center top
    ctx.beginPath(); ctx.arc(x - 14, y - 44, 14, 0, Math.PI * 2); ctx.fill(); // left cluster
    ctx.beginPath(); ctx.arc(x + 14, y - 44, 13, 0, Math.PI * 2); ctx.fill(); // right cluster
    ctx.beginPath(); ctx.arc(x - 7,  y - 57, 13, 0, Math.PI * 2); ctx.fill(); // upper left
    ctx.beginPath(); ctx.arc(x + 7,  y - 57, 13, 0, Math.PI * 2); ctx.fill(); // upper right
    ctx.beginPath(); ctx.arc(x,      y - 63, 14, 0, Math.PI * 2); ctx.fill(); // crown
    ctx.beginPath(); ctx.arc(x - 17, y - 36, 10, 0, Math.PI * 2); ctx.fill(); // lower left side
    ctx.beginPath(); ctx.arc(x + 17, y - 36, 10, 0, Math.PI * 2); ctx.fill(); // lower right side
    ctx.beginPath(); ctx.arc(x - 20, y - 48, 9, 0, Math.PI * 2);  ctx.fill(); // far left
    ctx.beginPath(); ctx.arc(x + 20, y - 48, 8, 0, Math.PI * 2);  ctx.fill(); // far right
    // Inner texture bumps — slightly lighter dark brown
    ctx.fillStyle = '#1A0804';
    ctx.beginPath(); ctx.arc(x - 10, y - 54, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 10, y - 54, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x,      y - 60, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 5,  y - 46, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 6,  y - 46, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 15, y - 52, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 15, y - 52, 5, 0, Math.PI * 2); ctx.fill();
    // Sheen — top-left glow
    ctx.fillStyle = 'rgba(80,30,10,0.55)';
    ctx.beginPath(); ctx.arc(x - 7, y - 58, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(60,20,5,0.35)';
    ctx.beginPath(); ctx.arc(x - 3, y - 62, 5, 0, Math.PI * 2); ctx.fill();

    // Purple scrunchie / hair band — prominent
    p(0, -66, 14, 5, '#8820D0');
    p(0, -66, 11, 4, '#AA40EE');
    p(-3, -67, 6, 4, '#CC60FF');
    p(3, -65, 5, 3, '#6608B0');
    // Scrunchie sparkles
    p(-5, -69, 3, 3, 'rgba(255,180,255,0.9)');
    p(4, -67, 3, 3, 'rgba(210,130,255,0.7)');
    p(0, -70, 2, 2, 'rgba(255,220,255,0.8)');
    // Little decorative star pin in hair
    p(-12, -58, 4, 4, '#FFD700');
    p(-12, -58, 2, 2, 'rgba(255,255,180,0.9)');
    p(-13, -59, 2, 2, '#FFD700');

    // Stamp offscreen character to main canvas with outline
    this.stampWithOutline(ofc, mx - CX, my - CY);

    // Attack arc drawn on main canvas after stamp
    if (this.attacking && this.attackTimer > ATTACK_DURATION - 12) {
      const mctx = this.ctx;
      mctx.strokeStyle = 'rgba(220,150,255,0.9)';
      mctx.lineWidth = 5;
      mctx.shadowBlur = 12;
      mctx.shadowColor = 'rgba(180,80,255,0.8)';
      mctx.beginPath();
      const r = 38;
      if (this.facing === 'right')      { mctx.arc(mx + 8,  my,     r, -Math.PI / 2, Math.PI / 2); }
      else if (this.facing === 'left')  { mctx.arc(mx - 8,  my,     r,  Math.PI / 2, Math.PI * 1.5); }
      else if (this.facing === 'up')    { mctx.arc(mx,      my - 8, r,  Math.PI,     Math.PI * 2); }
      else                              { mctx.arc(mx,      my + 8, r,  0,           Math.PI); }
      mctx.stroke();
      mctx.shadowBlur = 0;
      mctx.shadowColor = 'transparent';
    }
    } // end fallback block
  }

  private drawBoss() {
    const ctx = this.ctx;
    const x = Math.round(this.bossX);
    const y = Math.round(this.bossY);
    const flashing = this.bossFlash > 0 && Math.floor(this.bossFlash / 3) % 2 === 0;

    // Glow aura — uses level boss variant color
    const bossAura = this.level.bossConfig?.aura ?? 'rgba(180,0,255,0.7)';
    const aura = ctx.createRadialGradient(x, y, 10, x, y, 70);
    aura.addColorStop(0, bossAura.replace(/[\d.]+\)$/, '0.35)'));
    aura.addColorStop(1, bossAura.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(x, y, 70, 0, Math.PI * 2);
    ctx.fill();

    // Orbiting particles
    const count = 6 + this.bossPhase * 3;
    for (let i = 0; i < count; i++) {
      const angle = this.bossOrbitAngle + (i / count) * Math.PI * 2;
      const radius = 44 + Math.sin(this.time * 0.05 + i) * 8;
      const px2 = x + Math.cos(angle) * radius;
      const py2 = y + Math.sin(angle) * radius;
      ctx.fillStyle = flashing ? '#FFFFFF' : `hsl(${280 + i * 15},90%,65%)`;
      ctx.beginPath();
      ctx.arc(px2, py2, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Boss body — the level's boss plate, tinted with its suit colour.
    // Falls back to the original orb only while the art is still loading.
    const bodyPulse = Math.sin(this.time * 0.1) * 3;
    const bossSpr = this.getBossSprite();
    if (bossSpr) {
      const bh = 138 + bodyPulse;
      const bw = bh * (bossSpr.width / bossSpr.height);
      ctx.save();
      if (this.bossDead) ctx.globalAlpha = Math.max(0, 1 - this.bossDeathTimer / 130);
      if (flashing) ctx.filter = 'brightness(2.4) saturate(0.35)';
      ctx.shadowColor = bossAura;
      ctx.shadowBlur = 16;
      ctx.drawImage(bossSpr, x - bw / 2, y + 26 - bh, bw, bh);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.filter = 'none';
      ctx.restore();
    } else {
      const bodyColor = this.bossDead ? '#FF4444' : (flashing ? '#FFFFFF' : '#4A0080');
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(x, y, 28 + bodyPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = flashing ? '#FF8800' : '#7B2FBE';
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(x - 2, y - 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Name tag
    if (!this.bossDead) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(x - 60, y - 55, 120, 16);
      ctx.fillStyle = '#FF6666';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.level.bossName.toUpperCase(), x, y - 43);
    }

    // Charging indicator
    if (this.bossAttackMode === 'charging') {
      ctx.strokeStyle = '#FF2222';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 32, y - 32, 64, 64);
    }
  }

  private drawProjectiles() {
    const ctx = this.ctx;
    for (const p of this.projectiles) {
      ctx.fillStyle = '#FF4466';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FF8899';
      ctx.beginPath();
      ctx.arc(p.x - 2, p.y - 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawHiddenClue() {
    if (this.hiddenClueCollected) return;
    const hx = this.level.hiddenCluePos.x * TILE_SIZE + TILE_SIZE / 2;
    const hy = this.level.hiddenCluePos.y * TILE_SIZE + TILE_SIZE / 2;
    const ctx = this.ctx;
    const glow = this.hiddenClueGlow;

    ctx.fillStyle = `rgba(255, 215, 0, ${glow * 0.3})`;
    ctx.beginPath();
    ctx.arc(hx, hy, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 215, 0, ${0.6 + glow * 0.4})`;
    ctx.font = '18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('★', hx, hy + 6);
  }

  private drawExit() {
    const ctx = this.ctx;
    const ex = this.level.exitPos.x * TILE_SIZE + TILE_SIZE / 2;
    const ey = this.level.exitPos.y * TILE_SIZE + TILE_SIZE / 2;
    const t = this.time;

    // Portal glow
    const grad = ctx.createRadialGradient(ex, ey, 5, ex, ey, 40);
    grad.addColorStop(0, 'rgba(100, 255, 200, 0.8)');
    grad.addColorStop(0.5, 'rgba(50, 180, 255, 0.4)');
    grad.addColorStop(1, 'rgba(50, 180, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ex, ey, 40, 0, Math.PI * 2);
    ctx.fill();

    // Spinning ring
    ctx.strokeStyle = `rgba(100, 255, 200, ${0.6 + Math.sin(t * 0.1) * 0.3})`;
    ctx.lineWidth = 3;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(t * 0.04);
    ctx.strokeRect(-22, -22, 44, 44);
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', ex, ey - 44);
    ctx.fillStyle = 'rgba(100, 255, 200, 0.8)';
    ctx.fillText('▶ NEXT LEVEL ◀', ex, ey - 30);
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ─── ENVIRONMENT EXTRAS ──────────────────────────────────────────────────

  private drawEnvironmentExtras() {
    const ctx = this.ctx;
    this.drawFountainCenter();
    this.drawFloatingCards();
    this.drawBarrierTape(ctx);
    if (this.level.id === 1) {
      this.drawBench(ctx, 15 * TILE_SIZE + TILE_SIZE / 2, 6 * TILE_SIZE + TILE_SIZE / 2);
      this.drawBench(ctx, 3 * TILE_SIZE + TILE_SIZE / 2, 8 * TILE_SIZE + TILE_SIZE / 2);
      this.drawSign(ctx, 2 * TILE_SIZE, 8 * TILE_SIZE, ['RUMORS', 'LIE.', 'RECORDS', "DON'T."]);
      this.drawSign(ctx, 17 * TILE_SIZE, 8 * TILE_SIZE, ['NO ENTRY', 'BEYOND', 'THE TRUTH']);
      this.drawFlag(ctx, 18 * TILE_SIZE, 2 * TILE_SIZE + TILE_SIZE / 2);
    }
  }

  private drawBarrierTape(ctx: CanvasRenderingContext2D) {
    const gateRow = this.level.gatePos.y;
    const cols = this.tiles[0].length;
    const tapeY = (gateRow - 0.55) * TILE_SIZE;
    const startX = 1.5 * TILE_SIZE;
    const endX = (cols - 1.5) * TILE_SIZE;
    const totalW = endX - startX;

    const segments = [
      { x1: startX, x2: startX + totalW * 0.34 },
      { x1: startX + totalW * 0.37, x2: startX + totalW * 0.63 },
      { x1: startX + totalW * 0.66, x2: endX },
    ];

    for (const seg of segments) {
      const midX = (seg.x1 + seg.x2) / 2;
      // Posts
      ctx.fillStyle = '#6B5A30';
      ctx.fillRect(seg.x1 - 2, tapeY - 22, 4, 24);
      ctx.fillRect(seg.x2 - 2, tapeY - 22, 4, 24);
      // Post tops
      ctx.fillStyle = '#B8960C';
      ctx.beginPath();
      ctx.arc(seg.x1, tapeY - 24, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(seg.x2, tapeY - 24, 4, 0, Math.PI * 2);
      ctx.fill();
      // Gold tape
      ctx.fillStyle = '#D4A017';
      ctx.fillRect(seg.x1 + 2, tapeY - 5, seg.x2 - seg.x1 - 4, 9);
      // Tape text
      ctx.fillStyle = '#1A1000';
      ctx.font = 'bold 6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('MINDLINE  DO NOT CROSS  ✦', midX, tapeY + 1);
    }
  }

  private drawBench(ctx: CanvasRenderingContext2D, x: number, y: number) {
    // Painted bench where the art has loaded. Level 1 does not come through here —
    // its benches are already in the courtyard plate — so this only dresses 2-20.
    const spr = this.sprites['bench'];
    if (spr) {
      const bw = 58;
      const bh = bw * (spr.height / spr.width);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.beginPath();
      ctx.ellipse(x, y + 10, bw * 0.44, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(spr, x - bw / 2, y + 10 - bh, bw, bh);
      ctx.restore();
      return;
    }

    // Fallback: code-drawn bench
    // Back rest (top, since top-down)
    ctx.fillStyle = '#3D2B1F';
    ctx.fillRect(x - 24, y - 20, 48, 8);
    ctx.fillStyle = '#5C4033';
    ctx.fillRect(x - 22, y - 19, 44, 6);
    // Seat
    ctx.fillStyle = '#3D2B1F';
    ctx.fillRect(x - 24, y - 10, 48, 14);
    ctx.fillStyle = '#5C4033';
    ctx.fillRect(x - 22, y - 8, 44, 5);
    ctx.fillRect(x - 22, y - 1, 44, 4);
    // Legs (visible below seat)
    ctx.fillStyle = '#2A1A10';
    ctx.fillRect(x - 20, y + 4, 6, 7);
    ctx.fillRect(x + 14, y + 4, 6, 7);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x - 22, y + 11, 44, 4);
  }

  private drawSign(ctx: CanvasRenderingContext2D, tx: number, ty: number, lines: string[]) {
    const cx = tx + TILE_SIZE / 2;
    const sw = 58;
    const sh = lines.length * 10 + 14;
    const sx = cx - sw / 2;
    const sy = ty + TILE_SIZE * 0.15;
    // Post
    ctx.fillStyle = '#4A3520';
    ctx.fillRect(cx - 2, sy + sh, 4, 18);
    // Board shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(sx - 1, sy - 1, sw + 4, sh + 4);
    // Board bg
    ctx.fillStyle = '#1C1408';
    ctx.fillRect(sx, sy, sw, sh);
    // Border
    ctx.strokeStyle = 'rgba(180,140,60,0.7)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx, sy, sw, sh);
    // Inner margin line
    ctx.strokeStyle = 'rgba(180,140,60,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 3, sy + 3, sw - 6, sh - 6);
    // Text lines
    ctx.fillStyle = '#E8D060';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], cx, sy + 11 + i * 10);
    }
  }

  private drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number) {
    // Flagpole
    ctx.strokeStyle = '#8B7536';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + 16);
    ctx.lineTo(x, y - 44);
    ctx.stroke();
    // Pole top ball
    ctx.fillStyle = '#D4AF37';
    ctx.beginPath();
    ctx.arc(x, y - 44, 4, 0, Math.PI * 2);
    ctx.fill();
    // Waving flag
    const wave = Math.sin(this.time * 0.07) * 4;
    const wave2 = Math.sin(this.time * 0.07 + 1) * 2;
    ctx.fillStyle = '#5B21B6';
    ctx.beginPath();
    ctx.moveTo(x, y - 42);
    ctx.bezierCurveTo(x + 12, y - 40 + wave, x + 24, y - 34 + wave, x + 30 + wave, y - 30 + wave2);
    ctx.bezierCurveTo(x + 24, y - 22 + wave2, x + 12, y - 18 + wave, x, y - 20);
    ctx.closePath();
    ctx.fill();
    // Flag border
    ctx.strokeStyle = 'rgba(180,130,255,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // "U" letter on flag
    ctx.fillStyle = '#E0C8FF';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('U', x + 14, y - 28);
    // "VERITAS" small text below
    ctx.fillStyle = 'rgba(220,200,255,0.7)';
    ctx.font = '5px monospace';
    ctx.fillText('VERITAS', x + 14, y - 20);
  }

  private drawFountainCenter() {
    // Find bounding box of fountain tiles (tile 3)
    const rows = this.tiles.length;
    const cols = this.tiles[0].length;
    let minR = rows, maxR = -1, minC = cols, maxC = -1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.tiles[r][c] === 3) {
          if (r < minR) minR = r; if (r > maxR) maxR = r;
          if (c < minC) minC = c; if (c > maxC) maxC = c;
        }
      }
    }
    if (maxR < 0) return;
    const cx = ((minC + maxC) / 2 + 0.5) * TILE_SIZE;
    const cy = ((minR + maxR) / 2 + 0.5) * TILE_SIZE;
    const ctx = this.ctx;
    const t = this.time;

    // Outer circular pool rim
    const poolR = ((maxC - minC) / 2 + 0.5) * TILE_SIZE - 6;
    ctx.strokeStyle = 'rgba(80,55,120,0.8)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, poolR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(130,90,200,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, poolR - 5, 0, Math.PI * 2);
    ctx.stroke();

    // Pedestal base circle
    ctx.fillStyle = '#261A3C';
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3A2850';
    ctx.beginPath();
    ctx.arc(cx, cy, 19, 0, Math.PI * 2);
    ctx.fill();

    // Pillar body
    ctx.fillStyle = '#302244';
    ctx.fillRect(cx - 14, cy - 46, 28, 48);
    ctx.fillStyle = 'rgba(255,255,255,0.055)';
    ctx.fillRect(cx - 13, cy - 45, 5, 46);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(cx + 7, cy - 46, 7, 48);

    // Pillar cap
    ctx.fillStyle = '#3A2850';
    ctx.fillRect(cx - 17, cy - 49, 34, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(cx - 16, cy - 49, 32, 2);

    // Shield face on pillar
    ctx.fillStyle = '#4A366A';
    ctx.fillRect(cx - 11, cy - 42, 22, 26);
    ctx.strokeStyle = 'rgba(190,150,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 11, cy - 42, 22, 26);

    // "U" inscription
    ctx.fillStyle = '#D5B3FF';
    ctx.font = 'bold 17px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('U', cx, cy - 22);

    // Purple base glow
    const glowPulse = 0.28 + Math.sin(t * 0.05) * 0.1;
    const basGlow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 32);
    basGlow.addColorStop(0, `rgba(155,89,182,${glowPulse})`);
    basGlow.addColorStop(1, 'rgba(155,89,182,0)');
    ctx.fillStyle = basGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.fill();

    // Water ripple rings
    ctx.strokeStyle = `rgba(100,150,255,${0.12 + Math.sin(t * 0.06) * 0.04})`;
    ctx.lineWidth = 1;
    for (let rr = 1; rr <= 3; rr++) {
      ctx.beginPath();
      ctx.arc(cx, cy + 6, rr * 13 + Math.sin(t * 0.05 + rr) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawFloatingCards() {
    if (this.level.id !== 1) return;
    const ctx = this.ctx;
    const t = this.time;
    // Anchor near fountain top-left
    const ax = 4 * TILE_SIZE;
    const ay = 4 * TILE_SIZE;
    const cards = [
      { ox: 10,  oy: -20, sp: 0.022, amp: 7,  ph: 0,   suit: '♠', rot: -18 },
      { ox: 60,  oy: -50, sp: 0.027, amp: 5,  ph: 1.5, suit: '♥', rot: 22  },
      { ox: -20, oy: -70, sp: 0.019, amp: 9,  ph: 0.8, suit: '♠', rot: -5  },
      { ox: 80,  oy: -30, sp: 0.023, amp: 6,  ph: 2.1, suit: '♦', rot: 35  },
    ];
    for (const card of cards) {
      const cx2 = ax + card.ox + Math.sin(t * card.sp + card.ph) * card.amp;
      const cy2 = ay + card.oy + Math.cos(t * card.sp * 0.7 + card.ph) * card.amp * 0.6;
      const rot = (card.rot + Math.sin(t * card.sp * 1.3 + card.ph) * 5) * Math.PI / 180;
      ctx.save();
      ctx.translate(cx2, cy2);
      ctx.rotate(rot);
      ctx.globalAlpha = 0.82;
      // Card body
      ctx.fillStyle = '#F0EDE8';
      ctx.fillRect(-8, -12, 16, 20);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-8, -12, 16, 20);
      // Suit symbol
      ctx.fillStyle = (card.suit === '♥' || card.suit === '♦') ? '#BB2222' : '#111122';
      ctx.font = 'bold 12px serif';
      ctx.textAlign = 'center';
      ctx.fillText(card.suit, 0, 3);
      ctx.font = '6px serif';
      ctx.fillText(card.suit, -5, -7);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // ─── PUBLIC API ──────────────────────────────────────────────────────────

  /** Attach (or detach) the PixiJS glow overlay. Call before or after loadLevel(). */
  setPixiGlow(pixi: PixiGlow | null) {
    this.pixiGlow = pixi;
    if (pixi && this.tiles.length > 0) {
      pixi.setupLevel(this.tiles, this.level.id);
    }
  }

  getDialogueLines(): DialogueLine[] { return this.dialogueLines; }
  getDialogueIndex(): number { return this.dialogueIndex; }
  getCollectedClues(): Clue[] { return this.level.clues.filter(c => this.collectedClueIds.has(c.id)); }
  getPlayerHp(): number { return this.playerHp; }
  getBossHp(): number { return this.bossHp; }
  getBossMaxHp(): number { return this.bossMaxHp; }
  isBossActive(): boolean { return this.bossActive && !this.bossDead; }
  isGateOpen(): boolean { return this.gateOpen; }
  getClueCount(): number { return this.collectedClueIds.size; }
  pause() { this.setGameState('paused'); }
  resume() { 
    const prev = this._gameState;
    const next = prev === 'paused' ? (this.bossActive && !this.bossDead ? 'boss' : 'exploring') : 'exploring';
    this._gameState = next as GameState;
    this.cb.onStateChange(next as GameState);
  }
}
