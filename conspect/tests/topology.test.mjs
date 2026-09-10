import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  set, point, interval, normalize, format, equals, union, intersect, complement,
  interior, closure, boundary, classifyPoint, TOPOLOGIES, ARROW_SPACE,
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

const exampleEight = () => set(interval(2, 5, true, false), point(7));

test('Ex. 8: Int, Int дополнения и граница для [2,5) ∪ {7} в τ_st', () => {
  const s = exampleEight();
  assert.equal(format(interior(s, TOPOLOGIES.st)), '(2, 5)');
  assert.equal(format(interior(complement(s), TOPOLOGIES.st)), '(-∞, 2) ∪ (5, 7) ∪ (7, +∞)');
  assert.equal(format(boundary(s, TOPOLOGIES.st)), '{2} ∪ {5} ∪ {7}');
});

test('Ex. 11: замыкание [2,5) ∪ {7} в τ_st', () => {
  assert.equal(format(closure(exampleEight(), TOPOLOGIES.st)), '[2, 5] ∪ {7}');
});

test('Задача 3: Int((0,1] ∪ {2}) в τ_st', () => {
  const s = set(interval(0, 1, false, true), point(2));
  assert.equal(format(interior(s, TOPOLOGIES.st)), '(0, 1)');
});

test('Lm. 4: X распадается на Int(S), Int(S^c) и ∂S', () => {
  const s = exampleEight();
  const parts = union(
    union(interior(s, TOPOLOGIES.st), interior(complement(s), TOPOLOGIES.st)),
    boundary(s, TOPOLOGIES.st),
  );
  assert.equal(format(parts), '(-∞, +∞)');
});

test('Lm. 4: три части попарно не пересекаются', () => {
  const s = exampleEight();
  const inside = interior(s, TOPOLOGIES.st);
  const outside = interior(complement(s), TOPOLOGIES.st);
  const edge = boundary(s, TOPOLOGIES.st);
  assert.equal(format(intersect(inside, outside)), '∅');
  assert.equal(format(intersect(inside, edge)), '∅');
  assert.equal(format(intersect(outside, edge)), '∅');
});

test('Lm. 5: Cl(S) = S ∪ ∂S', () => {
  const s = exampleEight();
  assert.ok(equals(closure(s, TOPOLOGIES.st), union(s, boundary(s, TOPOLOGIES.st))));
});

test('Ex. 10: S = [2,5) в топологии стрелки', () => {
  const s = set(interval(2, 5, true, false));
  assert.equal(format(interior(s, TOPOLOGIES.arrow)), '∅');
  assert.equal(format(interior(complement(s, ARROW_SPACE), TOPOLOGIES.arrow)), '(5, +∞)');
  assert.equal(format(boundary(s, TOPOLOGIES.arrow)), '[0, 5]');
  assert.equal(format(closure(s, TOPOLOGIES.arrow)), '[0, 5]');
});

test('Задача 9b: [0,5) не открыто в топологии стрелки, Cl({1}) = [0,1]', () => {
  assert.equal(format(interior(set(interval(0, 5, true, false)), TOPOLOGIES.arrow)), '∅');
  assert.equal(format(closure(set(point(1)), TOPOLOGIES.arrow)), '[0, 1]');
});

test('Задача 17*: крайние случаи топологии стрелки', () => {
  assert.equal(format(interior(set(), TOPOLOGIES.arrow)), '∅');
  assert.equal(format(closure(set(), TOPOLOGIES.arrow)), '∅');
  assert.equal(format(interior(ARROW_SPACE, TOPOLOGIES.arrow)), '[0, +∞)');
  assert.equal(format(closure(ARROW_SPACE, TOPOLOGIES.arrow)), '[0, +∞)');
  assert.equal(format(boundary(ARROW_SPACE, TOPOLOGIES.arrow)), '∅');
});

test('Ex. 6: подпространство [0,1) в топологии стрелки не имеет внутренности', () => {
  assert.equal(format(interior(set(interval(0.5, 1, false, false)), TOPOLOGIES.arrow)), '∅');
});

test('Задача 9a: топология конечных дополнений', () => {
  const finite = set(point(1), point(2), point(3));
  assert.equal(format(closure(finite, TOPOLOGIES.cofinite)), '{1} ∪ {2} ∪ {3}');
  assert.equal(format(interior(finite, TOPOLOGIES.cofinite)), '∅');
  assert.equal(format(interior(set(interval(0, 1, false, false)), TOPOLOGIES.cofinite)), '∅');
  assert.equal(format(closure(set(interval(0, 1, true, true)), TOPOLOGIES.cofinite)), '(-∞, +∞)');
  assert.equal(format(boundary(set(interval(0, 1, true, true)), TOPOLOGIES.cofinite)), '(-∞, +∞)');
});

test('τ_CF: дополнение конечного множества открыто', () => {
  const cofiniteOpen = complement(set(point(1), point(2)));
  assert.ok(equals(interior(cofiniteOpen, TOPOLOGIES.cofinite), cofiniteOpen));
});

test('classifyPoint различает внутреннюю, граничную и внешнюю точки', () => {
  const s = exampleEight();
  assert.equal(classifyPoint(s, 3, TOPOLOGIES.st), 'interior');
  assert.equal(classifyPoint(s, 2, TOPOLOGIES.st), 'boundary');
  assert.equal(classifyPoint(s, 5, TOPOLOGIES.st), 'boundary');
  assert.equal(classifyPoint(s, 7, TOPOLOGIES.st), 'boundary');
  assert.equal(classifyPoint(s, 6, TOPOLOGIES.st), 'exterior');
});
