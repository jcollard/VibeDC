import * as yaml from 'js-yaml';
import { CombatAbility } from '../models/combat/CombatAbility';
import { Equipment } from '../models/combat/Equipment';
import { UnitClass } from '../models/combat/UnitClass';
import { CombatEncounter } from '../models/combat/CombatEncounter';
import type { CombatEncounterJSON } from '../models/combat/CombatEncounter';
import type { EquipmentType } from '../models/combat/Equipment';
import type { AbilityType } from '../models/combat/CombatAbility';
import { SpriteRegistry } from '../utils/SpriteRegistry';
import type { SpriteDefinitionJSON } from '../utils/SpriteRegistry';
import { EnemyRegistry } from '../utils/EnemyRegistry';
import type { EnemyDefinitionJSON } from '../utils/EnemyRegistry';

// Import YAML files as text
import abilityYaml from './ability-database.yaml?raw';
import classYaml from './class-database.yaml?raw';
import encounterYaml from './encounter-database.yaml?raw';
import spriteYaml from './sprite-definitions.yaml?raw';
import enemyYaml from './enemy-definitions.yaml?raw';
import equipmentYaml from './equipment-definitions.yaml?raw';

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
  allowedClasses?: string[];
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
 * Load all equipment from the YAML database file
 */
export function loadEquipment(): void {
  const data = yaml.load(equipmentYaml) as { equipment: EquipmentData[] };

  for (const equipData of data.equipment) {
    // Convert allowedClasses array to Set
    const allowedClasses = new Set<string>(equipData.allowedClasses || []);

    new Equipment(
      equipData.name,
      equipData.type,
      equipData.modifiers,
      equipData.multipliers,
      allowedClasses,
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
 * Load all combat encounters from the YAML database
 * Must be called after loadAbilities(), loadEquipment(), and loadClasses()
 * since encounters reference these entities
 */
export function loadEncounters(): void {
  const data = yaml.load(encounterYaml) as { encounters: CombatEncounterJSON[] };

  for (const encounterData of data.encounters) {
    try {
      CombatEncounter.fromJSON(encounterData);
    } catch (error) {
      console.error(`Failed to load encounter ${encounterData.id}:`, error);
    }
  }

  console.log(`Loaded ${data.encounters.length} combat encounters`);
}

/**
 * Load all sprite definitions from the YAML database
 */
export function loadSprites(): void {
  const data = yaml.load(spriteYaml) as { sprites: SpriteDefinitionJSON[] };

  for (const spriteData of data.sprites) {
    SpriteRegistry.register(spriteData);
  }

  console.log(`Loaded ${data.sprites.length} sprite definitions`);
}

/**
 * Load all enemy definitions from the YAML database
 */
export function loadEnemies(): void {
  const data = yaml.load(enemyYaml) as { enemies: EnemyDefinitionJSON[] };

  for (const enemyData of data.enemies) {
    EnemyRegistry.register(enemyData);
  }

  console.log(`Loaded ${data.enemies.length} enemy definitions`);
}

/**
 * Load all game data from YAML files
 * Call this once at application startup
 */
export function loadAllGameData(): void {
  console.log('Loading game data...');

  // Order matters:
  // - Sprites should be loaded first (referenced by enemies)
  // - Abilities must be loaded before classes and encounters
  // - Enemies should be loaded after classes (they reference unit classes)
  loadSprites();
  loadAbilities();
  loadEquipment();
  loadClasses();
  loadEnemies();
  loadEncounters();

  console.log('Game data loaded successfully');
  console.log(`Total: ${SpriteRegistry.count} sprites, ${EnemyRegistry.count} enemies, ${CombatAbility.getAll().length} abilities, ${Equipment.getAll().length} equipment, ${UnitClass.getAll().length} classes, ${CombatEncounter.getAll().length} encounters`);
}
