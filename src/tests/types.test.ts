import { describe, it, expect } from 'vitest';
import type { Character, ElementType, WeaponType } from '../types/character.js';

describe('Type Safety Tests', () => {
  it('should enforce correct element types', () => {
    const validElements: ElementType[] = [
      'Anemo',
      'Geo',
      'Electro',
      'Dendro',
      'Hydro',
      'Pyro',
      'Cryo',
    ];

    validElements.forEach(element => {
      expect(typeof element).toBe('string');
      expect(element).toMatch(/^[A-Z][a-z]+$/);
    });
  });

  it('should enforce correct weapon types', () => {
    const validWeapons: WeaponType[] = ['Sword', 'Claymore', 'Polearm', 'Bow', 'Catalyst'];

    validWeapons.forEach(weapon => {
      expect(typeof weapon).toBe('string');
      expect(weapon).toMatch(/^[A-Z][a-z]+$/);
    });
  });

  it('should enforce correct rarity values', () => {
    const validRarities: Array<4 | 5> = [4, 5];

    validRarities.forEach(rarity => {
      expect(typeof rarity).toBe('number');
      expect([4, 5]).toContain(rarity);
    });
  });

  it('should create valid character object', () => {
    const character: Character = {
      id: 'test-character',
      name: 'Test Character',
      nameJa: 'テストキャラクター',
      element: 'Pyro',
      weaponType: 'Sword',
      rarity: 5,
      region: 'Mondstadt',
      constellation: 'Test Constellation',
      cv: {
        japanese: 'Test VA',
        english: 'Test VA EN',
      },
      profile: {
        baseHp: 1000,
        baseAtk: 200,
        baseDef: 150,
        bonusStat: {
          name: 'ATK%',
          value: '24.0%',
        },
      },
    };

    expect(character.id).toBe('test-character');
    expect(character.rarity).toBe(5);
    expect(character.element).toBe('Pyro');
    expect(character.weaponType).toBe('Sword');
    expect(character.profile?.baseHp).toBe(1000);
  });
});
