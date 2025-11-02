# Ability System - Combat Integration Plan

**Version:** 1.0
**Created:** 2025-11-01
**Related:** [AbilitySystemOverview.md](AbilitySystemOverview.md), [StatModifierSystem.md](StatModifierSystem.md), [CombatHierarchy.md](../../CombatHierarchy.md)

## Purpose

This document provides a detailed implementation plan for integrating the ability system into the existing combat infrastructure. It focuses **exclusively** on combat execution for units with already-assigned abilities. Learning abilities, setting abilities, and setting classes will be implemented in a separate feature.

## Scope

**IN SCOPE:**
- ✅ Passive ability stat modifier application during combat
- ✅ Action ability execution from combat menu
- ✅ Reaction ability triggers during combat events
- ✅ Movement ability triggers after movement phase
- ✅ Effect resolution system (damage, healing, stat modifiers, mana costs)
- ✅ Combat UI integration (ability menu, targeting, feedback)

**OUT OF SCOPE:**
- ❌ Learning abilities (XP spending, class-based learning)
- ❌ Assigning abilities to slots (outside combat, camp/rest screen)
- ❌ Equipment permissions (Dual Wield, Heavy Armor, Shield Bearer)
- ❌ Status effects (Stun, Confusion, Bleeding, etc.)
- ❌ Advanced damage modifiers beyond stat modifiers

## Overview of Combat Architecture

The combat system is phase-driven with the following key components:

### Combat Phases
1. **deployment** - Player places units
2. **enemy-deployment** - Enemy fade-in animation
3. **action-timer** - Active Time Battle (ATB) system, units accumulate action timer
4. **unit-turn** - Individual unit's turn (player or AI)
5. **victory** - Victory screen with rewards
6. **defeat** - Defeat screen with retry/skip options

### Current Unit Turn Flow (UnitTurnPhaseHandler)
1. Identify ready unit (first with actionTimer >= 100, excluding KO'd)
2. Create appropriate strategy (PlayerTurnStrategy or EnemyTurnStrategy)
3. Display unit name in top panel (green for player, red for enemy)
4. Show actions menu in bottom panel
5. Handle actions:
   - **Move**: Movement range calculation → path preview → animation → position update
   - **Attack**: Attack range calculation → target selection → hit/miss roll → damage → animation
   - **Delay**: Set actionTimer to 50 → return to action-timer phase
   - **End Turn**: Set actionTimer to 0 → return to action-timer phase
   - **Reset Move**: Teleport back to original position (if moved this turn)
6. Re-evaluate after each action (action economy: hasMoved, hasActed)
7. Transition back to action-timer phase when turn complete

### Current Stat Calculation (HumanoidUnit)
All 10 stat getters include stat modifier calculations:
```typescript
get physicalPower(): number {
  return Math.max(0, this._basePhysicalPower + this.getStatModifierTotal('physicalPower'));
}
```

The `StatModifier` system (Phases 1-5 complete) provides:
- Temporary/permanent stat modifications with duration tracking
- Add/remove modifiers by ID or source
- Duration decrement (automatic expiration)
- Serialization/deserialization

**Phase 4 (PENDING)**: Auto-apply stat modifiers when passive ability assigned

## Implementation Phases

### Phase 1: Passive Ability Stat Application ✅

**Goal**: Complete Phase 4 of StatModifierSystem.md - automatically apply stat modifiers when passive abilities are assigned.

#### 1.1 Update HumanoidUnit.assignPassiveAbility()

**Current State**: [HumanoidUnit.ts:XXX](../../react-app/src/models/combat/HumanoidUnit.ts)
```typescript
assignPassiveAbility(ability: CombatAbility | null): void {
  this._passiveAbility = ability;
  // TODO: Apply stat modifiers from ability effects
}
```

**New Implementation**:
```typescript
assignPassiveAbility(ability: CombatAbility | null): void {
  // Remove stat modifiers from previous passive ability
  if (this._passiveAbility) {
    this.removeStatModifiersBySource(this._passiveAbility.id);
  }

  this._passiveAbility = ability;

  // Apply stat modifiers from new passive ability
  if (ability) {
    this.applyPassiveAbilityModifiers(ability);
  }
}

private applyPassiveAbilityModifiers(ability: CombatAbility): void {
  // Filter for stat-permanent effects
  const statEffects = ability.effects?.filter(
    effect => effect.type === 'stat-permanent' || effect.type === 'stat-bonus'
  ) ?? [];

  for (const effect of statEffects) {
    if (!this.isValidStatType(effect.stat)) {
      console.warn(`Invalid stat type in ability ${ability.id}: ${effect.stat}`);
      continue;
    }

    const modifier: StatModifier = {
      id: `${ability.id}-${effect.stat}`,
      stat: effect.stat as StatType,
      value: effect.value,
      duration: -1, // Permanent while assigned
      source: ability.id,
      sourceName: ability.name,
      icon: ability.icon
    };

    this.addStatModifier(modifier);
  }
}

private isValidStatType(stat: string | undefined): stat is StatType {
  const validStats: StatType[] = [
    'maxHealth', 'maxMana', 'physicalPower', 'magicPower',
    'speed', 'movement', 'physicalEvade', 'magicEvade',
    'courage', 'attunement'
  ];
  return stat !== undefined && validStats.includes(stat as StatType);
}
```

#### 1.2 Add CombatAbility.effects Field

**File**: [react-app/src/models/combat/CombatAbility.ts](../../react-app/src/models/combat/CombatAbility.ts)

Add effect configuration to CombatAbility interface:
```typescript
export interface AbilityEffect {
  type: 'stat-permanent' | 'stat-bonus' | 'stat-penalty' |
        'damage-physical' | 'damage-magical' | 'heal' | 'mana-restore' | 'mana-cost';
  stat?: StatType; // For stat effects
  value: number;
  duration?: number; // For temporary effects (stat-bonus, stat-penalty)
  target?: 'self' | 'ally' | 'enemy' | 'position';
  range?: number; // For targeting
}

export interface CombatAbility {
  id: string;
  name: string;
  description: string;
  abilityType: AbilityType;
  experiencePrice: number;
  tags: string[];
  effects?: AbilityEffect[]; // NEW: Effect configuration
  icon?: string;
}
```

#### 1.3 Update AbilityDataLoader

**File**: [react-app/src/data/loaders/AbilityDataLoader.ts](../../react-app/src/data/loaders/AbilityDataLoader.ts)

Parse effects from YAML:
```typescript
private parseAbilityEffect(effectData: any): AbilityEffect {
  return {
    type: effectData.type,
    stat: effectData.stat,
    value: effectData.value,
    duration: effectData.duration,
    target: effectData.target,
    range: effectData.range
  };
}

// In parseAbility():
effects: data.effects?.map(e => this.parseAbilityEffect(e))
```

#### 1.4 Update ability-database.yaml

Add effects to passive abilities:
```yaml
- id: "meat-shield"
  name: "Meat Shield"
  description: "Increases max HP by 50"
  abilityType: "Passive"
  experiencePrice: 100
  tags: ["defensive", "health"]
  effects:
    - type: "stat-permanent"
      stat: "maxHealth"
      value: 50

- id: "fast"
  name: "Fast"
  description: "Increases Speed by 3"
  abilityType: "Passive"
  experiencePrice: 50
  tags: ["movement", "speed"]
  effects:
    - type: "stat-permanent"
      stat: "speed"
      value: 3
```

#### 1.5 Testing

**File**: Create [HumanoidUnit.passiveability.test.ts](../../react-app/src/models/combat/HumanoidUnit.passiveability.test.ts)

Test cases:
- ✅ Assigning passive ability applies stat modifiers
- ✅ Stat getters reflect modifier values
- ✅ Removing passive ability removes modifiers
- ✅ Swapping passive abilities removes old and applies new
- ✅ Multiple stat effects in one ability
- ✅ Invalid stat types handled gracefully
- ✅ Serialization includes stat modifiers

---

### Phase 2: Action Ability Execution System

**Goal**: Enable action abilities to be executed from the combat menu during unit turns.

#### 2.1 Create AbilityExecutor

**New File**: [react-app/src/models/combat/abilities/AbilityExecutor.ts](../../react-app/src/models/combat/abilities/AbilityExecutor.ts)

```typescript
export interface AbilityExecutionContext {
  caster: CombatUnit;
  casterPosition: Position;
  target?: CombatUnit;
  targetPosition?: Position;
  state: CombatState;
}

export interface AbilityExecutionResult {
  success: boolean;
  newState: CombatState;
  animations?: CinematicSequence[];
  logMessages: string[];
  damages?: Map<CombatUnit, number>; // For UI feedback
  heals?: Map<CombatUnit, number>;
}

export class AbilityExecutor {
  /**
   * Execute an ability and return the updated state
   */
  static execute(
    ability: CombatAbility,
    context: AbilityExecutionContext
  ): AbilityExecutionResult {
    const results: AbilityExecutionResult = {
      success: false,
      newState: context.state,
      animations: [],
      logMessages: [],
      damages: new Map(),
      heals: new Map()
    };

    // Validate ability can be executed
    if (!this.canExecute(ability, context)) {
      results.logMessages.push(`Cannot execute ${ability.name}`);
      return results;
    }

    // Process each effect in sequence
    for (const effect of ability.effects ?? []) {
      this.applyEffect(effect, context, results);
    }

    results.success = true;
    return results;
  }

  private static canExecute(
    ability: CombatAbility,
    context: AbilityExecutionContext
  ): boolean {
    // Check mana cost
    const manaCost = this.getManaCost(ability);
    if (manaCost > 0 && context.caster.currentMana < manaCost) {
      return false;
    }

    // Check range (if targeting)
    if (context.targetPosition) {
      const range = this.getRange(ability);
      const distance = Math.abs(context.casterPosition.x - context.targetPosition.x) +
                      Math.abs(context.casterPosition.y - context.targetPosition.y);
      if (distance > range) {
        return false;
      }
    }

    return true;
  }

  private static applyEffect(
    effect: AbilityEffect,
    context: AbilityExecutionContext,
    results: AbilityExecutionResult
  ): void {
    switch (effect.type) {
      case 'mana-cost':
        this.applyManaCost(effect, context, results);
        break;
      case 'damage-physical':
      case 'damage-magical':
        this.applyDamage(effect, context, results);
        break;
      case 'heal':
        this.applyHealing(effect, context, results);
        break;
      case 'mana-restore':
        this.applyManaRestore(effect, context, results);
        break;
      case 'stat-bonus':
      case 'stat-penalty':
        this.applyStatModifier(effect, context, results);
        break;
      default:
        console.warn(`Unknown effect type: ${effect.type}`);
    }
  }

  private static applyManaCost(
    effect: AbilityEffect,
    context: AbilityExecutionContext,
    results: AbilityExecutionResult
  ): void {
    const caster = context.caster;
    const cost = effect.value;
    caster.currentMana = Math.max(0, caster.currentMana - cost);
    results.logMessages.push(`${caster.name} spent ${cost} mana`);
  }

  private static applyDamage(
    effect: AbilityEffect,
    context: AbilityExecutionContext,
    results: AbilityExecutionResult
  ): void {
    const target = this.resolveTarget(effect, context);
    if (!target) return;

    const isMagical = effect.type === 'damage-magical';
    const baseDamage = this.calculateBaseDamage(effect, context.caster, isMagical);

    // Hit roll
    const hitChance = isMagical
      ? CombatCalculations.calculateMagicHitChance(context.caster, target)
      : CombatCalculations.calculatePhysicalHitChance(context.caster, target, null); // No weapon for abilities

    const roll = Math.random() * 100;
    if (roll > hitChance) {
      results.logMessages.push(`${target.name} evaded!`);
      return;
    }

    // Apply damage
    target.wounds = Math.min(target.maxHealth, target.wounds + baseDamage);
    results.damages?.set(target, baseDamage);
    results.logMessages.push(`${target.name} took ${baseDamage} damage!`);
  }

  private static applyHealing(
    effect: AbilityEffect,
    context: AbilityExecutionContext,
    results: AbilityExecutionResult
  ): void {
    const target = this.resolveTarget(effect, context);
    if (!target) return;

    // Base healing uses magic power and attunement
    const baseHeal = Math.floor(
      context.caster.magicPower * 0.5 +
      context.caster.attunement * effect.value
    );

    const actualHeal = Math.min(baseHeal, target.wounds);
    target.wounds = Math.max(0, target.wounds - actualHeal);
    results.heals?.set(target, actualHeal);
    results.logMessages.push(`${target.name} restored ${actualHeal} HP!`);
  }

  private static applyManaRestore(
    effect: AbilityEffect,
    context: AbilityExecutionContext,
    results: AbilityExecutionResult
  ): void {
    const target = this.resolveTarget(effect, context);
    if (!target) return;

    const restore = effect.value;
    const actualRestore = Math.min(restore, target.maxMana - target.currentMana);
    target.currentMana = Math.min(target.maxMana, target.currentMana + actualRestore);
    results.logMessages.push(`${target.name} restored ${actualRestore} mana!`);
  }

  private static applyStatModifier(
    effect: AbilityEffect,
    context: AbilityExecutionContext,
    results: AbilityExecutionResult
  ): void {
    const target = this.resolveTarget(effect, context);
    if (!target || !('addStatModifier' in target)) return;

    const modifier: StatModifier = {
      id: `${context.caster.name}-ability-${Date.now()}`,
      stat: effect.stat!,
      value: effect.type === 'stat-penalty' ? -effect.value : effect.value,
      duration: effect.duration ?? 3,
      source: 'ability',
      sourceName: context.caster.name
    };

    (target as HumanoidUnit).addStatModifier(modifier);
    results.logMessages.push(
      `${target.name}'s ${effect.stat} ${effect.type === 'stat-bonus' ? 'increased' : 'decreased'}!`
    );
  }

  private static resolveTarget(
    effect: AbilityEffect,
    context: AbilityExecutionContext
  ): CombatUnit | null {
    if (effect.target === 'self') {
      return context.caster;
    }
    return context.target ?? null;
  }

  private static calculateBaseDamage(
    effect: AbilityEffect,
    caster: CombatUnit,
    isMagical: boolean
  ): number {
    const power = isMagical ? caster.magicPower : caster.physicalPower;
    return Math.floor(power * effect.value);
  }

  private static getManaCost(ability: CombatAbility): number {
    const manaCostEffect = ability.effects?.find(e => e.type === 'mana-cost');
    return manaCostEffect?.value ?? 0;
  }

  private static getRange(ability: CombatAbility): number {
    const rangeEffect = ability.effects?.find(e => e.range !== undefined);
    return rangeEffect?.range ?? 1;
  }
}
```

#### 2.2 Update UnitTurnPhaseHandler

Add ability execution support:

```typescript
// New method
executeAbility(abilityId: string, targetPosition?: Position): CombatState {
  const ability = this.activeUnit!.abilities.find(a => a.id === abilityId);
  if (!ability) {
    console.error(`Ability ${abilityId} not found`);
    return this.currentState!;
  }

  const context: AbilityExecutionContext = {
    caster: this.activeUnit!,
    casterPosition: this.activePosition!,
    target: targetPosition ? this.currentState!.unitManifest.getUnitAt(targetPosition) : undefined,
    targetPosition,
    state: this.currentState!
  };

  const result = AbilityExecutor.execute(ability, context);

  if (!result.success) {
    return this.currentState!;
  }

  // Add combat log messages
  let newState = result.newState;
  for (const message of result.logMessages) {
    newState = CombatLogManager.addMessage(newState, message);
  }

  // Mark unit as having acted
  this.hasActed = true;
  this.canAct = false;

  // Store animation if any
  if (result.animations && result.animations.length > 0) {
    // TODO: Trigger animations
  }

  return newState;
}

// Update executeAction to handle ability actions
executeAction(action: TurnAction): CombatState {
  // ... existing code ...

  if (action.type === 'ability') {
    return this.executeAbility(action.abilityId, action.target);
  }

  // ... existing code ...
}
```

#### 2.3 Add Ability Actions Menu Panel

**New File**: [react-app/src/models/combat/managers/panels/AbilityMenuContent.ts](../../react-app/src/models/combat/managers/panels/AbilityMenuContent.ts)

```typescript
export class AbilityMenuContent implements PanelContent {
  private buttons: PanelButton[] = [];
  private abilities: CombatAbility[] = [];

  constructor(
    abilities: CombatAbility[],
    private onAbilitySelect: (abilityId: string) => void,
    private onCancel: () => void
  ) {
    this.abilities = abilities;
    this.initializeButtons();
  }

  private initializeButtons(): void {
    this.buttons = this.abilities.map((ability, index) => {
      return new PanelButton(
        ability.name,
        10,
        20 + index * 14,
        () => this.onAbilitySelect(ability.id)
      );
    });

    // Add Cancel button
    this.buttons.push(
      new PanelButton(
        'Cancel',
        10,
        20 + this.abilities.length * 14 + 5,
        () => this.onCancel()
      )
    );
  }

  render(/* ... */): void {
    // Render title
    fontRenderer.drawText(ctx, 'ABILITIES', 10, 10, TITLE_FONT_ID, '#ffffff');

    // Render buttons
    for (const button of this.buttons) {
      button.render(ctx, fontRenderer, fontAtlasImage);
    }
  }

  handleClick(x: number, y: number): boolean {
    for (const button of this.buttons) {
      if (button.handleClick(x, y)) {
        return true;
      }
    }
    return false;
  }

  // ... other PanelContent methods ...
}
```

#### 2.4 Update ActionsMenuContent

Add "Ability" button to actions menu:

```typescript
private initializeButtons(): void {
  // ... existing buttons ...

  // Add Ability button if unit has action abilities
  const actionAbilities = this.unit.abilities.filter(a => a.abilityType === 'Action');
  if (actionAbilities.length > 0) {
    this.buttons.push(
      new PanelButton('Ability', 10, yOffset, () => this.onAbilityClick(), {
        isEnabled: () => !this.buttonsDisabled && this.canAct(),
        helperText: `Use learned ability`
      })
    );
    yOffset += buttonSpacing;
  }

  // ... rest of buttons ...
}

private onAbilityClick(): void {
  this.onAction({ type: 'show-ability-menu' });
}
```

#### 2.5 Testing

**File**: Create [AbilityExecutor.test.ts](../../react-app/src/models/combat/abilities/AbilityExecutor.test.ts)

Test cases:
- ✅ Execute damage ability (physical and magical)
- ✅ Execute healing ability
- ✅ Execute stat buff/debuff ability
- ✅ Mana cost validation
- ✅ Range validation
- ✅ Hit/miss rolls
- ✅ Multiple effects in one ability
- ✅ Combat log messages generated

---

### Phase 3: Reaction Ability System

**Goal**: Trigger reaction abilities automatically when specific combat events occur.

#### 3.1 Define Reaction Triggers

**New File**: [react-app/src/models/combat/abilities/ReactionTrigger.ts](../../react-app/src/models/combat/abilities/ReactionTrigger.ts)

```typescript
export type ReactionTriggerType =
  | 'before-attacked'  // Before damage is applied
  | 'after-attacked'   // After damage is applied
  | 'before-attack'    // Before this unit attacks
  | 'after-attack';    // After this unit attacks

export interface ReactionTriggerContext {
  triggerType: ReactionTriggerType;
  reactor: CombatUnit;
  reactorPosition: Position;
  attacker?: CombatUnit;
  attackerPosition?: Position;
  target?: CombatUnit;
  targetPosition?: Position;
  damageDealt?: number;
  state: CombatState;
}

export interface ReactionResult {
  shouldExecute: boolean;
  newState: CombatState;
  animations?: CinematicSequence[];
  logMessages: string[];
}
```

#### 3.2 Create ReactionHandler

**New File**: [react-app/src/models/combat/abilities/ReactionHandler.ts](../../react-app/src/models/combat/abilities/ReactionHandler.ts)

```typescript
export class ReactionHandler {
  /**
   * Check if unit has reaction ability that triggers for this event
   */
  static checkReaction(context: ReactionTriggerContext): ReactionResult {
    const result: ReactionResult = {
      shouldExecute: false,
      newState: context.state,
      animations: [],
      logMessages: []
    };

    // Get assigned reaction ability
    const reactionAbility = this.getAssignedReaction(context.reactor);
    if (!reactionAbility) {
      return result;
    }

    // Check if reaction triggers for this event
    if (!this.shouldTrigger(reactionAbility, context)) {
      return result;
    }

    // Execute reaction ability
    const abilityContext: AbilityExecutionContext = {
      caster: context.reactor,
      casterPosition: context.reactorPosition,
      target: context.attacker ?? context.target,
      targetPosition: context.attackerPosition ?? context.targetPosition,
      state: context.state
    };

    const executionResult = AbilityExecutor.execute(reactionAbility, abilityContext);

    result.shouldExecute = executionResult.success;
    result.newState = executionResult.newState;
    result.animations = executionResult.animations;
    result.logMessages = [
      `${context.reactor.name} used ${reactionAbility.name}!`,
      ...executionResult.logMessages
    ];

    return result;
  }

  private static getAssignedReaction(unit: CombatUnit): CombatAbility | null {
    if (!('reactionAbility' in unit)) return null;
    return (unit as HumanoidUnit).reactionAbility;
  }

  private static shouldTrigger(
    ability: CombatAbility,
    context: ReactionTriggerContext
  ): boolean {
    // Check trigger type from ability tags
    const triggerTag = ability.tags.find(tag =>
      tag === 'before-attacked' ||
      tag === 'after-attacked' ||
      tag === 'before-attack' ||
      tag === 'after-attack'
    );

    return triggerTag === context.triggerType;
  }
}
```

#### 3.3 Update UnitTurnPhaseHandler.executeAttack()

Add reaction trigger points:

```typescript
executeAttack(targetPosition: Position): CombatState {
  const target = this.currentState!.unitManifest.getUnitAt(targetPosition);
  if (!target) return this.currentState!;

  let newState = this.currentState!;

  // TRIGGER: before-attack (attacker's reaction)
  const beforeAttackReaction = ReactionHandler.checkReaction({
    triggerType: 'before-attack',
    reactor: this.activeUnit!,
    reactorPosition: this.activePosition!,
    target,
    targetPosition,
    state: newState
  });

  if (beforeAttackReaction.shouldExecute) {
    newState = beforeAttackReaction.newState;
    for (const msg of beforeAttackReaction.logMessages) {
      newState = CombatLogManager.addMessage(newState, msg);
    }
  }

  // TRIGGER: before-attacked (defender's reaction)
  const beforeAttackedReaction = ReactionHandler.checkReaction({
    triggerType: 'before-attacked',
    reactor: target,
    reactorPosition: targetPosition,
    attacker: this.activeUnit!,
    attackerPosition: this.activePosition!,
    state: newState
  });

  if (beforeAttackedReaction.shouldExecute) {
    newState = beforeAttackedReaction.newState;
    for (const msg of beforeAttackedReaction.logMessages) {
      newState = CombatLogManager.addMessage(newState, msg);
    }
  }

  // ... existing attack logic (hit roll, damage) ...

  // TRIGGER: after-attacked (defender's reaction)
  const afterAttackedReaction = ReactionHandler.checkReaction({
    triggerType: 'after-attacked',
    reactor: target,
    reactorPosition: targetPosition,
    attacker: this.activeUnit!,
    attackerPosition: this.activePosition!,
    damageDealt: damageAmount,
    state: newState
  });

  if (afterAttackedReaction.shouldExecute) {
    newState = afterAttackedReaction.newState;
    for (const msg of afterAttackedReaction.logMessages) {
      newState = CombatLogManager.addMessage(newState, msg);
    }
  }

  // TRIGGER: after-attack (attacker's reaction)
  const afterAttackReaction = ReactionHandler.checkReaction({
    triggerType: 'after-attack',
    reactor: this.activeUnit!,
    reactorPosition: this.activePosition!,
    target,
    targetPosition,
    damageDealt: damageAmount,
    state: newState
  });

  if (afterAttackReaction.shouldExecute) {
    newState = afterAttackReaction.newState;
    for (const msg of afterAttackReaction.logMessages) {
      newState = CombatLogManager.addMessage(newState, msg);
    }
  }

  return newState;
}
```

#### 3.4 Update ability-database.yaml

Add trigger tags to reaction abilities:

```yaml
- id: "repost"
  name: "Repost"
  description: "Counter-attack after being attacked"
  abilityType: "Reaction"
  experiencePrice: 150
  tags: ["physical", "counter", "after-attacked"]
  effects:
    - type: "damage-physical"
      target: "enemy"
      value: 0.5  # 50% of physical power

- id: "slippery"
  name: "Slippery"
  description: "Gain speed boost after taking damage"
  abilityType: "Reaction"
  experiencePrice: 100
  tags: ["buff", "speed", "after-attacked"]
  effects:
    - type: "stat-bonus"
      stat: "speed"
      value: 5
      duration: 2
```

#### 3.5 Testing

**File**: Create [ReactionHandler.test.ts](../../react-app/src/models/combat/abilities/ReactionHandler.test.ts)

Test cases:
- ✅ Reaction triggers on correct event
- ✅ Reaction does not trigger on wrong event
- ✅ Multiple reactions in sequence (before/after)
- ✅ Reaction ability execution
- ✅ Combat log messages
- ✅ Unit without reaction ability (no-op)

---

### Phase 4: Movement Ability System

**Goal**: Trigger movement abilities automatically after unit moves or chooses not to move.

#### 4.1 Define Movement Triggers

**New File**: [react-app/src/models/combat/abilities/MovementTrigger.ts](../../react-app/src/models/combat/abilities/MovementTrigger.ts)

```typescript
export type MovementTriggerType =
  | 'after-move'    // After unit moves
  | 'after-no-move'; // After unit chooses not to move

export interface MovementTriggerContext {
  triggerType: MovementTriggerType;
  mover: CombatUnit;
  startPosition: Position;
  endPosition: Position;
  tilesMoved: number;
  state: CombatState;
}

export interface MovementAbilityResult {
  shouldExecute: boolean;
  newState: CombatState;
  logMessages: string[];
}
```

#### 4.2 Create MovementAbilityHandler

**New File**: [react-app/src/models/combat/abilities/MovementAbilityHandler.ts](../../react-app/src/models/combat/abilities/MovementAbilityHandler.ts)

```typescript
export class MovementAbilityHandler {
  /**
   * Check if unit has movement ability that triggers
   */
  static checkMovementAbility(context: MovementTriggerContext): MovementAbilityResult {
    const result: MovementAbilityResult = {
      shouldExecute: false,
      newState: context.state,
      logMessages: []
    };

    // Get assigned movement ability
    const movementAbility = this.getAssignedMovement(context.mover);
    if (!movementAbility) {
      return result;
    }

    // Check if ability triggers for this movement type
    if (!this.shouldTrigger(movementAbility, context)) {
      return result;
    }

    // Execute movement ability
    const modifiedEffects = this.scaleEffects(movementAbility, context);

    for (const effect of modifiedEffects) {
      this.applyMovementEffect(effect, context, result);
    }

    result.shouldExecute = true;
    result.logMessages.unshift(`${context.mover.name} used ${movementAbility.name}!`);

    return result;
  }

  private static getAssignedMovement(unit: CombatUnit): CombatAbility | null {
    if (!('movementAbility' in unit)) return null;
    return (unit as HumanoidUnit).movementAbility;
  }

  private static shouldTrigger(
    ability: CombatAbility,
    context: MovementTriggerContext
  ): boolean {
    const triggerTag = ability.tags.find(tag =>
      tag === 'after-move' || tag === 'after-no-move'
    );

    return triggerTag === context.triggerType;
  }

  private static scaleEffects(
    ability: CombatAbility,
    context: MovementTriggerContext
  ): AbilityEffect[] {
    // Check if ability scales with distance
    const scalesWithDistance = ability.tags.includes('per-tile');

    if (!scalesWithDistance) {
      return ability.effects ?? [];
    }

    // Scale effect values by tiles moved
    return (ability.effects ?? []).map(effect => ({
      ...effect,
      value: effect.value * context.tilesMoved
    }));
  }

  private static applyMovementEffect(
    effect: AbilityEffect,
    context: MovementTriggerContext,
    result: MovementAbilityResult
  ): void {
    const unit = context.mover;

    switch (effect.type) {
      case 'heal':
        const healAmount = Math.min(effect.value, unit.wounds);
        unit.wounds = Math.max(0, unit.wounds - healAmount);
        result.logMessages.push(`${unit.name} restored ${healAmount} HP!`);
        break;

      case 'mana-restore':
        const manaAmount = Math.min(effect.value, unit.maxMana - unit.currentMana);
        unit.currentMana = Math.min(unit.maxMana, unit.currentMana + manaAmount);
        result.logMessages.push(`${unit.name} restored ${manaAmount} mana!`);
        break;

      case 'stat-bonus':
        if ('addStatModifier' in unit && effect.stat) {
          const modifier: StatModifier = {
            id: `movement-${unit.name}-${Date.now()}`,
            stat: effect.stat,
            value: effect.value,
            duration: effect.duration ?? 2,
            source: 'movement-ability',
            sourceName: 'Movement'
          };
          (unit as HumanoidUnit).addStatModifier(modifier);
          result.logMessages.push(`${unit.name}'s ${effect.stat} increased!`);
        }
        break;

      default:
        console.warn(`Unsupported movement effect type: ${effect.type}`);
    }
  }
}
```

#### 4.3 Update UnitTurnPhaseHandler

Add movement ability trigger points:

```typescript
// After movement animation completes
completeMoveAnimation(): void {
  // ... existing code to update position ...

  // TRIGGER: after-move
  const tilesMoved = Math.abs(this.activePosition!.x - this.originalPosition!.x) +
                     Math.abs(this.activePosition!.y - this.originalPosition!.y);

  const movementResult = MovementAbilityHandler.checkMovementAbility({
    triggerType: 'after-move',
    mover: this.activeUnit!,
    startPosition: this.originalPosition!,
    endPosition: this.activePosition!,
    tilesMoved,
    state: this.currentState!
  });

  if (movementResult.shouldExecute) {
    this.currentState = movementResult.newState;
    for (const msg of movementResult.logMessages) {
      this.currentState = CombatLogManager.addMessage(this.currentState, msg);
    }
  }

  // ... rest of existing code ...
}

// When unit chooses not to move (Delay/End Turn without moving)
executeAction(action: TurnAction): CombatState {
  if ((action.type === 'delay' || action.type === 'end-turn') && !this.unitHasMoved) {
    // TRIGGER: after-no-move
    const movementResult = MovementAbilityHandler.checkMovementAbility({
      triggerType: 'after-no-move',
      mover: this.activeUnit!,
      startPosition: this.activePosition!,
      endPosition: this.activePosition!,
      tilesMoved: 0,
      state: this.currentState!
    });

    if (movementResult.shouldExecute) {
      newState = movementResult.newState;
      for (const msg of movementResult.logMessages) {
        newState = CombatLogManager.addMessage(newState, msg);
      }
    }
  }

  // ... existing action execution code ...
}
```

#### 4.4 Update ability-database.yaml

Add trigger tags to movement abilities:

```yaml
- id: "regenerate"
  name: "Regenerate"
  description: "Gain 3 HP per tile traveled"
  abilityType: "Movement"
  experiencePrice: 100
  tags: ["healing", "after-move", "per-tile"]
  effects:
    - type: "heal"
      value: 3

- id: "meditate"
  name: "Meditate"
  description: "Restore 10% mana if you don't move"
  abilityType: "Movement"
  experiencePrice: 75
  tags: ["mana", "after-no-move"]
  effects:
    - type: "mana-restore"
      value: 10  # Percentage-based calculation in handler

- id: "power-walker"
  name: "Power Walker"
  description: "Gain +2 Physical Power after moving"
  abilityType: "Movement"
  experiencePrice: 125
  tags: ["buff", "after-move"]
  effects:
    - type: "stat-bonus"
      stat: "physicalPower"
      value: 2
      duration: 2
```

#### 4.5 Testing

**File**: Create [MovementAbilityHandler.test.ts](../../react-app/src/models/combat/abilities/MovementAbilityHandler.test.ts)

Test cases:
- ✅ Movement ability triggers after move
- ✅ No-move ability triggers when unit doesn't move
- ✅ Per-tile scaling (regenerate 3 HP × 4 tiles = 12 HP)
- ✅ Percentage-based effects (meditate 10% of max mana)
- ✅ Stat bonuses from movement
- ✅ Combat log messages
- ✅ Unit without movement ability (no-op)

---

## Phase 5: UI and Polish

### 5.1 Combat Log Color Coding

Add ability-related message colors to [colors.ts](../../react-app/src/models/combat/managers/panels/colors.ts):

```typescript
export const ABILITY_USED_COLOR = '#00ffff';    // Cyan for ability names
export const REACTION_COLOR = '#ff00ff';        // Magenta for reactions
export const MOVEMENT_ABILITY_COLOR = '#ffff00'; // Yellow for movement abilities
export const STAT_CHANGE_COLOR = '#00ff00';     // Green for buffs
export const DEBUFF_COLOR = '#ff8800';          // Orange for debuffs
```

### 5.2 Ability Targeting UI

Create targeting overlay for abilities with range requirements:
- Show valid target tiles in range
- Display ability name and description on hover
- Show projected damage/healing values
- Highlight selected target

### 5.3 Ability Cooldown Display (Future)

Prepare for cooldown system (not implemented yet):
- Add `cooldown` field to AbilityEffect
- Track remaining cooldown in unit state
- Grey out abilities on cooldown in menu
- Show cooldown counter

### 5.4 Mana Bar Display

Add mana visualization to UnitInfoContent:
- Show current/max mana below HP bar
- Color code: blue for full, grey for empty
- Update after ability use

---

## Implementation Timeline

### Week 1: Passive Abilities (Phase 1)
- Day 1-2: Update HumanoidUnit, add effects field
- Day 3: Update AbilityDataLoader and YAML
- Day 4-5: Testing and bug fixes

### Week 2: Action Abilities (Phase 2)
- Day 1-3: Create AbilityExecutor and effect handlers
- Day 4: Update UnitTurnPhaseHandler
- Day 5: Create AbilityMenuContent panel
- Day 6-7: Testing and integration

### Week 3: Reaction Abilities (Phase 3)
- Day 1-2: Create ReactionHandler and trigger system
- Day 3-4: Integrate with UnitTurnPhaseHandler
- Day 5: Update YAML with trigger tags
- Day 6-7: Testing

### Week 4: Movement Abilities (Phase 4)
- Day 1-2: Create MovementAbilityHandler
- Day 3-4: Integrate with movement flow
- Day 5: Update YAML
- Day 6-7: Testing

### Week 5: Polish and Integration (Phase 5)
- Day 1-2: UI improvements (targeting, mana bar)
- Day 3-4: Combat log color coding
- Day 5: End-to-end testing
- Day 6-7: Bug fixes and documentation

---

## Testing Strategy

### Unit Tests
- ✅ AbilityExecutor for all effect types
- ✅ ReactionHandler trigger conditions
- ✅ MovementAbilityHandler scaling
- ✅ HumanoidUnit passive ability assignment
- ✅ Stat modifier integration

### Integration Tests
- ✅ Full combat scenario with all ability types
- ✅ Ability chaining (reaction → stat modifier → next turn)
- ✅ Edge cases (no mana, out of range, KO'd units)
- ✅ Serialization with active abilities and modifiers

### Manual Testing Scenarios
1. **Passive Buff**: Assign "Meat Shield" → verify max HP increase → save/load
2. **Action Damage**: Use "Fireball" → verify mana cost → verify damage → verify animation
3. **Action Heal**: Use "Heal" → verify mana cost → verify healing → verify log
4. **Reaction Counter**: Equip "Repost" → get attacked → verify counter-attack
5. **Movement Heal**: Equip "Regenerate" → move 3 tiles → verify 9 HP restored
6. **Movement Static**: Equip "Meditate" → don't move → verify mana restore

---

## Dependencies and Prerequisites

### Completed
- ✅ StatModifier system (Phases 1-5)
- ✅ CombatUnit interface with abilities array
- ✅ HumanoidUnit with ability slots
- ✅ UnitTurnPhaseHandler with action execution
- ✅ Combat log system
- ✅ Animation system (AttackAnimationSequence)

### Required for Implementation
- ✅ ability-database.yaml with all ability definitions
- ✅ AbilityDataLoader for parsing YAML
- ✅ CombatAbility interface
- ✅ UnitMovementSequence for movement animations

### Out of Scope (Future Features)
- ❌ Learning abilities (XP spending UI)
- ❌ Assigning abilities to slots (camp/rest screen)
- ❌ Equipment permission system
- ❌ Status effect system
- ❌ Ability cooldowns (planned but not implemented)

---

## Success Criteria

### Phase 1 Complete When:
- [ ] Passive abilities automatically apply stat modifiers
- [ ] Stat getters reflect passive ability bonuses
- [ ] Swapping passives removes old and applies new modifiers
- [ ] Serialization preserves passive ability state
- [ ] All tests passing

### Phase 2 Complete When:
- [ ] Action abilities appear in combat menu
- [ ] Abilities can be executed with targeting
- [ ] Mana costs enforced
- [ ] Damage/healing/buffs apply correctly
- [ ] Combat log shows ability usage
- [ ] All tests passing

### Phase 3 Complete When:
- [ ] Reaction abilities trigger automatically
- [ ] Trigger timing correct (before vs after)
- [ ] Reaction effects apply correctly
- [ ] Combat log shows reaction usage
- [ ] All tests passing

### Phase 4 Complete When:
- [ ] Movement abilities trigger after move/no-move
- [ ] Per-tile scaling works correctly
- [ ] Percentage-based effects calculated correctly
- [ ] Combat log shows movement ability usage
- [ ] All tests passing

### Phase 5 Complete When:
- [ ] UI shows ability targeting clearly
- [ ] Mana bar displays current/max mana
- [ ] Combat log uses color coding
- [ ] Full combat scenario works end-to-end
- [ ] Documentation updated

---

## Notes and Considerations

### Performance
- Ability execution is synchronous (no async needed)
- Effect handlers are lightweight (no heavy calculations)
- Stat modifiers already optimized (Phase 1-5 complete)
- Animation sequences reuse existing infrastructure

### Extensibility
- Effect system designed for easy addition of new types
- Trigger system supports future trigger types
- YAML-driven allows non-programmer ability design
- Handlers separated by ability type for maintainability

### Edge Cases
- KO'd units cannot use or be targeted by abilities (existing KO system handles this)
- Abilities that would exceed max HP/mana are clamped
- Zero-range abilities target self automatically
- Missing ability effects array treated as empty array (no crash)

### Future Enhancements (Not in Current Scope)
- Ability cooldowns (add cooldown tracking to unit state)
- Area-of-effect abilities (add AoE targeting system)
- Conditional abilities (add requirement checks)
- Combo abilities (add ability chaining system)
- Equipment-based abilities (add equipment integration)
