/* Собрано автоматически: node tools/build.mjs. Правь модули в assets/, не этот файл. */
(function () {
"use strict";
const __modules = {};
/* ---- topology ---- */
__modules['topology'] = (() => {
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

const unionAll = (sets) => normalize(sets.flat());

const uncovered = (target, family) => intersect(normalize(target), complement(unionAll(family)));

const meetingCount = (neighbourhood, family) =>
  family.filter((member) => !isEmpty(intersect(neighbourhood, member))).length;

const componentsOf = (s) => normalize(s).map((component) => [component]);

const isConnectedInLine = (s) => normalize(s).length <= 1;

const puncture = (s, x) => intersect(normalize(s), complement([point(x)]));
return { interval, point, REAL_LINE, EMPTY, normalize, set, isEmpty, format, equals, union, intersect, complement, contains, ARROW_SPACE, TOPOLOGIES, interior, closure, boundary, classifyPoint, unionAll, uncovered, meetingCount, componentsOf, isConnectedInLine, puncture };
})();

/* ---- finite-topology ---- */
__modules['finite-topology'] = (() => {
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

function generatedByUnions(family) {
  const unions = new Set([0]);
  for (const member of family) {
    for (const existing of [...unions]) unions.add(existing | member);
  }
  return [...unions].sort((x, y) => x - y);
}

const hasBaseWitness = (family, point, overlap) =>
  family.some((candidate) => (candidate & point) && (candidate & ~overlap) === 0);

function checkBase(family, size) {
  const universe = fullMask(size);
  const covered = family.reduce((accumulated, member) => accumulated | member, 0);
  if (covered !== universe) {
    return { ok: false, reason: 'cover', missing: universe & ~covered };
  }
  for (const first of family) {
    for (const second of family) {
      const overlap = first & second;
      for (let bit = 0; bit < size; bit += 1) {
        const point = 1 << bit;
        if ((overlap & point) && !hasBaseWitness(family, point, overlap)) {
          return { ok: false, reason: 'intersection', first, second, point };
        }
      }
    }
  }
  return { ok: true, topology: generatedByUnions(family) };
}

function isBaseOf(family, topology) {
  if (!family.every((member) => topology.includes(member))) return false;
  const generated = generatedByUnions(family);
  return generated.length === topology.length
    && generated.every((member) => topology.includes(member));
}

function finiteIntersections(subbase) {
  const intersections = new Set(subbase);
  let grew = true;
  while (grew) {
    grew = false;
    for (const first of [...intersections]) {
      for (const second of [...intersections]) {
        if (!intersections.has(first & second)) {
          intersections.add(first & second);
          grew = true;
        }
      }
    }
  }
  return [...intersections];
}

const separatedByOpen = (family, inside, outside) =>
  family.some((open) => (open & inside) && !(open & outside));

const separatedByDisjointOpens = (family, first, second) =>
  family.some((left) => (left & first) && family.some((right) => (right & second) && !(left & right)));

function separationFailure(family, size, kind) {
  for (let first = 0; first < size; first += 1) {
    for (let second = 0; second < size; second += 1) {
      if (first === second) continue;
      const firstBit = 1 << first;
      const secondBit = 1 << second;
      const separated = kind === 'T1'
        ? separatedByOpen(family, firstBit, secondBit)
        : separatedByDisjointOpens(family, firstBit, secondBit);
      if (!separated) return { first, second };
    }
  }
  return null;
}

const preimageMask = (map, mask) => map.reduce(
  (accumulated, target, source) => (mask & (1 << target) ? accumulated | (1 << source) : accumulated),
  0,
);

const imageMask = (map, mask) => map.reduce(
  (accumulated, target, source) => (mask & (1 << source) ? accumulated | (1 << target) : accumulated),
  0,
);

function continuityFailure(map, topologyX, topologyY) {
  for (const open of topologyY) {
    const pulled = preimageMask(map, open);
    if (!topologyX.includes(pulled)) return { open, preimage: pulled };
  }
  return null;
}

const isBijection = (map, sizeY) => map.length === sizeY && new Set(map).size === sizeY;

function inverseMap(map) {
  const inverse = [];
  map.forEach((target, source) => { inverse[target] = source; });
  return inverse;
}

const composeMaps = (outer, inner) => inner.map((target) => outer[target]);

const pullbackTopology = (map, topologyY) =>
  [...new Set(topologyY.map((open) => preimageMask(map, open)))].sort((x, y) => x - y);
return { isTopology, allTopologies, describeSubset, describeTopology, interiorIn, closureIn, boundaryIn, isStronger, blockTopology, coveringEdges, generatedByUnions, checkBase, isBaseOf, finiteIntersections, separationFailure, preimageMask, imageMask, continuityFailure, isBijection, inverseMap, composeMaps, pullbackTopology };
})();

/* ---- mappings ---- */
__modules['mappings'] = (() => {
const { interval, normalize, equals, interior, REAL_LINE, TOPOLOGIES } = __modules['topology'];

const openInterval = (low, high) => interval(low, high, false, false);

const FUNCTIONS = {
  linear: {
    id: 'linear',
    label: 'x/2 + 1',
    latex: 'f(x) = \tfrac{x}{2} + 1',
    continuous: true,
    evaluate: (x) => x / 2 + 1,
    preimage: (low, high) => [openInterval(2 * (low - 1), 2 * (high - 1))],
  },
  square: {
    id: 'square',
    label: 'x²',
    latex: 'f(x) = x^2',
    continuous: true,
    evaluate: (x) => x * x,
    preimage: (low, high) => {
      if (high <= 0) return [];
      const outer = Math.sqrt(high);
      if (low < 0) return [openInterval(-outer, outer)];
      const inner = Math.sqrt(low);
      return [openInterval(-outer, -inner), openInterval(inner, outer)];
    },
  },
  step: {
    id: 'step',
    label: 'ступенька',
    latex: 'H(x) = \begin{cases} 0, & x < 0 \\ 1, & x \geqslant 0 \end{cases}',
    continuous: false,
    jumps: [{ at: 0, left: 0, right: 1 }],
    evaluate: (x) => (x < 0 ? 0 : 1),
    preimage: (low, high) => {
      const hitsZero = low < 0 && 0 < high;
      const hitsOne = low < 1 && 1 < high;
      if (hitsZero && hitsOne) return [REAL_LINE];
      if (hitsOne) return [interval(0, Infinity, true, false)];
      if (hitsZero) return [openInterval(-Infinity, 0)];
      return [];
    },
  },
  constant: {
    id: 'constant',
    label: 'константа',
    latex: '\mathrm{const}_{y_0}(x) = 1.5',
    continuous: true,
    evaluate: () => 1.5,
    preimage: (low, high) => (low < 1.5 && 1.5 < high ? [REAL_LINE] : []),
  },
  tan: {
    id: 'tan',
    label: 'tg x',
    latex: '\mathrm{tg} : \left(-\tfrac{\pi}{2}, \tfrac{\pi}{2}\right) \to \mathbb{R}',
    continuous: true,
    domain: [-Math.PI / 2, Math.PI / 2],
    evaluate: Math.tan,
    preimage: (low, high) => [openInterval(Math.atan(low), Math.atan(high))],
  },
};

const preimage = (fn, low, high) => normalize(fn.preimage(low, high));

const isOpenInLine = (s) => equals(interior(s, TOPOLOGIES.st), s);
return { FUNCTIONS, preimage, isOpenInLine };
})();

/* ---- metric ---- */
__modules['metric'] = (() => {
const distance = ([x1, y1], [x2, y2]) => Math.hypot(x2 - x1, y2 - y1);

const hausdorffRadius = (p, q) => distance(p, q) / 3;

const ballsDisjoint = (p, q, radius) => 2 * radius <= distance(p, q);

function distanceToRectBoundary([x, y], { x1, x2, y1, y2 }) {
  const gaps = [x - x1, x2 - x, y - y1, y2 - y];
  return gaps.some((gap) => gap <= 0) ? 0 : Math.min(...gaps);
}

function firstFittingBall(center, rect) {
  const room = distanceToRectBoundary(center, rect);
  return room > 0 ? Math.ceil(1 / room - 1e-9) : Infinity;
}
return { distance, hausdorffRadius, ballsDisjoint, distanceToRectBoundary, firstFittingBall };
})();

/* ---- render ---- */
__modules['render'] = (() => {
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
    text(parent, label, left - 10, y - 14, { anchor: 'start', color: roleColor('faint'), size: 14 });
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
return { svgNode, clear, themeColor, ROLE_VARS, roleColor, createCanvas, pointerPosition, text, numberLine, drawSetOnLine, plane, legend, shell, controlRow, buttonGroup, slider, toggle, readout, clearElement, mathText, dragHandler };
})();

/* ---- viz ---- */
__modules['viz'] = (() => {
const { set, point, interval, format, equals, union, intersect, interior, closure, boundary, TOPOLOGIES, isEmpty } = __modules['topology'];
const { allTopologies, coveringEdges, describeTopology, describeSubset, interiorIn, closureIn, boundaryIn, blockTopology } = __modules['finite-topology'];
const { svgNode, createCanvas, clearElement, roleColor, themeColor, text, numberLine, drawSetOnLine, plane, legend, shell, controlRow, buttonGroup, slider, toggle, readout, pointerPosition } = __modules['render'];

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
return { register, mountAll, registry };
})();

/* ---- widgets-bases ---- */
__modules['widgets-bases'] = (() => {
const { register } = __modules['viz'];
const { checkBase, describeSubset, describeTopology } = __modules['finite-topology'];
const { svgNode, createCanvas, clearElement, roleColor, themeColor, text, shell, controlRow, readout, legend } = __modules['render'];

const LABELS = ['a', 'b', 'c'];
const POSITIONS = [[190, 225], [450, 225], [320, 85]];
const SUBSETS = [0b001, 0b010, 0b100, 0b011, 0b101, 0b110, 0b111];
const HULL_COLORS = [
  '--accent-def', '--accent-example', '--accent-nb', '--accent-lemma',
  '--accent-ml', '--accent-card', '--accent-theorem',
];

const PRESETS = [
  { label: 'NB 7: не база', members: [0b111, 0b011, 0b101] },
  { label: 'NB 7 + {a}: база', members: [0b001, 0b011, 0b101] },
  { label: 'одноточечные → τ_d', members: [0b001, 0b010, 0b100] },
  { label: 'цепочка {a} ⊂ {a,b} ⊂ X', members: [0b001, 0b011, 0b111] },
  { label: 'только X → τ_a', members: [0b111] },
];

const pointsOf = (mask) => LABELS.map((_, index) => index).filter((index) => mask & (1 << index));

const sizeOf = (mask) => pointsOf(mask).length;

function drawHull(parent, mask, color, emphasis) {
  const members = pointsOf(mask).map((index) => POSITIONS[index]);
  const opacity = emphasis ? 0.38 : 0.16;
  const outline = emphasis ? roleColor('highlight') : color;
  const outlineWidth = emphasis ? 3 : 1.5;

  if (members.length === 1) {
    const [[x, y]] = members;
    parent.appendChild(svgNode('circle', {
      cx: x, cy: y, r: 30, fill: color, 'fill-opacity': opacity,
      stroke: outline, 'stroke-width': outlineWidth,
    }));
    return;
  }

  const width = members.length === 2 ? 78 : 112;
  const pathData = members.map(([x, y], index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ')
    + (members.length > 2 ? ' Z' : '');
  parent.appendChild(svgNode('path', {
    d: pathData,
    fill: members.length > 2 ? color : 'none',
    'fill-opacity': opacity,
    stroke: color,
    'stroke-opacity': opacity,
    'stroke-width': width,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  }));
  if (emphasis) {
    parent.appendChild(svgNode('path', {
      d: pathData, fill: 'none', stroke: outline, 'stroke-width': outlineWidth,
      'stroke-dasharray': '6 5',
    }));
  }
}

register('BaseBuilder', (host, config) => {
  const width = 640;
  const height = 310;
  const state = { members: new Set(PRESETS[config.preset ?? 0].members) };

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'Сборщик базы: проверка условий Th. 1.1',
    caption: config.caption || 'Включай и выключай множества семейства β. Виджет проверяет оба условия Th. 1.1: '
      + 'β покрывает X, и в каждом пересечении двух элементов вокруг каждой его точки помещается '
      + 'элемент β. Если условия выполнены, ниже появляется порождённая топология — все объединения '
      + 'элементов β.',
  });

  const svg = createCanvas(body, width, height);
  const chips = controlRow(body);
  const presets = controlRow(body);
  const view = readout(body);

  const chipButtons = new Map();

  const draw = () => {
    clearElement(svg);
    const family = [...state.members].sort((x, y) => sizeOf(y) - sizeOf(x) || x - y);
    const verdict = checkBase(family, 3);
    const failingPair = verdict.reason === 'intersection' ? [verdict.first, verdict.second] : [];

    for (const mask of family) {
      drawHull(svg, mask, themeColor(HULL_COLORS[SUBSETS.indexOf(mask)]), failingPair.includes(mask));
    }

    const troubled = verdict.ok ? 0 : (verdict.reason === 'cover' ? verdict.missing : verdict.point);
    for (const [index, [x, y]] of POSITIONS.entries()) {
      const isTroubled = Boolean(troubled & (1 << index));
      svg.appendChild(svgNode('circle', {
        cx: x, cy: y, r: isTroubled ? 11 : 8,
        fill: isTroubled ? roleColor('boundary') : themeColor('--text'),
        stroke: themeColor('--bg-deep'), 'stroke-width': 2,
      }));
      text(svg, LABELS[index], x, y - 18, {
        color: isTroubled ? roleColor('boundary') : themeColor('--text'), size: 18, weight: 700,
      });
    }

    for (const [mask, button] of chipButtons) {
      button.classList.toggle('btn--active', state.members.has(mask));
    }

    const coverOk = verdict.ok || verdict.reason !== 'cover';
    const intersectionOk = verdict.ok;
    const rows = [
      ['β', family.length ? `{${family.map((mask) => describeSubset(mask, LABELS)).join(', ')}}` : '∅'],
      ['⋃β = X?', coverOk ? 'да' : `нет: не покрыта точка ${describeSubset(verdict.missing, LABELS)}`,
        `viz__verdict viz__verdict--${coverOk ? 'yes' : 'no'}`],
    ];
    if (coverOk) {
      rows.push(['условие пересечений', intersectionOk
        ? 'выполнено'
        : `нарушено: ${describeSubset(verdict.first, LABELS)} ∩ ${describeSubset(verdict.second, LABELS)} `
          + `= ${describeSubset(verdict.first & verdict.second, LABELS)}, а элемента β, содержащего `
          + `${LABELS[Math.log2(verdict.point)]} и лежащего внутри, нет`,
      `viz__verdict viz__verdict--${intersectionOk ? 'yes' : 'no'}`]);
    }
    rows.push(['β — база?', verdict.ok ? 'да' : 'нет', `viz__verdict viz__verdict--${verdict.ok ? 'yes' : 'no'}`]);
    if (verdict.ok) {
      rows.push(['порождённая τ', describeTopology(verdict.topology, LABELS)]);
      rows.push(['открытых множеств', String(verdict.topology.length)]);
    }
    view.set(rows);
  };

  const chipLabel = document.createElement('span');
  chipLabel.className = 'viz__control';
  chipLabel.textContent = 'элементы β:';
  chips.appendChild(chipLabel);
  for (const mask of SUBSETS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = describeSubset(mask, LABELS);
    button.addEventListener('click', () => {
      if (state.members.has(mask)) state.members.delete(mask);
      else state.members.add(mask);
      draw();
    });
    chipButtons.set(mask, button);
    chips.appendChild(button);
  }

  const presetLabel = document.createElement('span');
  presetLabel.className = 'viz__control';
  presetLabel.textContent = 'примеры:';
  presets.appendChild(presetLabel);
  for (const preset of PRESETS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = preset.label;
    button.addEventListener('click', () => {
      state.members = new Set(preset.members);
      draw();
    });
    presets.appendChild(button);
  }

  legend(body, [['пара, нарушающая условие', 'highlight'], ['проблемная точка', 'boundary']]);
  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});
return { LABELS, POSITIONS, SUBSETS, HULL_COLORS, pointsOf, sizeOf, drawHull };
})();

/* ---- widgets-covers ---- */
__modules['widgets-covers'] = (() => {
const { register } = __modules['viz'];
const { set, interval, format, intersect, isEmpty, unionAll, uncovered, meetingCount, REAL_LINE } = __modules['topology'];
const { svgNode, createCanvas, clearElement, roleColor, themeColor, text, numberLine, drawSetOnLine, shell, controlRow, buttonGroup, slider, readout, legend } = __modules['render'];

const open = (lo, hi) => set(interval(lo, hi, false, false));

const COVER_SCENARIOS = {
  interval: {
    label: '(0,1) и лучи (1/n, 1)',
    target: open(0, 1),
    targetLabel: '(0, 1)',
    window: [-0.08, 1.12],
    ticks: [0, 0.25, 0.5, 0.75, 1],
    members: Array.from({ length: 11 }, (_, index) => ({
      name: `(1/${index + 2}, 1)`,
      shape: open(1 / (index + 2), 1),
    })),
    moral: 'Сколько бы множеств ни выбрать, остаётся (0, 1/N]. Всё бесконечное семейство (0,1) '
      + 'покрывает, а никакая конечная часть — нет. Значит (0,1) не компактно.',
  },
  segment: {
    label: '[0,1] и те же лучи + (−0.1, 0.1)',
    target: set(interval(0, 1, true, true)),
    targetLabel: '[0, 1]',
    window: [-0.15, 1.15],
    ticks: [0, 0.25, 0.5, 0.75, 1],
    members: [
      { name: '(−0.1, 0.1)', shape: open(-0.1, 0.1) },
      ...Array.from({ length: 10 }, (_, index) => ({
        name: `(1/${index + 2}, 1.1)`,
        shape: open(1 / (index + 2), 1.1),
      })),
    ],
    moral: 'У отрезка точка 0 входит в множество, и её обязано покрыть что-то, содержащее 0. '
      + 'Этот элемент заодно накрывает маленький интервал вокруг нуля, и остаток добивается конечным '
      + 'числом лучей. Попробуй: двух элементов достаточно.',
  },
  line: {
    label: 'ℝ и интервалы (−n, n)',
    target: [REAL_LINE],
    targetLabel: 'ℝ',
    window: [-12, 12],
    ticks: [-10, -5, 0, 5, 10],
    members: Array.from({ length: 10 }, (_, index) => ({
      name: `(−${index + 1}, ${index + 1})`,
      shape: open(-(index + 1), index + 1),
    })),
    moral: 'Это Ex. 4. Объединение любого конечного набора (−n, n) — ограниченный интервал, '
      + 'а прямая неограниченна. Непокрытыми всегда остаются два хвоста.',
  },
};

register('CoverGame', (host, config) => {
  const width = 720;
  const state = {
    scenario: config.scenario || 'interval',
    selected: new Set(),
  };

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'Игра в подпокрытие: что значит компактность',
    caption: config.caption || 'Кликай по множествам покрытия, чтобы выбрать конечное подсемейство. '
      + 'Внизу зелёным — что уже покрыто, оранжевым — что осталось. Компактность (Def. 10) — это '
      + 'когда из <b>любого</b> открытого покрытия можно выбрать конечное подпокрытие.',
  });

  const svg = createCanvas(body, width, 360);
  const controls = controlRow(body);
  const view = readout(body);

  const draw = () => {
    const scenario = COVER_SCENARIOS[state.scenario];
    const rowGap = 21;
    const top = 26;
    const axisY = top + scenario.members.length * rowGap + 40;
    const height = axisY + 50;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    clearElement(svg);

    const [from, to] = scenario.window;
    const left = 150;
    const right = width - 40;

    for (const [index, member] of scenario.members.entries()) {
      const y = top + index * rowGap;
      const chosen = state.selected.has(index);
      const axis = numberLine(svg, {
        from, to, y, left, right, ticks: [], tickLabels: false, arrows: false,
      });
      drawSetOnLine(svg, {
        set: member.shape,
        scale: axis.scale,
        y,
        color: chosen ? roleColor('set') : roleColor('exterior'),
        from,
        to,
        thickness: chosen ? 7 : 4,
        opacity: chosen ? 1 : 0.45,
      });
      text(svg, member.name, left - 14, y + 5, {
        anchor: 'end', size: 13, color: chosen ? roleColor('set') : roleColor('faint'),
        weight: chosen ? 700 : 400,
      });
      const hit = svgNode('rect', {
        x: 0, y: y - rowGap / 2, width, height: rowGap, fill: 'transparent', cursor: 'pointer',
      });
      hit.addEventListener('pointerdown', () => {
        if (state.selected.has(index)) state.selected.delete(index);
        else state.selected.add(index);
        draw();
      });
      svg.appendChild(hit);
    }

    const axis = numberLine(svg, {
      from, to, y: axisY, left, right, ticks: scenario.ticks,
    });
    text(svg, scenario.targetLabel, left - 14, axisY + 5, {
      anchor: 'end', size: 15, weight: 700, color: themeColor('--text'),
    });

    const chosenShapes = [...state.selected].map((index) => scenario.members[index].shape);
    const covered = intersect(scenario.target, unionAll(chosenShapes));
    const remainder = uncovered(scenario.target, chosenShapes);
    drawSetOnLine(svg, {
      set: covered, scale: axis.scale, y: axisY, color: roleColor('interior'), from, to, thickness: 9,
    });
    drawSetOnLine(svg, {
      set: remainder, scale: axis.scale, y: axisY, color: roleColor('boundary'), from, to, thickness: 9,
    });

    const done = isEmpty(remainder);
    view.set([
      ['покрываем', scenario.targetLabel],
      ['выбрано множеств', `${state.selected.size} из ${scenario.members.length} показанных`],
      ['не покрыто', format(remainder), `viz__verdict viz__verdict--${done ? 'yes' : 'no'}`],
      ['конечное подпокрытие', done ? 'найдено' : 'пока нет', `viz__verdict viz__verdict--${done ? 'yes' : 'no'}`],
      ['вывод', scenario.moral],
    ]);
  };

  buttonGroup(
    controls,
    Object.entries(COVER_SCENARIOS).map(([key, scenario]) => ({ label: scenario.label, value: key })),
    (value) => {
      state.scenario = value;
      state.selected = new Set();
      draw();
    },
    Object.keys(COVER_SCENARIOS).indexOf(state.scenario),
  );

  const all = document.createElement('button');
  all.type = 'button';
  all.className = 'btn';
  all.textContent = 'выбрать все';
  all.addEventListener('click', () => {
    state.selected = new Set(COVER_SCENARIOS[state.scenario].members.map((_, index) => index));
    draw();
  });
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'btn';
  reset.textContent = 'сбросить';
  reset.addEventListener('click', () => {
    state.selected = new Set();
    draw();
  });
  controls.append(all, reset);

  legend(body, [['выбранные множества', 'set'], ['покрыто', 'interior'], ['не покрыто', 'boundary']]);
  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});

const FINITE_FAMILY_SIZE = 40;

const LOCAL_SCENARIOS = {
  finite: {
    label: 'Uₙ = (n−1, n+1), Ex. 5',
    members: Array.from({ length: FINITE_FAMILY_SIZE + 1 }, (_, index) => {
      const n = index - FINITE_FAMILY_SIZE / 2;
      return { name: `U${n}`, shape: open(n - 1, n + 1) };
    }),
    visible: (index) => Math.abs(index - FINITE_FAMILY_SIZE / 2) <= 6,
    verdict: (count) => `${count} — конечное число, покрытие локально конечно`,
  },
  nested: {
    label: '(−n, n): не локально конечно',
    members: Array.from({ length: FINITE_FAMILY_SIZE }, (_, index) => ({
      name: `(−${index + 1}, ${index + 1})`,
      shape: open(-(index + 1), index + 1),
    })),
    visible: (index) => index < 12,
    verdict: (count) => `${count} из ${FINITE_FAMILY_SIZE} построенных и каждое следующее тоже — бесконечно много`,
  },
};

register('LocallyFinite', (host, config) => {
  const width = 720;
  const state = { scenario: 'finite', x: 0.4, radius: 1 };

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'Локальная конечность: сколько множеств видит окрестность',
    caption: config.caption || 'Двигай точку x и радиус её окрестности. Подсвечены элементы покрытия, которые '
      + 'окрестность задевает. В локально конечном семействе (Def. 12) у <b>каждой</b> точки есть '
      + 'окрестность, задевающая конечное число элементов. Во втором примере окрестность нуля '
      + 'задевает их все, сколь бы маленькой она ни была.',
  });

  const svg = createCanvas(body, width, 340);
  const controls = controlRow(body);
  const view = readout(body);

  const draw = () => {
    const scenario = LOCAL_SCENARIOS[state.scenario];
    const shown = scenario.members
      .map((member, index) => ({ ...member, index }))
      .filter(({ index }) => scenario.visible(index));
    const rowGap = 19;
    const top = 22;
    const axisY = top + shown.length * rowGap + 36;
    svg.setAttribute('viewBox', `0 0 ${width} ${axisY + 48}`);
    clearElement(svg);

    const from = -6.5;
    const to = 6.5;
    const left = 110;
    const right = width - 40;
    const neighbourhood = open(state.x - state.radius, state.x + state.radius);

    for (const [row, member] of shown.entries()) {
      const y = top + row * rowGap;
      const hit = !isEmpty(intersect(neighbourhood, member.shape));
      const axis = numberLine(svg, {
        from, to, y, left, right, ticks: [], tickLabels: false, arrows: false,
      });
      drawSetOnLine(svg, {
        set: member.shape, scale: axis.scale, y, from, to,
        color: hit ? roleColor('set') : roleColor('exterior'),
        thickness: hit ? 6 : 3,
        opacity: hit ? 1 : 0.4,
        markers: false,
      });
      text(svg, member.name, left - 12, y + 4, {
        anchor: 'end', size: 12, color: hit ? roleColor('set') : roleColor('faint'),
      });
    }

    const axis = numberLine(svg, {
      from, to, y: axisY, left, right, ticks: [-6, -4, -2, 0, 2, 4, 6],
    });
    const [lo, hi] = [axis.scale(state.x - state.radius), axis.scale(state.x + state.radius)];
    svg.appendChild(svgNode('rect', {
      x: lo, y: top - 12, width: hi - lo, height: axisY - top + 12,
      fill: roleColor('neighborhood'), 'fill-opacity': 0.1,
      stroke: roleColor('neighborhood'), 'stroke-dasharray': '5 4',
    }));
    svg.appendChild(svgNode('circle', {
      cx: axis.scale(state.x), cy: axisY, r: 6.5, fill: roleColor('highlight'),
    }));
    text(svg, 'x', axis.scale(state.x), axisY - 12, { color: roleColor('highlight'), size: 15, weight: 700 });

    const count = meetingCount(neighbourhood, scenario.members.map((member) => member.shape));
    view.set([
      ['окрестность', format(neighbourhood)],
      ['задевает элементов', scenario.verdict(count),
        `viz__verdict viz__verdict--${state.scenario === 'finite' ? 'yes' : 'no'}`],
    ]);
  };

  buttonGroup(
    controls,
    Object.entries(LOCAL_SCENARIOS).map(([key, scenario]) => ({ label: scenario.label, value: key })),
    (value) => {
      state.scenario = value;
      draw();
    },
  );
  slider(controls, {
    label: 'точка x', min: -5, max: 5, step: 0.1, value: state.x,
    format: (value) => value.toFixed(1),
    onInput: (value) => { state.x = value; draw(); },
  });
  slider(controls, {
    label: 'радиус', min: 0.05, max: 2, step: 0.05, value: state.radius,
    format: (value) => value.toFixed(2),
    onInput: (value) => { state.radius = value; draw(); },
  });

  legend(body, [['задетые элементы', 'set'], ['окрестность точки', 'neighborhood']]);
  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});
return {  };
})();

/* ---- widgets-separation ---- */
__modules['widgets-separation'] = (() => {
const { register } = __modules['viz'];
const { allTopologies, describeTopology, separationFailure } = __modules['finite-topology'];
const { distance, ballsDisjoint, distanceToRectBoundary, firstFittingBall } = __modules['metric'];
const { LABELS, POSITIONS, SUBSETS, HULL_COLORS, drawHull, sizeOf } = __modules['widgets-bases'];
const { svgNode, createCanvas, clearElement, roleColor, themeColor, text, plane, shell, controlRow, buttonGroup, slider, toggle, readout, legend, pointerPosition } = __modules['render'];

const PLANE_BOX = { left: 50, right: 670, top: 20, bottom: 300 };

const toMathFrom = (svg, event, geometry) => {
  const position = pointerPosition(svg, event);
  return geometry.toMath(position.x, position.y);
};

register('SeparationLab', (host, config) => {
  const finiteFamilies = allTopologies(3).sort((x, y) => x.length - y.length);
  const state = {
    mode: config.mode || 'plane',
    points: [[-1.4, -0.3], [1.2, 0.6]],
    factor: 1 / 3,
    dragging: null,
    familyIndex: finiteFamilies.findIndex((family) => family.length === 3 && family.includes(0b001)),
  };

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'Лаборатория отделимости: T₁ и T₂',
    caption: config.caption || 'В режиме ℝ² тащи точки P и Q. Шары радиуса ‖P−Q‖/3 из Ex. 7 никогда '
      + 'не пересекаются; ползунком проверь, что запас есть вплоть до половины расстояния. '
      + 'В режиме конечных пространств перебери все 29 топологий на трёх точках: окажется, что '
      + 'T₁ выполняется ровно у одной — дискретной.',
  });

  const svg = createCanvas(body, 720, 320);
  const controls = controlRow(body);
  const planeControls = controlRow(body);
  const finiteControls = controlRow(body);
  const view = readout(body);
  let geometry = null;

  const drawPlane = () => {
    svg.setAttribute('viewBox', '0 0 720 320');
    geometry = plane(svg, {
      xRange: [-3, 3], yRange: [-1.5, 1.5], ...PLANE_BOX, grid: 0.5,
    });
    const [p, q] = state.points;
    const gap = distance(p, q);
    const radius = state.factor * gap;
    const disjoint = ballsDisjoint(p, q, radius);
    const [, unitY] = geometry.toPx(0, 1);
    const [, zeroY] = geometry.toPx(0, 0);
    const pixelsPerUnit = Math.abs(zeroY - unitY);

    for (const [index, center] of state.points.entries()) {
      const [cx, cy] = geometry.toPx(...center);
      const color = index === 0 ? roleColor('set') : roleColor('interior');
      svg.appendChild(svgNode('circle', {
        cx, cy, r: radius * pixelsPerUnit, fill: color, 'fill-opacity': 0.16,
        stroke: disjoint ? color : roleColor('boundary'), 'stroke-width': 2,
        'stroke-dasharray': disjoint ? 'none' : '6 4',
      }));
      svg.appendChild(svgNode('circle', {
        cx, cy, r: 7, fill: color, stroke: themeColor('--bg-deep'), 'stroke-width': 2, cursor: 'grab',
      }));
      text(svg, index === 0 ? 'P' : 'Q', cx + 11, cy - 10, { anchor: 'start', color, size: 16, weight: 700 });
    }
    const [px, py] = geometry.toPx(...p);
    const [qx, qy] = geometry.toPx(...q);
    svg.appendChild(svgNode('line', {
      x1: px, y1: py, x2: qx, y2: qy, stroke: roleColor('faint'), 'stroke-dasharray': '3 4',
    }));

    view.set([
      ['‖P − Q‖', gap.toFixed(2)],
      ['радиус шаров', `${radius.toFixed(2)} = ${state.factor.toFixed(2)} · ‖P − Q‖`],
      ['шары не пересекаются?', disjoint ? 'да — точки разделены' : 'нет — шары перекрылись',
        `viz__verdict viz__verdict--${disjoint ? 'yes' : 'no'}`],
      ['почему так', 'два открытых шара радиуса r с центрами на расстоянии d не пересекаются ровно '
        + 'при 2r ⩽ d, поэтому годится любой множитель до 1/2, а 1/3 взято с запасом'],
    ]);
  };

  const drawFinite = () => {
    svg.setAttribute('viewBox', '0 0 640 310');
    geometry = null;
    const family = finiteFamilies[state.familyIndex];
    const t1 = separationFailure(family, 3, 'T1');
    const t2 = separationFailure(family, 3, 'T2');
    const culprit = t1 || t2;
    const witnesses = culprit
      ? family.filter((open) => open && (open & (1 << culprit.first)))
      : [];

    for (const mask of [...witnesses].sort((x, y) => sizeOf(y) - sizeOf(x))) {
      drawHull(svg, mask, themeColor(HULL_COLORS[SUBSETS.indexOf(mask)]), false);
    }
    for (const [index, [x, y]] of POSITIONS.entries()) {
      const role = culprit && index === culprit.first
        ? 'highlight'
        : (culprit && index === culprit.second ? 'boundary' : null);
      svg.appendChild(svgNode('circle', {
        cx: x, cy: y, r: role ? 11 : 8,
        fill: role ? roleColor(role) : themeColor('--text'),
        stroke: themeColor('--bg-deep'), 'stroke-width': 2,
      }));
      text(svg, LABELS[index], x, y - 18, {
        color: role ? roleColor(role) : themeColor('--text'), size: 18, weight: 700,
      });
    }

    const name = (index) => LABELS[index];
    const rows = [
      ['τ', describeTopology(family, LABELS)],
      ['T₁?', t1 ? `нет: каждая окрестность ${name(t1.first)} содержит ${name(t1.second)}` : 'да',
        `viz__verdict viz__verdict--${t1 ? 'no' : 'yes'}`],
      ['T₂?', t2 ? `нет: окрестности ${name(t2.first)} и ${name(t2.second)} всегда пересекаются` : 'да',
        `viz__verdict viz__verdict--${t2 ? 'no' : 'yes'}`],
      ['топология', `${state.familyIndex + 1} из ${finiteFamilies.length}`],
    ];
    if (culprit) rows.push(['на рисунке', `все непустые окрестности точки ${name(culprit.first)}`]);
    view.set(rows);
  };

  const draw = () => {
    clearElement(svg);
    planeControls.hidden = state.mode !== 'plane';
    finiteControls.hidden = state.mode !== 'finite';
    if (state.mode === 'plane') drawPlane();
    else drawFinite();
  };

  svg.addEventListener('pointerdown', (event) => {
    if (state.mode !== 'plane' || !geometry) return;
    const target = toMathFrom(svg, event, geometry);
    const distances = state.points.map((center) => distance(center, target));
    state.dragging = distances[0] <= distances[1] ? 0 : 1;
    svg.setPointerCapture(event.pointerId);
    state.points[state.dragging] = target;
    draw();
  });
  svg.addEventListener('pointermove', (event) => {
    if (state.dragging === null || !geometry) return;
    event.preventDefault();
    const [x, y] = toMathFrom(svg, event, geometry);
    state.points[state.dragging] = [Math.max(-2.9, Math.min(2.9, x)), Math.max(-1.4, Math.min(1.4, y))];
    draw();
  });
  const stop = () => { state.dragging = null; };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);

  buttonGroup(controls, [
    { label: 'ℝ²: шары ‖P−Q‖/3', value: 'plane' },
    { label: 'конечные: все 29 топологий', value: 'finite' },
  ], (value) => { state.mode = value; draw(); }, state.mode === 'plane' ? 0 : 1);

  slider(planeControls, {
    label: 'радиус / ‖P−Q‖', min: 0.1, max: 0.8, step: 0.01, value: state.factor,
    format: (value) => value.toFixed(2),
    onInput: (value) => { state.factor = value; draw(); },
  });

  const step = (delta) => {
    state.familyIndex = (state.familyIndex + delta + finiteFamilies.length) % finiteFamilies.length;
    draw();
  };
  for (const [label, delta] of [['← предыдущая', -1], ['следующая →', 1]]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = label;
    button.addEventListener('click', () => step(delta));
    finiteControls.appendChild(button);
  }
  const discrete = document.createElement('button');
  discrete.type = 'button';
  discrete.className = 'btn';
  discrete.textContent = 'к дискретной';
  discrete.addEventListener('click', () => {
    state.familyIndex = finiteFamilies.findIndex((family) => family.length === 8);
    draw();
  });
  finiteControls.appendChild(discrete);

  legend(body, [['точка без нужной окрестности', 'highlight'], ['точка, которую не отделить', 'boundary']]);
  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});

register('LocalBase', (host, config) => {
  const rect = { x1: 0, x2: 4, y1: 0, y2: 2 };
  const state = { q: [3.2, 1.5], sequence: false, dragging: false };

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'Локальная база из шаров B(Q, 1/n)',
    caption: config.caption || 'Тащи точку Q внутри открытого прямоугольника S. Пунктиром — счётная '
      + 'система шаров B(Q, 1/n). Зелёный шар — первый, который целиком влез в S: такой найдётся '
      + 'для любой окрестности, поэтому шары образуют фундаментальную систему окрестностей (Def. 3), '
      + 'и она счётна (Def. 4). Галочка показывает, как из этих шаров строится '
      + 'последовательность в доказательстве Lm. 1.',
  });

  const svg = createCanvas(body, 720, 320);
  const controls = controlRow(body);
  const view = readout(body);
  let geometry = null;

  const draw = () => {
    clearElement(svg);
    geometry = plane(svg, {
      xRange: [-0.6, 4.6], yRange: [-0.55, 2.55], ...PLANE_BOX, grid: 0.5,
    });
    const [ax, ay] = geometry.toPx(rect.x1, rect.y2);
    const [bx, by] = geometry.toPx(rect.x2, rect.y1);
    svg.appendChild(svgNode('rect', {
      x: ax, y: ay, width: bx - ax, height: by - ay,
      fill: roleColor('set'), 'fill-opacity': 0.12,
      stroke: roleColor('set'), 'stroke-width': 2, 'stroke-dasharray': '7 5',
    }));
    text(svg, 'S — открытая окрестность Q', ax + 10, ay + 20, {
      anchor: 'start', color: roleColor('set'), size: 14, weight: 600,
    });

    const fitting = firstFittingBall(state.q, rect);
    const [cx, cy] = geometry.toPx(...state.q);
    const [, unitY] = geometry.toPx(0, 1);
    const [, zeroY] = geometry.toPx(0, 0);
    const pixelsPerUnit = Math.abs(zeroY - unitY);

    for (let n = 1; n <= 12; n += 1) {
      const fits = n >= fitting;
      const highlighted = n === fitting;
      svg.appendChild(svgNode('circle', {
        cx, cy, r: pixelsPerUnit / n,
        fill: highlighted ? roleColor('interior') : 'none',
        'fill-opacity': highlighted ? 0.22 : 0,
        stroke: highlighted ? roleColor('interior') : (fits ? roleColor('faint') : roleColor('boundary')),
        'stroke-width': highlighted ? 2.5 : 1,
        'stroke-dasharray': highlighted ? 'none' : '4 4',
        opacity: fits || highlighted ? 1 : 0.7,
      }));
    }

    if (state.sequence) {
      const room = distanceToRectBoundary(state.q, rect);
      const sequence = [];
      for (let n = 1; n <= 14; n += 1) {
        const angle = n * 2.4;
        let reach = 0.75 / n;
        let candidate = [state.q[0] + reach * Math.cos(angle), state.q[1] + reach * Math.sin(angle)];
        while (distanceToRectBoundary(candidate, rect) === 0 && reach > room / 4) {
          reach /= 2;
          candidate = [state.q[0] + reach * Math.cos(angle), state.q[1] + reach * Math.sin(angle)];
        }
        sequence.push(candidate);
      }
      const path = sequence.map((p, index) => {
        const [x, y] = geometry.toPx(...p);
        return `${index ? 'L' : 'M'} ${x} ${y}`;
      }).join(' ');
      svg.appendChild(svgNode('path', {
        d: path, fill: 'none', stroke: roleColor('highlight'), 'stroke-width': 1.2, 'stroke-opacity': 0.6,
      }));
      for (const [index, p] of sequence.entries()) {
        const [x, y] = geometry.toPx(...p);
        svg.appendChild(svgNode('circle', { cx: x, cy: y, r: 3.6, fill: roleColor('highlight') }));
        if (index < 4) {
          text(svg, `P${index + 1}`, x + 7, y - 6, { anchor: 'start', size: 12, color: roleColor('highlight') });
        }
      }
    }

    svg.appendChild(svgNode('circle', {
      cx, cy, r: 6.5, fill: themeColor('--text'), stroke: themeColor('--bg-deep'), 'stroke-width': 2, cursor: 'grab',
    }));
    text(svg, 'Q', cx + 10, cy + 18, { anchor: 'start', size: 16, weight: 700, color: themeColor('--text') });

    const room = distanceToRectBoundary(state.q, rect);
    view.set([
      ['расстояние от Q до края S', room.toFixed(3)],
      ['первый шар внутри S', Number.isFinite(fitting) ? `B(Q, 1/${fitting})` : 'нет — Q не внутри S',
        `viz__verdict viz__verdict--${Number.isFinite(fitting) ? 'yes' : 'no'}`],
      ['почему n конечно', 'нужно 1/n ⩽ расстояния до края, а такое n всегда найдётся'],
    ]);
  };

  svg.addEventListener('pointerdown', (event) => {
    state.dragging = true;
    svg.setPointerCapture(event.pointerId);
    move(event);
  });
  const move = (event) => {
    if (!state.dragging || !geometry) return;
    event.preventDefault();
    const [x, y] = toMathFrom(svg, event, geometry);
    state.q = [Math.max(0.03, Math.min(3.97, x)), Math.max(0.03, Math.min(1.97, y))];
    draw();
  };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', () => { state.dragging = false; });
  svg.addEventListener('pointercancel', () => { state.dragging = false; });

  toggle(controls, {
    label: 'Lm. 1: построить последовательность Pₙ → Q',
    checked: false,
    onChange: (checked) => { state.sequence = checked; draw(); },
  });

  legend(body, [
    ['первый влезший шар', 'interior'],
    ['шары, вылезающие за S', 'boundary'],
    ['точки Pₙ ∈ Bₙ', 'highlight'],
  ]);
  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});
return {  };
})();

/* ---- widgets-maps ---- */
__modules['widgets-maps'] = (() => {
const { register } = __modules['viz'];
const { format } = __modules['topology'];
const { FUNCTIONS, preimage, isOpenInLine } = __modules['mappings'];
const { allTopologies, describeSubset, describeTopology, continuityFailure, isBijection, inverseMap, pullbackTopology, isStronger } = __modules['finite-topology'];
const { svgNode, createCanvas, clearElement, roleColor, themeColor, text, numberLine, drawSetOnLine, plane, shell, controlRow, buttonGroup, slider, readout, legend } = __modules['render'];

const EXPLORER_BOX = { left: 60, right: 680, top: 18, bottom: 300 };

register('PreimageExplorer', (host, config) => {
  const state = { fn: config.fn || 'step', low: 0.5, high: 1.5 };

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'Прообраз открытого множества: проверка непрерывности по Th. 3.1',
    caption: config.caption || 'Ползунками задай открытый интервал V на оси значений (фиолетовая полоса). '
      + 'Внизу — его прообраз f⁻¹(V) на оси аргументов. По Th. 3.1 отображение непрерывно ровно '
      + 'тогда, когда прообраз <b>каждого</b> открытого множества открыт. У ступеньки найдётся V, '
      + 'для которого прообраз — луч [0, +∞) с включённым концом: это и есть разрыв в нуле.',
  });

  const svg = createCanvas(body, 720, 370);
  const functionRow = controlRow(body);
  const sliders = controlRow(body);
  const view = readout(body);

  const draw = () => {
    clearElement(svg);
    const fn = FUNCTIONS[state.fn];
    const xRange = fn.domain ? [-1.75, 1.75] : [-3.2, 3.2];
    const yRange = [-1.5, 4.5];
    const geometry = plane(svg, { xRange, yRange, ...EXPLORER_BOX, grid: fn.domain ? 0.5 : 1 });

    const [bandLeft, bandTop] = geometry.toPx(xRange[0], state.high);
    const [bandRight, bandBottom] = geometry.toPx(xRange[1], state.low);
    svg.appendChild(svgNode('rect', {
      x: bandLeft, y: bandTop, width: bandRight - bandLeft, height: bandBottom - bandTop,
      fill: roleColor('neighborhood'), 'fill-opacity': 0.13,
    }));
    const [axisX] = geometry.toPx(0, 0);
    svg.appendChild(svgNode('line', {
      x1: axisX, y1: bandTop, x2: axisX, y2: bandBottom,
      stroke: roleColor('neighborhood'), 'stroke-width': 6, 'stroke-opacity': 0.8,
    }));
    text(svg, 'V', axisX - 10, (bandTop + bandBottom) / 2 + 5, {
      anchor: 'end', color: roleColor('neighborhood'), size: 15, weight: 700,
    });

    const curveColor = themeColor('--text');
    if (fn.jumps) {
      for (const jump of fn.jumps) {
        const [startX, leftY] = geometry.toPx(xRange[0], jump.left);
        const [jumpX] = geometry.toPx(jump.at, 0);
        const [, rightY] = geometry.toPx(0, jump.right);
        const [endX] = geometry.toPx(xRange[1], 0);
        svg.appendChild(svgNode('line', { x1: startX, y1: leftY, x2: jumpX, y2: leftY, stroke: curveColor, 'stroke-width': 2.5 }));
        svg.appendChild(svgNode('line', { x1: jumpX, y1: rightY, x2: endX, y2: rightY, stroke: curveColor, 'stroke-width': 2.5 }));
        svg.appendChild(svgNode('circle', { cx: jumpX, cy: leftY, r: 5, fill: themeColor('--bg-deep'), stroke: curveColor, 'stroke-width': 2 }));
        svg.appendChild(svgNode('circle', { cx: jumpX, cy: rightY, r: 5, fill: curveColor }));
      }
    } else {
      const [from, to] = fn.domain ? [fn.domain[0] + 0.002, fn.domain[1] - 0.002] : xRange;
      const points = [];
      for (let step = 0; step <= 600; step += 1) {
        const x = from + ((to - from) * step) / 600;
        const y = fn.evaluate(x);
        if (y < yRange[0] - 2 || y > yRange[1] + 2) continue;
        const [px, py] = geometry.toPx(x, Math.max(yRange[0] - 1, Math.min(yRange[1] + 1, y)));
        points.push(`${points.length ? 'L' : 'M'} ${px.toFixed(1)} ${py.toFixed(1)}`);
      }
      const clipId = `clip-${state.fn}`;
      const clip = svgNode('clipPath', { id: clipId });
      clip.appendChild(svgNode('rect', {
        x: EXPLORER_BOX.left, y: EXPLORER_BOX.top,
        width: EXPLORER_BOX.right - EXPLORER_BOX.left, height: EXPLORER_BOX.bottom - EXPLORER_BOX.top,
      }));
      svg.appendChild(clip);
      svg.appendChild(svgNode('path', {
        d: points.join(' '), fill: 'none', stroke: curveColor, 'stroke-width': 2.5,
        'clip-path': `url(#${clipId})`,
      }));
      if (fn.domain) {
        for (const edge of fn.domain) {
          const [edgeX] = geometry.toPx(edge, 0);
          svg.appendChild(svgNode('line', {
            x1: edgeX, y1: EXPLORER_BOX.top, x2: edgeX, y2: EXPLORER_BOX.bottom,
            stroke: roleColor('faint'), 'stroke-dasharray': '4 4',
          }));
        }
      }
    }

    const pulled = preimage(fn, state.low, state.high);
    const open = isOpenInLine(pulled);
    const lineY = 340;
    const lineAxis = numberLine(svg, {
      from: xRange[0], to: xRange[1], y: lineY,
      left: EXPLORER_BOX.left, right: EXPLORER_BOX.right, ticks: [], arrows: false,
    });
    drawSetOnLine(svg, {
      set: pulled, scale: lineAxis.scale, y: lineY, from: xRange[0], to: xRange[1],
      color: open ? roleColor('interior') : roleColor('boundary'), thickness: 9,
    });
    text(svg, 'f⁻¹(V)', EXPLORER_BOX.left - 8, lineY + 5, {
      anchor: 'end', size: 13, weight: 700, color: open ? roleColor('interior') : roleColor('boundary'),
    });
    for (const component of pulled) {
      for (const end of [component.lo, component.hi]) {
        if (!Number.isFinite(end) || end < xRange[0] || end > xRange[1]) continue;
        const [px] = geometry.toPx(end, 0);
        svg.appendChild(svgNode('line', {
          x1: px, y1: EXPLORER_BOX.top, x2: px, y2: lineY,
          stroke: roleColor('faint'), 'stroke-dasharray': '3 4',
        }));
      }
    }

    view.set([
      ['f', fn.label],
      ['V', `(${state.low.toFixed(2)}, ${state.high.toFixed(2)})`],
      ['f⁻¹(V)', format(pulled)],
      ['f⁻¹(V) открыто?', open ? 'да' : 'нет', `viz__verdict viz__verdict--${open ? 'yes' : 'no'}`],
      ['вывод', open
        ? (fn.continuous
          ? 'для этого V всё в порядке; у непрерывной функции так будет для любого V'
          : 'для этого V всё в порядке, попробуй V, содержащий 1, но не 0')
        : 'найден открытый V с неоткрытым прообразом: по Th. 3.1 функция разрывна'],
    ]);
  };

  buttonGroup(
    functionRow,
    Object.values(FUNCTIONS).map((fn) => ({ label: fn.label, value: fn.id })),
    (value) => { state.fn = value; draw(); },
    Object.keys(FUNCTIONS).indexOf(state.fn),
  );

  const lowSlider = slider(sliders, {
    label: 'нижний край V', min: -1.4, max: 4.3, step: 0.05, value: state.low,
    format: (value) => value.toFixed(2),
    onInput: (value) => {
      state.low = Math.min(value, state.high - 0.05);
      lowSlider.input.value = String(state.low);
      draw();
    },
  });
  const highSlider = slider(sliders, {
    label: 'верхний край V', min: -1.3, max: 4.4, step: 0.05, value: state.high,
    format: (value) => value.toFixed(2),
    onInput: (value) => {
      state.high = Math.max(value, state.low + 0.05);
      highSlider.input.value = String(state.high);
      draw();
    },
  });

  legend(body, [['открытое V', 'neighborhood'], ['прообраз открыт', 'interior'], ['прообраз не открыт', 'boundary']]);
  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});

const TWO_POINTS = ['p', 'q'];
const TWO_POINT_TOPOLOGIES = allTopologies(2).sort((x, y) => x.length - y.length || x[1] - y[1]);
const TOPOLOGY_NAMES = new Map([
  [String([0, 3]), 'τ_a'],
  [String([0, 1, 3]), '{∅, {p}, X}'],
  [String([0, 2, 3]), '{∅, {q}, X}'],
  [String([0, 1, 2, 3]), 'τ_d'],
]);
const topologyName = (family) => TOPOLOGY_NAMES.get(String(family)) || describeTopology(family, TWO_POINTS);

const MAP_PRESETS = [
  { label: 'Ex. 2: id из τ_d в τ_a', map: [0, 1], source: [0, 1, 2, 3], target: [0, 3] },
  { label: 'Ex. 2: обратное, из τ_a в τ_d', map: [0, 1], source: [0, 3], target: [0, 1, 2, 3] },
  { label: 'константа p', map: [0, 0], source: [0, 3], target: [0, 1, 2, 3] },
  { label: 'перестановка p ↔ q', map: [1, 0], source: [0, 1, 3], target: [0, 2, 3] },
];

const COLUMN_X = [170, 550];
const ROW_Y = [95, 225];

function drawColumn(svg, family, column, label) {
  const x = COLUMN_X[column];
  const strokes = [roleColor('set'), roleColor('interior'), roleColor('neighborhood')];
  for (const open of family) {
    if (open === 0) continue;
    const rows = [0, 1].filter((row) => open & (1 << row));
    const top = ROW_Y[rows[0]] - (rows.length > 1 ? 44 : 30);
    const bottom = ROW_Y[rows[rows.length - 1]] + (rows.length > 1 ? 44 : 30);
    const halfWidth = rows.length > 1 ? 70 : 52;
    svg.appendChild(svgNode('rect', {
      x: x - halfWidth, y: top, width: 2 * halfWidth, height: bottom - top, rx: 24,
      fill: strokes[open - 1], 'fill-opacity': 0.09, stroke: strokes[open - 1], 'stroke-width': 1.8,
    }));
  }
  text(svg, label, x, 300, { size: 15, weight: 700, color: themeColor('--text') });
  for (const [row, name] of TWO_POINTS.entries()) {
    svg.appendChild(svgNode('circle', { cx: x, cy: ROW_Y[row], r: 8, fill: themeColor('--text') }));
    text(svg, name, x + (column ? 16 : -16), ROW_Y[row] + 5, {
      anchor: column ? 'start' : 'end', size: 16, weight: 700, color: themeColor('--text'),
    });
  }
}

register('FiniteMapChecker', (host, config) => {
  const preset = MAP_PRESETS[config.preset ?? 0];
  const state = { map: [...preset.map], source: preset.source, target: preset.target };

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'Отображения конечных пространств: непрерывность и гомеоморфизм',
    caption: config.caption || 'Слева X, справа Y, рамки — открытые множества. Выбери топологии и '
      + 'отображение. Непрерывность проверяется по Th. 3.1: прообраз каждого открытого в Y должен '
      + 'быть открыт в X. Гомеоморфизм требует ещё биективности и непрерывности обратного (Def. 2).',
  });

  const svg = createCanvas(body, 720, 320);
  const sourceRow = controlRow(body);
  const targetRow = controlRow(body);
  const mapRow = controlRow(body);
  const presetRow = controlRow(body);
  const view = readout(body);
  let sourceGroup = null;
  let targetGroup = null;

  const syncButtons = () => {
    sourceGroup.buttons.forEach((button, index) => button.classList.toggle(
      'btn--active', String(TWO_POINT_TOPOLOGIES[index]) === String(state.source),
    ));
    targetGroup.buttons.forEach((button, index) => button.classList.toggle(
      'btn--active', String(TWO_POINT_TOPOLOGIES[index]) === String(state.target),
    ));
  };

  const draw = () => {
    clearElement(svg);
    drawColumn(svg, state.source, 0, `X, ${topologyName(state.source)}`);
    drawColumn(svg, state.target, 1, `Y, ${topologyName(state.target)}`);

    const failure = continuityFailure(state.map, state.source, state.target);
    const bijective = isBijection(state.map, 2);
    const inverseFailure = bijective ? continuityFailure(inverseMap(state.map), state.target, state.source) : null;

    for (const [source, target] of state.map.entries()) {
      const x1 = COLUMN_X[0] + 14;
      const y1 = ROW_Y[source];
      const x2 = COLUMN_X[1] - 16;
      const y2 = ROW_Y[target];
      svg.appendChild(svgNode('line', {
        x1, y1, x2, y2, stroke: failure ? roleColor('boundary') : roleColor('interior'), 'stroke-width': 2.4,
      }));
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const tip = [
        `${x2},${y2}`,
        `${x2 - 12 * Math.cos(angle - 0.4)},${y2 - 12 * Math.sin(angle - 0.4)}`,
        `${x2 - 12 * Math.cos(angle + 0.4)},${y2 - 12 * Math.sin(angle + 0.4)}`,
      ].join(' ');
      svg.appendChild(svgNode('polygon', {
        points: tip, fill: failure ? roleColor('boundary') : roleColor('interior'),
      }));
    }
    text(svg, 'f', 360, 40, { size: 18, weight: 700, color: themeColor('--text') });

    const pulled = pullbackTopology(state.map, state.target);
    const homeomorphism = !failure && bijective && !inverseFailure;
    const rows = [
      ['f', state.map.map((target, source) => `${TWO_POINTS[source]} ↦ ${TWO_POINTS[target]}`).join(', ')],
      ['f непрерывно?', failure
        ? `нет: V = ${describeSubset(failure.open, TWO_POINTS)} открыто в Y, а f⁻¹(V) = `
          + `${describeSubset(failure.preimage, TWO_POINTS)} не открыто в X`
        : 'да', `viz__verdict viz__verdict--${failure ? 'no' : 'yes'}`],
      ['биекция?', bijective ? 'да' : 'нет'],
    ];
    if (bijective) {
      rows.push(['f⁻¹ непрерывно?', inverseFailure
        ? `нет: ${describeSubset(inverseFailure.open, TWO_POINTS)} открыто в X, а его образ `
          + `${describeSubset(inverseFailure.preimage, TWO_POINTS)} не открыт в Y`
        : 'да', `viz__verdict viz__verdict--${inverseFailure ? 'no' : 'yes'}`]);
    }
    rows.push(['гомеоморфизм?', homeomorphism ? 'да' : 'нет', `viz__verdict viz__verdict--${homeomorphism ? 'yes' : 'no'}`]);
    rows.push(['f⁻¹(τ_Y) из NB 3', `${describeTopology(pulled, TWO_POINTS)} — ${isStronger(state.source, pulled)
      ? 'лежит в τ_X, отсюда непрерывность' : 'не лежит в τ_X'}`]);
    view.set(rows);
    syncButtons();
  };

  const topologyOptions = TWO_POINT_TOPOLOGIES.map((family) => ({ label: topologyName(family), value: family }));
  const sourceLabel = document.createElement('span');
  sourceLabel.className = 'viz__control';
  sourceLabel.textContent = 'τ на X:';
  sourceRow.appendChild(sourceLabel);
  sourceGroup = buttonGroup(sourceRow, topologyOptions, (value) => { state.source = value; draw(); });
  const targetLabel = document.createElement('span');
  targetLabel.className = 'viz__control';
  targetLabel.textContent = 'τ на Y:';
  targetRow.appendChild(targetLabel);
  targetGroup = buttonGroup(targetRow, topologyOptions, (value) => { state.target = value; draw(); });

  for (const [source, name] of TWO_POINTS.entries()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = `перекинуть стрелку из ${name}`;
    button.addEventListener('click', () => {
      state.map[source] = 1 - state.map[source];
      draw();
    });
    mapRow.appendChild(button);
  }

  for (const item of MAP_PRESETS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = item.label;
    button.addEventListener('click', () => {
      state.map = [...item.map];
      state.source = item.source;
      state.target = item.target;
      draw();
    });
    presetRow.appendChild(button);
  }

  legend(body, [['непрерывное отображение', 'interior'], ['разрывное отображение', 'boundary']]);
  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});

register('TangentStretch', (host, config) => {
  const state = { x: 1.2, closed: false };
  const reach = 10;

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'Ex. 3: tg растягивает интервал на всю прямую',
    caption: config.caption || 'Сверху интервал (−π/2, π/2), снизу прямая. Каждая точка интервала '
      + 'связана со своим образом tg x. Чем ближе x к краю, тем дальше улетает образ — поэтому '
      + 'конечный интервал покрывает бесконечную прямую. Включи «добавить концы»: точкам ±π/2 '
      + 'отправиться некуда, и это объясняет Ex. 4.',
  });

  const svg = createCanvas(body, 720, 300);
  const controls = controlRow(body);
  const view = readout(body);

  const draw = () => {
    clearElement(svg);
    const half = Math.PI / 2;
    const top = numberLine(svg, {
      from: -half, to: half, y: 70, left: 150, right: 570, ticks: [], arrows: false,
    });
    const bottom = numberLine(svg, {
      from: -reach, to: reach, y: 240, left: 40, right: 680, ticks: [-10, -5, 0, 5, 10],
    });
    text(svg, '(−π/2, π/2)', 150, 45, { anchor: 'start', size: 14, color: roleColor('set') });
    text(svg, 'ℝ', 680, 222, { anchor: 'end', size: 15, weight: 700, color: themeColor('--text') });
    svg.appendChild(svgNode('line', {
      x1: top.scale(-half), y1: 70, x2: top.scale(half), y2: 70,
      stroke: roleColor('set'), 'stroke-width': 6,
    }));
    for (const edge of [-half, half]) {
      svg.appendChild(svgNode('circle', {
        cx: top.scale(edge), cy: 70, r: 6,
        fill: state.closed ? roleColor('boundary') : themeColor('--bg-deep'),
        stroke: state.closed ? roleColor('boundary') : roleColor('set'), 'stroke-width': 2,
      }));
      if (state.closed) {
        text(svg, 'образа нет', top.scale(edge), 100, { size: 12, color: roleColor('boundary') });
      }
    }

    const connector = (x, emphasis) => {
      const y = Math.tan(x);
      const inside = Math.abs(y) <= reach;
      const endX = inside ? bottom.scale(y) : bottom.scale(Math.sign(y) * reach);
      svg.appendChild(svgNode('line', {
        x1: top.scale(x), y1: 70, x2: endX, y2: inside ? 240 : 200,
        stroke: emphasis ? roleColor('highlight') : roleColor('faint'),
        'stroke-width': emphasis ? 2.6 : 1,
        'stroke-opacity': emphasis ? 1 : 0.65,
        'stroke-dasharray': inside ? 'none' : '4 4',
      }));
      if (emphasis) {
        svg.appendChild(svgNode('circle', { cx: top.scale(x), cy: 70, r: 6.5, fill: roleColor('highlight') }));
        if (inside) svg.appendChild(svgNode('circle', { cx: endX, cy: 240, r: 6.5, fill: roleColor('highlight') }));
      }
    };
    for (let k = -8; k <= 8; k += 1) connector((k / 9) * half, false);
    connector(state.x, true);

    const image = Math.tan(state.x);
    view.set([
      ['x', state.x.toFixed(3)],
      ['tg x', Math.abs(image) > 1e4 ? '≈ ±∞' : image.toFixed(3)],
      ['обратное', 'arctg y — непрерывно, поэтому tg — гомеоморфизм'],
      ['концы', state.closed
        ? 'у отрезка [−π/2, π/2] концам некуда отобразиться: отрезок компактен, прямая нет, гомеоморфизма нет'
        : 'интервал открыт, концы ему не принадлежат — ровно поэтому всё сходится'],
    ]);
  };

  slider(controls, {
    label: 'x', min: -1.56, max: 1.56, step: 0.01, value: state.x,
    format: (value) => value.toFixed(2),
    onInput: (value) => { state.x = value; draw(); },
  });
  const closedToggle = document.createElement('label');
  closedToggle.className = 'viz__control';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.addEventListener('change', () => { state.closed = checkbox.checked; draw(); });
  closedToggle.append(checkbox, document.createTextNode('добавить концы ±π/2'));
  controls.appendChild(closedToggle);

  legend(body, [['интервал', 'set'], ['выбранная точка и её образ', 'highlight']]);
  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});
return {  };
})();

/* ---- widgets-connectedness ---- */
__modules['widgets-connectedness'] = (() => {
const { register } = __modules['viz'];
const { set, interval, format, componentsOf, isConnectedInLine, puncture, REAL_LINE } = __modules['topology'];
const { svgNode, createCanvas, clearElement, roleColor, themeColor, text, numberLine, drawSetOnLine, shell, controlRow, buttonGroup, slider, readout } = __modules['render'];

const COMPONENT_COLORS = ['--role-set', '--role-interior', '--role-boundary', '--role-neighborhood', '--role-highlight'];

const LINE_PRESETS = [
  { label: 'ℝ', shape: () => [REAL_LINE] },
  { label: '[0, 3]', shape: () => set(interval(0, 3, true, true)) },
  { label: '(−2,−1) ∪ (1,2)', shape: () => set(interval(-2, -1, false, false), interval(1, 2, false, false)) },
  { label: '[0,1) ∪ [1,2]', shape: () => set(interval(0, 1, true, false), interval(1, 2, true, true)) },
  { label: '[0,1) ∪ (1,2]', shape: () => set(interval(0, 1, true, false), interval(1, 2, false, true)) },
];

register('ComponentCounter', (host, config) => {
  const width = 720;
  const height = 190;
  const state = { preset: config.preset ?? 0, punctures: [], cursor: 0.5 };

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'Компоненты связности на прямой: что ломает выколотая точка',
    caption: config.caption || 'Подмножество прямой связно ровно тогда, когда это промежуток, — без дыр '
      + '(задача 4.1.2 листка). Выбери множество и выкалывай точки ползунком: каждая компонента '
      + 'покрашена своим цветом. Выколотый конец отрезка связность не ломает, выколотая внутренняя '
      + 'точка — ломает. Этим и отличают ℝ от ℝ²: в плоскости одна точка ничего не разрежет.',
  });

  const svg = createCanvas(body, width, height);
  const presetRow = controlRow(body);
  const punctureRow = controlRow(body);
  const view = readout(body);

  const currentSet = () => state.punctures.reduce(
    (shape, x) => puncture(shape, x),
    LINE_PRESETS[state.preset].shape(),
  );

  const draw = () => {
    clearElement(svg);
    const from = -3;
    const to = 4;
    const left = 50;
    const right = width - 50;
    const axis = numberLine(svg, {
      from, to, y: 95, left, right, ticks: [-3, -2, -1, 0, 1, 2, 3, 4],
    });
    const shape = currentSet();
    const components = componentsOf(shape);
    components.forEach((component, index) => {
      drawSetOnLine(svg, {
        set: component, scale: axis.scale, y: 95, from, to, thickness: 10,
        color: themeColor(COMPONENT_COLORS[index % COMPONENT_COLORS.length]),
      });
    });
    for (const x of state.punctures) {
      svg.appendChild(svgNode('circle', {
        cx: axis.scale(x), cy: 95, r: 6.5, fill: themeColor('--bg-deep'),
        stroke: roleColor('highlight'), 'stroke-width': 2.5,
      }));
    }
    svg.appendChild(svgNode('line', {
      x1: axis.scale(state.cursor), y1: 55, x2: axis.scale(state.cursor), y2: 80,
      stroke: roleColor('highlight'), 'stroke-width': 2,
    }));
    text(svg, `выколоть ${state.cursor.toFixed(2)}`, axis.scale(state.cursor), 46, {
      size: 13, color: roleColor('highlight'),
    });

    const connected = isConnectedInLine(shape);
    view.set([
      ['множество', format(shape)],
      ['компонент связности', String(components.length)],
      ['связно?', connected ? 'да — это промежуток' : 'нет — есть дыра, разрез даёт два открытых в нём куска',
        `viz__verdict viz__verdict--${connected ? 'yes' : 'no'}`],
    ]);
  };

  buttonGroup(
    presetRow,
    LINE_PRESETS.map((preset, index) => ({ label: preset.label, value: index })),
    (value) => { state.preset = value; state.punctures = []; draw(); },
    state.preset,
  );

  slider(punctureRow, {
    label: 'точка', min: -2.9, max: 3.9, step: 0.05, value: state.cursor,
    format: (value) => value.toFixed(2),
    onInput: (value) => { state.cursor = value; draw(); },
  });
  for (const [label, action] of [
    ['выколоть', () => { if (!state.punctures.includes(state.cursor)) state.punctures.push(state.cursor); }],
    ['вернуть точки', () => { state.punctures = []; }],
  ]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = label;
    button.addEventListener('click', () => { action(); draw(); });
    punctureRow.appendChild(button);
  }

  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});
return {  };
})();

/* ---- app ---- */
__modules['app'] = (() => {
const { mountAll } = __modules['viz'];

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
return { readProgress, readCards };
})();
/*EXPOSE*/
})();
