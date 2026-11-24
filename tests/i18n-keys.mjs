// Scans the storefront sources for translation keys and checks that every key exists in all four dictionaries,
// and that the four dictionaries have identical key sets.   Usage: node tests/i18n-keys.mjs [--list]
import fs from 'node:fs';
import path from 'node:path';

const roots = ['src/components/store', 'src/app/(store)', 'src/lib/client'];
const files = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : /\.(tsx?|mjs)$/.test(e.name) && files.push(p); } };
roots.forEach((r) => fs.existsSync(r) && walk(r));

const used = new Set();
const dynamicPrefixes = new Set();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*'([a-z][\w.]*)'/g)) (m[1].endsWith('.') ? dynamicPrefixes : used).add(m[1]);
  for (const m of src.matchAll(/\bt\(\s*`([a-z][\w.]*\.)\$\{/g)) dynamicPrefixes.add(m[1]);
  for (const m of src.matchAll(/\bt\(\s*'([a-z][\w.]*\.)'\s*\+/g)) dynamicPrefixes.add(m[1]);
  for (const m of src.matchAll(/(?:key|labelKey):\s*'([a-z]+\.[\w.]*)'/g)) used.add(m[1]);
  for (const m of src.matchAll(/\['\/[^']*',\s*'([a-z][\w.]*)'\]/g)) used.add(m[1]);
}
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? flat(v, `${p}${k}.`) : [`${p}${k}`]));
const dict = Object.fromEntries(['tet', 'pt', 'en', 'id'].map((l) => [l, new Set(flat(JSON.parse(fs.readFileSync(`src/messages/${l}.json`, 'utf8'))))]));

let bad = 0;
for (const l of Object.keys(dict)) {
  const missing = [...used].filter((k) => !dict[l].has(k));
  if (missing.length) { bad += missing.length; console.log(`✘ ${l}: ${missing.length} missing used keys\n   ${missing.join('\n   ')}`); }
}
for (const l of ['tet', 'pt', 'id']) {
  const a = [...dict.en].filter((k) => !dict[l].has(k)), b = [...dict[l]].filter((k) => !dict.en.has(k));
  if (a.length || b.length) { bad += a.length + b.length; console.log(`✘ ${l} parity vs en: missing ${a.join(', ') || '-'} | extra ${b.join(', ') || '-'}`); }
}
for (const p of dynamicPrefixes) if (![...dict.en].some((k) => k.startsWith(p))) { bad++; console.log(`✘ no keys under dynamic prefix ${p}`); }
if (process.argv.includes('--list')) console.log([...used].sort().join('\n'), '\nDYNAMIC:', [...dynamicPrefixes].join(', '));
console.log(bad ? `\n${bad} problem(s)` : `✔ ${used.size} static keys (+${dynamicPrefixes.size} dynamic prefixes) present in tet/pt/en/id with identical key sets`);
process.exit(bad ? 1 : 0);
