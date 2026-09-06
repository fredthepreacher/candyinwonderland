/**
 * Central asset manifest.
 *
 * Every PNG the game loads is named here exactly once, so swapping art is a
 * one-line change and nothing has to go hunting through the engine.
 *
 * All of these files are produced by `tools/build-assets.py` from the raw art in
 * `design/candy_in_wonderland_asset_package/`. They are already alpha-cut,
 * trimmed and downscaled — the engine does NOT need to strip backgrounds at
 * runtime, and must not re-add that pass.
 */

export const AssetPaths = {
  characters: {
    candyFront: '/assets/characters/candy_front.png',
    candyBack:  '/assets/characters/candy_back.png',
  },

  npcs: {
    witness:   '/assets/npcs/witness.png',      // young detective, flat cap
    scholar:   '/assets/npcs/scholar.png',      // elderly detective, magnifier + field book
    wanderer:  '/assets/npcs/wanderer.png',     // girl in the blue dress
    detective: '/assets/npcs/detective_alt.png',// second detective look, used to vary later levels
  },

  portraits: {
    candy:     '/assets/portraits/candy_portrait.png',
    witness:   '/assets/portraits/witness_portrait.png',
    scholar:   '/assets/portraits/scholar_portrait.png',
    wanderer:  '/assets/portraits/wanderer_portrait.png',
    detective: '/assets/portraits/detective_portrait.png',
  },

  /**
   * Four boss plates cover all 20 levels. `bossSpriteFor()` picks one per level
   * and the engine tints it with that level's `suitTint` / `aura`, which is how
   * a level gets a boss that looks like its own character.
   */
  bosses: {
    guardian:   '/assets/boss/boss_guardian.png',
    aristocrat: '/assets/boss/boss_aristocrat.png',
    sorceress:  '/assets/boss/boss_sorceress.png',
    warden:     '/assets/boss/boss_warden.png',
  },

  props: {
    bench: '/assets/props/bench.png',
  },

  backgrounds: {
    courtyard: '/assets/backgrounds/courtyard.png',
    starfield: '/assets/backgrounds/starfield.png',
  },

  ui: {
    // One heart cut out of the TRUTH METER plate by the build pipeline. The plate
    // itself is a static mockup with five hearts baked in, so it cannot show live
    // HP; a single heart the HUD stamps maxHp times can.
    heart:      '/assets/ui/heart.png',
    truthMeter: '/assets/ui/truth_meter.png',
    cluesFrame: '/assets/ui/clues_frame.png',
  },

  menu: {
    title:     '/assets/ui/menu/01_title_candy_in_wonderland_text.png',
    subtitle:  '/assets/ui/menu/02_subtitle_mystery_adventure_text.png',
    btnStart:  '/assets/ui/menu/03_start_game_button_text.png',
    btnOpts:   '/assets/ui/menu/04_options_button_text.png',
    btnCreds:  '/assets/ui/menu/05_credits_button_text.png',
    anyKey:    '/assets/ui/menu/06_press_any_key_text.png',
    sign1:     '/assets/ui/menu/07_signpost_tea_party_lane_text.png',
    sign2:     '/assets/ui/menu/08_signpost_cheshire_woods_text.png',
    sign3:     '/assets/ui/menu/09_signpost_queens_court_text.png',
    badge:     '/assets/ui/menu/candy_badge.png',
    candy:     '/assets/characters/candy_front.png',
    starfield: '/assets/backgrounds/starfield.png',
  },
} as const;

/**
 * Where the fountain sits in the courtyard plate, as a 0..1 fraction of its
 * height. The engine anchors the plate on this so the painted fountain lands on
 * the fountain tile the animated overlays are drawn at, instead of the plate
 * being pinned to the top of the map with its lower half hanging off-screen.
 */
export const COURTYARD_FOCAL_Y = 0.335;

/** The three NPC slots every level lays out, in level.npcs order. */
export const NPC_SPRITE_SLOTS = ['witness', 'scholar', 'wanderer'] as const;
export type NpcSlot = (typeof NPC_SPRITE_SLOTS)[number];
export type NpcSpriteKey = NpcSlot | 'detective';

/**
 * Which sprite an NPC slot uses. This is the single rule for it — the engine
 * draws the map sprite from it and the dialogue box picks the portrait from it,
 * so the face on the map always matches the face in the dialogue box.
 *
 * From level 11 the first informant switches to the second detective look so the
 * back half of the game is not the same three faces over and over.
 */
export function npcSpriteKey(levelId: number, slot: number): NpcSpriteKey {
  if (slot === 0 && levelId >= 11) return 'detective';
  return NPC_SPRITE_SLOTS[Math.min(Math.max(slot, 0), NPC_SPRITE_SLOTS.length - 1)];
}

const BOSS_ROTATION = ['aristocrat', 'guardian', 'sorceress', 'warden'] as const;

/** Boss plate for a level (1-based). Level 20 always gets the guardian. */
export function bossSpriteFor(levelId: number): string {
  if (levelId >= 20) return AssetPaths.bosses.guardian;
  return AssetPaths.bosses[BOSS_ROTATION[(levelId - 1) % BOSS_ROTATION.length]];
}

/**
 * Portrait for a dialogue speaker. Falls back to the NPC's slot in the level so
 * every one of the 20 levels shows real art, not just the handful of NPC names
 * that happen to be spelled the same as a portrait file.
 */
export function portraitFor(speaker: string, spriteKey?: NpcSpriteKey): string | null {
  const byName: Record<string, string> = {
    candy:     AssetPaths.portraits.candy,
    witness:   AssetPaths.portraits.witness,
    scholar:   AssetPaths.portraits.scholar,
    wanderer:  AssetPaths.portraits.wanderer,
    detective: AssetPaths.portraits.detective,
    archivist: AssetPaths.portraits.scholar,
    nomad:     AssetPaths.portraits.wanderer,
  };
  const hit = byName[speaker.trim().toLowerCase()];
  if (hit) return hit;
  return spriteKey ? AssetPaths.portraits[spriteKey] : null;
}
