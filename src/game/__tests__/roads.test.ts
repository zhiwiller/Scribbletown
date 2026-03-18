import { describe, it, expect } from 'vitest';
import { roadsCross, roadsOverlap, getRoadSides, getMaxRotations, getLegalRotations, getNextLegalRotation } from '../roads';
import { Road } from '../types';

function road(type: Road['type'], rotation: number): Road {
  return { type, rotation };
}

describe('roadsCross', () => {
  it('two straights through centre always cross', () => {
    // straight(0) = sides 0↔3, straight(1) = sides 1↔4
    expect(roadsCross(road('straight', 0), road('straight', 1))).toBe(true);
    expect(roadsCross(road('straight', 0), road('straight', 2))).toBe(true);
    expect(roadsCross(road('straight', 1), road('straight', 2))).toBe(true);
  });

  it('roads sharing an endpoint do NOT cross (they meet at edge)', () => {
    // straight(0) = 0↔3, slight_turn(2) = 2↔4 — share no side → may cross
    // straight(0) = 0↔3, sharp_turn(0) = 0↔1 — share side 0
    expect(roadsCross(road('straight', 0), road('sharp_turn', 0))).toBe(false);
    expect(roadsCross(road('straight', 0), road('slight_turn', 1))).toBe(false);
    // slight(1) = 1↔3, shares side 3 with straight(0) = 0↔3
  });

  it('non-interleaving roads do NOT cross', () => {
    // sharp(0) = 0↔1, sharp(3) = 3↔4 — both on separate halves
    expect(roadsCross(road('sharp_turn', 0), road('sharp_turn', 3))).toBe(false);
    // sharp(0) = 0↔1, sharp(2) = 2↔3 — same half, no interleave
    expect(roadsCross(road('sharp_turn', 0), road('sharp_turn', 2))).toBe(false);
  });

  it('interleaving slight turns DO cross', () => {
    // slight(0) = 0↔2, slight(1) = 1↔3 — endpoints 0,1,2,3 interleave
    expect(roadsCross(road('slight_turn', 0), road('slight_turn', 1))).toBe(true);
  });

  it('straight and non-adjacent curve cross when interleaved', () => {
    // straight(0) = 0↔3, slight(2) = 2↔4 — 0,2,3,4 interleave
    expect(roadsCross(road('straight', 0), road('slight_turn', 2))).toBe(true);
  });

  it('straight and curve on same side do NOT cross', () => {
    // straight(0) = 0↔3, sharp(1) = 1↔2 — both between 0 and 3
    expect(roadsCross(road('straight', 0), road('sharp_turn', 1))).toBe(false);
    // straight(0) = 0↔3, sharp(4) = 4↔5 — both outside 0-3
    expect(roadsCross(road('straight', 0), road('sharp_turn', 4))).toBe(false);
  });
});

describe('roadsOverlap', () => {
  it('identical roads overlap', () => {
    expect(roadsOverlap(road('straight', 0), road('straight', 0))).toBe(true);
    expect(roadsOverlap(road('sharp_turn', 2), road('sharp_turn', 2))).toBe(true);
  });

  it('different roads do not overlap', () => {
    expect(roadsOverlap(road('straight', 0), road('straight', 1))).toBe(false);
    expect(roadsOverlap(road('sharp_turn', 0), road('slight_turn', 0))).toBe(false);
  });
});

describe('getRoadSides', () => {
  it('straight connects opposite sides', () => {
    expect(getRoadSides(road('straight', 0))).toEqual([0, 3]);
    expect(getRoadSides(road('straight', 1))).toEqual([1, 4]);
    expect(getRoadSides(road('straight', 2))).toEqual([2, 5]);
  });

  it('sharp_turn connects adjacent sides', () => {
    expect(getRoadSides(road('sharp_turn', 0))).toEqual([0, 1]);
    expect(getRoadSides(road('sharp_turn', 5))).toEqual([5, 0]);
  });

  it('slight_turn connects sides with one gap', () => {
    expect(getRoadSides(road('slight_turn', 0))).toEqual([0, 2]);
    expect(getRoadSides(road('slight_turn', 4))).toEqual([4, 0]);
  });
});

describe('getMaxRotations', () => {
  it('straight has 3 distinct rotations', () => {
    expect(getMaxRotations('straight')).toBe(3);
  });

  it('turns have 6 distinct rotations', () => {
    expect(getMaxRotations('sharp_turn')).toBe(6);
    expect(getMaxRotations('slight_turn')).toBe(6);
  });
});

describe('getLegalRotations', () => {
  it('all rotations legal when no existing road', () => {
    expect(getLegalRotations('straight', null)).toEqual([0, 1, 2]);
    expect(getLegalRotations('sharp_turn', null)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('excludes overlapping and crossing rotations for straight vs straight', () => {
    // existing straight(0) = 0↔3; straight(0) overlaps, straight(1) & straight(2) cross
    const legal = getLegalRotations('straight', road('straight', 0));
    expect(legal).toEqual([]); // no legal straight on top of another straight
  });

  it('excludes overlapping rotation for sharp_turn vs same sharp_turn', () => {
    // existing sharp(0) = 0↔1; sharp(0) overlaps, others may or may not cross
    const legal = getLegalRotations('sharp_turn', road('sharp_turn', 0));
    expect(legal).not.toContain(0);
    expect(legal.length).toBeGreaterThan(0);
  });

  it('sharp turns on opposite sides are legal', () => {
    // sharp(0) = 0↔1, sharp(3) = 3↔4 — no overlap, no cross
    const legal = getLegalRotations('sharp_turn', road('sharp_turn', 0));
    expect(legal).toContain(3);
  });
});

describe('getNextLegalRotation', () => {
  it('cycles through legal rotations only', () => {
    const existing = road('sharp_turn', 0); // sides 0↔1
    const legal = getLegalRotations('sharp_turn', existing);
    // Starting from first legal, next should be second legal
    const first = legal[0];
    const next = getNextLegalRotation('sharp_turn', existing, first);
    expect(next).toBe(legal[1 % legal.length]);
  });

  it('wraps around to first legal rotation', () => {
    const existing = road('sharp_turn', 0);
    const legal = getLegalRotations('sharp_turn', existing);
    const last = legal[legal.length - 1];
    const next = getNextLegalRotation('sharp_turn', existing, last);
    expect(next).toBe(legal[0]);
  });

  it('returns all rotations when no existing road', () => {
    const next = getNextLegalRotation('straight', null, 0);
    expect(next).toBe(1);
  });

  it('returns -1 when no legal rotations exist', () => {
    // straight vs straight: all rotations illegal
    const next = getNextLegalRotation('straight', road('straight', 0), 0);
    expect(next).toBe(-1);
  });
});
