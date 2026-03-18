import { HexCoord, HexState } from './types';

/** Number of hexes per column (0-indexed) */
export const COLUMN_SIZES = [3, 4, 5, 5, 4, 3];

/**
 * Vertical offset of each column's top hex, in half-hex-height units.
 * Columns 0-3 shift upward; columns 3-5 shift back down — forming a
 * symmetric diamond board shape.
 */
export const COLUMN_TOP_OFFSETS = [0, -1, -2, -3, -2, -1];

/** Generate all hex coordinates for the board. */
export function getAllHexCoords(): HexCoord[] {
  const coords: HexCoord[] = [];
  for (let col = 0; col < COLUMN_SIZES.length; col++) {
    for (let row = 0; row < COLUMN_SIZES[col]; row++) {
      coords.push({ col, row });
    }
  }
  return coords;
}

/** Create a string key for a hex coordinate (useful for lookups). */
export function hexKey(coord: HexCoord): string {
  return `${coord.col},${coord.row}`;
}

/** Check whether a hex coordinate exists on the board. */
export function isValidHex(coord: HexCoord): boolean {
  const { col, row } = coord;
  if (col < 0 || col >= COLUMN_SIZES.length) return false;
  if (row < 0 || row >= COLUMN_SIZES[col]) return false;
  return true;
}

/**
 * Return all neighbours of a hex.
 *
 * Adjacency rules for this flat-top hex layout:
 *   Same column  — N (row-1) and S (row+1)
 *   Cross-column — depends on whether the neighbouring column is shifted
 *                  up (offset diff = -1) or down (offset diff = +1).
 */
export function getNeighbors(coord: HexCoord): HexCoord[] {
  const { col, row } = coord;
  const candidates: HexCoord[] = [];

  // Same column
  candidates.push({ col, row: row - 1 });
  candidates.push({ col, row: row + 1 });

  // Left column
  if (col > 0) {
    const shift = COLUMN_TOP_OFFSETS[col] - COLUMN_TOP_OFFSETS[col - 1];
    if (shift === -1) {
      // Current column shifted up relative to left
      candidates.push({ col: col - 1, row: row - 1 }); // NW
      candidates.push({ col: col - 1, row });            // SW
    } else {
      // Current column shifted down relative to left
      candidates.push({ col: col - 1, row });            // NW
      candidates.push({ col: col - 1, row: row + 1 });   // SW
    }
  }

  // Right column
  if (col < COLUMN_SIZES.length - 1) {
    const shift = COLUMN_TOP_OFFSETS[col + 1] - COLUMN_TOP_OFFSETS[col];
    if (shift === -1) {
      // Right column shifted up
      candidates.push({ col: col + 1, row });            // NE
      candidates.push({ col: col + 1, row: row + 1 });   // SE
    } else {
      // Right column shifted down
      candidates.push({ col: col + 1, row: row - 1 });   // NE
      candidates.push({ col: col + 1, row });             // SE
    }
  }

  return candidates.filter(isValidHex);
}

/**
 * Return the neighbour of a hex on a specific side, or null if off-board.
 *
 * Hex sides (flat-top, clockwise from right vertex edge):
 *   0 = SE,  1 = S,  2 = SW,  3 = NW,  4 = N,  5 = NE
 */
export function getNeighborAtSide(
  coord: HexCoord,
  side: number,
): HexCoord | null {
  const { col, row } = coord;
  let neighbor: HexCoord;

  switch (side) {
    case 0: { // SE — right column
      if (col >= COLUMN_SIZES.length - 1) return null;
      const shift = COLUMN_TOP_OFFSETS[col + 1] - COLUMN_TOP_OFFSETS[col];
      neighbor = shift === -1
        ? { col: col + 1, row: row + 1 }
        : { col: col + 1, row };
      break;
    }
    case 1: // S — same column
      neighbor = { col, row: row + 1 };
      break;
    case 2: { // SW — left column
      if (col <= 0) return null;
      const shift = COLUMN_TOP_OFFSETS[col] - COLUMN_TOP_OFFSETS[col - 1];
      neighbor = shift === -1
        ? { col: col - 1, row }
        : { col: col - 1, row: row + 1 };
      break;
    }
    case 3: { // NW — left column
      if (col <= 0) return null;
      const shift = COLUMN_TOP_OFFSETS[col] - COLUMN_TOP_OFFSETS[col - 1];
      neighbor = shift === -1
        ? { col: col - 1, row: row - 1 }
        : { col: col - 1, row };
      break;
    }
    case 4: // N — same column
      neighbor = { col, row: row - 1 };
      break;
    case 5: { // NE — right column
      if (col >= COLUMN_SIZES.length - 1) return null;
      const shift = COLUMN_TOP_OFFSETS[col + 1] - COLUMN_TOP_OFFSETS[col];
      neighbor = shift === -1
        ? { col: col + 1, row }
        : { col: col + 1, row: row - 1 };
      break;
    }
    default:
      return null;
  }

  return isValidHex(neighbor) ? neighbor : null;
}

/** Create initial (empty) hex states for every board position. */
export function createInitialHexes(): HexState[] {
  return getAllHexCoords().map((coord) => ({
    coord,
    building: null,
    specialBuilding: null,
    roads: [],
    scoringCircleFilled: false,
    junkPile: false,
    score: 0,
  }));
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

/**
 * Pixel position of a hex centre (flat-top orientation).
 *   x spacing between columns = 1.5 * hexSize
 *   y spacing within a column  = sqrt(3) * hexSize
 */
export function hexToPixel(
  coord: HexCoord,
  hexSize: number,
): { x: number; y: number } {
  const hexHeight = Math.sqrt(3) * hexSize;
  const x = coord.col * 1.5 * hexSize;
  const y =
    (COLUMN_TOP_OFFSETS[coord.col] * hexHeight) / 2 +
    coord.row * hexHeight;
  return { x, y };
}

/** SVG polygon points string for a flat-top hex at (cx, cy). */
export function hexPolygonPoints(
  cx: number,
  cy: number,
  size: number,
): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i;
    const angleRad = (Math.PI / 180) * angleDeg;
    const px = cx + size * Math.cos(angleRad);
    const py = cy + size * Math.sin(angleRad);
    points.push(`${px.toFixed(2)},${py.toFixed(2)}`);
  }
  return points.join(' ');
}

/** Bounding box that contains the entire board. */
export function getBoardBounds(hexSize: number) {
  const allCoords = getAllHexCoords();
  const halfH = (Math.sqrt(3) / 2) * hexSize;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const coord of allCoords) {
    const { x, y } = hexToPixel(coord, hexSize);
    minX = Math.min(minX, x - hexSize);
    maxX = Math.max(maxX, x + hexSize);
    minY = Math.min(minY, y - halfH);
    maxY = Math.max(maxY, y + halfH);
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}
