import React, { useEffect, useRef } from 'react';

interface LevelCompleteScreenProps {
  fragment: string;
  levelNumber: number;
  levelName: string;
  levelSubtitle: string;
  cluesFound: number;
  isLastLevel: boolean;
  onContinue: () => void;
}

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];

export function LevelCompleteScreen({
  fragment, levelNumber, levelName, levelSubtitle, cluesFound, isLastLevel, onContinue
}: LevelCompleteScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d')!;

    const particles: Array<{x:number;y:number;vx:number;vy:number;life:number;maxLife:number;color:string;size:number}> = [];
    for (let i = 0; i < 90; i++) {
      const life = Math.random() * 220 + 60;
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 1.8,
        vy: (Math.random() - 0.5) * 1.8,
        life,
        maxLife: life,
        color: isLastLevel
          ? `hsl(${Math.random() * 60 + 40}, 90%, 65%)`
          : `hsl(${Math.random() * 60 + 260}, 80%, 65%)`,
        size: Math.random() * 4 + 1,
      });
    }

    const id = setInterval(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life < 0) {
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
          p.life = p.maxLife;
        }
        ctx.globalAlpha = Math.min(1, p.life / 40);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }, 30);
    return () => clearInterval(id);
  }, [isLastLevel]);

  const gemColor = isLastLevel
    ? 'radial-gradient(circle, #FFD700, #FF8C00)'
    : 'radial-gradient(circle, #FFD700, #B8860B)';
  const gemGlow = isLastLevel
    ? '0 0 40px rgba(255,215,0,0.9)'
    : '0 0 30px rgba(255,215,0,0.6)';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.93)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Courier New", Courier, monospace',
    }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

      <div style={{
        position: 'relative', zIndex: 1,
        textAlign: 'center',
        width: '90%', maxWidth: 520,
        padding: 30,
        background: 'rgba(8,4,20,0.88)',
        border: `2px solid rgba(255,215,0,${isLastLevel ? 0.9 : 0.6})`,
        borderRadius: 12,
        boxShadow: isLastLevel ? '0 0 60px rgba(255,215,0,0.25)' : 'none',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>
          {isLastLevel ? '✦ FINAL LEVEL COMPLETE ✦' : 'LEVEL COMPLETE'}
        </div>

        <h2 style={{
          color: '#FFD700', fontSize: isLastLevel ? 20 : 22, fontWeight: 'bold',
          letterSpacing: 2, margin: '0 0 4px',
          textShadow: `0 0 20px rgba(255,215,0,${isLastLevel ? 1 : 0.8})`,
        }}>
          {isLastLevel ? '✦ THE TRUTH IS ASSEMBLED ✦' : '✦ TRUTH FRAGMENT ACQUIRED ✦'}
        </h2>

        <div style={{ color: '#D5B3FF', fontSize: 12, marginBottom: 20 }}>
          {levelName} — {levelSubtitle}
        </div>

        {/* Fragment gem */}
        <div style={{
          width: isLastLevel ? 76 : 64, height: isLastLevel ? 76 : 64,
          margin: '0 auto 20px',
          background: gemColor,
          borderRadius: 8,
          boxShadow: gemGlow,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isLastLevel ? 34 : 28,
          transform: 'rotate(45deg)',
          transition: 'all 0.3s',
        }}>
          <span style={{ transform: 'rotate(-45deg)' }}>{isLastLevel ? '★' : '✦'}</span>
        </div>

        {/* Fragment text */}
        <div style={{
          background: 'rgba(255,215,0,0.08)',
          border: '1px solid rgba(255,215,0,0.3)',
          borderRadius: 8, padding: '12px 16px',
          marginBottom: 20, textAlign: 'left',
        }}>
          <div style={{ color: 'rgba(255,215,0,0.6)', fontSize: 9, letterSpacing: 2, marginBottom: 6 }}>
            📜 FRAGMENT {ROMAN[levelNumber - 1] ?? levelNumber} — {levelName.toUpperCase()}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, lineHeight: 1.75, fontStyle: 'italic' }}>
            "{fragment}"
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: isLastLevel ? 16 : 20 }}>
          <Stat label="CLUES FOUND" value={`${cluesFound}`} />
          <Stat label="FRAGMENT" value={`${levelNumber} / 20`} />
          <Stat label="BOSS" value="DEFEATED" />
        </div>

        {/* Final message for last level */}
        {isLastLevel && (
          <div style={{
            background: 'rgba(255,215,0,0.06)',
            border: '1px solid rgba(255,215,0,0.2)',
            borderRadius: 8, padding: '12px 16px',
            marginBottom: 20, textAlign: 'left',
          }}>
            <div style={{ color: '#FFD700', fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>
              ✦ ENDING MESSAGE
            </div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, lineHeight: 1.8, fontStyle: 'italic' }}>
              "Truth requires courage, evidence, patience, and honesty. Not every claim is a conclusion. Not every rumor is a record. Candy's journey was not only to find answers, but to learn how truth survives in a world full of mirrors."
            </div>
          </div>
        )}

        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginBottom: 16, lineHeight: 1.6 }}>
          {isLastLevel
            ? 'The Architect of Confusion has been revealed. Truth endures.'
            : 'The truth is out there. Keep searching, Candy.'}
        </div>

        <button
          onClick={onContinue}
          style={{
            padding: '12px 32px',
            background: isLastLevel ? 'rgba(255,215,0,0.25)' : 'rgba(255,215,0,0.18)',
            border: `2px solid rgba(255,215,0,${isLastLevel ? 0.9 : 0.6})`,
            color: '#FFD700',
            borderRadius: 6, cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: isLastLevel ? 14 : 13,
            letterSpacing: 3,
            textShadow: isLastLevel ? '0 0 10px rgba(255,215,0,0.8)' : 'none',
          }}
          autoFocus
        >
          {isLastLevel ? '★ RETURN TO MENU' : '▶ NEXT LEVEL'}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8, letterSpacing: 1 }}>{label}</div>
      <div style={{ color: '#FFD700', fontSize: 14, fontWeight: 'bold', marginTop: 2 }}>{value}</div>
    </div>
  );
}
