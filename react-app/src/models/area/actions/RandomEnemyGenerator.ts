import type { EnemyDefinition } from '../../../utils/EnemyRegistry';

/**
 * Sprite definitions based on available monster and humanoid sprites
 */
interface SpriteDefinition {
  spriteId: string;
  names: string[];
  tags: string[];
}

const SPRITE_DEFINITIONS: SpriteDefinition[] = [
  // Humanoid fighters
  { spriteId: 'crystalwarriors-0', names: ['Crystal Warrior', 'Crystal Knight', 'Armored Fighter'], tags: ['humanoid', 'fighter', 'warrior'] },
  { spriteId: 'crystalwarriors-1', names: ['Crystal Sentinel', 'Crystal Guard', 'Crystal Defender'], tags: ['humanoid', 'fighter', 'warrior'] },
  { spriteId: 'crystalwarriors-2', names: ['Crystal Champion', 'Crystal Soldier', 'Crystal Swordsman'], tags: ['humanoid', 'fighter', 'warrior'] },
  { spriteId: 'crystalwarriors-3', names: ['Crystal Veteran', 'Crystal Legionnaire', 'Crystal Brute'], tags: ['humanoid', 'fighter', 'warrior'] },

  // Humanoid rogues
  { spriteId: 'crystalwarriors-4', names: ['Shadow Rogue', 'Crystal Thief', 'Night Stalker'], tags: ['humanoid', 'rogue', 'stealth'] },
  { spriteId: 'crystalwarriors-5', names: ['Crystal Assassin', 'Shadow Blade', 'Crystal Spy'], tags: ['humanoid', 'rogue', 'stealth'] },
  { spriteId: 'crystalwarriors-6', names: ['Dark Rogue', 'Crystal Scout', 'Shadow Runner'], tags: ['humanoid', 'rogue', 'stealth'] },
  { spriteId: 'crystalwarriors-7', names: ['Crystal Bandit', 'Outlaw', 'Shadow Striker'], tags: ['humanoid', 'rogue', 'stealth'] },

  // Humanoid mages
  { spriteId: 'crystalwarriors-8', names: ['Crystal Mage', 'Arcane Invoker', 'Crystal Sorcerer'], tags: ['humanoid', 'mage', 'magic'] },
  { spriteId: 'crystalwarriors-9', names: ['Crystal Warlock', 'Dark Mage', 'Crystal Enchanter'], tags: ['humanoid', 'mage', 'magic'] },
  { spriteId: 'crystalwarriors-10', names: ['Crystal Wizard', 'Arcane Master', 'Crystal Conjurer'], tags: ['humanoid', 'mage', 'magic'] },
  { spriteId: 'crystalwarriors-11', names: ['Crystal Elementalist', 'Storm Mage', 'Crystal Summoner'], tags: ['humanoid', 'mage', 'magic'] },
  { spriteId: 'monsters-52', names: ['Dark Wizard', 'Evil Sorcerer', 'Necromancer'], tags: ['humanoid', 'mage', 'magic', 'dark'] },

  // Monsters - Basic enemies
  { spriteId: 'monsters-0', names: ['Goblin', 'Orc', 'Kobold', 'Goblin Raider'], tags: ['monster', 'goblinoid', 'basic'] },
  { spriteId: 'monsters-4', names: ['Dragon Whelp', 'Demon Spawn', 'Beast', 'Hellhound'], tags: ['monster', 'dragon', 'demon', 'beast'] },
  { spriteId: 'monsters-8', names: ['Giant Spider', 'Web Spinner', 'Arachnid'], tags: ['monster', 'spider', 'vermin'] },
  { spriteId: 'monsters-12', names: ['Dark Knight', 'Armored Wraith', 'Shield Guardian'], tags: ['monster', 'undead', 'armored'] },
  { spriteId: 'monsters-16', names: ['Gargoyle', 'Winged Demon', 'Flying Terror'], tags: ['monster', 'flying', 'demon'] },
  { spriteId: 'monsters-20', names: ['Serpent', 'Giant Snake', 'Viper'], tags: ['monster', 'serpent', 'poison'] },
  { spriteId: 'monsters-24', names: ['Orc Warrior', 'Feline Beast', 'Cat Demon'], tags: ['monster', 'orc', 'beast'] },
  { spriteId: 'monsters-28', names: ['Whip Goblin', 'Goblin Slaver', 'Orc Taskmaster'], tags: ['monster', 'goblinoid', 'orc'] },
  { spriteId: 'monsters-32', names: ['Blob', 'Ooze', 'Slime Creature'], tags: ['monster', 'ooze', 'blob'] },
  { spriteId: 'monsters-36', names: ['Red Blob', 'Fire Ooze', 'Magma Slime'], tags: ['monster', 'ooze', 'fire'] },
  { spriteId: 'monsters-42', names: ['Gelatinous Cube', 'Transparent Ooze', 'Cube'], tags: ['monster', 'ooze', 'cube'] },
  { spriteId: 'monsters-44', names: ['Green Wyvern', 'Winged Lizard', 'Drake'], tags: ['monster', 'flying', 'dragon'] },
  { spriteId: 'monsters-48', names: ['Spear Demon', 'Tall Fiend', 'Horned Warrior'], tags: ['monster', 'demon', 'warrior'] },
  { spriteId: 'monsters-56', names: ['Giant Snail', 'Slug', 'Shell Beast'], tags: ['monster', 'vermin', 'slow'] },
  { spriteId: 'monsters-60', names: ['Beholder', 'Eye Tyrant', 'Floating Terror'], tags: ['monster', 'aberration', 'eye'] },

  // Slimes
  { spriteId: 'monsters2-0', names: ['Green Slime', 'Acid Blob', 'Toxic Ooze'], tags: ['monster', 'slime', 'poison'] },
  { spriteId: 'monsters2-4', names: ['Blue Slime', 'Water Blob', 'Frost Ooze'], tags: ['monster', 'slime', 'water'] },
  { spriteId: 'monsters2-8', names: ['Grey Slime', 'Stone Blob', 'Rocky Ooze'], tags: ['monster', 'slime', 'earth'] },
  { spriteId: 'monsters2-12', names: ['Pink Slime', 'Bubble Blob', 'Jelly'], tags: ['monster', 'slime', 'basic'] },
  { spriteId: 'monsters2-16', names: ['Orange Slime', 'Lava Blob', 'Fire Ooze'], tags: ['monster', 'slime', 'fire'] },
  { spriteId: 'monsters2-20', names: ['Red Slime', 'Blood Blob', 'Crimson Ooze'], tags: ['monster', 'slime', 'blood'] },
  { spriteId: 'monsters2-24', names: ['Rainbow Slime', 'Prismatic Blob', 'Crystal Ooze'], tags: ['monster', 'slime', 'magic'] },
  { spriteId: 'monsters2-28', names: ['White Slime', 'Pure Blob', 'Holy Ooze'], tags: ['monster', 'slime', 'holy'] },

  // Undead and spirits
  { spriteId: 'monsters2-32', names: ['Spectre', 'Wraith', 'Ghost'], tags: ['monster', 'undead', 'spirit'] },
  { spriteId: 'monsters2-36', names: ['Man Bat', 'Vampire Bat', 'Blood Bat'], tags: ['monster', 'flying', 'vampire'] },
  { spriteId: 'monsters2-40', names: ['Blue Man Bat', 'Frost Bat', 'Ice Bat'], tags: ['monster', 'flying', 'cold'] },
  { spriteId: 'monsters2-44', names: ['Ghost', 'Phantom', 'Spirit'], tags: ['monster', 'undead', 'spirit'] },
  { spriteId: 'monsters2-72', names: ['Skeleton', 'Bone Warrior', 'Undead Soldier'], tags: ['monster', 'undead', 'skeleton'] },
  { spriteId: 'monsters2-124', names: ['Flaming Skull', 'Fire Spirit', 'Burning Head'], tags: ['monster', 'undead', 'fire'] },
  { spriteId: 'monsters2-128', names: ['Blue Flaming Skull', 'Frost Spirit', 'Ice Head'], tags: ['monster', 'undead', 'cold'] },

  // Special creatures
  { spriteId: 'monsters2-50', names: ['Green Cube', 'Emerald Ooze', 'Jade Jelly'], tags: ['monster', 'ooze', 'cube'] },
  { spriteId: 'monsters2-52', names: ['Squid Monster', 'Tentacle Beast', 'Deep One'], tags: ['monster', 'aberration', 'water'] },
  { spriteId: 'monsters2-56', names: ['Faceless Horror', 'No-Face', 'Stick Demon'], tags: ['monster', 'aberration', 'horror'] },
  { spriteId: 'monsters2-60', names: ['Green Spike', 'Thorn Beast', 'Spiky Green'], tags: ['monster', 'beast', 'spike'] },
  { spriteId: 'monsters2-64', names: ['Blue Spike', 'Ice Thorn', 'Frost Spike'], tags: ['monster', 'beast', 'spike', 'cold'] },
  { spriteId: 'monsters2-68', names: ['Red Spike', 'Fire Thorn', 'Flame Spike'], tags: ['monster', 'beast', 'spike', 'fire'] },
  { spriteId: 'monsters2-76', names: ['Serpent', 'Viper', 'Snake'], tags: ['monster', 'serpent', 'poison'] },
  { spriteId: 'monsters2-80', names: ['Demogorgon', 'Demon Lord', 'Chaos Fiend'], tags: ['monster', 'demon', 'boss'] },

  // Mushrooms
  { spriteId: 'monsters2-84', names: ['Red Mushroom', 'Toadstool', 'Fungal Beast'], tags: ['monster', 'plant', 'fungus'] },
  { spriteId: 'monsters2-88', names: ['Orange Mushroom', 'Spore Beast', 'Fungal Creature'], tags: ['monster', 'plant', 'fungus'] },
  { spriteId: 'monsters2-92', names: ['Purple Mushroom', 'Toxic Fungus', 'Poison Shroom'], tags: ['monster', 'plant', 'fungus', 'poison'] },
  { spriteId: 'monsters2-96', names: ['Blue Mushroom', 'Frost Fungus', 'Ice Shroom'], tags: ['monster', 'plant', 'fungus', 'cold'] },

  // Trolls
  { spriteId: 'monsters2-100', names: ['Green Troll', 'Forest Troll', 'Swamp Troll'], tags: ['monster', 'troll', 'regeneration'] },
  { spriteId: 'monsters2-104', names: ['Orange Troll', 'Mountain Troll', 'Cave Troll'], tags: ['monster', 'troll', 'regeneration'] },
  { spriteId: 'monsters2-108', names: ['Blue Troll', 'Ice Troll', 'Frost Troll'], tags: ['monster', 'troll', 'cold', 'regeneration'] },

  // Elementals
  { spriteId: 'monsters2-112', names: ['Green Flame', 'Poison Fire', 'Toxic Flame'], tags: ['monster', 'elemental', 'fire', 'poison'] },
  { spriteId: 'monsters2-116', names: ['Blue Flame', 'Cold Fire', 'Frost Flame'], tags: ['monster', 'elemental', 'fire', 'cold'] },
  { spriteId: 'monsters2-120', names: ['Red Flame', 'Fire Elemental', 'Living Fire'], tags: ['monster', 'elemental', 'fire'] },

  // Dragons
  { spriteId: 'monsters2-132', names: ['Green Dragon', 'Forest Dragon', 'Emerald Wyrm'], tags: ['monster', 'dragon', 'poison'] },
  { spriteId: 'monsters2-136', names: ['Grey Dragon', 'Stone Dragon', 'Mountain Wyrm'], tags: ['monster', 'dragon', 'earth'] },
  { spriteId: 'monsters2-140', names: ['Red Dragon', 'Fire Dragon', 'Crimson Wyrm'], tags: ['monster', 'dragon', 'fire'] },
];

export interface PartyStatRanges {
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
}

/**
 * Calculate stat ranges from party members
 * @param partyMembers Array of party member combat units
 */
export function calculatePartyStatRanges(partyMembers: Array<{
  maxHealth: number;
  maxMana: number;
  physicalPower: number;
  magicPower: number;
  physicalEvade: number;
  magicEvade: number;
}>): PartyStatRanges {
  if (partyMembers.length === 0) {
    // Return default ranges if no party members
    return {
      minHealth: 20,
      maxHealth: 60,
      minMana: 8,
      maxMana: 40,
      minPhysicalPower: 6,
      maxPhysicalPower: 20,
      minMagicPower: 4,
      maxMagicPower: 18,
      minPhysicalEvade: 5,
      maxPhysicalEvade: 19,
      minMagicEvade: 5,
      maxMagicEvade: 19,
    };
  }

  const stats = {
    minHealth: Math.min(...partyMembers.map(m => m.maxHealth)),
    maxHealth: Math.max(...partyMembers.map(m => m.maxHealth)),
    minMana: Math.min(...partyMembers.map(m => m.maxMana)),
    maxMana: Math.max(...partyMembers.map(m => m.maxMana)),
    minPhysicalPower: Math.min(...partyMembers.map(m => m.physicalPower)),
    maxPhysicalPower: Math.max(...partyMembers.map(m => m.physicalPower)),
    minMagicPower: Math.min(...partyMembers.map(m => m.magicPower)),
    maxMagicPower: Math.max(...partyMembers.map(m => m.magicPower)),
    minPhysicalEvade: Math.min(...partyMembers.map(m => m.physicalEvade)),
    maxPhysicalEvade: Math.max(...partyMembers.map(m => m.physicalEvade)),
    minMagicEvade: Math.min(...partyMembers.map(m => m.magicEvade)),
    maxMagicEvade: Math.max(...partyMembers.map(m => m.magicEvade)),
  };

  return stats;
}

/**
 * Generates a random enemy definition for procedural encounters
 * @param partyStatRanges Optional stat ranges based on party members (for difficulty scaling)
 */
export function generateRandomEnemy(partyStatRanges?: PartyStatRanges): EnemyDefinition {
  // Pick a random sprite
  const sprite = SPRITE_DEFINITIONS[Math.floor(Math.random() * SPRITE_DEFINITIONS.length)];

  // Pick a random name from the sprite's names
  const name = sprite.names[Math.floor(Math.random() * sprite.names.length)];

  // Determine unit type based on tags
  const unitType: 'monster' | 'humanoid' = sprite.tags.includes('humanoid') ? 'humanoid' : 'monster';

  // Determine unit class based on tags
  let unitClassId = 'monster';
  if (unitType === 'humanoid') {
    if (sprite.tags.includes('fighter') || sprite.tags.includes('warrior')) {
      unitClassId = 'fighter';
    } else if (sprite.tags.includes('rogue')) {
      unitClassId = 'rogue';
    } else if (sprite.tags.includes('mage')) {
      unitClassId = 'mage';
    }
  }

  // Generate random stats
  let baseHealth: number;
  let baseMana: number;
  let basePhysicalPower: number;
  let baseMagicPower: number;
  let basePhysicalEvade: number;
  let baseMagicEvade: number;

  if (partyStatRanges) {
    // Scale to party stats - use party's stat ranges
    baseHealth = partyStatRanges.minHealth + Math.floor(Math.random() * (partyStatRanges.maxHealth - partyStatRanges.minHealth + 1));
    baseMana = partyStatRanges.minMana + Math.floor(Math.random() * (partyStatRanges.maxMana - partyStatRanges.minMana + 1));
    basePhysicalPower = partyStatRanges.minPhysicalPower + Math.floor(Math.random() * (partyStatRanges.maxPhysicalPower - partyStatRanges.minPhysicalPower + 1));
    baseMagicPower = partyStatRanges.minMagicPower + Math.floor(Math.random() * (partyStatRanges.maxMagicPower - partyStatRanges.minMagicPower + 1));
    basePhysicalEvade = partyStatRanges.minPhysicalEvade + Math.floor(Math.random() * (partyStatRanges.maxPhysicalEvade - partyStatRanges.minPhysicalEvade + 1));
    baseMagicEvade = partyStatRanges.minMagicEvade + Math.floor(Math.random() * (partyStatRanges.maxMagicEvade - partyStatRanges.minMagicEvade + 1));
  } else {
    // Default stats (scaled to be reasonable for early-mid game)
    const level = Math.floor(Math.random() * 5) + 1; // Level 1-5
    baseHealth = 15 + Math.floor(Math.random() * 20) + (level * 5); // 20-60 HP
    baseMana = 5 + Math.floor(Math.random() * 15) + (level * 3); // 8-40 MP
    basePhysicalPower = 5 + Math.floor(Math.random() * 10) + level; // 6-20
    baseMagicPower = 3 + Math.floor(Math.random() * 10) + level; // 4-18
    basePhysicalEvade = 5 + Math.floor(Math.random() * 15); // 5-19
    baseMagicEvade = 5 + Math.floor(Math.random() * 15); // 5-19
  }

  const baseSpeed = 5 + Math.floor(Math.random() * 8); // 5-12
  const baseMovement = 2 + Math.floor(Math.random() * 3); // 2-4
  const baseCourage = 5 + Math.floor(Math.random() * 10); // 5-14
  const baseAttunement = 5 + Math.floor(Math.random() * 10); // 5-14

  // XP and gold based on stats
  const xpValue = Math.floor((baseHealth + basePhysicalPower + baseMagicPower) / 3);
  const goldValue = Math.floor(xpValue / 2) + Math.floor(Math.random() * 10);

  // Generate unique ID
  const id = `random-${sprite.spriteId.replace('/', '-')}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  return {
    id,
    name,
    unitType,
    unitClassId,
    baseHealth,
    baseMana,
    basePhysicalPower,
    baseMagicPower,
    baseSpeed,
    baseMovement,
    basePhysicalEvade,
    baseMagicEvade,
    baseCourage,
    baseAttunement,
    spriteId: sprite.spriteId,
    xpValue,
    goldValue,
    tags: sprite.tags,
  };
}
