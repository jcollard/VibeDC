/**
 * Interface for combat units
 * All stats are calculated based on various factors
 */
export interface CombatUnit {
  /**
   * Amount of wounds the unit can take before fainting
   */
  get health(): number;

  /**
   * The maximum health this unit may have
   */
  get maxHealth(): number;

  /**
   * The number of wounds this unit has sustained
   */
  get wounds(): number;

  /**
   * The maximum amount of energy available for using magic abilities
   */
  get mana(): number;

  /**
   * The maximum mana this unit may have
   */
  get maxMana(): number;

  /**
   * The amount of mana that has been used by this unit
   */
  get manaUsed(): number;

  /**
   * The base stat for calculating physical attack damage
   */
  get physicalPower(): number;

  /**
   * The base stat for calculating magical attack damage
   */
  get magicPower(): number;

  /**
   * Stat used to calculate turn order during combat
   */
  get speed(): number;

  /**
   * Current turn gauge value (0-100)
   * Starts at 0 at combat start
   * Increases by speed each step
   * When reaches 100, unit takes their turn
   * Resets after unit's turn
   */
  get turnGauge(): number;

  /**
   * The maximum distance this unit can move on the battlefield
   */
  get movement(): number;

  /**
   * Stat used to determine if a physical attack against this unit is successful
   */
  get physicalEvade(): number;

  /**
   * Stat used to determine if a magical attack against this unit is successful
   */
  get magicEvade(): number;
}
