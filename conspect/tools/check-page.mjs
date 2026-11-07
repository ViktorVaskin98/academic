import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const loadKatex = async () => {
  const source = await readFile(path.join(root, 'assets/vendor/katex/katex.min.js'), 'utf8');
  const module = { exports: {} };
  new Function('module', 'exports', source)(module, module.exports);
  return module.exports.default ?? module.exports;
};
console.warn = () => {};
const katex = await loadKatex();

const decode = (value) => value
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

const lineOf = (html, index) => html.slice(0, index).split('\n').length;

function mathProblems(html) {
  const problems = [];
  const visible = html
    .replace(/<script[\s\S]*?<\/script>/g, (m) => ' '.repeat(m.length))
    .replace(/<style[\s\S]*?<\/style>/g, (m) => ' '.repeat(m.length))
    .replace(/<(pre|code)[\s\S]*?<\/\1>/g, (m) => ' '.repeat(m.length))
    .replace(/data-viz-config='[^']*'/g, (m) => ' '.repeat(m.length))
    .replace(/<\/?[A-Za-z!][^>]*>/g, (m) => '\u0001'.repeat(m.length));
  const pattern = /\$\$([^\u0001]+?)\$\$|\$([^$\u0001]+?)\$|\$/g;
  for (const match of visible.matchAll(pattern)) {
    if (match[0] === '$') {
      problems.push(`строка ${lineOf(html, match.index)}: непарный $`);
      continue;
    }
    const source = decode(match[1] ?? match[2]);
    try {
      katex.renderToString(source, { throwOnError: true, strict: "ignore", displayMode: Boolean(match[1]) });
    } catch (error) {
      problems.push(`строка ${lineOf(html, match.index)}: KaTeX — ${error.message.split('\n')[0]}`);
    }
  }
  return problems;
}

async function linkProblems(html, file) {
  const problems = [];
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    if (/^(https?:|mailto:)/.test(href)) {
      problems.push(`строка ${lineOf(html, match.index)}: внешняя ссылка ${href}`);
      continue;
    }
    const [target, anchor] = href.split('#');
    if (!target) {
      if (anchor && !ids.has(anchor)) problems.push(`строка ${lineOf(html, match.index)}: нет якоря #${anchor}`);
      continue;
    }
    const resolved = path.resolve(path.dirname(file), target);
    try {
      await access(resolved);
    } catch {
      problems.push(`строка ${lineOf(html, match.index)}: нет файла ${target}`);
      continue;
    }
    if (anchor && resolved.endsWith('.html')) {
      const other = await readFile(resolved, 'utf8');
      if (!other.includes(`id="${anchor}"`)) {
        problems.push(`строка ${lineOf(html, match.index)}: в ${target} нет якоря #${anchor}`);
      }
    }
  }
  return problems;
}

function structureProblems(html) {
  const problems = [];
  html.split('\n').forEach((line, index) => {
    if (/[\x00-\x08\x09\x0B\x0C\x0E-\x1F]/.test(line)) problems.push(`строка ${index + 1}: управляющий символ или TAB`);
  });
  const seen = new Map();
  for (const match of html.matchAll(/\sid="([^"]+)"/g)) {
    if (seen.has(match[1])) problems.push(`строка ${lineOf(html, match.index)}: повторный id="${match[1]}"`);
    seen.set(match[1], true);
  }
  for (const match of html.matchAll(/data-viz-config='([^']*)'/g)) {
    try {
      JSON.parse(match[1]);
    } catch {
      problems.push(`строка ${lineOf(html, match.index)}: data-viz-config не JSON`);
    }
  }
  const opens = (html.match(/<div[\s>]/g) || []).length;
  const closes = (html.match(/<\/div>/g) || []).length;
  if (opens !== closes) problems.push(`div: открыто ${opens}, закрыто ${closes}`);
  for (const tag of ['section', 'details', 'table', 'ol', 'ul', 'p']) {
    const open = (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
    const close = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    if (open !== close) problems.push(`${tag}: открыто ${open}, закрыто ${close}`);
  }
  return problems;
}

const files = process.argv.slice(2);
let total = 0;
for (const file of files) {
  const html = await readFile(file, 'utf8');
  const problems = [...structureProblems(html), ...mathProblems(html), ...await linkProblems(html, file)];
  total += problems.length;
  console.log(`${file}: ${problems.length ? `${problems.length} проблем` : 'чисто'}`);
  for (const problem of problems) console.log(`  ${problem}`);
}
process.exitCode = total ? 1 : 0;
