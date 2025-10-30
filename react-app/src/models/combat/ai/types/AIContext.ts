import type { CombatUnit } from '../../CombatUnit';
import type { Position } from '../../../../types';
import type { CombatMap } from '../../CombatMap';
import type { CombatUnitManifest } from '../../CombatUnitManifest';
import type { CombatState } from '../../CombatState';
import type { Equipment } from '../../Equipment';
import type { HumanoidUnit } from '../../HumanoidUnit';
import { MovementRangeCalculator } from '../../utils/MovementRangeCalculator';
import { AttackRangeCalculator, type AttackRangeTiles } from '../../utils/AttackRangeCalculator';
import { MovementPathfinder } from '../../utils/MovementPathfinder';
import { CombatCalculations } from '../../utils/CombatCalculations';

/**
 * Represents a unit and its position on the battlefield.
 */
export interface UnitPlacement {
  readonly unit: CombatUnit;
  readonly position: Position;
}

/**
 * Context object providing all information needed for AI decision-making.
 * Created once per enemy turn, immutable throughout evaluation.
 */
export interface AIContext {
  // ===== Self Data =====

  /** The unit making the decision */
  readonly self: CombatUnit;

  /** Current position of the unit */
  readonly selfPosition: Position;

  // ===== Allied and Enemy Units =====

  /** All allied units (same isPlayerControlled value, excludes self) */
  readonly alliedUnits: ReadonlyArray<UnitPlacement>;

  /** All enemy units (opposite isPlayerControlled value) */
  readonly enemyUnits: ReadonlyArray<UnitPlacement>;

  // ===== Map Data =====

  /** Combat map with terrain and walkability */
  readonly map: CombatMap;

  /** Unit manifest for position queries */
  readonly manifest: CombatUnitManifest;

  // ===== Pre-calculated Data =====

  /** All reachable positions from current location (movement range) */
  readonly movementRange: ReadonlyArray<Position>;

  /** Attack range tiles from current position (null if unit has no weapon) */
  readonly attackRange: AttackRangeTiles | null;

  // ===== Helper Methods =====

  /**
   * Get all units within a specific range from a position.
   * Uses Manhattan distance (orthogonal movement).
   *
   * @param range - Maximum distance (inclusive)
   * @param from - Starting position (defaults to self position)
   * @returns Array of units within range
   */
  getUnitsInRange(range: number, from?: Position): UnitPlacement[];

  /**
   * Get all enemy units in attack range from a position.
   *
   * @param from - Starting position (defaults to self position)
   * @returns Array of enemy units in attack range
   */
  getUnitsInAttackRange(from?: Position): UnitPlacement[];

  /**
   * Calculate path to a destination.
   * Uses existing MovementPathfinder with proper collision detection.
   *
   * @param to - Destination position
   * @returns Path (excludes start, includes end), or null if unreachable
   */
  calculatePath(to: Position): Position[] | null;

  /**
   * Calculate attack range from a specific position.
   * Uses unit's weapon range and line of sight.
   *
   * @param position - Position to calculate attack range from
   * @returns Attack range tiles (inRange, blocked, validTargets)
   */
  calculateAttackRangeFrom(position: Position): AttackRangeTiles;

  /**
   * Predict damage dealt to a target.
   * Uses CombatCalculations formulas.
   *
   * @param target - Target unit
   * @param weapon - Weapon to use (defaults to self's first weapon)
   * @returns Predicted damage (integer, 0+)
   */
  predictDamage(target: CombatUnit, weapon?: Equipment): number;

  /**
   * Predict hit chance against a target.
   * Uses CombatCalculations formulas.
   *
   * @param target - Target unit
   * @param weapon - Weapon to use (defaults to self's first weapon)
   * @returns Hit chance (0.0 to 1.0)
   */
  predictHitChance(target: CombatUnit, weapon?: Equipment): number;

  /**
   * Check if this unit can defeat (kill) a target in one attack.
   *
   * @param target - Target unit
   * @returns true if predicted damage >= target's current health
   */
  canDefeat(target: CombatUnit): boolean;

  /**
   * Calculate Manhattan distance between two positions.
   *
   * @param from - Starting position
   * @param to - Ending position
   * @returns Distance (integer, 0+)
   */
  getDistance(from: Position, to: Position): number;
}

/**
 * Builder for creating AIContext instances.
 * Handles all pre-calculations and helper method implementations.
 */
export class AIContextBuilder {
  /**
   * Build a complete AI context for decision-making.
   *
   * @param self - The unit making the decision
   * @param selfPosition - Current position of the unit
   * @param state - Current combat state
   * @returns Immutable AI context with all data and helpers
   */
  static build(
    self: CombatUnit,
    selfPosition: Position,
    state: CombatState
  ): AIContext {
    // 1. Partition units into allies and enemies
    const alliedUnits: UnitPlacement[] = [];
    const enemyUnits: UnitPlacement[] = [];

    for (const placement of state.unitManifest.getAllUnits()) {
      if (placement.unit === self) continue; // Skip self

      const unitPlacement: UnitPlacement = {
        unit: placement.unit,
        position: placement.position,
      };

      if (placement.unit.isPlayerControlled === self.isPlayerControlled) {
        alliedUnits.push(unitPlacement);
      } else {
        enemyUnits.push(unitPlacement);
      }
    }

    // 2. Calculate movement range
    const movementRange = MovementRangeCalculator.calculateReachableTiles({
      startPosition: selfPosition,
      movement: self.movement,
      map: state.map,
      unitManifest: state.unitManifest,
      activeUnit: self,
    });

    // 3. Calculate attack range from current position
    let attackRange: AttackRangeTiles | null = null;
    const weapons = this.getEquippedWeapons(self);
    if (weapons && weapons.length > 0) {
      const weapon = weapons[0];
      const minRange = weapon.minRange ?? 1;
      const maxRange = weapon.maxRange ?? 1;

      attackRange = AttackRangeCalculator.calculateAttackRange({
        attackerPosition: selfPosition,
        minRange,
        maxRange,
        map: state.map,
        unitManifest: state.unitManifest,
      });
    }

    // 4. Helper: Get default weapon
    const getDefaultWeapon = (): Equipment | null => {
      const weapons = this.getEquippedWeapons(self);
      return weapons && weapons.length > 0 ? weapons[0] : null;
    };

    // 5. Build context with helper methods
    const context: AIContext = {
      self,
      selfPosition,
      alliedUnits: Object.freeze(alliedUnits),
      enemyUnits: Object.freeze(enemyUnits),
      map: state.map,
      manifest: state.unitManifest,
      movementRange: Object.freeze(movementRange),
      attackRange,

      // Helper: Get units in range
      getUnitsInRange(range: number, from: Position = selfPosition): UnitPlacement[] {
        const result: UnitPlacement[] = [];
        const allUnits = [...alliedUnits, ...enemyUnits];

        for (const placement of allUnits) {
          const distance = Math.abs(from.x - placement.position.x) +
                          Math.abs(from.y - placement.position.y);
          if (distance <= range) {
            result.push(placement);
          }
        }

        return result;
      },

      // Helper: Get enemy units in attack range
      getUnitsInAttackRange(from: Position = selfPosition): UnitPlacement[] {
        const attackRangeFromPos = from === selfPosition
          ? attackRange
          : this.calculateAttackRangeFrom(from);

        if (!attackRangeFromPos) return [];

        const result: UnitPlacement[] = [];
        for (const targetPos of attackRangeFromPos.validTargets) {
          const targetUnit = state.unitManifest.getUnitAtPosition(targetPos);
          if (!targetUnit) continue;

          // Check if target is an enemy
          if (targetUnit.isPlayerControlled !== self.isPlayerControlled) {
            result.push({
              unit: targetUnit,
              position: targetPos,
            });
          }
        }

        return result;
      },

      // Helper: Calculate path
      calculatePath(to: Position): Position[] | null {
        const path = MovementPathfinder.calculatePath({
          start: selfPosition,
          end: to,
          maxRange: self.movement,
          map: state.map,
          unitManifest: state.unitManifest,
          activeUnit: self,
        });
        return path.length > 0 ? path : null;
      },

      // Helper: Calculate attack range from position
      calculateAttackRangeFrom(position: Position): AttackRangeTiles {
        const weapons = AIContextBuilder.getEquippedWeapons(self);
        if (!weapons || weapons.length === 0) {
          return { inRange: [], blocked: [], validTargets: [] };
        }

        const weapon = weapons[0];
        const minRange = weapon.minRange ?? 1;
        const maxRange = weapon.maxRange ?? 1;

        return AttackRangeCalculator.calculateAttackRange({
          attackerPosition: position,
          minRange,
          maxRange,
          map: state.map,
          unitManifest: state.unitManifest,
        });
      },

      // Helper: Predict damage
      predictDamage(target: CombatUnit, weapon?: Equipment): number {
        const weaponToUse = weapon ?? getDefaultWeapon();
        if (!weaponToUse) return 0;

        // Calculate distance for damage calculation
        const targetPos = state.unitManifest.getUnitPosition(target);
        if (!targetPos) return 0;

        const distance = Math.abs(selfPosition.x - targetPos.x) +
                        Math.abs(selfPosition.y - targetPos.y);

        // Determine damage type from weapon modifiers
        // If weapon has magic power modifiers, it's magical, otherwise physical
        const hasMagicPower = weaponToUse.modifiers.magicPowerModifier !== 0 ||
                             weaponToUse.modifiers.magicPowerMultiplier !== 1;
        const damageType: 'physical' | 'magical' = hasMagicPower ? 'magical' : 'physical';

        return CombatCalculations.calculateAttackDamage(
          self,
          weaponToUse,
          target,
          distance,
          damageType
        );
      },

      // Helper: Predict hit chance
      predictHitChance(target: CombatUnit, weapon?: Equipment): number {
        const weaponToUse = weapon ?? getDefaultWeapon();
        if (!weaponToUse) return 0;

        // Calculate distance for hit chance calculation
        const targetPos = state.unitManifest.getUnitPosition(target);
        if (!targetPos) return 0;

        const distance = Math.abs(selfPosition.x - targetPos.x) +
                        Math.abs(selfPosition.y - targetPos.y);

        // Determine damage type from weapon modifiers
        // If weapon has magic power modifiers, it's magical, otherwise physical
        const hasMagicPower = weaponToUse.modifiers.magicPowerModifier !== 0 ||
                             weaponToUse.modifiers.magicPowerMultiplier !== 1;
        const damageType: 'physical' | 'magical' = hasMagicPower ? 'magical' : 'physical';

        return CombatCalculations.getChanceToHit(
          self,
          target,
          distance,
          damageType
        );
      },

      // Helper: Check if can defeat target
      canDefeat(target: CombatUnit): boolean {
        const damage = this.predictDamage(target);
        return damage >= target.health;
      },

      // Helper: Calculate distance
      getDistance(from: Position, to: Position): number {
        return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
      },
    };

    return context;
  }

  /**
   * Helper to safely get equipped weapons from a unit.
   * Handles both HumanoidUnit and other unit types.
   */
  private static getEquippedWeapons(unit: CombatUnit): Equipment[] | null {
    const humanoidUnit = unit as HumanoidUnit;
    if (typeof humanoidUnit.getEquippedWeapons === 'function') {
      return humanoidUnit.getEquippedWeapons();
    }
    return null;
  }
}
