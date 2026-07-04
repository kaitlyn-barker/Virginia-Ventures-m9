# Virginia Ventures — Module 9 ("Pitch Day")

A walkable WebXR economics game built with the [Immersive Web SDK (IWSDK)](https://github.com/meta-quest/immersive-web-sdk). You are a young founder building a Virginia startup: choose your **product**, **price**, and **marketing** at three plan stations — naming the problem you solve and the customer you serve along the way — while a mentor teaches the economics behind each choice (specialization, supply and demand, markets, and opportunity cost). Then you **pitch three investors** (Smart Money, Customers, Low Risk), answer their follow-up questions, and win them over.

Aimed at 5th graders. Runs in any WebXR-capable browser on desktop (mouse + keyboard) and enters Immersive VR on a headset.

## Play

- **Walk:** `WASD` / arrow keys (or thumbstick in VR)
- **Look:** right-mouse drag (the headset owns the view in VR)
- **Interact:** left-click panels and cards (or point-and-trigger in VR)

Follow the opening tutorial, build your plan at the three stations, then tap **Deliver your pitch** to face the investor panel. Each station reviews cleanly if you reopen it (your work is never lost), and every panel has a **Go back** button.

## Flow

1. **Opening** — goal card + a short host walkthrough; the stations unlock when it ends (or you Skip).
2. **Plan stations** (Product / Price / Marketing) — pick a business choice, name the problem/customer, pass a quick concept check, and confirm. Your choices fill the wall plan board.
3. **The pitch** — three parts (opening → economic case → the ask); each card targets one investor and fills their confidence meter.
4. **Investor questions** — each investor asks one follow-up conditioned on your plan; a strong answer earns confidence.
5. **Results** — per-investor reactions, a headline naming your biggest supporter, and a recap with reflection prompts for the classroom debrief. A one-line `[M9-RESULT]` JSON is logged to the console for LMS/teacher use.

## Develop

Requires Node `>=20.19` (or `>=22.12`).

```bash
npm install
npm run dev        # start the IWSDK dev server (HTTPS via mkcert) — https://localhost:8081/
npm run typecheck  # tsc --noEmit
npm run build      # production build to dist/
npm run preview    # preview the production build
```

UI panels are authored in `ui/*.uikitml` and compiled to `public/ui/*.json` at build time by the Vite UIKitML plugin (`public/ui/` is gitignored — regenerated on build). Game logic lives in `src/`: `index.ts` is the world entry point and game flow; `environment.ts` builds the scene (room, stations, investors, desk, plan board); `sfx.ts` provides the synth audio.

## Deploy

Pushing to `main` triggers the GitHub Actions workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds the project and publishes `dist/` to GitHub Pages. The Vite `base` switches automatically (`'/Virginia-Ventures-m9/'` in production via `NODE_ENV`, `'/'` for local dev), so a push can't ship a broken base path. Live at https://kaitlyn-barker.github.io/Virginia-Ventures-m9/.

## Tech

[IWSDK](https://github.com/meta-quest/immersive-web-sdk) (ECS + reactive signals over Three.js) · [Vite](https://vitejs.dev/) · TypeScript · WebXR.
