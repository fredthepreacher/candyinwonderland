# Candy in Wonderland — Replace Title/Menu Screen Assets + Speed Up Game Soundtrack Tempo Prompt for Claude

You are working on **Candy in Wonderland**.

This is a focused title/menu replacement and soundtrack tempo update prompt.

Do **not** overhaul the whole game.  
Do **not** redesign the gameplay level right now.  
Focus only on the title/menu screen before the game starts, and the game soundtrack tempo.

---

## Main Goal

Replace the current app title/menu screen with the new title/menu assets provided in the ZIP file.

This is the menu screen that appears **before the game starts**.

Also slightly speed up the tempo of the game soundtrack across the game.

---

# Assets Provided

I am providing a ZIP file containing the new title/menu assets.

Use the assets from the ZIP to replace the current menu screen assets.

The ZIP may include assets such as:

- Candy in Wonderland title/logo text
- subtitle text
- Start Game button
- Options button
- Credits button
- Press Any Key prompt
- signpost text/assets
- starry background
- character badge / Candy menu character
- asset manifest
- extracted text list

Please inspect the ZIP first and map each asset to its correct menu role.

---

# Required Menu Replacement

Replace the current title/menu page with the provided assets.

The current menu is too plain and should be replaced with the more modern, polished, glowing, fantasy-style design from the provided assets.

The new title/menu screen should feel:

- modern
- sleek
- polished
- visually appealing
- more dynamic
- more professional
- fantasy/mystery themed
- consistent with Candy in Wonderland’s dark purple/gold visual direction

---

## Menu Elements To Replace

Replace all current menu visuals with the provided ZIP assets where possible.

Update:

1. **Background**
   - Use the new starry/dark purple background asset if provided.
   - Make it fill the menu screen cleanly.
   - Keep it responsive for different screen sizes.

2. **Title / Logo**
   - Replace the current text title with the new Candy in Wonderland title/logo asset.
   - Place it prominently near the top.
   - Maintain glow/pop effect if already baked into the image.

3. **Subtitle**
   - Use the provided subtitle asset/text:
   - `A MYSTERY ADVENTURE IN 20 WONDERLAND STATES`
   - Place it under the title.

4. **Candy Character**
   - Replace the old simple center character with the provided Candy character/menu badge asset.
   - Candy should resemble the version we designed and put into the game.
   - Place Candy centered above the menu buttons or in the intended focal area.
   - Ensure she is not blurry, stretched, or too small.

5. **Start Game Button**
   - Replace the old button with the provided Start Game button asset.
   - Ensure click/tap behavior still starts the game.

6. **Options Button**
   - Replace the old button with the provided Options button asset.
   - Ensure click/tap behavior still opens options.

7. **Credits Button**
   - Replace the old button with the provided Credits button asset.
   - Ensure click/tap behavior still opens credits.

8. **Press Any Key Prompt**
   - Replace the old prompt with the provided Press Any Key prompt asset.
   - Keep the existing press-any-key behavior working.

9. **Decorative Assets**
   - If the ZIP includes signpost text/assets, stars, ornaments, glows, or border details, place them tastefully.
   - Do not clutter the menu.
   - Keep the layout clean and readable.

---

# Important Asset Mapping Instructions

Do not just place the ZIP files into the project folder and stop.

You must:

1. Extract the ZIP.
2. Inspect every asset.
3. Identify what each asset is for.
4. Import the assets into the project.
5. Replace the current menu/title assets in code.
6. Update layout/styling so the new assets appear correctly.
7. Preserve button functionality.
8. Test the menu screen before reporting back.

---

# Menu Layout Requirements

The final title/menu page should be arranged like this:

1. Starry/dark fantasy background fills the screen.
2. Candy in Wonderland logo/title large at the top.
3. Subtitle below the title.
4. Candy character centered below subtitle.
5. Start Game button centered below Candy.
6. Options button below Start Game.
7. Credits button below Options.
8. Press Any Key prompt near bottom.
9. Optional decorative signpost/border assets placed only if they enhance the design.

The menu should look polished on:

- desktop
- laptop
- tablet
- mobile portrait

---

# Responsive Design Requirements

Make sure the title/menu screen works on different screen sizes.

Check:

- title does not overflow
- buttons remain clickable
- Candy character remains centered
- background scales properly
- no horizontal scrolling
- mobile view remains usable
- text/assets are not cropped
- buttons are large enough for touch

---

# Preserve Menu Functionality

Do not break existing menu behavior.

Confirm:

- Start Game starts the game
- Options opens the options screen/menu
- Credits opens the credits screen/menu
- Press Any Key still begins/advances if that behavior exists
- game loading still works after pressing Start Game
- no broken asset paths
- no console errors

---

# Soundtrack Tempo Update

Also slightly speed up the tempo of the game soundtrack throughout the game.

This means:

- menu soundtrack if one exists
- gameplay soundtrack
- level soundtrack
- battle/boss soundtrack if applicable

Do **not** make the music sound rushed or distorted.

The goal is a slight energy increase.

Suggested adjustment:

- increase playback speed/rate to around `1.05x` to `1.12x`
- start with `1.08x` if possible
- preserve pitch if the audio library supports it
- if pitch preservation is not possible, keep the increase subtle so it still sounds good

---

## Soundtrack Implementation Guidance

Depending on how audio is handled, look for:

```ts
audio.playbackRate
sound.rate
Howler.rate()
HTMLAudioElement.playbackRate
musicSpeed
tempo
backgroundMusic
levelMusic
battleMusic
bossMusic
```

Apply a consistent slight tempo increase across the game.

If different systems exist for menu music and gameplay music, update all relevant places.

---

# Soundtrack Testing

After updating the tempo, test:

- menu music plays
- gameplay music plays
- boss/battle music plays if available
- music is slightly faster
- music does not sound broken
- music does not restart repeatedly
- volume settings still work
- mute settings still work
- no audio errors in console

---

# What Not To Do

Do not:

- replace gameplay screen assets in this prompt
- break the existing game start flow
- hardcode layout in a way that fails on mobile
- ignore the ZIP assets
- keep the old menu assets if matching new assets exist
- speed the soundtrack up too aggressively
- distort the music badly
- remove button functionality
- remove options or credits

---

# Required Final Report

When finished, report:

1. Which menu assets were imported from the ZIP
2. Which old menu assets were replaced
3. Which file controls the title/menu screen
4. Which files were edited
5. Whether Start Game still works
6. Whether Options still works
7. Whether Credits still works
8. Whether Press Any Key still works
9. How the soundtrack tempo was sped up
10. What playback rate/tempo value was used
11. Whether menu/gameplay/boss music was tested
12. Any assets from the ZIP that were not used and why

---

# Final Instruction

Replace the current title/menu screen with the provided ZIP assets and make the menu look like the polished modern Candy in Wonderland title screen.

Then slightly speed up the soundtrack tempo throughout the game.

Do not hand this back until:
- the menu visually uses the provided assets
- all menu buttons still function
- the soundtrack tempo is slightly faster
- the build has been tested with no console errors
