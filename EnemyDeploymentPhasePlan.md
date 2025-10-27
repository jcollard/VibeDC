# Enemy Deployment Phase Implementation Plan

## Overview
This document outlines the implementation plan for the Enemy Deployment Phase, where enemies materialize onto the battlefield with dithered fade-in animations and a dynamic combat log message announcing their arrival.

## Requirements Summary

### 1. Enemy Materialization Animations
- Each enemy fades in using a **pixel-art dither pattern** (similar to `ScreenFadeInSequence`)
- Animation duration: **1 second per enemy**
- Animation stagger: **0.5 second delay** between each enemy's animation start
- Animations **overlap** (e.g., enemy 1 animates 0-1s, enemy 2 animates 0.5-1.5s, etc.)
- Enemies materialize at their designated positions from `CombatEncounter.enemyPlacements`

### 2. Combat Log Message
- Message format: `"3 Goblins, 4 Dragons, and 2 Knights approach!"`
- Group enemies by **name** (not ID)
- Monster names displayed in **red color**: `[color=#ff0000]Monster Name[/color]`
- Message must **split dynamically** if too long to fit in combat log width
- Message appears when animations start

### 3. Phase Transition
- Transition to `'battle'` phase after all animations complete
- No player interaction during this phase

## Architecture Analysis

### Existing Systems to Leverage

#### 1. Dithering System (`ScreenFadeInSequence.ts`)
```typescript
// Bayer matrix dithering (4x4 pattern)
CombatConstants.ANIMATION.DITHERING.BAYER_MATRIX
CombatConstants.ANIMATION.DITHERING.PIXEL_SIZE

// shouldDrawPixel() method uses threshold comparison
```

#### 2. Combat Log System (`CombatLogManager.ts`)
```typescript
// Add colored text with tags
addMessage("[color=#ff0000]Red Dragon[/color] attacks!")

// Automatic text wrapping (not built-in - needs implementation)
// Messages animate character-by-character at configurable speed
```

#### 3. Unit Placement System (`CombatEncounter.ts`)
```typescript
// Enemy placements with positions
interface EnemyPlacement {
  enemyId: string;
  position: Position;
}

// Create unit instances
createEnemyUnits(): UnitPlacement[]
```

#### 4. Rendering Systems
- `SpriteRenderer`: Renders sprites with proper scaling
- `FontAtlasRenderer`: Renders text from font atlases
- `CombatUnitManifest`: Tracks units and positions

## Implementation Plan

### Phase 1: Create Enemy Sprite Dither Sequence

**File**: `react-app/src/models/combat/EnemySpriteSequence.ts`

Create a `CinematicSequence` that handles a single enemy's materialization:

```typescript
export class EnemySpriteSequence implements CinematicSequence {
  private elapsedTime = 0;
  private readonly duration = 1.0; // 1 second
  private complete = false;
  private readonly unit: CombatUnit;
  private readonly position: Position;

  constructor(unit: CombatUnit, position: Position) {
    this.unit = unit;
    this.position = position;
  }

  // Uses Bayer matrix dithering similar to ScreenFadeInSequence
  // Renders sprite with increasing alpha based on progress
  // Uses shouldDrawPixel() logic for pixel-art dither effect
}
```

**Key Implementation Details**:
- Use `CombatConstants.ANIMATION.DITHERING.BAYER_MATRIX` for dithering pattern
- Render sprite in blocks using `SpriteRenderer.renderSpriteById()`
- Progress from 0 → 1 over 1 second
- Apply dither threshold per-pixel block (1px blocks based on `PIXEL_SIZE`)
- Render at unit's position on the combat map

**Rendering Strategy**:
1. Get sprite image for `unit.spriteId`
2. For each pixel block in sprite bounds:
   - Calculate progress-based alpha (0 → 1)
   - Use Bayer matrix threshold to determine if block should be drawn
   - Draw sprite block if alpha > threshold
3. This creates gradual materialization effect

---

### Phase 2: Create Staggered Animation Manager

**File**: `react-app/src/models/combat/StaggeredSequenceManager.ts`

Manages multiple sequences with staggered start times:

```typescript
export class StaggeredSequenceManager implements CinematicSequence {
  private sequences: Array<{
    sequence: CinematicSequence;
    startTime: number; // When this sequence should start
    started: boolean;
  }> = [];

  private elapsedTime = 0;
  private complete = false;

  constructor(
    sequences: CinematicSequence[],
    staggerDelay: number = 0.5
  ) {
    // Calculate start times for each sequence
    this.sequences = sequences.map((seq, index) => ({
      sequence: seq,
      startTime: index * staggerDelay,
      started: false,
    }));
  }

  update(deltaTime: number): boolean {
    this.elapsedTime += deltaTime;

    // Start sequences when their time comes
    for (const item of this.sequences) {
      if (!item.started && this.elapsedTime >= item.startTime) {
        item.started = true;
        item.sequence.start(...);
      }

      // Update started sequences
      if (item.started) {
        item.sequence.update(deltaTime);
      }
    }

    // Complete when all sequences are complete
    this.complete = this.sequences.every(item =>
      item.sequence.isComplete()
    );

    return this.complete;
  }

  render(state, encounter, context): void {
    // Render all started sequences
    for (const item of this.sequences) {
      if (item.started) {
        item.sequence.render(state, encounter, context);
      }
    }
  }
}
```

**Benefits**:
- Reusable for any staggered animation pattern
- Handles timing and coordination automatically
- Allows overlapping animations

---

### Phase 3: Build Enemy Grouping Message

**File**: `react-app/src/models/combat/EnemyDeploymentPhaseHandler.ts`

Add helper method to generate the combat log message:

```typescript
private buildEnemyApproachMessage(encounter: CombatEncounter): string {
  // Group enemies by name
  const enemyGroups = new Map<string, number>();

  for (const placement of encounter.enemyPlacements) {
    const enemy = EnemyRegistry.getById(placement.enemyId);
    if (enemy) {
      const count = enemyGroups.get(enemy.name) || 0;
      enemyGroups.set(enemy.name, count + 1);
    }
  }

  // Build message parts
  const parts: string[] = [];
  for (const [name, count] of enemyGroups) {
    const coloredName = `[color=#ff0000]${name}[/color]`;
    parts.push(`${count} ${coloredName}${count > 1 ? 's' : ''}`);
  }

  // Format with commas and "and"
  let message = '';
  if (parts.length === 1) {
    message = parts[0];
  } else if (parts.length === 2) {
    message = `${parts[0]} and ${parts[1]}`;
  } else {
    const allButLast = parts.slice(0, -1).join(', ');
    const last = parts[parts.length - 1];
    message = `${allButLast}, and ${last}`;
  }

  message += ' approach!';

  return message;
}
```

**Example Outputs**:
- `"3 [color=#ff0000]Goblins[/color] approach!"`
- `"2 [color=#ff0000]Wolves[/color] and 1 [color=#ff0000]Dragon[/color] approach!"`
- `"3 [color=#ff0000]Goblins[/color], 4 [color=#ff0000]Dragons[/color], and 2 [color=#ff0000]Knights[/color] approach!"`

---

### Phase 4: Dynamic Message Splitting

The `CombatLogManager` doesn't currently support automatic text wrapping for long messages. We have two options:

#### Option A: Pre-Split Messages (Recommended)
Split the message into multiple lines before adding to combat log:

```typescript
private splitMessageForCombatLog(message: string, maxWidth: number): string[] {
  // Use FontAtlasRenderer.measureTextByFontId() to measure segments
  // Account for color tags (don't count them in width)
  // Split at natural boundaries (commas, "and")
  // Return array of lines
}

// Usage:
const message = this.buildEnemyApproachMessage(encounter);
const lines = this.splitMessageForCombatLog(message, COMBAT_LOG_WIDTH);
for (const line of lines) {
  state.combatLog.addMessage(line);
}
```

#### Option B: Enhance CombatLogManager (Future Work)
Add automatic text wrapping to `CombatLogManager` itself. This is more complex but more reusable.

**Recommendation**: Use Option A for this implementation. Document Option B as future enhancement.

---

### Phase 5: Update EnemyDeploymentPhaseHandler

**File**: `react-app/src/models/combat/EnemyDeploymentPhaseHandler.ts`

Transform from stub to full implementation:

```typescript
export class EnemyDeploymentPhaseHandler extends PhaseBase {
  private animationSequence: StaggeredSequenceManager | null = null;
  private animationComplete = false;

  override start(state: CombatState, encounter: CombatEncounter): void {
    super.start(state, encounter);

    // 1. Create enemy units and add to manifest
    const enemyUnits = encounter.createEnemyUnits();
    for (const { unit, position } of enemyUnits) {
      state.unitManifest.addUnit(unit, position);
    }

    // 2. Create sprite sequences for each enemy
    const spriteSequences = enemyUnits.map(({ unit, position }) =>
      new EnemySpriteSequence(unit, position)
    );

    // 3. Create staggered manager (0.5s delay between starts)
    this.animationSequence = new StaggeredSequenceManager(
      spriteSequences,
      0.5
    );

    // 4. Add combat log message(s)
    const message = this.buildEnemyApproachMessage(encounter);
    const lines = this.splitMessageForCombatLog(message, COMBAT_LOG_WIDTH);

    const combatLog = this.getCombatLog(state);
    for (const line of lines) {
      combatLog.addMessage(line);
    }

    // 5. Start animation
    this.animationSequence.start(state, encounter);
  }

  protected updatePhase(
    state: CombatState,
    encounter: CombatEncounter,
    deltaTime: number
  ): CombatState | null {
    if (!this.animationSequence) return state;

    // Update animation
    const complete = this.animationSequence.update(deltaTime);

    if (complete && !this.animationComplete) {
      this.animationComplete = true;

      // Transition to battle phase
      return {
        ...state,
        phase: 'battle',
      };
    }

    return state;
  }

  override render(
    state: CombatState,
    encounter: CombatEncounter,
    context: PhaseRenderContext
  ): void {
    // Render enemy sprites with dither animation
    if (this.animationSequence) {
      this.animationSequence.render(state, encounter, context);
    }
  }

  getRequiredSprites(state: CombatState, encounter: CombatEncounter): PhaseSprites {
    // Collect all enemy sprite IDs
    const spriteIds = new Set<string>();

    for (const placement of encounter.enemyPlacements) {
      const enemy = EnemyRegistry.getById(placement.enemyId);
      if (enemy) {
        spriteIds.add(enemy.spriteId);
      }
    }

    return { spriteIds };
  }

  private buildEnemyApproachMessage(encounter: CombatEncounter): string {
    // Implementation from Phase 3
  }

  private splitMessageForCombatLog(message: string, maxWidth: number): string[] {
    // Implementation from Phase 4
  }

  private getCombatLog(state: CombatState): CombatLogManager {
    // Access combat log from state (need to verify where it lives)
    // May need to update CombatState interface
  }
}
```

---

### Phase 6: Integration with CombatState

**File**: `react-app/src/models/combat/CombatState.ts`

Ensure `CombatState` has access to `CombatLogManager`:

```typescript
export interface CombatState {
  turnNumber: number;
  map: CombatMap;
  tilesetId: string;
  phase: CombatPhase;
  unitManifest: CombatUnitManifest;

  // Add if not already present:
  combatLog?: CombatLogManager; // May be managed elsewhere
}
```

**Note**: Need to verify where `CombatLogManager` is instantiated and stored. It may already exist in the view layer. If so, we'll need to pass it down through the phase handler's render/update methods or store a reference.

---

## Implementation Checklist

### Step 1: Create EnemySpriteSequence
- [ ] Create `EnemySpriteSequence.ts`
- [ ] Implement `CinematicSequence` interface
- [ ] Implement dither rendering using Bayer matrix
- [ ] Use `SpriteRenderer.renderSpriteById()` for sprite rendering
- [ ] Test with single enemy sprite (manually verify dither effect)

### Step 2: Create StaggeredSequenceManager
- [ ] Create `StaggeredSequenceManager.ts`
- [ ] Implement sequence timing logic
- [ ] Implement staggered start times
- [ ] Test with multiple mock sequences

### Step 3: Implement Message Building
- [ ] Add `buildEnemyApproachMessage()` method
- [ ] Group enemies by name
- [ ] Format with color tags
- [ ] Handle singular/plural ("Goblin" vs "Goblins")
- [ ] Test with various enemy combinations

### Step 4: Implement Message Splitting
- [ ] Add `splitMessageForCombatLog()` method
- [ ] Use `FontAtlasRenderer.measureTextByFontId()` for width calculation
- [ ] Handle color tags correctly (don't count in width)
- [ ] Split at natural boundaries
- [ ] Test with long messages

### Step 5: Update EnemyDeploymentPhaseHandler
- [ ] Implement `start()` method
- [ ] Create enemy units and add to manifest
- [ ] Create and start animation sequences
- [ ] Add combat log messages
- [ ] Implement `updatePhase()` for animation updates
- [ ] Implement phase transition to 'battle' when complete
- [ ] Implement `render()` to render animations
- [ ] Update `getRequiredSprites()` to return enemy sprites

### Step 6: Integration & Testing
- [ ] Verify CombatLogManager access in phase handler
- [ ] Test with 1 enemy (verify timing and animation)
- [ ] Test with 3 enemies (verify staggered start and overlap)
- [ ] Test with 10 enemies (verify all complete correctly)
- [ ] Test with enemies of same type (verify grouping)
- [ ] Test with enemies of different types (verify message format)
- [ ] Test with long enemy list (verify message splitting)
- [ ] Verify phase transition to 'battle' after animations complete

---

## Technical Considerations

### 1. Combat Log Width
Need to determine the maximum width for combat log messages. Check:
- `CombatLayoutManager` for combat log region width
- Font ID being used for combat log
- Calculate max characters based on region width and font width

**Action**: Add constant to `CombatConstants.ts`:
```typescript
COMBAT_LOG: {
  MAX_MESSAGE_WIDTH: 200, // pixels (adjust based on actual layout)
  FONT_ID: '7px-04b03', // or whatever font is used
}
```

### 2. Sprite Rendering Performance
Rendering dithered sprites pixel-by-pixel could be expensive with many enemies. Optimizations:
- Use off-screen canvas for each sprite
- Cache dithered frames at key progress points (0%, 25%, 50%, 75%, 100%)
- Only redraw when progress crosses cache threshold

**Recommendation**: Start with simple implementation, optimize if performance issues arise.

### 3. Animation Timing Edge Cases
- What if there are 0 enemies? (Shouldn't happen, but handle gracefully)
- What if enemy sprites fail to load?
- What if an enemy ID doesn't exist in registry?

**Recommendation**: Add error handling and fallback behavior.

### 4. Combat Log Access
The combat log manager may be owned by the view layer, not the phase handler. Options:
1. Pass combat log reference to phase handler via `start()` or constructor
2. Store combat log in `CombatState`
3. Add combat log to `PhaseRenderContext`

**Recommendation**: Review existing code to see where combat log lives, then follow that pattern.

---

## Testing Strategy

### Unit Tests
1. **EnemySpriteSequence**
   - Test progress from 0 to 1 over 1 second
   - Verify `isComplete()` returns true at end
   - Mock sprite rendering

2. **StaggeredSequenceManager**
   - Test stagger timing (sequences start at correct times)
   - Test overlap (sequence 1 still running when sequence 2 starts)
   - Test completion (all sequences complete)

3. **Message Building**
   - Test single enemy type: `"3 Goblins approach!"`
   - Test two enemy types: `"2 Wolves and 1 Dragon approach!"`
   - Test three+ enemy types: `"3 Goblins, 4 Dragons, and 2 Knights approach!"`
   - Test singular vs plural

4. **Message Splitting**
   - Test short message (no split needed)
   - Test long message (split required)
   - Test split at comma boundary
   - Test split at "and" boundary

### Integration Tests
1. Start combat encounter with enemy deployment phase
2. Verify enemies appear at correct positions
3. Verify animations run with correct timing
4. Verify combat log shows correct message(s)
5. Verify phase transition to 'battle' after completion

### Visual Tests
1. Watch dither effect (should look like pixel-art fade-in)
2. Verify 0.5s stagger between enemy animations
3. Verify red color for enemy names in combat log
4. Verify message fits in combat log region

---

## Open Questions

### Q1: Where does CombatLogManager live?
**Answer**: Need to inspect `CombatView` or parent component to see where combat log is instantiated and how it's accessed by phase handlers.

### Q2: What is the actual combat log width?
**Answer**: Need to check `CombatLayoutManager` to get the exact pixel width of the combat log region.

### Q3: Should the dither effect have any easing?
**Answer**: The requirement states 1 second duration. Clarify if linear fade or eased fade is desired. `ScreenFadeInSequence` uses easing functions.

**Recommendation**: Match `ScreenFadeInSequence` and use `easeInOutCubic` for smooth effect.

### Q4: What happens if an enemy fails to instantiate?
**Answer**: Current code logs error and filters out null units. Should we show partial message or skip failed enemies?

**Recommendation**: Skip failed enemies and log warning. Don't crash or block phase.

### Q5: Should the message animation speed be customized?
**Answer**: `CombatLogManager.addMessage()` accepts optional `charsPerSecond` parameter.

**Recommendation**: Use default speed (60 chars/sec) for approach message.

---

## Constants to Add

Add to `CombatConstants.ts`:

```typescript
ENEMY_DEPLOYMENT: {
  ANIMATION_DURATION: 1.0, // seconds per enemy
  STAGGER_DELAY: 0.5, // seconds between enemy animation starts
  ENEMY_NAME_COLOR: '#ff0000', // red for enemy names
}

COMBAT_LOG: {
  MAX_MESSAGE_WIDTH: 200, // TODO: measure actual width
  FONT_ID: '7px-04b03', // TODO: verify font ID
}
```

---

## Future Enhancements

### 1. Sound Effects
Add sound effect when each enemy materializes:
- Play at animation start
- Different sounds for different enemy types?

### 2. Camera Focus
If combat map is larger than viewport, pan camera to show enemies as they appear.

### 3. Enhanced Dither Patterns
- Different patterns for different enemy types
- Boss enemies could have special effects

### 4. Combat Log Auto-Wrapping
Enhance `CombatLogManager` to automatically wrap long messages at word boundaries.

---

## Summary

This implementation plan covers:
1. **Enemy sprite dithering animation** using existing Bayer matrix system
2. **Staggered animation timing** with 0.5s delays and 1s durations
3. **Dynamic combat log message** with grouping, coloring, and splitting
4. **Phase transition** to battle phase after animations complete

The plan follows the existing architecture patterns:
- Uses `CinematicSequence` interface for animations
- Leverages `SpriteRenderer` and `FontAtlasRenderer` for rendering
- Follows `GeneralGuidelines.md` best practices
- Integrates with existing `CombatState` and `CombatEncounter` systems

Estimated implementation time: **4-6 hours** for experienced developer familiar with the codebase.
