import { describe, it, expect } from 'vitest';
import {
  findReachableByRoad,
  computeHexScore,
  updateAllScores,
  checkGameOver,
  getTotalScore,
  computeRoadBonus,
  HIGHWAY_EXITS,
} from '../scoring';
import { createInitialState } from '../setup';
import { GameState, HexState, BuildingType, Road } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyHex(col: number, row: number): HexState {
  return {
    coord: { col, row },
    building: null,
    specialBuilding: null,
    roads: [],
    scoringCircleFilled: false,
    junkPile: false,
    score: 0,
  };
}

function withBuilding(hex: HexState, building: BuildingType): HexState {
  return { ...hex, building };
}

function withRoad(
  hex: HexState,
  type: 'straight' | 'sharp_turn' | 'slight_turn',
  rotation: number,
): HexState {
  return { ...hex, roads: [...hex.roads, { type, rotation }] };
}

function withJunk(hex: HexState): HexState {
  return { ...hex, junkPile: true };
}

/** Build a GameState from a sparse hex array (fills missing hexes as empty). */
function stateWithHexes(hexes: HexState[]): GameState {
  const base = createInitialState();
  const hexMap = new Map(hexes.map((h) => [`${h.coord.col},${h.coord.row}`, h]));
  return {
    ...base,
    hexes: base.hexes.map((h) => {
      const key = `${h.coord.col},${h.coord.row}`;
      return hexMap.get(key) ?? h;
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeHexScore', () => {
  it('park scores 1', () => {
    const hex = withBuilding(emptyHex(0, 0), 'park');
    const state = stateWithHexes([hex]);
    expect(computeHexScore(state, hex)).toBe(1);
  });

  it('junk pile scores 0', () => {
    const hex = withJunk(emptyHex(0, 0));
    const state = stateWithHexes([hex]);
    expect(computeHexScore(state, hex)).toBe(0);
  });

  it('empty hex scores 0', () => {
    const hex = emptyHex(0, 0);
    const state = stateWithHexes([hex]);
    expect(computeHexScore(state, hex)).toBe(0);
  });

  it('road-only hex scores 0', () => {
    const hex = withRoad(emptyHex(0, 0), 'straight', 0);
    const state = stateWithHexes([hex]);
    expect(computeHexScore(state, hex)).toBe(0);
  });

  it('neighborhood scores 1 per adjacent park', () => {
    // Neighborhood at (2,2), Park at (2,1) which is directly N (side 4)
    const hood = withBuilding(emptyHex(2, 2), 'neighborhood');
    const park = withBuilding(emptyHex(2, 1), 'park');
    const state = stateWithHexes([hood, park]);
    expect(computeHexScore(state, hood)).toBe(1);
  });

  it('neighborhood scores 0 with no adjacent parks', () => {
    const hood = withBuilding(emptyHex(2, 2), 'neighborhood');
    const state = stateWithHexes([hood]);
    expect(computeHexScore(state, hood)).toBe(0);
  });
});

describe('findReachableByRoad', () => {
  it('returns empty when no roads connect source to target', () => {
    // Business at (0,0), Neighborhood at (0,1), no roads between them
    const biz = withBuilding(emptyHex(0, 0), 'business');
    const hood = withBuilding(emptyHex(0, 1), 'neighborhood');
    const state = stateWithHexes([biz, hood]);
    expect(findReachableByRoad(state, biz.coord, 'neighborhood')).toEqual([]);
  });

  it('finds target via single road hex', () => {
    // Business at (2,0), road hex at (2,1) with straight(0) connecting sides 0↔3,
    // but we need a road connecting N (side 4) to S (side 1) — that's straight rotation
    // with sides at 90° and 270° → side 1 (S) and side 4 (N).
    // Actually straight rotation maps: straight(0) = 0↔3, straight(1) = 1↔4, straight(2) = 2↔5
    // We need sides 4↔1 = straight(1)
    // Business at (2,0), road at (2,1) connecting N↔S (side 4↔1), Neighborhood at (2,2)
    const biz = withBuilding(emptyHex(2, 0), 'business');
    const roadHex = withRoad(emptyHex(2, 1), 'straight', 1); // sides 1↔4
    const hood = withBuilding(emptyHex(2, 2), 'neighborhood');
    const state = stateWithHexes([biz, roadHex, hood]);

    const reached = findReachableByRoad(state, biz.coord, 'neighborhood');
    expect(reached).toHaveLength(1);
    expect(reached[0]).toEqual({ col: 2, row: 2 });
  });

  it('finds target via chain of road hexes', () => {
    // Business (2,0) → road (2,1) straight(1) [4↔1] → road (2,2) straight(1) [4↔1] → Neighborhood (2,3)
    const biz = withBuilding(emptyHex(2, 0), 'business');
    const road1 = withRoad(emptyHex(2, 1), 'straight', 1);
    const road2 = withRoad(emptyHex(2, 2), 'straight', 1);
    const hood = withBuilding(emptyHex(2, 3), 'neighborhood');
    const state = stateWithHexes([biz, road1, road2, hood]);

    const reached = findReachableByRoad(state, biz.coord, 'neighborhood');
    expect(reached).toHaveLength(1);
    expect(reached[0]).toEqual({ col: 2, row: 3 });
  });

  it('does not count same target twice', () => {
    // Two road paths leading to the same neighborhood
    const biz = withBuilding(emptyHex(2, 0), 'business');
    const road1 = withRoad(emptyHex(2, 1), 'straight', 1);
    const hood = withBuilding(emptyHex(2, 2), 'neighborhood');
    const state = stateWithHexes([biz, road1, hood]);

    const reached = findReachableByRoad(state, biz.coord, 'neighborhood');
    expect(reached).toHaveLength(1);
  });

  it('traverses through hex with two roads', () => {
    // Road hex at (2,1) has two roads: straight(1) [4↔1] and straight(0) [0↔3]
    // Business at (2,0) enters from side 4, exits side 1 → reaches (2,2)
    // Separately: if something enters from side 0 or 3 it would use the other road
    const biz = withBuilding(emptyHex(2, 0), 'business');
    let roadHex = withRoad(emptyHex(2, 1), 'straight', 1); // 4↔1
    roadHex = withRoad(roadHex, 'straight', 0); // 0↔3
    const hood = withBuilding(emptyHex(2, 2), 'neighborhood');
    const state = stateWithHexes([biz, roadHex, hood]);

    const reached = findReachableByRoad(state, biz.coord, 'neighborhood');
    expect(reached).toHaveLength(1);
  });
});

describe('Business scoring via road reachability', () => {
  it('business scores 2 per neighborhood reachable by road', () => {
    const biz = withBuilding(emptyHex(2, 0), 'business');
    const roadHex = withRoad(emptyHex(2, 1), 'straight', 1);
    const hood = withBuilding(emptyHex(2, 2), 'neighborhood');
    const state = stateWithHexes([biz, roadHex, hood]);
    expect(computeHexScore(state, biz)).toBe(2);
  });

  it('business scores 0 with no road-reachable neighborhoods', () => {
    const biz = withBuilding(emptyHex(2, 0), 'business');
    const state = stateWithHexes([biz]);
    expect(computeHexScore(state, biz)).toBe(0);
  });
});

describe('Factory scoring via road reachability', () => {
  it('factory scores 4 per farm reachable by road', () => {
    const fac = withBuilding(emptyHex(2, 0), 'factory');
    const roadHex = withRoad(emptyHex(2, 1), 'straight', 1);
    const farm = withBuilding(emptyHex(2, 2), 'farm');
    const state = stateWithHexes([fac, roadHex, farm]);
    expect(computeHexScore(state, fac)).toBe(4);
  });
});

describe('Farm scoring via road reachability', () => {
  it('farm scores 2 per business reachable by road', () => {
    const farm = withBuilding(emptyHex(2, 0), 'farm');
    const roadHex = withRoad(emptyHex(2, 1), 'straight', 1);
    const biz = withBuilding(emptyHex(2, 2), 'business');
    const state = stateWithHexes([farm, roadHex, biz]);
    expect(computeHexScore(state, farm)).toBe(2);
  });
});

describe('updateAllScores', () => {
  it('updates score field on all hexes', () => {
    const park = withBuilding(emptyHex(2, 1), 'park');
    const hood = withBuilding(emptyHex(2, 2), 'neighborhood');
    const state = stateWithHexes([park, hood]);
    const scored = updateAllScores(state);

    const parkHex = scored.find(
      (h) => h.coord.col === 2 && h.coord.row === 1,
    )!;
    const hoodHex = scored.find(
      (h) => h.coord.col === 2 && h.coord.row === 2,
    )!;
    expect(parkHex.score).toBe(1);
    // hood at (2,2) is adjacent to park at (2,1) via side 4 (N)
    expect(hoodHex.score).toBe(1);
  });
});

describe('checkGameOver', () => {
  it('returns false when empty hexes exist', () => {
    const state = createInitialState();
    expect(checkGameOver(state.hexes)).toBe(false);
  });

  it('returns true when no empty hexes remain', () => {
    const state = createInitialState();
    const fullHexes = state.hexes.map((h) => ({
      ...h,
      building: 'park' as const,
    }));
    expect(checkGameOver(fullHexes)).toBe(true);
  });

  it('hex with only roads is not empty', () => {
    const state = createInitialState();
    const hexes = state.hexes.map((h) =>
      withRoad(h, 'straight', 0),
    );
    expect(checkGameOver(hexes)).toBe(true);
  });

  it('hex with junk pile is not empty', () => {
    const state = createInitialState();
    const hexes = state.hexes.map((h) => withJunk(h));
    expect(checkGameOver(hexes)).toBe(true);
  });
});

describe('getTotalScore', () => {
  it('sums all hex scores', () => {
    const hexes = [
      { ...emptyHex(0, 0), score: 3 },
      { ...emptyHex(0, 1), score: 5 },
      { ...emptyHex(0, 2), score: 0 },
    ];
    expect(getTotalScore(hexes)).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// Road bonus
// ---------------------------------------------------------------------------

function stateWithRoads(overrides: HexState[]): GameState {
  const base = createInitialState();
  const hexMap = new Map(overrides.map((h) => [`${h.coord.col},${h.coord.row}`, h]));
  return {
    ...base,
    hexes: base.hexes.map((h) => {
      const key = `${h.coord.col},${h.coord.row}`;
      return hexMap.get(key) ?? h;
    }),
  };
}

function hexWithRoads(col: number, row: number, roads: Road[]): HexState {
  return { ...emptyHex(col, row), roads };
}

describe('computeRoadBonus', () => {
  it('returns 0 when no roads exist', () => {
    const state = createInitialState();
    expect(computeRoadBonus(state)).toBe(0);
  });

  it('returns 0 when roads exist but do not connect two exits', () => {
    // Road in (0,2) touching side 2 (SW exit) but no route to another exit
    const state = stateWithRoads([
      hexWithRoads(0, 2, [{ type: 'straight', rotation: 2 }]), // sides [2,5]
    ]);
    expect(computeRoadBonus(state)).toBe(0);
  });

  it('returns hex count for shortest route connecting two exits', () => {
    // Route from SW exit (0,2) side 2 to N exit (3,0) side 4:
    // (0,2) sides [2,5] → (1,2) sides [2,4] → (1,1) sides [5,1]
    // → (2,1) sides [2,4] → (2,0) sides [5,1] → (3,0) sides [2,4]
    const state = stateWithRoads([
      hexWithRoads(0, 2, [{ type: 'straight', rotation: 2 }]),    // [2, 5]
      hexWithRoads(1, 2, [{ type: 'slight_turn', rotation: 2 }]), // [2, 4]
      hexWithRoads(1, 1, [{ type: 'slight_turn', rotation: 5 }]), // [5, 1]
      hexWithRoads(2, 1, [{ type: 'slight_turn', rotation: 2 }]), // [2, 4]
      hexWithRoads(2, 0, [{ type: 'slight_turn', rotation: 5 }]), // [5, 1]
      hexWithRoads(3, 0, [{ type: 'slight_turn', rotation: 2 }]), // [2, 4]
    ]);
    expect(computeRoadBonus(state)).toBe(6);
  });

  it('picks the shorter of two possible routes', () => {
    // Same route as above (6 hexes) plus add a longer route to the SE exit.
    // The bonus should still be 6 (the shortest).
    const state = stateWithRoads([
      hexWithRoads(0, 2, [{ type: 'straight', rotation: 2 }]),    // [2, 5]
      hexWithRoads(1, 2, [{ type: 'slight_turn', rotation: 2 }]), // [2, 4]
      hexWithRoads(1, 1, [{ type: 'slight_turn', rotation: 5 }]), // [5, 1]
      hexWithRoads(2, 1, [{ type: 'slight_turn', rotation: 2 }]), // [2, 4]
      hexWithRoads(2, 0, [{ type: 'slight_turn', rotation: 5 }]), // [5, 1]
      hexWithRoads(3, 0, [{ type: 'slight_turn', rotation: 2 }]), // [2, 4]
    ]);
    expect(computeRoadBonus(state)).toBe(6);
  });

  it('chains through two roads sharing a common side within a hex', () => {
    // Reproduces the reported bug: factory at (3,3), farms at (1,0) and (3,1).
    // Hex (2,2) has sharp_turn[0,1] + straight[1,4]. Entering from side 0
    // should chain: 0→1 (sharp_turn) then 1→4 (straight), reaching (2,1).
    // From (2,1) slight_turn[1,3] reaches farm at (1,0) via side 3,
    // and slight_turn[5,1] reaches farm at (3,1) via side 5.
    const state = stateWithRoads([
      { ...emptyHex(1, 0), building: 'farm' as BuildingType, roads: [] },
      { ...emptyHex(3, 1), building: 'farm' as BuildingType, roads: [] },
      { ...emptyHex(3, 3), building: 'factory' as BuildingType, roads: [] },
      hexWithRoads(2, 2, [
        { type: 'sharp_turn', rotation: 0 },  // sides [0, 1]
        { type: 'straight', rotation: 1 },     // sides [1, 4]
      ]),
      hexWithRoads(2, 1, [
        { type: 'slight_turn', rotation: 1 },  // sides [1, 3]
        { type: 'slight_turn', rotation: 5 },  // sides [5, 1]
      ]),
    ]);
    // Factory at (3,3) → side 3 → (2,2) entry 0 → chain to exit 4 → (2,1) entry 1
    // → exit 3 → (1,0) farm  AND  exit 5 → (3,1) farm
    const score = computeHexScore(state, state.hexes.find(
      h => h.coord.col === 3 && h.coord.row === 3
    )!);
    expect(score).toBe(8); // 2 farms × 4 points
  });

  it('highway exits are defined correctly', () => {
    expect(HIGHWAY_EXITS).toHaveLength(3);
    expect(HIGHWAY_EXITS[0]).toEqual({ coord: { col: 0, row: 2 }, side: 2 });
    expect(HIGHWAY_EXITS[1]).toEqual({ coord: { col: 3, row: 0 }, side: 4 });
    expect(HIGHWAY_EXITS[2]).toEqual({ coord: { col: 5, row: 2 }, side: 0 });
  });
});
