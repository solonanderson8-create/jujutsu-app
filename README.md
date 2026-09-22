# Jujutsu Flow

A zoomable flow chart of jiu-jitsu. It shows how positions and techniques connect, so you can see how you'd flow from one move to the next.

## How to open it

Double-click `index.html`. It opens in your browser. There's nothing to install.

## How to use it

| Do this | What happens |
|---|---|
| Scroll / pinch | Zoom through the 3 levels: **Positions → Categories → Moves** |
| Drag | Move around the map |
| Tap a position | Zoom in and see where it leads |
| Tap a category | Zoom in to see its moves |
| Tap a move | Open its detail panel |
| `/` key | Jump to search |
| Gi / No-Gi buttons | Dim moves that don't fit that style |

Inside a move's panel:
- **✓ If it works:** where to go next
- **↻ If it fails:** what to switch to
- **∼ Related:** similar or connected moves
- **Video:** paste any YouTube link and it embeds
- **My notes:** saved automatically on this device

## How the code is laid out

Think of it like a machine with four parts:

| File | Job | Analogy |
|---|---|---|
| `js/data.js` | Every position, category and move, and their links | The parts list |
| `js/graph.js` | Draws the map, handles zoom and pan | The engine + camera |
| `js/panel.js` | The detail sheet for a move | The dashboard readout |
| `js/app.js` | Connects everything: search, filters, buttons | The wiring harness |
| `styles.css` | Colours and layout | The paint job |

**To add a move**, add one `t(...)` line in `js/data.js` under the right category. The map places it automatically.

## Ideas for later

- Drag nodes around by hand (like Apple Freeform)
- Shared community notes and comments (needs a server and database)
- Curated video links for each move
- Let people add their own moves and links from inside the app
