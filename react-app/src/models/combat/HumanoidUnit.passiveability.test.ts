import { describe, it, expect, beforeEach } from 'vitest';
import { HumanoidUnit } from './HumanoidUnit';
import { UnitClass } from './UnitClass';
import { CombatAbility } from './CombatAbility';

describe('HumanoidUnit - Passive Ability Integration', () => {
  let testUnit: HumanoidUnit;
  let fighterClass: UnitClass;
  let meatShieldAbility: CombatAbility;
  let fastAbility: CombatAbility;
  let allTestAbilities: CombatAbility[] = [];

  // Helper function to learn an ability
  function learnAbility(ability: CombatAbility): void {
    const abilities = [ability];
    const tempClass = new UnitClass('Temp', 'Temp', [], abilities, undefined, undefined, new Map(), `temp-${Date.now()}`);
    // Give unit enough XP to learn the ability
    testUnit.addExperience(ability.experiencePrice + 100, tempClass);
    testUnit.learnAbility(ability, tempClass);
  }

  beforeEach(() => {
    // Clear ability registry before each test
    CombatAbility.clearRegistry();

    // Create test abilities with effects first
    meatShieldAbility = new CombatAbility(
      'Meat Shield',
      '+50 HP',
      'Passive',
      100,
      ['defensive'],
      'meat-shield-001',
      [{
        type: 'stat-permanent',
        target: 'self',
        value: 50,
        params: { stat: 'maxHealth' }
      }]
    );

    fastAbility = new CombatAbility(
      'Fast',
      '+3 Speed',
      'Passive',
      50,
      ['speed'],
      'fast-001',
      [{
        type: 'stat-permanent',
        target: 'self',
        value: 3,
        params: { stat: 'speed' }
      }]
    );

    allTestAbilities = [meatShieldAbility, fastAbility];

    // Create fighter class with learnable abilities
    fighterClass = new UnitClass(
      'Fighter',
      'A basic warrior class',
      [],
      allTestAbilities,
      undefined,
      undefined,
      new Map(),
      'fighter-001'
    );

    testUnit = new HumanoidUnit(
      'Test Fighter',
      fighterClass,
      100, // baseHealth
      50,  // baseMana
      10,  // basePhysicalPower
      5,   // baseMagicPower
      8,   // baseSpeed
      4,   // baseMovement
      3,   // basePhysicalEvade
      2,   // baseMagicEvade
      6,   // baseCourage
      4    // baseAttunement
    );

    // Give unit enough XP to learn abilities
    testUnit.addExperience(1000, fighterClass);

    // Learn the abilities
    testUnit.learnAbility(meatShieldAbility, fighterClass);
    testUnit.learnAbility(fastAbility, fighterClass);
  });

  it('should apply stat modifiers when passive ability assigned', () => {
    const baseHealth = testUnit.maxHealth;

    testUnit.assignPassiveAbility(meatShieldAbility);

    expect(testUnit.maxHealth).toBe(baseHealth + 50);
    expect(testUnit.statModifiers).toHaveLength(1);
    expect(testUnit.statModifiers[0].source).toBe('meat-shield-001');
  });

  it('should reflect modifier in stat getter', () => {
    expect(testUnit.maxHealth).toBe(100); // Base

    testUnit.assignPassiveAbility(meatShieldAbility);

    expect(testUnit.maxHealth).toBe(150); // Base + modifier
  });

  it('should remove old modifiers when swapping passive abilities', () => {
    testUnit.assignPassiveAbility(meatShieldAbility);
    expect(testUnit.maxHealth).toBe(150);

    testUnit.assignPassiveAbility(fastAbility);

    expect(testUnit.maxHealth).toBe(100); // Back to base
    expect(testUnit.speed).toBe(11); // Base 8 + 3
    expect(testUnit.statModifiers).toHaveLength(1);
    expect(testUnit.statModifiers[0].source).toBe('fast-001');
  });

  it('should remove all modifiers when removing passive ability', () => {
    testUnit.assignPassiveAbility(meatShieldAbility);
    expect(testUnit.maxHealth).toBe(150);

    testUnit.assignPassiveAbility(null);

    expect(testUnit.maxHealth).toBe(100);
    expect(testUnit.statModifiers).toHaveLength(0);
  });

  it('should handle passive with multiple stat effects', () => {
    const multiStatAbility = new CombatAbility(
      'Multi Stat',
      '+10 HP and +2 Speed',
      'Passive',
      100,
      ['buff'],
      'multi-stat-001',
      [
        {
          type: 'stat-permanent',
          target: 'self',
          value: 10,
          params: { stat: 'maxHealth' }
        },
        {
          type: 'stat-permanent',
          target: 'self',
          value: 2,
          params: { stat: 'speed' }
        }
      ]
    );

    learnAbility(multiStatAbility);
    testUnit.assignPassiveAbility(multiStatAbility);

    expect(testUnit.maxHealth).toBe(110);
    expect(testUnit.speed).toBe(10);
    expect(testUnit.statModifiers).toHaveLength(2);
  });

  it('should gracefully handle invalid stat type', () => {
    const invalidAbility = new CombatAbility(
      'Invalid',
      'Invalid stat',
      'Passive',
      100,
      ['test'],
      'invalid-001',
      [{
        type: 'stat-permanent',
        target: 'self',
        value: 10,
        params: { stat: 'invalidStat' }
      }]
    );

    learnAbility(invalidAbility);
    testUnit.assignPassiveAbility(invalidAbility);

    expect(testUnit.statModifiers).toHaveLength(0);
  });

  it('should handle passive without effects field', () => {
    const noEffectsAbility = new CombatAbility(
      'No Effects',
      'No effects defined',
      'Passive',
      100,
      ['test'],
      'no-effects-001'
      // effects field missing
    );

    learnAbility(noEffectsAbility);
    testUnit.assignPassiveAbility(noEffectsAbility);

    expect(testUnit.statModifiers).toHaveLength(0);
  });

  it('should serialize stat modifiers from passive ability', () => {
    testUnit.assignPassiveAbility(meatShieldAbility);

    const json = testUnit.toJSON();

    expect(json.statModifiers).toHaveLength(1);
    expect(json.statModifiers[0].source).toBe('meat-shield-001');
    expect(json.statModifiers[0].value).toBe(50);
  });

  it('should deserialize and restore passive ability modifiers', () => {
    testUnit.assignPassiveAbility(meatShieldAbility);
    expect(testUnit.maxHealth).toBe(150);

    const json = testUnit.toJSON();
    const restored = HumanoidUnit.fromJSON(json);

    expect(restored).not.toBeNull();
    expect(restored!.maxHealth).toBe(150);
    expect(restored!.statModifiers).toHaveLength(1);
    expect(restored!.statModifiers[0].source).toBe('meat-shield-001');
  });

  it('should not assign non-passive ability to passive slot', () => {
    const actionAbility = new CombatAbility(
      'Heal',
      'Heal a unit',
      'Action',
      100,
      ['healing'],
      'heal-001',
      []
    );

    learnAbility(actionAbility);
    const result = testUnit.assignPassiveAbility(actionAbility);

    expect(result).toBe(false);
    expect(testUnit.passiveAbility).toBeNull();
  });

  it('should not assign unlearned ability', () => {
    const unlearnedAbility = new CombatAbility(
      'Unlearned',
      'Not learned',
      'Passive',
      100,
      ['test'],
      'unlearned-001',
      []
    );

    const result = testUnit.assignPassiveAbility(unlearnedAbility);

    expect(result).toBe(false);
    expect(testUnit.passiveAbility).toBeNull();
    expect(testUnit.statModifiers).toHaveLength(0);
  });

  it('should handle stat-bonus effect type (same as stat-permanent for passives)', () => {
    const statBonusAbility = new CombatAbility(
      'Stat Bonus Test',
      'Uses stat-bonus instead of stat-permanent',
      'Passive',
      100,
      ['test'],
      'stat-bonus-001',
      [{
        type: 'stat-bonus',
        target: 'self',
        value: 5,
        params: { stat: 'courage' }
      }]
    );

    learnAbility(statBonusAbility);
    testUnit.assignPassiveAbility(statBonusAbility);

    expect(testUnit.courage).toBe(11); // Base 6 + 5
    expect(testUnit.statModifiers).toHaveLength(1);
  });

  it('should use -1 duration for passive ability modifiers (permanent)', () => {
    testUnit.assignPassiveAbility(meatShieldAbility);

    expect(testUnit.statModifiers[0].duration).toBe(-1);
  });

  it('should include ability name and icon in modifier', () => {
    const abilityWithIcon = new CombatAbility(
      'Test Icon',
      'Has an icon',
      'Passive',
      100,
      ['test'],
      'icon-test-001',
      [{
        type: 'stat-permanent',
        target: 'self',
        value: 5,
        params: { stat: 'movement' }
      }],
      'test-icon-sprite'
    );

    learnAbility(abilityWithIcon);
    testUnit.assignPassiveAbility(abilityWithIcon);

    expect(testUnit.statModifiers[0].sourceName).toBe('Test Icon');
    expect(testUnit.statModifiers[0].icon).toBe('test-icon-sprite');
  });
});
