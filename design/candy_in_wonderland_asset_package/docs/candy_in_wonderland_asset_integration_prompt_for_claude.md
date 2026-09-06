# Candy in Wonderland — Asset Replacement + Gameplay Integration Prompt for Claude

You are working on my game **Candy in Wonderland**.

I am giving you a ZIP file containing the extracted/generated PNG assets from our visual development process. Your job is to integrate these assets into the existing game project carefully and replace matching placeholder/code-drawn visuals with the best matching PNG assets.

The goal of this prompt is **not** to redesign the whole game again yet.  
The goal is to do a clean asset integration pass first, then let me test the game visually before we continue with more prompts.

---

## Primary Goal

Replace the game’s current matching images, sprites, UI pieces, props, backgrounds, characters, NPCs, and boss/portrait assets with the new extracted PNG assets from the ZIP.

Use the new assets wherever they match something already in the game.

Make sure everything appears in the correct location, at the correct scale, and with the correct layering.

---

## Important Instructions

Do **not** randomly overwrite working gameplay systems.

Do **not** remove existing gameplay logic.

Do **not** break movement, interaction, dialogue, clues, combat, HUD, mobile controls, or level loading.

This is an **asset replacement and integration pass**, not a gameplay rewrite.

---

## Step 1 — Unzip and Inspect the Assets

First, unzip the provided asset package.

Then inspect the contents and categorize the assets into useful folders such as:

- `characters`
- `npcs`
- `portraits`
- `bosses`
- `backgrounds`
- `ui`
- `controls`
- `props`
- `effects`
- `items`
- `environment`

If the filenames are unclear, visually inspect each image and rename or map them logically.

Create an internal mapping of:

- what each image appears to be
- what game element it should replace
- where it should be used
- whether it is a full-screen background, sprite, UI element, prop, portrait, or effect

---

## Step 2 — Create a Clean Asset Folder Structure

Place the assets into the project using a clean folder structure.

Suggested structure:

```txt
src/assets/candy/
src/assets/candy/characters/
src/assets/candy/npcs/
src/assets/candy/portraits/
src/assets/candy/bosses/
src/assets/candy/backgrounds/
src/assets/candy/ui/
src/assets/candy/controls/
src/assets/candy/props/
src/assets/candy/effects/
src/assets/candy/items/
src/assets/candy/environment/
```

Do not leave everything dumped into one folder.

---

## Step 3 — Replace Matching Game Assets

Replace all current matching placeholder/code-drawn assets with the new PNG assets where appropriate.

Focus on these categories first:

### Main Character

Replace Candy’s current sprite with the new Candy PNG assets.

Use the best available Candy images for:

- front-facing idle
- side-facing movement if available
- back-facing movement if available
- dialogue portrait if available
- menu/profile display if available

If only one direction is available, reuse it temporarily but structure the code so directional sprites can be added later.

### NPCs

Replace the Witness/Wanderer/NPC sprites with the new NPC images where appropriate.

Use the new PNGs for:

- Witness NPC
- Wanderer NPC
- Scholar NPC if applicable
- other visible NPCs if matching assets exist
- NPC dialogue portraits if available

### UI

Replace or integrate the new UI PNG assets for:

- Truth Meter panel
- Clues panel
- Objective panel
- Location panel
- Pause button
- Candy in Wonderland title/logo
- Dialogue box frame
- Joystick
- Attack button
- Interact button

If an image is a UI sheet instead of an individual UI element, either crop/slice it programmatically or manually create CSS/image positioning so the proper element displays cleanly.

### Background / Environment

Use the full courtyard background PNG as the main visual base if it improves visual quality.

Important:

- If using the full background, do not draw conflicting duplicate code-generated environment elements on top unless they are supposed to be interactive.
- Keep collision, walkable paths, portals, clue areas, NPC positions, and interaction zones functional.
- Align gameplay coordinates with the background visually.
- Do not let the camera zoom in too far.
- Keep the view wide enough so the courtyard feels cinematic and close to the visual reference.

### Props

Replace matching props with the new PNGs:

- bench
- candle
- Veritas banner
- Rumors sign
- No Entry sign
- Mindline tape
- purple rift
- floating cards
- clue orb
- stone path pieces
- hedges/flowers
- fountain

If some props are only available on sheets, use the sheet temporarily or isolate them if practical.

### Effects

Use the new visual assets and/or PixiJS effects for:

- purple magical glow
- rift particles
- floating clue sparkle
- candle flame glow
- ambient dust/magic particles
- portal energy
- corruption cracks

Keep PixiJS or current rendering enhancements for glow, particles, lighting, and atmosphere.

---

## Step 4 — Preserve and Improve Animation / Motion

After replacing the images, make sure the game still has animation and movement.

### Main character animation

Candy should not look like a static sticker.

Add or preserve:

- idle bobbing
- walking motion
- directional facing
- subtle shadow under the character
- slight bounce or frame-shift during movement
- proper scaling so she fits the world

If full sprite sheets are missing, use simple animation techniques:

- idle breathing/bobbing
- small vertical movement while walking
- alternating scale/position offsets
- direction flipping for left/right
- shadow movement

### NPC animation

NPCs should have subtle life.

Add or preserve:

- idle bobbing
- small head/shoulder motion
- speech bubble pulse
- interaction glow when player is near
- subtle shadow underneath
- optional turn-to-face-player behavior

### UI animation

The UI should feel polished but not distracting.

Add or preserve:

- soft panel glow
- clue counter pulse when updated
- hearts pulsing/glowing
- buttons reacting to press/tap
- joystick feedback
- dialogue box fade/slide
- objective panel subtle shimmer

### Environment motion

Keep the world alive with:

- candle flicker
- purple rift pulsing
- floating cards drifting
- particles moving slowly
- fountain water shimmer
- clue orb sparkle
- magical cracks glowing softly

---

## Step 5 — Placement and Scaling Requirements

Be careful with layout.

The current goal is not just to replace images, but to place them correctly.

Check:

- Candy is the correct size relative to the environment.
- NPCs are the correct size relative to Candy.
- UI does not overlap gameplay too much.
- The joystick and buttons are comfortable for mobile.
- The courtyard background is not stretched incorrectly.
- The camera is not overly zoomed in.
- Props do not block the player unless intended.
- Dialogue portraits fit correctly inside the dialogue box.
- HUD is readable on mobile.

---

## Step 6 — Mobile Testing Priority

This game is intended to be playable on mobile.

Please test or verify:

- responsive canvas sizing
- portrait orientation
- mobile joystick placement
- attack/interact button placement
- HUD readability
- touch controls
- no horizontal scrolling
- background scales properly
- character remains visible and centered appropriately
- camera does not crop the scene too tightly

---

## Step 7 — Asset Manifest

Create an asset manifest file if useful.

Example:

```ts
export const CandyAssets = {
  characters: {
    candyFront: "...",
    candyBack: "...",
    candySide: "...",
  },
  npcs: {
    witness: "...",
    wanderer: "...",
  },
  portraits: {
    candy: "...",
    witness: "...",
  },
  ui: {
    truthMeter: "...",
    cluesPanel: "...",
    objectivePanel: "...",
    locationPanel: "...",
    pauseButton: "...",
    joystick: "...",
    attackButton: "...",
    interactButton: "...",
  },
  props: {
    bench: "...",
    candle: "...",
    veritasBanner: "...",
    rumorsSign: "...",
    noEntrySign: "...",
    mindlineTape: "...",
    purpleRift: "...",
    clueOrb: "...",
    fountain: "...",
  },
  backgrounds: {
    courtyard: "...",
  },
};
```

This will make future asset swaps easier.

---

## Step 8 — Do Not Force Bad Assets

If an asset does not match or looks worse than the existing version, do not force it.

Instead:

1. Keep the better-looking version.
2. Document which asset was skipped.
3. Explain why it was skipped.
4. Suggest what replacement would be needed later.

Quality matters more than blindly replacing everything.

---

## Step 9 — Final Testing

After integration, run the game and test:

- start screen
- level load
- Candy movement
- NPC interaction
- dialogue
- objective display
- clue counter
- truth meter
- attack button
- interact button
- joystick
- pause button
- camera movement
- mobile layout
- no console errors
- no broken image paths
- no missing imports
- no performance freeze

Fix any build errors or broken paths before reporting back.

---

## Final Report Required

When finished, give me a clear report with:

1. Which assets were imported
2. Which assets replaced existing game visuals
3. Which assets were skipped and why
4. Which files were edited
5. Whether the background was replaced or only enhanced
6. Whether Candy and NPC animations still work
7. Whether mobile controls still work
8. Any remaining visual gaps
9. What I should test first

---

## Most Important Reminder

The goal right now is:

**Use the ZIP assets to replace the matching visuals in the game, keep gameplay working, preserve or add motion/animation, place everything correctly, and let me test the result before we move to the next improvement prompt.**

Do not overthink this into a full redesign yet.

Do a careful, organized asset integration pass first.
