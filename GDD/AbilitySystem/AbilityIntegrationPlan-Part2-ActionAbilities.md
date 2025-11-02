# Ability System Integration - Part 2: Action Abilities

**Version:** 1.0
**Created:** 2025-11-02
**Related:** [AbilitySystemOverview.md](AbilitySystemOverview.md), [Part1-PassiveAbilities.md](AbilityIntegrationPlan-Part1-PassiveAbilities.md), [CombatHierarchy.md](../../CombatHierarchy.md), [GeneralGuidelines.md](../../GeneralGuidelines.md)

## Purpose

This document details the implementation of **Action Ability execution** during combat. Action abilities are explicitly chosen from the combat menu during a unit's turn and can deal damage, heal, apply buffs/debuffs, or consume resources.

**Depends On**: Part 1: Passive Abilities (✅ MUST BE COMPLETE FIRST)

## Scope

**IN SCOPE:**
- ✅ AbilityExecutor for effect resolution
- ✅ Effect handlers (damage, healing, stat modifiers, mana cost)
- ✅ Ability selection menu in combat
- ✅ Ability targeting system
- ✅ Combat integration with UnitTurnPhaseHandler
- ✅ Animations and visual feedback
- ✅ Combat log integration

**OUT OF SCOPE:**
- ❌ Reaction abilities (Part 3)
- ❌ Movement abilities (Part 4)
- ❌ Status effects (Stun, Confusion, etc.)
- ❌ Equipment permissions

## Implementation

### Phase 2.1: Create AbilityExecutor

**New File**: [react-app/src/models/combat/abilities/AbilityExecutor.ts](../../react-app/src/models/combat/abilities/AbilityExecutor.ts)

This is the core ability execution engine.

#### 2.1.1: Define Execution Context and Result

**Performance Pattern**: Per [GeneralGuidelines.md](../../GeneralGuidelines.md) "WeakMap for Animation Data", use WeakMap for per-unit tracking to avoid duplicate name issues:

```typescript
import type { CombatUnit } from '../CombatUnit';
import type { CombatAbility, AbilityEffect } from '../CombatAbility';
import type { CombatState } from '../CombatState';
import type { Position } from '../Position';
import type { CinematicSequence } from '../cinematic/CinematicSequence';
import type { StatModifier } from '../StatModifier';

/**
 * Context information for ability execution
 */
export interface AbilityExecutionContext {
  /** Unit using the ability */
  caster: CombatUnit;

  /** Caster's position on the map */
  casterPosition: Position;

  /** Target unit (if single-target ability) */
  target?: CombatUnit;

  /** Target position (for area effects) */
  targetPosition?: Position;

  /** Current combat state */
  state: CombatState;
}

/**
 * Result of ability execution
 */
export interface AbilityExecutionResult {
  /** Whether execution succeeded */
  success: boolean;

  /** Updated combat state */
  newState: CombatState;

  /** Animation sequences to play */
  animations?: CinematicSequence[];

  /** Combat log messages */
  logMessages: string[];

  /** Damage dealt per unit (WeakMap prevents duplicate name bugs) */
  damages?: WeakMap<CombatUnit, number>;

  /** Healing received per unit */
  heals?: WeakMap<CombatUnit, number>;

  /** Stat modifiers applied per unit */
  modifiers?: WeakMap<CombatUnit, StatModifier[]>;
}
```

**Why WeakMap**: Prevents bugs when multiple units share the same name (e.g., 3 "Goblin" units). Per [GeneralGuidelines.md](../../GeneralGuidelines.md), this avoids the "Using Object Properties as Unique Keys" pitfall.

#### 2.1.2: Implement AbilityExecutor

```typescript
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
      damages: new WeakMap(), // ✅ Use WeakMap for per-unit tracking
      heals: new WeakMap(),
      modifiers: new WeakMap()
    };

    // Validate ability can be executed
    if (!this.canExecute(ability, context)) {
      results.logMessages.push(`Cannot execute ${ability.name}`);
      return results;
    }

    // Check mana cost
    const manaCost = this.getManaCost(ability);
    if (manaCost > 0 && context.caster.mana < manaCost) {
      results.logMessages.push(`Not enough mana to use ${ability.name}`);
      return results;
    }

    // Consume mana
    if (manaCost > 0 && 'consumeMana' in context.caster) {
      (context.caster as any).consumeMana(manaCost);
    }

    // Process each effect in sequence
    for (const effect of ability.effects ?? []) {
      this.applyEffect(effect, context, results);
    }

    results.success = true;
    return results;
  }

  /**
   * Check if ability can be executed
   */
  private static canExecute(
    ability: CombatAbility,
    context: AbilityExecutionContext
  ): boolean {
    // Check if caster is KO'd
    if (context.caster.health <= 0) {
      return false;
    }

    // Check if ability has effects
    if (!ability.effects || ability.effects.length === 0) {
      return false;
    }

    // Check if target is required and present
    const requiresTarget = ability.effects.some(e =>
      e.target === 'target' || e.target === 'enemy' || e.target === 'ally'
    );
    if (requiresTarget && !context.target) {
      return false;
    }

    return true;
  }

  /**
   * Get total mana cost of ability
   */
  private static getManaCost(ability: CombatAbility): number {
    // Check for mana-cost effect type
    const manaCostEffect = ability.effects?.find(e => e.type === 'mana-cost');
    if (manaCostEffect) {
      return typeof manaCostEffect.value === 'number' ? manaCostEffect.value : 0;
    }

    // Default: no cost
    return 0;
  }

  /**
   * Apply a single effect
   */
  private static applyEffect(
    effect: AbilityEffect,
    context: AbilityExecutionContext,
    results: AbilityExecutionResult
  ): void {
    const target = this.resolveTarget(effect, context);
    if (!target) return;

    switch (effect.type) {
      case 'damage-physical':
      case 'damage-magical':
        this.applyDamage(effect, context, results, target);
        break;

      case 'heal':
        this.applyHeal(effect, context, results, target);
        break;

      case 'stat-bonus':
      case 'stat-penalty':
        this.applyStatModifier(effect, context, results, target);
        break;

      case 'mana-restore':
        this.applyManaRestore(effect, context, results, target);
        break;

      case 'action-timer-modify':
        this.applyActionTimerModify(effect, context, results, target);
        break;

      default:
        console.warn(`Unsupported effect type: ${effect.type}`);
    }
  }

  /**
   * Resolve effect target
   */
  private static resolveTarget(
    effect: AbilityEffect,
    context: AbilityExecutionContext
  ): CombatUnit | null {
    switch (effect.target) {
      case 'self':
        return context.caster;

      case 'target':
      case 'enemy':
      case 'ally':
        return context.target ?? null;

      default:
        console.warn(`Unsupported target type: ${effect.target}`);
        return null;
    }
  }

  // Effect implementation methods follow...
}
```

#### 2.1.3: Implement Effect Handlers

Add these methods to `AbilityExecutor`:

```typescript
/**
 * Apply damage effect
 */
private static applyDamage(
  effect: AbilityEffect,
  context: AbilityExecutionContext,
  results: AbilityExecutionResult,
  target: CombatUnit
): void {
  const isMagical = effect.type === 'damage-magical';

  // Calculate base damage from effect value
  const baseDamage = this.calculateDamageValue(effect, context.caster, isMagical);

  // Hit roll (unless auto-hit)
  if (!effect.params?.autoHit) {
    const hitChance = isMagical
      ? this.calculateMagicHitChance(context.caster, target)
      : this.calculatePhysicalHitChance(context.caster, target);

    const roll = Math.random() * 100;
    if (roll > hitChance) {
      const targetColor = target.isPlayerControlled ? '#00ff00' : '#ff0000';
      results.logMessages.push(`<color=${targetColor}>${target.name}</color> evaded!`);
      return;
    }
  }

  // Apply damage
  if ('addWounds' in target) {
    (target as any).addWounds(baseDamage);
  }
  results.damages?.set(target, baseDamage);

  // Combat log with color coding (per CombatHierarchy.md)
  const casterColor = context.caster.isPlayerControlled ? '#00ff00' : '#ff0000';
  const targetColor = target.isPlayerControlled ? '#00ff00' : '#ff0000';
  const abilityName = effect.params?.abilityName ?? 'ability';

  results.logMessages.push(
    `<color=${casterColor}>${context.caster.name}</color> used ${abilityName}! ` +
    `<color=${targetColor}>${target.name}</color> took ${baseDamage} damage!`
  );
}

/**
 * Apply healing effect
 */
private static applyHeal(
  effect: AbilityEffect,
  context: AbilityExecutionContext,
  results: AbilityExecutionResult,
  target: CombatUnit
): void {
  const healAmount = this.calculateHealValue(effect, context.caster);
  const actualHeal = Math.min(healAmount, target.wounds);

  if ('removeWounds' in target) {
    (target as any).removeWounds(actualHeal);
  }
  results.heals?.set(target, actualHeal);

  const targetColor = target.isPlayerControlled ? '#00ff00' : '#ff0000';
  results.logMessages.push(
    `<color=${targetColor}>${target.name}</color> restored ${actualHeal} HP!`
  );
}

/**
 * Apply stat modifier (buff or debuff)
 */
private static applyStatModifier(
  effect: AbilityEffect,
  context: AbilityExecutionContext,
  results: AbilityExecutionResult,
  target: CombatUnit
): void {
  if (!('addStatModifier' in target)) {
    console.warn('Target does not support stat modifiers');
    return;
  }

  if (!effect.params?.stat) {
    console.warn('Stat modifier effect missing stat parameter');
    return;
  }

  const modifier: StatModifier = {
    id: `ability-${context.caster.name}-${Date.now()}`,
    stat: effect.params.stat,
    value: typeof effect.value === 'number' ? effect.value : 0,
    duration: effect.duration ?? -1,
    source: 'ability',
    sourceName: effect.params?.abilityName ?? 'Ability'
  };

  (target as any).addStatModifier(modifier);

  // Track modifier
  const existingModifiers = results.modifiers?.get(target) ?? [];
  existingModifiers.push(modifier);
  results.modifiers?.set(target, existingModifiers);

  const targetColor = target.isPlayerControlled ? '#00ff00' : '#ff0000';
  const isDebuff = modifier.value < 0;
  const buffType = isDebuff ? 'decreased' : 'increased';

  results.logMessages.push(
    `<color=${targetColor}>${target.name}</color>'s ${modifier.stat} ${buffType}!`
  );
}

/**
 * Apply mana restore effect
 */
private static applyManaRestore(
  effect: AbilityEffect,
  context: AbilityExecutionContext,
  results: AbilityExecutionResult,
  target: CombatUnit
): void {
  if (!('restoreMana' in target)) {
    console.warn('Target does not support mana');
    return;
  }

  const manaAmount = typeof effect.value === 'number' ? effect.value : 0;
  const actualRestore = Math.min(manaAmount, target.maxMana - target.mana);

  (target as any).restoreMana(actualRestore);

  const targetColor = target.isPlayerControlled ? '#00ff00' : '#ff0000';
  results.logMessages.push(
    `<color=${targetColor}>${target.name}</color> restored ${actualRestore} mana!`
  );
}

/**
 * Apply action timer modification
 */
private static applyActionTimerModify(
  effect: AbilityEffect,
  context: AbilityExecutionContext,
  results: AbilityExecutionResult,
  target: CombatUnit
): void {
  if (!('setActionTimer' in target)) {
    console.warn('Target does not support action timer');
    return;
  }

  const currentTimer = target.actionTimer;
  const modifyAmount = typeof effect.value === 'number' ? effect.value : 0;
  const newTimer = Math.max(0, currentTimer + modifyAmount);

  (target as any).setActionTimer(newTimer);

  const targetColor = target.isPlayerControlled ? '#00ff00' : '#ff0000';
  results.logMessages.push(
    `<color=${targetColor}>${target.name}</color>'s action timer changed by ${modifyAmount}!`
  );
}

/**
 * Calculate damage value (supports formulas)
 */
private static calculateDamageValue(
  effect: AbilityEffect,
  caster: CombatUnit,
  isMagical: boolean
): number {
  if (typeof effect.value === 'number') {
    return Math.floor(effect.value);
  }

  // Formula support (future enhancement)
  // For now, treat as 0
  return 0;
}

/**
 * Calculate heal value
 */
private static calculateHealValue(
  effect: AbilityEffect,
  caster: CombatUnit
): number {
  if (typeof effect.value === 'number') {
    return Math.floor(effect.value);
  }

  // Formula support (future enhancement)
  return 0;
}

/**
 * Calculate physical hit chance
 */
private static calculatePhysicalHitChance(
  attacker: CombatUnit,
  defender: CombatUnit
): number {
  // Simplified hit calculation
  const baseChance = 75;
  const evadeBonus = defender.physicalEvade;
  return Math.max(10, Math.min(95, baseChance - evadeBonus));
}

/**
 * Calculate magic hit chance
 */
private static calculateMagicHitChance(
  attacker: CombatUnit,
  defender: CombatUnit
): number {
  // Simplified hit calculation
  const baseChance = 85;
  const evadeBonus = defender.magicEvade;
  return Math.max(20, Math.min(95, baseChance - evadeBonus));
}
```

#### 2.1.6: Combat Log Color Coding

Per [CombatHierarchy.md](../../CombatHierarchy.md), combat log uses colored names for player/enemy distinction.

**Create** color constants in [colors.ts](../../react-app/src/models/combat/managers/panels/colors.ts):

```typescript
// Existing colors...
export const PLAYER_NAME_COLOR = '#00ff00';    // Green
export const ENEMY_NAME_COLOR = '#ff0000';     // Red

// New ability colors
export const ABILITY_USED_COLOR = '#00ffff';   // Cyan for ability names
export const BUFF_COLOR = '#00ff00';           // Green for buffs
export const DEBUFF_COLOR = '#ff8800';         // Orange for debuffs
export const HEAL_COLOR = '#00ff00';           // Green for healing
export const DAMAGE_COLOR = '#ff0000';         // Red for damage
```

#### 2.1.7: Serialization Pattern

**IMPORTANT**: Ability animations are **transient** - don't serialize mid-animation state.

Per [CombatHierarchy.md](../../CombatHierarchy.md) serialization patterns:
- `CombatState` fields are serialized
- Phase handler instance variables are NOT serialized
- Animations must complete before save, or be discarded

**Pattern** (in CombatView save handler):
```typescript
const handleSave = () => {
  // ❌ DON'T: Save during ability animation
  if (phaseHandlerRef.current?.isAbilityAnimating?.()) {
    console.warn('Cannot save during ability animation');
    return;
  }

  // ✅ DO: Only save when phase is in stable state
  const savedState = serializeCombatState(combatState);
  // ...
}
```

**Rationale**: Mid-animation state can't be reliably restored (animation progress, tinting buffers, etc.).

### Phase 2.2: Update UnitTurnPhaseHandler

**File**: [react-app/src/models/combat/UnitTurnPhaseHandler.ts](../../react-app/src/models/combat/UnitTurnPhaseHandler.ts)

Add ability execution support:

```typescript
import { AbilityExecutor, type AbilityExecutionContext } from './abilities/AbilityExecutor';

// Add new method
executeAbility(abilityId: string, targetPosition?: Position): CombatState {
  const ability = this.activeUnit!.learnedAbilities.find(a => a.id === abilityId);
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
    // TODO: Trigger animations (Phase 2.6)
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

#### 2.2.4: Mouse Event Performance

Per [GeneralGuidelines.md](../../GeneralGuidelines.md) "Mouse Event Performance":

**❌ DON'T**: Call renderFrame() in mouse move handlers
```typescript
// BAD: Blocks animation loop
handleMouseMove(x, y) {
  this.updateAbilityTargetHover(x, y);
  renderFrame(); // Can fire 100+ times/second!
}
```

**✅ DO**: Update state only, let animation loop render
```typescript
handleMouseMove(x, y) {
  this.updateAbilityTargetHover(x, y);
  // Animation loop will render on next frame (~16ms)
}
```

**Rationale**: Mouse events can fire 100+ times/sec. Synchronous rendering blocks animation loop.

### Phase 2.3: Add Ability Menu Panel

**New File**: [react-app/src/models/combat/managers/panels/AbilityMenuContent.ts](../../react-app/src/models/combat/managers/panels/AbilityMenuContent.ts)

```typescript
import type { PanelContent } from './PanelContent';
import { PanelButton } from './PanelButton';
import type { CombatAbility } from '../../CombatAbility';
import { TITLE_FONT_ID } from './colors';

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

  render(ctx: CanvasRenderingContext2D, fontRenderer: any, fontAtlasImage: any): void {
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

  handleMouseMove(x: number, y: number): void {
    for (const button of this.buttons) {
      button.handleMouseMove(x, y);
    }
  }

  handleKeyDown(key: string): boolean {
    return false;
  }

  update(deltaTime: number): void {
    // No updates needed
  }
}
```

#### 2.3.1: Cache AbilityMenuContent Instance

Per [GeneralGuidelines.md](../../GeneralGuidelines.md) state management patterns, cache UI components with state:

**File**: [UnitTurnPhaseHandler.ts](../../react-app/src/models/combat/UnitTurnPhaseHandler.ts)

```typescript
class UnitTurnPhaseHandler {
  private cachedAbilityMenu: AbilityMenuContent | null = null;

  // Cache ability menu to preserve hover state
  private getAbilityMenuContent(): AbilityMenuContent {
    if (!this.cachedAbilityMenu) {
      const actionAbilities = Array.from(this.activeUnit!.learnedAbilities)
        .filter(a => a.abilityType === 'Action');

      this.cachedAbilityMenu = new AbilityMenuContent(
        actionAbilities,
        (abilityId) => this.onAbilitySelect(abilityId),
        () => this.onCancelAbility()
      );
    }
    return this.cachedAbilityMenu;
  }

  onTurnEnd(): void {
    // Clear cached menu when turn ends
    this.cachedAbilityMenu = null;
    super.onTurnEnd();
  }
}
```

**Rationale**: Per [GeneralGuidelines.md](../../GeneralGuidelines.md), "Cache instances that maintain state" - ability menu has hover state that must persist across frames.

### Phase 2.4: Update ActionsMenuContent

**File**: [react-app/src/models/combat/managers/panels/ActionsMenuContent.ts](../../react-app/src/models/combat/managers/panels/ActionsMenuContent.ts)

Add "Ability" button to actions menu:

```typescript
private initializeButtons(): void {
  // ... existing buttons ...

  // Add Ability button if unit has action abilities
  const actionAbilities = Array.from(this.unit.learnedAbilities)
    .filter(a => a.abilityType === 'Action');

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

### Phase 2.5: Ability Targeting UI

#### 2.5.1: Coordinate Systems

Per [GeneralGuidelines.md](../../GeneralGuidelines.md) "Coordinate Systems":

**Three coordinate spaces**:
1. **Canvas Coordinates** (0-384px × 0-216px) - Mouse events
2. **Tile Coordinates** (0-31 cols × 0-17 rows) - Map logic
3. **Panel-Relative Coordinates** - UI panels

**Ability Targeting Flow**:
```typescript
// 1. Mouse event → Canvas coordinates
handleMouseMove(event: MouseEvent) {
  const canvasCoords = inputHandler.getCanvasCoordinates(event);

  // 2. Canvas → Tile coordinates
  const tileCoords = CombatMapRenderer.canvasToTileCoordinates(
    canvasCoords.x,
    canvasCoords.y,
    mapOffset,
    tileSize
  );

  // 3. Validate tile is in ability range
  if (this.isInAbilityRange(tileCoords)) {
    this.highlightedTarget = tileCoords;
  }
}
```

**Why**: Prevents off-by-one errors in targeting calculations.

### Phase 2.6: Ability Visual Effects Z-Ordering

Per [GeneralGuidelines.md](../../GeneralGuidelines.md) "Render Pipeline Z-Ordering":

**Ability Effect Rendering**:
- **`render()` (Before Units)**: Area-of-effect indicators, ground targeting circles
- **`renderUI()` (After Units)**: Floating damage numbers, healing text, buff/debuff icons

**Example - Damage Numbers in UnitTurnPhaseHandler**:
```typescript
renderUI(state: CombatState, encounter: CombatEncounter, context: PhaseRenderContext): void {
  // ... existing cursor rendering ...

  // Render floating damage numbers AFTER units (overlay)
  if (this.abilityAnimations.length > 0) {
    for (const anim of this.abilityAnimations) {
      anim.renderUI(context); // Floating text appears ON TOP of units
    }
  }
}
```

**Why**: Floating numbers/text must appear above units, ground effects must appear below.

#### 2.6.2: Cache Animation Buffers

Per [GeneralGuidelines.md](../../GeneralGuidelines.md) "Animation Sequence Pattern":

```typescript
export class AbilityAnimationSequence implements CinematicSequence {
  // Cache off-screen canvas for effect rendering
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  render(state, encounter, context): void {
    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = 12; // Tile size
      this.offscreenCanvas.height = 12;
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
      if (this.offscreenCtx) {
        this.offscreenCtx.imageSmoothingEnabled = false;
      }
    }
    // Reuse cached canvas every frame...
  }
}
```

**Why**: Avoids creating new canvas 60 times/sec (GC pressure).

### Phase 2.7: Testing

**File**: Create [react-app/src/models/combat/abilities/AbilityExecutor.test.ts](../../react-app/src/models/combat/abilities/AbilityExecutor.test.ts)

Test cases:
- ✅ Execute damage ability (physical and magical)
- ✅ Execute healing ability
- ✅ Execute stat buff/debuff ability
- ✅ Mana cost validation
- ✅ Hit/miss rolls
- ✅ Multiple effects in one ability
- ✅ Combat log messages generated
- ✅ WeakMap damage tracking works with duplicate names

## Success Criteria

Part 2 is complete when:

- ✅ Action abilities appear in combat menu
- ✅ Abilities can be executed with targeting
- ✅ Mana costs enforced
- ✅ Damage/healing/buffs apply correctly
- ✅ Combat log shows ability usage with color coding
- ✅ All 12+ unit tests passing
- ✅ AbilityExecutor fully implemented
- ✅ UI components cached correctly
- ✅ Z-ordering correct (damage numbers over units)

## Time Estimate

**Total: 20-28 hours**

- Create AbilityExecutor (4-6 hours)
- Effect handlers (4-6 hours)
- Update UnitTurnPhaseHandler (2-3 hours)
- Create AbilityMenuContent (2-3 hours)
- Update ActionsMenuContent (1-2 hours)
- Targeting UI (3-4 hours)
- Visual effects and animations (2-3 hours)
- Write tests (3-4 hours)
- Bug fixes and testing (2-3 hours)

## Next Step

After completing Part 2, proceed to **Part 3: Reaction Abilities** which enables automatic ability triggering in response to combat events.
