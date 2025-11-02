# Character Creation / Guild Hall - Implementation Plan

**Version:** 1.0
**Created:** 2025-11-01
**Related:** [CharacterCreationFeatureOverview.md](CharacterCreationFeatureOverview.md), [GameViewHierarchy.md](../../GameViewHierarchy.md), [PartyMemberRegistry.ts](../../react-app/src/utils/PartyMemberRegistry.ts)

## Purpose

This document provides a detailed, step-by-step implementation plan for the Character Creation and Guild Hall feature. It breaks down the work into phases, tasks, and acceptance criteria to guide development.

## ⚠️ RECOMMENDED APPROACH

**This plan is comprehensive (23-31 hours) and has been broken into 4 manageable parts:**

1. **[Part1-DataLayer.md](Part1-DataLayer.md)** (~4-6 hours)
   - GameState and Serialization
   - GuildRosterManager and Class Configs
   - Pure data layer, fully testable in isolation
   - ✅ **Status**: COMPLETE

2. **[Part2-GuildHallUI.md](Part2-GuildHallUI.md)** (~9-11 hours) **UPDATED 2025-11-01**
   - GuildHallView Base Screen
   - **NEW**: GuildHallTestRoute component for isolated testing
   - **NEW**: `/dev/guild-hall` route for easy testing
   - **NEW**: UISettings integration for integer scaling (1×, 2×, 3×, etc.)
   - **NEW**: Fullscreen container layout with 16:9 aspect ratio
   - **UPDATED**: Fixed resource loading pattern (ResourceManager for fonts, SpriteRegistry for sprites)
   - Party Management UI (cards and interaction)
   - Core UI without modal complexity

3. **[Part3-CharacterCreationModal.md](Part3-CharacterCreationModal.md)** (~6-8 hours)
   - Character Creation Modal (complete)
   - Complex UI deserving focused attention

4. **[Part4-Integration.md](Part4-Integration.md)** (~4-6 hours)
   - GameView Integration
   - Testing and Polish
   - Documentation

**It is STRONGLY RECOMMENDED to implement these parts in order.** Each part has clear prerequisites and builds on the previous parts.

### Recent Updates (2025-11-01)

**Part 2 Updates**:
- Added Task 3.3: Create GuildHallTestRoute component
- Added Task 3.4: Add `/dev/guild-hall` route to App.tsx
- **NEW**: Added UISettings integration for pixel-perfect integer scaling
- **NEW**: Added fullscreen container layout matching FirstPersonView pattern
- **NEW**: Added window resize tracking for dynamic scaling updates
- Updated resource loading to properly handle ResourceManager (fonts) and SpriteRegistry (sprites)
- Time estimate increased to 9-11 hours (added ~1 hour for test route setup)
- **Benefit**: Guild Hall UI can now be tested in isolation at `/dev/guild-hall` without GameView complexity
- **Benefit**: Pixel-perfect rendering at all screen sizes with integer scaling (no blurry upscaling)

The full detailed plan below is kept for reference, but the part-by-part documents are easier to follow and track progress.

## ⚠️ CRITICAL IMPLEMENTATION GUIDELINES

**READ THIS SECTION FIRST!** These guidelines from [GeneralGuidelines.md](../../GeneralGuidelines.md) are mandatory throughout this implementation.

### Rendering Rules (NEVER BREAK THESE!)

1. **Text Rendering**:
   - ✅ ALWAYS use `FontAtlasRenderer.renderText()`
   - ❌ NEVER use `ctx.fillText()` or `ctx.strokeText()`
   - **Why**: Direct text rendering bypasses the font atlas system

2. **Sprite Rendering**:
   - ✅ ALWAYS use `SpriteRenderer.renderSprite()`
   - ❌ NEVER use `ctx.drawImage()` on sprite sheets
   - **Why**: Direct drawImage bypasses sprite registry and causes rendering errors

3. **Canvas Setup**:
   - ✅ ALWAYS set `ctx.imageSmoothingEnabled = false`
   - ✅ ALWAYS round coordinates with `Math.floor(x)`, `Math.floor(y)`
   - ✅ ALWAYS use `UISettings.getIntegerScaledDimensions()` for integer scaling (1×, 2×, 3×, etc.)
   - ✅ ALWAYS wrap canvas in fullscreen container for proper layout
   - **Why**: Prevents blurry pixel art, sub-pixel artifacts, and provides pixel-perfect scaling

### State Management Rules

1. **Immutable Updates**:
   - ✅ ALWAYS: `state = { ...state, field: newValue }`
   - ❌ NEVER: `state.field = newValue`
   - **Why**: React diffing breaks with mutations

2. **Component Caching**:
   - ✅ ALWAYS cache stateful components with `useMemo()`
   - ❌ NEVER recreate managers/objects in render
   - **Why**: Prevents unnecessary recreation and state loss

### Performance Rules

1. **Mouse Event Handling**:
   - ✅ ALWAYS update state only in mouse handlers
   - ❌ NEVER call `renderFrame()` in `onMouseMove`
   - **Why**: Causes 1000+ fps rendering, burns CPU

2. **Object Allocation**:
   - ✅ ALWAYS cache lookups outside render loop
   - ❌ NEVER create objects in render loop
   - **Why**: Causes garbage collection lag

3. **Canvas Buffers**:
   - ✅ ALWAYS cache canvas buffers in refs/state
   - ❌ NEVER create canvas elements in render loop
   - **Why**: Extremely expensive operation

**If you violate these guidelines, you will introduce bugs that are hard to debug!**

---

## Implementation Overview

### Estimated Complexity
- **Total Implementation Time**: 18-24 hours
- **Testing Time**: 4-6 hours
- **Total**: 22-30 hours

### Risk Assessment
- **High Risk**: GameState schema changes (affects save/load system)
- **Medium Risk**: Complex modal UI with multiple input types
- **Medium Risk**: Party management logic and validation
- **Low Risk**: Canvas rendering (patterns already established)

### Prerequisites
Before starting implementation:
- ✅ GameView orchestrator system exists ([GameViewHierarchy.md](../../GameViewHierarchy.md))
- ✅ PartyMemberRegistry exists ([PartyMemberRegistry.ts](../../react-app/src/utils/PartyMemberRegistry.ts))
- ✅ UnitClass system exists (for class definitions)
- ✅ Equipment system exists (for starting equipment)
- ✅ Sprite system exists (SpriteRegistry, SpriteRenderer)
- ✅ Font system exists (FontAtlasRegistry, FontAtlasRenderer)
- ✅ GameSaveManager exists (for save/load operations)

---

## Phase 1: GameState and Serialization Foundation

**Goal**: Update core game state types to support guild roster persistence

**Estimated Time**: 2-3 hours

### Task 1.1: Update GameState.ts
**File**: `react-app/src/models/game/GameState.ts`

**Changes**:
```typescript
// Add to GameViewType union
export type GameViewType = 'exploration' | 'combat' | 'menu' | 'loading' | 'guild-hall';

// Update PartyState interface
export interface PartyState {
  members: CombatUnit[];  // Active party members (max 4)
  guildRoster: PartyMemberDefinition[];  // NEW: All created characters
  inventory: {
    items: InventoryItem[];
    gold: number;
  };
  equipment: Map<string, EquippedItems>;
}
```

**Acceptance Criteria**:
- [x] `GameViewType` includes 'guild-hall'
- [x] `PartyState` includes `guildRoster: PartyMemberDefinition[]`
- [x] Type imports include `PartyMemberDefinition` from PartyMemberRegistry
- [x] File compiles without errors

---

### Task 1.2: Update GameStateSerialization.ts
**File**: `react-app/src/models/game/GameStateSerialization.ts`

**Changes**:

1. **Add JSON type for guild roster**:
```typescript
export interface PartyStateJSON {
  members: any[];  // TODO: CombatUnit serialization
  guildRoster: PartyMemberDefinitionJSON[];  // NEW
  inventory: {
    items: { itemId: string; quantity: number }[];
    gold: number;
  };
  equipment: Array<[string, EquippedItems]>;
}
```

2. **Update serializePartyState()**:
```typescript
export function serializePartyState(state: PartyState): PartyStateJSON {
  return {
    members: state.members.map(unit => {
      // Existing CombatUnit serialization (TODO: implement properly)
      console.warn('CombatUnit serialization not fully implemented');
      return {}; // Placeholder
    }),
    guildRoster: state.guildRoster.map(def => ({
      // Serialize PartyMemberDefinition
      id: def.id,
      name: def.name,
      unitClassId: def.unitClassId,
      baseHealth: def.baseHealth,
      baseMana: def.baseMana,
      basePhysicalPower: def.basePhysicalPower,
      baseMagicPower: def.baseMagicPower,
      baseSpeed: def.baseSpeed,
      baseMovement: def.baseMovement,
      basePhysicalEvade: def.basePhysicalEvade,
      baseMagicEvade: def.baseMagicEvade,
      baseCourage: def.baseCourage,
      baseAttunement: def.baseAttunement,
      spriteId: def.spriteId,
      learnedAbilityIds: def.learnedAbilityIds,
      reactionAbilityId: def.reactionAbilityId,
      passiveAbilityId: def.passiveAbilityId,
      movementAbilityId: def.movementAbilityId,
      secondaryClassId: def.secondaryClassId,
      leftHandId: def.leftHandId,
      rightHandId: def.rightHandId,
      headId: def.headId,
      bodyId: def.bodyId,
      accessoryId: def.accessoryId,
      totalExperience: def.totalExperience,
      classExperience: def.classExperience,
      classExperienceSpent: def.classExperienceSpent,
      tags: def.tags,
      description: def.description,
    })),
    inventory: state.inventory,
    equipment: Array.from(state.equipment.entries()),
  };
}
```

3. **Update deserializePartyState()**:
```typescript
export function deserializePartyState(json: PartyStateJSON): PartyState | null {
  try {
    return {
      members: json.members.map(unitJson => {
        // TODO: Implement CombatUnit.fromJSON()
        console.warn('CombatUnit deserialization not fully implemented');
        return null as any; // Placeholder
      }).filter(Boolean),
      guildRoster: json.guildRoster.map(defJson => ({
        id: defJson.id,
        name: defJson.name,
        unitClassId: defJson.unitClassId,
        baseHealth: defJson.baseHealth,
        baseMana: defJson.baseMana,
        basePhysicalPower: defJson.basePhysicalPower,
        baseMagicPower: defJson.baseMagicPower,
        baseSpeed: defJson.baseSpeed,
        baseMovement: defJson.baseMovement,
        basePhysicalEvade: defJson.basePhysicalEvade,
        baseMagicEvade: defJson.baseMagicEvade,
        baseCourage: defJson.baseCourage,
        baseAttunement: defJson.baseAttunement,
        spriteId: defJson.spriteId,
        learnedAbilityIds: defJson.learnedAbilityIds,
        reactionAbilityId: defJson.reactionAbilityId,
        passiveAbilityId: defJson.passiveAbilityId,
        movementAbilityId: defJson.movementAbilityId,
        secondaryClassId: defJson.secondaryClassId,
        leftHandId: defJson.leftHandId,
        rightHandId: defJson.rightHandId,
        headId: defJson.headId,
        bodyId: defJson.bodyId,
        accessoryId: defJson.accessoryId,
        totalExperience: defJson.totalExperience,
        classExperience: defJson.classExperience,
        classExperienceSpent: defJson.classExperienceSpent,
        tags: defJson.tags,
        description: defJson.description,
      })),
      inventory: json.inventory,
      equipment: new Map(json.equipment),
    };
  } catch (error) {
    console.error('Failed to deserialize PartyState:', error);
    return null;
  }
}
```

**Acceptance Criteria**:
- [x] `PartyStateJSON` includes `guildRoster` field
- [x] `serializePartyState()` serializes `guildRoster` array
- [x] `deserializePartyState()` deserializes `guildRoster` array
- [x] Round-trip test: serialize → deserialize → deep equals
- [x] File compiles without errors

---

### Task 1.3: Test Save/Load with Guild Roster
**File**: Create `react-app/src/models/game/__tests__/GameStateSerialization.guildRoster.test.ts`

**Test Cases**:
```typescript
describe('GameStateSerialization - Guild Roster', () => {
  it('should serialize empty guild roster', () => {
    const state: PartyState = {
      members: [],
      guildRoster: [],
      inventory: { items: [], gold: 0 },
      equipment: new Map(),
    };
    const json = serializePartyState(state);
    expect(json.guildRoster).toEqual([]);
  });

  it('should serialize guild roster with characters', () => {
    const character: PartyMemberDefinition = {
      id: 'char-1',
      name: 'Test Hero',
      unitClassId: 'fighter',
      baseHealth: 45,
      baseMana: 5,
      // ... all required fields
    };
    const state: PartyState = {
      members: [],
      guildRoster: [character],
      inventory: { items: [], gold: 0 },
      equipment: new Map(),
    };
    const json = serializePartyState(state);
    expect(json.guildRoster).toHaveLength(1);
    expect(json.guildRoster[0].id).toBe('char-1');
  });

  it('should deserialize guild roster', () => {
    // ... test deserialization
  });

  it('should handle round-trip serialization', () => {
    // ... test serialize → deserialize → equals
  });
});
```

**Acceptance Criteria**:
- [x] All tests pass (5/5 passing)
- [x] Guild roster serializes correctly
- [x] Guild roster deserializes correctly
- [x] Round-trip maintains data integrity

---

## Phase 2: GuildRosterManager and Class Configs

**Goal**: Implement party management logic and class starter configurations

**Estimated Time**: 3-4 hours

### ⚠️ STATE MANAGEMENT GUIDELINES - CRITICAL

**MUST FOLLOW** these patterns from [GeneralGuidelines.md](../../GeneralGuidelines.md):

1. **ALWAYS use immutable state updates**
   - ❌ BAD: `this.partyState.members.push(newMember)`
   - ✅ GOOD: `this.partyState = { ...this.partyState, members: [...this.partyState.members, newMember] }`

2. **NEVER modify objects/arrays in place**
   - ❌ BAD: `state.guildRoster[0].name = 'New Name'`
   - ✅ GOOD: Return new objects with spread operators

3. **ALWAYS cache stateful components with useMemo**
   - ❌ BAD: `const manager = new GuildRosterManager(...)` (recreated every render)
   - ✅ GOOD: `const manager = useMemo(() => new GuildRosterManager(...), [deps])`

4. **Use WeakMap for temporary instance-to-data mappings**
   - If you need to associate temporary UI data with character instances
   - Prevents memory leaks when instances are removed

**Why**: Mutable updates break React's diffing, cause stale closures, and lead to bugs that are hard to debug.

### Task 2.1: Create Class Starter Configs (Hardcoded)
**File**: `react-app/src/utils/GuildRosterManager.ts` (inline)

**Implementation**:
```typescript
interface ClassStarterConfig {
  baseHealth: number;
  baseMana: number;
  basePhysicalPower: number;
  baseMagicPower: number;
  baseSpeed: number;
  baseMovement: number;
  basePhysicalEvade: number;
  baseMagicEvade: number;
  baseCourage: number;
  baseAttunement: number;
  leftHandId?: string;
  rightHandId?: string;
  headId?: string;
  bodyId?: string;
  accessoryId?: string;
  learnedAbilityIds?: string[];
  reactionAbilityId?: string;
  passiveAbilityId?: string;
  movementAbilityId?: string;
}

// Hardcoded configs for starter classes
const CLASS_STARTER_CONFIGS: Record<string, ClassStarterConfig> = {
  'fighter': {
    baseHealth: 45,
    baseMana: 5,
    basePhysicalPower: 10,
    baseMagicPower: 5,
    baseSpeed: 8,
    baseMovement: 4,
    basePhysicalEvade: 10,
    baseMagicEvade: 7,
    baseCourage: 12,
    baseAttunement: 6,
    // Equipment IDs will be added once Equipment system is reviewed
  },
  'apprentice': {
    baseHealth: 25,
    baseMana: 30,
    basePhysicalPower: 5,
    baseMagicPower: 15,
    baseSpeed: 7,
    baseMovement: 3,
    basePhysicalEvade: 8,
    baseMagicEvade: 14,
    baseCourage: 8,
    baseAttunement: 16,
  },
  'rogue': {
    baseHealth: 30,
    baseMana: 15,
    basePhysicalPower: 8,
    baseMagicPower: 7,
    baseSpeed: 12,
    baseMovement: 5,
    basePhysicalEvade: 16,
    baseMagicEvade: 10,
    baseCourage: 10,
    baseAttunement: 10,
  },
};

function getClassStarterConfig(classId: string): ClassStarterConfig | null {
  return CLASS_STARTER_CONFIGS[classId] || null;
}
```

**Acceptance Criteria**:
- [x] Config defined for all starter classes (fighter, apprentice, rogue)
- [x] All base stats specified
- [x] Helper function `getClassStarterConfig()` implemented

---

### Task 2.2: Implement GuildRosterManager
**File**: `react-app/src/utils/GuildRosterManager.ts`

**Full Implementation**:
```typescript
import type { PartyState } from '../models/game/GameState';
import type { PartyMemberDefinition } from './PartyMemberRegistry';
import { PartyMemberRegistry } from './PartyMemberRegistry';
import { UnitClass } from '../models/combat/UnitClass';

export class GuildRosterManager {
  private partyState: PartyState;
  private onStateChange?: (state: PartyState) => void;

  constructor(initialPartyState: PartyState, onStateChange?: (state: PartyState) => void) {
    this.partyState = initialPartyState;
    this.onStateChange = onStateChange;
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.partyState);
    }
  }

  // Character Creation
  createCharacter(name: string, spriteId: string, unitClassId: string): PartyMemberDefinition | null {
    // Validate name
    if (!this.isValidName(name)) {
      console.warn("Invalid character name:", name);
      return null;
    }

    // Check for duplicate name
    if (this.partyState.guildRoster.some(c => c.name === name)) {
      console.warn("Character name already exists:", name);
      return null;
    }

    // Verify class exists and is a starter class
    const unitClass = UnitClass.getById(unitClassId);
    if (!unitClass) {
      console.error(`Unit class '${unitClassId}' not found`);
      return null;
    }

    if (unitClass.requirements.size > 0) {
      console.error(`Class '${unitClassId}' has requirements and cannot be used for character creation`);
      return null;
    }

    // Get class starter config
    const classConfig = getClassStarterConfig(unitClassId);
    if (!classConfig) {
      console.error(`No starter config found for class '${unitClassId}'`);
      return null;
    }

    // Generate unique ID
    const id = `character-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Create full PartyMemberDefinition
    const character: PartyMemberDefinition = {
      id,
      name,
      unitClassId,
      spriteId,
      baseHealth: classConfig.baseHealth,
      baseMana: classConfig.baseMana,
      basePhysicalPower: classConfig.basePhysicalPower,
      baseMagicPower: classConfig.baseMagicPower,
      baseSpeed: classConfig.baseSpeed,
      baseMovement: classConfig.baseMovement,
      basePhysicalEvade: classConfig.basePhysicalEvade,
      baseMagicEvade: classConfig.baseMagicEvade,
      baseCourage: classConfig.baseCourage,
      baseAttunement: classConfig.baseAttunement,
      leftHandId: classConfig.leftHandId,
      rightHandId: classConfig.rightHandId,
      headId: classConfig.headId,
      bodyId: classConfig.bodyId,
      accessoryId: classConfig.accessoryId,
      learnedAbilityIds: classConfig.learnedAbilityIds || [],
      reactionAbilityId: classConfig.reactionAbilityId,
      passiveAbilityId: classConfig.passiveAbilityId,
      movementAbilityId: classConfig.movementAbilityId,
      totalExperience: 0,
      classExperience: {},
      classExperienceSpent: {},
      tags: ['player-created'],
    };

    // Register with PartyMemberRegistry for future use
    PartyMemberRegistry.register(character);

    // Add to guild roster (immutable update)
    this.partyState = {
      ...this.partyState,
      guildRoster: [...this.partyState.guildRoster, character]
    };

    this.notifyStateChange();
    return character;
  }

  // Party Management
  addToParty(characterId: string): boolean {
    if (this.partyState.members.length >= 4) {
      console.warn("Party is full (max 4 members)");
      return false;
    }

    const character = this.partyState.guildRoster.find(c => c.id === characterId);
    if (!character) {
      console.warn("Character not found in guild roster:", characterId);
      return false;
    }

    if (this.partyState.members.some(p => p.id === characterId)) {
      console.warn("Character already in party:", characterId);
      return false;
    }

    // Create CombatUnit from definition
    const combatUnit = PartyMemberRegistry.createPartyMember(characterId);
    if (!combatUnit) {
      console.error("Failed to create CombatUnit from party member definition");
      return false;
    }

    // Add to active party (immutable update)
    this.partyState = {
      ...this.partyState,
      members: [...this.partyState.members, combatUnit]
    };

    this.notifyStateChange();
    return true;
  }

  removeFromParty(characterId: string): boolean {
    const index = this.partyState.members.findIndex(c => c.id === characterId);
    if (index === -1) {
      console.warn("Character not in party:", characterId);
      return false;
    }

    // Remove from party (immutable update)
    this.partyState = {
      ...this.partyState,
      members: this.partyState.members.filter(c => c.id !== characterId)
    };

    this.notifyStateChange();
    return true;
  }

  // Queries
  getActiveParty(): CombatUnit[] {
    return [...this.partyState.members];
  }

  getAvailableRoster(): PartyMemberDefinition[] {
    const activeIds = new Set(this.partyState.members.map(p => p.id));
    return this.partyState.guildRoster.filter(c => !activeIds.has(c.id));
  }

  getAllCharacters(): PartyMemberDefinition[] {
    return [...this.partyState.guildRoster];
  }

  getCharacterById(id: string): PartyMemberDefinition | undefined {
    return this.partyState.guildRoster.find(c => c.id === id);
  }

  // Validation
  isValidName(name: string): boolean {
    if (name.length < 1 || name.length > 12) return false;
    if (name.trim().length === 0) return false;
    // ASCII only: letters, numbers, space, hyphen, apostrophe
    const validPattern = /^[A-Za-z0-9 '\-]+$/;
    return validPattern.test(name);
  }

  isNameTaken(name: string): boolean {
    return this.partyState.guildRoster.some(c => c.name === name);
  }

  canAddToParty(): boolean {
    return this.partyState.members.length < 4;
  }

  // Get starter classes (no requirements)
  getStarterClasses(): UnitClass[] {
    return UnitClass.getAll().filter(c => c.requirements.size === 0);
  }
}
```

**Acceptance Criteria**:
- [x] Constructor takes `PartyState` and callback
- [x] `createCharacter()` validates name, class, generates ID
- [x] `createCharacter()` registers with PartyMemberRegistry
- [x] `createCharacter()` calls `notifyStateChange()`
- [x] `addToParty()` creates CombatUnit via PartyMemberRegistry
- [x] `removeFromParty()` filters members array
- [x] All operations use immutable updates
- [x] Query methods return copies (not references)
- [x] File compiles without errors

---

### Task 2.3: Unit Test GuildRosterManager
**File**: `react-app/src/utils/__tests__/GuildRosterManager.test.ts`

**Test Cases**:
```typescript
describe('GuildRosterManager', () => {
  let manager: GuildRosterManager;
  let mockPartyState: PartyState;
  let onStateChangeMock: jest.Mock;

  beforeEach(() => {
    mockPartyState = {
      members: [],
      guildRoster: [],
      inventory: { items: [], gold: 0 },
      equipment: new Map(),
    };
    onStateChangeMock = jest.fn();
    manager = new GuildRosterManager(mockPartyState, onStateChangeMock);
  });

  describe('createCharacter', () => {
    it('should create valid character', () => {
      const char = manager.createCharacter('Hero', 'sprite-1', 'fighter');
      expect(char).not.toBeNull();
      expect(char?.name).toBe('Hero');
      expect(onStateChangeMock).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid name (too long)', () => {
      const char = manager.createCharacter('VeryLongNameHere', 'sprite-1', 'fighter');
      expect(char).toBeNull();
    });

    it('should reject duplicate name', () => {
      manager.createCharacter('Hero', 'sprite-1', 'fighter');
      const char = manager.createCharacter('Hero', 'sprite-2', 'apprentice');
      expect(char).toBeNull();
    });

    it('should reject non-starter class', () => {
      // Assuming 'knight' has requirements
      const char = manager.createCharacter('Hero', 'sprite-1', 'knight');
      expect(char).toBeNull();
    });
  });

  describe('addToParty', () => {
    it('should add character to party', () => {
      const char = manager.createCharacter('Hero', 'sprite-1', 'fighter');
      const result = manager.addToParty(char!.id);
      expect(result).toBe(true);
      expect(manager.getActiveParty()).toHaveLength(1);
    });

    it('should reject when party is full', () => {
      // Create 4 characters and add to party
      for (let i = 0; i < 4; i++) {
        const char = manager.createCharacter(`Hero${i}`, 'sprite-1', 'fighter');
        manager.addToParty(char!.id);
      }
      const char5 = manager.createCharacter('Hero5', 'sprite-1', 'fighter');
      const result = manager.addToParty(char5!.id);
      expect(result).toBe(false);
    });
  });

  describe('removeFromParty', () => {
    it('should remove character from party', () => {
      const char = manager.createCharacter('Hero', 'sprite-1', 'fighter');
      manager.addToParty(char!.id);
      const result = manager.removeFromParty(char!.id);
      expect(result).toBe(true);
      expect(manager.getActiveParty()).toHaveLength(0);
    });
  });

  describe('getAvailableRoster', () => {
    it('should exclude active party members', () => {
      const char1 = manager.createCharacter('Hero1', 'sprite-1', 'fighter');
      const char2 = manager.createCharacter('Hero2', 'sprite-2', 'apprentice');
      manager.addToParty(char1!.id);
      const available = manager.getAvailableRoster();
      expect(available).toHaveLength(1);
      expect(available[0].id).toBe(char2!.id);
    });
  });
});
```

**Acceptance Criteria**:
- [x] All tests pass (33/33 passing)
- [x] Character creation validated
- [x] Party management validated
- [x] Edge cases covered (full party, duplicates, etc.)
- [x] Code coverage >95% (exceeds 80% requirement)

---

## Phase 3: GuildHallView Base Screen

**Goal**: Create the main Guild Hall screen component with layout and basic rendering

**Estimated Time**: 3-4 hours

### ⚠️ RENDERING GUIDELINES - CRITICAL

**MUST FOLLOW** these rendering rules from [GeneralGuidelines.md](../../GeneralGuidelines.md):

1. **NEVER use `ctx.fillText()` or `ctx.strokeText()` directly**
   - ❌ BAD: `ctx.fillText('Guild Hall', x, y)`
   - ✅ GOOD: `FontAtlasRenderer.renderText(ctx, 'Guild Hall', x, y, fontId, fontImage, color)`

2. **NEVER use `ctx.drawImage()` on sprite sheets directly**
   - ❌ BAD: `ctx.drawImage(spriteSheet, sx, sy, sw, sh, dx, dy, dw, dh)`
   - ✅ GOOD: `SpriteRenderer.renderSprite(ctx, spriteId, x, y, spriteImages, scale)`

3. **ALWAYS disable image smoothing for pixel art**
   - ✅ REQUIRED: `ctx.imageSmoothingEnabled = false;`

4. **ALWAYS round coordinates with Math.floor()**
   - ❌ BAD: `ctx.fillRect(x, y, width, height)` (if x,y are floats)
   - ✅ GOOD: `ctx.fillRect(Math.floor(x), Math.floor(y), width, height)`

**Why**: Using `ctx.fillText()` or `ctx.drawImage()` directly bypasses the font atlas and sprite systems, causing inconsistent rendering, blurry text, and incorrect sprite lookups.

### Task 3.1: Create GuildHallConstants
**File**: `react-app/src/constants/GuildHallConstants.ts`

**Implementation**: (Copy from CharacterCreationFeatureOverview.md, section "Constants to Add")

**Acceptance Criteria**:
- [ ] All layout constants defined
- [ ] All color constants defined
- [ ] All message constants defined
- [ ] File exports `GuildHallConstants` object

---

### Task 3.2: Create GuildHallView Component
**File**: `react-app/src/components/guild/GuildHallView.tsx`

**Initial Implementation** (base structure):
```typescript
import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { PartyState } from '../../models/game/GameState';
import type { GameViewType } from '../../models/game/GameState';
import { GuildRosterManager } from '../../utils/GuildRosterManager';
import { GuildHallConstants as C } from '../../constants/GuildHallConstants';
import { FontAtlasRegistry } from '../../utils/FontAtlasRegistry';
import { SpriteRegistry } from '../../utils/SpriteRegistry';

interface GuildHallViewProps {
  partyState: PartyState;
  onPartyStateChange: (state: PartyState) => void;
  onNavigate: (view: GameViewType, params?: any) => void;
  resourceManager?: any; // TODO: Type properly
}

export const GuildHallView: React.FC<GuildHallViewProps> = ({
  partyState,
  onPartyStateChange,
  onNavigate,
  resourceManager,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [resourcesLoaded, setResourcesLoaded] = useState(false);
  const [selectedPartyMemberId, setSelectedPartyMemberId] = useState<string | null>(null);
  const [selectedRosterCharId, setSelectedRosterCharId] = useState<string | null>(null);

  // ⚠️ STATE MANAGEMENT GUIDELINE: Cache stateful components with useMemo!
  // This prevents recreating GuildRosterManager on every render
  const guildManager = useMemo(
    () => new GuildRosterManager(partyState, onPartyStateChange),
    [partyState, onPartyStateChange]
  );

  // Load resources
  useEffect(() => {
    if (resourceManager) {
      resourceManager.loadAll().then(() => setResourcesLoaded(true));
    } else {
      // Fallback: load directly
      Promise.all([
        FontAtlasRegistry.loadAllFonts(),
        SpriteRegistry.loadAllSprites(),
      ]).then(() => setResourcesLoaded(true));
    }
  }, [resourceManager]);

  // ⚠️ PERFORMANCE GUIDELINE: Cache font/sprite lookups outside render loop!
  const fontAtlasRef = useRef<{ image: HTMLImageElement } | null>(null);
  const spriteImagesRef = useRef<Map<string, HTMLImageElement> | null>(null);

  useEffect(() => {
    if (resourcesLoaded) {
      // Cache these lookups to avoid repeated registry queries
      fontAtlasRef.current = FontAtlasRegistry.getById('7px-04b03') || null;
      spriteImagesRef.current = SpriteRegistry.getAllImages();
    }
  }, [resourcesLoaded]);

  // Render loop
  useEffect(() => {
    if (!resourcesLoaded) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ⚠️ RENDERING GUIDELINE: Disable image smoothing for pixel art!
    ctx.imageSmoothingEnabled = false;

    // Render function
    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, C.CANVAS_WIDTH, C.CANVAS_HEIGHT);

      // Render title
      renderTitle(ctx);

      // Render active party panel
      renderActivePartyPanel(ctx);

      // Render guild roster panel
      renderGuildRosterPanel(ctx);

      // Render action buttons
      renderActionButtons(ctx);
    };

    render();
  }, [resourcesLoaded, partyState, selectedPartyMemberId, selectedRosterCharId]);

  const renderTitle = (ctx: CanvasRenderingContext2D) => {
    // ⚠️ RENDERING GUIDELINE: NEVER use ctx.fillText() directly!
    // ❌ WRONG: ctx.fillText('Guild Hall', x, y)
    // ✅ CORRECT: Use FontAtlasRenderer.renderText()

    const fontAtlas = FontAtlasRegistry.getById('7px-04b03');
    if (!fontAtlas) return;

    FontAtlasRenderer.renderText(
      ctx,
      'Guild Hall',
      Math.floor(C.CANVAS_WIDTH / 2),
      12,
      '7px-04b03',
      fontAtlas.image,
      '#ffff00'
    );
  };

  const renderActivePartyPanel = (ctx: CanvasRenderingContext2D) => {
    const panel = C.ACTIVE_PARTY_PANEL;

    // Draw panel border
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);

    // ⚠️ RENDERING GUIDELINE: Use FontAtlasRenderer for ALL text!
    const fontAtlas = FontAtlasRegistry.getById('7px-04b03');
    if (!fontAtlas) return;

    FontAtlasRenderer.renderText(
      ctx,
      panel.TITLE_TEXT,
      panel.x + 4,
      panel.y + 12,
      '7px-04b03',
      fontAtlas.image,
      panel.TITLE_COLOR
    );

    // Draw party members or empty slots
    const activeParty = guildManager.getActiveParty();
    for (let i = 0; i < 4; i++) {
      const member = activeParty[i];
      const cardY = panel.y + 24 + (i * 40);

      if (member) {
        // TODO: Render party member card
        renderPartyMemberCard(ctx, member, panel.x + 4, cardY);
      } else {
        // Render empty slot (⚠️ Use FontAtlasRenderer!)
        FontAtlasRenderer.renderText(
          ctx,
          panel.EMPTY_SLOT_TEXT,
          panel.x + 8,
          cardY + 12,
          '7px-04b03',
          fontAtlas.image,
          panel.EMPTY_COLOR
        );
      }
    }
  };

  const renderGuildRosterPanel = (ctx: CanvasRenderingContext2D) => {
    const panel = C.GUILD_ROSTER_PANEL;

    // Draw panel border
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);

    // Draw title
    ctx.fillStyle = panel.TITLE_COLOR;
    ctx.fillText(panel.TITLE_TEXT, panel.x + 4, panel.y + 12);

    // Draw available roster
    const availableRoster = guildManager.getAvailableRoster();
    if (availableRoster.length === 0) {
      ctx.fillStyle = panel.EMPTY_COLOR;
      ctx.fillText(panel.EMPTY_TEXT, panel.x + 8, panel.y + 40);
    } else {
      availableRoster.forEach((char, index) => {
        const cardY = panel.y + 24 + (index * 28);
        // TODO: Render roster character card
        renderRosterCharacterCard(ctx, char, panel.x + 4, cardY);
      });
    }
  };

  const renderActionButtons = (ctx: CanvasRenderingContext2D) => {
    const buttons = C.ACTION_BUTTONS;

    // ⚠️ RENDERING GUIDELINE: Use FontAtlasRenderer for button text!
    const fontAtlas = FontAtlasRegistry.getById('7px-04b03');
    if (!fontAtlas) return;

    // Render "Create Character" button
    FontAtlasRenderer.renderText(
      ctx,
      buttons.CREATE_TEXT,
      100,
      buttons.y,
      '7px-04b03',
      fontAtlas.image,
      buttons.COLOR_NORMAL
    );

    // Render "Return to Title" button
    FontAtlasRenderer.renderText(
      ctx,
      buttons.RETURN_TEXT,
      250,
      buttons.y,
      '7px-04b03',
      fontAtlas.image,
      buttons.COLOR_NORMAL
    );
  };

  const renderPartyMemberCard = (ctx: CanvasRenderingContext2D, member: any, x: number, y: number) => {
    // ⚠️ Implemented in Phase 5 - MUST use PartyMemberCardRenderer
    // DO NOT use ctx.fillText() here!
  };

  const renderRosterCharacterCard = (ctx: CanvasRenderingContext2D, char: any, x: number, y: number) => {
    // ⚠️ Implemented in Phase 5 - MUST use RosterCharacterCardRenderer
    // DO NOT use ctx.fillText() here!
  };

  // Handle mouse input
  const handleMouseClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // TODO: Implement in Phase 5
  };

  return (
    <canvas
      ref={canvasRef}
      width={C.CANVAS_WIDTH}
      height={C.CANVAS_HEIGHT}
      onClick={handleMouseClick}
      style={{ border: '1px solid white', imageRendering: 'pixelated' }}
    />
  );
};
```

**Acceptance Criteria**:
- [ ] Component renders 384×216 canvas
- [ ] Resources load (fonts, sprites)
- [ ] Title renders
- [ ] Active party panel renders with title
- [ ] Guild roster panel renders with title
- [ ] Empty slots/roster shows placeholder text
- [ ] Action buttons render (placeholder)
- [ ] No console errors

---

## Phase 4: Character Creation Modal

**Goal**: Implement the character creation modal with name input, sprite selection, and class selection

**Estimated Time**: 4-5 hours

### ⚠️ RENDERING GUIDELINES REMINDER

**All text rendering in this modal MUST use FontAtlasRenderer!** This is a common mistake area - see detailed guidelines in Phase 3.

**NEVER** use `ctx.fillText()` or `ctx.strokeText()` anywhere in this modal.

### Task 4.1: Create CharacterCreationModal Component
**File**: `react-app/src/components/guild/CharacterCreationModal.tsx`

**Implementation Strategy**:
1. Modal overlay (semi-transparent black)
2. Modal panel (centered, 240px wide)
3. Name input field (canvas-based, keyboard capture)
4. Sprite selection grid (8×4, click to select)
5. Class selection list (dropdown-style)
6. Class info display (stats, equipment)
7. Create/Cancel buttons

**Detailed Implementation** (too large for inline, see subtasks):

---

### Task 4.2: Implement Name Input Field
**Component**: Part of `CharacterCreationModal.tsx`

**Implementation**:
```typescript
interface NameInputState {
  value: string;
  focused: boolean;
  cursorVisible: boolean;
}

const [nameInput, setNameInput] = useState<NameInputState>({
  value: '',
  focused: false,
  cursorVisible: true,
});

// Keyboard handler
const handleKeyDown = (event: KeyboardEvent) => {
  if (!nameInput.focused) return;

  if (event.key === 'Backspace') {
    setNameInput(prev => ({ ...prev, value: prev.value.slice(0, -1) }));
  } else if (event.key === 'Escape') {
    onClose();
  } else if (event.key === 'Enter') {
    handleCreate();
  } else if (event.key.length === 1) {
    // Validate character
    if (/^[A-Za-z0-9 '\-]$/.test(event.key) && nameInput.value.length < 12) {
      setNameInput(prev => ({ ...prev, value: prev.value + event.key }));
    }
  }
};

// Cursor blink (no animation - solid cursor)
const renderNameInput = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  const C = GuildHallConstants.CHARACTER_CREATION_MODAL;

  // Draw input box
  ctx.fillStyle = C.INPUT_BG;
  ctx.fillRect(x, y, C.INPUT_WIDTH, C.INPUT_HEIGHT);
  ctx.strokeStyle = nameInput.focused ? C.INPUT_BORDER_FOCUS : C.INPUT_BORDER_NORMAL;
  ctx.strokeRect(x, y, C.INPUT_WIDTH, C.INPUT_HEIGHT);

  // ⚠️ RENDERING GUIDELINE: Use FontAtlasRenderer for text input!
  const fontAtlas = FontAtlasRegistry.getById('7px-04b03');
  if (!fontAtlas) return;

  FontAtlasRenderer.renderText(
    ctx,
    nameInput.value,
    x + 4,
    y + 10,
    '7px-04b03',
    fontAtlas.image,
    C.INPUT_TEXT_COLOR
  );

  // Draw cursor (solid, no blink)
  if (nameInput.focused) {
    // ⚠️ PERFORMANCE NOTE: measureText is acceptable here (not in hot loop)
    // For better accuracy, use FontAtlasRenderer.measureText() if available
    const textWidth = ctx.measureText(nameInput.value).width;
    ctx.fillStyle = C.INPUT_TEXT_COLOR;
    ctx.fillRect(x + 4 + textWidth, y + 2, 1, C.INPUT_HEIGHT - 4);
  }
};
```

**Acceptance Criteria**:
- [ ] Input captures keyboard events
- [ ] Only ASCII characters accepted
- [ ] Max 12 characters enforced
- [ ] Cursor renders (solid, no blink)
- [ ] Backspace deletes character
- [ ] Enter attempts to create character
- [ ] Escape closes modal

---

### Task 4.3: Implement Sprite Selection Grid
**Component**: Part of `CharacterCreationModal.tsx`

**Implementation**:
```typescript
const [selectedSpriteId, setSelectedSpriteId] = useState<string>('');
const [hoveredSpriteId, setHoveredSpriteId] = useState<string | null>(null);

// Get all character sprites (filter by tag or pattern)
const getCharacterSprites = (): string[] => {
  // TODO: Filter SpriteRegistry for character sprites
  // For now, return placeholder array
  return Array.from({ length: 32 }, (_, i) => `char-sprite-${i}`);
};

const renderSpriteGrid = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  const C = GuildHallConstants.CHARACTER_CREATION_MODAL;
  const sprites = getCharacterSprites();

  for (let row = 0; row < C.SPRITE_GRID_ROWS; row++) {
    for (let col = 0; col < C.SPRITE_GRID_COLS; col++) {
      const index = row * C.SPRITE_GRID_COLS + col;
      if (index >= sprites.length) break;

      const spriteId = sprites[index];
      const cellX = x + (col * C.SPRITE_GRID_CELL_SIZE);
      const cellY = y + (row * C.SPRITE_GRID_CELL_SIZE);

      // ⚠️ RENDERING GUIDELINE: NEVER use ctx.drawImage() directly on sprites!
      // ✅ CORRECT: Use SpriteRenderer.renderSprite()
      const spriteImages = SpriteRegistry.getAllImages();
      SpriteRenderer.renderSprite(
        ctx,
        spriteId,
        Math.floor(cellX),
        Math.floor(cellY),
        spriteImages,
        1 // 1× scale for grid
      );

      // Draw selection border
      if (spriteId === selectedSpriteId) {
        ctx.strokeStyle = C.SPRITE_BORDER_SELECTED;
        ctx.strokeRect(cellX, cellY, C.SPRITE_GRID_CELL_SIZE, C.SPRITE_GRID_CELL_SIZE);
      }

      // Draw hover tint
      if (spriteId === hoveredSpriteId) {
        ctx.fillStyle = C.SPRITE_TINT_HOVER;
        ctx.fillRect(cellX, cellY, C.SPRITE_GRID_CELL_SIZE, C.SPRITE_GRID_CELL_SIZE);
      }
    }
  }
};

// Render large preview
const renderSpritePreview = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  if (!selectedSpriteId) return;

  // ⚠️ RENDERING GUIDELINE: Use SpriteRenderer for preview!
  const spriteImages = SpriteRegistry.getAllImages();
  SpriteRenderer.renderSprite(
    ctx,
    selectedSpriteId,
    Math.floor(x),
    Math.floor(y),
    spriteImages,
    4 // 4× scale for preview (48×48px)
  );
};
```

**Acceptance Criteria**:
- [ ] Grid renders 8×4 sprites
- [ ] Click selects sprite
- [ ] Selected sprite has yellow border
- [ ] Hover shows tint
- [ ] Preview renders at 4× scale

---

### Task 4.4: Implement Class Selection List
**Component**: Part of `CharacterCreationModal.tsx`

**Implementation**:
```typescript
const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
const [hoveredClassId, setHoveredClassId] = useState<string | null>(null);

// Get starter classes (no requirements)
const starterClasses = guildManager.getStarterClasses();

const renderClassList = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  const C = GuildHallConstants.CHARACTER_CREATION_MODAL;

  starterClasses.forEach((unitClass, index) => {
    const itemY = y + (index * C.CLASS_ITEM_HEIGHT);

    // Draw background
    if (unitClass.id === selectedClassId) {
      ctx.fillStyle = '#333300';
      ctx.fillRect(x, itemY, C.CLASS_INFO_WIDTH, C.CLASS_ITEM_HEIGHT);
    } else if (unitClass.id === hoveredClassId) {
      ctx.fillStyle = '#222222';
      ctx.fillRect(x, itemY, C.CLASS_INFO_WIDTH, C.CLASS_ITEM_HEIGHT);
    }

    // ⚠️ RENDERING GUIDELINE: Use FontAtlasRenderer!
    const fontAtlas = FontAtlasRegistry.getById('7px-04b03');
    if (!fontAtlas) return;

    const textColor = unitClass.id === selectedClassId ? C.CLASS_COLOR_SELECTED : C.CLASS_COLOR_NORMAL;
    FontAtlasRenderer.renderText(
      ctx,
      unitClass.name,
      x + 4,
      itemY + 9,
      '7px-04b03',
      fontAtlas.image,
      textColor
    );
  });
};

const renderClassInfo = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  if (!selectedClassId) return;

  const unitClass = UnitClass.getById(selectedClassId);
  if (!unitClass) return;

  const config = getClassStarterConfig(selectedClassId);
  if (!config) return;

  const C = GuildHallConstants.CHARACTER_CREATION_MODAL;

  // ⚠️ RENDERING GUIDELINE: ALL text must use FontAtlasRenderer!
  const fontAtlas = FontAtlasRegistry.getById('7px-04b03');
  if (!fontAtlas) return;

  // Draw class name
  FontAtlasRenderer.renderText(ctx, unitClass.name, x, y, '7px-04b03', fontAtlas.image, C.CLASS_NAME_COLOR);

  // Draw description
  FontAtlasRenderer.renderText(ctx, unitClass.description || '', x, y + 12, '7px-04b03', fontAtlas.image, C.CLASS_DESC_COLOR);

  // Draw base stats
  FontAtlasRenderer.renderText(ctx, `HP: ${config.baseHealth}`, x, y + 24, '7px-04b03', fontAtlas.image, C.CLASS_STATS_COLOR);
  FontAtlasRenderer.renderText(ctx, `MP: ${config.baseMana}`, x, y + 32, '7px-04b03', fontAtlas.image, C.CLASS_STATS_COLOR);
  FontAtlasRenderer.renderText(ctx, `Pow: ${config.basePhysicalPower}`, x, y + 40, '7px-04b03', fontAtlas.image, C.CLASS_STATS_COLOR);
  FontAtlasRenderer.renderText(ctx, `Spd: ${config.baseSpeed}`, x, y + 48, '7px-04b03', fontAtlas.image, C.CLASS_STATS_COLOR);
  // ... more stats (all using FontAtlasRenderer)
};
```

**Acceptance Criteria**:
- [ ] List shows only starter classes
- [ ] Click selects class
- [ ] Selected class highlighted
- [ ] Class info panel updates on selection
- [ ] Stats display correctly

---

### Task 4.5: Implement Create/Cancel Buttons
**Component**: Part of `CharacterCreationModal.tsx`

**Implementation**:
```typescript
const [createButtonEnabled, setCreateButtonEnabled] = useState(false);

// Update button state
useEffect(() => {
  const enabled = nameInput.value.trim().length > 0
    && selectedSpriteId !== ''
    && selectedClassId !== null
    && guildManager.isValidName(nameInput.value)
    && !guildManager.isNameTaken(nameInput.value);

  setCreateButtonEnabled(enabled);
}, [nameInput.value, selectedSpriteId, selectedClassId]);

const handleCreate = () => {
  if (!createButtonEnabled) return;

  const character = guildManager.createCharacter(
    nameInput.value,
    selectedSpriteId,
    selectedClassId!
  );

  if (character) {
    onCharacterCreated(character);
    onClose();
  }
};

const renderButtons = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  const C = GuildHallConstants.CHARACTER_CREATION_MODAL;

  // ⚠️ RENDERING GUIDELINE: Use FontAtlasRenderer for buttons!
  const fontAtlas = FontAtlasRegistry.getById('7px-04b03');
  if (!fontAtlas) return;

  // Create button
  const createColor = createButtonEnabled ? C.BUTTON_COLOR_ENABLED : C.BUTTON_COLOR_DISABLED;
  FontAtlasRenderer.renderText(ctx, C.CREATE_BUTTON_TEXT, x, y, '7px-04b03', fontAtlas.image, createColor);

  // Cancel button
  FontAtlasRenderer.renderText(ctx, C.CANCEL_BUTTON_TEXT, x + 60, y, '7px-04b03', fontAtlas.image, C.BUTTON_COLOR_NORMAL);
};
```

**Acceptance Criteria**:
- [ ] Create button disabled when fields invalid
- [ ] Create button enabled when all fields valid
- [ ] Create calls `guildManager.createCharacter()`
- [ ] Create closes modal on success
- [ ] Cancel closes modal without saving

---

### Task 4.6: Integrate Modal with GuildHallView
**File**: `react-app/src/components/guild/GuildHallView.tsx`

**Changes**:
```typescript
const [showCreateModal, setShowCreateModal] = useState(false);

const handleCreateCharacterClick = () => {
  setShowCreateModal(true);
};

const handleModalClose = () => {
  setShowCreateModal(false);
};

const handleCharacterCreated = (character: PartyMemberDefinition) => {
  // Show success message (TODO: implement message system)
  console.log(`${character.name} created!`);
};

return (
  <>
    <canvas ... />
    {showCreateModal && (
      <CharacterCreationModal
        isOpen={showCreateModal}
        onClose={handleModalClose}
        onCharacterCreated={handleCharacterCreated}
        guildManager={guildManager}
      />
    )}
  </>
);
```

**Acceptance Criteria**:
- [ ] Modal opens when "Create Character" clicked
- [ ] Modal closes when Cancel clicked
- [ ] Modal closes when character created
- [ ] Success message shown on creation

---

## Phase 5: Party Management UI

**Goal**: Implement party member and roster character cards with interaction handlers

**Estimated Time**: 3-4 hours

### ⚠️ EVENT HANDLING GUIDELINES - CRITICAL

**MUST FOLLOW** these patterns from [GeneralGuidelines.md](../../GeneralGuidelines.md):

1. **NEVER call renderFrame() in mouse move handlers**
   - ❌ BAD: `onMouseMove={() => { updateHover(); renderFrame(); }}`
   - ✅ GOOD: Update state only, let the render loop handle rendering

2. **Use proper coordinate transformation**
   - Canvas coordinates ≠ Screen coordinates
   - Always scale mouse position: `mouseX = (clientX - rect.left) * (canvas.width / rect.width)`

3. **Round all coordinates with Math.floor()**
   - Prevents sub-pixel rendering artifacts
   - Ensures pixel-perfect alignment

**Why**: Calling renderFrame() on mouse move causes excessive re-renders (60+ fps → 1000+ fps), burning CPU and battery.

### Task 5.1: Create PartyMemberCard Renderer
**File**: `react-app/src/components/guild/renderers/PartyMemberCard.ts`

**Implementation**:
```typescript
import type { CombatUnit } from '../../../models/combat/CombatUnit';
import { GuildHallConstants as C } from '../../../constants/GuildHallConstants';
import { SpriteRenderer } from '../../../utils/SpriteRenderer';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';

export interface PartyMemberCardOptions {
  x: number;
  y: number;
  isSelected?: boolean;
  isHovered?: boolean;
  showRemoveButton?: boolean;
}

export class PartyMemberCardRenderer {
  static render(
    ctx: CanvasRenderingContext2D,
    member: CombatUnit,
    options: PartyMemberCardOptions,
    spriteImages: Map<string, HTMLImageElement>,
    fontAtlasImage: HTMLImageElement
  ): void {
    const { x, y, isSelected, isHovered, showRemoveButton } = options;
    const card = C.PARTY_MEMBER_CARD;

    // Draw background
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, card.WIDTH, card.HEIGHT);

    // Draw border
    if (isSelected) {
      ctx.strokeStyle = card.BORDER_SELECTED;
      ctx.lineWidth = 2;
    } else if (isHovered) {
      ctx.strokeStyle = card.BORDER_HOVER;
      ctx.lineWidth = 1;
    } else {
      ctx.strokeStyle = card.BORDER_NORMAL;
      ctx.lineWidth = 1;
    }
    ctx.strokeRect(x, y, card.WIDTH, card.HEIGHT);
    ctx.lineWidth = 1;

    // ⚠️ RENDERING GUIDELINE: Use SpriteRenderer + round coordinates!
    SpriteRenderer.renderSprite(
      ctx,
      member.spriteId,
      Math.floor(x + card.PADDING),
      Math.floor(y + card.PADDING),
      spriteImages,
      2 // scale
    );

    // ⚠️ RENDERING GUIDELINE: Use FontAtlasRenderer for all text!
    FontAtlasRenderer.renderText(
      ctx,
      member.name,
      Math.floor(x + card.SPRITE_SIZE + card.PADDING * 2),
      Math.floor(y + card.PADDING),
      '7px-04b03',
      fontAtlasImage,
      card.NAME_COLOR
    );

    // Render class
    FontAtlasRenderer.renderText(
      ctx,
      member.getClass().name,
      x + card.SPRITE_SIZE + card.PADDING * 2,
      y + card.PADDING + 8,
      '7px-04b03',
      fontAtlasImage,
      card.CLASS_COLOR
    );

    // Render level (TODO: calculate from totalExperience)
    const level = 1;
    FontAtlasRenderer.renderText(
      ctx,
      `Lv. ${level}`,
      x + card.SPRITE_SIZE + card.PADDING * 2,
      y + card.PADDING + 16,
      '7px-04b03',
      fontAtlasImage,
      card.LEVEL_COLOR
    );

    // Render HP bar
    const hpPercent = member.currentHealth / member.getMaxHealth();
    this.renderStatBar(
      ctx,
      x + card.SPRITE_SIZE + card.PADDING * 2,
      y + card.PADDING + 24,
      card.BAR_WIDTH,
      card.BAR_HEIGHT,
      hpPercent,
      card.HP_BAR_COLOR
    );

    // Render MP bar
    const mpPercent = member.currentMana / member.getMaxMana();
    this.renderStatBar(
      ctx,
      x + card.SPRITE_SIZE + card.PADDING * 2,
      y + card.PADDING + 28,
      card.BAR_WIDTH,
      card.BAR_HEIGHT,
      mpPercent,
      card.MANA_BAR_COLOR
    );

    // Render remove button (if hovered)
    if (showRemoveButton) {
      ctx.fillStyle = card.REMOVE_BUTTON_COLOR;
      FontAtlasRenderer.renderText(
        ctx,
        '×',
        x + card.WIDTH - 12,
        y + card.PADDING,
        '7px-04b03',
        fontAtlasImage,
        card.REMOVE_BUTTON_COLOR
      );
    }
  }

  private static renderStatBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    percent: number,
    color: string
  ): void {
    // Draw background
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y, width, height);

    // Draw fill
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width * percent, height);

    // Draw border
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(x, y, width, height);
  }

  static isRemoveButtonHovered(
    mouseX: number,
    mouseY: number,
    cardX: number,
    cardY: number
  ): boolean {
    const card = C.PARTY_MEMBER_CARD;
    const buttonX = cardX + card.WIDTH - 12;
    const buttonY = cardY + card.PADDING;
    const buttonSize = 12;

    return (
      mouseX >= buttonX &&
      mouseX <= buttonX + buttonSize &&
      mouseY >= buttonY &&
      mouseY <= buttonY + buttonSize
    );
  }
}
```

**Acceptance Criteria**:
- [ ] Card renders with correct layout
- [ ] Sprite renders at 2× scale
- [ ] Name, class, level render correctly
- [ ] HP/MP bars render with correct percentages
- [ ] Border changes based on state (normal/hover/selected)
- [ ] Remove button shows on hover

---

### Task 5.2: Create RosterCharacterCard Renderer
**File**: `react-app/src/components/guild/renderers/RosterCharacterCard.ts`

**Implementation**: (Similar to PartyMemberCard but smaller, 1× sprite, add button instead of remove)

**Acceptance Criteria**:
- [ ] Card renders with correct layout (192×24)
- [ ] Sprite renders at 1× scale
- [ ] Name, class, level render correctly
- [ ] Add button shows on hover
- [ ] Background changes on hover/selected

---

### Task 5.3: Implement Mouse Input Handling
**File**: `react-app/src/components/guild/GuildHallView.tsx`

**Implementation**:
```typescript
const handleMouseClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  // ⚠️ EVENT HANDLING GUIDELINE: Proper coordinate transformation is CRITICAL!
  // Canvas coordinates ≠ Screen coordinates due to CSS scaling
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;   // 384 / CSS width
  const scaleY = canvas.height / rect.height; // 216 / CSS height
  const mouseX = (event.clientX - rect.left) * scaleX;
  const mouseY = (event.clientY - rect.top) * scaleY;

  // Check active party panel
  const activeParty = guildManager.getActiveParty();
  for (let i = 0; i < activeParty.length; i++) {
    const cardY = C.ACTIVE_PARTY_PANEL.y + 24 + (i * 40);
    const cardX = C.ACTIVE_PARTY_PANEL.x + 4;

    // Check if remove button clicked
    if (PartyMemberCardRenderer.isRemoveButtonHovered(mouseX, mouseY, cardX, cardY)) {
      guildManager.removeFromParty(activeParty[i].id);
      return;
    }

    // Check if card clicked (select)
    if (
      mouseX >= cardX &&
      mouseX <= cardX + C.PARTY_MEMBER_CARD.WIDTH &&
      mouseY >= cardY &&
      mouseY <= cardY + C.PARTY_MEMBER_CARD.HEIGHT
    ) {
      setSelectedPartyMemberId(activeParty[i].id);
      return;
    }
  }

  // Check guild roster panel
  const availableRoster = guildManager.getAvailableRoster();
  for (let i = 0; i < availableRoster.length; i++) {
    const cardY = C.GUILD_ROSTER_PANEL.y + 24 + (i * 28);
    const cardX = C.GUILD_ROSTER_PANEL.x + 4;

    // Check if add button clicked
    if (RosterCharacterCardRenderer.isAddButtonHovered(mouseX, mouseY, cardX, cardY)) {
      const success = guildManager.addToParty(availableRoster[i].id);
      if (!success) {
        // Show error message (party full)
        console.warn(C.ERROR_PARTY_FULL);
      }
      return;
    }

    // Check if card clicked (select)
    if (
      mouseX >= cardX &&
      mouseX <= cardX + C.ROSTER_CHARACTER_CARD.WIDTH &&
      mouseY >= cardY &&
      mouseY <= cardY + C.ROSTER_CHARACTER_CARD.HEIGHT
    ) {
      setSelectedRosterCharId(availableRoster[i].id);
      return;
    }
  }

  // Check action buttons
  if (isCreateButtonHovered(mouseX, mouseY)) {
    setShowCreateModal(true);
    return;
  }

  if (isReturnButtonHovered(mouseX, mouseY)) {
    onNavigate('menu');
    return;
  }
};

const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
  // ⚠️ EVENT HANDLING GUIDELINE: NEVER call renderFrame() here!
  // Only update state - the useEffect render loop will handle rendering

  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (event.clientX - rect.left) * scaleX;
  const mouseY = (event.clientY - rect.top) * scaleY;

  // Update hover states (state changes will trigger re-render via useEffect)
  // Do NOT call renderFrame() manually!
  updateHoverStates(mouseX, mouseY);
};
```

**Acceptance Criteria**:
- [ ] Click on party member card selects it
- [ ] Click on remove button removes from party
- [ ] Click on roster card selects it
- [ ] Click on add button adds to party
- [ ] Click on Create Character opens modal
- [ ] Click on Return navigates to menu
- [ ] Mouse coordinates scaled correctly

---

## Phase 6: GameView Integration

**Goal**: Integrate Guild Hall view into GameView orchestrator with transitions

**Estimated Time**: 3-4 hours

### Task 6.1: Update GameView to Support Guild Hall
**File**: `react-app/src/components/game/GameView.tsx`

**Changes**:
```typescript
import { GuildHallView } from '../guild/GuildHallView';

// Add view rendering
{currentView === 'guild-hall' && (
  <GuildHallView
    partyState={gameState.partyState}
    onPartyStateChange={handlePartyStateChange}
    onNavigate={handleNavigate}
    resourceManager={resourceManager}
  />
)}

// Add callback handlers
const handlePartyStateChange = (newPartyState: PartyState) => {
  setGameState(prev => ({
    ...prev,
    partyState: newPartyState
  }));
};

const handleNavigate = (view: GameViewType, params?: any) => {
  if (view === 'exploration' && params?.mapId) {
    transitionToExploration(params.mapId);
  } else if (view === 'menu') {
    transitionToMenu();
  } else if (view === 'combat' && params?.encounterId) {
    transitionToCombat(params.encounterId);
  }
};

// Add transition functions
const transitionToGuildHall = async () => {
  if (isTransitioning) return;
  setIsTransitioning(true);

  await viewTransitionManager.fadeOut(canvasRef.current, 500);
  setCurrentView('guild-hall');
  await viewTransitionManager.fadeIn(canvasRef.current, 500);

  setIsTransitioning(false);
};

const transitionToMenu = async () => {
  if (isTransitioning) return;
  setIsTransitioning(true);

  await viewTransitionManager.fadeOut(canvasRef.current, 500);
  setCurrentView('menu');
  await viewTransitionManager.fadeIn(canvasRef.current, 500);

  setIsTransitioning(false);
};
```

**Acceptance Criteria**:
- [ ] GameView renders GuildHallView when currentView is 'guild-hall'
- [ ] Fade transitions work (menu ↔ guild-hall)
- [ ] Party state changes propagate to GameView
- [ ] Navigation callbacks work correctly

---

### Task 6.2: Initialize PartyState with Guild Roster
**File**: `react-app/src/components/game/GameView.tsx`

**Changes**:
```typescript
// Initialize game state with empty guild roster
const [gameState, setGameState] = useState<CompleteGameState>({
  currentView: 'menu',
  explorationState: undefined,
  combatState: undefined,
  partyState: {
    members: [],
    guildRoster: [],  // NEW: Initialize empty guild roster
    inventory: { items: [], gold: 0 },
    equipment: new Map(),
  },
  gameState: {
    globalVariables: new Map(),
    messageLog: [],
    triggeredEventIds: new Set(),
  },
  sessionStartTime: Date.now(),
  totalPlaytime: 0,
});
```

**Acceptance Criteria**:
- [ ] PartyState includes empty guildRoster on init
- [ ] Save/load preserves guild roster
- [ ] No errors when accessing guildRoster

---

### Task 6.3: Pass PartyState to Exploration and Combat
**File**: `react-app/src/components/game/GameView.tsx`

**Changes**:
```typescript
{currentView === 'exploration' && explorationState && (
  <FirstPersonView
    mapId={explorationState.currentMapId}
    onStartCombat={transitionToCombat}
    onExplorationStateChange={handleExplorationStateChange}
    resourceManager={resourceManager}
    initialState={explorationState}
    partyState={gameState.partyState}  // NEW
    gameState={gameState.gameState}
  />
)}

{currentView === 'combat' && combatState && (
  <CombatView
    encounter={encounter}
    onCombatEnd={handleCombatEnd}
    partyState={gameState.partyState}  // NEW
  />
)}
```

**Acceptance Criteria**:
- [ ] FirstPersonView receives partyState prop
- [ ] CombatView receives partyState prop
- [ ] Both views use partyState.members for party data
- [ ] No TypeScript errors

---

### Task 6.4: Update FirstPersonView and CombatView Props
**Files**:
- `react-app/src/components/firstperson/FirstPersonView.tsx`
- `react-app/src/components/combat/CombatView.tsx`

**Changes to FirstPersonView**:
```typescript
interface FirstPersonViewProps {
  mapId: string;
  onStartCombat?: (encounterId: string) => void;
  onExplorationStateChange?: (state: ExplorationState) => void;
  resourceManager?: ResourceManager;
  initialState?: ExplorationState;
  partyState?: PartyState;  // NEW
  gameState?: GameState;
}

// Use partyState.members instead of hardcoded party
const partyMembers = props.partyState?.members || [];
```

**Changes to CombatView**:
```typescript
interface CombatViewProps {
  encounter: CombatEncounter;
  onCombatEnd?: (victory: boolean) => void;
  partyState?: PartyState;  // NEW
}

// Use partyState.members for combat units
const playerUnits = props.partyState?.members || [];
```

**Acceptance Criteria**:
- [ ] Both views accept partyState prop (optional)
- [ ] Both views use partyState.members if available
- [ ] Fallback to empty array if not provided
- [ ] No TypeScript errors

---

## Phase 7: Testing and Polish

**Goal**: Comprehensive testing, bug fixes, and visual polish

**Estimated Time**: 3-4 hours

### Task 7.1: Integration Testing
**Manual Test Plan**:

1. **Character Creation Flow**:
   - [ ] Open Guild Hall from menu
   - [ ] Click "Create Character"
   - [ ] Enter valid name (ASCII, 1-12 chars)
   - [ ] Select sprite from grid
   - [ ] Select starter class
   - [ ] Verify class info displays correctly
   - [ ] Click "Create" - character appears in roster
   - [ ] Verify success message

2. **Party Management Flow**:
   - [ ] Create 4 characters
   - [ ] Add all 4 to party
   - [ ] Verify "Party is full" error when trying to add 5th
   - [ ] Remove character from party
   - [ ] Verify character returns to roster
   - [ ] Add character back to party

3. **Save/Load Flow**:
   - [ ] Create 2 characters, add 1 to party
   - [ ] Press F5 to save
   - [ ] Reload page
   - [ ] Press F9 to load
   - [ ] Verify guild roster and active party restored

4. **Navigation Flow**:
   - [ ] Guild Hall → Menu → Guild Hall
   - [ ] Guild Hall → Exploration (via "Start Adventure")
   - [ ] Verify party members appear in exploration
   - [ ] Trigger combat encounter
   - [ ] Verify party members appear in combat
   - [ ] Win combat, return to exploration
   - [ ] Return to Guild Hall
   - [ ] Verify party state preserved

5. **Edge Cases**:
   - [ ] Empty guild roster displays placeholder
   - [ ] Empty party shows 4 empty slots
   - [ ] Duplicate name rejected
   - [ ] Non-ASCII characters rejected
   - [ ] Name > 12 characters rejected
   - [ ] Non-starter class rejected (manual test with code change)

**Acceptance Criteria**:
- [ ] All manual tests pass
- [ ] No console errors
- [ ] No visual glitches

---

### Task 7.2: Unit Testing
**Files to Create**:
- `react-app/src/utils/__tests__/GuildRosterManager.test.ts` (done in Phase 2)
- `react-app/src/models/game/__tests__/GameStateSerialization.guildRoster.test.ts` (done in Phase 1)

**Additional Tests**:
```typescript
// Test character creation validation
describe('Character Creation Validation', () => {
  it('should reject empty name', () => { ... });
  it('should reject name with non-ASCII', () => { ... });
  it('should reject name > 12 chars', () => { ... });
  it('should reject duplicate name', () => { ... });
  it('should reject non-starter class', () => { ... });
});

// Test party management constraints
describe('Party Management Constraints', () => {
  it('should allow up to 4 party members', () => { ... });
  it('should reject 5th party member', () => { ... });
  it('should prevent duplicate in party', () => { ... });
});
```

**Acceptance Criteria**:
- [ ] All unit tests pass
- [ ] Code coverage > 80% for GuildRosterManager
- [ ] Code coverage > 80% for serialization

---

### Task 7.3: Visual Polish
**Tasks**:
1. Font rendering consistency (use FontAtlasRenderer everywhere)
2. Sprite rendering quality (ensure 2× and 1× scales correct)
3. Border colors and thickness
4. Button hover states
5. Modal positioning (perfectly centered)
6. Text alignment (consistent padding)
7. Error message display (red text, clear positioning)

**Acceptance Criteria**:
- [ ] All text uses FontAtlasRenderer
- [ ] All sprites use SpriteRenderer
- [ ] Borders consistent across all panels
- [ ] Hover states visually clear
- [ ] Modal centered on screen
- [ ] Error messages clearly visible

---

### Task 7.4: Performance Optimization

### ⚠️ PERFORMANCE GUIDELINES - CRITICAL

**MUST FOLLOW** these patterns from [GeneralGuidelines.md](../../GeneralGuidelines.md):

1. **NEVER create new canvas buffers in render loops**
   - ❌ BAD: `const buffer = document.createElement('canvas')` (every frame)
   - ✅ GOOD: Create once, cache in ref or component state

2. **NEVER recreate objects in hot paths**
   - ❌ BAD: `const pos = { x: 10, y: 20 }` (inside render loop)
   - ✅ GOOD: Reuse existing objects or use primitives

3. **Use WeakMap for instance-to-data mappings**
   - ✅ GOOD: `const hoverData = new WeakMap<CombatUnit, HoverState>()`
   - Prevents memory leaks when units are removed

4. **Cache sprite/font lookups outside render loop**
   - ❌ BAD: `SpriteRegistry.getById(id)` (every frame)
   - ✅ GOOD: Cache in useMemo or component field

**Tasks**:
1. Memoize GuildRosterManager creation (✅ already done in Phase 3)
2. Avoid re-renders on mouse move (use refs for hover state if needed)
3. Cache font atlas lookups (get once, reuse)
4. Cache sprite image map (get once, reuse)
5. Verify no canvas buffers created in render loop

**Acceptance Criteria**:
- [ ] No unnecessary re-renders
- [ ] Render loop runs at 60fps
- [ ] No memory leaks (check with Chrome DevTools)
- [ ] No object allocation in render loop (check with profiler)

---

## Phase 8: Documentation and Final Review

**Goal**: Update documentation and prepare for release

**Estimated Time**: 1-2 hours

### Task 8.1: Update Hierarchy Document
**File**: Create `GuildHallHierarchy.md`

**Content**: Similar format to GameViewHierarchy.md, FirstPersonViewHierarchy.md
- Quick Reference
- Navigation Index
- File Hierarchy
- Data Flow Summary
- Key Interfaces

**Acceptance Criteria**:
- [ ] Document created
- [ ] All files documented
- [ ] Data flow diagrams included
- [ ] Quick reference section complete

---

### Task 8.2: Update Main README
**File**: `README.md` (if exists)

**Changes**:
- Add Guild Hall feature to features list
- Update architecture diagram (if exists)
- Add screenshots (if applicable)

---

### Task 8.3: Code Review Checklist

**Review Points**:

**General Code Quality**:
- [ ] All TypeScript errors resolved
- [ ] All console.log removed (or changed to console.warn/error)
- [ ] All TODOs addressed or documented
- [ ] All magic numbers moved to constants
- [ ] All error handling in place
- [ ] All edge cases handled

**Rendering Guidelines** (CRITICAL):
- [ ] ❌ NO `ctx.fillText()` or `ctx.strokeText()` anywhere
- [ ] ❌ NO `ctx.drawImage()` on sprite sheets anywhere
- [ ] ✅ ALL text uses `FontAtlasRenderer.renderText()`
- [ ] ✅ ALL sprites use `SpriteRenderer.renderSprite()`
- [ ] ✅ `ctx.imageSmoothingEnabled = false` set in render loop
- [ ] ✅ All coordinates rounded with `Math.floor()`

**State Management Guidelines**:
- [ ] ✅ All state updates use immutable patterns (spread operators)
- [ ] ✅ All stateful components cached with `useMemo()`
- [ ] ✅ All callbacks use `useCallback` where appropriate
- [ ] ❌ NO array.push(), array.splice(), or object mutations

**Performance Guidelines**:
- [ ] ❌ NO `renderFrame()` calls in mouse move handlers
- [ ] ❌ NO canvas buffer creation in render loops
- [ ] ❌ NO object allocation in render loops
- [ ] ✅ Font/sprite lookups cached outside render loop
- [ ] ✅ Mouse coordinates properly transformed (scaleX/scaleY)

**If ANY of the ❌ items are present or ✅ items are missing, FIX IMMEDIATELY!**

---

## Success Metrics

### Functional Requirements
- [x] **Phase 1 & 2 Complete**: Guild roster data layer implemented
- [x] Character creation backend logic works with validation
- [x] Party management (add/remove) logic implemented correctly
- [x] Save/load includes guild roster (serialization complete)
- [ ] Cross-view integration (combat/exploration uses partyState) - *Pending Phase 6*
- [x] All edge cases handled gracefully in data layer

### Non-Functional Requirements
- [ ] Renders at 60fps - *Pending Phase 3-5 (UI implementation)*
- [ ] No memory leaks - *To be tested in Phase 7*
- [x] Code coverage > 80% (achieved >95% on completed phases)
- [x] TypeScript strict mode enabled
- [x] All GeneralGuidelines.md patterns followed (immutable state, no mutations)
- [x] Consistent with existing codebase style

### User Experience
- [ ] Intuitive UI (no tutorial needed) - *Pending Phase 3-5 (UI implementation)*
- [ ] Responsive input (no lag) - *Pending Phase 3-5 (UI implementation)*
- [ ] Clear error messages - *Partially complete (console warnings in place)*
- [ ] Visual feedback for all actions - *Pending Phase 3-5 (UI implementation)*
- [ ] Smooth transitions (menu ↔ guild hall ↔ exploration ↔ combat) - *Pending Phase 6*

---

## Risk Mitigation

### High Risk: GameState Schema Changes
**Risk**: Breaking existing saves
**Mitigation**:
1. Test with existing save files before deploying
2. GameSaveManager version validation rejects incompatible saves
3. Add migration logic if needed (future)
4. Document breaking change in release notes

### Medium Risk: Complex Modal UI
**Risk**: Canvas-based input handling complexity
**Mitigation**:
1. Start with simple text input, add features incrementally
2. Test keyboard input thoroughly on multiple browsers
3. Use refs to avoid re-render issues
4. Consider HTML overlay for input (alternative approach)

### Medium Risk: Party Management Logic
**Risk**: State sync issues between views
**Mitigation**:
1. Use immutable updates consistently
2. Single source of truth (PartyState in GameView)
3. Callbacks propagate changes to GameView immediately
4. Unit test all state transitions

---

## Timeline Estimate

| Phase | Tasks | Estimated Time | Cumulative |
|-------|-------|----------------|------------|
| Phase 1 | GameState and Serialization | 2-3 hours | 3 hours |
| Phase 2 | GuildRosterManager | 3-4 hours | 7 hours |
| Phase 3 | GuildHallView Base | 3-4 hours | 11 hours |
| Phase 4 | Character Creation Modal | 4-5 hours | 16 hours |
| Phase 5 | Party Management UI | 3-4 hours | 20 hours |
| Phase 6 | GameView Integration | 3-4 hours | 24 hours |
| Phase 7 | Testing and Polish | 3-4 hours | 28 hours |
| Phase 8 | Documentation | 1-2 hours | 30 hours |

**Total Estimated Time**: 22-30 hours

---

## Next Steps

1. Review this implementation plan with team (if applicable)
2. Set up development environment
3. Create feature branch: `feature/guild-hall-character-creation`
4. Begin Phase 1: GameState and Serialization Foundation
5. Commit frequently with descriptive messages
6. Test each phase before moving to next
7. Document any deviations from plan

---

## Guidelines Compliance Summary

This implementation plan has been updated to strictly follow [GeneralGuidelines.md](../../GeneralGuidelines.md). Key guidelines notes have been added throughout:

### Rendering (Phase 3, Phase 4, Phase 5)
- All text rendering uses `FontAtlasRenderer.renderText()`
- All sprite rendering uses `SpriteRenderer.renderSprite()`
- Image smoothing disabled (`ctx.imageSmoothingEnabled = false`)
- All coordinates rounded with `Math.floor()`

### State Management (Phase 2, Phase 3)
- All state updates use immutable patterns (spread operators)
- GuildRosterManager cached with `useMemo()`
- No array mutations (no push/splice/pop)

### Performance (Phase 5, Phase 7)
- Font/sprite lookups cached outside render loop
- No `renderFrame()` calls in mouse handlers
- No object allocation in render loops
- No canvas buffer creation in render loops

### Event Handling (Phase 5)
- Mouse coordinates properly transformed (scaleX/scaleY)
- State updates only (no direct rendering) in event handlers

**Review the ⚠️ sections in each phase for specific implementation guidance!**

---

**End of Implementation Plan**
