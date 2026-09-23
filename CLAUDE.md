# Jujutsu Flow — notes for Claude

The owner edits content by asking Claude, so most requests are **data edits in `js/data.js`**.

## The owner
- They are learning to code. Keep explanations short and scannable (headers, bullets), and use physical/mechanical analogies.
- Be honest: if a technique link or description is wrong, say so.

## Names the owner uses
- **The web**: the main zoomable graph view (`#graph`, drawn by `js/graph.js`).
- **Technique page**: the panel that opens when you tap a move on the web (`#panel`, built by `js/panel.js`).
- **Position page**: the same panel when you tap a position bubble (working name, not yet confirmed by the owner).

## Data rules (js/data.js)
- Every technique: `t(id, name, category, style, role, desc, success, fail, related)`.
  - `style`: `'both' | 'gi' | 'nogi'`. `role`: `'top' | 'bottom' | 'neutral'` (neutral = both standing).
  - Categories are grouped by what the move *does* (Submissions, Escapes, Sweeps…), not by top/bottom. Top/bottom lives on each move's `role`.
  - Links (`success`, `fail`, `related`) hold ids of techniques or positions.
- Descriptions: 1–2 plain sentences, ideally with a physical analogy.
- Don't invent video URLs. Videos are pasted by users for now.
- After any data edit, run `node tools/check-data.js`. It must print `OK`.

## App
- Plain HTML/CSS/JS with no build step, loaded as classic scripts that share `window.JJ`.
- `sw.js` caches files for offline use. If you add a new file the app loads, add it to `FILES` in `sw.js` and bump `CACHE`.
- Bottom-sheet vs side-panel breakpoint is defined twice: `SHEET_QUERY` in `js/app.js` and the matching `@media` in `styles.css`. Keep them in sync.
- Deploys to GitHub Pages from `main` via `.github/workflows/pages.yml`.
