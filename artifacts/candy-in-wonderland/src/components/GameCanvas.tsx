import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';
import { PixiGlow }   from '../game/PixiGlow';
import { AudioManager } from '../game/AudioManager';
import type { GameCallbacks } from '../game/GameEngine';
import type { LevelData } from '../game/types';

interface GameCanvasProps {
  level: LevelData;
  audio: AudioManager;
  callbacks: GameCallbacks;
  engineRef: React.MutableRefObject<GameEngine | null>;
}

export function GameCanvas({ level, audio, callbacks, engineRef }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const perspRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const perf = perspRef.current;
    if (!host || !perf) return;

    const W = host.clientWidth;
    const H = host.clientHeight;

    // ── Canvas 2D — game logic + base rendering ─────────────────────────
    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    canvas.style.cssText = `
      position:absolute; inset:0;
      width:100%; height:100%;
      image-rendering:pixelated;
      cursor:crosshair;
      z-index:10;
    `;
    perf.appendChild(canvas);

    // ── PixiJS — WebGL glow / atmosphere overlay ────────────────────────
    let pixi: PixiGlow | null = null;
    try {
      pixi = new PixiGlow(perf, W, H);
    } catch (e) {
      console.warn('[PixiGlow] WebGL unavailable, running without glow layer:', e);
    }

    // ── Game engine ─────────────────────────────────────────────────────
    const engine = new GameEngine(canvas, audio, callbacks);
    if (pixi) engine.setPixiGlow(pixi);
    engineRef.current = engine;
    engine.loadLevel(level);
    engine.start();

    // ── Resize ──────────────────────────────────────────────────────────
    const resize = () => {
      const nW = host.clientWidth;
      const nH = host.clientHeight;
      canvas.width  = nW;
      canvas.height = nH;
      pixi?.resize(nW, nH);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    window.addEventListener('resize', resize);

    // ── Audio unlock ────────────────────────────────────────────────────
    const unlock = () => audio.resume();
    window.addEventListener('pointerdown', unlock, { once: true });

    return () => {
      engine.stop();
      engine.unbindKeys();
      engine.setPixiGlow(null);
      pixi?.destroy();
      if (perf.contains(canvas)) perf.removeChild(canvas);
      ro.disconnect();
      window.removeEventListener('resize', resize);
      engineRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  return (
    <div ref={hostRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/*
        2.5D perspective layer — all game rendering lives here.
        rotateX tilts the floor away at the top (far end) and toward viewer at bottom (near end),
        matching the dark fantasy top-down RPG look of the reference image.
        transform-origin is slightly above center so the player zone stays centered.
      */}
      <div
        ref={perspRef}
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
          /*
           * scale(1.38): zooms in so characters fill more of the screen
           *   matching the reference image's character-to-screen ratio.
           * rotateX(22deg): 2.5D tilt — floor recedes toward the top.
           * perspective(580px): focal depth for the tilt.
           */
          transform: 'perspective(800px) rotateX(30deg) scale(0.72)',
          transformOrigin: '50% 20%',
        }}
      />
    </div>
  );
}
