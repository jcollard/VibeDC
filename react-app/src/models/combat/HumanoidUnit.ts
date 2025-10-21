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
  private _learnedAbilities: Set<CombatAbility> = new Set();
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

  get learnedAbilities(): ReadonlySet<CombatAbility> {
    return this._learnedAbilities;
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
}
