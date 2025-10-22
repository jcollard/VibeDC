import { describe, it, expect, beforeEach } from 'vitest';
import { MonsterUnit } from './MonsterUnit';
import { UnitClass } from './UnitClass';
import { CombatAbility } from './CombatAbility';

describe('MonsterUnit', () => {
  let monsterClass: UnitClass;
  let basicAttack: CombatAbility;
  let bite: CombatAbility;
  let counterAttack: CombatAbility;
  let regeneration: CombatAbility;
  let leap: CombatAbility;

  beforeEach(() => {
    // Clear registries
    UnitClass.clearRegistry();
    CombatAbility.clearRegistry();

    // Create test abilities
    basicAttack = new CombatAbility(
      'Basic Attack',
      'A basic attack',
      'Action',
      0,
      ['physical'],
      'basic-attack'
    );

    bite = new CombatAbility(
      'Bite',
      'A vicious bite attack',
      'Action',
      10,
      ['physical', 'beast'],
      'bite'
    );

    counterAttack = new CombatAbility(
      'Counter Attack',
      'Counter when hit',
      'Reaction',
      20,
      ['physical'],
      'counter-attack'
    );

    regeneration = new CombatAbility(
      'Regeneration',
      'Slowly heal over time',
      'Passive',
      30,
      ['healing'],
      'regeneration'
    );

    leap = new CombatAbility(
      'Leap',
      'Jump over obstacles',
      'Movement',
      15,
      ['mobility'],
      'leap'
    );

    // Create monster class
    monsterClass = new UnitClass(
      'Beast',
      'A wild beast',
      ['monster', 'beast'],
      [basicAttack, bite, counterAttack, regeneration, leap],
      { health: 20, physicalPower: 3 },
      { health: 1.3 },
      new Map(),
      'beast'
    );
  });

  describe('Basic Creation', () => {
    it('should create a monster with basic stats', () => {
      const monster = new MonsterUnit(
        'Wolf',
        monsterClass,
        50, // health
        10, // mana
        8,  // physicalPower
        2,  // magicPower
        7,  // speed
        5,  // movement
        3,  // physicalEvade
        1,  // magicEvade
        4,  // courage
        2   // attunement
      );

      expect(monster.name).toBe('Wolf');
      expect(monster.unitClass).toBe(monsterClass);
      expect(monster.maxHealth).toBe(50);
      expect(monster.health).toBe(50);
      expect(monster.maxMana).toBe(10);
      expect(monster.physicalPower).toBe(8);
      expect(monster.speed).toBe(7);
      expect(monster.movement).toBe(5);
    });

    it('should use default sprite ID if not provided', () => {
      const monster = new MonsterUnit(
        'Wolf',
        monsterClass,
        50, 10, 8, 2, 7, 5, 3, 1, 4, 2
      );

      expect(monster.spriteId).toBe('default-monster');
    });

    it('should use custom sprite ID when provided', () => {
      const monster = new MonsterUnit(
        'Wolf',
        monsterClass,
        50, 10, 8, 2, 7, 5, 3, 1, 4, 2,
        'gray-wolf'
      );

      expect(monster.spriteId).toBe('gray-wolf');
    });

    it('should not have secondary class', () => {
      const monster = new MonsterUnit(
        'Wolf',
        monsterClass,
        50, 10, 8, 2, 7, 5, 3, 1, 4, 2
      );

      expect(monster.secondaryClass).toBeNull();
    });

    it('should not have experience', () => {
      const monster = new MonsterUnit(
        'Wolf',
        monsterClass,
        50, 10, 8, 2, 7, 5, 3, 1, 4, 2
      );

      expect(monster.totalExperience).toBe(0);
      expect(monster.classExperience.size).toBe(0);
      expect(monster.classExperienceSpent.size).toBe(0);
    });
  });

  describe('Ability Management', () => {
    it('should learn abilities from its class', () => {
      const monster = new MonsterUnit(
        'Wolf',
        monsterClass,
        50, 10, 8, 2, 7, 5, 3, 1, 4, 2
      );

      expect(monster.learnAbility(bite)).toBe(true);
      expect(monster.hasAbility(bite)).toBe(true);
      expect(monster.learnedAbilities.size).toBe(1);
    });

    it('should not learn abilities not in its class', () => {
      const otherAbility = new CombatAbility(
        'Fireball',
        'Magical attack',
        'Action',
        50,
        ['magic'],
        'fireball'
      );

      const monster = new MonsterUnit(
        'Wolf',
        monsterClass,
        50, 10, 8, 2, 7, 5, 3, 1, 4, 2
      );

      expect(monster.learnAbility(otherAbility)).toBe(false);
      expect(monster.hasAbility(otherAbility)).toBe(false);
    });

    it('should forget learned abilities', () => {
      const monster = new MonsterUnit(
        'Wolf',
        monsterClass,
        50, 10, 8, 2, 7, 5, 3, 1, 4, 2
      );

      monster.learnAbility(bite);
      expect(monster.hasAbility(bite)).toBe(true);

      expect(monster.forgetAbility(bite)).toBe(true);
      expect(monster.hasAbility(bite)).toBe(false);
    });
  });

  describe('Ability Slot Assignment', () => {
    it('should assign reaction ability', () => {
      const monster = new MonsterUnit(
        'Wolf',
        monsterClass,
        50, 10, 8, 2, 7, 5, 3, 1, 4, 2
      );

      monster.learnAbility(counterAttack);
      expect(monster.assignReactionAbility(counterAttack)).toBe(true);
      expect(monster.reactionAbility).toBe(counterAttack);
    });

    it('should not assign reaction ability if not learned', () => {
      const monster = new MonsterUnit(
        'Wolf',
        monsterClass,
        50, 10, 8, 2, 7, 5, 3, 1, 4, 2
      );

      expect(monster.assignReactionAbility(counterAttack)).toBe(false);
      expect(monster.reactionAbility).toBeNull();
    });

    it('should assign passive ability', () => {
      const monster = new MonsterUnit(
        'Wolf',
        monsterClass,
        50, 10, 8, 2, 7, 5, 3, 1, 4, 2
      );

      monster.learnAbility(regeneration);
      expect(monster.assignPassiveAbility(regeneration)).toBe(true);
      expect(monster.passiveAbility).toBe(regeneration);
    });

    it('should assign movement ability', () => {
      const monster = new MonsterUnit(
        'Wolf',
        monsterClass,
        50, 10, 8, 2, 7, 5, 3, 1, 4, 2
      );

      monster.learnAbility(leap);
      expect(monster.assignMovementAbility(leap)).toBe(true);
      expect(monster.movementAbility).toBe(leap);
    });

    it('should clear ability slots when assigned null', () => {
      const monster = new MonsterUnit(
        'Wolf',
        monsterClass,
        50, 10, 8, 2, 7, 5, 3, 1, 4, 2
      );

      monster.learnAbility(regeneration);
      monster.assignPassiveAbility(regeneration);
      expect(monster.passiveAbility).toBe(regeneration);

      expect(monster.assignPassiveAbility(null)).toBe(true);
      expect(monster.passiveAbility).toBeNull();
    });

    it('should not assign wrong ability type to reaction slot', () => {
      const monster = new MonsterUnit(
        'Wolf',
        monsterClass,
        50, 10, 8, 2, 7, 5, 3, 1, 4, 2
      );

      monster.learnAbility(bite); // Action, not Reaction
      expect(monster.assignReactionAbility(bite)).toBe(false);
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize to JSON', () => {
      const monster = new MonsterUnit(
        'Wolf',
        monsterClass,
        50, 10, 8, 2, 7, 5, 3, 1, 4, 2,
        'gray-wolf'
      );

      monster.learnAbility(bite);
      monster.learnAbility(regeneration);
      monster.assignPassiveAbility(regeneration);

      const json = monster.toJSON();

      expect(json.name).toBe('Wolf');
      expect(json.unitClassId).toBe('beast');
      expect(json.baseHealth).toBe(50);
      expect(json.spriteId).toBe('gray-wolf');
      expect(json.learnedAbilityIds).toContain('bite');
      expect(json.learnedAbilityIds).toContain('regeneration');
      expect(json.passiveAbilityId).toBe('regeneration');
    });

    it('should deserialize from JSON', () => {
      const original = new MonsterUnit(
        'Wolf',
        monsterClass,
        50, 10, 8, 2, 7, 5, 3, 1, 4, 2,
        'gray-wolf'
      );

      original.learnAbility(bite);
      original.learnAbility(regeneration);
      original.assignPassiveAbility(regeneration);

      const json = original.toJSON();
      const deserialized = MonsterUnit.fromJSON(json);

      expect(deserialized).not.toBeNull();
      expect(deserialized?.name).toBe('Wolf');
      expect(deserialized?.unitClass.id).toBe('beast');
      expect(deserialized?.maxHealth).toBe(50);
      expect(deserialized?.spriteId).toBe('gray-wolf');
      expect(deserialized?.hasAbility(bite)).toBe(true);
      expect(deserialized?.hasAbility(regeneration)).toBe(true);
      expect(deserialized?.passiveAbility?.id).toBe('regeneration');
    });

    it('should handle missing class during deserialization', () => {
      const json = {
        name: 'Unknown Monster',
        unitClassId: 'non-existent-class',
        learnedAbilityIds: [],
        reactionAbilityId: null,
        passiveAbilityId: null,
        movementAbilityId: null,
        baseHealth: 50,
        baseMana: 10,
        basePhysicalPower: 8,
        baseMagicPower: 2,
        baseSpeed: 7,
        baseMovement: 5,
        basePhysicalEvade: 3,
        baseMagicEvade: 1,
        baseCourage: 4,
        baseAttunement: 2,
        wounds: 0,
        manaUsed: 0,
        turnGauge: 0,
        spriteId: 'unknown',
      };

      const monster = MonsterUnit.fromJSON(json);
      expect(monster).toBeNull();
    });
  });
});
