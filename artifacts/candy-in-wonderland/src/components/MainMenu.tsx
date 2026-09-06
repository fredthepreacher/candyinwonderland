import React, { useEffect, useRef, useState } from 'react';
import type { SaveProfile, GameSettings } from '../game/types';
import { loadProfiles, createNewProfile, saveProfile, deleteProfile } from '../game/SaveSystem';
import { AssetPaths } from '../data/assets';

// Menu art. `candy` is Candy's actual full-body game sprite — the menu used to
// show her dialogue portrait (a head-and-shoulders bust) as if it were a
// character sprite, which is why she read as cropped here.
const A = AssetPaths.menu;

interface MainMenuProps {
  onStartGame: (profile: SaveProfile) => void;
  onOptions?: () => void;
  settings: GameSettings;
  onSettingsChange: (s: GameSettings) => void;
}

export function MainMenu({ onStartGame, settings, onSettingsChange }: MainMenuProps) {
  const [screen, setScreen] = useState<'main' | 'profiles' | 'credits' | 'options'>('main');
  const [profiles, setProfiles] = useState<(SaveProfile | null)[]>(loadProfiles());
  const [newName, setNewName] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), 800);
    return () => clearInterval(id);
  }, []);

  const handleSelectSlot = (i: number) => {
    const prof = profiles[i];
    if (prof) { onStartGame(prof); } else { setSelectedSlot(i); }
  };

  const handleCreateProfile = () => {
    if (!newName.trim() || selectedSlot === null) return;
    const prof = createNewProfile(selectedSlot, newName.trim());
    saveProfile(prof);
    setProfiles(loadProfiles());
    setNewName('');
    setSelectedSlot(null);
    onStartGame(prof);
  };

  const handleDeleteProfile = (e: React.MouseEvent, i: number) => {
    e.stopPropagation();
    deleteProfile(i);
    setProfiles(loadProfiles());
  };

  // ── OPTIONS ──────────────────────────────────────────────────────────────
  if (screen === 'options') {
    return (
      <MenuWrapper>
        <SubScreenTitle>⚙ OPTIONS</SubScreenTitle>
        <SectionLabel>AUDIO</SectionLabel>
        <VolRow label="MUSIC" value={settings.musicVolume} muted={settings.musicMuted}
          onVol={v => onSettingsChange({ ...settings, musicVolume: v })}
          onMute={() => onSettingsChange({ ...settings, musicMuted: !settings.musicMuted })} />
        <VolRow label="SFX" value={settings.sfxVolume} muted={settings.sfxMuted}
          onVol={v => onSettingsChange({ ...settings, sfxVolume: v })}
          onMute={() => onSettingsChange({ ...settings, sfxMuted: !settings.sfxMuted })} />
        <SectionLabel style={{ marginTop: 12 }}>GAMEPLAY</SectionLabel>
        <SettingRow label="TEXT SPEED">
          <input type="range" min={10} max={50} step={5} value={settings.textSpeed}
            onChange={e => onSettingsChange({ ...settings, textSpeed: Number(e.target.value) })}
            style={{ flex: 1, accentColor: '#9B59B6' }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, width: 30, textAlign: 'right' }}>
            {settings.textSpeed}
          </span>
        </SettingRow>
        <SettingRow label="CONTROLS">
          <ToggleBtn active={settings.mobileControls}
            onClick={() => onSettingsChange({ ...settings, mobileControls: !settings.mobileControls })}>
            {settings.mobileControls ? 'MOBILE ON' : 'MOBILE OFF'}
          </ToggleBtn>
        </SettingRow>
        <SettingRow label="AUTO-SAVE">
          <ToggleBtn active={settings.autoSave}
            onClick={() => onSettingsChange({ ...settings, autoSave: !settings.autoSave })}>
            {settings.autoSave ? 'ON' : 'OFF'}
          </ToggleBtn>
        </SettingRow>
        <div style={{ marginTop: 18 }}><BackBtn onClick={() => setScreen('main')} /></div>
      </MenuWrapper>
    );
  }

  // ── PROFILES ─────────────────────────────────────────────────────────────
  if (screen === 'profiles') {
    return (
      <MenuWrapper>
        <SubScreenTitle>SELECT PROFILE</SubScreenTitle>
        {profiles.map((prof, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div onClick={() => handleSelectSlot(i)} style={{
              background: 'rgba(155,89,182,0.1)',
              border: '1px solid rgba(155,89,182,0.4)',
              borderRadius: 6, padding: '10px 14px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(155,89,182,0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(155,89,182,0.1)'; }}
            >
              {prof ? (
                <>
                  <div>
                    <div style={{ color: 'white', fontSize: 12 }}>{prof.name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginTop: 2 }}>
                      Level {prof.level} • {prof.clues.length} clues • {prof.truthFragments.length} fragments
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: '#A0D468', fontSize: 10 }}>▶ CONTINUE</span>
                    <span onClick={e => handleDeleteProfile(e, i)}
                      style={{ color: '#FF6666', fontSize: 10, cursor: 'pointer' }} title="Delete">✕</span>
                  </div>
                </>
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, letterSpacing: 1 }}>
                  ＋ New Profile — Slot {i + 1}
                </div>
              )}
            </div>
            {selectedSlot === i && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <input autoFocus placeholder="Enter your name…" value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateProfile(); if (e.key === 'Escape') setSelectedSlot(null); }}
                  style={{
                    flex: 1, padding: '6px 10px', background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(155,89,182,0.5)', color: 'white', borderRadius: 4,
                    fontFamily: 'inherit', fontSize: 11, outline: 'none',
                  }} />
                <button onClick={handleCreateProfile} style={{
                  padding: '6px 14px', background: 'rgba(155,89,182,0.3)',
                  border: '1px solid #9B59B6', color: '#D5B3FF', borderRadius: 4,
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
                }}>START</button>
              </div>
            )}
          </div>
        ))}
        <BackBtn onClick={() => { setSelectedSlot(null); setScreen('main'); }} />
      </MenuWrapper>
    );
  }

  // ── CREDITS ──────────────────────────────────────────────────────────────
  if (screen === 'credits') {
    return (
      <MenuWrapper>
        <SubScreenTitle>CREDITS</SubScreenTitle>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, lineHeight: 2, textAlign: 'center' }}>
          <div style={{ color: '#FFD700', marginBottom: 8 }}>✦ CANDY IN WONDERLAND ✦</div>
          <div>A mystery-adventure about truth, courage,</div>
          <div>and the courage to separate rumor from record.</div>
          <div style={{ marginTop: 16, color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>
            All characters and events are fictional.<br />
            Not every clue is proof.<br />
            Not every rumor is a record.
          </div>
          <div style={{ marginTop: 16, color: '#D5B3FF', fontSize: 10 }}>
            "Truth requires courage, evidence,<br />patience, and honesty."
          </div>
        </div>
        <div style={{ marginTop: 20 }}><BackBtn onClick={() => setScreen('main')} /></div>
      </MenuWrapper>
    );
  }

  // ── MAIN MENU ─────────────────────────────────────────────────────────────
  return (
    <MenuWrapper>
      {/* Signpost cluster — left edge decoration */}
      <div style={{
        position: 'absolute', left: 0, top: '50%', transform: 'translateY(-20%)',
        display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8,
        opacity: 0.72, pointerEvents: 'none',
      }}>
        <img src={A.sign1} alt="" style={{ width: 'min(140px, 22vw)', imageRendering: 'auto' }} />
        <img src={A.sign2} alt="" style={{ width: 'min(140px, 22vw)', imageRendering: 'auto' }} />
        <img src={A.sign3} alt="" style={{ width: 'min(140px, 22vw)', imageRendering: 'auto' }} />
      </div>

      {/* Center column */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Title logo */}
        <img src={A.title} alt="Candy in Wonderland"
          style={{ width: 'min(420px, 88vw)', maxWidth: '100%', display: 'block', margin: '0 auto' }} />

        {/* Subtitle */}
        <img src={A.subtitle} alt="A Mystery Adventure in 20 Wonderland States"
          style={{ width: 'min(320px, 70vw)', marginTop: 8, opacity: 0.92 }} />

        {/* Candy character */}
        <div style={{
          margin: '18px auto 0',
          width: 'min(150px, 30vw)',
          filter: 'drop-shadow(0 0 18px rgba(155,89,182,0.7)) drop-shadow(0 0 36px rgba(155,89,182,0.3))',
        }}>
          <img src={A.candy} alt="Candy"
            style={{ width: '100%', display: 'block', imageRendering: 'auto' }} />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20, width: 'min(280px, 80vw)' }}>
          <ImgBtn src={A.btnStart} alt="Start Game" onClick={() => setScreen('profiles')} primary />
          <ImgBtn src={A.btnOpts}  alt="Options"    onClick={() => setScreen('options')} />
          <ImgBtn src={A.btnCreds} alt="Credits"    onClick={() => setScreen('credits')} />
        </div>

        {/* Press any key */}
        <div style={{ marginTop: 22, opacity: pulse ? 0.9 : 0.3, transition: 'opacity 0.4s' }}>
          <img src={A.anyKey} alt="Press Any Key to Begin"
            style={{ width: 'min(220px, 58vw)', display: 'block', margin: '0 auto' }} />
        </div>
      </div>
    </MenuWrapper>
  );
}

// ── Image button ─────────────────────────────────────────────────────────────
function ImgBtn({ src, alt, onClick, primary }: { src: string; alt: string; onClick: () => void; primary?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover
          ? (primary ? 'rgba(155,89,182,0.35)' : 'rgba(255,255,255,0.08)')
          : (primary ? 'rgba(155,89,182,0.18)' : 'transparent'),
        border: `1px solid ${primary ? 'rgba(180,120,255,0.55)' : 'rgba(255,255,255,0.18)'}`,
        borderRadius: 8, cursor: 'pointer', padding: '6px 12px',
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%',
        boxShadow: primary && hover ? '0 0 18px rgba(155,89,182,0.5)' : 'none',
      }}>
      <img src={src} alt={alt}
        style={{ height: 'clamp(28px, 5.5vw, 40px)', maxWidth: '100%', display: 'block', objectFit: 'contain' }} />
    </button>
  );
}

// ── Layout wrapper ────────────────────────────────────────────────────────────
function MenuWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'radial-gradient(ellipse at 50% 30%, #1a0638 0%, #06020f 70%, #020008 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Courier New", Courier, monospace',
      overflow: 'hidden',
    }}>
      {/* Painted night sky, under the gradient wash */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `url(${A.starfield})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.55,
      }} />

      {/* Drifting star field on top of the plate */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 55 }, (_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${(i * 37 + i * i * 3) % 100}%`,
            top:  `${(i * 53 + i * 7)      % 100}%`,
            width:  i % 7 === 0 ? 3 : 2,
            height: i % 7 === 0 ? 3 : 2,
            background: `rgba(255,255,255,${0.18 + (i % 6) * 0.1})`,
            borderRadius: '50%',
            boxShadow: i % 9 === 0 ? '0 0 4px 1px rgba(200,160,255,0.4)' : 'none',
          }} />
        ))}
      </div>

      {/* Subtle vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.65) 100%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '90%', maxWidth: 520, padding: '24px 16px' }}>
        {children}
      </div>
    </div>
  );
}

// ── Reusable sub-screen pieces ────────────────────────────────────────────────
function SubScreenTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: '#D5B3FF', fontSize: 11, letterSpacing: 3, marginBottom: 18, textAlign: 'center' }}>
      {children}
    </div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '9px 0', marginTop: 8,
      background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
      color: 'rgba(255,255,255,0.5)', borderRadius: 6, cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 11, letterSpacing: 2,
    }}>◀ BACK</button>
  );
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, letterSpacing: 2, marginBottom: 8, ...style }}>
      {children}
    </div>
  );
}

function VolRow({ label, value, muted, onVol, onMute }: {
  label: string; value: number; muted: boolean;
  onVol: (v: number) => void; onMute: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: 1, width: 34, flexShrink: 0 }}>
        {label}
      </span>
      <input type="range" min={0} max={1} step={0.05} value={value}
        onChange={e => onVol(Number(e.target.value))} disabled={muted}
        style={{ flex: 1, accentColor: '#9B59B6', opacity: muted ? 0.35 : 1 }} />
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, width: 26, textAlign: 'right', flexShrink: 0 }}>
        {muted ? 'OFF' : `${Math.round(value * 100)}%`}
      </span>
      <button onClick={onMute} title={muted ? 'Unmute' : 'Mute'} style={{
        width: 26, height: 20, flexShrink: 0,
        background: muted ? 'rgba(200,50,50,0.25)' : 'rgba(155,89,182,0.15)',
        border: `1px solid ${muted ? 'rgba(200,50,50,0.5)' : 'rgba(155,89,182,0.35)'}`,
        color: muted ? '#FF8888' : '#9B59B6',
        borderRadius: 4, cursor: 'pointer', fontSize: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
      }}>{muted ? '✕' : '♪'}</button>
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: 1, width: 70, flexShrink: 0 }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 12px',
      background: active ? 'rgba(155,89,182,0.35)' : 'transparent',
      border: `1px solid ${active ? '#9B59B6' : 'rgba(255,255,255,0.2)'}`,
      color: active ? '#D5B3FF' : 'rgba(255,255,255,0.4)',
      borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 9, letterSpacing: 1,
    }}>{children}</button>
  );
}
