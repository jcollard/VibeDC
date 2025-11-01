# New Phlegm - The Hub (Safe Zone)

## Overview
New Phlegm is the last bastion of civilization in the fallen mushroom kingdom of Phlegm. This fortified settlement serves as the player's safe haven, quest hub, and base of operations throughout their journey to cleanse The Blight.

---

## Visual Design

### Architecture
- **Walls:** Brown brick (biomes 0-3) and Grey stone (biomes 8-10) - sturdy, defensive
- **Floors:** Patterned grey stone (biomes 92), Grass patches (biomes 91)
- **Doors:** Brown brick door (biomes 13), Grey stone door (biomes 21)
- **Props:** Large mushrooms (vegetables-6), beds, chairs, stools, podiums
- **Lighting:** Warm campfire glow (fire-0 through fire-6), bioluminescent mushrooms

### Atmosphere
- **Safe and welcoming** - contrast to the dangerous blighted zones
- **Lived-in and functional** - beds, chairs, market stalls
- **Defensible** - thick walls, guarded gates
- **Hopeful** - NPCs are determined, not defeated
- **Bioluminescent lighting** - soft glows from friendly mushrooms

---

## Key Locations

### 1. Council Hall (Central Hub)
**Location:** Center of New Phlegm
**Visual:** Large grey stone building with ornate podium/throne
**NPCs:**
- **Elder Portobello** (humanoid wizard sprite) - Council leader, quest giver
- **Captain Chanterelle** (humanoid fighter sprite) - Military commander
- **Sage Morel** (humanoid mage sprite) - Historian who knows about the Guardian

**Function:**
- Primary quest distribution
- Story exposition
- Progress tracking
- Victory celebration location

**Key Dialogue:**
- Elder Portobello: *"Welcome, adventurer. New Phlegm stands, but barely. The Blight spreads from the old city. We need heroes willing to venture into the corrupted zones."*
- Captain Chanterelle: *"I've lost good soldiers to those blighted areas. Come back alive, and I'll call it a victory."*
- Sage Morel: *"The ancient texts speak of a Guardian Morel who once protected the Spore Pool. I fear what may have become of it..."*

**Quests Given:**
- Quest 1: Clear the Rotting Thicket
- Quest 2: Investigate Ghostcap Fortress (after Quest 1)
- Quest 3: Seal the Mycelium Below (after Quest 2)
- Quest 4: Retrieve knowledge from Spore Archive (after Quest 3)
- Quest 5: Cleanse Deadcap Cemetery (after Quest 4)
- Quest 6-7: Final assault on Blightcap Citadel (after Quest 5)

---

### 2. The Sporecery (Magic Shop)
**Location:** Northeast corner of New Phlegm
**Visual:** Brown brick building with colorful potion displays
**NPC:**
- **Amanita the Alchemist** (humanoid mage sprite, recolored purple/blue)

**Function:** Sell potions, spell components, magical items

**Inventory:**

| Item | Sprite | Price | Description |
|------|--------|-------|-------------|
| Antifungal Elixir (Minor) | gemwright-10 (Green potion) | 50 gold | Cures minor infections |
| Antifungal Elixir (Major) | gemwright-8 (Blue potion) | 200 gold | Cures all infections, prevents for 1 hour |
| Fire Essence | gemwright-9 (Red potion) | 150 gold | Resist fire damage (50% reduction, 10 minutes) |
| Healing Potion (Minor) | gemwright-10 (Green potion) | 30 gold | Restore 2d4+2 HP |
| Healing Potion (Major) | gemwright-9 (Red potion) | 100 gold | Restore 4d4+4 HP |
| Invisibility Spores | gemwright-8 (Blue potion) | 300 gold | Party invisibility for 1 surprise round |
| Bless Scroll | gemwright-14 (Blue gem) | 100 gold | +1 to hit for party, 6 rounds |
| Protection from Good Scroll | gemwright-14 (Blue gem) | 250 gold | **REQUIRED FOR FINAL BOSS** |

**Key Dialogue:**
- Amanita: *"My potions are brewed from the few pure mushrooms left in these lands. Stock up before venturing into the Blight—you'll need every advantage."*
- (After Quest 4): *"You found the Spore Archive! The knowledge there is priceless. Here, take this Protection from Good scroll—something tells me you'll need it."*

**Quest Items Available:**
- **Polished Mushroom Cap Shield** (vegetables-6 sprite, held item) - 500 gold - REQUIRED for Quest 4 (basilisk-shrooms)
- **Cleansing Flame Gem** (gemwright-15, red gem) - 400 gold - REQUIRED for Quest 5 (vampire mushroom)

---

### 3. Temple of Luminescence (Healing Services)
**Location:** Northwest corner of New Phlegm
**Visual:** Grey stone building with glowing green/blue mushroom props
**NPC:**
- **Sister Oyster** (humanoid mage sprite, white/grey robes)
- **Brother Shiitake** (humanoid fighter sprite, ceremonial armor)

**Function:** Healing, resurrection, blessings, cure afflictions

**Services:**

| Service | Price | Description |
|---------|-------|-------------|
| Cure Light Wounds | 10 gold | Restore 1d8+1 HP to one character |
| Cure Serious Wounds | 40 gold | Restore 2d8+2 HP to one character |
| Cure Critical Wounds | 100 gold | Restore 3d8+3 HP to one character |
| Cure Infection | 50 gold | Remove fungal infection/disease |
| Remove Curse | 100 gold | Remove curses (petrification costs 200g) |
| Restoration | 500 gold | Restore drained levels (vampire attacks) |
| Raise Dead | 1000 gold | Resurrect dead party member |
| Bioluminescence Blessing | Free | Grant Turn Undead ability for 1 quest |

**Key Dialogue:**
- Sister Oyster: *"The light of the luminescent mushrooms still shines here. Let it heal your wounds and lift your spirits."*
- Brother Shiitake: *"The undead fear the sacred light. Accept our blessing, and you shall drive back the darkness."*
- (After Quest 2): *"Ghostcap Fortress claimed another victim? We can restore them, but the price is steep."*

**Special Event:**
- After Quest 5 (Deadcap Cemetery), if any party member suffered level drain, Sister Oyster offers a discount: *"You faced the Vampire Mushroom and lived. Your bravery deserves recognition—restoration for 300 gold, not 500."*

---

### 4. Myconid Training Grounds (Level Up & Rest)
**Location:** Southeast corner of New Phlegm
**Visual:** Open courtyard with practice dummies (stool props), beds for rest
**NPCs:**
- **Sergeant Cremini** (humanoid fighter sprite) - Fighter trainer
- **Mage Enoki** (humanoid mage sprite) - Magic trainer
- **Shadow Puffball** (humanoid rogue sprite) - Rogue trainer
- **Cleric Truffle** (humanoid wizard sprite with holy symbol) - Cleric trainer

**Function:**
- Level up characters
- Full rest (restore HP/spells)
- Recruit NPC companions
- Class training and advice

**Services:**
- **Rest:** Free - Full HP/spell restoration
- **Level Up:** 100 gold × new level - Train to next level
- **Respec:** 500 gold - Change character build (game jam QoL feature)

**Key Dialogue:**
- Sergeant Cremini: *"Swords and shields, that's what wins fights. Magic's flashy, but steel is reliable."*
- Mage Enoki: *"The Blight corrupts magic itself. Your spells may behave... unpredictably in the deep zones."*
- Shadow Puffball: *"Stay light on your feet. The moment you're surrounded, you're dead."*
- Cleric Truffle: *"Bioluminescence is our greatest weapon against the infected. Learn to channel the light."*

**NPC Companions Available (Optional Hirelings):**
- **Russula the Blade** (Fighter, level 3) - 100 gold/quest
- **Mycena the Wise** (Mage, level 3) - 150 gold/quest
- **Lactarius the Light** (Cleric, level 3) - 125 gold/quest

---

### 5. The Decomposer's Market (Equipment Shop)
**Location:** Southwest corner of New Phlegm
**Visual:** Market stalls (chair/stool props), chest prop (biomes-76)
**NPC:**
- **Merchant Maitake** (humanoid rogue sprite) - General goods
- **Smith Boletus** (humanoid fighter sprite) - Weapons/armor

**Function:** Buy/sell equipment, quest items, keys

**Inventory:**

**Weapons:**
| Item | Price | Stats |
|------|-------|-------|
| Short Sword | 10 gold | 1d6 damage |
| Long Sword | 15 gold | 1d8 damage |
| Spear | 8 gold | 1d6 damage, reach |
| Mace | 12 gold | 1d6 damage, +1 vs undead |
| Dagger | 3 gold | 1d4 damage |

**Armor:**
| Item | Price | AC Bonus |
|------|-------|----------|
| Leather Armor | 15 gold | AC 7 |
| Chain Mail | 75 gold | AC 5 |
| Plate Mail | 400 gold | AC 3 |
| Shield | 10 gold | -1 AC (better) |

**Quest Items:**
| Item | Sprite | Price | Purpose |
|------|--------|-------|---------|
| Silver Key | keys-0 | Quest reward | Ghostcap Fortress access |
| Gold Key | keys-1 | Quest reward | Spore Archive access |
| Copper Key | keys-2 | Quest reward | Deadcap Cemetery access |
| Rope (50 ft) | N/A | 5 gold | Utility |
| Torch (6) | fire-0 | 1 gold | Light source |

**Key Dialogue:**
- Merchant Maitake: *"Coin's still good, even in the end times. What're you buying?"*
- Smith Boletus: *"I forge every blade myself. They'll serve you well against the Blight."*
- (After Quest 3): *"You sealed the Mycelium Below? Good. I was worried those tunnels would breach our walls."*

---

## Random NPCs (Flavor & Lore)

### Common Citizens
- **Farmer Porcini** (humanoid sprite): *"My mushroom crops keep wilting. The Blight's corruption seeps into the soil..."*
- **Child Fairy Ring** (small humanoid sprite): *"Are you gonna save us? Mama says the monsters are getting closer."*
- **Guard Stropharia** (humanoid fighter): *"I hold the eastern wall. Nothing's getting through on my watch."*
- **Herbalist Hygrophorus** (humanoid rogue): *"I used to gather mushrooms in the old forest. Now it's all death caps and poison."*

### Lore Givers
- **Veteran Coprinus** (old humanoid fighter): *"I was there when the Blight first appeared. The Guardian Morel... changed. Its eyes went black, and then the screaming started."*
- **Scholar Agaricus** (humanoid wizard): *"The Mycelial Network connected all life in Phlegm. When the Spore Pool corrupted, the whole network turned against us."*
- **Survivor Lepiota** (humanoid rogue): *"I barely escaped Ghostcap Fortress. My friends... they didn't. Please, put them to rest."*

---

## Events & Story Beats

### Initial Arrival (Game Start)
**Trigger:** Player first enters New Phlegm
**Event:**
1. Captain Chanterelle greets party at gate: *"You made it through the outer zones? Impressive. Elder Portobello wants to see you—Council Hall, center of town."*
2. Player navigates to Council Hall
3. Elder Portobello gives exposition dump + Quest 1
4. Tutorial prompt: "Explore New Phlegm to find shops, healing, and rest."

---

### Quest 1 Completion: Hope Returns
**Trigger:** Return from Rotting Thicket
**Event:**
1. Citizens cheer as party enters
2. Farmer Porcini: *"The Rotting Thicket is clear? Maybe my crops will grow again!"*
3. Elder Portobello: *"Excellent work. But this is just the beginning. Ghostcap Fortress awaits."* (Quest 2 unlocked)
4. Silver Key rewarded, Amanita offers 10% discount

---

### Quest 2 Completion: The Warning
**Trigger:** Return from Ghostcap Fortress
**Event:**
1. Sage Morel approaches party urgently
2. Sage Morel: *"You encountered a ghost that spoke of the 'fallen guardian'? This confirms my fears. The Guardian Morel has been corrupted."*
3. Elder Portobello: *"If the Guardian itself has turned, we're in greater danger than I thought. We must act quickly."* (Quest 3 unlocked)
4. Gold Key rewarded

---

### Quest 3 Completion: Dire Warnings
**Trigger:** Return from Mycelium Below
**Event:**
1. If infected woman was rescued, she's brought to Temple of Luminescence
2. She speaks in trance: *"Evil spirit from unholy pool... hiding behind fair countenance... the guardian is lost..."*
3. Sister Oyster cures her, she wakes confused
4. Sage Morel: *"The Spore Pool itself is corrupted. We need knowledge from the ancient archives to understand this entity."* (Quest 4 unlocked)

---

### Quest 4 Completion: Ancient Knowledge
**Trigger:** Return from Spore Archive with **Cordyceps of Vitality**
**Event:**
1. Sage Morel studies the knowledge gained
2. Sage Morel: *"I've found it. The entity possessing the Guardian is called 'The Blight'—a parasitic force from beyond our realm. It cannot be reasoned with, only destroyed."*
3. Elder Portobello: *"Then we destroy it. But first, we must cleanse Deadcap Cemetery. The undead there serve The Blight."* (Quest 5 unlocked)
4. Copper Key rewarded
5. Amanita offers Protection from Good scroll at discount

---

### Quest 5 Completion: The Final Push
**Trigger:** Return from Deadcap Cemetery (Vampire Mushroom defeated)
**Event:**
1. Citizens are amazed party survived
2. Veteran Coprinus: *"You killed the Vampire Mushroom? I didn't think it was possible..."*
3. Captain Chanterelle: *"The path to Blightcap Citadel is clear. This is it—the final battle."*
4. Elder Portobello: *"The fate of New Phlegm, of all Phlegm, rests on your shoulders. Defeat The Blight. Purify the Spore Pool. Save us all."*
5. Party is given free supplies (3 major healing potions, 2 fire essence, 1 antifungal)
6. **Point of No Return Warning:** "Are you ready to assault Blightcap Citadel? There will be no turning back."

---

### Quest 6-7 Completion: VICTORY
**Trigger:** Return from Spore Pool (Guardian Morel defeated)
**Event:**
1. **Massive celebration** - all NPCs cheering, music playing
2. Elder Portobello: *"You did it! The Blight is destroyed! The Mycelial Network pulses with pure life again!"*
3. Sage Morel: *"The Guardian Morel is at peace. The Spore Pool radiates light once more."*
4. Captain Chanterelle: *"The blighted zones are already healing. We can reclaim our home."*
5. Montage of zones healing: grass growing, mushrooms blooming, light returning
6. **CREDITS ROLL**
7. Final shot: Party standing in New Phlegm as citizens rebuild, camera pans to cleansed Spore Pool in distance, glowing with pure radiance

---

## Encounters
**None** - New Phlegm is a safe zone. No random encounters, no combat.

**Exception:** If implementing an "infection" mechanic where party members can become infected during quests, they slowly lose HP while in New Phlegm until cured at Temple.

---

## Items Found in New Phlegm
None as loot. All items must be purchased or received as quest rewards.

**Quest Rewards:**
- **Quest 1:** 100 gold, Silver Key
- **Quest 2:** 200 gold, Gold Key, 10% shop discount
- **Quest 3:** 300 gold, Copper Key
- **Quest 4:** 500 gold, Cordyceps of Vitality (permanent +1 CON)
- **Quest 5:** 1000 gold, Free final assault supplies
- **Quest 6-7:** VICTORY

---

## Secrets & Easter Eggs

### 1. The Optimistic Child
If player talks to Child Fairy Ring after every quest completion, she gives progressively hopeful dialogue, culminating in her gifting the party a "Lucky Spore" (cosmetic item) after final victory.

### 2. The Veteran's Story
Veteran Coprinus tells increasingly detailed stories about "the old days" before The Blight. After Quest 5, he reveals he was once a Guardian of the Spore Pool himself, and feels guilty for surviving when the Guardian Morel fell.

### 3. Pool of Radiance Reference
Sage Morel's bookshelf (stool prop) can be examined: *"You see ancient tomes with titles like 'The Fall of Phlan' and 'Chronicles of the Bronze Dragon.' Curious..."*

### 4. Merchant's Deal
If player spends over 1000 gold at Decomposer's Market total, Merchant Maitake gives them a "Loyal Customer Discount" (15% off all future purchases).

---

## Connections to Other Areas

**To Quest 1 (Rotting Thicket):** Eastern gate, requires no key
**To Quest 2 (Ghostcap Fortress):** Northern gate, requires Silver Key (given after Quest 1)
**To Quest 3 (Mycelium Below):** Trapdoor in southeast corner (near Training Grounds), no key required
**To Quest 4 (Spore Archive):** Western gate, requires Gold Key (given after Quest 2)
**To Quest 5 (Deadcap Cemetery):** Southern gate, requires Copper Key (given after Quest 3)
**To Quest 6-7 (Blightcap Citadel):** All 5 previous quests must be completed, exits through western gate beyond Archive

---

## Music/Sound Design Suggestions

**Ambient Sound:**
- Gentle crackling of campfires
- Soft bioluminescent hum
- Distant hammering from smith
- Murmur of NPC conversations
- Light wind rustling through mushroom caps

**Music Theme:**
- Warm, safe, hopeful melody
- Acoustic instruments (flute, harp, light percussion)
- Contrast to dark/ominous dungeon music
- Swells triumphantly after each quest completion
- Becomes celebratory for final victory scene

**NPC Voice Concepts:**
- Elder Portobello: Deep, wise, grandfatherly
- Captain Chanterelle: Gruff, military, protective
- Amanita: Mysterious, slightly playful
- Sister Oyster: Gentle, compassionate, serene
- Merchant Maitake: Fast-talking, businesslike

---

## Design Notes

**Functionality:**
- Hub must always feel SAFE and WELCOMING
- Clear visual distinction from danger zones (warm lighting, NPCs, no monsters)
- Services must be clearly marked and accessible
- Quest flow must be intuitive (talk to Elder → complete quest → return → next quest)
- Allow backtracking to shop/heal between quests

**Pacing:**
- Hub visits should be brief (2-5 minutes max)
- Don't gate-keep with excessive dialogue
- Make shops quick to navigate
- Rest should be one-click

**Emotional Beats:**
- Start: Desperate hope
- Mid-game: Growing confidence
- End: Triumphant celebration

**Tutorial Elements:**
- First visit teaches: quest acceptance, shopping, healing, resting
- Don't overwhelm player—introduce services as needed
- Use NPC dialogue to hint at mechanics ("Buy antifungals before the cemetery!")
