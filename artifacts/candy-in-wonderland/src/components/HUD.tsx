import React, { useState, useEffect } from 'react';
import type { Clue } from '../game/types';
import { AssetPaths } from '../data/assets';

interface HUDProps {
  hp: number;
  maxHp: number;
  clueCount: number;
  totalClues: number;
  levelName: string;
  levelSubtitle: string;
  levelNumber: number;
  objective: string;
  bossActive: boolean;
  bossHp: number;
  bossMaxHp: number;
  bossName: string;
  gateOpen: boolean;
  showGateMsg: boolean;
  showBossMsg: boolean;
  onJournalOpen: () => void;
  onPause: () => void;
  newClue: Clue | null;
}

// Shared ornate panel style matching reference image
const ornatePanel = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: 'rgba(3,1,12,0.88)',
  border: '1px solid rgba(200,170,100,0.55)',
  borderRadius: 4,
  backdropFilter: 'blur(3px)',
  position: 'relative',
  boxShadow: '0 0 0 1px rgba(0,0,0,0.8), inset 0 0 12px rgba(0,0,0,0.6), 0 2px 12px rgba(0,0,0,0.5)',
  ...extra,
});

// Corner decoration component
function Corners({ color = 'rgba(200,170,100,0.7)' }: { color?: string }) {
  const c: React.CSSProperties = { position: 'absolute', width: 6, height: 6, border: `1px solid ${color}` };
  return (
    <>
      <div style={{ ...c, top: 2, left: 2, borderRight: 'none', borderBottom: 'none' }} />
      <div style={{ ...c, top: 2, right: 2, borderLeft: 'none', borderBottom: 'none' }} />
      <div style={{ ...c, bottom: 2, left: 2, borderRight: 'none', borderTop: 'none' }} />
      <div style={{ ...c, bottom: 2, right: 2, borderLeft: 'none', borderTop: 'none' }} />
    </>
  );
}

export function HUD({
  hp, maxHp, clueCount, totalClues, levelName, levelSubtitle, levelNumber,
  objective, bossActive, bossHp, bossMaxHp, bossName,
  showGateMsg, showBossMsg, onJournalOpen, onPause, newClue
}: HUDProps) {
  // Title fades out after 10s, hides after 11.5s — resets on each new level
  const [titleOpacity, setTitleOpacity] = useState(1);
  const [titleHidden, setTitleHidden] = useState(false);

  useEffect(() => {
    setTitleOpacity(1);
    setTitleHidden(false);
    const fadeTimer = setTimeout(() => setTitleOpacity(0), 10_000);
    const hideTimer = setTimeout(() => setTitleHidden(true), 11_500);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, [levelNumber]);

  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20,
      fontFamily: '"Courier New", Courier, monospace',
    }}>

      {/* ── TOP-LEFT COLUMN ──────────────────────────────────────────────── */}
      <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 148 }}>

        {/* Truth Meter */}
        <div style={ornatePanel({ padding: '4px 8px 5px' })}>
          <Corners />
          <div style={{
            color: 'rgba(220,190,120,0.7)', fontSize: 6, letterSpacing: 2,
            marginBottom: 4, textAlign: 'center',
          }}>
            TRUTH METER
          </div>
          <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            {Array.from({ length: maxHp }, (_, i) => (
              <img
                key={i}
                src={AssetPaths.ui.heart}
                alt=""
                style={{
                  width: 14, height: 14, display: 'block',
                  filter: i < hp
                    ? 'drop-shadow(0 0 4px #FF2255) drop-shadow(0 0 2px #FF0033)'
                    : 'grayscale(1) opacity(0.2)',
                  transition: 'filter 0.3s',
                }}
              />
            ))}
          </div>
        </div>

        {/* Clues */}
        <div
          style={ornatePanel({ padding: '4px 8px', cursor: 'pointer', pointerEvents: 'all', display: 'flex', alignItems: 'center', gap: 6 })}
          onClick={onJournalOpen}
        >
          <Corners />
          <span style={{ fontSize: 12, filter: 'drop-shadow(0 0 3px rgba(255,215,0,0.6))' }}>🔍</span>
          <div>
            <div style={{ color: 'rgba(200,170,100,0.55)', fontSize: 6, letterSpacing: 1.5 }}>CLUES</div>
            <div style={{ color: '#FFD700', fontSize: 13, fontWeight: 'bold', lineHeight: 1, textShadow: '0 0 8px rgba(255,215,0,0.5)' }}>
              {clueCount}<span style={{ color: 'rgba(255,215,0,0.35)', fontSize: 9 }}>/{totalClues}</span>
            </div>
          </div>
        </div>

        {/* Objective */}
        <div style={ornatePanel({ padding: '5px 8px 6px' })}>
          <Corners color="rgba(180,140,255,0.5)" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
            <span style={{ color: '#FFD700', fontSize: 9, filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.8))' }}>✦</span>
            <span style={{ color: '#FFD700', fontSize: 7, letterSpacing: 1.5, textShadow: '0 0 6px rgba(255,215,0,0.4)' }}>OBJECTIVE</span>
          </div>
          <div style={{
            color: 'rgba(240,230,255,0.82)', fontSize: 8, lineHeight: 1.45,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {objective}
          </div>
        </div>
      </div>

      {/* ── TOP-CENTER: Logo + Location ──────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
        textAlign: 'center', pointerEvents: 'none',
        display: titleHidden ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        opacity: titleOpacity, transition: 'opacity 1.5s ease-out',
      }}>
        {/* Title treatment — matching reference two-line layout */}
        <div style={{ position: 'relative', padding: '2px 12px 0' }}>
          {/* Decorative top row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', marginBottom: 1 }}>
            <div style={{ width: 16, height: 1, background: 'rgba(210,185,130,0.5)' }} />
            <span style={{ color: 'rgba(210,185,130,0.65)', fontSize: 7 }}>✦</span>
            <div style={{ width: 16, height: 1, background: 'rgba(210,185,130,0.5)' }} />
          </div>
          {/* "CANDY IN" — small with arrow decorations */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center', marginBottom: 1 }}>
            <span style={{ color: 'rgba(210,185,130,0.55)', fontSize: 9, lineHeight: 1 }}>◄</span>
            <span style={{
              color: '#D8C8A0', fontSize: 9, letterSpacing: 3.5, fontWeight: 'normal',
              textShadow: '0 0 8px rgba(210,185,130,0.4)',
            }}>CANDY IN</span>
            <span style={{ color: 'rgba(210,185,130,0.55)', fontSize: 9, lineHeight: 1 }}>►</span>
          </div>
          {/* "WONDERLAND" — large serif */}
          <div style={{
            color: '#E8D8FF',
            fontSize: 22, letterSpacing: 1.5, fontWeight: 'bold',
            fontFamily: 'Georgia, "Palatino Linotype", serif',
            textShadow: '0 0 14px rgba(180,80,255,0.9), 0 0 28px rgba(120,0,220,0.5), 0 2px 0 rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap', lineHeight: 1.1,
          }}>
            WONDERLAND
          </div>
          {/* Decorative bottom flourish */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center', marginTop: 3 }}>
            <div style={{ width: 12, height: 1, background: 'rgba(200,160,100,0.35)' }} />
            <span style={{ color: 'rgba(200,160,100,0.45)', fontSize: 8 }}>✿</span>
            <div style={{ width: 18, height: 1, background: 'rgba(200,160,100,0.4)' }} />
            <span style={{ color: 'rgba(200,160,100,0.6)', fontSize: 7 }}>✦</span>
            <div style={{ width: 18, height: 1, background: 'rgba(200,160,100,0.4)' }} />
            <span style={{ color: 'rgba(200,160,100,0.45)', fontSize: 8 }}>✿</span>
            <div style={{ width: 12, height: 1, background: 'rgba(200,160,100,0.35)' }} />
          </div>
        </div>

        {/* Location badge */}
        <div style={ornatePanel({ padding: '4px 16px 5px', minWidth: 170 })}>
          <Corners color="rgba(200,170,100,0.6)" />
          <div style={{
            color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: 'bold',
            letterSpacing: 0.3, lineHeight: 1.4, textAlign: 'center',
          }}>
            {levelName} — {levelSubtitle}
          </div>
          <div style={{
            color: 'rgba(200,160,255,0.6)', fontSize: 8, letterSpacing: 2,
            textAlign: 'center', marginTop: 1,
          }}>
            ◆ Lv. {levelNumber} ◆
          </div>
        </div>
      </div>

      {/* ── TOP-RIGHT: Pause ─────────────────────────────────────────────── */}
      <div
        style={ornatePanel({
          position: 'absolute', top: 8, right: 8,
          width: 40, height: 40, pointerEvents: 'all', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.75)', fontSize: 16,
        })}
        onClick={onPause}
      >
        <Corners />
        <span style={{ letterSpacing: 2, fontWeight: 'bold' }}>⏸</span>
      </div>

      {/* ── GATE OPEN notification ───────────────────────────────────────── */}
      {showGateMsg && !bossActive && (
        <div style={{
          position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%, -50%)',
          ...ornatePanel({ border: '1px solid rgba(155,89,182,0.8)', padding: '12px 24px', textAlign: 'center' }),
          animation: 'hudFadeInOut 3.5s ease forwards',
        }}>
          <Corners color="rgba(155,89,182,0.8)" />
          <div style={{ color: '#D5B3FF', fontSize: 10, letterSpacing: 3, marginBottom: 4 }}>✦ THE GATE OPENS</div>
          <div style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>Path to truth revealed…</div>
        </div>
      )}

      {/* ── BOSS UNLOCK notification ─────────────────────────────────────── */}
      {showBossMsg && !bossActive && (
        <div style={{
          position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%, -50%)',
          ...ornatePanel({ border: '1px solid rgba(255,80,80,0.85)', padding: '14px 28px', textAlign: 'center' }),
          animation: 'hudFadeInOut 4s ease forwards',
          boxShadow: '0 0 32px rgba(255,60,60,0.3)',
        }}>
          <Corners color="rgba(255,80,80,0.85)" />
          <div style={{ color: '#FF9999', fontSize: 10, letterSpacing: 3, marginBottom: 4 }}>⚠ THE TRUTH IS READY</div>
          <div style={{ color: 'white', fontSize: 13, fontWeight: 'bold', marginBottom: 3 }}>Face the boss.</div>
          <div style={{ color: 'rgba(255,200,200,0.6)', fontSize: 8, letterSpacing: 1 }}>Cross the gate to begin the confrontation</div>
        </div>
      )}

      {/* ── BOSS HP bar ──────────────────────────────────────────────────── */}
      {bossActive && bossHp > 0 && (
        <div style={{
          position: 'absolute', bottom: 220, left: '50%', transform: 'translateX(-50%)',
          width: 260, ...ornatePanel({ border: '1px solid rgba(255,60,60,0.5)', padding: '8px 12px' }),
        }}>
          <Corners color="rgba(255,60,60,0.7)" />
          <div style={{ color: '#FF8888', fontSize: 9, letterSpacing: 2, marginBottom: 5 }}>
            ⚠ {bossName.toUpperCase()}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 3, height: 10, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(bossHp / bossMaxHp) * 100}%`,
              background: 'linear-gradient(to right, #CC0000, #FF6666)',
              borderRadius: 3, transition: 'width 0.3s ease',
              boxShadow: '0 0 8px rgba(255,0,0,0.5)',
            }} />
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, marginTop: 3, textAlign: 'right' }}>
            {bossHp} / {bossMaxHp}
          </div>
        </div>
      )}

      {/* ── NEW CLUE popup ───────────────────────────────────────────────── */}
      {newClue && (
        <div style={{
          position: 'absolute', top: '32%', left: '50%', transform: 'translateX(-50%)',
          ...ornatePanel({ border: '1px solid rgba(255,215,0,0.6)', padding: '10px 20px', textAlign: 'center', minWidth: 210 }),
          animation: 'hudFadeInOut 3s ease forwards',
          boxShadow: '0 0 24px rgba(255,215,0,0.2)',
        }}>
          <Corners color="rgba(255,215,0,0.7)" />
          <div style={{ color: '#FFD700', fontSize: 8, letterSpacing: 2, marginBottom: 4 }}>✦ NEW CLUE COLLECTED ✦</div>
          <div style={{ color: 'white', fontSize: 13, fontWeight: 'bold', marginBottom: 5 }}>{newClue.title}</div>
          <div style={{
            display: 'inline-block',
            background: 'rgba(155,89,182,0.25)', border: '1px solid rgba(155,89,182,0.6)',
            borderRadius: 3, padding: '2px 8px',
            color: '#D5B3FF', fontSize: 8, letterSpacing: 1.5,
          }}>
            {newClue.category}
          </div>
        </div>
      )}

      <style>{`
        @keyframes hudFadeInOut {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
          15%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          75%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
