import { CombatUnit } from './CombatUnit';

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
}
