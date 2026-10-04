import {
  interval, normalize, equals, interior, REAL_LINE, TOPOLOGIES,
} from './topology.js';

const openInterval = (low, high) => interval(low, high, false, false);

export const FUNCTIONS = {
  linear: {
    id: 'linear',
    label: 'x/2 + 1',
    latex: 'f(x) = \tfrac{x}{2} + 1',
    continuous: true,
    evaluate: (x) => x / 2 + 1,
    preimage: (low, high) => [openInterval(2 * (low - 1), 2 * (high - 1))],
  },
  square: {
    id: 'square',
    label: 'x²',
    latex: 'f(x) = x^2',
    continuous: true,
    evaluate: (x) => x * x,
    preimage: (low, high) => {
      if (high <= 0) return [];
      const outer = Math.sqrt(high);
      if (low < 0) return [openInterval(-outer, outer)];
      const inner = Math.sqrt(low);
      return [openInterval(-outer, -inner), openInterval(inner, outer)];
    },
  },
  step: {
    id: 'step',
    label: 'ступенька',
    latex: 'H(x) = \begin{cases} 0, & x < 0 \\ 1, & x \geqslant 0 \end{cases}',
    continuous: false,
    jumps: [{ at: 0, left: 0, right: 1 }],
    evaluate: (x) => (x < 0 ? 0 : 1),
    preimage: (low, high) => {
      const hitsZero = low < 0 && 0 < high;
      const hitsOne = low < 1 && 1 < high;
      if (hitsZero && hitsOne) return [REAL_LINE];
      if (hitsOne) return [interval(0, Infinity, true, false)];
      if (hitsZero) return [openInterval(-Infinity, 0)];
      return [];
    },
  },
  constant: {
    id: 'constant',
    label: 'константа',
    latex: '\mathrm{const}_{y_0}(x) = 1.5',
    continuous: true,
    evaluate: () => 1.5,
    preimage: (low, high) => (low < 1.5 && 1.5 < high ? [REAL_LINE] : []),
  },
  tan: {
    id: 'tan',
    label: 'tg x',
    latex: '\mathrm{tg} : \left(-\tfrac{\pi}{2}, \tfrac{\pi}{2}\right) \to \mathbb{R}',
    continuous: true,
    domain: [-Math.PI / 2, Math.PI / 2],
    evaluate: Math.tan,
    preimage: (low, high) => [openInterval(Math.atan(low), Math.atan(high))],
  },
};

export const preimage = (fn, low, high) => normalize(fn.preimage(low, high));

export const isOpenInLine = (s) => equals(interior(s, TOPOLOGIES.st), s);
