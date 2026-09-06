import React, { useEffect, useState, useRef } from 'react';
import type { DialogueLine } from '../game/types';

const CAT_STYLE: Record<string, { color: string; bg: string }> = {
  'VERIFIED RECORD':  { color: '#4ADE80', bg: 'rgba(74,222,128,0.12)' },
  'PUBLIC STATEMENT': { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  'MEDIA REPORT':     { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  'ALLEGATION':       { color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  'RUMOR':            { color: '#FB923C', bg: 'rgba(251,146,60,0.12)' },
  'CONTRADICTION':    { color: '#C084FC', bg: 'rgba(192,132,252,0.12)' },
  'UNPROVEN THEORY':  { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
  'SYMBOLIC CLUE':    { color: '#E879F9', bg: 'rgba(232,121,249,0.12)' },
  'WONDERLAND CLUE':  { color: '#D5B3FF', bg: 'rgba(213,179,255,0.12)' },
};

interface DialogueBoxProps {
  lines: DialogueLine[];
  index: number;
  textSpeed: number;
  onAdvance: () => void;
}

export function DialogueBox({ lines, index, textSpeed, onAdvance }: DialogueBoxProps) {
  const line = lines[index];
  const [displayedText, setDisplayedText] = useState('');
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charRef = useRef(0);

  useEffect(() => {
    setDisplayedText('');
    setDone(false);
    charRef.current = 0;
    if (!line) return;
    const delay = Math.max(10, 60 - textSpeed);
    const tick = () => {
      charRef.current++;
      setDisplayedText(line.text.slice(0, charRef.current));
      if (charRef.current < line.text.length) {
        timerRef.current = setTimeout(tick, delay);
      } else {
        setDone(true);
      }
    };
    timerRef.current = setTimeout(tick, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [line, textSpeed]);

  const handleClick = () => {
    if (!done) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setDisplayedText(line.text);
      setDone(true);
    } else {
      onAdvance();
    }
  };

  if (!line) return null;
  const cat = line.category ? (CAT_STYLE[line.category] ?? { color: '#AAA', bg: 'rgba(170,170,170,0.1)' }) : null;

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to bottom, rgba(4,1,16,0.97), rgba(2,0,10,0.99))',
        borderTop: '2px solid rgba(155,89,182,0.7)',
        zIndex: 60,
        fontFamily: '"Courier New", Courier, monospace',
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 -6px 32px rgba(100,0,200,0.25)',
      }}
    >
      {/* Top decorative border accent */}
      <div style={{
        height: 2,
        background: 'linear-gradient(to right, transparent 2%, rgba(120,60,200,0.6) 15%, rgba(200,140,255,0.8) 40%, rgba(180,100,255,0.6) 60%, rgba(100,200,255,0.4) 78%, transparent 98%)',
      }} />

      <div style={{ padding: '10px 14px 8px' }}>
        {/* Main content row: portrait + right column */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>

          {/* Portrait box — reference style: purple-bordered square */}
          <div style={{
            flexShrink: 0,
            width: 88, height: 88,
            background: 'rgba(12,4,36,0.95)',
            border: '2px solid rgba(130,60,200,0.8)',
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 0 14px rgba(120,0,220,0.4), inset 0 0 8px rgba(0,0,0,0.6)',
          }}>
            <PortraitCanvas speaker={line.speaker} />
          </div>

          {/* Right column: name header + text */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Speaker name — gold, above text, matching reference */}
            <div style={{
              color: '#F5C842',
              fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5,
              textShadow: '0 0 10px rgba(245,200,60,0.6)',
              marginBottom: 4, lineHeight: 1,
            }}>
              {line.speaker}
            </div>
            {/* Dialogue text */}
            <div style={{
              color: 'rgba(255,255,255,0.93)',
              fontSize: 13, lineHeight: 1.6,
              minHeight: 52,
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            }}>
              {displayedText}
              {!done && (
                <span style={{
                  display: 'inline-block', width: 2, height: 13,
                  background: 'rgba(255,255,255,0.75)',
                  marginLeft: 1, verticalAlign: 'middle',
                  animation: 'dialogueCursor 0.6s ease-in-out infinite',
                }} />
              )}
            </div>
          </div>
        </div>

        {/* Bottom row: category + continue prompt — reference style */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 6,
          borderTop: '1px solid rgba(120,80,200,0.2)',
        }}>
          {/* Clue category — document icon + label + value */}
          {cat && line.category ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Document icon (SVG) */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.75 }}>
                <rect x="2" y="1" width="10" height="13" rx="1" stroke="rgba(200,170,100,0.8)" strokeWidth="1.2" fill="rgba(200,160,80,0.08)"/>
                <line x1="4.5" y1="5" x2="9.5" y2="5" stroke="rgba(200,170,100,0.6)" strokeWidth="1"/>
                <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke="rgba(200,170,100,0.6)" strokeWidth="1"/>
                <line x1="4.5" y1="10" x2="7.5" y2="10" stroke="rgba(200,170,100,0.6)" strokeWidth="1"/>
              </svg>
              <div>
                <div style={{ color: 'rgba(200,170,100,0.5)', fontSize: 7, letterSpacing: 1.5 }}>CLUE CATEGORY</div>
                <div style={{
                  color: cat.color, background: cat.bg,
                  border: `1px solid ${cat.color}44`,
                  borderRadius: 2, padding: '1px 7px',
                  fontSize: 9, fontWeight: 'bold', letterSpacing: 1, display: 'inline-block',
                }}>
                  {line.category}
                </div>
              </div>
            </div>
          ) : <div />}

          {/* Continue prompt — reference style with downward arrow */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
            color: done ? 'rgba(255,255,255,0.5)' : 'transparent',
            fontSize: 8, letterSpacing: 0.5,
            transition: 'color 0.3s',
          }}>
            <span>Tap / Press Interact</span>
            <span style={{
              fontSize: 10,
              animation: done ? 'dialogueBounce 1s ease-in-out infinite' : 'none',
            }}>▼</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dialogueCursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes dialogueBounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(2px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Portrait PNG map ─────────────────────────────────────────────────────────
const PORTRAIT_PNGS: Record<string, string> = {
  witness:   '/assets/portraits/witness_portrait.png',
  scholar:   '/assets/portraits/scholar_portrait.png',
  wanderer:  '/assets/portraits/wanderer_portrait.png',
  candy:     '/assets/characters/candy_front.png',
  // Alias common level-specific NPC names
  archivist: '/assets/portraits/scholar_portrait.png',
  nomad:     '/assets/portraits/wanderer_portrait.png',
  detective: '/assets/portraits/witness_portrait.png',
};

// ── Portrait Canvas renderer ──────────────────────────────────────────────────
function PortraitCanvas({ speaker }: { speaker: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = 88, H = 88;
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    const sl = speaker.toLowerCase();
    const pngSrc = PORTRAIT_PNGS[sl];

    if (pngSrc) {
      const img = new Image();
      img.onload = () => {
        if (!canvas) return;
        const c2 = canvas.getContext('2d')!;
        c2.clearRect(0, 0, W, H);
        // Dark bg
        c2.fillStyle = '#0A0218';
        c2.fillRect(0, 0, W, H);
        // Draw portrait cropped to square, centered
        const aspect = img.naturalWidth / img.naturalHeight;
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
        if (aspect > 1) { sw = sh; sx = (img.naturalWidth - sw) / 2; }
        else            { sh = sw; sy = (img.naturalHeight - sh) / 4; } // top-bias for faces
        c2.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
        // Subtle vignette
        const vig = c2.createRadialGradient(W/2, H/2, W*0.3, W/2, H/2, W*0.7);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,20,0.45)');
        c2.fillStyle = vig;
        c2.fillRect(0, 0, W, H);
      };
      img.src = pngSrc;
      return;
    }

    // Fallback: code-drawn portraits
    if (sl === 'candy') {
      drawCandyPortrait(ctx, W, H);
    } else if (sl === 'witness') {
      drawWitnessPortrait(ctx, W, H);
    } else if (sl === 'wanderer') {
      drawWandererPortrait(ctx, W, H);
    } else if (sl === 'scholar') {
      drawScholarPortrait(ctx, W, H);
    } else {
      drawGenericPortrait(ctx, W, H, speaker);
    }
  }, [speaker]);

  return <canvas ref={canvasRef} style={{ display: 'block', width: 88, height: 88 }} />;
}

function drawCandyPortrait(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Background: deep purple gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1A0840');
  bg.addColorStop(1, '#08021C');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle purple vignette
  const vig = ctx.createRadialGradient(W/2, H/2, 10, W/2, H/2, W * 0.8);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(30,0,60,0.5)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;

  // ── Purple jacket / shoulders ─────────────────────────────────────
  ctx.fillStyle = '#3A0E80';
  ctx.fillRect(8, 52, W - 16, H - 52);
  ctx.fillStyle = '#5A1EA8';
  ctx.fillRect(14, 50, W - 28, H - 50);
  // Jacket highlight
  ctx.fillStyle = '#6B2FBB';
  ctx.fillRect(20, 50, 18, H - 50);
  // Lapels
  ctx.fillStyle = '#2A0A60';
  ctx.fillRect(30, 50, 8, 14);
  ctx.fillRect(38, 50, 8, 14);
  // Collar/shirt
  ctx.fillStyle = '#EAD8C0';
  ctx.fillRect(32, 50, 12, 8);
  // Brooch / pin
  ctx.fillStyle = '#C060FF';
  ctx.beginPath(); ctx.arc(26, 56, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#E090FF';
  ctx.beginPath(); ctx.arc(26, 56, 1.5, 0, Math.PI * 2); ctx.fill();

  // ── Neck ─────────────────────────────────────────────────────────
  ctx.fillStyle = '#5A2C14';
  ctx.fillRect(32, 44, 12, 10);

  // ── Head ─────────────────────────────────────────────────────────
  // Head base
  ctx.fillStyle = '#5A2C14';
  ctx.beginPath();
  ctx.ellipse(cx, 36, 15, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  // Face center lighter
  ctx.fillStyle = '#7A3C1E';
  ctx.beginPath();
  ctx.ellipse(cx, 36, 11, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // Forehead highlight
  ctx.fillStyle = '#8A4C2A';
  ctx.beginPath();
  ctx.ellipse(cx - 2, 28, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  ctx.fillStyle = '#5A2C14';
  ctx.beginPath(); ctx.ellipse(cx - 15, 37, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 15, 37, 4, 5, 0, 0, Math.PI * 2); ctx.fill();

  // Eyes
  ctx.fillStyle = '#F0E8D0';
  ctx.fillRect(cx - 12, 33, 8, 5);
  ctx.fillRect(cx + 4, 33, 8, 5);
  // Iris
  ctx.fillStyle = '#1A0804';
  ctx.fillRect(cx - 10, 33, 4, 5);
  ctx.fillRect(cx + 6, 33, 4, 5);
  // Iris purple tint
  ctx.fillStyle = '#3A0A50';
  ctx.fillRect(cx - 10, 33, 2, 2);
  ctx.fillRect(cx + 6, 33, 2, 2);
  // Eye whites shine
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(cx - 11, 33, 2, 2);
  ctx.fillRect(cx + 5, 33, 2, 2);
  // Lashes/brows
  ctx.fillStyle = '#0C0402';
  ctx.fillRect(cx - 13, 31, 10, 2);
  ctx.fillRect(cx + 3, 31, 10, 2);
  // Lids
  ctx.fillRect(cx - 12, 32, 8, 1);
  ctx.fillRect(cx + 4, 32, 8, 1);

  // Nose
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(cx - 1, 39, 4, 3);

  // Mouth — slight smile
  ctx.fillStyle = '#3A160A';
  ctx.fillRect(cx - 5, 43, 11, 2);
  ctx.fillStyle = '#6A2818';
  ctx.fillRect(cx - 3, 44, 7, 1);

  // ── Afro puff ─────────────────────────────────────────────────────
  // Main mass — very dark
  ctx.fillStyle = '#0C0402';
  ctx.beginPath(); ctx.arc(cx, 20, 18, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx - 12, 25, 13, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 12, 25, 13, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx - 6, 12, 12, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 6, 12, 12, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, 8, 12, 0, Math.PI * 2); ctx.fill();
  // Hair texture bumps
  ctx.fillStyle = '#1C0804';
  ctx.beginPath(); ctx.arc(cx - 8, 14, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 8, 14, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, 10, 7, 0, Math.PI * 2); ctx.fill();
  // Subtle sheen
  ctx.fillStyle = 'rgba(60,20,8,0.45)';
  ctx.beginPath(); ctx.arc(cx - 5, 11, 5, 0, Math.PI * 2); ctx.fill();

  // Purple scrunchie
  ctx.fillStyle = '#7B20C0';
  ctx.fillRect(cx - 7, 18, 14, 4);
  ctx.fillStyle = '#9B38D8';
  ctx.fillRect(cx - 5, 18, 10, 3);
  ctx.fillStyle = '#B050E8';
  ctx.fillRect(cx - 3, 17, 6, 3);
  // Scrunchie sparkle
  ctx.fillStyle = 'rgba(240,180,255,0.85)';
  ctx.fillRect(cx - 5, 17, 2, 2);
  ctx.fillRect(cx + 3, 19, 2, 2);
}

function drawWitnessPortrait(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Background: warm dark
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#150A04');
  bg.addColorStop(1, '#0A0502');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Warm radial light from center
  const light = ctx.createRadialGradient(W/2, H*0.45, 0, W/2, H*0.45, W * 0.7);
  light.addColorStop(0, 'rgba(200,130,60,0.12)');
  light.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;

  // ── Coat / shoulders ─────────────────────────────────────────────
  ctx.fillStyle = '#4E3418';
  ctx.fillRect(6, 54, W - 12, H - 54);
  ctx.fillStyle = '#6A4820';
  ctx.fillRect(12, 52, W - 24, H - 52);
  ctx.fillStyle = '#7A5228';
  ctx.fillRect(18, 52, 16, H - 52);
  // Coat lapels
  ctx.fillStyle = '#3A2410';
  ctx.fillRect(28, 52, 9, 16);
  ctx.fillRect(39, 52, 9, 16);
  // Cream collar/shirt
  ctx.fillStyle = '#E8DCC0';
  ctx.fillRect(31, 52, 14, 9);
  // Amber tie
  ctx.fillStyle = '#9A6012';
  ctx.fillRect(35, 54, 6, 10);
  ctx.fillStyle = '#C07818';
  ctx.fillRect(36, 55, 4, 8);
  // Tie knot
  ctx.fillStyle = '#A86810';
  ctx.fillRect(34, 53, 8, 4);

  // ── Neck ─────────────────────────────────────────────────────────
  ctx.fillStyle = '#8B5A2B';
  ctx.fillRect(31, 44, 14, 12);

  // ── Head ─────────────────────────────────────────────────────────
  // Head base
  ctx.fillStyle = '#8B5A2B';
  ctx.beginPath();
  ctx.ellipse(cx, 35, 14, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  // Face center lighter
  ctx.fillStyle = '#9A6432';
  ctx.beginPath();
  ctx.ellipse(cx, 35, 10, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // Face highlight
  ctx.fillStyle = '#A87040';
  ctx.beginPath();
  ctx.ellipse(cx - 2, 28, 5, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  ctx.fillStyle = '#7A4820';
  ctx.beginPath(); ctx.ellipse(cx - 14, 36, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 14, 36, 4, 5, 0, 0, Math.PI * 2); ctx.fill();

  // Eyes — warm, friendly, slightly wide
  ctx.fillStyle = '#F2E8D0';
  ctx.fillRect(cx - 11, 32, 8, 5);
  ctx.fillRect(cx + 3, 32, 8, 5);
  // Iris — warm dark brown
  ctx.fillStyle = '#200A04';
  ctx.fillRect(cx - 9, 32, 4, 5);
  ctx.fillRect(cx + 5, 32, 4, 5);
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(cx - 10, 32, 2, 2);
  ctx.fillRect(cx + 4, 32, 2, 2);
  // Lids
  ctx.fillStyle = '#1A0804';
  ctx.fillRect(cx - 12, 31, 10, 2);
  ctx.fillRect(cx + 2, 31, 10, 2);
  // Lower lid warmth
  ctx.fillStyle = 'rgba(100,50,20,0.4)';
  ctx.fillRect(cx - 11, 37, 8, 1);
  ctx.fillRect(cx + 3, 37, 8, 1);

  // Brows — gentle
  ctx.fillStyle = '#2A1006';
  ctx.fillRect(cx - 13, 29, 10, 2);
  ctx.fillRect(cx + 3, 29, 10, 2);

  // Nose — warm, defined
  ctx.fillStyle = '#7A4020';
  ctx.fillRect(cx - 2, 38, 5, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(cx - 2, 40, 2, 2);
  ctx.fillRect(cx + 2, 40, 2, 2);

  // Mouth — warm slight smile
  ctx.fillStyle = '#5A2810';
  ctx.fillRect(cx - 6, 44, 13, 2);
  ctx.fillStyle = '#7A3820';
  ctx.fillRect(cx - 4, 44, 9, 1);
  // Smile corners
  ctx.fillStyle = '#4A2010';
  ctx.fillRect(cx - 7, 45, 3, 2);
  ctx.fillRect(cx + 4, 45, 3, 2);

  // Chin shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(cx - 5, 48, 10, 3);

  // ── Flat cap ─────────────────────────────────────────────────────
  // Cap body — tan/warm brown
  ctx.fillStyle = '#6A4820';
  ctx.beginPath();
  ctx.ellipse(cx, 20, 18, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 18, 20, 36, 8);
  // Cap top panel
  ctx.fillStyle = '#7A5228';
  ctx.beginPath();
  ctx.ellipse(cx, 18, 15, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cap seam lines
  ctx.strokeStyle = 'rgba(80,50,20,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx, 12); ctx.lineTo(cx, 24); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 10, 13); ctx.lineTo(cx - 5, 24); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 10, 13); ctx.lineTo(cx + 5, 24); ctx.stroke();
  // Cap button on top
  ctx.fillStyle = '#5A3C14';
  ctx.beginPath(); ctx.arc(cx, 13, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8A5C28';
  ctx.beginPath(); ctx.arc(cx, 13, 1.5, 0, Math.PI * 2); ctx.fill();
  // Brim
  ctx.fillStyle = '#5A3A18';
  ctx.fillRect(cx - 18, 26, 36, 4);
  ctx.fillStyle = '#4A2E10';
  ctx.fillRect(cx - 18, 28, 36, 2);
  // Cap highlight
  ctx.fillStyle = 'rgba(200,160,80,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx - 5, 16, 8, 4, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawScholarPortrait(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0A0A24');
  bg.addColorStop(1, '#04041A');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2;

  // Academic robe
  ctx.fillStyle = '#1A2850';
  ctx.fillRect(8, 54, W - 16, H - 54);
  ctx.fillStyle = '#243568';
  ctx.fillRect(16, 52, W - 32, H - 52);
  // Sash
  ctx.fillStyle = '#9A7010';
  ctx.fillRect(34, 52, 8, H - 52);

  // Neck
  ctx.fillStyle = '#C68642';
  ctx.fillRect(30, 44, 16, 12);

  // Head
  ctx.fillStyle = '#C68642';
  ctx.beginPath(); ctx.ellipse(cx, 34, 14, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#D4924E';
  ctx.beginPath(); ctx.ellipse(cx, 33, 10, 12, 0, 0, Math.PI * 2); ctx.fill();

  // Eyes with glasses
  ctx.fillStyle = '#F0E8CC';
  ctx.fillRect(cx - 12, 31, 8, 5);
  ctx.fillRect(cx + 4, 31, 8, 5);
  ctx.fillStyle = '#1A0800';
  ctx.fillRect(cx - 10, 31, 4, 5);
  ctx.fillRect(cx + 6, 31, 4, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(cx - 11, 31, 2, 2);
  ctx.fillRect(cx + 5, 31, 2, 2);
  // Gold wire glasses
  ctx.strokeStyle = '#C8A020';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 12.5, 30.5, 9, 6);
  ctx.strokeRect(cx + 3.5, 30.5, 9, 6);
  ctx.beginPath(); ctx.moveTo(cx - 3.5, 33); ctx.lineTo(cx + 3.5, 33); ctx.stroke();

  ctx.fillStyle = '#1A0800';
  ctx.fillRect(cx - 12, 28, 9, 2);
  ctx.fillRect(cx + 3, 28, 9, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(cx - 1, 37, 4, 3);
  ctx.fillStyle = '#7A3A18';
  ctx.fillRect(cx - 5, 43, 11, 2);

  // Natural hair
  ctx.fillStyle = '#2A1A00';
  ctx.beginPath(); ctx.arc(cx, 20, 16, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx - 10, 26, 10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 10, 26, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3A2A08';
  ctx.beginPath(); ctx.arc(cx, 15, 8, 0, Math.PI * 2); ctx.fill();
}

function drawWandererPortrait(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Background: deep void black with faint indigo tint
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#050210');
  bg.addColorStop(1, '#02010A');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Eerie blue-green glow from centre
  const glow = ctx.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, W * 0.65);
  glow.addColorStop(0, 'rgba(40,180,120,0.10)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;

  // ── Armoured body / shoulders ──────────────────────────────────
  // Dark plate base
  ctx.fillStyle = '#1A1428';
  ctx.fillRect(6, 50, W - 12, H - 50);
  // Shoulder plates
  ctx.fillStyle = '#241E3A';
  ctx.fillRect(6, 48, 22, 20);
  ctx.fillRect(W - 28, 48, 22, 20);
  // Shoulder highlights
  ctx.fillStyle = '#38305A';
  ctx.fillRect(7, 49, 10, 4);
  ctx.fillRect(W - 17, 49, 10, 4);
  // Chest plate centre
  ctx.fillStyle = '#2A2242';
  ctx.fillRect(22, 50, W - 44, H - 50);
  ctx.fillStyle = '#342A52';
  ctx.fillRect(26, 50, W - 52, H - 50);
  // Chest rune glow line
  ctx.fillStyle = 'rgba(60,255,160,0.22)';
  ctx.fillRect(cx - 8, 56, 16, 2);
  ctx.fillRect(cx - 5, 60, 10, 1);
  // Cloak edge peeking from sides — very dark purple
  ctx.fillStyle = '#100C1C';
  ctx.fillRect(0, 50, 8, H - 50);
  ctx.fillRect(W - 8, 50, 8, H - 50);

  // ── Neck / gorget ─────────────────────────────────────────────
  ctx.fillStyle = '#1C1830';
  ctx.fillRect(30, 42, 16, 12);
  // gorget detail
  ctx.fillStyle = '#2E2848';
  ctx.fillRect(32, 43, 12, 8);

  // ── Helm / head ───────────────────────────────────────────────
  // Helm base — rounded but angular
  ctx.fillStyle = '#1C1830';
  ctx.beginPath();
  ctx.ellipse(cx, 32, 17, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  // Helm face plate (slightly lighter)
  ctx.fillStyle = '#24203A';
  ctx.beginPath();
  ctx.ellipse(cx, 33, 13, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  // Helm side flanges
  ctx.fillStyle = '#16122A';
  ctx.fillRect(cx - 17, 24, 5, 20);
  ctx.fillRect(cx + 12, 24, 5, 20);
  // Helm top ridge
  ctx.fillStyle = '#2A2448';
  ctx.fillRect(cx - 3, 14, 6, 10);
  ctx.fillRect(cx - 5, 12, 10, 4);
  // Crest spike (dark red-violet)
  ctx.fillStyle = '#4A1040';
  ctx.fillRect(cx - 2, 6, 4, 8);
  ctx.fillStyle = '#6A1858';
  ctx.fillRect(cx - 1, 5, 2, 5);

  // ── Visor slit — the signature glowing eyes ───────────────────
  // Visor recess (darker band)
  ctx.fillStyle = '#0C0818';
  ctx.fillRect(cx - 12, 32, 24, 7);
  // Glow: two eye slits — teal/green eeriness
  const eyeGlow = ctx.createLinearGradient(0, 33, 0, 38);
  eyeGlow.addColorStop(0, 'rgba(40,255,140,0.85)');
  eyeGlow.addColorStop(0.5, 'rgba(60,255,160,1)');
  eyeGlow.addColorStop(1, 'rgba(20,180,80,0.6)');
  ctx.fillStyle = eyeGlow;
  ctx.fillRect(cx - 11, 33, 8, 4);
  ctx.fillRect(cx + 3, 33, 8, 4);
  // Outer glow bloom
  const bloom = ctx.createRadialGradient(cx - 7, 35, 0, cx - 7, 35, 10);
  bloom.addColorStop(0, 'rgba(40,255,120,0.3)');
  bloom.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(cx - 18, 26, 22, 18);
  const bloom2 = ctx.createRadialGradient(cx + 7, 35, 0, cx + 7, 35, 10);
  bloom2.addColorStop(0, 'rgba(40,255,120,0.3)');
  bloom2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bloom2;
  ctx.fillRect(cx - 4, 26, 22, 18);
  // Visor centre bar (divides the two slits)
  ctx.fillStyle = '#1C1830';
  ctx.fillRect(cx - 1, 32, 2, 8);
  // Visor bottom edge
  ctx.fillStyle = '#2A2448';
  ctx.fillRect(cx - 12, 39, 24, 2);

  // ── Helm edge scratches / detail ──────────────────────────────
  ctx.fillStyle = 'rgba(60,255,140,0.12)';
  ctx.fillRect(cx - 15, 26, 2, 8);
  ctx.fillRect(cx + 13, 28, 2, 6);
  // Subtle rim light (purple)
  ctx.fillStyle = 'rgba(140,60,220,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, 32, 17, 19, 0, 0, Math.PI * 2);
  ctx.stroke = () => {};
  // Just a partial arc for rim — use fillRect strips
  ctx.fillRect(cx - 17, 18, 2, 18);
  ctx.fillRect(cx + 15, 18, 2, 18);
}

function drawGenericPortrait(ctx: CanvasRenderingContext2D, W: number, H: number, speaker: string) {
  const hash = speaker.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, `hsl(${260 + (hash % 60)}, 45%, 14%)`);
  bg.addColorStop(1, `hsl(${240 + (hash % 40)}, 35%, 6%)`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2;
  const skinTone = `hsl(${(hash * 13) % 30 + 18}, 55%, 42%)`;
  const outfitColor = `hsl(${(hash * 23) % 360}, 40%, 26%)`;
  ctx.fillStyle = outfitColor;
  ctx.fillRect(10, 50, W - 20, H - 50);
  ctx.fillStyle = skinTone;
  ctx.beginPath(); ctx.ellipse(cx, 34, 14, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `hsl(${(hash * 7) % 30 + 10}, 30%, 12%)`;
  ctx.beginPath(); ctx.arc(cx, 22, 15, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();
  ctx.fillRect(cx - 14, 20, 28, 10);
  ctx.fillStyle = '#F0E8D0';
  ctx.fillRect(cx - 10, 31, 7, 5);
  ctx.fillRect(cx + 3, 31, 7, 5);
  ctx.fillStyle = '#1A0800';
  ctx.fillRect(cx - 9, 32, 4, 3);
  ctx.fillRect(cx + 4, 32, 4, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(cx - 2, 38, 4, 3);
  ctx.fillStyle = '#5A2818';
  ctx.fillRect(cx - 5, 43, 11, 2);
}
