import type { CombatUnit } from './CombatUnit';
import { Equipment } from './Equipment';
import { UnitClass } from './UnitClass';
import type { CombatAbility } from './CombatAbility';

/**
 * Implementation of CombatUnit for humanoid characters
 */
export class HumanoidUnit implements CombatUnit {
  private _name: string;
  private _unitClass: UnitClass;
  private _secondaryClass: UnitClass | null = null;
  private _learnedAbilities: Set<CombatAbility> = new Set();
  private _totalExperience: number = 0;
  private _classExperience: Map<string, number> = new Map();

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
  private _turnGauge: number = 0;

  // Equipment slots
  private _leftHand: Equipment | null = null;
  private _rightHand: Equipment | null = null;
  private _head: Equipment | null = null;
  private _body: Equipment | null = null;
  private _accessory: Equipment | null = null;

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
    baseAttunement: number
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
  }

  get name(): string {
    return this._name;
  }

  get unitClass(): UnitClass {
    return this._unitClass;
  }

  get secondaryClass(): UnitClass | null {
    return this._secondaryClass;
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
    return this._totalExperience;
  }

  get classExperience(): ReadonlyMap<string, number> {
    return this._classExperience;
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

  get turnGauge(): number {
    return this._turnGauge;
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

  // Equipment slot getters
  get leftHand(): Equipment | null {
    return this._leftHand;
  }

  get rightHand(): Equipment | null {
    return this._rightHand;
  }

  get head(): Equipment | null {
    return this._head;
  }

  get body(): Equipment | null {
    return this._body;
  }

  get accessory(): Equipment | null {
    return this._accessory;
  }

  // Equipment management methods
  equipLeftHand(equipment: Equipment | null): void {
    this._leftHand = equipment;
  }

  equipRightHand(equipment: Equipment | null): void {
    this._rightHand = equipment;
  }

  equipHead(equipment: Equipment | null): void {
    this._head = equipment;
  }

  equipBody(equipment: Equipment | null): void {
    this._body = equipment;
  }

  equipAccessory(equipment: Equipment | null): void {
    this._accessory = equipment;
  }

  unequipLeftHand(): Equipment | null {
    const item = this._leftHand;
    this._leftHand = null;
    return item;
  }

  unequipRightHand(): Equipment | null {
    const item = this._rightHand;
    this._rightHand = null;
    return item;
  }

  unequipHead(): Equipment | null {
    const item = this._head;
    this._head = null;
    return item;
  }

  unequipBody(): Equipment | null {
    const item = this._body;
    this._body = null;
    return item;
  }

  unequipAccessory(): Equipment | null {
    const item = this._accessory;
    this._accessory = null;
    return item;
  }

  // Experience management methods
  /**
   * Add experience points to this unit
   * @param amount The amount of experience to add
   * @param unitClass Optional class to attribute the experience to
   */
  addExperience(amount: number, unitClass?: UnitClass): void {
    if (amount < 0) {
      throw new Error("Cannot add negative experience");
    }
    this._totalExperience += amount;

    // If a class is specified, add to that class's experience using the class ID
    if (unitClass) {
      const currentClassXp = this._classExperience.get(unitClass.id) ?? 0;
      this._classExperience.set(unitClass.id, currentClassXp + amount);
    }
  }

  /**
   * Get experience earned in a specific class
   * @param unitClass The class to check
   * @returns The amount of experience earned in that class
   */
  getClassExperience(unitClass: UnitClass): number {
    return this._classExperience.get(unitClass.id) ?? 0;
  }

  /**
   * Get the amount of unspent experience (total - spent on abilities)
   */
  get unspentExperience(): number {
    let spent = 0;
    for (const ability of this._learnedAbilities) {
      spent += ability.experiencePrice;
    }
    return this._totalExperience - spent;
  }

  // Ability management methods
  /**
   * Learn a new ability
   * @param ability The ability to learn
   * @returns true if the ability was learned, false if it was already known
   */
  learnAbility(ability: CombatAbility): boolean {
    if (this._learnedAbilities.has(ability)) {
      return false;
    }
    this._learnedAbilities.add(ability);
    return true;
  }

  /**
   * Check if this unit has learned a specific ability
   */
  hasAbility(ability: CombatAbility): boolean {
    return this._learnedAbilities.has(ability);
  }

  /**
   * Forget an ability
   * @param ability The ability to forget
   * @returns true if the ability was forgotten, false if it wasn't known
   */
  forgetAbility(ability: CombatAbility): boolean {
    return this._learnedAbilities.delete(ability);
  }

  /**
   * Check if this unit can afford to learn an ability
   */
  canAffordAbility(ability: CombatAbility): boolean {
    return this.unspentExperience >= ability.experiencePrice;
  }

  // Class management methods
  /**
   * Set the secondary class for this unit
   * @param unitClass The class to set as secondary, or null to clear
   */
  setSecondaryClass(unitClass: UnitClass | null): void {
    this._secondaryClass = unitClass;
  }

  /**
   * Get action abilities available from the primary class
   * @returns Array of learned action abilities from the primary class
   */
  getPrimaryActions(): CombatAbility[] {
    const available: CombatAbility[] = [];

    for (const ability of this._unitClass.learnableAbilities) {
      if (ability.abilityType === "Action" && this.hasAbility(ability)) {
        available.push(ability);
      }
    }

    return available;
  }

  /**
   * Get action abilities available from the secondary class
   * @returns Array of learned action abilities from the secondary class (empty if no secondary class)
   */
  getSecondaryActions(): CombatAbility[] {
    const available: CombatAbility[] = [];

    if (this._secondaryClass) {
      for (const ability of this._secondaryClass.learnableAbilities) {
        if (ability.abilityType === "Action" && this.hasAbility(ability)) {
          available.push(ability);
        }
      }
    }

    return available;
  }

  // Ability assignment methods
  /**
   * Assign a reaction ability to the reaction slot
   * @param ability The ability to assign (must be Reaction type and learned)
   * @returns true if assigned successfully, false otherwise
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
   * @param ability The ability to assign (must be Passive type and learned)
   * @returns true if assigned successfully, false otherwise
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
   * @param ability The ability to assign (must be Movement type and learned)
   * @returns true if assigned successfully, false otherwise
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
}
