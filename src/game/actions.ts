import {
  GameState,
  PlayerAction,
  LogEntry,
  HexCoord,
  HexState,
  BuildingFace,
  RoadFace,
  Road,
} from './types';
import { rollDice } from './dice';
import { createInitialState } from './setup';
import { roadsOverlap, roadsCross, getMaxRotations, getLegalRotations, getNextLegalRotation } from './roads';
import { updateAllScores, checkGameOver } from './scoring';
import { isCardEligible, hasEligibleSpecialBuilding, getSpecialBuildingDef } from './specialBuildings';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addLog(state: GameState, message: string): LogEntry[] {
  return [...state.log, { turn: state.turnNumber, message }];
}

function formatFace(face: string): string {
  return face.replace(/_/g, ' ');
}

function findHex(state: GameState, coord: HexCoord): HexState | undefined {
  return state.hexes.find(
    (h) => h.coord.col === coord.col && h.coord.row === coord.row,
  );
}

function updateHex(
  hexes: HexState[],
  coord: HexCoord,
  updater: (h: HexState) => HexState,
): HexState[] {
  return hexes.map((h) =>
    h.coord.col === coord.col && h.coord.row === coord.row ? updater(h) : h,
  );
}

/** A hex is empty when it has no building, no roads, no junk pile, no special building. */
export function isHexEmpty(hex: HexState): boolean {
  return hex.building === null && hex.specialBuilding === null && hex.roads.length === 0 && !hex.junkPile;
}

/** Can a building be placed here? Only in completely empty hexes. */
export function canPlaceBuilding(hex: HexState): boolean {
  return isHexEmpty(hex);
}

/** Can a road be placed here? Empty hex or hex with exactly one road (no building/junk/special). */
export function canPlaceRoad(hex: HexState): boolean {
  return hex.building === null && hex.specialBuilding === null && !hex.junkPile && hex.roads.length < 2;
}

/** Can a junk pile be placed here? Only in completely empty hexes. */
export function canPlaceJunkPile(hex: HexState): boolean {
  return isHexEmpty(hex);
}

// ---------------------------------------------------------------------------
// Waste track
// ---------------------------------------------------------------------------

/**
 * Waste track layout: 12 positions in rows of 3, 4, 5.
 * Positions 3, 7, and 12 trigger a junk pile.
 * Every position after 12 also triggers a junk pile.
 */
const JUNK_PILE_POSITIONS = new Set([3, 7, 12]);

export function wasteTriggersJunkPile(wastePosition: number): boolean {
  return JUNK_PILE_POSITIONS.has(wastePosition) || wastePosition > 12;
}

/** Get the active (selected but not yet placed) die, if any. */
function getActiveDie(state: GameState) {
  if (state.selectedDieIndex === null) return undefined;
  return state.dice[state.selectedDieIndex];
}

/** Transition after all dice placed: go to junk pile placement or next turn. */
function finishPlacement(state: GameState): GameState {
  if (state.pendingJunkPiles > 0) {
    return {
      ...state,
      phase: 'placing_junk',
      selectedDieIndex: null,
      selectedHex: null,
      pendingRoadRotation: 0,
    };
  }
  return advanceTurn(state);
}

/** Start a new turn: score, check game over, clear dice/placement state. */
function advanceTurn(state: GameState): GameState {
  const scoredHexes = updateAllScores(state);
  const isGameOver = checkGameOver(scoredHexes);
  return {
    ...state,
    hexes: scoredHexes,
    dice: [],
    phase: 'rolling',
    turnNumber: state.turnNumber + 1,
    selectedDieIndex: null,
    selectedHex: null,
    pendingRoadRotation: 0,
    placedDiceIds: [],
    gameOver: isGameOver,
  };
}

/** Add waste and compute any junk pile triggers. Returns updated counts. */
function addWaste(
  currentWaste: number,
  currentPending: number,
  amount: number,
): { wasteCount: number; pendingJunkPiles: number } {
  let waste = currentWaste;
  let pending = currentPending;
  for (let i = 0; i < amount; i++) {
    waste++;
    if (wasteTriggersJunkPile(waste)) {
      pending++;
    }
  }
  return { wasteCount: waste, pendingJunkPiles: pending };
}

// ---------------------------------------------------------------------------
// applyAction
// ---------------------------------------------------------------------------

/** Apply a player action to produce a new (immutable) game state. */
export function applyAction(state: GameState, action: PlayerAction): GameState {
  // Game over: only allow restart
  if (state.gameOver && action.type !== 'RESTART') return state;

  switch (action.type) {
    // ---- Rolling phase ----
    case 'ROLL_DICE': {
      if (state.phase !== 'rolling') return state;
      const dice = rollDice(action.seed);
      return {
        ...state,
        dice,
        phase: 'selecting',
        log: addLog(state, `Turn ${state.turnNumber}: Rolled dice.`),
      };
    }

    // ---- Selecting phase ----
    case 'TOGGLE_DIE': {
      if (state.phase !== 'selecting') return state;
      const { dieIndex } = action;
      if (dieIndex < 0 || dieIndex >= state.dice.length) return state;
      const dice = state.dice.map((d, i) =>
        i === dieIndex ? { ...d, selected: !d.selected } : d,
      );
      return { ...state, dice };
    }

    case 'COMMIT_DICE': {
      if (state.phase !== 'selecting') return state;
      const selectedCount = state.dice.filter((d) => d.selected).length;
      if (selectedCount !== 2) return state;

      const selected = state.dice.filter((d) => d.selected);
      const description = selected
        .map((d) => `${d.type} - ${formatFace(d.face)}`)
        .join(', ');

      return {
        ...state,
        phase: 'placing',
        selectedDieIndex: null,
        selectedHex: null,
        pendingRoadRotation: 0,
        placedDiceIds: [],
        log: addLog(
          state,
          `Turn ${state.turnNumber}: Committed ${description}.`,
        ),
      };
    }

    // ---- Placing phase ----
    case 'SELECT_PLACEMENT_DIE': {
      if (state.phase !== 'placing') return state;
      const { dieId } = action;
      const dieIdx = state.dice.findIndex((d) => d.id === dieId);
      if (dieIdx === -1) return state;
      const die = state.dice[dieIdx];
      if (!die.selected) return state; // must be a committed die
      if (state.placedDiceIds.includes(die.id)) return state; // already placed
      return {
        ...state,
        selectedDieIndex: dieIdx,
        selectedHex: null,
        pendingRoadRotation: 0,
      };
    }

    case 'SELECT_HEX': {
      if (state.phase !== 'placing') return state;
      const activeDie = getActiveDie(state);
      if (!activeDie) return state;
      const hex = findHex(state, action.coord);
      if (!hex) return state;

      if (activeDie.type === 'building' && !canPlaceBuilding(hex)) return state;
      if (activeDie.type === 'road' && !canPlaceRoad(hex)) return state;

      // For second road: start on first legal rotation
      let initialRotation = 0;
      if (activeDie.type === 'road' && hex.roads.length === 1) {
        const legal = getLegalRotations(activeDie.face as RoadFace, hex.roads[0]);
        if (legal.length === 0) return state; // no legal placement possible
        initialRotation = legal[0];
      }

      return {
        ...state,
        selectedHex: action.coord,
        pendingRoadRotation: initialRotation,
      };
    }

    case 'ROTATE_ROAD': {
      if (state.phase !== 'placing') return state;
      const die = getActiveDie(state);
      if (!die || die.type !== 'road') return state;
      if (!state.selectedHex) return state;
      const hex = findHex(state, state.selectedHex);
      const existingRoad = hex && hex.roads.length === 1 ? hex.roads[0] : null;
      const next = getNextLegalRotation(
        die.face as RoadFace,
        existingRoad,
        state.pendingRoadRotation,
      );
      if (next === -1) return state; // no legal rotations at all
      return {
        ...state,
        pendingRoadRotation: next,
      };
    }

    case 'CONFIRM_PLACEMENT': {
      if (state.phase !== 'placing') return state;
      const die = getActiveDie(state);
      if (!die || !state.selectedHex) return state;
      const hex = findHex(state, state.selectedHex);
      if (!hex) return state;

      let newHexes = state.hexes;
      let logMsg = '';
      let generatesWaste = false;

      if (die.type === 'building') {
        const buildingType = die.face as BuildingFace;
        if (!canPlaceBuilding(hex)) return state;
        newHexes = updateHex(newHexes, state.selectedHex, (h) => ({
          ...h,
          building: buildingType,
        }));
        logMsg = `Placed ${formatFace(buildingType)} at (${state.selectedHex.col},${state.selectedHex.row}).`;
        if (buildingType === 'factory') generatesWaste = true;
      } else {
        const roadType = die.face as RoadFace;
        const newRoad: Road = {
          type: roadType,
          rotation: state.pendingRoadRotation,
        };
        if (!canPlaceRoad(hex)) return state;
        // Prevent overlapping or crossing roads in same hex
        if (hex.roads.length > 0) {
          if (roadsOverlap(hex.roads[0], newRoad)) return state;
          if (roadsCross(hex.roads[0], newRoad)) return state;
        }
        const isSecondRoad = hex.roads.length === 1;
        const newRoads = [...hex.roads, newRoad];
        newHexes = updateHex(newHexes, state.selectedHex, (h) => ({
          ...h,
          roads: newRoads,
          scoringCircleFilled: newRoads.length >= 2,
        }));
        logMsg = `Placed ${formatFace(roadType)} road at (${state.selectedHex.col},${state.selectedHex.row}).`;
        if (isSecondRoad) generatesWaste = true;
      }

      // Waste tracking
      const wasteResult = generatesWaste
        ? addWaste(state.wasteCount, state.pendingJunkPiles, 1)
        : { wasteCount: state.wasteCount, pendingJunkPiles: state.pendingJunkPiles };

      let wasteLog = state.log;
      if (generatesWaste) {
        wasteLog = addLog(
          { ...state, log: addLog(state, `Turn ${state.turnNumber}: ${logMsg}`) },
          `Turn ${state.turnNumber}: Gained waste (${wasteResult.wasteCount} total).`,
        );
        if (wasteResult.pendingJunkPiles > state.pendingJunkPiles) {
          wasteLog = [...wasteLog, {
            turn: state.turnNumber,
            message: `Turn ${state.turnNumber}: Junk pile triggered!`,
          }];
        }
      } else {
        wasteLog = addLog(state, `Turn ${state.turnNumber}: ${logMsg}`);
      }

      const newPlacedIds = [...state.placedDiceIds, die.id];
      const committedDice = state.dice.filter((d) => d.selected);
      const allPlaced = committedDice.every((d) =>
        newPlacedIds.includes(d.id),
      );

      const intermediateState: GameState = {
        ...state,
        hexes: newHexes,
        selectedDieIndex: null,
        selectedHex: null,
        pendingRoadRotation: 0,
        placedDiceIds: newPlacedIds,
        wasteCount: wasteResult.wasteCount,
        pendingJunkPiles: wasteResult.pendingJunkPiles,
        log: wasteLog,
      };

      // Rescore after every placement
      const nextState: GameState = {
        ...intermediateState,
        hexes: updateAllScores(intermediateState),
      };

      // Auto-advance when both dice have been placed
      if (allPlaced) {
        return finishPlacement(nextState);
      }
      return nextState;
    }

    case 'CANCEL_PLACEMENT': {
      if (state.phase !== 'placing') return state;
      if (state.selectedHex !== null) {
        // Go back to hex selection
        return { ...state, selectedHex: null, pendingRoadRotation: 0 };
      }
      if (state.selectedDieIndex !== null) {
        // Go back to die selection
        return { ...state, selectedDieIndex: null };
      }
      return state;
    }

    // ---- Junk pile placement phase ----
    case 'PLACE_JUNK_PILE': {
      if (state.phase !== 'placing_junk') return state;
      if (state.pendingJunkPiles <= 0) return state;
      const hex = findHex(state, action.coord);
      if (!hex || !canPlaceJunkPile(hex)) return state;

      const newHexes = updateHex(state.hexes, action.coord, (h) => ({
        ...h,
        junkPile: true,
      }));
      const remaining = state.pendingJunkPiles - 1;
      const intermediateJunk: GameState = {
        ...state,
        hexes: newHexes,
        pendingJunkPiles: remaining,
        log: addLog(
          state,
          `Turn ${state.turnNumber}: Placed junk pile at (${action.coord.col},${action.coord.row}).`,
        ),
      };

      // Rescore after every placement
      const nextJunkState: GameState = {
        ...intermediateJunk,
        hexes: updateAllScores(intermediateJunk),
      };

      if (remaining <= 0) {
        return advanceTurn(nextJunkState);
      }
      return nextJunkState;
    }

    // ---- Special building flow ----
    case 'BUILD_SPECIAL_BUILDING': {
      if (state.phase !== 'selecting') return state;
      if (!hasEligibleSpecialBuilding(state)) return state;
      return {
        ...state,
        phase: 'selecting_special',
      };
    }

    case 'SELECT_SPECIAL_CARD': {
      if (state.phase !== 'selecting_special') return state;
      const card = state.specialBuildingCards[action.cardIndex];
      if (!card || !isCardEligible(state, card)) return state;
      return {
        ...state,
        phase: 'placing_special',
        selectedSpecialCardIndex: action.cardIndex,
      };
    }

    case 'PLACE_SPECIAL_BUILDING': {
      if (state.phase !== 'placing_special') return state;
      if (state.selectedSpecialCardIndex === null) return state;
      const card = state.specialBuildingCards[state.selectedSpecialCardIndex];
      if (!card) return state;
      const def = getSpecialBuildingDef(card.defId);
      if (!def) return state;
      const hex = findHex(state, action.coord);
      if (!hex || !canPlaceBuilding(hex)) return state;

      // Place the special building on the hex
      const newHexes = updateHex(state.hexes, action.coord, (h) => ({
        ...h,
        specialBuilding: def.id,
      }));

      // Mark card as built
      const newCards = state.specialBuildingCards.map((c, i) =>
        i === state.selectedSpecialCardIndex ? { ...c, built: true } : c,
      );

      // Collect waste: 1 base + 1 extra for Fast Food
      const wasteAmount = def.id === 'fast_food' ? 2 : 1;
      const wasteResult = addWaste(state.wasteCount, state.pendingJunkPiles, wasteAmount);
      let newLog = addLog(
        state,
        `Turn ${state.turnNumber}: Built ${def.name} at (${action.coord.col},${action.coord.row}).`,
      );
      newLog = [...newLog, {
        turn: state.turnNumber,
        message: `Turn ${state.turnNumber}: Gained waste (${wasteResult.wasteCount} total).`,
      }];
      if (wasteResult.pendingJunkPiles > state.pendingJunkPiles) {
        newLog = [...newLog, {
          turn: state.turnNumber,
          message: `Turn ${state.turnNumber}: Junk pile triggered!`,
        }];
      }

      const intermediateSpecial: GameState = {
        ...state,
        hexes: newHexes,
        specialBuildingCards: newCards,
        selectedSpecialCardIndex: null,
        wasteCount: wasteResult.wasteCount,
        pendingJunkPiles: wasteResult.pendingJunkPiles,
        log: newLog,
      };

      // Rescore after placement
      const scoredSpecial: GameState = {
        ...intermediateSpecial,
        hexes: updateAllScores(intermediateSpecial),
      };

      // Go to junk placement or advance turn
      return finishPlacement(scoredSpecial);
    }

    case 'CANCEL_SPECIAL_BUILDING': {
      if (state.phase === 'placing_special') {
        return {
          ...state,
          phase: 'selecting_special',
          selectedSpecialCardIndex: null,
        };
      }
      if (state.phase === 'selecting_special') {
        return {
          ...state,
          phase: 'selecting',
        };
      }
      return state;
    }

    // ---- Global ----
    case 'RESTART': {
      return createInitialState();
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// getLegalActions
// ---------------------------------------------------------------------------

/** Return the list of legal actions for the current game state. */
export function getLegalActions(state: GameState): PlayerAction[] {
  const actions: PlayerAction[] = [{ type: 'RESTART' }];
  if (state.gameOver) return actions;

  switch (state.phase) {
    case 'rolling':
      actions.push({ type: 'ROLL_DICE' });
      break;

    case 'selecting':
      for (let i = 0; i < state.dice.length; i++) {
        actions.push({ type: 'TOGGLE_DIE', dieIndex: i });
      }
      if (state.dice.filter((d) => d.selected).length === 2) {
        actions.push({ type: 'COMMIT_DICE' });
      }
      if (hasEligibleSpecialBuilding(state)) {
        actions.push({ type: 'BUILD_SPECIAL_BUILDING' });
      }
      break;

    case 'selecting_special': {
      state.specialBuildingCards.forEach((card, i) => {
        if (isCardEligible(state, card)) {
          actions.push({ type: 'SELECT_SPECIAL_CARD', cardIndex: i });
        }
      });
      actions.push({ type: 'CANCEL_SPECIAL_BUILDING' });
      break;
    }

    case 'placing_special': {
      for (const hex of state.hexes) {
        if (canPlaceBuilding(hex)) {
          actions.push({ type: 'PLACE_SPECIAL_BUILDING', coord: hex.coord });
        }
      }
      actions.push({ type: 'CANCEL_SPECIAL_BUILDING' });
      break;
    }

    case 'placing': {
      if (state.selectedDieIndex === null) {
        // Choose a die
        const committed = state.dice.filter((d) => d.selected);
        for (const d of committed) {
          if (!state.placedDiceIds.includes(d.id)) {
            actions.push({ type: 'SELECT_PLACEMENT_DIE', dieId: d.id });
          }
        }
      } else if (state.selectedHex === null) {
        // Choose a hex — emit all valid hexes
        const die = state.dice[state.selectedDieIndex];
        for (const hex of state.hexes) {
          const valid =
            die.type === 'building'
              ? canPlaceBuilding(hex)
              : canPlaceRoad(hex);
          if (valid) {
            actions.push({ type: 'SELECT_HEX', coord: hex.coord });
          }
        }
        actions.push({ type: 'CANCEL_PLACEMENT' });
      } else {
        // Confirm or rotate
        const die = state.dice[state.selectedDieIndex];
        if (die.type === 'road') {
          actions.push({ type: 'ROTATE_ROAD' });
        }
        actions.push({ type: 'CONFIRM_PLACEMENT' });
        actions.push({ type: 'CANCEL_PLACEMENT' });
      }
      break;
    }

    case 'placing_junk': {
      for (const hex of state.hexes) {
        if (canPlaceJunkPile(hex)) {
          actions.push({ type: 'PLACE_JUNK_PILE', coord: hex.coord });
        }
      }
      break;
    }
  }

  return actions;
}
