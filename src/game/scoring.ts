import { GameState, HexState, HexCoord, BuildingType, Road } from './types';
import { getNeighborAtSide, hexKey } from './board';
import { getRoadSides } from './roads';
import { computeSpecialBuildingScore } from './specialBuildings';

// ---------------------------------------------------------------------------
// Highway exits
// ---------------------------------------------------------------------------

export interface HighwayExit {
  coord: HexCoord;
  side: number; // road-side index that must be touched to connect
}

/** The three highway exits on the board boundary. */
export const HIGHWAY_EXITS: HighwayExit[] = [
  { coord: { col: 0, row: 2 }, side: 2 }, // SW edge of (0,2)
  { coord: { col: 3, row: 0 }, side: 4 }, // N edge of (3,0)
  { coord: { col: 5, row: 2 }, side: 0 }, // SE edge of (5,2)
];

// ---------------------------------------------------------------------------
// Road reachability
// ---------------------------------------------------------------------------

/**
 * Given the roads in a hex and an entry side, return every side reachable by
 * chaining through connected roads within the hex.  Two roads that share a
 * common side allow traffic to flow from one to the other.
 */
function getReachableExits(roads: Road[], entrySide: number): number[] {
  const visited = new Set<number>([entrySide]);
  const queue = [entrySide];
  while (queue.length > 0) {
    const side = queue.shift()!;
    for (const road of roads) {
      const [s1, s2] = getRoadSides(road);
      let other: number | null = null;
      if (s1 === side) other = s2;
      else if (s2 === side) other = s1;
      if (other !== null && !visited.has(other)) {
        visited.add(other);
        queue.push(other);
      }
    }
  }
  visited.delete(entrySide);
  return Array.from(visited);
}

/**
 * Find all hexes of a given building type reachable by road from a source hex.
 *
 * "Reachable by road" means there is a chain of road segments connecting
 * an edge of the source hex to an edge of the target hex.  The source and
 * target hexes themselves do not need roads — only the intermediate hexes do.
 *
 * Algorithm: BFS on (hex, entrySide) pairs through the road network.
 */
export function findReachableByRoad(
  state: GameState,
  sourceCoord: HexCoord,
  targetType: BuildingType,
): HexCoord[] {
  // Build fast lookup
  const hexMap = new Map<string, HexState>();
  for (const h of state.hexes) {
    hexMap.set(hexKey(h.coord), h);
  }

  const reachable = new Set<string>();
  const visited = new Set<string>(); // "col,row,side"
  const queue: [HexCoord, number][] = [];

  // Seed: from source hex, probe all 6 sides
  for (let side = 0; side < 6; side++) {
    const neighborCoord = getNeighborAtSide(sourceCoord, side);
    if (!neighborCoord) continue;
    const neighborHex = hexMap.get(hexKey(neighborCoord));
    if (!neighborHex) continue;

    const oppositeSide = (side + 3) % 6;

    // If neighbor is the target, check if it has a road touching the shared
    // edge (it won't — buildings have no roads — so direct adjacency alone
    // does NOT count as reachable by road).

    // If neighbor has roads, start traversal from this entry side
    if (neighborHex.roads.length > 0) {
      queue.push([neighborCoord, oppositeSide]);
    }
  }

  while (queue.length > 0) {
    const [hexCoord, entrySide] = queue.shift()!;
    const vKey = `${hexKey(hexCoord)},${entrySide}`;
    if (visited.has(vKey)) continue;
    visited.add(vKey);

    const hex = hexMap.get(hexKey(hexCoord));
    if (!hex) continue;

    // Follow roads, chaining through connected roads within the hex
    for (const exitSide of getReachableExits(hex.roads, entrySide)) {
      const nextCoord = getNeighborAtSide(hexCoord, exitSide);
      if (!nextCoord) continue;
      const nextHex = hexMap.get(hexKey(nextCoord));
      if (!nextHex) continue;

      // Reached a target?
      if (nextHex.building === targetType) {
        reachable.add(hexKey(nextCoord));
        continue;
      }

      // Continue traversal if the next hex has roads
      if (nextHex.roads.length > 0) {
        const nextEntry = (exitSide + 3) % 6;
        queue.push([nextCoord, nextEntry]);
      }
    }
  }

  return Array.from(reachable).map((k) => {
    const [col, row] = k.split(',').map(Number);
    return { col, row };
  });
}

// ---------------------------------------------------------------------------
// Per-hex scoring
// ---------------------------------------------------------------------------

/**
 * Compute the score for a single hex based on its building type and context.
 */
export function computeHexScore(state: GameState, hex: HexState): number {
  if (hex.junkPile) return 0;
  if (hex.specialBuilding) return computeSpecialBuildingScore(state, hex);
  if (!hex.building) return 0;

  const MAX_BUILDING_SCORE = 12;

  switch (hex.building) {
    case 'park':
      return 1;

    case 'neighborhood': {
      // 1 point for each adjacent Park
      let score = 0;
      for (let side = 0; side < 6; side++) {
        const nCoord = getNeighborAtSide(hex.coord, side);
        if (!nCoord) continue;
        const neighbor = state.hexes.find(
          (h) => h.coord.col === nCoord.col && h.coord.row === nCoord.row,
        );
        if (neighbor?.building === 'park') score++;
      }
      return Math.min(score, MAX_BUILDING_SCORE);
    }

    case 'business': {
      // 2 points for each Neighborhood reachable by road
      return Math.min(findReachableByRoad(state, hex.coord, 'neighborhood').length * 2, MAX_BUILDING_SCORE);
    }

    case 'factory': {
      // 4 points for each Farm reachable by road
      return Math.min(findReachableByRoad(state, hex.coord, 'farm').length * 4, MAX_BUILDING_SCORE);
    }

    case 'farm': {
      // 2 points for each Business reachable by road
      return Math.min(findReachableByRoad(state, hex.coord, 'business').length * 2, MAX_BUILDING_SCORE);
    }
  }
}

// ---------------------------------------------------------------------------
// Bulk scoring & game-over check
// ---------------------------------------------------------------------------

/** Recompute scores for every hex, returning the updated hex array. */
export function updateAllScores(state: GameState): HexState[] {
  return state.hexes.map((hex) => ({
    ...hex,
    score: computeHexScore(state, hex),
  }));
}

/** The game is over when no hex is completely empty. */
export function checkGameOver(hexes: HexState[]): boolean {
  return !hexes.some(
    (h) => h.building === null && h.specialBuilding === null && h.roads.length === 0 && !h.junkPile,
  );
}

/** Sum of all hex scores. */
export function getTotalScore(hexes: HexState[]): number {
  return hexes.reduce((sum, h) => sum + h.score, 0);
}

// ---------------------------------------------------------------------------
// Road bonus — shortest route between two highway exits
// ---------------------------------------------------------------------------

/**
 * BFS to find the shortest route (in hex count) from exit A to exit B
 * following road connectivity.  Returns the number of hexes on the path,
 * or Infinity if no route exists.
 */
function shortestRouteBetweenExits(
  state: GameState,
  exitA: HighwayExit,
  exitB: HighwayExit,
): number {
  const hexMap = new Map<string, HexState>();
  for (const h of state.hexes) {
    hexMap.set(hexKey(h.coord), h);
  }

  // Start: enter exitA's hex from exitA's side (coming from outside)
  const startHex = hexMap.get(hexKey(exitA.coord));
  if (!startHex || startHex.roads.length === 0) return Infinity;

  // BFS state: (hexKey, entrySide) → distance
  const visited = new Map<string, number>();
  // Queue: [hexCoord, entrySide, distance]
  const queue: [HexCoord, number, number][] = [[exitA.coord, exitA.side, 1]];

  while (queue.length > 0) {
    const [hCoord, entrySide, dist] = queue.shift()!;
    const vKey = `${hexKey(hCoord)},${entrySide}`;
    if (visited.has(vKey)) continue;
    visited.set(vKey, dist);

    const hex = hexMap.get(hexKey(hCoord));
    if (!hex) continue;

    // Follow roads, chaining through connected roads within the hex
    for (const exitSide of getReachableExits(hex.roads, entrySide)) {
      // Check if we've reached exit B
      if (
        hCoord.col === exitB.coord.col &&
        hCoord.row === exitB.coord.row &&
        exitSide === exitB.side
      ) {
        return dist;
      }

      // Move to the neighbor through exitSide
      const nextCoord = getNeighborAtSide(hCoord, exitSide);
      if (!nextCoord) continue;
      const nextHex = hexMap.get(hexKey(nextCoord));
      if (!nextHex || nextHex.roads.length === 0) continue;

      const nextEntry = (exitSide + 3) % 6;
      queue.push([nextCoord, nextEntry, dist + 1]);
    }
  }

  return Infinity;
}

/**
 * Compute the road bonus: the number of hexes on the shortest route
 * connecting any two of the three highway exits.  Returns 0 if no
 * pair is connected.
 */
export function computeRoadBonus(state: GameState): number {
  let best = Infinity;
  for (let i = 0; i < HIGHWAY_EXITS.length; i++) {
    for (let j = i + 1; j < HIGHWAY_EXITS.length; j++) {
      const d = shortestRouteBetweenExits(state, HIGHWAY_EXITS[i], HIGHWAY_EXITS[j]);
      if (d < best) best = d;
    }
  }
  return best === Infinity ? 0 : best;
}

/**
 * Like findReachableByRoad but accepts an arbitrary predicate to match
 * target hexes.  Used by special buildings that score multiple building types.
 */
export function findReachableByRoadFilter(
  state: GameState,
  sourceCoord: HexCoord,
  filter: (hex: HexState) => boolean,
): HexCoord[] {
  const hexMap = new Map<string, HexState>();
  for (const h of state.hexes) {
    hexMap.set(hexKey(h.coord), h);
  }

  const reachable = new Set<string>();
  const visited = new Set<string>();
  const queue: [HexCoord, number][] = [];

  for (let side = 0; side < 6; side++) {
    const neighborCoord = getNeighborAtSide(sourceCoord, side);
    if (!neighborCoord) continue;
    const neighborHex = hexMap.get(hexKey(neighborCoord));
    if (!neighborHex) continue;
    if (neighborHex.roads.length > 0) {
      queue.push([neighborCoord, (side + 3) % 6]);
    }
  }

  while (queue.length > 0) {
    const [hCoord, entrySide] = queue.shift()!;
    const vKey = `${hexKey(hCoord)},${entrySide}`;
    if (visited.has(vKey)) continue;
    visited.add(vKey);

    const hex = hexMap.get(hexKey(hCoord));
    if (!hex) continue;

    for (const exitSide of getReachableExits(hex.roads, entrySide)) {
      const nextCoord = getNeighborAtSide(hCoord, exitSide);
      if (!nextCoord) continue;
      const nextHex = hexMap.get(hexKey(nextCoord));
      if (!nextHex) continue;

      if (filter(nextHex)) {
        reachable.add(hexKey(nextCoord));
        continue;
      }

      if (nextHex.roads.length > 0) {
        queue.push([nextCoord, (exitSide + 3) % 6]);
      }
    }
  }

  return Array.from(reachable).map((k) => {
    const [col, row] = k.split(',').map(Number);
    return { col, row };
  });
}
