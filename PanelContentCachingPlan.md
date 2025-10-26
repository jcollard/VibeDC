# Panel Content Caching - Performance Refactor Plan

## Problem Statement

Multiple panel content objects (`PartyMembersContent`, `UnitInfoContent`, `EmptyContent`) are being recreated every frame (60 FPS), causing:
- **60+ object allocations per second** - garbage collection pressure
- **Wasted computation** - recalculating identical layout data
- **Violation of GeneralGuidelines.md** - "Don't recreate stateful components every frame"
- **Loss of potential state** - components can't maintain internal animation or transition state

### Current Issues Identified

1. **CombatLayoutManager.ts:442-454** - Creates new `PartyMembersContent` every frame during deployment
2. **CombatLayoutManager.ts:455-466** - Creates new `UnitInfoContent` every frame during combat
3. **CombatLayoutManager.ts:501-519** - Creates new `UnitInfoContent`/`EmptyContent` every frame for target panel
4. **DeploymentPhaseHandler.ts:483-494** - Creates `PartyMembersContent` just to handle hover event, then discards it
5. **DeploymentPhaseHandler.ts:543-554** - Creates `PartyMembersContent` for info panel content getter

## Solution Design (Aligned with GeneralGuidelines.md)

Following the established pattern from GeneralGuidelines.md lines 66-73:

### Core Principle: Cache and Update, Don't Recreate

```typescript
// ❌ BAD: Current approach
render() {
  const content = new PartyMembersContent(...);  // New object every frame!
  panelManager.setContent(content);
}

// ✅ GOOD: Cache and update approach
private cachedContent: PartyMembersContent | null = null;

render() {
  if (!this.cachedContent) {
    this.cachedContent = new PartyMembersContent(...);
  }
  this.cachedContent.updateHoveredIndex(newIndex);  // Update state only
  panelManager.setContent(this.cachedContent);
}
```

### When to Cache vs Recreate

Per GeneralGuidelines.md lines 76-85:

**Cache when:**
- ✅ Component has hover state (PartyMembersContent does!)
- ✅ Component has visual state that persists across frames
- ✅ Same content type is being displayed

**Recreate when:**
- ✅ Phase changes (deployment → battle)
- ✅ Content type changes (party members → unit info)
- ✅ Significant state reset required

## Implementation Plan

### Phase 1: Add Update Methods to PanelContent Implementations

**Files to modify:**
- `react-app/src/models/combat/managers/panels/PartyMembersContent.ts`
- `react-app/src/models/combat/managers/panels/UnitInfoContent.ts`
- `react-app/src/models/combat/managers/panels/EmptyContent.ts`

**Changes:**

Add update methods to each content class:

```typescript
class PartyMembersContent {
  private hoveredIndex: number | null;

  constructor(..., hoveredIndex: number | null) {
    this.hoveredIndex = hoveredIndex;
  }

  // NEW: Update method instead of recreation
  updateHoveredIndex(index: number | null): void {
    this.hoveredIndex = index;
  }

  // NEW: Update party units if they change
  updatePartyUnits(units: CombatUnit[]): void {
    this.partyUnits = units;
  }
}

class UnitInfoContent {
  // NEW: Update method for unit changes
  updateUnit(unit: CombatUnit): void {
    this.unit = unit;
  }
}

class EmptyContent {
  // No updates needed - stateless
}
```

### Phase 2: Add Caching to CombatLayoutManager

**File:** `react-app/src/models/combat/layouts/CombatLayoutManager.ts`

**Changes:**

```typescript
export class CombatLayoutManager implements CombatLayoutRenderer {
  // NEW: Cached content instances
  private cachedPartyMembersContent: PartyMembersContent | null = null;
  private cachedCurrentUnitContent: UnitInfoContent | null = null;
  private cachedCurrentEmptyContent: EmptyContent | null = null;
  private cachedTargetUnitContent: UnitInfoContent | null = null;
  private cachedTargetEmptyContent: EmptyContent | null = null;

  // Track previous phase to detect transitions
  private previousPhase: string | null = null;

  private renderBottomInfoPanel(...) {
    // Detect phase change and clear cache
    if (isDeploymentPhase !== (this.previousPhase === 'deployment')) {
      this.clearBottomPanelCache();
      this.previousPhase = isDeploymentPhase ? 'deployment' : 'battle';
    }

    if (isDeploymentPhase && partyUnits && partyUnits.length > 0) {
      // Create or update cached content
      if (!this.cachedPartyMembersContent) {
        this.cachedPartyMembersContent = new PartyMembersContent(
          { title: 'Party Members', ... },
          partyUnits,
          spriteImages,
          spriteSize,
          hoveredPartyMemberIndex ?? null
        );
      } else {
        // Update only the changing state
        this.cachedPartyMembersContent.updateHoveredIndex(hoveredPartyMemberIndex ?? null);
        this.cachedPartyMembersContent.updatePartyUnits(partyUnits);
      }
      currentUnitPanelManager.setContent(this.cachedPartyMembersContent);
    }
    // ... similar for other content types
  }

  // NEW: Clear cache on phase transitions
  private clearBottomPanelCache(): void {
    this.cachedPartyMembersContent = null;
    this.cachedCurrentUnitContent = null;
    this.cachedCurrentEmptyContent = null;
  }

  private clearTargetPanelCache(): void {
    this.cachedTargetUnitContent = null;
    this.cachedTargetEmptyContent = null;
  }
}
```

### Phase 3: Fix DeploymentPhaseHandler Hover Issue

**File:** `react-app/src/models/combat/DeploymentPhaseHandler.ts`

**Current problem (lines 483-494):** Creates `PartyMembersContent` just to call `handleHover()`, then discards it.

**Solution:** Cache a single instance for hover detection:

```typescript
export class DeploymentPhaseHandler extends PhaseBase {
  // NEW: Cache content instance for hover detection
  private hoverDetectionContent: PartyMembersContent | null = null;

  handleInfoPanelHover(relativeX, relativeY, _state, _encounter): PhaseEventResult {
    const partyUnits = PartyMemberRegistry.getAll()
      .map(member => PartyMemberRegistry.createPartyMember(member.id))
      .filter((unit): unit is CombatUnit => unit !== undefined);

    if (partyUnits.length === 0) {
      return { handled: false };
    }

    // Create once and reuse for hover detection
    if (!this.hoverDetectionContent) {
      this.hoverDetectionContent = new PartyMembersContent(
        { title: 'Party Members', ... },
        partyUnits,
        new Map(),
        12,
        null
      );
    } else {
      // Update party units in case they changed
      this.hoverDetectionContent.updatePartyUnits(partyUnits);
    }

    const hoveredIndex = this.hoverDetectionContent.handleHover(relativeX, relativeY);

    return {
      handled: hoveredIndex !== null,
      preventDefault: hoveredIndex !== null,
    };
  }
}
```

### Phase 4: Testing

Manual testing checklist:

- [ ] **Deployment phase hover** - Hover over party members, verify highlight updates correctly
- [ ] **Deployment phase click** - Click party members to deploy, verify selection works
- [ ] **Phase transition** - Deploy all units and start combat, verify panels update correctly
- [ ] **Battle phase unit info** - Verify current unit and target unit panels show correct data
- [ ] **Empty state** - Verify empty panels display correctly when no unit selected
- [ ] **Performance** - Open dev tools performance tab, verify no frame drops during hover
- [ ] **No visual regression** - Compare before/after screenshots for identical appearance

### Phase 5: Performance Validation

Before/after measurements:

**Before:**
- Object allocations per second: ~180 (3 panels × 60 fps)
- GC pressure: High (constant small object churn)

**After (expected):**
- Object allocations per second: ~0 (only on phase transitions)
- GC pressure: Low (stable object graph)

Use Chrome DevTools Performance profiler to verify:
1. Record 5 seconds of hovering over party members
2. Check "Memory" section for allocation rate
3. Verify reduction in minor GC events

## Data Flow Analysis

### Hover State Propagation

```
User hovers over panel
  ↓
CombatView.handleInfoPanelHover (line ~760)
  ↓
phaseHandler.handleInfoPanelHover (returns hovered index)
  ↓
hoveredPartyMemberRef.current = hoverResult (line 765)
  ↓
renderFrame() called (line 766)
  ↓
layoutRenderer.renderLayout({ ..., hoveredPartyMemberIndex: hoveredPartyMemberRef.current })
  ↓
CombatLayoutManager.renderBottomInfoPanel receives hoveredPartyMemberIndex
  ↓
PartyMembersContent receives hoveredIndex in constructor ← RECREATED EVERY FRAME!
```

**After fix:**
```
Last step becomes:
  ↓
cachedPartyMembersContent.updateHoveredIndex(hoveredPartyMemberIndex) ← UPDATE ONLY!
```

### Phase Transition Flow

Phase transitions happen in CombatView when combat state changes:

```typescript
// CombatView.tsx line ~42
const [combatState, setCombatState] = useState<CombatState>({
  phase: 'deployment',  // Changed to 'battle' when deployment completes
  ...
});
```

The `isDeploymentPhase` flag is derived from this state (line ~425):
```typescript
isDeploymentPhase: combatState.phase === 'deployment',
```

So we can detect phase transitions by comparing current vs previous phase in `CombatLayoutManager`.

## Questions to Confirm

1. **Hover state propagation** - ✅ Answered: Managed in `CombatView` as `hoveredPartyMemberRef`, passed through `LayoutRenderContext`

2. **Phase transition handling** - ✅ Answered: Phase stored in `combatState.phase`, can detect changes by tracking previous phase

3. **Similar patterns elsewhere** - ✅ Identified: Need to fix `CombatLayoutManager` (3 locations) and `DeploymentPhaseHandler` (2 locations)

4. **Testing expectations** - 🔶 Needs answer: Manual testing only, or also add automated tests?

5. **Scope** - 🔶 Needs answer: Fix all 5 locations, or prioritize certain ones?

## Risks and Mitigations

### Risk: Stale Data in Cached Content

**Risk:** Cached content might display outdated unit stats if not updated properly.

**Mitigation:**
- Add explicit `update()` methods that must be called
- In debug mode, add assertions to detect stale data
- Document which properties need updates

### Risk: Memory Leaks from Cached Objects

**Risk:** Holding references to large objects (sprite images) in cached content.

**Mitigation:**
- Sprites are already managed by `spriteImagesRef` in CombatView
- Content only holds references, not ownership
- Clear cache on unmount (add cleanup in CombatLayoutManager)

### Risk: Harder to Debug State Issues

**Risk:** Harder to debug when content persists across frames.

**Mitigation:**
- Add `console.log` in update methods during development
- Add getter methods to inspect internal state
- Keep update methods simple and focused

## Success Criteria

1. ✅ Zero new `PartyMembersContent` allocations during hover (except on first hover)
2. ✅ Zero new `UnitInfoContent` allocations during battle (except when unit changes)
3. ✅ Phase transitions correctly clear and recreate content
4. ✅ All existing functionality works identically (no visual changes)
5. ✅ Performance profiler shows reduced GC activity
6. ✅ Code follows GeneralGuidelines.md patterns

## Implementation Order

1. **Phase 1** - Add update methods (low risk, enables Phase 2)
2. **Phase 2** - Cache in CombatLayoutManager (high impact, most visible improvement)
3. **Phase 3** - Fix DeploymentPhaseHandler (medium impact, cleaner design)
4. **Phase 4** - Testing (validate correctness)
5. **Phase 5** - Performance validation (confirm improvement)

## Estimated Effort

- Phase 1: ~30 minutes (straightforward additions)
- Phase 2: ~1 hour (careful refactoring with testing)
- Phase 3: ~30 minutes (similar to Phase 2)
- Phase 4: ~30 minutes (manual testing)
- Phase 5: ~15 minutes (performance profiling)

**Total: ~2.5 hours**

## Follow-up Improvements (Future)

Not in scope for this refactor, but worth noting:

1. **Add animation support** - Cached content could maintain animation state (fade in/out)
2. **Add transition effects** - Smooth transitions when content changes
3. **Lazy layout calculation** - Only recalculate layout when region size changes
4. **Automated performance tests** - Add benchmarks to catch regressions
5. **Update GeneralGuidelines.md** - Document this pattern as canonical example
