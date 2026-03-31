import { DieResult, GamePhase, HexCoord } from '../game/types';
import './DicePanel.css';

interface DicePanelProps {
  dice: DieResult[];
  phase: GamePhase;
  selectedDieIndex: number | null;
  selectedHex: HexCoord | null;
  placedDiceIds: number[];
  pendingJunkPiles: number;
  canBuildSpecial: boolean;
  onRoll: () => void;
  onToggle: (index: number) => void;
  onCommit: () => void;
  onSelectPlacementDie: (dieId: number) => void;
  onRotateRoad: () => void;
  onConfirmPlacement: () => void;
  onCancelPlacement: () => void;
  onBuildSpecial: () => void;
}

function formatFace(face: string): string {
  return face
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function DieIcon({ face }: { face: string }) {
  const s = 20; // icon size
  let content: React.ReactNode = null;
  switch (face) {
    case 'park':
      content = (
        <>
          <circle cx="0" cy="-4" r="8" fill="#3a7a3a" stroke="#2a5a2a" strokeWidth="1.2" />
          <rect x="-1" y="-2" width="2" height="10" rx="0.5" fill="#6a4a2a" />
        </>
      );
      break;
    case 'neighborhood':
      content = (
        <>
          <path d="M0,-10 L8,-3 L8,8 L-8,8 L-8,-3 Z" fill="#6ec6a0" stroke="#3a8a6a" strokeWidth="1.2" />
          <rect x="-2.5" y="2" width="5" height="6" rx="0.5" fill="#3a8a6a" />
          <polygon points="-9,-3 0,-10 9,-3" fill="#4daa80" stroke="#3a8a6a" strokeWidth="1" />
        </>
      );
      break;
    case 'business':
      content = (
        <>
          <path d="M-7,-4 L-4,-4 L-1,5 L7,5 L8,-1 L-2,-1" fill="none" stroke="#d4a030" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="0" cy="8" r="1.8" fill="#d4a030" />
          <circle cx="5.5" cy="8" r="1.8" fill="#d4a030" />
        </>
      );
      break;
    case 'factory':
      content = (
        <>
          <rect x="-9" y="-1" width="18" height="10" rx="1" fill="#8888bb" stroke="#5555aa" strokeWidth="1.2" />
          <rect x="4" y="-9" width="4" height="8" rx="0.5" fill="#7777aa" stroke="#5555aa" strokeWidth="1" />
          <ellipse cx="6" cy="-10" rx="3" ry="1.5" fill="#aaa" opacity="0.6" />
        </>
      );
      break;
    case 'farm':
      content = (
        <>
          <path d="M-9,8 L-9,-1 L-1,-8 L7,-1 L7,8 Z" fill="#c47040" stroke="#8a4a28" strokeWidth="1.2" />
          <rect x="-3" y="2" width="4" height="6" rx="0.5" fill="#8a4a28" />
          <rect x="8" y="-2" width="4" height="10" rx="2" fill="#c4a060" stroke="#8a7a38" strokeWidth="1" />
        </>
      );
      break;
    default:
      return null;
  }
  return (
    <svg className="die-icon" width={s} height={s} viewBox="-12 -12 24 24">
      {content}
    </svg>
  );
}

export function DicePanel({
  dice,
  phase,
  selectedDieIndex,
  selectedHex,
  placedDiceIds,
  pendingJunkPiles,
  canBuildSpecial,
  onRoll,
  onToggle,
  onCommit,
  onSelectPlacementDie,
  onRotateRoad,
  onConfirmPlacement,
  onCancelPlacement,
  onBuildSpecial,
}: DicePanelProps) {
  const selectedCount = dice.filter((d) => d.selected).length;
  const canCommit = selectedCount === 2;

  // In placing phase, only show the two committed dice
  const committedDice = phase === 'placing' ? dice.filter((d) => d.selected) : [];
  const activeDie = selectedDieIndex !== null ? dice[selectedDieIndex] : null;

  return (
    <div className="dice-panel">
      <h2>Dice</h2>

      {/* Rolling phase */}
      {phase === 'rolling' && (
        <button className="btn btn-roll" onClick={onRoll}>
          Roll Dice
        </button>
      )}

      {/* Selecting phase: show all 4 dice */}
      {phase === 'selecting' && dice.length > 0 && (
        <>
          <div className="dice-list">
            {dice.map((die) => (
              <button
                key={die.id}
                className={`die ${die.type} ${die.selected ? 'selected' : ''}`}
                onClick={() => onToggle(die.id)}
              >
                <span className="die-type">
                  {die.type === 'building' ? 'Building' : 'Road'}
                </span>
                <span className="die-face"><DieIcon face={die.face} />{formatFace(die.face)}</span>
              </button>
            ))}
          </div>
          <div className="dice-actions">
            <span className="selection-count">{selectedCount}/2 selected</span>
            <button
              className="btn btn-commit"
              onClick={onCommit}
              disabled={!canCommit}
            >
              Commit
            </button>
            {canBuildSpecial && (
              <button className="btn btn-special" onClick={onBuildSpecial}>
                Build Special Building
              </button>
            )}
          </div>
        </>
      )}

      {/* Placing phase: show committed dice with placement controls */}
      {phase === 'placing' && (
        <>
          <div className="dice-list">
            {committedDice.map((die) => {
              const placed = placedDiceIds.includes(die.id);
              const isActive = activeDie?.id === die.id;
              let cls = `die ${die.type}`;
              if (placed) cls += ' placed';
              else if (isActive) cls += ' active-die';

              return (
                <button
                  key={die.id}
                  className={cls}
                  onClick={() => !placed && onSelectPlacementDie(die.id)}
                  disabled={placed}
                >
                  <span className="die-type">
                    {die.type === 'building' ? 'Building' : 'Road'}
                  </span>
                  <span className="die-face"><DieIcon face={die.face} />{formatFace(die.face)}</span>
                  {placed && <span className="die-status">Placed</span>}
                </button>
              );
            })}
          </div>

          {/* Instructions / controls based on sub-state */}
          {activeDie === null && (
            <p className="placement-hint">Select a die to place.</p>
          )}

          {activeDie !== null && selectedHex === null && (
            <div className="dice-actions">
              <p className="placement-hint">
                Select a hex to place your {formatFace(activeDie.face)}.
              </p>
              <button className="btn btn-cancel" onClick={onCancelPlacement}>
                Back
              </button>
            </div>
          )}

          {activeDie !== null && selectedHex !== null && (
            <div className="dice-actions placement-confirm-row">
              <span className="placement-hint">
                Place at ({selectedHex.col},{selectedHex.row})?
              </span>
              {activeDie.type === 'road' && (
                <button className="btn btn-rotate" onClick={onRotateRoad}>
                  Rotate
                </button>
              )}
              <button className="btn btn-confirm" onClick={onConfirmPlacement}>
                Confirm
              </button>
              <button className="btn btn-cancel" onClick={onCancelPlacement}>
                Cancel
              </button>
            </div>
          )}
        </>
      )}
      {/* Junk pile placement phase */}
      {phase === 'placing_junk' && (
        <div className="dice-actions">
          <p className="placement-hint junk-hint">
            Place {pendingJunkPiles} junk pile{pendingJunkPiles !== 1 ? 's' : ''} on empty hex{pendingJunkPiles !== 1 ? 'es' : ''}.
          </p>
        </div>
      )}
    </div>
  );
}
