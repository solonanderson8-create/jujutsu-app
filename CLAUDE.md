# Jujutsu Flow — notes for Claude

The owner edits content by asking Claude, so most requests are **data edits in `js/data.js`**.

## The owner
- They are learning to code. Keep explanations short and scannable (headers, bullets), and use physical/mechanical analogies.
- Be honest: if a technique link or description is wrong, say so.

## Names the owner uses
- **The web**: the main zoomable graph view (`#graph`, drawn by `js/graph.js`).
- **Technique page**: the panel that opens when you tap a move on the web (`#panel`, built by `js/panel.js`).
- **Position page**: the same panel when you tap a position bubble (working name, not yet confirmed by the owner).

## UX baseline (decided with the owner, Sep 2026)
Main uses: **studying at home** and **logging after class** (not quick gym lookups).
- **Opens on** the whole web, zoomed out. **Fixed map** layout (no physics, no dragging). Top bar only: search, **one Filter dropdown** (top/bottom + gi/no-gi), Journal, Flashcards, belt, theme. The owner removed the zoom buttons and the Positions/Categories/Moves slider (Nov 2026): zoom is pinch/scroll and tapping bubbles.
- **Technique page**: on iPad it takes about **half the screen** (web still visible). Order: description first, then works/fails/related, then video. Text size stays as is.
- **Notes, two kinds**:
  1. *Move notes* — per move, in the Notes tab (built).
  2. *Training journal* (built, `js/journal.js`) — opened from a **Journal button on the web**, shown in the same half-screen page. Entries are **free writing + date**, oldest first. Move and position names are **auto-spotted** (longest name first, whole words, no AI) and become links; a wrong match can be unlinked per entry. A move's Notes tab shows "My notes" then **"From my training journal"** snippets that open the full entry.
     - Slang/nicknames for spotting live in `aliases` in `js/data.js` (e.g. `rnc: ['RNC', 'rear naked']`). Full names and bracketed parts are spotted automatically.
- **Same move in several positions** (Armbar, Kimura, Arm Triangle, Cross Collar Choke): **one move, many places** — one set of notes, the page lists every position it's done from.
- **First visit**: short, skippable **guided tour** (zoom levels → tap a move → Notes tab → Journal), replayable from a help button.
- **Search** covers everything: move/position names, move notes and journal text, grouped by type.

## Planned: belt levels + flashcards (decided with the owner, Nov 2026)
- **Belt levels** (engine built: `js/belts.js`, ranks in `levels` in `js/data.js`, format `'blue 2'`; every move must have one — check-data enforces it): every move gets a belt + stripe (White→Black, 4 stripes each). The user **picks their belt** on first visit; **on by default**, switchable off ("show everything"). Moves above your level show **faded with a belt tag** (tap = name + "Blue belt move", details locked).
- Claude drafts each move's level from common curricula; every assignment must be listed in one reviewable place so a coach can correct it. Gyms vary — say so.
- Library (Nov 2026): **282 moves in 314 places**, white → black. 15 positions incl. Self-Defense and Leg Entanglements. The early "~400" target was a guess: past ~300, new entries become variations of existing moves, so add moves the owner's gym actually teaches rather than padding. Belt levels are drafts for the coach-review doc.
- `check-data.js` also refuses two moves/positions sharing a name, bracket part or nickname (the journal couldn't tell them apart). Avoid context words in brackets, e.g. "Punch Block (Closed Guard)" would steal "closed guard".
- The web layout scales itself: category rings grow 20 units per move and positions spread apart so zones never overlap (`layout()` in `js/graph.js`). 20 is the tightest spacing where move names don't collide (tested); the zoom-out limit `K_MIN` must still let the whole web fit a phone.
- **Flashcards** (built: engine `js/cards.js`, screens `js/study.js`; cards are generated from the moves data, so new moves bring their own cards; wrong-answer options never include anything the move links to): **full-screen study mode**. Card types: if-it-works / if-it-fails (select all that apply, 5 options), description → name, move → position. **Spaced repetition**: missed cards return sooner; rank never drops. **Promotion**: mastering the next stripe's cards **unlocks a stripe test**; passing it earns the stripe.
- **Phone technique page** snaps to **peek / half / full** via a drag handle.

## Colour themes (owner's Behr paint picks)
- All colours live in the `[data-theme="…"]` blocks at the top of `styles.css`; nothing else hard-codes colour. Use roles (`--bg`, `--surface`, `--accent`, `--success`, `--fail`…).
- **Light**: web background Sunflower Seed `#FFE3AC` · pages Rumors `#744245` · contrast Joyful Orange `#FA9335` · works arrow Trailing Vine `#5A6952` · fails arrow Plantain Chips `#D6A550`.
- **Dark**: web background Midnight Blue `#445C73` · pages Nocturne Blue `#2E4D6A` · contrast Extreme Yellow `#FFB729` · works arrow Pistachio `#B9C04F` · fails arrow Sizzling Sunset `#EB7E4D`. (Midnight, Nocturne and Pistachio were matched to the owner's paint-card photo; the published hex codes looked greyer/duller.)
- The contrast colour marks "you are here": active tab, active filter, active zoom level.
- Seasonal themes (planned): add a new `[data-theme="name"]` block + the name to `THEMES` in `js/app.js`.

## Data rules (js/data.js)
- Every technique: `t(id, name, category, style, role, desc, success, fail, related)` — this sets its first **place**.
  - `style`: `'both' | 'gi' | 'nogi'`. `role`: `'top' | 'bottom' | 'neutral'` (neutral = both standing).
  - A move done from more positions gets extra places via `also(id, category, role, success, fail, related)` in `extraPlaces`. Each place has its own role and links; name, description, notes and video are shared. Never create a second copy of a move — add a place instead.
  - On the web each place is a "spot" (`JJ.spots`); links are drawn to the nearest spot of the target move.
  - Merged/renamed ids go in `renamed` (+ `renamedPlace`) so old notes and links carry over.
  - Categories are grouped by what the move *does* (Submissions, Escapes, Sweeps…), not by top/bottom. Top/bottom lives on each move's `role`.
  - Links (`success`, `fail`, `related`) hold ids of techniques or positions.
- Descriptions: 1–2 plain sentences, ideally with a physical analogy.
- Don't invent video URLs. Videos are pasted by users for now.
- After any data edit, run `node tools/check-data.js`. It must print `OK`.

## Accounts + sync (built Nov 2026, Supabase)
- Optional. Off until `js/config.js` has the project URL + public (anon/publishable) key; then a person button appears in the top bar. Setup steps for the owner: `supabase/SETUP.md`. **Never** put the service_role/secret key anywhere.
- Database: `supabase/schema.sql` (one `records` table, row-level security so people only see their own rows; `delete_my_account()`). `supabase/security-test.sql` must print all PASS — re-run it after any schema change.
- `js/sync.js`: email **6-digit code** sign-in (not magic links: on iPhone a link opens Safari, not the home-screen app), and sync. Each note / journal entry / video / flashcard / belt is its own record; local storage stays the source of truth (offline-first). Same record changed on two devices → newest wins (cards: latest study; belt: higher rank). A different person signing in on a device clears the previous person's data off it.
- Any new kind of personal data must be added to `readLocal`/`applyLocal` in `sync.js` and must call `JJ.Sync.changed()` when saved, or it won't sync.
- `js/account.js` is the account card; `privacy.html` is the privacy page (keep it honest and dated if what's stored changes).

## App
- Plain HTML/CSS/JS with no build step, loaded as classic scripts that share `window.JJ`.
- `sw.js` caches files for offline use. If you add a new file the app loads, add it to `FILES` in `sw.js`.
- **Every release: run `node tools/bump-version.js`** — it bumps `CACHE` in `sw.js` and the `?v=N` tags on every local CSS/JS file in `index.html` together, so a device never runs a new page with old cached parts (that caused an iPad bug once). `check-data.js` fails if the tags and `CACHE` disagree.
- Bottom-sheet vs side-panel breakpoint is defined twice: `SHEET_QUERY` in `js/app.js` and the matching `@media` in `styles.css`. Keep them in sync.
- Deploys to GitHub Pages from `main` via `.github/workflows/pages.yml`.
