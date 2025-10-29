import { CombatUnitModifiers } from './CombatUnitModifiers';
import { EquipmentTagRegistry } from '../../utils/EquipmentTagRegistry';

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
   * @deprecated Use typeTags and class allowedEquipmentTypes instead
   */
  public readonly allowedClasses: ReadonlySet<string>;

  /**
   * Type tags for equipment restrictions (e.g., "heavy-weapon", "light-armor")
   * Empty array or undefined means no type restrictions
   */
  public readonly typeTags: readonly string[];

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
    maxRange?: number,
    typeTags?: string[]
  ) {
    this.id = id ?? crypto.randomUUID();
    this.name = name;
    this.type = type;
    this.modifiers = new CombatUnitModifiers(modifiers, multipliers);
    this.allowedClasses = allowedClasses;
    this.minRange = minRange;
    this.maxRange = maxRange;
    this.typeTags = typeTags ?? [];

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
   * Uses type tags system if available, falls back to allowedClasses for backward compatibility
   * @param unitClass The UnitClass to check, or class ID string for legacy support
   * @returns true if the class can equip this item, false otherwise
   */
  canBeEquippedBy(unitClass: import('./UnitClass').UnitClass | string): boolean {
    // Handle legacy string-based class ID check
    if (typeof unitClass === 'string') {
      // Backward compatibility: check old allowedClasses system
      if (this.allowedClasses.size === 0) {
        return true;
      }
      return this.allowedClasses.has(unitClass);
    }

    // New type tags system
    // If equipment has no type tags, check old system or allow all
    if (!this.typeTags || this.typeTags.length === 0) {
      // Fall back to old system if it has restrictions
      if (this.allowedClasses.size > 0) {
        return this.allowedClasses.has(unitClass.id);
      }
      // No restrictions at all
      return true;
    }

    // Equipment has type tags - check if class allows them
    // Only check restriction tags (e.g., "light-weapon", "heavy-armor")
    // Ignore non-restriction tags (e.g., "magical-weapon", "accessory")
    const restrictionTags = this.typeTags.filter(tag => EquipmentTagRegistry.isRestriction(tag));

    // If equipment has no restriction tags, it can be equipped by anyone
    if (restrictionTags.length === 0) {
      return true;
    }

    if (!unitClass.allowedEquipmentTypes || unitClass.allowedEquipmentTypes.length === 0) {
      // Class has no restrictions, but equipment does have restriction tags
      // Cannot equip unless equipment explicitly allows all classes
      return this.typeTags.includes("all-classes");
    }

    // Check if any restriction tag is in the class's allowed list
    return restrictionTags.some(tag =>
      unitClass.allowedEquipmentTypes.includes(tag)
    );
  }

  /**
   * Check if any of the given classes can equip this item
   * @param classIds Array of class IDs to check
   * @returns true if at least one class can equip, false otherwise
   * @deprecated This method only works with legacy string IDs, prefer canBeEquippedBy with UnitClass objects
   */
  canBeEquippedByAny(classIds: string[]): boolean {
    // Backward compatibility: check old allowedClasses system
    if (this.allowedClasses.size === 0 && (!this.typeTags || this.typeTags.length === 0)) {
      return true;
    }
    return classIds.some(classId => this.canBeEquippedBy(classId));
  }

  /**
   * Check if this equipment is a weapon
   * @returns true if this is a OneHandedWeapon or TwoHandedWeapon, false otherwise
   */
  isWeapon(): boolean {
    return this.type === 'OneHandedWeapon' || this.type === 'TwoHandedWeapon';
  }
}
