# CombatView Refactoring Plan

## Overview
Refactor CombatView to be a thin presentation layer by moving business logic into appropriate handlers and removing hardcoded layout coordinates.

## Current Problems

### 1. CombatView Contains Business Logic
**Location**: `CombatView.tsx` lines 810-866 (handleCanvasMouseDown)

CombatView is directly handling:
- Deployment zone selection logic
- Party member selection and deployment
- Unit manifest manipulation
- Combat state updates
- Phase handler coordination

**Problem**: CombatView should be a presentation layer that routes events, not contain game logic.

### 2. Hardcoded Layout Coordinates
**Locations**:
- `CombatView.tsx` lines 807-812 (party panel region in click handler)
- `CombatView.tsx` lines 978-983 (party panel region in hover handler)

```typescript
const partyPanelRegion = {
  x: 252,  // column 21 (21 * 12px)
  y: 120,  // row 10 (10 * 12px)
  width: 132,  // 11 tiles
  height: 96   // 8 tiles
};
```

**Problem**: Layout coordinates are duplicated and hardcoded. Changing panel layout requires updates in multiple places.

### 3. Tight Coupling to DeploymentPhaseHandler
**Location**: `CombatView.tsx` lines 810-866

CombatView reaches into DeploymentPhaseHandler internals:
- `handler.getSelectedZoneIndex()`
- `handler.clearSelectedZone()`
- Then orchestrates the deployment flow itself

**Problem**: Violates encapsulation. DeploymentPhaseHandler should own the entire deployment process.

## Design Goals

### 1. Separation of Concerns
- **CombatView**: Thin presentation layer - renders UI, routes input events
- **DeploymentPhaseHandler**: Owns all deployment business logic
- **CombatLayoutManager**: Single source of truth for panel positions
- **InfoPanelManager**: Delegates to content implementations (already done ✅)

### 2. Eliminate Code Duplication
- Panel region coordinates should be defined once in CombatLayoutManager
- Deployment logic should not be scattered across multiple files

### 3. Improve Testability
- Business logic in handlers can be unit tested
- CombatView becomes simpler and easier to test

### 4. Make Future Changes Easier
- Changing panel layouts only requires updating CombatLayoutManager
- Adding deployment rules/validation only requires updating DeploymentPhaseHandler

## Proposed Architecture

### Phase 1: Add Panel Region Getters to CombatLayoutManager

**Goal**: Eliminate hardcoded coordinates in CombatView

Add methods to CombatLayoutManager:
```typescript
/**
 * Get the region for the top info panel
 */
getTopInfoPanelRegion(): PanelRegion {
  return {
    x: 252,
    y: 0,
    width: 132,
    height: 108
  };
}

/**
 * Get the region for the bottom info panel
 */
getBottomInfoPanelRegion(): PanelRegion {
  return {
    x: 252,
    y: 120,
    width: 132,
    height: 96
  };
}

/**
 * Get the region for the turn order panel
 */
getTurnOrderPanelRegion(): PanelRegion {
  return {
    x: 0,
    y: 0,
    width: 240,
    height: 24
  };
}

/**
 * Get the region for the combat log panel
 */
getCombatLogPanelRegion(): PanelRegion {
  return {
    x: 0,
    y: 168,
    width: 240,
    height: 48
  };
}
```

**Changes Required**:
- [x] Add getter methods to CombatLayoutManager
- [x] Update CombatView to use `layoutRenderer.getBottomInfoPanelRegion()` instead of hardcoded values
- [x] Remove duplicated region definitions

### Phase 2: Move Deployment Logic to DeploymentPhaseHandler

**Goal**: DeploymentPhaseHandler should own the entire deployment process

Add method to DeploymentPhaseHandler:
```typescript
/**
 * Handle deployment of a party member to the selected zone
 * @param memberIndex - Index of the party member in the registry
 * @param combatState - Current combat state
 * @param encounter - Current encounter
 * @returns New combat state if deployment succeeded, null otherwise
 */
handlePartyMemberDeployment(
  memberIndex: number,
  combatState: CombatState,
  encounter: CombatEncounter
): CombatState | null {
  // 1. Check if a zone is selected
  const selectedZoneIndex = this.getSelectedZoneIndex();
  if (selectedZoneIndex === null) return null;

  // 2. Get the party member and deployment zone
  const partyMembers = PartyMemberRegistry.getAll();
  const selectedMember = partyMembers[memberIndex];
  const deploymentZone = encounter.playerDeploymentZones[selectedZoneIndex];

  if (!selectedMember || !deploymentZone) return null;

  // 3. Create unit and update manifest
  try {
    const unit = createUnitFromPartyMember(selectedMember);
    const newManifest = new CombatUnitManifest();

    // Copy existing units, excluding any unit at the deployment zone
    combatState.unitManifest.getAllUnits().forEach(placement => {
      if (placement.position.x !== deploymentZone.x ||
          placement.position.y !== deploymentZone.y) {
        newManifest.addUnit(placement.unit, placement.position);
      }
    });

    // Add new unit at the deployment zone
    newManifest.addUnit(unit, deploymentZone);

    // Clear the selected zone after deploying
    this.clearSelectedZone();

    // Return updated combat state
    return {
      ...combatState,
      unitManifest: newManifest
    };
  } catch (error) {
    console.error('Failed to deploy unit:', error);
    return null;
  }
}
```

**Changes Required**:
- [x] Add `handlePartyMemberDeployment()` method to DeploymentPhaseHandler
- [x] Move unit creation and manifest update logic from CombatView
- [x] Update CombatView to call this method instead of implementing the logic inline
- [x] Remove deployment orchestration code from CombatView

### Phase 3: Simplify CombatView Event Handlers

**Goal**: CombatView should only route events, not contain business logic

**Before** (lines 810-866):
```typescript
if (combatState.phase === 'deployment' && phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
  const handler = phaseHandlerRef.current as DeploymentPhaseHandler;
  const selectedZone = handler.getSelectedZoneIndex();
  if (selectedZone !== null && partyUnits.length > 0) {
    const partyPanelRegion = { /* hardcoded */ };
    const partyMemberIndex = currentUnitPanelManager.handleClick(/* ... */);
    if (partyMemberIndex !== null) {
      const selectedMember = PartyMemberRegistry.getAll()[partyMemberIndex];
      const deploymentZone = encounter.playerDeploymentZones[selectedZone];
      // ... 40+ lines of deployment logic ...
    }
  }
}
```

**After**:
```typescript
if (combatState.phase === 'deployment' && phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
  const handler = phaseHandlerRef.current as DeploymentPhaseHandler;
  const partyPanelRegion = layoutRenderer.getBottomInfoPanelRegion();
  const partyMemberIndex = currentUnitPanelManager.handleClick(canvasX, canvasY, partyPanelRegion);

  if (partyMemberIndex !== null) {
    const newState = handler.handlePartyMemberDeployment(partyMemberIndex, combatState, encounter);
    if (newState) {
      setCombatState(newState);
    }
  }
}
```

**Changes Required**:
- [x] Replace inline deployment logic with handler call
- [x] Replace hardcoded regions with layout manager calls
- [x] Update hover handler similarly

## Implementation Tasks

### Phase 1: Layout Manager Getters ✅
- [ ] Add `getTopInfoPanelRegion()` to CombatLayoutManager
- [ ] Add `getBottomInfoPanelRegion()` to CombatLayoutManager
- [ ] Add `getTurnOrderPanelRegion()` to CombatLayoutManager (if needed)
- [ ] Add `getCombatLogPanelRegion()` to CombatLayoutManager (if needed)
- [ ] Update CombatView click handler to use `getBottomInfoPanelRegion()`
- [ ] Update CombatView hover handler to use `getBottomInfoPanelRegion()`
- [ ] Remove hardcoded region definitions from CombatView

### Phase 2: Deployment Logic Refactor
- [ ] Add `handlePartyMemberDeployment()` method to DeploymentPhaseHandler
- [ ] Move unit creation logic from CombatView
- [ ] Move manifest update logic from CombatView
- [ ] Move zone clearing logic from CombatView
- [ ] Add error handling in DeploymentPhaseHandler
- [ ] Test deployment handler independently

### Phase 3: Simplify CombatView
- [ ] Update handleCanvasMouseDown to call handler method
- [ ] Remove inline deployment orchestration code
- [ ] Verify deployment still works end-to-end
- [ ] Update handleCanvasMouseMove hover handler
- [ ] Remove any remaining hardcoded coordinates

### Phase 4: Testing & Verification
- [ ] Test party member deployment in deployment phase
- [ ] Test party member hover highlighting
- [ ] Test that panel positions are correct
- [ ] Verify no TypeScript errors
- [ ] Build succeeds

## Benefits After Refactoring

### Code Quality
- ✅ CombatView reduced by ~50+ lines
- ✅ Clear separation of concerns
- ✅ Single source of truth for layout coordinates
- ✅ Business logic properly encapsulated

### Maintainability
- ✅ Easy to change panel layouts (one place to update)
- ✅ Easy to modify deployment rules (all in handler)
- ✅ Easy to test deployment logic (isolated in handler)
- ✅ Less duplication and coupling

### Future Extensibility
- ✅ Easy to add deployment validation
- ✅ Easy to add multi-step deployment flows
- ✅ Easy to add animations/feedback
- ✅ Easy to support different layouts

## Files to Modify

1. **CombatLayoutManager.ts**
   - Add panel region getter methods
   - No changes to existing rendering logic

2. **DeploymentPhaseHandler.ts**
   - Add `handlePartyMemberDeployment()` method
   - Keep existing zone selection methods

3. **CombatView.tsx**
   - Replace hardcoded coordinates with layout manager calls
   - Replace inline deployment logic with handler call
   - Simplify event handlers to be thin routing layers

## Migration Strategy

1. Implement phases sequentially (1 → 2 → 3 → 4)
2. Build and test after each phase
3. Ensure no behavioral changes (only structural refactoring)
4. Keep all existing functionality working throughout

## Success Criteria

- [ ] CombatView no longer contains hardcoded panel coordinates
- [ ] CombatView no longer contains deployment business logic
- [ ] DeploymentPhaseHandler fully owns the deployment process
- [ ] All existing functionality works identically
- [ ] TypeScript build succeeds with no errors
- [ ] Code is easier to understand and maintain
