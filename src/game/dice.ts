import { BuildingFace, DieResult, RoadFace } from './types';

export const BUILDING_DIE_FACES: BuildingFace[] = [
  'neighborhood',
  'neighborhood',
  'business',
  'factory',
  'farm',
  'park',
];

export const ROAD_DIE_FACES: RoadFace[] = [
  'straight',
  'straight',
  'sharp_turn',
  'sharp_turn',
  'slight_turn',
  'slight_turn',
];

/** Simple seedable PRNG (mulberry32). */
export function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Roll all four dice.
 * Pass a numeric seed for deterministic (testable) results.
 */
export function rollDice(seed?: number): DieResult[] {
  const rng = seed !== undefined ? createRng(seed) : () => Math.random();

  const pickBuilding = (): BuildingFace =>
    BUILDING_DIE_FACES[Math.floor(rng() * BUILDING_DIE_FACES.length)];

  const pickRoad = (): RoadFace =>
    ROAD_DIE_FACES[Math.floor(rng() * ROAD_DIE_FACES.length)];

  return [
    { id: 0, type: 'building', face: pickBuilding(), selected: false },
    { id: 1, type: 'building', face: pickBuilding(), selected: false },
    { id: 2, type: 'road', face: pickRoad(), selected: false },
    { id: 3, type: 'road', face: pickRoad(), selected: false },
  ];
}
