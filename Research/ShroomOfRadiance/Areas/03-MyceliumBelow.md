# Quest 3: The Mycelium Below

## Overview
Beneath New Phlegm lies the Mycelial Network—an ancient underground system of fungal connections that once linked all life in Phlegm. The Blight has corrupted these sacred tunnels, turning them into a nightmarish warren of infected creatures and pulsing, diseased mycelium. Worse, the corruption is spreading upward toward New Phlegm itself.

**Level Range:** 4-6
**Estimated Time:** 20-25 minutes
**Difficulty:** Medium-Hard
**Theme:** Infection Spreading From Below

---

## Visual Design

### Environment
- **Walls:** Cave wall variants (biomes 58-60)
- **Floors:** Dark ground (biomes 93), Dark with dark grey spots (biomes 33)
- **Props:** Vegetation roots (vegetation walls), medium mushrooms (pulsing/infected)
- **Doors:** Cave door (biomes 71), Cave stairs (biomes 72)
- **Lighting:** Dim bioluminescence (sickly reds/purples), pools of phosphorescent ooze
- **Color Palette:** Dark browns, blacks, sickly reds, purples—deep corruption

### Atmosphere
- **Claustrophobic** - narrow tunnels, low ceilings
- **Organic and alive** - walls pulse with mycelium
- **Humid and hot** - opposite of Ghostcap's cold
- **Sounds of growth** - creaking, squelching, breathing
- **Oppressive** - feels like being inside a living organism

### Layout
```
Trapdoor Entrance (Southeast New Phlegm)
    ↓
Upper Tunnels (tutorial area)
    ↓
Main Network (branching paths)
    ↓
Infected Chamber (left) ← → Sealed Passages (right)
    ↓                          ↓
    Mycelial Core (boss)
        ↓
    Ladder back to New Phlegm
```

---

## Enemies

### Cordyceps Zombie
**Sprite:** monsters2-72 (Skeleton - infected humanoid)
**Level:** 4
**HP:** 18 (3d8+6)
**AC:** 6
**Attacks:** Infected Slam (1d8 damage + infection risk)
**Special:**
- **Infection:** On hit, DC 12 CON save or gain "Infected" status (lose 1 HP per minute until cured)
- **Resilient:** Does not flee at low HP

**Lore:** *"Once-living creatures, now puppeteered by cordyceps fungus. The original host is long dead."*

---

### Spore Serpent
**Sprite:** monsters2-76 (Snake - mycelial tendril)
**Level:** 5
**HP:** 20 (4d8+4)
**AC:** 5
**Attacks:**
- Constrict (1d6+2 damage, grapples on hit)
- Spore Breath (2d4 poison damage, 15 ft cone, recharge 5-6)

**Special:** **Grapple** - Constricted targets have disadvantage on attacks
**Lore:** *"Massive mycelial tendrils that slither through the tunnels like serpents. They're not snakes—they're part of the Blight itself."*

---

### Corrupted Ooze (Advanced Slimes)
**Sprite:** monsters2-20/24/28 (Red/Rainbow/White slimes)
**Level:** 5
**HP:** 24 (5d8+5)
**AC:** 7
**Attacks:** Acidic Slam (2d6 acid damage)
**Special:**
- **Split:** When reduced to 0 HP, splits into 2 smaller oozes (10 HP each, 1d6 damage)
- **Corrosive:** Damages armor (reduces AC by 1 on critical hit)

**Lore:** *"Highly concentrated spore oozes. They pulse with rainbow hues—beautiful and deadly."*

---

### BOSS: Infected Seer (The Trance Woman)
**Sprite:** humanoid mage (crystalwarriors) - corrupted, fungal growths visible
**Level:** 6
**HP:** 40 (6d8+12)
**AC:** 4 (magical corruption hardens skin)
**Attacks:**
- Spore Blast (2d6+2 magical damage, ranged)
- Blight Touch (1d10 necrotic damage + infection, melee)

**Special:**
- **Trance State:** At 20 HP, enters trance and delivers prophecy (see Events)
- **Mycelial Roots:** Summons 2 Spore Serpents at 25 HP (once per fight)

**Phases:**
- **Phase 1 (40-26 HP):** Aggressive spellcasting, uses Spore Blast
- **Phase 2 (25-21 HP):** Summons 2 Spore Serpents, becomes defensive
- **Phase 3 (20 HP):** STOPS FIGHTING, enters trance, delivers prophecy
- **Phase 4 (after prophecy):** Party must choose: kill her or spare her

**Victory Options:**
1. **Kill:** She dies, drops loot, infection spreads faster (moral cost)
2. **Spare:** She lives, can be rescued and cured in New Phlegm (better outcome)

---

## Key NPCs

### Infected Seer (Boss - see above)
**Name:** Mycelia (revealed if spared)
**Backstory:** Former priestess of the Spore Pool, infected when investigating the corruption
**Prophecy:** *"Evil spirit from unholy pool... hiding behind fair countenance... the guardian has fallen... it wears the Guardian's face but the eyes... the eyes are black... it waits... in the citadel... where the pool weeps..."*

---

## Items & Loot

### Treasure Chest 1 (Sealed Passage)
**Contents:**
- 100 gold
- Antifungal Elixir (Major - blue potion)
- Long Sword +1

**Trap:** Spore Cloud (DC 13 DEX save or infected status)

---

### Treasure Chest 2 (Hidden Alcove)
**Contents:**
- 150 gold
- Rope of Climbing (magical rope, 50 ft)
- 2 Fire Essences (red potions)

**Trap:** None (hidden, requires exploration)

---

### Boss Loot
**If Killed:**
- 75 gold
- Corrupted Staff (magic weapon, +1 to spell damage but causes infection on critical failure)

**If Spared:**
- Mycelia's Blessing (permanent +1 to saves vs disease/poison)
- Her gratitude in New Phlegm (free healing services for rest of game)

---

## Quest Structure

### Objective 1: Enter the Mycelium Below
**Description:** *"Investigate the tunnels beneath New Phlegm. The corruption spreads from below."*
**Task:** Enter trapdoor, explore upper tunnels

---

### Objective 2: Seal the Infected Breaches
**Description:** *"Find the source of the corruption and seal the breaches before it reaches New Phlegm."*
**Task:** Navigate to Mycelial Core, defeat Infected Seer
**Moral Choice:** Kill or spare the seer

---

### Objective 3: Return with the Prophecy
**Description:** *"The seer spoke of the 'fallen guardian.' Report this to Sage Morel."*
**Task:** Return to New Phlegm
**Reward:** 300 gold, Copper Key (Deadcap Cemetery), Quest 4 unlocked

---

## Encounters (Detailed)

### Encounter 1: Tunnel Patrol
**Enemies:** 3 Cordyceps Zombies
**Difficulty:** Medium
**Purpose:** Introduce infection mechanic
**Warning:** Have antifungals ready!

---

### Encounter 2: Serpent's Lair
**Enemies:** 2 Spore Serpents, 2 Corrupted Oozes
**Difficulty:** Hard
**Purpose:** Mixed enemy tactics (grapple + split)
**Environment:** Narrow tunnel (serpents use grapple effectively)

---

### Encounter 3: Ooze Pool
**Enemies:** 4 Corrupted Oozes (become 8 when split)
**Difficulty:** Medium-Hard
**Purpose:** Test AOE damage (Fireball kills before split)
**Tactic:** Focus fire or use AOE to prevent splits

---

### Encounter 4: Pre-Boss Gauntlet
**Enemies:** 4 Cordyceps Zombies, 2 Spore Serpents
**Difficulty:** Hard
**Purpose:** Resource drain before boss
**Environment:** Large chamber with pillars (use for kiting)

---

### Encounter 5: BOSS - Infected Seer
**Difficulty:** Very Hard
**Phases:** 4 (see boss description)
**Special:** Prophecy at 20 HP, moral choice at end
**Environment:** Mycelial Core - 30×30 circular chamber, pulsing walls

---

## Events & Story Beats

### Arrival
*"You descend into darkness. The air grows thick and hot, and the walls... breathe. Mycelium pulses beneath your feet like a heartbeat. This place is alive—and it's sick."*

---

### The Prophecy (Boss Fight Phase 3)
**Trigger:** Infected Seer reaches 20 HP
**Text:** She stops fighting, eyes roll back, speaks in trance (see above for full prophecy)
**Mood:** Revelatory, creepy, important
**Music:** Stops, silence except for her voice

---

### The Choice
**After Prophecy:**
- **Option 1 (Kill):** "She's too far gone. End her suffering."
  - Immediate loot, quest complete
  - NPC reaction: Sage Morel is sad but understanding

- **Option 2 (Spare):** "She can be saved. Bring her to the Temple."
  - Escort mission back to New Phlegm
  - Sister Oyster cures her (costs 200 gold from party OR free if player donates)
  - Mycelia joins New Phlegm as grateful NPC
  - Better karma, better rewards

---

## Connections

**Entry:** Trapdoor in New Phlegm (Southeast Training Grounds)
**Exit:** Ladder back to New Phlegm (after boss)
**Narrative:** Reveals Guardian Morel corruption, sets up Spore Archive quest

---

## Design Notes
- **Infection Mechanic:** Makes antifungals essential
- **Moral Choice:** Spare vs kill boss (affects story/rewards)
- **Difficulty Spike:** Harder than Ghostcap
- **Claustrophobic Design:** Narrow spaces increase tension
- **Foreshadowing:** Prophecy is critical to final act

---

## Music/Sound
- **Ambient:** Pulsing, breathing, squelching, heartbeat
- **Music:** Deep bass, organic percussion, building dread
- **Boss:** Ethereal vocals during prophecy, intense during fight
