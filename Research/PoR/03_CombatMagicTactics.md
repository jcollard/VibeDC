# Pool of Radiance - Combat, Magic & Tactics Guide

## Table of Contents
- [Combat System Overview](#combat-system-overview)
- [Combat Commands](#combat-commands)
- [Tactical Principles](#tactical-principles)
- [Cleric Spells](#cleric-spells)
- [Magic-User Spells](#magic-user-spells)
- [Spell Strategies](#spell-strategies)
- [Enemy-Specific Tactics](#enemy-specific-tactics)
- [Advanced Combat Techniques](#advanced-combat-techniques)

---

## Combat System Overview

Pool of Radiance uses AD&D 1st Edition combat rules with turn-based tactical combat on a grid battlefield.

### Turn-Based Combat Flow

**1. Encounter Begins**
- Random or scripted encounter triggers
- Party enters tactical combat mode
- Initiative determines action order

**2. Initiative Phase**
- Each character rolls initiative (1d10 + DEX modifier)
- Higher initiative acts first
- Can be affected by Surprise

**3. Character Turns**
- Move (up to movement allowance)
- Attack, Cast Spell, Use Item, or other actions
- Each character acts once per round

**4. Round Completion**
- All characters and enemies complete actions
- Status effects tick (poison, etc.)
- New round begins

### Core Combat Mechanics

#### THAC0 (To Hit Armor Class 0)
**What It Means:** The number you need to roll on 1d20 to hit AC 0

**How It Works:**
- Roll 1d20
- Add modifiers (Strength, magic weapon bonuses, etc.)
- Compare to: THAC0 - Target's AC = Number needed

**Example:**
- Your THAC0: 18
- Enemy AC: 5
- Need to roll: 18 - 5 = 13 or higher (on 1d20)

**THAC0 Progression by Class:**

| Level | Fighter | Cleric | Thief | Magic-User |
|-------|---------|--------|-------|------------|
| 1     | 20      | 20     | 20    | 21         |
| 2     | 19      | 20     | 20    | 21         |
| 3     | 18      | 20     | 19    | 21         |
| 4     | 17      | 18     | 19    | 20         |
| 5     | 16      | 18     | 18    | 20         |
| 6     | 15      | 18     | 17    | 20         |
| 7     | 14      | 16     | 16    | 19         |

**Multi-Class Note:** Use the BEST THAC0 from any of your classes.

#### Armor Class (AC)
**Lower is Better** - Can go negative for excellent armor

**AC Scale:**
- **10**: Unarmored
- **8**: Leather armor
- **6**: Scale mail
- **4**: Chain mail
- **2**: Plate mail
- **0**: Plate mail + shield
- **-2**: Plate mail +2 + shield
- **-5**: Plate mail +3 + shield + Ring of Protection +2 + DEX 18

**AC Modifiers:**
- Dexterity: -1 to -4 (DEX 15-18)
- Shields: -1 AC
- Magic armor: -1 to -5 (depends on plus)
- Magic rings/cloaks: -1 to -5
- **All bonuses stack**

#### Damage
**Weapon Damage Dice:**
- Small weapons (dagger): 1d4
- Medium weapons (sword): 1d8
- Large weapons (two-handed sword): 1d10

**Damage Modifiers:**
- Strength bonus: +1 to +6 (STR 16-18(00))
- Magic weapon: +1 to +5
- Backstab: x2 to x5 multiplier
- Critical hits: Not in Pool of Radiance

#### Distance & Movement
**Grid System:**
- Each square = 10 feet x 10 feet
- Diagonal movement costs 1.5 squares (non-Euclidean)
- Movement allowance varies by armor encumbrance

**Attack Range:**
- **Melee:** Adjacent squares only (including diagonals)
- **Ranged:** Varies by weapon (bows: 60+ feet)
- **Spells:** Varies by spell

**Movement Rates:**
- **Unarmored:** 12 squares per round
- **Leather/Chain:** 9 squares per round
- **Plate mail:** 6 squares per round
- **Haste spell:** Doubles movement

### Surprise
**Surprise Round:**
- Determined by circumstances (ambush, invisibility, etc.)
- Surprised side cannot act for one round
- Ambushing side gets free attacks

**Invisibility:**
- Grants surprise in first round of combat
- Broken when attacking or taking damage
- Extremely powerful tactical advantage

---

## Combat Commands

### Movement Commands

**Arrow Keys:**
- **Up Arrow**: Move forward 1 square (costs 1 minute exploration time)
- **Left/Right Arrow**: Turn 90 degrees (no time cost)
- **Down Arrow**: Turn around 180 degrees

### Combat Action Commands

**"A"im**
- Target enemy for melee attack
- Look around battlefield (reconnaissance)
- Attack specified enemy

**"M"ove**
- Move character to different square
- Limited by movement allowance
- Cannot move through enemies

**"C"ast**
- Cast memorized spell
- Must select spell level, then specific spell
- Casting can be interrupted by damage

**"I"tem**
- Use item (potion, wand, scroll)
- Some items usable in combat

**"T"urn**
- Cleric ability to turn/destroy undead
- Affects all undead in radius
- Automatic action, no targeting needed

**"D"elay**
- Push action later in initiative order
- Useful for coordinating attacks
- Can act any time before round ends

**"G"uard**
- Set character to guard mode
- Gets free attack when adjacent enemy acts
- Good for protecting vulnerable characters

**"Q"uit**
- Skip action for this round
- Forfeits entire turn
- Rarely useful (use Delay instead)

### Party Commands

**"Space Bar"**
- Turns off autocombat
- Regains manual control

**"Alt-Q"**
- Enables full party autocombat
- AI controls all characters
- Can be unreliable

**"V"iew**
- Check character status
- See HP, spells remaining, etc.

---

## Tactical Principles

### Formation & Positioning

#### Front Line / Back Line
**Front Line (Positions 1-3):**
- Fighters, Fighter/Magic-Users
- High HP, good AC
- Melee combatants
- Absorb damage

**Back Line (Positions 4-6):**
- Clerics (if not multi-classed with fighter)
- Magic-Users
- Thieves
- Ranged attackers, spellcasters

**Why This Matters:**
- Protects fragile characters
- Maximizes party survivability
- Allows spellcasters to cast without interruption

#### Defensive Formation
```
[F/MU] [F/MU] [F/MU]
   [C]  [MU]  [F/M/T]
```
- Fighters form shield wall
- Casters protected behind
- Can retreat if needed

#### Choke Point Tactics
```
WWWDWWW     W = Wall
WW   WW     D = Door
W     W     F = Fighter
W  F  W     E = Enemy
W EEE W
W EEEE W
```
- Position fighters in doorways
- Limits enemy approach
- Prevents surrounding
- **Most important tactic in the game**

### Tactical Priorities

**Round 1 (Opening):**
1. **Cast control spells** (Sleep, Stinking Cloud)
2. **Buff party** (Bless, Protection from Evil if pre-cast)
3. **Position fighters** to block enemy advance
4. **Target enemy spellcasters** (interrupt their casting)

**Round 2-3 (Mid-Fight):**
1. **Damage spells** (Fireball, Magic Missile)
2. **Focus fire** on dangerous enemies
3. **Maintain formation** (don't let enemies flank)
4. **Save healing** for after combat if possible

**Round 4+ (Cleanup):**
1. **Mop up remaining enemies**
2. **Chase fleeing foes** (if desired)
3. **Conserve resources** (don't waste spell slots)

### Target Priorities

**Kill Order:**
1. **Enemy spellcasters** (mages, clerics) - Interrupt their casting
2. **High-damage enemies** (ogres, giants, powerful fighters)
3. **Weak but numerous** (goblins, kobolds) - Use area spells
4. **Low-threat enemies** (already disabled, fleeing)

**Why Target Spellcasters First:**
- Even 1 point of damage interrupts spellcasting
- Eliminates dangerous spells (enemy Fireball, Hold Person)
- Magic-users are fragile (die quickly)

### Resource Management

**Spell Conservation:**
- **Easy fights:** Melee only, save spells
- **Medium fights:** 1st-2nd level spells
- **Hard fights:** All resources (3rd level+, items)
- **Boss fights:** Everything (buffs, items, top spells)

**Healing Management:**
- Heal AFTER combat when possible
- Emergency healing mid-fight for critical characters
- Memorize 3-5 Cure Light Wounds per cleric
- Save Cure Serious Wounds for emergencies

**Rest Timing:**
- Rest when spellcasters low on spells
- Rest when HP below 50%
- Rest before major quest areas
- Random encounters increase with time

---

## Cleric Spells

Clerics gain spells automatically (no need to find scrolls) and can memorize from their entire spell list.

### 1st Level Cleric Spells

#### Cure Light Wounds ★★★★★
**Range:** Touch
**Duration:** Permanent
**Effect:** Heals 1d8 HP

**THE most important spell in the game.** Only reliable healing source.

**Usage:**
- Memorize 3-5 copies per cleric
- Use after combat to heal
- Emergency healing mid-combat
- Can target any party member

**Tip:** Never leave town without full Cure Light Wounds slots.

---

#### Bless ★★★★☆
**Range:** 60 feet
**Duration:** 6 rounds
**Effect:** +1 to attack rolls, +1 to morale

**Excellent pre-combat buff.**

**Usage:**
- Cast before tough fights
- Affects entire party
- Stacks with other buffs
- Lasts long enough for most fights

---

#### Protection from Evil ★★★★★
**Range:** Touch
**Duration:** 3 rounds/level
**Effect:** -2 AC vs. evil creatures, +2 to saves vs. evil

**Extremely powerful** - Most enemies are evil.

**Usage:**
- Cast on front-line fighters
- Significant AC improvement
- Lasts 9-21 rounds (3 per level)
- Stacks with armor
- Can cast multiple copies (one per character)

**Note:** 90%+ of enemies are evil alignment, making this incredibly valuable.

---

#### Command ★★☆☆☆
**Range:** 30 feet
**Duration:** 1 round
**Effect:** Target obeys one-word command

**Situational** - Single target, short duration.

**Usage:**
- Can disable one enemy for 1 round
- "Halt", "Flee", "Die" commands
- Better options exist (Hold Person)

---

#### Detect Magic ★★★☆☆
**Range:** 30 feet
**Duration:** 1 turn
**Effect:** Reveals magical items

**Utility spell** for identifying loot.

**Usage:**
- Cast after combat
- Identifies magic items in treasure
- Magic-Users have better version
- Not combat-useful

---

### 2nd Level Cleric Spells

#### Hold Person ★★★★★
**Range:** 180 feet
**Duration:** 2 rounds/level
**Effect:** Paralyzes 1-3 humanoid targets

**One of the best disable spells in the game.**

**Usage:**
- Targets humanoids only (humans, orcs, goblins, etc.)
- Can target 1-3 enemies
- Saving throw allowed
- Paralyzed enemies auto-hit
- Doesn't work on undead, animals, monsters

**Tip:** Focus attacks on held enemies for guaranteed hits.

---

#### Prayer ★★★★★
**Range:** 0
**Duration:** 1 round/level
**Effect:** Allies +1 to hit/damage/saves, enemies -1

**Powerful buff/debuff combination.**

**Usage:**
- Cast early in tough fights
- Affects all allies and enemies in range
- Stacks with Bless
- Long duration

**Analysis:** Better than Bless in most situations (also debuffs enemies).

---

#### Silence 15' Radius ★★★☆☆
**Range:** 180 feet
**Duration:** 2 rounds/level
**Effect:** No sound in area, prevents spellcasting

**Anti-caster spell.**

**Usage:**
- Shuts down enemy magic-users
- Affects area, not individual
- Enemies can move out of area
- Also silences your party in area

**Tip:** Great vs. enemy mages if you can pin them in the zone.

---

#### Spiritual Hammer ★★☆☆☆
**Range:** 30 feet
**Duration:** 1 round/level
**Effect:** Creates magical hammer that attacks

**Summoned weapon.**

**Usage:**
- Attacks as cleric level
- Does 2d4 damage
- Useful when cleric can't melee
- Weaker than just attacking normally at mid+ levels

---

#### Snake Charm ★☆☆☆☆
**Range:** 60 feet
**Duration:** Special
**Effect:** Charms snakes

**Extremely niche.** Rarely useful in Pool of Radiance.

---

### 3rd Level Cleric Spells

#### Cure Serious Wounds ★★★★☆
**Range:** Touch
**Duration:** Permanent
**Effect:** Heals 2d8+1 HP

**Better healing** but higher spell slot.

**Usage:**
- Heal critically wounded characters
- More efficient than Cure Light Wounds
- Fewer spell slots available (3rd level)
- Save for emergencies

---

#### Dispel Magic ★★★☆☆
**Range:** 60 feet
**Duration:** Permanent
**Effect:** Removes magical effects

**Utility spell** for countering enemy magic.

**Usage:**
- Remove enemy buffs
- Dispel harmful effects on party
- Ends magical barriers
- Success depends on caster level

---

#### Cure Blindness ★★☆☆☆
**Range:** Touch
**Duration:** Permanent
**Effect:** Cures blindness

**Situational** - Only needed if blinded.

**Usage:**
- Counters blindness effects
- Rare status in Pool of Radiance
- Keep one memorized if facing blinding enemies

---

#### Cure Disease ★★★★★ (situational)
**Range:** Touch
**Duration:** Permanent
**Effect:** Cures disease

**Mandatory before Valhingen Graveyard** (mummies cause disease).

**Usage:**
- Memorize when fighting mummies
- Can be purchased at temples
- Essential for disease-causing encounters
- Not needed otherwise

---

#### Prayer ★★★★★
(See 2nd level - upgraded at higher levels)

---

### 4th Level Cleric Spells

#### Cure Critical Wounds ★★★★☆
**Range:** Touch
**Duration:** Permanent
**Effect:** Heals 3d8+3 HP

**Best healing spell.**

**Usage:**
- Major healing (average 16 HP)
- Limited slots (4th level)
- Save for critical moments
- Best HP-per-slot ratio

---

#### Neutralize Poison ★★★☆☆
**Range:** Touch
**Duration:** Permanent
**Effect:** Cures poison

**Life-saver** vs. poisonous enemies.

**Usage:**
- Counters poison effects
- Some enemies poison on hit
- Can buy at temples
- Keep one memorized in poison-heavy areas

---

#### Sticks to Snakes ★☆☆☆☆
**Range:** 120 feet
**Duration:** 2 rounds/level
**Effect:** Turns sticks into snakes

**Very weak.** Almost never useful.

---

### 5th Level Cleric Spells

#### Cure Critical Wounds ★★★★☆
(Same as 4th level)

---

#### Flame Strike ★★★☆☆
**Range:** 60 feet
**Duration:** Instantaneous
**Effect:** 6d8 damage in column

**Offensive damage spell** for clerics.

**Usage:**
- Rare cleric damage option
- Half damage on save
- Column area effect
- Magic-User Fireball is better

**Note:** Clerics rarely memorize - healing is more valuable.

---

## Magic-User Spells

Magic-Users must learn spells from scrolls (INT-dependent chance) but have the most powerful offensive magic.

### 1st Level Magic-User Spells

#### Sleep ★★★★★
**Range:** 90 feet
**Duration:** 5 rounds/level
**Effect:** Puts 2d4 creatures to sleep (up to 4+4 HD total)

**THE BEST 1st level spell and one of the best in the game.**

**Usage:**
- No saving throw
- Affects area (entire square + adjacent 8 squares)
- Instant-win vs. low-level encounters
- Doesn't work on 6+ HD creatures
- Still useful at mid-levels

**Tactics:**
- Cast first round
- Sleeping enemies are helpless
- Can be coup de grace or bypassed
- Use on kobolds, goblins, hobgoblins, bandits

**Limitation:** Becomes less useful late-game (high HD enemies).

---

#### Magic Missile ★★★★☆
**Range:** 60 feet
**Duration:** Instantaneous
**Effect:** 1d4+1 damage per missile, +1 missile per 2 levels

**Guaranteed damage** - No save, no miss.

**Usage:**
- Auto-hit (no attack roll)
- 1 missile at level 1, 2 at level 3, 3 at level 5, etc.
- Each missile: 2-5 damage
- Perfect for interrupting enemy casters
- Good damage at all levels

**Tip:** Use to interrupt enemy spellcasters (even 1 damage stops casting).

---

#### Charm Person ★★☆☆☆
**Range:** 120 feet
**Duration:** Special
**Effect:** Charms one person (humanoid)

**Conversion spell** - Turns enemy into ally.

**Usage:**
- Only affects humanoids
- Saving throw allowed
- Charmed enemy fights for you
- Duration indefinite (until dispelled or damaged by party)

**Limitation:** Many enemies aren't "persons", so limited use.

---

#### Detect Magic ★★★☆☆
**Range:** 60 feet
**Duration:** 2 rounds/level
**Effect:** Reveals magical items and effects

**Utility spell.**

**Usage:**
- Identifies magic items
- Longer duration than Cleric version
- Use after combat
- Not combat-useful

---

#### Enlarge ★★★★☆
**Range:** 5 feet/level
**Duration:** 1 turn/level
**Effect:** Doubles size, increases Strength

**Buff spell** for melee fighters.

**Usage:**
- Increases Strength significantly
- Level 6 caster grants 18(00) Strength
- Lasts 10 minutes per level (long)
- Perfect for Fighter/Magic-Users
- Cast before combat

**Combo:** Enlarge yourself, then fight at 18(00) STR.

---

#### Protection from Evil ★★★☆☆
**Range:** Touch
**Duration:** 2 rounds/level
**Effect:** -2 AC vs. evil, +2 saves vs. evil

**Defensive buff** (same as cleric version).

**Usage:**
- Cleric version is better (3 rounds/level)
- Still useful if no cleric available
- Stacks with armor

---

#### Shield ★★★☆☆
**Range:** Self
**Duration:** 5 rounds/level
**Effect:** AC 2 vs. missiles, AC 4 vs. other, blocks Magic Missile

**Defensive buff** for magic-users.

**Usage:**
- Improves Magic-User's terrible AC
- Better than most armor they can wear
- Blocks Magic Missile completely
- Long duration

**Tip:** Cast before combat if expecting ranged attacks.

---

#### Burning Hands ★★☆☆☆
**Range:** Touch (cone)
**Duration:** Instantaneous
**Effect:** 1d3 damage per level (max 1d3+10)

**Weak damage spell.**

**Usage:**
- Cone area effect
- Very low damage
- Requires melee range (dangerous for mage)
- Better options exist (Sleep, Magic Missile)

**Verdict:** Rarely used - too weak, too risky.

---

### 2nd Level Magic-User Spells

#### Stinking Cloud ★★★★★
**Range:** 30 feet
**Duration:** 1 round/level
**Effect:** Creates 2x2 cloud, creatures inside save or disabled each round

**One of the best control spells in the game.**

**Usage:**
- Creates lasting hazard zone
- Enemies in cloud must save EACH round
- Failed save = helpless
- Blocks enemy movement
- No HP/level limit (works on anything)

**Tactics:**
- Cast on enemy group
- Creates barrier/chokepoint
- Enemies either disabled or forced to go around
- Lasts long enough to outlast most fights

**Tip:** Position cloud to block doorways/hallways.

---

#### Invisibility ★★★★☆
**Range:** Touch
**Duration:** Until attack or dispelled
**Effect:** Target becomes invisible

**Tactical advantage spell.**

**Usage:**
- Grants surprise in combat
- Invisible character acts first, enemies can't target
- Breaks on attack or taking damage
- Perfect for pre-combat setup

**Tactics:**
- Cast on entire party before tough fight
- Invisible backstab = huge damage
- Position optimally before engaging

**Limitation:** One attack, then it ends.

---

#### Knock ★★★☆☆
**Range:** 60 feet
**Duration:** Instantaneous
**Effect:** Opens locked door or chest

**Utility spell** - Replaces thief lock-picking.

**Usage:**
- Opens any lock
- Alternative to thief skills
- Useful if no thief in party
- Not combat-useful

---

#### Web ★★★☆☆
**Range:** 30 feet
**Duration:** 8 rounds/level
**Effect:** Fills area with sticky webs, entangles creatures

**Area denial spell.**

**Usage:**
- Traps enemies in place
- Saving throw to avoid
- Blocks movement
- Fire destroys web

**Comparison:** Stinking Cloud is often better (disables, not just slows).

---

#### Mirror Image ★★★★☆
**Range:** Self
**Duration:** 3 rounds/level
**Effect:** Creates 1d4+1 illusory duplicates

**Defensive buff** for magic-users.

**Usage:**
- Each image absorbs one hit
- Protects fragile mages
- Attacks hit images instead of caster
- Lasts through multiple hits

**Tip:** Cast when magic-user is being targeted in melee.

---

#### Ray of Enfeeblement ★★☆☆☆
**Range:** 30 feet
**Duration:** 1 round/level
**Effect:** Reduces target's Strength

**Debuff spell.**

**Usage:**
- Weakens enemy fighters
- Makes melee enemies less dangerous
- Saving throw allowed
- Single target only

**Verdict:** Niche - better options exist.

---

### 3rd Level Magic-User Spells

#### Fireball ★★★★★
**Range:** 150 feet
**Duration:** Instantaneous
**Effect:** 1d6 damage per caster level (save for half)

**THE classic damage spell.**

**Usage:**
- Massive area damage (20-foot radius)
- Scalable damage (1d6 per level)
- Save for half damage
- Hits all enemies in area

**Tactics:**
- Use on grouped enemies
- Can hit your own party (careful placement)
- Excellent vs. large monster groups
- Level 10 caster = 10d6 (10-60 damage, avg 35)

**Tip:** Position before casting to avoid friendly fire.

---

#### Haste ★★★★★
**Range:** 60 feet
**Duration:** 3 rounds + 1 round/level
**Effect:** Doubles movement and attacks per round

**Game-breaking buff spell.**

**Usage:**
- **Doubles attacks** - Each character attacks twice
- Doubles movement speed
- Affects entire party
- Short duration but devastating

**Tactics:**
- Cast before major fights
- Turns 6 attacks into 12 attacks per round
- Fighters especially benefit
- Combos with high-damage weapons

**Verdict:** THE late-game buff. Wins fights immediately.

---

#### Lightning Bolt ★★★★☆
**Range:** 60 feet
**Duration:** Instantaneous
**Effect:** 1d6 damage per caster level (save for half), linear area

**Line damage spell.**

**Usage:**
- Shoots in straight line
- Bounces off walls (can hit twice!)
- Same damage as Fireball
- Better than Fireball if enemies lined up

**Tactics:**
- Use in corridors
- Aim for wall bounce (double damage)
- Less versatile than Fireball (linear vs. circle)

---

#### Hold Person ★★★★☆
**Range:** 180 feet
**Duration:** 2 rounds/level
**Effect:** Paralyzes 1-4 humanoids

**Disable spell** (same as Cleric version, slightly better).

**Usage:**
- Paralyzes 1-4 targets
- Humanoids only
- Saving throw allowed
- Held enemies auto-hit

**Comparison:** Magic-User version can target 4 instead of 3.

---

#### Slow ★★★☆☆
**Range:** 90 feet
**Duration:** 3 rounds + 1 round/level
**Effect:** Halves movement and attacks

**Debuff spell** - Opposite of Haste.

**Usage:**
- Slows enemy attacks and movement
- Saving throw allowed
- Area effect
- Counters enemy Haste

**Verdict:** Decent but offensive spells usually better.

---

#### Dispel Magic ★★★☆☆
**Range:** 120 feet
**Duration:** Instantaneous
**Effect:** Removes magical effects

**Counter-magic spell.**

**Usage:**
- Dispel enemy buffs
- Remove magical barriers
- Counter ongoing effects
- Success based on caster level

---

### 4th Level Magic-User Spells

#### Ice Storm ★★★★☆
**Range:** 120 feet
**Duration:** 1 round
**Effect:** 1d6 per level, area effect

**High-damage area spell.**

**Usage:**
- Similar to Fireball
- Cold damage (different resistance)
- Large area
- No friendly fire risk

---

#### Charm Monster ★★☆☆☆
**Range:** 60 feet
**Duration:** Special
**Effect:** Charms non-humanoid creature

**Monster conversion spell.**

**Usage:**
- Affects monsters (not just persons)
- Saving throw allowed
- Turns enemy into ally
- Limited use in Pool of Radiance

---

#### Confusion ★★★☆☆
**Range:** 120 feet
**Duration:** 1 round/level
**Effect:** Confuses 2d8 creatures

**Disable spell.**

**Usage:**
- Confused creatures act randomly
- Area effect
- Can hit many targets
- Less reliable than other disables

---

### 5th Level Magic-User Spells

#### Cone of Cold ★★★★☆
**Range:** 0
**Duration:** Instantaneous
**Effect:** 1d4+1 per level, cone area

**High-damage cone spell.**

**Usage:**
- Cone area from caster
- Cold damage
- Save for half
- Shorter range than Fireball

---

#### Cloudkill ★★★★☆
**Range:** 30 feet
**Duration:** 1 round/level
**Effect:** Toxic cloud, kills creatures under 5 HD

**Powerful control spell.**

**Usage:**
- Automatically kills weak enemies (under 5 HD)
- Damages stronger enemies
- Moving cloud
- Area denial

---

#### Hold Monster ★★★★☆
**Range:** 120 feet
**Duration:** 1 round/level
**Effect:** Paralyzes 1d4 monsters

**Improved Hold Person** - Works on anything.

**Usage:**
- Affects non-humanoids
- Saving throw allowed
- 1-4 targets
- Held = auto-hit

---

## Spell Strategies

### Spell Memorization Guide

#### Cleric Memorization (Example Level 5 Cleric)
**Spell Slots: 3/3/1**

**Recommended:**
- 1st Level: Cure Light Wounds x3
- 2nd Level: Hold Person x2, Prayer x1
- 3rd Level: Cure Disease OR Cure Serious Wounds

**Alternatives:**
- Protection from Evil x3 (before dungeon)
- Bless x2, Cure Light Wounds x1 (buff-heavy)

---

#### Magic-User Memorization (Example Level 5 Magic-User)
**Spell Slots: 4/2/1**

**Recommended:**
- 1st Level: Sleep x2, Magic Missile x2
- 2nd Level: Stinking Cloud x2
- 3rd Level: Fireball

**Alternatives:**
- Enlarge x1 (if Fighter/Magic-User)
- Invisibility x1 (before tough fight)
- Haste instead of Fireball (if available)

---

### Pre-Combat Buffing

**Best Buffs (Cast Before Entering Dangerous Area):**
1. **Protection from Evil** (3-21 rounds, -2 AC)
2. **Bless** (6 rounds, +1 to hit)
3. **Enlarge** (10+ minutes, high Strength)
4. **Invisibility** (entire party, surprise)

**Buff Duration Strategy:**
- Cast long-duration buffs first (Enlarge)
- Cast medium-duration buffs near entrance (Protection from Evil)
- Cast short-duration buffs just before fight (Bless)

---

### Spell Slot Conservation

**Easy Encounter (Kobolds, Goblins):**
- Use Sleep (1st level only)
- Melee attacks only if very weak

**Medium Encounter (Hobgoblins, Orcs):**
- Sleep + Stinking Cloud
- 1-2 offensive spells
- Mostly melee

**Hard Encounter (Ogres, Giants, Mixed Groups):**
- Full control spells (Sleep, Stinking Cloud, Hold Person)
- 2-3 offensive spells (Fireball, Lightning Bolt)
- Buffs (Prayer, Bless)

**Boss Encounter (Dragons, Tyranthraxus, Major Uniques):**
- **Everything**: All buffs, all top spells, all items
- Pre-combat buffs (Invisibility, Enlarge, Protection)
- Round 1 buffs (Prayer, Bless, Haste)
- Offensive spells (Fireball, Lightning, Hold Monster)
- Healing as needed

---

## Enemy-Specific Tactics

### Undead (Skeletons, Zombies, Ghouls)

**Turn Undead:**
- Cleric ability, use liberally
- Level 6+ clerics DESTROY undead (don't just turn)
- Turned undead flee or cower

**Spell Effectiveness:**
- Sleep: Doesn't work (undead immune)
- Hold Person: Doesn't work (not humanoid)
- Fireball: Full damage
- Magic Missile: Full damage

**Strategy:**
- Turn Undead first
- Focus fire on remaining
- Magic damage if needed

---

### Trolls

**Regeneration:**
- Trolls regenerate HP every round
- Supposed to be stopped by fire (doesn't work properly in game)
- Must kill quickly or stand on corpse

**Tactics:**
- Stinking Cloud (disables, prevents regen)
- Concentrated attacks (kill in 1-2 rounds)
- Stand on corpse to prevent revival

**Spells:**
- Sleep: Doesn't work (6+ HD)
- Stinking Cloud: Works great
- Fireball: Good damage

---

### Mummies

**Disease:**
- Mummy hits cause disease
- Reduces stats and HP maximum
- MUST cure before resting (or becomes permanent)

**Defenses:**
- Immune to many spells
- Half damage from non-magical weapons
- Half damage from magical weapons

**Strategy:**
- Memorize Cure Disease
- Use Fireball/Lightning Bolt (full damage from spells)
- Don't attempt Valhingen Graveyard until high level

**Required:**
- Cure Disease spells (3-4 memorized)
- Magical weapons
- High-level party (7+)

---

### Basilisk & Medusa

**Petrification:**
- Gaze attack turns to stone (instant death)
- **AUTO-COUNTERED by equipped mirror**

**Strategy:**
- **Equip mirrors** before encounter
- If mirrored: Completely safe
- If not mirrored: Party wipe

**Location:**
- Mendor's Library (basilisks)

**Note:** Mirrors automatically reflect gaze. No action needed.

---

### Dragons (Bronze Dragon - Tyranthraxus)

**Immunities:**
- Immune to ALL magic
- Fire aura damages attackers

**Strategy:**
- Pre-combat buffs:
  - Dust of Disappearance (invisibility)
  - Enlarge (18(00) STR)
  - Resist Fire (halves fire aura damage)
  - Protection from Good (dragon is good-aligned!)
- Melee attacks only (magic doesn't work)
- High-damage weapons
- Healing mid-combat

**Critical:** Protection from Good (-2 AC vs. good enemies) - Tyranthraxus's possessed bronze dragon is GOOD alignment.

---

### Large Groups (Kobolds, Goblins, etc.)

**Spell Priorities:**
1. **Sleep** - Instant win if all under 4+4 HD
2. **Stinking Cloud** - Disables survivors
3. **Fireball** - Damage area

**Strategy:**
- Cast Sleep first round (often ends fight immediately)
- Stinking Cloud if some resist
- Melee cleanup

---

## Advanced Combat Techniques

### Choke Point Defense
1. Find doorway or narrow passage
2. Position fighters in opening (single file or 2-wide)
3. Enemies can only engage 1-2 fighters at a time
4. Casters behind fighters
5. Enemies can't surround or flank

**Why It Works:**
- Limits enemy numerical advantage
- Protects vulnerable party members
- Maximizes fighter effectiveness
- Allows safe spellcasting

---

### Focus Fire
**Principle:** Concentrate attacks on one enemy at a time

**Why:**
- Dead enemy = 0 damage per round
- Wounded enemy = same damage as healthy
- Reducing enemy action economy is best defense

**Implementation:**
1. Target weakest enemy first (kill quickly)
2. All attacks on same target
3. Move to next target when first dies
4. Prioritize: casters > damage dealers > weak enemies

---

### Kiting (Hit and Run)
1. Attack with ranged weapons
2. Retreat before enemies close
3. Attack again
4. Repeat

**When Useful:**
- Party outmatched in melee
- Enemies slower than party
- Have strong ranged attacks

**Limitation:** Works better in outdoor/large areas.

---

### Backstab Maximization (Thieves)

**Requirements:**
- Thief or multi-class with thief
- Position behind enemy
- Hidden (Hide in Shadows ability or Invisibility spell)

**Damage:**
- Level 1-4: x2 damage
- Level 5-8: x3 damage
- Level 9-12: x4 damage
- Level 13+: x5 damage

**Combo:**
1. Cast Invisibility on thief
2. Position behind enemy
3. Attack for massive damage
4. Invisibility breaks, continue melee

**With Enlarge:**
- Thief with 18(00) STR + backstab multiplier = huge damage

---

### Spell Combos

**Sleep + Coup de Grace:**
- Cast Sleep
- Walk up to sleeping enemies
- Auto-kill (helpless targets)

**Stinking Cloud + Hold Person:**
- Stinking Cloud on main group
- Hold Person on resistant enemies
- Entire enemy force disabled

**Invisibility + Haste:**
- Cast Invisibility on party (surprise)
- First round: Cast Haste
- Surprise round + doubled attacks = massive advantage

**Enlarge + Fighter/Magic-User:**
- Pre-combat: Enlarge for 18(00) STR
- Enter combat hitting like pure fighter
- Can still cast spells if needed

---

### Item Usage in Combat

**Potions:**
- Use as action in combat
- Healing potions: Emergency heal
- Giant Strength: +STR before melee
- Speed: Doubles attacks (like Haste)

**Wands:**
- Act as spell scroll
- Multiple charges
- Fireball wand, Lightning wand, etc.
- Don't use spell slots

**Necklace of Missiles:**
- Acts as Fireball
- Variable charges
- Save for tough fights

**Dust of Disappearance:**
- Makes entire party invisible
- Even during combat
- Reposition or surprise

---

## Summary: Core Tactical Principles

### The Five Rules of Gold Box Combat

1. **Use Choke Points** - Never fight in open if you can use terrain
2. **Cast Control First** - Disable enemies before damage
3. **Protect Casters** - Dead mage = lost spells
4. **Focus Fire** - Kill enemies one at a time
5. **Conserve Resources** - Don't waste Fireball on kobolds

### Best Spells by Tier

**S-Tier (Use Constantly):**
- Sleep
- Stinking Cloud
- Fireball
- Haste
- Cure Light Wounds
- Protection from Evil
- Hold Person

**A-Tier (Very Good):**
- Magic Missile
- Prayer
- Bless
- Enlarge
- Lightning Bolt
- Mirror Image

**B-Tier (Situational):**
- Invisibility
- Cure Serious Wounds
- Dispel Magic
- Knock
- Shield

**C-Tier (Rarely Used):**
- Burning Hands
- Charm Person
- Command

---

*This guide covers combat mechanics, spells, and tactics. For item details, character builds, and locations, see the other guides in this documentation series.*
