# GoblinBox

GoblinBox is a cozy React + Vite playground for stashing the delightfully weird things you find online. Drop in screenshots, links, or little notes and the app will suggest which "nest" (collection) they should live in based on the keywords you curate.

## Highlights
- **Smarter auto-sorting** – The Goblin Oracle now weighs base keywords, your custom keywords, image names, and even URL fragments to pick the most relevant nest automatically.
- **Friendly nest management** – Duplicate nest names and keywords are prevented with inline feedback, so every collection stays unique.
- **Drag, drop, paste** – Images, URLs, and text can all be tossed into the hoard; cards can be edited or re-assigned after the fact.
- **Local persistence** – Your hoard and nests live in `localStorage`, so shinies are still there on refresh.

## Getting started
```bash
npm install
npm run dev
```
Then visit the printed URL (typically <http://localhost:5173>) to open the GoblinBox UI.

## Scripts
- `npm run dev` – start the Vite dev server with HMR.
- `npm run build` – produce a production build.
- `npm run preview` – serve the production build locally.
- `npm run lint` – run ESLint across the project.

## Project structure
- `src/App.jsx` – top-level orchestration: hoard state, filters, and nest management.
- `src/components/` – UI components such as `GoblinInput`, `GoblinCard`, and `NestManager`.
- `src/utils/keywordOracle.js` – heuristics for seeding new nests with starter keywords.
- `src/GoblinBox.css` – primary styling for the application.

Have fun hoarding!
