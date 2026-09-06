// ─── Candy in Wonderland — AudioManager ──────────────────────────────────────
// Full Web Audio API synthesis engine. No external files required.
// All music is generated with oscillators, envelopes, and a look-ahead scheduler.

// ─── Frequencies (A4 = 440 Hz) ───────────────────────────────────────────────
const hz = (s: number) => +(440 * Math.pow(2, s / 12)).toFixed(3);
const R = 0; // rest
const A2=hz(-24),B2=hz(-22),
  C3=hz(-21),D3=hz(-19),Eb3=hz(-18),E3=hz(-17),F3=hz(-16),Fs3=hz(-15),G3=hz(-14),Ab3=hz(-13),A3=hz(-12),Bb3=hz(-11),B3=hz(-10),
  C4=hz(-9),Db4=hz(-8),D4=hz(-7),Eb4=hz(-6),E4=hz(-5),F4=hz(-4),Fs4=hz(-3),G4=hz(-2),Ab4=hz(-1),A4=hz(0),Bb4=hz(1),B4=hz(2),
  C5=hz(3),D5=hz(5),Eb5=hz(6),E5=hz(7),F5=hz(8),Fs5=hz(9),G5=hz(10),A5=hz(12);

// ─── Track Definition ─────────────────────────────────────────────────────────
// note: [freq_hz, duration_in_quarter_beats]   freq=0 → rest
type Note = readonly [number, number];
interface TrackDef {
  bpm: number;
  melody: Note[];
  bass: Note[];
  melodyWave: OscillatorType;
  bassWave: OscillatorType;
  melodyVol: number;
  bassVol: number;
}

// ─── ALL TRACKS ───────────────────────────────────────────────────────────────
// Each melody/bass must sum to equal beat counts (or multiples) for clean looping.
const TRACKS: Record<string, TrackDef> = {

  // ── MAIN MENU — "Wonderland Overture" (D minor, 68 BPM) ──────────────────
  menu: { bpm:68,
    melody:[[D4,2],[F4,1],[A4,1],[G4,2],[E4,1],[D4,1],[R,1],[A3,1],[F4,2],[Bb4,1],[A4,1],[G4,2]],
    bass:  [[D3,4],[A3,4],[Bb3,4],[F3,4]],
    melodyWave:'triangle', bassWave:'sine', melodyVol:0.32, bassVol:0.18 },

  // ── LEVEL 1 — Utah "Candles in the Courtyard" (D minor, 60 BPM) ──────────
  level1: { bpm:60,
    melody:[[D4,2],[R,1],[F4,1],[E4,2],[D4,2],[R,2],[A4,2],[G4,1],[F4,1],[E4,2]],
    bass:  [[D3,4],[A3,4],[G3,4],[F3,4]],
    melodyWave:'triangle', bassWave:'sine', melodyVol:0.28, bassVol:0.16 },

  // ── LEVEL 2 — Arizona "Files Beneath the Sand" (E minor, 72 BPM) ─────────
  level2: { bpm:72,
    melody:[[E4,1],[G4,1],[A4,2],[G4,1],[E4,1],[B4,2],[A4,2],[G4,1],[Fs4,1],[E4,4]],
    bass:  [[E3,4],[B3,4],[A3,4],[E3,4]],
    melodyWave:'sine', bassWave:'sine', melodyVol:0.3, bassVol:0.17 },

  // ── LEVEL 3 — Texas "Neon Rumor Road" (A minor, 75 BPM) ─────────────────
  level3: { bpm:75,
    melody:[[A4,1],[C5,1],[B4,1],[A4,1],[G4,2],[E4,2],[F4,1],[G4,1],[A4,2],[R,2],[A4,2]],
    bass:  [[A2,4],[E3,4],[D3,4],[E3,4]],
    melodyWave:'sawtooth', bassWave:'sine', melodyVol:0.18, bassVol:0.2 },

  // ── LEVEL 4 — Florida "Swamp Signal" (A minor, 68 BPM) ───────────────────
  level4: { bpm:68,
    melody:[[A4,1],[C5,1],[E5,2],[D5,1],[C5,1],[B4,2],[A4,2],[G4,1],[A4,1],[R,2],[A4,2]],
    bass:  [[A2,4],[E3,4],[G3,4],[E3,4]],
    melodyWave:'sine', bassWave:'sine', melodyVol:0.3, bassVol:0.18 },

  // ── LEVEL 5 — Georgia "Marble Testimony" (F major, 60 BPM) ───────────────
  level5: { bpm:60,
    melody:[[C4,1],[D4,1],[F4,2],[A4,2],[G4,2],[F4,2],[E4,2],[D4,1],[C4,3]],
    bass:  [[F3,4],[C3,4],[Bb3,4],[C3,4]],
    melodyWave:'triangle', bassWave:'triangle', melodyVol:0.3, bassVol:0.17 },

  // ── LEVEL 6 — New York "Headlines at Midnight" (G minor, 80 BPM) ─────────
  level6: { bpm:80,
    melody:[[G4,1],[Bb4,1],[D5,2],[C5,1],[Bb4,1],[A4,2],[G4,1],[F4,1],[G4,2],[Bb4,2],[D5,2]],
    bass:  [[G3,4],[D3,4],[Eb3,4],[D3,4]],
    melodyWave:'triangle', bassWave:'sine', melodyVol:0.28, bassVol:0.18 },

  // ── LEVEL 7 — California "Glitch Garden" (G major, 85 BPM) ───────────────
  level7: { bpm:85,
    melody:[[G4,1],[A4,1],[B4,1],[D5,1],[B4,1],[A4,1],[G4,2],[E4,2],[D4,1],[G4,1],[A4,1],[B4,1],[G4,2]],
    bass:  [[G3,4],[D3,4],[G3,4],[D3,4]],
    melodyWave:'sine', bassWave:'sine', melodyVol:0.3, bassVol:0.16 },

  // ── LEVEL 8 — Nevada "Static Over the Dunes" (E minor, 65 BPM) ───────────
  level8: { bpm:65,
    melody:[[E4,3],[G4,1],[A4,2],[B4,2],[A4,1],[G4,1],[E4,3],[D4,1],[E4,2]],
    bass:  [[E3,4],[B3,4],[E3,4],[B3,4]],
    melodyWave:'triangle', bassWave:'sine', melodyVol:0.28, bassVol:0.16 },

  // ── LEVEL 9 — Illinois "Paper Trails" (C minor, 60 BPM) ──────────────────
  level9: { bpm:60,
    melody:[[C4,2],[Eb4,1],[F4,1],[G4,2],[Ab4,1],[G4,1],[F4,2],[Eb4,2],[C4,2],[R,2]],
    bass:  [[C3,4],[G3,4],[Ab3,4],[G3,4]],
    melodyWave:'triangle', bassWave:'sine', melodyVol:0.3, bassVol:0.18 },

  // ── LEVEL 10 — Pennsylvania "Bell of the Mirror Hall" (D major, 62 BPM) ──
  level10: { bpm:62,
    melody:[[D4,2],[Fs4,2],[A4,2],[B4,1],[A4,1],[Fs4,2],[E4,2],[D4,2],[R,2]],
    bass:  [[D3,4],[A3,4],[G3,4],[A3,4]],
    melodyWave:'triangle', bassWave:'triangle', melodyVol:0.32, bassVol:0.18 },

  // ── LEVEL 11 — Ohio "Iron Roads" (A minor, 72 BPM) ───────────────────────
  level11: { bpm:72,
    melody:[[A4,1],[C5,1],[D5,1],[E5,1],[D5,1],[C5,1],[B4,2],[A4,2],[G4,2],[A4,1],[G4,1],[E4,2]],
    bass:  [[A2,4],[E3,4],[D3,4],[E3,4]],
    melodyWave:'square', bassWave:'sine', melodyVol:0.15, bassVol:0.2 },

  // ── LEVEL 12 — Michigan "Icebound Records" (F minor, 55 BPM) ─────────────
  level12: { bpm:55,
    melody:[[F4,2],[Ab4,2],[C5,2],[Bb4,2],[Ab4,2],[G4,2],[F4,4]],
    bass:  [[F3,4],[C3,4],[Bb3,4],[F3,4]],
    melodyWave:'sine', bassWave:'sine', melodyVol:0.28, bassVol:0.16 },

  // ── LEVEL 13 — Colorado "The Mountain Answers" (G major, 63 BPM) ─────────
  level13: { bpm:63,
    melody:[[G4,2],[A4,1],[B4,1],[D5,2],[B4,2],[A4,2],[G4,1],[E4,1],[D4,2],[G4,2]],
    bass:  [[G3,4],[D3,4],[C3,4],[G3,4]],
    melodyWave:'triangle', bassWave:'sine', melodyVol:0.3, bassVol:0.17 },

  // ── LEVEL 14 — Washington "Rain on the Firewall" (D minor, 68 BPM) ───────
  level14: { bpm:68,
    melody:[[D4,2],[F4,1],[G4,1],[A4,2],[G4,2],[F4,2],[E4,1],[D4,1],[C4,2],[D4,2]],
    bass:  [[D3,4],[A3,4],[G3,4],[F3,4]],
    melodyWave:'sine', bassWave:'sine', melodyVol:0.27, bassVol:0.17 },

  // ── LEVEL 15 — Tennessee "Whispers in the Melody" (A minor, 70 BPM) ──────
  level15: { bpm:70,
    melody:[[A3,2],[C4,2],[E4,2],[G4,2],[F4,2],[E4,1],[D4,1],[C4,2],[A3,2]],
    bass:  [[A2,4],[E3,4],[D3,4],[C3,4]],
    melodyWave:'triangle', bassWave:'sine', melodyVol:0.3, bassVol:0.17 },

  // ── LEVEL 16 — Louisiana "Lanterns in the Fog" (C minor, 58 BPM) ─────────
  level16: { bpm:58,
    melody:[[C4,2],[Eb4,2],[G4,2],[Bb4,2],[Ab4,2],[G4,1],[F4,1],[Eb4,2],[C4,2]],
    bass:  [[C3,4],[G3,4],[Bb3,4],[G3,4]],
    melodyWave:'sine', bassWave:'sine', melodyVol:0.28, bassVol:0.17 },

  // ── LEVEL 17 — Massachusetts "Shelves That Remember" (E minor, 63 BPM) ───
  level17: { bpm:63,
    melody:[[E4,2],[G4,2],[A4,2],[B4,2],[A4,2],[G4,1],[Fs4,1],[E4,2],[R,2]],
    bass:  [[E3,4],[B3,4],[A3,4],[B3,4]],
    melodyWave:'triangle', bassWave:'sine', melodyVol:0.3, bassVol:0.18 },

  // ── LEVEL 18 — Virginia "Redacted Hallway" (B minor, 60 BPM) ─────────────
  level18: { bpm:60,
    melody:[[B3,2],[D4,2],[E4,2],[Fs4,2],[E4,2],[D4,2],[B3,2],[A3,2]],
    bass:  [[B2,4],[Fs3,4],[G3,4],[Fs3,4]],
    melodyWave:'sine', bassWave:'sine', melodyVol:0.28, bassVol:0.18 },

  // ── LEVEL 19 — Maryland "Evidence at the Harbor" (G minor, 65 BPM) ───────
  level19: { bpm:65,
    melody:[[G4,2],[Bb4,2],[C5,2],[D5,2],[C5,1],[Bb4,1],[A4,2],[G4,2],[F4,2]],
    bass:  [[G3,4],[D3,4],[Eb3,4],[D3,4]],
    melodyWave:'sine', bassWave:'sine', melodyVol:0.28, bassVol:0.17 },

  // ── LEVEL 20 — DC "The Architect's Reflection" (A minor, 58 BPM) ─────────
  level20: { bpm:58,
    melody:[[A4,3],[C5,1],[E5,2],[D5,2],[C5,1],[B4,1],[G4,2],[E4,2],[A4,2]],
    bass:  [[A2,4],[E3,4],[D3,4],[E3,4]],
    melodyWave:'triangle', bassWave:'sine', melodyVol:0.32, bassVol:0.2 },

  // ── BOSS — "Chamber of Confusion" (A minor, 95 BPM, 8-beat loop) ─────────
  boss: { bpm:95,
    melody:[[A4,0.5],[G4,0.5],[A4,0.5],[C5,0.5],[B4,1],[A4,0.5],[G4,0.5],[A4,0.5],[Bb4,0.5],[A4,1],[G4,1],[A4,1]],
    bass:  [[A3,2],[E3,2],[G3,2],[A3,2]],
    melodyWave:'sawtooth', bassWave:'sine', melodyVol:0.17, bassVol:0.22 },

  // ── FINAL BOSS — "The Architect Awakens" (D minor, 85 BPM, 8-beat) ───────
  finalboss: { bpm:85,
    melody:[[D4,1],[F4,1],[A4,1],[Bb4,1],[A4,0.5],[G4,0.5],[F4,1],[E4,2]],
    bass:  [[D3,2],[A3,2],[G3,2],[D3,2]],
    melodyWave:'sawtooth', bassWave:'sawtooth', melodyVol:0.2, bassVol:0.22 },

  // ── VICTORY — "Truth Fragment Found" (D major, 120 BPM, 4-beat jingle) ───
  victory: { bpm:120,
    melody:[[D4,0.5],[Fs4,0.5],[A4,0.5],[D5,0.5],[A4,0.5],[Fs4,0.5],[D5,1]],
    bass:  [[D3,2],[A3,2]],
    melodyWave:'triangle', bassWave:'triangle', melodyVol:0.38, bassVol:0.2 },

  // ── GAME OVER — "Lost in the Mirrors" (A minor, 55 BPM, 8-beat) ──────────
  gameover: { bpm:55,
    melody:[[A4,2],[G4,1.5],[F4,0.5],[E4,2],[D4,1.5],[C4,0.5]],
    bass:  [[A3,4],[E3,4]],
    melodyWave:'sine', bassWave:'sine', melodyVol:0.3, bassVol:0.16 },
};

// ─── Global tempo multiplier (1.08 = 8% faster across all tracks) ────────────
const TEMPO_RATE = 1.08;

// ─── AudioManager Class ───────────────────────────────────────────────────────
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterMusicGain: GainNode | null = null;
  private masterSfxGain: GainNode | null = null;

  private musicVolume: number;
  private sfxVolume: number;
  private musicMuted: boolean;
  private sfxMuted: boolean;

  // Current track loop state
  private currentTrackId: string | null = null;
  private loopScheduleTimer: ReturnType<typeof setTimeout> | null = null;
  private currentLoopId = 0; // incremented on each track change to cancel stale loops

  constructor(musicVol = 0.5, sfxVol = 0.7, musicMuted = false, sfxMuted = false) {
    this.musicVolume = musicVol;
    this.sfxVolume = sfxVol;
    this.musicMuted = musicMuted;
    this.sfxMuted = sfxMuted;
  }

  // ── Context init (requires user gesture on mobile) ──────────────────────
  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Master gains
      this.masterMusicGain = this.ctx.createGain();
      this.masterSfxGain = this.ctx.createGain();
      this.masterMusicGain.connect(this.ctx.destination);
      this.masterSfxGain.connect(this.ctx.destination);
      this.applyMusicVolume();
      this.applySfxVolume();
    }
    return this.ctx;
  }

  private applyMusicVolume() {
    if (!this.masterMusicGain || !this.ctx) return;
    const vol = this.musicMuted ? 0 : this.musicVolume;
    this.masterMusicGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
  }

  private applySfxVolume() {
    if (!this.masterSfxGain || !this.ctx) return;
    const vol = this.sfxMuted ? 0 : this.sfxVolume;
    this.masterSfxGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
  }

  // ── Volume / Mute controls ──────────────────────────────────────────────
  setMusicVolume(v: number) {
    this.musicVolume = v;
    this.applyMusicVolume();
  }

  setSfxVolume(v: number) {
    this.sfxVolume = v;
    this.applySfxVolume();
  }

  setMusicMuted(m: boolean) {
    this.musicMuted = m;
    this.applyMusicVolume();
  }

  setSfxMuted(m: boolean) {
    this.sfxMuted = m;
    this.applySfxVolume();
  }

  // ── Resume AudioContext (needed after autoplay policy) ──────────────────
  resume() {
    try { this.getCtx().resume(); } catch { /* ignore */ }
  }

  // ── Music playback ──────────────────────────────────────────────────────
  startMusic(trackId: string) {
    if (this.currentTrackId === trackId) return;
    this.stopMusic(true); // fade out current
    this.currentTrackId = trackId;
    const def = TRACKS[trackId];
    if (!def) return;

    try {
      const ctx = this.getCtx();
      if (ctx.state === 'suspended') ctx.resume();

      // Per-track gain for crossfade
      const trackGain = ctx.createGain();
      trackGain.gain.setValueAtTime(0, ctx.currentTime);
      trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.0);
      trackGain.connect(this.masterMusicGain!);

      const loopId = ++this.currentLoopId;
      this.scheduleLoop(def, trackGain, ctx.currentTime, loopId, trackId);
    } catch { /* ignore */ }
  }

  private scheduleLoop(def: TrackDef, gainNode: GainNode, startTime: number, loopId: number, trackId: string) {
    if (loopId !== this.currentLoopId || this.currentTrackId !== trackId) return;

    const ctx = this.ctx!;
    const beatDur = 60 / def.bpm / TEMPO_RATE;

    // Compute total melody beats
    const melodyBeats = def.melody.reduce((s, [, d]) => s + d, 0);
    const bassBeats = def.bass.reduce((s, [, d]) => s + d, 0);
    const loopBeats = Math.max(melodyBeats, bassBeats);
    const loopDur = loopBeats * beatDur;

    // Schedule melody
    let t = startTime;
    for (const [freq, beats] of def.melody) {
      const dur = beats * beatDur;
      if (freq > 0) this.scheduleNote(ctx, freq, t, dur, def.melodyWave, def.melodyVol, gainNode);
      t += dur;
    }

    // Schedule bass (pad/drone)
    let bt = startTime;
    for (const [freq, beats] of def.bass) {
      const dur = beats * beatDur;
      if (freq > 0) this.scheduleNote(ctx, freq, bt, dur * 0.88, def.bassWave, def.bassVol, gainNode);
      bt += dur;
    }

    // Schedule next loop 100ms before current ends
    const nextIn = Math.max(0, (startTime + loopDur - ctx.currentTime) * 1000 - 100);
    this.loopScheduleTimer = setTimeout(() => {
      this.scheduleLoop(def, gainNode, startTime + loopDur, loopId, trackId);
    }, nextIn);
  }

  private scheduleNote(
    ctx: AudioContext, freq: number, startTime: number, dur: number,
    wave: OscillatorType, vol: number, gainNode: GainNode
  ) {
    try {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, startTime);

      const attack = Math.min(0.03, dur * 0.08);
      const release = Math.min(0.12, dur * 0.2);
      env.gain.setValueAtTime(0, startTime);
      env.gain.linearRampToValueAtTime(vol, startTime + attack);
      env.gain.setValueAtTime(vol, startTime + dur - release);
      env.gain.linearRampToValueAtTime(0, startTime + dur);

      osc.connect(env);
      env.connect(gainNode);
      osc.start(startTime);
      osc.stop(startTime + dur + 0.01);
    } catch { /* ignore */ }
  }

  stopMusic(fadeOut = false) {
    if (this.loopScheduleTimer) {
      clearTimeout(this.loopScheduleTimer);
      this.loopScheduleTimer = null;
    }
    this.currentLoopId++; // cancels any pending loop callbacks
    this.currentTrackId = null;
    if (fadeOut && this.masterMusicGain && this.ctx) {
      // Fade out quickly — new track will ramp back up
      this.masterMusicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
      setTimeout(() => {
        if (this.masterMusicGain && this.ctx) {
          this.masterMusicGain.gain.setTargetAtTime(
            this.musicMuted ? 0 : this.musicVolume, this.ctx.currentTime, 0.05
          );
        }
      }, 1200);
    }
  }

  // ── Sound Effects ────────────────────────────────────────────────────────
  private sfx(freq: number, dur: number, type: OscillatorType = 'square', vol?: number) {
    try {
      const ctx = this.getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterSfxGain!);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol ?? 0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur + 0.01);
    } catch { /* ignore */ }
  }

  private sfxAt(freq: number, t: number, dur: number, type: OscillatorType, vol: number) {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterSfxGain!);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.start(t);
      osc.stop(t + dur + 0.01);
    } catch { /* ignore */ }
  }

  playAttack() {
    this.sfx(220, 0.07, 'sawtooth', 0.4);
    setTimeout(() => this.sfx(170, 0.05, 'sawtooth', 0.3), 45);
  }

  playHit() {
    this.sfx(140, 0.11, 'sawtooth', 0.5);
    setTimeout(() => this.sfx(110, 0.09, 'square', 0.4), 55);
  }

  playPlayerHit() {
    this.sfx(90, 0.18, 'square', 0.6);
    setTimeout(() => this.sfx(75, 0.14, 'square', 0.5), 75);
  }

  playClueCollected() {
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    [440, 554, 659, 880].forEach((f, i) => this.sfxAt(f, t + i * 0.09, 0.18, 'triangle', 0.4));
  }

  playRumorCollected() {
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    [330, 415, 494].forEach((f, i) => this.sfxAt(f, t + i * 0.1, 0.15, 'triangle', 0.35));
  }

  playVerifiedCollected() {
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    [523, 659, 784, 1047, 784].forEach((f, i) => this.sfxAt(f, t + i * 0.08, 0.15, 'triangle', 0.45));
  }

  playJournalOpen() {
    this.sfx(440, 0.12, 'triangle', 0.35);
    setTimeout(() => this.sfx(554, 0.1, 'triangle', 0.3), 100);
  }

  playJournalClose() {
    this.sfx(554, 0.1, 'triangle', 0.3);
    setTimeout(() => this.sfx(440, 0.12, 'triangle', 0.25), 80);
  }

  playDialogue() {
    this.sfx(660, 0.04, 'square', 0.25);
  }

  playGateOpen() {
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    [330, 440, 554, 660, 880].forEach((f, i) => this.sfxAt(f, t + i * 0.11, 0.22, 'triangle', 0.38));
  }

  playDoorLocked() {
    this.sfx(180, 0.15, 'square', 0.4);
    setTimeout(() => this.sfx(150, 0.15, 'square', 0.35), 120);
  }

  playBossHit() {
    this.sfx(260, 0.14, 'sawtooth', 0.5);
    setTimeout(() => this.sfx(200, 0.1, 'sawtooth', 0.4), 60);
  }

  playBossDefeat() {
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    [220, 330, 440, 660, 880, 660, 440, 330].forEach((f, i) =>
      this.sfxAt(f, t + i * 0.13, 0.28, 'sawtooth', 0.38)
    );
  }

  playVictory() {
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    [523, 659, 784, 1047, 784, 659, 523, 659, 784, 1047].forEach((f, i) =>
      this.sfxAt(f, t + i * 0.1, 0.22, 'triangle', 0.42)
    );
  }

  playFragmentCollected() {
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    [D4,Fs4,A4,D5,A4*2,D5*1.5].forEach((f, i) =>
      this.sfxAt(+f, t + i * 0.12, 0.25, 'triangle', 0.45)
    );
  }

  playMenuSelect() {
    this.sfx(440, 0.07, 'square', 0.3);
  }
}
