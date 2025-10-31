# Knocked Out Feature - Implementation Plan

**Version:** 1.0
**Created:** 2025-10-30
**Related:** [KOFeatureOverview.md](./KOFeatureOverview.md), [CombatHierarchy.md](../../CombatHierarchy.md)

## Implementation Phases

This document provides a detailed, step-by-step implementation plan organized into 7 phases. Each phase is designed to be independently testable and builds on the previous phase.

---

## Phase 1: Core KO State Detection

### Goal
Add `isKnockedOut` getter to the unit system that all other systems can rely on.

### Files to Modify
1. `models/combat/CombatUnit.ts`
2. `models/combat/HumanoidUnit.ts`
3. `models/combat/MonsterUnit.ts`

### Steps

#### 1.1 Add Interface Definition
**File:** `models/combat/CombatUnit.ts`

Add to the `CombatUnit` interface:
```typescript
/**
 * Returns true if this unit is knocked out (wounds >= maxHealth).
 * KO'd units cannot act, don't accumulate action timer, and appear at
 * the end of the turn order list with grey tint.
 */
readonly isKnockedOut: boolean;
```

**Location:** After the `isPlayerControlled` getter definition

#### 1.2 Implement in HumanoidUnit
**File:** `models/combat/HumanoidUnit.ts`

Add getter to `HumanoidUnit` class:
```typescript
get isKnockedOut(): boolean {
  return this.wounds >= this.maxHealth;
}
```

**Location:** After the `isPlayerControlled` getter implementation

#### 1.3 Implement in MonsterUnit
**File:** `models/combat/MonsterUnit.ts`

Add getter to `MonsterUnit` class:
```typescript
get isKnockedOut(): boolean {
  return this.wounds >= this.maxHealth;
}
```

**Location:** After the `isPlayerControlled` getter implementation (or near other getters)

### Testing Phase 1
1. Build project: `npm run build`
2. Run unit tests: `npm test -- HumanoidUnit.test.ts`
3. Verify no compilation errors
4. Manual test: Open combat, use browser console to check `unit.isKnockedOut` values

**Acceptance Criteria:**
- [ ] TypeScript compiles without errors
- [ ] `isKnockedOut` returns `false` for healthy units
- [ ] `isKnockedOut` returns `true` when `wounds >= maxHealth`

---

## Phase 2: Visual Rendering (Constants and Grey Tint)

### Goal
Add constants for KO rendering and implement grey tint for KO'd units on the map and turn order.

### Files to Modify
1. `models/combat/CombatConstants.ts`
2. `models/combat/rendering/CombatRenderer.ts`

### Steps

#### 2.1 Add Constants
**File:** `models/combat/CombatConstants.ts`

Add new section after `AI` section:
```typescript
KNOCKED_OUT: {
  // Map overlay text
  MAP_TEXT: 'KO' as const,
  MAP_TEXT_COLOR: '#ff0000' as const,     // Red
  MAP_FONT_ID: '15px-dungeonslant' as const,

  // Turn order label
  TURN_ORDER_TEXT: 'KO' as const,
  TURN_ORDER_COLOR: '#ff0000' as const,   // Red
  TURN_ORDER_FONT_ID: '7px-04b03' as const,

  // Grey tint settings (for canvas filter)
  TINT_FILTER: 'saturate(0%) brightness(70%)' as const,
}
```

#### 2.2 Update CombatRenderer.renderUnits()
**File:** `models/combat/rendering/CombatRenderer.ts`

Modify the `renderUnits()` method to apply grey tint:

**Find this block:**
```typescript
for (const placement of allUnits) {
  const { row, col } = placement.position;
  const screenX = col * this.tileSize;
  const screenY = row * this.tileSize;

  this.spriteRenderer.renderSprite(/* ... */);
}
```

**Replace with:**
```typescript
for (const placement of allUnits) {
  const { row, col } = placement.position;
  const screenX = col * this.tileSize;
  const screenY = row * this.tileSize;

  // Apply grey tint for KO'd units
  if (placement.unit.isKnockedOut) {
    this.ctx.filter = CombatConstants.KNOCKED_OUT.TINT_FILTER;
  }

  this.spriteRenderer.renderSprite(/* ... */);

  // Reset filter after rendering
  if (placement.unit.isKnockedOut) {
    this.ctx.filter = 'none';
  }
}
```

**Alternative approach** (if renderSprite call is complex):
```typescript
for (const placement of allUnits) {
  const { row, col } = placement.position;
  const screenX = col * this.tileSize;
  const screenY = row * this.tileSize;

  // Apply grey tint for KO'd units
  const isKO = placement.unit.isKnockedOut;
  if (isKO) {
    this.ctx.filter = CombatConstants.KNOCKED_OUT.TINT_FILTER;
  }

  this.spriteRenderer.renderSprite(
    this.ctx,
    placement.unit.spriteId,
    screenX,
    screenY,
    this.spriteImages,
    this.tileSize
  );

  // Reset filter
  if (isKO) {
    this.ctx.filter = 'none';
  }
}
```

### Testing Phase 2
1. Open combat encounter
2. Manually set unit wounds to maxHealth via console: `unit.wounds = unit.maxHealth`
3. Verify unit sprite on map appears grey/desaturated
4. Verify healthy units still render normally

**Acceptance Criteria:**
- [ ] KO'd units on map have grey tint
- [ ] Healthy units render with normal colors
- [ ] No visual artifacts or filter bleeding

---

## Phase 3: Map "KO" Text Overlay

### Goal
Render "KO" text centered on KO'd unit tiles on the battle map.

### Files to Modify
1. `models/combat/phases/UnitTurnPhaseHandler.ts` (or create shared utility)

### Steps

#### 3.1 Add KO Text Rendering in UnitTurnPhaseHandler

**File:** `models/combat/phases/UnitTurnPhaseHandler.ts`

**Find the `renderUI()` method.** It should have sections for rendering movement ranges, attack ranges, cursors, and attack animations.

**Add KO text rendering at the end** (after attack animations, before method closes):

```typescript
// Render "KO" text overlay for knocked out units
const allUnits = state.unitManifest.getAllUnits();
for (const placement of allUnits) {
  if (placement.unit.isKnockedOut) {
    const { row, col } = placement.position;
    const screenX = mapOffsetX + col * tileSize;
    const screenY = mapOffsetY + row * tileSize;

    // Center "KO" text on tile
    const koText = CombatConstants.KNOCKED_OUT.MAP_TEXT;
    const fontId = CombatConstants.KNOCKED_OUT.MAP_FONT_ID;
    const koColor = CombatConstants.KNOCKED_OUT.MAP_TEXT_COLOR;

    // Get font for text measurement
    const fontAtlasImage = context.assets.fonts.get(fontId);
    if (!fontAtlasImage) continue;

    const font = FontRegistry.getFont(fontId);
    if (!font) continue;

    // Measure text width
    const textWidth = FontAtlasRenderer.measureTextWidth(koText, font);

    // Center horizontally and vertically on tile
    const textX = screenX + (tileSize - textWidth) / 2;
    const textY = screenY + (tileSize - font.glyphHeight) / 2;

    // Render with shadow for visibility
    FontAtlasRenderer.renderTextWithShadow(
      context.ctx,
      koText,
      textX,
      textY,
      fontAtlasImage,
      font,
      koColor
    );
  }
}
```

**Note:** Make sure this is in `renderUI()`, not `render()`, so it appears AFTER units.

### Testing Phase 3
1. Open combat, KO a unit
2. Verify "KO" text appears centered on the unit's tile
3. Verify text is red with shadow for visibility
4. Verify text appears on top of unit sprite

**Acceptance Criteria:**
- [ ] "KO" text appears centered on KO'd unit tiles
- [ ] Text is red (#ff0000) and readable
- [ ] Text has shadow for visibility
- [ ] Text does not appear on healthy units

---

## Phase 4: Turn Order Display Updates

### Goal
Update TurnOrderRenderer to show KO'd units at the end with grey tint and "KO" label.

### Files to Modify
1. `models/combat/managers/renderers/TurnOrderRenderer.ts`

### Steps

#### 4.1 Update Unit Sorting
**File:** `models/combat/managers/renderers/TurnOrderRenderer.ts`

**Find the `render()` method.** Look for where units are displayed (likely loops through `this.units`).

**Option A: Sort units in place during render**

Add sorting logic at the start of `render()`:
```typescript
render(/* params */): void {
  // Sort units: active units by ticks-until-ready, then KO'd units at end
  const activeUnits = this.units.filter(u => !u.isKnockedOut);
  const koUnits = this.units.filter(u => u.isKnockedOut);

  // Sort active units by ticks-until-ready (existing logic)
  activeUnits.sort((a, b) => {
    const ticksA = Math.ceil((100 - a.actionTimer) / a.speed);
    const ticksB = Math.ceil((100 - b.actionTimer) / b.speed);
    if (ticksA !== ticksB) return ticksA - ticksB;
    return a.name.localeCompare(b.name);
  });

  // Combine: active first, KO'd last
  const sortedUnits = [...activeUnits, ...koUnits];

  // Use sortedUnits instead of this.units for rendering
  // ... rest of render logic
}
```

**Option B: Create helper method**

Add private method:
```typescript
private getSortedUnits(): CombatUnit[] {
  const activeUnits = this.units.filter(u => !u.isKnockedOut);
  const koUnits = this.units.filter(u => u.isKnockedOut);

  activeUnits.sort((a, b) => {
    const ticksA = Math.ceil((100 - a.actionTimer) / a.speed);
    const ticksB = Math.ceil((100 - b.actionTimer) / b.speed);
    if (ticksA !== ticksB) return ticksA - ticksB;
    return a.name.localeCompare(b.name);
  });

  return [...activeUnits, ...koUnits];
}
```

Call in `render()`:
```typescript
const sortedUnits = this.getSortedUnits();
// Use sortedUnits instead of this.units
```

#### 4.2 Apply Grey Tint to KO'd Unit Sprites

**In the sprite rendering loop**, add filter:

```typescript
for (let i = visibleStartIndex; i < visibleEndIndex; i++) {
  const unit = visibleUnits[i];

  // Apply grey tint for KO'd units
  if (unit.isKnockedOut) {
    ctx.filter = CombatConstants.KNOCKED_OUT.TINT_FILTER;
  }

  // Render sprite
  this.spriteRenderer.renderSprite(/* ... */);

  // Reset filter
  if (unit.isKnockedOut) {
    ctx.filter = 'none';
  }

  // ... rest of unit rendering
}
```

#### 4.3 Replace Ticks-Until-Ready with "KO" Label

**Find where ticks-until-ready is rendered** (likely near sprite rendering):

```typescript
// Calculate ticks-until-ready
const ticksUntilReady = Math.ceil((100 - unit.actionTimer) / unit.speed);

// Render ticks-until-ready below sprite
FontAtlasRenderer.renderText(/* ticksUntilReady.toString() */);
```

**Replace with conditional:**

```typescript
if (unit.isKnockedOut) {
  // Render "KO" label for knocked out units
  const koText = CombatConstants.KNOCKED_OUT.TURN_ORDER_TEXT;
  const koColor = CombatConstants.KNOCKED_OUT.TURN_ORDER_COLOR;

  FontAtlasRenderer.renderText(
    ctx,
    koText,
    textX,  // Centered below sprite
    textY,  // Below sprite
    fontAtlasImage,
    font,
    koColor
  );
} else {
  // Render ticks-until-ready for active units
  const ticksUntilReady = Math.ceil((100 - unit.actionTimer) / unit.speed);

  FontAtlasRenderer.renderText(
    ctx,
    ticksUntilReady.toString(),
    textX,
    textY,
    fontAtlasImage,
    font,
    '#ffffff'  // White
  );
}
```

### Testing Phase 4
1. Open combat, KO multiple units
2. Verify KO'd units appear at END of turn order list
3. Verify KO'd unit sprites have grey tint in turn order
4. Verify "KO" label appears below KO'd unit sprites (instead of ticks number)
5. Verify active units still show ticks-until-ready numbers
6. Test scrolling with 8+ units including KO'd units

**Acceptance Criteria:**
- [ ] KO'd units sorted to end of turn order
- [ ] KO'd units have grey tint in turn order
- [ ] "KO" label appears below KO'd sprites
- [ ] Active units show ticks-until-ready normally
- [ ] Scrolling works correctly with KO'd units

---

## Phase 5: Action Timer Integration

### Goal
Prevent KO'd units from accumulating action timer progress and getting turns.

### Files to Modify
1. `models/combat/phases/ActionTimerPhaseHandler.ts`
2. `models/combat/phases/UnitTurnPhaseHandler.ts`

### Steps

#### 5.1 Update ActionTimerPhaseHandler Tick Simulation

**File:** `models/combat/phases/ActionTimerPhaseHandler.ts`

**Find the tick simulation loop** (likely in `simulateTicks()` or similar method):

```typescript
// Increment action timers
for (const unit of allUnits) {
  const currentTimer = unitTimers.get(unit) ?? unit.actionTimer;
  const newTimer = currentTimer + speed * TICK_SIZE * ACTION_TIMER_MULTIPLIER;
  unitTimers.set(unit, newTimer);
}
```

**Add KO check:**

```typescript
// Increment action timers (skip KO'd units)
for (const unit of allUnits) {
  // Skip knocked out units - they don't accumulate action timer
  if (unit.isKnockedOut) {
    unitTimers.set(unit, 0);  // Ensure timer stays at 0
    continue;
  }

  const currentTimer = unitTimers.get(unit) ?? unit.actionTimer;
  const newTimer = currentTimer + speed * TICK_SIZE * ACTION_TIMER_MULTIPLIER;
  unitTimers.set(unit, newTimer);
}
```

**Find turn order calculation** (sorting by ticks-until-ready):

Add similar sorting as Phase 4.1 to ensure KO'd units appear at end.

#### 5.2 Update UnitTurnPhaseHandler Ready Unit Selection

**File:** `models/combat/phases/UnitTurnPhaseHandler.ts`

**Find where the ready unit is identified** (likely in `updatePhase()` or constructor):

```typescript
// Find ready unit (first with AT >= 100)
const readyUnit = turnOrder.find(u => u.actionTimer >= 100);
```

**Add KO check:**

```typescript
// Find ready unit (first active unit with AT >= 100, skip KO'd)
const readyUnit = turnOrder.find(u => !u.isKnockedOut && u.actionTimer >= 100);
```

**If there's a "ready unit" calculation in multiple places**, update all occurrences.

#### 5.3 Update Turn Order Display in UnitTurnPhaseHandler

**Find turn order calculation** (for TurnOrderRenderer):

Add same sorting logic as Phase 4.1 to ensure KO'd units at end.

### Testing Phase 5
1. Start action-timer phase with KO'd unit
2. Verify KO'd unit's action timer stays at 0 during ticks
3. Verify KO'd unit never triggers unit-turn phase
4. Manually set KO'd unit's timer to 100 via console, verify still skipped
5. Verify active units continue to accumulate timer normally

**Acceptance Criteria:**
- [ ] KO'd units' action timers stay at 0 during action-timer phase
- [ ] KO'd units never get selected as ready unit
- [ ] Active units accumulate timer normally
- [ ] Turn order displays KO'd units at end

---

## Phase 6: Movement and Pathfinding

### Goal
Allow units to path through KO'd units but not end movement on their tiles.

### Files to Modify
1. `models/combat/utils/MovementRangeCalculator.ts`
2. `models/combat/utils/MovementPathfinder.ts`

### Steps

#### 6.1 Update MovementRangeCalculator

**File:** `models/combat/utils/MovementRangeCalculator.ts`

**Find the occupied tile check** (likely in BFS flood-fill loop):

```typescript
// Check if tile is occupied
const occupant = manifest.getUnitAt(neighbor);
if (occupant) {
  // Can't end movement here
  continue;
}
```

**Update to allow pathing through KO'd:**

```typescript
// Check if tile is occupied
const occupant = manifest.getUnitAt(neighbor);

// Can path through KO'd units, but can't end movement on them
if (occupant) {
  // If occupant is KO'd, can continue pathfinding THROUGH this tile
  // but don't mark it as a valid destination
  if (!occupant.isKnockedOut) {
    // Non-KO occupant blocks pathfinding entirely
    continue;
  }
  // KO'd unit: can path through, but don't add to reachable list
  // Continue pathfinding but don't mark as destination
}
```

**More specifically**, you'll need to separate:
1. **Pathfinding traversal**: Can pass through KO'd units
2. **Valid destinations**: Cannot end on KO'd units

**Implementation:**

```typescript
// Check if tile is occupied
const occupant = manifest.getUnitAt(neighbor);
if (occupant && !occupant.isKnockedOut) {
  // Non-KO unit blocks pathfinding
  continue;
}

// Can reach this tile (either empty or has KO'd unit)
// Add to queue for further pathfinding
queue.push({ position: neighbor, distance: current.distance + 1 });

// Only mark as reachable destination if NOT occupied by KO'd unit
if (!occupant) {
  reachableTiles.push(neighbor);
}
```

#### 6.2 Update MovementPathfinder

**File:** `models/combat/utils/MovementPathfinder.ts`

Apply same logic as 6.1:

**Find occupied tile check:**

```typescript
const occupant = manifest.getUnitAt(neighbor);
if (occupant) {
  continue;  // Can't path through occupied tiles
}
```

**Update:**

```typescript
const occupant = manifest.getUnitAt(neighbor);
if (occupant && !occupant.isKnockedOut) {
  continue;  // Can't path through non-KO units
}

// Can path through KO'd units, but validate destination separately
```

**Also update destination validation** (if exists):

```typescript
// Validate destination is not occupied (or only by KO'd unit)
const destinationOccupant = manifest.getUnitAt(destination);
if (destinationOccupant && !destinationOccupant.isKnockedOut) {
  return null;  // Can't end movement on non-KO unit
}
```

### Testing Phase 6
1. Place KO'd unit between active unit and destination
2. Verify movement range shows tiles beyond KO'd unit (can path through)
3. Verify KO'd unit's tile is NOT highlighted as valid destination
4. Verify units can move through KO'd unit to reach far side
5. Verify clicking KO'd unit's tile does NOT move unit there

**Acceptance Criteria:**
- [ ] Movement range calculation allows pathing through KO'd units
- [ ] KO'd unit tiles are NOT valid destinations (not highlighted)
- [ ] Path preview shows path going around/through KO'd units
- [ ] Units can reach tiles beyond KO'd units
- [ ] Cannot click to move onto KO'd unit tile

---

## Phase 7: Attack Range and AI Integration

### Goal
Exclude KO'd units from targeting, remove LoS blocking, and update AI context.

### Files to Modify
1. `models/combat/utils/AttackRangeCalculator.ts`
2. `models/combat/utils/LineOfSightCalculator.ts`
3. `models/combat/ai/types/AIContext.ts`
4. `models/combat/strategies/PlayerTurnStrategy.ts`

### Steps

#### 7.1 Update AttackRangeCalculator

**File:** `models/combat/utils/AttackRangeCalculator.ts`

**Find where `validTargets` is populated:**

```typescript
// Check for enemy units in range
const targetUnit = manifest.getUnitAt(tile);
if (targetUnit && targetUnit.isPlayerControlled !== attacker.isPlayerControlled) {
  validTargets.push(tile);
}
```

**Add KO check:**

```typescript
// Check for enemy units in range (exclude KO'd)
const targetUnit = manifest.getUnitAt(tile);
if (
  targetUnit &&
  !targetUnit.isKnockedOut &&  // Exclude KO'd units
  targetUnit.isPlayerControlled !== attacker.isPlayerControlled
) {
  validTargets.push(tile);
}
```

#### 7.2 Update LineOfSightCalculator

**File:** `models/combat/utils/LineOfSightCalculator.ts`

**Find where units block LoS:**

```typescript
// Check if tile has unit (blocks LoS)
const unitAtTile = manifest.getUnitAt(pos);
if (unitAtTile) {
  return false;  // Blocked by unit
}
```

**Add KO check:**

```typescript
// Check if tile has unit (blocks LoS, unless KO'd)
const unitAtTile = manifest.getUnitAt(pos);
if (unitAtTile && !unitAtTile.isKnockedOut) {
  return false;  // Blocked by non-KO unit
}
// KO'd units don't block LoS
```

#### 7.3 Update AIContextBuilder

**File:** `models/combat/ai/types/AIContext.ts`

**Find where `enemyUnits` and `alliedUnits` are populated:**

```typescript
const allPlacements = state.unitManifest.getAllUnits();

// Separate allied and enemy units
const alliedUnits = allPlacements
  .filter(p => p.unit !== self && p.unit.isPlayerControlled === self.isPlayerControlled)
  .map(/* ... */);

const enemyUnits = allPlacements
  .filter(p => p.unit.isPlayerControlled !== self.isPlayerControlled)
  .map(/* ... */);
```

**Add KO filter:**

```typescript
const allPlacements = state.unitManifest.getAllUnits();

// Separate allied and enemy units (exclude KO'd)
const alliedUnits = allPlacements
  .filter(p =>
    p.unit !== self &&
    !p.unit.isKnockedOut &&  // Exclude KO'd allies
    p.unit.isPlayerControlled === self.isPlayerControlled
  )
  .map(/* ... */);

const enemyUnits = allPlacements
  .filter(p =>
    !p.unit.isKnockedOut &&  // Exclude KO'd enemies
    p.unit.isPlayerControlled !== self.isPlayerControlled
  )
  .map(/* ... */);
```

**This single change should fix all AI behaviors** since they use AIContext.

#### 7.4 Update PlayerTurnStrategy

**File:** `models/combat/strategies/PlayerTurnStrategy.ts`

**Find where attack targets are validated** (in `handleMapClick` for attack mode):

```typescript
// Check if clicked tile has valid enemy target
const clickedUnit = state.unitManifest.getUnitAt(clickedTile);
if (
  clickedUnit &&
  clickedUnit.isPlayerControlled !== this.activeUnit.isPlayerControlled
) {
  // Valid enemy target
}
```

**Add KO check:**

```typescript
// Check if clicked tile has valid enemy target (exclude KO'd)
const clickedUnit = state.unitManifest.getUnitAt(clickedTile);
if (
  clickedUnit &&
  !clickedUnit.isKnockedOut &&  // Exclude KO'd units
  clickedUnit.isPlayerControlled !== this.activeUnit.isPlayerControlled
) {
  // Valid enemy target
}
```

**Also update hover logic** (if exists) with same check.

### Testing Phase 7

#### Attack Range Tests
1. Place KO'd enemy in weapon range
2. Verify KO'd unit NOT highlighted as valid target (no yellow/green)
3. Verify cannot click KO'd unit in attack mode
4. Verify non-KO enemies behind KO'd unit are still targetable (no LoS block)

#### AI Tests
1. Create encounter with KO'd enemy and active enemy
2. Verify AI never targets KO'd unit
3. Verify AI targets active enemy correctly
4. Verify AI pathfinding ignores KO'd units (doesn't affect movement decisions)
5. Test DefeatNearbyOpponent, AttackNearestOpponent, MoveTowardNearestOpponent behaviors

**Acceptance Criteria:**
- [ ] KO'd units excluded from attack range validTargets
- [ ] Cannot select KO'd unit as attack target (player)
- [ ] KO'd units don't block line of sight
- [ ] AI never targets KO'd units
- [ ] AI ignores KO'd units in movement decisions
- [ ] AI can target enemies behind/beyond KO'd units

---

## Phase 8: Final Integration and Testing

### Goal
Comprehensive testing and edge case handling.

### Test Scenarios

#### Scenario 1: Single KO in Combat
1. Start combat with 3 allies, 3 enemies
2. KO one enemy via attacks
3. Verify all visual and mechanical behaviors
4. Continue combat, KO another enemy
5. Verify turn order updates correctly

#### Scenario 2: Multiple KO Units
1. Start combat, KO 2 allies and 2 enemies
2. Verify turn order shows: [Active units...] [KO'd units...]
3. Verify movement paths through KO'd units
4. Verify attacks don't target KO'd units

#### Scenario 3: KO During Action-Timer Phase
1. Have unit at 90 AT, about to get turn
2. Manually KO unit via console: `unit.wounds = unit.maxHealth`
3. Let action-timer phase continue
4. Verify KO'd unit never gets turn
5. Verify next active unit gets turn instead

#### Scenario 4: Revival (Future-Proofing)
1. KO a unit
2. Manually revive via console: `unit.wounds = 0`
3. Verify unit no longer appears as KO'd
4. Verify unit rejoins turn order correctly
5. Verify action timer is still 0 (must wait for next turn)

#### Scenario 5: Save/Load with KO Units
1. KO several units
2. Export save file
3. Load save file
4. Verify KO'd units still appear KO'd
5. Verify all visual and mechanical behaviors persist

#### Scenario 6: Victory/Defeat with KO
1. KO all enemies
2. Verify victory condition triggers
3. Reset, KO all allies
4. Verify defeat condition triggers

#### Scenario 7: AI Behavior with KO Units
1. Create mixed encounter (active + KO'd enemies)
2. Start enemy turn
3. Verify AI ignores KO'd allies in calculations
4. Verify AI targets active player units
5. Verify AI pathfinding works correctly around KO'd units

### Edge Case Checklist
- [ ] Unit becomes KO'd mid-movement animation (animation completes)
- [ ] Unit becomes KO'd mid-attack animation (animation completes)
- [ ] Multiple units KO'd in same turn (all appear in turn order)
- [ ] KO unit is in the way of movement path (can path through)
- [ ] KO unit is between attacker and target (doesn't block LoS)
- [ ] All enemies KO'd (victory triggers)
- [ ] All allies KO'd (defeat triggers)
- [ ] Save/load with KO'd units (state preserved)
- [ ] KO unit manually revived via wounds change (returns to active)

### Performance Testing
- [ ] Combat with 10+ units (5+ KO'd) runs at 60 FPS
- [ ] Turn order rendering with KO'd units has no lag
- [ ] Pathfinding through KO'd units is fast
- [ ] AI evaluation with KO'd units is fast

---

## Rollback Plan

If issues arise during implementation, roll back by phase:

### Phase 7 Rollback
- Revert AIContext.ts, AttackRangeCalculator.ts, LineOfSightCalculator.ts, PlayerTurnStrategy.ts
- KO'd units will be targetable again, but visual changes remain

### Phase 6 Rollback
- Revert MovementRangeCalculator.ts, MovementPathfinder.ts
- KO'd units will block movement, but other features work

### Phase 5 Rollback
- Revert ActionTimerPhaseHandler.ts, UnitTurnPhaseHandler.ts
- KO'd units will accumulate timer (bad), but visual changes remain

### Phase 4 Rollback
- Revert TurnOrderRenderer.ts
- KO'd units appear in normal turn order position, but map rendering works

### Phase 3 Rollback
- Remove "KO" text rendering from UnitTurnPhaseHandler.ts
- Grey tint remains, but no text overlay

### Phase 2 Rollback
- Revert CombatRenderer.ts
- No visual indication of KO status

### Phase 1 Rollback
- Remove isKnockedOut getter from all files
- Feature completely removed

---

## Post-Implementation Tasks

### Documentation Updates
- [ ] Update CombatHierarchy.md with KO feature references
- [ ] Add KO feature to relevant section headers (turn order, rendering, pathfinding, AI)
- [ ] Update Quick Reference section with KO-related tasks

### Code Review Checklist
- [ ] All `isKnockedOut` checks use the getter (not direct `wounds >= maxHealth`)
- [ ] Grey tint filter is always reset after use (`ctx.filter = 'none'`)
- [ ] Turn order sorting is consistent across all phase handlers
- [ ] AI behaviors properly filtered via AIContext
- [ ] No performance regressions (FPS stable)
- [ ] TypeScript compiles with no errors or warnings

### Future Enhancement Ideas
- [ ] Add KO sound effect
- [ ] Add fade-out animation when unit becomes KO'd
- [ ] Add revival ability system
- [ ] Add "unconscious" vs "dead" states (for story purposes)
- [ ] Add KO icon sprites (alternative to text)

---

## Estimated Timeline

| Phase | Estimated Time | Dependencies |
|-------|----------------|--------------|
| Phase 1: Core KO State | 30 minutes | None |
| Phase 2: Grey Tint | 45 minutes | Phase 1 |
| Phase 3: Map KO Text | 30 minutes | Phase 1, 2 |
| Phase 4: Turn Order | 1.5 hours | Phase 1, 2 |
| Phase 5: Action Timer | 1 hour | Phase 1, 4 |
| Phase 6: Movement | 1 hour | Phase 1 |
| Phase 7: Attack & AI | 1.5 hours | Phase 1, 6 |
| Phase 8: Testing | 2 hours | All phases |
| **Total** | **~8.5 hours** | - |

---

## Success Criteria

This feature is complete when:

1. **Visual**
   - [ ] KO'd units have grey tint on map and in turn order
   - [ ] "KO" text appears on map tiles
   - [ ] "KO" label appears in turn order
   - [ ] KO'd units appear at end of turn order list

2. **Mechanical**
   - [ ] KO'd units' action timer stays at 0
   - [ ] KO'd units never get turns
   - [ ] Units can path through KO'd units
   - [ ] Units cannot end movement on KO'd tiles
   - [ ] KO'd units don't block line of sight

3. **Targeting**
   - [ ] KO'd units not in attack range validTargets
   - [ ] Player cannot select KO'd units as attack targets
   - [ ] AI never targets KO'd units

4. **Edge Cases**
   - [ ] All edge cases pass testing
   - [ ] Save/load preserves KO state
   - [ ] Victory/defeat work correctly with KO'd units

5. **Performance**
   - [ ] No FPS drops with KO'd units
   - [ ] No visual artifacts or glitches

---

**Next Steps**: Begin implementation with Phase 1. Test thoroughly after each phase before proceeding to the next.
