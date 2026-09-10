const fullMask = (size) => (1 << size) - 1;

const universeOf = (family, size) => (size === undefined ? Math.max(...family) : fullMask(size));

export function isTopology(family, size) {
  const members = new Set(family);
  if (!members.has(0)) return false;
  if (!members.has(fullMask(size))) return false;
  for (const a of members) {
    for (const b of members) {
      if (!members.has(a | b)) return false;
      if (!members.has(a & b)) return false;
    }
  }
  return true;
}

export function allTopologies(size) {
  const universe = fullMask(size);
  const middle = [];
  for (let mask = 1; mask < universe; mask += 1) middle.push(mask);
  const result = [];
  for (let choice = 0; choice < (1 << middle.length); choice += 1) {
    const family = [0, universe];
    for (let bit = 0; bit < middle.length; bit += 1) {
      if (choice & (1 << bit)) family.push(middle[bit]);
    }
    if (isTopology(family, size)) result.push(family.sort((x, y) => x - y));
  }
  return result;
}

const maskToLabels = (mask, labels) => labels.filter((_, index) => mask & (1 << index));

export const describeSubset = (mask, labels) =>
  (mask === 0 ? '∅' : `{${maskToLabels(mask, labels).join(', ')}}`);

export const describeTopology = (family, labels) =>
  `{${[...family].sort((x, y) => x - y).map((mask) => describeSubset(mask, labels)).join(', ')}}`;

export const interiorIn = (family, subset) => family
  .filter((open) => (open & subset) === open)
  .reduce((accumulated, open) => accumulated | open, 0);

export function closureIn(family, subset, size) {
  const universe = universeOf(family, size);
  const outside = universe & ~subset;
  return universe & ~interiorIn(family, outside);
}

export function boundaryIn(family, subset, size) {
  const universe = universeOf(family, size);
  return closureIn(family, subset, size) & ~interiorIn(family, subset) & universe;
}

export const isStronger = (strong, weak) => weak.every((open) => strong.includes(open));

export function blockTopology(blocks, labels) {
  const indexOf = new Map(labels.map((label, index) => [label, index]));
  const blockMasks = blocks.map((block) => block
    .reduce((mask, label) => mask | (1 << indexOf.get(label)), 0));
  const family = new Set([0]);
  for (let choice = 0; choice < (1 << blockMasks.length); choice += 1) {
    let mask = 0;
    for (let bit = 0; bit < blockMasks.length; bit += 1) {
      if (choice & (1 << bit)) mask |= blockMasks[bit];
    }
    family.add(mask);
  }
  return [...family].sort((x, y) => x - y);
}

export const coveringEdges = (families) => {
  const edges = [];
  for (const strong of families) {
    for (const weak of families) {
      if (strong === weak || !isStronger(strong, weak)) continue;
      const hasIntermediate = families.some((middle) => middle !== strong
        && middle !== weak
        && isStronger(strong, middle)
        && isStronger(middle, weak));
      if (!hasIntermediate) edges.push([strong, weak]);
    }
  }
  return edges;
};
