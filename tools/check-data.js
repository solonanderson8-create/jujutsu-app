#!/usr/bin/env node
/*
 * Checks js/data.js for mistakes: typos in links, missing categories,
 * duplicate ids, bad roles. Run it after every data edit:
 *
 *   node tools/check-data.js
 */
global.window = {};
require('../js/data.js');
const { positions, categories, techniques, flows } = window.JJ.data;
const byId = window.JJ.byId;
const problems = [];

const all = [...positions, ...categories, ...techniques];
if (Object.keys(byId).length !== all.length) {
  const seen = new Set();
  all.forEach(n => { if (seen.has(n.id)) problems.push(`duplicate id "${n.id}"`); seen.add(n.id); });
}
categories.forEach(c => {
  if (!byId[c.position]) problems.push(`category "${c.id}" points at missing position "${c.position}"`);
  if (!techniques.some(t => t.places.some(pl => pl.category === c.id))) problems.push(`category "${c.id}" has no moves`);
});
techniques.forEach(t => {
  if (!t.gi && !t.nogi) problems.push(`"${t.id}" is neither gi nor no-gi`);
  const seen = new Set();
  t.places.forEach(pl => {
    const where = `"${t.id}" at ${pl.category}`;
    const cat = byId[pl.category];
    if (!cat || cat.type !== 'category') problems.push(`${where}: unknown category`);
    if (seen.has(pl.category)) problems.push(`${where}: same place listed twice`);
    seen.add(pl.category);
    if (!['top', 'bottom', 'neutral'].includes(pl.role)) problems.push(`${where}: bad role "${pl.role}"`);
    ['success', 'fail', 'related'].forEach(kind => {
      if (new Set(pl[kind]).size !== pl[kind].length) problems.push(`${where}: ${kind} lists a link twice`);
      pl[kind].forEach(id => {
        if (!byId[id]) problems.push(`${where}: ${kind} link points at missing "${id}"`);
        else if (id === t.id) problems.push(`${where}: links to itself`);
      });
    });
  });
});
const BELTS = ['white', 'blue', 'purple', 'brown', 'black'];
techniques.forEach(t => { if (!(t.id in window.JJ.levels)) problems.push(`"${t.id}" has no belt level`); });
Object.entries(window.JJ.levels).forEach(([id, lv]) => {
  if (!byId[id] || byId[id].type !== 'technique') problems.push(`belt level for unknown move "${id}"`);
  const m = /^(\w+) ([0-4])$/.exec(lv);
  if (!m || !BELTS.includes(m[1])) problems.push(`"${id}" has a bad belt level "${lv}" (use e.g. 'blue 2')`);
});
Object.entries(window.JJ.aliases).forEach(([id, list]) => {
  if (!byId[id]) problems.push(`nickname list points at missing "${id}"`);
  if (!Array.isArray(list) || !list.length) problems.push(`nickname list for "${id}" is empty`);
});
// Every name the journal spots (full name, bracket parts, nicknames) must belong
// to one move or position only, or a journal word would link to the wrong one.
{
  const norm = s => s.toLowerCase().replace(/&/g, 'and').replace(/[\s-]+/g, ' ').trim();
  const owner = {};
  const claim = (word, id) => {
    const k = norm(word);
    if (owner[k] && owner[k] !== id) problems.push(`"${word}" is a name for both "${owner[k]}" and "${id}" (the journal can't tell them apart)`);
    owner[k] = id;
  };
  [...positions, ...techniques].forEach(n => {
    claim(n.name, n.id);
    const m = n.name.match(/^(.*?)\s*\((.*)\)\s*$/);
    if (m) { claim(m[1], n.id); claim(m[2], n.id); }
  });
  Object.entries(window.JJ.aliases).forEach(([id, list]) => (list || []).forEach(a => claim(a, id)));
}
Object.entries(window.JJ.renamed).forEach(([old, now]) => {
  if (byId[old]) problems.push(`old id "${old}" still exists (should be merged into "${now}")`);
  if (!byId[now]) problems.push(`renamed id "${old}" points at missing "${now}"`);
});
flows.forEach(f => {
  if (!byId[f.from] || !byId[f.to]) problems.push(`flow ${f.from} -> ${f.to} has a missing end`);
});

// Version tags: index.html's ?v= numbers must all match sw.js's CACHE version.
{
  const fs = require('fs'), path = require('path');
  const swVer = (fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8').match(/jj-flow-v(\d+)/) || [])[1];
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const local = [...html.matchAll(/(?:href|src)="((?:styles\.css|js\/[\w-]+\.js)[^"]*)"/g)].map(m => m[1]);
  local.forEach(src => {
    const v = (src.match(/\?v=(\d+)$/) || [])[1];
    if (v !== swVer) problems.push(`index.html loads "${src}" but sw.js is version ${swVer} (run: node tools/bump-version.js)`);
  });
}

if (problems.length) {
  console.error(problems.length + ' problem(s):\n  ' + problems.join('\n  '));
  process.exit(1);
}
const places = techniques.reduce((n, t) => n + t.places.length, 0);
console.log(`OK: ${positions.length} positions, ${categories.length} categories, ${techniques.length} moves in ${places} places, ${flows.length} flows.`);
