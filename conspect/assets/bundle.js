/* Собрано автоматически: node tools/build.mjs. Правь модули в assets/, не этот файл. */
(function () {
"use strict";
/* ---- assets/topology.js ---- */
const interval = (lo, hi, loClosed, hiClosed) => ({ lo, hi, loClosed, hiClosed });

const point = (x) => interval(x, x, true, true);

const REAL_LINE = interval(-Infinity, Infinity, false, false);

const EMPTY = [];

const sanitize = (c) => ({
  lo: c.lo,
  hi: c.hi,
  loClosed: c.lo === -Infinity ? false : c.loClosed,
  hiClosed: c.hi === Infinity ? false : c.hiClosed,
});

const isEmptyComponent = (c) => c.lo > c.hi || (c.lo === c.hi && !(c.loClosed && c.hiClosed));

const compareComponents = (a, b) => {
  if (a.lo !== b.lo) return a.lo < b.lo ? -1 : 1;
  if (a.loClosed !== b.loClosed) return a.loClosed ? -1 : 1;
  return 0;
};

const touchesOrOverlaps = (earlier, later) =>
  later.lo < earlier.hi || (later.lo === earlier.hi && (earlier.hiClosed || later.loClosed));

const endsAfter = (candidate, reference) =>
  candidate.hi > reference.hi
  || (candidate.hi === reference.hi && candidate.hiClosed && !reference.hiClosed);

function normalize(components) {
  const alive = components.map(sanitize).filter((c) => !isEmptyComponent(c));
  const sorted = alive.sort(compareComponents);
  const merged = [];
  for (const current of sorted) {
    const last = merged[merged.length - 1];
    if (last && touchesOrOverlaps(last, current)) {
      if (endsAfter(current, last)) {
        last.hi = current.hi;
        last.hiClosed = current.hiClosed;
      }
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

const set = (...components) => normalize(components);

const isEmpty = (s) => s.length === 0;

const formatBound = (value) => {
  if (value === -Infinity) return '-∞';
  if (value === Infinity) return '+∞';
  return String(Math.round(value * 1000) / 1000);
};

const formatComponent = (c) => {
  if (c.lo === c.hi) return `{${formatBound(c.lo)}}`;
  return `${c.loClosed ? '[' : '('}${formatBound(c.lo)}, ${formatBound(c.hi)}${c.hiClosed ? ']' : ')'}`;
};

const format = (s) => (isEmpty(s) ? '∅' : s.map(formatComponent).join(' ∪ '));

const equals = (a, b) => {
  const x = normalize(a);
  const y = normalize(b);
  return x.length === y.length && x.every((c, i) => c.lo === y[i].lo
    && c.hi === y[i].hi
    && c.loClosed === y[i].loClosed
    && c.hiClosed === y[i].hiClosed);
};

const union = (a, b) => normalize([...a, ...b]);

function intersect(a, b) {
  const pieces = [];
  for (const x of a) {
    for (const y of b) {
      const lo = x.lo > y.lo ? x.lo : y.lo;
      const hi = x.hi < y.hi ? x.hi : y.hi;
      const loClosed = x.lo === y.lo
        ? x.loClosed && y.loClosed
        : (x.lo > y.lo ? x.loClosed : y.loClosed);
      const hiClosed = x.hi === y.hi
        ? x.hiClosed && y.hiClosed
        : (x.hi < y.hi ? x.hiClosed : y.hiClosed);
      pieces.push(interval(lo, hi, loClosed, hiClosed));
    }
  }
  return normalize(pieces);
}

function complement(s, ambient = [REAL_LINE]) {
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

const contains = (s, x) => s.some((c) =>
  (c.lo < x || (c.lo === x && c.loClosed)) && (x < c.hi || (c.hi === x && c.hiClosed)));

const ARROW_SPACE = [interval(0, Infinity, true, false)];

const openComponents = (s) => normalize(
  s.filter((c) => c.lo !== c.hi).map((c) => interval(c.lo, c.hi, false, false)),
);

const closeComponents = (s) => normalize(
  s.map((c) => interval(c.lo, c.hi, true, true)),
);

const largestRayInside = (s) => {
  const last = s[s.length - 1];
  if (!last || last.hi !== Infinity) return EMPTY;
  return [interval(last.lo, Infinity, false, false)];
};

const supremum = (s) => (isEmpty(s) ? -Infinity : s[s.length - 1].hi);

const complementIsFinite = (s) => complement(s).every((c) => c.lo === c.hi);

const consistsOfPoints = (s) => s.every((c) => c.lo === c.hi);

const TOPOLOGIES = {
  st: {
    id: 'st',
    label: '\\tau_{st}',
    name: 'стандартная',
    space: [REAL_LINE],
    interior: openComponents,
    closure: closeComponents,
  },
  arrow: {
    id: 'arrow',
    label: '\\tau_{\\to}',
    name: 'стрелка',
    space: ARROW_SPACE,
    interior: (s) => (equals(s, ARROW_SPACE) ? ARROW_SPACE : largestRayInside(s)),
    closure: (s) => {
      if (isEmpty(s)) return EMPTY;
      const top = supremum(s);
      return top === Infinity ? ARROW_SPACE : [interval(0, top, true, true)];
    },
  },
  cofinite: {
    id: 'cofinite',
    label: '\\tau_{CF}',
    name: 'конечных дополнений',
    space: [REAL_LINE],
    interior: (s) => (complementIsFinite(s) ? normalize(s) : EMPTY),
    closure: (s) => (consistsOfPoints(s) ? normalize(s) : [REAL_LINE]),
  },
};

const interior = (s, topology = TOPOLOGIES.st) =>
  intersect(topology.interior(normalize(s)), topology.space);

const closure = (s, topology = TOPOLOGIES.st) =>
  intersect(topology.closure(normalize(s)), topology.space);

const boundary = (s, topology = TOPOLOGIES.st) => {
  const inside = interior(s, topology);
  const outside = interior(complement(s, topology.space), topology);
  return complement(union(inside, outside), topology.space);
};

function classifyPoint(s, x, topology = TOPOLOGIES.st) {
  if (contains(interior(s, topology), x)) return 'interior';
  if (contains(boundary(s, topology), x)) return 'boundary';
  return 'exterior';
}

/* ---- assets/finite-topology.js ---- */
const fullMask = (size) => (1 << size) - 1;

const universeOf = (family, size) => (size === undefined ? Math.max(...family) : fullMask(size));

function isTopology(family, size) {
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

function allTopologies(size) {
  const universe = fullMask(size);
  const middle = [];
  for (let mask = 1; mask < universe; mask += 1) middle.push(mask);
  const result = [];
  for (let choice = 0; choice < (1 << middle.length); choice += 1) {
    const family = [0, universe];
    for (let bit = 0; bit < middle.length; bit += 1) {
      if (choice & (1 << bit)) family.push(middle[bit]);
    }
    if (isTopology(family, size)) result.push(family.sort((x, y) => x - y));
  }
  return result;
}

const maskToLabels = (mask, labels) => labels.filter((_, index) => mask & (1 << index));

const describeSubset = (mask, labels) =>
  (mask === 0 ? '∅' : `{${maskToLabels(mask, labels).join(', ')}}`);

const describeTopology = (family, labels) =>
  `{${[...family].sort((x, y) => x - y).map((mask) => describeSubset(mask, labels)).join(', ')}}`;

const interiorIn = (family, subset) => family
  .filter((open) => (open & subset) === open)
  .reduce((accumulated, open) => accumulated | open, 0);

function closureIn(family, subset, size) {
  const universe = universeOf(family, size);
  const outside = universe & ~subset;
  return universe & ~interiorIn(family, outside);
}

function boundaryIn(family, subset, size) {
  const universe = universeOf(family, size);
  return closureIn(family, subset, size) & ~interiorIn(family, subset) & universe;
}

const isStronger = (strong, weak) => weak.every((open) => strong.includes(open));

function blockTopology(blocks, labels) {
  const indexOf = new Map(labels.map((label, index) => [label, index]));
  const blockMasks = blocks.map((block) => block
    .reduce((mask, label) => mask | (1 << indexOf.get(label)), 0));
  const family = new Set([0]);
  for (let choice = 0; choice < (1 << blockMasks.length); choice += 1) {
    let mask = 0;
    for (let bit = 0; bit < blockMasks.length; bit += 1) {
      if (choice & (1 << bit)) mask |= blockMasks[bit];
    }
    family.add(mask);
  }
  return [...family].sort((x, y) => x - y);
}

const coveringEdges = (families) => {
  const edges = [];
  for (const strong of families) {
    for (const weak of families) {
      if (strong === weak || !isStronger(strong, weak)) continue;
      const hasIntermediate = families.some((middle) => middle !== strong
        && middle !== weak
        && isStronger(strong, middle)
        && isStronger(middle, weak));
      if (!hasIntermediate) edges.push([strong, weak]);
    }
  }
  return edges;
};

/* ---- assets/render.js ---- */
const SVG_NS = 'http://www.w3.org/2000/svg';

const svgNode = (name, attrs = {}) => {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue;
    node.setAttribute(key, String(value));
  }
  return node;
};

const clear = (node) => {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
};

const themeColor = (variable) =>
  getComputedStyle(document.documentElement).getPropertyValue(variable).trim();

const ROLE_VARS = {
  set: '--role-set',
  interior: '--role-interior',
  boundary: '--role-boundary',
  exterior: '--role-exterior',
  neighborhood: '--role-neighborhood',
  highlight: '--role-highlight',
  axis: '--border-strong',
  text: '--text-muted',
  faint: '--text-faint',
  surface: '--bg-deep',
};

const roleColor = (role) => themeColor(ROLE_VARS[role] || role);

function createCanvas(host, width, height) {
  const svg = svgNode('svg', {
    class: 'viz__canvas',
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
  });
  host.appendChild(svg);
  return svg;
}

function pointerPosition(svg, event) {
  const box = svg.getBoundingClientRect();
  const [minX, minY, width, height] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
  const scale = Math.min(box.width / width, box.height / height);
  const offsetX = (box.width - width * scale) / 2;
  const offsetY = (box.height - height * scale) / 2;
  return {
    x: minX + (event.clientX - box.left - offsetX) / scale,
    y: minY + (event.clientY - box.top - offsetY) / scale,
  };
}

function text(parent, value, x, y, options = {}) {
  const node = svgNode('text', {
    x,
    y,
    'text-anchor': options.anchor || 'middle',
    'dominant-baseline': options.baseline || 'auto',
    fill: options.color || roleColor('text'),
    'font-size': options.size || 13,
    'font-weight': options.weight || 400,
    'font-family': options.family || 'inherit',
    'font-style': options.style || 'normal',
  });
  node.textContent = value;
  parent.appendChild(node);
  return node;
}

function numberLine(parent, config) {
  const {
    from, to, y, left, right,
    ticks = [],
    tickLabels = true,
    arrows = true,
    label = null,
  } = config;
  const span = to - from;
  const scale = (value) => {
    if (value === -Infinity) return left;
    if (value === Infinity) return right;
    return left + ((value - from) / span) * (right - left);
  };
  const unscale = (px) => from + ((px - left) / (right - left)) * span;
  const axisColor = roleColor('axis');

  parent.appendChild(svgNode('line', {
    x1: left - (arrows ? 14 : 0),
    y1: y,
    x2: right + (arrows ? 14 : 0),
    y2: y,
    stroke: axisColor,
    'stroke-width': 1.5,
  }));

  if (arrows) {
    for (const [x, direction] of [[left - 14, -1], [right + 14, 1]]) {
      parent.appendChild(svgNode('path', {
        d: `M ${x + direction * 7} ${y} L ${x - direction * 2} ${y - 4.5} L ${x - direction * 2} ${y + 4.5} Z`,
        fill: axisColor,
      }));
    }
  }

  for (const tick of ticks) {
    const x = scale(tick);
    parent.appendChild(svgNode('line', {
      x1: x, y1: y - 5, x2: x, y2: y + 5, stroke: axisColor, 'stroke-width': 1.2,
    }));
    if (tickLabels) {
      text(parent, String(tick), x, y + 22, { color: roleColor('faint'), size: 13 });
    }
  }

  if (label) {
    text(parent, label, left - 18, y + 4, { anchor: 'end', color: roleColor('faint'), size: 13 });
  }

  return { scale, unscale };
}

function endpointMarker(parent, x, y, closed, color, background) {
  parent.appendChild(svgNode('circle', {
    cx: x,
    cy: y,
    r: 5,
    fill: closed ? color : background,
    stroke: color,
    'stroke-width': 2,
  }));
}

function drawSetOnLine(parent, config) {
  const {
    set, scale, y, color,
    thickness = 7,
    from, to,
    markers = true,
    opacity = 1,
  } = config;
  const background = themeColor('--bg-deep') || '#000';

  for (const component of set) {
    const visibleLo = Math.max(component.lo, from);
    const visibleHi = Math.min(component.hi, to);
    if (visibleHi < visibleLo) continue;

    if (component.lo === component.hi) {
      parent.appendChild(svgNode('circle', {
        cx: scale(component.lo), cy: y, r: 5.5, fill: color, opacity,
      }));
      continue;
    }

    parent.appendChild(svgNode('line', {
      x1: scale(visibleLo),
      y1: y,
      x2: scale(visibleHi),
      y2: y,
      stroke: color,
      'stroke-width': thickness,
      'stroke-linecap': 'butt',
      opacity,
    }));

    if (!markers) continue;
    if (component.lo >= from && component.lo !== -Infinity) {
      endpointMarker(parent, scale(component.lo), y, component.loClosed, color, background);
    }
    if (component.hi <= to && component.hi !== Infinity) {
      endpointMarker(parent, scale(component.hi), y, component.hiClosed, color, background);
    }
  }
}

function plane(parent, config) {
  const {
    xRange, yRange, left, right, top, bottom,
    grid = 1,
    axisLabels = true,
  } = config;
  const axisColor = roleColor('axis');
  const gridColor = themeColor('--border');
  const toPx = (x, y) => [
    left + ((x - xRange[0]) / (xRange[1] - xRange[0])) * (right - left),
    bottom - ((y - yRange[0]) / (yRange[1] - yRange[0])) * (bottom - top),
  ];
  const toMath = (px, py) => [
    xRange[0] + ((px - left) / (right - left)) * (xRange[1] - xRange[0]),
    yRange[0] + ((bottom - py) / (bottom - top)) * (yRange[1] - yRange[0]),
  ];

  if (grid) {
    for (let x = Math.ceil(xRange[0] / grid) * grid; x <= xRange[1]; x += grid) {
      const [px] = toPx(x, 0);
      parent.appendChild(svgNode('line', {
        x1: px, y1: top, x2: px, y2: bottom, stroke: gridColor, 'stroke-width': 1,
      }));
    }
    for (let y = Math.ceil(yRange[0] / grid) * grid; y <= yRange[1]; y += grid) {
      const [, py] = toPx(0, y);
      parent.appendChild(svgNode('line', {
        x1: left, y1: py, x2: right, y2: py, stroke: gridColor, 'stroke-width': 1,
      }));
    }
  }

  const [zeroX, zeroY] = toPx(0, 0);
  parent.appendChild(svgNode('line', {
    x1: left, y1: zeroY, x2: right, y2: zeroY, stroke: axisColor, 'stroke-width': 1.5,
  }));
  parent.appendChild(svgNode('line', {
    x1: zeroX, y1: bottom, x2: zeroX, y2: top, stroke: axisColor, 'stroke-width': 1.5,
  }));

  if (axisLabels) {
    text(parent, 'x¹', right - 4, zeroY - 8, { anchor: 'end', color: roleColor('faint'), size: 12 });
    text(parent, 'x²', zeroX + 10, top + 12, { anchor: 'start', color: roleColor('faint'), size: 12 });
  }

  return { toPx, toMath };
}

function legend(host, items) {
  const box = document.createElement('div');
  box.className = 'viz__legend';
  for (const [label, role] of items) {
    const entry = document.createElement('span');
    const swatch = document.createElement('i');
    swatch.style.background = roleColor(role);
    entry.appendChild(swatch);
    entry.appendChild(document.createTextNode(label));
    box.appendChild(entry);
  }
  host.appendChild(box);
  return box;
}

function shell(host, config) {
  const { badge = 'Виджет', title = '', caption = '' } = config;
  host.classList.add('viz');
  host.innerHTML = '';

  const head = document.createElement('div');
  head.className = 'viz__head';
  const badgeNode = document.createElement('span');
  badgeNode.className = 'viz__badge';
  badgeNode.textContent = badge;
  const titleNode = document.createElement('span');
  titleNode.className = 'viz__title';
  titleNode.textContent = title;
  head.append(badgeNode, titleNode);

  const body = document.createElement('div');
  body.className = 'viz__body';

  host.append(head, body);

  let captionNode = null;
  if (caption) {
    captionNode = document.createElement('p');
    captionNode.className = 'viz__caption';
    captionNode.innerHTML = caption;
  }

  return { body, head, captionNode };
}

function controlRow(parent) {
  const row = document.createElement('div');
  row.className = 'viz__controls';
  parent.appendChild(row);
  return row;
}

function buttonGroup(parent, options, onSelect, initial = 0) {
  const group = document.createElement('div');
  group.className = 'viz__group';
  const buttons = options.map((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = option.label;
    button.addEventListener('click', () => {
      buttons.forEach((other) => other.classList.remove('btn--active'));
      button.classList.add('btn--active');
      onSelect(option.value, index);
    });
    if (index === initial) button.classList.add('btn--active');
    group.appendChild(button);
    return button;
  });
  parent.appendChild(group);
  return { group, buttons };
}

function slider(parent, config) {
  const {
    label, min, max, step = 1, value, format = (v) => v, onInput,
  } = config;
  const wrap = document.createElement('label');
  wrap.className = 'viz__control';
  const caption = document.createElement('span');
  caption.textContent = label;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  const readout = document.createElement('b');
  readout.textContent = format(value);
  input.addEventListener('input', () => {
    readout.textContent = format(Number(input.value));
    onInput(Number(input.value));
  });
  wrap.append(caption, input, readout);
  parent.appendChild(wrap);
  return { input, readout };
}

function toggle(parent, config) {
  const { label, checked = false, onChange } = config;
  const wrap = document.createElement('label');
  wrap.className = 'viz__control';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  wrap.append(input, document.createTextNode(label));
  parent.appendChild(wrap);
  return input;
}

function readout(parent) {
  const box = document.createElement('div');
  box.className = 'viz__readout';
  const list = document.createElement('dl');
  box.appendChild(list);
  parent.appendChild(box);
  return {
    box,
    set(rows) {
      clearElement(list);
      for (const [term, definition, className] of rows) {
        const dt = document.createElement('dt');
        dt.textContent = term;
        const dd = document.createElement('dd');
        if (className) dd.className = className;
        dd.innerHTML = definition;
        list.append(dt, dd);
      }
    },
  };
}

const clearElement = (node) => {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
};

const mathText = (latex, display = false) => {
  if (!window.katex) return latex;
  try {
    return window.katex.renderToString(latex, { throwOnError: false, displayMode: display });
  } catch {
    return latex;
  }
};

const dragHandler = (svg, onMove) => {
  let active = false;
  const move = (event) => {
    if (!active) return;
    event.preventDefault();
    onMove(pointerPosition(svg, event));
  };
  svg.addEventListener('pointerdown', (event) => {
    active = true;
    svg.setPointerCapture(event.pointerId);
    onMove(pointerPosition(svg, event));
  });
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', () => { active = false; });
  svg.addEventListener('pointercancel', () => { active = false; });
};

/* ---- assets/viz.js ---- */
const registry = new Map();

const register = (name, factory) => registry.set(name, factory);

function mountAll(root = document) {
  const hosts = [...root.querySelectorAll('[data-viz]')];
  for (const host of hosts) {
    const factory = registry.get(host.dataset.viz);
    if (!factory) {
      host.innerHTML = `<p class="viz__error">Виджет не найден: ${host.dataset.viz}</p>`;
      continue;
    }
    let config = {};
    try {
      config = JSON.parse(host.dataset.vizConfig || '{}');
    } catch (error) {
      host.innerHTML = `<p class="viz__error">Плохой data-viz-config: ${error.message}</p>`;
      continue;
    }
    try {
      factory(host, config);
    } catch (error) {
      host.innerHTML = `<p class="viz__error">Ошибка виджета ${host.dataset.viz}: ${error.message}</p>`;
    }
  }
  document.addEventListener('difgem:themechange', () => {
    for (const host of hosts) host.dispatchEvent(new Event('difgem:redraw'));
  });
}

const snapTo = (value, step) => Math.round(value / step) * step;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

const componentsFromConfig = (raw) =>
  raw.map(([lo, hi, loClosed, hiClosed]) => interval(lo, hi, loClosed, hiClosed));

/* ============================ SetInspector ============================ */

const INSPECTOR_PRESETS = {
  st: [
    { label: '[2,5) ∪ {7}', components: [[2, 5, true, false], [7, 7, true, true]] },
    { label: '(0,1] ∪ {2}', components: [[0, 1, false, true], [2, 2, true, true]] },
    { label: '[2,5]', components: [[2, 5, true, true]] },
    { label: '(2,5)', components: [[2, 5, false, false]] },
  ],
  arrow: [
    { label: '[2,5)', components: [[2, 5, true, false]] },
    { label: '{1}', components: [[1, 1, true, true]] },
    { label: '[0,5)', components: [[0, 5, true, false]] },
    { label: '(3,+∞)', components: [[3, Infinity, false, false]] },
  ],
  cofinite: [
    { label: '{1} ∪ {2} ∪ {3}', components: [[1, 1, true, true], [2, 2, true, true], [3, 3, true, true]] },
    { label: '[0,1]', components: [[0, 1, true, true]] },
    { label: '(2,5)', components: [[2, 5, false, false]] },
  ],
};

register('SetInspector', (host, config) => {
  const width = 760;
  const height = 250;
  const state = {
    topology: TOPOLOGIES[config.topology || 'st'],
    operator: config.operator || 'interior',
    components: componentsFromConfig(config.initial || INSPECTOR_PRESETS.st[0].components),
  };

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'Инспектор множества: Int, Cl и граница',
    caption: config.caption || 'Тащи концы, чтобы менять множество. Короткий клик по кружку переключает строгость: закрашенный — конец включён, пустой — выколот.',
  });

  const svg = createCanvas(body, width, height);
  const controls = controlRow(body);
  const view = readout(body);

  const bounds = () => (state.topology.id === 'arrow' ? [0, 10] : [-2, 10]);

  const currentSet = () => set(...state.components);

  const operators = {
    interior: { label: 'Int', compute: (s) => interior(s, state.topology), role: 'interior' },
    closure: { label: 'Cl', compute: (s) => closure(s, state.topology), role: 'set' },
    boundary: { label: '∂', compute: (s) => boundary(s, state.topology), role: 'boundary' },
  };

  const draw = () => {
    clearElement(svg);
    const [from, to] = bounds();
    const left = 60;
    const right = width - 70;
    const ticks = [];
    for (let t = Math.ceil(from); t <= to; t += 1) ticks.push(t);

    const axisTop = numberLine(svg, {
      from, to, y: 78, left, right, ticks, label: state.topology.id === 'arrow' ? 'X = [0,+∞)' : 'ℝ',
    });
    const axisBottom = numberLine(svg, {
      from, to, y: 186, left, right, ticks, tickLabels: false, arrows: true,
    });

    const source = currentSet();
    const result = operators[state.operator].compute(source);

    text(svg, 'S', left - 26, 83, { anchor: 'end', color: roleColor('set'), size: 15, weight: 700 });
    drawSetOnLine(svg, {
      set: source, scale: axisTop.scale, y: 78, color: roleColor('set'), from, to,
    });

    text(svg, operators[state.operator].label, left - 26, 191, {
      anchor: 'end', color: roleColor(operators[state.operator].role), size: 15, weight: 700,
    });
    drawSetOnLine(svg, {
      set: result,
      scale: axisBottom.scale,
      y: 186,
      color: roleColor(operators[state.operator].role),
      from,
      to,
    });

    for (const [componentIndex, component] of state.components.entries()) {
      const handles = component.lo === component.hi
        ? [['lo', component.lo]]
        : [['lo', component.lo], ['hi', component.hi]];
      for (const [side, value] of handles) {
        if (value === -Infinity || value === Infinity) continue;
        const handle = svgNode('circle', {
          cx: axisTop.scale(value), cy: 78, r: 13, fill: 'transparent', cursor: 'grab',
        });
        handle.dataset.componentIndex = String(componentIndex);
        handle.dataset.side = side;
        svg.appendChild(handle);
      }
    }

    const isOpen = equals(interior(source, state.topology), source);
    const isClosed = equals(closure(source, state.topology), source);

    view.set([
      ['S', format(source)],
      [`Int${state.topology.id === 'arrow' ? '_X' : ''}(S)`, format(interior(source, state.topology))],
      ['Cl(S)', format(closure(source, state.topology))],
      ['∂S', format(boundary(source, state.topology))],
      ['открыто?', isOpen ? 'да' : 'нет', `viz__verdict viz__verdict--${isOpen ? 'yes' : 'no'}`],
      ['замкнуто?', isClosed ? 'да' : 'нет', `viz__verdict viz__verdict--${isClosed ? 'yes' : 'no'}`],
    ]);
  };

  let dragging = null;
  let dragStart = null;

  svg.addEventListener('pointerdown', (event) => {
    const target = event.target;
    if (!target.dataset || target.dataset.componentIndex === undefined) return;
    dragging = {
      index: Number(target.dataset.componentIndex),
      side: target.dataset.side,
    };
    dragStart = pointerPosition(svg, event);
    svg.setPointerCapture(event.pointerId);
  });

  svg.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    event.preventDefault();
    const [from, to] = bounds();
    const position = pointerPosition(svg, event);
    const left = 60;
    const right = width - 70;
    const value = clamp(
      snapTo(from + ((position.x - left) / (right - left)) * (to - from), 0.5),
      from,
      to,
    );
    const component = state.components[dragging.index];
    if (dragging.side === 'lo') {
      component.lo = Math.min(value, component.hi);
    } else {
      component.hi = Math.max(value, component.lo);
    }
    draw();
  });

  const finishDrag = (event) => {
    if (!dragging) return;
    const position = pointerPosition(svg, event);
    const moved = dragStart
      ? Math.hypot(position.x - dragStart.x, position.y - dragStart.y)
      : 99;
    if (moved < 4) {
      const component = state.components[dragging.index];
      if (component.lo !== component.hi) {
        if (dragging.side === 'lo') component.loClosed = !component.loClosed;
        else component.hiClosed = !component.hiClosed;
      }
    }
    dragging = null;
    dragStart = null;
    draw();
  };

  svg.addEventListener('pointerup', finishDrag);
  svg.addEventListener('pointercancel', () => { dragging = null; });

  if (config.topologySwitch !== false) {
    buttonGroup(
      controls,
      [
        { label: 'τ_st', value: 'st' },
        { label: 'τ_→', value: 'arrow' },
        { label: 'τ_CF', value: 'cofinite' },
      ],
      (value) => {
        state.topology = TOPOLOGIES[value];
        const preset = INSPECTOR_PRESETS[value][0];
        state.components = componentsFromConfig(preset.components);
        renderPresets();
        draw();
      },
      ['st', 'arrow', 'cofinite'].indexOf(state.topology.id),
    );
  }

  buttonGroup(
    controls,
    [
      { label: 'Int', value: 'interior' },
      { label: 'Cl', value: 'closure' },
      { label: '∂', value: 'boundary' },
    ],
    (value) => {
      state.operator = value;
      draw();
    },
    ['interior', 'closure', 'boundary'].indexOf(state.operator),
  );

  const presetSlot = document.createElement('div');
  presetSlot.className = 'viz__control';
  controls.appendChild(presetSlot);

  function renderPresets() {
    clearElement(presetSlot);
    const label = document.createElement('span');
    label.textContent = 'примеры:';
    presetSlot.appendChild(label);
    const select = document.createElement('select');
    select.className = 'btn';
    for (const [index, preset] of INSPECTOR_PRESETS[state.topology.id].entries()) {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = preset.label;
      select.appendChild(option);
    }
    select.addEventListener('change', () => {
      const preset = INSPECTOR_PRESETS[state.topology.id][Number(select.value)];
      state.components = componentsFromConfig(preset.components);
      draw();
    });
    presetSlot.appendChild(select);
  }

  renderPresets();
  legend(body, [['множество S', 'set'], ['внутренность', 'interior'], ['граница', 'boundary']]);
  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});

/* ============================ PointProber ============================ */

const PROBER_SETS = {
  halfPlane: {
    title: 'A = { (x¹, x²) : x¹ ⩾ 0 }',
    xRange: [-2.4, 2.4],
    yRange: [-1.7, 1.7],
    contains: (x) => x >= 0,
    ambients: { R2: () => true },
    draw: (parent, geometry) => {
      const [x0, y0] = geometry.toPx(0, 1.7);
      const [x1, y1] = geometry.toPx(2.4, -1.7);
      parent.appendChild(svgNode('rect', {
        x: x0, y: y0, width: x1 - x0, height: y1 - y0,
        fill: roleColor('set'), opacity: 0.18,
      }));
      parent.appendChild(svgNode('line', {
        x1: x0, y1: y0, x2: x0, y2: y1,
        stroke: roleColor('boundary'), 'stroke-width': 2.5,
      }));
    },
  },
  practiceFive: {
    title: 'S = { 0 ⩽ x¹ ⩽ ½, ½ < x² < 1 } внутри X = [0,1) × [0,1)',
    xRange: [-0.35, 1.35],
    yRange: [-0.35, 1.35],
    contains: (x, y) => x >= 0 && x <= 0.5 && y > 0.5 && y < 1,
    ambients: {
      R2: () => true,
      X: (x, y) => x >= 0 && x < 1 && y >= 0 && y < 1,
    },
    draw: (parent, geometry) => {
      const [ax, ay] = geometry.toPx(0, 1);
      const [bx, by] = geometry.toPx(1, 0);
      parent.appendChild(svgNode('rect', {
        x: ax, y: ay, width: bx - ax, height: by - ay,
        fill: 'none', stroke: roleColor('exterior'), 'stroke-width': 1.5, 'stroke-dasharray': '5 4',
      }));
      const [sx, sy] = geometry.toPx(0, 1);
      const [ex, ey] = geometry.toPx(0.5, 0.5);
      parent.appendChild(svgNode('rect', {
        x: sx, y: sy, width: ex - sx, height: ey - sy,
        fill: roleColor('set'), opacity: 0.22,
        stroke: roleColor('boundary'), 'stroke-width': 2,
      }));
      text(parent, 'X', bx - 8, by - 10, { anchor: 'end', color: roleColor('exterior'), size: 14 });
      text(parent, 'S', ex + 14, sy + 18, { anchor: 'start', color: roleColor('set'), size: 16, weight: 700 });
    },
  },
  openDisk: {
    title: 'S = { x : |x| < 1 } — открытый круг',
    xRange: [-2.2, 2.2],
    yRange: [-1.6, 1.6],
    contains: (x, y) => x * x + y * y < 1,
    ambients: { R2: () => true },
    draw: (parent, geometry) => {
      const [cx, cy] = geometry.toPx(0, 0);
      const [ex] = geometry.toPx(1, 0);
      parent.appendChild(svgNode('circle', {
        cx, cy, r: ex - cx,
        fill: roleColor('set'), opacity: 0.2,
        stroke: roleColor('boundary'), 'stroke-width': 2.5, 'stroke-dasharray': '6 4',
      }));
    },
  },
};

const PROBE_SAMPLES = (() => {
  const samples = [[0, 0]];
  for (let ring = 1; ring <= 6; ring += 1) {
    const radius = ring / 6;
    const count = ring * 10;
    for (let k = 0; k < count; k += 1) {
      const angle = (2 * Math.PI * k) / count;
      samples.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
    }
  }
  return samples;
})();

const classifyInPlane = (definition, ambientKey, px, py) => {
  const inAmbient = definition.ambients[ambientKey];
  if (!inAmbient(px, py)) return 'outside-space';
  const probe = 0.004;
  let insideCount = 0;
  let ambientCount = 0;
  for (const [dx, dy] of PROBE_SAMPLES) {
    const x = px + dx * probe;
    const y = py + dy * probe;
    if (!inAmbient(x, y)) continue;
    ambientCount += 1;
    if (definition.contains(x, y)) insideCount += 1;
  }
  if (insideCount === ambientCount) return 'interior';
  if (insideCount === 0) return 'exterior';
  return 'boundary';
};

const ROLE_LABELS = {
  interior: 'внутренняя точка S',
  boundary: 'граничная точка S',
  exterior: 'внешняя точка S',
  'outside-space': 'точка вне пространства',
};

register('PointProber', (host, config) => {
  const width = 720;
  const height = 400;
  const definition = PROBER_SETS[config.set || 'halfPlane'];
  const ambientKeys = Object.keys(definition.ambients);
  const state = {
    px: config.startX ?? 0,
    py: config.startY ?? 0.75,
    radius: config.radius ?? 0.35,
    ambient: ambientKeys[0],
    showBoundary: false,
  };

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'Пробник точки: внутренняя, граничная, внешняя',
    caption: config.caption || 'Тащи точку <b>P</b>. Окрестность <b>O<sub>P</sub></b> зелёная, когда целиком лежит в S — тогда P внутренняя по Def. 6. Если любая окрестность цепляет и S, и дополнение, точка граничная по Def. 9.',
  });

  const svg = createCanvas(body, width, height);
  const controls = controlRow(body);
  const view = readout(body);

  const draw = () => {
    clearElement(svg);
    const geometry = plane(svg, {
      xRange: definition.xRange,
      yRange: definition.yRange,
      left: 50,
      right: width - 50,
      top: 20,
      bottom: height - 40,
      grid: config.grid ?? 0.5,
    });

    definition.draw(svg, geometry);

    const role = classifyInPlane(definition, state.ambient, state.px, state.py);
    const [cx, cy] = geometry.toPx(state.px, state.py);
    const [edgeX] = geometry.toPx(state.px + state.radius, state.py);
    const pixelRadius = Math.abs(edgeX - cx);

    const neighbourhoodFits = (() => {
      for (const [dx, dy] of PROBE_SAMPLES) {
        const x = state.px + dx * state.radius;
        const y = state.py + dy * state.radius;
        if (!definition.ambients[state.ambient](x, y)) continue;
        if (!definition.contains(x, y)) return false;
      }
      return true;
    })();

    svg.appendChild(svgNode('circle', {
      cx, cy, r: pixelRadius,
      fill: neighbourhoodFits ? roleColor('interior') : roleColor('neighborhood'),
      'fill-opacity': 0.16,
      stroke: neighbourhoodFits ? roleColor('interior') : roleColor('neighborhood'),
      'stroke-width': 2,
      'stroke-dasharray': neighbourhoodFits ? 'none' : '5 4',
    }));

    const pointColor = role === 'interior'
      ? roleColor('interior')
      : (role === 'boundary' ? roleColor('boundary') : roleColor('exterior'));

    svg.appendChild(svgNode('circle', {
      cx, cy, r: 6.5, fill: pointColor, stroke: themeColor('--bg-deep'), 'stroke-width': 2,
    }));
    text(svg, 'P', cx + 12, cy - 8, { anchor: 'start', color: pointColor, size: 14, weight: 700 });

    view.set([
      ['P', `(${state.px.toFixed(2)}, ${state.py.toFixed(2)})`],
      ['P ∈ S?', definition.contains(state.px, state.py) ? 'да' : 'нет'],
      ['роль P', ROLE_LABELS[role], `viz__verdict viz__verdict--${role === 'boundary' ? 'no' : 'yes'}`],
      ['O_P ⊆ S при текущем радиусе?', neighbourhoodFits ? 'да' : 'нет',
        `viz__verdict viz__verdict--${neighbourhoodFits ? 'yes' : 'no'}`],
    ]);
  };

  svg.addEventListener('pointerdown', (event) => svg.setPointerCapture(event.pointerId));
  const moveTo = (event) => {
    const position = pointerPosition(svg, event);
    const left = 50;
    const right = width - 50;
    const top = 20;
    const bottom = height - 40;
    state.px = clamp(
      definition.xRange[0]
        + ((position.x - left) / (right - left)) * (definition.xRange[1] - definition.xRange[0]),
      definition.xRange[0],
      definition.xRange[1],
    );
    state.py = clamp(
      definition.yRange[0]
        + ((bottom - position.y) / (bottom - top)) * (definition.yRange[1] - definition.yRange[0]),
      definition.yRange[0],
      definition.yRange[1],
    );
    draw();
  };
  svg.addEventListener('pointermove', (event) => {
    if (event.buttons === 0) return;
    event.preventDefault();
    moveTo(event);
  });
  svg.addEventListener('pointerdown', moveTo);

  slider(controls, {
    label: 'радиус O_P',
    min: 0.02,
    max: 0.8,
    step: 0.01,
    value: state.radius,
    format: (value) => value.toFixed(2),
    onInput: (value) => {
      state.radius = value;
      draw();
    },
  });

  if (ambientKeys.length > 1) {
    buttonGroup(
      controls,
      ambientKeys.map((key) => ({ label: key === 'R2' ? 'в ℝ²' : `в ${key}`, value: key })),
      (value) => {
        state.ambient = value;
        draw();
      },
    );
  }

  legend(body, [
    ['внутренняя', 'interior'],
    ['граничная', 'boundary'],
    ['внешняя', 'exterior'],
    ['окрестность O_P', 'neighborhood'],
  ]);
  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});

/* ============================ AxiomChecker ============================ */

register('AxiomChecker', (host, config) => {
  const width = 760;
  const height = 300;
  const state = { count: 4, mode: 'intersection', limit: false };

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'Почему в аксиоме 3 пересечение конечное',
    caption: config.caption || 'Объединение любого числа открытых множеств открыто — аксиома 2 не требует конечности. Пересечение конечного числа тоже открыто. Но <b>бесконечное</b> пересечение той же серии даёт точку {0}, которая не открыта в τ<sub>st</sub>.',
  });

  const svg = createCanvas(body, width, height);
  const controls = controlRow(body);
  const view = readout(body);

  const family = () => {
    const items = [];
    for (let n = 1; n <= state.count; n += 1) {
      items.push(set(interval(-1 / n, 1 / n, false, false)));
    }
    return items;
  };

  const combine = (items) => {
    if (state.limit) return set(point(0));
    if (state.mode === 'union') return items.reduce((acc, item) => union(acc, item), set());
    return items.reduce((acc, item) => intersect(acc, item), set(interval(-2, 2, false, false)));
  };

  const draw = () => {
    clearElement(svg);
    const from = -1.25;
    const to = 1.25;
    const left = 70;
    const right = width - 60;
    const items = family();
    const rowGap = Math.min(26, 150 / Math.max(items.length, 1));

    for (const [index, item] of items.entries()) {
      const y = 40 + index * rowGap;
      const axis = numberLine(svg, {
        from, to, y, left, right, ticks: [], arrows: false, tickLabels: false,
      });
      drawSetOnLine(svg, {
        set: item, scale: axis.scale, y, color: roleColor('set'), from, to, thickness: 5, opacity: 0.85,
      });
      if (items.length <= 8) {
        text(svg, `n = ${index + 1}`, left - 14, y + 4, {
          anchor: 'end', color: roleColor('faint'), size: 12,
        });
      }
    }

    const resultY = 40 + items.length * rowGap + 46;
    const axis = numberLine(svg, {
      from, to, y: resultY, left, right, ticks: [-1, -0.5, 0, 0.5, 1],
    });
    const result = combine(items);
    drawSetOnLine(svg, {
      set: result, scale: axis.scale, y: resultY, color: roleColor('highlight'), from, to, thickness: 8,
    });
    text(svg, state.limit ? 'предел' : (state.mode === 'union' ? '∪' : '∩'), left - 14, resultY + 5, {
      anchor: 'end', color: roleColor('highlight'), size: 16, weight: 700,
    });

    const isOpen = !isEmpty(result) && equals(interior(result, TOPOLOGIES.st), result);
    view.set([
      ['серия', `(−1/n, 1/n), n = 1…${state.count}`],
      [state.limit ? 'бесконечное пересечение' : (state.mode === 'union' ? 'объединение' : 'пересечение'),
        format(result)],
      ['открыто в τ_st?', isEmpty(result) ? 'да (пустое множество открыто)' : (isOpen ? 'да' : 'нет'),
        `viz__verdict viz__verdict--${isEmpty(result) || isOpen ? 'yes' : 'no'}`],
      ['вывод', state.limit
        ? 'аксиома 3 ограничена конечными пересечениями именно поэтому'
        : 'конечное число операций сохраняет открытость'],
    ]);
  };

  buttonGroup(
    controls,
    [
      { label: 'пересечение', value: 'intersection' },
      { label: 'объединение', value: 'union' },
    ],
    (value) => {
      state.mode = value;
      state.limit = false;
      limitToggle.checked = false;
      draw();
    },
  );

  slider(controls, {
    label: 'число множеств n',
    min: 1,
    max: 12,
    step: 1,
    value: state.count,
    onInput: (value) => {
      state.count = value;
      draw();
    },
  });

  const limitToggle = toggle(controls, {
    label: 'взять n → ∞',
    checked: false,
    onChange: (checked) => {
      state.limit = checked;
      draw();
    },
  });

  legend(body, [['множества серии', 'set'], ['результат операции', 'highlight']]);
  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});

/* ============================ SubspaceViz ============================ */

register('SubspaceViz', (host, config) => {
  const width = 720;
  const height = 340;
  const state = { ambient: 'R2', px: 0.3, radius: 0.45 };

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'NB 1: открытость зависит от объемлющего пространства',
    caption: config.caption || 'Множество <b>U = (−1,1) × {0}</b> открыто в подпространстве <b>S = ℝ × {0}</b>, потому что в S окрестность точки — это интервал внутри прямой. В ℝ² окрестность точки — это диск, и он всегда вылезает за прямую, поэтому U там не открыто.',
  });

  const svg = createCanvas(body, width, height);
  const controls = controlRow(body);
  const view = readout(body);

  const draw = () => {
    clearElement(svg);
    const geometry = plane(svg, {
      xRange: [-2.6, 2.6],
      yRange: [-1.5, 1.5],
      left: 50,
      right: width - 50,
      top: 20,
      bottom: height - 40,
      grid: 0.5,
    });

    const [lineLeftX, lineY] = geometry.toPx(-2.6, 0);
    const [lineRightX] = geometry.toPx(2.6, 0);
    svg.appendChild(svgNode('line', {
      x1: lineLeftX, y1: lineY, x2: lineRightX, y2: lineY,
      stroke: roleColor('exterior'), 'stroke-width': 4,
    }));
    text(svg, 'S = ℝ × {0}', lineRightX - 10, lineY - 16, {
      anchor: 'end', color: roleColor('exterior'), size: 14,
    });

    const [ux] = geometry.toPx(-1, 0);
    const [vx] = geometry.toPx(1, 0);
    svg.appendChild(svgNode('line', {
      x1: ux, y1: lineY, x2: vx, y2: lineY,
      stroke: roleColor('set'), 'stroke-width': 8, 'stroke-linecap': 'butt',
    }));
    for (const endpoint of [ux, vx]) {
      svg.appendChild(svgNode('circle', {
        cx: endpoint, cy: lineY, r: 5, fill: themeColor('--bg-deep'),
        stroke: roleColor('set'), 'stroke-width': 2,
      }));
    }
    text(svg, 'U = (−1,1) × {0}', (ux + vx) / 2, lineY + 38, {
      color: roleColor('set'), size: 15, weight: 600,
    });

    const [cx] = geometry.toPx(state.px, 0);
    const [edgeX] = geometry.toPx(state.px + state.radius, 0);
    const pixelRadius = Math.abs(edgeX - cx);

    if (state.ambient === 'R2') {
      svg.appendChild(svgNode('circle', {
        cx, cy: lineY, r: pixelRadius,
        fill: roleColor('boundary'),
        'fill-opacity': 0.14,
        stroke: roleColor('boundary'),
        'stroke-width': 2,
        'stroke-dasharray': '5 4',
      }));
      text(svg, 'диск торчит за S', cx, lineY - pixelRadius - 10, {
        color: roleColor('boundary'), size: 12,
      });
    } else {
      svg.appendChild(svgNode('line', {
        x1: cx - pixelRadius, y1: lineY, x2: cx + pixelRadius, y2: lineY,
        stroke: roleColor('interior'), 'stroke-width': 14, opacity: 0.45, 'stroke-linecap': 'round',
      }));
      text(svg, 'окрестность внутри S', cx, lineY - 24, {
        color: roleColor('interior'), size: 12,
      });
    }

    svg.appendChild(svgNode('circle', {
      cx, cy: lineY, r: 6, fill: roleColor('highlight'),
      stroke: themeColor('--bg-deep'), 'stroke-width': 2,
    }));
    text(svg, 'P', cx + 11, lineY + 20, {
      anchor: 'start', color: roleColor('highlight'), size: 14, weight: 700,
    });

    const fitsInS = Math.abs(state.px) + state.radius <= 1;
    view.set([
      ['объемлющее пространство', state.ambient === 'R2' ? 'ℝ² со стандартной топологией' : 'S = ℝ × {0} с индуцированной топологией'],
      ['окрестность точки P', state.ambient === 'R2'
        ? 'диск радиуса r в плоскости'
        : 'интервал (P − r, P + r) внутри прямой'],
      ['O_P ⊆ U?', state.ambient === 'R2'
        ? 'нет ни при каком r > 0'
        : (fitsInS ? 'да' : 'нет при таком r, но найдётся меньшее'),
        `viz__verdict viz__verdict--${state.ambient === 'R2' ? 'no' : 'yes'}`],
      ['U открыто?', state.ambient === 'R2' ? 'нет' : 'да',
        `viz__verdict viz__verdict--${state.ambient === 'R2' ? 'no' : 'yes'}`],
    ]);
  };

  buttonGroup(
    controls,
    [
      { label: 'смотреть в ℝ²', value: 'R2' },
      { label: 'смотреть в S', value: 'S' },
    ],
    (value) => {
      state.ambient = value;
      draw();
    },
  );

  slider(controls, {
    label: 'положение P',
    min: -0.95,
    max: 0.95,
    step: 0.05,
    value: state.px,
    format: (value) => value.toFixed(2),
    onInput: (value) => {
      state.px = value;
      draw();
    },
  });

  slider(controls, {
    label: 'радиус r',
    min: 0.05,
    max: 1.2,
    step: 0.05,
    value: state.radius,
    format: (value) => value.toFixed(2),
    onInput: (value) => {
      state.radius = value;
      draw();
    },
  });

  legend(body, [['S', 'exterior'], ['U', 'set'], ['окрестность в S', 'interior'], ['диск в ℝ²', 'boundary']]);
  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});

/* ============================ TopologyLattice ============================ */

register('TopologyLattice', (host, config) => {
  const width = 760;
  const state = { size: config.size || 2, selected: null };

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'Все топологии на конечном множестве и порядок «сильнее — слабее»',
    caption: config.caption || 'Каждый узел — одна топология, перечислены программно проверкой трёх аксиом. Рёбра ведут от более сильной топологии к более слабой (Def. 4). Наверху дискретная τ<sub>d</sub>, внизу антидискретная τ<sub>a</sub> — это NB 2.',
  });

  const svg = createCanvas(body, width, state.size === 2 ? 260 : 460);
  const controls = controlRow(body);
  const view = readout(body);

  const labelsFor = (size) => ['a', 'b', 'c', 'd'].slice(0, size);
  const cache = new Map();
  const familiesFor = (size) => {
    if (!cache.has(size)) cache.set(size, allTopologies(size));
    return cache.get(size);
  };

  const draw = () => {
    const labels = labelsFor(state.size);
    const families = familiesFor(state.size);
    const height = state.size === 2 ? 260 : 460;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    clearElement(svg);

    const byLevel = new Map();
    for (const family of families) {
      const level = family.length;
      if (!byLevel.has(level)) byLevel.set(level, []);
      byLevel.get(level).push(family);
    }
    const levels = [...byLevel.keys()].sort((a, b) => a - b);
    const positions = new Map();
    const top = 34;
    const bottom = height - 34;

    for (const [levelIndex, level] of levels.entries()) {
      const row = byLevel.get(level);
      const y = bottom - (levelIndex / Math.max(levels.length - 1, 1)) * (bottom - top);
      for (const [index, family] of row.entries()) {
        const x = 90 + ((index + 0.5) / row.length) * (width - 180);
        positions.set(family, [x, y]);
      }
    }

    for (const [strong, weak] of coveringEdges(families)) {
      const [x1, y1] = positions.get(strong);
      const [x2, y2] = positions.get(weak);
      svg.appendChild(svgNode('line', {
        x1, y1, x2, y2, stroke: themeColor('--border'), 'stroke-width': 1,
      }));
    }

    const fullFamilySize = 1 << state.size;
    for (const family of families) {
      const [x, y] = positions.get(family);
      const isDiscrete = family.length === fullFamilySize;
      const isAntidiscrete = family.length === 2;
      const selected = state.selected === family;
      const node = svgNode('circle', {
        cx: x,
        cy: y,
        r: selected ? 9 : 6.5,
        fill: isDiscrete
          ? roleColor('interior')
          : (isAntidiscrete ? roleColor('boundary') : roleColor('set')),
        stroke: selected ? roleColor('highlight') : themeColor('--bg-deep'),
        'stroke-width': selected ? 3 : 1.5,
        cursor: 'pointer',
      });
      node.addEventListener('pointerdown', () => {
        state.selected = family;
        draw();
      });
      svg.appendChild(node);
    }

    for (const [levelIndex, level] of levels.entries()) {
      const y = bottom - (levelIndex / Math.max(levels.length - 1, 1)) * (bottom - top);
      text(svg, `${level} откр.`, 64, y + 4, {
        anchor: 'end', color: roleColor('faint'), size: 13,
      });
    }

    const chosen = state.selected || families[families.length - 1];
    view.set([
      ['множество X', `{${labels.join(', ')}}`],
      ['всего топологий', String(families.length)],
      ['выбранная топология', describeTopology(chosen, labels)],
      ['число открытых множеств', String(chosen.length)],
    ]);
  };

  buttonGroup(
    controls,
    [
      { label: '2 точки', value: 2 },
      { label: '3 точки', value: 3 },
    ],
    (value) => {
      state.size = value;
      state.selected = null;
      draw();
    },
    state.size === 2 ? 0 : 1,
  );

  legend(body, [['дискретная τ_d', 'interior'], ['антидискретная τ_a', 'boundary'], ['остальные', 'set']]);
  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});

/* ============================ BlockTopology ============================ */

register('BlockTopology', (host, config) => {
  const width = 720;
  const height = 220;
  const labels = config.labels || ['a', 'b', 'c', 'd', 'e', 'f'];
  const state = {
    blocks: config.blocks || [['a', 'b'], ['c', 'd'], ['e', 'f']],
    subset: config.subset || ['a', 'b', 'c'],
    split: false,
  };

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив · ИИ',
    title: config.title || 'Топология из блоков неразличимых объектов',
    caption: config.caption || 'Объекты внутри блока неразличимы по наблюдаемым признакам, поэтому открытыми объявляются объединения блоков. Уточнение признаков разбивает блок и делает топологию <b>сильнее</b>: внутренность растёт, замыкание сжимается, граница исчезает. Это задача 12 практического листа.',
  });

  const svg = createCanvas(body, width, height);
  const controls = controlRow(body);
  const view = readout(body);

  const splitTarget = (config.splitBlock || ['c', 'd']).join('');

  const currentBlocks = () => (state.split
    ? state.blocks.flatMap((block) => (block.join('') === splitTarget
      ? block.map((item) => [item])
      : [block]))
    : state.blocks);

  const maskOf = (items) => items
    .reduce((mask, item) => mask | (1 << labels.indexOf(item)), 0);

  const draw = () => {
    clearElement(svg);
    const blocks = currentBlocks();
    const family = blockTopology(blocks, labels);
    const subsetMask = maskOf(state.subset);
    const insideMask = interiorIn(family, subsetMask);
    const closureMask = closureIn(family, subsetMask, labels.length);
    const edgeMask = boundaryIn(family, subsetMask, labels.length);

    const cellWidth = (width - 100) / labels.length;
    let cursor = 60;
    for (const block of blocks) {
      const blockWidth = cellWidth * block.length;
      svg.appendChild(svgNode('rect', {
        x: cursor - 6, y: 52, width: blockWidth + 12, height: 76, rx: 10,
        fill: 'none', stroke: themeColor('--border-strong'), 'stroke-width': 1.5, 'stroke-dasharray': '6 4',
      }));
      cursor += blockWidth + 6;
    }

    cursor = 60;
    for (const block of blocks) {
      for (const item of block) {
        const bit = 1 << labels.indexOf(item);
        const isInterior = insideMask & bit;
        const isBoundary = edgeMask & bit;
        const inSubset = subsetMask & bit;
        svg.appendChild(svgNode('circle', {
          cx: cursor + cellWidth / 2,
          cy: 90,
          r: 20,
          fill: isInterior
            ? roleColor('interior')
            : (isBoundary ? roleColor('boundary') : roleColor('exterior')),
          'fill-opacity': inSubset ? 0.85 : 0.25,
          stroke: inSubset ? roleColor('set') : themeColor('--border'),
          'stroke-width': inSubset ? 3 : 1.5,
        }));
        text(svg, item, cursor + cellWidth / 2, 96, {
          color: inSubset ? themeColor('--bg-deep') : themeColor('--text'),
          size: 16,
          weight: 700,
        });
        cursor += cellWidth;
      }
      cursor += 6;
    }

    text(svg, 'жирная обводка — объект входит в A;  пунктир — блок неразличимых', 60, 170, {
      anchor: 'start', color: roleColor('faint'), size: 15,
    });

    view.set([
      ['A', describeSubset(subsetMask, labels)],
      ['Int(A)', describeSubset(insideMask, labels)],
      ['Cl(A)', describeSubset(closureMask, labels)],
      ['∂A', describeSubset(edgeMask, labels)],
      ['открытых множеств в τ', String(family.length)],
    ]);
  };

  toggle(controls, {
    label: 'новый признак различил c и d',
    checked: false,
    onChange: (checked) => {
      state.split = checked;
      draw();
    },
  });

  legend(body, [['внутренность', 'interior'], ['граница', 'boundary'], ['вне замыкания', 'exterior']]);
  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});

/* ============================ ArrowTopology ============================ */

register('ArrowTopology', (host, config) => {
  const width = 760;
  const height = 280;
  const state = {
    a: 3,
    preset: 0,
  };

  const presets = [
    { label: 'S = [2,5)', components: [[2, 5, true, false]] },
    { label: 'S = {1}', components: [[1, 1, true, true]] },
    { label: 'S = [0,5)', components: [[0, 5, true, false]] },
    { label: 'S = (3,+∞)', components: [[3, Infinity, false, false]] },
    { label: 'S = ∅', components: [] },
    { label: 'S = X', components: [[0, Infinity, true, false]] },
  ];

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'Топология стрелки на X = [0, +∞)',
    caption: config.caption || 'Открыты только ∅, всё X и лучи (a, +∞). Значит замкнуты только X, ∅ и отрезки [0, a]. Отсюда странные на первый взгляд ответы: у ограниченного множества внутренность пуста, а замыкание всегда начинается в нуле. Это Ex. 4, 6, 10 и задачи 9b, 17*.',
  });

  const svg = createCanvas(body, width, height);
  const controls = controlRow(body);
  const view = readout(body);

  const draw = () => {
    clearElement(svg);
    const from = 0;
    const to = 8;
    const left = 70;
    const right = width - 60;
    const ticks = [0, 1, 2, 3, 4, 5, 6, 7, 8];

    const rayAxis = numberLine(svg, {
      from, to, y: 60, left, right, ticks, tickLabels: false, label: 'открытое (a, +∞)',
    });
    drawSetOnLine(svg, {
      set: set(interval(state.a, Infinity, false, false)),
      scale: rayAxis.scale,
      y: 60,
      color: roleColor('neighborhood'),
      from,
      to,
    });

    const source = set(...presets[state.preset].components
      .map(([lo, hi, loClosed, hiClosed]) => interval(lo, hi, loClosed, hiClosed)));

    const setAxis = numberLine(svg, {
      from, to, y: 130, left, right, ticks, tickLabels: false, label: 'S',
    });
    drawSetOnLine(svg, {
      set: source, scale: setAxis.scale, y: 130, color: roleColor('set'), from, to,
    });

    const closureAxis = numberLine(svg, {
      from, to, y: 200, left, right, ticks, label: 'Cl(S) и Int(S)',
    });
    drawSetOnLine(svg, {
      set: closure(source, TOPOLOGIES.arrow),
      scale: closureAxis.scale,
      y: 200,
      color: roleColor('boundary'),
      from,
      to,
      thickness: 10,
      opacity: 0.5,
    });
    drawSetOnLine(svg, {
      set: interior(source, TOPOLOGIES.arrow),
      scale: closureAxis.scale,
      y: 200,
      color: roleColor('interior'),
      from,
      to,
      thickness: 5,
    });

    const isOpen = equals(interior(source, TOPOLOGIES.arrow), source);
    const isClosed = equals(closure(source, TOPOLOGIES.arrow), source);

    view.set([
      ['S', format(source)],
      ['Int_X(S)', format(interior(source, TOPOLOGIES.arrow))],
      ['Cl_X(S)', format(closure(source, TOPOLOGIES.arrow))],
      ['∂_X S', format(boundary(source, TOPOLOGIES.arrow))],
      ['S открыто?', isOpen ? 'да' : 'нет', `viz__verdict viz__verdict--${isOpen ? 'yes' : 'no'}`],
      ['S замкнуто?', isClosed ? 'да' : 'нет', `viz__verdict viz__verdict--${isClosed ? 'yes' : 'no'}`],
    ]);
  };

  const presetSlot = document.createElement('div');
  presetSlot.className = 'viz__control';
  const presetLabel = document.createElement('span');
  presetLabel.textContent = 'множество:';
  const presetSelect = document.createElement('select');
  presetSelect.className = 'btn';
  for (const [index, preset] of presets.entries()) {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = preset.label;
    presetSelect.appendChild(option);
  }
  presetSelect.addEventListener('change', () => {
    state.preset = Number(presetSelect.value);
    draw();
  });
  presetSlot.append(presetLabel, presetSelect);
  controls.appendChild(presetSlot);

  slider(controls, {
    label: 'граница луча a',
    min: 0,
    max: 7,
    step: 0.5,
    value: state.a,
    format: (value) => value.toFixed(1),
    onInput: (value) => {
      state.a = value;
      draw();
    },
  });

  legend(body, [
    ['открытый луч', 'neighborhood'],
    ['множество S', 'set'],
    ['Int_X(S)', 'interior'],
    ['Cl_X(S)', 'boundary'],
  ]);
  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});

/* ---- assets/app.js ---- */
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

const readProgress = () => readStore(PROGRESS_KEY, {});
const readCards = () => readStore(CARDS_KEY, {});

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
})();
