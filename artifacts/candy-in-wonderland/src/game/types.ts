export type Direction = 'up' | 'down' | 'left' | 'right';
export type ClueCategory =
  | 'VERIFIED RECORD'
  | 'PUBLIC STATEMENT'
  | 'MEDIA REPORT'
  | 'ALLEGATION'
  | 'RUMOR'
  | 'CONTRADICTION'
  | 'UNPROVEN THEORY'
  | 'SYMBOLIC CLUE'
  | 'WONDERLAND CLUE';

export type GameState =
  | 'menu'
  | 'exploring'
  | 'dialogue'
  | 'boss'
  | 'levelComplete'
  | 'paused'
  | 'journal'
  | 'options';

export interface Vec2 { x: number; y: number; }
export interface Rect { x: number; y: number; w: number; h: number; }

export interface Clue {
  id: string;
  title: string;
  description: string;
  category: ClueCategory;
  collected: boolean;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  category?: ClueCategory;
  clueId?: string;
  /**
   * Portrait resolved by the engine when the dialogue starts. The engine knows
   * which NPC slot is speaking; the dialogue UI only knows a name, and NPC names
   * differ on every level, so resolving it here is what gives all 20 levels real
   * portrait art instead of the procedural fallback.
   */
  portrait?: string;
}

export interface NPCData {
  id: string;
  x: number;       // tile x
  y: number;       // tile y
  name: string;
  color: string;
  skinColor: string;
  dialogue: DialogueLine[];
  interacted: boolean;
}

export interface BossData {
  name: string;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  phase: number;
}

export interface LevelTheme {
  bg: string;
  floor: string;
  wall: string;
  innerWall: string;
  accent: string;
  water: string;
  stone: string;
  path: string;
  candle: string;
  gate: string;
  glow: string;
}

export interface BossConfig {
  name: string;
  hp: number;
  attackPower: number;
  aura: string;       // CSS color for glow/aura
  suitTint: string;   // CSS color overlay on boss body
}

export interface LevelData {
  id: number;
  name: string;
  subtitle: string;
  theme: string;
  levelTheme: LevelTheme;
  tiles: number[][];
  playerStart: Vec2;
  npcs: NPCData[];
  bossStart: Vec2;
  gatePos: Vec2;
  exitPos: Vec2;
  clues: Clue[];
  hiddenCluePos: Vec2;
  objective: string;
  bossName: string;
  bossConfig: BossConfig;
  truthFragment: string;
}

export interface SaveProfile {
  slot: number;
  name: string;
  level: number;
  hp: number;
  clues: Clue[];
  completedBosses: string[];
  truthFragments: string[];
  difficulty: string;
  musicVolume: number;
  sfxVolume: number;
  timestamp: number;
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  musicMuted: boolean;
  sfxMuted: boolean;
  difficulty: 'Easy' | 'Normal' | 'Hard' | 'Investigator Mode';
  textSpeed: number;
  autoSave: boolean;
  mobileControls: boolean;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  attack: boolean;
  interact: boolean;
  pause: boolean;
}

export const TILE_SIZE = 48;
export const PLAYER_SPEED = 3;
export const PLAYER_MAX_HP = 5;
