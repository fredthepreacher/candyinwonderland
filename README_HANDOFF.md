# Candy in Wonderland — developer handoff

This package contains the current game source and public assets, plus the parent pnpm workspace manifest and lockfile needed by its catalog dependencies.

## Run from this folder

Install Node.js 22.12 or newer and pnpm 11.6.0. The existing dependency list includes Windows-specific native packages; this handoff targets Windows.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:5179. Keep this entire folder structure together.

```sh
pnpm build
pnpm preview
```

The root commands use vite.config.local.ts. The app's older scripts and vite.config.ts still reference its original Replit environment; use the root commands above.

## Code map

- artifacts/candy-in-wonderland/src/game/GameEngine.ts: movement, collision, gameplay and Canvas rendering
- src/game/PixiGlow.ts: PixiJS effects overlay (paths below are relative to the app)
- src/components: menu, HUD, controls and dialogue
- src/data: levels and bosses
- public/assets: game artwork

Browser saves are stored on the original browser/device and are not included. Dependencies and generated builds are omitted; install recreates dependencies. Source and artwork are preserved unchanged. This is a development handoff, not a claim of release readiness. Proper directional sprites, background/collision alignment, effects zoom alignment and transition cleanup remain review priorities. No complete gameplay or physical-device regression test was performed for packaging.
