import type { CombatUnit } from '../CombatUnit';
import type { Equipment } from '../Equipment';

/**
 * Combat calculation utilities for attack resolution.
 * Currently contains stub implementations that will be replaced with actual formulas.
 */
export class CombatCalculations {
  /**
   * Calculates the chance to hit for an attack.
   *
   * @param attacker - The attacking unit
   * @param defender - The defending unit
   * @param distance - Manhattan distance between attacker and defender
   * @param damageType - Type of damage ('physical' or 'magical')
   * @returns Hit chance as a number between 0 and 1 (0 = 0%, 1 = 100%)
   *
   * @stub Currently returns 1.0 (100% hit rate)
   * @future Will calculate based on attacker accuracy vs defender P.Evd/M.Evd
   */
  static getChanceToHit(
    _attacker: CombatUnit,
    _defender: CombatUnit,
    _distance: number,
    _damageType: 'physical' | 'magical'
  ): number {
    // Stub: Always 100% hit rate
    return 1.0;
  }

  /**
   * Calculates the damage dealt by an attack.
   *
   * @param attacker - The attacking unit
   * @param weapon - The weapon being used
   * @param defender - The defending unit
   * @param distance - Manhattan distance between attacker and defender
   * @param damageType - Type of damage ('physical' or 'magical')
   * @returns Damage dealt as an integer
   *
   * @stub Currently returns 1 (1 damage)
   * @future Will calculate based on weapon power, attacker P.Pow/M.Pow, defender defenses
   */
  static calculateAttackDamage(
    _attacker: CombatUnit,
    _weapon: Equipment,
    _defender: CombatUnit,
    _distance: number,
    _damageType: 'physical' | 'magical'
  ): number {
    // Stub: Always 1 damage
    return 1;
  }
}
