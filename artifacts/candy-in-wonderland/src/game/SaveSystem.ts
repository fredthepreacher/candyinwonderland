import type { SaveProfile, GameSettings, Clue } from './types';

const SAVE_KEY = 'candy_wonderland_saves';
const SETTINGS_KEY = 'candy_wonderland_settings';

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.5,
  sfxVolume: 0.8,
  musicMuted: false,
  sfxMuted: false,
  difficulty: 'Normal',
  textSpeed: 40,
  autoSave: true,
  mobileControls: true,
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s: GameSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function loadProfiles(): (SaveProfile | null)[] {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [null, null, null];
}

export function saveProfile(profile: SaveProfile): void {
  const profiles = loadProfiles();
  profiles[profile.slot] = profile;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(profiles)); } catch { /* ignore */ }
}

export function deleteProfile(slot: number): void {
  const profiles = loadProfiles();
  profiles[slot] = null;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(profiles)); } catch { /* ignore */ }
}

export function createNewProfile(slot: number, name: string): SaveProfile {
  return {
    slot,
    name,
    level: 1,
    hp: 5,
    clues: [],
    completedBosses: [],
    truthFragments: [],
    difficulty: 'Normal',
    musicVolume: 0.5,
    sfxVolume: 0.8,
    timestamp: Date.now(),
  };
}
