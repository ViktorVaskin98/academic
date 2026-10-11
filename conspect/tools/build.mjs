import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const BUNDLE_MODULES = [
  'assets/topology.js',
  'assets/finite-topology.js',
  'assets/mappings.js',
  'assets/metric.js',
  'assets/render.js',
  'assets/viz.js',
  'assets/widgets-bases.js',
  'assets/widgets-covers.js',
  'assets/widgets-separation.js',
  'assets/widgets-maps.js',
  'assets/app.js',
];

const CHEATSHEET_KINDS = new Set(['def', 'lemma', 'theorem', 'nb']);
const INDEX_SKIP_KINDS = new Set(['card']);

const IMPORT_PATTERN = /import\s*\{([^}]*)\}\s*from\s*['"]\.\/([\w-]+)\.js['"];/g;
const DECLARED_EXPORT_PATTERN = /^export\s+(?:async\s+)?(?:const|let|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm;
const LISTED_EXPORT_PATTERN = /^export\s*\{([^}]*)\}\s*;?/gm;

const splitNames = (list) => list.split(',').map((name) => name.trim()).filter(Boolean);

function wrapModule({ name, source }) {
  const exported = [
    ...[...source.matchAll(DECLARED_EXPORT_PATTERN)].map((match) => match[1]),
    ...[...source.matchAll(LISTED_EXPORT_PATTERN)].flatMap((match) => splitNames(match[1])),
  ];
  const body = source
    .replace(IMPORT_PATTERN, (_, names, file) => `const { ${splitNames(names).join(', ')} } = __modules['${file}'];`)
    .replace(LISTED_EXPORT_PATTERN, '')
    .replace(/^export\s+/gm, '');
  if (/^\s*import\s/m.test(body)) {
    throw new Error(`${name}: неподдерживаемый импорт, используй import { ... } from './file.js'`);
  }
  return [
    `/* ---- ${name} ---- */`,
    `__modules['${name}'] = (() => {`,
    body.trim(),
    `return { ${exported.join(', ')} };`,
    '})();',
  ].join('\n');
}

export function bundleModules(modules) {
  return [
    '/* Собрано автоматически: node tools/build.mjs. Правь модули в assets/, не этот файл. */',
    '(function () {',
    '"use strict";',
    'const __modules = {};',
    modules.map(wrapModule).join('\n\n'),
    '/*EXPOSE*/',
    '})();',
    '',
  ].join('\n');
}

export async function buildBundle() {
  const modules = [];
  for (const relative of BUNDLE_MODULES) {
    modules.push({
      name: path.basename(relative, '.js'),
      source: await readFile(path.join(root, relative), 'utf8'),
    });
  }
  const bundle = bundleModules(modules);
  await writeFile(path.join(root, 'assets/bundle.js'), bundle, 'utf8');
  return bundle.length;
}

const SYMBOLS = {
  varnothing: '∅', emptyset: '∅', subseteq: '⊆', subset: '⊂', supseteq: '⊇', supset: '⊃',
  cup: '∪', cap: '∩', bigcup: '⋃', bigcap: '⋂', sqcup: '⊔', in: '∈', notin: '∉',
  partial: '∂', times: '×', to: '→', infty: '∞', langle: '⟨', rangle: '⟩',
  geqslant: '⩾', leqslant: '⩽', geq: '⩾', leq: '⩽', neq: '≠', Rightarrow: '⇒', iff: '⟺',
  setminus: '\\', backslash: '\\', dots: '…', ldots: '…', quad: ' ', qquad: ' ',
  sum: 'Σ', forall: '∀', exists: '∃', alpha: 'α', tau: 'τ', varepsilon: 'ε', delta: 'δ',
  Delta: 'Δ', limits: '', textstyle: '', displaystyle: '', left: '', right: '', colon: ':',
};

const BLACKBOARD = {
  R: 'ℝ', Q: 'ℚ', N: 'ℕ', Z: 'ℤ', C: 'ℂ',
};

const LITERAL_OPEN = '\u0001';
const LITERAL_CLOSE = '\u0002';

export function latexToPlain(source) {
  return source
    .replace(/\$\$([\s\S]*?)\$\$/g, ' $1 ')
    .replace(/\$([^$]*)\$/g, '$1')
    .replace(/\\\{/g, LITERAL_OPEN)
    .replace(/\\\}/g, LITERAL_CLOSE)
    .replace(/\\mathbb\{([A-Z])\}/g, (_, letter) => BLACKBOARD[letter] || letter)
    .replace(/\\(?:mathrm|mathbf|text|operatorname)\{([^{}]*)\}/g, '$1')
    .replace(/\\t?frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
    .replace(/\\[,;:!]/g, ' ')
    .replace(/\\([A-Za-z]+)/g, (_, name) => (name in SYMBOLS ? SYMBOLS[name] : name))
    .replace(/[{}]/g, '')
    .replace(new RegExp(LITERAL_OPEN, 'g'), '{')
    .replace(new RegExp(LITERAL_CLOSE, 'g'), '}')
    .replace(/\s+/g, ' ')
    .replace(/([⟨([{])\s+/g, '$1')
    .replace(/\s+([⟩)\]}，,.;])/g, '$1')
    .trim();
}

const stripTags = (html) => html
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ')
  .replace(/\s+([,.;:!?)])/g, '$1')
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
    const latex = stripTags(withoutLabel);
    const body = latexToPlain(latex);
    entries.push({
      id,
      url: `${meta.url}#${id}`,
      kind,
      label: attribute(attrs, 'data-label') || id,
      title: attribute(attrs, 'data-title'),
      text: body.length > 320 ? `${body.slice(0, 317)}…` : body,
      latex,
      section: sectionAt(open.index),
      source: meta.source,
    });
  }

  return entries;
}

const SOURCE_KINDS = { lecture: 'Лекция', pract: 'Листок', kr: 'Пробная КР' };

export function sourceTitle(file) {
  const match = file.match(/^(lecture|pract|kr)-(\d+)\.html$/);
  return match ? `${SOURCE_KINDS[match[1]]} ${Number(match[2])}` : file.replace('.html', '');
}

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
  const searchable = entries.map(({ latex, ...rest }) => rest);
  await writeFile(
    path.join(root, 'assets/search-index.json'),
    `${JSON.stringify(searchable, null, 2)}\n`,
    'utf8',
  );
  await writeFile(
    path.join(root, 'assets/search-index.js'),
    `window.DIFGEM_INDEX = ${JSON.stringify(searchable)};\n`,
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
