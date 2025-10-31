# Defeat Screen Feature - Design Overview

**Version:** 1.0
**Created:** 2025-10-31
**Related:** [CombatHierarchy.md](../../CombatHierarchy.md)

## Purpose

This document describes the Defeat Screen feature for combat encounters. When the defeat condition is met (by default, all player units are knocked out), the combat system transitions to a defeat state that displays a modal overlay with options to retry the encounter or skip it.

## Feature Summary

The Defeat Screen provides players with clear feedback when they lose a combat encounter and gives them meaningful choices:
- Automatic detection of defeat conditions at the end of each unit's turn
- Visual feedback through a semi-transparent overlay and centered modal panel
- Combat log message announcing defeat
- Two player options: "Try Again" (restart encounter) or "Skip Encounter" (future implementation)
- Disabled mouse inputs to all combat panels during defeat state
- Serialization of initial combat state to enable encounter restarts

## Core Requirements

### 1. Defeat Condition System

#### Interface: CombatDefeatCondition
A pluggable interface that allows custom defeat conditions to be defined:
- **Purpose**: Determine if combat has been lost based on current state
- **Method**: `evaluate(state: CombatState): boolean`
- **Returns**: `true` if combat is lost, `false` otherwise
- **Extensibility**: Can be extended for custom scenarios (time limits, objective failures, etc.)

#### Default Implementation: AllPlayersKnockedOut
- **Logic**: Returns `true` when all player-controlled units have `isKnockedOut === true`
- **Implementation**: Filter player units, check if all are KO'd
- **Edge Case**: If no player units exist, returns `false` (combat continues)

#### Checking Timing
- **When**: At the end of each unit's turn, before returning to Action Timer Phase
- **Where**: UnitTurnPhaseHandler, after all turn actions complete
- **Frequency**: Once per unit turn (not continuously during animations)
- **Transition**: If condition met, set `state.phase = 'defeat'` and return modified state

### 2. Combat State Management

#### Initial State Serialization
When combat begins (deployment phase completes):
- **Serialize**: Complete combat state using `serializeCombatState()`
- **Store**: In `CombatState` as `initialStateSnapshot: CombatStateJSON`
- **Purpose**: Enable "Try Again" functionality to restore exact starting conditions
- **Timing**: Save after player deployment is finalized, before first action timer phase

#### Defeat Phase
Add new combat phase to `CombatPhase` type:
```typescript
type CombatPhase = 'deployment' | 'enemy-deployment' | 'action-timer' | 'unit-turn' | 'victory' | 'defeat';
```

### 3. Visual Presentation

#### Overlay Background
- **Element**: Full-screen semi-transparent black overlay
- **Dimensions**: Covers entire map panel (full canvas)
- **Color**: Black with 50% opacity (`rgba(0, 0, 0, 0.5)`)
- **Purpose**: Dim background, indicate inactive state, focus attention on modal

#### Defeat Modal Panel
- **Position**: Center of map panel (horizontally and vertically centered)
- **Size**:
  - Width: 200 pixels (same as deployment panel width for consistency)
  - Height: Auto (based on content)
- **Background**: Nine-slice panel using existing panel graphics
- **Border**: Standard panel border from existing UI system

#### Title Text
- **Text**: "Defeat"
- **Font**: `dungeonslant` (title font) at 12px size
- **Color**: Red `#ff0000` for emphasis
- **Position**: Top-center of panel, 16px padding from top
- **Alignment**: Horizontally centered

#### Menu Options
Two interactive buttons styled like ActionsMenu items:

**Button 1: "Try Again"**
- **Text**: "Try Again"
- **Font**: `7px-04b03` (standard UI font)
- **Color**: White `#ffffff` (normal), Yellow `#ffff00` (hover)
- **Position**: Bottom section of panel, first button
- **Padding**: 8px between buttons
- **Hover State**: Same as ActionsMenu (highlight, cursor change)
- **Click Action**: Reload encounter from initial state

**Button 2: "Skip Encounter"**
- **Text**: "Skip Encounter"
- **Font**: `7px-04b03` (standard UI font)
- **Color**: White `#ffffff` (normal), Yellow `#ffff00` (hover)
- **Position**: Bottom section of panel, second button
- **Padding**: 8px between buttons
- **Hover State**: Same as ActionsMenu
- **Click Action**: Placeholder for future implementation

#### Helper Text
Descriptive text beneath each button:

**Try Again Helper**
- **Text**: "Restart this encounter to try again"
- **Font**: `7px-04b03` at smaller size (5px)
- **Color**: Light grey `#aaaaaa`
- **Position**: Directly below "Try Again" button, 4px spacing
- **Width**: Wrapped to button width

**Skip Encounter Helper**
- **Text**: "Skips this encounter and all rewards"
- **Font**: `7px-04b03` at smaller size (5px)
- **Color**: Light grey `#aaaaaa`
- **Position**: Directly below "Skip Encounter" button, 4px spacing
- **Width**: Wrapped to button width

### 4. Input Handling

#### Mouse Input Disabling
When defeat phase is active:
- **Map Panel**: No hover detection, no click detection on tiles/units
- **Info Panel**: All buttons disabled (if visible)
- **Turn Order Panel**: No hover/click interactions
- **Actions Menu**: Not displayed (panel hidden)
- **Only Active Element**: Defeat modal buttons ("Try Again" / "Skip Encounter")

#### Mouse Event Flow
- **CombatView**: Check if `state.phase === 'defeat'` before routing events
- **Phase Handler**: DefeatPhaseHandler handles only modal interactions
- **Other Handlers**: Return early if defeat phase active

### 5. Combat Log Integration

#### Defeat Message
When defeat condition is met:
- **Message**: "The enemies have triumphed over you!"
- **Timing**: Added to combat log immediately when defeat condition detected
- **Color**: Red (or system default for narrative messages)
- **Position**: Appended to bottom of combat log

### 6. Try Again Functionality

#### State Restoration
When "Try Again" button is clicked:
- **Load**: Retrieve `initialStateSnapshot` from current state
- **Deserialize**: Use `deserializeCombatState()` to recreate initial state
- **Replace**: Replace current CombatState with deserialized state
- **Phase**: State should be in 'deployment' or first action-timer phase
- **Reset**: All unit positions, health, action timers, turn order restored

#### Animation Reset
- **Action Timer**: Reset to initial values
- **Turn Order**: Recalculated from initial state
- **Unit Positions**: Restored to deployment positions
- **Combat Log**: Cleared and reset to initial state (or keep for learning?)

#### Edge Cases
- **No Initial State**: If `initialStateSnapshot` is null/undefined, log error and disable button
- **Deserialization Failure**: Catch errors, log to console, show error message to player
- **Multiple Retries**: Each retry uses the same initial snapshot (no retry count limit)

## Implementation Strategy

### Phase 1: Defeat Condition System
1. Create `CombatDefeatCondition` interface in new file `models/combat/CombatDefeatCondition.ts`
2. Implement `AllPlayersKnockedOutCondition` class
3. Add condition checking to `UnitTurnPhaseHandler` at end of turn
4. Add 'defeat' to `CombatPhase` type in `CombatState.ts`
5. Update phase type exports and type guards

### Phase 2: Initial State Serialization
1. Add `initialStateSnapshot: CombatStateJSON | null` to `CombatState`
2. Add serialization logic in `DeploymentPhaseHandler` (or transition to action-timer)
3. Ensure serialization captures complete state (units, positions, timers, etc.)
4. Add deserialization for initial state in `CombatState.fromJSON()`

### Phase 3: Defeat Phase Handler
1. Create `DefeatPhaseHandler.ts` implementing `CombatPhaseHandler`
2. Implement `update()` method (mostly no-op, waits for user input)
3. Implement `render()` method (renders defeat modal and overlay)
4. Implement `renderUI()` method (renders button hover states)
5. Implement mouse event handling for button clicks

### Phase 4: Defeat Modal Rendering
1. Create `DefeatModalRenderer.ts` for rendering defeat UI
2. Implement overlay rendering (full-screen semi-transparent black)
3. Implement panel rendering (nine-slice panel, centered)
4. Implement title rendering ("Defeat" in dungeonslant font)
5. Implement button rendering (styled like ActionsMenu)
6. Implement helper text rendering

### Phase 5: Input Disabling
1. Update `CombatView` to check phase before routing mouse events
2. Update each panel manager to disable interactions during defeat phase
3. Ensure only DefeatPhaseHandler receives mouse events during defeat

### Phase 6: Combat Log Integration
1. Add defeat message to combat log when defeat condition met
2. Ensure message is visible in combat log panel
3. Consider visual styling for defeat messages (red color, etc.)

### Phase 7: Try Again Implementation
1. Implement state restoration logic in `DefeatPhaseHandler`
2. Add button click handler for "Try Again"
3. Deserialize initial state and replace current state
4. Transition back to deployment or action-timer phase
5. Test multiple retries and edge cases

### Phase 8: Skip Encounter Placeholder
1. Add button rendering for "Skip Encounter"
2. Implement hover state
3. Add placeholder click handler (logs to console for now)
4. Document future implementation requirements

## Technical Details

### CombatDefeatCondition Interface
```typescript
/**
 * Defines a condition that determines if combat has been lost.
 * Allows for custom defeat scenarios beyond the default "all players KO'd".
 */
export interface CombatDefeatCondition {
  /**
   * Evaluates whether the defeat condition has been met.
   * @param state Current combat state
   * @returns true if combat is lost, false otherwise
   */
  evaluate(state: CombatState): boolean;

  /**
   * Human-readable description of this defeat condition
   */
  description: string;

  /**
   * Serializes the condition to JSON for save/load
   */
  toJSON(): CombatDefeatConditionJSON;
}

export interface CombatDefeatConditionJSON {
  type: string;
  description: string;
  [key: string]: unknown;
}
```

### AllPlayersKnockedOutCondition Implementation
```typescript
export class AllPlayersKnockedOutCondition implements CombatDefeatCondition {
  description = "All player units are knocked out";

  evaluate(state: CombatState): boolean {
    const playerUnits = state.units.filter(u => !u.isEnemy);

    // If no player units exist, combat is not lost (edge case)
    if (playerUnits.length === 0) {
      return false;
    }

    // Defeat if ALL player units are KO'd
    return playerUnits.every(u => u.isKnockedOut);
  }

  toJSON(): CombatDefeatConditionJSON {
    return {
      type: "AllPlayersKnockedOut",
      description: this.description,
    };
  }

  static fromJSON(_json: CombatDefeatConditionJSON): AllPlayersKnockedOutCondition {
    return new AllPlayersKnockedOutCondition();
  }
}
```

### UnitTurnPhaseHandler Integration
```typescript
// In UnitTurnPhaseHandler.update()
// After all turn actions complete, before returning to action-timer

// Check defeat condition
if (this.defeatCondition.evaluate(newState)) {
  // Add combat log message
  newState.combatLog.addMessage({
    text: "The enemies have triumphed over you!",
    timestamp: Date.now(),
    type: "defeat"
  });

  // Transition to defeat phase
  return { ...newState, phase: 'defeat' };
}
```

### Initial State Serialization Point
```typescript
// In DeploymentPhaseHandler (or transition helper)
// When transitioning from deployment to action-timer for the first time

const initialSnapshot = serializeCombatState(state);
const newState = {
  ...state,
  initialStateSnapshot: initialSnapshot,
  phase: 'action-timer'
};
```

### DefeatPhaseHandler Structure
```typescript
export class DefeatPhaseHandler implements CombatPhaseHandler {
  private hoveredButton: 'try-again' | 'skip' | null = null;
  private renderer: DefeatModalRenderer;

  constructor() {
    this.renderer = new DefeatModalRenderer();
  }

  update(state: CombatState, dt: number): CombatState | null {
    // No automatic state changes, waits for user input
    return null;
  }

  render(ctx: CanvasRenderingContext2D, state: CombatState): void {
    // Render overlay and modal
    this.renderer.render(ctx, state, this.hoveredButton);
  }

  renderUI(ctx: CanvasRenderingContext2D, state: CombatState): void {
    // Render button hover states if needed
  }

  handleMouseMove(state: CombatState, worldX: number, worldY: number): CombatState | null {
    // Update hovered button based on mouse position
    const button = this.getButtonAtPosition(worldX, worldY);
    if (button !== this.hoveredButton) {
      this.hoveredButton = button;
      return state; // Trigger re-render
    }
    return null;
  }

  handleMouseDown(state: CombatState, worldX: number, worldY: number): CombatState | null {
    const button = this.getButtonAtPosition(worldX, worldY);

    if (button === 'try-again') {
      return this.handleTryAgain(state);
    } else if (button === 'skip') {
      return this.handleSkip(state);
    }

    return null;
  }

  private handleTryAgain(state: CombatState): CombatState | null {
    if (!state.initialStateSnapshot) {
      console.error("No initial state snapshot available for retry");
      return null;
    }

    try {
      const restoredState = deserializeCombatState(state.initialStateSnapshot);
      return restoredState;
    } catch (error) {
      console.error("Failed to restore initial state:", error);
      return null;
    }
  }

  private handleSkip(state: CombatState): CombatState | null {
    // TODO: Implement skip encounter logic
    console.log("Skip encounter clicked (not yet implemented)");
    return null;
  }

  private getButtonAtPosition(worldX: number, worldY: number): 'try-again' | 'skip' | null {
    // Calculate button bounds and check if mouse is over them
    // Implementation depends on rendering layout
    return null;
  }
}
```

### DefeatModalRenderer
```typescript
export class DefeatModalRenderer {
  private readonly MODAL_WIDTH = 200;
  private readonly MODAL_PADDING = 16;
  private readonly BUTTON_PADDING = 8;
  private readonly HELPER_PADDING = 4;

  render(
    ctx: CanvasRenderingContext2D,
    state: CombatState,
    hoveredButton: 'try-again' | 'skip' | null
  ): void {
    // 1. Render full-screen overlay
    this.renderOverlay(ctx);

    // 2. Calculate modal position (center of canvas)
    const modalX = (ctx.canvas.width - this.MODAL_WIDTH) / 2;
    const modalY = ctx.canvas.height / 3; // Upper third for visibility

    // 3. Render modal panel background
    this.renderPanelBackground(ctx, modalX, modalY);

    // 4. Render title
    this.renderTitle(ctx, modalX, modalY);

    // 5. Render buttons
    this.renderButtons(ctx, modalX, modalY, hoveredButton);

    // 6. Render helper text
    this.renderHelperText(ctx, modalX, modalY);
  }

  private renderOverlay(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  // ... other rendering methods
}
```

### CombatView Phase Handler Selection
```typescript
// In CombatView.tsx or wherever phase handlers are selected
private getPhaseHandler(phase: CombatPhase): CombatPhaseHandler {
  switch (phase) {
    case 'deployment':
      return this.deploymentHandler;
    case 'enemy-deployment':
      return this.enemyDeploymentHandler;
    case 'action-timer':
      return this.actionTimerHandler;
    case 'unit-turn':
      return this.unitTurnHandler;
    case 'victory':
      return this.victoryHandler; // If exists
    case 'defeat':
      return this.defeatHandler;
    default:
      throw new Error(`Unknown phase: ${phase}`);
  }
}
```

## Edge Cases and Considerations

### 1. Defeat During Animation
- **Issue**: Unit turn ends mid-animation (e.g., attack animation playing)
- **Solution**: Defer defeat check until all animations complete
- **Implementation**: Add `animationInProgress` flag to UnitTurnPhaseHandler

### 2. Multiple Units Defeated Simultaneously
- **Issue**: Area attack defeats multiple units at once
- **Solution**: Defeat check happens once at end of turn, regardless of how many units defeated
- **No Special Handling Needed**: Default condition checks all units

### 3. Missing Initial State
- **Issue**: `initialStateSnapshot` is null (combat loaded from old save)
- **Solution**: Disable "Try Again" button, show error message
- **Fallback**: Could serialize current state as "initial" on first detection

### 4. Deserialization Errors
- **Issue**: Initial state fails to deserialize (version mismatch, corrupted data)
- **Solution**: Catch error, log to console, disable "Try Again" button
- **User Feedback**: Show error message in combat log or modal

### 5. Defeat Before Action Timer Phase
- **Issue**: All players defeated during deployment (rare edge case)
- **Solution**: Check defeat condition at end of deployment phase too
- **Transition**: Go directly to defeat phase, skip action-timer

### 6. Victory and Defeat Simultaneously
- **Issue**: Last enemy and last player defeat each other in same turn
- **Solution**: Check victory condition first, defeat condition second
- **Priority**: Victory takes precedence (player wins ties)

### 7. Revival During Defeat Phase
- **Issue**: Future revival mechanics might allow KO'd units to be revived
- **Solution**: Defeat phase is permanent for current encounter
- **Revival Timing**: Only available during active combat, not defeat phase

### 8. Skip Encounter Implementation
- **Future Work**: Will need to:
  - Close combat view
  - Return to overworld or next encounter
  - Mark encounter as skipped (no rewards)
  - Update game state progression

## Testing Checklist

### Defeat Condition Tests
- [ ] All players KO'd triggers defeat phase
- [ ] Defeat phase transition happens after last player unit defeated
- [ ] Defeat message appears in combat log
- [ ] Defeat phase does not trigger if any player unit alive
- [ ] Defeat check happens at end of each unit turn

### Visual Tests
- [ ] Overlay renders correctly (full-screen, 50% black)
- [ ] Modal renders centered on map panel
- [ ] "Defeat" title renders in dungeonslant font, red color
- [ ] "Try Again" button renders correctly
- [ ] "Skip Encounter" button renders correctly
- [ ] Helper text renders below each button
- [ ] Button hover states work (color change to yellow)

### Input Handling Tests
- [ ] Map panel mouse interactions disabled during defeat
- [ ] Info panel buttons disabled during defeat
- [ ] Turn order panel interactions disabled during defeat
- [ ] Only defeat modal buttons respond to mouse events
- [ ] Hover detection works for both buttons
- [ ] Click detection works for both buttons

### Try Again Tests
- [ ] Initial state is serialized at start of combat
- [ ] "Try Again" button restores initial state correctly
- [ ] All units restored to initial positions
- [ ] All unit stats restored (health, action timer, etc.)
- [ ] Turn order recalculated from restored state
- [ ] Can retry multiple times successfully
- [ ] Retry after retry works (using same initial snapshot)

### Edge Case Tests
- [ ] Defeat during animation completes animation first
- [ ] Missing initial state disables "Try Again" button
- [ ] Deserialization error handled gracefully
- [ ] Victory condition takes precedence over defeat
- [ ] Combat log shows defeat message
- [ ] Multiple defeated units in same turn handled correctly

### Skip Encounter Tests
- [ ] "Skip Encounter" button renders and is hoverable
- [ ] "Skip Encounter" button click logs to console
- [ ] Placeholder behavior does not crash or cause errors

## Performance Considerations

### Rendering
- **Overlay**: Single fillRect call, negligible performance impact
- **Modal**: Reuses existing panel rendering system, no new overhead
- **Buttons**: Static text rendering, minimal performance impact
- **Total**: No measurable performance impact

### Serialization
- **Initial State**: Serialized once at start of combat (one-time cost)
- **Storage**: JSON object stored in memory (small size, <100KB typical)
- **Deserialization**: Only happens on "Try Again" click (acceptable delay)

### Input Handling
- **Event Routing**: Early return if defeat phase active (minimal overhead)
- **Button Hit Detection**: Simple bounding box checks, negligible cost

## Future Extensions

### Multiple Defeat Conditions
- **OR Logic**: Defeat if any condition met (time limit OR all players KO'd)
- **AND Logic**: Defeat only if all conditions met (rare)
- **Implementation**: Extend `CombatDefeatCondition` with composite patterns

### Partial Defeat
- **Mechanic**: Defeat if X% of players KO'd (e.g., 75%)
- **Use Case**: Large party battles with scaling difficulty
- **Implementation**: New condition class `PercentagePlayersKnockedOut`

### Objective-Based Defeat
- **Examples**: VIP unit killed, objective tile captured by enemies, etc.
- **Implementation**: New condition classes extending `CombatDefeatCondition`

### Defeat Statistics
- **Track**: Number of retries, time spent in combat, turns survived
- **Display**: Show stats on defeat modal
- **Use Case**: Player learning, difficulty tuning feedback

### Animated Defeat Transition
- **Fade In**: Modal fades in over 0.5 seconds
- **Shake Effect**: Screen shake when defeat detected
- **Sound Effect**: Play defeat sound/music

### Retry Cost Mechanic
- **Mechanic**: Each retry costs resources (gold, items, etc.)
- **UI**: Show cost on "Try Again" button
- **Limitation**: Maximum retry count before forced skip

### Skip Encounter Confirmation
- **UI**: Show confirmation dialog before skipping
- **Warning**: Emphasize lost rewards (items, XP, gold)
- **Safety**: Prevent accidental skips

## Constants to Add

Add to `CombatConstants.ts`:

```typescript
DEFEAT_SCREEN: {
  // Overlay
  OVERLAY_OPACITY: 0.5,
  OVERLAY_COLOR: '#000000',

  // Modal dimensions
  MODAL_WIDTH: 200,
  MODAL_PADDING: 16,

  // Title
  TITLE_TEXT: 'Defeat',
  TITLE_FONT_ID: 'dungeonslant',
  TITLE_FONT_SIZE: 12,
  TITLE_COLOR: '#ff0000', // Red

  // Buttons
  BUTTON_FONT_ID: '7px-04b03',
  BUTTON_FONT_SIZE: 7,
  BUTTON_COLOR_NORMAL: '#ffffff',
  BUTTON_COLOR_HOVER: '#ffff00', // Yellow
  BUTTON_PADDING: 8,

  // Helper text
  HELPER_FONT_ID: '7px-04b03',
  HELPER_FONT_SIZE: 5,
  HELPER_COLOR: '#aaaaaa', // Light grey
  HELPER_PADDING: 4,

  // Text content
  TRY_AGAIN_TEXT: 'Try Again',
  TRY_AGAIN_HELPER: 'Restart this encounter to try again',
  SKIP_TEXT: 'Skip Encounter',
  SKIP_HELPER: 'Skips this encounter and all rewards',

  // Combat log
  DEFEAT_MESSAGE: 'The enemies have triumphed over you!',
}
```

## Files to Create

### New Files
- `models/combat/CombatDefeatCondition.ts` - Interface and implementations
- `models/combat/phases/DefeatPhaseHandler.ts` - Defeat phase handler
- `models/combat/rendering/DefeatModalRenderer.ts` - Defeat modal rendering

## Files to Modify

### Core Combat System
- `models/combat/CombatState.ts` - Add `initialStateSnapshot` field, add 'defeat' to phase type
- `models/combat/CombatConstants.ts` - Add DEFEAT_SCREEN constants

### Phase Handlers
- `models/combat/phases/UnitTurnPhaseHandler.ts` - Add defeat condition checking
- `models/combat/phases/DeploymentPhaseHandler.ts` - Add initial state serialization
- `models/combat/CombatView.ts` - Add DefeatPhaseHandler to phase handler selection

### Type Exports
- `models/combat/index.ts` - Export CombatDefeatCondition types

## Integration with Existing Systems

### CombatPredicate vs CombatDefeatCondition
- **CombatPredicate**: Used by CombatEncounter for win/loss checks (high-level)
- **CombatDefeatCondition**: Used by phase handlers for in-combat defeat checks (low-level)
- **Relationship**: CombatDefeatCondition is more granular, checked every turn
- **Compatibility**: Both can coexist, serve different purposes

### Relationship to Victory Condition
- **Victory**: Checked first (takes precedence)
- **Defeat**: Checked second (only if victory not met)
- **Mutual Exclusion**: Cannot be both victorious and defeated

### Serialization System Integration
- **Uses**: Existing `serializeCombatState()` and `deserializeCombatState()`
- **Storage**: `initialStateSnapshot` included in combat save data
- **Compatibility**: Works with existing save/load system

## Estimated Complexity

- **Implementation Time**: 6-8 hours
  - Defeat condition system: 1 hour
  - Initial state serialization: 1 hour
  - Defeat phase handler: 2 hours
  - Defeat modal rendering: 2-3 hours
  - Integration and testing: 1-2 hours
- **Testing Time**: 2-3 hours
- **Total**: ~8-11 hours

**Complexity Rating**: Medium

**Risk Level**: Low-Medium
- **Low Risk**: Most systems already exist (rendering, serialization)
- **Medium Risk**: State restoration might have edge cases with complex encounters

## Dependencies

- **Requires**: KO Feature (for `isKnockedOut` property)
- **Requires**: Serialization System (for state save/restore)
- **Requires**: Existing panel rendering system
- **Requires**: Existing font system (dungeonslant, 7px-04b03)

## Compatibility

- **Save/Load**: New `initialStateSnapshot` field added to CombatState
  - Old saves: Will not have snapshot, "Try Again" disabled
  - New saves: Will include snapshot, full functionality
- **Existing Features**: No breaking changes to existing combat systems
- **Future Features**: Designed to support multiple defeat conditions, skip encounter logic

---

## Success Criteria

This feature is complete when:
1. Defeat condition triggers correctly when all players are KO'd
2. Defeat modal renders correctly with all UI elements
3. "Try Again" button successfully restores initial combat state
4. All mouse inputs are properly disabled during defeat phase
5. Combat log shows defeat message
6. "Skip Encounter" button is present but non-functional (placeholder)
7. All edge cases handled gracefully (missing snapshot, deserialization errors, etc.)
8. Tests pass for all core functionality

---

## Notes

- This feature is the foundation for future loss mechanics (skip encounter, statistics, retry costs)
- The pluggable `CombatDefeatCondition` system allows for diverse encounter objectives
- Initial state serialization is crucial for fair retries (no partial progress)
- Consider adding confirmation dialog for "Try Again" if we add retry costs later
