import { describe, it, expect } from 'vitest';
import { rollDice, BUILDING_DIE_FACES, ROAD_DIE_FACES } from '../dice';

describe('Dice', () => {
  it('rolls 4 dice (2 building + 2 road)', () => {
    const dice = rollDice();
    expect(dice).toHaveLength(4);
    expect(dice.filter((d) => d.type === 'building')).toHaveLength(2);
    expect(dice.filter((d) => d.type === 'road')).toHaveLength(2);
  });

  it('produces valid faces', () => {
    const dice = rollDice();
    for (const die of dice) {
      if (die.type === 'building') {
        expect(BUILDING_DIE_FACES).toContain(die.face);
      } else {
        expect(ROAD_DIE_FACES).toContain(die.face);
      }
    }
  });

  it('all dice start unselected', () => {
    const dice = rollDice();
    for (const die of dice) {
      expect(die.selected).toBe(false);
    }
  });

  it('seeded rolls are deterministic', () => {
    const roll1 = rollDice(42);
    const roll2 = rollDice(42);
    expect(roll1).toEqual(roll2);
  });

  it('different seeds produce different results', () => {
    const roll1 = rollDice(1);
    const roll2 = rollDice(2);
    const faces1 = roll1.map((d) => d.face).join(',');
    const faces2 = roll2.map((d) => d.face).join(',');
    expect(faces1).not.toBe(faces2);
  });
});
