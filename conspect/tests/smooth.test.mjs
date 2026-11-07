import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CIRCLE_ATLASES, circlePoint, chartsAt, transition, kinkTransition, isDifferentiableAt,
  oneSidedDerivatives, cube, cubeRoot, diskToPlane, planeToDisk, rankAt, LEVEL_FUNCTIONS,
  nearestOnLevel, bumpKernel, radialCutoff, combineCutoffs, shiftedCutoff, partitionOfUnity,
  supportOf,
} from '../assets/smooth.js';

const close = (actual, expected, eps = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < eps, `${actual} ≉ ${expected}`);

test('Ex. 1 лекции 5: стереографические карты — обратные к своим отображениям', () => {
  for (const chart of CIRCLE_ATLASES.stereo.charts) {
    for (const t of [-3, -0.5, 0, 0.7, 4]) close(chart.map(chart.inverse(t)), t);
  }
});

test('Ex. 1 лекции 5: замена координат β = 1/α', () => {
  const [phi, psi] = CIRCLE_ATLASES.stereo.charts;
  for (const alpha of [-2, -0.3, 0.5, 3]) close(transition(phi, psi, alpha), 1 / alpha);
  assert.equal(transition(phi, psi, 0), null);
});

test('Ex. 3.1 лекции 5: переход угловых карт t ± π', () => {
  const [phi, psi] = CIRCLE_ATLASES.angle.charts;
  close(transition(phi, psi, -1), -1 + Math.PI);
  close(transition(phi, psi, 2), 2 - Math.PI);
  assert.equal(transition(phi, psi, 0), null);
});

test('Ex. 3.2 лекции 5: переход проекционных карт √(1 − y²)', () => {
  const [phiPlus, , psiPlus] = CIRCLE_ATLASES.projection.charts;
  for (const y of [0.1, 0.5, 0.9]) close(transition(phiPlus, psiPlus, y), Math.sqrt(1 - y * y));
  assert.equal(transition(phiPlus, psiPlus, -0.5), null);
});

test('каждая точка окружности покрыта картами каждого атласа', () => {
  for (const id of Object.keys(CIRCLE_ATLASES)) {
    for (let k = 0; k < 64; k += 1) {
      assert.ok(chartsAt(id, circlePoint((k / 64) * 2 * Math.PI)).length >= 1, `${id} ${k}`);
    }
  }
  assert.equal(chartsAt('stereo', { x: 0, y: 1 }).length, 1);
  assert.equal(chartsAt('projection', { x: Math.SQRT1_2, y: Math.SQRT1_2 }).length, 2);
});

test('Ex. 2 лекции 5: φ_α ∘ φ_β⁻¹ дифференцируемо в нуле только при α = β', () => {
  assert.equal(isDifferentiableAt(kinkTransition(2, 2), 0), true);
  assert.equal(isDifferentiableAt(kinkTransition(2, 1), 0), false);
  const { left, right } = oneSidedDerivatives(kinkTransition(3, 1), 0);
  close(left, 1, 1e-4);
  close(right, 3, 1e-4);
});

test('Ex. 2 лекции 7: x³ гладкое, ∛y недифференцируем в нуле', () => {
  assert.equal(isDifferentiableAt(cube, 0), true);
  close(cubeRoot(cube(1.7)), 1.7);
  close(cubeRoot(-8), -2);
  const { right } = oneSidedDerivatives(cubeRoot, 0);
  assert.ok(right > 1e3);
});

test('Ex. 1 лекции 7: диск и плоскость — взаимно обратные отображения', () => {
  for (const p of [{ x: 0, y: 0 }, { x: 0.3, y: -0.4 }, { x: 0.9, y: 0.1 }]) {
    const back = planeToDisk(diskToPlane(p));
    close(back.x, p.x);
    close(back.y, p.y);
  }
  assert.ok(diskToPlane({ x: 0.999, y: 0 }).x > 20);
});

test('Th. 6.2: на окружности ранг Dh = 1 всюду', () => {
  for (let k = 0; k < 16; k += 1) {
    const { x, y } = circlePoint((k / 16) * 2 * Math.PI);
    close(LEVEL_FUNCTIONS.circle.h(x, y), 0);
    assert.equal(rankAt('circle', x, y), 1);
  }
});

test('Ex. 4 лекции 6: у креста, точки возврата и двойной параболы в нуле ранг 0', () => {
  for (const id of ['cross', 'cusp', 'doubleParabola']) {
    assert.equal(rankAt(id, 0, 0), 0, id);
    for (const branch of LEVEL_FUNCTIONS[id].branches) {
      const [a, b] = branch(0.8);
      close(LEVEL_FUNCTIONS[id].h(a, b), 0);
      assert.equal(rankAt(id, a, b), 1, id);
    }
  }
});

test('ближайшая точка уровня лежит на уровне', () => {
  for (const id of Object.keys(LEVEL_FUNCTIONS)) {
    const [a, b] = nearestOnLevel(id, [0.4, 0.7]);
    close(LEVEL_FUNCTIONS[id].h(a, b), 0, 1e-9);
  }
});

test('Lm. 2 лекции 7: ядро g гладко зануляется вне (r, s)', () => {
  const g = bumpKernel(1, 2);
  assert.equal(g(1), 0);
  assert.equal(g(2), 0);
  assert.equal(g(0.5), 0);
  assert.ok(g(1.5) > 0);
});

test('Lm. 2 лекции 7: срезка равна 1 на B̄(0, r), 0 вне B(0, s), между — в [0, 1]', () => {
  const phi = radialCutoff(1, 2);
  assert.equal(phi(0), 1);
  assert.equal(phi(-1), 1);
  assert.equal(phi(2), 0);
  assert.equal(phi(-2.5), 0);
  let previous = 1;
  for (let x = 1; x <= 2; x += 0.05) {
    const value = phi(x);
    assert.ok(value >= -1e-12 && value <= 1 + 1e-12);
    assert.ok(value <= previous + 1e-9);
    previous = value;
  }
  close(phi(1.5), 0.5, 1e-6);
});

test('Lm. 2 лекции 7: β = 1 − Π(1 − φᵢ) равна 1 на объединении Kᵢ', () => {
  const beta = combineCutoffs([shiftedCutoff(0, 0.5, 1), shiftedCutoff(1.2, 0.5, 1)]);
  for (const x of [-0.5, 0, 0.5, 0.7, 1.2, 1.7]) close(beta(x), 1);
  assert.equal(beta(3), 0);
  assert.ok(beta(-0.8) > 0 && beta(-0.8) < 1);
});

test('Th. 3.1 лекции 7: разбиение единицы суммируется в 1 и подчинено покрытию', () => {
  const cover = [[-3, -0.5], [-1.5, 1.5], [0.5, 3]];
  const partition = partitionOfUnity(cover);
  for (let x = -2.5; x <= 2.5; x += 0.1) {
    const total = partition.reduce((sum, phi) => sum + phi(x), 0);
    close(total, 1, 1e-9);
    for (const phi of partition) assert.ok(phi(x) >= 0 && phi(x) <= 1 + 1e-12);
  }
  partition.forEach((phi, index) => {
    const [low, high] = supportOf(phi, -4, 4);
    assert.ok(low > cover[index][0] && high < cover[index][1], `носитель ${index}`);
  });
});
