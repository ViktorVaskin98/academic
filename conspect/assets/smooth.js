const TAU = 2 * Math.PI;

const wrapAngle = (angle) => {
  let result = angle;
  while (result <= -Math.PI) result += TAU;
  while (result > Math.PI) result -= TAU;
  return result;
};

const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

export const circlePoint = (theta) => ({ x: Math.cos(theta), y: Math.sin(theta) });

export const CIRCLE_ATLASES = {
  stereo: {
    label: 'стереографический',
    charts: [
      {
        name: 'φ', carrier: 'U = S¹ \\ {(0, 1)}', formula: 'x / (1 − y)',
        contains: (p) => !(near(p.x, 0) && near(p.y, 1)),
        map: (p) => p.x / (1 - p.y),
        inverse: (t) => ({ x: (2 * t) / (t * t + 1), y: (t * t - 1) / (t * t + 1) }),
      },
      {
        name: 'ψ', carrier: 'V = S¹ \\ {(0, −1)}', formula: 'x / (1 + y)',
        contains: (p) => !(near(p.x, 0) && near(p.y, -1)),
        map: (p) => p.x / (1 + p.y),
        inverse: (t) => ({ x: (2 * t) / (t * t + 1), y: (1 - t * t) / (t * t + 1) }),
      },
    ],
  },
  angle: {
    label: 'угловой',
    charts: [
      {
        name: 'φ', carrier: 'U = S¹ \\ {P₀}', formula: 'угол от Q₀',
        contains: (p) => !(near(p.x, 1) && near(p.y, 0)),
        map: (p) => wrapAngle(Math.atan2(p.y, p.x) - Math.PI),
        inverse: (t) => circlePoint(t + Math.PI),
      },
      {
        name: 'ψ', carrier: 'V = S¹ \\ {Q₀}', formula: 'угол от P₀',
        contains: (p) => !(near(p.x, -1) && near(p.y, 0)),
        map: (p) => Math.atan2(p.y, p.x),
        inverse: (t) => circlePoint(t),
      },
    ],
  },
  projection: {
    label: 'проекционный',
    charts: [
      {
        name: 'φ₊', carrier: 'U₊ = {x > 0}', formula: 'y',
        contains: (p) => p.x > 1e-9, map: (p) => p.y,
        inverse: (t) => ({ x: Math.sqrt(1 - t * t), y: t }),
      },
      {
        name: 'φ₋', carrier: 'U₋ = {x < 0}', formula: 'y',
        contains: (p) => p.x < -1e-9, map: (p) => p.y,
        inverse: (t) => ({ x: -Math.sqrt(1 - t * t), y: t }),
      },
      {
        name: 'ψ₊', carrier: 'V₊ = {y > 0}', formula: 'x',
        contains: (p) => p.y > 1e-9, map: (p) => p.x,
        inverse: (t) => ({ x: t, y: Math.sqrt(1 - t * t) }),
      },
      {
        name: 'ψ₋', carrier: 'V₋ = {y < 0}', formula: 'x',
        contains: (p) => p.y < -1e-9, map: (p) => p.x,
        inverse: (t) => ({ x: t, y: -Math.sqrt(1 - t * t) }),
      },
    ],
  },
};

export const chartsAt = (atlasId, p) =>
  CIRCLE_ATLASES[atlasId].charts.filter((chart) => chart.contains(p));

export const transition = (from, to, t) => {
  const p = from.inverse(t);
  if (!from.contains(p) || !to.contains(p)) return null;
  return to.map(p);
};

export const transitionSamples = (from, to, range, count = 400) => {
  const [low, high] = range;
  const samples = [];
  for (let i = 0; i <= count; i += 1) {
    const t = low + ((high - low) * i) / count;
    const p = from.inverse(t);
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const value = from.contains(p) && to.contains(p) ? to.map(p) : null;
    samples.push({ t, value });
  }
  return samples;
};

export const kinkChart = (alpha) => (x) => (x <= 0 ? x : alpha * x);
export const kinkChartInverse = (alpha) => (y) => (y <= 0 ? y : y / alpha);

export const kinkTransition = (alpha, beta) => (x) =>
  kinkChart(alpha)(kinkChartInverse(beta)(x));

export const oneSidedDerivatives = (f, x, h = 1e-6) => ({
  left: (f(x) - f(x - h)) / h,
  right: (f(x + h) - f(x)) / h,
});

export const isDifferentiableAt = (f, x, tolerance = 1e-4) => {
  const { left, right } = oneSidedDerivatives(f, x);
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < tolerance;
};

export const cube = (x) => x * x * x;
export const cubeRoot = (y) => Math.sign(y) * Math.abs(y) ** (1 / 3);

export const diskToPlane = ({ x, y }) => {
  const z = Math.sqrt(1 - x * x - y * y);
  return { x: x / z, y: y / z };
};

export const planeToDisk = ({ x, y }) => {
  const scale = Math.sqrt(1 + x * x + y * y);
  return { x: x / scale, y: y / scale };
};

export const LEVEL_FUNCTIONS = {
  circle: {
    label: 'окружность', formula: 'x₁² + x₂² − 1',
    h: (a, b) => a * a + b * b - 1,
    gradient: (a, b) => [2 * a, 2 * b],
    branches: [
      (s) => [Math.cos(s * Math.PI), Math.sin(s * Math.PI)],
    ],
    range: [-1, 1],
    special: null,
  },
  cross: {
    label: 'крест', formula: 'x₁² − x₂²',
    h: (a, b) => a * a - b * b,
    gradient: (a, b) => [2 * a, -2 * b],
    branches: [(s) => [s, s], (s) => [s, -s]],
    range: [-1.6, 1.6],
    special: [0, 0],
  },
  cusp: {
    label: 'точка возврата', formula: 'x₁² − x₂³',
    h: (a, b) => a * a - b * b * b,
    gradient: (a, b) => [2 * a, -3 * b * b],
    branches: [(s) => [Math.abs(s) ** 1.5 * Math.sign(s), Math.abs(s)]],
    range: [-1.6, 1.6],
    special: [0, 0],
  },
  doubleParabola: {
    label: 'двойная парабола', formula: 'x₁² − x₂⁴',
    h: (a, b) => a * a - b ** 4,
    gradient: (a, b) => [2 * a, -4 * b ** 3],
    branches: [(s) => [s * s, s], (s) => [-s * s, s]],
    range: [-1.3, 1.3],
    special: [0, 0],
  },
};

export const rankOfGradient = (gradient, eps = 1e-9) =>
  (gradient.some((component) => Math.abs(component) > eps) ? 1 : 0);

export const rankAt = (id, a, b) => rankOfGradient(LEVEL_FUNCTIONS[id].gradient(a, b));

export const nearestOnLevel = (id, target, samples = 600) => {
  const level = LEVEL_FUNCTIONS[id];
  const [low, high] = level.range;
  let best = null;
  for (const branch of level.branches) {
    for (let i = 0; i <= samples; i += 1) {
      const s = low + ((high - low) * i) / samples;
      const [a, b] = branch(s);
      const distance = (a - target[0]) ** 2 + (b - target[1]) ** 2;
      if (!best || distance < best.distance) best = { point: [a, b], distance };
    }
  }
  return best.point;
};

export const bumpKernel = (r, s) => (t) => {
  if (t <= r || t >= s) return 0;
  return Math.exp(-1 / (t - r)) * Math.exp(1 / (t - s));
};

const simpson = (f, a, b, steps = 400) => {
  if (b <= a) return 0;
  const n = steps % 2 === 0 ? steps : steps + 1;
  const h = (b - a) / n;
  let total = f(a) + f(b);
  for (let i = 1; i < n; i += 1) total += (i % 2 === 0 ? 2 : 4) * f(a + i * h);
  return (total * h) / 3;
};

export const radialCutoff = (r, s) => {
  const g = bumpKernel(r, s);
  const total = simpson(g, r, s);
  return (x) => {
    const distance = Math.abs(x);
    if (distance <= r) return 1;
    if (distance >= s) return 0;
    return simpson(g, distance, s) / total;
  };
};

export const shiftedCutoff = (center, r, s) => {
  const base = radialCutoff(r, s);
  return (x) => base(x - center);
};

export const combineCutoffs = (cutoffs) => (x) =>
  1 - cutoffs.reduce((product, cutoff) => product * (1 - cutoff(x)), 1);

export const intervalBump = (low, high) => {
  const half = (high - low) / 2;
  return shiftedCutoff((low + high) / 2, half * 0.4, half * 0.97);
};

export const partitionOfUnity = (cover) => {
  const bumps = cover.map(([low, high]) => intervalBump(low, high));
  return bumps.map((bump) => (x) => {
    const total = bumps.reduce((sum, other) => sum + other(x), 0);
    return total > 0 ? bump(x) / total : 0;
  });
};

export const supportOf = (f, low, high, steps = 2000) => {
  let first = null;
  let last = null;
  for (let i = 0; i <= steps; i += 1) {
    const x = low + ((high - low) * i) / steps;
    if (f(x) > 1e-12) {
      if (first === null) first = x;
      last = x;
    }
  }
  return first === null ? null : [first, last];
};
