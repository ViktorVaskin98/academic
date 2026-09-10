const SVG_NS = 'http://www.w3.org/2000/svg';

export const svgNode = (name, attrs = {}) => {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue;
    node.setAttribute(key, String(value));
  }
  return node;
};

export const clear = (node) => {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
};

export const themeColor = (variable) =>
  getComputedStyle(document.documentElement).getPropertyValue(variable).trim();

export const ROLE_VARS = {
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

export const roleColor = (role) => themeColor(ROLE_VARS[role] || role);

export function createCanvas(host, width, height) {
  const svg = svgNode('svg', {
    class: 'viz__canvas',
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
  });
  host.appendChild(svg);
  return svg;
}

export function pointerPosition(svg, event) {
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

export function text(parent, value, x, y, options = {}) {
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

export function numberLine(parent, config) {
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

export function drawSetOnLine(parent, config) {
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

export function plane(parent, config) {
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

export function legend(host, items) {
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

export function shell(host, config) {
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

export function controlRow(parent) {
  const row = document.createElement('div');
  row.className = 'viz__controls';
  parent.appendChild(row);
  return row;
}

export function buttonGroup(parent, options, onSelect, initial = 0) {
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

export function slider(parent, config) {
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

export function toggle(parent, config) {
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

export function readout(parent) {
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

export const clearElement = (node) => {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
};

export const mathText = (latex, display = false) => {
  if (!window.katex) return latex;
  try {
    return window.katex.renderToString(latex, { throwOnError: false, displayMode: display });
  } catch {
    return latex;
  }
};

export const dragHandler = (svg, onMove) => {
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
