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
                <span className="die-face">{formatFace(die.face)}</span>
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
                  <span className="die-face">{formatFace(die.face)}</span>
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
