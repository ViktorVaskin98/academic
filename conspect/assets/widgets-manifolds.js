import { register } from './viz.js';
import {
  CIRCLE_ATLASES, circlePoint, chartsAt, transition, transitionSamples,
  kinkChart, kinkTransition, oneSidedDerivatives, isDifferentiableAt, cube, cubeRoot,
  LEVEL_FUNCTIONS, rankAt, nearestOnLevel,
  bumpKernel, radialCutoff, shiftedCutoff, combineCutoffs, partitionOfUnity, supportOf,
} from './smooth.js';
import {
  svgNode, createCanvas, clearElement, roleColor, themeColor, text, plane,
  shell, controlRow, buttonGroup, slider, readout, dragHandler,
} from './render.js';

const fmt = (value, digits = 3) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (!Number.isFinite(value)) return value > 0 ? '+∞' : '−∞';
  const rounded = Number(value.toFixed(digits));
  return (Object.is(rounded, -0) ? 0 : rounded).toString().replace('-', '−');
};

const polyline = (parent, points, attrs) => {
  if (points.length < 2) return;
  parent.appendChild(svgNode('polyline', {
    points: points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '),
    fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round', ...attrs,
  }));
};

const plotFunction = (parent, toPx, f, from, to, attrs, options = {}) => {
  const { steps = 400, yClip = Infinity, jump = Infinity } = options;
  let run = [];
  let previous = null;
  for (let i = 0; i <= steps; i += 1) {
    const x = from + ((to - from) * i) / steps;
    const y = f(x);
    const valid = y !== null && Number.isFinite(y) && Math.abs(y) <= yClip;
    if (!valid || (previous !== null && Math.abs(y - previous) > jump)) {
      polyline(parent, run, attrs);
      run = [];
    }
    if (valid) run.push(toPx(x, y));
    previous = valid ? y : null;
  }
  polyline(parent, run, attrs);
};

const dot = (parent, [cx, cy], color, options = {}) => {
  parent.appendChild(svgNode('circle', {
    cx, cy, r: options.r ?? 6,
    fill: options.hollow ? themeColor('--bg-deep') : color,
    stroke: color, 'stroke-width': options.hollow ? 2.5 : 1.5,
  }));
};

const frame = (parent, left, top, width, height) => {
  parent.appendChild(svgNode('rect', {
    x: left, y: top, width, height, rx: 10, fill: 'none',
    stroke: themeColor('--border'), 'stroke-width': 1,
  }));
};

const PAIR_COLORS = ['set', 'neighborhood'];

const ATLAS_VIEW = {
  stereo: { range: [-4, 4], pairs: [[0, 1]], jump: 3 },
  angle: { range: [-Math.PI, Math.PI], pairs: [[0, 1]], jump: 3 },
  projection: { range: [-1, 1], pairs: [[0, 2], [0, 3], [1, 2], [1, 3]], jump: 3 },
};

const chartArc = (parent, center, radius, chart, color, offset) => {
  let run = [];
  const steps = 360;
  for (let i = 0; i <= steps; i += 1) {
    const theta = (i / steps) * 2 * Math.PI;
    const p = circlePoint(theta);
    if (chart.contains(p)) {
      run.push([center[0] + (radius + offset) * p.x, center[1] - (radius + offset) * p.y]);
    } else {
      polyline(parent, run, { stroke: color, 'stroke-width': 5, opacity: 0.85 });
      run = [];
    }
  }
  polyline(parent, run, { stroke: color, 'stroke-width': 5, opacity: 0.85 });
};

register('CircleCharts', (host, config) => {
  const width = 720;
  const height = 330;
  const state = { atlas: config.atlas ?? 'stereo', pair: 0, theta: config.theta ?? 0.9 };
  const atlasIds = Object.keys(CIRCLE_ATLASES);

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'Атласы окружности: карты и замена координат',
    caption: config.caption || 'Тащи точку P по окружности. Слева — носители двух карт (цветные дуги) '
      + 'и выколотые точки, справа — график замены координат ψ ∘ φ⁻¹ на φ(U ∩ V). '
      + 'Разрыв графика — это точки, которые не лежат в пересечении носителей.',
  });
  const svg = createCanvas(body, width, height);
  const atlasRow = controlRow(body);
  const pairRow = controlRow(body);
  const view = readout(body);

  const center = [170, 165];
  const radius = 115;
  const plotBox = { left: 380, right: 690, top: 30, bottom: 300 };

  const pairCharts = () => {
    const charts = CIRCLE_ATLASES[state.atlas].charts;
    const [i, j] = ATLAS_VIEW[state.atlas].pairs[state.pair];
    return [charts[i], charts[j]];
  };

  let pairButtons = null;
  const renderPairs = () => {
    clearElement(pairRow);
    const pairs = ATLAS_VIEW[state.atlas].pairs;
    if (pairs.length < 2) return;
    const charts = CIRCLE_ATLASES[state.atlas].charts;
    pairButtons = buttonGroup(
      pairRow,
      pairs.map(([i, j], index) => ({ label: `${charts[j].name} ∘ ${charts[i].name}⁻¹`, value: index })),
      (value) => { state.pair = value; draw(); },
      state.pair,
    );
  };

  const draw = () => {
    clearElement(svg);
    const [from, to] = pairCharts();
    const p = circlePoint(state.theta);

    frame(svg, 20, 15, 320, 300);
    svg.appendChild(svgNode('circle', {
      cx: center[0], cy: center[1], r: radius, fill: 'none',
      stroke: roleColor('axis'), 'stroke-width': 1.5,
    }));
    chartArc(svg, center, radius, from, roleColor(PAIR_COLORS[0]), 9);
    chartArc(svg, center, radius, to, roleColor(PAIR_COLORS[1]), -9);
    text(svg, `носитель ${from.name}`, 30, 35, { anchor: 'start', color: roleColor(PAIR_COLORS[0]), size: 13 });
    text(svg, `носитель ${to.name}`, 30, 300, { anchor: 'start', color: roleColor(PAIR_COLORS[1]), size: 13 });

    for (let k = 0; k < 720; k += 1) {
      const q = circlePoint((k / 720) * 2 * Math.PI);
      const next = circlePoint(((k + 1) / 720) * 2 * Math.PI);
      for (const chart of [from, to]) {
        if (chart.contains(q) !== chart.contains(next)) {
          const edge = chart.contains(q) ? next : q;
          dot(svg, [center[0] + radius * edge.x, center[1] - radius * edge.y], roleColor('boundary'), { hollow: true, r: 5 });
        }
      }
    }
    const pointPx = [center[0] + radius * p.x, center[1] - radius * p.y];
    dot(svg, pointPx, roleColor('highlight'), { r: 8 });
    text(svg, 'P', pointPx[0] + 14 * p.x, pointPx[1] - 14 * p.y + 4, { color: roleColor('highlight'), weight: 700 });

    frame(svg, plotBox.left - 10, 15, plotBox.right - plotBox.left + 20, 300);
    const { range, jump } = ATLAS_VIEW[state.atlas];
    const axes = plane(svg, {
      xRange: range, yRange: range, ...plotBox, grid: state.atlas === 'projection' ? 0.5 : 1, axisLabels: false,
    });
    text(svg, `${from.name}`, plotBox.right - 4, axes.toPx(0, 0)[1] - 8, { anchor: 'end', color: roleColor('faint'), size: 12 });
    text(svg, `${to.name}`, axes.toPx(0, 0)[0] + 8, plotBox.top + 12, { anchor: 'start', color: roleColor('faint'), size: 12 });

    const samples = transitionSamples(from, to, range, 800);
    let run = [];
    let previous = null;
    for (const { t, value } of samples) {
      const inside = value !== null && Math.abs(value) <= range[1] * 1.05;
      if (!inside || (previous !== null && Math.abs(value - previous) > jump)) {
        polyline(svg, run, { stroke: roleColor('interior'), 'stroke-width': 3 });
        run = [];
      }
      if (inside) run.push(axes.toPx(t, value));
      previous = inside ? value : null;
    }
    polyline(svg, run, { stroke: roleColor('interior'), 'stroke-width': 3 });

    const inFrom = from.contains(p);
    const inTo = to.contains(p);
    if (inFrom && inTo) {
      const t = from.map(p);
      const value = to.map(p);
      if (Math.abs(t) <= range[1] && Math.abs(value) <= range[1]) {
        dot(svg, axes.toPx(t, value), roleColor('highlight'), { r: 7 });
      }
    }

    const coordinates = CIRCLE_ATLASES[state.atlas].charts
      .map((chart) => `${chart.name} = ${chart.contains(p) ? fmt(chart.map(p)) : 'не определена'}`)
      .join(', ');
    const covering = chartsAt(state.atlas, p).map((chart) => chart.name).join(', ');
    view.set([
      ['P', `(${fmt(p.x)}, ${fmt(p.y)})`],
      ['карты в P', covering],
      ['координаты P', coordinates],
      [`${to.name} ∘ ${from.name}⁻¹`, inFrom && inTo
        ? `${fmt(from.map(p))} ↦ ${fmt(transition(from, to, from.map(p)))}`
        : 'P не лежит в пересечении носителей', inFrom && inTo ? '' : 'viz__verdict viz__verdict--no'],
    ]);
  };

  buttonGroup(
    atlasRow,
    atlasIds.map((id) => ({ label: `${CIRCLE_ATLASES[id].label} атлас`, value: id })),
    (value) => { state.atlas = value; state.pair = 0; renderPairs(); draw(); },
    Math.max(0, atlasIds.indexOf(state.atlas)),
  );

  dragHandler(svg, ({ x, y }) => {
    if (x > 345) return;
    state.theta = Math.atan2(-(y - center[1]), x - center[0]);
    draw();
  });

  if (captionNode) body.appendChild(captionNode);
  renderPairs();
  host.addEventListener('difgem:redraw', draw);
  draw();
});

register('KinkStructures', (host, config) => {
  const width = 720;
  const height = 300;
  const state = { alpha: config.alpha ?? 2, beta: config.beta ?? 1 };

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'Ex. 2: разные C^r-структуры на прямой',
    caption: config.caption || 'Слева карта φ_α: при x > 0 прямая растягивается в α раз. Справа замена координат '
      + 'φ_α ∘ φ_β⁻¹: при α ≠ β в нуле излом — односторонние производные 1 и α/β не совпадают, '
      + 'поэтому карты не C^r-согласованы, хотя каждая — гомеоморфизм ℝ → ℝ.',
  });
  const svg = createCanvas(body, width, height);
  const controls = controlRow(body);
  const view = readout(body);

  const draw = () => {
    clearElement(svg);
    const boxes = [
      { left: 40, right: 330, title: `φ_α, α = ${fmt(state.alpha, 2)}`, f: kinkChart(state.alpha) },
      { left: 390, right: 680, title: 'φ_α ∘ φ_β⁻¹', f: kinkTransition(state.alpha, state.beta) },
    ];
    for (const box of boxes) {
      frame(svg, box.left - 20, 12, box.right - box.left + 40, 275);
      const axes = plane(svg, {
        xRange: [-2, 2], yRange: [-2, 4], left: box.left, right: box.right, top: 40, bottom: 270, axisLabels: false,
      });
      plotFunction(svg, axes.toPx, (x) => x, -2, 2, { stroke: roleColor('faint'), 'stroke-width': 1.5, 'stroke-dasharray': '5 5' });
      plotFunction(svg, axes.toPx, box.f, -2, 2, { stroke: roleColor('interior'), 'stroke-width': 3 }, { yClip: 4.2 });
      dot(svg, axes.toPx(0, 0), roleColor('highlight'), { r: 6 });
      text(svg, box.title, (box.left + box.right) / 2, 32, { color: roleColor('text'), size: 14, weight: 600 });
    }
    const f = kinkTransition(state.alpha, state.beta);
    const { left, right } = oneSidedDerivatives(f, 0);
    const smooth = isDifferentiableAt(f, 0);
    view.set([
      ['производная слева в 0', fmt(left, 3)],
      ['производная справа в 0', `${fmt(right, 3)} = α/β`],
      ['карты C^r-согласованы?', smooth ? 'да: α = β, переход — тождество на (−∞, 0] и линейный на (0, ∞) с тем же наклоном'
        : 'нет: излом в 0, переход не дифференцируем → это разные C^r-структуры',
      `viz__verdict viz__verdict--${smooth ? 'yes' : 'no'}`],
    ]);
  };

  slider(controls, {
    label: 'α', min: 0.25, max: 4, step: 0.25, value: state.alpha, format: (v) => v.toFixed(2),
    onInput: (value) => { state.alpha = value; draw(); },
  });
  slider(controls, {
    label: 'β', min: 0.25, max: 4, step: 0.25, value: state.beta, format: (v) => v.toFixed(2),
    onInput: (value) => { state.beta = value; draw(); },
  });

  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});

register('CubeHomeo', (host, config) => {
  const width = 720;
  const height = 300;
  const state = { x: config.x ?? 0.8 };

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'x ↦ x³: гладкий гомеоморфизм, но не диффеоморфизм',
    caption: config.caption || 'Слева σ(x) = x³ с касательной, справа обратное σ⁻¹(y) = ∛y. '
      + 'Двигай точку к нулю: наклон σ стремится к 0, а наклон σ⁻¹ — к бесконечности. '
      + 'В нуле касательная к ∛y вертикальна, производной нет, значит σ⁻¹ не C¹.',
  });
  const svg = createCanvas(body, width, height);
  const controls = controlRow(body);
  const view = readout(body);

  const draw = () => {
    clearElement(svg);
    const panels = [
      { left: 40, right: 330, f: cube, df: (x) => 3 * x * x, at: state.x, title: 'σ(x) = x³' },
      { left: 390, right: 680, f: cubeRoot, df: (y) => (y === 0 ? Infinity : 1 / (3 * cubeRoot(y) ** 2)), at: cube(state.x), title: 'σ⁻¹(y) = ∛y' },
    ];
    for (const panel of panels) {
      frame(svg, panel.left - 20, 12, panel.right - panel.left + 40, 275);
      const axes = plane(svg, {
        xRange: [-1.5, 1.5], yRange: [-1.5, 1.5], left: panel.left, right: panel.right, top: 40, bottom: 270, grid: 0.5, axisLabels: false,
      });
      plotFunction(svg, axes.toPx, panel.f, -1.5, 1.5, { stroke: roleColor('interior'), 'stroke-width': 3 }, { yClip: 1.6 });
      const x0 = panel.at;
      const y0 = panel.f(x0);
      const slope = panel.df(x0);
      if (Number.isFinite(slope)) {
        plotFunction(svg, axes.toPx, (x) => y0 + slope * (x - x0), -1.5, 1.5,
          { stroke: roleColor('highlight'), 'stroke-width': 1.8, 'stroke-dasharray': '6 4' }, { yClip: 1.5 });
      } else {
        const [px] = axes.toPx(x0, 0);
        svg.appendChild(svgNode('line', {
          x1: px, y1: 40, x2: px, y2: 270, stroke: roleColor('highlight'), 'stroke-width': 1.8, 'stroke-dasharray': '6 4',
        }));
      }
      if (Math.abs(x0) <= 1.5 && Math.abs(y0) <= 1.5) dot(svg, axes.toPx(x0, y0), roleColor('highlight'));
      text(svg, panel.title, (panel.left + panel.right) / 2, 32, { color: roleColor('text'), size: 14, weight: 600 });
    }
    const y = cube(state.x);
    const inverseSlope = state.x === 0 ? Infinity : 1 / (3 * state.x * state.x);
    view.set([
      ['σ\'(x) = 3x²', fmt(3 * state.x * state.x)],
      ['(σ⁻¹)\'(y) = 1/(3∛y²)', `${fmt(inverseSlope)} при y = ${fmt(y)}`],
      ['σ⁻¹ дифференцируемо здесь?', state.x === 0 ? 'нет — в нуле вертикальная касательная' : 'да, но производная растёт при y → 0',
        `viz__verdict viz__verdict--${state.x === 0 ? 'no' : 'yes'}`],
    ]);
  };

  slider(controls, {
    label: 'x', min: -1.1, max: 1.1, step: 0.05, value: state.x, format: (v) => v.toFixed(2),
    onInput: (value) => { state.x = Math.abs(value) < 1e-9 ? 0 : value; draw(); },
  });

  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});

register('LevelSets', (host, config) => {
  const width = 720;
  const height = 360;
  const ids = Object.keys(LEVEL_FUNCTIONS);
  const state = { id: config.fn ?? 'circle', point: null };

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'Нулевой уровень h⁻¹(0) и ранг Dh (Th. 6.2)',
    caption: config.caption || 'Тащи точку — она прилипает к множеству h = 0. Стрелка — градиент h, '
      + 'то есть Dh(x). Если Dh ≠ 0 (ранг 1 = d − n), около точки множество — гладкая кривая. '
      + 'В особой точке Dh = 0: Th. 6.2 не работает, и у креста, точки возврата, двойной параболы '
      + 'начало координат действительно плохое.',
  });
  const svg = createCanvas(body, width, height);
  const controls = controlRow(body);
  const view = readout(body);

  const box = { left: 40, right: 400, top: 20, bottom: 340 };
  let axes = null;

  const draw = () => {
    clearElement(svg);
    const level = LEVEL_FUNCTIONS[state.id];
    if (!state.point) state.point = nearestOnLevel(state.id, [0.6, 0.7]);
    frame(svg, box.left - 20, 8, box.right - box.left + 40, 344);
    axes = plane(svg, { xRange: [-1.8, 1.8], yRange: [-1.6, 1.6], ...box, grid: 0.5 });
    for (const branch of level.branches) {
      const [low, high] = level.range;
      const points = [];
      for (let i = 0; i <= 600; i += 1) {
        const [a, b] = branch(low + ((high - low) * i) / 600);
        if (Math.abs(a) <= 1.9 && Math.abs(b) <= 1.7) points.push(axes.toPx(a, b));
      }
      polyline(svg, points, { stroke: roleColor('set'), 'stroke-width': 3.5 });
    }
    if (level.special) dot(svg, axes.toPx(...level.special), roleColor('boundary'), { hollow: true, r: 7 });

    const [a, b] = state.point;
    const gradient = level.gradient(a, b);
    const norm = Math.hypot(...gradient);
    const start = axes.toPx(a, b);
    if (norm > 1e-9) {
      const scale = 0.55 / Math.max(norm, 0.6);
      const end = axes.toPx(a + gradient[0] * scale, b + gradient[1] * scale);
      svg.appendChild(svgNode('line', {
        x1: start[0], y1: start[1], x2: end[0], y2: end[1],
        stroke: roleColor('interior'), 'stroke-width': 3, 'marker-end': 'url(#level-arrow)',
      }));
      const defs = svgNode('defs');
      const marker = svgNode('marker', {
        id: 'level-arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse',
      });
      marker.appendChild(svgNode('path', { d: 'M0,0 L10,5 L0,10 z', fill: roleColor('interior') }));
      defs.appendChild(marker);
      svg.appendChild(defs);
    }
    dot(svg, start, roleColor('highlight'), { r: 8 });

    const rank = rankAt(state.id, a, b);
    const lines = [
      `h(x₁, x₂) = ${level.formula}`,
      `Dh = (${fmt(gradient[0], 2)}, ${fmt(gradient[1], 2)})`,
      `rank Dh = ${rank}`,
      rank === 1 ? 'регулярная точка' : 'особая точка',
    ];
    lines.forEach((line, index) => {
      text(svg, line, 430, 60 + index * 34, {
        anchor: 'start', size: 16, weight: index === 3 ? 700 : 400,
        color: index === 3 ? roleColor(rank === 1 ? 'interior' : 'boundary') : roleColor('text'),
      });
    });
    text(svg, 'd = 2, n = 1, нужен ранг d − n = 1', 430, 230, { anchor: 'start', size: 13, color: roleColor('faint') });

    view.set([
      ['точка', `(${fmt(a, 2)}, ${fmt(b, 2)})`],
      ['условие 2 Th. 6.2', rank === 1 ? 'выполнено: локально это график гладкой функции'
        : 'нарушено: Dh = 0, теорема ничего не гарантирует', `viz__verdict viz__verdict--${rank === 1 ? 'yes' : 'no'}`],
    ]);
  };

  buttonGroup(
    controls,
    ids.map((id) => ({ label: LEVEL_FUNCTIONS[id].label, value: id })),
    (value) => { state.id = value; state.point = null; draw(); },
    Math.max(0, ids.indexOf(state.id)),
  );
  const toOrigin = document.createElement('button');
  toOrigin.type = 'button';
  toOrigin.className = 'btn';
  toOrigin.textContent = 'в особую точку';
  toOrigin.addEventListener('click', () => {
    const special = LEVEL_FUNCTIONS[state.id].special;
    state.point = special ? [...special] : state.point;
    draw();
  });
  controls.appendChild(toOrigin);

  dragHandler(svg, ({ x, y }) => {
    if (!axes || x > box.right + 10) return;
    state.point = nearestOnLevel(state.id, axes.toMath(x, y));
    const special = LEVEL_FUNCTIONS[state.id].special;
    if (special && Math.hypot(state.point[0] - special[0], state.point[1] - special[1]) < 0.06) state.point = [...special];
    draw();
  });

  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});

register('CutoffBuilder', (host, config) => {
  const width = 720;
  const height = 360;
  const state = { r: config.r ?? 1, s: config.s ?? 2, stage: config.stage ?? 2 };

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'Lm. 2: как собирается срезающая функция',
    caption: config.caption || 'Три шага доказательства на прямой. g — гладкая «шапочка» на (r, s), '
      + 'нулевая вместе со всеми производными на концах. φ(x) = ∫_{|x|}^s g / ∫_r^s g равна 1 на [−r, r] '
      + 'и 0 вне (−s, s). β = 1 − Π(1 − φᵢ) склеивает несколько срезок: равна 1 на объединении Kᵢ.',
  });
  const svg = createCanvas(body, width, height);
  const stageRow = controlRow(body);
  const sliders = controlRow(body);
  const view = readout(body);

  const box = { left: 50, right: 690, top: 40, bottom: 300 };

  const draw = () => {
    clearElement(svg);
    const { r, s, stage } = state;
    const axes = plane(svg, { xRange: [-3.5, 3.5], yRange: [-0.15, 1.2], ...box, grid: 0.5, axisLabels: false });
    const band = (low, high, role, label, y) => {
      const [x1] = axes.toPx(low, 0);
      const [x2] = axes.toPx(high, 0);
      svg.appendChild(svgNode('rect', {
        x: x1, y, width: x2 - x1, height: 10, rx: 4, fill: roleColor(role), opacity: 0.75,
      }));
      text(svg, label, (x1 + x2) / 2, y + 26, { size: 12, color: roleColor(role) });
    };

    if (stage === 0) {
      const g = bumpKernel(r, s);
      let peak = 0;
      for (let t = r; t <= s; t += (s - r) / 200) peak = Math.max(peak, g(t));
      plotFunction(svg, axes.toPx, (x) => g(x) / peak, -3.5, 3.5, { stroke: roleColor('interior'), 'stroke-width': 3 });
      text(svg, 'g(t) (масштабировано до высоты 1)', box.left + 10, 28, { anchor: 'start', size: 13 });
      view.set([['g(t)', 'e^{−1/(t−r)} · e^{1/(t−s)} на (r, s), 0 вне'], ['носитель g', `[${fmt(r, 2)}, ${fmt(s, 2)}]`]]);
    } else if (stage === 1) {
      const phi = radialCutoff(r, s);
      band(-s, s, 'neighborhood', 'supp φ = B̄(0, s) ⊂ O', 312);
      band(-r, r, 'set', 'K = B̄(0, r)', 324);
      plotFunction(svg, axes.toPx, phi, -3.5, 3.5, { stroke: roleColor('interior'), 'stroke-width': 3 }, { steps: 300 });
      text(svg, 'φ(x) = (∫ g от |x| до s) / (∫ g от r до s)', box.left + 10, 28, { anchor: 'start', size: 13 });
      view.set([
        ['φ = 1 на', `[−${fmt(r, 2)}, ${fmt(r, 2)}] = K`],
        ['supp φ', `[−${fmt(s, 2)}, ${fmt(s, 2)}] ⊂ O`],
        ['φ(±(r+s)/2)', fmt(phi((r + s) / 2), 3)],
      ]);
    } else {
      const centers = [-1.6, 0.2, 1.7];
      const cutoffs = centers.map((center) => shiftedCutoff(center, r * 0.45, s * 0.45));
      const beta = combineCutoffs(cutoffs);
      centers.forEach((center) => band(center - r * 0.45, center + r * 0.45, 'set', 'Kᵢ', 312));
      cutoffs.forEach((cutoff) => plotFunction(svg, axes.toPx, cutoff, -3.5, 3.5,
        { stroke: roleColor('faint'), 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, { steps: 250 }));
      plotFunction(svg, axes.toPx, beta, -3.5, 3.5, { stroke: roleColor('interior'), 'stroke-width': 3 }, { steps: 350 });
      text(svg, 'β = 1 − Π(1 − φᵢ) — пунктир: отдельные φᵢ', box.left + 10, 28, { anchor: 'start', size: 13 });
      const support = supportOf(beta, -3.5, 3.5, 700);
      view.set([
        ['β = 1 на', 'объединении Kᵢ: там хотя бы один множитель (1 − φᵢ) равен 0'],
        ['supp β', support ? `[${fmt(support[0], 2)}, ${fmt(support[1], 2)}] — компакт` : '∅'],
      ]);
    }
  };

  buttonGroup(
    stageRow,
    [{ label: '1. ядро g', value: 0 }, { label: '2. срезка φ на шаре', value: 1 }, { label: '3. склейка β', value: 2 }],
    (value) => { state.stage = value; draw(); },
    state.stage,
  );
  slider(sliders, {
    label: 'r', min: 0.3, max: 2, step: 0.1, value: state.r, format: (v) => v.toFixed(1),
    onInput: (value) => { state.r = Math.min(value, state.s - 0.2); draw(); },
  });
  slider(sliders, {
    label: 's', min: 0.6, max: 3.2, step: 0.1, value: state.s, format: (v) => v.toFixed(1),
    onInput: (value) => { state.s = Math.max(value, state.r + 0.2); draw(); },
  });

  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});

const PARTITION_COLORS = ['set', 'neighborhood', 'interior', 'boundary', 'highlight'];

register('PartitionOfUnity', (host, config) => {
  const width = 720;
  const height = 380;
  const state = { count: config.count ?? 3, stacked: false };

  const { body, captionNode } = shell(host, {
    badge: 'Интерактив',
    title: config.title || 'Разбиение единицы на M = (−3, 3), подчинённое покрытию',
    caption: config.caption || 'Полосы снизу — открытое покрытие отрезка интервалами Oᵢ. На каждом Oᵢ стоит '
      + 'срезка ψᵢ с носителем внутри Oᵢ; делим на сумму: φᵢ = ψᵢ / Σψⱼ. Получаем функции из Def. 7: '
      + '0 ≤ φᵢ ≤ 1, supp φᵢ ⊂ Oᵢ, и в каждой точке Σφᵢ = 1. Переключи «стопкой», чтобы увидеть сумму.',
  });
  const svg = createCanvas(body, width, height);
  const controls = controlRow(body);
  const view = readout(body);

  const box = { left: 50, right: 690, top: 30, bottom: 270 };

  const coverFor = (count) => {
    const from = -3;
    const to = 3;
    const step = (to - from) / count;
    return Array.from({ length: count }, (_, index) => [
      from + index * step - (index === 0 ? 0.6 : step * 0.45),
      from + (index + 1) * step + (index === count - 1 ? 0.6 : step * 0.45),
    ]);
  };

  const draw = () => {
    clearElement(svg);
    const cover = coverFor(state.count);
    const partition = partitionOfUnity(cover);
    const axes = plane(svg, { xRange: [-3.6, 3.6], yRange: [-0.05, 1.15], ...box, grid: 0.5, axisLabels: false });

    if (state.stacked) {
      const steps = 360;
      const xs = Array.from({ length: steps + 1 }, (_, i) => -3 + (6 * i) / steps);
      let lower = xs.map(() => 0);
      partition.forEach((phi, index) => {
        const upper = xs.map((x, i) => lower[i] + phi(x));
        const top = xs.map((x, i) => axes.toPx(x, upper[i]));
        const bottom = xs.map((x, i) => axes.toPx(x, lower[i])).reverse();
        svg.appendChild(svgNode('polygon', {
          points: [...top, ...bottom].map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' '),
          fill: roleColor(PARTITION_COLORS[index % PARTITION_COLORS.length]), opacity: 0.6,
        }));
        lower = upper;
      });
    } else {
      partition.forEach((phi, index) => plotFunction(svg, axes.toPx, phi, -3, 3,
        { stroke: roleColor(PARTITION_COLORS[index % PARTITION_COLORS.length]), 'stroke-width': 3 }, { steps: 360 }));
    }

    cover.forEach(([low, high], index) => {
      const [x1] = axes.toPx(Math.max(low, -3.6), 0);
      const [x2] = axes.toPx(Math.min(high, 3.6), 0);
      const y = 290 + (index % 2) * 22;
      const color = roleColor(PARTITION_COLORS[index % PARTITION_COLORS.length]);
      svg.appendChild(svgNode('rect', { x: x1, y, width: x2 - x1, height: 9, rx: 4, fill: color, opacity: 0.8 }));
      text(svg, `O${'₁₂₃₄₅₆'[index]}`, x1 + 4, y - 3, { anchor: 'start', size: 11, color });
    });

    const [m1] = axes.toPx(-3, 0);
    const [m2] = axes.toPx(3, 0);
    svg.appendChild(svgNode('line', { x1: m1, y1: 352, x2: m2, y2: 352, stroke: roleColor('text'), 'stroke-width': 2 }));
    text(svg, 'M = (−3, 3)', (m1 + m2) / 2, 370, { size: 12 });

    const probe = 0.37;
    const values = partition.map((phi) => phi(probe));
    view.set([
      ['в точке x = 0.37', values.map((value, index) => `φ${'₁₂₃₄₅₆'[index]} = ${fmt(value, 3)}`).join(', ')],
      ['сумма', fmt(values.reduce((a, b) => a + b, 0), 6)],
      ['носители', partition.map((phi, index) => {
        const support = supportOf(phi, -4, 4, 800);
        return support ? `[${fmt(support[0], 2)}, ${fmt(support[1], 2)}] ⊂ (${fmt(cover[index][0], 2)}, ${fmt(cover[index][1], 2)})` : '∅';
      }).join('; ')],
    ]);
  };

  slider(controls, {
    label: 'интервалов в покрытии', min: 2, max: 5, step: 1, value: state.count,
    onInput: (value) => { state.count = value; draw(); },
  });
  buttonGroup(
    controls,
    [{ label: 'графики φᵢ', value: false }, { label: 'стопкой', value: true }],
    (value) => { state.stacked = value; draw(); },
    0,
  );

  if (captionNode) body.appendChild(captionNode);
  host.addEventListener('difgem:redraw', draw);
  draw();
});

