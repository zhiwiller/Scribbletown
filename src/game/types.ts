// --- Board ---

export interface HexCoord {
  col: number;
  row: number;
}

export type BuildingType = 'neighborhood' | 'business' | 'factory' | 'farm' | 'park';

export interface Road {
  type: RoadFace;
  rotation: number; // 0-5
}

export interface HexState {
  coord: HexCoord;
  building: BuildingType | null;
  specialBuilding: string | null;
  roads: Road[];
  scoringCircleFilled: boolean;
  junkPile: boolean;
  score: number;
}

// --- Dice ---

export type BuildingFace = 'neighborhood' | 'business' | 'factory' | 'farm' | 'park';
export type RoadFace = 'straight' | 'sharp_turn' | 'slight_turn';
export type DieFace = BuildingFace | RoadFace;

export type DieType = 'building' | 'road';

export interface DieResult {
  id: number;
  type: DieType;
  face: DieFace;
  selected: boolean;
}

// --- Game Phase ---

export type GamePhase =
  | 'rolling'
  | 'selecting'
  | 'placing'
  | 'placing_junk'
  | 'selecting_special'
  | 'placing_special';

// --- Log ---

export interface LogEntry {
  turn: number;
  message: string;
}

// --- Game State ---

// --- Special Buildings ---

export interface SpecialBuildingDef {
  id: string;
  name: string;
  requiredBuildings: [BuildingFace, BuildingFace, BuildingFace];
  iconDescription: string;
  effectDescription: string;
}

export interface SpecialBuildingCard {
  defId: string;
  built: boolean;
}

export interface GameState {
  hexes: HexState[];
  dice: DieResult[];
  phase: GamePhase;
  turnNumber: number;
  log: LogEntry[];
  currentPlayer: number;
  // Placement state
  selectedDieIndex: number | null;
  selectedHex: HexCoord | null;
  pendingRoadRotation: number;
  placedDiceIds: number[];
  // Waste / junk pile state
  wasteCount: number;
  pendingJunkPiles: number;
  gameOver: boolean;
  // Special buildings
  specialBuildingCards: SpecialBuildingCard[];
  selectedSpecialCardIndex: number | null;
}

// --- Player Actions ---

export type PlayerAction =
  | { type: 'ROLL_DICE'; seed?: number }
  | { type: 'TOGGLE_DIE'; dieIndex: number }
  | { type: 'COMMIT_DICE' }
  | { type: 'SELECT_PLACEMENT_DIE'; dieId: number }
  | { type: 'SELECT_HEX'; coord: HexCoord }
  | { type: 'ROTATE_ROAD' }
  | { type: 'CONFIRM_PLACEMENT' }
  | { type: 'CANCEL_PLACEMENT' }
  | { type: 'PLACE_JUNK_PILE'; coord: HexCoord }
  | { type: 'BUILD_SPECIAL_BUILDING' }
  | { type: 'SELECT_SPECIAL_CARD'; cardIndex: number }
  | { type: 'PLACE_SPECIAL_BUILDING'; coord: HexCoord }
  | { type: 'CANCEL_SPECIAL_BUILDING' }
  | { type: 'RESTART' };
