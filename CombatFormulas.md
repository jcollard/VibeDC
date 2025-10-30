# Combat Formulas Reference

**Purpose:** Comprehensive documentation of all combat calculation formulas

**Last Updated:** 2025-10-30

**Implementation:** [CombatCalculations.ts](react-app/src/models/combat/utils/CombatCalculations.ts)

---

## Table of Contents

- [Overview](#overview)
- [Hit Chance Calculation](#hit-chance-calculation)
- [Damage Calculation](#damage-calculation)
- [Mental Stats System](#mental-stats-system)
- [Worked Examples](#worked-examples)
- [Design Philosophy](#design-philosophy)
- [Developer Overrides](#developer-overrides)

---

## Overview

The combat system uses two primary calculations:
1. **Hit Chance** - Probability that an attack connects (3% to 97%)
2. **Damage** - Amount of wounds inflicted on successful hit (minimum 0)

Both calculations are affected by:
- **Base stats** (Physical/Magic Power, Physical/Magic Evade)
- **Mental stats** (Courage for physical, Attunement for magical)
- **Weapon properties** (Modifiers and Multipliers)

---

## Hit Chance Calculation

### Physical Attack Hit Chance

```
Step 1: Calculate base hit chance from evasion
    Base Hit = 100% - Defender's Physical Evade

Step 2: Check for mental stat bonus
    If Attacker's Courage > Defender's Courage:
        Courage Bonus = (Attacker Courage - Defender Courage) × 0.25%
    Else:
        Courage Bonus = 0%

Step 3: Apply bonus and clamp
    Final Hit = Base Hit + Courage Bonus
    Final Hit = clamp(Final Hit, 3%, 97%)

Step 4: Convert to decimal for roll
    Return Final Hit / 100  (e.g., 85% becomes 0.85)
```

### Magical Attack Hit Chance

```
Step 1: Calculate base hit chance from evasion
    Base Hit = 100% - Defender's Magic Evade

Step 2: Check for mental stat bonus
    If Attacker's Attunement > Defender's Attunement:
        Attunement Bonus = (Attacker Attunement - Defender Attunement) × 0.25%
    Else:
        Attunement Bonus = 0%

Step 3: Apply bonus and clamp
    Final Hit = Base Hit + Attunement Bonus
    Final Hit = clamp(Final Hit, 3%, 97%)

Step 4: Convert to decimal for roll
    Return Final Hit / 100
```

### Key Characteristics

**Evasion is Direct:**
- 0 P.Evd = 100% base hit chance (before courage)
- 16 P.Evd = 84% base hit chance
- 50 P.Evd = 50% base hit chance
- 97+ P.Evd = clamped to 3% minimum hit chance

**Mental Stat Bonus (Only for Superior Attacker):**
- Courage/Attunement difference creates a **25% conversion rate**
- 10 point advantage = 2.5% bonus hit chance
- 20 point advantage = 5% bonus hit chance
- 40 point advantage = 10% bonus hit chance

**Always Possible, Never Guaranteed:**
- Minimum hit chance: **3%** (even against 97+ evasion)
- Maximum hit chance: **97%** (even against 0 evasion)
- No guaranteed hits or guaranteed misses

---

## Damage Calculation

### Physical Attack Damage

```
Step 1: Calculate base damage from power and weapon
    Base Damage = (Attacker's Physical Power + Weapon Physical Power Modifier)
                  × Weapon Physical Power Multiplier

Step 2: Check for mental stat penalty
    If Defender's Courage > Attacker's Courage:
        Courage Penalty = floor((Defender Courage - Attacker Courage) × 0.25)
    Else:
        Courage Penalty = 0

Step 3: Apply penalty and floor at zero
    Final Damage = Base Damage - Courage Penalty
    Final Damage = max(0, Final Damage)

Step 4: Return as integer
    Return floor(Final Damage)
```

### Magical Attack Damage

```
Step 1: Calculate base damage from power and weapon
    Base Damage = (Attacker's Magic Power + Weapon Magic Power Modifier)
                  × Weapon Magic Power Multiplier

Step 2: Check for mental stat penalty
    If Defender's Attunement > Attacker's Attunement:
        Attunement Penalty = floor((Defender Attunement - Attacker Attunement) × 0.25)
    Else:
        Attunement Penalty = 0

Step 3: Apply penalty and floor at zero
    Final Damage = Base Damage - Attunement Penalty
    Final Damage = max(0, Final Damage)

Step 4: Return as integer
    Return floor(Final Damage)
```

### Key Characteristics

**Weapon Modifiers and Multipliers:**
- **Modifiers** are **added** to base power BEFORE multiplication
- **Multipliers** are **applied** to (base power + modifier)
- Default modifier: 0 (no bonus)
- Default multiplier: 1.0 (no scaling)

**Mental Stat Penalty (Only for Superior Defender):**
- Courage/Attunement difference creates a **25% conversion rate**
- Penalty is **floored** (rounded down)
- 10 point advantage = floor(2.5) = 2 damage reduction
- 20 point advantage = floor(5) = 5 damage reduction
- 43 point advantage = floor(10.75) = 10 damage reduction

**Damage Floor:**
- Minimum damage: **0** (attacks can deal no damage if penalty is too high)
- Maximum damage: **unlimited** (scales with power, modifiers, multipliers)

---

## Mental Stats System

### Courage (Physical Combat)

**For Attackers:**
- High courage **increases hit chance** when superior to defender
- Does NOT increase damage
- Effect: Offensive advantage (land more hits)

**For Defenders:**
- High courage **reduces incoming damage** when superior to attacker
- Does NOT improve evasion
- Effect: Defensive advantage (take less damage per hit)

### Attunement (Magical Combat)

**For Attackers:**
- High attunement **increases hit chance** when superior to defender
- Does NOT increase damage
- Effect: Offensive advantage (land more hits)

**For Defenders:**
- High attunement **reduces incoming damage** when superior to attacker
- Does NOT improve evasion
- Effect: Defensive advantage (take less damage per hit)

### Mental Stat Summary Table

| Combat Type | Attacker Superior | Defender Superior |
|-------------|-------------------|-------------------|
| **Physical** | +Courage → Bonus Hit % | +Courage → Penalty Damage |
| **Magical** | +Attunement → Bonus Hit % | +Attunement → Penalty Damage |

**Conversion Rate:** 25% of stat difference (4 points = 1% or 1 damage)

**Rounding:**
- Hit chance bonus: **NOT rounded** (keeps decimals like 2.5%)
- Damage penalty: **Rounded down** (floor function)

---

## Worked Examples

### Example 1: Physical Attack (Even Match)

**Attacker:**
- Physical Power: 20
- Courage: 15
- Weapon: +5 modifier, ×1.5 multiplier

**Defender:**
- Physical Evade: 16
- Courage: 15

**Hit Chance:**
```
Base Hit = 100% - 16% = 84%
Courage Bonus = 0% (equal courage)
Final Hit = 84%
```

**Damage:**
```
Base Damage = (20 + 5) × 1.5 = 37.5
Courage Penalty = 0 (equal courage)
Final Damage = floor(37.5) = 37
```

**Result:** 84% chance to hit for 37 damage

---

### Example 2: Physical Attack (Brave Attacker)

**Attacker:**
- Physical Power: 15
- Courage: 25
- Weapon: +3 modifier, ×1.0 multiplier

**Defender:**
- Physical Evade: 12
- Courage: 10

**Hit Chance:**
```
Base Hit = 100% - 12% = 88%
Courage Bonus = (25 - 10) × 0.25% = 3.75%
Final Hit = 88% + 3.75% = 91.75%
```

**Damage:**
```
Base Damage = (15 + 3) × 1.0 = 18
Courage Penalty = 0 (attacker has more courage)
Final Damage = 18
```

**Result:** 91.75% chance to hit for 18 damage

---

### Example 3: Physical Attack (Brave Defender)

**Attacker:**
- Physical Power: 22
- Courage: 10
- Weapon: +0 modifier, ×1.2 multiplier

**Defender:**
- Physical Evade: 20
- Courage: 30

**Hit Chance:**
```
Base Hit = 100% - 20% = 80%
Courage Bonus = 0% (defender has more courage)
Final Hit = 80%
```

**Damage:**
```
Base Damage = (22 + 0) × 1.2 = 26.4
Courage Penalty = floor((30 - 10) × 0.25) = floor(5) = 5
Final Damage = floor(26.4) - 5 = 26 - 5 = 21
```

**Result:** 80% chance to hit for 21 damage

---

### Example 4: High Evasion Target

**Attacker:**
- Physical Power: 25
- Courage: 15
- Weapon: +8 modifier, ×1.3 multiplier

**Defender:**
- Physical Evade: 95
- Courage: 12

**Hit Chance:**
```
Base Hit = 100% - 95% = 5%
Courage Bonus = (15 - 12) × 0.25% = 0.75%
Unclamped = 5% + 0.75% = 5.75%
Final Hit = 5.75% (within 3%-97% range)
```

**Damage:**
```
Base Damage = (25 + 8) × 1.3 = 42.9
Courage Penalty = 0 (attacker has more courage)
Final Damage = floor(42.9) = 42
```

**Result:** 5.75% chance to hit for 42 damage

---

### Example 5: Magical Attack (Attuned Defender)

**Attacker:**
- Magic Power: 18
- Attunement: 12
- Weapon: +4 modifier, ×1.4 multiplier

**Defender:**
- Magic Evade: 8
- Attunement: 28

**Hit Chance:**
```
Base Hit = 100% - 8% = 92%
Attunement Bonus = 0% (defender has more attunement)
Final Hit = 92%
```

**Damage:**
```
Base Damage = (18 + 4) × 1.4 = 30.8
Attunement Penalty = floor((28 - 12) × 0.25) = floor(4) = 4
Final Damage = floor(30.8) - 4 = 30 - 4 = 26
```

**Result:** 92% chance to hit for 26 damage

---

### Example 6: Zero Damage Scenario

**Attacker:**
- Physical Power: 8
- Courage: 5
- Weapon: +0 modifier, ×1.0 multiplier

**Defender:**
- Physical Evade: 10
- Courage: 40

**Hit Chance:**
```
Base Hit = 100% - 10% = 90%
Courage Bonus = 0% (defender has more courage)
Final Hit = 90%
```

**Damage:**
```
Base Damage = (8 + 0) × 1.0 = 8
Courage Penalty = floor((40 - 5) × 0.25) = floor(8.75) = 8
Final Damage = max(0, 8 - 8) = 0
```

**Result:** 90% chance to hit for **0 damage** (attack connects but does nothing!)

---

## Design Philosophy

### Why This System?

**Evasion as Direct Reduction:**
- Simple to understand: "16 evasion = 16% dodge chance"
- Intuitive for players: higher evasion = harder to hit
- Transparent: no hidden calculations

**3% - 97% Hard Limits:**
- Prevents degenerate scenarios (unkillable dodge tanks, guaranteed hits)
- Creates risk in all combat (even weak attacks can miss, even tanks can be hit)
- Maintains tension (no "safe" situations)

**Mental Stats Create Asymmetry:**
- Courage/Attunement affect DIFFERENT aspects (hit vs damage)
- High attacker courage = lands more hits (offensive)
- High defender courage = takes less damage per hit (defensive)
- Creates interesting stat optimization decisions

**25% Conversion Rate:**
- Balanced: requires significant stat difference for meaningful effect
- 4 points = 1% hit or 1 damage (modest but noticeable)
- 20 points = 5% hit or 5 damage (substantial advantage)
- 40 points = 10% hit or 10 damage (dominant advantage)

**Floored Damage Penalty:**
- Prevents fractional weirdness (no "half damage" display issues)
- Conservative (defender doesn't get full value of fractional stats)
- Attacker-favored (9.9 penalty rounds down to 9)

**Zero Damage Floor:**
- Attacks can whiff entirely against tough opponents
- Creates dramatic moments (brave tank shrugs off sword blow)
- Punishes poor stat matchups (weak attacker vs brave defender)

### Stat Interactions

**Power + Weapon Synergy:**
- Modifiers scale with multipliers
- High power + high modifier + high multiplier = multiplicative growth
- Weapons can amplify or weaken power differences

**Evasion vs Mental Stats:**
- Evasion affects FREQUENCY of hits
- Mental stats affect OUTCOME of hits
- Both matter: dodge tanks need evasion, brave tanks need courage

**Courage/Attunement Duality:**
- Same stat has OPPOSITE effects for attacker vs defender
- Encourages specialization (offensive courage build vs defensive courage build)
- Creates counter-play (brave attacker beats evasive defender, brave defender beats weak attacker)

---

## Developer Overrides

### Testing Functions

The combat system includes developer mode functions for testing:

**Override Hit Rate:**
```javascript
window.setHitRate(0.5)  // Force 50% hit chance
window.setHitRate(0)    // Force guaranteed miss
window.setHitRate(1)    // Force guaranteed hit
```

**Override Damage:**
```javascript
window.setDamage(10)   // Force 10 damage on hit
window.setDamage(0)    // Force 0 damage (hit but no effect)
window.setDamage(999)  // Force massive damage
```

**Clear Overrides:**
```javascript
window.clearAttackOverride()  // Return to normal formulas
```

### Override Behavior

- Overrides **persist** until explicitly cleared
- Overrides **bypass** all formula calculations
- Overrides are **logged** to console for visibility
- Overrides work for **all** attack types (physical and magical)

**Use Cases:**
- Testing knockout detection (force lethal damage)
- Testing miss animations (force 0% hit rate)
- Testing edge cases (0 damage hits, massive damage)
- Debugging combat issues (isolate calculation problems)

---

## Implementation Notes

### Code Location

All formulas implemented in:
- File: `react-app/src/models/combat/utils/CombatCalculations.ts`
- Method: `getChanceToHit()` (lines 18-76)
- Method: `calculateAttackDamage()` (lines 78-142)

### Unit Stats Access

Combat units provide stats through getters:
- `unit.physicalPower` - Base physical attack power
- `unit.magicPower` - Base magical attack power
- `unit.physicalEvade` - Physical dodge chance (0-100)
- `unit.magicEvade` - Magical dodge chance (0-100)
- `unit.courage` - Physical mental stat
- `unit.attunement` - Magical mental stat

### Weapon Properties Access

Weapons provide modifiers through `weapon.modifiers`:
- `weapon.modifiers.physicalPowerModifier` - Flat bonus to physical power
- `weapon.modifiers.physicalPowerMultiplier` - Multiplier for physical power (default 1.0)
- `weapon.modifiers.magicPowerModifier` - Flat bonus to magic power
- `weapon.modifiers.magicPowerMultiplier` - Multiplier for magic power (default 1.0)

### Return Types

- **Hit chance:** `number` (0 to 1 range, e.g., 0.85 = 85%)
- **Damage:** `integer` (floored, minimum 0)

---

**End of Combat Formulas Reference**
