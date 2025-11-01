# Quest 1: The Rotting Thicket (Decomposer Quarter)

## Overview
The Rotting Thicket is the former compost district of old Phlegm, where natural decomposition has been corrupted into something sinister. What was once a vital part of the ecosystem—breaking down organic matter to nourish new growth—has become a festering breeding ground for weak but numerous infected creatures. This is the player's first venture into the Blighted Lands.

**Level Range:** 1-3
**Estimated Time:** 15-20 minutes
**Difficulty:** Easy (Tutorial area)
**Theme:** Growth corrupted into Decay

---

## Visual Design

### Environment
- **Walls:** Vegetation-0/2 (Tree walls), Vegetation-3 (Bushes) - overgrown, sick-looking
- **Floors:** Dark dirt (biomes 93), Grass (biomes 91) - patches of dead grass
- **Props:** Small mushrooms (vegetables-3), Medium mushrooms (vegetables-4), grass props (sickly brown/grey)
- **Lighting:** Dim, greenish-grey twilight - no warm tones
- **Color Palette:** Sickly greens, browns, greys - early stage corruption

### Atmosphere
- **Overgrown and neglected** - nature gone wild
- **Humid and damp** - pools of stagnant water (dark floor patches)
- **Unsettling decay** - mushrooms oozing, plants wilting
- **Occasional movement** - things skittering in the shadows
- **Smell (described):** *"The air reeks of rot and mold."*

### Layout
```
Entrance (from New Phlegm East Gate)
    ↓
Opening Clearing (safe zone)
    ↓
Winding Paths (3-4 combat encounters)
    ↓
Central Compost Pit (mini-boss area)
    ↓
Exit Path back to New Phlegm
```

**Map Structure:**
- Linear path with slight branching
- 5-6 rooms/clearings total
- 4 combat encounters
- 1 mini-boss encounter
- 2 treasure chests

---

## Enemies

### Sporeling (Basic Enemy)
**Sprite:** monsters-0 (Goblin - recolored greenish)
**Level:** 1
**HP:** 4 (1d8)
**AC:** 7
**Attacks:** Spore Club (1d4 damage)
**Special:** None
**Behavior:** Rushes player in groups of 3-4
**Lore:** *"Tiny corrupted mushroom creatures. Their caps pulse with sickly green spores."*
**Tactics:** Swarm tactics, easy to kill, good for tutorial

**Encounter 1:** 4 Sporelings (opening combat tutorial)
**Encounter 2:** 5 Sporelings (testing player's resource management)

---

### Slime Puddle (Ooze Enemy)
**Sprite:** monsters2-0/4/8 (Green/Blue/Grey slimes)
**Level:** 1
**HP:** 6 (1d8+2)
**AC:** 8
**Attacks:** Acidic Touch (1d6 damage)
**Special:** Immune to critical hits (no vital organs)
**Behavior:** Slow-moving, blocks narrow paths
**Lore:** *"Pools of corrupted spore ooze. They dissolve organic matter on contact."*
**Tactics:** Tank damage, slow speed means easy to kite

**Encounter 3:** 2 Green Slimes + 1 Blue Slime (introduces ooze enemy type)

---

### Infected Beetle (Cordyceps Enemy)
**Sprite:** monsters-8 (Spider)
**Level:** 2
**HP:** 8 (1d8+4)
**AC:** 6
**Attacks:** Mandible Bite (1d6+1 damage)
**Special:** First strike (attacks before player in round 1 if not surprised)
**Behavior:** Aggressive, erratic movement (cordyceps-controlled)
**Lore:** *"A giant beetle with fungal growths erupting from its carapace. The cordyceps has taken full control."*
**Tactics:** Hits harder than Sporelings, faster than Slimes, tests player positioning

**Encounter 4:** 3 Infected Beetles (difficulty spike before mini-boss)

---

### MINI-BOSS: Bloated Toad-Shroom
**Sprite:** monsters2-0 (Green Slime - LARGE size, 2x2 grid squares)
**Level:** 3
**HP:** 20 (3d8+6)
**AC:** 6
**Attacks:**
- Toxic Tongue Lash (1d8 damage, 10 ft reach)
- Spore Belch (2d4 damage to all adjacent enemies, recharges on 5-6 on d6)

**Special:**
- **Bloated:** Takes double damage from piercing weapons (spears, arrows)
- **Regeneration:** Heals 2 HP per round unless damaged by fire

**Behavior:** Guards the Central Compost Pit, doesn't pursue beyond that room
**Lore:** *"A massive toad infested with grotesque fungal growths. Its belly swells with toxic spores."*
**Tactics:**
- Stay at range if possible (Tongue Lash has reach)
- Use piercing weapons or fire for bonus damage
- Focus fire to overcome regeneration
- Spread out to minimize Spore Belch damage

**Victory:** Toad-Shroom explodes in shower of (harmless) green spores, area is cleared

---

## Key NPCs

### Survivor Lepiota (Optional Rescue)
**Sprite:** humanoid rogue (female)
**Location:** Hidden in small alcove (requires exploring side path)
**Condition:** Wounded, infected (losing HP slowly)
**Dialogue:**
- *"Help... the spores... I can't fight them off..."*
- *"My patrol was ambushed. Everyone else... turned. I hid, but the infection is spreading."*
- *"Please, get me back to New Phlegm. Sister Oyster can cure me... I hope."*

**Rescue Condition:** Escort her to exit (she follows party, has 5 HP, AC 8, cannot fight)
**Reward:** She gives party her last **Healing Potion** (green) in gratitude
**Consequence:** If brought to Temple in New Phlegm, Sister Oyster cures her and rewards party with **Antifungal Elixir** (blue potion) for free

**Design Note:** Tutorial for escort mechanics / NPC rescue, optional objective

---

## Items & Loot

### Treasure Chest 1 (First Path Branch)
**Location:** Hidden behind bush wall (vegetation-3)
**Contents:**
- 20 gold
- 1 Healing Potion (green)
- 1 Leather Armor

**Trap:** None (tutorial chest)

---

### Treasure Chest 2 (Near Mini-Boss)
**Location:** In small side room adjacent to Central Compost Pit
**Contents:**
- 50 gold
- 1 Short Sword
- 1 Antifungal Elixir (green)

**Trap:** Spore Cloud (DC 10 DEX save or take 1d4 poison damage)

---

### Enemy Loot (Drops)
- **Sporelings:** 1-2 gold each, 10% chance to drop small mushroom (sells for 5g)
- **Slimes:** No gold (oozes don't carry treasure), 25% chance to drop Slime Residue (alchemy component, sells for 10g)
- **Infected Beetles:** 3-5 gold each, 15% chance to drop Chitin Fragment (armor component, sells for 15g)
- **Bloated Toad-Shroom (Boss):** 30 gold, guaranteed drop of **Toad-Shroom Toxin Sac** (quest item, can sell for 50g OR use as alchemy component)

---

## Quest Structure

### Objective 1: Reach the Central Compost Pit
**Description:** *"Elder Portobello wants you to clear the Rotting Thicket. Find the source of the corruption and eliminate it."*
**Task:** Navigate through encounters 1-4, reach the Central Compost Pit
**Optional:** Rescue Survivor Lepiota

---

### Objective 2: Defeat the Bloated Toad-Shroom
**Description:** *"A massive infected toad guards the compost pit. Destroy it to cleanse the area."*
**Task:** Defeat mini-boss
**Reward:** 100 XP, area cleared

---

### Objective 3: Return to New Phlegm
**Description:** *"The Rotting Thicket is clear. Report your success to Elder Portobello."*
**Task:** Return to New Phlegm Council Hall
**Reward:** 100 gold, Silver Key (unlocks Ghostcap Fortress), Quest 2 unlocked

---

## Encounters (Detailed)

### Encounter 1: First Contact
**Location:** Opening Clearing (just past safe zone)
**Enemies:** 4 Sporelings
**Difficulty:** Very Easy
**Purpose:** Teach basic combat, movement, attacks
**Environment:** Open 20×20 space, few obstacles
**Tactics:** Sporelings rush in two waves (2, then 2 more)
**Tutorial Prompts:**
- "Click to move your character"
- "Click enemy to attack"
- "Use abilities from the action bar"

**Loot:** 4-8 gold

---

### Encounter 2: Resource Test
**Location:** Winding Path (narrow corridor)
**Enemies:** 5 Sporelings
**Difficulty:** Easy
**Purpose:** Test if player is managing HP/spells wisely
**Environment:** 10×30 corridor, forces linear combat
**Tactics:** All 5 rush at once, can't easily retreat
**Tip NPC (if Lepiota rescued):** *"Don't waste your spells on weaklings like these. Save them for tougher foes."*

**Loot:** 5-10 gold

---

### Encounter 3: New Enemy Type
**Location:** Swampy Clearing
**Enemies:** 2 Green Slimes, 1 Blue Slime
**Difficulty:** Easy-Medium
**Purpose:** Introduce ooze enemies, teach enemy variety
**Environment:** 15×15 room with water puddles (difficult terrain)
**Tactics:** Slimes block path forward, must be destroyed (can't bypass)
**Tutorial Prompt:** "Slimes are slow but durable. Use ranged attacks if possible."

**Loot:** Possible 2-3 Slime Residue drops

---

### Encounter 4: Pre-Boss Challenge
**Location:** Approach to Central Compost Pit
**Enemies:** 3 Infected Beetles
**Difficulty:** Medium
**Purpose:** Difficulty spike, prepare player for boss
**Environment:** 15×20 room with mushroom obstacles (can use for cover)
**Tactics:** Beetles use first strike, aggressive AI
**Warning Sign:** Corpses of other beetles litter the ground—something killed them

**Loot:** 9-15 gold, possible Chitin Fragments

---

### Encounter 5: MINI-BOSS
**Location:** Central Compost Pit
**Enemies:** Bloated Toad-Shroom
**Difficulty:** Medium-Hard (for level 1-2 party)
**Purpose:** First major boss fight, test all learned skills
**Environment:** 25×25 circular pit, ramps leading down to center where boss sits
**Tactics:**
- Boss doesn't move from center
- Tongue Lash has 10 ft reach (3 grid squares)
- Spore Belch punishes clustering
- Regeneration requires sustained damage

**Boss Phases:**
- **Phase 1 (20-11 HP):** Tongue Lash every round, Spore Belch on cooldown
- **Phase 2 (10-0 HP):** ENRAGED, Tongue Lash twice per round, Spore Belch recharges faster (4-6 instead of 5-6)

**Victory Conditions:**
- Deal 20 damage faster than regeneration can heal
- Use fire or piercing for bonus damage
- Keep party spread out

**Failure Consequences:**
- Party wipe → respawn in New Phlegm (lose half gold, retry quest)

**Victory Rewards:**
- 100 XP (enough to reach level 2 for level 1 characters)
- 30 gold
- Toad-Shroom Toxin Sac
- Quest completion

---

## Events & Story Beats

### Arrival Event
**Trigger:** First enter Rotting Thicket
**Text:** *"The air grows thick and foul as you enter the Rotting Thicket. What was once a thriving compost district is now a festering swamp of corrupted vegetation. Sickly mushrooms ooze black ichor, and the sound of chittering echoes from the shadows."*
**Mood:** Foreboding, unsettling

---

### Discovery Event (Optional)
**Trigger:** Find Survivor Lepiota
**Text:** *"You hear a weak groan from behind the bushes. A wounded scout from New Phlegm lies there, fungal growths spreading across her skin."*
**Choice:**
- **Rescue her:** Gain escort objective, potential rewards
- **Leave her:** No reward, she dies (darker choice)

**Design Note:** Escorts should be OPTIONAL, not required for quest completion

---

### Mini-Boss Introduction
**Trigger:** Enter Central Compost Pit
**Text:** *"The stench intensifies as you descend into the compost pit. At its center, a massive toad wallows in a pool of putrid sludge. Grotesque mushrooms erupt from its bloated body, pulsing with toxic spores. It turns its bulbous eyes toward you and croaks—a sound like a death rattle."*
**Mood:** Tension, dread
**Music:** Shifts to boss battle theme

---

### Victory Event
**Trigger:** Defeat Bloated Toad-Shroom
**Text:** *"The toad-shroom lets out a final, gurgling croak before its body ruptures. A cloud of green spores fills the air—but these spores feel different. Cleansing. Purifying. As they settle, the corruption begins to recede. The Rotting Thicket is healing."*
**Visual:** Green glow effect, mushrooms stop oozing, grass brightens slightly
**Mood:** Triumph, hope
**Music:** Victory fanfare

---

### Return to New Phlegm Event
**Trigger:** Report to Elder Portobello
**Text:** Elder Portobello: *"The Rotting Thicket is clear? Excellent news! Farmers report the soil is already recovering. You've given us hope, adventurer. But there's more work to be done. Ghostcap Fortress awaits."*
**Rewards Given:** 100 gold, Silver Key
**Quest 2 Unlocked:** Ghostcap Fortress

---

## Secrets & Easter Eggs

### 1. Hidden Healing Mushroom
**Location:** Small alcove off the main path (requires exploring)
**Item:** Glowing blue mushroom (vegetables-4, recolored)
**Effect:** Eating it restores 5 HP to entire party (one-time use)
**Flavor Text:** *"This mushroom glows with a soft blue light. It seems untouched by the Blight."*

---

### 2. The Decomposer's Journal
**Location:** Next to Treasure Chest 2
**Item:** Tattered journal (flavor item, no mechanics)
**Text:** *"Day 47: The mushrooms are growing too fast. Day 52: Simmons says the spores are changing him. Day 58: I can't stop scratching. The fungus is under my skin. Day 60: We are one with the Blight now. It feels... right."*
**Purpose:** Environmental storytelling, foreshadows infection mechanic

---

### 3. Pool of Radiance Reference
**Location:** Examine the Compost Pit after boss defeat
**Text:** *"You notice strange markings at the bottom of the pit—arcane symbols in a language you don't recognize. They seem... familiar somehow, like you've seen them in old tales of fallen cities and bronze dragons."*
**Purpose:** Meta-reference to source material

---

## Connections to Other Areas

**Entry:** East Gate of New Phlegm (no key required)
**Exit:** Returns to New Phlegm after boss defeat
**Narrative Connection:** Sets up Quest 2 (Ghostcap Fortress) via Elder Portobello's dialogue

---

## Music/Sound Design Suggestions

### Ambient Sound
- Wet squelching footsteps
- Dripping water
- Buzzing insects (infected beetles)
- Gurgling ooze (slimes)
- Rustling vegetation
- Distant croaking (toad-shroom)

### Music Themes
- **Exploration:** Uneasy, minor key, low strings and woodwinds
- **Combat:** Faster tempo, percussion, building tension
- **Boss Fight:** Intense, rhythmic, punctuated by toad croaks
- **Victory:** Major key fanfare, hopeful resolution

### Enemy Sounds
- **Sporelings:** High-pitched chittering
- **Slimes:** Wet gurgling
- **Infected Beetles:** Clicking mandibles, frantic buzzing
- **Toad-Shroom:** Deep croaking, wet slurping, spore belch "FWOOSH"

---

## Design Notes

### Difficulty Curve
- Start VERY easy (4 weak enemies)
- Gradually introduce new enemy types
- Spike difficulty before boss
- Boss should be challenging but beatable with smart tactics

### Tutorial Elements
- First area teaches ALL core mechanics:
  - Movement
  - Combat
  - Abilities/spells
  - Inventory management
  - Environmental hazards
  - Boss fight tactics
- Don't overwhelm—introduce one concept at a time

### Pacing
- 15-20 minutes total
- 3-5 minutes per encounter
- 5-7 minutes for boss fight
- Allow short rest before boss (optional safe room)

### Rewards
- Enough loot to buy 1-2 items in New Phlegm
- Enough XP to reach level 2
- Unlock next quest area
- Feel of progression and accomplishment

### Environmental Storytelling
- Use corpses to show previous failed attempts
- Journals/notes hint at how Blight spreads
- Visual decay progression (healthy → sick → corrupted)
- Foreshadow later threats (mention of "guardian" in journal)

### Accessibility
- Linear layout (hard to get lost)
- Clear objective markers
- Generous checkpoints (respawn in New Phlegm if TPK)
- Difficulty balanced for first-time players
