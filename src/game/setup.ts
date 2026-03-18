import { GameState } from './types';
import { createInitialHexes } from './board';
import { drawSpecialBuildingCards } from './specialBuildings';

export function createInitialState(): GameState {
  return {
    hexes: createInitialHexes(),
    dice: [],
    phase: 'rolling',
    turnNumber: 1,
    log: [],
    currentPlayer: 0,
    selectedDieIndex: null,
    selectedHex: null,
    pendingRoadRotation: 0,
    placedDiceIds: [],
    wasteCount: 0,
    pendingJunkPiles: 0,
    gameOver: false,
    specialBuildingCards: drawSpecialBuildingCards(),
    selectedSpecialCardIndex: null,
  };
}
