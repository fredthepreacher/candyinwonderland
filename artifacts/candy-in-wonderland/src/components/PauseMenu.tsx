import React from 'react';
import type { GameSettings } from '../game/types';

interface PauseMenuProps {
  onResume: () => void;
  onJournal: () => void;
  onMainMenu: () => void;
  settings: GameSettings;
  onSettingsChange: (s: GameSettings) => void;
}

export function PauseMenu({ onResume, onJournal, onMainMenu, settings, onSettingsChange }: PauseMenuProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: 'rgba(0,0,0,0.82)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Courier New", Courier, monospace',
    }}>
      <div style={{
        width: 340,
        background: 'rgba(8,4,20,0.97)',
        border: '2px solid rgba(155,89,182,0.7)',
        borderRadius: 10,
        padding: '24px 24px 20px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ color: '#D5B3FF', fontSize: 11, letterSpacing: 3 }}>⏸ PAUSED</div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, marginTop: 4 }}>CANDY IN WONDERLAND</div>
        </div>

        <MenuBtn onClick={onResume} primary>▶ RESUME</MenuBtn>
        <MenuBtn onClick={onJournal}>📔 TRUTH JOURNAL</MenuBtn>

        {/* Audio */}
        <div style={{ marginTop: 4 }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: 1, marginBottom: 6 }}>AUDIO</div>

          {/* Music row: slider + mute toggle */}
          <VolumeRow
            label="MUSIC"
            value={settings.musicVolume}
            muted={settings.musicMuted}
            onVolumeChange={v => onSettingsChange({ ...settings, musicVolume: v })}
            onMuteToggle={() => onSettingsChange({ ...settings, musicMuted: !settings.musicMuted })}
          />

          {/* SFX row: slider + mute toggle */}
          <VolumeRow
            label="SFX"
            value={settings.sfxVolume}
            muted={settings.sfxMuted}
            onVolumeChange={v => onSettingsChange({ ...settings, sfxVolume: v })}
            onMuteToggle={() => onSettingsChange({ ...settings, sfxMuted: !settings.sfxMuted })}
          />
        </div>

        {/* Difficulty */}
        <div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>DIFFICULTY</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['Easy','Normal','Hard'] as const).map(d => (
              <button
                key={d}
                onClick={() => onSettingsChange({ ...settings, difficulty: d })}
                style={{
                  flex: 1, padding: '4px 0',
                  background: settings.difficulty === d ? 'rgba(155,89,182,0.4)' : 'transparent',
                  border: `1px solid ${settings.difficulty === d ? '#9B59B6' : 'rgba(255,255,255,0.15)'}`,
                  color: settings.difficulty === d ? '#D5B3FF' : 'rgba(255,255,255,0.4)',
                  borderRadius: 4, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 9, letterSpacing: 1,
                }}
              >{d}</button>
            ))}
          </div>
        </div>

        <MenuBtn onClick={onMainMenu} danger>✖ MAIN MENU</MenuBtn>

        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 9, marginTop: 4 }}>
          Press ESC to resume
        </div>
      </div>
    </div>
  );
}

// ── Volume row: label + slider + % + mute button ─────────────────────────────
function VolumeRow({ label, value, muted, onVolumeChange, onMuteToggle }: {
  label: string;
  value: number;
  muted: boolean;
  onVolumeChange: (v: number) => void;
  onMuteToggle: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: 1, width: 34, flexShrink: 0 }}>
        {label}
      </span>
      <input
        type="range" min={0} max={1} step={0.05} value={value}
        onChange={e => onVolumeChange(Number(e.target.value))}
        disabled={muted}
        style={{ flex: 1, accentColor: '#9B59B6', opacity: muted ? 0.35 : 1 }}
      />
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, width: 26, textAlign: 'right', flexShrink: 0 }}>
        {muted ? 'OFF' : `${Math.round(value * 100)}%`}
      </span>
      <button
        onClick={onMuteToggle}
        title={muted ? 'Unmute' : 'Mute'}
        style={{
          width: 26, height: 20, flexShrink: 0,
          background: muted ? 'rgba(200,50,50,0.25)' : 'rgba(155,89,182,0.15)',
          border: `1px solid ${muted ? 'rgba(200,50,50,0.5)' : 'rgba(155,89,182,0.35)'}`,
          color: muted ? '#FF8888' : '#9B59B6',
          borderRadius: 4, cursor: 'pointer', fontSize: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'inherit',
        }}
      >
        {muted ? '✕' : '♪'}
      </button>
    </div>
  );
}

// ── Generic menu button ───────────────────────────────────────────────────────
function MenuBtn({ children, onClick, primary, danger }: {
  children: React.ReactNode; onClick: () => void; primary?: boolean; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '10px 0',
        background: primary ? 'rgba(155,89,182,0.25)' : danger ? 'rgba(200,50,50,0.15)' : 'transparent',
        border: `1px solid ${primary ? 'rgba(155,89,182,0.6)' : danger ? 'rgba(200,50,50,0.4)' : 'rgba(255,255,255,0.15)'}`,
        color: primary ? '#D5B3FF' : danger ? '#FF8888' : 'rgba(255,255,255,0.7)',
        borderRadius: 6, cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 12, letterSpacing: 2,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { (e.target as HTMLButtonElement).style.opacity = '0.8'; }}
      onMouseLeave={e => { (e.target as HTMLButtonElement).style.opacity = '1'; }}
    >
      {children}
    </button>
  );
}
