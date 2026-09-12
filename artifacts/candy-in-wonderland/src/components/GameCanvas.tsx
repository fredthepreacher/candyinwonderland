import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';
import { QUALITY } from '../game/Lighting';
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

    /**
     * Device-pixel ratio, clamped. The canvas used to be sized in CSS pixels,
     * so on any Retina screen or phone the browser upscaled the finished frame
     * and softened every edge. Rendering at device pixels fixes that; the clamp
     * is the standard trade — a 3x phone renders 9x the pixels of a 1x one for
     * a difference nobody can see, and it is the single biggest thing you can
     * do to a mobile frame budget.
     */
    const pickDpr = () => Math.min(window.devicePixelRatio || 1, 2);

    // ── Canvas 2D — game logic + base rendering ─────────────────────────
    const canvas = document.createElement('canvas');
    let dpr = pickDpr();
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.cssText = `
      position:absolute; inset:0;
      width:100%; height:100%;
      image-rendering:auto;
      cursor:crosshair;
      z-index:10;
    `;
    perf.appendChild(canvas);

    // ── Game engine ─────────────────────────────────────────────────────
    const engine = new GameEngine(canvas, audio, callbacks);
    engineRef.current = engine;
    engine.setViewport(W, H, dpr);

    /**
     * Lighting quality. The buffer resolution and bloom radius are the two
     * knobs that actually cost anything, so they scale with the device rather
     * than being tuned against a desktop and left there.
     */
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    engine.setLightingQuality(coarse ? QUALITY.medium : QUALITY.high);

    // PixiGlow is deliberately not attached any more. It was an additive-only
    // layer — it could brighten a candle but nothing in the scene ever went
    // dark — and it composited on a canvas ABOVE this one, so it would wash out
    // the multiply pass the new lighting depends on. Lighting.ts owns both
    // halves now. The module is still in the tree; re-attaching it would double
    // every light source.
    engine.loadLevel(level);
    engine.start();

    // ── Resize ──────────────────────────────────────────────────────────
    const resize = () => {
      const nW = host.clientWidth;
      const nH = host.clientHeight;
      dpr = pickDpr();
      canvas.width  = Math.round(nW * dpr);
      canvas.height = Math.round(nH * dpr);
      engine.setViewport(nW, nH, dpr);
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
