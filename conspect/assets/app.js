import { mountAll } from './viz.js';

const THEME_KEY = 'difgem-theme';
const PROGRESS_KEY = 'difgem-progress';
const CARDS_KEY = 'difgem-cards';

const readStore = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeStore = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* приватный режим — просто не запоминаем */
  }
};

export const readProgress = () => readStore(PROGRESS_KEY, {});
export const readCards = () => readStore(CARDS_KEY, {});

function renderMath(root = document.body) {
  if (!window.renderMathInElement) return;
  window.renderMathInElement(root, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
    ],
    ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
    throwOnError: false,
  });
}

function initTheme() {
  const stored = readStore(THEME_KEY, 'dark');
  const apply = (theme) => {
    document.documentElement.dataset.theme = theme;
    writeStore(THEME_KEY, theme);
    for (const button of document.querySelectorAll('[data-theme-toggle]')) {
      button.textContent = theme === 'dark' ? 'светлая тема' : 'тёмная тема';
    }
    document.dispatchEvent(new Event('difgem:themechange'));
  };
  apply(stored === 'light' ? 'light' : 'dark');
  for (const button of document.querySelectorAll('[data-theme-toggle]')) {
    button.addEventListener('click', () => {
      apply(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  }
}

function initToc() {
  const host = document.querySelector('[data-toc]');
  if (!host) return;
  const headings = [...document.querySelectorAll('main h2[id], main h3[id]')];
  if (headings.length === 0) return;

  const list = document.createElement('ul');
  const links = new Map();
  for (const heading of headings) {
    const item = document.createElement('li');
    item.className = `toc__level-${heading.tagName === 'H2' ? 2 : 3}`;
    const link = document.createElement('a');
    link.href = `#${heading.id}`;
    link.textContent = heading.dataset.short || heading.textContent.replace(/#$/, '').trim();
    item.appendChild(link);
    list.appendChild(item);
    links.set(heading.id, link);
  }
  host.appendChild(list);

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of links.values()) link.classList.remove('is-active');
      links.get(entry.target.id)?.classList.add('is-active');
    }
  }, { rootMargin: '-15% 0px -75% 0px', threshold: 0 });

  for (const heading of headings) observer.observe(heading);
}

function initAnchors() {
  for (const heading of document.querySelectorAll('main h2[id], main h3[id]')) {
    const anchor = document.createElement('a');
    anchor.className = 'anchor';
    anchor.href = `#${heading.id}`;
    anchor.textContent = '#';
    anchor.setAttribute('aria-label', 'ссылка на раздел');
    heading.appendChild(anchor);
  }
}

function initProgress() {
  const sections = [...document.querySelectorAll('section[data-section-id]')];
  if (sections.length === 0) return;
  const progress = readProgress();

  for (const section of sections) {
    const id = section.dataset.sectionId;
    const row = document.createElement('div');
    row.className = 'section-progress';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `progress-${id.replace(/[^\w-]/g, '-')}`;
    checkbox.checked = Boolean(progress[id]);
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = checkbox.checked ? 'раздел разобран' : 'отметить как разобранный';
    checkbox.addEventListener('change', () => {
      const current = readProgress();
      current[id] = checkbox.checked;
      writeStore(PROGRESS_KEY, current);
      label.textContent = checkbox.checked ? 'раздел разобран' : 'отметить как разобранный';
    });
    row.append(checkbox, label);
    const heading = section.querySelector('h2');
    if (heading) heading.insertAdjacentElement('afterend', row);
    else section.prepend(row);
  }
}

function initFlashcards() {
  for (const card of document.querySelectorAll('.block--card')) {
    const answer = card.querySelector('[data-card-answer]');
    if (!answer) continue;
    answer.hidden = true;

    const actions = document.createElement('div');
    actions.className = 'card__actions';
    const show = document.createElement('button');
    show.type = 'button';
    show.className = 'btn';
    show.textContent = 'показать ответ';
    actions.appendChild(show);

    const mark = (verdict) => {
      const stats = readCards();
      const id = card.id || answer.textContent.slice(0, 40);
      stats[id] = verdict;
      writeStore(CARDS_KEY, stats);
    };

    show.addEventListener('click', () => {
      answer.hidden = false;
      show.remove();
      const good = document.createElement('button');
      good.type = 'button';
      good.className = 'btn';
      good.textContent = 'вспомнил';
      const bad = document.createElement('button');
      bad.type = 'button';
      bad.className = 'btn';
      bad.textContent = 'повторить';
      good.addEventListener('click', () => {
        mark('known');
        good.classList.add('btn--active');
        bad.classList.remove('btn--active');
      });
      bad.addEventListener('click', () => {
        mark('repeat');
        bad.classList.add('btn--active');
        good.classList.remove('btn--active');
      });
      actions.append(good, bad);
    });

    card.appendChild(actions);
  }
}

function highlight(value, query) {
  const index = value.toLowerCase().indexOf(query);
  if (index < 0) return value;
  const before = value.slice(0, index);
  const middle = value.slice(index, index + query.length);
  const after = value.slice(index + query.length);
  return `${before}<mark>${middle}</mark>${after}`;
}

function initSearch() {
  const input = document.querySelector('[data-search]');
  const output = document.querySelector('[data-search-results]');
  const hint = document.querySelector('[data-search-hint]');
  if (!input || !output) return;

  const entries = window.DIFGEM_INDEX || [];
  if (hint) hint.textContent = `в индексе ${entries.length} формулировок`;

  const render = (query) => {
    output.innerHTML = '';
    if (query.length < 2) return;
    const needle = query.toLowerCase();
    const matches = entries.filter((entry) =>
      entry.label.toLowerCase().includes(needle)
      || entry.title.toLowerCase().includes(needle)
      || entry.text.toLowerCase().includes(needle)
      || entry.section.toLowerCase().includes(needle)).slice(0, 20);

    if (matches.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'footnote';
      empty.textContent = 'ничего не нашлось';
      output.appendChild(empty);
      return;
    }

    for (const entry of matches) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'search__result';
      link.href = entry.url;
      link.innerHTML = `
        <span class="search__result-head">
          <span class="search__result-label">${entry.label}</span>
          <span class="search__result-title">${highlight(entry.title, needle)}</span>
          <span class="search__result-source">${entry.source} · ${entry.section}</span>
        </span>
        <span class="search__result-text">${highlight(entry.text, needle)}</span>`;
      item.appendChild(link);
      output.appendChild(item);
    }
  };

  input.addEventListener('input', () => render(input.value.trim()));
}

function initCourseProgress() {
  const progress = readProgress();
  for (const bar of document.querySelectorAll('[data-progress-for]')) {
    const prefix = bar.dataset.progressFor;
    const total = Number(bar.dataset.progressTotal || 0);
    if (!total) continue;
    const done = Object.entries(progress)
      .filter(([key, value]) => value && key.startsWith(prefix)).length;
    const fill = document.createElement('div');
    fill.className = 'progress-bar__fill';
    fill.style.width = `${Math.round((done / total) * 100)}%`;
    bar.classList.add('progress-bar');
    bar.appendChild(fill);
    const caption = document.querySelector(`[data-progress-caption="${prefix}"]`);
    if (caption) caption.textContent = `разобрано ${done} из ${total} разделов`;
  }
}

function initCheatsheet() {
  const host = document.querySelector('[data-cheatsheet]');
  if (!host) return;
  const entries = (window.DIFGEM_CHEATSHEET || []);
  if (entries.length === 0) {
    host.innerHTML = '<p class="footnote">Индекс пуст. Запусти <code>node tools/build-index.mjs</code>.</p>';
    return;
  }
  const groups = new Map();
  for (const entry of entries) {
    const key = `${entry.source} · ${entry.section}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  for (const [key, items] of groups) {
    const group = document.createElement('section');
    group.className = 'cheatsheet__group';
    const heading = document.createElement('h3');
    heading.textContent = key;
    group.appendChild(heading);
    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'cheat-item';
      row.innerHTML = `
        <span class="cheat-item__label">${item.label}</span>
        <span class="cheat-item__title">${item.title}</span>
        <p class="cheat-item__text">${item.latex || item.text}</p>`;
      group.appendChild(row);
    }
    host.appendChild(group);
  }
}

function boot() {
  initTheme();
  initAnchors();
  initToc();
  initProgress();
  initFlashcards();
  initSearch();
  initCourseProgress();
  initCheatsheet();
  renderMath();
  mountAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
