import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReactionHandler } from './ReactionHandler';
import { HumanoidUnit } from '../HumanoidUnit';
import { UnitClass } from '../UnitClass';
import type { CombatAbility } from '../CombatAbility';
import { CombatAbility as CombatAbilityClass } from '../CombatAbility';
import type { ReactionTriggerContext } from './ReactionTrigger';
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

describe('ReactionHandler', () => {
  let attacker: HumanoidUnit;
  let defender: HumanoidUnit;
  let repostAbility: CombatAbility;
  let beforeAttackAbility: CombatAbility;
  let fighterClass: UnitClass;
  let mockState: CombatState;

  beforeEach(() => {
    // Clear registries
    UnitClass.clearRegistry();
    CombatAbilityClass.clearRegistry();

    // Create test abilities
    repostAbility = new CombatAbilityClass(
      'Repost',
      'Counter-attack after being attacked',
      'Reaction',
      250,
      ['offensive', 'counter', 'after-attacked'],
      'repost-test-001',
      [
        {
          type: 'damage-physical',
          target: 'enemy',
          value: 5,
          params: { autoHit: true } // Simplified for testing
        }
      ],
      undefined, // icon
      undefined  // range
    );

    beforeAttackAbility = new CombatAbilityClass(
      'Battle Cry',
      'Shout before attacking',
      'Reaction',
      100,
      ['offensive', 'before-attack'],
      'battle-cry-test-001',
      [
        {
          type: 'damage-physical',
          target: 'enemy',
          value: 3,
          params: { autoHit: true }
        }
      ],
      undefined, // icon
      undefined  // range
    );

    // Create test class with abilities in the learnable abilities list
    fighterClass = new UnitClass(
      'Fighter',
      'Test fighter class',
      ['melee'],
      [repostAbility, beforeAttackAbility]
    );

    // Create test units
    attacker = new HumanoidUnit(
      'Attacker',
      fighterClass,
      100, 50, 10, 5, 8, 4, 3, 2, 6, 4,
      'default-humanoid',
      false // isPlayerControlled
    );

    defender = new HumanoidUnit(
      'Defender',
      fighterClass,
      100, 50, 10, 5, 8, 4, 3, 2, 6, 4,
      'default-humanoid',
      true // isPlayerControlled
    );

    // Mock state
    mockState = createMockCombatState();
  });

  afterEach(() => {
    // Clean up registries
    UnitClass.clearRegistry();
    CombatAbilityClass.clearRegistry();
  });

  describe('checkReaction', () => {
    it('should trigger reaction on correct event type (after-attacked)', () => {
      // Add ability directly for testing (bypass experience cost)
      (defender as any)._learnedAbilities.add(repostAbility);
      defender.assignReactionAbility(repostAbility);

      const context: ReactionTriggerContext = {
        triggerType: 'after-attacked',
        reactor: defender,
        reactorPosition: { x: 5, y: 5 },
        attacker,
        attackerPosition: { x: 4, y: 5 },
        damageDealt: 10,
        state: mockState
      };

      const result = ReactionHandler.checkReaction(context);

      expect(result.shouldExecute).toBe(true);
      expect(result.logMessages.length).toBeGreaterThan(0);
      expect(result.logMessages[0]).toContain('Defender');
      expect(result.logMessages[0]).toContain('triggered');
      expect(result.logMessages[0]).toContain('Repost');
    });

    it('should trigger reaction on correct event type (before-attack)', () => {
      // Add ability directly for testing (bypass experience cost)
      (attacker as any)._learnedAbilities.add(beforeAttackAbility);
      attacker.assignReactionAbility(beforeAttackAbility);

      const context: ReactionTriggerContext = {
        triggerType: 'before-attack',
        reactor: attacker,
        reactorPosition: { x: 4, y: 5 },
        target: defender,
        targetPosition: { x: 5, y: 5 },
        state: mockState
      };

      const result = ReactionHandler.checkReaction(context);

      expect(result.shouldExecute).toBe(true);
      expect(result.logMessages.length).toBeGreaterThan(0);
      expect(result.logMessages[0]).toContain('Attacker');
      expect(result.logMessages[0]).toContain('Battle Cry');
    });

    it('should not trigger reaction on wrong event type', () => {
      (defender as any)._learnedAbilities.add(repostAbility);
      defender.assignReactionAbility(repostAbility);

      const context: ReactionTriggerContext = {
        triggerType: 'before-attacked', // Repost triggers on after-attacked
        reactor: defender,
        reactorPosition: { x: 5, y: 5 },
        attacker,
        attackerPosition: { x: 4, y: 5 },
        state: mockState
      };

      const result = ReactionHandler.checkReaction(context);

      expect(result.shouldExecute).toBe(false);
      expect(result.logMessages.length).toBe(0);
    });

    it('should not trigger if unit has no reaction ability assigned', () => {
      // Add ability but don't assign it
      (defender as any)._learnedAbilities.add(repostAbility);
      // defender.assignReactionAbility(repostAbility); // NOT ASSIGNED

      const context: ReactionTriggerContext = {
        triggerType: 'after-attacked',
        reactor: defender,
        reactorPosition: { x: 5, y: 5 },
        attacker,
        attackerPosition: { x: 4, y: 5 },
        state: mockState
      };

      const result = ReactionHandler.checkReaction(context);

      expect(result.shouldExecute).toBe(false);
      expect(result.logMessages.length).toBe(0);
    });

    it('should not trigger if reactor is KO\'d (health <= 0)', () => {
      (defender as any)._learnedAbilities.add(repostAbility);
      defender.assignReactionAbility(repostAbility);

      // KO the defender
      (defender as any)._wounds = defender.maxHealth;

      const context: ReactionTriggerContext = {
        triggerType: 'after-attacked',
        reactor: defender,
        reactorPosition: { x: 5, y: 5 },
        attacker,
        attackerPosition: { x: 4, y: 5 },
        state: mockState
      };

      const result = ReactionHandler.checkReaction(context);

      expect(result.shouldExecute).toBe(false);
      expect(result.logMessages.length).toBe(0);
    });

    it('should execute reaction ability effects (damage)', () => {
      (defender as any)._learnedAbilities.add(repostAbility);
      defender.assignReactionAbility(repostAbility);

      // Add units to the manifest so AbilityExecutor can find them
      mockState.unitManifest.addUnit(attacker, { x: 4, y: 5 });
      mockState.unitManifest.addUnit(defender, { x: 5, y: 5 });

      const initialWounds = attacker.wounds;

      const context: ReactionTriggerContext = {
        triggerType: 'after-attacked',
        reactor: defender,
        reactorPosition: { x: 5, y: 5 },
        attacker,
        attackerPosition: { x: 4, y: 5 },
        damageDealt: 10,
        state: mockState
      };

      const result = ReactionHandler.checkReaction(context);

      expect(result.shouldExecute).toBe(true);
      expect(attacker.wounds).toBeGreaterThan(initialWounds); // Damage was dealt
      expect(attacker.wounds).toBe(initialWounds + 5); // 5 damage from Repost
    });

    it('should handle dual-wield scenario (reactions trigger per weapon)', () => {
      (defender as any)._learnedAbilities.add(repostAbility);
      defender.assignReactionAbility(repostAbility);

      // Add units to the manifest so AbilityExecutor can find them
      mockState.unitManifest.addUnit(attacker, { x: 4, y: 5 });
      mockState.unitManifest.addUnit(defender, { x: 5, y: 5 });

      let reactionCount = 0;
      const initialWounds = attacker.wounds;

      // Simulate 2 weapon attacks
      for (let i = 0; i < 2; i++) {
        const context: ReactionTriggerContext = {
          triggerType: 'after-attacked',
          reactor: defender,
          reactorPosition: { x: 5, y: 5 },
          attacker,
          attackerPosition: { x: 4, y: 5 },
          damageDealt: 10,
          state: mockState
        };

        const result = ReactionHandler.checkReaction(context);
        if (result.shouldExecute) {
          reactionCount++;
        }
      }

      expect(reactionCount).toBe(2); // Reaction triggered twice
      expect(attacker.wounds).toBe(initialWounds + 10); // 5 damage x 2 triggers
    });

    it('should include proper color-coded combat log messages', () => {
      // Player-controlled defender (already set in beforeEach)
      (defender as any)._learnedAbilities.add(repostAbility);
      defender.assignReactionAbility(repostAbility);

      const context: ReactionTriggerContext = {
        triggerType: 'after-attacked',
        reactor: defender,
        reactorPosition: { x: 5, y: 5 },
        attacker,
        attackerPosition: { x: 4, y: 5 },
        damageDealt: 10,
        state: mockState
      };

      const result = ReactionHandler.checkReaction(context);

      expect(result.shouldExecute).toBe(true);
      expect(result.logMessages.length).toBeGreaterThan(0);
      // Player units should use green color (#00ff00)
      expect(result.logMessages[0]).toContain('#00ff00');
      expect(result.logMessages[0]).toContain('Defender');
    });

    it('should use red color for enemy units in combat log', () => {
      // Enemy-controlled defender - need to create a new one
      const enemyDefender = new HumanoidUnit(
        'EnemyDefender',
        fighterClass,
        100, 50, 10, 5, 8, 4, 3, 2, 6, 4,
        'default-humanoid',
        false // isPlayerControlled = false for enemy
      );
      (enemyDefender as any)._learnedAbilities.add(repostAbility);
      enemyDefender.assignReactionAbility(repostAbility);

      const context: ReactionTriggerContext = {
        triggerType: 'after-attacked',
        reactor: enemyDefender,
        reactorPosition: { x: 5, y: 5 },
        attacker,
        attackerPosition: { x: 4, y: 5 },
        damageDealt: 10,
        state: mockState
      };

      const result = ReactionHandler.checkReaction(context);

      expect(result.shouldExecute).toBe(true);
      expect(result.logMessages.length).toBeGreaterThan(0);
      // Enemy units should use red color (#ff0000)
      expect(result.logMessages[0]).toContain('#ff0000');
      expect(result.logMessages[0]).toContain('EnemyDefender');
    });

    it('should handle ability without trigger tags gracefully', () => {
      // Create ability without trigger tags
      const noTriggerAbility = new CombatAbilityClass(
        'No Trigger',
        'Ability without trigger',
        'Reaction',
        100,
        ['offensive'], // No trigger tag
        'no-trigger-test-001',
        [
          {
            type: 'damage-physical',
            target: 'enemy',
            value: 5
          }
        ],
        undefined, // icon
        undefined  // range
      );

      (defender as any)._learnedAbilities.add(noTriggerAbility);
      defender.assignReactionAbility(noTriggerAbility);

      const context: ReactionTriggerContext = {
        triggerType: 'after-attacked',
        reactor: defender,
        reactorPosition: { x: 5, y: 5 },
        attacker,
        attackerPosition: { x: 4, y: 5 },
        state: mockState
      };

      const result = ReactionHandler.checkReaction(context);

      expect(result.shouldExecute).toBe(false);
      expect(result.logMessages.length).toBe(0);
    });
  });
});
