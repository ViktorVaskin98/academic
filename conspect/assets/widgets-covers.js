import { register } from './viz.js';
import {
  set, interval, format, intersect, isEmpty, unionAll, uncovered, meetingCount, REAL_LINE,
} from './topology.js';
import {
  svgNode, createCanvas, clearElement, roleColor, themeColor, text, numberLine, drawSetOnLine,
  shell, controlRow, buttonGroup, slider, readout, legend,
} from './render.js';

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
