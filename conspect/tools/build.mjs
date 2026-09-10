import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const BUNDLE_MODULES = [
  'assets/topology.js',
  'assets/finite-topology.js',
  'assets/render.js',
  'assets/viz.js',
  'assets/app.js',
];

const CHEATSHEET_KINDS = new Set(['def', 'lemma', 'theorem', 'nb']);
const INDEX_SKIP_KINDS = new Set(['card']);

const stripModuleSyntax = (source) => source
  .replace(/import\s+[^;]*?from\s+['"][^'"]+['"];/g, '')
  .replace(/export\s*\{[^}]*\}\s*;?/g, '')
  .replace(/^export\s+/gm, '');

export async function buildBundle() {
  const parts = [];
  for (const relative of BUNDLE_MODULES) {
    const source = await readFile(path.join(root, relative), 'utf8');
    parts.push(`/* ---- ${relative} ---- */\n${stripModuleSyntax(source).trim()}`);
  }
  const bundle = [
    '/* Собрано автоматически: node tools/build.mjs. Правь модули в assets/, не этот файл. */',
    '(function () {',
    '"use strict";',
    parts.join('\n\n'),
    '})();',
    '',
  ].join('\n');
  await writeFile(path.join(root, 'assets/bundle.js'), bundle, 'utf8');
  return bundle.length;
}

const stripTags = (html) => html
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ')
  .trim();

const attribute = (tag, name) => {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`));
  return match ? match[1] : '';
};

function matchingCloseIndex(html, openTagEnd) {
  const tagPattern = /<(\/?)div\b[^>]*>/g;
  tagPattern.lastIndex = openTagEnd;
  let depth = 1;
  for (const tag of (function* iterate() {
    let found = tagPattern.exec(html);
    while (found) {
      yield found;
      found = tagPattern.exec(html);
    }
  })()) {
    depth += tag[1] === '/' ? -1 : 1;
    if (depth === 0) return tag.index;
  }
  return html.length;
}

export function extractEntries(html, meta) {
  const entries = [];
  const markers = [];

  for (const heading of html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)) {
    markers.push({
      at: heading.index,
      section: stripTags(heading[1]).replace(/#\s*$/, '').trim(),
    });
  }

  const sectionAt = (position) => {
    let current = '';
    for (const marker of markers) {
      if (marker.at < position) current = marker.section;
    }
    return current;
  };

  for (const open of html.matchAll(/<div\s+class="block block--([a-z]+)"([^>]*)>/g)) {
    const kind = open[1];
    const attrs = open[2];
    const id = attribute(attrs, 'id');
    if (!id || INDEX_SKIP_KINDS.has(kind)) continue;
    const openTagEnd = open.index + open[0].length;
    const inner = html.slice(openTagEnd, matchingCloseIndex(html, openTagEnd));
    const withoutLabel = inner.replace(/<div class="block__label">[\s\S]*?<\/div>/, '');
    const body = stripTags(withoutLabel);
    entries.push({
      id,
      url: `${meta.url}#${id}`,
      kind,
      label: attribute(attrs, 'data-label') || id,
      title: attribute(attrs, 'data-title'),
      text: body.length > 320 ? `${body.slice(0, 317)}…` : body,
      section: sectionAt(open.index),
      source: meta.source,
    });
  }

  return entries;
}

const SOURCE_TITLES = {
  'lecture-01.html': 'Лекция 1',
  'pract-01.html': 'Практика 1',
};

const sourceTitle = (file) => SOURCE_TITLES[file]
  || file.replace('.html', '').replace('lecture-', 'Лекция ').replace('pract-', 'Практика ');

async function collectEntries() {
  const entries = [];
  for (const folder of ['lectures', 'pract']) {
    let files = [];
    try {
      files = await readdir(path.join(root, folder));
    } catch {
      continue;
    }
    for (const file of files.filter((name) => name.endsWith('.html')).sort()) {
      const html = await readFile(path.join(root, folder, file), 'utf8');
      const found = extractEntries(html, {
        url: `${folder}/${file}`,
        source: sourceTitle(file),
      });
      entries.push(...found);
      console.log(`${folder}/${file}: ${found.length} записей`);
    }
  }
  return entries;
}

async function main() {
  const bundleSize = await buildBundle();
  console.log(`assets/bundle.js: ${(bundleSize / 1024).toFixed(1)} КБ`);

  const entries = await collectEntries();
  await writeFile(
    path.join(root, 'assets/search-index.json'),
    `${JSON.stringify(entries, null, 2)}\n`,
    'utf8',
  );
  await writeFile(
    path.join(root, 'assets/search-index.js'),
    `window.DIFGEM_INDEX = ${JSON.stringify(entries)};\n`,
    'utf8',
  );
  const cheatsheet = entries.filter((entry) => CHEATSHEET_KINDS.has(entry.kind));
  await writeFile(
    path.join(root, 'assets/cheatsheet-data.js'),
    `window.DIFGEM_CHEATSHEET = ${JSON.stringify(cheatsheet)};\n`,
    'utf8',
  );
  console.log(`всего в индексе: ${entries.length}, в шпаргалке: ${cheatsheet.length}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main();
}
