import { HexState, HexCoord, BuildingType, GameState, RoadFace, Road } from '../game/types';
import { hexToPixel, hexPolygonPoints, getBoardBounds } from '../game/board';
import { getRoadPath, getSideMidpoint } from '../game/roads';
import { canPlaceBuilding, canPlaceRoad, canPlaceJunkPile } from '../game/actions';
import { HIGHWAY_EXITS } from '../game/scoring';
import { SpecialBuildingIcon } from './SpecialBuildingIcon';
import './Board.css';

const HEX_SIZE = 44;
const PADDING = 16;

interface BoardProps {
  state: GameState;
  onHexClick: (coord: HexCoord) => void;
}

// ---------------------------------------------------------------------------
// Building icons (SVG groups centred at 0,0 — scaled to ~24px)
// ---------------------------------------------------------------------------

function BuildingIcon({ type, cx, cy, opacity }: {
  type: BuildingType; cx: number; cy: number; opacity?: number;
}) {
  const o = opacity ?? 1;
  return (
    <g transform={`translate(${cx}, ${cy})`} opacity={o} className="building-icon">
      {type === 'neighborhood' && (
        <>
          <path d="M0,-10 L8,-3 L8,8 L-8,8 L-8,-3 Z" fill="#6ec6a0" stroke="#3a8a6a" strokeWidth="1.2" />
          <rect x="-2.5" y="2" width="5" height="6" rx="0.5" fill="#3a8a6a" />
          <polygon points="-9,-3 0,-10 9,-3" fill="#4daa80" stroke="#3a8a6a" strokeWidth="1" />
        </>
      )}
      {type === 'business' && (
        <>
          <path d="M-7,-4 L-4,-4 L-1,5 L7,5 L8,-1 L-2,-1" fill="none" stroke="#d4a030" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="0" cy="8" r="1.8" fill="#d4a030" />
          <circle cx="5.5" cy="8" r="1.8" fill="#d4a030" />
        </>
      )}
      {type === 'factory' && (
        <>
          <rect x="-9" y="-1" width="18" height="10" rx="1" fill="#8888bb" stroke="#5555aa" strokeWidth="1.2" />
          <rect x="4" y="-9" width="4" height="8" rx="0.5" fill="#7777aa" stroke="#5555aa" strokeWidth="1" />
          <ellipse cx="6" cy="-10" rx="3" ry="1.5" fill="#aaa" opacity="0.6" />
        </>
      )}
      {type === 'farm' && (
        <>
          <path d="M-9,8 L-9,-1 L-1,-8 L7,-1 L7,8 Z" fill="#c47040" stroke="#8a4a28" strokeWidth="1.2" />
          <rect x="-3" y="2" width="4" height="6" rx="0.5" fill="#8a4a28" />
          <rect x="8" y="-2" width="4" height="10" rx="2" fill="#c4a060" stroke="#8a7a38" strokeWidth="1" />
        </>
      )}
      {type === 'park' && (
        <>
          <circle cx="0" cy="-4" r="8" fill="#3a7a3a" stroke="#2a5a2a" strokeWidth="1.2" />
          <rect x="-1" y="-2" width="2" height="10" rx="0.5" fill="#6a4a2a" />
        </>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Junk pile icon
// ---------------------------------------------------------------------------

function JunkPileIcon({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx}, ${cy})`} className="building-icon">
      <ellipse cx="0" cy="4" rx="10" ry="5" fill="#7a6a50" stroke="#5a4a30" strokeWidth="1" />
      <ellipse cx="-3" cy="-1" rx="6" ry="4" fill="#8a7a58" stroke="#5a4a30" strokeWidth="0.8" />
      <ellipse cx="4" cy="0" rx="5" ry="3.5" fill="#6a5a40" stroke="#5a4a30" strokeWidth="0.8" />
      <ellipse cx="0" cy="-5" rx="4" ry="3" fill="#9a8a68" stroke="#5a4a30" strokeWidth="0.8" />
      <line x1="-2" y1="-8" x2="-3" y2="-11" stroke="#5a4a30" strokeWidth="1" strokeLinecap="round" />
      <line x1="2" y1="-7" x2="4" y2="-10" stroke="#5a4a30" strokeWidth="1" strokeLinecap="round" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Road path rendering
// ---------------------------------------------------------------------------

function RoadPaths({ cx, cy, roads, opacity }: {
  cx: number; cy: number; roads: Road[]; opacity?: number;
}) {
  return (
    <>
      {roads.map((road, i) => (
        <path
          key={i}
          d={getRoadPath(cx, cy, HEX_SIZE, road)}
          className="road-path"
          opacity={opacity ?? 1}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Board component
// ---------------------------------------------------------------------------

export function Board({ state, onHexClick }: BoardProps) {
  const { hexes, phase, selectedDieIndex, selectedHex, pendingRoadRotation, placedDiceIds, dice } = state;

  const bounds = getBoardBounds(HEX_SIZE);
  const width = bounds.width + PADDING * 2;
  const height = bounds.height + PADDING * 2;
  const offsetX = -bounds.minX + PADDING;
  const offsetY = -bounds.minY + PADDING;

  // Determine which hexes are valid targets during placement
  const activeDie = selectedDieIndex !== null ? dice[selectedDieIndex] : null;
  const isSelectingHex = phase === 'placing' && activeDie !== null && selectedHex === null;
  const isPlacingJunk = phase === 'placing_junk';
  const isPlacingSpecial = phase === 'placing_special';

  function isValidTarget(hex: HexState): boolean {
    if (isPlacingJunk) return canPlaceJunkPile(hex);
    if (isPlacingSpecial) return canPlaceBuilding(hex);
    if (!isSelectingHex || !activeDie) return false;
    return activeDie.type === 'building'
      ? canPlaceBuilding(hex)
      : canPlaceRoad(hex);
  }

  function isSelected(hex: HexState): boolean {
    if (!selectedHex) return false;
    return hex.coord.col === selectedHex.col && hex.coord.row === selectedHex.row;
  }

  return (
    <svg
      className="board-svg"
      viewBox={`0 0 ${width.toFixed(1)} ${height.toFixed(1)}`}
      width={width}
      height={height}
    >
      <g transform={`translate(${offsetX.toFixed(2)}, ${offsetY.toFixed(2)})`}>
        {hexes.map((hex) => {
          const { x, y } = hexToPixel(hex.coord, HEX_SIZE);
          const points = hexPolygonPoints(x, y, HEX_SIZE);

          const scoringCx = x - HEX_SIZE * 0.38;
          const scoringCy = y + HEX_SIZE * 0.38;
          const scoringR = HEX_SIZE * 0.22;
          const showScore = hex.building !== null || hex.specialBuilding !== null || hex.junkPile;

          const valid = isValidTarget(hex);
          const selected = isSelected(hex);
          const hasContent = hex.building !== null || hex.specialBuilding !== null || hex.roads.length > 0 || hex.junkPile;

          let polyClass = 'hex-polygon';
          if (selected) polyClass += ' hex-selected';
          else if (valid) polyClass += ' hex-valid';
          else if (hasContent) polyClass += ' hex-built';
          else polyClass += ' hex-empty';

          const clickable = valid || selected;

          // Preview: show pending placement on the selected hex
          const showBuildingPreview = selected && activeDie?.type === 'building';
          const showRoadPreview = selected && activeDie?.type === 'road';

          return (
            <g
              key={`${hex.coord.col},${hex.coord.row}`}
              className={`hex-group ${clickable ? 'hex-clickable' : ''}`}
              onClick={clickable ? () => onHexClick(hex.coord) : undefined}
            >
              <polygon points={points} className={polyClass} />

              {/* Confirmed roads */}
              {hex.roads.length > 0 && (
                <RoadPaths cx={x} cy={y} roads={hex.roads} />
              )}

              {/* Confirmed building */}
              {hex.building && (
                <BuildingIcon type={hex.building} cx={x} cy={y} />
              )}

              {/* Special building */}
              {hex.specialBuilding && (
                <SpecialBuildingIcon defId={hex.specialBuilding} cx={x} cy={y} />
              )}

              {/* Junk pile */}
              {hex.junkPile && (
                <JunkPileIcon cx={x} cy={y} />
              )}

              {/* Preview: building placement */}
              {showBuildingPreview && (
                <BuildingIcon
                  type={activeDie!.face as BuildingType}
                  cx={x}
                  cy={y}
                  opacity={0.5}
                />
              )}

              {/* Preview: road placement */}
              {showRoadPreview && (
                <RoadPaths
                  cx={x}
                  cy={y}
                  roads={[{ type: activeDie!.face as RoadFace, rotation: pendingRoadRotation }]}
                  opacity={0.5}
                />
              )}

              {/* Scoring circle */}
              <circle
                cx={scoringCx}
                cy={scoringCy}
                r={scoringR}
                className={`scoring-circle ${hex.scoringCircleFilled ? 'scoring-filled' : ''} ${showScore ? 'scoring-has-value' : ''}`}
              />
              {showScore && (
                <text
                  x={scoringCx}
                  y={scoringCy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="score-label"
                >
                  {hex.score}
                </text>
              )}
            </g>
          );
        })}

        {/* Highway exit stubs */}
        {HIGHWAY_EXITS.map((exit, i) => {
          const { x: cx, y: cy } = hexToPixel(exit.coord, HEX_SIZE);
          const mid = getSideMidpoint(cx, cy, HEX_SIZE, exit.side);
          const angle = ((30 + 60 * exit.side) * Math.PI) / 180;
          const stubLen = HEX_SIZE * 0.6;
          const outerX = mid.x + stubLen * Math.cos(angle);
          const outerY = mid.y + stubLen * Math.sin(angle);
          return (
            <g key={`exit-${i}`}>
              <line
                x1={mid.x} y1={mid.y}
                x2={outerX} y2={outerY}
                className="road-path highway-exit-stub"
              />
              <circle cx={outerX} cy={outerY} r={4} className="highway-exit-marker" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
