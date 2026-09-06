# Candy in Wonderland — Forceful Fix Prompt for Claude

You are not done yet.

The current build still has clear problems, and I need you to perform a **strict correction pass** right now.

## Fix these issues completely

### 1) Color / lighting corrections
The scene still needs visual correction.

You must rebalance:
- overall brightness and darkness
- purple glow intensity
- portal/rift lighting
- fountain lighting
- candle warmth
- contrast and shadow depth
- environment color consistency
- UI readability against the background

Target:
- dark fantasy mood
- polished color harmony
- readable gameplay
- no washed-out highlights
- no overblown glow

---

### 2) Remove the white background behind the NPC / character
A character on the map still has a **white rectangular background** behind them.

Fix this at the root:
- use the correct transparent PNG
- preserve alpha transparency
- remove any white matte / white box
- verify the correct sprite is being used
- verify the portrait is not mistakenly being used as a map sprite
- verify the sprite crop/export is correct

No placeholder-looking NPCs should remain.

---

### 3) Fix lower-map access / movement bounds
Candy still cannot move into the lower portion of the level properly.

You must fix:
- collision map
- world bounds
- player clamp limits
- obstacle hitboxes
- level geometry blocking
- invisible walls
- incorrect y-limits / movement restrictions

Candy must be able to explore the **entire intended playable area**, including the lower section of the stage.

---

### 4) Verify NPC correctness
Check every visible NPC and confirm:
- correct gameplay sprite
- correct scale
- correct placement
- correct interaction range
- correct speech bubble behavior
- correct dialogue portrait mapping

---

### 5) Do a full QA pass
Do not stop after one fix.

You must test:
- sprite transparency
- NPC art
- movement
- collision
- lower-map exploration
- clue interactions
- dialogue triggers
- boss unlock conditions
- console errors
- missing asset paths
- mobile responsiveness
- gameplay responsiveness

---

## Required output
When finished, report back with:

1. what caused the white-background sprite issue
2. how you fixed it
3. what visual/color corrections you made
4. what movement/collision changes you made
5. whether Candy can now reach the full lower area
6. which files you edited
7. whether the build is now fully functional

---

## Important
Do not give me a partial attempt.

I want a **real fix pass**, not a superficial patch.

Your job is to:
- correct the visuals
- remove the white background NPC issue
- restore full intended map traversal
- verify NPCs
- test everything
- confirm the game works properly before handing it back
