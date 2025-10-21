import * as yaml from 'js-yaml';
import { CombatAbility } from '../models/combat/CombatAbility';
import { Equipment } from '../models/combat/Equipment';
import { UnitClass } from '../models/combat/UnitClass';
import type { EquipmentType } from '../models/combat/Equipment';
import type { AbilityType } from '../models/combat/CombatAbility';

// Import YAML files as text
import abilityYaml from './ability-database.yaml?raw';
import equipmentYaml from './equipment-database.yaml?raw';
import classYaml from './class-database.yaml?raw';

/**
 * Interface for ability data from YAML
 */
interface AbilityData {
  id: string;
  name: string;
  description: string;
  abilityType: AbilityType;
  experiencePrice: number;
  tags?: string[];
}

/**
 * Interface for equipment data from YAML
 */
interface EquipmentData {
  id: string;
  name: string;
  type: EquipmentType;
  modifiers?: Record<string, number>;
  multipliers?: Record<string, number>;
}

/**
 * Interface for class data from YAML
 */
interface ClassData {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  learnableAbilities?: string[];
  modifiers?: Record<string, number>;
  multipliers?: Record<string, number>;
  requirements?: Record<string, number>;
}

/**
 * Load all combat abilities from the YAML database
 * Must be called before loading classes (which reference abilities)
 */
export function loadAbilities(): void {
  const data = yaml.load(abilityYaml) as { abilities: AbilityData[] };

  for (const abilityData of data.abilities) {
    new CombatAbility(
      abilityData.name,
      abilityData.description,
      abilityData.abilityType,
      abilityData.experiencePrice,
      abilityData.tags || [],
      abilityData.id
    );
  }

  console.log(`Loaded ${data.abilities.length} combat abilities`);
}

/**
 * Load all equipment from the YAML database
 */
export function loadEquipment(): void {
  const data = yaml.load(equipmentYaml) as { equipment: EquipmentData[] };

  for (const equipData of data.equipment) {
    new Equipment(
      equipData.name,
      equipData.type,
      equipData.modifiers,
      equipData.multipliers,
      equipData.id
    );
  }

  console.log(`Loaded ${data.equipment.length} equipment items`);
}

/**
 * Load all unit classes from the YAML database
 * Must be called after loadAbilities() since classes reference abilities
 */
export function loadClasses(): void {
  const data = yaml.load(classYaml) as { classes: ClassData[] };

  for (const classData of data.classes) {
    // Resolve ability IDs to CombatAbility objects
    const learnableAbilities = (classData.learnableAbilities || [])
      .map(abilityId => CombatAbility.getById(abilityId))
      .filter((ability): ability is CombatAbility => ability !== undefined);

    // Log warning if any abilities were not found
    const missingCount = (classData.learnableAbilities?.length || 0) - learnableAbilities.length;
    if (missingCount > 0) {
      console.warn(`Class ${classData.name} has ${missingCount} missing ability references`);
    }

    // Convert requirements Record to Map
    const requirements = new Map<string, number>(
      Object.entries(classData.requirements || {})
    );

    new UnitClass(
      classData.name,
      classData.description,
      classData.tags || [],
      learnableAbilities,
      classData.modifiers,
      classData.multipliers,
      requirements,
      classData.id
    );
  }

  console.log(`Loaded ${data.classes.length} unit classes`);
}

/**
 * Load all game data from YAML files
 * Call this once at application startup
 */
export function loadAllGameData(): void {
  console.log('Loading game data...');

  // Order matters: abilities must be loaded before classes
  loadAbilities();
  loadEquipment();
  loadClasses();

  console.log('Game data loaded successfully');
  console.log(`Total: ${CombatAbility.getAll().length} abilities, ${Equipment.getAll().length} equipment, ${UnitClass.getAll().length} classes`);
}
