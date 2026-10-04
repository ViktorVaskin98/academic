import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  distance, hausdorffRadius, ballsDisjoint, distanceToRectBoundary, firstFittingBall,
} from '../assets/metric.js';

test('distance — евклидово расстояние', () => {
  assert.equal(distance([0, 0], [3, 4]), 5);
});

test('Ex. 7: шары радиуса ‖P−Q‖/3 не пересекаются', () => {
  const p = [0, 0];
  const q = [3, 4];
  assert.equal(hausdorffRadius(p, q), 5 / 3);
  assert.equal(ballsDisjoint(p, q, hausdorffRadius(p, q)), true);
});

test('шары радиуса ‖P−Q‖/2 уже касаются, а больше — пересекаются', () => {
  const p = [0, 0];
  const q = [2, 0];
  assert.equal(ballsDisjoint(p, q, 1), true);
  assert.equal(ballsDisjoint(p, q, 1.01), false);
});

test('distanceToRectBoundary для точки внутри открытого прямоугольника', () => {
  const rect = { x1: 0, x2: 4, y1: 0, y2: 2 };
  assert.equal(distanceToRectBoundary([1, 1.5], rect), 0.5);
  assert.equal(distanceToRectBoundary([5, 1], rect), 0);
});

test('Def. 3: первый шар B(P, 1/n), влезающий в окрестность', () => {
  const rect = { x1: 0, x2: 4, y1: 0, y2: 2 };
  assert.equal(firstFittingBall([1, 1.5], rect), 2);
  assert.equal(firstFittingBall([1, 1.9], rect), 10);
  assert.equal(firstFittingBall([5, 1], rect), Infinity);
});
