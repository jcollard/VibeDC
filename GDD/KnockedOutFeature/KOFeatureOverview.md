# Knocked Out (KO) Feature - Design Overview

**Version:** 1.0
**Created:** 2025-10-30
**Related:** [CombatHierarchy.md](../../CombatHierarchy.md)

## Purpose

This document describes the Knocked Out (KO) feature for combat units. When a unit's wounds equal or exceed their maximum health, they become "knocked out" and are visually and mechanically distinct from active units until revived or combat ends.

## Feature Summary

KO'd units represent defeated combatants who are incapacitated but not permanently removed from combat. They:
- Have distinct visual representation (grey tint, "KO" text overlay)
- Cannot act or accumulate action timer progress
- Do not block movement or line of sight
- Cannot be targeted by attacks
- Appear at the end of the turn order list

## Core Requirements

### 1. Visual Representation

#### On the Battle Map
- **Grey Tint**: Unit sprite rendered with desaturated/greyscale color filter
- **"KO" Text Overlay**: Large "KO" text centered on the tile occupied by the KO'd unit
  - Font: 7px-04b03 (small font)
  - Color: Red (#ff0000) with black shadow for visibility
  - Position: Centered horizontally and vertically on the unit's tile
  - Rendering: After unit sprite, before UI overlays (in renderUI phase)

#### In the Turn Order Display
- **Position**: KO'd units appear at the end of the turn order list (after all active units)
- **Grey Tint**: Unit sprite rendered with same greyscale filter as map
- **"KO" Label**: "KO" text displayed beneath the unit's sprite
  - Font: 7px-04b03 (UI font)
  - Color: Red (#ff0000)
  - Position: Below sprite, where ticks-until-ready normally appears
- **No Ticks Value**: KO'd units show "KO" instead of ticks-until-ready number

### 2. Mechanical Behavior

#### Action Timer
- **Timer Value**: Set to 0 when unit becomes KO'd
- **No Tick Progress**: During action-timer phase, KO'd units' speed is NOT added to action timer
- **Never Acts**: KO'd units never reach 100 action timer, never get a turn

#### Movement and Positioning
- **No Collision**: KO'd units do NOT block movement
  - Units can path THROUGH KO'd units
  - Units CANNOT stop/end movement ON a KO'd unit's tile
- **No Line of Sight Blocking**: KO'd units do NOT block line of sight for attacks

#### Targeting and Combat
- **Cannot Be Targeted**: KO'd units are NOT valid targets for attacks
  - Not included in `validTargets` array from AttackRangeCalculator
  - Hover/click interactions should ignore KO'd units
  - AI should not consider KO'd units as potential targets

### 3. AI Behavior Integration

All AI behaviors must properly handle KO'd units:

#### AIContext Changes
- **Enemy Units List**: Exclude KO'd enemies from `enemyUnits` array
- **Allied Units List**: Exclude KO'd allies from `alliedUnits` array
- **Helper Methods**: All distance/range calculations should ignore KO'd units
- **Movement Planning**: KO'd units should not affect pathfinding decisions
  - Can path through KO'd units
  - Cannot end movement on KO'd tiles
  - KO'd units not considered when evaluating tactical positions

#### Behavior-Specific Changes
- **DefeatNearbyOpponent**: Skip KO'd targets (already at 0 HP)
- **AttackNearestOpponent**: Skip KO'd targets
- **MoveTowardNearestOpponent**: Ignore KO'd enemies when finding nearest opponent
- **Future Behaviors**: All targeting/positioning logic must exclude KO'd units

### 4. Turn Order Calculation

#### ActionTimerPhaseHandler
- **KO'd Units at End**: Sort KO'd units to end of turn order list
- **No Timer Updates**: Skip action timer increments for KO'd units during tick simulation
- **Display Order**: Active units (sorted by ticks-until-ready) → KO'd units (any order)

#### UnitTurnPhaseHandler
- **Skip KO'd Units**: When identifying ready unit, skip any KO'd units
- **Turn Order Display**: Same sorting as ActionTimerPhaseHandler (KO'd at end)

## Implementation Strategy

### Phase 1: Core KO State Detection
1. Add `isKnockedOut` getter to CombatUnit interface
2. Implement in HumanoidUnit and MonsterUnit classes
3. Logic: `return this.wounds >= this.maxHealth`

### Phase 2: Visual Rendering
1. Create grey tint rendering utility
2. Update CombatRenderer.renderUnits() to apply tint for KO'd units
3. Add "KO" text overlay rendering in UnitTurnPhaseHandler.renderUI()
4. Update TurnOrderRenderer:
   - Apply grey tint to KO'd unit sprites
   - Show "KO" label instead of ticks-until-ready
   - Sort KO'd units to end of list

### Phase 3: Action Timer Integration
1. Update ActionTimerPhaseHandler:
   - Skip action timer increments for KO'd units in tick simulation
   - Sort KO'd units to end of turn order
2. Update UnitTurnPhaseHandler:
   - Skip KO'd units when selecting ready unit
   - Sort KO'd units to end of turn order

### Phase 4: Movement and Pathfinding
1. Update MovementRangeCalculator:
   - Allow pathing through KO'd units
   - Disallow ending movement on KO'd tiles
2. Update MovementPathfinder:
   - Same changes as MovementRangeCalculator

### Phase 5: Attack Range and Targeting
1. Update AttackRangeCalculator:
   - Exclude KO'd units from validTargets
   - KO'd units do NOT block line of sight
2. Update LineOfSightCalculator:
   - KO'd units do NOT block LoS

### Phase 6: AI Behavior System
1. Update AIContextBuilder:
   - Filter out KO'd units from enemyUnits and alliedUnits
2. Verify all AI behaviors work correctly (should automatically work via AIContext filtering)

### Phase 7: Player UI Interactions
1. Update PlayerTurnStrategy:
   - Prevent selecting KO'd units as attack targets
   - Prevent hovering KO'd units in attack mode
2. Update UnitInfoContent:
   - Display KO status if viewing a KO'd unit (optional)

## Technical Details

### CombatUnit Interface Addition
```typescript
interface CombatUnit {
  // ... existing properties ...

  /** Returns true if unit is knocked out (wounds >= maxHealth) */
  readonly isKnockedOut: boolean;
}
```

### Grey Tint Implementation
**Option A: Canvas Filter API**
```typescript
ctx.filter = 'saturate(0%) brightness(0.7)';
// render sprite
ctx.filter = 'none';
```

**Option B: Pixel Manipulation** (more control)
```typescript
// Create greyscale version of sprite
// Apply to temporary canvas buffer
// Render from buffer
```

**Recommendation**: Use Canvas Filter API for simplicity and performance

### Turn Order Sorting Logic
```typescript
function sortTurnOrder(units: CombatUnit[]): CombatUnit[] {
  const active = units.filter(u => !u.isKnockedOut);
  const koUnits = units.filter(u => u.isKnockedOut);

  // Sort active units by ticks-until-ready
  const sortedActive = active.sort((a, b) => {
    const ticksA = Math.ceil((100 - a.actionTimer) / a.speed);
    const ticksB = Math.ceil((100 - b.actionTimer) / b.speed);
    if (ticksA !== ticksB) return ticksA - ticksB;
    return a.name.localeCompare(b.name);
  });

  // Return active units first, then KO'd units
  return [...sortedActive, ...koUnits];
}
```

### KO Detection Pattern
All systems should use the `isKnockedOut` getter consistently:
```typescript
// Good
if (unit.isKnockedOut) { /* ... */ }

// Avoid
if (unit.wounds >= unit.maxHealth) { /* ... */ }
```

## Edge Cases and Considerations

### 1. Revival Mechanics (Future)
- If revival abilities are added, KO'd units will automatically become active when `wounds < maxHealth`
- Action timer should remain at 0 (require manual reset or Delay action)
- Turn order will automatically re-sort on next action-timer phase

### 2. Victory/Defeat Conditions
- **Current Implementation**: Based on all enemies/allies defeated (wounds >= maxHealth)
- **No Changes Needed**: Victory/defeat predicates already check wounds, not KO status
- KO'd units count as defeated for win/loss purposes

### 3. Save/Load Compatibility
- **No Serialization Changes**: KO status is derived from wounds/maxHealth
- **Backward Compatible**: Old saves will automatically show KO'd units correctly

### 4. Movement Edge Cases
- **Unit Already on KO Tile**: If unit is standing on a tile when another unit becomes KO'd there, no issue (can't happen, only one unit per tile)
- **KO During Movement**: If unit becomes KO'd mid-movement animation, animation completes normally

### 5. AI Pathfinding
- **KO Units Block End Position**: MovementPathfinder must check `isKnockedOut` when validating final destination
- **Can Path Through**: MovementPathfinder must allow pathing through KO'd units

### 6. Multi-Hit Attacks (Future)
- If attack causes wounds >= maxHealth on first hit of multi-hit attack, remaining hits should still apply
- KO status is read-only getter, so subsequent hits will increase wounds beyond maxHealth

## Testing Checklist

### Visual Tests
- [ ] KO'd unit on map has grey tint
- [ ] "KO" text appears centered on KO'd unit's tile
- [ ] KO'd unit in turn order has grey tint
- [ ] "KO" label appears below KO'd unit sprite in turn order
- [ ] KO'd units appear at end of turn order list

### Mechanical Tests
- [ ] KO'd unit's action timer stays at 0 during action-timer phase
- [ ] KO'd unit never gets a turn
- [ ] Units can path through KO'd units
- [ ] Units cannot end movement on KO'd unit's tile
- [ ] KO'd units do not block line of sight

### Targeting Tests
- [ ] Cannot select KO'd unit as attack target (player)
- [ ] Cannot hover KO'd unit in attack mode (player)
- [ ] KO'd units excluded from AttackRangeCalculator validTargets
- [ ] AI never targets KO'd units

### AI Behavior Tests
- [ ] DefeatNearbyOpponent skips KO'd targets
- [ ] AttackNearestOpponent skips KO'd targets
- [ ] MoveTowardNearestOpponent ignores KO'd enemies
- [ ] AI pathfinding avoids ending on KO'd tiles
- [ ] AI can path through KO'd units

### Edge Case Tests
- [ ] Unit becomes KO'd mid-turn (animation completes)
- [ ] Save/load preserves KO state correctly
- [ ] Victory/defeat triggers when all enemies/allies KO'd
- [ ] Multiple KO'd units appear in correct order in turn order

## Performance Considerations

### Rendering
- **Grey Tint**: Canvas filter API is hardware-accelerated, minimal overhead
- **KO Text Overlay**: Static text render, no performance impact
- **Turn Order**: Filtering and sorting ~10-20 units is negligible

### Pathfinding
- **Additional Check**: Single boolean check per tile, no performance impact
- **LoS Calculations**: Slightly fewer checks (fewer units blocking), potential minor improvement

### AI Evaluation
- **Filtered Lists**: Fewer units to evaluate, potential minor improvement
- **No New Calculations**: All existing logic, just with filtered inputs

## Future Extensions

### Revival System
- Add `revive(unit, healAmount)` method to restore KO'd units
- Healing abilities that can target KO'd units
- UI indication for "can revive" status

### KO Animation
- Fade-out effect when unit becomes KO'd
- Optional "collapse" animation

### KO Sound Effects
- Play sound when unit becomes KO'd
- Different sounds for allies vs enemies

### KO Icons
- Alternative to "KO" text: render sprite icon (e.g., skull, cross)
- Configurable via CombatConstants

## Constants to Add

Add to `CombatConstants` in CombatConstants.ts:

```typescript
KNOCKED_OUT: {
  // Map overlay text
  MAP_TEXT: 'KO',
  MAP_TEXT_COLOR: '#ff0000',     // Red
  MAP_FONT_ID: '7px-04b03',

  // Turn order label
  TURN_ORDER_TEXT: 'KO',
  TURN_ORDER_COLOR: '#ff0000',   // Red
  TURN_ORDER_FONT_ID: '7px-04b03',

  // Grey tint settings
  TINT_SATURATION: 0,            // 0% saturation (greyscale)
  TINT_BRIGHTNESS: 0.7,          // 70% brightness (darker)
}
```

## Files to Modify

### Core Unit System
- `models/combat/CombatUnit.ts` - Add isKnockedOut getter interface
- `models/combat/HumanoidUnit.ts` - Implement isKnockedOut getter
- `models/combat/MonsterUnit.ts` - Implement isKnockedOut getter

### Rendering
- `models/combat/rendering/CombatRenderer.ts` - Apply grey tint to KO'd units
- `models/combat/managers/renderers/TurnOrderRenderer.ts` - KO'd unit rendering and sorting

### Phase Handlers
- `models/combat/phases/ActionTimerPhaseHandler.ts` - Skip KO'd units in tick simulation, sort to end
- `models/combat/phases/UnitTurnPhaseHandler.ts` - Skip KO'd ready units, render "KO" overlay

### Movement System
- `models/combat/utils/MovementRangeCalculator.ts` - Allow through KO'd, disallow end on KO'd
- `models/combat/utils/MovementPathfinder.ts` - Same as MovementRangeCalculator

### Attack System
- `models/combat/utils/AttackRangeCalculator.ts` - Exclude KO'd from validTargets
- `models/combat/utils/LineOfSightCalculator.ts` - KO'd units don't block LoS

### AI System
- `models/combat/ai/types/AIContext.ts` - Filter KO'd from enemyUnits and alliedUnits

### Strategy System
- `models/combat/strategies/PlayerTurnStrategy.ts` - Prevent targeting KO'd units

### Constants
- `models/combat/CombatConstants.ts` - Add KNOCKED_OUT section

## Estimated Complexity

- **Implementation Time**: 4-6 hours
- **Testing Time**: 2-3 hours
- **Total**: ~6-9 hours

**Complexity Rating**: Medium

**Risk Level**: Low (mostly filtering and visual changes, no complex new systems)

## Dependencies

None - this feature builds entirely on existing systems.

## Compatibility

- **Save/Load**: Fully compatible (KO status is derived, not stored)
- **Existing Features**: No breaking changes
- **Future Features**: Designed with revival system in mind

---

## Implementation Documentation

**Master Plan**: See [KOFeatureImplementationPlan.md](./KOFeatureImplementationPlan.md) for overall timeline and phase overview.

**Detailed Phase Guides**:
- ✅ **Phase 1**: [Visual Representation](./01-VisualRepresentation.md) - COMPLETED (2025-10-31)
- ✅ **Phase 2**: [Turn Order and Action Timer](./02-TurnOrderAndActionTimer.md) - COMPLETED (2025-10-31)
- ✅ **Phase 3**: [Movement and Pathfinding](./03-MovementAndPathfinding.md) - COMPLETED (2025-10-31)
- 📋 **Phase 4**: Attack Range and AI Integration - READY FOR IMPLEMENTATION

**Progress**: 3 of 4 phases complete (~75% done)
