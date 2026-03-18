import {
  GameState,
  HexState,
  SpecialBuildingDef,
  SpecialBuildingCard,
  BuildingType,
} from './types';
import { getNeighbors, getNeighborAtSide, hexKey } from './board';
import { findReachableByRoadFilter, computeHexScore } from './scoring';

// ---------------------------------------------------------------------------
// Card pool
// ---------------------------------------------------------------------------

export const SPECIAL_BUILDING_POOL: SpecialBuildingDef[] = [
  {
    id: 'bakery',
    name: 'Bakery',
    requiredBuildings: ['farm', 'farm', 'business'],
    iconDescription: "Chef's toque",
    effectDescription: 'Worth 1 point per Waste taken.',
  },
  {
    id: 'airport',
    name: 'Airport',
    requiredBuildings: ['business', 'factory', 'park'],
    iconDescription: 'Airplane silhouette',
    effectDescription: 'Worth 1 point per 2 Road Hexes in your grid.',
  },
  {
    id: 'playground',
    name: 'Playground',
    requiredBuildings: ['neighborhood', 'neighborhood', 'farm'],
    iconDescription: 'Swing set',
    effectDescription: 'Worth 3 points per adjacent Neighborhood.',
  },
  {
    id: 'fire_station',
    name: 'Fire Station',
    requiredBuildings: ['business', 'business', 'neighborhood'],
    iconDescription: 'Flame',
    effectDescription: 'Worth 4 points per adjacent Business.',
  },
  {
    id: 'scrapyard',
    name: 'Scrapyard',
    requiredBuildings: ['factory', 'factory', 'park'],
    iconDescription: 'Pile of bricks',
    effectDescription: 'Worth 4 points per adjacent Factory.',
  },
  {
    id: 'spa',
    name: 'Spa',
    requiredBuildings: ['farm', 'farm', 'factory'],
    iconDescription: 'Aloe leaf',
    effectDescription: 'Worth 3 points per adjacent Farm.',
  },
  {
    id: 'campground',
    name: 'Campground',
    requiredBuildings: ['park', 'park', 'park'],
    iconDescription: 'Tent',
    effectDescription: 'Worth 2 points per adjacent Park.',
  },
  {
    id: 'demolition',
    name: 'Demolition',
    requiredBuildings: ['factory', 'factory', 'factory'],
    iconDescription: 'Wrecking ball',
    effectDescription: 'Worth 8 points per adjacent Junk Pile.',
  },
  {
    id: 'monument',
    name: 'Monument',
    requiredBuildings: ['business', 'business', 'park'],
    iconDescription: 'Monument spire',
    effectDescription: 'Worth 3 points per adjacent Road Hex.',
  },
  {
    id: 'precinct',
    name: 'Precinct',
    requiredBuildings: ['neighborhood', 'neighborhood', 'business'],
    iconDescription: 'Police badge',
    effectDescription: 'Worth 4 points per different building type adjacent.',
  },
  {
    id: 'church',
    name: 'Church',
    requiredBuildings: ['park', 'park', 'neighborhood'],
    iconDescription: 'Church with cross',
    effectDescription: 'Worth 2 points per Neighborhood in your town. (Max 8×)',
  },
  {
    id: 'warehouse',
    name: 'Warehouse',
    requiredBuildings: ['park', 'park', 'neighborhood'],
    iconDescription: 'Stack of boxes',
    effectDescription: 'Worth 3 points per Business in your town. (Max 6×)',
  },
  {
    id: 'university',
    name: 'University',
    requiredBuildings: ['park', 'park', 'factory'],
    iconDescription: 'Mortar board',
    effectDescription: 'Worth 3 points per Factory in your town. (Max 6×)',
  },
  {
    id: 'wind_turbine',
    name: 'Wind Turbine',
    requiredBuildings: ['park', 'park', 'farm'],
    iconDescription: 'Windmill',
    effectDescription: 'Worth 3 points per Farm in your town. (Max 6×)',
  },
  {
    id: 'golf_course',
    name: 'Golf Course',
    requiredBuildings: ['park', 'neighborhood', 'neighborhood'],
    iconDescription: 'Golf hole with flag',
    effectDescription: 'Worth 1 point per Park in your town. (Max 16×)',
  },
  {
    id: 'mine',
    name: 'Mine',
    requiredBuildings: ['neighborhood', 'business', 'park'],
    iconDescription: 'Tunnel in a mountain',
    effectDescription: 'Worth 3 points per Farm or Factory reachable by road. (Max 6×)',
  },
  {
    id: 'recycling_plant',
    name: 'Recycling Plant',
    requiredBuildings: ['neighborhood', 'farm', 'park'],
    iconDescription: 'Recycling logo',
    effectDescription: 'Worth 3 points per Business or Factory reachable by road. (Max 6×)',
  },
  {
    id: 'zoo',
    name: 'Zoo',
    requiredBuildings: ['business', 'factory', 'farm'],
    iconDescription: 'Panda',
    effectDescription: 'Worth 3 points per Neighborhood or Park reachable by road. (Max 6×)',
  },
  {
    id: 'bus_station',
    name: 'Bus Station',
    requiredBuildings: ['business', 'farm', 'park'],
    iconDescription: 'Bus',
    effectDescription: 'Worth 3 points per Neighborhood or Factory reachable by road. (Max 6×)',
  },
  {
    id: 'post_office',
    name: 'Post Office',
    requiredBuildings: ['farm', 'factory', 'park'],
    iconDescription: 'Envelope',
    effectDescription: 'Worth 3 points per Neighborhood or Business reachable by road. (Max 6×)',
  },
  {
    id: 'city_hall',
    name: 'City Hall',
    requiredBuildings: ['factory', 'factory', 'business'],
    iconDescription: 'Building with rotunda and flag',
    effectDescription: 'Worth 2 points per non-Special Building reachable by road. (Max 6×)',
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    requiredBuildings: ['neighborhood', 'neighborhood', 'factory'],
    iconDescription: 'Mortar and pestle',
    effectDescription: 'Worth 10 points if directly between two Neighborhoods.',
  },
  {
    id: 'art_gallery',
    name: 'Art Gallery',
    requiredBuildings: ['business', 'business', 'factory'],
    iconDescription: 'Framed picture',
    effectDescription: 'Worth 10 points if directly between two Businesses.',
  },
  {
    id: 'power_plant',
    name: 'Power Plant',
    requiredBuildings: ['factory', 'factory', 'neighborhood'],
    iconDescription: 'Cooling tower with lightning bolt',
    effectDescription: 'Worth 10 points if directly between two Factories.',
  },
  {
    id: 'farmers_market',
    name: "Farmers Market",
    requiredBuildings: ['farm', 'farm', 'park'],
    iconDescription: 'Vendor stall',
    effectDescription: 'Worth 10 points if directly between two Farms.',
  },
  {
    id: 'hospital',
    name: 'Hospital',
    requiredBuildings: ['neighborhood', 'neighborhood', 'neighborhood'],
    iconDescription: 'Red cross',
    effectDescription: 'Worth the value of the best adjacent non-Special Building.',
  },
  {
    id: 'theme_park',
    name: 'Theme Park',
    requiredBuildings: ['farm', 'farm', 'farm'],
    iconDescription: 'Ferris wheel',
    effectDescription: 'Worth 2 points per Road Hex with two segments. (Max 10×)',
  },
  {
    id: 'fast_food',
    name: 'Fast Food',
    requiredBuildings: ['neighborhood', 'business', 'farm'],
    iconDescription: 'Hamburger',
    effectDescription: 'Worth 8 points. Gain 1 additional Waste when built.',
  },
];

/** Look up a definition by id. */
export function getSpecialBuildingDef(
  id: string,
): SpecialBuildingDef | undefined {
  return SPECIAL_BUILDING_POOL.find((d) => d.id === id);
}

// ---------------------------------------------------------------------------
// Drawing cards
// ---------------------------------------------------------------------------

/** Draw up to `count` unique cards randomly from the pool. */
export function drawSpecialBuildingCards(
  count: number = 6,
): SpecialBuildingCard[] {
  const pool = [...SPECIAL_BUILDING_POOL];
  // Shuffle (Fisher-Yates)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length)).map((def) => ({
    defId: def.id,
    built: false,
  }));
}

// ---------------------------------------------------------------------------
// Triangle adjacency check
// ---------------------------------------------------------------------------

/**
 * Check whether three mutually-adjacent hexes on the board satisfy the
 * required building combination (order-independent).
 */
export function isCardEligible(
  state: GameState,
  card: SpecialBuildingCard,
): boolean {
  if (card.built) return false;
  const def = getSpecialBuildingDef(card.defId);
  if (!def) return false;

  const required = [...def.requiredBuildings].sort() as string[];

  // Build lookup: building type → list of hex coords
  const byBuilding = new Map<string, HexState[]>();
  for (const hex of state.hexes) {
    if (!hex.building) continue;
    const arr = byBuilding.get(hex.building) ?? [];
    arr.push(hex);
    byBuilding.set(hex.building, arr);
  }

  // Get unique required types
  const uniqueTypes = [...new Set(required)];

  // Quick check: enough of each type on the board?
  for (const t of uniqueTypes) {
    const need = required.filter((r) => r === t).length;
    if ((byBuilding.get(t)?.length ?? 0) < need) return false;
  }

  // Enumerate triangles: for each hex H1, check each neighbor H2 > H1,
  // then each common neighbor H3 > H2 (using key ordering to avoid dupes).
  const hexMap = new Map<string, HexState>();
  for (const hex of state.hexes) {
    if (hex.building) hexMap.set(hexKey(hex.coord), hex);
  }

  for (const h1 of state.hexes) {
    if (!h1.building) continue;
    const h1Key = hexKey(h1.coord);
    const n1 = getNeighbors(h1.coord);

    for (const n1Coord of n1) {
      const h2Key = hexKey(n1Coord);
      if (h2Key <= h1Key) continue; // avoid duplicate pairs
      const h2 = hexMap.get(h2Key);
      if (!h2) continue;

      // Find common neighbors of h1 and h2 with key > h2Key
      const n2Set = new Set(getNeighbors(n1Coord).map(hexKey));
      for (const n1c of n1) {
        const h3Key = hexKey(n1c);
        if (h3Key <= h2Key) continue;
        if (!n2Set.has(h3Key)) continue;
        const h3 = hexMap.get(h3Key);
        if (!h3) continue;

        const triple = [h1.building, h2.building, h3.building]
          .sort() as string[];
        if (
          triple[0] === required[0] &&
          triple[1] === required[1] &&
          triple[2] === required[2]
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

/** Return whether any unbuilt card is eligible. */
export function hasEligibleSpecialBuilding(state: GameState): boolean {
  return state.specialBuildingCards.some(
    (card) => isCardEligible(state, card),
  );
}

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

function findHex(state: GameState, coord: { col: number; row: number }): HexState | undefined {
  return state.hexes.find(
    (h) => h.coord.col === coord.col && h.coord.row === coord.row,
  );
}

function getAdjacentHexes(state: GameState, hex: HexState): HexState[] {
  return getNeighbors(hex.coord)
    .map((c) => findHex(state, c))
    .filter((h): h is HexState => h !== undefined);
}

function countAdjacentBuilding(state: GameState, hex: HexState, building: string): number {
  return getAdjacentHexes(state, hex).filter((h) => h.building === building).length;
}

function countAdjacentJunkPiles(state: GameState, hex: HexState): number {
  return getAdjacentHexes(state, hex).filter((h) => h.junkPile).length;
}

function countAdjacentRoadHexes(state: GameState, hex: HexState): number {
  return getAdjacentHexes(state, hex).filter((h) => h.roads.length > 0).length;
}

function countTotalRoadHexes(state: GameState): number {
  return state.hexes.filter((h) => h.roads.length > 0).length;
}

function countAdjacentDifferentBuildings(state: GameState, hex: HexState): number {
  const names = new Set<string>();
  for (const adj of getAdjacentHexes(state, hex)) {
    if (adj.building) names.add(adj.building);
    if (adj.specialBuilding) names.add(adj.specialBuilding);
  }
  return names.size;
}

function countGlobalBuilding(state: GameState, building: string): number {
  return state.hexes.filter((h) => h.building === building).length;
}

function countReachableByTypes(
  state: GameState,
  hex: HexState,
  types: string[],
): number {
  const typeSet = new Set(types);
  return findReachableByRoadFilter(
    state,
    hex.coord,
    (h) => h.building !== null && typeSet.has(h.building),
  ).length;
}

function isDirectlyBetween(state: GameState, hex: HexState, building: string): boolean {
  const opposingPairs: [number, number][] = [[0, 3], [1, 4], [2, 5]];
  for (const [sA, sB] of opposingPairs) {
    const coordA = getNeighborAtSide(hex.coord, sA);
    const coordB = getNeighborAtSide(hex.coord, sB);
    if (!coordA || !coordB) continue;
    const hexA = findHex(state, coordA);
    const hexB = findHex(state, coordB);
    if (hexA?.building === building && hexB?.building === building) return true;
  }
  return false;
}

function maxAdjacentNonSpecialBuildingScore(state: GameState, hex: HexState): number {
  let best = 0;
  for (const adj of getAdjacentHexes(state, hex)) {
    if (adj.building && !adj.specialBuilding) {
      const score = computeHexScore(state, adj);
      if (score > best) best = score;
    }
  }
  return best;
}

function countDoubleRoadHexes(state: GameState): number {
  return state.hexes.filter((h) => h.roads.length >= 2).length;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Compute the score for a special building hex. */
export function computeSpecialBuildingScore(
  state: GameState,
  hex: HexState,
): number {
  if (!hex.specialBuilding) return 0;

  switch (hex.specialBuilding) {
    case 'bakery':
      return state.wasteCount;
    case 'airport':
      return Math.floor(countTotalRoadHexes(state) / 2);
    case 'playground':
      return 3 * countAdjacentBuilding(state, hex, 'neighborhood');
    case 'fire_station':
      return 4 * countAdjacentBuilding(state, hex, 'business');
    case 'scrapyard':
      return 4 * countAdjacentBuilding(state, hex, 'factory');
    case 'spa':
      return 3 * countAdjacentBuilding(state, hex, 'farm');
    case 'campground':
      return 2 * countAdjacentBuilding(state, hex, 'park');
    case 'demolition':
      return 8 * countAdjacentJunkPiles(state, hex);
    case 'monument':
      return 3 * countAdjacentRoadHexes(state, hex);
    case 'precinct':
      return 4 * countAdjacentDifferentBuildings(state, hex);
    case 'church':
      return Math.min(countGlobalBuilding(state, 'neighborhood'), 8) * 2;
    case 'warehouse':
      return Math.min(countGlobalBuilding(state, 'business'), 6) * 3;
    case 'university':
      return Math.min(countGlobalBuilding(state, 'factory'), 6) * 3;
    case 'wind_turbine':
      return Math.min(countGlobalBuilding(state, 'farm'), 6) * 3;
    case 'golf_course':
      return Math.min(countGlobalBuilding(state, 'park'), 16) * 1;
    case 'mine':
      return Math.min(countReachableByTypes(state, hex, ['farm', 'factory']), 6) * 3;
    case 'recycling_plant':
      return Math.min(countReachableByTypes(state, hex, ['business', 'factory']), 6) * 3;
    case 'zoo':
      return Math.min(countReachableByTypes(state, hex, ['neighborhood', 'park']), 6) * 3;
    case 'bus_station':
      return Math.min(countReachableByTypes(state, hex, ['neighborhood', 'factory']), 6) * 3;
    case 'post_office':
      return Math.min(countReachableByTypes(state, hex, ['neighborhood', 'business']), 6) * 3;
    case 'city_hall':
      return Math.min(
        findReachableByRoadFilter(state, hex.coord, (h) => h.building !== null && !h.specialBuilding).length,
        6,
      ) * 2;
    case 'pharmacy':
      return isDirectlyBetween(state, hex, 'neighborhood') ? 10 : 0;
    case 'art_gallery':
      return isDirectlyBetween(state, hex, 'business') ? 10 : 0;
    case 'power_plant':
      return isDirectlyBetween(state, hex, 'factory') ? 10 : 0;
    case 'farmers_market':
      return isDirectlyBetween(state, hex, 'farm') ? 10 : 0;
    case 'hospital':
      return maxAdjacentNonSpecialBuildingScore(state, hex);
    case 'theme_park':
      return Math.min(countDoubleRoadHexes(state), 10) * 2;
    case 'fast_food':
      return 8;
    default:
      return 0;
  }
}
