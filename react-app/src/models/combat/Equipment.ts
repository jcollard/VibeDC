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

  /**
   * Set of class IDs that can equip this item
   * Empty set means all classes can equip
   */
  public readonly allowedClasses: ReadonlySet<string>;

  /**
   * Minimum attack range for weapons (undefined for non-weapons)
   */
  public readonly minRange?: number;

  /**
   * Maximum attack range for weapons (undefined for non-weapons)
   */
  public readonly maxRange?: number;

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
    allowedClasses: Set<string> = new Set(),
    id?: string,
    minRange?: number,
    maxRange?: number
  ) {
    this.id = id ?? crypto.randomUUID();
    this.name = name;
    this.type = type;
    this.modifiers = new CombatUnitModifiers(modifiers, multipliers);
    this.allowedClasses = allowedClasses;
    this.minRange = minRange;
    this.maxRange = maxRange;

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

  /**
   * Check if a unit with the given class can equip this item
   * @param classId The ID of the unit's class
   * @returns true if the class can equip this item, false otherwise
   */
  canBeEquippedBy(classId: string): boolean {
    // Empty set means all classes can equip
    if (this.allowedClasses.size === 0) {
      return true;
    }
    return this.allowedClasses.has(classId);
  }

  /**
   * Check if any of the given classes can equip this item
   * @param classIds Array of class IDs to check
   * @returns true if at least one class can equip, false otherwise
   */
  canBeEquippedByAny(classIds: string[]): boolean {
    // Empty set means all classes can equip
    if (this.allowedClasses.size === 0) {
      return true;
    }
    return classIds.some(classId => this.allowedClasses.has(classId));
  }

  /**
   * Check if this equipment is a weapon
   * @returns true if this is a OneHandedWeapon or TwoHandedWeapon, false otherwise
   */
  isWeapon(): boolean {
    return this.type === 'OneHandedWeapon' || this.type === 'TwoHandedWeapon';
  }
}
