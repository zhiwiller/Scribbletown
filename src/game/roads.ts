import { RoadFace, Road } from './types';

/**
 * Hex sides are numbered 0-5 clockwise from the right side of a flat-top hex.
 *   0 = E,  1 = SE,  2 = SW,  3 = W,  4 = NW,  5 = NE
 *
 * Side midpoint angle from centre: (30 + 60 * sideIndex) degrees.
 */

/** Return the two side indices a road connects. */
export function getRoadSides(road: Road): [number, number] {
  const r = ((road.rotation % 6) + 6) % 6;
  switch (road.type) {
    case 'straight':
      return [r % 3, (r % 3) + 3];           // opposite sides
    case 'sharp_turn':
      return [r, (r + 1) % 6];               // adjacent sides
    case 'slight_turn':
      return [r, (r + 2) % 6];               // one side gap
  }
}

/** Number of distinct rotations before the pattern repeats. */
export function getMaxRotations(type: RoadFace): number {
  return type === 'straight' ? 3 : 6;
}

/** Pixel position of a hex-side midpoint. */
export function getSideMidpoint(
  cx: number,
  cy: number,
  size: number,
  sideIndex: number,
): { x: number; y: number } {
  const angle = ((30 + 60 * sideIndex) * Math.PI) / 180;
  const dist = (size * Math.sqrt(3)) / 2;
  return {
    x: cx + dist * Math.cos(angle),
    y: cy + dist * Math.sin(angle),
  };
}

/** SVG path string for a road drawn inside a hex centred at (cx, cy). */
export function getRoadPath(
  cx: number,
  cy: number,
  size: number,
  road: Road,
): string {
  const [s1, s2] = getRoadSides(road);
  const p1 = getSideMidpoint(cx, cy, size, s1);
  const p2 = getSideMidpoint(cx, cy, size, s2);

  switch (road.type) {
    case 'straight':
      return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;

    case 'sharp_turn': {
      // Quadratic bezier curving toward the shared vertex
      const vAngle = (60 * ((s1 + 1) % 6) * Math.PI) / 180;
      const vx = cx + size * Math.cos(vAngle);
      const vy = cy + size * Math.sin(vAngle);
      const qx = vx * 0.65 + cx * 0.35;
      const qy = vy * 0.65 + cy * 0.35;
      return `M ${p1.x} ${p1.y} Q ${qx} ${qy} ${p2.x} ${p2.y}`;
    }

    case 'slight_turn': {
      // Quadratic bezier curving toward the side between the two endpoints
      const midSide = (s1 + 1) % 6;
      const midAngle = ((30 + 60 * midSide) * Math.PI) / 180;
      const dist = (size * Math.sqrt(3)) / 2;
      const qx = cx + dist * 0.58 * Math.cos(midAngle);
      const qy = cy + dist * 0.58 * Math.sin(midAngle);
      return `M ${p1.x} ${p1.y} Q ${qx} ${qy} ${p2.x} ${p2.y}`;
    }
  }
}

/** Check whether two roads occupy the exact same pair of sides. */
export function roadsOverlap(a: Road, b: Road): boolean {
  const [a1, a2] = getRoadSides(a);
  const [b1, b2] = getRoadSides(b);
  return (a1 === b1 && a2 === b2) || (a1 === b2 && a2 === b1);
}

/**
 * Return all legal rotation values for a road type on a hex that already has
 * one road. A rotation is legal if the new road would not overlap or cross
 * the existing road.  When the hex is empty every rotation is legal.
 */
export function getLegalRotations(
  type: RoadFace,
  existingRoad: Road | null,
): number[] {
  const max = getMaxRotations(type);
  const all = Array.from({ length: max }, (_, i) => i);
  if (!existingRoad) return all;
  return all.filter((r) => {
    const candidate: Road = { type, rotation: r };
    return !roadsOverlap(existingRoad, candidate) && !roadsCross(existingRoad, candidate);
  });
}

/**
 * Given the current rotation, return the next legal rotation (cycling).
 * If there are no legal rotations, returns -1.
 */
export function getNextLegalRotation(
  type: RoadFace,
  existingRoad: Road | null,
  currentRotation: number,
): number {
  const legal = getLegalRotations(type, existingRoad);
  if (legal.length === 0) return -1;
  const idx = legal.indexOf(currentRotation);
  return legal[(idx + 1) % legal.length];
}

/**
 * Check whether two roads cross inside the hex.
 * Two chords on a hexagon cross iff their endpoints interleave around
 * the perimeter. Roads that share an endpoint meet at an edge — they
 * do not cross.
 */
export function roadsCross(a: Road, b: Road): boolean {
  const [a1, a2] = getRoadSides(a);
  const [b1, b2] = getRoadSides(b);

  // Shared endpoint → roads meet at an edge, not a crossing
  if (a1 === b1 || a1 === b2 || a2 === b1 || a2 === b2) return false;

  // Is point c strictly between a and b going clockwise on a 6-sided circle?
  function betweenCW(start: number, end: number, c: number): boolean {
    if (start < end) return c > start && c < end;
    return c > start || c < end;
  }

  // Chords cross iff exactly one of b's endpoints is between a's endpoints
  return betweenCW(a1, a2, b1) !== betweenCW(a1, a2, b2);
}
