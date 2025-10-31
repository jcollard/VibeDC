# Pool of Radiance - Monster Bestiary

## Table of Contents
- [Understanding Monster Stats](#understanding-monster-stats)
- [Humanoid Monsters](#humanoid-monsters)
- [Undead](#undead)
- [Animals & Beasts](#animals--beasts)
- [Magical Creatures](#magical-creatures)
- [Dragons](#dragons)
- [Boss Monsters](#boss-monsters)
- [NPC Enemies](#npc-enemies)

---

## Understanding Monster Stats

### Monster Stat Block Format

**Typical Entry:**
```
MONSTER NAME
Hit Dice: XdY
Armor Class: X
Hit Points: X
THAC0: X
Attacks: X
Damage: XdY
Special: [Abilities]
Magic Resistance: X%
Alignment: [L/N/C] [G/N/E]
```

### Key Terms

**Hit Dice (HD):**
- Represents monster power level
- 1 HD = 1d8 HP (usually)
- Affects Sleep spell (Sleep doesn't work on 6+ HD creatures)

**Armor Class (AC):**
- Lower is better
- Ranges from 10 (unarmored) to -10 (nearly unhittable)

**THAC0:**
- Number needed to hit AC 0
- Lower THAC0 = better attacker

**Attacks:**
- Number of attacks per round
- Example: "2" = two attacks, "3" = three attacks

**Damage:**
- Dice rolled for damage per attack
- Example: "1d6" or "2d4"

**Special:**
- Special abilities, immunities, attacks
- Poison, paralysis, level drain, etc.

---

## Humanoid Monsters

Common intelligent monsters encountered throughout Phlan.

### Kobolds

**Hit Dice:** 1d4 HP (very weak)
**Armor Class:** 7 (leather armor)
**THAC0:** 20
**Attacks:** 1
**Damage:** 1d4 (dagger or sling)
**Special:** None
**Alignment:** Lawful Evil

**Tactics Against:**
- **Sleep spell** - Instant win (under 6 HD)
- Melee attacks work fine
- Extremely weak enemies
- Often first enemies encountered

**Common Locations:**
- Kobold Caves
- Slums
- Wilderness areas

**Loot:** Copper, silver, occasional magic items

---

### Goblins

**Hit Dice:** 1d8 HP
**Armor Class:** 6 (leather + shield)
**THAC0:** 20
**Attacks:** 1
**Damage:** 1d6 (short sword)
**Special:** -1 to hit in sunlight
**Alignment:** Lawful Evil

**Tactics Against:**
- **Sleep spell** - Very effective
- Weak enemies, easy to kill
- Watch for numbers (can overwhelm if many)

**Common Locations:**
- Slums
- Wilderness areas
- Random encounters

**Loot:** Small gold amounts, occasional weapons

---

### Orcs

**Hit Dice:** 1d8 HP
**Armor Class:** 6 (ring mail)
**THAC0:** 19
**Attacks:** 1
**Damage:** 1d8 (scimitar or long sword)
**Special:** -1 to hit in sunlight
**Alignment:** Lawful Evil

**Tactics Against:**
- **Sleep spell** - Effective on groups
- Slightly tougher than goblins/kobolds
- Use area spells on large groups

**Common Locations:**
- Slums
- Sokal Keep area
- Wilderness

**Loot:** Gold, weapons, occasional magic items

---

### Hobgoblins

**Hit Dice:** 1+1d8 HP (~9 HP average)
**Armor Class:** 5 (scale mail + shield)
**THAC0:** 18
**Attacks:** 1
**Damage:** 1d8 (long sword)
**Special:** None
**Alignment:** Lawful Evil

**Tactics Against:**
- **Sleep spell** - Works (under 4+4 HD)
- Tougher than goblins/orcs
- Often in organized groups
- Reasonable threat in numbers

**Common Locations:**
- Kuto's Well
- Podol Plaza
- Various dungeons

**Loot:** Gold, better equipment than goblins

---

### Gnolls

**Hit Dice:** 2d8 HP (~9 HP)
**Armor Class:** 5 (scale mail + shield)
**THAC0:** 18
**Attacks:** 1
**Damage:** 2d4 (halberd or morning star)
**Special:** None
**Alignment:** Chaotic Evil

**Tactics Against:**
- **Sleep spell** - Works
- Hyena-headed humanoids
- Moderate threat
- Good damage output

**Common Locations:**
- Slums
- Random wilderness encounters
- Sokal Keep area

**Loot:** Gold, weapons

---

### Ogres

**Hit Dice:** 4+1d8 HP (~23 HP)
**Armor Class:** 5 (tough hide)
**THAC0:** 15
**Attacks:** 1
**Damage:** 1d10 (huge club)
**Special:** None
**Alignment:** Chaotic Evil

**Tactics Against:**
- **Sleep doesn't work** (too many HD)
- **Stinking Cloud** - Very effective
- **Hold Person** - Doesn't work (not humanoid in AD&D rules)
- High HP, high damage
- Dangerous in melee
- Use magic and ranged attacks

**Common Locations:**
- Slums (first major encounter)
- Various dungeons
- Wilderness

**Strategy:**
- Cast Stinking Cloud to disable
- Use chokepoints
- Focus fire

**Loot:** Gold, sometimes gems

---

### Bugbears

**Hit Dice:** 3+1d8 HP (~17 HP)
**Armor Class:** 5 (tough hide + shield)
**THAC0:** 16
**Attacks:** 1
**Damage:** 2d4 (morning star)
**Special:** Surprise on 1-3 (on 1d6)
**Alignment:** Chaotic Evil

**Tactics Against:**
- **Stinking Cloud** - Effective
- Often get surprise (be careful)
- Moderate threat
- Tough but manageable

**Common Locations:**
- Various dungeons
- Random encounters

**Loot:** Gold, weapons

---

## Undead

Undead are immune to Sleep, Charm, and Hold Person. Clerics can Turn or Destroy them.

### Skeletons

**Hit Dice:** 1d8 HP
**Armor Class:** 7
**THAC0:** 19
**Attacks:** 1
**Damage:** 1d6 (scimitar or short sword)
**Special:**
- Immune to Sleep, Charm, Hold Person
- Only damaged by blunt weapons (or magic)
- Immune to cold
**Alignment:** Neutral (controlled)

**Tactics Against:**
- **Turn Undead** - Very effective (level 3+ clerics auto-turn)
- Use blunt weapons (swords do half damage)
- Magic always works
- Weak undead, not very dangerous

**Common Locations:**
- Sokal Keep
- Valhingen Graveyard
- Valjevo Castle

**Loot:** Occasionally coins from corpses

---

### Zombies

**Hit Dice:** 2d8 HP (~9 HP)
**Armor Class:** 8 (rotting flesh)
**THAC0:** 18
**Attacks:** 1
**Damage:** 1d8 (claw/strike)
**Special:**
- Immune to Sleep, Charm, Hold Person
- Only damaged by blunt weapons (or magic)
- Immune to cold
- Always fight to destruction (never flee)
**Alignment:** Neutral (controlled)

**Tactics Against:**
- **Turn Undead** - Effective (level 3+ clerics)
- Slow but relentless
- Use blunt weapons or magic
- Not very dangerous individually

**Common Locations:**
- Sokal Keep
- Valhingen Graveyard
- Various crypts

**Loot:** None usually

---

### Ghouls

**Hit Dice:** 2d8 HP (~9 HP)
**Armor Class:** 6
**THAC0:** 17
**Attacks:** 3 (2 claws, 1 bite)
**Damage:** 1d3/1d3/1d6
**Special:**
- **Paralysis** - Claws/bite paralyze on hit (save vs. paralysis)
- Elves immune to paralysis
- Immune to Sleep, Charm, Hold Person
**Alignment:** Chaotic Evil

**Tactics Against:**
- **Turn Undead** - Effective
- **DANGEROUS** - Paralysis can disable characters
- Elves immune to paralysis (use elves in front!)
- Kill quickly before they paralyze party
- Magic works normally

**Common Locations:**
- Valhingen Graveyard
- Various crypts and dungeons

**Loot:** Sometimes treasure from victims

**WARNING:** Paralyzed characters are helpless. Protect them!

---

### Shadows

**Hit Dice:** 3+3d8 HP (~16 HP)
**Armor Class:** 7
**THAC0:** 16
**Attacks:** 1
**Damage:** 1d4+1
**Special:**
- **Drains 1 Strength per hit**
- If Strength reaches 0, character becomes Shadow
- Immune to Sleep, Charm, Hold Person
- Only hit by silver or magical weapons
**Alignment:** Chaotic Evil

**Tactics Against:**
- **Turn Undead** - Works but requires higher-level cleric
- **Use silver or magical weapons**
- **VERY DANGEROUS** - Strength drain is permanent until restoration
- Kill quickly
- Magic works

**Common Locations:**
- Valhingen Graveyard
- Mendor's Library
- Crypts

**Loot:** Variable

**WARNING:** Strength drain is very dangerous. Use magical weapons, kill fast.

---

### Wights

**Hit Dice:** 4+3d8 HP (~21 HP)
**Armor Class:** 5
**THAC0:** 15
**Attacks:** 1
**Damage:** 1d4
**Special:**
- **Energy Drain** - Drains 1 level per hit
- Only hit by silver or magical weapons
- Immune to Sleep, Charm, Hold Person, Poison
**Alignment:** Lawful Evil

**Tactics Against:**
- **Turn Undead** - Level 6+ clerics can turn
- **EXTREMELY DANGEROUS** - Level drain is devastating
- Use silver or magical weapons only
- Avoid melee if possible
- Magic spells work (Fireball, etc.)

**Common Locations:**
- Valhingen Graveyard
- High-level crypts

**Loot:** Sometimes treasure

**WARNING:** Level drain removes levels permanently (until restoration). Avoid getting hit!

---

### Spectres

**Hit Dice:** 7+3d8 HP (~35 HP)
**Armor Class:** 2
**THAC0:** 13
**Attacks:** 1
**Damage:** 1d8
**Special:**
- **Energy Drain** - Drains 2 levels per hit
- Only hit by magical weapons (+1 or better)
- Immune to Sleep, Charm, Hold Person, Poison
**Alignment:** Lawful Evil

**Tactics Against:**
- **Turn Undead** - Requires high-level cleric
- **EXTREMELY DANGEROUS** - 2 levels drained per hit
- Magical weapons required (+1 minimum)
- Avoid melee at all costs
- Use ranged magic (Fireball, Lightning Bolt)

**Common Locations:**
- Mendor's Library
- High-level dungeons

**Loot:** Variable treasure

**WARNING:** One hit can cripple a character. Don't engage in melee unless necessary.

---

### Mummies

**Hit Dice:** 6+3d8 HP (~30 HP)
**Armor Class:** 3
**THAC0:** 13
**Attacks:** 1
**Damage:** 1d12
**Special:**
- **Mummy Rot (Disease)** - Melee hit causes disease
- Disease reduces max HP and stats
- **Mummy Fear** - Must save vs. fear or flee
- Only take half damage from non-magical weapons
- Only take half damage from magical weapons
- Full damage from fire and magic spells
- Immune to Sleep, Charm, Hold Person, Poison, Cold
**Alignment:** Lawful Evil

**Tactics Against:**
- **Turn Undead** - High-level clerics can turn
- **Memorize Cure Disease spells** (essential!)
- **Use Fireball/Lightning Bolt** (full damage from spells)
- Avoid melee (disease is very dangerous)
- Cure disease immediately after combat

**Common Locations:**
- **Valhingen Graveyard** (main location)
- High-level tombs

**Loot:** Often valuable treasure (guarding tombs)

**CRITICAL:** Valhingen Graveyard should be attempted LAST (high-level area). Bring multiple Cure Disease spells!

---

### Vampires

**Hit Dice:** 8+3d8 HP (~40 HP)
**Armor Class:** 1
**THAC0:** 12
**Attacks:** 1
**Damage:** 1d10
**Special:**
- **Energy Drain** - Drains 2 levels per hit
- **Charm gaze**
- Only hit by magical weapons (+1 or better)
- Regenerates 3 HP per round
- Immune to Sleep, Charm, Hold Person, Poison, Lightning
**Alignment:** Chaotic Evil

**Tactics Against:**
- **Use Efreet Bottle** - Summons fire genie to help fight
- **Turn Undead** - Very high-level clerics only
- Magical weapons required
- Regenerates (must kill quickly)
- EXTREMELY dangerous

**Common Locations:**
- Valhingen Graveyard (boss)

**Loot:** Significant treasure

**REQUIRED ITEM:** Efreet Bottle (summons ally to help)

---

## Animals & Beasts

### Giant Rats

**Hit Dice:** 1d4 HP
**Armor Class:** 7
**THAC0:** 20
**Attacks:** 1
**Damage:** 1d3
**Special:** 5% chance of disease per bite
**Alignment:** Neutral

**Tactics Against:**
- Sleep spell works
- Very weak
- Watch for disease (rare but possible)

**Common Locations:**
- Sewers, dungeons, Kuto's Well

---

### Wild Dogs

**Hit Dice:** 1+1d8 HP
**Armor Class:** 7
**THAC0:** 18
**Attacks:** 1
**Damage:** 1d4 (bite)
**Special:** None
**Alignment:** Neutral

**Tactics Against:**
- Sleep works
- Weak enemies
- Often in packs

**Common Locations:**
- Slums
- Wilderness

---

### Wolves

**Hit Dice:** 2+2d8 HP
**Armor Class:** 7
**THAC0:** 16
**Attacks:** 1
**Damage:** 1d6 (bite)
**Special:** None
**Alignment:** Neutral

**Tactics Against:**
- Sleep works
- Moderate threat in packs
- Standard combat

**Common Locations:**
- Wilderness areas

---

### Giant Mantis

**Hit Dice:** 4d8 HP
**Armor Class:** 5
**THAC0:** 15
**Attacks:** 2 (claws)
**Damage:** 1d6/1d6
**Special:** Bite and hold attack (grapple)
**Alignment:** Neutral

**Tactics Against:**
- Stinking Cloud works
- Dangerous if grapples
- Kill before it can hold

**Common Locations:**
- Wilderness, dungeons

---

## Magical Creatures

### Basilisk

**Hit Dice:** 6+3d8 HP (~30 HP)
**Armor Class:** 4
**THAC0:** 13
**Attacks:** 1
**Damage:** 1d10 (bite)
**Special:**
- **Petrifying Gaze** - Turns victim to stone (save vs. petrification)
- **COUNTERED BY MIRROR** - Equipped mirror reflects gaze harmlessly
- Gaze is reflectable
**Alignment:** Neutral

**Tactics Against:**
- **EQUIP MIRRORS** (brass or silver) - AUTO-PROTECTION
- If mirrored: Safe, fight normally
- If not mirrored: Very dangerous
- Magical weapons recommended

**Common Locations:**
- Mendor's Library

**CRITICAL:** Buy mirrors for entire party before Mendor's Library!

**Loot:** Variable

---

### Medusa

**Hit Dice:** 6d8 HP (~27 HP)
**Armor Class:** 5
**THAC0:** 13
**Attacks:** 1 (snake bite) or weapon
**Damage:** Variable
**Special:**
- **Petrifying Gaze** - Turns victim to stone (save vs. petrification)
- **COUNTERED BY MIRROR** - Equipped mirror reflects gaze
- Poisonous snake hair
**Alignment:** Lawful Evil

**Tactics Against:**
- **EQUIP MIRRORS** - Essential
- Same as basilisk (mirrors protect)
- Can use weapons in combat

**Common Locations:**
- Rare encounters in dungeons

**Loot:** Often treasure (statues were adventurers)

---

### Displacer Beast

**Hit Dice:** 6d8 HP (~27 HP)
**Armor Class:** 4 (appears 2 feet from actual location)
**THAC0:** 13
**Attacks:** 2 (tentacles)
**Damage:** 2d4/2d4
**Special:**
- Displacement (harder to hit)
- -2 penalty to attacks against it
- Saves at +2
**Alignment:** Neutral

**Tactics Against:**
- Magic works normally
- Harder to hit in melee
- Use magic attacks
- Dangerous tentacle attacks

**Common Locations:**
- Various dungeons

**Loot:** Sometimes Displacer Cloak

---

## Dragons

### Bronze Dragon (Possessed by Tyranthraxus)

**Hit Dice:** 14d8 HP (~70+ HP)
**Armor Class:** 0
**THAC0:** 7
**Attacks:** 3 (2 claws, 1 bite) + breath
**Damage:** 1d6/1d6/4d6
**Special:**
- **Immune to ALL magic** (possessed state)
- **Fire Aura** - Damages melee attackers
- **Breath weapon** (lightning)
- **Good alignment** (use Protection from Good!)
**Alignment:** Lawful Good (normally), possessed by evil

**Tactics Against:**
- **Pre-Combat Buffs Required:**
  - Dust of Disappearance (invisibility)
  - Enlarge (18(00) Strength)
  - Resist Fire (halves fire aura damage)
  - **Protection from Good** (dragon is GOOD-aligned!)
- Magic DOES NOT WORK (immune)
- Melee attacks only
- High-damage weapons essential
- Healing during fight

**Location:**
- Valjevo Castle (final boss)

**Critical Strategy:**
- Protection from Good gives -2 AC vs. the dragon
- Resist Fire halves fire aura damage
- Buff entire party before fight
- Use best weapons and equipment

**Victory:** Completes main quest

---

## Boss Monsters

### Tyranthraxus (as Bronze Dragon)
See Dragons section above - final boss fight.

---

### Vampire of Valhingen Graveyard
See Undead section - Vampires

**Special Note:** Use Efreet Bottle to summon fire genie ally.

---

## NPC Enemies

Throughout Pool of Radiance, you'll fight enemy NPCs (humans, half-elves, etc.) with character classes.

### Enemy Fighters

**1st Level Fighter**
**HP:** 1d10 (~5 HP)
**AC:** 6-4 (varies by equipment)
**THAC0:** 20
**Attacks:** 1
**Damage:** By weapon (1d8 typical)

**4th Level Fighter**
**HP:** 4d10 (~25 HP)
**AC:** 2-0
**THAC0:** 17
**Attacks:** 1
**Damage:** By weapon + STR bonus

**10th Level Fighter (Captain, Commandant)**
**HP:** 10d10 (~60 HP)
**AC:** 0 or better
**THAC0:** 11
**Attacks:** 3/2 (alternating 1 or 2 per round)
**Damage:** By weapon + STR bonus

**Tactics Against:**
- Use control spells (Hold Person works on humanoids)
- Target casters first
- High-level fighters are very dangerous
- Use chokepoints

---

### Enemy Clerics

**1st Level Cleric**
**HP:** 1d8 (~4 HP)
**AC:** 6-4
**THAC0:** 20
**Spells:** 1st level clerical spells

**5th Level Cleric**
**HP:** 5d8 (~22 HP)
**AC:** 2-0
**THAC0:** 18
**Spells:** Multiple spell levels (Cure Light Wounds, Hold Person, etc.)

**Tactics Against:**
- **Interrupt spellcasting** (even 1 damage stops spell)
- Target first (enemy healing is dangerous)
- Silence 15' Radius shuts down spells
- Hold Person works

---

### Enemy Magic-Users

**1st Level Magic-User**
**HP:** 1d4 (~2 HP)
**AC:** 10 (no armor)
**THAC0:** 21
**Spells:** 1st level (Sleep, Magic Missile)

**5th Level Magic-User**
**HP:** 5d4 (~12 HP)
**AC:** 8-6 (Bracers)
**THAC0:** 20
**Spells:** Sleep, Stinking Cloud, Fireball

**10th Level Magic-User (Evoker, Wizard)**
**HP:** 10d4 (~25 HP)
**AC:** 4-2 (Bracers + Rings)
**THAC0:** 18
**Spells:** All spell levels, very dangerous

**Tactics Against:**
- **HIGHEST PRIORITY TARGET**
- Interrupt with any damage
- Very fragile (low HP, poor AC)
- Can cast devastating spells if allowed
- Use ranged attacks to interrupt
- Sleep, Hold Person, Stinking Cloud all work

---

### Enemy Thieves

**4th Level Thief**
**HP:** 4d6 (~14 HP)
**AC:** 7-5 (Leather armor)
**THAC0:** 19
**Special:** Backstab (x2 damage)

**Tactics Against:**
- Watch for backstab
- Moderate threat
- Hold Person works
- Kill before they can position for backstab

---

## Monster Difficulty Tiers

### Tier 1: Very Easy (Levels 1-2 Party)
- Kobolds
- Goblins
- Giant Rats
- Wild Dogs
- Skeletons (if turned)

**Strategy:** Sleep spell, basic melee

---

### Tier 2: Easy (Levels 2-4 Party)
- Orcs
- Hobgoblins
- Gnolls
- Zombies
- Low-level NPC enemies (1st-3rd level)

**Strategy:** Sleep, Stinking Cloud, melee

---

### Tier 3: Moderate (Levels 4-6 Party)
- Ogres
- Bugbears
- Ghouls (dangerous special attack)
- Giant Mantis
- Mid-level NPCs (4th-6th level)

**Strategy:** Control spells, focused fire, protect against special attacks

---

### Tier 4: Hard (Levels 6-8 Party)
- Shadows (Strength drain)
- Wights (level drain)
- Basilisks (requires mirrors)
- Displacer Beasts
- High-level NPC fighters/clerics (7th-9th level)

**Strategy:** Magical weapons, buffs, careful tactics, specific counters (mirrors, etc.)

---

### Tier 5: Very Hard (Levels 8+ Party)
- Spectres (2-level drain)
- Mummies (disease + fear + high defense)
- Vampires (regeneration + level drain)
- High-level NPC magic-users (10th+ level)

**Strategy:** Full buffs, specific quest items (Efreet Bottle), Cure Disease, Turn Undead

---

### Tier 6: Boss (Levels 9-10 Party, Fully Equipped)
- **Tyranthraxus (Bronze Dragon)**

**Strategy:** Pre-combat buffs (Protection from Good, Resist Fire, Enlarge, Invisibility), best equipment, melee only (magic immune), healing during fight

---

## Special Monster Abilities

### Immunity to Magic
- Some monsters (like possessed Bronze Dragon) are completely immune to magic
- Melee/ranged physical attacks only

### Poison
- Giant rats, some snakes, medusa
- Requires Neutralize Poison spell or temple service
- Can be fatal if untreated

### Disease
- Mummies, giant rats (rare)
- Requires Cure Disease spell
- Reduces max HP and stats until cured

### Petrification
- Basilisk, Medusa
- Turns character to stone (instant death)
- Requires Stone to Flesh (high-level spell) to cure
- **PREVENTED by equipped mirror**

### Level Drain
- Wights (1 level), Spectres (2 levels), Vampires (2 levels)
- Removes character levels permanently
- Requires Restoration spell (not available in Pool of Radiance)
- **Avoid getting hit at all costs**

### Paralysis
- Ghouls (claws/bite)
- Character cannot act
- Elves immune
- Ends after combat or with Remove Paralysis spell

### Strength Drain
- Shadows
- Reduces Strength score
- If Strength reaches 0, character becomes Shadow
- Requires Restoration (not available in PoR)

---

## Summary: Most Dangerous Enemies

**Top 5 Most Dangerous:**

1. **Tyranthraxus (Bronze Dragon)** - Final boss, immune to magic, high damage
2. **Vampire** - Level drain, regeneration, very tough
3. **Spectres** - 2-level drain per hit, good AC
4. **Mummies** - Disease + high defense + mummy fear
5. **Shadows** - Strength drain can permanently weaken characters

**Most Common Threats:**

1. **Ogres** - First major challenge in Slums
2. **Ghouls** - Paralysis is very dangerous
3. **Enemy Magic-Users** - Can cast Fireball, must interrupt
4. **Wights** - Level drain, common in Valhingen Graveyard
5. **Basilisks** - Petrification (counter with mirrors)

---

*This bestiary covers all major monsters in Pool of Radiance. For combat tactics, equipment, and walkthroughs, see the other guides in this documentation series.*
