import type { CombatUnit } from '../CombatUnit';
import type { Equipment } from '../Equipment';

/**
 * Combat calculation utilities for attack resolution.
 * Currently contains stub implementations that will be replaced with actual formulas.
 *
 * Developer Mode Functions:
 * - window.setHitRate(n): Override attack hit rate (0-1, e.g., 0.5 = 50%) - persists until cleared
 * - window.setDamage(n): Override attack damage (integer) - persists until cleared
 * - window.clearAttackOverride(): Clear all attack overrides
 */
export class CombatCalculations {
  // Developer mode overrides (persist until cleared)
  private static nextHitRateOverride: number | null = null;
  private static nextDamageOverride: number | null = null;
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
    // Check for developer mode override (persists until cleared)
    if (this.nextHitRateOverride !== null) {
      const override = this.nextHitRateOverride;
      console.log(`[DEV] Using hit rate override: ${(override * 100).toFixed(0)}%`);
      return override;
    }

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
    // Check for developer mode override (persists until cleared)
    if (this.nextDamageOverride !== null) {
      const override = this.nextDamageOverride;
      console.log(`[DEV] Using damage override: ${override}`);
      return override;
    }

    // Stub: Always 1 damage
    return 1;
  }

  /**
   * Developer mode function: Set hit rate override (persists until cleared)
   * @param hitRate - Hit rate as decimal (0-1, where 1 = 100%)
   */
  static setHitRate(hitRate: number): void {
    if (hitRate < 0 || hitRate > 1) {
      console.warn('[DEV] Hit rate must be between 0 and 1. Clamping value.');
      hitRate = Math.max(0, Math.min(1, hitRate));
    }
    this.nextHitRateOverride = hitRate;
    console.log(`[DEV] Attack hit rate override set to: ${(hitRate * 100).toFixed(0)}% (persists until cleared)`);
  }

  /**
   * Developer mode function: Set damage override (persists until cleared)
   * @param damage - Damage value (integer)
   */
  static setDamage(damage: number): void {
    if (damage < 0) {
      console.warn('[DEV] Damage cannot be negative. Setting to 0.');
      damage = 0;
    }
    this.nextDamageOverride = Math.floor(damage);
    console.log(`[DEV] Attack damage override set to: ${Math.floor(damage)} (persists until cleared)`);
  }

  /**
   * Developer mode function: Clear all attack overrides
   */
  static clearAttackOverride(): void {
    const hadHitRate = this.nextHitRateOverride !== null;
    const hadDamage = this.nextDamageOverride !== null;

    this.nextHitRateOverride = null;
    this.nextDamageOverride = null;

    if (hadHitRate || hadDamage) {
      console.log('[DEV] Attack overrides cleared');
    } else {
      console.log('[DEV] No attack overrides were active');
    }
  }
}
