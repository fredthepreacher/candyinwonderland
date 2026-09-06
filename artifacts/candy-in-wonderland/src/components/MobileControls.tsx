import React, { useRef, useCallback } from 'react';

interface MobileControlsProps {
  onInput: (input: { up?: boolean; down?: boolean; left?: boolean; right?: boolean; attack?: boolean; interact?: boolean; pause?: boolean }) => void;
  visible: boolean;
}

export function MobileControls({ onInput, visible }: MobileControlsProps) {
  const dpadRef = useRef<HTMLDivElement>(null);
  const activeTouches = useRef<Map<number, string>>(new Map());
  const dirState = useRef({ up: false, down: false, left: false, right: false });
  const knobRef = useRef<HTMLDivElement>(null);

  const updateDpad = useCallback((touch: React.Touch | Touch) => {
    const el = dpadRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = touch.clientX - cx;
    const dy = touch.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxKnob = 32;

    if (knobRef.current) {
      const kx = dist < maxKnob ? dx : (dx / dist) * maxKnob;
      const ky = dist < maxKnob ? dy : (dy / dist) * maxKnob;
      knobRef.current.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
    }

    if (dist < 14) {
      dirState.current = { up: false, down: false, left: false, right: false };
    } else {
      const angle = Math.atan2(dy, dx);
      const deg = ((angle * 180) / Math.PI + 360) % 360;
      dirState.current = {
        up: deg >= 225 && deg < 315,
        down: deg >= 45 && deg < 135,
        left: deg >= 135 && deg < 225,
        right: deg < 45 || deg >= 315,
      };
    }
    onInput(dirState.current);
  }, [onInput]);

  const clearDpad = useCallback(() => {
    dirState.current = { up: false, down: false, left: false, right: false };
    onInput(dirState.current);
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(-50%, -50%)';
    }
  }, [onInput]);

  if (!visible) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>

      {/* ── JOYSTICK (bottom-left) ──────────────────────────────────────── */}
      <div
        ref={dpadRef}
        style={{
          position: 'absolute',
          bottom: 22, left: 16,
          width: 148, height: 148,
          borderRadius: '50%',
          // Outer ring — dark translucent matching reference
          background: 'radial-gradient(circle at 40% 35%, rgba(30,20,60,0.75), rgba(8,4,20,0.88))',
          border: '1.5px solid rgba(255,255,255,0.18)',
          boxShadow: [
            '0 0 0 2px rgba(0,0,0,0.5)',
            '0 0 20px rgba(80,0,180,0.2)',
            'inset 0 0 24px rgba(0,0,0,0.6)',
            'inset 0 1px 0 rgba(255,255,255,0.08)',
          ].join(', '),
          pointerEvents: 'all',
          touchAction: 'none', userSelect: 'none',
        }}
        onTouchStart={e => { e.preventDefault(); Array.from(e.changedTouches).forEach(t => { activeTouches.current.set(t.identifier, 'dpad'); updateDpad(t); }); }}
        onTouchMove={e => { e.preventDefault(); Array.from(e.changedTouches).forEach(t => { if (activeTouches.current.get(t.identifier) === 'dpad') updateDpad(t); }); }}
        onTouchEnd={e => { e.preventDefault(); Array.from(e.changedTouches).forEach(t => activeTouches.current.delete(t.identifier)); if (!Array.from(activeTouches.current.values()).includes('dpad')) clearDpad(); }}
        onTouchCancel={e => { e.preventDefault(); clearDpad(); activeTouches.current.clear(); }}
      >
        {/* Outer ring decoration */}
        <div style={{
          position: 'absolute', inset: 6, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.08)',
        }} />

        {/* Direction arrows */}
        {([
          { dir: 'up',    top: 10, left: '50%', xform: 'translateX(-50%)' },
          { dir: 'down',  bottom: 10, left: '50%', xform: 'translateX(-50%)' },
          { dir: 'left',  left: 10, top: '50%', xform: 'translateY(-50%)' },
          { dir: 'right', right: 10, top: '50%', xform: 'translateY(-50%)' },
        ] as const).map(({ dir, ...pos }) => (
          <div key={dir} style={{
            position: 'absolute', ...pos, transform: pos.xform,
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13, lineHeight: 1,
            textShadow: '0 0 8px rgba(200,150,255,0.5)',
          }}>
            {dir === 'up' ? '▲' : dir === 'down' ? '▼' : dir === 'left' ? '◀' : '▶'}
          </div>
        ))}

        {/* Inner ring */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 64, height: 64, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(12,6,32,0.9), rgba(5,2,15,0.95))',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)',
        }} />

        {/* Knob */}
        <div
          ref={knobRef}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 44, height: 44, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, rgba(200,150,255,0.5), rgba(70,30,130,0.85))',
            border: '1.5px solid rgba(220,180,255,0.35)',
            boxShadow: '0 3px 10px rgba(0,0,0,0.7), 0 0 8px rgba(140,80,255,0.2)',
            transition: 'transform 0.04s ease-out',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* ── ACTION BUTTONS (bottom-right) ───────────────────────────────── */}
      <div style={{
        position: 'absolute',
        bottom: 22, right: 14,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}>
        {/* ATTACK — red sword button */}
        <ActionBtn
          label="ATTACK"
          icon={
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <line x1="6" y1="22" x2="22" y2="6" stroke="rgba(255,220,220,0.95)" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="18" y1="6" x2="22" y2="6" stroke="rgba(255,220,220,0.95)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="22" y1="6" x2="22" y2="10" stroke="rgba(255,220,220,0.95)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="9" y1="16" x2="12" y2="13" stroke="rgba(255,180,180,0.6)" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="6" cy="22" r="2" fill="rgba(255,220,200,0.8)"/>
            </svg>
          }
          bg="radial-gradient(circle at 40% 35%, rgba(180,40,60,0.9), rgba(100,10,25,0.95))"
          border="rgba(220,80,100,0.6)"
          glow="rgba(220,40,60,0.4)"
          onPress={() => onInput({ attack: true })}
          onRelease={() => onInput({ attack: false })}
        />
        {/* INTERACT — speech bubble button */}
        <ActionBtn
          label="INTERACT"
          icon={
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <ellipse cx="14" cy="13" rx="9" ry="7" stroke="rgba(200,220,255,0.9)" strokeWidth="2" fill="none"/>
              <line x1="10" y1="12" x2="18" y2="12" stroke="rgba(200,220,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="10" y1="15" x2="16" y2="15" stroke="rgba(200,220,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M10 20 L12 17 L14 20" stroke="rgba(200,220,255,0.9)" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
            </svg>
          }
          bg="radial-gradient(circle at 40% 35%, rgba(30,70,160,0.9), rgba(10,30,90,0.95))"
          border="rgba(80,140,220,0.6)"
          glow="rgba(60,120,220,0.35)"
          onPress={() => onInput({ interact: true })}
          onRelease={() => onInput({ interact: false })}
        />
      </div>

      <style>{`
        @keyframes btnPulse {
          0%, 100% { box-shadow: 0 0 14px var(--glow), inset 0 0 12px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 22px var(--glow), inset 0 0 12px rgba(0,0,0,0.5); }
        }
      `}</style>
    </div>
  );
}

interface ActionBtnProps {
  label: string;
  icon: React.ReactNode;
  bg: string;
  border: string;
  glow: string;
  onPress: () => void;
  onRelease: () => void;
}

function ActionBtn({ label, icon, bg, border, glow, onPress, onRelease }: ActionBtnProps) {
  const pressRef = useRef(false);
  const btnRef = useRef<HTMLDivElement>(null);

  const press = () => {
    if (btnRef.current) btnRef.current.style.transform = 'scale(0.93)';
    onPress();
  };
  const release = () => {
    if (btnRef.current) btnRef.current.style.transform = 'scale(1)';
    onRelease();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div
        ref={btnRef}
        style={{
          width: 72, height: 72, borderRadius: '50%',
          background: bg,
          border: `1.5px solid ${border}`,
          boxShadow: `0 0 16px ${glow}, 0 0 0 2px rgba(0,0,0,0.5), inset 0 0 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'all', touchAction: 'none', userSelect: 'none',
          transition: 'transform 0.08s ease',
          cursor: 'pointer',
        }}
        onTouchStart={e => { e.preventDefault(); pressRef.current = true; press(); }}
        onTouchEnd={e => { e.preventDefault(); if (pressRef.current) { pressRef.current = false; release(); } }}
        onTouchCancel={e => { e.preventDefault(); pressRef.current = false; release(); }}
        onMouseDown={e => { e.preventDefault(); pressRef.current = true; press(); }}
        onMouseUp={e => { e.preventDefault(); if (pressRef.current) { pressRef.current = false; release(); } }}
        onMouseLeave={() => { if (pressRef.current) { pressRef.current = false; release(); } }}
      >
        {icon}
      </div>
      <span style={{
        color: 'rgba(255,255,255,0.45)', fontSize: 8, letterSpacing: 1.8,
        fontFamily: '"Courier New", monospace',
      }}>
        {label}
      </span>
    </div>
  );
}
