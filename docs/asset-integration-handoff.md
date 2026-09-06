# Candy in Wonderland — Codex Asset Integration Handoff Prompt

You are taking over the **Candy in Wonderland** game project.

I am providing an asset package ZIP that contains organized PNG assets for the game’s graphics, characters, menu/title screen, UI, backgrounds, props, NPCs, portraits, and bosses.

Your job is to integrate the assets into the game carefully, replace placeholder visuals, improve character presentation, and keep the game fully playable.

---

## Asset Package

Use the provided ZIP asset package:

```txt
candy_in_wonderland_asset_package.zip
```

The package is organized into folders such as:

```txt
backgrounds/
bosses/
characters/
characters/main_character/
characters/npcs/
characters/portraits/
docs/
menu/
menu/assets/
menu/text/
props/
reference_sheets/
ui/
```

First, unzip the package and inspect the contents before making changes.

---

# Main Goals

## 1. Replace Placeholder Graphics

Replace the current placeholder or generic visuals in the game with the matching assets from the package.

Focus on:

- Candy main character
- Witness / Wanderer / Scholar NPCs
- dialogue portraits
- boss characters
- title/menu screen
- UI panels
- buttons
- props
- background/environment assets

Do not just copy the assets into the repo. They need to be wired into the actual game.

---

## 2. Fix Candy’s Movement Presentation

Candy should not slide around in one static pose.

Implement or fix directional facing:

- moving left → Candy faces left
- moving right → Candy faces right
- moving up → Candy faces up/back if available
- moving down → Candy faces down/front if available

When Candy stops, she should keep facing the last direction she moved.

If directional sprites are missing:

- use the best available sprite
- flip the side-facing sprite for left/right if needed
- use a temporary fallback for up/back
- document what better assets are still needed later

---

## 3. Add Walking and Idle Animation

Candy needs a visible walking animation while moving.

If proper sprite sheets are available, use them.

If not, create a procedural fallback animation:

- subtle walking bob
- slight footstep rhythm
- shadow squash/stretch
- idle breathing/bobbing when stopped
- no jittering
- no broken scale
- no sprite popping

This must work with both mobile joystick and keyboard movement if keyboard movement exists.

---

## 4. Fix Full Courtyard Exploration

The player currently cannot access the full courtyard/map, especially the lower section.

You must inspect the code and find the exact cause.

Search for movement restrictions such as:

```ts
clamp
Math.min
Math.max
bounds
worldBounds
mapBounds
cameraBounds
playerBounds
walkableBounds
collision
obstacles
blocked
isBlocked
canMove
solid
wall
rect
hitbox
viewport
canvas.height
canvas.width
backgroundHeight
backgroundWidth
worldHeight
worldWidth
minY
maxY
player.y
camera.y
```

Fix the root cause so Candy can walk:

- to the top of the courtyard
- through the center
- all the way to the lower courtyard
- back up again

Candy should only be blocked by real obstacles, not invisible walls or incorrect world/camera clamps.

---

## 5. Replace the Title/Menu Screen

Use the provided menu/title assets to replace the current menu screen before the game starts.

The new menu should use assets from:

```txt
menu/assets/
menu/text/
ui/
backgrounds/
```

The menu should feel:

- modern
- polished
- sleek
- dark fantasy
- purple/gold
- visually appealing
- consistent with Candy in Wonderland

Make sure the menu still works:

- Start Game starts the game
- Options opens options
- Credits opens credits
- Press Any Key still works if supported
- responsive on desktop and mobile

---

## 6. Fix NPC and Dialogue Portrait Mapping

The Witness and other NPCs should not appear as generic placeholders.

Use the proper assets for:

- Witness full-body gameplay sprite
- Witness dialogue portrait
- Candy dialogue portrait
- other NPC portraits if available
- boss portraits where applicable

Make sure dialogue shows the correct speaker image.

The in-game NPC sprite and dialogue portrait should visually match where possible.

---

## 7. Fix Any White Background / Transparency Issues

Some assets may have white or unwanted backgrounds if they were imported incorrectly.

Fix:

- white rectangles behind sprites
- lost alpha transparency
- wrong crop
- wrong asset used as sprite
- portrait mistakenly used as gameplay sprite
- stretched or squashed images

Use transparent PNGs correctly and preserve alpha.

---

## 8. Improve Lighting and Visibility

The game scene should remain dark fantasy, but it is currently too dim in places.

Adjust:

- ambient brightness
- vignette opacity
- rift glow intensity
- fountain glow
- candle warmth
- character visibility
- NPC visibility
- clue visibility
- lower courtyard readability

Do not over-brighten the game. Keep the mood, but make gameplay clearer.

---

## 9. Bosses and Level Progression

Make sure the 20-level boss system is intact.

If there are fewer than 20 unique boss assets, reuse boss assets as variants by changing:

- suit color
- tie color
- aura color
- name/title
- difficulty stats
- attack pattern if applicable

Bosses should remain fairly easy until around Level 17, then become harder.

Each level should follow this flow:

1. Player explores the level.
2. Player investigates required clues/NPCs/objects.
3. Boss stays locked until required investigations are complete.
4. Boss unlocks after investigation completion.
5. Player defeats boss.
6. Game advances to the next level.

---

## 10. Slightly Speed Up Soundtrack Tempo

Slightly increase the game soundtrack tempo across the menu and gameplay.

Target:

```txt
1.05x to 1.12x playback speed
Recommended: 1.08x
```

Preserve pitch if the audio system supports it.  
Do not make the music sound rushed or broken.

Check:

- menu music
- level music
- boss/battle music if available
- mute/volume controls

---

# Implementation Rules

Do not break existing gameplay systems.

Preserve:

- player movement
- mobile joystick
- keyboard controls
- attack button
- interact button
- dialogue
- NPC interactions
- clues
- boss unlock
- level progression
- menu buttons
- pause behavior
- mobile layout
- existing save/progress logic if present

Use the asset package to upgrade the game, but do not destroy working systems.

---

# Suggested Asset Manifest

Create or update an asset manifest so future swaps are easier.

Example:

```ts
export const CandyAssets = {
  menu: {
    background: "...",
    logo: "...",
    subtitle: "...",
    candyBadge: "...",
    startButton: "...",
    optionsButton: "...",
    creditsButton: "...",
    pressAnyKey: "..."
  },
  characters: {
    candy: {
      front: "...",
      back: "...",
      side: "...",
      spriteSheet: "..."
    },
    witness: {
      sprite: "...",
      portrait: "..."
    }
  },
  ui: {
    truthMeter: "...",
    objectivePanel: "...",
    cluesPanel: "...",
    locationPanel: "...",
    pauseButton: "..."
  },
  props: {
    bench: "...",
    fountain: "...",
    candle: "...",
    rift: "...",
    signs: "..."
  },
  bosses: {
    boss01: "...",
    boss02: "..."
  }
};
```

The exact structure can be adjusted to match the project.

---

# Testing Checklist

After implementation, test everything below.

## Menu

- menu loads with new assets
- title/logo displays correctly
- Candy menu character displays correctly
- Start Game works
- Options works
- Credits works
- Press Any Key works if present
- menu is responsive on mobile and desktop

## Character Movement

- Candy faces left when moving left
- Candy faces right when moving right
- Candy faces up/back when moving up if supported
- Candy faces down/front when moving down
- Candy keeps last direction when stopped
- walking animation plays while moving
- idle animation plays while stopped
- joystick and keyboard both trigger facing/animation

## Map Access

- Candy can walk to the top of the courtyard
- Candy can walk through the center
- Candy can walk all the way to the bottom
- Candy can return from bottom to top
- no invisible wall blocks open walkable space
- collision only blocks real obstacles
- camera follows correctly

## NPCs / Dialogue

- Witness no longer uses a generic placeholder
- Witness sprite has transparent background
- Witness dialogue portrait appears correctly
- speaker names display correctly
- NPC interactions still work
- clue dialogue still works

## Boss / Level Flow

- investigations are tracked
- boss is locked before clues are complete
- boss unlocks after required investigations
- boss fight starts correctly
- defeating boss advances to next level
- Level 20 ends properly if final boss is defeated

## Audio

- menu music plays
- gameplay music plays
- boss music plays if available
- soundtrack is slightly faster
- audio does not distort
- volume/mute still works

## Stability

- no console errors
- no missing asset paths
- no broken imports
- no layout overflow
- no mobile control regressions
- no performance freezing

---

# Final Report Required

When finished, report:

1. Which assets were imported and where they were placed
2. Which old placeholders were replaced
3. Which menu assets were replaced
4. How Candy’s directional facing was fixed
5. How walking/idle animation was implemented
6. Why the courtyard movement was blocked and how it was fixed
7. Which NPC sprites/portraits were mapped
8. Whether white-background issues were fixed
9. What lighting improvements were made
10. How soundtrack tempo was changed
11. Which files were edited
12. What I should test first

---

# Final Instruction

Use the asset package to upgrade the game graphics and characters properly.

The most important fixes are:

- integrate the assets into the real game, not just the folder
- make Candy face left/right/up/down naturally
- add walking animation
- make the full courtyard accessible
- replace the title/menu screen
- fix NPC/portrait placeholders
- preserve gameplay and test everything
