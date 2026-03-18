import { describe, it, expect } from 'vitest';
import {
  isCardEligible,
  hasEligibleSpecialBuilding,
  computeSpecialBuildingScore,
  getSpecialBuildingDef,
  drawSpecialBuildingCards,
  SPECIAL_BUILDING_POOL,
} from '../specialBuildings';
import { createInitialState } from '../setup';
import { applyAction } from '../actions';
import { GameState, HexState, SpecialBuildingCard } from '../types';

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

/** Build a GameState with specific hexes overridden and bakery card guaranteed. */
function stateWithHexes(overrides: HexState[]): GameState {
  const base = createInitialState();
  const hexMap = new Map(overrides.map((h) => [`${h.coord.col},${h.coord.row}`, h]));
  return {
    ...base,
    specialBuildingCards: [{ defId: 'bakery', built: false }],
    hexes: base.hexes.map((h) => {
      const key = `${h.coord.col},${h.coord.row}`;
      return hexMap.get(key) ?? h;
    }),
  };
}

// ---------------------------------------------------------------------------
// Card pool & drawing
// ---------------------------------------------------------------------------

describe('Card pool', () => {
  it('Bakery exists in pool', () => {
    const def = getSpecialBuildingDef('bakery');
    expect(def).toBeDefined();
    expect(def!.name).toBe('Bakery');
    expect(def!.requiredBuildings).toEqual(['farm', 'farm', 'business']);
  });

  it('drawSpecialBuildingCards draws up to pool size', () => {
    const cards = drawSpecialBuildingCards(6);
    expect(cards.length).toBe(Math.min(6, SPECIAL_BUILDING_POOL.length));
    expect(cards.every((c) => c.built === false)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Triangle adjacency / eligibility
// ---------------------------------------------------------------------------

describe('isCardEligible', () => {
  const bakeryCard: SpecialBuildingCard = { defId: 'bakery', built: false };

  it('returns false when no buildings on board', () => {
    const state = createInitialState();
    expect(isCardEligible(state, bakeryCard)).toBe(false);
  });

  it('returns false when buildings present but not in a triangle', () => {
    // Farm at (0,0), Farm at (0,1), Business at (0,2) — these are in a line (same col)
    // Same-column neighbors share side 1/4 (N/S). (0,0)-(0,1) adjacent, (0,1)-(0,2) adjacent
    // but (0,0) and (0,2) are NOT adjacent (they are 2 apart in the same column).
    const state = stateWithHexes([
      { ...emptyHex(0, 0), building: 'farm' },
      { ...emptyHex(0, 1), building: 'farm' },
      { ...emptyHex(0, 2), building: 'business' },
    ]);
    expect(isCardEligible(state, bakeryCard)).toBe(false);
  });

  it('returns true when a valid triangle exists', () => {
    // Farm at (1,0), Farm at (2,0), Business at (2,1)
    // (1,0)-(2,0): adjacent (SE neighbor)
    // (1,0)-(2,1): adjacent (SE neighbor via shift)
    // (2,0)-(2,1): adjacent (same column)
    // All three mutually adjacent = triangle.
    const state = stateWithHexes([
      { ...emptyHex(1, 0), building: 'farm' },
      { ...emptyHex(2, 0), building: 'farm' },
      { ...emptyHex(2, 1), building: 'business' },
    ]);
    expect(isCardEligible(state, bakeryCard)).toBe(true);
  });

  it('returns false for built card even if triangle exists', () => {
    const builtCard: SpecialBuildingCard = { defId: 'bakery', built: true };
    const state = stateWithHexes([
      { ...emptyHex(1, 0), building: 'farm' },
      { ...emptyHex(2, 0), building: 'farm' },
      { ...emptyHex(2, 1), building: 'business' },
    ]);
    expect(isCardEligible(state, builtCard)).toBe(false);
  });

  it('order of buildings does not matter', () => {
    // Business, Farm, Farm in different positions of the triangle
    const state = stateWithHexes([
      { ...emptyHex(1, 0), building: 'business' },
      { ...emptyHex(2, 0), building: 'farm' },
      { ...emptyHex(2, 1), building: 'farm' },
    ]);
    expect(isCardEligible(state, bakeryCard)).toBe(true);
  });
});

describe('hasEligibleSpecialBuilding', () => {
  it('returns false when no triangle satisfied', () => {
    const state = createInitialState();
    expect(hasEligibleSpecialBuilding(state)).toBe(false);
  });

  it('returns true when at least one card is eligible', () => {
    const state = stateWithHexes([
      { ...emptyHex(1, 0), building: 'farm' },
      { ...emptyHex(2, 0), building: 'farm' },
      { ...emptyHex(2, 1), building: 'business' },
    ]);
    expect(hasEligibleSpecialBuilding(state)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

describe('computeSpecialBuildingScore', () => {
  // Neighbors of (2,2): (2,1), (2,3), (1,1), (1,2), (3,2), (3,3)

  it('bakery scores 1 per wasteCount', () => {
    const hex: HexState = { ...emptyHex(0, 0), specialBuilding: 'bakery' };
    const state: GameState = { ...createInitialState(), wasteCount: 5 };
    expect(computeSpecialBuildingScore(state, hex)).toBe(5);
  });

  it('bakery scores 0 when no waste', () => {
    const hex: HexState = { ...emptyHex(0, 0), specialBuilding: 'bakery' };
    const state: GameState = { ...createInitialState(), wasteCount: 0 };
    expect(computeSpecialBuildingScore(state, hex)).toBe(0);
  });

  it('returns 0 for hex without special building', () => {
    const hex = emptyHex(0, 0);
    const state = createInitialState();
    expect(computeSpecialBuildingScore(state, hex)).toBe(0);
  });

  // --- Airport ---

  it('airport scores floor(roadHexes / 2)', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'airport' },
      { ...emptyHex(0, 0), roads: [{ type: 'straight', rotation: 0 }] },
      { ...emptyHex(0, 1), roads: [{ type: 'straight', rotation: 0 }] },
      { ...emptyHex(0, 2), roads: [{ type: 'straight', rotation: 0 }] },
      { ...emptyHex(1, 0), roads: [{ type: 'straight', rotation: 0 }] },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(2); // 4 road hexes → 2
  });

  it('airport rounds down odd road hex count', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'airport' },
      { ...emptyHex(0, 0), roads: [{ type: 'straight', rotation: 0 }] },
      { ...emptyHex(0, 1), roads: [{ type: 'straight', rotation: 0 }] },
      { ...emptyHex(0, 2), roads: [{ type: 'straight', rotation: 0 }] },
      { ...emptyHex(1, 0), roads: [{ type: 'straight', rotation: 0 }] },
      { ...emptyHex(1, 1), roads: [{ type: 'straight', rotation: 0 }] },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(2); // 5 road hexes → 2
  });

  it('airport scores 0 with no road hexes', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'airport' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(0);
  });

  // --- Playground ---

  it('playground scores 3 per adjacent neighborhood', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'playground' },
      { ...emptyHex(2, 1), building: 'neighborhood' },
      { ...emptyHex(1, 1), building: 'neighborhood' },
      { ...emptyHex(3, 2), building: 'park' }, // not neighborhood
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(6); // 2 × 3
  });

  // --- Fire Station ---

  it('fire_station scores 4 per adjacent business', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'fire_station' },
      { ...emptyHex(2, 1), building: 'business' },
      { ...emptyHex(2, 3), building: 'business' },
      { ...emptyHex(1, 2), building: 'business' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(12); // 3 × 4
  });

  // --- Scrapyard ---

  it('scrapyard scores 4 per adjacent factory', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'scrapyard' },
      { ...emptyHex(2, 1), building: 'factory' },
      { ...emptyHex(3, 3), building: 'factory' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(8); // 2 × 4
  });

  // --- Spa ---

  it('spa scores 3 per adjacent farm', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'spa' },
      { ...emptyHex(2, 1), building: 'farm' },
      { ...emptyHex(2, 3), building: 'farm' },
      { ...emptyHex(1, 1), building: 'farm' },
      { ...emptyHex(1, 2), building: 'farm' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(12); // 4 × 3
  });

  // --- Campground ---

  it('campground scores 2 per adjacent park', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'campground' },
      { ...emptyHex(2, 1), building: 'park' },
      { ...emptyHex(3, 2), building: 'park' },
      { ...emptyHex(3, 3), building: 'park' },
      { ...emptyHex(1, 1), building: 'neighborhood' }, // not park
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(6); // 3 × 2
  });

  // --- Demolition ---

  it('demolition scores 8 per adjacent junk pile', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'demolition' },
      { ...emptyHex(2, 1), junkPile: true },
      { ...emptyHex(1, 2), junkPile: true },
      { ...emptyHex(3, 2), building: 'park' }, // not junk
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(16); // 2 × 8
  });

  it('demolition scores 0 with no adjacent junk piles', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'demolition' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(0);
  });

  // --- Monument ---

  it('monument scores 3 per adjacent road hex', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'monument' },
      { ...emptyHex(2, 1), roads: [{ type: 'straight', rotation: 0 }] },
      { ...emptyHex(1, 1), roads: [{ type: 'sharp_turn', rotation: 2 }] },
      { ...emptyHex(3, 2), building: 'park' }, // no road
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(6); // 2 × 3
  });

  // --- Precinct ---

  it('precinct scores 4 per unique adjacent building type', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'precinct' },
      { ...emptyHex(2, 1), building: 'neighborhood' },
      { ...emptyHex(2, 3), building: 'neighborhood' }, // same type, counts as 1
      { ...emptyHex(1, 1), building: 'business' },
      { ...emptyHex(1, 2), building: 'factory' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(12); // 3 unique × 4
  });

  it('precinct counts special buildings as distinct types', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'precinct' },
      { ...emptyHex(2, 1), building: 'neighborhood' },
      { ...emptyHex(1, 1), specialBuilding: 'bakery' },
      { ...emptyHex(1, 2), specialBuilding: 'airport' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    // 3 unique: neighborhood, bakery, airport
    expect(computeSpecialBuildingScore(state, hex)).toBe(12);
  });

  it('precinct ignores junk piles and road-only hexes', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'precinct' },
      { ...emptyHex(2, 1), junkPile: true },
      { ...emptyHex(1, 1), roads: [{ type: 'straight', rotation: 0 }] },
      { ...emptyHex(1, 2), building: 'park' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    // Only 1 unique: park
    expect(computeSpecialBuildingScore(state, hex)).toBe(4);
  });

  // --- Church (global count with max) ---

  it('church scores 2 per neighborhood globally, max 8', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'church' },
      { ...emptyHex(0, 0), building: 'neighborhood' },
      { ...emptyHex(0, 1), building: 'neighborhood' },
      { ...emptyHex(0, 2), building: 'neighborhood' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(6); // 3 × 2
  });

  it('church caps at max 8 neighborhoods', () => {
    const overrides: HexState[] = [
      { ...emptyHex(2, 2), specialBuilding: 'church' },
    ];
    // Place 10 neighborhoods in various positions
    const positions = [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[1,3],[2,0],[2,1],[3,0]];
    for (const [c, r] of positions) {
      if (c === 2 && r === 2) continue;
      overrides.push({ ...emptyHex(c, r), building: 'neighborhood' });
    }
    const state = stateWithHexes(overrides);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(16); // min(10, 8) × 2
  });

  // --- Warehouse ---

  it('warehouse scores 3 per business globally, max 6', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'warehouse' },
      { ...emptyHex(0, 0), building: 'business' },
      { ...emptyHex(0, 1), building: 'business' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(6); // 2 × 3
  });

  // --- University ---

  it('university scores 3 per factory globally, max 6', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'university' },
      { ...emptyHex(0, 0), building: 'factory' },
      { ...emptyHex(0, 1), building: 'factory' },
      { ...emptyHex(0, 2), building: 'factory' },
      { ...emptyHex(1, 0), building: 'factory' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(12); // 4 × 3
  });

  // --- Wind Turbine ---

  it('wind_turbine scores 3 per farm globally, max 6', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'wind_turbine' },
      { ...emptyHex(0, 0), building: 'farm' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(3); // 1 × 3
  });

  // --- Golf Course ---

  it('golf_course scores 1 per park globally, max 16', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'golf_course' },
      { ...emptyHex(0, 0), building: 'park' },
      { ...emptyHex(0, 1), building: 'park' },
      { ...emptyHex(0, 2), building: 'park' },
      { ...emptyHex(1, 0), building: 'park' },
      { ...emptyHex(1, 1), building: 'park' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(5); // 5 × 1
  });

  // --- Mine (road reachability) ---

  it('mine scores 3 per farm or factory reachable by road, max 6', () => {
    // mine at (2,2), road at (2,1) connecting sides 1(S)↔4(N), farm at (2,0)
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'mine' },
      { ...emptyHex(2, 1), roads: [{ type: 'straight', rotation: 1 }] },
      { ...emptyHex(2, 0), building: 'farm' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(3); // 1 × 3
  });

  it('mine scores 0 when no road connects', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'mine' },
      { ...emptyHex(2, 0), building: 'farm' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(0);
  });

  // --- Recycling Plant ---

  it('recycling_plant scores 3 per business or factory reachable by road', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'recycling_plant' },
      { ...emptyHex(2, 1), roads: [{ type: 'straight', rotation: 1 }] },
      { ...emptyHex(2, 0), building: 'factory' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(3);
  });

  // --- Zoo ---

  it('zoo scores 3 per neighborhood or park reachable by road', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'zoo' },
      { ...emptyHex(2, 1), roads: [{ type: 'straight', rotation: 1 }] },
      { ...emptyHex(2, 0), building: 'park' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(3);
  });

  // --- Bus Station ---

  it('bus_station scores 3 per neighborhood or factory reachable by road', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'bus_station' },
      { ...emptyHex(2, 1), roads: [{ type: 'straight', rotation: 1 }] },
      { ...emptyHex(2, 0), building: 'neighborhood' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(3);
  });

  // --- Post Office ---

  it('post_office scores 3 per neighborhood or business reachable by road', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'post_office' },
      { ...emptyHex(2, 1), roads: [{ type: 'straight', rotation: 1 }] },
      { ...emptyHex(2, 0), building: 'business' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(3);
  });

  // --- City Hall ---

  it('city_hall scores 2 per non-special building reachable by road, max 6', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'city_hall' },
      { ...emptyHex(2, 1), roads: [{ type: 'straight', rotation: 1 }] },
      { ...emptyHex(2, 0), building: 'park' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(2); // 1 × 2
  });

  // --- Pharmacy (directly between) ---
  // Opposing pairs for (2,2): (3,3)↔(1,1), (2,3)↔(2,1), (1,2)↔(3,2)

  it('pharmacy scores 10 when directly between two neighborhoods', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'pharmacy' },
      { ...emptyHex(2, 1), building: 'neighborhood' },
      { ...emptyHex(2, 3), building: 'neighborhood' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(10);
  });

  it('pharmacy scores 0 when neighborhoods not on opposing sides', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'pharmacy' },
      { ...emptyHex(2, 1), building: 'neighborhood' },
      { ...emptyHex(1, 1), building: 'neighborhood' }, // not opposite of (2,1)
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(0);
  });

  // --- Art Gallery ---

  it('art_gallery scores 10 when directly between two businesses', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'art_gallery' },
      { ...emptyHex(1, 2), building: 'business' },
      { ...emptyHex(3, 2), building: 'business' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(10);
  });

  it('art_gallery scores 0 with only one business on an opposing side', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'art_gallery' },
      { ...emptyHex(1, 2), building: 'business' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(0);
  });

  // --- Power Plant ---

  it('power_plant scores 10 when directly between two factories', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'power_plant' },
      { ...emptyHex(3, 3), building: 'factory' },
      { ...emptyHex(1, 1), building: 'factory' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(10);
  });

  // --- Farmers Market ---

  it('farmers_market scores 10 when directly between two farms', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'farmers_market' },
      { ...emptyHex(2, 1), building: 'farm' },
      { ...emptyHex(2, 3), building: 'farm' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(10);
  });

  it('farmers_market scores 0 when farms not opposing', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'farmers_market' },
      { ...emptyHex(2, 1), building: 'farm' },
      { ...emptyHex(1, 2), building: 'farm' }, // not opposite of (2,1)
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(0);
  });

  // --- Hospital ---

  it('hospital scores highest adjacent non-special building score', () => {
    // park scores 1, neighborhood scores 1 per adjacent park
    // Place hospital at (2,2), park at (2,1), neighborhood at (2,3)
    // neighborhood at (2,3) has no adjacent parks → scores 0
    // park at (2,1) → scores 1
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'hospital' },
      { ...emptyHex(2, 1), building: 'park' },
      { ...emptyHex(2, 3), building: 'neighborhood' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(1); // park = 1
  });

  it('hospital scores 0 with no adjacent non-special buildings', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'hospital' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(0);
  });

  // --- Theme Park ---

  it('theme_park scores 2 per double-road hex, max 10', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'theme_park' },
      { ...emptyHex(0, 0), roads: [{ type: 'straight', rotation: 0 }, { type: 'sharp_turn', rotation: 1 }] },
      { ...emptyHex(0, 1), roads: [{ type: 'straight', rotation: 0 }, { type: 'straight', rotation: 2 }] },
      { ...emptyHex(0, 2), roads: [{ type: 'straight', rotation: 0 }] }, // only 1 road
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(4); // 2 × 2
  });

  // --- Fast Food ---

  it('fast_food always scores 8', () => {
    const state = stateWithHexes([
      { ...emptyHex(2, 2), specialBuilding: 'fast_food' },
    ]);
    const hex = state.hexes.find((h) => h.coord.col === 2 && h.coord.row === 2)!;
    expect(computeSpecialBuildingScore(state, hex)).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// Action flow
// ---------------------------------------------------------------------------

describe('Special Building action flow', () => {
  function makeEligibleState(): GameState {
    const base = createInitialState();
    // Place Farm, Farm, Business in a triangle at (1,0), (2,0), (2,1)
    const hexMap = new Map(base.hexes.map((h) => [`${h.coord.col},${h.coord.row}`, h]));
    const setBuilding = (col: number, row: number, b: string) => {
      const key = `${col},${row}`;
      const hex = hexMap.get(key)!;
      hexMap.set(key, { ...hex, building: b as any });
    };
    setBuilding(1, 0, 'farm');
    setBuilding(2, 0, 'farm');
    setBuilding(2, 1, 'business');

    return {
      ...base,
      hexes: Array.from(hexMap.values()),
      specialBuildingCards: [{ defId: 'bakery', built: false }],
      phase: 'selecting',
      dice: [
        { id: 0, type: 'building', face: 'park', selected: false },
        { id: 1, type: 'building', face: 'park', selected: false },
        { id: 2, type: 'road', face: 'straight', selected: false },
        { id: 3, type: 'road', face: 'straight', selected: false },
      ],
    };
  }

  it('BUILD_SPECIAL_BUILDING transitions to selecting_special', () => {
    const s = makeEligibleState();
    const next = applyAction(s, { type: 'BUILD_SPECIAL_BUILDING' });
    expect(next.phase).toBe('selecting_special');
  });

  it('BUILD_SPECIAL_BUILDING rejected when no eligible card', () => {
    const s: GameState = { ...createInitialState(), phase: 'selecting' };
    const next = applyAction(s, { type: 'BUILD_SPECIAL_BUILDING' });
    expect(next).toBe(s);
  });

  it('SELECT_SPECIAL_CARD transitions to placing_special', () => {
    let s = makeEligibleState();
    s = applyAction(s, { type: 'BUILD_SPECIAL_BUILDING' });
    s = applyAction(s, { type: 'SELECT_SPECIAL_CARD', cardIndex: 0 });
    expect(s.phase).toBe('placing_special');
    expect(s.selectedSpecialCardIndex).toBe(0);
  });

  it('PLACE_SPECIAL_BUILDING places building and advances turn', () => {
    let s = makeEligibleState();
    s = applyAction(s, { type: 'BUILD_SPECIAL_BUILDING' });
    s = applyAction(s, { type: 'SELECT_SPECIAL_CARD', cardIndex: 0 });
    s = applyAction(s, { type: 'PLACE_SPECIAL_BUILDING', coord: { col: 0, row: 0 } });

    // Special building placed
    const hex = s.hexes.find((h) => h.coord.col === 0 && h.coord.row === 0)!;
    expect(hex.specialBuilding).toBe('bakery');

    // Card marked as built
    expect(s.specialBuildingCards[0].built).toBe(true);

    // Gained 1 waste
    expect(s.wasteCount).toBe(1);

    // Turn advanced
    expect(s.phase).toBe('rolling');
    expect(s.turnNumber).toBe(2);
  });

  it('PLACE_SPECIAL_BUILDING rejected on occupied hex', () => {
    let s = makeEligibleState();
    s = applyAction(s, { type: 'BUILD_SPECIAL_BUILDING' });
    s = applyAction(s, { type: 'SELECT_SPECIAL_CARD', cardIndex: 0 });
    // (1,0) already has a farm
    const before = s;
    s = applyAction(s, { type: 'PLACE_SPECIAL_BUILDING', coord: { col: 1, row: 0 } });
    expect(s).toBe(before);
  });

  it('CANCEL_SPECIAL_BUILDING backs up from placing_special to selecting_special', () => {
    let s = makeEligibleState();
    s = applyAction(s, { type: 'BUILD_SPECIAL_BUILDING' });
    s = applyAction(s, { type: 'SELECT_SPECIAL_CARD', cardIndex: 0 });
    expect(s.phase).toBe('placing_special');
    s = applyAction(s, { type: 'CANCEL_SPECIAL_BUILDING' });
    expect(s.phase).toBe('selecting_special');
    expect(s.selectedSpecialCardIndex).toBeNull();
  });

  it('CANCEL_SPECIAL_BUILDING backs up from selecting_special to selecting', () => {
    let s = makeEligibleState();
    s = applyAction(s, { type: 'BUILD_SPECIAL_BUILDING' });
    expect(s.phase).toBe('selecting_special');
    s = applyAction(s, { type: 'CANCEL_SPECIAL_BUILDING' });
    expect(s.phase).toBe('selecting');
  });
});
