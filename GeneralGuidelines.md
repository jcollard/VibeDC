# VibeDC Development Guidelines

## Rendering Rules

### Always Use Specialized Renderers
- **Sprites**: Use `@react-app/src/utils/SpriteRenderer.ts`
  - Handles sprite sheet slicing and scaling correctly
  - Example: `SpriteRenderer.renderSpriteById(ctx, 'ui-simple-4', spriteImages, 12, x, y, width, height)`
  - **Never use `ctx.drawImage()` directly for sprite sheet images**
  - **Exception**: `ctx.drawImage()` is allowed for copying from off-screen canvases/buffers to the main canvas

- **Text**: Use `@react-app/src/utils/FontAtlasRenderer.ts`
  - Provides pixel-perfect font rendering from font atlases
  - Example: `FontAtlasRenderer.renderText(ctx, 'Hello', x, y, fontId, fontAtlas, scale, 'center', '#ffffff')`
  - Never use `ctx.fillText()` or `ctx.strokeText()`

#### ctx.drawImage() Usage Clarification

**❌ NOT ALLOWED**: Drawing directly from sprite sheet images
```typescript
// BAD: Bypasses SpriteRenderer's slicing logic
const spriteSheet = spriteImages.get('characters');
ctx.drawImage(spriteSheet, sx, sy, sw, sh, x, y, w, h); // Don't do this!

// GOOD: Use SpriteRenderer instead
SpriteRenderer.renderSpriteById(ctx, 'character-1', spriteImages, 12, x, y, w, h);
```

**✅ ALLOWED**: Copying from off-screen canvases or buffers
```typescript
// GOOD: Copying from buffer canvas to main canvas
const buffer = document.createElement('canvas');
// ... render complex content to buffer ...
ctx.drawImage(buffer, x, y); // This is fine and efficient!

// GOOD: Compositing multiple buffers
ctx.drawImage(staticBuffer, 0, 0);
ctx.drawImage(animatedBuffer, x, y);
```

**Why**: `SpriteRenderer` handles sprite sheet slicing, scaling, and coordinate calculations. Using `ctx.drawImage()` directly on sprite sheets would require manually calculating source rectangles and is error-prone. However, using `ctx.drawImage()` to copy from buffers is efficient and idiomatic.

- **Always disable image smoothing**:
  ```typescript
  ctx.imageSmoothingEnabled = false;
  ```

- **Round all coordinates** to integers for pixel-perfect rendering

## Screen Layout & Coordinate Systems

### Tile-Based Grid System
- **Canvas size**: 384×216 pixels
- **Grid**: 32 tiles wide × 18 tiles tall
- **Tile size**: 12×12 pixels

**Example positioning**:
- Rows 0-8, Columns 21-31 (top-right area):
  - x: `21 * 12 = 252px`
  - y: `0 * 12 = 0px`
  - width: `11 * 12 = 132px` (11 columns)
  - height: `9 * 12 = 108px` (9 rows)

### Coordinate Systems
1. **Absolute Canvas Coordinates** (0-384px width, 0-216px height)
   - Used by root canvas rendering
   - Mouse events are converted to these coordinates

2. **Panel-Relative Coordinates** (relative to panel region origin)
   - Used by `PanelContent` implementations
   - `InfoPanelManager` transforms canvas coords to panel-relative
   - Example: If panel is at (252, 120), a click at canvas (260, 130) becomes panel-relative (8, 10)

3. **Tile Coordinates** (0-31 columns, 0-17 rows)
   - Used for map positioning and layout calculations
   - Convert: `pixelX = tileCol * 12`, `pixelY = tileRow * 12`

## State Management

### UI Component State
- **❌ DON'T**: Recreate stateful components every frame
  ```typescript
  // BAD: Creates new button every frame, loses hover state
  render() {
    const button = new Button({ onClick: ... });
    button.render(ctx);
  }
  ```

- **✅ DO**: Cache instances that maintain state
  ```typescript
  // GOOD: Create once, reuse across frames
  private button: Button | null = null;

  render() {
    if (!this.button) {
      this.button = new Button({ onClick: ... });
    }
    this.button.render(ctx);
  }
  ```

- **When to cache**:
  - Components with hover state
  - Components with active/pressed state
  - Components with selection state
  - Any component that changes appearance based on user interaction
  - Interactive panel content (for hover detection across multiple frames)
  - Components that need region/geometry data before first render

- **When to recreate**:
  - Phase changes (deployment → battle)
  - Content type changes (party member list → unit info)
  - Significant state changes that require full reset

### State Storage Locations
- **React state** (`useState`): For state that triggers component re-renders
  - Combat phase, turn number, unit positions
  - Anything that affects multiple systems

- **useRef**: For state that doesn't need re-renders
  - Last frame time, animation frames
  - Cached canvas buffers

- **Class instance variables**: For component-local state
  - Button hover state, scroll positions
  - State that only affects one component

### Triggering Re-renders
- Call `renderFrame()` when visual state changes:
  - Hover state changes
  - Button pressed/released
  - Unit selection changes
  - Animation updates

### Phase Handler Return Value Pattern

When implementing phase handlers that can trigger state changes (phase transitions, unit spawning, etc.), **always capture and apply the return value** from `update()`:

**✅ DO**: Capture and apply returned state
```typescript
// In animation loop
const updatedState = phaseHandlerRef.current.update(combatState, encounter, deltaTime);
if (updatedState && updatedState !== combatState) {
  setCombatState(updatedState);  // Apply the change
}
```

**❌ DON'T**: Ignore the return value
```typescript
// BAD: Phase transitions will silently fail!
phaseHandlerRef.current.update(combatState, encounter, deltaTime);
// State changes are lost - no error thrown!
```

**Why**: Phase handlers return new state objects for phase transitions and other state changes. The `updatePhase()` method in `PhaseBase` delegates to phase-specific logic and returns the result. If you ignore this return value, state updates will be silently discarded without any error messages.

**Pattern in Phase Handlers**:
```typescript
protected updatePhase(
  state: CombatState,
  encounter: CombatEncounter,
  deltaTime: number
): CombatState | null {
  // Check for phase transition
  if (shouldTransition) {
    // Always create new state object (immutability)
    return {
      ...state,
      phase: 'new-phase' as const
    };
  }

  // No state change - return original state
  return state;
}
```

**Real-world bug**: This pattern was discovered when enemy deployment phase wasn't transitioning to battle phase. The phase handler correctly returned new state with `phase: 'battle'`, but CombatView was ignoring the return value. The animations completed, but the phase never changed - a silent failure with no error messages.

### Immutable State Updates

When returning new state from phase handlers or event handlers, **always create a new object**:

**✅ DO**: Create new state object with spread operator
```typescript
return {
  ...state,
  phase: 'battle' as const,
  turnNumber: state.turnNumber + 1
};
```

**❌ DON'T**: Mutate existing state
```typescript
// BAD: Mutates state, breaks React change detection
state.phase = 'battle';
return state;
```

**Why**: React uses reference equality to detect changes. If you mutate the existing object, `updatedState === combatState` will be `true`, and React won't re-render or trigger `useEffect` hooks. Always return a new object when state changes.

### Async Operations with Animations

When implementing components that perform async operations (file loading, network requests) with animation transitions, use a callback lifecycle chain to prevent race conditions:

**✅ DO**: Use sequential callbacks for state transitions
```typescript
interface LoadingViewProps {
  isLoading: boolean;
  onFadeInComplete: () => void;          // Animation fully covers screen
  onLoadReady: () => Promise<LoadResult>; // Perform async operation
  onComplete: (result: LoadResult) => void; // Apply loaded state
  onAnimationComplete?: () => void;      // Animation fully complete, reset flags
}

// In parent component
const handleAnimationComplete = useCallback(() => {
  setIsLoading(false); // Only reset after animation completes
}, []);

// In animation component
useEffect(() => {
  if (currentState === 'FADE_TO_GAME' && elapsedTime >= FADE_DURATION) {
    setCurrentState('COMPLETE');

    // Call parent's cleanup callback
    if (onAnimationComplete) {
      onAnimationComplete();
    }
  }
}, [currentState, elapsedTime, onAnimationComplete]);
```

**❌ DON'T**: Use setTimeout for state cleanup
```typescript
// BAD: Race condition - setTimeout may fire during animation
const handleLoadComplete = (result: LoadResult) => {
  applyState(result);
  setTimeout(() => {
    setIsLoading(false); // May race with animation state machine!
  }, 2000);
};
```

**Why**: setTimeout-based state reset creates race conditions where the parent resets `isLoading` while the animation component is still transitioning. This can cause:
- Double animations (component sees isLoading change back to true)
- Visual glitches (state resets mid-transition)
- Inconsistent UI state

**Real-world bug**: LoadingView was playing animation twice because setTimeout in CombatView was resetting `isLoading=false` while LoadingView was still in FADE_TO_GAME state. The state reset triggered a re-render that somehow restarted the animation.

**Callback Sequence Pattern**:
1. `onFadeInComplete()` → safe to dismount/modify underlying view
2. `onLoadReady()` → perform async operation (file load, network request)
3. `onComplete(result)` → apply loaded state or rollback on error
4. `onAnimationComplete()` → reset loading flags, cleanup

This pattern ensures strict sequencing: parent only resets state after child animation completes.

### Phase Handler Animation State Management

When implementing phase handlers with animation state (progress tracking, timers, flags), phase handlers are **recreated** when transitioning back to the same phase. Ensure animation state is properly initialized:

**✅ DO**: Initialize animation state in constructor
```typescript
export class ActionTimerPhaseHandler extends PhaseBase {
  // Animation state flags
  private turnCalculated: boolean = false;
  private animationStartTime: number = 0;
  private isAnimating: boolean = false;

  // Animation data (using WeakMap - see "WeakMap for Animation Data" section)
  private startTimers: WeakMap<CombatUnit, number> = new WeakMap();
  private targetTimers: WeakMap<CombatUnit, number> = new WeakMap();

  constructor() {
    super();
    // State is automatically reset because constructor runs on each phase entry
    // No explicit reset needed - fresh instance = fresh state
  }

  protected updatePhase(...): CombatState | null {
    // First frame: calculate and start animation
    if (!this.turnCalculated) {
      this.startAnimation(state.unitManifest);
      this.turnCalculated = true;
    }

    // Subsequent frames: animate
    if (this.isAnimating) {
      this.animationStartTime += deltaTime;
      // ... animate timers ...
    }

    // Transition when complete
    if (progress >= 1.0) {
      return { ...state, phase: 'unit-turn' };
    }

    return state;
  }
}
```

**✅ ALSO ACCEPTABLE**: Explicit reset method (if needed for testing or reuse)
```typescript
export class ActionTimerPhaseHandler extends PhaseBase {
  private turnCalculated: boolean = false;
  private animationStartTime: number = 0;
  private isAnimating: boolean = false;

  constructor() {
    super();
    this.resetAnimationState();
  }

  private resetAnimationState(): void {
    this.turnCalculated = false;
    this.animationStartTime = 0;
    this.isAnimating = false;
    // WeakMaps auto-cleanup, but we could recreate them if needed
    this.startTimers = new WeakMap();
    this.targetTimers = new WeakMap();
  }
}
```

**❌ DON'T**: Forget that handlers are recreated on phase re-entry
```typescript
// BAD: Assumes handler persists across phase transitions
export class ActionTimerPhaseHandler extends PhaseBase {
  private animationPlayed: boolean = false;

  protected updatePhase(...): CombatState | null {
    // BUG: This will ALWAYS be false because constructor resets it!
    if (!this.animationPlayed) {
      playAnimation();
      this.animationPlayed = true;  // Never persists to next phase entry
    }
  }
}
```

**Why**: Phase handlers are instantiated when a phase is entered. When transitioning deployment → action-timer → unit-turn → action-timer, the second action-timer phase gets a **new instance** of ActionTimerPhaseHandler. Any state in the old instance is lost.

**Implications**:
- ✅ Animation state automatically resets on re-entry (usually desired)
- ✅ No need to explicitly clear animation flags
- ⚠️ Can't persist state across multiple visits to same phase (use CombatState for that)
- ⚠️ Instance variables only exist during one continuous phase period

**When to use CombatState vs instance variables**:
- **CombatState**: Persists across phase transitions (turn count, unit positions)
- **Instance variables**: Only exists during current phase (animation progress, cached UI)

**Real-world example**: ActionTimerPhaseHandler uses instance variables for animation state (`animationStartTime`, `turnCalculated`). These reset to initial values each time combat returns to action-timer phase, ensuring the animation plays fresh each turn.

### WeakMap for Object-to-ID Mapping

When you need bidirectional lookup between objects and IDs, use `Map` for primary storage and `WeakMap` for reverse lookup:

**✅ DO**: Use WeakMap for object-to-ID mapping
```typescript
class UnitManager {
  private units: Map<string, Unit>;  // ID -> Unit (primary storage)
  private unitToId: WeakMap<Unit, string> = new WeakMap();  // Unit -> ID
  private nextUnitId: number = 0;

  addUnit(unit: Unit): string {
    // Check if already has ID
    const existingId = this.unitToId.get(unit);
    if (existingId) return existingId;

    // Generate new unique ID
    const id = `${unit.name}-${this.nextUnitId++}`;
    this.units.set(id, unit);
    this.unitToId.set(unit, id);
    return id;
  }

  getIdForUnit(unit: Unit): string | undefined {
    return this.unitToId.get(unit);  // O(1) lookup
  }

  removeUnit(unit: Unit): void {
    const id = this.unitToId.get(unit);
    if (id) {
      this.units.delete(id);
      this.unitToId.delete(unit);  // Clean up WeakMap entry
    }
  }
}
```

**❌ DON'T**: Use Map for object-to-ID (prevents garbage collection)
```typescript
// BAD: Prevents units from being garbage collected
private unitToId: Map<Unit, string> = new Map();
// Even after removing unit from primary storage, Map keeps reference
```

**❌ DON'T**: Use object properties as map keys (not unique)
```typescript
// BAD: Multiple units with same name overwrite each other!
private units: Map<string, Unit>;  // Map of unit name to unit

addUnit(unit: Unit): void {
  this.units.set(unit.name, unit);  // "Goblin" overwrites previous "Goblin"!
}
```

**Benefits**:
- WeakMap allows garbage collection when units are removed from primary storage
- O(1) lookup performance for both directions (ID→Unit and Unit→ID)
- Type-safe without string manipulation
- No memory leaks from orphaned references
- Auto-incrementing counter ensures uniqueness even for units with same name

**When to use**:
- Object instances need stable IDs throughout their lifetime
- Bidirectional lookup is needed (both ID→Object and Object→ID)
- Objects should be garbage-collectable when removed from primary storage
- Multiple objects may share the same name/properties

**Real-world bug**: CombatUnitManifest originally used `unit.name` as the map key. When combat had 4 Goblins, they all overwrote each other in the map, leaving only 1 Goblin. Fixed by using auto-incrementing IDs with WeakMap for reverse lookup.

### WeakMap for Animation Data

When storing temporary data associated with unit instances (animation targets, cached values, progress tracking), use WeakMap instead of Map with unit names or other properties:

**✅ DO**: Use WeakMap with unit instances as keys
```typescript
export class ActionTimerPhaseHandler extends PhaseBase {
  // Animation state - stores per-unit data keyed by unit instance
  private startTimers: WeakMap<CombatUnit, number> = new WeakMap();
  private targetTimers: WeakMap<CombatUnit, number> = new WeakMap();

  private startAnimation(manifest: CombatUnitManifest): void {
    for (const placement of manifest.getAllUnits()) {
      const unit = placement.unit;

      // Store data keyed by unit instance
      this.startTimers.set(unit, unit.actionTimer);
      const targetValue = calculateTarget(unit);
      this.targetTimers.set(unit, targetValue);
    }
  }

  protected updatePhase(state: CombatState, ...): CombatState | null {
    for (const placement of state.unitManifest.getAllUnits()) {
      const unit = placement.unit;

      // Retrieve data using unit instance as key
      const startValue = this.startTimers.get(unit) || 0;
      const targetValue = this.targetTimers.get(unit) || 0;
      const currentValue = lerp(startValue, targetValue, progress);

      // Update unit state
      (unit as any)._actionTimer = currentValue;
    }
  }
}
```

**❌ DON'T**: Use unit names as map keys
```typescript
// BAD: Breaks with duplicate names
private startTimers: Map<string, number> = new Map();
private targetTimers: Map<string, number> = new Map();

private startAnimation(manifest: CombatUnitManifest): void {
  for (const placement of manifest.getAllUnits()) {
    const unit = placement.unit;

    // PROBLEM: If there are 3 "Goblin" units, they all use same key!
    this.startTimers.set(unit.name, unit.actionTimer);  // Overwrites previous Goblin!
    this.targetTimers.set(unit.name, targetValue);      // Only stores data for last Goblin
  }
}

protected updatePhase(...): CombatState | null {
  // BUG: All Goblins get the same animation values because they share a key
  const startValue = this.startTimers.get(unit.name);  // Wrong value!
}
```

**Benefits**:
- Works correctly with duplicate unit names (multiple "Goblin" units)
- Automatic garbage collection when units are removed from combat
- Type-safe (compiler prevents using wrong key type)
- No memory leaks from orphaned animation data
- Cleaner code (no need to generate unique string keys)

**When to use**:
- Temporary animation data tied to unit instances (start/target values, progress)
- Per-unit cached calculations during a phase
- Any per-unit state that doesn't need to persist after the phase or combat ends
- Animation state in phase handlers

**Real-world bug**: ActionTimerPhaseHandler originally used `Map<string, number>` with `unit.name` as keys. When combat had multiple units with the same name (e.g., 3 Goblins), the animation only tracked data for one Goblin - all three would animate to the same target value. Fixed by using `WeakMap<CombatUnit, number>` with unit instances as keys.

## Event Handling

### Mouse Event Flow
1. **Canvas event handler** (CombatView)
   - Receives browser mouse event
   - Converts to canvas coordinates using `inputHandler.getCanvasCoordinates()`

2. **Layout regions** (CombatLayoutManager)
   - Check if click is within specific regions (panels, buttons, map)
   - Transform canvas coords to region-relative coords

3. **Panel managers** (InfoPanelManager)
   - Transform canvas coords to panel-relative coords
   - Forward to panel content

4. **Panel content** (PartyMembersContent, UnitInfoContent)
   - Handle in panel-relative coordinates
   - Update component state, return results

### Coordinate Transformation Pattern
```typescript
// Canvas → Panel-relative
const relativeX = canvasX - panelRegion.x;
const relativeY = canvasY - panelRegion.y;

// Panel-relative → Component-absolute (for rendering)
const absoluteX = panelRegion.x + relativeX;
const absoluteY = panelRegion.y + relativeY;
```

### When to Call renderFrame()
- After any mouse interaction that changes visual state
- After animation updates
- When hover state changes
- When selection changes
- **Not needed**: When state change will trigger React re-render

### Type-Safe Event Results with Discriminated Unions

When designing event handlers that return different result types, use discriminated unions instead of runtime type checks:

**✅ DO**: Use discriminated unions
```typescript
// Define all possible result types
export type PanelClickResult =
  | { type: 'button'; buttonId?: string }
  | { type: 'party-member'; index: number }
  | { type: 'unit-selected'; unitId: string }
  | null;

// Type-safe handling with switch
const result = panelManager.handleClick(x, y);
if (result !== null) {
  switch (result.type) {
    case 'button':
      // TypeScript knows result.buttonId exists
      break;
    case 'party-member':
      // TypeScript knows result.index exists
      deployUnit(result.index);
      break;
  }
}
```

**❌ DON'T**: Use runtime type checks
```typescript
// BAD: Fragile, no type safety
const result = panelManager.handleClick(x, y);
if (result && typeof result === 'object' && 'type' in result) {
  if (result.type === 'party-member' && 'index' in result) {
    deployUnit((result as any).index); // Type cast needed!
  }
}
```

**Benefits**:
- Compile-time type checking prevents typos
- Auto-complete for result properties
- Exhaustiveness checking in switch statements
- No `any` casts needed

### Generic Data Field Pattern

When event results need to carry phase-specific data, use a generic data field rather than type-specific fields:

**✅ DO**: Use generic data field
```typescript
// Interface with generic data
export interface PhaseEventResult<TData = unknown> {
  handled: boolean;
  newState?: CombatState;
  logMessage?: string;
  data?: TData; // Type-safe phase-specific data
}

// Phase-specific types
export interface DeploymentPanelData {
  type: 'party-member-hover';
  memberIndex: number;
}

// Type-safe return
handleInfoPanelHover(...): PhaseEventResult<DeploymentPanelData> {
  return {
    handled: true,
    data: { type: 'party-member-hover', memberIndex: 2 }
  };
}
```

**❌ DON'T**: Add type-specific fields directly
```typescript
// BAD: Interface grows with each new use case
export interface PhaseEventResult {
  handled: boolean;
  newState?: CombatState;
  hoveredPartyMemberIndex?: number; // Deployment-specific
  selectedAbilityId?: string; // Battle-specific
  targetUnitId?: string; // Battle-specific
  // ... grows endlessly
}
```

**Benefits**:
- Each phase defines its own data types
- Interface remains clean and generic
- Type safety when accessing phase-specific data
- No mixing of unrelated fields

## Component Architecture

### Full-Screen Transition Components

When implementing overlay components for async operations (loading screens, transitions, dialogs) that need to dismount/remount underlying views:

**✅ DO**: Use absolute positioning with flexbox centering, callback chain for lifecycle
```typescript
// Overlay component (LoadingView)
<canvas
  ref={canvasRef}
  width={canvasWidth}
  height={canvasHeight}
  style={{
    position: 'absolute',
    // Don't set top/left - participate in parent's flexbox centering
    ...displayStyle, // Inherit scaling from parent
    zIndex: 1000,
    pointerEvents: isAnimating ? 'auto' : 'none',
    imageRendering: 'pixelated',
    objectFit: 'contain',
  }}
/>

// Parent component structure
<div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  {/* Overlay - always rendered, controls own visibility */}
  <TransitionOverlay
    isActive={isLoading}
    canvasSnapshot={snapshotRef.current}
    displayStyle={canvasDisplayStyle}
    onFadeInComplete={() => setShowContent(false)}
    onComplete={(result) => applyResult(result)}
    onAnimationComplete={() => setIsLoading(false)}
  />

  {/* Content - conditionally rendered */}
  {showContent && (
    <canvas ref={contentCanvasRef} style={canvasDisplayStyle} />
  )}
</div>
```

**❌ DON'T**: Use fixed positioning or manage overlay visibility from parent
```typescript
// BAD: Fixed positioning doesn't respect parent scaling/centering
<canvas
  style={{
    position: 'fixed',
    top: 0,
    left: 0, // Ignores parent centering!
    zIndex: 1000
  }}
/>

// BAD: Parent manages overlay visibility
{isLoading && <LoadingView />} // Dismounts component, loses animation state!
```

**Key Principles**:
1. **Positioning**: Use `position: absolute` without top/left to participate in parent's flexbox layout
2. **Always Rendered**: Overlay component manages own visibility via opacity/pointer-events, not parent conditional rendering
3. **Display Style Inheritance**: Pass parent's `displayStyle` (scaling, size) to overlay for exact alignment
4. **Conditional Content**: Parent conditionally renders underlying content via `{showContent && <Content />}`
5. **Callback Lifecycle**: Use sequential callbacks for state transitions (see "Async Operations with Animations")

**Benefits**:
- Overlay perfectly covers content regardless of scaling/centering
- Eliminates React state timing issues during dismount/remount
- Reusable pattern for any full-screen transition
- Clean separation: overlay manages animation, parent manages content lifecycle

**Real-world example**: LoadingView implements this pattern to provide loading transitions for CombatView save/load operations. It dithers from a canvas snapshot to "Loading..." text, dismounts CombatView during the async load, then dithers back to the new state (or rolls back to snapshot on error).

### PanelContent Interface
Implement `PanelContent` for any content displayed in info panels:

```typescript
interface PanelContent {
  render(ctx, region, fontId, fontAtlasImage): void;
  handleClick?(relativeX, relativeY): unknown;
  handleHover?(relativeX, relativeY): unknown;
  handleMouseDown?(relativeX, relativeY): boolean;
}
```

**Key points**:
- All coordinates are **panel-relative**
- `region` parameter provides panel position/size for rendering
- Return values can be custom (number for index, string for signals, etc.)

### Creating Reusable UI Components
- Design for **panel-relative coordinates** if used in panels
- Accept callbacks via constructor (don't hardcode behavior)
- Provide methods for state queries (`isHovered()`, `isActive()`)
- Document coordinate system used

### Passing Data Through Render Context
Add properties to `LayoutRenderContext` for data needed during rendering:
- Keeps rendering code pure (no external dependencies)
- Makes data flow explicit
- Example: `deployedUnitCount`, `onEnterCombat` callback

### Accessing Phase-Specific Methods

When phase handlers define their own specialized methods, use type-safe checks instead of casting to `any`:

**✅ DO**: Check method exists, then cast to specific type
```typescript
if ('handleDeploymentAction' in phaseHandlerRef.current) {
  const handler = phaseHandlerRef.current as DeploymentPhaseHandler;
  const result = handler.handleDeploymentAction(index, state, encounter);
  // TypeScript knows all methods available on DeploymentPhaseHandler
}
```

**❌ DON'T**: Cast to `any`
```typescript
// BAD: No type safety
const handler = phaseHandlerRef.current as any;
if (handler.handleDeploymentAction) {
  handler.handleDeploymentAction(index, state, encounter);
}
```

**Migration Note**: When removing deprecated optional methods from base classes, provide a migration comment showing the new pattern for accessing phase-specific methods.

## Common Patterns

### Conditional Rendering Based on Phase
```typescript
if (combatState.phase === 'deployment') {
  // Render deployment-specific UI
} else if (combatState.phase === 'battle') {
  // Render battle-specific UI
}
```

### Hover Detection Pattern
```typescript
handleHover(relativeX: number, relativeY: number): number | null {
  // Check bounds for each interactive element
  if (relativeX >= x && relativeX < x + width &&
      relativeY >= y && relativeY < y + height) {
    return elementIndex; // Or other identifier
  }
  return null;
}
```

### Panel Content Region Requirements

When implementing `PanelContent` with hover detection that relies on cached region data:

**❌ DON'T**: Assume the region is always available
```typescript
// BAD: lastRegion might be null before first render
private lastRegion: PanelRegion | null = null;

render(ctx, region, ...) {
  this.lastRegion = region; // Only set during render
}

handleHover(relativeX, relativeY): number | null {
  if (!this.lastRegion) return null; // Fails before first render!
  // ... hover detection using this.lastRegion
}
```

**✅ DO**: Provide a method to explicitly update the region before hover detection
```typescript
// GOOD: Explicit region update method
updateRegion(region: PanelRegion): void {
  this.lastRegion = region;
}

// Phase handler ensures region is set before hover detection
handleInfoPanelHover(relativeX, relativeY, panelRegion, ...) {
  this.cachedContent.updateRegion(panelRegion); // Set before detection
  const hoveredIndex = this.cachedContent.handleHover(relativeX, relativeY);
  this.cachedContent.updateHoveredIndex(hoveredIndex); // Update state
  return hoveredIndex;
}
```

**Why**: Hover detection may occur before the first render, when `lastRegion` cached during `render()` is still null. Always ensure the region is available before hover detection runs.

**Pattern Summary**:
1. Cache the region in `render()` for normal operation
2. Provide `updateRegion()` method for pre-render hover detection
3. Call `updateRegion()` before `handleHover()` in phase handlers

### Button Click Pattern (Mouse Down + Mouse Up)
```typescript
// On mouse down: set active state
handleMouseDown(relativeX, relativeY): boolean {
  if (this.contains(relativeX, relativeY)) {
    this.isActive = true;
    return true; // Handled
  }
  return false;
}

// On mouse up: trigger action if still over button
handleMouseUp(relativeX, relativeY): boolean {
  if (this.isActive && this.contains(relativeX, relativeY)) {
    this.isActive = false;
    this.onClick?.(); // Trigger callback
    return true;
  }
  this.isActive = false;
  return false;
}
```

## Debug Tools

### Debug Grid Overlay
- Enable in CombatView settings to show 12×12 tile grid
- Shows row/column numbers for easy position reference
- Toggle with `showDebugGrid` state

### Console Logging Best Practices
- Use prefixes for filtering: `[ComponentName] message`
- Log coordinate values when debugging positioning
- Log state changes for interaction debugging
- Remove or comment out logs before committing

### Creating Browser Console Debug Utilities

For complex interactive systems (combat, dialogs, menus), create dedicated debugging utilities accessible via browser console:

**✅ DO**: Create a debug utility class exposed on window
```typescript
// utils/SystemDebugger.ts
class SystemDebuggerClass {
  private loggingEnabled = false;

  enableLogging(): void {
    this.loggingEnabled = true;
    console.log('[SystemDebugger] Logging ENABLED');
  }

  disableLogging(): void {
    this.loggingEnabled = false;
  }

  isLoggingEnabled(): boolean {
    return this.loggingEnabled;
  }

  simulateEvent(x: number, y: number): void {
    // Dispatch synthetic events for testing
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const event = new MouseEvent('mousemove', {
      clientX: rect.left + x,
      clientY: rect.top + y,
      bubbles: true
    });
    canvas.dispatchEvent(event);
  }

  help(): void {
    console.log('Available commands: ...');
  }
}

export const SystemDebugger = new SystemDebuggerClass();

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as any).SystemDebugger = SystemDebugger;
  console.log('[SystemDebugger] Ready! Type SystemDebugger.help() for usage');
}
```

**Using Debug Utilities in Components:**
```typescript
// Gate logging behind debugger check (zero runtime cost when disabled)
if (typeof window !== 'undefined' && (window as any).SystemDebugger?.isLoggingEnabled()) {
  console.log('[Component] Event details:', { x, y, result });
}
```

**Benefits:**
- Test interactions without manual mouse movements
- Reproduce bugs reliably with exact coordinates
- Get detailed event flow logs on demand
- Zero runtime cost when not in use
- Professional debugging experience

**Example Usage (Browser Console):**
```javascript
SystemDebugger.enableLogging()          // Enable detailed logs
SystemDebugger.simulateEvent(280, 145)  // Simulate mouse at position
SystemDebugger.getCanvasInfo()          // Show canvas details
SystemDebugger.help()                   // Show all commands
```

## Performance Considerations

- **Don't recreate heavy objects every frame** (sprites, fonts, buffers)
- **Cache computed values** when possible (text measurements, bounds)
- **Use off-screen canvases** for complex rendering (combat log buffer)
- **Limit re-renders**: Only call `renderFrame()` when visuals actually change

### Animation Sequence Pattern

When implementing `CinematicSequence` for animations, cache reusable resources:

**✅ DO**: Cache off-screen canvas as instance variable
```typescript
export class MySequence implements CinematicSequence {
  // Cache off-screen canvas if used every frame
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  render(state, encounter, context): void {
    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
      if (this.offscreenCtx) {
        this.offscreenCtx.imageSmoothingEnabled = false;
      }
    }
    // Clear and reuse canvas...
    this.offscreenCtx?.clearRect(0, 0, width, height);
    // Render to cached canvas...
  }
}
```

**❌ DON'T**: Create new canvas objects every frame
```typescript
// BAD: Creates new canvas 60 times per second
render() {
  const canvas = document.createElement('canvas'); // Expensive allocation!
  const ctx = canvas.getContext('2d');
  // ...
}
```

**Why**: Canvas creation involves DOM allocation and context setup. For animations that render every frame (60fps), this creates unnecessary garbage collection pressure and performance overhead.

**Exception**: For one-time or infrequent rendering (< 1 fps), creating a canvas locally is acceptable if it simplifies cleanup and the performance impact is negligible.

### Canvas Snapshot Pattern

When implementing transitions or operations that need to preserve current canvas state (for rollback or morphing effects):

**✅ DO**: Create snapshot canvas before state change
```typescript
const captureCanvasSnapshot = useCallback((): HTMLCanvasElement | null => {
  const displayCanvas = displayCanvasRef.current;
  if (!displayCanvas) return null;

  const snapshot = document.createElement('canvas');
  snapshot.width = CANVAS_WIDTH;
  snapshot.height = CANVAS_HEIGHT;

  const ctx = snapshot.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(displayCanvas, 0, 0);

  return snapshot;
}, []);

// Before async operation
const snapshotRef = useRef<HTMLCanvasElement | null>(null);
snapshotRef.current = captureCanvasSnapshot();
performAsyncOperation();
```

**❌ DON'T**: Try to restore from React state or props
```typescript
// BAD: Can't capture visual state, only data state
const [oldState, setOldState] = useState(currentState);
// If render fails, can't roll back to exact visual appearance
```

**Use Cases**:
- **Error rollback**: Restore previous canvas if load operation fails
- **Transition effects**: Dither/morph between old and new states
- **Undo operations**: Preview changes before committing
- **Loading screens**: Show static snapshot while dismounting/remounting components

**Benefits**:
- Preserves exact visual state including animations mid-frame
- Enables smooth transitions between different states
- Allows error recovery without jarring jumps
- Independent of data state (captures rendered output)

**Pattern in LoadingView**: Captures canvas snapshot before dismounting CombatView, uses snapshot for dithered fade-in effect, can restore snapshot on load failure.

### Animation Performance Pattern

When animating content that includes static elements, separate static from dynamic:

- **✅ DO**: Use a two-buffer approach
  ```typescript
  // GOOD: Static buffer + animated overlay
  renderStaticMessages(); // Only when dirty
  const animatedCanvas = renderAnimatingMessage(); // Every frame
  ctx.drawImage(staticBuffer, ...); // Copy static
  ctx.drawImage(animatedCanvas, ...); // Overlay animated
  ```

- **❌ DON'T**: Re-render everything on every frame
  ```typescript
  // BAD: Re-renders all messages every frame
  for (const message of messages) {
    renderMessage(message); // Expensive!
  }
  ```

### Pre-Parse and Cache

- Parse complex data (tags, segments) once when data arrives
- Store parsed results alongside raw data
- Never re-parse during animation loops

**Example**:
```typescript
interface StoredMessage {
  rawText: string;
  segments: TextSegment[]; // Pre-parsed once
  plainTextLength: number; // Pre-calculated once
}
```

### Mouse Event Performance

**❌ DON'T**: Call `renderFrame()` synchronously in high-frequency mouse event handlers
```typescript
// BAD: Blocks animation loop
handleMouseMove(x, y) {
  this.hoveredItem = this.detectHover(x, y);
  renderFrame(); // Can fire 100+ times/second, blocks main thread!
}
```

**✅ DO**: Update state only, let animation loop handle rendering
```typescript
// GOOD: Fast state update, rendering happens in animation loop
handleMouseMove(x, y) {
  this.hoveredItem = this.detectHover(x, y);
  // Animation loop will render on next frame (~16ms)
}
```

**Why**: Mouse move events can fire hundreds of times per second. Synchronous rendering blocks the animation loop, causing stutters and pauses in other animations.

**Exception**: You may call `renderFrame()` for discrete events (clicks, button press) where immediate visual feedback is critical and the event frequency is low.

## Resource Loading Patterns

### Centralized Loader Services

For resources used across multiple components (fonts, sprites, textures), create a centralized loader service:

**✅ DO**: Single loader service with caching
```typescript
// services/FontAtlasLoader.ts
export class FontAtlasLoader {
  private cache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();

  async load(fontId: string): Promise<HTMLImageElement> {
    if (this.cache.has(fontId)) return this.cache.get(fontId)!;
    if (this.loadingPromises.has(fontId)) return this.loadingPromises.get(fontId)!;

    // Load and cache...
  }

  get(fontId: string): HTMLImageElement | null {
    return this.cache.get(fontId) || null;
  }
}

// Usage in CombatView
const fontLoader = useMemo(() => new FontAtlasLoader(), []);
const fontAtlas = fontLoader.get('7px-04b03');
```

**❌ DON'T**: Duplicate loading logic in each component
```typescript
// BAD: Each component loads its own fonts
class DeploymentUI {
  private fontCache: Map<string, HTMLImageElement> = new Map();
  private async loadFont(fontId: string) { /* duplicate logic */ }
}

function CombatView() {
  const fontCache = useRef<Map<string, HTMLImageElement>>(new Map());
  // More duplicate loading logic...
}
```

**Benefits**:
- Single source of truth for loaded resources
- Promise deduplication (multiple requests = one network call)
- Consistent caching behavior
- Easier to debug and test

### Viewport-Aware Rendering

When rendering scrollable content with many items:

- **Calculate visible range** based on viewport size, not total item count
- **Limit rendering loops** to only what fits in the viewport
- **Add safety checks** to prevent rendering outside viewport bounds

```typescript
// GOOD: Only render what's visible
const maxVisibleLines = Math.min(bufferLines, Math.floor(height / lineHeight));
const startIdx = Math.max(0, totalItems - maxVisibleLines - scrollOffset);
const endIdx = totalItems - scrollOffset;

for (let i = startIdx; i < endIdx && i < startIdx + maxVisibleLines; i++) {
  const destY = y + ((i - startIdx) * lineHeight);

  // Safety check
  if (destY + lineHeight > y + height) {
    break;
  }

  renderItem(i, destY);
}
```

**Why**: Prevents rendering items that would be clipped or invisible, saving CPU cycles and avoiding layout bugs.

---

## Animation State Management Pattern

When implementing components with animation queues and state machines, proper handling of animation state is critical to prevent bugs like messages getting stuck in queues or animations never completing.

### Handle Instant/Infinite Speed as Immediate Completion

**✅ DO**: Mark instant animations as complete immediately
```typescript
addMessage(message: string, charsPerSecond?: number): void {
  // ... add message to storage ...

  // Calculate animation duration
  const speed = charsPerSecond ?? this.DEFAULT_CHARS_PER_SECOND;
  this.animationDuration = plainTextLength / speed;

  // Start animation for the new message
  this.animatingMessageIndex = this.messages.length - 1;

  // If animation duration is 0 (instant/infinite speed), complete immediately
  if (this.animationDuration === 0 || !isFinite(this.animationDuration)) {
    this.animationProgress = 1;  // ✅ Complete immediately
    this.animationCharsShown = plainTextLength;
  } else {
    this.animationProgress = 0;  // Start animation normally
    this.animationCharsShown = 0;
  }
}
```

**❌ DON'T**: Treat infinite speed as zero-duration animation
```typescript
// BAD: Zero duration still starts animation with progress = 0
addMessage(message: string, charsPerSecond?: number): void {
  const speed = charsPerSecond ?? 60;
  this.animationDuration = plainTextLength / Infinity;  // = 0

  this.animatingMessageIndex = this.messages.length - 1;
  this.animationProgress = 0;  // ❌ Looks like animation in progress!
  this.animationCharsShown = 0;

  // Next message checks: if (this.animationProgress < 1)
  // Result: Gets queued even though previous message was "instant"
}
```

**Why**: Animation queue checks typically use `animationProgress < 1` to determine if an animation is in progress. If instant messages start with `progress = 0`, they appear to be animating, causing all subsequent messages to be queued even though the animation should have completed instantly.

**Real-world bug**: CombatLogManager was adding messages with `Infinity` chars/sec during save/load, but only the first message displayed because all others were queued behind the "animating" first message.

### Reset All Animation State in Clear Methods

**✅ DO**: Reset all animation state, not just data
```typescript
clear(): void {
  // Clear data
  this.messages = [];
  this.scrollOffset = 0;

  // Reset animation state
  this.animatingMessageIndex = -1;
  this.animationProgress = 1;  // Mark as complete
  this.animationCharsShown = 0;

  // Clear message queue
  this.messageQueue = [];  // ✅ Don't forget the queue!

  // Mark buffers dirty
  this.staticBufferDirty = true;
}
```

**❌ DON'T**: Leave animation state inconsistent
```typescript
// BAD: Clears data but leaves animation state
clear(): void {
  this.messages = [];
  this.scrollOffset = 0;
  this.staticBufferDirty = true;

  // ❌ Forgot to reset:
  // - this.animatingMessageIndex (still points to old message)
  // - this.animationProgress (might be < 1)
  // - this.messageQueue (still has queued messages)

  // Result: Next addMessage() sees animation in progress, gets queued!
}
```

**Why**: If `clear()` doesn't reset animation state, the next `addMessage()` call might see an animation "in progress" and queue the message instead of adding it immediately. This creates a permanently stuck queue where no messages ever display.

### Check Completion Before Queuing

**✅ DO**: Use proper completion checks
```typescript
addMessage(message: string): void {
  // Check if animation is truly in progress
  if (this.animatingMessageIndex >= 0 && this.animationProgress < 1) {
    this.messageQueue.push({ message });  // Queue for later
    return;
  }

  // No animation in progress, add immediately
  this.messages.push(message);
  this.animatingMessageIndex = this.messages.length - 1;
  this.animationProgress = 0;
}
```

**Common Pitfall**: Using only `animatingMessageIndex >= 0` without checking `animationProgress < 1` means completed animations still block new messages.

### Summary

When implementing animation systems:
1. **Instant animations** (duration = 0 or Infinity) → set `progress = 1` immediately
2. **Clear/reset methods** → reset animation state AND queues
3. **Queue checks** → verify animation is incomplete (`progress < 1`), not just started (`index >= 0`)
4. **State consistency** → all animation variables should be reset together

These patterns prevent bugs where:
- Messages get stuck in queues
- Animations never complete
- Clear operations leave inconsistent state
- Instant operations behave like slow animations

---

## TypeScript Patterns

### Using Const Objects Instead of Enums

When TypeScript's `erasableSyntaxOnly` mode is enabled, enums are not allowed. Use const objects with type assertions instead:

**✅ DO**: Use const object with type assertion
```typescript
// Define the object with const assertion
const LoadingState = {
  IDLE: 'idle',
  FADE_TO_LOADING: 'fade-to-loading',
  LOADING: 'loading',
  FADE_TO_GAME: 'fade-to-game',
  COMPLETE: 'complete',
} as const;

// Extract the type from the object
type LoadingState = (typeof LoadingState)[keyof typeof LoadingState];

// Usage (same as enum)
let currentState: LoadingState = LoadingState.IDLE;

if (currentState === LoadingState.FADE_TO_LOADING) {
  // Type-safe access
}
```

**❌ DON'T**: Use enum with erasableSyntaxOnly
```typescript
// BAD: Causes TS1294 error with erasableSyntaxOnly
enum LoadingState {
  IDLE = 'idle',
  FADE_TO_LOADING = 'fade-to-loading',
  // ...
}
```

**Benefits of Const Object Pattern**:
- Works with `erasableSyntaxOnly` mode (required by some build tools)
- Maintains full type safety (autocomplete, exhaustiveness checks)
- Same developer experience as enums
- Runtime value is just a plain object (no enum codegen)
- String literal types enable discriminated unions

**When to Use**:
- Project uses `erasableSyntaxOnly` in tsconfig.json
- Build tool doesn't support enum syntax
- Want to avoid enum codegen overhead
- Need string literal types for discriminated unions

**Real-world usage**: LoadingView uses this pattern for its state machine to avoid TS1294 errors while maintaining type safety for state transitions.

---

## Meta-Guidelines for AI Development

### At the Start of Each Development Session
- **Acknowledge** that you have read and reviewed these guidelines
- Confirm understanding of the relevant sections for the task at hand

### During Large Coding Tasks
- **Continuously evaluate** if new patterns or lessons learned should be added to these guidelines
- **Propose updates** to GeneralGuidelines.md when you identify:
  - New common patterns that should be standardized
  - Mistakes or anti-patterns that should be documented
  - Missing information that would prevent future issues
  - Better approaches than what's currently documented
  - Ambiguities or edge cases that need clarification

### After Completing Implementation
- **Review compliance** with these guidelines
- **Identify deviations** and determine if they were justified or problematic
- **Propose guideline updates** based on lessons learned
- **Document new patterns** that emerged during implementation

## Common Pitfalls

This section documents subtle bugs and anti-patterns discovered during development. Learn from these real-world mistakes to avoid them in your own code.

### Ignoring Phase Handler Return Values

**Symptom**: Phase transitions don't work, state changes are lost, but no errors are thrown.

**Cause**: Phase handler `update()` method returns new state, but calling code ignores it.

**Example of the Bug**:
```typescript
// In animation loop - looks innocent but broken!
if (!cinematicPlaying && phaseHandlerRef.current.update) {
  phaseHandlerRef.current.update(combatState, encounter, deltaTime);
  // ❌ Return value ignored - state changes are lost!
}
```

**What Happens**:
1. EnemyDeploymentPhaseHandler completes animations
2. Returns new state: `{ ...state, phase: 'battle' }`
3. Return value is discarded
4. CombatView continues using old state with `phase: 'enemy-deployment'`
5. No error message - just broken behavior

**The Fix**:
```typescript
if (!cinematicPlaying && phaseHandlerRef.current.update) {
  const updatedState = phaseHandlerRef.current.update(combatState, encounter, deltaTime);
  if (updatedState && updatedState !== combatState) {
    setCombatState(updatedState);  // ✅ Apply the state change
  }
}
```

**Why This is Subtle**:
- No TypeScript error (return value is optional to use)
- No runtime error (function executes successfully)
- Animations still play correctly
- Only the state transition fails
- Debugging is difficult without logging

**Prevention**:
- Always check method return types
- Capture return values from state update methods
- Add console logging during phase transitions
- Test phase transitions thoroughly

### Using Object Properties as Unique Keys

**Symptom**: Multiple objects with the same name/property overwrite each other in a Map or similar collection.

**Cause**: Using non-unique object properties (like `name`) as map keys when multiple objects share the same value.

**Example of the Bug**:
```typescript
class CombatUnitManifest {
  private units: Map<string, UnitPlacement>;  // Map of unit name to placement

  addUnit(unit: CombatUnit, position: Position): void {
    this.units.set(unit.name, { unit, position });
    // ❌ Multiple "Goblin" units overwrite each other!
  }
}
```

**What Happens**:
1. Add "Goblin" unit at position (5, 3) → `Map { "Goblin" => { unit1, (5,3) } }`
2. Add another "Goblin" at position (7, 8) → `Map { "Goblin" => { unit2, (7,8) } }`
3. First Goblin is lost! Only second one remains
4. Battle starts with 1 Goblin instead of 2
5. No error message - just missing units

**The Fix**:
```typescript
class CombatUnitManifest {
  private units: Map<string, UnitPlacement>;  // Map of unique ID to placement
  private unitToId: WeakMap<CombatUnit, string> = new WeakMap();
  private nextUnitId: number = 0;

  private generateUnitId(unit: CombatUnit): string {
    const existingId = this.unitToId.get(unit);
    if (existingId) return existingId;

    const id = `${unit.name}-${this.nextUnitId++}`;  // "Goblin-0", "Goblin-1", etc.
    this.unitToId.set(unit, id);
    return id;
  }

  addUnit(unit: CombatUnit, position: Position): void {
    const id = this.generateUnitId(unit);
    this.units.set(id, { unit, position });  // ✅ Each unit has unique ID
  }
}
```

**Why This is Subtle**:
- Works fine during development with 1 of each enemy type
- Only breaks when multiple units share the same name
- Map operations succeed (no error)
- The "last write wins" behavior is silent
- Hard to catch without testing multiple same-named units

**Prevention**:
- Use auto-incrementing IDs for runtime objects
- Use UUIDs or database IDs for persistent objects
- Never use non-unique properties as map keys
- Test with multiple objects sharing the same name/properties

### Mutating State Objects Instead of Creating New Ones

**Symptom**: State updates don't trigger re-renders, React doesn't detect changes.

**Cause**: Mutating existing state object instead of creating a new one breaks React's change detection.

**Example of the Bug**:
```typescript
protected updatePhase(state: CombatState, ...): CombatState | null {
  if (shouldTransition) {
    state.phase = 'battle';  // ❌ Mutates existing object
    return state;            // ❌ Same reference, React won't detect change
  }
  return state;
}
```

**What Happens**:
1. Phase handler mutates `state.phase = 'battle'`
2. Returns same state object reference
3. CombatView checks: `updatedState !== combatState` → `false` (same reference!)
4. No `setCombatState()` call
5. React doesn't re-render
6. useEffect hooks don't fire
7. Phase remains unchanged visually

**The Fix**:
```typescript
protected updatePhase(state: CombatState, ...): CombatState | null {
  if (shouldTransition) {
    return {
      ...state,              // ✅ Create new object
      phase: 'battle' as const
    };
  }
  return state;
}
```

**Why This is Subtle**:
- Mutation "works" in plain JavaScript
- No TypeScript error (state is not readonly by default)
- No runtime error
- State object has correct values, but React doesn't detect the change
- Only breaks React's change detection mechanism

**Prevention**:
- Always use spread operator `{ ...state, field: newValue }`
- Never mutate state objects directly
- Use TypeScript `readonly` modifiers on state properties
- Enable ESLint rule `no-param-reassign` for state objects

### Updating These Guidelines
- Keep guidelines concise and actionable
- Use examples to illustrate patterns
- Document the "why" behind rules when not obvious
- Include both good and bad examples for clarity
- Add "Exception" notes when rules have valid edge cases
- Update both GeneralGuidelines.md and `.claude/instructions.md` if quick reference needs changes

### Example-Driven Documentation
When adding new patterns:
- Start with a clear statement of the rule
- Provide ✅ **DO** example showing correct usage
- Provide ❌ **DON'T** example showing what to avoid
- Explain **Why** with performance/correctness reasoning
- Document **Exceptions** if applicable
