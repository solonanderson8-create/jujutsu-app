#!/usr/bin/env node
/*
 * Bumps the app's version number everywhere it appears, so every device
 * fetches the new files together (no new page with old parts):
 *   - sw.js:      const CACHE = 'jj-flow-vN'
 *   - index.html: styles.css?v=N, js/*.js?v=N
 * Run before each release:  node tools/bump-version.js
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const swPath = path.join(root, 'sw.js'), htmlPath = path.join(root, 'index.html');

let sw = fs.readFileSync(swPath, 'utf8');
const m = sw.match(/const CACHE = 'jj-flow-v(\d+)';/);
if (!m) { console.error('Could not find the CACHE line in sw.js'); process.exit(1); }
const next = +m[1] + 1;
sw = sw.replace(m[0], `const CACHE = 'jj-flow-v${next}';`);
fs.writeFileSync(swPath, sw);

let html = fs.readFileSync(htmlPath, 'utf8');
html = html.replace(/((?:href|src)="(?:styles\.css|js\/[\w-]+\.js))(?:\?v=\d+)?"/g, `$1?v=${next}"`);
fs.writeFileSync(htmlPath, html);
console.log(`Version is now ${next}.`);
