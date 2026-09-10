import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  set, point, interval, normalize, format, equals, union, intersect, complement,
} from '../assets/topology.js';

test('normalize сливает соприкасающиеся компоненты, когда стык покрыт', () => {
  const s = normalize([interval(0, 1, true, false), interval(1, 2, true, true)]);
  assert.equal(format(s), '[0, 2]');
});

test('normalize не сливает компоненты с выколотым стыком', () => {
  const s = normalize([interval(0, 1, true, false), interval(1, 2, false, true)]);
  assert.equal(format(s), '[0, 1) ∪ (1, 2]');
});

test('normalize поглощает точку внутри интервала', () => {
  const s = normalize([interval(0, 5, false, false), point(3)]);
  assert.equal(format(s), '(0, 5)');
});

test('normalize приклеивает точку к открытому концу', () => {
  const s = normalize([interval(0, 5, false, false), point(5)]);
  assert.equal(format(s), '(0, 5]');
});

test('normalize сортирует и выбрасывает пустые компоненты', () => {
  const s = normalize([point(7), interval(2, 5, true, false), interval(9, 9, false, false)]);
  assert.equal(format(s), '[2, 5) ∪ {7}');
});

test('union и intersect работают на объединениях интервалов', () => {
  const a = set(interval(0, 3, true, false), point(7));
  const b = set(interval(2, 5, false, true));
  assert.equal(format(union(a, b)), '[0, 5] ∪ {7}');
  assert.equal(format(intersect(a, b)), '(2, 3)');
});

test('complement на ℝ переворачивает замкнутость концов', () => {
  const s = set(interval(2, 5, true, false), point(7));
  assert.equal(format(complement(s)), '(-∞, 2) ∪ [5, 7) ∪ (7, +∞)');
});

test('equals не зависит от порядка компонент', () => {
  assert.ok(equals(
    set(point(7), interval(0, 1, true, true)),
    set(interval(0, 1, true, true), point(7)),
  ));
});

test('complement пустого множества — всё пространство, и обратно', () => {
  assert.equal(format(complement(set())), '(-∞, +∞)');
  assert.equal(format(complement(set(interval(-Infinity, Infinity, false, false)))), '∅');
});
