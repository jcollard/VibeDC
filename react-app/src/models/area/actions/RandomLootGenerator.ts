import type { EquipmentDefinition } from '../../../utils/EquipmentRegistry';
import type { EquipmentType } from '../../combat/Equipment';
import type { LootTable } from '../../combat/LootTable';
import type { CombatUnit } from '../../combat/CombatUnit';
import { Equipment } from '../../combat/Equipment';

/**
 * Adjectives for randomly generated equipment names
 */
const ADJECTIVES = [
  'Swift', 'Mighty', 'Dark', 'Light', 'Ancient', 'Cursed',
  'Blessed', 'Iron', 'Steel', 'Silver', 'Golden', 'Ruby',
  'Sapphire', 'Emerald', 'Crystal', 'Shadow', 'Flame', 'Frost',
  'Storm', 'Thunder', 'Lunar', 'Solar', 'Arcane', 'Divine',
  'Wicked', 'Noble', 'Savage', 'Regal', 'Mystic', 'Radiant',
  'Vile', 'Pure', 'Runed', 'Ethereal', 'Spectral', 'Infernal',
  'Celestial', 'Demonic', 'Unholy', 'Sacred', 'Dire', 'Grim',
  'Bright', 'Void', 'Chaos', 'Order', 'Primal', 'Elder',
];

/**
 * Nouns for weapons (OneHandedWeapon, TwoHandedWeapon)
 */
const WEAPON_NOUNS = [
  'Sword', 'Blade', 'Axe', 'Mace', 'Hammer', 'Spear',
  'Staff', 'Rod', 'Wand', 'Dagger', 'Saber', 'Scythe',
  'Lance', 'Pike', 'Glaive', 'Halberd', 'Flail', 'Maul',
  'Rapier', 'Katana', 'Claymore', 'Falchion', 'Cutlass', 'Longsword',
];

/**
 * Nouns for shields
 */
const SHIELD_NOUNS = [
  'Shield', 'Buckler', 'Aegis', 'Ward', 'Bulwark', 'Guard',
  'Barrier', 'Protector', 'Defender', 'Rampart',
];

/**
 * Nouns for head armor
 */
const HEAD_NOUNS = [
  'Helm', 'Crown', 'Circlet', 'Hood', 'Cap', 'Hat',
  'Headband', 'Diadem', 'Tiara', 'Mask', 'Visor', 'Coif',
];

/**
 * Nouns for body armor
 */
const BODY_NOUNS = [
  'Armor', 'Plate', 'Mail', 'Robe', 'Tunic', 'Vest',
  'Cloak', 'Cuirass', 'Hauberk', 'Jerkin', 'Coat', 'Mantle',
];

/**
 * Nouns for accessories
 */
const ACCESSORY_NOUNS = [
  'Ring', 'Amulet', 'Pendant', 'Charm', 'Talisman', 'Brooch',
  'Necklace', 'Band', 'Chain', 'Locket', 'Signet', 'Trinket',
];

/**
 * Stat ranges calculated from party equipment
 */
export interface PartyEquipmentRanges {
  minHealth: number;
  maxHealth: number;
  minMana: number;
  maxMana: number;
  minPhysicalPower: number;
  maxPhysicalPower: number;
  minMagicPower: number;
  maxMagicPower: number;
  minPhysicalEvade: number;
  maxPhysicalEvade: number;
  minMagicEvade: number;
  maxMagicEvade: number;
  minSpeed: number;
  maxSpeed: number;
  minMovement: number;
  maxMovement: number;
}

/**
 * Calculate equipment stat ranges from party members
 * This checks all equipped items across all party members to find min/max modifiers
 */
export function calculatePartyEquipmentRanges(partyMembers: CombatUnit[]): PartyEquipmentRanges {
  if (partyMembers.length === 0) {
    // Return default ranges if no party members
    return {
      minHealth: 0,
      maxHealth: 10,
      minMana: 0,
      maxMana: 5,
      minPhysicalPower: 1,
      maxPhysicalPower: 5,
      minMagicPower: 1,
      maxMagicPower: 5,
      minPhysicalEvade: 0,
      maxPhysicalEvade: 3,
      minMagicEvade: 0,
      maxMagicEvade: 3,
      minSpeed: 0,
      maxSpeed: 2,
      minMovement: 0,
      maxMovement: 1,
    };
  }

  // Collect all equipment modifiers from party
  const healthMods: number[] = [];
  const manaMods: number[] = [];
  const physicalPowerMods: number[] = [];
  const magicPowerMods: number[] = [];
  const physicalEvadeMods: number[] = [];
  const magicEvadeMods: number[] = [];
  const speedMods: number[] = [];
  const movementMods: number[] = [];

  // Check if party members have equipment (they might be HumanoidUnit instances)
  for (const member of partyMembers) {
    // Try to access equipment slots if they exist
    const humanoid = member as any;
    if (humanoid.leftHandEquipment || humanoid.rightHandEquipment || humanoid.headEquipment || humanoid.bodyEquipment || humanoid.accessoryEquipment) {
      const allEquipment = [
        humanoid.leftHandEquipment,
        humanoid.rightHandEquipment,
        humanoid.headEquipment,
        humanoid.bodyEquipment,
        humanoid.accessoryEquipment,
      ].filter((e): e is Equipment => e !== null && e !== undefined);

      for (const equipment of allEquipment) {
        const mods = equipment.modifiers;
        if (mods.healthModifier) healthMods.push(mods.healthModifier);
        if (mods.manaModifier) manaMods.push(mods.manaModifier);
        if (mods.physicalPowerModifier) physicalPowerMods.push(mods.physicalPowerModifier);
        if (mods.magicPowerModifier) magicPowerMods.push(mods.magicPowerModifier);
        if (mods.physicalEvadeModifier) physicalEvadeMods.push(mods.physicalEvadeModifier);
        if (mods.magicEvadeModifier) magicEvadeMods.push(mods.magicEvadeModifier);
        if (mods.speedModifier) speedMods.push(mods.speedModifier);
        if (mods.movementModifier) movementMods.push(mods.movementModifier);
      }
    }
  }

  // If no equipment found, use default ranges
  if (healthMods.length === 0) {
    return {
      minHealth: 0,
      maxHealth: 10,
      minMana: 0,
      maxMana: 5,
      minPhysicalPower: 1,
      maxPhysicalPower: 5,
      minMagicPower: 1,
      maxMagicPower: 5,
      minPhysicalEvade: 0,
      maxPhysicalEvade: 3,
      minMagicEvade: 0,
      maxMagicEvade: 3,
      minSpeed: 0,
      maxSpeed: 2,
      minMovement: 0,
      maxMovement: 1,
    };
  }

  return {
    minHealth: Math.min(...healthMods, 0),
    maxHealth: Math.max(...healthMods, 10),
    minMana: Math.min(...manaMods, 0),
    maxMana: Math.max(...manaMods, 5),
    minPhysicalPower: Math.min(...physicalPowerMods, 1),
    maxPhysicalPower: Math.max(...physicalPowerMods, 5),
    minMagicPower: Math.min(...magicPowerMods, 1),
    maxMagicPower: Math.max(...magicPowerMods, 5),
    minPhysicalEvade: Math.min(...physicalEvadeMods, 0),
    maxPhysicalEvade: Math.max(...physicalEvadeMods, 3),
    minMagicEvade: Math.min(...magicEvadeMods, 0),
    maxMagicEvade: Math.max(...magicEvadeMods, 3),
    minSpeed: Math.min(...speedMods, 0),
    maxSpeed: Math.max(...speedMods, 2),
    minMovement: Math.min(...movementMods, 0),
    maxMovement: Math.max(...movementMods, 1),
  };
}

/**
 * Generate a random equipment item for loot drops
 * Stats are scaled to be equal to or better than party equipment ranges
 * @param partyEquipmentRanges Optional equipment ranges from party (for scaling)
 * @returns Equipment definition ready to register
 */
export function generateRandomEquipment(partyEquipmentRanges?: PartyEquipmentRanges): EquipmentDefinition {
  // Pick random equipment type
  const types: EquipmentType[] = ['OneHandedWeapon', 'TwoHandedWeapon', 'Shield', 'Head', 'Body', 'Accessory'];
  const type = types[Math.floor(Math.random() * types.length)];

  // Pick appropriate noun based on type
  let nouns: string[];
  switch (type) {
    case 'OneHandedWeapon':
    case 'TwoHandedWeapon':
      nouns = WEAPON_NOUNS;
      break;
    case 'Shield':
      nouns = SHIELD_NOUNS;
      break;
    case 'Head':
      nouns = HEAD_NOUNS;
      break;
    case 'Body':
      nouns = BODY_NOUNS;
      break;
    case 'Accessory':
      nouns = ACCESSORY_NOUNS;
      break;
    default:
      nouns = WEAPON_NOUNS;
  }

  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  // Create name and limit to 12 characters
  let name = `${adjective} ${noun}`;
  if (name.length > 12) {
    name = name.substring(0, 12);
  }

  // Generate stats based on party equipment ranges (always equal or better)
  const ranges = partyEquipmentRanges || {
    minHealth: 0, maxHealth: 10,
    minMana: 0, maxMana: 5,
    minPhysicalPower: 1, maxPhysicalPower: 5,
    minMagicPower: 1, maxMagicPower: 5,
    minPhysicalEvade: 0, maxPhysicalEvade: 3,
    minMagicEvade: 0, maxMagicEvade: 3,
    minSpeed: 0, maxSpeed: 2,
    minMovement: 0, maxMovement: 1,
  };

  const modifiers: any = {};

  // Generate stats based on equipment type
  if (type === 'OneHandedWeapon' || type === 'TwoHandedWeapon') {
    // Weapons give power bonuses
    const physPower = ranges.maxPhysicalPower + Math.floor(Math.random() * (ranges.maxPhysicalPower + 1));
    const magPower = ranges.maxMagicPower + Math.floor(Math.random() * (ranges.maxMagicPower + 1));
    if (physPower > 0) modifiers.physicalPower = physPower;
    if (magPower > 0) modifiers.magicPower = magPower;
  } else if (type === 'Shield') {
    // Shields give defense bonuses
    const physEvade = ranges.maxPhysicalEvade + Math.floor(Math.random() * (ranges.maxPhysicalEvade + 1));
    const magEvade = ranges.maxMagicEvade + Math.floor(Math.random() * (ranges.maxMagicEvade + 1));
    if (physEvade > 0) modifiers.physicalEvade = physEvade;
    if (magEvade > 0) modifiers.magicEvade = magEvade;
  } else if (type === 'Head' || type === 'Body') {
    // Armor gives HP and evade bonuses
    const health = ranges.maxHealth + Math.floor(Math.random() * (ranges.maxHealth + 1));
    const physEvade = ranges.maxPhysicalEvade + Math.floor(Math.random() * (ranges.maxPhysicalEvade + 1));
    if (health > 0) modifiers.health = health;
    if (physEvade > 0) modifiers.physicalEvade = physEvade;
  } else if (type === 'Accessory') {
    // Accessories give mixed bonuses
    const mana = ranges.maxMana + Math.floor(Math.random() * (ranges.maxMana + 1));
    const speed = ranges.maxSpeed + Math.floor(Math.random() * (ranges.maxSpeed + 1));
    if (mana > 0) modifiers.mana = mana;
    if (speed > 0) modifiers.speed = speed;
  }

  // Generate unique ID
  const id = `random-loot-${type.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // Add weapon range if it's a weapon
  const equipmentDef: EquipmentDefinition = {
    id,
    name,
    type,
    modifiers,
  };

  if (type === 'OneHandedWeapon') {
    equipmentDef.minRange = 1;
    equipmentDef.maxRange = 1;
  } else if (type === 'TwoHandedWeapon') {
    equipmentDef.minRange = 1;
    equipmentDef.maxRange = 2;
  }

  return equipmentDef;
}

/**
 * Generate a loot table with a 20% drop rate for a random equipment item
 * @param partyEquipmentRanges Optional equipment ranges from party (for scaling)
 * @returns Loot table with one item at 20% drop rate
 */
export function generateRandomLootTable(partyEquipmentRanges?: PartyEquipmentRanges): { lootTable: LootTable; equipmentDef: EquipmentDefinition } {
  const equipmentDef = generateRandomEquipment(partyEquipmentRanges);

  const lootTable: LootTable = {
    entries: [
      {
        equipmentId: equipmentDef.id,
        dropRate: 20, // 20% drop rate as requested
      },
    ],
  };

  return { lootTable, equipmentDef };
}
