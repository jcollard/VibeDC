# Ability System - Design Overview

**Version:** 1.1
**Created:** 2025-11-01
**Updated:** 2025-11-01 (Corrected slot system and HumanoidUnit implementation status)
**Related:** [CombatHierarchy.md](../../CombatHierarchy.md), [ability-database.yaml](../../react-app/src/data/ability-database.yaml), [HumanoidUnit.ts](../../react-app/src/models/combat/HumanoidUnit.ts)

## Purpose

This document describes the comprehensive ability system for combat units. The system supports four distinct ability types (Action, Passive, Movement, Reaction) that can be configured via YAML and executed during combat through parameterized functions and classes.

## Feature Summary

The Ability System provides:
- **Four Ability Types**: Action, Passive, Movement, and Reaction abilities
- **Learn Once, Use Anywhere**: Abilities learned from one class can be used when playing as any class
- **Slot-Based Assignment**: Passive, Reaction, and Movement abilities must be assigned to slots (one active at a time)
- **All Actions Available**: All learned Action abilities are available in combat simultaneously
- **YAML Configuration**: All abilities defined in `ability-database.yaml` for data-driven design
- **Parameterized Execution**: Runtime execution through configurable effect handlers
- **Class-Based Learning**: Abilities tied to classes (Fighter, Rogue, Apprentice, etc.)
- **Experience Economy**: Abilities purchased with class-specific experience points
- **Tag System**: Flexible categorization (physical, magic, healing, damage, etc.)
- **Effect Composition**: Complex abilities built from simple, reusable effect components

## Core Ability Types

### Action Abilities
**Trigger**: Explicitly chosen during a unit's turn in combat
**Execution**: Replaces or augments the standard Attack action
**Slot System**: **NO SLOTS** - All learned Action abilities are available simultaneously in combat
**Examples**:
- **Charge** - Attack + movement (rush forward and strike)
- **Heal** - Magical healing to restore HP
- **Fireball** - Ranged magical attack with mana cost
- **Strength** - Buff that increases Physical Power
- **Slow** - Debuff that reduces Speed

**Key Properties**:
- All learned actions available in combat menu
- Can consume mana
- Can target self, allies, or enemies
- Can have range requirements
- Can have equipment requirements (e.g., shield for Bash)
- May modify movement or attack actions

### Passive Abilities
**Trigger**: Active when assigned to the Passive Ability slot
**Execution**: Continuous effect or stat modification
**Slot System**: **ONE SLOT** - Only one passive ability can be active at a time
**Examples**:
- **Meat Shield** - Increases max HP by 50
- **Dual Wield** - Allows two one-handed weapons
- **Heavy Armor** - Allows heavy armor regardless of class
- **Dodge** - Increases Physical Evasion
- **Fast** - Increases Speed by 3

**Key Properties**:
- Must be assigned to passive slot to be active
- Can swap passive abilities outside of combat
- No activation cost once assigned
- Can grant stat bonuses
- Can remove equipment restrictions
- Can modify damage calculations
- **Cross-class usage**: Can use passive learned from Fighter while playing as Rogue

### Reaction Abilities
**Trigger**: Automatically when specific condition met (e.g., taking damage)
**Execution**: Immediate response to trigger event
**Slot System**: **ONE SLOT** - Only one reaction ability can be active at a time
**Examples**:
- **Repost** - Counter-attack after being attacked
- **Slippery** - Gain Haste after taking damage
- **Disappear** - Teleport away after being attacked
- **Quick Shield** - Cast Minor Shield before taking damage

**Key Properties**:
- Must be assigned to reaction slot to be active
- Automatic activation when assigned and triggered
- Triggered by specific events
- Can consume resources (mana, items)
- Only one reaction active (no stacking multiple reactions)
- Execution order matters (before damage vs after damage)
- **Cross-class usage**: Can use reaction learned from Rogue while playing as Fighter

### Movement Abilities
**Trigger**: After moving OR choosing not to move during turn
**Execution**: Bonus effect based on movement decision
**Slot System**: **ONE SLOT** - Only one movement ability can be active at a time
**Examples**:
- **Meditate** - Gain 10% mana if you don't move
- **Regenerate** - Gain 3 HP per tile traveled
- **Journeyman** - Gain 1 XP per tile traveled
- **Power Walker** - Increase Physical Power by 2 after moving

**Key Properties**:
- Must be assigned to movement slot to be active
- Triggers after movement phase (automatic when conditions met)
- Can reward movement or staying still
- Only one movement ability active (no stacking)
- **Cross-class usage**: Can use movement ability learned from Apprentice while playing as Fighter

## Learning and Assignment System

### Learning Abilities
- **Class-Based Learning**: Abilities are learned from specific classes (Fighter, Rogue, Apprentice)
- **Experience Cost**: Each ability costs class-specific experience points (XP)
- **Permanent Ownership**: Once learned, an ability is permanently owned
- **Cross-Class Flexibility**: Learned abilities can be used even when playing as a different class

**Example**: A character learns "Repost" as a Rogue (costs Rogue XP). Later, they switch to Fighter class. They can still assign and use "Repost" because it was learned.

### Ability Slots

Units have **three ability slots** for non-Action abilities:

1. **Passive Slot** - One passive ability active at a time
2. **Reaction Slot** - One reaction ability active at a time
3. **Movement Slot** - One movement ability active at a time

**Action Abilities**: No slots required - all learned actions are available simultaneously in combat.

### Assignment Rules

- **Only Learned Abilities**: Can only assign abilities you've learned
- **Type Matching**: Can only assign abilities of the correct type to each slot
- **Outside Combat**: Slot assignments can be changed between combats (in camp/rest screen)
- **Strategic Choice**: Must choose which passive, reaction, and movement to activate

**Example Loadout**:
- **Passive**: Meat Shield (+50 HP)
- **Reaction**: Repost (counter-attack when hit)
- **Movement**: Journeyman (gain XP per tile moved)
- **Actions**: Charge, Head Strike, Leg Strike, Bash (all available)

### Experience System

- **Total Experience**: Accumulates from all sources (combat victories, quests, etc.)
- **Class Experience**: Tracks XP earned while playing each class
- **Spent Experience**: Tracks XP spent on abilities from each class
- **Unspent Experience**: `class XP earned - class XP spent = available for learning`

**Multi-Classing Example**:
```
Character "Alice":
  Total XP: 1000

  Fighter XP: 600 earned, 400 spent
    Unspent: 200 (can learn more Fighter abilities)

  Rogue XP: 400 earned, 100 spent
    Unspent: 300 (can learn more Rogue abilities)

  Can use ALL learned abilities from both classes!
```

## YAML Configuration Structure

Each ability in `ability-database.yaml` follows this structure:

```yaml
abilities:
  - id: "unique-ability-id"           # Unique identifier
    name: "Display Name"               # Human-readable name
    description: "What the ability does" # Full description
    abilityType: "Action"              # Action | Passive | Movement | Reaction
    experiencePrice: 100               # XP cost to learn
    tags:                              # Classification tags
      - "physical"                     # Tag examples: physical, magic, healing,
      - "melee"                        # damage, buff, debuff, movement, etc.
    effects:                           # (Optional) Effect configuration
      - type: "damage"
        target: "enemy"
        value: 10
      - type: "knockback"
        distance: 1
```

### Current Implementation (Abilities Exist, Effects Not Yet Implemented)

The `ability-database.yaml` file currently contains **32 abilities** across three classes:
- **11 Fighter abilities** (8 Actions, 1 Reaction, 2 Passives, 1 Movement)
- **11 Rogue abilities** (7 Actions, 2 Reactions, 3 Passives, 1 Movement)
- **10 Apprentice abilities** (8 Actions, 1 Reaction, 2 Passives, 1 Movement)

**Current State**: All abilities are defined with `id`, `name`, `description`, `abilityType`, `experiencePrice`, and `tags`. However, the `effects` field and runtime execution system **are not yet implemented**.

**Implementation Scope**: This system **does NOT include status effects** (Stun, Confusion, Bleeding, Blindness, Haste, etc.). The focus is on:
- **Stat Buffs/Debuffs**: Temporary and permanent stat modifications
- **Damage/Healing**: Direct HP/Mana changes
- **Movement Effects**: Teleport, movement bonuses
- **Resource Costs**: Mana, health, action timer costs

**Implementable Abilities** (using stat modifiers):
- **Strength** (Apprentice) - Increases Physical Power
- **Weakness** (Apprentice) - Decreases Physical Power
- **Reflexes** (Apprentice) - Increases Physical and Magical Evasion
- **Sluggish** (Apprentice) - Decreases Speed
- **Fast** (Rogue Passive) - Increases Speed by 3
- **Meat Shield** (Fighter Passive) - Increases max HP by 50
- **Dodge** (Rogue Passive) - Increases Physical Evasion

**Out of Scope** (require status effect system NOT being implemented):
- Knockback, Confusion, Stun, Bleeding, Blindness, Disarm, Haste
- Shield absorption effects
- Damage-over-time effects
- Control effects (interrupts, mesmerize)
- Equipment permission changes

**Note**: YAML examples in this document include some out-of-scope abilities for **reference only**. When implementing, focus on abilities that use `stat-bonus`, `stat-penalty`, `damage-physical`, `damage-magical`, and `heal` effect types.

**Implementation Document**: See [StatModifierSystem.md](./StatModifierSystem.md) for the **stat modifier system** (✅ COMPLETE - Phases 1-5).

## Core Requirements

### 1. Ability Data Model

#### CombatAbility Interface
```typescript
/**
 * Represents a learnable ability with effects
 */
export interface CombatAbility {
  /**
   * Unique identifier (e.g., "charge-001")
   */
  id: string;

  /**
   * Display name (e.g., "Charge")
   */
  name: string;

  /**
   * Full description of what the ability does
   */
  description: string;

  /**
   * Type of ability (determines when it triggers)
   */
  abilityType: AbilityType;

  /**
   * Experience cost to learn this ability
   */
  experiencePrice: number;

  /**
   * Classification tags for filtering and categorization
   * Examples: physical, magic, healing, damage, buff, debuff, etc.
   */
  tags: string[];

  /**
   * Effect configuration (defines what happens when ability executes)
   * Optional - some abilities may use custom logic instead
   */
  effects?: AbilityEffect[];

  /**
   * Resource costs (mana, HP, items, etc.)
   * Optional - not all abilities have costs
   */
  costs?: AbilityCost[];

  /**
   * Targeting requirements (range, valid targets, etc.)
   * Optional - defaults to standard attack targeting
   */
  targeting?: AbilityTargeting;

  /**
   * Equipment requirements (e.g., shield for Bash)
   * Optional - not all abilities have requirements
   */
  requirements?: AbilityRequirements;
}

export type AbilityType = 'Action' | 'Passive' | 'Movement' | 'Reaction';
```

#### AbilityEffect Interface
```typescript
/**
 * Represents a single effect that an ability can produce
 * Abilities can have multiple effects (e.g., damage + knockback)
 */
export interface AbilityEffect {
  /**
   * Type of effect to apply
   */
  type: EffectType;

  /**
   * Who receives the effect (self, target, allies, enemies, area)
   */
  target: EffectTarget;

  /**
   * Numeric value (damage amount, healing, stat bonus, etc.)
   * Can be a fixed number or a formula string
   */
  value?: number | string;

  /**
   * Duration in turns (for buffs/debuffs)
   * Omit for instant effects
   */
  duration?: number;

  /**
   * Chance of success (0.0 to 1.0)
   * Omit for guaranteed effects
   */
  chance?: number;

  /**
   * Additional parameters specific to effect type
   */
  params?: Record<string, unknown>;
}

export type EffectType =
  // Damage and Healing (IMPLEMENTABLE)
  | 'damage-physical'
  | 'damage-magical'
  | 'heal'
  // Stats (IMPLEMENTABLE)
  | 'stat-bonus'           // Temporary stat increase
  | 'stat-penalty'         // Temporary stat decrease
  | 'stat-permanent'       // Permanent stat change (passives)
  // Movement (IMPLEMENTABLE)
  | 'teleport'
  | 'movement-bonus'
  // Special (IMPLEMENTABLE)
  | 'mana-restore'
  | 'action-timer-modify'
  // OUT OF SCOPE - Require Status Effect System (NOT IMPLEMENTED)
  | 'knockback'            // Requires position/movement system
  | 'pull'                 // Requires position/movement system
  | 'status-apply'         // Requires status effect system
  | 'status-remove'        // Requires status effect system
  | 'interrupt'            // Requires action interruption system
  | 'shield-absorb'        // Requires shield/absorption system
  | 'disarm'               // Requires equipment status system
  | 'disable-equipment'    // Requires equipment status system
  | 'equipment-permission' // Requires equipment system changes
  | 'damage-redirect'      // Requires damage routing system
  | 'experience-gain';     // Special XP mechanics

export type EffectTarget =
  | 'self'                 // The ability user
  | 'target'               // Single selected target
  | 'all-enemies'          // All enemy units
  | 'all-allies'           // All allied units
  | 'area-around-self'     // Tiles around user
  | 'area-around-target'   // Tiles around target
  | 'random-enemy'         // Random enemy unit
  | 'random-ally';         // Random ally unit
```

#### AbilityCost Interface
```typescript
/**
 * Represents a resource cost for using an ability
 */
export interface AbilityCost {
  /**
   * Type of resource consumed
   */
  type: CostType;

  /**
   * Amount consumed
   */
  amount: number;
}

export type CostType =
  | 'mana'
  | 'health'
  | 'item'
  | 'action-timer';      // Reduces action timer by amount
```

#### AbilityTargeting Interface
```typescript
/**
 * Defines targeting rules for an ability
 */
export interface AbilityTargeting {
  /**
   * Minimum range in tiles
   */
  minRange: number;

  /**
   * Maximum range in tiles
   */
  maxRange: number;

  /**
   * Whether line of sight is required
   */
  requiresLineOfSight: boolean;

  /**
   * Valid target types
   */
  validTargets: TargetType[];

  /**
   * Area of effect (if applicable)
   */
  areaOfEffect?: {
    shape: 'single' | 'line' | 'circle' | 'cone';
    size: number;
  };
}

export type TargetType =
  | 'self'
  | 'ally'
  | 'enemy'
  | 'any-unit'
  | 'empty-tile';
```

#### AbilityRequirements Interface
```typescript
/**
 * Defines prerequisites for using an ability
 */
export interface AbilityRequirements {
  /**
   * Required equipment types
   */
  equipment?: string[];  // e.g., ["shield"], ["weapon-melee"]

  /**
   * Minimum stat values
   */
  stats?: Record<string, number>;

  /**
   * Required status effects
   */
  statuses?: string[];   // e.g., ["haste", "strength"]

  /**
   * Custom validation function ID
   */
  customValidation?: string;
}
```

### 2. Ability Registry and Loading

#### AbilityRegistry
```typescript
/**
 * Global registry for combat abilities.
 * Loaded from ability-database.yaml on app initialization.
 */
export class AbilityRegistry {
  private static registry: Map<string, CombatAbility> = new Map();

  /**
   * Register an ability definition
   */
  static register(ability: CombatAbility): void {
    if (this.registry.has(ability.id)) {
      console.warn(`Ability with id '${ability.id}' is already registered. Overwriting.`);
    }
    this.registry.set(ability.id, ability);
  }

  /**
   * Register multiple abilities at once
   */
  static registerAll(abilities: CombatAbility[]): void {
    for (const ability of abilities) {
      this.register(ability);
    }
  }

  /**
   * Get an ability by ID
   */
  static getById(id: string): CombatAbility | undefined {
    return this.registry.get(id);
  }

  /**
   * Get all abilities of a specific type
   */
  static getByType(type: AbilityType): CombatAbility[] {
    return Array.from(this.registry.values())
      .filter(ability => ability.abilityType === type);
  }

  /**
   * Get all abilities with a specific tag
   */
  static getByTag(tag: string): CombatAbility[] {
    return Array.from(this.registry.values())
      .filter(ability => ability.tags.includes(tag));
  }

  /**
   * Get all abilities for a specific class
   * (Requires abilities to have class tags like "fighter", "rogue", etc.)
   */
  static getByClass(className: string): CombatAbility[] {
    return this.getByTag(className.toLowerCase());
  }

  /**
   * Get all registered ability IDs
   */
  static getAllIds(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get all registered abilities
   */
  static getAll(): CombatAbility[] {
    return Array.from(this.registry.values());
  }

  /**
   * Check if an ability ID is registered
   */
  static has(id: string): boolean {
    return this.registry.has(id);
  }

  /**
   * Clear all registered abilities (for testing)
   */
  static clearRegistry(): void {
    this.registry.clear();
  }

  /**
   * Get the number of registered abilities
   */
  static get count(): number {
    return this.registry.size;
  }
}
```

#### AbilityDataLoader
```typescript
/**
 * Loads ability data from YAML file.
 * Parses ability-database.yaml and registers all abilities.
 */
export class AbilityDataLoader {
  /**
   * Load all abilities from YAML database
   */
  static async loadAbilities(yamlPath: string = '/data/ability-database.yaml'): Promise<void> {
    const response = await fetch(yamlPath);
    const yamlText = await response.text();
    const data = YAML.parse(yamlText);

    if (!data.abilities || !Array.isArray(data.abilities)) {
      throw new Error('Invalid ability database format: missing abilities array');
    }

    const abilities: CombatAbility[] = data.abilities.map((abilityData: any) => {
      return this.parseAbility(abilityData);
    });

    AbilityRegistry.registerAll(abilities);
    console.log(`[AbilityDataLoader] Loaded ${abilities.length} abilities`);
  }

  /**
   * Parse a single ability from YAML data
   */
  private static parseAbility(data: any): CombatAbility {
    // Validate required fields
    if (!data.id || !data.name || !data.abilityType) {
      throw new Error(`Invalid ability data: missing required fields (id, name, or abilityType)`);
    }

    const ability: CombatAbility = {
      id: data.id,
      name: data.name,
      description: data.description ?? '',
      abilityType: data.abilityType as AbilityType,
      experiencePrice: data.experiencePrice ?? 0,
      tags: data.tags ?? [],
    };

    // Optional fields
    if (data.effects) {
      ability.effects = data.effects.map((e: any) => this.parseEffect(e));
    }

    if (data.costs) {
      ability.costs = data.costs.map((c: any) => ({
        type: c.type as CostType,
        amount: c.amount,
      }));
    }

    if (data.targeting) {
      ability.targeting = {
        minRange: data.targeting.minRange ?? 0,
        maxRange: data.targeting.maxRange ?? 1,
        requiresLineOfSight: data.targeting.requiresLineOfSight ?? false,
        validTargets: data.targeting.validTargets ?? ['enemy'],
        areaOfEffect: data.targeting.areaOfEffect,
      };
    }

    if (data.requirements) {
      ability.requirements = {
        equipment: data.requirements.equipment,
        stats: data.requirements.stats,
        statuses: data.requirements.statuses,
        customValidation: data.requirements.customValidation,
      };
    }

    return ability;
  }

  /**
   * Parse a single effect from YAML data
   */
  private static parseEffect(data: any): AbilityEffect {
    return {
      type: data.type as EffectType,
      target: data.target as EffectTarget,
      value: data.value,
      duration: data.duration,
      chance: data.chance,
      params: data.params,
    };
  }
}
```

### 3. Ability Execution System

#### AbilityExecutor
```typescript
/**
 * Executes abilities and applies their effects.
 * Central orchestration point for ability logic.
 */
export class AbilityExecutor {
  /**
   * Check if a unit can use an ability
   * Validates costs, requirements, and targeting
   */
  static canUseAbility(
    ability: CombatAbility,
    user: CombatUnit,
    target: CombatUnit | null,
    state: CombatState
  ): { canUse: boolean; reason?: string } {
    // Check costs
    if (ability.costs) {
      for (const cost of ability.costs) {
        if (!this.canAffordCost(cost, user)) {
          return { canUse: false, reason: `Insufficient ${cost.type}` };
        }
      }
    }

    // Check requirements
    if (ability.requirements) {
      const reqCheck = this.checkRequirements(ability.requirements, user, state);
      if (!reqCheck.satisfied) {
        return { canUse: false, reason: reqCheck.reason };
      }
    }

    // Check targeting (if ability requires a target)
    if (ability.targeting && target) {
      const targetCheck = this.validateTarget(ability.targeting, user, target, state);
      if (!targetCheck.valid) {
        return { canUse: false, reason: targetCheck.reason };
      }
    }

    return { canUse: true };
  }

  /**
   * Execute an ability
   * Consumes costs, applies effects, returns updated state
   */
  static executeAbility(
    ability: CombatAbility,
    user: CombatUnit,
    target: CombatUnit | null,
    state: CombatState
  ): CombatState {
    // Validate ability can be used
    const canUse = this.canUseAbility(ability, user, target, state);
    if (!canUse.canUse) {
      console.error(`Cannot use ability ${ability.name}: ${canUse.reason}`);
      return state;
    }

    let newState = state;

    // Consume costs
    if (ability.costs) {
      newState = this.consumeCosts(ability.costs, user, newState);
    }

    // Apply effects
    if (ability.effects) {
      for (const effect of ability.effects) {
        newState = this.applyEffect(effect, user, target, newState);
      }
    }

    // Add combat log message
    newState = this.addLogMessage(ability, user, target, newState);

    return newState;
  }

  /**
   * Check if user can afford an ability cost
   */
  private static canAffordCost(cost: AbilityCost, user: CombatUnit): boolean {
    switch (cost.type) {
      case 'mana':
        return user.mana >= cost.amount;
      case 'health':
        return user.health > cost.amount; // Must have more than cost (can't kill self)
      case 'action-timer':
        return user.actionTimer >= cost.amount;
      case 'item':
        // TODO: Check inventory for item
        return false;
      default:
        return false;
    }
  }

  /**
   * Consume ability costs from user
   */
  private static consumeCosts(
    costs: AbilityCost[],
    user: CombatUnit,
    state: CombatState
  ): CombatState {
    // Create a copy of the user with updated resources
    const updatedUser = { ...user };

    for (const cost of costs) {
      switch (cost.type) {
        case 'mana':
          updatedUser.mana = Math.max(0, updatedUser.mana - cost.amount);
          break;
        case 'health':
          updatedUser.health = Math.max(1, updatedUser.health - cost.amount);
          break;
        case 'action-timer':
          updatedUser.actionTimer = Math.max(0, updatedUser.actionTimer - cost.amount);
          break;
        case 'item':
          // TODO: Remove item from inventory
          break;
      }
    }

    // Update state with modified user
    return this.updateUnitInState(state, user, updatedUser);
  }

  /**
   * Check if user satisfies ability requirements
   */
  private static checkRequirements(
    requirements: AbilityRequirements,
    user: CombatUnit,
    state: CombatState
  ): { satisfied: boolean; reason?: string } {
    // Equipment requirements
    if (requirements.equipment) {
      // TODO: Check if user has required equipment
      // For now, assume satisfied
    }

    // Stat requirements
    if (requirements.stats) {
      for (const [stat, minValue] of Object.entries(requirements.stats)) {
        const userStatValue = (user as any)[stat];
        if (userStatValue < minValue) {
          return {
            satisfied: false,
            reason: `Requires ${stat} >= ${minValue}`,
          };
        }
      }
    }

    // Status requirements
    if (requirements.statuses) {
      // TODO: Check if user has required status effects
      // For now, assume satisfied
    }

    return { satisfied: true };
  }

  /**
   * Validate targeting for an ability
   */
  private static validateTarget(
    targeting: AbilityTargeting,
    user: CombatUnit,
    target: CombatUnit,
    state: CombatState
  ): { valid: boolean; reason?: string } {
    // Get positions
    const userPos = state.unitManifest.getPositionOf(user);
    const targetPos = state.unitManifest.getPositionOf(target);

    if (!userPos || !targetPos) {
      return { valid: false, reason: 'Cannot find unit positions' };
    }

    // Check range
    const distance = Math.abs(targetPos.x - userPos.x) + Math.abs(targetPos.y - userPos.y);
    if (distance < targeting.minRange || distance > targeting.maxRange) {
      return {
        valid: false,
        reason: `Target out of range (${targeting.minRange}-${targeting.maxRange})`,
      };
    }

    // Check line of sight
    if (targeting.requiresLineOfSight) {
      // TODO: Implement LoS check
      // For now, assume satisfied
    }

    // Check valid target type
    const isAlly = user.isPlayerControlled === target.isPlayerControlled;
    const targetType: TargetType = target === user ? 'self' : isAlly ? 'ally' : 'enemy';

    if (!targeting.validTargets.includes(targetType) && !targeting.validTargets.includes('any-unit')) {
      return {
        valid: false,
        reason: `Cannot target ${targetType}`,
      };
    }

    return { valid: true };
  }

  /**
   * Apply a single effect
   */
  private static applyEffect(
    effect: AbilityEffect,
    user: CombatUnit,
    target: CombatUnit | null,
    state: CombatState
  ): CombatState {
    // Determine target(s)
    const targets = this.resolveEffectTargets(effect.target, user, target, state);

    let newState = state;

    for (const targetUnit of targets) {
      // Check chance
      if (effect.chance !== undefined && Math.random() > effect.chance) {
        continue; // Effect fails
      }

      // Apply effect based on type
      newState = this.applyEffectToTarget(effect, user, targetUnit, newState);
    }

    return newState;
  }

  /**
   * Resolve effect targets based on EffectTarget specification
   */
  private static resolveEffectTargets(
    targetSpec: EffectTarget,
    user: CombatUnit,
    explicitTarget: CombatUnit | null,
    state: CombatState
  ): CombatUnit[] {
    switch (targetSpec) {
      case 'self':
        return [user];
      case 'target':
        return explicitTarget ? [explicitTarget] : [];
      case 'all-enemies':
        return state.unitManifest.getAllUnits().filter(u => u.isPlayerControlled !== user.isPlayerControlled);
      case 'all-allies':
        return state.unitManifest.getAllUnits().filter(u => u.isPlayerControlled === user.isPlayerControlled);
      case 'random-enemy': {
        const enemies = state.unitManifest.getAllUnits().filter(u => u.isPlayerControlled !== user.isPlayerControlled);
        return enemies.length > 0 ? [enemies[Math.floor(Math.random() * enemies.length)]] : [];
      }
      case 'random-ally': {
        const allies = state.unitManifest.getAllUnits().filter(u => u.isPlayerControlled === user.isPlayerControlled);
        return allies.length > 0 ? [allies[Math.floor(Math.random() * allies.length)]] : [];
      }
      // TODO: Implement area-based targeting
      default:
        return [];
    }
  }

  /**
   * Apply effect to a specific target unit
   */
  private static applyEffectToTarget(
    effect: AbilityEffect,
    user: CombatUnit,
    target: CombatUnit,
    state: CombatState
  ): CombatState {
    const updatedTarget = { ...target };

    switch (effect.type) {
      case 'damage-physical':
      case 'damage-magical': {
        const damage = this.calculateEffectValue(effect, user, target);
        updatedTarget.wounds = Math.min(
          updatedTarget.maxHealth,
          updatedTarget.wounds + damage
        );
        break;
      }

      case 'heal': {
        const healing = this.calculateEffectValue(effect, user, target);
        updatedTarget.wounds = Math.max(0, updatedTarget.wounds - healing);
        break;
      }

      case 'stat-bonus':
      case 'stat-penalty': {
        // TODO: Implement status effect system for temporary stat changes
        break;
      }

      case 'mana-restore': {
        const manaGain = this.calculateEffectValue(effect, user, target);
        updatedTarget.mana = Math.min(
          updatedTarget.maxMana,
          updatedTarget.mana + manaGain
        );
        break;
      }

      // TODO: Implement other effect types
      default:
        console.warn(`Effect type '${effect.type}' not yet implemented`);
    }

    return this.updateUnitInState(state, target, updatedTarget);
  }

  /**
   * Calculate numeric value of an effect
   * Supports fixed numbers and formula strings
   */
  private static calculateEffectValue(
    effect: AbilityEffect,
    user: CombatUnit,
    target: CombatUnit
  ): number {
    if (effect.value === undefined) {
      return 0;
    }

    if (typeof effect.value === 'number') {
      return effect.value;
    }

    // Parse formula string (e.g., "PPower * 1.5", "MPower + Attunement")
    // TODO: Implement formula parser
    return 0;
  }

  /**
   * Update a unit in the combat state
   */
  private static updateUnitInState(
    state: CombatState,
    oldUnit: CombatUnit,
    newUnit: CombatUnit
  ): CombatState {
    // Get the unit's position
    const position = state.unitManifest.getPositionOf(oldUnit);
    if (!position) {
      return state;
    }

    // Create new manifest with updated unit
    const newManifest = { ...state.unitManifest };
    newManifest.removeUnit(oldUnit);
    newManifest.addUnit(newUnit, position);

    return {
      ...state,
      unitManifest: newManifest,
    };
  }

  /**
   * Add combat log message for ability use
   */
  private static addLogMessage(
    ability: CombatAbility,
    user: CombatUnit,
    target: CombatUnit | null,
    state: CombatState
  ): CombatState {
    const targetName = target ? ` on ${target.name}` : '';
    const message = `${user.name} uses ${ability.name}${targetName}!`;

    // TODO: Add to combat log
    console.log(message);

    return state;
  }
}
```

### 4. Unit Ability Management

**Current Implementation**: The `HumanoidUnit` class already implements comprehensive ability management.

See [HumanoidUnit.ts](../../react-app/src/models/combat/HumanoidUnit.ts) for full implementation.

#### Key Features Already Implemented:

**Learned Abilities Tracking**:
```typescript
private _learnedAbilities: Set<CombatAbility> = new Set();

// Public getter
get learnedAbilities(): ReadonlySet<CombatAbility>
```

**Ability Slots**:
```typescript
private _reactionAbility: CombatAbility | null = null;
private _passiveAbility: CombatAbility | null = null;
private _movementAbility: CombatAbility | null = null;

// Public getters
get reactionAbility(): CombatAbility | null
get passiveAbility(): CombatAbility | null
get movementAbility(): CombatAbility | null
```

**Experience Tracking**:
```typescript
private _totalExperience: number = 0;
private _classExperience: Map<string, number> = new Map();
private _classExperienceSpent: Map<string, number> = new Map();

// Methods
addExperience(amount: number, unitClass?: UnitClass): void
getClassExperience(unitClass: UnitClass): number
getUnspentClassExperience(unitClass: UnitClass): number
```

**Learning Abilities**:
```typescript
// Learn ability from specific class (costs class XP)
learnAbility(ability: CombatAbility, fromClass: UnitClass): boolean

// Check if can afford
canAffordAbility(ability: CombatAbility, fromClass: UnitClass): boolean

// Check if learned
hasAbility(ability: CombatAbility): boolean
```

**Assigning Abilities to Slots**:
```typescript
assignReactionAbility(ability: CombatAbility | null): boolean
assignPassiveAbility(ability: CombatAbility | null): boolean
assignMovementAbility(ability: CombatAbility | null): boolean
```

**Getting Available Actions**:
```typescript
getPrimaryActions(): CombatAbility[]     // Actions from primary class
getSecondaryActions(): CombatAbility[]   // Actions from secondary class
```

**Serialization**:
```typescript
toJSON(): HumanoidUnitJSON  // Includes all ability data
static fromJSON(json: HumanoidUnitJSON): HumanoidUnit | null
```

#### What Still Needs Implementation:

1. **Effect Execution System** - `AbilityExecutor` to actually execute ability effects
2. **Effect Handlers** - Individual handlers for each effect type
3. **Combat Integration** - Triggering abilities during combat phases
4. **Passive Stat Application** - Applying passive ability bonuses to stats
5. **Reaction Triggers** - Detecting and executing reaction abilities
6. **Movement Triggers** - Detecting and executing movement abilities
7. **UI Integration** - Ability selection menus and info panels

## Implementation Strategy

### Phase 1: Core Data Structures (4-6 hours)
1. Create `CombatAbility` interface and related types
2. Create `AbilityEffect` interface and effect types
3. Create `AbilityCost`, `AbilityTargeting`, `AbilityRequirements` interfaces
4. Update `ability-database.yaml` with effect configurations for existing abilities
5. Create unit tests for data structures

### Phase 2: Ability Registry (3-4 hours)
1. Create `AbilityRegistry` class
2. Create `AbilityDataLoader` class
3. Implement YAML parsing for abilities
4. Integrate with app initialization
5. Create unit tests for registry and loader

### Phase 3: Ability Execution System (8-10 hours)
1. Create `AbilityExecutor` class
2. Implement cost validation and consumption
3. Implement requirement checking
4. Implement targeting validation
5. Implement effect resolution
6. Create unit tests for execution logic

### Phase 4: Effect Handlers (10-12 hours)
1. Implement damage effect handlers
2. Implement healing effect handlers
3. Implement stat modification effects
4. Implement movement effects (teleport, knockback)
5. Implement status effect application (requires Status System)
6. Create unit tests for each effect type

### Phase 5: Unit Integration (2-3 hours)
1. ~~Extend `HumanoidUnit` and `MonsterUnit` with ability support~~ **DONE - Already implemented**
2. ~~Implement `learnedAbilities` tracking~~ **DONE - Already implemented**
3. ~~Implement ability getter methods~~ **DONE - Already implemented**
4. ~~Implement `learnAbility()` method with XP cost~~ **DONE - Already implemented**
5. ~~Update serialization to include learned abilities~~ **DONE - Already implemented**
6. Add passive ability stat modifier application to stat getters
7. Test ability learning and assignment with existing HumanoidUnit methods

### Phase 6: Combat Integration (6-8 hours)
1. Add ability selection to `ActionsMenuContent`
2. Implement ability targeting mode in `PlayerTurnStrategy`
3. Add ability execution to `UnitTurnPhaseHandler`
4. Handle passive ability stat modifiers
5. Handle movement ability triggers
6. Handle reaction ability triggers

### Phase 7: UI and Visualization (8-10 hours)
1. Create ability info panel showing learned abilities
2. Add ability purchase UI (in camp/rest screen)
3. Create ability tooltips with costs and effects
4. Add visual indicators for active buffs/debuffs
5. Implement ability animations and effects

### Phase 8: Testing and Polish (6-8 hours)
1. Integration tests for ability execution in combat
2. Playtesting for balance and feel
3. Performance optimization
4. Documentation updates
5. Bug fixes

**Total Estimated Time**: 49-64 hours

## Complete YAML Examples

**⚠️ IMPORTANT NOTE**: This section includes YAML examples for **all 32 abilities**, including many that use **out-of-scope effects** (status effects, knockback, shields, etc.). These examples are provided for **reference and future implementation only**.

**For current implementation**, focus ONLY on abilities using these effect types:
- `stat-bonus` / `stat-penalty` - Temporary stat changes (Strength, Weakness, Sluggish, Reflexes)
- `stat-permanent` - Permanent stat changes (Meat Shield, Fast, Dodge, Focused)
- `damage-physical` / `damage-magical` - Direct damage (basic attacks, Harm)
- `heal` - Healing (Heal ability)
- `mana-restore` - Mana recovery (Meditate)

**Abilities marked with 🚫 use out-of-scope effects** and should be skipped during initial implementation.

This section provides **complete, copy-paste ready YAML** for all example abilities. Parameters are **consolidated for reusability** across similar abilities.

### Reusable Parameter Patterns

**Common Cost Types:**
- `type: "mana", amount: N` - Mana cost
- `type: "health", amount: N` - Health cost
- `type: "action-timer", amount: N` - Action timer penalty

**Range Field (for attack-based abilities):**
- `range: "infinite"` - Can hit any target on map, ignores line of sight
- `range: "los"` - Can hit any unit in line of sight
- `range: "weapon"` - Uses equipped weapon's range
- `range: "X-Y"` - Min range X, max range Y (e.g., "1-1" = adjacent, "2-6" = ranged, "3-5" = mid-range)
  - Follows normal attack rules with line of sight

**Targeting (for non-attack abilities like buffs/heals):**
- `targeting` object with `minRange`, `maxRange`, `validTargets`, `requiresLineOfSight`
- Use for abilities that need specific target type validation (ally vs enemy)

**Common Effect Types:**
- Stat Modifier: `type: "stat-bonus"` or `"stat-penalty"` with `params: { stat: "statName" }`
- Damage: `type: "damage-physical"` or `"damage-magical"` with formula
- Healing: `type: "heal"` with formula
- Resource: `type: "mana-restore"` with formula

---

### Fighter Action Abilities

#### 🚫 Charge (OUT OF SCOPE - uses knockback)
```yaml
- id: "charge-001"
  name: "Charge"
  description: "Deals damage to an adjacent unit and has a chance to knock them back (never misses)"
  abilityType: "Action"
  experiencePrice: 50
  tags: ["physical", "melee", "knockback", "auto-hit"]
  range: "1-1"  # Adjacent only
  effects:
    - type: "damage-physical"
      target: "target"
      value: "PPower * 1.0"
      params:
        autoHit: true
    - type: "knockback"  # OUT OF SCOPE
      target: "target"
      value: 1
      chance: 0.5
```

#### 🚫 Bash (OUT OF SCOPE - uses interrupt)
```yaml
- id: "bash-001"
  name: "Bash"
  description: "Bash an enemy with your shield interrupting their current action (requires shield equipped)"
  abilityType: "Action"
  experiencePrice: 100
  tags: ["physical", "melee", "interrupt", "shield-required"]
  requirements:
    equipment: ["shield"]
  range: "1-1"  # Adjacent only
  effects:
    - type: "damage-physical"
      target: "target"
      value: "PPower * 0.8"
    - type: "interrupt"  # OUT OF SCOPE
      target: "target"
```

#### 🚫 Head Strike (OUT OF SCOPE - uses status-apply)
```yaml
- id: "head-strike-001"
  name: "Head Strike"
  description: "Aim for an enemy's head dealing damage and has a chance to inflict confusion"
  abilityType: "Action"
  experiencePrice: 300
  tags: ["physical", "weapon-range", "confusion"]
  range: "weapon"  # Uses equipped weapon's range
  effects:
    - type: "damage-physical"
      target: "target"
      value: "PPower * 1.2"
    - type: "status-apply"  # OUT OF SCOPE
      target: "target"
      chance: 0.3
      duration: 3
      params:
        status: "confusion"
```

#### 🚫 Body Strike (OUT OF SCOPE - uses status-apply)
```yaml
- id: "body-strike-001"
  name: "Body Strike"
  description: "Aim for an enemy's body dealing damage and has a chance to stun them"
  abilityType: "Action"
  experiencePrice: 500
  tags: ["physical", "weapon-range", "stun"]
  range: "weapon"  # Uses equipped weapon's range
  effects:
    - type: "damage-physical"
      target: "target"
      value: "PPower * 1.0"
    - type: "status-apply"  # OUT OF SCOPE
      target: "target"
      chance: 0.4
      duration: 2
      params:
        status: "stun"
```

#### ✅ Leg Strike (IMPLEMENTABLE - uses stat-penalty)
```yaml
- id: "leg-strike-001"
  name: "Leg Strike"
  description: "Aim for an enemy's leg dealing damage and has a chance to reduce their Speed"
  abilityType: "Action"
  experiencePrice: 200
  tags: ["physical", "weapon-range", "slow"]
  range: "weapon"  # Uses equipped weapon's range
  effects:
    - type: "damage-physical"
      target: "target"
      value: "PPower * 0.9"
    - type: "stat-penalty"  # IMPLEMENTABLE
      target: "target"
      value: -3
      duration: 3
      chance: 0.5
      params:
        stat: "speed"
```

---

### Fighter Reaction Abilities

#### 🚫 Parry (OUT OF SCOPE - uses trigger-based stat-bonus)
```yaml
- id: "parry-001"
  name: "Parry"
  description: "Increases your physical evasion based on your weapon"
  abilityType: "Reaction"
  experiencePrice: 500
  tags: ["defensive", "evasion"]
  effects:
    - type: "stat-bonus"
      target: "self"
      value: "weaponPhysicalEvade"
      params:
        trigger: "before-physical-attack"
        stat: "physicalEvade"
```

---

### Fighter Passive Abilities

#### ✅ Meat Shield (IMPLEMENTABLE - uses stat-permanent)
```yaml
- id: "meat-shield-001"
  name: "Meat Shield"
  description: "Increases HP by 50"
  abilityType: "Passive"
  experiencePrice: 500
  tags: ["defensive", "health"]
  effects:
    - type: "stat-permanent"
      target: "self"
      value: 50
      params:
        stat: "maxHealth"
```

#### 🚫 Shield Bearer (OUT OF SCOPE - uses equipment-permission)
```yaml
- id: "shield-bearer-001"
  name: "Shield Bearer"
  description: "Allows user to equip shield even if their class does not permit it"
  abilityType: "Passive"
  experiencePrice: 300
  tags: ["equipment", "shield"]
  effects:
    - type: "equipment-permission"
      target: "self"
      params:
        equipmentType: "shield"
```

---

### Fighter Movement Abilities

#### 🚫 Journeyman (OUT OF SCOPE - uses experience-gain)
```yaml
- id: "journeyman-001"
  name: "Journeyman"
  description: "Gain XP for every step you take"
  abilityType: "Movement"
  experiencePrice: 250
  tags: ["experience", "passive-gain"]
  effects:
    - type: "experience-gain"
      target: "self"
      value: 1
      params:
        condition: "per-tile-moved"
```

---

### Rogue Action Abilities

#### ✅ Throw Stone (IMPLEMENTABLE - uses damage-physical)
```yaml
- id: "throw-stone-001"
  name: "Throw Stone"
  description: "Basic ranged attack"
  abilityType: "Action"
  experiencePrice: 50
  tags: ["physical", "ranged"]
  range: "2-6"  # Ranged attack
  effects:
    - type: "damage-physical"
      target: "target"
      value: "PPower * 0.5"
```

#### 🚫 Sneak (OUT OF SCOPE - uses movement-bonus)
```yaml
- id: "sneak-001"
  name: "Sneak"
  description: "Take a move action ignoring enemies"
  abilityType: "Action"
  experiencePrice: 100
  tags: ["movement", "stealth"]
  effects:
    - type: "movement-bonus"  # OUT OF SCOPE
      target: "self"
      value: "movement"
      params:
        ignoreEnemies: true
```

#### 🚫 Cut (OUT OF SCOPE - uses status-apply/bleeding)
```yaml
- id: "cut-001"
  name: "Cut"
  description: "Deal damage and has a chance to cause Bleeding"
  abilityType: "Action"
  experiencePrice: 200
  tags: ["physical", "weapon-range", "bleeding"]
  range: "weapon"  # Uses equipped weapon's range
  effects:
    - type: "damage-physical"
      target: "target"
      value: "PPower * 1.0"
    - type: "status-apply"  # OUT OF SCOPE
      target: "target"
      chance: 0.4
      duration: 3
      params:
        status: "bleeding"
        damagePerTurn: 5
```

#### 🚫 Pocket Sand (OUT OF SCOPE - uses status-apply/blindness)
```yaml
- id: "pocket-sand-001"
  name: "Pocket Sand"
  description: "Throw sand in an enemy's eyes causing Blindness"
  abilityType: "Action"
  experiencePrice: 200
  tags: ["special", "ranged", "blindness"]
  range: "1-2"  # Close range attack
  effects:
    - type: "status-apply"  # OUT OF SCOPE
      target: "target"
      duration: 2
      params:
        status: "blindness"
```

#### ✅ Sneak Attack (IMPLEMENTABLE - uses damage-physical with conditions)
```yaml
- id: "sneak-attack-001"
  name: "Sneak Attack"
  description: "Attack from behind (never misses if enemy is facing away, otherwise automatic miss)"
  abilityType: "Action"
  experiencePrice: 500
  tags: ["physical", "weapon-range", "backstab", "conditional"]
  range: "weapon"  # Uses equipped weapon's range
  effects:
    - type: "damage-physical"  # IMPLEMENTABLE
      target: "target"
      value: "PPower * 2.0"
      params:
        requiresFacingAway: true
        autoHit: true
```

#### 🚫 Disarm (OUT OF SCOPE - uses disarm)
```yaml
- id: "disarm-001"
  name: "Disarm"
  description: "Chance to disarm the target"
  abilityType: "Action"
  experiencePrice: 400
  tags: ["physical", "weapon-range", "disarm"]
  range: "weapon"  # Uses equipped weapon's range
  effects:
    - type: "disarm"  # OUT OF SCOPE
      target: "target"
      chance: 0.5
      duration: 2
```

---

### Rogue Reaction Abilities

#### 🚫 Slippery (OUT OF SCOPE - uses status-apply/haste)
```yaml
- id: "slippery-001"
  name: "Slippery"
  description: "After taking damage, gain Haste"
  abilityType: "Reaction"
  experiencePrice: 500
  tags: ["defensive", "haste"]
  effects:
    - type: "status-apply"  # OUT OF SCOPE
      target: "self"
      duration: 2
      params:
        trigger: "after-taking-damage"
        status: "haste"
```

#### 🚫 Repost (OUT OF SCOPE - reaction triggers not implemented)
```yaml
- id: "repost-001"
  name: "Repost"
  description: "After being attacked, perform an attack on the enemy"
  abilityType: "Reaction"
  experiencePrice: 250
  tags: ["offensive", "counter"]
  effects:
    - type: "damage-physical"
      target: "attacker"  # Reaction system not implemented
      value: "PPower * 1.0"
      params:
        trigger: "after-being-attacked"  # OUT OF SCOPE
        requiresWeaponRange: true
```

---

### Rogue Passive Abilities

#### ✅ Fast (IMPLEMENTABLE - uses stat-permanent)
```yaml
- id: "fast-001"
  name: "Fast"
  description: "+3 Speed"
  abilityType: "Passive"
  experiencePrice: 400
  tags: ["speed"]
  effects:
    - type: "stat-permanent"  # IMPLEMENTABLE
      target: "self"
      value: 3
      params:
        stat: "speed"
```

#### 🚫 Ready (OUT OF SCOPE - combat-start timing not implemented)
```yaml
- id: "ready-001"
  name: "Ready"
  description: "Start combat with your action timer set to 50"
  abilityType: "Passive"
  experiencePrice: 300
  tags: ["initiative"]
  effects:
    - type: "action-timer-modify"  # IMPLEMENTABLE type but timing is OUT OF SCOPE
      target: "self"
      value: 50
      params:
        timing: "combat-start"  # OUT OF SCOPE
```

#### ✅ Dodge (IMPLEMENTABLE - uses stat-permanent)
```yaml
- id: "dodge-001"
  name: "Dodge"
  description: "Increases Physical Evasion"
  abilityType: "Passive"
  experiencePrice: 500
  tags: ["defensive", "evasion"]
  effects:
    - type: "stat-permanent"  # IMPLEMENTABLE
      target: "self"
      value: 10
      params:
        stat: "physicalEvade"
```

---

### Rogue Movement Abilities

#### 🚫 Extra Movement (OUT OF SCOPE - movement abilities not fully implemented)
```yaml
- id: "extra-movement-001"
  name: "+1 Movement"
  description: "Increases movement by 1"
  abilityType: "Movement"
  experiencePrice: 200
  tags: ["movement"]
  effects:
    - type: "stat-permanent"
      target: "self"
      value: 1
      params:
        stat: "movement"
```

---

### Apprentice Support Actions

#### ✅ Heal (IMPLEMENTABLE - uses heal)
```yaml
- id: "heal-001"
  name: "Heal"
  description: "Heals a unit (6 mana, range 3, single target)"
  abilityType: "Action"
  experiencePrice: 100
  tags: ["magic", "healing", "ranged"]
  costs:
    - type: "mana"
      amount: 6
  targeting:
    minRange: 0
    maxRange: 3
    requiresLineOfSight: false
    validTargets: ["ally", "self"]
  effects:
    - type: "heal"  # IMPLEMENTABLE
      target: "target"
      value: "MPower + Attunement"
```

#### 🚫 Minor Shield (OUT OF SCOPE - uses shield-absorb)
```yaml
- id: "minor-shield-001"
  name: "Minor Shield"
  description: "Grants a minor shield to a unit that absorbs up to 20 damage from the next attack"
  abilityType: "Action"
  experiencePrice: 200
  tags: ["magic", "buff", "shield", "ranged"]
  costs:
    - type: "mana"
      amount: 6
  targeting:
    minRange: 0
    maxRange: 3
    requiresLineOfSight: false
    validTargets: ["ally", "self"]
  effects:
    - type: "shield-absorb"  # OUT OF SCOPE
      target: "target"
      value: 20
      duration: 0
      params:
        oneTime: true
```

#### ✅ Strength (IMPLEMENTABLE - uses stat-bonus)
```yaml
- id: "strength-001"
  name: "Strength"
  description: "Increases a unit's Physical Power (6 mana, range 3, single target)"
  abilityType: "Action"
  experiencePrice: 200
  tags: ["magic", "buff", "ranged"]
  costs:
    - type: "mana"
      amount: 6
  targeting:
    minRange: 0
    maxRange: 3
    requiresLineOfSight: false
    validTargets: ["ally", "self"]
  effects:
    - type: "stat-bonus"  # IMPLEMENTABLE
      target: "target"
      value: 6
      duration: 5
      params:
        stat: "physicalPower"
```

#### ✅ Reflexes (IMPLEMENTABLE - uses stat-bonus)
```yaml
- id: "reflexes-001"
  name: "Reflexes"
  description: "Increases a unit's Physical and Magical Evasion (10 mana, range 3, single target)"
  abilityType: "Action"
  experiencePrice: 400
  tags: ["magic", "buff", "ranged"]
  costs:
    - type: "mana"
      amount: 10
  targeting:
    minRange: 0
    maxRange: 3
    requiresLineOfSight: false
    validTargets: ["ally", "self"]
  effects:
    - type: "stat-bonus"  # IMPLEMENTABLE
      target: "target"
      value: 10
      duration: 5
      params:
        stat: "physicalEvade"
    - type: "stat-bonus"  # IMPLEMENTABLE
      target: "target"
      value: 10
      duration: 5
      params:
        stat: "magicEvade"
```

---

### Apprentice Offensive Actions

#### ✅ Harm (IMPLEMENTABLE - uses damage-magical)
```yaml
- id: "harm-001"
  name: "Harm"
  description: "Harms a unit (6 mana, range 3, single target)"
  abilityType: "Action"
  experiencePrice: 100
  tags: ["magic", "damage", "ranged"]
  costs:
    - type: "mana"
      amount: 6
  range: "los"  # Line of sight attack
  effects:
    - type: "damage-magical"  # IMPLEMENTABLE
      target: "target"
      value: "MPower + Attunement"
```

#### ✅ Weakness (IMPLEMENTABLE - uses stat-penalty)
```yaml
- id: "weakness-001"
  name: "Weakness"
  description: "Decreases a unit's Physical Power (6 mana, range 3, single target)"
  abilityType: "Action"
  experiencePrice: 200
  tags: ["magic", "debuff", "ranged"]
  costs:
    - type: "mana"
      amount: 6
  targeting:
    minRange: 0
    maxRange: 3
    requiresLineOfSight: false
    validTargets: ["enemy"]
  effects:
    - type: "stat-penalty"  # IMPLEMENTABLE
      target: "target"
      value: -6
      duration: 5
      params:
        stat: "physicalPower"
```

#### ✅ Sluggish (IMPLEMENTABLE - uses stat-penalty)
```yaml
- id: "sluggish-001"
  name: "Sluggish"
  description: "Decreases a unit's Speed (10 mana, range 3, single target)"
  abilityType: "Action"
  experiencePrice: 300
  tags: ["magic", "debuff", "ranged"]
  costs:
    - type: "mana"
      amount: 10
  targeting:
    minRange: 0
    maxRange: 3
    requiresLineOfSight: false
    validTargets: ["enemy"]
  effects:
    - type: "stat-penalty"  # IMPLEMENTABLE
      target: "target"
      value: -5
      duration: 5
      params:
        stat: "speed"
```

#### ✅ Mesmerize (IMPLEMENTABLE - uses action-timer-modify)
```yaml
- id: "mesmerize-001"
  name: "Mesmerize"
  description: "Mesmerizes a unit resetting its Action Timer (10 mana, range 3, single target)"
  abilityType: "Action"
  experiencePrice: 500
  tags: ["magic", "control", "ranged"]
  costs:
    - type: "mana"
      amount: 10
  targeting:
    minRange: 0
    maxRange: 3
    requiresLineOfSight: true
    validTargets: ["enemy"]
  effects:
    - type: "action-timer-modify"  # IMPLEMENTABLE
      target: "target"
      value: -100
```

---

### Apprentice Reaction Abilities

#### 🚫 Quick Shield (OUT OF SCOPE - uses shield-absorb)
```yaml
- id: "quick-shield-001"
  name: "Quick Shield"
  description: "Before taking physical damage, casts Minor Shield to absorb the blow (uses MP)"
  abilityType: "Reaction"
  experiencePrice: 200
  tags: ["magic", "defensive", "shield"]
  costs:
    - type: "mana"
      amount: 6
  effects:
    - type: "shield-absorb"  # OUT OF SCOPE
      target: "self"
      value: 20
      params:
        trigger: "before-physical-damage"
        oneTime: true
```

---

### Apprentice Passive Abilities

#### ✅ Focused (IMPLEMENTABLE - uses stat-permanent)
```yaml
- id: "focused-001"
  name: "Focused"
  description: "Increases MP by 50"
  abilityType: "Passive"
  experiencePrice: 500
  tags: ["mana"]
  effects:
    - type: "stat-permanent"  # IMPLEMENTABLE
      target: "self"
      value: 50
      params:
        stat: "maxMana"
```

#### 🚫 Mana Shield (OUT OF SCOPE - uses damage-redirect)
```yaml
- id: "mana-shield-001"
  name: "Mana Shield"
  description: "Damage is dealt to Mana rather than Health"
  abilityType: "Passive"
  experiencePrice: 500
  tags: ["mana", "defensive"]
  effects:
    - type: "damage-redirect"  # OUT OF SCOPE
      target: "self"
      params:
        from: "health"
        to: "mana"
```

---

### Apprentice Movement Abilities

#### ✅ Meditate (IMPLEMENTABLE - uses mana-restore)
```yaml
- id: "meditate-001"
  name: "Meditate"
  description: "When this unit does not move, they gain 10% of their mana"
  abilityType: "Movement"
  experiencePrice: 200
  tags: ["mana", "regeneration"]
  effects:
    - type: "mana-restore"  # IMPLEMENTABLE
      target: "self"
      value: "maxMana * 0.1"
      params:
        condition: "no-movement"
```

---

## Consolidated Parameter Reference

### Common `params` Fields

**Stat Modifiers:**
- `stat: "statName"` - Which stat to modify (maxHealth, speed, physicalPower, etc.)

**Triggers (Reactions):**
- `trigger: "after-being-attacked"` - After unit is attacked
- `trigger: "before-physical-damage"` - Before taking physical damage
- `trigger: "after-taking-damage"` - After taking any damage

**Conditions (Movement):**
- `condition: "no-movement"` - Only if unit didn't move
- `condition: "per-tile-moved"` - Per tile traveled

**Special Behaviors:**
- `autoHit: true` - Never misses
- `requiresFacingAway: true` - Only works if target facing away
- `requiresWeaponRange: true` - Only if attacker in weapon range
- `oneTime: true` - Effect expires after one use
- `ignoreEnemies: true` - Movement ignores enemy zones

**Status Effects:**
- `status: "statusName"` - Which status to apply (stun, haste, bleeding, etc.)
- `damagePerTurn: N` - For damage-over-time effects

**Equipment:**
- `equipmentType: "typeName"` - Shield, weapon, armor, etc.

### Range Usage Summary

**Attack Abilities by Range Type:**

| Range Type | Abilities |
|-----------|-----------|
| `"1-1"` (Adjacent) | Charge, Bash |
| `"1-2"` (Close) | Pocket Sand |
| `"2-6"` (Ranged) | Throw Stone |
| `"weapon"` (Weapon Range) | Head Strike, Body Strike, Leg Strike, Cut, Sneak Attack, Disarm |
| `"los"` (Line of Sight) | Harm |

**Non-Attack Abilities** (use `targeting` object):
- Heal, Minor Shield, Strength, Reflexes (buff allies)
- Weakness, Sluggish, Mesmerize (debuff enemies)
- All require specific `validTargets` validation (ally vs enemy)

## Edge Cases and Considerations

### 1. Ability Learning Order
- **Issue**: Some abilities may be prerequisites for others
- **Solution**: Add `requiredAbilities` field to requirements
- **Future**: Ability trees and class progression paths

### 2. Passive Ability Stacking
- **Issue**: Multiple passive abilities modifying same stat
- **Solution**: All passive effects stack additively by default
- **Future**: Add `stackType` field for multiplicative or unique effects

### 3. Reaction Priority
- **Issue**: Multiple reactions triggered by same event
- **Solution**: Execute in registration order (order learned)
- **Future**: Add `priority` field for explicit ordering

### 4. Movement Ability Conflicts
- **Issue**: "Meditate" (no movement) vs "Journeyman" (gain XP per tile)
- **Solution**: Both can be active, only applicable one triggers
- **Implementation**: Check trigger condition for each movement ability

### 5. Resource Costs with Insufficient Resources
- **Issue**: Unit has some mana but not enough for ability
- **Solution**: Gray out ability in UI, prevent selection
- **Validation**: `canUseAbility()` check before allowing selection

### 6. Targeting Dead/KO'd Units
- **Issue**: Can abilities target knocked out units?
- **Solution**: By default, exclude KO'd units from targeting
- **Future**: Add "can-target-ko" flag for revival abilities

### 7. Effect Timing
- **Issue**: When do buffs/debuffs expire? Start or end of turn?
- **Solution**: Expire at end of affected unit's turn
- **Implementation**: Duration countdown happens in `UnitTurnPhaseHandler`

### 8. Formula Parsing Security
- **Issue**: Arbitrary code execution from formula strings
- **Solution**: Whitelist allowed variables and operators
- **Implementation**: Safe expression evaluator with limited scope

## Testing Checklist

### Data Loading Tests
- [ ] Load all abilities from YAML successfully
- [ ] Parse ability effects correctly
- [ ] Parse costs, targeting, requirements correctly
- [ ] Handle missing optional fields gracefully
- [ ] Reject invalid ability data with clear errors

### Registry Tests
- [ ] Register abilities successfully
- [ ] Retrieve abilities by ID
- [ ] Filter abilities by type
- [ ] Filter abilities by tag
- [ ] Handle duplicate IDs (overwrite warning)

### Execution Tests
- [ ] `canUseAbility()` validates costs correctly
- [ ] `canUseAbility()` validates requirements correctly
- [ ] `canUseAbility()` validates targeting correctly
- [ ] `executeAbility()` consumes costs
- [ ] `executeAbility()` applies effects
- [ ] Effect chance works correctly (probabilistic)

### Effect Tests
- [ ] Damage effects reduce target health
- [ ] Healing effects restore health (capped at max)
- [ ] Stat bonuses apply correctly
- [ ] Stat bonuses expire after duration
- [ ] Mana costs deduct correctly
- [ ] Multiple effects apply in order

### Integration Tests
- [ ] Learn ability costs XP
- [ ] Cannot learn ability without enough XP
- [ ] Passive abilities apply on learning
- [ ] Action abilities appear in combat menu
- [ ] Movement abilities trigger after movement
- [ ] Reaction abilities trigger on events
- [ ] Abilities serialize/deserialize correctly

## Performance Considerations

### Memory
- **Ability Registry**: ~100 abilities * 2KB each = ~200KB
- **Effect Storage**: Minimal per-ability overhead
- **Runtime Buffs/Debuffs**: ~10-20 active effects max
- **Expected Total**: <1MB for ability system

### Execution Performance
- **Ability Validation**: O(1) cost checks, O(n) requirement checks
- **Effect Application**: O(n) where n = number of effects
- **Effect Resolution**: O(m) where m = number of targets
- **Expected Frame Time**: <5ms for most abilities

### YAML Parsing
- **One-Time Cost**: Parsed on app initialization
- **~100 Abilities**: <50ms parse time
- **No Runtime Impact**: All data pre-loaded

## Dependencies

- **Requires**: YAML parsing library
- **Requires**: CombatState, CombatUnit interfaces
- **Requires**: CombatUnitManifest for position tracking
- **Future**: Status Effect System for buffs/debuffs
- **Future**: Formula Parser for effect value calculations
- **Future**: Animation System for ability visuals

## Future Extensions

### Status Effect System
- **Persistent Effects**: Buffs, debuffs, DoTs (damage over time)
- **Status Icons**: Visual indicators on units
- **Dispel/Cleanse**: Abilities to remove status effects
- **Immunity**: Units immune to certain statuses

### Ability Trees
- **Prerequisites**: Abilities that require other abilities
- **Class Paths**: Specializations within classes
- **Mastery Bonuses**: Enhanced effects for advanced abilities

### Combo System
- **Ability Chains**: Using abilities in sequence for bonus effects
- **Synergy Bonuses**: Allies using complementary abilities
- **Finisher Abilities**: Powerful abilities requiring setup

### Ability Upgrades
- **Rank System**: Abilities can be upgraded (Fireball I → Fireball II)
- **Enhanced Effects**: Increased damage, reduced cost, additional targets
- **XP Investment**: Upgrade costs XP

## Success Criteria

This system is complete when:
1. All abilities load from YAML successfully
2. Units can learn and use Action abilities in combat
3. Passive abilities apply stat modifiers correctly
4. Movement abilities trigger after movement phase
5. Reaction abilities trigger on appropriate events
6. Effects system handles damage, healing, and stat changes
7. Costs are validated and consumed correctly
8. Targeting system works for single-target and area abilities
9. All tests pass
10. Documentation is complete

## Files to Create

### Core Models
- `models/combat/abilities/CombatAbility.ts` - Main ability interface
- `models/combat/abilities/AbilityEffect.ts` - Effect types and interfaces
- `models/combat/abilities/AbilityCost.ts` - Cost types
- `models/combat/abilities/AbilityTargeting.ts` - Targeting rules
- `models/combat/abilities/AbilityRequirements.ts` - Prerequisites

### Registry and Loading
- `utils/AbilityRegistry.ts` - Ability registry
- `services/AbilityDataLoader.ts` - YAML data loader

### Execution
- `models/combat/abilities/AbilityExecutor.ts` - Main execution orchestrator
- `models/combat/abilities/effects/EffectHandler.ts` - Base effect handler
- `models/combat/abilities/effects/DamageEffectHandler.ts` - Damage effects
- `models/combat/abilities/effects/HealEffectHandler.ts` - Healing effects
- `models/combat/abilities/effects/StatEffectHandler.ts` - Stat modifiers
- `models/combat/abilities/effects/MovementEffectHandler.ts` - Movement effects

### Unit Integration
- `models/combat/abilities/UnitAbilityManager.ts` - Ability learning and tracking

### Tests
- `models/combat/abilities/__tests__/AbilityRegistry.test.ts`
- `models/combat/abilities/__tests__/AbilityExecutor.test.ts`
- `models/combat/abilities/__tests__/EffectHandlers.test.ts`
- `services/__tests__/AbilityDataLoader.test.ts`

## Notes

- The ability system is designed to be data-driven and extensible
- Effects use a composition pattern (abilities can have multiple effects)
- Formula strings allow flexible stat scaling without hardcoding
- The system mirrors existing patterns (Registry, DataLoader, YAML config)
- Future status effect system will greatly expand ability design space
- Balance and playtesting will be crucial for ability costs and power levels

---

**Estimated Complexity**: Medium-High (45-58 hours)
- Data structures: 4-6 hours
- Registry and loading: 3-4 hours
- Execution system: 8-10 hours
- Effect handlers: 10-12 hours
- Unit integration: 2-3 hours (**Reduced - core already done**)
- Combat integration: 6-8 hours
- UI and visualization: 8-10 hours
- Testing and polish: 6-8 hours

**Risk Level**: Medium
- Well-defined from existing YAML (32 abilities already defined)
- Clear requirements
- **HumanoidUnit already implements learning/assignment system**
- Some complexity in effect resolution
- Depends on future Status Effect System for full functionality

---

## Current Implementation Status

### ✅ Already Implemented (HumanoidUnit.ts)
- Learned abilities tracking (`Set<CombatAbility>`)
- Three ability slots (Passive, Reaction, Movement)
- Class-based experience tracking
- Ability learning with XP costs
- Ability assignment to slots
- Cross-class ability usage
- Serialization/deserialization
- Primary/secondary class actions

### ⏳ Partially Implemented (ability-database.yaml)
- 32 abilities defined with metadata
- IDs, names, descriptions, types, XP costs, tags
- **Missing**: Effect configurations
- **Missing**: Cost specifications
- **Missing**: Targeting rules
- **Missing**: Requirements

### ❌ Not Yet Implemented
- `AbilityRegistry` and `AbilityDataLoader`
- `AbilityExecutor` and effect resolution system
- Effect handlers (damage, healing, stats, etc.)
- Combat phase integration (triggering abilities)
- Passive stat application
- Reaction detection and execution
- Movement ability triggers
- UI panels for ability management
- Status Effect System (dependency)

---

## Key Design Principles

1. **Slot-Based Assignment**: Passive, Reaction, and Movement require slot assignment (one active at a time)
2. **Action Availability**: All learned Action abilities available in combat simultaneously
3. **Cross-Class Flexibility**: Abilities learned from one class usable in any class
4. **Class-Specific XP**: Abilities cost XP from the class they're learned from
5. **Permanent Learning**: Once learned, abilities are permanently owned
6. **Effect Composition**: Abilities can have multiple effects for complex behaviors
7. **Data-Driven Design**: All ability definitions in YAML, not hardcoded

