import { useReducer, useCallback } from 'react';
import { GameState, PlayerAction, HexCoord } from '../game/types';
import { applyAction } from '../game/actions';
import { createInitialState } from '../game/setup';
import { getTotalScore, computeRoadBonus } from '../game/scoring';
import { Board } from './Board';
import { DicePanel } from './DicePanel';
import { WasteTrack } from './WasteTrack';
import { MoveLog } from './MoveLog';
import { SpecialBuildingsPanel } from './SpecialBuildingsPanel';
import { RulesReference } from './RulesReference';
import { hasEligibleSpecialBuilding } from '../game/specialBuildings';
import './App.css';

function gameReducer(state: GameState, action: PlayerAction): GameState {
  return applyAction(state, action);
}

export function App() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);

  const handleRestart = useCallback(() => dispatch({ type: 'RESTART' }), []);

  const hexScore = getTotalScore(state.hexes);
  const roadBonus = computeRoadBonus(state);
  const totalScore = hexScore + roadBonus;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Scribbletown</h1>
        <div className="turn-info">
          Turn {state.turnNumber} &middot; Phase: {state.phase}
          {' '}&middot; Score: {totalScore}
          {roadBonus > 0 && <span className="road-bonus-info"> (Road Bonus: {roadBonus})</span>}
        </div>
        <button className="restart-btn" onClick={handleRestart}>
          Restart
        </button>
      </header>

      {state.gameOver && (
        <div className="game-over-banner">
          <span className="game-over-text">Game Over!</span>
          <span className="game-over-score">
            Final Score: {totalScore}
            {roadBonus > 0 && ` (Hexes: ${hexScore} + Road Bonus: ${roadBonus})`}
          </span>
        </div>
      )}

      <main className="app-main">
        <section className="board-section">
          <Board
            state={state}
            onHexClick={(coord: HexCoord) => {
              if (state.phase === 'placing_junk') {
                dispatch({ type: 'PLACE_JUNK_PILE', coord });
              } else if (state.phase === 'placing_special') {
                dispatch({ type: 'PLACE_SPECIAL_BUILDING', coord });
              } else {
                dispatch({ type: 'SELECT_HEX', coord });
              }
            }}
          />
          <SpecialBuildingsPanel
            state={state}
            onSelectCard={(i: number) => dispatch({ type: 'SELECT_SPECIAL_CARD', cardIndex: i })}
            onCancel={() => dispatch({ type: 'CANCEL_SPECIAL_BUILDING' })}
          />
          <RulesReference />
        </section>

        <aside className="side-panel">
          <DicePanel
            dice={state.dice}
            phase={state.phase}
            selectedDieIndex={state.selectedDieIndex}
            selectedHex={state.selectedHex}
            placedDiceIds={state.placedDiceIds}
            onRoll={() => dispatch({ type: 'ROLL_DICE' })}
            onToggle={(i: number) => dispatch({ type: 'TOGGLE_DIE', dieIndex: i })}
            onCommit={() => dispatch({ type: 'COMMIT_DICE' })}
            onSelectPlacementDie={(id: number) => dispatch({ type: 'SELECT_PLACEMENT_DIE', dieId: id })}
            onRotateRoad={() => dispatch({ type: 'ROTATE_ROAD' })}
            onConfirmPlacement={() => dispatch({ type: 'CONFIRM_PLACEMENT' })}
            onCancelPlacement={() => dispatch({ type: 'CANCEL_PLACEMENT' })}
            pendingJunkPiles={state.pendingJunkPiles}
            canBuildSpecial={hasEligibleSpecialBuilding(state)}
            onBuildSpecial={() => dispatch({ type: 'BUILD_SPECIAL_BUILDING' })}
          />
          <WasteTrack
            wasteCount={state.wasteCount}
            pendingJunkPiles={state.pendingJunkPiles}
          />
          <MoveLog log={state.log} />
        </aside>
      </main>

    </div>
  );
}
