# Game Data System

This directory contains the game's data files and loading utilities.

## Database Files

- **ability-database.yaml** - 40 combat abilities (Action, Reaction, Passive, Movement)
- **equipment-database.yaml** - 25 equipment items across all types
- **class-database.yaml** - 10 unit classes with stat modifiers and learnable abilities

## Usage

Call `loadAllGameData()` once at application startup to populate all registries:

```typescript
import { loadAllGameData } from './data/DataLoader';

// In your app initialization (e.g., main.tsx or App.tsx)
loadAllGameData();
```

After loading, you can access data via the static registries:

```typescript
import { CombatAbility } from './models/combat/CombatAbility';
import { Equipment } from './models/combat/Equipment';
import { UnitClass } from './models/combat/UnitClass';

// Get specific items by ID
const fireball = CombatAbility.getById('fireball-001');
const ironSword = Equipment.getById('iron-sword-001');
const warrior = UnitClass.getById('warrior-001');

// Get all items
const allAbilities = CombatAbility.getAll();
const allEquipment = Equipment.getAll();
const allClasses = UnitClass.getAll();
```

## Data Loading Order

The data loader automatically handles dependencies:
1. Abilities are loaded first (no dependencies)
2. Equipment is loaded second (no dependencies)
3. Classes are loaded last (depends on abilities)

## File Format

All data files use YAML format with the following structure:

### ability-database.yaml
```yaml
abilities:
  - id: "ability-id"
    name: "Ability Name"
    description: "What it does"
    abilityType: "Action" # or Reaction, Passive, Movement
    experiencePrice: 100
    tags:
      - "attack"
      - "physical"
```

### equipment-database.yaml
```yaml
equipment:
  - id: "equipment-id"
    name: "Equipment Name"
    type: "OneHandedWeapon" # or TwoHandedWeapon, Shield, Held, Head, Body, Accessory
    modifiers:
      physicalPower: 10
      speed: 2
    multipliers:
      physicalPower: 1.1
```

### class-database.yaml
```yaml
classes:
  - id: "class-id"
    name: "Class Name"
    description: "Class description"
    tags:
      - "melee"
      - "physical"
    learnableAbilities:
      - "ability-id-1"
      - "ability-id-2"
    modifiers:
      health: 20
      physicalPower: 10
    multipliers:
      health: 1.2
```

## Adding New Data

1. Edit the appropriate YAML file
2. Ensure IDs are unique
3. For classes, ensure all referenced ability IDs exist in ability-database.yaml
4. The data will be automatically loaded on next app startup
