import { CombatUnitModifiers } from './CombatUnitModifiers';

/**
 * Equipment slot types
 */
export type EquipmentType =
  | "OneHandedWeapon"
  | "TwoHandedWeapon"
  | "Shield"
  | "Held"
  | "Head"
  | "Body"
  | "Accessory";

/**
 * Represents equipment that can modify a unit's combat stats
 */
export class Equipment {
  public readonly type: EquipmentType;
  public readonly name: string;

  /**
   * Modifiers applied to unit stats
   */
  public modifiers: CombatUnitModifiers;

  constructor(
    name: string,
    type: EquipmentType,
    modifiers?: Partial<{
      health: number;
      mana: number;
      physicalPower: number;
      magicPower: number;
      speed: number;
      movement: number;
      physicalEvade: number;
      magicEvade: number;
      courage: number;
      attunement: number;
    }>,
    multipliers?: Partial<{
      health: number;
      mana: number;
      physicalPower: number;
      magicPower: number;
      speed: number;
      movement: number;
      physicalEvade: number;
      magicEvade: number;
      courage: number;
      attunement: number;
    }>
  ) {
    this.name = name;
    this.type = type;
    this.modifiers = new CombatUnitModifiers(modifiers, multipliers);
  }
}
