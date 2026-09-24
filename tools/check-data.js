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
Object.entries(window.JJ.aliases).forEach(([id, list]) => {
  if (!byId[id]) problems.push(`nickname list points at missing "${id}"`);
  if (!Array.isArray(list) || !list.length) problems.push(`nickname list for "${id}" is empty`);
});
Object.entries(window.JJ.renamed).forEach(([old, now]) => {
  if (byId[old]) problems.push(`old id "${old}" still exists (should be merged into "${now}")`);
  if (!byId[now]) problems.push(`renamed id "${old}" points at missing "${now}"`);
});
flows.forEach(f => {
  if (!byId[f.from] || !byId[f.to]) problems.push(`flow ${f.from} -> ${f.to} has a missing end`);
});

if (problems.length) {
  console.error(problems.length + ' problem(s):\n  ' + problems.join('\n  '));
  process.exit(1);
}
const places = techniques.reduce((n, t) => n + t.places.length, 0);
console.log(`OK: ${positions.length} positions, ${categories.length} categories, ${techniques.length} moves in ${places} places, ${flows.length} flows.`);
