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
import { PartyMemberRegistry } from '../utils/PartyMemberRegistry';
import type { PartyMemberDefinitionJSON } from '../utils/PartyMemberRegistry';
import { TilesetRegistry } from '../utils/TilesetRegistry';
import type { TilesetDefinitionJSON } from '../utils/TilesetRegistry';
import { FontRegistry } from '../utils/FontRegistry';
import { loadFontFromYAML } from '../utils/FontLoader';
import { EquipmentTagRegistry } from '../utils/EquipmentTagRegistry';
import type { EquipmentTagDefinitionJSON } from '../utils/EquipmentTagRegistry';
import { AreaMapDataLoader } from '../services/AreaMapDataLoader';

// Import YAML files as text
import abilityYaml from './ability-database.yaml?raw';
import classYaml from './class-database.yaml?raw';
import encounterYaml from './encounter-database.yaml?raw';
import spriteYaml from './sprite-definitions.yaml?raw';
import enemyYaml from './enemy-definitions.yaml?raw';
import partyYaml from './party-definitions.yaml?raw';
import equipmentYaml from './equipment-definitions.yaml?raw';
import equipmentTagYaml from './equipment-tag-definitions.yaml?raw';
import tilesetYaml from './tileset-database.yaml?raw';
import font7px04b03Yaml from './fonts/7px-04b03.yaml?raw';
import font7px5x7tinyj2Yaml from './fonts/7px-5x7tinyj2.yaml?raw';
import font8pxYaml from './fonts/8px-habbo8.yaml?raw';
import font9pxYaml from './fonts/9px-habbo.yaml?raw';
import font10pxYaml from './fonts/10px-bitfantasy.yaml?raw';
import font15pxYaml from './fonts/15px-dungeonslant.yaml?raw';
import areaTilesetYaml from './area-tileset-database.yaml?raw';
import areaMapYaml from './area-map-database.yaml?raw';

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
  minRange?: number;
  maxRange?: number;
  typeTags?: string[];
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
  allowedEquipmentTypes?: string[];
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
      equipData.id,
      equipData.minRange,
      equipData.maxRange,
      equipData.typeTags
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
      classData.id,
      classData.allowedEquipmentTypes
    );
  }

  console.log(`Loaded ${data.classes.length} unit classes`);
}

/**
 * Load tileset definitions from the YAML database
 * Must be called before loadEncounters() since encounters reference tilesets
 */
export function loadTilesets(): void {
  const data = yaml.load(tilesetYaml) as { tilesets: TilesetDefinitionJSON[] };

  for (const tilesetData of data.tilesets) {
    TilesetRegistry.register(tilesetData);
  }

  console.log(`Loaded ${data.tilesets.length} tilesets`);
}

/**
 * Load all combat encounters from the YAML database
 * Must be called after loadTilesets(), loadAbilities(), loadEquipment(), and loadClasses()
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
    // Provide default unitType for backward compatibility
    if (!enemyData.unitType) {
      enemyData.unitType = 'monster';
    }
    EnemyRegistry.register(enemyData);
  }

  console.log(`Loaded ${data.enemies.length} enemy definitions`);
}

/**
 * Load all party member definitions from the YAML database
 */
export function loadPartyMembers(): void {
  const data = yaml.load(partyYaml) as { partyMembers: PartyMemberDefinitionJSON[] };

  for (const partyData of data.partyMembers) {
    PartyMemberRegistry.register(partyData);
  }

  console.log(`Loaded ${data.partyMembers.length} party member definitions`);
}

/**
 * Load all equipment tag definitions from the YAML database
 */
export function loadEquipmentTags(): void {
  const data = yaml.load(equipmentTagYaml) as { tags: EquipmentTagDefinitionJSON[] };

  for (const tagData of data.tags) {
    EquipmentTagRegistry.register(tagData);
  }

  console.log(`Loaded ${data.tags.length} equipment tag definitions`);
}

/**
 * Load all font definitions from the YAML database
 */
export async function loadFonts(): Promise<void> {
  const fontYamls = [
    { name: '7px-04b03', yaml: font7px04b03Yaml },
    { name: '7px-5x7tinyj2', yaml: font7px5x7tinyj2Yaml },
    { name: '8px-habbo8', yaml: font8pxYaml },
    { name: '9px-habbo', yaml: font9pxYaml },
    { name: '10px-bitfantasy', yaml: font10pxYaml },
    { name: '15px-dungeonslant', yaml: font15pxYaml },
  ];

  let totalFonts = 0;

  for (const { name, yaml: fontYaml } of fontYamls) {
    try {
      const fonts = await loadFontFromYAML(fontYaml);
      FontRegistry.registerAll(fonts);
      totalFonts += fonts.length;
      console.log(`Loaded ${fonts.length} font(s) from ${name}`);
    } catch (error) {
      console.error(`Failed to load font ${name}:`, error);
    }
  }

  console.log(`Loaded ${totalFonts} total font definitions`);
}

/**
 * Load all game data from YAML files
 * Call this once at application startup
 */
export async function loadAllGameData(): Promise<void> {
  console.log('Loading game data...');

  // Order matters:
  // - Sprites should be loaded first (referenced by enemies and party members)
  // - Fonts should be loaded early (referenced by UI components)
  // - Equipment tags should be loaded early (referenced by UI)
  // - Abilities must be loaded before classes and encounters
  // - Equipment must be loaded before party members (they reference equipment)
  // - Enemies and party members should be loaded after classes (they reference unit classes)
  // - Tilesets must be loaded before encounters (encounters reference tilesets)
  // - Area map tilesets must be loaded before area maps
  loadSprites();
  await loadFonts();
  loadEquipmentTags();
  loadAbilities();
  loadEquipment();
  loadClasses();
  loadEnemies();
  loadPartyMembers();
  loadTilesets();
  loadEncounters();

  // Load area map data (tilesets and maps for first-person navigation)
  try {
    await AreaMapDataLoader.loadAll(areaTilesetYaml, areaMapYaml);
  } catch (error) {
    console.warn('[DataLoader] Failed to load area map data:', error);
  }

  console.log('Game data loaded successfully');
  console.log(`Total: ${SpriteRegistry.count} sprites, ${FontRegistry.count} fonts, ${EnemyRegistry.count} enemies, ${CombatAbility.getAll().length} abilities, ${Equipment.getAll().length} equipment, ${UnitClass.getAll().length} classes, ${TilesetRegistry.count} tilesets, ${CombatEncounter.getAll().length} encounters`);
}
