import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isTopology, allTopologies, describeTopology, describeSubset,
  interiorIn, closureIn, boundaryIn, isStronger, blockTopology,
  generatedByUnions, checkBase, isBaseOf, finiteIntersections,
  separationFailure,
} from '../assets/finite-topology.js';

test('Задача 1: на множестве из двух точек ровно 4 топологии', () => {
  const found = allTopologies(2);
  assert.equal(found.length, 4);
  const shapes = found.map((family) => describeTopology(family, ['a', 'b'])).sort();
  assert.deepEqual(shapes, [
    '{∅, {a, b}}',
    '{∅, {a}, {a, b}}',
    '{∅, {a}, {b}, {a, b}}',
    '{∅, {b}, {a, b}}',
  ].sort());
});

test('Задача 18c: на множестве из трёх точек 29 топологий', () => {
  assert.equal(allTopologies(3).length, 29);
});

test('isTopology отвергает семейство без пустого множества', () => {
  assert.equal(isTopology([0b11], 2), false);
});

test('isTopology отвергает семейство без всего множества', () => {
  assert.equal(isTopology([0b00, 0b01], 2), false);
});

test('isTopology отвергает семейство, не замкнутое по объединению', () => {
  assert.equal(isTopology([0b000, 0b001, 0b010, 0b111], 3), false);
});

test('isTopology отвергает семейство, не замкнутое по пересечению', () => {
  assert.equal(isTopology([0b000, 0b011, 0b110, 0b111], 3), false);
});

test('Ex. 2: связное двоеточие является топологией', () => {
  assert.equal(isTopology([0b00, 0b10, 0b11], 2), true);
});

test('Ex. 1: дискретная и антидискретная топологии', () => {
  assert.equal(isTopology([0b000, 0b111], 3), true);
  assert.equal(isTopology([0, 1, 2, 3, 4, 5, 6, 7], 3), true);
});

const LABELS = ['a', 'b', 'c', 'd', 'e', 'f'];
const SUBSET_ABC = 0b000111;

test('Задача 12: Int и Cl через блоки неразличимых объектов', () => {
  const topology = blockTopology([['a', 'b'], ['c', 'd'], ['e', 'f']], LABELS);
  assert.equal(describeSubset(interiorIn(topology, SUBSET_ABC), LABELS), '{a, b}');
  assert.equal(describeSubset(closureIn(topology, SUBSET_ABC, 6), LABELS), '{a, b, c, d}');
  assert.equal(describeSubset(boundaryIn(topology, SUBSET_ABC, 6), LABELS), '{c, d}');
});

test('Задача 12d: разделение блока делает топологию сильнее', () => {
  const coarse = blockTopology([['a', 'b'], ['c', 'd'], ['e', 'f']], LABELS);
  const fine = blockTopology([['a', 'b'], ['c'], ['d'], ['e', 'f']], LABELS);
  assert.equal(isStronger(fine, coarse), true);
  assert.equal(isStronger(coarse, fine), false);
});

test('Задача 12d: после разделения блока Int и Cl подмножества {a,b,c} меняются', () => {
  const fine = blockTopology([['a', 'b'], ['c'], ['d'], ['e', 'f']], LABELS);
  assert.equal(describeSubset(interiorIn(fine, SUBSET_ABC), LABELS), '{a, b, c}');
  assert.equal(describeSubset(closureIn(fine, SUBSET_ABC, 6), LABELS), '{a, b, c}');
  assert.equal(describeSubset(boundaryIn(fine, SUBSET_ABC, 6), LABELS), '∅');
});

test('blockTopology порождает топологию', () => {
  const topology = blockTopology([['a', 'b'], ['c', 'd'], ['e', 'f']], LABELS);
  assert.equal(isTopology(topology, 6), true);
  assert.equal(topology.length, 8);
});

test('NB 2: дискретная сильнее всех, антидискретная слабее всех', () => {
  const all = allTopologies(3);
  const discrete = all.find((family) => family.length === 8);
  const antidiscrete = all.find((family) => family.length === 2);
  assert.ok(all.every((family) => isStronger(discrete, family)));
  assert.ok(all.every((family) => isStronger(family, antidiscrete)));
});

test('Задача 2: в топологии {∅,{0},{0,1}} множество {1} замкнуто', () => {
  const labels = ['0', '1'];
  const topology = [0b00, 0b01, 0b11];
  const subsetOne = 0b10;
  assert.equal(describeSubset(interiorIn(topology, subsetOne), labels), '∅');
  assert.equal(describeSubset(closureIn(topology, subsetOne, 2), labels), '{1}');
});

const ABC = ['a', 'b', 'c'];
const A = 0b001;
const B = 0b010;
const C = 0b100;
const ALL = 0b111;

test('generatedByUnions замыкает семейство по объединениям и добавляет пустое', () => {
  const generated = generatedByUnions([A, A | B, A | C], 3);
  assert.equal(describeTopology(generated, ABC), '{∅, {a}, {a, b}, {a, c}, {a, b, c}}');
});

test('NB 7: β = {∅, X, {a,b}, {a,c}} не база никакой топологии', () => {
  const verdict = checkBase([0, ALL, A | B, A | C], 3);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, 'intersection');
  assert.equal(describeSubset(verdict.point, ABC), '{a}');
  assert.equal(describeSubset(verdict.first & verdict.second, ABC), '{a}');
});

test('Th. 1.1: семейство, не покрывающее X, не база', () => {
  const verdict = checkBase([A, B], 3);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, 'cover');
  assert.equal(describeSubset(verdict.missing, ABC), '{c}');
});

test('Th. 1.1: добавление {a} чинит контрпример из NB 7', () => {
  const verdict = checkBase([A, A | B, A | C], 3);
  assert.equal(verdict.ok, true);
  assert.equal(isTopology(verdict.topology, 3), true);
});

test('Lm. 6: одноточечные множества — база дискретной топологии', () => {
  const discrete = allTopologies(3).find((family) => family.length === 8);
  assert.equal(isBaseOf([A, B, C], discrete, 3), true);
});

test('Lm. 6: база обязана лежать в топологии', () => {
  const sierpinski = [0, A, ALL];
  assert.equal(isBaseOf([A, B, ALL], sierpinski, 3), false);
});

test('Lm. 6: семейство из топологии, не порождающее её, не база', () => {
  const discrete = allTopologies(3).find((family) => family.length === 8);
  assert.equal(isBaseOf([A | B, ALL], discrete, 3), false);
});

test('блоки неразличимых объектов — база блочной топологии', () => {
  const labels = ['a', 'b', 'c', 'd', 'e', 'f'];
  const blocks = [['a', 'b'], ['c', 'd'], ['e', 'f']];
  const topology = blockTopology(blocks, labels);
  assert.equal(isBaseOf([0b000011, 0b001100, 0b110000], topology, 6), true);
});

test('Def. 14: конечные пересечения предбазы образуют базу', () => {
  const subbase = [A | B, A | C];
  const base = finiteIntersections(subbase);
  assert.deepEqual([...base].sort((x, y) => x - y), [A, A | B, A | C]);
  assert.equal(checkBase(base, 3).ok, true);
});

test('Ex. 6 лекции 2: связанное двоеточие не T₁', () => {
  const failure = separationFailure([0b00, 0b01, 0b11], 2, 'T1');
  assert.deepEqual(failure, { first: 1, second: 0 });
});

test('Def. 15: дискретная топология хаусдорфова', () => {
  assert.equal(separationFailure([0, 1, 2, 3], 2, 'T2'), null);
});

test('на конечном множестве T₁ равносильно дискретности', () => {
  const t1 = allTopologies(3).filter((family) => separationFailure(family, 3, 'T1') === null);
  assert.equal(t1.length, 1);
  assert.equal(t1[0].length, 8);
});

test('NB 4: на конечном множестве T₁ и T₂ совпадают', () => {
  for (const family of allTopologies(3)) {
    const t1 = separationFailure(family, 3, 'T1') === null;
    const t2 = separationFailure(family, 3, 'T2') === null;
    assert.equal(t1, t2);
  }
});

test('антидискретная топология не T₁', () => {
  assert.notEqual(separationFailure([0, 0b111], 3, 'T1'), null);
});
