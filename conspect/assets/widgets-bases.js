import { register } from './viz.js';
import { checkBase, describeSubset, describeTopology } from './finite-topology.js';
import {
  svgNode, createCanvas, clearElement, roleColor, themeColor, text, shell, controlRow,
  readout, legend,
} from './render.js';

export const LABELS = ['a', 'b', 'c'];
export const POSITIONS = [[190, 225], [450, 225], [320, 85]];
export const SUBSETS = [0b001, 0b010, 0b100, 0b011, 0b101, 0b110, 0b111];
export const HULL_COLORS = [
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

export const pointsOf = (mask) => LABELS.map((_, index) => index).filter((index) => mask & (1 << index));

export const sizeOf = (mask) => pointsOf(mask).length;

export function drawHull(parent, mask, color, emphasis) {
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
