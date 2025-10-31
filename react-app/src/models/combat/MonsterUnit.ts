import type { CombatUnit } from './CombatUnit';
import type { UnitClass } from './UnitClass';
import type { CombatAbility } from './CombatAbility';
import { UnitClass as UnitClassImpl } from './UnitClass';
import { CombatAbility as CombatAbilityImpl } from './CombatAbility';

/**
 * JSON representation of a MonsterUnit for serialization
 */
export interface MonsterUnitJSON {
  name: string;
  unitClassId: string;
  learnedAbilityIds: string[];
  reactionAbilityId: string | null;
  passiveAbilityId: string | null;
  movementAbilityId: string | null;
  baseHealth: number;
  baseMana: number;
  basePhysicalPower: number;
  baseMagicPower: number;
  baseSpeed: number;
  baseMovement: number;
  basePhysicalEvade: number;
  baseMagicEvade: number;
  baseCourage: number;
  baseAttunement: number;
  wounds: number;
  manaUsed: number;
  actionTimer: number;
  spriteId: string;
  isPlayerControlled: boolean;
}

/**
 * Implementation of CombatUnit for monsters and non-humanoid enemies.
 * Unlike HumanoidUnit, monsters do not have equipment slots or secondary classes.
 * Their stats are fixed at creation and only modified by their class and abilities.
 */
export class MonsterUnit implements CombatUnit {
  private _name: string;
  private _unitClass: UnitClass;
  private _learnedAbilities: Set<CombatAbility> = new Set();

  // Assignable ability slots
  private _reactionAbility: CombatAbility | null = null;
  private _passiveAbility: CombatAbility | null = null;
  private _movementAbility: CombatAbility | null = null;

  private baseHealth: number;
  private baseMana: number;
  private basePhysicalPower: number;
  private baseMagicPower: number;
  private baseSpeed: number;
  private baseMovement: number;
  private basePhysicalEvade: number;
  private baseMagicEvade: number;
  private baseCourage: number;
  private baseAttunement: number;

  private _wounds: number = 0;
  private _manaUsed: number = 0;
  private _actionTimer: number = 0;

  private _spriteId: string;
  private _isPlayerControlled: boolean = false;

  constructor(
    name: string,
    unitClass: UnitClass,
    baseHealth: number,
    baseMana: number,
    basePhysicalPower: number,
    baseMagicPower: number,
    baseSpeed: number,
    baseMovement: number,
    basePhysicalEvade: number,
    baseMagicEvade: number,
    baseCourage: number,
    baseAttunement: number,
    spriteId: string = "default-monster",
    isPlayerControlled: boolean = false
  ) {
    this._name = name;
    this._unitClass = unitClass;
    this.baseHealth = baseHealth;
    this.baseMana = baseMana;
    this.basePhysicalPower = basePhysicalPower;
    this.baseMagicPower = baseMagicPower;
    this.baseSpeed = baseSpeed;
    this.baseMovement = baseMovement;
    this.basePhysicalEvade = basePhysicalEvade;
    this.baseMagicEvade = baseMagicEvade;
    this.baseCourage = baseCourage;
    this.baseAttunement = baseAttunement;
    this._spriteId = spriteId;
    this._isPlayerControlled = isPlayerControlled;
  }

  get name(): string {
    return this._name;
  }

  get unitClass(): UnitClass {
    return this._unitClass;
  }

  get secondaryClass(): UnitClass | null {
    return null; // Monsters don't have secondary classes
  }

  get learnedAbilities(): ReadonlySet<CombatAbility> {
    return this._learnedAbilities;
  }

  get reactionAbility(): CombatAbility | null {
    return this._reactionAbility;
  }

  get passiveAbility(): CombatAbility | null {
    return this._passiveAbility;
  }

  get movementAbility(): CombatAbility | null {
    return this._movementAbility;
  }

  get totalExperience(): number {
    return 0; // Monsters don't gain experience
  }

  get classExperience(): ReadonlyMap<string, number> {
    return new Map(); // Monsters don't track class experience
  }

  get classExperienceSpent(): ReadonlyMap<string, number> {
    return new Map(); // Monsters don't spend experience
  }

  get health(): number {
    return Math.max(0, this.maxHealth - this._wounds);
  }

  get maxHealth(): number {
    return this.baseHealth;
  }

  get wounds(): number {
    return this._wounds;
  }

  get mana(): number {
    return Math.max(0, this.maxMana - this._manaUsed);
  }

  get maxMana(): number {
    return this.baseMana;
  }

  get manaUsed(): number {
    return this._manaUsed;
  }

  get physicalPower(): number {
    return this.basePhysicalPower;
  }

  get magicPower(): number {
    return this.baseMagicPower;
  }

  get speed(): number {
    return this.baseSpeed;
  }

  get actionTimer(): number {
    return this._actionTimer;
  }

  get movement(): number {
    return this.baseMovement;
  }

  get physicalEvade(): number {
    return this.basePhysicalEvade;
  }

  get magicEvade(): number {
    return this.baseMagicEvade;
  }

  get courage(): number {
    return this.baseCourage;
  }

  get attunement(): number {
    return this.baseAttunement;
  }

  get spriteId(): string {
    return this._spriteId;
  }

  get isPlayerControlled(): boolean {
    return this._isPlayerControlled;
  }

  get isKnockedOut(): boolean {
    return this.wounds >= this.maxHealth;
  }

  setPlayerControlled(value: boolean): void {
    this._isPlayerControlled = value;
  }

  /**
   * Add an ability to this monster's learned abilities
   */
  learnAbility(ability: CombatAbility): boolean {
    if (!this._unitClass.learnableAbilities.includes(ability)) {
      return false;
    }
    this._learnedAbilities.add(ability);
    return true;
  }

  /**
   * Remove an ability from this monster's learned abilities
   */
  forgetAbility(ability: CombatAbility): boolean {
    return this._learnedAbilities.delete(ability);
  }

  /**
   * Check if this monster has learned a specific ability
   */
  hasAbility(ability: CombatAbility): boolean {
    return this._learnedAbilities.has(ability);
  }

  /**
   * Assign a reaction ability to the reaction slot
   */
  assignReactionAbility(ability: CombatAbility | null): boolean {
    if (ability === null) {
      this._reactionAbility = null;
      return true;
    }

    if (ability.abilityType !== "Reaction") {
      return false;
    }

    if (!this.hasAbility(ability)) {
      return false;
    }

    this._reactionAbility = ability;
    return true;
  }

  /**
   * Assign a passive ability to the passive slot
   */
  assignPassiveAbility(ability: CombatAbility | null): boolean {
    if (ability === null) {
      this._passiveAbility = null;
      return true;
    }

    if (ability.abilityType !== "Passive") {
      return false;
    }

    if (!this.hasAbility(ability)) {
      return false;
    }

    this._passiveAbility = ability;
    return true;
  }

  /**
   * Assign a movement ability to the movement slot
   */
  assignMovementAbility(ability: CombatAbility | null): boolean {
    if (ability === null) {
      this._movementAbility = null;
      return true;
    }

    if (ability.abilityType !== "Movement") {
      return false;
    }

    if (!this.hasAbility(ability)) {
      return false;
    }

    this._movementAbility = ability;
    return true;
  }

  /**
   * Convert this MonsterUnit to a JSON-serializable object
   */
  toJSON(): MonsterUnitJSON {
    return {
      name: this._name,
      unitClassId: this._unitClass.id,
      learnedAbilityIds: Array.from(this._learnedAbilities).map(a => a.id),
      reactionAbilityId: this._reactionAbility?.id ?? null,
      passiveAbilityId: this._passiveAbility?.id ?? null,
      movementAbilityId: this._movementAbility?.id ?? null,
      baseHealth: this.baseHealth,
      baseMana: this.baseMana,
      basePhysicalPower: this.basePhysicalPower,
      baseMagicPower: this.baseMagicPower,
      baseSpeed: this.baseSpeed,
      baseMovement: this.baseMovement,
      basePhysicalEvade: this.basePhysicalEvade,
      baseMagicEvade: this.baseMagicEvade,
      baseCourage: this.baseCourage,
      baseAttunement: this.baseAttunement,
      wounds: this._wounds,
      manaUsed: this._manaUsed,
      actionTimer: this._actionTimer,
      spriteId: this._spriteId,
      isPlayerControlled: this._isPlayerControlled,
    };
  }

  /**
   * Create a MonsterUnit from a JSON object
   */
  static fromJSON(json: MonsterUnitJSON): MonsterUnit | null {
    // Look up the unit class
    const unitClass = UnitClassImpl.getById(json.unitClassId);
    if (!unitClass) {
      console.error(`Failed to deserialize MonsterUnit: UnitClass with id ${json.unitClassId} not found`);
      return null;
    }

    // Create the monster
    const monster = new MonsterUnit(
      json.name,
      unitClass,
      json.baseHealth,
      json.baseMana,
      json.basePhysicalPower,
      json.baseMagicPower,
      json.baseSpeed,
      json.baseMovement,
      json.basePhysicalEvade,
      json.baseMagicEvade,
      json.baseCourage,
      json.baseAttunement,
      json.spriteId ?? "default-monster",
      json.isPlayerControlled ?? false
    );

    // Restore learned abilities
    for (const abilityId of json.learnedAbilityIds) {
      const ability = CombatAbilityImpl.getById(abilityId);
      if (ability) {
        monster._learnedAbilities.add(ability);
      } else {
        console.warn(`Ability with id ${abilityId} not found for monster ${json.name}`);
      }
    }

    // Restore assigned abilities
    if (json.reactionAbilityId) {
      const ability = CombatAbilityImpl.getById(json.reactionAbilityId);
      if (ability) {
        monster._reactionAbility = ability;
      }
    }

    if (json.passiveAbilityId) {
      const ability = CombatAbilityImpl.getById(json.passiveAbilityId);
      if (ability) {
        monster._passiveAbility = ability;
      }
    }

    if (json.movementAbilityId) {
      const ability = CombatAbilityImpl.getById(json.movementAbilityId);
      if (ability) {
        monster._movementAbility = ability;
      }
    }

    // Restore combat state
    monster._wounds = json.wounds;
    monster._manaUsed = json.manaUsed;
    monster._actionTimer = json.actionTimer;

    return monster;
  }
}
