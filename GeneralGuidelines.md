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

- **Round all coordinates to integers** for pixel-perfect rendering:
  ```typescript
  // DO: Explicitly round coordinates, especially when calculated
  const x = Math.floor(region.x + region.width / 2);
  const y = Math.floor(region.y + offset);
  ctx.drawImage(image, x, y);

  // OK: When coordinates are known to be integers (e.g., tile positions)
  const tileX = col * 12; // Always integer if col is integer
  const tileY = row * 12; // Always integer if row is integer
  ctx.drawImage(image, tileX, tileY);
  ```
  **Why**: Sub-pixel rendering causes blurriness in pixel art. Even if coordinates are currently integers, explicit rounding future-proofs against layout changes.

### Color Tinting with Off-Screen Canvas

When applying color tints to sprites using composite operations, **always use an off-screen buffer** to prevent affecting the rest of the canvas:

**✅ DO**: Use cached off-screen buffer for tinting
```typescript
class MyPhaseHandler {
  // Cache buffer as instance variable to avoid recreation every frame
  private tintingBuffer: HTMLCanvasElement | null = null;
  private tintingBufferCtx: CanvasRenderingContext2D | null = null;

  private renderTintedSprite(
    ctx: CanvasRenderingContext2D,
    spriteId: string,
    x: number,
    y: number,
    width: number,
    height: number,
    tintColor: string,
    alpha: number = 1.0
  ): void {
    // Lazy initialize cached buffer
    if (!this.tintingBuffer || !this.tintingBufferCtx) {
      this.tintingBuffer = document.createElement('canvas');
      this.tintingBufferCtx = this.tintingBuffer.getContext('2d');
      if (!this.tintingBufferCtx) return;
    }

    // Resize buffer only if dimensions changed
    if (this.tintingBuffer.width !== width || this.tintingBuffer.height !== height) {
      this.tintingBuffer.width = width;
      this.tintingBuffer.height = height;
    }

    const bufferCtx = this.tintingBufferCtx;

    // Clear previous contents
    bufferCtx.clearRect(0, 0, width, height);

    // Reset composite operation to default
    bufferCtx.globalCompositeOperation = 'source-over';

    // Render sprite to buffer
    SpriteRenderer.renderSpriteById(bufferCtx, spriteId, spriteImages, spriteSize, 0, 0, width, height);

    // Apply color tint
    bufferCtx.globalCompositeOperation = 'multiply';
    bufferCtx.fillStyle = tintColor;
    bufferCtx.fillRect(0, 0, width, height);

    // Restore alpha channel
    bufferCtx.globalCompositeOperation = 'destination-in';
    SpriteRenderer.renderSpriteById(bufferCtx, spriteId, spriteImages, spriteSize, 0, 0, width, height);

    // Copy to main canvas (ctx.drawImage exception - buffer to main canvas)
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.tintingBuffer, x, y);
    ctx.restore();
  }
}
```

**❌ DON'T**: Apply composite operations directly to main canvas
```typescript
// BAD: Fills entire viewport with tint color!
ctx.globalCompositeOperation = 'multiply';
ctx.fillStyle = tintColor;
ctx.fillRect(x, y, width, height); // Affects whole canvas blend state!
```

**❌ DON'T**: Create new canvas every frame
```typescript
// BAD: Creates GC pressure, violates performance guidelines
private renderTintedSprite(...) {
  const buffer = document.createElement('canvas'); // 720+ canvases/sec at 60fps!
  buffer.width = width;
  buffer.height = height;
  // ... tinting logic
}
```

**Why**:
- Composite operations like `multiply` affect the entire canvas blending state
- Using an off-screen buffer isolates the tinting effect to just the sprite
- Caching the buffer avoids creating 100+ canvas objects per second
- Real-world bug: Initial cursor implementation filled viewport with black because `fillRect()` with multiply blend mode affected the entire canvas

**Performance**:
- **Before caching**: 720 canvas allocations/sec, ~414 KB/sec GC pressure
- **After caching**: 1 canvas allocation total, ~0 KB/sec GC pressure
- Memory overhead: 576 bytes for a 12×12 buffer (negligible)

**Reference Implementation**: `@react-app/src/models/combat/UnitTurnPhaseHandler.ts` (renderTintedSprite method)

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

### State Preservation vs. Reset Pattern

When updating collections in stateful components, provide separate methods for explicit reset vs. state preservation:

**✅ DO**: Separate methods for different update semantics
```typescript
class ScrollableRenderer {
  private scrollOffset: number = 0;
  private items: Item[];

  // Explicit reset - user changed context
  setItems(items: Item[]): void {
    this.items = items;
    this.scrollOffset = 0; // Reset to start
  }

  // Preserve state - data updated within same context
  updateItems(items: Item[]): void {
    this.items = items;
    // Clamp scroll to valid range if list shrunk
    const maxOffset = Math.max(0, this.items.length - this.visibleCount);
    this.scrollOffset = Math.min(this.scrollOffset, maxOffset);
  }
}
```

**❌ DON'T**: Single method with unclear semantics
```typescript
// BAD: Unclear if scroll should reset
setItems(items: Item[]): void {
  this.items = items;
  // Should we reset scroll? Unclear!
}
```

**When to Use**:
- Scrollable lists (preserve scroll when data updates)
- Paginated views (preserve page when items change)
- Filtered views (preserve scroll when filter updates)
- Expanded/collapsed trees (preserve expansion state)

**Real-world example**: TurnOrderRenderer uses `setUnits()` for explicit reset and `updateUnits()` to preserve scroll position when unit list changes during animation.

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

### Render Pipeline Z-Ordering

Phase handlers can implement two rendering methods to control Z-ordering (what appears on top of what):

```typescript
interface CombatPhaseHandler {
  /**
   * Render phase-specific overlays BEFORE units are drawn.
   * Use for: movement range highlights, area effects, ground markers, shadows
   * These elements appear UNDER units in the final render.
   */
  render?(state: CombatState, encounter: CombatEncounter, context: PhaseRenderContext): void;

  /**
   * Render phase-specific UI overlays AFTER units are drawn.
   * Use for: cursors, selection indicators, floating UI, health bars
   * These elements appear ON TOP of units in the final render.
   */
  renderUI?(state: CombatState, encounter: CombatEncounter, context: PhaseRenderContext): void;
}
```

**Complete Render Order** (from bottom to top):
1. Map terrain (tiles, walls)
2. **Phase handler `render()`** - Underlays
3. Deployment zones
4. Units
5. **Phase handler `renderUI()`** - Overlays
6. Layout UI (panels, combat log, buttons)

**When to Use Each Method:**

**`render()` - Underlays (Before Units)**:
- Movement range highlights (yellow tiles under units)
- Area of effect indicators
- Terrain effects (ice, fire, etc.)
- Shadows
- Ground markers

**`renderUI()` - Overlays (After Units)**:
- Cursors (active unit, target selection)
- Selection indicators
- Floating damage numbers
- Status effect icons above units
- Range indicators

**Example Implementation:**
```typescript
class UnitTurnPhaseHandler implements CombatPhaseHandler {
  render(state: CombatState, encounter: CombatEncounter, context: PhaseRenderContext): void {
    const { ctx, tileSize, offsetX, offsetY } = context;

    // Render yellow movement range tiles (UNDER units)
    for (const position of this.movementRange) {
      const x = Math.floor(offsetX + (position.x * tileSize));
      const y = Math.floor(offsetY + (position.y * tileSize));

      this.renderTintedSprite(ctx, 'particles-4', x, y, tileSize, tileSize, '#ffff00', 0.33);
    }
  }

  renderUI(state: CombatState, encounter: CombatEncounter, context: PhaseRenderContext): void {
    const { ctx, tileSize, offsetX, offsetY } = context;

    // Render cursors (ON TOP of units)
    if (this.activeUnitPosition && this.cursorVisible) {
      const x = Math.floor(offsetX + (this.activeUnitPosition.x * tileSize));
      const y = Math.floor(offsetY + (this.activeUnitPosition.y * tileSize));

      this.renderTintedSprite(ctx, 'particles-5', x, y, tileSize, tileSize, '#006400', 1.0);
    }
  }
}
```

**Common Mistakes:**

❌ **DON'T**: Render cursors in `render()` - they'll appear under units
```typescript
render(state, encounter, context) {
  // BAD: Cursor will be hidden behind units!
  this.renderCursor(context);
}
```

❌ **DON'T**: Render ground effects in `renderUI()` - they'll appear over units
```typescript
renderUI(state, encounter, context) {
  // BAD: Movement range will cover units!
  this.renderMovementRange(context);
}
```

**Why Two Methods:**
- Single `render()` method couldn't control whether elements appear above or below units
- Clear separation makes intent explicit
- Prevents Z-ordering bugs
- Each phase can independently control its layer contributions

**Reference Implementation**: `@react-app/src/models/combat/UnitTurnPhaseHandler.ts` demonstrates both methods working together for cursor rendering and movement range display.

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

### Animation Speed Control for Debugging

For complex animations that are difficult to debug at full speed (60 FPS), provide FPS throttling:

**✅ DO**: Provide FPS throttling via settings
```typescript
// In UISettings or similar config class
class UISettings {
  private static maxFPS: number = 0; // 0 = unlimited

  static setMaxFPS(fps: number): void {
    this.maxFPS = Math.max(0, Math.floor(fps));
  }

  static getMaxFPS(): number {
    return this.maxFPS;
  }
}

// In animation loop
const maxFPS = UISettings.getMaxFPS();
const minFrameTime = maxFPS > 0 ? 1000 / maxFPS : 0;
const now = performance.now();
const elapsed = now - lastFrameTime;

if (elapsed >= minFrameTime) {
  // Render frame
  renderFrame();
  lastFrameTime = now;
}
```

**Example Usage (Browser Console):**
```javascript
UISettings.setMaxFPS(5);  // Slow to 5 FPS for debugging
// ... observe state transitions, read console logs ...
UISettings.setMaxFPS(0);  // Reset to normal speed
```

**When to Use:**
- Debugging complex state machines
- Reading rapid console output
- Observing frame-by-frame animation
- Testing timing-dependent bugs

**Why**: Easier than adding breakpoints, doesn't pause execution, allows smooth slow-motion playback.

**Real-world example**: Used to debug unit movement sequence timing and path interpolation in the unit-turn phase.

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

### React Hook Dependencies and Animation Loops

When using React hooks with animation loops, carefully manage `useCallback` and `useEffect` dependencies to avoid recreating callbacks unnecessarily.

**❌ DON'T**: Include unused state in `useCallback` dependencies
```typescript
// BAD: uiState is in dependencies but never used in function body
const renderFrame = useCallback(() => {
  ctx.clearRect(0, 0, width, height);
  renderer.render(ctx);
  // uiState is NOT used anywhere here!
}, [renderer, uiState]); // ❌ uiState causes unnecessary recreations

useEffect(() => {
  const animate = () => {
    renderFrame();
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}, [renderFrame]); // Animation loop restarts when renderFrame changes
```

**Problem**: When `uiState` changes (e.g., on every mouse move):
1. `renderFrame` callback is recreated
2. `useEffect` cleanup runs, canceling animation loop
3. New animation loop starts, calling `renderFrame()` synchronously
4. This can happen 100+ times/second, causing massive FPS spikes and animation stuttering

**✅ DO**: Only include dependencies that are actually used
```typescript
// GOOD: Only include what's actually used
const renderFrame = useCallback(() => {
  ctx.clearRect(0, 0, width, height);
  renderer.render(ctx);
  // uiStateManager is accessed via closure, no need in deps
}, [renderer]); // ✅ Only renderer is used

useEffect(() => {
  const animate = () => {
    renderFrame();
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}, [renderFrame]); // Animation loop stays stable
```

**✅ DO**: Use manager instances (not React state) for frequently changing data
```typescript
// GOOD: Manager pattern with refs
const uiStateManager = useMemo(() => new CombatUIStateManager(), []);

// Don't subscribe to state changes if you don't need React re-renders
// const uiState = useCombatUIState(uiStateManager); // ❌ Causes re-renders

// Animation loop accesses manager directly
const renderFrame = useCallback(() => {
  const hoveredCell = uiStateManager.getState().hoveredCell; // ✅ Direct access
  if (hoveredCell) {
    renderer.highlightCell(hoveredCell);
  }
}, [uiStateManager, renderer]);
```

**Why**:
- Managers provide stable references that don't trigger re-renders
- Animation loops should run independently of React's render cycle
- React state should only be used for values that need to trigger UI updates
- Unnecessary dependencies cause callback churn and animation loop restarts

**Debugging Tip**: If FPS spikes to huge numbers (>1000) during mouse movement, you likely have synchronous `renderFrame()` calls caused by unnecessary hook dependency changes.

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

### Constructor Overloading with Runtime Type Checking

When adding optional parameters to an existing constructor, use runtime type checking to maintain backward compatibility:

**✅ DO**: Check parameter types at runtime
```typescript
class TurnOrderRenderer {
  private units: CombatUnit[];
  private tickCount: number;
  private onUnitClick?: (unit: CombatUnit) => void;

  constructor(
    units: CombatUnit[],
    onUnitClickOrTickCount?: ((unit: CombatUnit) => void) | number,
    tickCount: number = 0
  ) {
    this.units = units;

    // Handle overloaded constructor: second param can be onUnitClick or tickCount
    if (typeof onUnitClickOrTickCount === 'function') {
      this.onUnitClick = onUnitClickOrTickCount;
      this.tickCount = 0; // Default when callback is provided
    } else if (typeof onUnitClickOrTickCount === 'number') {
      this.tickCount = onUnitClickOrTickCount;
      this.onUnitClick = undefined;
    } else {
      this.tickCount = tickCount;
      this.onUnitClick = undefined;
    }
  }
}

// Usage: Both signatures work
const renderer1 = new TurnOrderRenderer(units, handleClick); // Legacy
const renderer2 = new TurnOrderRenderer(units, 42); // New with tick count
```

**❌ DON'T**: Break existing call sites
```typescript
// BAD: Forces all call sites to update immediately
constructor(units: CombatUnit[], tickCount: number, onUnitClick?: (unit: CombatUnit) => void) {
  // This breaks: new TurnOrderRenderer(units, handleClick)
}
```

**Benefits**:
- Maintains backward compatibility with existing code
- Gradual migration path for new features
- Type safety preserved through union types
- Clear runtime behavior via typeof checks

**When to Use**:
- Adding new required data to existing constructors
- Maintaining compatibility during refactoring
- Phased rollout of new features across codebase

**Real-world usage**: TurnOrderRenderer uses this pattern to add tick counter display while preserving existing click handler usage.

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

### Implementation Planning for Complex Features

For non-trivial features (3+ files changed, new systems introduced), **create a detailed implementation plan before writing code**:

**✅ DO**: Create a comprehensive plan document
```markdown
# Feature Implementation Plan

**Date:** YYYY-MM-DD
**Feature:** Brief description
**Branch:** feature-branch-name
**Priority:** High/Medium/Low
**Complexity:** High/Medium/Low

---

## Overview
Brief description of the feature and its goals (2-3 paragraphs)

## Requirements

### Visual Specifications
- Colors (with hex codes): #00ff00 for player, #ff0000 for enemy
- Sizes: cursor 12×12px, blink rate 0.5s
- Sprites: particles-5 for cursor, particles-4 for highlights
- Alpha values: 33% for movement range

### Behavior Specifications
- Cursor blinks every 0.5 seconds
- Click unit to select and show movement range
- Movement range uses BFS flood-fill algorithm
- Can path through friendlies, cannot end on occupied tiles

### Technical Requirements
- Must serialize isPlayerControlled flag
- Performance: <100 object allocations per frame
- Must follow GeneralGuidelines.md patterns

## Implementation Tasks

### 1. Task Name (Foundation)
**Files:**
- path/to/file1.ts
- path/to/file2.ts

**Changes:**
```typescript
// Pseudocode or key snippets showing the change
interface CombatUnit {
  get isPlayerControlled(): boolean;
}
```

**Rationale:** Why this change is needed

---

### 2. Task Name (Dependencies on Task 1)
...

## Testing Plan
- [ ] Cursor displays on active unit
- [ ] Cursor blinks at 0.5s rate
- [ ] Movement range highlights yellow
- [ ] Can path through friendly units
- [ ] Cannot end on occupied tiles
- [ ] Serialization preserves isPlayerControlled
- [ ] No visual regressions

## Implementation Order
1. Foundation (interfaces, base types) - no dependencies
2. Utilities (movement calculator) - independent
3. Phase handler updates - depends on #1, #2
4. Integration testing - depends on all above

## Notes & Decisions

### Decision: Cache Tinting Buffer
- **Choice:** Cache canvas buffer as instance variable
- **Alternative:** Create new buffer each frame
- **Rationale:** Avoids 720+ allocations/sec, follows performance guidelines
- **Tradeoff:** 576 bytes persistent memory (negligible)

### Guidelines Compliance
- ✅ Uses SpriteRenderer exclusively
- ✅ Caches stateful components (UnitInfoContent)
- ✅ No renderFrame() in event handlers
- ✅ Round all coordinates with Math.floor()

### Performance Considerations
- Maps are small (32×18 tiles max)
- BFS complexity O(tiles × movement) - negligible
- Tinting buffer cached to avoid GC pressure

## Success Criteria
✅ All visual specs met (colors, sizes, timing)
✅ All behavioral specs met (selection, movement range)
✅ All tests pass
✅ Build succeeds with no warnings
✅ 100% compliance with GeneralGuidelines.md
✅ Performance within acceptable limits

---

**End of Implementation Plan**
```

**❌ DON'T**: Start coding without a plan
```typescript
// BAD: Diving straight into code without thinking through:
// - What files need changes?
// - What are the dependencies?
// - How will this be tested?
// - What performance implications?
// - How does this fit with guidelines?

class UnitTurnPhaseHandler {
  // Just start coding and figure it out as we go...
}
```

**Benefits of Planning:**
- **Clear roadmap** prevents getting lost mid-implementation
- **Documents decisions** and rationale for future developers
- **Testing checklist** ensures thorough validation
- **Guidelines compliance** integrated from the start
- **Performance analysis** happens before coding, not after
- **Dependencies mapped** prevents incorrect implementation order
- **Reduces errors** by thinking through edge cases upfront

**Recommended Plan Sections:**

1. **Header**: Date, feature name, branch, priority, complexity
2. **Overview**: High-level description (2-3 paragraphs)
3. **Requirements**: Visual, behavioral, and technical specs
4. **Implementation Tasks**: File-by-file changes with rationale
5. **Testing Plan**: Comprehensive checklist
6. **Implementation Order**: Task dependencies
7. **Notes & Decisions**: Why choice A over B, guidelines compliance
8. **Success Criteria**: Concrete definition of "done"

**When to Create a Plan:**

**Always plan when:**
- Feature touches 3+ files
- New system or pattern being introduced
- Complex interactions between components
- Performance considerations exist
- Multiple valid approaches need evaluation

**Planning optional for:**
- Single-file bug fixes
- Trivial changes (typos, formatting)
- Changes with obvious implementation
- Urgent hotfixes (but document afterward!)

**Real-world Example:**

The `UnitTurnInteractionPlan.md` document (784 lines) demonstrates exemplary planning for the unit turn interaction feature:
- Complete visual and behavioral specifications
- Step-by-step implementation tasks
- Comprehensive testing checklist
- Guidelines compliance notes throughout
- Performance analysis and decisions
- Clear success criteria

**After Implementation:**

Update the plan with:
- ✅ Checkmarks for completed tasks
- Notes on deviations from original plan
- Lessons learned
- New patterns discovered
- Performance measurements (if applicable)

This creates a valuable reference for similar features in the future.

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

### Reversible Action Pattern

When implementing actions that modify state but can be undone (movement, item usage, spell targeting):

**✅ DO**: Track original state and provide reset mechanism
```typescript
class ActionPhaseHandler {
  private actionCompleted: boolean = false;
  private originalState: State | null = null;
  private canReset: boolean = false;

  executeAction(action: Action, state: State): State {
    // Store original state before modification
    this.originalState = { ...state };

    // Apply changes
    const newState = applyAction(action, state);

    // Enable reset after completion
    this.actionCompleted = true;
    this.canReset = true;

    return newState;
  }

  resetAction(state: State): State {
    if (!this.canReset || !this.originalState) {
      return state;
    }

    // Restore original state
    const restoredState = { ...this.originalState };

    // Clear reset flags
    this.actionCompleted = false;
    this.canReset = false;
    this.originalState = null;

    return restoredState;
  }
}
```

**❌ DON'T**: Allow reset after other actions
```typescript
// BAD: Can reset move after attacking (breaks game balance)
if (this.unitHasMoved) {
  // Always allow reset - allows exploits!
}

// GOOD: Disable reset after other actions
if (this.canReset && !this.hasAttacked && !this.hasUsedAbility) {
  // Only allow reset if no other actions taken
}
```

**When to Use:**
- Movement actions (undo accidental moves)
- Item usage (undo before confirming)
- Spell targeting (reselect targets)
- Any action with significant consequences

**When NOT to Use:**
- Attacks (should not be reversible after execution)
- Turn-ending actions (Delay/End Turn)
- Actions that affect other units (heal, buff)

**Real-world example**: UnitTurnPhaseHandler's reset move feature allows players to undo movement but disables after any other action is taken.

### Animation-Time State Masking

When animating objects that should not appear in their "normal" position during animation:

**✅ DO**: Temporarily move to off-screen coordinates
```typescript
// In CombatConstants or similar
const OFFSCREEN_POSITION = { x: -999, y: -999 };

// Start animation - hide unit at normal position
state.unitManifest.moveUnit(unit, OFFSCREEN_POSITION);
this.animationSequence = new UnitMovementSequence(unit, startPos, path);

// Render animated unit manually
if (this.animationSequence) {
  const renderPos = this.animationSequence.getUnitRenderPosition();
  SpriteRenderer.renderSpriteById(ctx, unit.spriteId, renderPos.x, renderPos.y);
}

// Animation complete - restore to final position
state.unitManifest.moveUnit(unit, finalPosition);
this.animationSequence = null;
```

**❌ DON'T**: Add flags to skip rendering
```typescript
// BAD: Requires checking flag in every render loop
if (unit.isAnimating) {
  continue; // Skip rendering - adds state to domain object
}
```

**Why**: Off-screen displacement is simpler and avoids adding state to domain objects. The unit is still in the manifest, just at coordinates that won't be rendered.

**Performance**: No overhead - position update is O(1), same as any position change.

**Real-world example**: UnitMovementSequence uses this pattern to prevent double-rendering during unit movement animation.

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
