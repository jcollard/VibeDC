# Battle Phase Handler Stub - Implementation Plan

**Version:** 1.0
**Created:** 2025-10-27
**Related:** [GeneralGuidelines.md](GeneralGuidelines.md), [CombatHierarchy.md](CombatHierarchy.md)

---

## Purpose

Create a minimal but functional `BattlePhaseHandler` stub that:
- Implements all required `CombatPhaseHandler` interface methods
- Displays the battlefield with units and map
- Shows turn order in the top panel (sorted by Speed)
- Shows placeholder info panel at bottom
- Handles mouse events (logging for now)
- Stubs out victory/defeat checking
- Provides framework for future turn-based combat mechanics

---

## Alignment with Guidelines

### GeneralGuidelines.md Compliance

✅ **Rendering Rules (lines 3-49)**
- Use `SpriteRenderer` for all sprite rendering
- Use `FontAtlasRenderer` for all text rendering
- Never use `ctx.fillText()` or direct `ctx.drawImage()` on sprite sheets
- Disable image smoothing: `ctx.imageSmoothingEnabled = false`

✅ **State Management (lines 78-128)**
- Phase handler extends `PhaseBase` (time tracking infrastructure)
- No cached UI components needed initially (no interactive elements yet)
- State stored in class instance variables

✅ **Event Handling (lines 136-265)**
- Return `PhaseEventResult<TData>` from all event handlers
- Use discriminated unions for type-safe results
- Check for victory/defeat in `update()` method

✅ **Component Architecture (lines 266-320)**
- Use `TurnOrderRenderer` for top panel (already implements `TopPanelRenderer`)
- Create placeholder panel content implementing `PanelContent` interface
- Use panel-relative coordinates

✅ **Performance (lines 496-604)**
- No heavy computation per frame
- Cache TurnOrderRenderer instance
- Cache panel content instance

### CombatHierarchy.md Compliance

✅ **Phase Handler Structure (lines 101-131)**
- Implement `CombatPhaseHandler` interface
- Extend `PhaseBase` abstract class
- Follow pattern from `DeploymentPhaseHandler` and `EnemyDeploymentPhaseHandler`

✅ **Top Panel Integration (lines 189-208)**
- Use existing `TurnOrderRenderer` (lines 196-201)
- Implement `getTopPanelRenderer()` method
- Sort units by Speed stat (highest first)

✅ **Info Panel Integration (lines 210-235)**
- Implement `getInfoPanelContent()` method
- Create placeholder content class
- Use `PanelContent` interface

✅ **Phase Transitions (lines 469-477)**
- Check victory conditions in `update()`
- Check defeat conditions in `update()`
- Return new state with updated phase when conditions met

---

## Implementation Structure

### 1. File to Create

**File:** `react-app/src/models/combat/BattlePhaseHandler.ts`

**Location:** Following hierarchy pattern (CombatHierarchy.md lines 101-131)

---

### 2. Class Structure

```typescript
import { PhaseBase } from './PhaseBase';
import type {
  CombatPhaseHandler,
  PhaseEventResult,
  PhaseRenderContext,
  MouseEventContext,
  PhaseSprites
} from './CombatPhaseHandler';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';
import type { TopPanelRenderer } from './managers/TopPanelRenderer';
import type { PanelContent } from './managers/panels/PanelContent';
import { TurnOrderRenderer } from './managers/renderers/TurnOrderRenderer';

/**
 * Battle phase handler - manages active turn-based combat
 *
 * STUB IMPLEMENTATION: Framework for future combat mechanics
 *
 * Current functionality:
 * - Displays battlefield (map + units)
 * - Shows turn order by Speed
 * - Placeholder info panel
 * - Mouse event logging
 * - Victory/defeat condition checking (stubbed)
 *
 * Future functionality:
 * - Turn management system
 * - Action menu (Attack, Ability, Move, Wait, etc.)
 * - Movement/attack range display
 * - Action targeting
 * - Action execution
 * - Status effects
 * - AI enemy turns
 */
export class BattlePhaseHandler extends PhaseBase implements CombatPhaseHandler {
  // Cached renderers (per GeneralGuidelines.md lines 103-110)
  private turnOrderRenderer: TurnOrderRenderer | null = null;
  private infoPanelContent: BattleInfoPanelContent | null = null;

  // Battle state (future: turn management)
  private currentTurnIndex: number = 0;
  private turnPhase: 'player' | 'enemy' = 'player';

  constructor() {
    super();
  }

  // Required methods
  getRequiredSprites(state: CombatState, encounter: CombatEncounter): PhaseSprites
  render(state: CombatState, encounter: CombatEncounter, context: PhaseRenderContext): void

  // Optional methods
  protected updatePhase(state: CombatState, encounter: CombatEncounter, deltaTime: number): CombatState | null

  handleMapClick?(context: MouseEventContext, state: CombatState, encounter: CombatEncounter): PhaseEventResult
  handleMouseMove?(context: MouseEventContext, state: CombatState, encounter: CombatEncounter): PhaseEventResult

  getTopPanelRenderer(state: CombatState, encounter: CombatEncounter): TopPanelRenderer
  getInfoPanelContent(context: PhaseRenderContext, state: CombatState, encounter: CombatEncounter): PanelContent | null
}
```

---

### 3. BattleInfoPanelContent Class

**Purpose:** Placeholder info panel showing "Battle Phase - Combat system coming soon"

**File:** Same file as BattlePhaseHandler (or separate if it grows)

```typescript
import type { PanelContent, PanelRegion } from './managers/panels/PanelContent';
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';

/**
 * Placeholder info panel content for battle phase
 *
 * STUB: Will be replaced with:
 * - Action menu (Attack, Ability, Move, Wait, End Turn)
 * - Action outcome percentages
 * - Target selection UI
 * - Status effect indicators
 */
class BattleInfoPanelContent implements PanelContent {
  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;

    // Render placeholder text
    const centerX = region.x + region.width / 2;
    const centerY = region.y + region.height / 2;

    FontAtlasRenderer.renderText(
      ctx,
      'Battle Phase',
      centerX,
      centerY - 10,
      fontId,
      fontAtlasImage,
      1,
      'center',
      '#ffffff'
    );

    FontAtlasRenderer.renderText(
      ctx,
      'Combat system coming soon',
      centerX,
      centerY + 10,
      fontId,
      fontAtlasImage,
      1,
      'center',
      '#888888'
    );
  }

  // No interaction for stub
  handleClick?(_relativeX: number, _relativeY: number): unknown {
    return null;
  }

  handleHover?(_relativeX: number, _relativeY: number): unknown {
    return null;
  }
}
```

---

## Method Implementations

### 1. getRequiredSprites()

**Purpose:** Return sprites needed for battle phase rendering

**Implementation:**
```typescript
getRequiredSprites(state: CombatState, encounter: CombatEncounter): PhaseSprites {
  // Map tiles
  const mapSprites = new Set<string>();
  for (const { cell } of state.map.getAllCells()) {
    if (cell.spriteId) {
      mapSprites.add(cell.spriteId);
    }
  }

  // Unit sprites
  const unitSprites = new Set<string>();
  for (const { unit } of state.unitManifest.getAllUnits()) {
    unitSprites.add(unit.spriteId);
  }

  // UI sprites (for turn order portraits, future action menu)
  const uiSprites = new Set<string>([
    'ui-simple-4', // Panel borders
    'ui-simple-9', // Buttons (future)
  ]);

  return {
    required: [...mapSprites, ...unitSprites, ...uiSprites],
    optional: []
  };
}
```

---

### 2. render()

**Purpose:** Render battle phase overlays (before units are rendered)

**Implementation:**
```typescript
render(state: CombatState, encounter: CombatEncounter, context: PhaseRenderContext): void {
  // Battle phase doesn't need pre-unit overlays (yet)
  // Future: Render movement/attack ranges, targeting indicators, status effects

  // For now, this is a no-op
  // The map and units are rendered by CombatRenderer
  // UI panels are rendered by CombatLayoutManager
}
```

**Note:** Per CombatHierarchy.md lines 447-458, the render flow is:
1. CombatRenderer clears and renders map
2. Phase handler renders overlays (this method)
3. CombatRenderer renders units
4. CombatLayoutManager renders UI panels

---

### 3. updatePhase()

**Purpose:** Update battle logic and check victory/defeat conditions

**Implementation:**
```typescript
protected updatePhase(
  state: CombatState,
  encounter: CombatEncounter,
  deltaTime: number
): CombatState | null {
  // STUB: Victory/defeat checking
  if (encounter.isVictory(state)) {
    return {
      ...state,
      phase: 'victory'
    };
  }

  if (encounter.isDefeat(state)) {
    return {
      ...state,
      phase: 'defeat'
    };
  }

  // STUB: Turn management (not implemented)
  // Future: Update turn gauges, process turn order, trigger AI turns, etc.

  // No state changes yet
  return state;
}
```

**Note:** Returns new state with updated phase when victory/defeat occurs

---

### 4. getTopPanelRenderer()

**Purpose:** Return TurnOrderRenderer showing units sorted by Speed

**Implementation:**
```typescript
getTopPanelRenderer(state: CombatState, encounter: CombatEncounter): TopPanelRenderer {
  // Cache renderer instance (per GeneralGuidelines.md lines 103-110)
  if (!this.turnOrderRenderer) {
    this.turnOrderRenderer = new TurnOrderRenderer();
  }

  return this.turnOrderRenderer;
}
```

**Note:** `TurnOrderRenderer` already exists and sorts by Speed (CombatHierarchy.md lines 196-201)

**From TurnOrderRenderer.ts:**
```typescript
render(ctx, region, fontId, fontAtlasImage, spriteImages, state, encounter) {
  const units = state.unitManifest.getAllUnits();

  // Sort by speed (highest first)
  const sortedUnits = units.sort((a, b) => b.unit.speed - a.unit.speed);

  // Render portraits in order...
}
```

---

### 5. getInfoPanelContent()

**Purpose:** Return placeholder panel content

**Implementation:**
```typescript
getInfoPanelContent(
  context: PhaseRenderContext,
  state: CombatState,
  encounter: CombatEncounter
): PanelContent | null {
  // Cache content instance (per GeneralGuidelines.md lines 103-110)
  if (!this.infoPanelContent) {
    this.infoPanelContent = new BattleInfoPanelContent();
  }

  return this.infoPanelContent;
}
```

---

### 6. handleMapClick()

**Purpose:** Handle map tile clicks (future: movement, targeting)

**Implementation:**
```typescript
handleMapClick(
  context: MouseEventContext,
  state: CombatState,
  encounter: CombatEncounter
): PhaseEventResult {
  // STUB: Log click for debugging
  console.log(`[BattlePhaseHandler] Map clicked at tile (${context.tileX}, ${context.tileY})`);

  // Future: Handle movement selection, action targeting, etc.

  return {
    handled: true,
    logMessage: `Clicked tile (${context.tileX}, ${context.tileY})` // Add to combat log
  };
}
```

**Note:** Per CombatHierarchy.md lines 460-468, click flow is:
1. Canvas event → CombatView
2. CombatInputHandler → canvas coordinates
3. CombatMapRenderer → tile coordinates
4. Phase handler → process logic

---

### 7. handleMouseMove()

**Purpose:** Handle mouse movement over map (future: hover indicators)

**Implementation:**
```typescript
handleMouseMove(
  context: MouseEventContext,
  state: CombatState,
  encounter: CombatEncounter
): PhaseEventResult {
  // STUB: No hover indicators yet
  // Future: Show movement range, attack range, unit info tooltips

  return {
    handled: false // Let default hover behavior continue
  };
}
```

---

## Integration Points

### 1. Update CombatView Phase Switching

**File:** `react-app/src/components/combat/CombatView.tsx`

**Location:** Lines 64-77 (useEffect for phase switching)

**Change:**
```typescript
// Switch phase handler when phase changes
useEffect(() => {
  if (combatState.phase === 'deployment') {
    phaseHandlerRef.current = new DeploymentPhaseHandler(uiStateManager);
  } else if (combatState.phase === 'enemy-deployment') {
    phaseHandlerRef.current = new EnemyDeploymentPhaseHandler();
  } else if (combatState.phase === 'battle') {
    phaseHandlerRef.current = new BattlePhaseHandler();
  }
  // Add other phase handlers as needed (victory, defeat)
}, [combatState.phase, uiStateManager]);
```

**Add import:**
```typescript
import { BattlePhaseHandler } from '../../models/combat/BattlePhaseHandler';
```

---

### 2. Verify EnemyDeploymentPhaseHandler Transition

**File:** `react-app/src/models/combat/EnemyDeploymentPhaseHandler.ts`

**Location:** Lines 134-167 (updatePhase method)

**Current Code (already correct):**
```typescript
protected updatePhase(
  state: CombatState,
  encounter: CombatEncounter,
  deltaTime: number
): CombatState | null {
  // ... initialization and animation logic ...

  if (complete && !this.animationComplete) {
    this.animationComplete = true;

    // Add all enemies to manifest
    for (const { unit, position } of this.enemyUnits) {
      state.unitManifest.addUnit(unit, position);
    }

    // Transition to battle phase
    return {
      ...state,
      phase: 'battle', // ✅ Already transitions correctly
    };
  }

  return state;
}
```

**No changes needed** - already transitions to 'battle' phase

---

## Testing Strategy

### Manual Testing Checklist

1. **Phase Transition**
   - [ ] Deploy all party members
   - [ ] Click "Enter Combat" button
   - [ ] Enemy deployment animations play
   - [ ] Automatically transitions to battle phase after animations

2. **Battle Phase Rendering**
   - [ ] Map renders correctly
   - [ ] All units render (party + enemies)
   - [ ] Top panel shows turn order sorted by Speed
   - [ ] Bottom panel shows placeholder text
   - [ ] Combat log shows previous messages

3. **Mouse Interactions**
   - [ ] Click map tiles → adds message to combat log
   - [ ] Hover over units → no errors
   - [ ] Click on turn order portraits → no errors (no interaction yet)

4. **Victory/Defeat (Stub)**
   - [ ] Cannot test yet (requires unit defeat mechanics)
   - [ ] Conditions are checked but won't trigger

### Console Logging

Enable logging to verify phase is active:
```typescript
constructor() {
  super();
  console.log('[BattlePhaseHandler] Initialized');
}
```

---

## Future Enhancements (Not in Stub)

### Turn Management System
- Track current active unit
- Update turn gauges based on Speed
- Determine turn order dynamically
- Process player/enemy turn phases

### Action Menu System
- Display action menu in info panel
- Options: Attack, Ability, Move, Wait, End Turn
- Clickable buttons with hover states
- Context-sensitive (show available abilities)

### Movement System
- Display movement range overlay
- Click to move unit
- Pathfinding
- Movement animation

### Action Targeting System
- Display attack/ability range overlay
- Click to select target
- Show action outcome percentages
- Confirm/cancel targeting

### Action Execution
- Process attack/ability effects
- Update unit stats (HP, mana, status)
- Show damage numbers
- Play action animations

### Status Effects
- Display status icons on units
- Update effects each turn
- Remove expired effects

### AI System
- Enemy turn processing
- AI decision making (target selection, action choice)
- AI action execution

### Victory/Defeat
- Create VictoryPhaseHandler
- Create DefeatPhaseHandler
- Show victory/defeat UI
- Rewards screen (victory)
- Retry/return options (defeat)

---

## File Structure Summary

### New Files
1. `react-app/src/models/combat/BattlePhaseHandler.ts` - Main handler + panel content

### Modified Files
1. `react-app/src/components/combat/CombatView.tsx` - Add battle phase handler instantiation

### Unchanged Files (Used As-Is)
1. `react-app/src/models/combat/managers/renderers/TurnOrderRenderer.ts` - Already implements turn order
2. `react-app/src/models/combat/EnemyDeploymentPhaseHandler.ts` - Already transitions to 'battle'
3. `react-app/src/models/combat/PhaseBase.ts` - Base class with time tracking
4. `react-app/src/models/combat/CombatPhaseHandler.ts` - Interface definition

---

## Success Criteria

✅ **Compiles without errors**
✅ **Transitions from enemy-deployment to battle phase**
✅ **Displays battlefield (map + units)**
✅ **Shows turn order by Speed in top panel**
✅ **Shows placeholder text in bottom panel**
✅ **Logs map clicks to combat log**
✅ **Checks victory/defeat conditions (even if they don't trigger)**
✅ **No console errors during rendering**
✅ **Follows all GeneralGuidelines.md patterns**
✅ **Follows CombatHierarchy.md structure**

---

## Timeline Estimate

**Phase 1 - Create BattlePhaseHandler (20-30 min)**
- Implement class structure
- Implement all required methods
- Add BattleInfoPanelContent

**Phase 2 - Integration (10-15 min)**
- Update CombatView phase switching
- Add import statements
- Verify EnemyDeploymentPhaseHandler transition

**Phase 3 - Testing (15-20 min)**
- Build and run
- Manual testing checklist
- Fix any issues

**Total Estimated Time:** 45-65 minutes

---

## Next Steps After Stub

Once the stub is complete and tested:

1. **Decide on turn system mechanics**
   - Real-time gauge (Final Fantasy Tactics)?
   - Traditional turn-based (Fire Emblem)?
   - Action point system?

2. **Design action menu UI**
   - Layout and button positioning
   - Action categories
   - Context-sensitive options

3. **Implement movement system**
   - Range calculation algorithm
   - Pathfinding
   - Movement animation

4. **Implement combat actions**
   - Damage calculation formulas
   - Ability effects
   - Status effect system

5. **Create AI system**
   - Decision tree or behavior tree
   - Target prioritization
   - Action selection logic

---

**End of BattlePhaseStubPlan.md**
