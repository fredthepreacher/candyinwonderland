import type { LevelData, NPCData, Clue, LevelTheme } from '../game/types';
import { LEVEL_BOSSES } from './bosses';

// ─── TILE KEY ───────────────────────────────────────────────────────────────
// 0 = floor (walkable)      1 = outer wall (solid)     2 = inner wall (solid)
// 3 = water/fountain(solid) 4 = flower/grass(walkable) 5 = cracked(walkable)
// 6 = candle (walkable)     7 = gate (solid til open)  8 = cobblestone path

// ─── 4 MAP TEMPLATES ────────────────────────────────────────────────────────
// Gate always at (10,12), exit at (10,3), player at (10,15)

const MAP_A: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,1],
  [1,4,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4,1],
  [1,4,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,4,1],
  [1,4,2,0,6,0,0,0,0,0,0,0,0,0,0,0,0,6,0,2,4,1],
  [1,4,2,0,0,0,3,3,3,3,3,0,0,0,0,0,0,0,0,2,4,1],
  [1,4,2,0,0,0,3,3,3,3,3,0,0,0,4,0,0,0,0,2,4,1],
  [1,4,2,0,0,0,3,3,3,3,3,0,0,0,0,0,6,0,0,2,4,1],
  [1,4,2,0,6,0,3,3,3,3,3,0,0,0,0,0,0,0,0,2,4,1],
  [1,4,2,0,0,0,3,3,3,3,3,0,0,0,0,0,0,0,6,2,4,1],
  [1,4,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,4,1],
  [1,4,2,0,0,0,0,0,0,5,5,5,0,0,0,0,0,0,0,2,4,1],
  [1,4,2,2,2,2,2,2,2,7,7,7,2,2,2,2,2,2,2,2,4,1],
  [1,4,0,0,0,0,0,0,0,0,8,0,0,0,0,0,0,0,0,0,4,1],
  [1,4,0,0,0,0,0,0,0,0,8,0,0,0,0,0,0,0,0,0,4,1],
  [1,4,0,0,0,0,0,0,0,0,8,0,0,0,0,0,0,0,0,0,4,1],
  [1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const MAP_B: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,1],
  [1,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,1],
  [1,4,0,5,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,4,1],
  [1,4,0,0,0,0,6,0,0,0,0,0,0,0,6,0,0,0,0,0,4,1],
  [1,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,1],
  [1,4,0,0,0,2,2,2,0,0,0,0,2,2,2,0,0,0,0,0,4,1],
  [1,4,0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,0,4,1],
  [1,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,1],
  [1,4,0,0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,4,1],
  [1,4,0,5,0,0,0,0,0,3,3,3,0,0,0,0,5,0,0,0,4,1],
  [1,4,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,4,1],
  [1,4,2,2,2,2,2,2,2,7,7,7,2,2,2,2,2,2,2,2,4,1],
  [1,4,0,0,0,0,0,0,0,0,8,0,0,0,0,0,0,0,0,0,4,1],
  [1,4,0,0,0,0,0,0,0,0,8,0,0,0,0,0,0,0,0,0,4,1],
  [1,4,0,0,0,6,0,0,0,0,8,0,0,0,0,6,0,0,0,0,4,1],
  [1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const MAP_C: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,1],
  [1,4,2,2,2,2,0,0,2,0,0,0,2,0,0,2,2,2,2,2,4,1],
  [1,4,2,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,0,2,4,1],
  [1,4,2,0,0,0,6,0,2,0,0,0,2,0,6,0,0,0,0,2,4,1],
  [1,4,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,4,1],
  [1,4,2,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,0,2,4,1],
  [1,4,2,0,3,3,0,0,2,0,0,0,2,0,0,3,3,0,0,2,4,1],
  [1,4,2,0,3,3,0,0,0,0,0,0,0,0,0,3,3,0,0,2,4,1],
  [1,4,2,0,0,0,0,0,0,0,5,5,0,0,0,0,0,0,0,2,4,1],
  [1,4,2,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,0,2,4,1],
  [1,4,2,0,0,0,0,0,2,5,5,5,2,0,0,0,0,0,0,2,4,1],
  [1,4,2,2,2,2,2,2,2,7,7,7,2,2,2,2,2,2,2,2,4,1],
  [1,4,0,0,0,0,0,0,0,0,8,0,0,0,0,0,0,0,0,0,4,1],
  [1,4,0,6,0,0,0,0,0,0,8,0,0,0,0,0,6,0,0,0,4,1],
  [1,4,0,0,0,0,0,0,0,0,8,0,0,0,0,0,0,0,0,0,4,1],
  [1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const MAP_D: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,1],
  [1,4,2,2,2,0,0,0,2,2,2,2,2,0,0,0,2,2,2,2,4,1],
  [1,4,2,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,0,2,4,1],
  [1,4,2,0,6,0,0,0,2,0,0,0,2,0,6,0,0,0,0,2,4,1],
  [1,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,1],
  [1,4,2,0,0,0,0,0,2,0,3,3,2,0,0,0,0,0,0,2,4,1],
  [1,4,2,0,0,0,0,0,2,0,3,3,2,0,0,0,0,0,0,2,4,1],
  [1,4,2,2,2,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,4,1],
  [1,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,1],
  [1,4,2,0,5,0,0,0,2,0,0,0,2,0,5,0,0,0,0,2,4,1],
  [1,4,2,0,0,0,0,0,2,5,5,5,2,0,0,0,0,0,0,2,4,1],
  [1,4,2,2,2,2,2,2,2,7,7,7,2,2,2,2,2,2,2,2,4,1],
  [1,4,8,8,8,0,0,0,8,8,8,8,8,0,0,0,8,8,8,0,4,1],
  [1,4,0,0,8,0,0,0,0,0,8,0,0,0,0,0,8,0,0,0,4,1],
  [1,4,0,0,8,6,0,0,0,0,8,0,0,0,6,0,8,0,0,0,4,1],
  [1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// ─── MAP DEFAULT POSITIONS ────────────────────────────────────────────────
const POS = {
  A: { gate:{x:10,y:12}, exit:{x:10,y:3}, player:{x:10,y:10}, boss:{x:14,y:4}, hidden:{x:17,y:4}, npcs:[{x:4,y:5},{x:14,y:7},{x:8,y:11}] },
  B: { gate:{x:10,y:12}, exit:{x:10,y:3}, player:{x:10,y:15}, boss:{x:14,y:4}, hidden:{x:16,y:3}, npcs:[{x:3,y:3},{x:17,y:4},{x:8,y:14}] },
  C: { gate:{x:10,y:12}, exit:{x:10,y:3}, player:{x:10,y:15}, boss:{x:10,y:5}, hidden:{x:15,y:4}, npcs:[{x:6,y:4},{x:14,y:4},{x:6,y:13}] },
  D: { gate:{x:10,y:12}, exit:{x:10,y:3}, player:{x:10,y:15}, boss:{x:14,y:5}, hidden:{x:16,y:4}, npcs:[{x:4,y:4},{x:14,y:4},{x:8,y:14}] },
};
const MAPS = { A: MAP_A, B: MAP_B, C: MAP_C, D: MAP_D };

// ─── FACTORY ──────────────────────────────────────────────────────────────
type MapKey = 'A' | 'B' | 'C' | 'D';
interface NpcDef { name: string; color: string; skinColor: string; lines: Array<{text: string; category?: any; clueId?: string}>; }
interface ClueSpec { id: string; title: string; description: string; category: any; }

function mkLevel(
  id: number, name: string, subtitle: string, theme: string, mapKey: MapKey,
  levelTheme: LevelTheme,
  npcDefs: NpcDef[],
  clueSpecs: ClueSpec[],
  hiddenClue: ClueSpec,
  objective: string, bossName: string, truthFragment: string
): LevelData {
  const pos = POS[mapKey];
  const npcs: NPCData[] = npcDefs.map((def, i) => ({
    id: `l${id}_npc${i+1}`,
    x: pos.npcs[i].x,
    y: pos.npcs[i].y,
    name: def.name,
    color: def.color,
    skinColor: def.skinColor,
    dialogue: def.lines.map(l => ({ speaker: def.name, text: l.text, category: l.category, clueId: l.clueId })),
    interacted: false,
  }));
  const clues: Clue[] = [
    ...clueSpecs.map(c => ({ ...c, collected: false })),
    { ...hiddenClue, collected: false },
  ];
  const bossConfig = LEVEL_BOSSES[id - 1] ?? LEVEL_BOSSES[0];
  return {
    id, name, subtitle, theme, levelTheme,
    tiles: MAPS[mapKey],
    playerStart: pos.player, npcs, bossStart: pos.boss,
    gatePos: pos.gate, exitPos: pos.exit,
    hiddenCluePos: pos.hidden, clues, objective, bossName, bossConfig, truthFragment,
  };
}

// ─── THEMES ───────────────────────────────────────────────────────────────
const T = {
  UTAH:    { bg:'#030108', floor:'#1A1230', wall:'#0D0820', innerWall:'#1B0F35', accent:'#0F1820', water:'#0A1A3A', stone:'#22183E', path:'#171030', candle:'#D4A017', gate:'#6C3483', glow:'rgba(155,89,182,0.6)' },
  ARIZONA: { bg:'#1A0500', floor:'#2A1408', wall:'#1A0A00', innerWall:'#251005', accent:'#1A1405', water:'#3A2A0A', stone:'#331808', path:'#220E04', candle:'#FF8C40', gate:'#8B4513', glow:'rgba(210,105,30,0.7)' },
  TEXAS:   { bg:'#0A0800', floor:'#1E1808', wall:'#140F00', innerWall:'#1A1204', accent:'#1A1508', water:'#1A0A3A', stone:'#281A08', path:'#151204', candle:'#FF6E00', gate:'#7A5C00', glow:'rgba(255,140,0,0.6)' },
  FLORIDA: { bg:'#001414', floor:'#0A2020', wall:'#001010', innerWall:'#051818', accent:'#081A14', water:'#003A30', stone:'#0A2818', path:'#061818', candle:'#00FFD4', gate:'#007A6A', glow:'rgba(0,220,180,0.7)' },
  GEORGIA: { bg:'#080808', floor:'#1C1C1A', wall:'#0E0E0C', innerWall:'#181814', accent:'#161412', water:'#1A1A20', stone:'#1E1E18', path:'#141412', candle:'#FFD700', gate:'#8B8060', glow:'rgba(255,215,0,0.6)' },
  NEWYORK: { bg:'#000814', floor:'#0A0E20', wall:'#000510', innerWall:'#060A18', accent:'#080E18', water:'#0A0A2A', stone:'#0E1228', path:'#060A1A', candle:'#FFE44D', gate:'#1A2A6E', glow:'rgba(255,220,0,0.7)' },
  CALI:    { bg:'#000818', floor:'#080E1E', wall:'#000610', innerWall:'#040A14', accent:'#060C14', water:'#0A1228', stone:'#0C1424', path:'#04080E', candle:'#00AAFF', gate:'#003380', glow:'rgba(0,170,255,0.7)' },
  NEVADA:  { bg:'#100500', floor:'#1E0E00', wall:'#0E0600', innerWall:'#180A00', accent:'#14100A', water:'#2A1A00', stone:'#241000', path:'#140800', candle:'#FF4400', gate:'#7A3000', glow:'rgba(255,100,0,0.7)' },
  ILLINOIS:{ bg:'#080600', floor:'#1C1800', wall:'#100E00', innerWall:'#181400', accent:'#181400', water:'#10180A', stone:'#201C00', path:'#141000', candle:'#DDAA00', gate:'#5A4A00', glow:'rgba(200,160,0,0.6)' },
  PENN:    { bg:'#000818', floor:'#0A1022', wall:'#000614', innerWall:'#06101C', accent:'#080E18', water:'#08103A', stone:'#0C1428', path:'#040C1A', candle:'#C0C8FF', gate:'#1A2A80', glow:'rgba(160,180,255,0.7)' },
  OHIO:    { bg:'#060400', floor:'#181006', wall:'#0E0A00', innerWall:'#140C00', accent:'#141008', water:'#1A1008', stone:'#1E140A', path:'#100C04', candle:'#FF6622', gate:'#5A2A00', glow:'rgba(200,100,0,0.6)' },
  MICHIGAN:{ bg:'#000C14', floor:'#0A1C28', wall:'#000A12', innerWall:'#061420', accent:'#081C24', water:'#0A2030', stone:'#0E2030', path:'#061018', candle:'#88DDFF', gate:'#0A3855', glow:'rgba(100,200,255,0.7)' },
  COLORADO:{ bg:'#040C00', floor:'#0C1C08', wall:'#040E00', innerWall:'#081408', accent:'#0A1808', water:'#081810', stone:'#0E1C08', path:'#060E04', candle:'#88FF44', gate:'#286010', glow:'rgba(100,220,60,0.6)' },
  WASHING: { bg:'#000C10', floor:'#081A22', wall:'#000A0E', innerWall:'#04121A', accent:'#081820', water:'#082028', stone:'#0A1C24', path:'#041014', candle:'#44AACC', gate:'#083A50', glow:'rgba(60,170,200,0.7)' },
  TENNESS: { bg:'#100000', floor:'#220800', wall:'#0E0000', innerWall:'#1A0400', accent:'#1A0C00', water:'#200800', stone:'#281000', path:'#160600', candle:'#FF8800', gate:'#660A00', glow:'rgba(220,80,0,0.7)' },
  LOUISIANA:{ bg:'#001408', floor:'#0A2014', wall:'#001008', innerWall:'#051810', accent:'#0A1C10', water:'#041810', stone:'#0C201C', path:'#06140C', candle:'#AAFF44', gate:'#145020', glow:'rgba(100,220,60,0.7)' },
  MASS:    { bg:'#080400', floor:'#1C1000', wall:'#100800', innerWall:'#180E00', accent:'#1A1400', water:'#100A00', stone:'#221800', path:'#120C00', candle:'#FFD080', gate:'#604000', glow:'rgba(220,170,80,0.6)' },
  VIRGINIA:{ bg:'#080808', floor:'#181818', wall:'#0E0E0E', innerWall:'#141414', accent:'#141414', water:'#141414', stone:'#1C1C1C', path:'#101010', candle:'#CCCCCC', gate:'#444444', glow:'rgba(200,200,200,0.6)' },
  MARYLAND:{ bg:'#000C10', floor:'#081820', wall:'#000A14', innerWall:'#041018', accent:'#081420', water:'#041C28', stone:'#0C1C28', path:'#040E18', candle:'#FF4444', gate:'#440000', glow:'rgba(200,60,60,0.7)' },
  DC:      { bg:'#000000', floor:'#181818', wall:'#0C0C0C', innerWall:'#141414', accent:'#141414', water:'#181818', stone:'#202020', path:'#101010', candle:'#FFD700', gate:'#888888', glow:'rgba(255,215,0,0.9)' },
};

// ─── ALL 20 LEVELS ────────────────────────────────────────────────────────
export const ALL_LEVELS: LevelData[] = [

// ── 1 · UTAH ─────────────────────────────────────────────────────────────
mkLevel(1,'Utah','The Broken Courtyard','campus courtyard, memorial candles, strange shadows','A', T.UTAH,
  [
    { name:'Witness', color:'#5A2D82', skinColor:'#C68642', lines:[
      { text:'Welcome to Wonderland, Candy. Around here every road has a rumor, but only one path has a record.' },
      { text:'Kirkwood was here that night. I saw the candles still burning after midnight. The bells rang wrong — like they were confused.' },
      { text:'I wrote it down.', category:'VERIFIED RECORD', clueId:'l1_c1' },
    ]},
    { name:'Scholar', color:'#1A4A8A', skinColor:'#F1C27D', lines:[
      { text:'The archive is in the inner courtyard. You will need three clues to unlock it — that is the rule here.' },
      { text:'Kirkwood left more questions than answers. Check your journal. The timeline will guide you.' },
      { text:'Here — take my field notes.', category:'PUBLIC STATEMENT', clueId:'l1_c2' },
    ]},
    { name:'Wanderer', color:'#2F4F4F', skinColor:'#FDBCB4', lines:[
      { text:'This clue is only a rumor. Carry it if you must, but do not mistake it for proof.' },
      { text:'The bells rang at 11:47 PM. Not 9 PM like the official report says. Someone changed the time.' },
      { text:'I heard it. We all heard it.', category:'RUMOR', clueId:'l1_c3' },
    ]},
  ],
  [
    { id:'l1_c1', title:'Timeline Fragment', description:'A torn page from a campus event log. The date is smudged, but a memorial service is mentioned.', category:'VERIFIED RECORD' },
    { id:'l1_c2', title:'Official Campus Log', description:'Field notes from a campus scholar. Kirkwood\'s name appears twice, then is crossed out.', category:'PUBLIC STATEMENT' },
    { id:'l1_c3', title:'Anonymous Warning', description:'A folded note: "Ask about the bells. The bells know the truth." Unsigned.', category:'RUMOR' },
  ],
  { id:'l1_hidden', title:'Hidden Campus Record', description:'An official document referencing Kirkwood. Details are blurry, but it proves he was there.', category:'VERIFIED RECORD' },
  'Find the first timeline fragment. Talk to the three witnesses, collect clues, open the gate, defeat the Noise Swarm.',
  'The Noise Swarm',
  'Kirkwood was last seen on campus at 11:47 PM. The official report says 9 PM. Three cameras were offline that night.'
),

// ── 2 · ARIZONA ──────────────────────────────────────────────────────────
mkLevel(2,'Arizona','The Desert Archive','red desert, old files, glowing cactus paths','B', T.ARIZONA,
  [
    { name:'Archivist', color:'#8B4513', skinColor:'#FDBCB4', lines:[
      { text:'The desert swallows secrets, Candy. But not before I catalog them.' },
      { text:'Kirkwood\'s academic file was here — flagged and sealed the morning after he disappeared.' },
      { text:'I kept a copy hidden in the sand.', category:'VERIFIED RECORD', clueId:'l2_c1' },
    ]},
    { name:'Nomad', color:'#CC4400', skinColor:'#8D5524', lines:[
      { text:'I have been crossing this desert for years. The Gatekeeper blocks everyone who asks the right questions.' },
      { text:'The archivist who sealed Kirkwood\'s file resigned within a week. Went quiet. No forwarding address.' },
      { text:'That is a pattern, not a coincidence.', category:'ALLEGATION', clueId:'l2_c2' },
    ]},
    { name:'Cactus Spirit', color:'#228B22', skinColor:'#D4A96A', lines:[
      { text:'In Wonderland even the cacti remember. I remember the day the file changed.' },
      { text:'Three records, three dates, all different. Which one is real? None of them — all of them.' },
      { text:'Here is what the sand preserved.', category:'WONDERLAND CLUE', clueId:'l2_c3' },
    ]},
  ],
  [
    { id:'l2_c1', title:'Sealed Academic File', description:'A partial copy of Kirkwood\'s sealed file. The seal date is one day after his disappearance.', category:'VERIFIED RECORD' },
    { id:'l2_c2', title:'Archivist Resignation', description:'A note: the archivist who sealed Kirkwood\'s records resigned without notice seven days later.', category:'ALLEGATION' },
    { id:'l2_c3', title:'Desert Memory Stone', description:'A glowing cactus mark, warm to the touch. Three dates carved in the stone — all different.', category:'WONDERLAND CLUE' },
  ],
  { id:'l2_hidden', title:'Sand-Buried Document', description:'A partial media report mentioning Kirkwood\'s disappearance — dated two days before the official missing-person report.', category:'MEDIA REPORT' },
  'Find Kirkwood\'s first missing record. The Gatekeeper hides it behind the desert gate.',
  'The Gatekeeper',
  'Kirkwood\'s academic file was flagged and sealed the day after his disappearance. The archivist who sealed it resigned within a week and was never interviewed.'
),

// ── 3 · TEXAS ────────────────────────────────────────────────────────────
mkLevel(3,'Texas','The Broadcast Maze','podcast studios, dusty roads, neon signs, false microphones','C', T.TEXAS,
  [
    { name:'Radio Host', color:'#CC7700', skinColor:'#C68642', lines:[
      { text:'Testing testing — welcome to the Broadcast Maze, Candy. Every microphone here tells a different story.' },
      { text:'We ran Kirkwood\'s name seventeen times in a single broadcast. By next morning, the tape was labeled "technical error."' },
      { text:'I kept a copy of the original log.', category:'VERIFIED RECORD', clueId:'l3_c1' },
    ]},
    { name:'Sound Engineer', color:'#555555', skinColor:'#F1C27D', lines:[
      { text:'Someone ordered the edit. It came from above the station level — way above.' },
      { text:'I was told the tape was defective. But I ran the diagnostics myself. It was fine.' },
      { text:'Here is my technical report.', category:'CONTRADICTION', clueId:'l3_c2' },
    ]},
    { name:'Ghost Signal', color:'#0044CC', skinColor:'#E8BEAC', lines:[
      { text:'I am the signal that was never broadcast. I carry Kirkwood\'s name in every frequency.' },
      { text:'The Spin Doctor can change any truth into noise. Dodge the noise. Find the signal underneath.' },
      { text:'Follow this frequency.', category:'WONDERLAND CLUE', clueId:'l3_c3' },
    ]},
  ],
  [
    { id:'l3_c1', title:'Broadcast Log', description:'The original broadcast log showing Kirkwood\'s name 17 times. Stamped "archived" then "technical error."', category:'VERIFIED RECORD' },
    { id:'l3_c2', title:'Engineer\'s Report', description:'A technical report proving the tape was functional. The edit was manual, not a malfunction.', category:'CONTRADICTION' },
    { id:'l3_c3', title:'Ghost Frequency Map', description:'A spectral diagram showing a hidden broadcast channel active on the night of Kirkwood\'s disappearance.', category:'WONDERLAND CLUE' },
  ],
  { id:'l3_hidden', title:'Producer\'s Memo', description:'"Do not say his name again. This comes from the top." — An unsigned internal memo from the broadcast station.', category:'ALLEGATION' },
  'Separate rumor from record. Find the original broadcast tape before the Spin Doctor destroys it.',
  'The Spin Doctor',
  'A broadcast network ran Kirkwood\'s name seventeen times in one day, then redacted all transcripts. The producer said it came from above.'
),

// ── 4 · FLORIDA ──────────────────────────────────────────────────────────
mkLevel(4,'Florida','The Digital Swamp','palm trees, servers, influencer illusions, glowing water','D', T.FLORIDA,
  [
    { name:'Server Tech', color:'#004488', skinColor:'#FDBCB4', lines:[
      { text:'Welcome to the swamp where data goes to disappear. I maintain the servers — what is left of them.' },
      { text:'Kirkwood\'s digital footprint was scrubbed from three platforms simultaneously. Same timestamp, different accounts.' },
      { text:'I logged it before the log was deleted.', category:'VERIFIED RECORD', clueId:'l4_c1' },
    ]},
    { name:'Influencer Ghost', color:'#FF44AA', skinColor:'#FFD5D5', lines:[
      { text:'I had a million followers once. I posted about Kirkwood and then... nothing. Just static.' },
      { text:'The Algorithm Beast decides what truth survives. It does not care about evidence — only engagement.' },
      { text:'Take my deleted post. Someone should read it.', category:'ALLEGATION', clueId:'l4_c2' },
    ]},
    { name:'Swamp Keeper', color:'#226622', skinColor:'#8D5524', lines:[
      { text:'The swamp takes everything eventually. But the swamp also preserves things the system cannot reach.' },
      { text:'I kept Kirkwood\'s last known post in the reeds. They did not know the swamp has its own memory.' },
      { text:'Here. Before the water rises.', category:'WONDERLAND CLUE', clueId:'l4_c3' },
    ]},
  ],
  [
    { id:'l4_c1', title:'Simultaneous Deletion Record', description:'A server log showing three platforms deleted Kirkwood\'s content at the exact same second.', category:'VERIFIED RECORD' },
    { id:'l4_c2', title:'Deleted Post Fragment', description:'A screenshot of a post about Kirkwood. Marked "removed for community guidelines" that did not exist then.', category:'ALLEGATION' },
    { id:'l4_c3', title:'Reed Scroll', description:'A waterlogged message from the swamp: "Kirkwood\'s last post read — Watch the wall." Category: SYMBOLIC CLUE.', category:'SYMBOLIC CLUE' },
  ],
  { id:'l4_hidden', title:'Swamp Archive Node', description:'A data node hidden beneath the glowing water. Contains a backup of Kirkwood\'s scrubbed profile, timestamped 36 hours before deletion.', category:'VERIFIED RECORD' },
  'Recover Kirkwood\'s corrupted digital messages before the Algorithm Beast consumes the server.',
  'The Algorithm Beast',
  'Kirkwood\'s digital footprint was scrubbed from three platforms simultaneously — same timestamp, different accounts. The coordination implies a central directive.'
),

// ── 5 · GEORGIA ──────────────────────────────────────────────────────────
mkLevel(5,'Georgia','The Courthouse Square','courthouse, witness statues, cracked marble, reporters','A', T.GEORGIA,
  [
    { name:'Court Reporter', color:'#222222', skinColor:'#C68642', lines:[
      { text:'I have reported from this courthouse for twenty years. I have never seen testimony this contradictory.' },
      { text:'Two official witnesses gave opposing accounts under oath. Neither was ever cross-examined.' },
      { text:'I transcribed both testimonies.', category:'VERIFIED RECORD', clueId:'l5_c1' },
    ]},
    { name:'Witness Statue', color:'#888888', skinColor:'#CCCCCC', lines:[
      { text:'I am the statue of the first witness. I was carved from contradiction.' },
      { text:'What I said and what I meant were not the same thing. But no one asked the difference.' },
      { text:'My true statement is carved on my base.', category:'CONTRADICTION', clueId:'l5_c2' },
    ]},
    { name:'Marble Guardian', color:'#AA8800', skinColor:'#D4A96A', lines:[
      { text:'The courthouse holds truth and hides it equally. I guard the section they do not want opened.' },
      { text:'The Cross-Examiner feeds on doubt. Answer its questions with evidence, not emotion.' },
      { text:'Take this testimony seal. It proves the hearing happened.', category:'PUBLIC STATEMENT', clueId:'l5_c3' },
    ]},
  ],
  [
    { id:'l5_c1', title:'Contradictory Testimony Transcripts', description:'Full court transcripts showing two witnesses giving mutually exclusive accounts of the same events.', category:'VERIFIED RECORD' },
    { id:'l5_c2', title:'Statue\'s True Statement', description:'Carved text at the base of the witness statue: "I was never asked what I actually saw."', category:'CONTRADICTION' },
    { id:'l5_c3', title:'Hearing Seal', description:'An official court seal confirming a closed hearing was held about Kirkwood — but its record was sealed for 50 years.', category:'PUBLIC STATEMENT' },
  ],
  { id:'l5_hidden', title:'Marble Floor Inscription', description:'Hidden beneath cracked marble: a journalist\'s initials and a note — "They dismissed the corroborating witness. Ask why."', category:'UNPROVEN THEORY' },
  'Compare the contradictory testimony fragments. The truth hides between the two versions.',
  'The Cross-Examiner',
  'Two official witnesses gave contradictory accounts of Kirkwood\'s last known location under oath. Neither was ever cross-examined. The hearing record was sealed.'
),

// ── 6 · NEW YORK ─────────────────────────────────────────────────────────
mkLevel(6,'New York','The Media Labyrinth','skyscrapers, newsrooms, subway tunnels, giant headlines','B', T.NEWYORK,
  [
    { name:'Night Editor', color:'#1A2A6E', skinColor:'#F1C27D', lines:[
      { text:'Every headline in this city has two versions. The one they publish and the one they kill.' },
      { text:'We ran the original headline for fourteen minutes: "Kirkwood found murdered." Then legal called.' },
      { text:'I saved the original before the edit.', category:'VERIFIED RECORD', clueId:'l6_c1' },
    ]},
    { name:'Subway Whistler', color:'#444466', skinColor:'#8D5524', lines:[
      { text:'Down in the tunnels below the newsroom, the real stories run on the walls.' },
      { text:'The Headline Hydra grows a new head every time you cut one. Hit the source — not the output.' },
      { text:'Here is the routing slip — it shows who changed the headline.', category:'ALLEGATION', clueId:'l6_c2' },
    ]},
    { name:'Wonderland Anchor', color:'#6644CC', skinColor:'#FFD5D5', lines:[
      { text:'In Wonderland, headlines float like balloons. Some carry truth. Some carry helium — beautiful but empty.' },
      { text:'The one that matters said "murdered." The one that survived said "found deceased." Find the difference.' },
      { text:'This is the original broadcast clip.', category:'MEDIA REPORT', clueId:'l6_c3' },
    ]},
  ],
  [
    { id:'l6_c1', title:'Unedited Headline Proof', description:'A screenshot of the original headline "Kirkwood found murdered" timestamped 14 minutes before it was changed.', category:'VERIFIED RECORD' },
    { id:'l6_c2', title:'Editorial Routing Slip', description:'An internal routing slip showing which executive ordered the headline change and why: "legal sensitivity."', category:'ALLEGATION' },
    { id:'l6_c3', title:'Original Broadcast Clip', description:'A media segment draft — the version that aired differs from this original in three key factual claims.', category:'MEDIA REPORT' },
  ],
  { id:'l6_hidden', title:'Newsroom Memo Cache', description:'A cache of internal memos discussing how to "manage the Kirkwood narrative." Seventeen emails, all from the same sender.', category:'CONTRADICTION' },
  'Trace the headline contradiction from its source. Find who ordered the change and why.',
  'The Headline Hydra',
  'A major publication changed the headline "Kirkwood found murdered" to "Kirkwood found deceased" fourteen minutes after publication. The routing slip was later shredded.'
),

// ── 7 · CALIFORNIA ───────────────────────────────────────────────────────
mkLevel(7,'California','Platform Valley','tech towers, social media gates, glitch zones','C', T.CALI,
  [
    { name:'Content Moderator', color:'#003380', skinColor:'#C68642', lines:[
      { text:'I moderate what you see. Or what you used to see — before the Censor Bot took my job.' },
      { text:'Kirkwood\'s last post was flagged for guidelines that did not exist when he posted it.' },
      { text:'I documented the timestamp discrepancy.', category:'VERIFIED RECORD', clueId:'l7_c1' },
    ]},
    { name:'Glitch Oracle', color:'#5500CC', skinColor:'#FDBCB4', lines:[
      { text:'I am what happens when the algorithm breaks. I see all the posts that should not have been deleted.' },
      { text:'Kirkwood\'s words: "Watch the wall. They built it to keep truth in, not enemies out." That was the post.' },
      { text:'Here is the cached version.', category:'PUBLIC STATEMENT', clueId:'l7_c2' },
    ]},
    { name:'Dev Ghost', color:'#007ACC', skinColor:'#F1C27D', lines:[
      { text:'I built parts of this system. I did not know what it would be used for.' },
      { text:'The suppression was not automatic. Someone typed the command manually. I have the logs.' },
      { text:'This API log proves it was intentional.', category:'ALLEGATION', clueId:'l7_c3' },
    ]},
  ],
  [
    { id:'l7_c1', title:'Guidelines Timestamp Proof', description:'The community guidelines Kirkwood\'s post was removed under were published three months after the removal.', category:'VERIFIED RECORD' },
    { id:'l7_c2', title:'Cached Post', description:'Kirkwood\'s final post: "Watch the wall. They built it to keep truth in, not enemies out."', category:'PUBLIC STATEMENT' },
    { id:'l7_c3', title:'API Access Log', description:'A server log showing a manual API call — authenticated with an admin credential — triggered the content removal.', category:'ALLEGATION' },
  ],
  { id:'l7_hidden', title:'Suppression Pattern File', description:'A data export showing thirty-seven other accounts posting about Kirkwood received identical suppression within 6 hours. Coordinated action.', category:'CONTRADICTION' },
  'Unlock Kirkwood\'s hidden posts before the Censor Bot erases the archive.',
  'The Censor Bot',
  'A social media post containing Kirkwood\'s last known words was manually removed using admin credentials. The community guideline cited did not exist at the time.'
),

// ── 8 · NEVADA ───────────────────────────────────────────────────────────
mkLevel(8,'Nevada','The Desert Signal','radio towers, casino lights, static storms','D', T.NEVADA,
  [
    { name:'Signal Keeper', color:'#7A3000', skinColor:'#D4A96A', lines:[
      { text:'Out here in the desert, every tower carries a lie. I keep the ones that carry the truth.' },
      { text:'Someone broadcast GPS coordinates in a coded signal. Decoded they point to the Arizona archive.' },
      { text:'Here is the decoded broadcast.', category:'VERIFIED RECORD', clueId:'l8_c1' },
    ]},
    { name:'Casino Ghost', color:'#AA0000', skinColor:'#FDBCB4', lines:[
      { text:'The house always wins — because the house controls the odds. And the information.' },
      { text:'I saw who sent the signal. The Static King does not want you to know. Dodge its noise bursts.' },
      { text:'Take this casino record — a transaction on the night Kirkwood disappeared.', category:'UNPROVEN THEORY', clueId:'l8_c2' },
    ]},
    { name:'Desert Prophet', color:'#CC6600', skinColor:'#8D5524', lines:[
      { text:'I live between the signals, where the truth hums at frequencies no one programs.' },
      { text:'The coordinates in the signal were sent from this desert. By someone who knew where the file was buried.' },
      { text:'The Wonderland radio knows.', category:'WONDERLAND CLUE', clueId:'l8_c3' },
    ]},
  ],
  [
    { id:'l8_c1', title:'Decoded Broadcast', description:'A decoded radio transmission containing GPS coordinates pointing to the Arizona desert archive where Kirkwood\'s file is held.', category:'VERIFIED RECORD' },
    { id:'l8_c2', title:'Casino Transaction Record', description:'A financial record showing a large payment processed on the night Kirkwood disappeared — payee anonymous.', category:'UNPROVEN THEORY' },
    { id:'l8_c3', title:'Wonderland Frequency Map', description:'A spectral map showing a signal channel broadcasting only on nights when major Kirkwood-related events occurred.', category:'WONDERLAND CLUE' },
  ],
  { id:'l8_hidden', title:'Static King\'s Broadcast Key', description:'The encryption key used to send the coordinate signal. The key matches a code used by a known information suppression network.', category:'ALLEGATION' },
  'Decode the mysterious broadcast before the Static King jams your signal.',
  'The Static King',
  'A radio signal broadcast GPS coordinates that — decoded — point directly to the Arizona archive where Kirkwood\'s sealed file is held. The signal origin is unknown.'
),

// ── 9 · ILLINOIS ─────────────────────────────────────────────────────────
mkLevel(9,'Illinois','Archive City','libraries, old newspapers, alleys, courthouse records','A', T.ILLINOIS,
  [
    { name:'Librarian', color:'#5A4A00', skinColor:'#F1C27D', lines:[
      { text:'Every book in Archive City is a clue. Every blank page is a redaction. I read both.' },
      { text:'The Chicago archive holds a box labeled only "K.W. — FINAL." Sealed. The key was mailed to a PO Box that closed in 1987.' },
      { text:'I found the newspaper that mentions the box.', category:'MEDIA REPORT', clueId:'l9_c1' },
    ]},
    { name:'Alley Source', color:'#334400', skinColor:'#C68642', lines:[
      { text:'Do not use my name. I work in the archive building. I know what is in that box — or was.' },
      { text:'Someone requested access to "K.W. — FINAL" three months ago using forged credentials. I denied it. They got in anyway.' },
      { text:'I kept the access log.', category:'VERIFIED RECORD', clueId:'l9_c2' },
    ]},
    { name:'Paper Phantom', color:'#887700', skinColor:'#DDCCAA', lines:[
      { text:'I am every story that was never printed. Every clue that was edited out before it went to press.' },
      { text:'The Paper Phantom that guards this city feeds on destroyed evidence. Do not let it touch your journal.' },
      { text:'Here — a fragment from the day the box was sealed.', category:'SYMBOLIC CLUE', clueId:'l9_c3' },
    ]},
  ],
  [
    { id:'l9_c1', title:'Newspaper Reference', description:'A 1987 newspaper clipping referencing a sealed archive box labeled "K.W. — FINAL." No further details published.', category:'MEDIA REPORT' },
    { id:'l9_c2', title:'Archive Access Log', description:'A log showing unauthorized access to the "K.W. — FINAL" box using forged credentials three months ago.', category:'VERIFIED RECORD' },
    { id:'l9_c3', title:'Sealing Day Fragment', description:'A torn document fragment dated the day "K.W. — FINAL" was sealed. Mentions a name, then a redaction mark over it.', category:'SYMBOLIC CLUE' },
  ],
  { id:'l9_hidden', title:'1987 Forwarding Address', description:'A postal record that survived: the closed PO Box was forwarded once, to an address that no longer exists on any city map.', category:'UNPROVEN THEORY' },
  'Collect the archived reports before the Paper Phantom shreds them.',
  'The Paper Phantom',
  'A Chicago archive holds a sealed box labeled "K.W. — FINAL." The key was mailed to a PO box that closed in 1987. Three months ago, someone accessed it anyway using forged credentials.'
),

// ── 10 · PENNSYLVANIA ────────────────────────────────────────────────────
mkLevel(10,'Pennsylvania','Liberty Hall of Mirrors','historic streets, bells, civic debate, mirror rooms','B', T.PENN,
  [
    { name:'Bell Keeper', color:'#1A2A80', skinColor:'#C68642', lines:[
      { text:'Freedom rings here — but sometimes the bell is cracked and the sound comes out wrong.' },
      { text:'Three journalists who wrote about Kirkwood received identical legal threats within 24 hours of each other.' },
      { text:'I have the threat letters — all worded the same.', category:'VERIFIED RECORD', clueId:'l10_c1' },
    ]},
    { name:'Mirror Sage', color:'#444488', skinColor:'#FDBCB4', lines:[
      { text:'In the Hall of Mirrors, every reflection is slightly wrong. That is how you know where truth is — it does not reflect.' },
      { text:'The Debate Warden challenges you to prove each clue\'s category. Know your evidence. Know its limits.' },
      { text:'Here is the pattern the threats followed.', category:'CONTRADICTION', clueId:'l10_c2' },
    ]},
    { name:'Press Freedom Ghost', color:'#8888CC', skinColor:'#E8BEAC', lines:[
      { text:'I am every story that was legally suppressed before it could be printed. I haunt this building.' },
      { text:'The freedom of the press failed Kirkwood not through censorship — but through fear.' },
      { text:'This is the legal notice that killed the investigation.', category:'PUBLIC STATEMENT', clueId:'l10_c3' },
    ]},
  ],
  [
    { id:'l10_c1', title:'Identical Threat Letters', description:'Three separate legal threat letters, sent to three different journalists, worded identically — all within 24 hours.', category:'VERIFIED RECORD' },
    { id:'l10_c2', title:'Threat Pattern Analysis', description:'A document comparing the timing: all three letters arrived within hours of each other after a coordination signal.', category:'CONTRADICTION' },
    { id:'l10_c3', title:'Suppression Legal Notice', description:'The legal notice that forced the investigation to stop. Signed by a firm with no public record of existence.', category:'PUBLIC STATEMENT' },
  ],
  { id:'l10_hidden', title:'Founding Document Footnote', description:'A footnote in an 1840s civic document about "coordinated suppression of inconvenient truth." The Wonderland echoes old patterns.', category:'WONDERLAND CLUE' },
  'Solve the freedom-and-truth puzzle. Prove each clue\'s category to unlock the archive gate.',
  'The Debate Warden',
  'Three journalists investigating Kirkwood received identical legal threats within 24 hours. The threats came from a law firm with no public record of existence. All three investigations stopped.'
),

// ── 11 · OHIO ────────────────────────────────────────────────────────────
mkLevel(11,'Ohio','Rust Belt Relay','factories, highways, trainyards, smoke stacks','A', T.OHIO,
  [
    { name:'Train Conductor', color:'#5A2A00', skinColor:'#8D5524', lines:[
      { text:'I have carried cargo on these rails for thirty years. Some of it I was not meant to know about.' },
      { text:'A freight train carried boxes labeled "Kirkwood Matter" from Cleveland to an undisclosed location.' },
      { text:'Here is the manifest — before it was "lost in a flood."', category:'VERIFIED RECORD', clueId:'l11_c1' },
    ]},
    { name:'Factory Witness', color:'#664422', skinColor:'#F1C27D', lines:[
      { text:'The factory closed the week after that train passed through. Everyone was told it was economic.' },
      { text:'I worked the loading dock. I saw the boxes. The labels were real — and then they were not.' },
      { text:'I photographed one box.', category:'ALLEGATION', clueId:'l11_c2' },
    ]},
    { name:'Iron Messenger', color:'#886644', skinColor:'#C68642', lines:[
      { text:'Messages travel on iron rails. Some messages are too heavy to stop once they are moving.' },
      { text:'The Iron Messenger you will face carries false freight. Real messages travel lighter.' },
      { text:'This route map shows where the train went.', category:'SYMBOLIC CLUE', clueId:'l11_c3' },
    ]},
  ],
  [
    { id:'l11_c1', title:'Freight Train Manifest', description:'A cargo manifest listing boxes labeled "Kirkwood Matter." Destination listed as "restricted facility."', category:'VERIFIED RECORD' },
    { id:'l11_c2', title:'Loading Dock Photo', description:'A photograph of a shipping box with the label "KW — DO NOT OPEN" taken by a dock worker before the factory closed.', category:'ALLEGATION' },
    { id:'l11_c3', title:'Route Map Fragment', description:'A route map for the Kirkwood cargo train. The final destination is a facility with no public listing.', category:'SYMBOLIC CLUE' },
  ],
  { id:'l11_hidden', title:'Flood Record Discrepancy', description:'The "flood" that destroyed the train manifest was recorded as occurring on a day with no rainfall in the region. Weather records survive.', category:'CONTRADICTION' },
  'Follow the witness route through the rust belt. Find the freight trail before the Iron Messenger derails it.',
  'The Iron Messenger',
  'A freight train carried materials labeled "Kirkwood Matter" from Ohio to an undisclosed facility. The train manifest was declared "lost in a flood" — on a day with no recorded rainfall.'
),

// ── 12 · MICHIGAN ────────────────────────────────────────────────────────
mkLevel(12,'Michigan','Frozen Files','frozen lakes, snow, locked vaults, icy records','D', T.MICHIGAN,
  [
    { name:'Vault Keeper', color:'#0A3855', skinColor:'#FDBCB4', lines:[
      { text:'These vaults hold everything that was meant to be forgotten. But cold preserves, Candy. Cold preserves.' },
      { text:'Frozen audio recordings from the night Kirkwood disappeared are stored here. The equipment was "not operational." Yet the tapes ran.' },
      { text:'I have a partial transcript.', category:'VERIFIED RECORD', clueId:'l12_c1' },
    ]},
    { name:'Ice Archivist', color:'#224488', skinColor:'#F1C27D', lines:[
      { text:'The frozen files cannot be altered. That is why they were locked away rather than destroyed.' },
      { text:'Audio from 11:47 PM — the correct time — exists. Three voices. Kirkwood is one of them.' },
      { text:'The second voice has never been identified.', category:'UNPROVEN THEORY', clueId:'l12_c2' },
    ]},
    { name:'Frost Spirit', color:'#88DDFF', skinColor:'#E0E8FF', lines:[
      { text:'I am the cold that preserves. The cold does not judge — it only keeps.' },
      { text:'The Frosted Clerk will try to freeze your progress. Move fast. Warmth defeats cold truth-blocking.' },
      { text:'Here is the preservation seal — proof the vault was locked from outside.', category:'WONDERLAND CLUE', clueId:'l12_c3' },
    ]},
  ],
  [
    { id:'l12_c1', title:'Frozen Tape Transcript', description:'A partial transcript of audio recorded on the night of Kirkwood\'s disappearance. Equipment was listed as "non-operational."', category:'VERIFIED RECORD' },
    { id:'l12_c2', title:'Unknown Voice Analysis', description:'Audio forensics showing three voices on the tape. Kirkwood\'s is identified. The second remains anonymous. The third is silent.', category:'UNPROVEN THEORY' },
    { id:'l12_c3', title:'Vault Lock Record', description:'A mechanical record showing the vault was locked from the outside — not sealed from within, as the official report claims.', category:'WONDERLAND CLUE' },
  ],
  { id:'l12_hidden', title:'Ice Layer Date Sample', description:'A scientific ice sample from the vault exterior. The ice layer dates the vault\'s last opening to the week of Kirkwood\'s disappearance.', category:'VERIFIED RECORD' },
  'Thaw the sealed documents before the Frosted Clerk refreezes the archive.',
  'The Frosted Clerk',
  'Audio recordings from the night Kirkwood disappeared exist in a Michigan vault. Equipment was listed as non-operational — yet the tapes ran. The vault was locked from the outside.'
),

// ── 13 · COLORADO ────────────────────────────────────────────────────────
mkLevel(13,'Colorado','Echo Mountain','mountains, cabins, hidden trails, echo caves','A', T.COLORADO,
  [
    { name:'Mountain Guide', color:'#286010', skinColor:'#C68642', lines:[
      { text:'The mountain does not lie. It just echoes what you bring to it.' },
      { text:'An informant known only as "Echo" left a message in a cabin on this ridge: "They did not delete Kirkwood. They rewrote him."' },
      { text:'I found the note. Here.', category:'VERIFIED RECORD', clueId:'l13_c1' },
    ]},
    { name:'Cave Cartographer', color:'#447722', skinColor:'#8D5524', lines:[
      { text:'I map the echo caves — places where truth bounces back louder than it was spoken.' },
      { text:'Echo has been leaving messages for years. This is not the first. Each one gets closer to the center of the story.' },
      { text:'Here is the map of where Echo has left messages before.', category:'MEDIA REPORT', clueId:'l13_c2' },
    ]},
    { name:'Echo Spirit', color:'#88FF44', skinColor:'#D4A96A', lines:[
      { text:'I am Echo. I am every sound that the mountains kept when the valley refused to hear it.' },
      { text:'They rewrote Kirkwood\'s history — not deleted it. His name exists in records, but not as himself. As someone else.' },
      { text:'The Wonderland echo reveals the rewrite.', category:'WONDERLAND CLUE', clueId:'l13_c3' },
    ]},
  ],
  [
    { id:'l13_c1', title:'Echo\'s Cabin Note', description:'"They didn\'t delete Kirkwood. They rewrote him." — A handwritten note left in an informant\'s mountain cabin.', category:'VERIFIED RECORD' },
    { id:'l13_c2', title:'Echo\'s Message Map', description:'A map showing seventeen locations where Echo has left clues over the years. The pattern points toward a federal archive.', category:'MEDIA REPORT' },
    { id:'l13_c3', title:'Mountain Echo Inscription', description:'Words carved into a cave wall: "K.W. = File 7734-B. Filed under a name that was never his."', category:'WONDERLAND CLUE' },
  ],
  { id:'l13_hidden', title:'Summit Evidence Cache', description:'A weatherproof case buried near the summit. Contains copies of three documents Echo obtained from an inside source — all predating Kirkwood\'s disappearance.', category:'ALLEGATION' },
  'Climb to the informant cabin and find Echo\'s message before the mountain swallows it.',
  'The Echo',
  'An informant known only as Echo left a note: "They didn\'t delete Kirkwood. They rewrote him." His file exists in official records — under a name that was never his.'
),

// ── 14 · WASHINGTON ──────────────────────────────────────────────────────
mkLevel(14,'Washington','Rain City Servers','rainy city, cloud servers, forests, water reflections','B', T.WASHING,
  [
    { name:'Cloud Archivist', color:'#083A50', skinColor:'#FDBCB4', lines:[
      { text:'In Rain City, everything gets backed up automatically. Even the things they tried to erase.' },
      { text:'Kirkwood\'s final communications were backed up to three cloud servers before deletion. The backup was overwritten 48 hours later — but not completely.' },
      { text:'I recovered what remained.', category:'VERIFIED RECORD', clueId:'l14_c1' },
    ]},
    { name:'Forest Witness', color:'#224422', skinColor:'#C68642', lines:[
      { text:'I watched from the tree line. The data center lights stayed on all night after Kirkwood disappeared.' },
      { text:'They were copying something. Then deleting. Then copying again. Three separate sessions.' },
      { text:'I logged the light patterns.', category:'ALLEGATION', clueId:'l14_c2' },
    ]},
    { name:'Rain Oracle', color:'#44AACC', skinColor:'#E8BEAC', lines:[
      { text:'The rain here carries information. Every drop is a bit. Every storm is a message.' },
      { text:'The Firewall Giant will block the recovered files. Attack its weak point — it cannot process truth and noise simultaneously.' },
      { text:'Here is the recovered message fragment.', category:'WONDERLAND CLUE', clueId:'l14_c3' },
    ]},
  ],
  [
    { id:'l14_c1', title:'Partial Cloud Backup', description:'A recovered fragment of Kirkwood\'s cloud backup. Most is corrupted — but one sentence survives: "The wall is the answer."', category:'VERIFIED RECORD' },
    { id:'l14_c2', title:'Data Center Light Log', description:'A hand-drawn log of data center activity on the night of Kirkwood\'s disappearance. Three sessions, each lasting exactly one hour.', category:'ALLEGATION' },
    { id:'l14_c3', title:'Rain Cipher Fragment', description:'A Wonderland message encoded in rainfall patterns: the decoded text reads "Find File 7734-B."', category:'WONDERLAND CLUE' },
  ],
  { id:'l14_hidden', title:'Server Ghost Cache', description:'A data ghost: an undeleted temporary file from 48 hours after Kirkwood\'s disappearance containing a partial directory of all documents targeted for erasure.', category:'VERIFIED RECORD' },
  'Restore the corrupted backup files before the Firewall Giant purges the last copy.',
  'The Firewall Giant',
  'Kirkwood\'s final communications were backed up to cloud servers before deletion. The backup was overwritten 48 hours later — but not completely. One fragment survived: "The wall is the answer."'
),

// ── 15 · TENNESSEE ───────────────────────────────────────────────────────
mkLevel(15,'Tennessee','Music Row Rumors','music studios, southern streets, coded melodies','C', T.TENNESS,
  [
    { name:'Session Musician', color:'#660A00', skinColor:'#C68642', lines:[
      { text:'Music Row holds more secrets than the courthouse. Songs last longer than testimony.' },
      { text:'A song written by Kirkwood\'s friend contains a coded message. Every lyric\'s first letter spells: W-A-T-C-H-T-H-E-W-A-L-L.' },
      { text:'I have the sheet music.', category:'VERIFIED RECORD', clueId:'l15_c1' },
    ]},
    { name:'Studio Ghost', color:'#884400', skinColor:'#8D5524', lines:[
      { text:'I am the song that was never released. Every word I would have sung was a clue.' },
      { text:'The Whisper Bandit steals words before they become records. Protect your evidence — it cannot take what is already heard.' },
      { text:'Here — a recording of the coded song.', category:'MEDIA REPORT', clueId:'l15_c2' },
    ]},
    { name:'Nashville Informant', color:'#AA6600', skinColor:'#F1C27D', lines:[
      { text:'Music is the only language they have not learned to suppress. Yet.' },
      { text:'The artist knew Kirkwood. Wrote the song the week after he disappeared. Hid the message in plain sight.' },
      { text:'The decoded message is this.', category:'SYMBOLIC CLUE', clueId:'l15_c3' },
    ]},
  ],
  [
    { id:'l15_c1', title:'Coded Sheet Music', description:'The sheet music for a song whose first letters spell "WATCH THE WALL" — written by Kirkwood\'s close friend the week after his disappearance.', category:'VERIFIED RECORD' },
    { id:'l15_c2', title:'Unreleased Recording', description:'An audio recording of the coded song. The label that had the contract canceled it without explanation before release.', category:'MEDIA REPORT' },
    { id:'l15_c3', title:'Decoded Message Scroll', description:'The full decoded message from the song: "Watch the wall. They built it to keep truth in, not enemies out. Kirkwood knew."', category:'SYMBOLIC CLUE' },
  ],
  { id:'l15_hidden', title:'Label Cancellation Memo', description:'The internal memo canceling the coded song\'s release. Reason given: "potential legal liability." No legal grounds cited.', category:'ALLEGATION' },
  'Identify which songs contain clue patterns before the Whisper Bandit steals the recordings.',
  'The Whisper Bandit',
  'A song written by Kirkwood\'s friend contains a coded message: "WATCH THE WALL." The song\'s record label canceled it without explanation. The artist has not spoken publicly since.'
),

// ── 16 · LOUISIANA ───────────────────────────────────────────────────────
mkLevel(16,'Louisiana','Bayou of Secrets','foggy swamp, lanterns, old bridges, hidden paths','D', T.LOUISIANA,
  [
    { name:'Bayou Elder', color:'#145020', skinColor:'#8D5524', lines:[
      { text:'The bayou keeps all secrets, Candy. And it shares them — if you know how to listen.' },
      { text:'A fog lantern burned in a specific pattern for thirty nights after Kirkwood disappeared. Morse code: NOT ALONE.' },
      { text:'I recorded the pattern each night.', category:'VERIFIED RECORD', clueId:'l16_c1' },
    ]},
    { name:'Lantern Ghost', color:'#AAFF44', skinColor:'#D4FFD4', lines:[
      { text:'I am the light that would not go out. I burned for thirty nights because someone had to.' },
      { text:'The signal was meant for anyone still looking. Kirkwood was not the only one they tried to erase.' },
      { text:'Here is the full message.', category:'SYMBOLIC CLUE', clueId:'l16_c2' },
    ]},
    { name:'Bridge Keeper', color:'#226622', skinColor:'#C68642', lines:[
      { text:'Every bridge in this bayou is a choice. Some lead forward. Some lead back. Some lead nowhere.' },
      { text:'The Fog Judge will obscure your path. Use the lantern clues to navigate — truth cuts through fog.' },
      { text:'This is the path map the lantern traced.', category:'WONDERLAND CLUE', clueId:'l16_c3' },
    ]},
  ],
  [
    { id:'l16_c1', title:'Lantern Signal Log', description:'A nightly log of the lantern pattern: three short, two long, for thirty consecutive nights. Morse decoded: "NOT ALONE."', category:'VERIFIED RECORD' },
    { id:'l16_c2', title:'Full Lantern Message', description:'The complete decoded lantern signal over 30 nights: "NOT ALONE. FOUR OF US. TWO GONE. WATCH THE WALL."', category:'SYMBOLIC CLUE' },
    { id:'l16_c3', title:'Fog Path Map', description:'A map traced from the lantern\'s movement pattern. It outlines a shape: the same symbol as Kirkwood\'s last known signature.', category:'WONDERLAND CLUE' },
  ],
  { id:'l16_hidden', title:'Bayou Archive Stone', description:'A stone tablet beneath the water: names of four people, all connected to Kirkwood. Two are listed as "silenced." Two names are Candy\'s only remaining leads.', category:'ALLEGATION' },
  'Follow the lantern clues through the bayou before the Fog Judge obscures the path.',
  'The Fog Judge',
  'For thirty nights after Kirkwood disappeared, a fog lantern burned in Morse code: "NOT ALONE. FOUR OF US. TWO GONE. WATCH THE WALL." The signal was never publicly reported.'
),

// ── 17 · MASSACHUSETTS ───────────────────────────────────────────────────
mkLevel(17,'Massachusetts','The Old Library','historic buildings, universities, old books, moving shelves','A', T.MASS,
  [
    { name:'Head Librarian', color:'#604000', skinColor:'#F1C27D', lines:[
      { text:'Every book in this library is a door. Most open forward. Some open backward. A few never open at all.' },
      { text:'There is a citation in a 1923 academic journal referencing a document that does not exist — Kirkwood\'s original report, filed under a name that was never his.' },
      { text:'Here is the journal citation.', category:'VERIFIED RECORD', clueId:'l17_c1' },
    ]},
    { name:'Moving Shelf', color:'#887744', skinColor:'#DDCCAA', lines:[
      { text:'I move when no one is looking. I rearrange what needs to be found and hide what needs to stay hidden.' },
      { text:'The Citation Wraith feeds on unverified sources. When you cite something, know what it is. The Wraith cannot survive verified evidence.' },
      { text:'Here — a citation trail leading to the real document.', category:'CONTRADICTION', clueId:'l17_c2' },
    ]},
    { name:'Archive Ghost', color:'#AA8800', skinColor:'#C68642', lines:[
      { text:'I am every footnote that was never checked. Every citation that led nowhere on purpose.' },
      { text:'The real document — Kirkwood\'s original report — exists under a false name in a subsection no one has cataloged in sixty years.' },
      { text:'This is the subsection key.', category:'SYMBOLIC CLUE', clueId:'l17_c3' },
    ]},
  ],
  [
    { id:'l17_c1', title:'1923 Journal Citation', description:'A 100-year-old academic citation referencing "File 7734-B: K.W. Report" — a document filed under an alias Kirkwood never used.', category:'VERIFIED RECORD' },
    { id:'l17_c2', title:'Citation Verification Trail', description:'A chain of verified citations leading from the 1923 journal back to a primary source that definitively proves File 7734-B is Kirkwood\'s original report.', category:'CONTRADICTION' },
    { id:'l17_c3', title:'Subsection Key', description:'A catalog key for a library subsection labeled "ghost files" — documents that exist in one index but not in the main collection.', category:'SYMBOLIC CLUE' },
  ],
  { id:'l17_hidden', title:'Ghost File Manifest', description:'A complete list of documents in the "ghost file" subsection. Kirkwood\'s name appears fourteen times — all under different aliases, all filed within the same month.', category:'VERIFIED RECORD' },
  'Solve the citation puzzle. Trace File 7734-B back to Kirkwood\'s original report before the Citation Wraith erases the trail.',
  'The Citation Wraith',
  'A 1923 academic citation references "File 7734-B: K.W. Report" — filed under a name that was never Kirkwood\'s. The file appears fourteen times in the library\'s ghost-file system under different aliases.'
),

// ── 18 · VIRGINIA ────────────────────────────────────────────────────────
mkLevel(18,'Virginia','The Federal Corridor','marble halls, redacted papers, locked offices','B', T.VIRGINIA,
  [
    { name:'Federal Clerk', color:'#444444', skinColor:'#FDBCB4', lines:[
      { text:'These halls hold everything. And nothing. The difference is a black marker and legal authority.' },
      { text:'There are seventeen redacted pages about Kirkwood in the federal corridor. The unredacted margins reveal one word: controlled.' },
      { text:'I preserved the margin text.', category:'VERIFIED RECORD', clueId:'l18_c1' },
    ]},
    { name:'Shadow Official', color:'#666666', skinColor:'#C68642', lines:[
      { text:'I cannot tell you who I am. But I can tell you what I saw.' },
      { text:'The redaction was authorized by an office that has since been restructured and renamed twice. The trail is intentionally cold.' },
      { text:'Here is the authorization signature — blurred, but real.', category:'ALLEGATION', clueId:'l18_c2' },
    ]},
    { name:'Marble Witness', color:'#888888', skinColor:'#DDDDDD', lines:[
      { text:'I am the marble. I remember every footstep. Every signature. Every shredded page.' },
      { text:'The Redaction will try to erase your progress. But marble does not forget. Truth leaves physical marks.' },
      { text:'The mark Kirkwood left is here.', category:'WONDERLAND CLUE', clueId:'l18_c3' },
    ]},
  ],
  [
    { id:'l18_c1', title:'Margin Text Preservation', description:'The unredacted margins of seventeen federal pages about Kirkwood. The visible word, repeated: "controlled."', category:'VERIFIED RECORD' },
    { id:'l18_c2', title:'Redaction Authorization', description:'A blurred authorization signature on the redaction order. The authorizing office was renamed twice since the document was filed.', category:'ALLEGATION' },
    { id:'l18_c3', title:'Marble Hall Mark', description:'A faint impression in the marble floor: Kirkwood\'s initials, pressed into the stone during a specific meeting. The building records confirm the date.', category:'WONDERLAND CLUE' },
  ],
  { id:'l18_hidden', title:'Restructured Office Record', description:'A government reorganization document showing the office that authorized Kirkwood\'s redaction was renamed and restructured within six months of the redaction.', category:'VERIFIED RECORD' },
  'Compare the official statements against the physical evidence. The Redaction cannot erase what is already stone.',
  'The Redaction',
  'Seventeen federal pages about Kirkwood were redacted. The unredacted margins contain one word: "controlled." The authorizing office was renamed twice after the redaction was filed.'
),

// ── 19 · MARYLAND ────────────────────────────────────────────────────────
mkLevel(19,'Maryland','Harbor of Evidence','docks, shipping records, foggy water, missing crates','C', T.MARYLAND,
  [
    { name:'Harbor Master', color:'#440000', skinColor:'#8D5524', lines:[
      { text:'These docks see everything — every package, every passenger, every secret shipped out of sight.' },
      { text:'A shipping manifest lists crate K-7 as containing "archival materials — deceased." Kirkwood was not deceased when that crate was shipped.' },
      { text:'I have the manifest.', category:'VERIFIED RECORD', clueId:'l19_c1' },
    ]},
    { name:'Dock Worker', color:'#662222', skinColor:'#C68642', lines:[
      { text:'I loaded that crate. It was heavy. I was told not to ask what was inside.' },
      { text:'The crate was addressed to an island facility. The island is on no official map. The boat that took it never logged a return trip.' },
      { text:'Here — I kept a photo of the label.', category:'ALLEGATION', clueId:'l19_c2' },
    ]},
    { name:'Fog Messenger', color:'#CC2222', skinColor:'#FFD5D5', lines:[
      { text:'The fog carries messages the mail cannot. I am the fog. I am every message that crossed this harbor without record.' },
      { text:'The Dockside Informant is a double agent — it will give you false information first. Strike when you see it hesitate.' },
      { text:'This harbor record survived the tidal erasure.', category:'SYMBOLIC CLUE', clueId:'l19_c3' },
    ]},
  ],
  [
    { id:'l19_c1', title:'Crate K-7 Manifest', description:'The shipping manifest for crate K-7, labeled "archival materials — deceased." Filed before Kirkwood\'s death was officially declared.', category:'VERIFIED RECORD' },
    { id:'l19_c2', title:'Crate Label Photo', description:'A photograph of crate K-7\'s destination label. Addressed to "Island Facility — Restricted." No such facility appears on public nautical charts.', category:'ALLEGATION' },
    { id:'l19_c3', title:'Harbor Tide Record', description:'A water-damaged but legible harbor log. The return trip of the K-7 transport vessel is missing — it departed but never logged arrival.', category:'SYMBOLIC CLUE' },
  ],
  { id:'l19_hidden', title:'Navigator\'s Private Log', description:'A private navigator\'s log from the transport boat: "Dropped K-7 at the wall. Orders said don\'t look. I looked. It was documents. And a name: Kirkwood."', category:'VERIFIED RECORD' },
  'Recover the missing cargo package before the Dockside Informant ships the evidence out of reach.',
  'The Dockside Informant',
  'A shipping crate labeled "archival materials — deceased" was transported before Kirkwood\'s death was officially declared. The destination: an island facility on no public map. The transport vessel never logged its return.'
),

// ── 20 · WASHINGTON D.C. ─────────────────────────────────────────────────
mkLevel(20,'Washington D.C.','The Hall of Mirrors','capital city, marble halls, secret rooms, giant mirrors, distorted voices','D', T.DC,
  [
    { name:'Mirror Keeper', color:'#888888', skinColor:'#C68642', lines:[
      { text:'Welcome to the Hall of Mirrors, Candy. This is where truth goes to become unrecognizable.' },
      { text:'Every mirror here shows a different version of Kirkwood\'s story. Only one version is complete. You have all the fragments.' },
      { text:'Assemble the timeline. The truth is in your journal.', category:'VERIFIED RECORD', clueId:'l20_c1' },
    ]},
    { name:'Architect\'s Shadow', color:'#666666', skinColor:'#DDDDDD', lines:[
      { text:'The Architect of Confusion is not a person. It is a system. A process. Built to make truth unrecognizable.' },
      { text:'Kirkwood was not killed by a person. He was erased by a machine designed to protect the powerful from accountability.' },
      { text:'The machine\'s blueprint is hidden in the final mirror.', category:'SYMBOLIC CLUE', clueId:'l20_c2' },
    ]},
    { name:'Truth Fragment', color:'#FFD700', skinColor:'#FFE8A0', lines:[
      { text:'I am Fragment Twenty. I am the piece that completes the picture.' },
      { text:'The Architect can only be defeated with all nineteen fragments assembled. Use your journal, Candy.' },
      { text:'This is the final piece of the timeline.', category:'WONDERLAND CLUE', clueId:'l20_c3' },
    ]},
  ],
  [
    { id:'l20_c1', title:'Complete Timeline Assembly', description:'All nineteen prior fragments arranged in sequence reveal a single coordinated erasure spanning fourteen states over three years.', category:'VERIFIED RECORD' },
    { id:'l20_c2', title:'Architect\'s Blueprint', description:'The design document for the erasure system. No signatures — only a symbol: a wall with a crack in it.', category:'SYMBOLIC CLUE' },
    { id:'l20_c3', title:'Final Wonderland Fragment', description:'"Truth requires courage, evidence, patience, and honesty. Not every claim is a conclusion. Not every rumor is a record."', category:'WONDERLAND CLUE' },
  ],
  { id:'l20_hidden', title:'The Wall\'s Foundation', description:'Beneath the Hall of Mirrors: a document that proves the erasure system predates Kirkwood by decades. He was not the first. He will not be the last — unless someone assembles the truth.', category:'VERIFIED RECORD' },
  'Assemble the complete timeline. Use all twenty Truth Fragments to defeat the Architect of Confusion.',
  'The Architect of Confusion',
  'The Architect of Confusion is not a person — it is a system designed to make truth unrecognizable. Kirkwood was not erased by an individual. He was erased by a machine built to protect the powerful from accountability. The machine predates him by decades.'
),

];

// ─── EXPORTS ─────────────────────────────────────────────────────────────
export const LEVEL_1 = ALL_LEVELS[0];
export function getLevelById(id: number): LevelData | undefined {
  return ALL_LEVELS.find(l => l.id === id);
}
export function getLevelByIndex(index: number): LevelData | undefined {
  return ALL_LEVELS[index];
}
export const TOTAL_LEVELS = ALL_LEVELS.length;
