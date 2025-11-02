# Integration Plan: PartyManagementView into GameView

**Version:** 1.0
**Created:** 2025-01-11
**Status:** 📋 Planning
**Related:** [PartyManagementHierarchy.md](PartyManagementHierarchy.md), [GameViewHierarchy.md](GameViewHierarchy.md), [CODE_REVIEW_party-management-view.md](CODE_REVIEW_party-management-view.md)

## Overview

Integrate the PartyManagementView (party management/inventory system) as a third view mode in GameView, alongside the existing 'exploration' and 'combat' views. This will allow players to access party management from the exploration view.

## Current Architecture Analysis

### GameView (Orchestrator)
- **Current Views**: 'exploration' | 'combat'
- **Pattern**: Manages view transitions with fade effects
- **State**: CompleteGameState with explorationState, combatState, partyState
- **Transitions**: FirstPersonView ↔ CombatView

### PartyManagementView (Standalone)
- **Current State**: Independent component with own state management
- **Features**: Inventory, equipment, abilities, XP spending, class management
- **Panel Modes**: 'inventory' | 'spend-xp' | 'set-abilities'
- **Persistence**: Uses PartyMemberRegistry, PartyInventory (both with localStorage)

## Integration Strategy

### Phase 1: Add 'party-management' View Mode

**Changes to GameState.ts:**
```typescript
// Update currentView type
currentView: 'exploration' | 'combat' | 'party-management';

// PartyManagementState (minimal - most state is in registries)
interface PartyManagementState {
  returnToView: 'exploration' | 'combat'; // Remember where we came from
}

// Add to CompleteGameState
interface CompleteGameState {
  // ... existing fields
  partyManagementState?: PartyManagementState;
}
```

**Rationale**: PartyManagementView already handles its own state via registries. We only need to track which view to return to.

**Files to Modify**:
- `react-app/src/models/game/GameState.ts`

**Expected Changes**: ~10 lines added

---

### Phase 2: Add Transition Handlers to GameView

**New Callbacks:**
```typescript
// In GameView.tsx
const handleOpenPartyManagement = useCallback(async (fromView: 'exploration' | 'combat') => {
  console.log('[GameView] Opening party management');

  // Sync party state TO registries before opening
  syncPartyStateToRegistries(gameState.partyState);

  setIsTransitioning(true);
  await transitionManager.transitionTo(
    gameState.currentView,
    'party-management',
    () => {
      setGameState(prevState => ({
        ...prevState,
        currentView: 'party-management',
        partyManagementState: {
          returnToView: fromView,
        },
      }));
    }
  );
  setIsTransitioning(false);
}, [gameState.currentView, gameState.partyState, transitionManager]);

const handleClosePartyManagement = useCallback(async () => {
  const returnTo = gameState.partyManagementState?.returnToView || 'exploration';
  console.log(`[GameView] Closing party management, returning to ${returnTo}`);

  setIsTransitioning(true);
  await transitionManager.transitionTo(
    'party-management',
    returnTo,
    () => {
      // Sync party state FROM registries before closing
      const updatedPartyState = syncRegistriesToPartyState();

      setGameState(prevState => ({
        ...prevState,
        currentView: returnTo,
        partyState: updatedPartyState,
        partyManagementState: undefined,
      }));
    }
  );
  setIsTransitioning(false);
}, [gameState.partyManagementState, transitionManager]);
```

**Files to Modify**:
- `react-app/src/components/game/GameView.tsx`

**Expected Changes**: ~60 lines added (callbacks + sync functions)

---

### Phase 3: Add View Rendering in GameView

**Add to render section:**
```typescript
{gameState.currentView === 'party-management' && (
  <PartyManagementView
    onClose={handleClosePartyManagement}
  />
)}
```

**Files to Modify**:
- `react-app/src/components/game/GameView.tsx`

**Expected Changes**: ~10 lines added

---

### Phase 4: Add Entry Points

**Option A: From FirstPersonView (Recommended)**
- Add 'I' key handler to open party management
- Pass `onOpenPartyManagement` callback to FirstPersonView
- Clean integration with existing input system

**Option B: Global Hotkey in GameView**
- Add 'I' key listener in GameView
- Only active when currentView is 'exploration' or 'combat'
- Simpler, but less flexible

**Recommended: Option A**

**In GameView.tsx:**
```typescript
<FirstPersonView
  // ... existing props
  onOpenPartyManagement={() => handleOpenPartyManagement('exploration')}
/>
```

**In FirstPersonView.tsx:**
```typescript
// Add to handleKeyDown
if (event.key === 'i' || event.key === 'I') {
  event.preventDefault();
  onOpenPartyManagement?.();
  return;
}
```

**Add prop type:**
```typescript
interface FirstPersonViewProps {
  // ... existing props
  onOpenPartyManagement?: () => void;
}
```

**Files to Modify**:
- `react-app/src/components/game/GameView.tsx` (~5 lines)
- `react-app/src/components/firstperson/FirstPersonView.tsx` (~15 lines)

**Expected Changes**: ~20 lines total

---

### Phase 5: Sync Party State

**Current Issue**: GameView has `partyState` but PartyManagementView uses registries (PartyMemberRegistry, PartyInventory).

**Solution**: Two-way sync on transitions

**Sync Functions to Add:**

```typescript
/**
 * Sync party state FROM GameView TO registries (before opening party management)
 */
const syncPartyStateToRegistries = (partyState: PartyState): void => {
  console.log('[GameView] Syncing party state to registries');

  // Update PartyMemberRegistry from partyState.members
  partyState.members.forEach(member => {
    const configs = PartyMemberRegistry.getAll();
    const config = configs.find(c => c.id === member.id);
    if (config) {
      PartyMemberRegistry.updateFromUnit(config.id, member);
    }
  });

  // Update PartyInventory from partyState.inventory
  PartyInventory.clear();
  partyState.inventory.items.forEach(item => {
    PartyInventory.addItem(item.itemId, item.quantity);
  });
  PartyInventory.addGold(partyState.inventory.gold);
};

/**
 * Sync party state FROM registries TO GameView (after closing party management)
 */
const syncRegistriesToPartyState = (): PartyState => {
  console.log('[GameView] Syncing registries to party state');

  const members = PartyMemberRegistry.getAll()
    .map(config => PartyMemberRegistry.createPartyMember(config.id))
    .filter((unit): unit is CombatUnit => unit !== undefined);

  const items = PartyInventory.getAllItems().map(item => ({
    itemId: item.equipmentId,
    quantity: item.quantity,
  }));

  const gold = PartyInventory.getGold();

  return {
    members,
    inventory: { items, gold },
    equipment: new Map(), // TODO: Extract equipment from members if needed
  };
};
```

**When to Sync**:
- **TO registries**: In `handleOpenPartyManagement` (before transition)
- **FROM registries**: In `handleClosePartyManagement` (before transition back)

**Files to Modify**:
- `react-app/src/components/game/GameView.tsx`

**Expected Changes**: ~40 lines added (sync functions)

---

### Phase 6: Update PartyManagementView

**Minimal Changes Required:**

**Add prop:**
```typescript
interface PartyManagementViewProps {
  onClose?: () => void;
}

export const PartyManagementView: React.FC<PartyManagementViewProps> = ({ onClose }) => {
  // ... existing code
}
```

**Add close handler:**
```typescript
// Add to existing useEffect keyboard listener (or create new one)
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // ESC key to close
    if (event.key === 'Escape' && onClose) {
      event.preventDefault();
      onClose();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [onClose]);
```

**Optional: Add visual close button**
```typescript
// Could add a "Close (ESC)" button in the title panel
// Or just rely on ESC key + help text
```

**Files to Modify**:
- `react-app/src/components/inventory/PartyManagementView.tsx`

**Expected Changes**: ~20 lines added

---

### Phase 7: Update Serialization

**Add serialization for PartyManagementState:**

**In GameStateSerialization.ts:**
```typescript
interface PartyManagementStateJSON {
  returnToView: 'exploration' | 'combat';
}

function serializePartyManagementState(state: PartyManagementState): PartyManagementStateJSON {
  return {
    returnToView: state.returnToView,
  };
}

function deserializePartyManagementState(json: PartyManagementStateJSON): PartyManagementState {
  return {
    returnToView: json.returnToView,
  };
}

// Update CompleteGameStateJSON interface
interface CompleteGameStateJSON {
  // ... existing fields
  partyManagementState?: PartyManagementStateJSON;
}

// Update serializeCompleteGameState
export function serializeCompleteGameState(state: CompleteGameState): CompleteGameStateJSON {
  return {
    // ... existing fields
    partyManagementState: state.partyManagementState
      ? serializePartyManagementState(state.partyManagementState)
      : undefined,
  };
}

// Update deserializeCompleteGameState
export function deserializeCompleteGameState(json: CompleteGameStateJSON): CompleteGameState | null {
  // ... existing code

  return {
    // ... existing fields
    partyManagementState: json.partyManagementState
      ? deserializePartyManagementState(json.partyManagementState)
      : undefined,
  };
}
```

**Files to Modify**:
- `react-app/src/models/game/GameStateSerialization.ts`

**Expected Changes**: ~30 lines added

---

### Phase 8: Handle Edge Cases

**Combat Entry from Party Management**:
- **Decision**: NOT RECOMMENDED - keep party management as a "pause menu"
- Block combat transitions while in party management
- If needed later: Close party management, then start combat

**Save/Load with Party Management Open**:
- Save: Include partyManagementState in save (Phase 7 handles this)
- Load: If returning to party-management view, sync state to registries
- F5 quick save should work seamlessly (already handled by existing system)

**Add to GameView.tsx (if loading into party-management view):**
```typescript
// In useEffect that loads save on mount
useEffect(() => {
  if (autoLoadSave) {
    const savedState = GameSaveManager.quickLoad();
    if (savedState) {
      console.log('[GameView] Loaded from quick save');

      // If loading into party management, sync to registries
      if (savedState.currentView === 'party-management') {
        syncPartyStateToRegistries(savedState.partyState);
      }

      setGameState(savedState);
    }
  }
}, [autoLoadSave]);
```

**Files to Modify**:
- `react-app/src/components/game/GameView.tsx`

**Expected Changes**: ~10 lines added

---

## Implementation Checklist

### Phase 1: GameState Updates
- [ ] Add 'party-management' to `currentView` type union
- [ ] Add `PartyManagementState` interface
- [ ] Add `partyManagementState?` to `CompleteGameState` interface
- [ ] Test: TypeScript compilation passes

### Phase 2: GameView Transition Handlers
- [ ] Add `handleOpenPartyManagement` callback
- [ ] Add `handleClosePartyManagement` callback
- [ ] Add `syncPartyStateToRegistries` function
- [ ] Add `syncRegistriesToPartyState` function
- [ ] Test: Callbacks compile, transitions work

### Phase 3: GameView Rendering
- [ ] Add render case for 'party-management' view
- [ ] Pass `onClose` prop to PartyManagementView
- [ ] Test: View renders when currentView is 'party-management'

### Phase 4: Entry Points
- [ ] Add `onOpenPartyManagement` prop to FirstPersonView interface
- [ ] Pass callback from GameView to FirstPersonView
- [ ] Add 'I' key handler in FirstPersonView
- [ ] Add help text: "Press I for Party Management"
- [ ] Test: Pressing 'I' in exploration opens party management

### Phase 5: PartyManagementView Updates
- [ ] Add `onClose?: () => void` prop
- [ ] Add ESC key handler to call `onClose()`
- [ ] Optional: Add visual "Close (ESC)" button
- [ ] Test: ESC key closes party management and returns to exploration

### Phase 6: Serialization Updates
- [ ] Add `PartyManagementStateJSON` interface
- [ ] Add serialization functions
- [ ] Update `CompleteGameStateJSON` interface
- [ ] Update `serializeCompleteGameState()`
- [ ] Update `deserializeCompleteGameState()`
- [ ] Test: Save/load preserves partyManagementState

### Phase 7: Edge Case Handling
- [ ] Add sync on load (if loading into party-management view)
- [ ] Test: F5 save while in party management
- [ ] Test: F9 load restores party management view correctly
- [ ] Test: Close party management, enter combat, verify party changes applied

### Phase 8: Developer Functions
- [ ] Add `openPartyManagement()` to window (dev mode)
- [ ] Update developer function console.log list
- [ ] Test: `openPartyManagement()` works from console

### Phase 9: Final Testing
- [ ] Open party management from exploration (I key)
- [ ] Make inventory changes, close, verify persisted
- [ ] Make equipment changes, close, verify persisted in combat
- [ ] Learn abilities, close, verify persisted
- [ ] Set classes, close, verify persisted
- [ ] Spend XP, close, verify persisted
- [ ] F5 quick save while in party management
- [ ] F9 quick load, verify state restored correctly
- [ ] Enter combat after making changes, verify applied
- [ ] Win combat, verify XP gains persist
- [ ] Return to party management, verify XP updated

---

## Expected File Changes

**New Files**: None

**Modified Files**:
1. `models/game/GameState.ts` (~10 lines added)
2. `models/game/GameStateSerialization.ts` (~30 lines added)
3. `components/game/GameView.tsx` (~100 lines added)
4. `components/inventory/PartyManagementView.tsx` (~20 lines added)
5. `components/firstperson/FirstPersonView.tsx` (~15 lines added)

**Total**: ~175 lines of new code

---

## Benefits

✅ **Seamless Integration**: Fits existing GameView orchestrator pattern
✅ **Minimal Changes**: PartyManagementView mostly unchanged
✅ **Persistent**: Changes saved via existing registries
✅ **Consistent UX**: Same fade transitions as combat
✅ **Flexible**: Can open from exploration (or later, from combat)
✅ **Save-Compatible**: Works with existing save/load system
✅ **Type-Safe**: TypeScript enforces view transitions
✅ **Backward Compatible**: Optional partyManagementState field

---

## Risks & Mitigations

⚠️ **Risk**: State sync complexity (registries vs partyState)
✅ **Mitigation**: Sync only on transitions, not every frame. Clear separation of concerns.

⚠️ **Risk**: PartyManagementView assumptions about being standalone
✅ **Mitigation**: Minimal changes - just add onClose callback. No internal logic changes.

⚠️ **Risk**: Save format changes breaking compatibility
✅ **Mitigation**: partyManagementState is optional field, backward compatible. Old saves will work.

⚠️ **Risk**: Forgetting to sync state (data loss)
✅ **Mitigation**: Sync happens automatically in transition handlers. Tested in checklist.

⚠️ **Risk**: Entering combat from party management causes issues
✅ **Mitigation**: Design decision - party management is "pause menu". Close before combat.

---

## Future Enhancements (Not in Scope)

- Open party management from combat (post-combat loot?)
- Visual close button in PartyManagementView UI
- Animation when transitioning to/from party management
- "Return to Game" button in party management title panel
- Help text overlay: "Press ESC to close"

---

## Success Criteria

✅ Press 'I' in exploration view to open party management
✅ ESC key closes party management and returns to exploration
✅ Inventory changes persist after closing
✅ Equipment changes persist and apply in combat
✅ Ability changes persist and apply in combat
✅ XP spending persists and updates party stats
✅ Class changes persist and affect abilities/stats
✅ F5 quick save works while in party management
✅ F9 quick load restores party management view if saved there
✅ Fade transitions work smoothly (500ms)
✅ No TypeScript errors or warnings
✅ No console errors during transitions

---

## Implementation Order

1. **Phase 1**: GameState updates (types)
2. **Phase 6**: PartyManagementView updates (add onClose prop)
3. **Phase 2**: GameView transition handlers (callbacks + sync)
4. **Phase 3**: GameView rendering (add view case)
5. **Phase 4**: Entry points (FirstPersonView 'I' key)
6. **Phase 7**: Serialization (save/load support)
7. **Phase 8**: Edge cases (load into party management)
8. **Phase 9**: Testing (full integration test)

**Estimated Time**: 2-4 hours (with testing)

---

## Next Steps

1. **Review this plan** - Does this match your vision?
2. **Decide on entry points** - Just 'I' key from exploration? Or also from combat?
3. **Approve plan** - Ready to implement?

---

**Status**: 📋 Awaiting approval
**Next Action**: Implement Phase 1 (GameState updates)

---

**End of Integration Plan**
