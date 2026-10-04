import { register } from './viz.js';
import { allTopologies, describeTopology, separationFailure } from './finite-topology.js';
import {
  distance, ballsDisjoint, distanceToRectBoundary, firstFittingBall,
} from './metric.js';
import {
  LABELS, POSITIONS, SUBSETS, HULL_COLORS, drawHull, sizeOf,
} from './widgets-bases.js';
import {
  svgNode, createCanvas, clearElement, roleColor, themeColor, text, plane, shell, controlRow,
  buttonGroup, slider, toggle, readout, legend, pointerPosition,
} from './render.js';

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
