# Candy in Wonderland — Remaining Asset Integration + Placement + Polish Prompt

You are working on **Candy in Wonderland**.

Your task is to **integrate the remaining extracted image assets into the game**, place them in the correct gameplay/UI locations, replace placeholders or incorrect visuals, and polish any glitchy-looking assets so the game looks more complete and consistent.

I am providing:

1. A **ZIP file** containing remaining PNG assets.
2. Possibly **additional separate PNG files** outside the ZIP.

You must use **both**:
- the ZIP contents
- any separately uploaded PNG assets I provide alongside this prompt

Do not ignore the separate files.
Do not only inspect the ZIP and stop there.

---

## Main Goal

Use the remaining assets to:

- place all missing images into the game
- replace placeholder or generic visuals
- map each asset to the correct role
- ensure all visuals appear in the correct area of the game
- polish any glitchy or rough-looking assets where possible
- keep the game stable and playable

This is an **asset integration and cleanup pass**.

---

# Assets To Use

Please inspect and import the contents of:

- the provided ZIP asset bundle
- any separate PNG files included with this request

You must first inventory all assets and classify them into these categories:

1. **Main character assets**
2. **NPC assets**
3. **Dialogue portraits**
4. **UI assets**
5. **Environmental props**
6. **Boss assets**
7. **Background / scene assets**
8. **Optional decorative assets**

---

# Required Workflow

## Step 1 — Extract and Inventory

First:

- extract the ZIP
- inspect every PNG file
- inspect any separately uploaded PNG images
- create a clear asset inventory
- identify what each file most likely represents

For each asset, determine whether it belongs to:

- Candy (main player)
- Witness / Wanderer / Scholar / other NPCs
- dialogue portrait
- HUD / UI
- prop / environment
- boss / enemy
- background / level art

If filenames are unclear, infer the best use based on the artwork itself.

---

## Step 2 — Map Assets to In-Game Roles

Use the best available asset for each game element.

### Priority Mapping

#### Main Character
Use the best Candy assets for:
- in-game sprite
- directional states if available
- idle state
- walking animation frames if available
- dialogue portrait if available

#### Witness / NPCs
Use the best Witness or detective-style assets for:
- full-body gameplay sprite
- dialogue portrait
- idle state
- optional walking animation if feasible

Also map any other NPC-like assets to:
- Scholar
- Wanderer
- other stage witnesses / clue NPCs

#### UI Assets
Use the correct individual UI assets for:
- Truth Meter panel
- Clues panel
- Objective panel
- Location panel
- Pause button
- Candy in Wonderland title/logo
- dialogue box frame
- joystick
- attack button
- interact button

#### Props / Environment
Use the props in appropriate places, including:
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
- hedges / flowers
- fountain or fountain-related parts

#### Bosses
Use or preserve boss assets already integrated, and map any remaining boss images where appropriate.

---

# Placement Requirements

Place each asset in its proper location in the game.

## Scene / Level Placement

Make sure environmental assets are placed logically:

- fountain in the central focal area if designed that way
- hedges along borders or garden zones
- candles near important structures or paths
- signs in readable / thematic positions
- benches at believable scene edges
- rift and floating cards near corrupted / magical areas
- clue orb at meaningful clue interaction spots
- stone path pieces aligned to walkable paths
- barrier / Mindline tape where intended to block or warn

Do not scatter assets randomly.
Do not leave them stacked incorrectly.
Do not let props overlap badly.

---

## UI Placement

Ensure UI elements are placed properly and consistently:

- Truth Meter panel should be readable and positioned cleanly
- Clues panel should be readable and not overlap core gameplay awkwardly
- Objective panel should be visible and styled consistently
- Location panel should display clearly
- Pause button should stay accessible
- Title/logo behavior should follow the current system or fade system already requested
- Dialogue box should fit portraits and text properly
- Joystick, Attack, and Interact buttons should stay aligned and usable on mobile

Do not let UI panels overlap badly or look misaligned.

---

# Replace Placeholders / Generic Images

If the game is still using generic, placeholder, or wrong images:

- replace them with the appropriate extracted assets
- especially replace generic NPCs with the intended NPC images
- especially replace generic Witness visuals with the proper Witness asset
- ensure dialogue portraits match the in-game character identity

If a portrait exists but the map sprite is wrong, fix that.
If a map sprite exists but dialogue portrait is wrong, fix that too.

---

# Image Polish / Glitch Cleanup

Some assets may look slightly glitchy, rough, blurry, cropped poorly, mis-scaled, or visually inconsistent.

Where possible, polish them during integration.

This includes:

- fixing poor scaling
- cleaning transparent edges if needed
- avoiding stretched appearance
- avoiding squashed appearance
- avoiding incorrect aspect ratio
- fixing harsh cropping
- centering sprites properly
- making sprite size consistent
- smoothing presentation through correct rendering settings
- reducing visual mismatch between similar assets
- using nearest-neighbor / pixel-perfect rendering where appropriate
- making sure pixel art stays crisp

If necessary, do light preprocessing or cleanup before integrating the file.

If Canva or connected image tools are helpful for cleanup, you may use them.
But the final goal is to get the cleaned asset back into the game in the correct place.

---

# Animation Requirements

If the provided files support it, wire them into animation systems.

## Main Character
Make sure Candy has:
- correct sprite usage
- walking animation if frames exist or can be derived
- directional facing
- correct scale
- proper positioning

## NPCs
For Witness and major NPCs, if feasible:
- add idle animation
- add subtle bobbing or breathing animation
- use walking frames if provided or reasonably derived

Do not force broken animation if the asset cannot support it.
Use subtle idle animation if full walk cycles are not available.

---

# Rendering / Visual Consistency

Make sure imported PNGs render cleanly.

Use settings appropriate for pixel art / stylized assets:
- preserve transparency
- avoid blurry resampling
- keep consistent sprite scale
- avoid inconsistent anchor points
- keep z-order / layering correct
- ensure props do not appear behind or in front of wrong objects
- keep shadows or glow effects if already supported by the game

If using PixiJS or other renderer settings, make sure imported assets display sharply and in the correct layer order.

---

# Preserve Existing Functionality

Do not break:
- movement
- collision
- clue system
- boss unlock logic
- level progression
- joystick controls
- attack button
- interact button
- pause menu
- mobile usability
- existing dialogue logic
- existing boss logic

This is an asset integration pass, not a destructive rebuild.

---

# Fallback Rules

If an exact asset match is not obvious:

1. choose the most visually appropriate image
2. document what you chose
3. integrate it cleanly
4. do not leave placeholders in place if a better extracted asset exists

If multiple assets could serve the same role:
- pick the best one
- keep alternates available for later swaps

---

# Required Deliverables

When finished, provide:

## 1. Asset Integration Report
List:
- which files were used
- what each file was assigned to
- which placeholders were replaced
- which files were cleaned/polished
- which files were not used and why

## 2. Code/Project Change Summary
List:
- files changed
- components/scenes updated
- asset paths added or replaced
- any rendering fixes made

## 3. Testing Report
Confirm:
- images appear in the correct places
- UI is readable
- NPC portraits display correctly
- Witness no longer shows as a generic character
- game still runs properly
- controls still work
- no missing file errors
- no broken asset references

## 4. Final Verification Items
Tell me specifically:
- whether all remaining assets were integrated
- whether any asset still needs manual replacement later
- what I should test first in the game

---

# Important Special Instruction

Please **do not stop after only importing files**.

You must:
1. inspect
2. map
3. place
4. replace incorrect visuals
5. polish glitchy assets
6. verify in-game appearance

The goal is not just to “add files” to the project directory.
The goal is to **have those files visibly working in the actual game in their correct roles**.

---

# Final Direct Instruction

Please complete a thorough remaining-asset integration pass using:
- the ZIP bundle
- the separate uploaded images

Then wire the assets into the game properly, clean up glitchy visuals where possible, and make the build visibly more complete and polished.
