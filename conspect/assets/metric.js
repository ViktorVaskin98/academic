export const distance = ([x1, y1], [x2, y2]) => Math.hypot(x2 - x1, y2 - y1);

export const hausdorffRadius = (p, q) => distance(p, q) / 3;

export const ballsDisjoint = (p, q, radius) => 2 * radius <= distance(p, q);

export function distanceToRectBoundary([x, y], { x1, x2, y1, y2 }) {
  const gaps = [x - x1, x2 - x, y - y1, y2 - y];
  return gaps.some((gap) => gap <= 0) ? 0 : Math.min(...gaps);
}

export function firstFittingBall(center, rect) {
  const room = distanceToRectBoundary(center, rect);
  return room > 0 ? Math.ceil(1 / room - 1e-9) : Infinity;
}
