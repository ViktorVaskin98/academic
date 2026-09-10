import {
  set, point, interval, format, equals, union, intersect,
  interior, closure, boundary, TOPOLOGIES, isEmpty,
} from './topology.js';
import {
  allTopologies, coveringEdges, describeTopology, describeSubset,
  interiorIn, closureIn, boundaryIn, blockTopology,
} from './finite-topology.js';
import {
  svgNode, createCanvas, clearElement, roleColor, themeColor, text, numberLine,
  drawSetOnLine, plane, legend, shell, controlRow, buttonGroup, slider, toggle,
  readout, pointerPosition,
} from './render.js';

const registry = new Map();

export const register = (name, factory) => registry.set(name, factory);

export function mountAll(root = document) {
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

export { registry };
