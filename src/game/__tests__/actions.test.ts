import { describe, it, expect, beforeEach } from 'vitest';
import { applyAction, getLegalActions, wasteTriggersJunkPile, canPlaceBuilding, canPlaceJunkPile } from '../actions';
import { createInitialState } from '../setup';
import { GameState, HexState } from '../types';

/** Helper: roll with seed and commit dice 0 + 2 → placing phase */
function rollAndCommit(state: GameState, seed = 1): GameState {
  let s = applyAction(state, { type: 'ROLL_DICE', seed });
  s = applyAction(s, { type: 'TOGGLE_DIE', dieIndex: 0 });
  s = applyAction(s, { type: 'TOGGLE_DIE', dieIndex: 2 });
  s = applyAction(s, { type: 'COMMIT_DICE' });
  return s;
}

describe('Actions', () => {
  let state: GameState;

  beforeEach(() => {
    state = createInitialState();
  });

  describe('initial state', () => {
    it('starts in rolling phase', () => {
      expect(state.phase).toBe('rolling');
    });

    it('starts on turn 1', () => {
      expect(state.turnNumber).toBe(1);
    });

    it('has 24 hexes', () => {
      expect(state.hexes).toHaveLength(24);
    });

    it('has no dice', () => {
      expect(state.dice).toHaveLength(0);
    });

    it('has empty log', () => {
      expect(state.log).toHaveLength(0);
    });

    it('has null placement state', () => {
      expect(state.selectedDieIndex).toBeNull();
      expect(state.selectedHex).toBeNull();
      expect(state.placedDiceIds).toEqual([]);
    });

    it('has zero waste and no pending junk piles', () => {
      expect(state.wasteCount).toBe(0);
      expect(state.pendingJunkPiles).toBe(0);
    });

    it('all hexes have junkPile false', () => {
      expect(state.hexes.every((h) => h.junkPile === false)).toBe(true);
    });
  });

  describe('ROLL_DICE', () => {
    it('transitions from rolling to selecting', () => {
      const next = applyAction(state, { type: 'ROLL_DICE', seed: 1 });
      expect(next.phase).toBe('selecting');
      expect(next.dice).toHaveLength(4);
    });

    it('is ignored if not in rolling phase', () => {
      const rolled = applyAction(state, { type: 'ROLL_DICE', seed: 1 });
      const again = applyAction(rolled, { type: 'ROLL_DICE', seed: 2 });
      expect(again).toBe(rolled);
    });

    it('adds a log entry', () => {
      const next = applyAction(state, { type: 'ROLL_DICE', seed: 1 });
      expect(next.log).toHaveLength(1);
    });
  });

  describe('TOGGLE_DIE', () => {
    it('selects and deselects a die', () => {
      let s = applyAction(state, { type: 'ROLL_DICE', seed: 1 });
      s = applyAction(s, { type: 'TOGGLE_DIE', dieIndex: 0 });
      expect(s.dice[0].selected).toBe(true);
      s = applyAction(s, { type: 'TOGGLE_DIE', dieIndex: 0 });
      expect(s.dice[0].selected).toBe(false);
    });

    it('is ignored outside selecting phase', () => {
      const toggled = applyAction(state, { type: 'TOGGLE_DIE', dieIndex: 0 });
      expect(toggled).toBe(state);
    });
  });

  describe('COMMIT_DICE', () => {
    it('requires exactly 2 selected dice', () => {
      let s = applyAction(state, { type: 'ROLL_DICE', seed: 1 });
      s = applyAction(s, { type: 'TOGGLE_DIE', dieIndex: 0 });
      const noCommit = applyAction(s, { type: 'COMMIT_DICE' });
      expect(noCommit.phase).toBe('selecting');

      s = applyAction(s, { type: 'TOGGLE_DIE', dieIndex: 2 });
      const committed = applyAction(s, { type: 'COMMIT_DICE' });
      expect(committed.phase).toBe('placing');
    });

    it('adds a log entry on commit', () => {
      const s = rollAndCommit(state);
      expect(s.log).toHaveLength(2);
    });

    it('initialises placement state', () => {
      const s = rollAndCommit(state);
      expect(s.selectedDieIndex).toBeNull();
      expect(s.selectedHex).toBeNull();
      expect(s.placedDiceIds).toEqual([]);
    });
  });

  describe('Placement flow', () => {
    it('SELECT_PLACEMENT_DIE sets selectedDieIndex', () => {
      let s = rollAndCommit(state);
      const dieId = s.dice.filter((d) => d.selected)[0].id;
      s = applyAction(s, { type: 'SELECT_PLACEMENT_DIE', dieId });
      expect(s.selectedDieIndex).not.toBeNull();
    });

    it('SELECT_HEX sets selectedHex for valid target', () => {
      let s = rollAndCommit(state);
      const commitDie = s.dice.filter((d) => d.selected)[0];
      s = applyAction(s, { type: 'SELECT_PLACEMENT_DIE', dieId: commitDie.id });
      // All hexes are empty so any should be valid
      s = applyAction(s, { type: 'SELECT_HEX', coord: { col: 0, row: 0 } });
      expect(s.selectedHex).toEqual({ col: 0, row: 0 });
    });

    it('SELECT_HEX rejects invalid hex for building (occupied)', () => {
      let s = rollAndCommit(state);
      // Place a building first
      const die1 = s.dice.filter((d) => d.selected)[0];
      if (die1.type === 'building') {
        s = applyAction(s, { type: 'SELECT_PLACEMENT_DIE', dieId: die1.id });
        s = applyAction(s, { type: 'SELECT_HEX', coord: { col: 0, row: 0 } });
        s = applyAction(s, { type: 'CONFIRM_PLACEMENT' });
        // Now try to place on same hex with second die
        const die2 = s.dice.filter((d) => d.selected && !s.placedDiceIds.includes(d.id))[0];
        if (die2 && die2.type === 'building') {
          s = applyAction(s, { type: 'SELECT_PLACEMENT_DIE', dieId: die2.id });
          const before = s.selectedHex;
          s = applyAction(s, { type: 'SELECT_HEX', coord: { col: 0, row: 0 } });
          expect(s.selectedHex).toBe(before); // rejected
        }
      }
    });

    it('CONFIRM_PLACEMENT places a building', () => {
      let s = rollAndCommit(state);
      const die1 = s.dice.filter((d) => d.selected)[0];
      s = applyAction(s, { type: 'SELECT_PLACEMENT_DIE', dieId: die1.id });
      s = applyAction(s, { type: 'SELECT_HEX', coord: { col: 0, row: 0 } });
      s = applyAction(s, { type: 'CONFIRM_PLACEMENT' });

      if (die1.type === 'building') {
        const hex = s.hexes.find(
          (h) => h.coord.col === 0 && h.coord.row === 0,
        )!;
        expect(hex.building).toBe(die1.face);
      } else {
        const hex = s.hexes.find(
          (h) => h.coord.col === 0 && h.coord.row === 0,
        )!;
        expect(hex.roads).toHaveLength(1);
      }
      expect(s.placedDiceIds).toContain(die1.id);
      expect(s.selectedDieIndex).toBeNull();
    });

    it('ROTATE_ROAD increments pendingRoadRotation', () => {
      let s = rollAndCommit(state);
      const roadDie = s.dice.find((d) => d.selected && d.type === 'road');
      if (roadDie) {
        s = applyAction(s, { type: 'SELECT_PLACEMENT_DIE', dieId: roadDie.id });
        s = applyAction(s, { type: 'SELECT_HEX', coord: { col: 0, row: 0 } });
        expect(s.pendingRoadRotation).toBe(0);
        s = applyAction(s, { type: 'ROTATE_ROAD' });
        expect(s.pendingRoadRotation).toBe(1);
      }
    });

    it('CANCEL_PLACEMENT backs up one step', () => {
      let s = rollAndCommit(state);
      const die1 = s.dice.filter((d) => d.selected)[0];
      s = applyAction(s, { type: 'SELECT_PLACEMENT_DIE', dieId: die1.id });
      s = applyAction(s, { type: 'SELECT_HEX', coord: { col: 0, row: 0 } });
      expect(s.selectedHex).not.toBeNull();

      // Cancel goes back to hex selection
      s = applyAction(s, { type: 'CANCEL_PLACEMENT' });
      expect(s.selectedHex).toBeNull();
      expect(s.selectedDieIndex).not.toBeNull();

      // Cancel again goes back to die selection
      s = applyAction(s, { type: 'CANCEL_PLACEMENT' });
      expect(s.selectedDieIndex).toBeNull();
    });

    it('auto-advances to rolling after both dice placed', () => {
      let s = rollAndCommit(state);
      const committed = s.dice.filter((d) => d.selected);

      // Place first die
      s = applyAction(s, { type: 'SELECT_PLACEMENT_DIE', dieId: committed[0].id });
      s = applyAction(s, { type: 'SELECT_HEX', coord: { col: 0, row: 0 } });
      s = applyAction(s, { type: 'CONFIRM_PLACEMENT' });
      expect(s.phase).toBe('placing'); // still placing

      // Place second die
      s = applyAction(s, { type: 'SELECT_PLACEMENT_DIE', dieId: committed[1].id });
      s = applyAction(s, { type: 'SELECT_HEX', coord: { col: 1, row: 0 } });
      s = applyAction(s, { type: 'CONFIRM_PLACEMENT' });
      expect(s.phase).toBe('rolling'); // auto-advanced
      expect(s.turnNumber).toBe(2);
      expect(s.dice).toHaveLength(0);
    });
  });

  describe('Waste & Junk Piles', () => {
    it('wasteTriggersJunkPile at positions 3, 7, 12, and >12', () => {
      expect(wasteTriggersJunkPile(1)).toBe(false);
      expect(wasteTriggersJunkPile(2)).toBe(false);
      expect(wasteTriggersJunkPile(3)).toBe(true);
      expect(wasteTriggersJunkPile(6)).toBe(false);
      expect(wasteTriggersJunkPile(7)).toBe(true);
      expect(wasteTriggersJunkPile(11)).toBe(false);
      expect(wasteTriggersJunkPile(12)).toBe(true);
      expect(wasteTriggersJunkPile(13)).toBe(true);
      expect(wasteTriggersJunkPile(14)).toBe(true);
    });

    it('placing a factory generates waste', () => {
      // Seed 42 gives building dice[0]=business, dice[1]=factory; we need factory
      // We'll construct a state manually for deterministic testing
      let s = rollAndCommit(state);
      const factoryDie = s.dice.find((d) => d.selected && d.face === 'factory');
      if (factoryDie) {
        s = applyAction(s, { type: 'SELECT_PLACEMENT_DIE', dieId: factoryDie.id });
        s = applyAction(s, { type: 'SELECT_HEX', coord: { col: 0, row: 0 } });
        const beforeWaste = s.wasteCount;
        s = applyAction(s, { type: 'CONFIRM_PLACEMENT' });
        expect(s.wasteCount).toBe(beforeWaste + 1);
      }
    });

    it('placing a non-factory building does NOT generate waste', () => {
      let s = rollAndCommit(state);
      const buildingDie = s.dice.find(
        (d) => d.selected && d.type === 'building' && d.face !== 'factory',
      );
      if (buildingDie) {
        s = applyAction(s, { type: 'SELECT_PLACEMENT_DIE', dieId: buildingDie.id });
        s = applyAction(s, { type: 'SELECT_HEX', coord: { col: 0, row: 0 } });
        s = applyAction(s, { type: 'CONFIRM_PLACEMENT' });
        expect(s.wasteCount).toBe(0);
      }
    });

    it('junk pile blocks building and junk pile placement', () => {
      const hex: HexState = {
        coord: { col: 0, row: 0 },
        building: null,
        specialBuilding: null,
        roads: [],
        scoringCircleFilled: false,
        junkPile: true,
        score: 0,
      };
      expect(canPlaceBuilding(hex)).toBe(false);
      expect(canPlaceJunkPile(hex)).toBe(false);
    });

    it('PLACE_JUNK_PILE places junk and advances turn when done', () => {
      // Create a state in placing_junk phase with 1 pending junk pile
      let s: GameState = {
        ...createInitialState(),
        phase: 'placing_junk',
        pendingJunkPiles: 1,
        wasteCount: 3,
        turnNumber: 1,
      };
      s = applyAction(s, { type: 'PLACE_JUNK_PILE', coord: { col: 0, row: 0 } });
      const hex = s.hexes.find(
        (h) => h.coord.col === 0 && h.coord.row === 0,
      )!;
      expect(hex.junkPile).toBe(true);
      expect(s.pendingJunkPiles).toBe(0);
      expect(s.phase).toBe('rolling');
      expect(s.turnNumber).toBe(2);
    });

    it('PLACE_JUNK_PILE rejected on non-empty hex', () => {
      let s: GameState = {
        ...createInitialState(),
        phase: 'placing_junk',
        pendingJunkPiles: 1,
        wasteCount: 3,
      };
      // Put a building on hex (0,0)
      s = {
        ...s,
        hexes: s.hexes.map((h) =>
          h.coord.col === 0 && h.coord.row === 0
            ? { ...h, building: 'neighborhood' as const }
            : h,
        ),
      };
      const before = s;
      s = applyAction(s, { type: 'PLACE_JUNK_PILE', coord: { col: 0, row: 0 } });
      expect(s).toBe(before); // rejected
    });

    it('getLegalActions includes PLACE_JUNK_PILE in placing_junk phase', () => {
      const s: GameState = {
        ...createInitialState(),
        phase: 'placing_junk',
        pendingJunkPiles: 1,
        wasteCount: 3,
      };
      const actions = getLegalActions(s);
      expect(actions.some((a) => a.type === 'PLACE_JUNK_PILE')).toBe(true);
    });
  });

  describe('Game Over', () => {
    it('initial state is not game over', () => {
      expect(state.gameOver).toBe(false);
    });

    it('blocks all actions except RESTART when gameOver', () => {
      const over: GameState = { ...state, gameOver: true };
      const rolled = applyAction(over, { type: 'ROLL_DICE', seed: 1 });
      expect(rolled).toBe(over); // blocked
    });

    it('RESTART works even when gameOver', () => {
      const over: GameState = { ...state, gameOver: true };
      const restarted = applyAction(over, { type: 'RESTART' });
      expect(restarted.gameOver).toBe(false);
      expect(restarted.phase).toBe('rolling');
    });

    it('getLegalActions returns only RESTART when gameOver', () => {
      const over: GameState = { ...state, gameOver: true };
      const actions = getLegalActions(over);
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('RESTART');
    });
  });

  describe('RESTART', () => {
    it('resets to initial state', () => {
      let s = applyAction(state, { type: 'ROLL_DICE', seed: 1 });
      s = applyAction(s, { type: 'RESTART' });
      expect(s.phase).toBe('rolling');
      expect(s.turnNumber).toBe(1);
      expect(s.dice).toHaveLength(0);
      expect(s.log).toHaveLength(0);
    });
  });

  describe('getLegalActions', () => {
    it('allows ROLL_DICE in rolling phase', () => {
      const actions = getLegalActions(state);
      expect(actions.some((a) => a.type === 'ROLL_DICE')).toBe(true);
      expect(actions.some((a) => a.type === 'COMMIT_DICE')).toBe(false);
    });

    it('allows TOGGLE_DIE and conditionally COMMIT in selecting phase', () => {
      let s = applyAction(state, { type: 'ROLL_DICE', seed: 1 });
      let actions = getLegalActions(s);
      expect(actions.some((a) => a.type === 'TOGGLE_DIE')).toBe(true);
      expect(actions.some((a) => a.type === 'COMMIT_DICE')).toBe(false);

      s = applyAction(s, { type: 'TOGGLE_DIE', dieIndex: 0 });
      s = applyAction(s, { type: 'TOGGLE_DIE', dieIndex: 1 });
      actions = getLegalActions(s);
      expect(actions.some((a) => a.type === 'COMMIT_DICE')).toBe(true);
    });

    it('allows SELECT_PLACEMENT_DIE in placing phase', () => {
      const s = rollAndCommit(state);
      const actions = getLegalActions(s);
      expect(actions.some((a) => a.type === 'SELECT_PLACEMENT_DIE')).toBe(true);
    });

    it('allows CONFIRM_PLACEMENT when die and hex selected', () => {
      let s = rollAndCommit(state);
      const die = s.dice.filter((d) => d.selected)[0];
      s = applyAction(s, { type: 'SELECT_PLACEMENT_DIE', dieId: die.id });
      s = applyAction(s, { type: 'SELECT_HEX', coord: { col: 0, row: 0 } });
      const actions = getLegalActions(s);
      expect(actions.some((a) => a.type === 'CONFIRM_PLACEMENT')).toBe(true);
      expect(actions.some((a) => a.type === 'CANCEL_PLACEMENT')).toBe(true);
    });
  });
});
