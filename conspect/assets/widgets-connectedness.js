import { register } from './viz.js';
import {
  set, interval, format, componentsOf, isConnectedInLine, puncture, REAL_LINE,
} from './topology.js';
import {
  svgNode, createCanvas, clearElement, roleColor, themeColor, text, numberLine, drawSetOnLine,
  shell, controlRow, buttonGroup, slider, readout,
} from './render.js';

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
