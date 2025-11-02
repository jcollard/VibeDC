import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MovementAbilityHandler } from './MovementAbilityHandler';
import { HumanoidUnit } from '../HumanoidUnit';
import { UnitClass } from '../UnitClass';
import type { CombatAbility } from '../CombatAbility';
import { CombatAbility as CombatAbilityClass } from '../CombatAbility';
import type { MovementTriggerContext } from './MovementTrigger';
import type { CombatState } from '../CombatState';
import { CombatMap } from '../CombatMap';
import { CombatUnitManifest } from '../CombatUnitManifest';

// Helper to create a minimal CombatState for testing
function createMockCombatState(): CombatState {
  return {
    turnNumber: 1,
    map: new CombatMap(10, 10),
    tilesetId: 'test',
    phase: 'unit-turn',
    unitManifest: new CombatUnitManifest(),
  };
}

describe('MovementAbilityHandler', () => {
  let testUnit: HumanoidUnit;
  let rogueClass: UnitClass;
  let regenerateAbility: CombatAbility;
  let meditateAbility: CombatAbility;
  let powerWalkerAbility: CombatAbility;
  let mockState: CombatState;

  beforeEach(() => {
    // Clear registries
    UnitClass.clearRegistry();
    CombatAbilityClass.clearRegistry();

    // Create test abilities
    regenerateAbility = new CombatAbilityClass(
      'Regenerate',
      'Restore 3 HP per tile traveled',
      'Movement',
      300,
      ['healing', 'after-move', 'per-tile'],
      'regenerate-test-001',
      [
        {
          type: 'heal',
          target: 'self',
          value: 3
        }
      ],
      undefined, // icon
      undefined  // range
    );

    meditateAbility = new CombatAbilityClass(
      'Meditate',
      'Restore 10% mana when not moving',
      'Movement',
      200,
      ['mana', 'after-no-move'],
      'meditate-test-001',
      [
        {
          type: 'mana-restore',
          target: 'self',
          value: '10%'
        }
      ],
      undefined, // icon
      undefined  // range
    );

    powerWalkerAbility = new CombatAbilityClass(
      'Power Walker',
      'Gain +2 Physical Power after moving',
      'Movement',
      250,
      ['buff', 'after-move'],
      'power-walker-test-001',
      [
        {
          type: 'stat-bonus',
          target: 'self',
          value: 2,
          duration: 2,
          params: { stat: 'physicalPower' }
        }
      ],
      undefined, // icon
      undefined  // range
    );

    // Create test class with abilities
    rogueClass = new UnitClass(
      'Rogue',
      'Test rogue class',
      ['agile'],
      [regenerateAbility, meditateAbility, powerWalkerAbility]
    );

    // Create test unit
    testUnit = new HumanoidUnit(
      'Test Rogue',
      rogueClass,
      100, // maxHealth
      50,  // maxMana
      10, 5, 8, 4, 3, 2, 6, 4,
      'default-humanoid',
      true // isPlayerControlled
    );

    // Give unit some wounds and mana usage for testing
    testUnit.addWounds(30); // 70/100 HP
    testUnit.useMana(20); // 30/50 mana

    mockState = createMockCombatState();
  });

  afterEach(() => {
    // Clean up registries
    UnitClass.clearRegistry();
    CombatAbilityClass.clearRegistry();
  });

  it('should trigger after-move ability when unit moves', () => {
    // Add ability directly for testing (bypass experience cost)
    (testUnit as any)._learnedAbilities.add(regenerateAbility);
    testUnit.assignMovementAbility(regenerateAbility);

    const context: MovementTriggerContext = {
      triggerType: 'after-move',
      mover: testUnit,
      startPosition: { x: 5, y: 5 },
      endPosition: { x: 8, y: 5 },
      tilesMoved: 3,
      state: mockState
    };

    const result = MovementAbilityHandler.checkMovementAbility(context);

    expect(result.shouldExecute).toBe(true);
    expect(result.logMessages).toContain('[color=#00ff00]Test Rogue[/color] triggered Regenerate!');
  });

  it('should trigger after-no-move ability when unit does not move', () => {
    // Add ability directly for testing (bypass experience cost)
    (testUnit as any)._learnedAbilities.add(meditateAbility);
    testUnit.assignMovementAbility(meditateAbility);

    const context: MovementTriggerContext = {
      triggerType: 'after-no-move',
      mover: testUnit,
      startPosition: { x: 5, y: 5 },
      endPosition: { x: 5, y: 5 },
      tilesMoved: 0,
      state: mockState
    };

    const result = MovementAbilityHandler.checkMovementAbility(context);

    expect(result.shouldExecute).toBe(true);
    expect(result.logMessages).toContain('[color=#00ff00]Test Rogue[/color] triggered Meditate!');
  });

  it('should scale per-tile effects correctly', () => {
    // Add ability directly for testing (bypass experience cost)
    (testUnit as any)._learnedAbilities.add(regenerateAbility);
    testUnit.assignMovementAbility(regenerateAbility);

    const initialWounds = testUnit.wounds; // 30

    const context: MovementTriggerContext = {
      triggerType: 'after-move',
      mover: testUnit,
      startPosition: { x: 5, y: 5 },
      endPosition: { x: 9, y: 5 }, // 4 tiles
      tilesMoved: 4,
      state: mockState
    };

    MovementAbilityHandler.checkMovementAbility(context);

    // Should heal 3 HP × 4 tiles = 12 HP
    expect(testUnit.wounds).toBe(initialWounds - 12);
  });

  it('should handle percentage-based mana restore', () => {
    // Add ability directly for testing (bypass experience cost)
    (testUnit as any)._learnedAbilities.add(meditateAbility);
    testUnit.assignMovementAbility(meditateAbility);

    const initialMana = testUnit.mana; // 30

    const context: MovementTriggerContext = {
      triggerType: 'after-no-move',
      mover: testUnit,
      startPosition: { x: 5, y: 5 },
      endPosition: { x: 5, y: 5 },
      tilesMoved: 0,
      state: mockState
    };

    MovementAbilityHandler.checkMovementAbility(context);

    // Should restore 10% of 50 max mana = 5 mana
    expect(testUnit.mana).toBe(initialMana + 5);
  });

  it('should apply stat modifiers from movement abilities', () => {
    // Add ability directly for testing (bypass experience cost)
    (testUnit as any)._learnedAbilities.add(powerWalkerAbility);
    testUnit.assignMovementAbility(powerWalkerAbility);

    const basePower = testUnit.physicalPower; // 10

    const context: MovementTriggerContext = {
      triggerType: 'after-move',
      mover: testUnit,
      startPosition: { x: 5, y: 5 },
      endPosition: { x: 6, y: 5 },
      tilesMoved: 1,
      state: mockState
    };

    MovementAbilityHandler.checkMovementAbility(context);

    expect(testUnit.physicalPower).toBe(basePower + 2);
    expect(testUnit.statModifiers).toHaveLength(1);
  });

  it('should not trigger if unit has no movement ability', () => {
    const context: MovementTriggerContext = {
      triggerType: 'after-move',
      mover: testUnit,
      startPosition: { x: 5, y: 5 },
      endPosition: { x: 8, y: 5 },
      tilesMoved: 3,
      state: mockState
    };

    const result = MovementAbilityHandler.checkMovementAbility(context);

    expect(result.shouldExecute).toBe(false);
  });

  it('should not trigger if unit is KO\'d', () => {
    // Add ability directly for testing (bypass experience cost)
    (testUnit as any)._learnedAbilities.add(regenerateAbility);
    testUnit.assignMovementAbility(regenerateAbility);
    testUnit.addWounds(100); // KO the unit

    const context: MovementTriggerContext = {
      triggerType: 'after-move',
      mover: testUnit,
      startPosition: { x: 5, y: 5 },
      endPosition: { x: 8, y: 5 },
      tilesMoved: 3,
      state: mockState
    };

    const result = MovementAbilityHandler.checkMovementAbility(context);

    expect(result.shouldExecute).toBe(false);
  });

  it('should not trigger wrong ability type', () => {
    // Add ability directly for testing (bypass experience cost)
    (testUnit as any)._learnedAbilities.add(meditateAbility);
    testUnit.assignMovementAbility(meditateAbility); // after-no-move ability

    const context: MovementTriggerContext = {
      triggerType: 'after-move', // Wrong trigger
      mover: testUnit,
      startPosition: { x: 5, y: 5 },
      endPosition: { x: 8, y: 5 },
      tilesMoved: 3,
      state: mockState
    };

    const result = MovementAbilityHandler.checkMovementAbility(context);

    expect(result.shouldExecute).toBe(false);
  });

  it('should not heal beyond max health', () => {
    // Add ability directly for testing (bypass experience cost)
    (testUnit as any)._learnedAbilities.add(regenerateAbility);
    testUnit.assignMovementAbility(regenerateAbility);

    // Reset wounds to known state
    // Currently has 30 wounds, set to 10 wounds (90/100 HP)
    testUnit.healWounds(20); // Now has 10 wounds

    const context: MovementTriggerContext = {
      triggerType: 'after-move',
      mover: testUnit,
      startPosition: { x: 5, y: 5 },
      endPosition: { x: 10, y: 10 }, // 10 tiles (would heal 30 HP)
      tilesMoved: 10,
      state: mockState
    };

    MovementAbilityHandler.checkMovementAbility(context);

    // Should only heal 10 HP (the amount of wounds), not 30 HP
    expect(testUnit.wounds).toBe(0);
    expect(testUnit.health).toBe(100);
  });

  it('should not restore mana beyond max mana', () => {
    // Add ability directly for testing (bypass experience cost)
    (testUnit as any)._learnedAbilities.add(meditateAbility);
    testUnit.assignMovementAbility(meditateAbility);

    // Set mana to nearly full
    testUnit.restoreMana(18); // Now at 48/50 mana

    const context: MovementTriggerContext = {
      triggerType: 'after-no-move',
      mover: testUnit,
      startPosition: { x: 5, y: 5 },
      endPosition: { x: 5, y: 5 },
      tilesMoved: 0,
      state: mockState
    };

    MovementAbilityHandler.checkMovementAbility(context);

    // Should restore 10% of 50 = 5, but only 2 mana room available
    expect(testUnit.mana).toBe(50); // Capped at max
  });

  it('should handle enemy units (red color)', () => {
    // Create enemy unit
    const enemyUnit = new HumanoidUnit(
      'Enemy Rogue',
      rogueClass,
      100, 50, 10, 5, 8, 4, 3, 2, 6, 4,
      'default-humanoid',
      false // isPlayerControlled = false (enemy)
    );

    // Add ability directly for testing (bypass experience cost)
    (enemyUnit as any)._learnedAbilities.add(regenerateAbility);
    enemyUnit.assignMovementAbility(regenerateAbility);

    const context: MovementTriggerContext = {
      triggerType: 'after-move',
      mover: enemyUnit,
      startPosition: { x: 5, y: 5 },
      endPosition: { x: 8, y: 5 },
      tilesMoved: 3,
      state: mockState
    };

    const result = MovementAbilityHandler.checkMovementAbility(context);

    expect(result.shouldExecute).toBe(true);
    expect(result.logMessages).toContain('[color=#ff0000]Enemy Rogue[/color] triggered Regenerate!');
  });
});
