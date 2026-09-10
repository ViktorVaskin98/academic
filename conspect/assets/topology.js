export const interval = (lo, hi, loClosed, hiClosed) => ({ lo, hi, loClosed, hiClosed });

export const point = (x) => interval(x, x, true, true);

export const REAL_LINE = interval(-Infinity, Infinity, false, false);

export const EMPTY = [];

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

export function normalize(components) {
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

export const set = (...components) => normalize(components);

export const isEmpty = (s) => s.length === 0;

const formatBound = (value) => {
  if (value === -Infinity) return '-∞';
  if (value === Infinity) return '+∞';
  return String(Math.round(value * 1000) / 1000);
};

const formatComponent = (c) => {
  if (c.lo === c.hi) return `{${formatBound(c.lo)}}`;
  return `${c.loClosed ? '[' : '('}${formatBound(c.lo)}, ${formatBound(c.hi)}${c.hiClosed ? ']' : ')'}`;
};

export const format = (s) => (isEmpty(s) ? '∅' : s.map(formatComponent).join(' ∪ '));

export const equals = (a, b) => {
  const x = normalize(a);
  const y = normalize(b);
  return x.length === y.length && x.every((c, i) => c.lo === y[i].lo
    && c.hi === y[i].hi
    && c.loClosed === y[i].loClosed
    && c.hiClosed === y[i].hiClosed);
};

export const union = (a, b) => normalize([...a, ...b]);

export function intersect(a, b) {
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

export const contains = (s, x) => s.some((c) =>
  (c.lo < x || (c.lo === x && c.loClosed)) && (x < c.hi || (c.hi === x && c.hiClosed)));

export const ARROW_SPACE = [interval(0, Infinity, true, false)];

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

export const TOPOLOGIES = {
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
