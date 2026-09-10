# Интерактивный конспект по дифгему — план реализации (итерация 1)

> **Отклонения от плана, обнаруженные при реализации.** План частично устарел;
> актуальные правила — в `.claude/skills/difgem-notes/SKILL.md`.
>
> 1. **ES-модули заменены собранным бандлом.** По `file://` Chrome блокирует `import`
>    из-за CORS, а конспект обязан открываться двойным кликом. Страницы подключают
>    `assets/bundle.js`, который `tools/build.mjs` собирает из модулей. Модули остались
>    источником правды и покрыты тестами.
> 2. **Команда тестов.** `node --test conspect/tests/` на Windows пытается запустить каталог
>    как модуль. Рабочие команды вынесены в `package.json`: `npm test`, `npm run build`,
>    `npm run serve`.
> 3. **Один скрипт сборки вместо двух.** `tools/build.mjs` собирает бандл, поисковый индекс
>    и данные шпаргалки. Отдельного `build-index.mjs` нет.
> 4. **Формулы в поисковом индексе переводятся в юникод** (`latexToPlain`): подсветка
>    совпадений `<mark>` внутри LaTeX ломала разбор KaTeX. Исходный LaTeX сохраняется
>    отдельным полем для шпаргалки.
> 5. **Manim не требует ffmpeg.** ManimCE 0.21 пишет видео через PyAV. Окружение —
>    `.venv` в корне репозитория, ставится через uv. Сцены используют Pango-текст,
>    а не `MathTex`, чтобы исключить зависимость от MiKTeX.
> 6. **Добавлены виджеты `BlockTopology` и `serve.mjs`**, которых в плане не было:
>    первый закрывает задачу 12, второй нужен для проверки в браузере.
> 7. **Практика №1 не входит в итерацию 1** — как и планировалось, идёт отдельно.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Собрать локальный офлайн-сайт `conspect/` с картой курса, глобальным поиском и полным конспектом лекции 1 по топологии: скелет преподавателя + интуиция, доказательства по шагам, контрпримеры, связь с ML, шесть интерактивных виджетов, две Manim-сцены, карточки и шпаргалка.

**Architecture:** Статические HTML-файлы без сборки и сервера. Топологические вычисления вынесены в чистые ES-модули (`topology.js`, `finite-topology.js`) с юнит-тестами; виджеты в `viz.js` — тонкие вьюхи над ними, монтируемые по `data-viz` атрибутам. Общий `style.css` даёт дизайн-систему на CSS-переменных, `app.js` — независимые модули UI (тема, оглавление, прогресс, поиск, карточки). `tools/build-index.mjs` пересобирает поисковый индекс и шпаргалку из HTML лекций, поэтому добавление лекции не требует ручной правки главной.

**Tech Stack:** HTML5, CSS (переменные, grid), ES-модули без фреймворков, KaTeX (вендоренный), Node 24 встроенный тест-раннер `node:test` (новых зависимостей нет), ManimCE + ffmpeg (изолированно, с SVG-фолбэком).

**Спека:** `docs/superpowers/specs/2026-09-10-difgem-conspect-design.md`

**Соглашения по коду:**
- Все модули — ES-модули (`export`/`import`), работают и в браузере, и в Node.
- Никаких комментариев внутри кода: имена функций и переменных самодокументирующиеся.
- Нотация в текстах строго как у преподавателя: `Int_X(S)`, `Cl_X(S)`, `∂S`, `τ_st`, `τ_→`, `τ_CF`, `τ_d`, `τ_a`.
- Тесты запускаются из корня репозитория: `node --test conspect/tests/`.
- Коммит после каждой задачи.

---

## Карта файлов

| Файл | Ответственность |
|---|---|
| `conspect/assets/topology.js` | Множества на ℝ как объединения интервалов и точек; `Int`/`Cl`/`∂` в топологиях `st`, `→`, `CF`; операции над множествами |
| `conspect/assets/finite-topology.js` | Топологии на конечном множестве: перечисление, проверка аксиом, порядок «сильнее/слабее», `Int`/`Cl` |
| `conspect/assets/viz.js` | Реестр виджетов и шесть виджетов-вьюх; ни одной формулы топологии внутри |
| `conspect/assets/render.js` | Общие примитивы отрисовки для виджетов: числовая прямая, плоскость, палитра ролей точек |
| `conspect/assets/app.js` | UI-модули: тема, оглавление, свёртки, прогресс, поиск, карточки |
| `conspect/assets/style.css` | Дизайн-система, темы dark/light/print, стили блоков |
| `conspect/index.html` | Карта курса, глобальный поиск, блок «куда мы идём» с видео |
| `conspect/lectures/lecture-01.html` | Конспект лекции 1 |
| `conspect/cheatsheet.html` | Шпаргалка, генерируется скриптом |
| `conspect/tools/build-index.mjs` | Сборка `search-index.json` и `cheatsheet.html` из лекций |
| `conspect/manim/scenes/lecture01.py` | Две Manim-сцены |
| `conspect/tests/*.test.mjs` | Юнит-тесты чистых модулей и сборщика индекса |
| `.claude/skills/difgem-notes/SKILL.md` | Правила создания следующих лекций |

Порядок задач: сначала проверяемое ядро (задачи 1–4), потом визуальный слой (5–8), потом контент (9–12), потом инфраструктура вокруг контента (13–16), в конце Manim и скилл (17–19).

---

## Task 1: Каркас проекта и офлайн KaTeX

**Files:**
- Create: `conspect/assets/vendor/katex/` (скачанные файлы)
- Create: `conspect/tests/.gitkeep`
- Create: `conspect/media/video/` (копии из `exemp/`)
- Create: `.gitignore`

- [ ] **Step 1: Создать дерево каталогов**

```bash
mkdir -p conspect/assets/vendor conspect/lectures conspect/pract conspect/media/video conspect/media/manim conspect/manim/scenes conspect/tools conspect/tests
```

- [ ] **Step 2: Проверить наличие сети и скачать KaTeX 0.16.11**

```bash
curl -fsSL -o /tmp/katex.zip https://github.com/KaTeX/KaTeX/releases/download/v0.16.11/katex.zip && echo NETWORK_OK
```

Expected: `NETWORK_OK`.
Если сети нет — остановиться и сообщить пользователю: без вендоренного KaTeX офлайн-требование не выполняется, нужен либо интернет один раз, либо смена решения на CDN.

- [ ] **Step 3: Распаковать в `conspect/assets/vendor/katex/`**

```bash
unzip -q -o /tmp/katex.zip -d /tmp/katex-extract && cp -r /tmp/katex-extract/katex/. conspect/assets/vendor/katex/ && ls conspect/assets/vendor/katex/
```

Expected: видны `katex.min.css`, `katex.min.js`, `contrib/auto-render.min.js`, каталог `fonts/`.

- [ ] **Step 4: Проверить целостность вендоринга**

```bash
test -f conspect/assets/vendor/katex/katex.min.css && test -f conspect/assets/vendor/katex/contrib/auto-render.min.js && ls conspect/assets/vendor/katex/fonts | wc -l
```

Expected: код возврата 0 и число шрифтов больше 20.

- [ ] **Step 5: Скопировать видео в сайт**

```bash
cp exemp/*.mp4 conspect/media/video/ && ls -la conspect/media/video/
```

Expected: два mp4 суммарно ~1.3 МБ.

- [ ] **Step 6: Создать `.gitignore`**

```
__pycache__/
*.pyc
.venv/
conspect/manim/media/
node_modules/
```

`conspect/manim/media/` — рабочий каталог Manim; итоговые рендеры кладутся в `conspect/media/manim/` и коммитятся.

- [ ] **Step 7: Коммит**

```bash
git add -A conspect .gitignore && git commit -m "chore: каркас конспекта, офлайн KaTeX, видео"
```

---

## Task 2: Ядро топологии на ℝ — представление множеств

**Files:**
- Create: `conspect/assets/topology.js`
- Test: `conspect/tests/topology.test.mjs`

Представление: множество — это массив компонент, отсортированных по `lo`, попарно непересекающихся и не сливающихся.

```js
{ lo: number, hi: number, loClosed: boolean, hiClosed: boolean }
```

Точка `{7}` — это `{ lo: 7, hi: 7, loClosed: true, hiClosed: true }`. Бесконечные концы — `-Infinity`/`Infinity` с `Closed: false`.

- [ ] **Step 1: Написать падающий тест на нормализацию**

Create `conspect/tests/topology.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { set, point, interval, normalize, format, equals, union, intersect, complement } from '../assets/topology.js';

test('normalize сливает соприкасающиеся компоненты, когда стык покрыт', () => {
  const s = normalize([interval(0, 1, true, false), interval(1, 2, true, true)]);
  assert.equal(format(s), '[0, 2]');
});

test('normalize не сливает компоненты с выколотым стыком', () => {
  const s = normalize([interval(0, 1, true, false), interval(1, 2, false, true)]);
  assert.equal(format(s), '[0, 1) ∪ (1, 2]');
});

test('normalize поглощает точку внутри интервала', () => {
  const s = normalize([interval(0, 5, false, false), point(3)]);
  assert.equal(format(s), '(0, 5)');
});

test('normalize приклеивает точку к открытому концу', () => {
  const s = normalize([interval(0, 5, false, false), point(5)]);
  assert.equal(format(s), '(0, 5]');
});

test('normalize сортирует и выбрасывает пустые компоненты', () => {
  const s = normalize([point(7), interval(2, 5, true, false), interval(9, 9, false, false)]);
  assert.equal(format(s), '[2, 5) ∪ {7}');
});

test('union и intersect работают на объединениях интервалов', () => {
  const a = set(interval(0, 3, true, false), point(7));
  const b = set(interval(2, 5, false, true));
  assert.equal(format(union(a, b)), '[0, 5] ∪ {7}');
  assert.equal(format(intersect(a, b)), '(2, 3)');
});

test('complement на ℝ переворачивает замкнутость концов', () => {
  const s = set(interval(2, 5, true, false), point(7));
  assert.equal(format(complement(s)), '(-∞, 2) ∪ [5, 7) ∪ (7, +∞)');
});

test('equals не зависит от порядка компонент', () => {
  assert.ok(equals(set(point(7), interval(0, 1, true, true)), set(interval(0, 1, true, true), point(7))));
});
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `node --test conspect/tests/topology.test.mjs`
Expected: FAIL, `Cannot find module .../assets/topology.js`.

- [ ] **Step 3: Реализовать представление и операции**

Create `conspect/assets/topology.js`:

```js
export const interval = (lo, hi, loClosed, hiClosed) => ({ lo, hi, loClosed, hiClosed });

export const point = (x) => interval(x, x, true, true);

export const REAL_LINE = interval(-Infinity, Infinity, false, false);

const isEmptyComponent = (c) =>
  c.lo > c.hi || (c.lo === c.hi && !(c.loClosed && c.hiClosed));

const lowerStartsBefore = (a, b) =>
  a.lo < b.lo || (a.lo === b.lo && a.loClosed && !b.loClosed);

const upperEndsAfter = (a, b) =>
  a.hi > b.hi || (a.hi === b.hi && a.hiClosed && !b.hiClosed);

const touchesOrOverlaps = (a, b) =>
  b.lo < a.hi || (b.lo === a.hi && (a.hiClosed || b.loClosed));

export function normalize(components) {
  const alive = components.filter((c) => !isEmptyComponent(c));
  const sorted = [...alive].sort((a, b) => (lowerStartsBefore(a, b) ? -1 : lowerStartsBefore(b, a) ? 1 : 0));
  const merged = [];
  for (const current of sorted) {
    const last = merged[merged.length - 1];
    if (last && touchesOrOverlaps(last, current)) {
      if (upperEndsAfter(current, last)) {
        last.hi = current.hi;
        last.hiClosed = current.hiClosed;
      }
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

export const set = (...components) => normalize(components);

export const EMPTY = [];

export const isEmpty = (s) => s.length === 0;

const formatComponent = (c) => {
  if (c.lo === c.hi) return `{${c.lo}}`;
  const left = c.loClosed ? '[' : '(';
  const right = c.hiClosed ? ']' : ')';
  const lo = c.lo === -Infinity ? '-∞' : c.lo;
  const hi = c.hi === Infinity ? '+∞' : c.hi;
  return `${left}${lo}, ${hi}${right}`;
};

export const format = (s) => (isEmpty(s) ? '∅' : s.map(formatComponent).join(' ∪ '));

export const equals = (a, b) => {
  const x = normalize(a);
  const y = normalize(b);
  return x.length === y.length && x.every((c, i) =>
    c.lo === y[i].lo && c.hi === y[i].hi && c.loClosed === y[i].loClosed && c.hiClosed === y[i].hiClosed);
};

export const union = (a, b) => normalize([...a, ...b]);

export function complement(s, ambient = [REAL_LINE]) {
  const gaps = [];
  let cursorValue = -Infinity;
  let cursorClosed = false;
  for (const c of normalize(s)) {
    gaps.push(interval(cursorValue, c.lo, !cursorClosed, !c.loClosed));
    cursorValue = c.hi;
    cursorClosed = c.hiClosed;
  }
  gaps.push(interval(cursorValue, Infinity, !cursorClosed, false));
  return intersect(normalize(gaps), ambient);
}

export function intersect(a, b) {
  const pieces = [];
  for (const x of a) {
    for (const y of b) {
      const lo = x.lo > y.lo ? x.lo : y.lo;
      const hi = x.hi < y.hi ? x.hi : y.hi;
      const loClosed = x.lo === y.lo ? x.loClosed && y.loClosed : (x.lo > y.lo ? x.loClosed : y.loClosed);
      const hiClosed = x.hi === y.hi ? x.hiClosed && y.hiClosed : (x.hi < y.hi ? x.hiClosed : y.hiClosed);
      pieces.push(interval(lo, hi, loClosed, hiClosed));
    }
  }
  return normalize(pieces);
}

export const contains = (s, x) =>
  s.some((c) => (c.lo < x || (c.lo === x && c.loClosed)) && (x < c.hi || (c.hi === x && c.hiClosed)));
```

Порядок объявления: `complement` вызывает `intersect`, объявленный ниже — это работает, так как `function` поднимается.

- [ ] **Step 4: Запустить тесты, убедиться что проходят**

Run: `node --test conspect/tests/topology.test.mjs`
Expected: PASS, 8 tests.

- [ ] **Step 5: Коммит**

```bash
git add conspect/assets/topology.js conspect/tests/topology.test.mjs && git commit -m "feat: представление множеств на прямой и операции над ними"
```

---

## Task 3: Int / Cl / ∂ в трёх топологиях

**Files:**
- Modify: `conspect/assets/topology.js`
- Modify: `conspect/tests/topology.test.mjs`

Топологии: `st` (стандартная), `arrow` (стрелка на `[0,+∞)`), `cofinite` (конечных дополнений).

Правила:
- `st`: `Int` — открыть все концы и выбросить точки; `Cl` — замкнуть концы.
- `arrow`: открытые — `∅`, `X`, `(a,+∞)`; замкнутые — `X`, `∅`, `[0,a]`. Значит `Int(S)` — наибольший луч внутри `S`, `Cl(S) = [0, sup S]` для непустого ограниченного `S`, иначе `X`.
- `cofinite`: `Int(S) = S`, если дополнение `S` конечно, иначе `∅`; `Cl(S) = S`, если `S` конечно, иначе `ℝ`.

- [ ] **Step 1: Дописать падающие тесты, привязанные к примерам лекции**

Append to `conspect/tests/topology.test.mjs`:

```js
import { interior, closure, boundary, TOPOLOGIES } from '../assets/topology.js';

test('Ex. 8: Int, Int дополнения и граница для [2,5) ∪ {7} в τ_st', () => {
  const s = set(interval(2, 5, true, false), point(7));
  assert.equal(format(interior(s, TOPOLOGIES.st)), '(2, 5)');
  assert.equal(format(interior(complement(s), TOPOLOGIES.st)), '(-∞, 2) ∪ (5, 7) ∪ (7, +∞)');
  assert.equal(format(boundary(s, TOPOLOGIES.st)), '{2} ∪ {5} ∪ {7}');
});

test('Ex. 11: замыкание [2,5) ∪ {7} в τ_st', () => {
  const s = set(interval(2, 5, true, false), point(7));
  assert.equal(format(closure(s, TOPOLOGIES.st)), '[2, 5] ∪ {7}');
});

test('Задача 3: Int((0,1] ∪ {2}) в τ_st', () => {
  const s = set(interval(0, 1, false, true), point(2));
  assert.equal(format(interior(s, TOPOLOGIES.st)), '(0, 1)');
});

test('Lm. 4: X распадается на Int(S), Int(S^c) и ∂S без пересечений', () => {
  const s = set(interval(2, 5, true, false), point(7));
  const parts = union(union(interior(s, TOPOLOGIES.st), interior(complement(s), TOPOLOGIES.st)), boundary(s, TOPOLOGIES.st));
  assert.equal(format(parts), '(-∞, +∞)');
});

test('Lm. 5: Cl(S) = S ∪ ∂S', () => {
  const s = set(interval(2, 5, true, false), point(7));
  assert.ok(equals(closure(s, TOPOLOGIES.st), union(s, boundary(s, TOPOLOGIES.st))));
});

test('Ex. 10: S = [2,5) в топологии стрелки', () => {
  const s = set(interval(2, 5, true, false));
  assert.equal(format(interior(s, TOPOLOGIES.arrow)), '∅');
  assert.equal(format(interior(complement(s, [interval(0, Infinity, true, false)]), TOPOLOGIES.arrow)), '(5, +∞)');
  assert.equal(format(boundary(s, TOPOLOGIES.arrow)), '[0, 5]');
});

test('Ex. 6: подпространство [0,1) в топологии стрелки открыто лучами', () => {
  const s = set(interval(0.5, 1, false, false));
  assert.equal(format(interior(s, TOPOLOGIES.arrow)), '∅');
});

test('Задача 9a: топология конечных дополнений', () => {
  const finite = set(point(1), point(2), point(3));
  assert.equal(format(closure(finite, TOPOLOGIES.cofinite)), '{1} ∪ {2} ∪ {3}');
  assert.equal(format(interior(set(interval(0, 1, false, false)), TOPOLOGIES.cofinite)), '∅');
  assert.equal(format(closure(set(interval(0, 1, true, true)), TOPOLOGIES.cofinite)), '(-∞, +∞)');
  assert.equal(format(boundary(set(interval(0, 1, true, true)), TOPOLOGIES.cofinite)), '(-∞, +∞)');
});
```

- [ ] **Step 2: Запустить, убедиться что падает**

Run: `node --test conspect/tests/topology.test.mjs`
Expected: FAIL, `interior is not a function` либо ошибка импорта.

- [ ] **Step 3: Реализовать операторы**

Append to `conspect/assets/topology.js`:

```js
const openComponents = (s) =>
  normalize(s.filter((c) => c.lo !== c.hi).map((c) => interval(c.lo, c.hi, false, false)));

const closeComponents = (s) =>
  normalize(s.map((c) => interval(c.lo, c.hi, c.lo !== -Infinity, c.hi !== Infinity)));

const ARROW_SPACE = [interval(0, Infinity, true, false)];

const supremum = (s) => (isEmpty(s) ? -Infinity : s[s.length - 1].hi);

const largestRayInside = (s) => {
  const last = s[s.length - 1];
  if (!last || last.hi !== Infinity) return EMPTY;
  return [interval(last.lo, Infinity, false, false)];
};

const isCofinite = (s) => {
  const gaps = complement(s);
  return gaps.every((c) => c.lo === c.hi);
};

const isFinite_ = (s) => s.every((c) => c.lo === c.hi);

export const TOPOLOGIES = {
  st: {
    id: 'st',
    label: 'τ_st',
    space: [REAL_LINE],
    interior: openComponents,
    closure: closeComponents,
  },
  arrow: {
    id: 'arrow',
    label: 'τ_→',
    space: ARROW_SPACE,
    interior: (s) => largestRayInside(s),
    closure: (s) => {
      if (isEmpty(s)) return EMPTY;
      const top = supremum(s);
      return top === Infinity ? ARROW_SPACE : [interval(0, top, true, true)];
    },
  },
  cofinite: {
    id: 'cofinite',
    label: 'τ_CF',
    space: [REAL_LINE],
    interior: (s) => (isCofinite(s) ? normalize(s) : EMPTY),
    closure: (s) => (isFinite_(s) ? normalize(s) : [REAL_LINE]),
  },
};

export const interior = (s, topology = TOPOLOGIES.st) =>
  intersect(topology.interior(normalize(s)), topology.space);

export const closure = (s, topology = TOPOLOGIES.st) =>
  intersect(topology.closure(normalize(s)), topology.space);

export const boundary = (s, topology = TOPOLOGIES.st) => {
  const inside = interior(s, topology);
  const outside = interior(complement(s, topology.space), topology);
  return complement(union(inside, outside), topology.space);
};

export function classifyPoint(s, x, topology = TOPOLOGIES.st) {
  if (contains(interior(s, topology), x)) return 'interior';
  if (contains(boundary(s, topology), x)) return 'boundary';
  return 'exterior';
}
```

`boundary` считается как дополнение к `Int(S) ∪ Int(Sᶜ)` — это ровно Lm. 4, поэтому тест на разложение проверяет реализацию, а не тавтологию.

- [ ] **Step 4: Запустить все тесты**

Run: `node --test conspect/tests/topology.test.mjs`
Expected: PASS, 16 tests.

- [ ] **Step 5: Коммит**

```bash
git add conspect/assets/topology.js conspect/tests/topology.test.mjs && git commit -m "feat: Int, Cl и граница в стандартной топологии, стрелке и конечных дополнениях"
```

---

## Task 4: Топологии на конечном множестве

**Files:**
- Create: `conspect/assets/finite-topology.js`
- Test: `conspect/tests/finite-topology.test.mjs`

Подмножества кодируются битовыми масками. Известные значения для проверки: топологий на двухэлементном множестве — 4, на трёхэлементном — 29.

- [ ] **Step 1: Написать падающий тест**

Create `conspect/tests/finite-topology.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isTopology, allTopologies, describeTopology,
  interiorIn, closureIn, boundaryIn, isStronger, blockTopology,
} from '../assets/finite-topology.js';

test('Задача 1: на множестве из двух точек ровно 4 топологии', () => {
  const found = allTopologies(2);
  assert.equal(found.length, 4);
  const shapes = found.map((t) => describeTopology(t, ['a', 'b'])).sort();
  assert.deepEqual(shapes, [
    '{∅, {a, b}}',
    '{∅, {a), {a, b}}'.replace('{a)', '{a}'),
    '{∅, {b}, {a, b}}',
    '{∅, {a}, {b}, {a, b}}',
  ].sort());
});

test('Задача 18c: на множестве из трёх точек 29 топологий', () => {
  assert.equal(allTopologies(3).length, 29);
});

test('isTopology отвергает семейство без пустого множества', () => {
  assert.equal(isTopology([0b11], 2), false);
});

test('isTopology отвергает семейство, не замкнутое по объединению', () => {
  assert.equal(isTopology([0b000, 0b001, 0b010, 0b111], 3), false);
});

test('isTopology принимает связное двоеточие из Ex. 2', () => {
  assert.equal(isTopology([0b00, 0b10, 0b11], 2), true);
});

test('Задача 12: Int и Cl через блоки неразличимых объектов', () => {
  const labels = ['a', 'b', 'c', 'd', 'e', 'f'];
  const blocks = [['a', 'b'], ['c', 'd'], ['e', 'f']];
  const topology = blockTopology(blocks, labels);
  const a = 0b000111;
  assert.equal(describeTopology([interiorIn(topology, a)], labels), '{{a, b}}');
  assert.equal(describeTopology([closureIn(topology, a)], labels), '{{a, b, c, d}}');
  assert.equal(describeTopology([boundaryIn(topology, a)], labels), '{{c, d}}');
});

test('Задача 12d: разделение блока делает топологию сильнее', () => {
  const labels = ['a', 'b', 'c', 'd', 'e', 'f'];
  const coarse = blockTopology([['a', 'b'], ['c', 'd'], ['e', 'f']], labels);
  const fine = blockTopology([['a', 'b'], ['c'], ['d'], ['e', 'f']], labels);
  assert.equal(isStronger(fine, coarse), true);
  assert.equal(isStronger(coarse, fine), false);
});

test('NB 2: дискретная сильнее всех, антидискретная слабее всех', () => {
  const all = allTopologies(3);
  const discrete = all.find((t) => t.length === 8);
  const antidiscrete = all.find((t) => t.length === 2);
  assert.ok(all.every((t) => isStronger(discrete, t)));
  assert.ok(all.every((t) => isStronger(t, antidiscrete)));
});
```

- [ ] **Step 2: Запустить, убедиться что падает**

Run: `node --test conspect/tests/finite-topology.test.mjs`
Expected: FAIL, `Cannot find module .../assets/finite-topology.js`.

- [ ] **Step 3: Реализовать модуль**

Create `conspect/assets/finite-topology.js`:

```js
const fullMask = (size) => (1 << size) - 1;

export function isTopology(family, size) {
  const members = new Set(family);
  if (!members.has(0)) return false;
  if (!members.has(fullMask(size))) return false;
  for (const a of members) {
    for (const b of members) {
      if (!members.has(a | b)) return false;
      if (!members.has(a & b)) return false;
    }
  }
  return true;
}

export function allTopologies(size) {
  const universe = fullMask(size);
  const candidates = [];
  const subsets = [];
  for (let mask = 0; mask <= universe; mask += 1) subsets.push(mask);
  const middle = subsets.filter((mask) => mask !== 0 && mask !== universe);
  const total = 1 << middle.length;
  for (let choice = 0; choice < total; choice += 1) {
    const family = [0, universe];
    for (let bit = 0; bit < middle.length; bit += 1) {
      if (choice & (1 << bit)) family.push(middle[bit]);
    }
    if (isTopology(family, size)) candidates.push(family.sort((x, y) => x - y));
  }
  return candidates;
}

const maskToLabels = (mask, labels) =>
  labels.filter((_, index) => mask & (1 << index));

export const describeSubset = (mask, labels) =>
  mask === 0 ? '∅' : `{${maskToLabels(mask, labels).join(', ')}}`;

export const describeTopology = (family, labels) =>
  `{${[...family].sort((x, y) => x - y).map((mask) => describeSubset(mask, labels)).join(', ')}}`;

export const interiorIn = (family, subset) =>
  family.filter((open) => (open & subset) === open).reduce((acc, open) => acc | open, 0);

export const closureIn = (family, subset, size = null) => {
  const universe = size === null ? Math.max(...family) : fullMask(size);
  const complement = universe & ~subset;
  return universe & ~interiorIn(family, complement);
};

export const boundaryIn = (family, subset, size = null) => {
  const universe = size === null ? Math.max(...family) : fullMask(size);
  return closureIn(family, subset, size) & ~interiorIn(family, subset) & universe;
};

export const isStronger = (strong, weak) =>
  weak.every((open) => strong.includes(open));

export function blockTopology(blocks, labels) {
  const indexOf = new Map(labels.map((label, index) => [label, index]));
  const blockMasks = blocks.map((block) =>
    block.reduce((mask, label) => mask | (1 << indexOf.get(label)), 0));
  const family = new Set([0]);
  const count = blockMasks.length;
  for (let choice = 0; choice < (1 << count); choice += 1) {
    let mask = 0;
    for (let bit = 0; bit < count; bit += 1) {
      if (choice & (1 << bit)) mask |= blockMasks[bit];
    }
    family.add(mask);
  }
  return [...family].sort((x, y) => x - y);
}
```

- [ ] **Step 4: Запустить, убедиться что проходят**

Run: `node --test conspect/tests/finite-topology.test.mjs`
Expected: PASS, 8 tests. Особенно важны `4` и `29` — это независимая проверка правильности перечисления.

- [ ] **Step 5: Проверить, что перечисление на 4 точках не подвешивает браузер**

Run: `node -e "import('./conspect/assets/finite-topology.js').then(m => { const t0 = Date.now(); const n = m.allTopologies(4).length; console.log(n, Date.now() - t0, 'ms'); })"`
Expected: `355` и время меньше 30000 мс. Если дольше двух секунд — в виджете `TopologyLattice` перечисление для 4 точек не предлагать, ограничиться 2 и 3 точками.

- [ ] **Step 6: Коммит**

```bash
git add conspect/assets/finite-topology.js conspect/tests/finite-topology.test.mjs && git commit -m "feat: перечисление и операторы топологий на конечном множестве"
```

---

## Task 5: Дизайн-система и темы

**Files:**
- Create: `conspect/assets/style.css`

Требования: тёмная тема по умолчанию, светлая через `[data-theme="light"]`, печатная через `@media print`. Все цвета — только через переменные, ни одного литерала цвета вне блока `:root`.

- [ ] **Step 1: Написать переменные и базовую типографику**

Палитра тёмной темы: фон `#0f1216`, поверхность `#161b22`, текст `#e6edf3`, приглушённый текст `#8b949e`, рамка `#2b333c`. Акценты блоков: `def` — `#58a6ff`, `lemma` — `#a371f7`, `theorem` — `#f778ba`, `example` — `#3fb950`, `nb` — `#d29922`, `proof` — `#8b949e`, `counter` — `#f85149`, `trap` — `#db6d28`, `ml` — `#2dd4bf`, `intuition` — `#e3b341`, `viz` — `#79c0ff`, `card` — `#bc8cff`.

Основной шрифт — системный sans-serif стек, математика — KaTeX. Ширина колонки контента — `min(72ch, 100%)`.

- [ ] **Step 2: Стили блоков одним правилом**

```css
.block {
  border-left: 3px solid var(--block-accent, var(--border));
  background: var(--surface);
  border-radius: 0 8px 8px 0;
  padding: 0.9rem 1.1rem;
  margin: 1.25rem 0;
}
.block__label {
  color: var(--block-accent);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 650;
  margin-bottom: 0.4rem;
}
.block--def { --block-accent: var(--accent-def); }
.block--lemma { --block-accent: var(--accent-lemma); }
```

Далее по одному правилу на каждый тип. Добавление нового типа блока — одна строка CSS.

- [ ] **Step 3: Раскладка страницы лекции**

`.layout` — CSS grid `260px 1fr` на ширине от 900px, одна колонка ниже. `.toc` — `position: sticky; top: 0; max-height: 100vh; overflow-y: auto`. На узких экранах оглавление сворачивается в `<details>`.

- [ ] **Step 4: Стили виджетов и печати**

`.viz` — контейнер с рамкой, заголовком и подписью. `.viz__canvas` — `width: 100%; touch-action: none` (обязательно для перетаскивания на телефоне). `.viz__legend` — флекс-строка с цветными маркерами.

`@media print`: белый фон, чёрный текст, `.toc`, `.theme-toggle`, `.progress` скрыты, `.block` без фона с серой рамкой, свёрнутые `<details>` раскрыты через `details { display: block } details > summary { display: none }`.

- [ ] **Step 5: Проверка в браузере**

Создать временный `conspect/_smoke.html` с примерами всех типов блоков, открыть через инструмент браузера `file:///C:/itmo/academic/conspect/_smoke.html`, снять скриншот в тёмной и светлой темах. Убедиться: контраст читаем, акценты различимы, ничего не разъезжается. Удалить `_smoke.html`.

- [ ] **Step 6: Коммит**

```bash
git add conspect/assets/style.css && git commit -m "feat: дизайн-система, темы и стили блоков"
```

---

## Task 6: UI-модули страницы

**Files:**
- Create: `conspect/assets/app.js`

Контракт: `app.js` — единственная точка входа страницы, подключается как `<script type="module" src="../assets/app.js">`. Каждый модуль ищет свои DOM-хуки и молча ничего не делает, если их нет. Никаких падений на страницах без соответствующей разметки.

- [ ] **Step 1: Реализовать рендер математики**

```js
const renderMath = () => {
  if (!window.renderMathInElement) return;
  window.renderMathInElement(document.body, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
    ],
    throwOnError: false,
  });
};
```

- [ ] **Step 2: Тема с запоминанием**

`initTheme()`: читает `localStorage.getItem('difgem-theme')`, ставит `document.documentElement.dataset.theme`, навешивает обработчик на `[data-theme-toggle]`. По умолчанию — тёмная.

- [ ] **Step 3: Оглавление из заголовков**

`initToc()`: собирает `h2[id], h3[id]` внутри `main`, строит вложенный список в `[data-toc]`, через `IntersectionObserver` подсвечивает активный пункт классом `is-active`.

- [ ] **Step 4: Прогресс по разделам**

`initProgress()`: для каждого `section[data-section-id]` добавляет чекбокс «разобрано», состояние в `localStorage` под ключом `difgem-progress`, формат `{ "lecture-01/1.3": true }`. Экспортирует `readProgress()`, который использует главная страница для показа процента.

- [ ] **Step 5: Карточки самопроверки**

`initFlashcards()`: блоки `.block--card` содержат `[data-card-question]` и `[data-card-answer]`; ответ скрыт до клика. Кнопки «вспомнил / не вспомнил» пишут счётчик в `localStorage` под `difgem-cards`; на главной показывается «карточек к повторению: N».

- [ ] **Step 6: Свёртки уровней подсказок**

`initReveal()`: `<details class="reveal reveal--hint">` — просто нативные `details`, но с отслеживанием: открытие уровня 3 (полное решение) при закрытых 1 и 2 не блокируется, лишь помечается — никакого насилия над пользователем.

- [ ] **Step 7: Монтирование виджетов**

```js
import { mountAll } from './viz.js';
```

`mountAll()` вызывается после `renderMath()`, чтобы KaTeX не переставлял разметку под уже отрисованным SVG.

- [ ] **Step 8: Проверка в браузере**

Открыть `conspect/lectures/lecture-01.html` (на этом шаге ещё заготовка), проверить консоль браузера: ноль ошибок. Использовать инструмент чтения консоли.

- [ ] **Step 9: Коммит**

```bash
git add conspect/assets/app.js && git commit -m "feat: UI-модули: тема, оглавление, прогресс, карточки, свёртки"
```

---

## Task 7: Примитивы отрисовки и реестр виджетов

**Files:**
- Create: `conspect/assets/render.js`
- Create: `conspect/assets/viz.js`

- [ ] **Step 1: Реализовать `render.js`**

Экспорты:
- `createSvg(width, height)` — SVG с `viewBox` и `preserveAspectRatio`, масштабируемый по ширине контейнера.
- `numberLine({ svg, from, to, y, ticks })` — ось с засечками и подписями; возвращает `scale(x)` и `unscale(px)`.
- `drawSetOnLine({ svg, set, y, role })` — рисует объединение интервалов: закрашенный отрезок, пустые и полные кружки на концах, изолированные точки. Принимает результат из `topology.js` напрямую.
- `plane({ svg, xRange, yRange })` — двумерные оси, возвращает `toPixels(x, y)` и `toMath(px, py)`.
- `ROLE_COLORS` — соответствие `interior/boundary/exterior/set/complement` переменным CSS, чтобы виджеты автоматически следовали теме.

Цвета берутся через `getComputedStyle(document.documentElement).getPropertyValue('--...')`, поэтому переключение темы перерисовывает виджеты корректно. Виджеты подписываются на событие `difgem:themechange`, которое бросает `initTheme()`.

- [ ] **Step 2: Реализовать реестр в `viz.js`**

```js
const registry = new Map();

export const register = (name, factory) => registry.set(name, factory);

export function mountAll(root = document) {
  for (const host of root.querySelectorAll('[data-viz]')) {
    const factory = registry.get(host.dataset.viz);
    if (!factory) {
      host.innerHTML = '<p class="viz__error">Виджет не найден: ' + host.dataset.viz + '</p>';
      continue;
    }
    const config = JSON.parse(host.dataset.vizConfig || '{}');
    factory(host, config);
  }
  document.addEventListener('difgem:themechange', () => {
    for (const host of root.querySelectorAll('[data-viz]')) host.dispatchEvent(new Event('difgem:redraw'));
  });
}
```

Контракт виджета: `factory(host, config)` рисует внутрь `host` и слушает `difgem:redraw` на `host` для перерисовки.

- [ ] **Step 3: Проверка контракта на заглушке**

Временно зарегистрировать виджет `smoke`, который рисует числовую прямую с `[2,5) ∪ {7}` и подписью, вставить `<div data-viz="smoke">` в `_smoke.html`, открыть в браузере, снять скриншот. Убедиться: концы отрисованы правильно (закрашенный кружок на 2, пустой на 5, точка на 7), переключение темы перерисовывает цвета. Удалить заглушку.

- [ ] **Step 4: Коммит**

```bash
git add conspect/assets/render.js conspect/assets/viz.js && git commit -m "feat: примитивы отрисовки и реестр виджетов"
```

---

## Task 8: Шесть виджетов лекции 1

**Files:**
- Modify: `conspect/assets/viz.js`

Все шесть используют `topology.js` / `finite-topology.js` для вычислений — ни одной топологической формулы в коде виджета. Каждый виджет: заголовок, интерактивная область, живая подпись с текущим ответом, легенда.

- [ ] **Step 1: `SetInspector`**

Config: `{ topologies: ['st','arrow','cofinite'], initial: [[2,5,true,false],[7,7,true,true]], editable: true }`.
Числовая прямая, редактируемое множество (перетаскивание концов, клик — добавить точку), переключатель топологии, кнопки `Int` / `Cl` / `∂` — подсвечивают результат на второй линии и печатают ответ формулой через `format()`.
Верификация: выставить `[2,5) ∪ {7}` в `τ_st`, ответы должны совпасть с Ex. 8 и Ex. 11; переключить на `τ_→` — должно совпасть с Ex. 10.

- [ ] **Step 2: `PointProber`**

Config: `{ set: 'halfPlane' | 'squarePunctured' | 'diskUnion', ambient: 'R2' }`.
Плоскость, закрашенное множество, таскаемая точка `P`, вокруг неё окрестность `O_P` радиуса, регулируемого слайдером. Подпись: «`P` — внутренняя точка: существует `O_P ⊆ S`» / «граничная: любая `O_P` пересекает и `S`, и `Sᶜ`» / «внешняя». Плюс галочка «показать `∂S`».
Верификация: для `A = {(x₁,x₂) : x₁ ≥ 0}` (задача 7b) точка на прямой `x₁ = 0` должна классифицироваться как граничная при любом радиусе.

- [ ] **Step 3: `AxiomChecker`**

Config: `{ mode: 'union' | 'intersection' }`.
Список интервалов, кнопки «добавить `(−1/n, 1/n)`», счётчик `n`, кнопки «объединить» / «пересечь». Показывает результат и вердикт «открыто / не открыто». Сценарий по умолчанию: наращивание `n` до 20 и пересечение — результат `{0}`, вердикт «не открыто», подпись объясняет аксиому 3.
Верификация: при `n = 1..k` пересечение равно `(−1/k, 1/k)`, а «предельная» кнопка даёт `{0}` с пометкой, что это результат бесконечного пересечения, а не вычисления.

- [ ] **Step 4: `SubspaceViz`**

Config: `{}`.
Плоскость с подсвеченной прямой `S = ℝ × {0}` и множеством `U = (−1,1) × {0}`. Переключатель «окружающее пространство: `ℝ²` / `S`». В режиме `S` — `U` открыто, показывается окрестность внутри `S`; в режиме `ℝ²` — любая окрестность точки из `U` вылезает из `S`, показывается контрпример-диск. Подпись цитирует NB 1 и Lm. 1.
Верификация: скриншоты обоих режимов, в режиме `ℝ²` виден диск, торчащий за прямую.

- [ ] **Step 5: `TopologyLattice`**

Config: `{ size: 2 | 3, labels: ['a','b'] }`.
Через `allTopologies(size)` перечисляет топологии, рисует их как узлы, соединяет рёбрами по отношению `isStronger` (только непосредственные соседи — транзитивные рёбра не рисуем). Клик по узлу — показать семейство через `describeTopology`. Подсветка `τ_d` и `τ_a`. Для `size: 3` — 29 узлов; если раскладка получается нечитаемой, группировать по числу открытых множеств по вертикали.
Верификация: на `size: 2` — 4 узла, что совпадает с ответом на задачу 1; на `size: 3` — 29.

- [ ] **Step 6: `ArrowTopology`**

Config: `{}`.
Луч `[0,+∞)`, слайдер `a` рисует открытое `(a,+∞)`, редактируемое множество `S`, живые `Int_X(S)` и `Cl_X(S)`. Отдельная кнопка «случай `S = ∅`» и «`S = X`» (задача 17\* требует учесть их).
Верификация: `S = [2,5)` даёт `Int = ∅`, `Cl = [0,5]` — совпадает с Ex. 10; `[0,5)` не открыто — ответ на задачу 9b.

- [ ] **Step 7: Проверка всех виджетов в браузере**

Собрать `conspect/_smoke.html` со всеми шестью виджетами, открыть, снять скриншоты, прочитать консоль (ожидается ноль ошибок), проверить работу перетаскивания. Проверить мобильный вид: эмулировать 375×812, убедиться что виджеты не выходят за экран и реагируют на тач. Удалить `_smoke.html`.

- [ ] **Step 8: Коммит**

```bash
git add conspect/assets/viz.js && git commit -m "feat: шесть интерактивных виджетов лекции 1"
```

---

## Task 9: Лекция 1, разделы 1.1–1.2

**Files:**
- Create: `conspect/lectures/lecture-01.html`

Содержание переносится из `data/lections/lecture_1_Topology_definition.pdf` с сохранением нумерации. Разделы: 1.1 Открытые множества (Def. 1–2, Ex. 1–5), 1.2 Индуцированные топологии (Def. 3–4, Ex. 6–7, NB 1–2, Lm. 1–2).

- [ ] **Step 1: Скелет страницы**

`<head>` подключает `../assets/vendor/katex/katex.min.css`, `../assets/style.css`, `../assets/vendor/katex/katex.min.js`, `../assets/vendor/katex/contrib/auto-render.min.js` (оба с `defer`), затем `../assets/app.js` как модуль. Шапка: хлебные крошки на `../index.html`, заголовок «Лекция 1. Топологическая структура на множестве», ссылка на оригинальный PDF `../../data/lections/lecture_1_Topology_definition.pdf`, переключатель темы.

- [ ] **Step 2: Раздел 1.1 — формальный слой**

`<section id="s-1-1" data-section-id="lecture-01/1.1">` с блоками: `def-1` (три аксиомы), `ex-1` (`τ_a`, `τ_d`), `ex-2` (связное двоеточие), `ex-3` (`τ_st`), `ex-4` (стрелка), `def-2` (топологическое пространство), `ex-5` (`τ_CF`). Формулировки дословные.

- [ ] **Step 3: Раздел 1.1 — слои сверху**

Добавить к Def. 1:
- `intuition`: топология — это ответ на вопрос «какие множества считаем окрестностями», то есть какое понятие близости мы выбрали. Не свойство множества, а дополнительная структура на нём.
- `trap`: в аксиоме 2 объединений любое число, в аксиоме 3 пересечений — только конечное. Пример `⋂ₙ (−1/n, 1/n) = {0}` показывает, почему иначе аксиомы противоречивы для `τ_st`.
- `viz` с `AxiomChecker`.
- `viz` с `TopologyLattice` (`size: 2`) при Ex. 2, с пометкой, что это готовый ответ на задачу 1 практического листа.
- `ml`: топология из блоков неразличимых объектов (задача 12) — если признаки не различают два объекта, они попадают в один блок, и открытые множества это учитывают. Уточнение признаков даёт более сильную топологию.
- `card`: «Сформулируйте три аксиомы топологии» / «Где именно требуется конечность?».

- [ ] **Step 4: Раздел 1.2 — формальный слой и слои сверху**

Блоки `def-3` (подпространство), `ex-6`, `nb-1`, `lm-1` с доказательством из PDF, `def-4` (сильнее/слабее), `nb-2`, `lm-2` (топология произведения), `ex-7` (`ℝ²`).

Слои:
- `viz` с `SubspaceViz` рядом с NB 1 — это главный контринтуитивный момент раздела.
- `intuition` к Def. 4: «сильнее» = больше открытых множеств = тоньше различение точек. Мнемоника: дискретная различает всё, антидискретная не различает ничего.
- `trap`: «открыто» без указания объемлющего пространства — бессмысленное утверждение. Именно это требует практический лист в задаче 5 («во всех ответах явно указывайте окружающее пространство»).
- `ml`: усиление топологии = появление новых различимых признаков (задача 12d).
- `card` на Def. 3 и Def. 4.

- [ ] **Step 5: Проверка в браузере**

Открыть страницу, проверить: формулы отрендерены, оглавление построено, два виджета работают, консоль чиста. Снять скриншот.

- [ ] **Step 6: Коммит**

```bash
git add conspect/lectures/lecture-01.html && git commit -m "feat: лекция 1, разделы 1.1-1.2"
```

---

## Task 10: Лекция 1, раздел 1.3 — окрестности и Int/Cl/∂

**Files:**
- Modify: `conspect/lectures/lecture-01.html`

Разделы: Def. 5 (окрестность), NB 3, Def. 6–12, Lm. 3–5 с доказательствами, Ex. 8–11, NB 4–6.

- [ ] **Step 1: Формальный слой**

Блоки в порядке PDF: `def-5`, `nb-3`, `def-6`, `def-7`, `lm-3` + `proof`, `def-8`, `def-9`, `nb-4`, `lm-4`, `def-10`, `nb-5`, `ex-8`, `ex-9`, `ex-10`, `def-11`, `def-12`, `lm-5` + `proof`, `ex-11`, `nb-6`.

- [ ] **Step 2: Доказательства по шагам**

Lm. 3: разбить на три шага — (1) объединение всех открытых подмножеств `S` открыто по аксиоме 2; (2) оно наибольшее по построению; (3) точка лежит в нём тогда и только тогда, когда она внутренняя. Каждый шаг с пометкой, какая аксиома или определение используется.

Lm. 5: (1) пересечение замкнутых замкнуто (через дополнение и аксиому 2); (2) значит `Cl_X(S)` существует; (3) `P ∉ Cl(S)` равносильно наличию окрестности, не пересекающей `S`; (4) отсюда `Cl(S) = S ∪ ∂S`.

- [ ] **Step 3: Визуальный слой**

- `PointProber` при Def. 6/8/9 — три определения одним виджетом.
- `SetInspector` при Ex. 8 с предустановкой `[2,5) ∪ {7}`, `τ_st`.
- `SetInspector` при Ex. 10 с предустановкой `[2,5)`, `τ_→`, либо `ArrowTopology`.
- SVG-фигура к Lm. 4: разложение `X` на три непересекающихся части.
- Место под Manim-сцену `BoundaryOfRationals` при Ex. 9.

- [ ] **Step 4: Контрпримеры и ловушки**

- `counter` к Ex. 9: `Int(ℚ) = ∅`, но `Cl(ℚ) = ℝ` — множество может быть «нигде не толстым» и при этом всюду плотным. Пояснить, почему в любом интервале есть и рациональная, и иррациональная точка.
- `trap` к NB 6: «открытое» и «замкнутое» — не антонимы. В `τ_d` всё и открыто, и замкнуто; `[0,1)` в `τ_st` ни то, ни другое.
- `trap` к Def. 12: точка прикосновения не обязана лежать в `S`.
- `counter`: `Int(A ∪ B) ≠ Int(A) ∪ Int(B)` — контрпример `A = (−∞,0]`, `B = [0,+∞)` (это задача 4d практического листа).

- [ ] **Step 5: Связь с ИИ**

Блок `ml` к Def. 6–9, разворачивающий задачу 7: множество точек, где решение классификатора локально устойчиво, равно `Int_X(A) ∪ Int_X(X\A)`; остальное — `∂A`. Для `A = {(x₁,x₂) : x₁ ≥ 0}` неустойчивость сосредоточена ровно на прямой `x₁ = 0`. Отметить, что это ровно то, что в ML называют границей решения, и что робастность модели — это требование «точка данных лежит во внутренности своего класса с запасом».

Блок `ml` к Def. 11: замыкание как «множество плюс всё, к чему оно подходит сколь угодно близко» — почему на границе классов ошибка неизбежна.

- [ ] **Step 6: Карточки**

Не менее восьми карточек: Def. 6, 7, 9, 10, 11, 12, формулировки Lm. 4 и Lm. 5.

- [ ] **Step 7: Проверка в браузере**

Открыть, проверить: все виджеты работают, ответы виджетов совпадают с Ex. 8, 10, 11, консоль чиста, оглавление полное. Снять скриншот.

- [ ] **Step 8: Коммит**

```bash
git add conspect/lectures/lecture-01.html && git commit -m "feat: лекция 1, раздел 1.3 с доказательствами и связью с ML"
```

---

## Task 11: Сводка лекции 1 и «зоопарк контрпримеров»

**Files:**
- Modify: `conspect/lectures/lecture-01.html`

- [ ] **Step 1: Таблица-сводка по топологиям**

Таблица: строки — топологии `τ_a`, `τ_d`, `τ_st`, `τ_→`, `τ_CF`; столбцы — «что открыто», «что замкнуто», «`Int` типичного множества», «`Cl` типичного множества», «пример из лекции». Это то, чего в PDF нет вообще, и именно это спрашивают на практике.

- [ ] **Step 2: Таблица разложения `X = Int(S) ∪ Int(Sᶜ) ∪ ∂S`**

Для четырёх примеров: `[2,5) ∪ {7}` в `τ_st`, `ℚ` в `τ_st`, `[2,5)` в `τ_→`, `[0,1]` в `τ_CF`. Все значения перепроверить через `topology.js`, где представимо.

- [ ] **Step 3: Блок «куда мы идём»**

Встроить `../media/video/Рогатая_сфера_Александера.mp4` и `../media/video/Развязывание_узла_в_4D.mp4` с `controls`, `preload="metadata"`, `loop`. Подпись к рогатой сфере: наивная интуиция «граница вложенной сферы делит пространство на понятные части» ломается; вот зачем нужны точные определения `Int`, `Cl`, `∂`, а не картинки. Подпись к узлу: гомеоморфность зависит от объемлющего пространства — тот же вопрос, что в NB 1, но на четыре измерения выше.

- [ ] **Step 4: Проверка в браузере**

Убедиться, что видео проигрываются локально и не блокируют загрузку страницы.

- [ ] **Step 5: Коммит**

```bash
git add conspect/lectures/lecture-01.html && git commit -m "feat: сводные таблицы лекции 1 и блок мотивации с видео"
```

---

## Task 12: Сборщик поискового индекса

**Files:**
- Create: `conspect/tools/build-index.mjs`
- Test: `conspect/tests/build-index.test.mjs`

Скрипт читает `conspect/lectures/*.html` и `conspect/pract/*.html`, извлекает блоки и заголовки, пишет `conspect/assets/search-index.json`.

Формат записи:

```json
{
  "id": "def-7",
  "url": "lectures/lecture-01.html#def-7",
  "kind": "def",
  "label": "Def. 7",
  "title": "Внутренность",
  "text": "Внутренностью Int_X(S) множества S называется наибольшее...",
  "section": "1.3 Окрестность точки",
  "source": "Лекция 1"
}
```

- [ ] **Step 1: Написать падающий тест на извлечение**

Create `conspect/tests/build-index.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractEntries } from '../tools/build-index.mjs';

const html = `
<main>
  <h1>Лекция 1. Топологическая структура на множестве</h1>
  <section id="s-1-3" data-section-id="lecture-01/1.3">
    <h2 id="h-1-3">1.3 Окрестность точки</h2>
    <div class="block block--def" id="def-7" data-label="Def. 7" data-title="Внутренность">
      <p>Внутренностью $\\mathrm{Int}_X(S)$ множества $S$ называется наибольшее открытое подмножество.</p>
    </div>
    <div class="block block--nb" id="nb-6" data-label="NB 6" data-title="Открытое и замкнутое не антонимы">
      <p>Множество может быть одновременно открытым и замкнутым.</p>
    </div>
  </section>
</main>`;

test('extractEntries вытаскивает блоки с их разделом и источником', () => {
  const entries = extractEntries(html, { url: 'lectures/lecture-01.html', source: 'Лекция 1' });
  assert.equal(entries.length, 2);
  const [first, second] = entries;
  assert.equal(first.id, 'def-7');
  assert.equal(first.kind, 'def');
  assert.equal(first.label, 'Def. 7');
  assert.equal(first.title, 'Внутренность');
  assert.equal(first.section, '1.3 Окрестность точки');
  assert.equal(first.url, 'lectures/lecture-01.html#def-7');
  assert.equal(first.source, 'Лекция 1');
  assert.ok(first.text.startsWith('Внутренностью'));
  assert.ok(!first.text.includes('<p>'));
  assert.equal(second.kind, 'nb');
});

test('extractEntries не падает на странице без блоков', () => {
  assert.deepEqual(extractEntries('<main><h1>Пусто</h1></main>', { url: 'x.html', source: 'X' }), []);
});

test('extractEntries игнорирует блоки без id', () => {
  const entries = extractEntries('<div class="block block--def" data-label="Def. 1"><p>текст</p></div>', { url: 'x.html', source: 'X' });
  assert.deepEqual(entries, []);
});
```

- [ ] **Step 2: Запустить, убедиться что падает**

Run: `node --test conspect/tests/build-index.test.mjs`
Expected: FAIL, `Cannot find module .../tools/build-index.mjs`.

- [ ] **Step 3: Реализовать скрипт**

`extractEntries(html, meta)` — экспортируемая чистая функция на регулярных выражениях (никаких зависимостей): находит `<h2 id=...>` для отслеживания текущего раздела, находит `<div class="block block--KIND" id=... data-label=... data-title=...>`, берёт внутренний текст, снимает теги, сжимает пробелы, обрезает до 300 символов.

`main()` — читает файлы через `node:fs/promises`, собирает записи, пишет `assets/search-index.json` с отсортированным порядком, печатает сводку: сколько записей, из каких файлов. Запуск как скрипт определяется через сравнение `import.meta.url` с `process.argv[1]`, чтобы импорт в тестах не выполнял `main()`.

- [ ] **Step 4: Запустить тесты**

Run: `node --test conspect/tests/build-index.test.mjs`
Expected: PASS, 3 tests.

- [ ] **Step 5: Запустить на реальной лекции**

Run: `node conspect/tools/build-index.mjs`
Expected: сводка вида `lectures/lecture-01.html: N записей` где N не меньше 34 (12 Def + 5 Lm + 11 Ex + 6 NB), и создан `conspect/assets/search-index.json`.

- [ ] **Step 6: Коммит**

```bash
git add conspect/tools/build-index.mjs conspect/tests/build-index.test.mjs conspect/assets/search-index.json && git commit -m "feat: сборщик поискового индекса по блокам лекций"
```

---

## Task 13: Главная страница

**Files:**
- Create: `conspect/index.html`
- Modify: `conspect/assets/app.js`

- [ ] **Step 1: Карта курса**

Сетка карточек: одна карточка — одна лекция (номер, название, что внутри — перечисление ключевых понятий, число блоков, полоса прогресса из `readProgress()`), рядом карточка практического листа со статусом «в работе». Карточки-заготовки для будущих лекций не создаём.

- [ ] **Step 2: Глобальный поиск**

Поле `[data-search]`, загрузка `assets/search-index.json` через `fetch`. Важно: при открытии по `file://` в Chrome `fetch` на локальный JSON блокируется CORS. Решение — генерировать `assets/search-index.js`, который присваивает `window.DIFGEM_INDEX = [...]`, и подключать тегом `<script>`. Скрипт `build-index.mjs` пишет оба файла: `.json` для внешних инструментов и `.js` для страницы.

Поиск: подстрочное совпадение без учёта регистра по `label`, `title`, `text`; результаты группируются по источнику; клик ведёт на анкор. Показ первых 20 результатов.

- [ ] **Step 3: Проверить, что поиск работает по `file://`**

Открыть `file:///C:/itmo/academic/conspect/index.html` в браузере, ввести `Int`, убедиться что появились результаты и переход по клику попадает на нужный блок. Проверить консоль на CORS-ошибки: их не должно быть.

- [ ] **Step 4: Блок «куда мы идём» и навигация**

Ссылки на шпаргалку и карточки, оба видео с подписями, короткий блок «как пользоваться конспектом» — расшифровка типов блоков с их цветами.

- [ ] **Step 5: Обновить `build-index.mjs` для генерации `.js`**

Дописать запись `search-index.js`, перезапустить, проверить оба файла.

- [ ] **Step 6: Коммит**

```bash
git add conspect/index.html conspect/assets/app.js conspect/tools/build-index.mjs conspect/assets/search-index.* && git commit -m "feat: главная страница с картой курса и глобальным поиском"
```

---

## Task 14: Шпаргалка

**Files:**
- Create: `conspect/cheatsheet.html`
- Modify: `conspect/tools/build-index.mjs`

- [ ] **Step 1: Генерация тела шпаргалки**

`build-index.mjs` дополнительно пишет `assets/cheatsheet-data.js` — только записи с `kind` из `def`, `lemma`, `theorem`, `nb`, сгруппированные по источнику и разделу. `cheatsheet.html` рендерит их компактным списком: метка, название, формулировка. Без картинок и виджетов.

- [ ] **Step 2: Печатная вёрстка**

Две колонки на печати, шрифт мельче, разрывы страниц не рвут блок: `break-inside: avoid`.

- [ ] **Step 3: Проверка**

Открыть в браузере, убедиться: все определения лекции 1 на месте, формулы отрендерены. Открыть предпросмотр печати и убедиться, что на страницу влезает много и ничего не рвётся.

- [ ] **Step 4: Коммит**

```bash
git add conspect/cheatsheet.html conspect/tools/build-index.mjs conspect/assets/cheatsheet-data.js && git commit -m "feat: автосборная шпаргалка"
```

---

## Task 15: Manim-сцены

**Files:**
- Create: `conspect/manim/scenes/lecture01.py`
- Create: `conspect/manim/README.md`
- Modify: `conspect/lectures/lecture-01.html`

- [ ] **Step 1: Установить ffmpeg и manim**

```bash
winget install --id Gyan.FFmpeg -e --accept-package-agreements --accept-source-agreements
```

Затем в новой оболочке:

```bash
ffmpeg -version | head -1 && python -m pip install --user manim && python -c "import manim; print(manim.__version__)"
```

Expected: версия ffmpeg и версия manim. Если установка падает более чем на 20 минут возни — перейти к Step 6 (SVG-фолбэк) и вернуться к Manim отдельной задачей. Это решение зафиксировано в спеке как допустимое.

- [ ] **Step 2: Сцена `FiniteIntersection`**

Числовая прямая, последовательно рисуются `(−1/n, 1/n)` для `n = 1..12`, каждый предыдущий гаснет, интервалы схлопываются к нулю. Финал: остаётся одна точка `{0}`, подпись «`⋂ₙ (−1/n, 1/n) = {0}` — не открыто», затем текст «поэтому в аксиоме 3 пересечение конечное». Длина 12–18 секунд.

- [ ] **Step 3: Сцена `BoundaryOfRationals`**

Прямая, на неё сыпятся рациональные точки со знаменателями до 40 — плотность видна. Затем два кадра: «в любом интервале есть точка `ℚ`» → `Int(ℚᶜ) = ∅`; «в любом интервале есть точка `ℚᶜ`» → `Int(ℚ) = ∅`. Финал: `∂ℚ = ℝ`, вся прямая подсвечивается как граница. Длина 15–20 секунд.

- [ ] **Step 4: Отрендерить**

```bash
cd conspect/manim && python -m manim -qm --format=mp4 scenes/lecture01.py FiniteIntersection BoundaryOfRationals && ls media/videos/lecture01/720p30/
```

Expected: два mp4.

- [ ] **Step 5: Перенести рендеры в сайт**

```bash
cp conspect/manim/media/videos/lecture01/720p30/FiniteIntersection.mp4 conspect/manim/media/videos/lecture01/720p30/BoundaryOfRationals.mp4 conspect/media/manim/ && du -h conspect/media/manim/*
```

Если суммарный размер больше 15 МБ — перерендерить в `-ql` (480p).

- [ ] **Step 6: Встроить в лекцию с фолбэком**

Разметка: `<video>` с `poster`, внутри `<track>` не нужен, но обязателен текстовый пересказ идеи сцены рядом — на случай, если видео не отрендерилось. Если Manim не встал: вместо `<video>` вставить статическую SVG-фигуру со стадиями `n = 1, 2, 4, 12` и той же подписью.

- [ ] **Step 7: `conspect/manim/README.md`**

Как поставить окружение, как отрендерить, куда положить результат. Три команды, без рассуждений.

- [ ] **Step 8: Коммит**

```bash
git add conspect/manim conspect/media/manim conspect/lectures/lecture-01.html && git commit -m "feat: Manim-сцены про конечность пересечения и границу рациональных"
```

---

## Task 16: Скилл для следующих лекций

**Files:**
- Create: `.claude/skills/difgem-notes/SKILL.md`
- Create: `.claude/skills/difgem-notes/templates/lecture-template.html`

- [ ] **Step 1: Шаблон страницы лекции**

Копия `lecture-01.html` с вычищенным содержанием: шапка, подключения, пустая структура секций, комментарий-памятка о порядке блоков.

- [ ] **Step 2: Написать `SKILL.md`**

Frontmatter: `name: difgem-notes`, `description: Use when creating or updating lecture and practice notes for the ITMO differential geometry course in conspect/ — enforces block structure, notation, widget contract and index rebuild.`

Тело: структура файлов; таблица типов блоков; правило дословного сохранения нумерации и обозначений преподавателя; каталог существующих виджетов с их конфигами; контракт добавления нового виджета; требование, что новые топологические вычисления идут в `topology.js` / `finite-topology.js` вместе с тестом; обязательный запуск `node --test conspect/tests/` и `node conspect/tools/build-index.mjs` перед коммитом; требование блока `ml` в каждом разделе; чеклист готовности лекции.

- [ ] **Step 3: Проверка скилла**

Убедиться, что описанные пути и команды существуют и работают: прогнать команды из чеклиста.

- [ ] **Step 4: Коммит**

```bash
git add .claude/skills/difgem-notes && git commit -m "feat: скилл difgem-notes с шаблоном и правилами конспекта"
```

---

## Task 17: Финальная верификация итерации

**Files:**
- Modify: по результатам проверок

- [ ] **Step 1: Прогнать все тесты**

Run: `node --test conspect/tests/`
Expected: все тесты проходят, ноль падений.

- [ ] **Step 2: Пересобрать индексы**

Run: `node conspect/tools/build-index.mjs`
Expected: сводка без ошибок, файлы `search-index.json`, `search-index.js`, `cheatsheet-data.js` обновлены.

- [ ] **Step 3: Пройти чеклист готовности из спеки в браузере**

Проверить по пунктам критериев готовности спеки:
- главная открывается по `file://`, работает без сети;
- формулы отрендерены KaTeX;
- в лекции 1 присутствуют все 12 `Def`, 5 `Lm`, 11 `Ex`, 6 `NB` — проверить счётом: `grep -o 'data-label="[^"]*"' conspect/lectures/lecture-01.html | sort | uniq -c`;
- каждый раздел имеет хотя бы один визуал;
- шесть виджетов работают мышью и тачем, окно ресайзится;
- доказательства `Lm. 3` и `Lm. 5` разобраны по шагам;
- поиск находит `Int`, `стрелка`, `замыкание`;
- Manim-сцены встроены или заменены SVG-фолбэком;
- тёмная и светлая темы читаемы, печать не ломается;
- прогресс переживает перезагрузку.

Каждый непройденный пункт — исправить и перепроверить.

- [ ] **Step 4: Проверить офлайн-режим честно**

Найти в HTML все внешние ссылки: `grep -rn 'https\?://' conspect --include=*.html --include=*.js --include=*.css | grep -v vendor`
Expected: ни одной ссылки на внешние скрипты, стили или шрифты. Ссылки в текстах на литературу допустимы, но не должны быть подключениями ресурсов.

- [ ] **Step 5: Скриншоты итога**

Снять скриншоты: главная, лекция 1 сверху, раздел 1.3 с виджетом, шпаргалка, светлая тема, мобильный вид. Показать пользователю.

- [ ] **Step 6: Финальный коммит**

```bash
git add -A conspect && git commit -m "chore: финальная верификация итерации 1"
```

---

## Self-review

**Покрытие спеки:**

| Раздел спеки | Задачи |
|---|---|
| Структура файлов | 1 |
| `style.css` | 5 |
| `app.js` | 6, 13 |
| `viz.js` + контракт | 7, 8 |
| KaTeX офлайн | 1, 17 (Step 4) |
| `build-index.mjs` | 12, 13 (Step 5), 14 |
| Manim | 15 |
| Видео | 1 (Step 5), 11 (Step 3), 13 (Step 4) |
| Анатомия страницы лекции, типы блоков | 5 (Step 2), 9, 10 |
| Нотация 1:1 | 9, 10, 16 (Step 2), 17 (Step 3) |
| Связь с ИИ | 9 (Step 3), 10 (Step 5) |
| Шпаргалка | 14 |
| Карточки | 6 (Step 5), 9 (Step 3), 10 (Step 6) |
| Процесс добавления лекции | 12, 16 |
| Критерии готовности | 17 |

Пробелов не осталось. Практический лист №1 в этой итерации сознательно отсутствует — это решение спеки, он идёт отдельным планом.

**Согласованность имён:** `format`, `normalize`, `set`, `point`, `interval`, `union`, `intersect`, `complement`, `contains`, `interior`, `closure`, `boundary`, `classifyPoint`, `TOPOLOGIES` — из задач 2–3, используются в задаче 8 под теми же именами. `isTopology`, `allTopologies`, `describeTopology`, `describeSubset`, `interiorIn`, `closureIn`, `boundaryIn`, `isStronger`, `blockTopology` — из задачи 4, используются в задаче 8. `register`, `mountAll` — задача 7, используются в задачах 6 и 8. `extractEntries` — задача 12, используется в задачах 13–14. `readProgress` — задача 6, используется в задаче 13.

**Риски, зафиксированные с митигацией:**
- Нет сети при вендоринге KaTeX — задача 1 Step 2 останавливает работу и требует решения пользователя.
- `fetch` по `file://` блокируется CORS — обойдено генерацией `.js` вместо чтения `.json` (задача 13 Step 2).
- Manim может не встать на Windows — SVG-фолбэк (задача 15 Step 6), сайт не блокируется.
- Перечисление топологий на 4 точках может быть медленным — замер в задаче 4 Step 5 с явным правилом отказа.
