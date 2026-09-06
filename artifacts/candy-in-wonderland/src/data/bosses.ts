import type { BossConfig } from '../game/types';

// 20 fictional political-style boss configs.
// Difficulty: L1-5 very easy, L6-10 easy, L11-16 easy-moderate, L17-18 hard, L19 very hard, L20 final.

export const LEVEL_BOSSES: BossConfig[] = [
  // ── Level 1 — very easy ───────────────────────────────────────────────────
  { name: 'Mayor Trumble',          hp:  6, attackPower: 4,  aura: 'rgba(160,80,255,0.7)',   suitTint: '#4A2080' },
  // ── Level 2 — very easy ───────────────────────────────────────────────────
  { name: 'Senator Byland',         hp:  7, attackPower: 4,  aura: 'rgba(210,105,30,0.8)',   suitTint: '#6B3010' },
  // ── Level 3 — very easy ───────────────────────────────────────────────────
  { name: 'Governor DeSparrow',     hp:  7, attackPower: 5,  aura: 'rgba(255,140,0,0.7)',    suitTint: '#5A2800' },
  // ── Level 4 — very easy ───────────────────────────────────────────────────
  { name: 'Madam Harrivale',        hp:  8, attackPower: 5,  aura: 'rgba(0,220,180,0.8)',    suitTint: '#003A30' },
  // ── Level 5 — very easy ───────────────────────────────────────────────────
  { name: 'Speaker Pelgrave',       hp:  8, attackPower: 5,  aura: 'rgba(255,215,0,0.75)',   suitTint: '#3A2800' },
  // ── Level 6 — easy ───────────────────────────────────────────────────────
  { name: 'Councilman McConwell',   hp:  9, attackPower: 6,  aura: 'rgba(255,60,60,0.8)',    suitTint: '#1A0A30' },
  // ── Level 7 — easy ───────────────────────────────────────────────────────
  { name: 'Director Shumor',        hp:  9, attackPower: 6,  aura: 'rgba(0,170,255,0.8)',    suitTint: '#001440' },
  // ── Level 8 — easy ───────────────────────────────────────────────────────
  { name: 'Justice Sotomara',       hp: 10, attackPower: 7,  aura: 'rgba(255,255,255,0.7)',  suitTint: '#0A0808' },
  // ── Level 9 — easy ───────────────────────────────────────────────────────
  { name: 'Ambassador AOCelia',     hp: 10, attackPower: 7,  aura: 'rgba(80,220,60,0.8)',    suitTint: '#0A1800' },
  // ── Level 10 — easy ──────────────────────────────────────────────────────
  { name: 'Minister Cruzwell',      hp: 11, attackPower: 7,  aura: 'rgba(200,160,0,0.8)',    suitTint: '#241800' },
  // ── Level 11 — easy-moderate ─────────────────────────────────────────────
  { name: 'Chairwoman Boebara',     hp: 12, attackPower: 8,  aura: 'rgba(255,100,180,0.85)', suitTint: '#2A0A18' },
  // ── Level 12 — easy-moderate ─────────────────────────────────────────────
  { name: 'Commissioner Randell',   hp: 12, attackPower: 8,  aura: 'rgba(200,200,80,0.85)',  suitTint: '#1A1800' },
  // ── Level 13 — easy-moderate ─────────────────────────────────────────────
  { name: 'Secretary Warrenton',    hp: 13, attackPower: 9,  aura: 'rgba(0,220,200,0.85)',   suitTint: '#001A18' },
  // ── Level 14 — easy-moderate ─────────────────────────────────────────────
  { name: 'Governor Newsborne',     hp: 13, attackPower: 9,  aura: 'rgba(255,215,0,0.9)',    suitTint: '#1A1400' },
  // ── Level 15 — easy-moderate ─────────────────────────────────────────────
  { name: 'Madam Lakewood',         hp: 14, attackPower: 10, aura: 'rgba(220,60,0,0.9)',     suitTint: '#200200' },
  // ── Level 16 — easy-moderate ─────────────────────────────────────────────
  { name: 'Baron Pencely',          hp: 14, attackPower: 10, aura: 'rgba(80,80,220,0.9)',    suitTint: '#060618' },
  // ── Level 17 — hard ──────────────────────────────────────────────────────
  { name: 'Lady Klobran',           hp: 18, attackPower: 14, aura: 'rgba(0,160,255,0.95)',   suitTint: '#001428' },
  // ── Level 18 — hard ──────────────────────────────────────────────────────
  { name: 'Chancellor McCarthyx',   hp: 22, attackPower: 16, aura: 'rgba(255,140,0,0.95)',   suitTint: '#1A0800' },
  // ── Level 19 — very hard ─────────────────────────────────────────────────
  { name: 'Minister Haleyra',       hp: 26, attackPower: 18, aura: 'rgba(220,40,40,0.95)',   suitTint: '#200000' },
  // ── Level 20 — final boss ────────────────────────────────────────────────
  { name: 'High Regent Capitolus',  hp: 30, attackPower: 20, aura: 'rgba(255,215,0,1.0)',    suitTint: '#000000' },
];
