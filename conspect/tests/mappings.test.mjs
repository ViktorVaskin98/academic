import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FUNCTIONS, preimage, isOpenInLine } from '../assets/mappings.js';
import { format } from '../assets/topology.js';

const pre = (id, low, high) => format(preimage(FUNCTIONS[id], low, high));

test('прообраз интервала при линейном отображении — интервал', () => {
  assert.equal(pre('linear', 1, 2), '(0, 2)');
});

test('прообраз (1, 4) при x² — два интервала', () => {
  assert.equal(pre('square', 1, 4), '(-2, -1) ∪ (1, 2)');
});

test('прообраз интервала, содержащего 0, при x² — один интервал', () => {
  assert.equal(pre('square', -1, 4), '(-2, 2)');
  assert.equal(pre('square', -3, -1), '∅');
});

test('Th. 3.1: у ступеньки прообраз открытого множества не открыт', () => {
  assert.equal(pre('step', 0.5, 1.5), '[0, +∞)');
  assert.equal(isOpenInLine(preimage(FUNCTIONS.step, 0.5, 1.5)), false);
});

test('у ступеньки прообразы остальных открытых множеств открыты', () => {
  assert.equal(pre('step', -0.5, 0.5), '(-∞, 0)');
  assert.equal(pre('step', -1, 2), '(-∞, +∞)');
  assert.equal(pre('step', 2, 3), '∅');
});

test('Ex. 1: прообраз при постоянном отображении — всё или ничего', () => {
  assert.equal(pre('constant', 1, 2), '(-∞, +∞)');
  assert.equal(pre('constant', 2, 3), '∅');
});

test('Ex. 3: прообраз интервала при tg — интервал внутри (−π/2, π/2)', () => {
  const result = preimage(FUNCTIONS.tan, -1, 1);
  assert.equal(format(result), '(-0.785, 0.785)');
  assert.equal(isOpenInLine(result), true);
});

test('evaluate совпадает с формулами', () => {
  assert.equal(FUNCTIONS.square.evaluate(-3), 9);
  assert.equal(FUNCTIONS.step.evaluate(0), 1);
  assert.equal(FUNCTIONS.step.evaluate(-0.001), 0);
  assert.equal(FUNCTIONS.linear.evaluate(2), 2);
});
