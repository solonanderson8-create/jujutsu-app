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
  if (!techniques.some(t => t.category === c.id)) problems.push(`category "${c.id}" has no moves`);
});
techniques.forEach(t => {
  const cat = byId[t.category];
  if (!cat || cat.type !== 'category') problems.push(`"${t.id}" has unknown category "${t.category}"`);
  if (!['top', 'bottom', 'neutral'].includes(t.role)) problems.push(`"${t.id}" has bad role "${t.role}"`);
  if (!t.gi && !t.nogi) problems.push(`"${t.id}" is neither gi nor no-gi`);
  ['success', 'fail', 'related'].forEach(kind => t[kind].forEach(id => {
    if (!byId[id]) problems.push(`"${t.id}" ${kind} link points at missing "${id}"`);
    else if (id === t.id) problems.push(`"${t.id}" links to itself`);
  }));
});
flows.forEach(f => {
  if (!byId[f.from] || !byId[f.to]) problems.push(`flow ${f.from} -> ${f.to} has a missing end`);
});

if (problems.length) {
  console.error(problems.length + ' problem(s):\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`OK: ${positions.length} positions, ${categories.length} categories, ${techniques.length} moves, ${flows.length} flows.`);
