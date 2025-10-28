import type { UnitClass } from './UnitClass';
import type { CombatAbility } from './CombatAbility';

/**
 * Interface for combat units
 * All stats are calculated based on various factors
 */
export interface CombatUnit {
  /**
   * The unit's name
   */
  get name(): string;

  /**
   * The unit's primary character class
   */
  get unitClass(): UnitClass;

  /**
   * The unit's secondary character class (grants access to action abilities from this class)
   */
  get secondaryClass(): UnitClass | null;

  /**
   * Set of abilities this unit has learned
   */
  get learnedAbilities(): ReadonlySet<CombatAbility>;

  /**
   * Assigned reaction ability (triggered in response to events)
   */
  get reactionAbility(): CombatAbility | null;

  /**
   * Assigned passive ability (always active)
   */
  get passiveAbility(): CombatAbility | null;

  /**
   * Assigned movement ability (special movement)
   */
  get movementAbility(): CombatAbility | null;

  /**
   * Total experience points this unit has accumulated
   */
  get totalExperience(): number;

  /**
   * Mapping from UnitClass ID to experience earned in that class
   */
  get classExperience(): ReadonlyMap<string, number>;

  /**
   * Mapping from UnitClass ID to experience spent on abilities from that class
   */
  get classExperienceSpent(): ReadonlyMap<string, number>;

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
   * Current action timer value (0-100+)
   * Starts at 0 at combat start
   * Increases by speed * deltaTime * ACTION_TIMER_MULTIPLIER each frame
   * When reaches 100+, unit is ready to take their turn
   * Overflow behavior determined by UnitTurnPhase
   */
  get actionTimer(): number;

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

  /**
   * Stat used to determine success of courage-based abilities
   */
  get courage(): number;

  /**
   * Stat used to determine success of attunement-based abilities
   */
  get attunement(): number;

  /**
   * The sprite ID used to render this unit
   */
  get spriteId(): string;

  /**
   * Whether this unit is controlled by the player
   * Player-controlled units wait for input during their turn
   */
  get isPlayerControlled(): boolean;

  /**
   * Converts the unit to a JSON-serializable format
   */
  toJSON(): unknown;
}
