# Loading Phase Handler Implementation Plan

**Version:** 1.0
**Date:** 2025-10-27
**Purpose:** Implement a clean loading phase to handle save/load operations with proper state reset and visual feedback using dithered fade effects
**Related:** [GeneralGuidelines.md](GeneralGuidelines.md), [CombatHierarchy.md](CombatHierarchy.md)

---

## Overview

The loading phase provides a clean transition when loading saved combat states. It uses a dithered fade-out effect (similar to ScreenFadeInSequence but inverted) to provide visual feedback while resetting all combat state.

### Key Goals

1. **Clean state reset** - Reset all refs, managers, and stateful components before loading
2. **Visual feedback** - Show "Loading..." message with dithered fade-out effect
3. **Asset preservation** - Keep sprites and fonts cached (no reload)
4. **Error handling** - On load failure, stay in current phase (don't show loading screen)
5. **Extensibility** - Easy to add progress indicators or animations later

---

## Requirements Summary

✅ Loading screen shows "Loading..." text (can be enhanced later)
✅ Dithered fade-out effect using Bayer matrix (inverse of ScreenFadeInSequence)
✅ Don't show loading screen on failed load (keep current state)
✅ Auto-saves happen in background (not implementing yet)
✅ All animation/cinematic state properly reset
✅ Combat log cleared and reloaded with messages
✅ UI state (hovers, selections) reset

---

## Architecture Overview

```
User clicks "Load"
    ↓
Validate and parse save file
    ↓
Success? → Enter loading phase (phase = 'loading')
    ↓
LoadingPhaseHandler renders:
    - Dithered black overlay (fading in)
    - "Loading..." text (fading in)
    ↓
On next frame: resetForLoad() clears all state
    ↓
Apply loaded CombatState (triggers phase change)
    ↓
New phase handler created by useEffect
    ↓
Combat resumes in loaded phase

Failed? → Stay in current phase, show error message
```

---

## File Changes

### 1. New File: `react-app/src/models/combat/LoadingPhaseHandler.ts`

**Purpose:** Phase handler that displays loading screen with dithered fade effect

**Exports:**
- `LoadingPhaseHandler` class

**Key Features:**
- Extends `PhaseBase` for standard phase infrastructure
- Renders dithered black overlay using Bayer matrix
- Renders "Loading..." text centered on screen
- Ignores all input during loading (returns `handled: true`)
- Short fade-in animation (0.3 seconds)
- No sprite requirements (text only)

**Rendering:**
- Uses same dithering logic as `ScreenFadeInSequence`
- Inverted: fades TO black instead of FROM black
- Diagonal wave effect (top-left fades first, bottom-right fades last)
- 4x4 pixel dither blocks using Bayer matrix from `CombatConstants`

**Implementation Details:**
```typescript
export class LoadingPhaseHandler extends PhaseBase {
  private fadeProgress: number = 0;
  private readonly FADE_DURATION = 0.3; // 300ms

  protected updatePhase(
    state: CombatState,
    _encounter: CombatEncounter,
    deltaTime: number
  ): CombatState | null {
    // Update fade progress
    this.fadeProgress = Math.min(1, this.fadeProgress + deltaTime / this.FADE_DURATION);

    // No phase transition from LoadingPhaseHandler itself
    // CombatView will apply loaded state which triggers phase change
    return state;
  }

  render(state, encounter, context): void {
    // 1. Render dithered black overlay
    //    - Uses calculatePositionAlpha() for diagonal wave
    //    - Uses shouldDrawPixel() for Bayer dither pattern
    //    - Inverted: more black as progress increases

    // 2. Render "Loading..." text
    //    - Centered at (192, 108)
    //    - White color with alpha based on fadeProgress
    //    - Uses 7px-04b03 font
  }

  renderUI(): void { /* No UI overlays */ }

  // Ignore all input during loading
  handleMapClick(): PhaseEventResult { return { handled: true }; }
  handleMouseMove(): PhaseEventResult { return { handled: true }; }

  getRequiredSprites(): PhaseSprites { return { spriteIds: new Set() }; }
}
```

**Dithering Algorithm:**
- Same as ScreenFadeInSequence but inverted
- `calculatePositionAlpha(x, y, canvasWidth, canvasHeight, globalAlpha)` - Calculate fade progress for position
- `shouldDrawPixel(pixelX, pixelY, alpha)` - Bayer matrix dither decision
- Iterate over 4x4 pixel blocks, draw black blocks based on dither threshold

---

### 2. Update: `react-app/src/models/combat/CombatState.ts`

**Change:** Add 'loading' to CombatPhase type

```typescript
// Before:
export type CombatPhase = 'deployment' | 'enemy-deployment' | 'battle' | 'victory' | 'defeat';

// After:
export type CombatPhase = 'loading' | 'deployment' | 'enemy-deployment' | 'battle' | 'victory' | 'defeat';
```

**Rationale:** Loading is a legitimate phase in the combat state machine, not a UI-only state.

---

### 3. Update: `react-app/src/components/combat/CombatView.tsx`

#### 3.1 Add Import

```typescript
import { LoadingPhaseHandler } from '../../models/combat/LoadingPhaseHandler';
```

#### 3.2 Update Phase Switching (useEffect at line 71)

```typescript
useEffect(() => {
  if (combatState.phase === 'loading') {
    phaseHandlerRef.current = new LoadingPhaseHandler();
  } else if (combatState.phase === 'deployment') {
    phaseHandlerRef.current = new DeploymentPhaseHandler(uiStateManager);
  } else if (combatState.phase === 'enemy-deployment') {
    phaseHandlerRef.current = new EnemyDeploymentPhaseHandler();
  } else if (combatState.phase === 'battle') {
    phaseHandlerRef.current = new BattlePhaseHandler();
  }
  // Add other phase handlers as needed (victory, defeat)
}, [combatState.phase, uiStateManager]);
```

#### 3.3 Create `resetForLoad` Function

**Location:** After useMemo declarations, before load handlers (around line 940)

**Purpose:** Reset all stateful refs and managers to clean slate

```typescript
/**
 * Reset all combat state for loading a saved game
 * Clears animations, UI state, and stateful components
 * Note: Does NOT reset expensive cached resources (sprites, fonts, renderers)
 */
const resetForLoad = useCallback(() => {
  // 1. Reset cinematic manager
  cinematicManagerRef.current = new CinematicManager();
  introCinematicPlayedRef.current = false;
  combatLogInitializedRef.current = false;

  // 2. Reset combat log (clear messages and animation state)
  combatLogManager.clear();

  // 3. Reset UI state refs
  lastDisplayedUnitRef.current = null;
  targetUnitRef.current = null;
  hoveredPartyMemberRef.current = null;

  // 4. Clear input state
  scrollArrowPressedRef.current = null;
  if (scrollIntervalRef.current) {
    clearInterval(scrollIntervalRef.current);
    scrollIntervalRef.current = null;
  }

  // 5. Reset scroll positions
  setMapScrollX(0);
  setMapScrollY(0);

  // Note: Panel managers, layout renderers, and other useMemo instances
  // are kept as they have no persistent state that affects loaded game.
  // The phase handler will be recreated by useEffect when phase changes.

  console.log('[CombatView] State reset for load complete');
}, [combatLogManager]);
```

**Why these resets:**
- `cinematicManagerRef` - Clear any queued cinematics
- `introCinematicPlayedRef` - Loaded game may be past intro
- `combatLogInitializedRef` - Log will be reinitialized with loaded messages
- `combatLogManager.clear()` - Remove old messages and animation state
- UI refs - Clear hover/selection state from previous game
- Input refs - Clear any pressed buttons or intervals
- Scroll positions - Reset map viewport to origin

**Why NOT reset these:**
- `spriteLoader`, `fontLoader` - Cached assets, expensive to reload
- `renderer`, `layoutRenderer`, `mapRenderer` - Stateless, reusable
- `uiStateManager` - Will be updated by phase handler
- Panel managers - Stateless coordinators

#### 3.4 Update `handleImportFromFile`

**Location:** Around line 964

```typescript
const handleImportFromFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const result = await importCombatFromFile(file);
    if (result) {
      // 1. Enter loading phase (renders loading screen)
      setCombatState(prev => ({ ...prev, phase: 'loading' }));

      // 2. Wait for loading phase to render (next frame)
      await new Promise(resolve => requestAnimationFrame(resolve));

      // 3. Reset all state
      resetForLoad();

      // 4. Load combat log messages
      const messages = result.combatLog.getMessages();
      for (const message of messages) {
        combatLogManager.addMessage(message, Infinity); // Add instantly
      }
      combatLogManager.scrollToBottom();

      // 5. Apply loaded state (triggers transition to actual phase via useEffect)
      setCombatState(result.combatState);

      // 6. Clear any error messages
      setSaveErrorMessage(null);

      console.log('[CombatView] Loaded combat from file:', {
        phase: result.combatState.phase,
        turnNumber: result.combatState.turnNumber,
        messageCount: messages.length
      });
    } else {
      // Validation failed - keep current state (per requirement)
      setSaveErrorMessage('Invalid save file or corrupted data');
    }
  } catch (error) {
    // Error during import - keep current state (per requirement)
    setSaveErrorMessage('Failed to import combat state');
    console.error('[CombatView] Import error:', error);
  }

  // Reset file input to allow re-importing the same file
  event.target.value = '';
}, [resetForLoad, combatLogManager]);
```

**Key Changes:**
1. Enter loading phase first
2. Wait for render (requestAnimationFrame)
3. Call resetForLoad()
4. Load messages
5. Apply loaded state (triggers phase change)
6. Error path doesn't enter loading phase

#### 3.5 Update `handleLoadFromLocalStorage`

**Location:** Around line 1001

```typescript
const handleLoadFromLocalStorage = useCallback(() => {
  try {
    const result = loadCombatFromLocalStorage();
    if (result) {
      // 1. Enter loading phase (renders loading screen)
      setCombatState(prev => ({ ...prev, phase: 'loading' }));

      // 2. Wait for loading phase to render (next frame)
      // Use setTimeout instead of requestAnimationFrame to ensure state update completes
      setTimeout(() => {
        // 3. Reset all state
        resetForLoad();

        // 4. Load combat log messages
        const messages = result.combatLog.getMessages();
        for (const message of messages) {
          combatLogManager.addMessage(message, Infinity); // Add instantly
        }
        combatLogManager.scrollToBottom();

        // 5. Apply loaded state (triggers transition to actual phase via useEffect)
        setCombatState(result.combatState);

        // 6. Clear any error messages
        setSaveErrorMessage(null);

        console.log('[CombatView] Loaded combat from localStorage:', {
          phase: result.combatState.phase,
          turnNumber: result.combatState.turnNumber,
          messageCount: messages.length
        });
      }, 0);
    } else {
      // No save found - don't enter loading phase
      setSaveErrorMessage('No saved combat found in localStorage');
    }
  } catch (error) {
    // Error during load - don't enter loading phase
    setSaveErrorMessage('Failed to load from localStorage');
    console.error('[CombatView] Load error:', error);
  }
}, [resetForLoad, combatLogManager]);
```

**Note:** Using `setTimeout` instead of `requestAnimationFrame` for localStorage because:
- No async file reading
- Ensures React state update completes before proceeding
- Still allows loading screen to render

---

## Testing Plan

### Test Case 1: Load from File (Success)
1. Start combat, deploy units, move to battle phase
2. Click "Export" to save current state
3. Perform some actions (click map, scroll, etc.)
4. Click "Import" and select saved file
5. **Expected:**
   - Brief loading screen appears with dithered fade
   - Combat state matches saved state
   - Combat log shows all saved messages
   - No cinematic replays
   - No hover states from previous game
   - Map scroll at origin

### Test Case 2: Load from File (Invalid File)
1. Start combat
2. Create invalid JSON file or corrupt save file
3. Click "Import" and select invalid file
4. **Expected:**
   - No loading screen appears
   - Error message: "Invalid save file or corrupted data"
   - Current combat state unchanged
   - Still able to continue playing

### Test Case 3: Load from localStorage (Success)
1. Start combat, deploy units
2. Click "Save to localStorage"
3. Perform actions
4. Click "Load from localStorage"
5. **Expected:**
   - Brief loading screen
   - State restored to save point
   - All messages visible
   - Clean state (no old animations)

### Test Case 4: Load from localStorage (No Save)
1. Clear browser localStorage
2. Click "Load from localStorage"
3. **Expected:**
   - No loading screen
   - Error message: "No saved combat found in localStorage"
   - Current combat unchanged

### Test Case 5: Load During Animation
1. Start combat, deploy units
2. Trigger enemy deployment phase (animations running)
3. During enemy fade-in, click "Load" with a saved file
4. **Expected:**
   - Loading screen interrupts animation
   - State properly reset (no animation conflicts)
   - Loaded state displays correctly

### Test Case 6: Load with Active Cinematic
1. Start fresh combat (intro cinematic playing)
2. Immediately click "Load" before cinematic completes
3. **Expected:**
   - Loading screen interrupts cinematic
   - CinematicManager reset
   - Loaded state displays without replaying intro

### Test Case 7: Rapid Load Attempts
1. Start combat
2. Click "Load" twice rapidly
3. **Expected:**
   - First load completes
   - Second load either waits or overwrites cleanly
   - No state corruption

---

## Error Handling

### Load Validation Failures
- **Where:** `importCombatFromFile()` / `loadCombatFromLocalStorage()`
- **Action:** Return null, don't enter loading phase
- **UI:** Show error message, keep current state

### Missing Save Data
- **Where:** `loadCombatFromLocalStorage()` returns null
- **Action:** Don't enter loading phase
- **UI:** Show "No saved combat found"

### Phase Transition Failures
- **Where:** useEffect phase switching
- **Action:** Log error, potentially fallback to deployment phase
- **UI:** Show error message

### Combat Log Load Failures
- **Where:** Message parsing or addMessage() failures
- **Action:** Log warning, continue with partial messages
- **UI:** No error shown (graceful degradation)

---

## Performance Considerations

### Asset Caching
✅ **Sprites/Fonts preserved** - No reload on load
✅ **Renderer instances preserved** - useMemo prevents recreation
✅ **Layout managers preserved** - No state to corrupt

### Reset Cost
- CinematicManager: ~1ms (new instance)
- CombatLogManager.clear(): ~1ms
- Ref resets: <1ms
- **Total:** <5ms

### Loading Screen Duration
- Fade-in: 300ms
- State reset + load: <20ms
- Phase transition: <10ms
- **Total perceived time:** ~330ms

### Memory Impact
- Old phase handler: Garbage collected
- Old cinematic queue: Cleared
- No memory leaks from refs or managers

---

## Edge Cases

### 1. Load Save from Different Encounter
**Scenario:** Save from encounter A, load into encounter B
**Behavior:** Map and units from save A appear
**Note:** Encounter in CombatView is from route, but loaded state overrides map/units
**Risk:** Mismatch between encounter definition and loaded state
**Mitigation:** Save includes encounterId (optional), can validate in future

### 2. Load Save from Different Code Version
**Scenario:** Save from v1.0.0, load in v1.1.0 with new fields
**Behavior:** Deserialization handles missing fields gracefully
**Note:** Version field in CombatSaveData allows validation
**Mitigation:** Already handled by version check in deserializeCombat()

### 3. Load During Active User Input
**Scenario:** User is dragging/clicking when load completes
**Behavior:** Input refs reset, no stale input state
**Mitigation:** resetForLoad() clears all input refs

### 4. Load with Modal/Dialog Open
**Scenario:** Party selection panel open, user clicks load
**Behavior:** Panel managers cleared, modal disappears
**Note:** Current system has no modal state to persist
**Mitigation:** Panel managers are stateless coordinators

---

## Future Enhancements

### Progress Indicator
- Add progress bar or spinner to LoadingPhaseHandler
- Track deserialization progress (map, units, log)
- Show percentage or step name

### Load Options
- "New Game+" mode (keep player units, reset enemies)
- Quick load hotkey (F9)
- Load from cloud save

### Validation Improvements
- Check save version compatibility
- Warn if loading very old saves
- Preview save metadata before loading

### Animation Options
- Configurable fade duration
- Alternative fade patterns (radial, linear)
- Skip animation option for fast loads

---

## Compliance with GeneralGuidelines.md

✅ **Immutable State Updates** (lines 181-201)
- Uses spread operator: `{ ...prev, phase: 'loading' }`
- Creates new CombatState when loading

✅ **Phase Handler Return Value Pattern** (lines 136-179)
- LoadingPhaseHandler returns state unchanged
- Phase transition happens via setCombatState() in CombatView

✅ **Animation State Management** (lines 821-944)
- Properly resets animation state in resetForLoad()
- CinematicManager recreated, not just cleared
- No stuck animations after load

✅ **Cached Instances** (lines 103-110)
- Preserves expensive resources (sprites, fonts, renderers)
- Only resets cheap refs and stateful managers

✅ **Rendering Rules** (lines 3-48)
- Uses FontAtlasRenderer for text
- No direct ctx.fillText() or ctx.drawImage()
- Follows existing rendering patterns

---

## Implementation Checklist

- [ ] Create `LoadingPhaseHandler.ts` with dithered fade rendering
- [ ] Add 'loading' to `CombatPhase` type in `CombatState.ts`
- [ ] Add LoadingPhaseHandler to phase switching in `CombatView.tsx`
- [ ] Create `resetForLoad()` function in `CombatView.tsx`
- [ ] Update `handleImportFromFile()` to use loading phase
- [ ] Update `handleLoadFromLocalStorage()` to use loading phase
- [ ] Test all 7 test cases
- [ ] Verify no console errors during load
- [ ] Verify memory doesn't leak (DevTools profiling)
- [ ] Update `CombatHierarchy.md` with LoadingPhaseHandler documentation

---

## Estimated Effort

- **LoadingPhaseHandler.ts:** 45 minutes (dithering logic is complex)
- **CombatState.ts:** 2 minutes (type update)
- **CombatView.tsx phase switching:** 5 minutes
- **resetForLoad() function:** 20 minutes (comprehensive reset)
- **Update load handlers:** 15 minutes
- **Testing:** 45 minutes (7 test cases)
- **Documentation updates:** 15 minutes

**Total:** ~2.5 hours

---

**End of LoadingPhaseHandlerPlan.md**
