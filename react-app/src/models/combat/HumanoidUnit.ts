import type { CombatUnit } from './CombatUnit';
import { Equipment } from './Equipment';

/**
 * Implementation of CombatUnit for humanoid characters
 */
export class HumanoidUnit implements CombatUnit {
  private baseHealth: number;
  private baseMana: number;
  private basePhysicalPower: number;
  private baseMagicPower: number;
  private baseSpeed: number;
  private baseMovement: number;
  private basePhysicalEvade: number;
  private baseMagicEvade: number;

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
    baseHealth: number,
    baseMana: number,
    basePhysicalPower: number,
    baseMagicPower: number,
    baseSpeed: number,
    baseMovement: number,
    basePhysicalEvade: number,
    baseMagicEvade: number
  ) {
    this.baseHealth = baseHealth;
    this.baseMana = baseMana;
    this.basePhysicalPower = basePhysicalPower;
    this.baseMagicPower = baseMagicPower;
    this.baseSpeed = baseSpeed;
    this.baseMovement = baseMovement;
    this.basePhysicalEvade = basePhysicalEvade;
    this.baseMagicEvade = baseMagicEvade;
  }

  get health(): number {
    return this.baseHealth;
  }

  get wounds(): number {
    return this._wounds;
  }

  get mana(): number {
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
}
