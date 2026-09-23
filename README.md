# Jujutsu Flow

A zoomable flow chart of jiu-jitsu. It shows how positions and techniques connect, so you can see how you'd flow from one move to the next. Built phone- and tablet-first, and it works offline once it has been opened once.

## How to open it

- **Quick look:** double-click `index.html`.
- **On your phone:** open the published site (see *Publishing* below), then use *Share → Add to Home Screen*. It opens like an app and works with no signal.

## How to use it

| Do this | What happens |
|---|---|
| Pinch / scroll | Zoom through the 3 levels: **Positions → Categories → Moves** |
| Drag | Move around the map |
| Tap a position | Zoom in and see where it leads |
| Tap a category | Zoom in to see its moves |
| Tap a move | Open its detail panel |
| **Top / Bottom** buttons | Show only moves for when you're on top, or on bottom |
| **Gi / No-Gi** buttons | Show only moves for that style |

On the map, a **solid dot** means you're on **top**. A **hollow ring** means you're on **bottom**. Standing moves are solid.

Inside a move's panel:
- **✓ If it works:** where to go next
- **↻ If it fails:** what to switch to
- **∼ Related:** similar or connected moves
- **Video:** paste any YouTube link and it embeds
- **My notes:** saved automatically on this device

## How the code is laid out

| File | Job | Analogy |
|---|---|---|
| `js/data.js` | Every position, category and move, and their links | The parts list |
| `js/graph.js` | Draws the map, handles zoom and pan | The engine + camera |
| `js/panel.js` | The detail sheet for a move | The dashboard readout |
| `js/app.js` | Connects everything: search, filters, buttons | The wiring harness |
| `styles.css` | Colours and layout | The paint job |
| `sw.js` | Saves a copy for offline use | The backpack |
| `tools/check-data.js` | Checks the data for broken links | The inspection gauge |

**To add or change a move**, edit its `t(...)` line in `js/data.js`, then run `node tools/check-data.js` to catch typos.

## Publishing (GitHub Pages, free)

`.github/workflows/pages.yml` publishes the site every time `main` changes. One-time setup:
1. On GitHub, go to the repo's **Settings → Pages**.
2. Under **Source**, pick **GitHub Actions**.
3. Merge this branch into `main`.

The site will be at `https://<your-username>.github.io/jujutsu-app/`.

## Roadmap

- **Now:** public map, private notes on each device, works offline
- **Next:** accounts and shared community notes/comments (needs a database, e.g. Supabase)
- **Later:** curated videos for each move, more positions and moves
