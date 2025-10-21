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
  /**
   * Registry of all created equipment, indexed by ID
   */
  private static registry: Map<string, Equipment> = new Map();

  public readonly id: string;
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
    }>,
    id?: string
  ) {
    this.id = id ?? crypto.randomUUID();
    this.name = name;
    this.type = type;
    this.modifiers = new CombatUnitModifiers(modifiers, multipliers);

    // Register this equipment in the registry
    Equipment.registry.set(this.id, this);
  }

  /**
   * Get Equipment by its ID
   * @param id The ID of the equipment to retrieve
   * @returns The Equipment with the given ID, or undefined if not found
   */
  static getById(id: string): Equipment | undefined {
    return Equipment.registry.get(id);
  }

  /**
   * Get all registered equipment
   * @returns Array of all Equipment instances
   */
  static getAll(): Equipment[] {
    return Array.from(Equipment.registry.values());
  }

  /**
   * Clear the equipment registry (useful for testing)
   */
  static clearRegistry(): void {
    Equipment.registry.clear();
  }
}
