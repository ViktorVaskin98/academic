import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isTopology, allTopologies, describeTopology, describeSubset,
  interiorIn, closureIn, boundaryIn, isStronger, blockTopology,
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
