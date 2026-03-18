import { describe, it, expect } from 'vitest';
import {
  getAllHexCoords,
  isValidHex,
  getNeighbors,
  hexKey,
  COLUMN_SIZES,
} from '../board';

describe('Board', () => {
  it('generates 24 hex coordinates', () => {
    const coords = getAllHexCoords();
    expect(coords).toHaveLength(24);
  });

  it('validates hex coordinates correctly', () => {
    expect(isValidHex({ col: 0, row: 0 })).toBe(true);
    expect(isValidHex({ col: 0, row: 2 })).toBe(true);
    expect(isValidHex({ col: 0, row: 3 })).toBe(false);
    expect(isValidHex({ col: 2, row: 4 })).toBe(true);
    expect(isValidHex({ col: 2, row: 5 })).toBe(false);
    expect(isValidHex({ col: -1, row: 0 })).toBe(false);
    expect(isValidHex({ col: 6, row: 0 })).toBe(false);
  });

  it('produces unique hex keys', () => {
    const coords = getAllHexCoords();
    const keys = coords.map(hexKey);
    expect(new Set(keys).size).toBe(24);
  });

  it('returns valid neighbors only', () => {
    const coords = getAllHexCoords();
    for (const coord of coords) {
      const neighbors = getNeighbors(coord);
      for (const n of neighbors) {
        expect(isValidHex(n)).toBe(true);
      }
    }
  });

  it('top-left corner (0,0) has 3 neighbors', () => {
    const neighbors = getNeighbors({ col: 0, row: 0 });
    expect(neighbors).toHaveLength(3);
  });

  it('center hex (2,2) has 6 neighbors', () => {
    const neighbors = getNeighbors({ col: 2, row: 2 });
    expect(neighbors).toHaveLength(6);
  });

  it('adjacency is symmetric', () => {
    const coords = getAllHexCoords();
    for (const a of coords) {
      const neighborsOfA = getNeighbors(a);
      for (const b of neighborsOfA) {
        const neighborsOfB = getNeighbors(b);
        const bSeesA = neighborsOfB.some(
          (n) => n.col === a.col && n.row === a.row,
        );
        expect(bSeesA).toBe(true);
      }
    }
  });

  it('each column has the expected size', () => {
    expect(COLUMN_SIZES).toEqual([3, 4, 5, 5, 4, 3]);
  });
});
