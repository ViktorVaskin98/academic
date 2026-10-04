import { register } from './viz.js';
import { format } from './topology.js';
import { FUNCTIONS, preimage, isOpenInLine } from './mappings.js';
import {
  allTopologies, describeSubset, describeTopology, continuityFailure, isBijection, inverseMap,
  pullbackTopology, isStronger,
} from './finite-topology.js';
import {
  svgNode, createCanvas, clearElement, roleColor, themeColor, text, numberLine, drawSetOnLine,
  plane, shell, controlRow, buttonGroup, slider, readout, legend,
} from './render.js';

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
