import type { CombatUnit } from '../CombatUnit';
import type { Equipment } from '../Equipment';
import { CombatConstants } from '../CombatConstants';

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
   * Formula:
   * - Physical: Base Hit = 100% - Defender's Physical Evade
   *   - If Attacker's Courage > Defender's Courage: Bonus = (difference × 0.25)%
   * - Magical: Base Hit = 100% - Defender's Magic Evade
   *   - If Attacker's Attunement > Defender's Attunement: Bonus = (difference × 0.25)%
   * - Final hit chance clamped between 3% and 97%
   *
   * @param attacker - The attacking unit
   * @param defender - The defending unit
   * @param distance - Manhattan distance between attacker and defender
   * @param damageType - Type of damage ('physical' or 'magical')
   * @returns Hit chance as a number between 0 and 1 (0 = 0%, 1 = 100%)
   */
  static getChanceToHit(
    attacker: CombatUnit,
    defender: CombatUnit,
    _distance: number,
    damageType: 'physical' | 'magical'
  ): number {
    // Check for developer mode override (persists until cleared)
    if (this.nextHitRateOverride !== null) {
      const override = this.nextHitRateOverride;
      console.log(`[DEV] Using hit rate override: ${(override * 100).toFixed(0)}%`);
      return override;
    }

    // Calculate base hit chance from evasion
    let baseHitChance: number;
    let mentalStatBonus = 0;

    if (damageType === 'physical') {
      // Base hit = 100% - Physical Evade
      baseHitChance = 100 - defender.physicalEvade;

      // Courage bonus (only if attacker has more courage)
      if (attacker.courage > defender.courage) {
        mentalStatBonus = (attacker.courage - defender.courage) * 0.25;
      }
    } else {
      // Base hit = 100% - Magic Evade
      baseHitChance = 100 - defender.magicEvade;

      // Attunement bonus (only if attacker has more attunement)
      if (attacker.attunement > defender.attunement) {
        mentalStatBonus = (attacker.attunement - defender.attunement) * 0.25;
      }
    }

    // Apply mental stat bonus
    let finalHitChance = baseHitChance + mentalStatBonus;

    // Clamp between 3% and 97%
    finalHitChance = Math.max(3, Math.min(97, finalHitChance));

    // Convert to decimal (0-1 range)
    return finalHitChance / 100;
  }

  /**
   * Calculates the damage dealt by an attack.
   *
   * Formula:
   * - Physical: Base = (Attacker's Physical Power + Weapon Physical Power Modifier) × Weapon Physical Power Multiplier
   *   - If Defender's Courage > Attacker's Courage: Penalty = floor(difference × 0.25)
   * - Magical: Base = (Attacker's Magic Power + Weapon Magic Power Modifier) × Weapon Magic Power Multiplier
   *   - If Defender's Attunement > Attacker's Attunement: Penalty = floor(difference × 0.25)
   * - Final damage = max(0, Base - Penalty)
   * - Unarmed: If weapon is null, uses Physical Power with no modifiers/multipliers (1.0)
   *
   * @param attacker - The attacking unit
   * @param weapon - The weapon being used (null for unarmed attacks)
   * @param defender - The defending unit
   * @param distance - Manhattan distance between attacker and defender
   * @param damageType - Type of damage ('physical' or 'magical')
   * @returns Damage dealt as an integer
   */
  static calculateAttackDamage(
    attacker: CombatUnit,
    weapon: Equipment | null,
    defender: CombatUnit,
    _distance: number,
    damageType: 'physical' | 'magical'
  ): number {
    // Check for developer mode override (persists until cleared)
    if (this.nextDamageOverride !== null) {
      const override = this.nextDamageOverride;
      console.log(`[DEV] Using damage override: ${override}`);
      return override;
    }

    let baseDamage: number;
    let mentalStatPenalty = 0;

    if (damageType === 'physical') {
      // Physical damage: (Physical Power + Weapon Modifier) × Weapon Multiplier
      // Unarmed: Just use Physical Power with no modifiers (1.0 multiplier)
      const powerModifier = weapon?.modifiers.physicalPowerModifier ?? CombatConstants.AI.UNARMED_POWER_MODIFIER;
      const powerMultiplier = weapon?.modifiers.physicalPowerMultiplier ?? CombatConstants.AI.UNARMED_POWER_MULTIPLIER;
      baseDamage = (attacker.physicalPower + powerModifier) * powerMultiplier;

      // Courage penalty (only if defender has more courage)
      if (defender.courage > attacker.courage) {
        mentalStatPenalty = Math.floor((defender.courage - attacker.courage) * 0.25);
      }
    } else {
      // Magical damage: (Magic Power + Weapon Modifier) × Weapon Multiplier
      // Unarmed: Just use Magic Power with no modifiers (1.0 multiplier)
      const powerModifier = weapon?.modifiers.magicPowerModifier ?? CombatConstants.AI.UNARMED_POWER_MODIFIER;
      const powerMultiplier = weapon?.modifiers.magicPowerMultiplier ?? CombatConstants.AI.UNARMED_POWER_MULTIPLIER;
      baseDamage = (attacker.magicPower + powerModifier) * powerMultiplier;

      // Attunement penalty (only if defender has more attunement)
      if (defender.attunement > attacker.attunement) {
        mentalStatPenalty = Math.floor((defender.attunement - attacker.attunement) * 0.25);
      }
    }

    // Apply mental stat penalty
    let finalDamage = baseDamage - mentalStatPenalty;

    // Damage cannot be negative
    finalDamage = Math.max(0, finalDamage);

    // Return as integer (round down)
    return Math.floor(finalDamage);
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
