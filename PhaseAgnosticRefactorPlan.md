# Phase-Agnostic CombatView Refactoring Plan

## Overview
Refactor CombatView to be completely agnostic to specific combat phases, making it easy to add new phases (player turn, enemy turn, victory, defeat) without modifying CombatView code.

## Current Problems

### 1. Hard-Coded Phase String Checks (9+ occurrences)
**Locations in CombatView.tsx**:
- Line 55: `phase: 'deployment'` (initialization)
- Line 247: `if (combatState.phase === 'deployment')`
- Line 592: `combatState.phase !== 'deployment'`
- Line 608: `isDeploymentPhase: combatState.phase === 'deployment'`
- Line 800: `if (combatState.phase === 'deployment' && ...)`
- Line 843: `if (combatState.phase === 'deployment' && ...)`
- Line 861: `if (combatState.phase === 'deployment' && ...)`
- Line 907: `if (combatState.phase === 'deployment' && ...)`
- Line 969: `if (combatState.phase === 'deployment' && ...)`
- Line 1242: `cursor: combatState.phase === 'deployment' ? 'pointer' : 'default'`

**Problem**: Every new phase requires adding more string checks throughout CombatView.

### 2. Hard-Coded instanceof Checks (5+ occurrences)
**Locations**:
- Line 800: `phaseHandlerRef.current instanceof DeploymentPhaseHandler`
- Line 843: `phaseHandlerRef.current instanceof DeploymentPhaseHandler`
- Line 861: `phaseHandlerRef.current instanceof DeploymentPhaseHandler`
- Line 907: `phaseHandlerRef.current instanceof DeploymentPhaseHandler`
- Line 969: `phaseHandlerRef.current instanceof DeploymentPhaseHandler`

**Problem**: CombatView must import and know about every phase handler type.

### 3. Phase-Specific Method Calls Scattered Throughout
**Locations**:
- Lines 817, 869: `handler.handlePartyMemberDeployment()`
- Line 825: `handler.handleButtonMouseDown()`
- Line 845: `handler.handleButtonMouseUp()`
- Line 866: `handler.handleCharacterClick()`
- Line 908: `handler.handleMouseMove()`
- Line 909: `handler.handleButtonMouseMove()`

**Problem**: CombatView needs to know about deployment-specific APIs.

### 4. Phase-Specific UI Configuration
**Locations**:
- Lines 247-250: Top panel renderer setup based on phase
- Lines 592-608: Panel content based on phase
- Line 1242: Cursor style based on phase

**Problem**: UI configuration logic is embedded in CombatView render loop.

### 5. Phase-Specific Event Routing Logic
**Locations**:
- Lines 800-826: Party panel click handling only for deployment
- Lines 860-874: Character dialog click handling only for deployment
- Lines 907-929: Mouse move handling only for deployment
- Lines 969-1003: Map tile click handling only for deployment

**Problem**: Event handlers contain phase-specific branching logic.

## Design Goals

### 1. Zero Phase Knowledge in CombatView
- CombatView should not import specific phase handler classes
- CombatView should not use phase string literals
- CombatView should not contain phase-specific logic

### 2. Phase Handlers Own Their Behavior
- Each phase defines its own event handling
- Each phase configures its own UI
- Each phase manages its own state transitions

### 3. Consistent Event Handling Pattern
- All phases use the same event handling interface
- CombatView becomes a pure event router
- No special-case logic for specific phases

### 4. Easy to Add New Phases
- Adding a new phase = creating a new PhaseBase subclass
- No changes required to CombatView
- No changes required to other phases

## Proposed Architecture

### Core Concept: Event Result Pattern

Phases return standardized results from event handlers:

```typescript
interface PhaseEventResult {
  handled: boolean;           // Was the event consumed?
  newState?: CombatState;     // New combat state (if changed)
  transitionTo?: string;      // Phase transition request
  preventDefault?: boolean;   // Stop other handlers?
}
```

### Phase UI Configuration

Each phase provides UI configuration via methods:

```typescript
abstract class PhaseBase {
  // UI Configuration
  abstract getTopPanelContent(): TopPanelRenderer;
  abstract getInfoPanelContent(context: InfoPanelContext): PanelContent | null;
  abstract getCursorStyle(): string;

  // Event Handling (return PhaseEventResult)
  handleCanvasMouseDown?(x: number, y: number, state: CombatState, encounter: CombatEncounter): PhaseEventResult;
  handleCanvasMouseUp?(x: number, y: number, state: CombatState, encounter: CombatEncounter): PhaseEventResult;
  handleCanvasMouseMove?(x: number, y: number, state: CombatState, encounter: CombatEncounter): PhaseEventResult;
  handleCanvasClick?(x: number, y: number, state: CombatState, encounter: CombatEncounter): PhaseEventResult;
  handleMapTileClick?(tileX: number, tileY: number, state: CombatState, encounter: CombatEncounter): PhaseEventResult;
}
```

### CombatView Becomes Event Router

```typescript
// Before (deployment-specific):
if (combatState.phase === 'deployment' && phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
  const handler = phaseHandlerRef.current as DeploymentPhaseHandler;
  const partyMemberIndex = currentUnitPanelManager.handleClick(...);
  if (partyMemberIndex !== null) {
    const newState = handler.handlePartyMemberDeployment(...);
    if (newState) setCombatState(newState);
  }
}

// After (phase-agnostic):
const result = phaseHandlerRef.current.handleCanvasMouseDown?.(
  canvasX,
  canvasY,
  combatState,
  encounter
);
if (result?.newState) {
  setCombatState(result.newState);
}
if (result?.handled) {
  return; // Event consumed
}
```

## Implementation Plan

### Phase 1: Define Event Handling Infrastructure ✅

**Goal**: Create standardized interfaces for phase event handling and UI configuration

#### 1.1: Create PhaseEventResult Interface
**File**: `react-app/src/models/combat/PhaseEventResult.ts`
```typescript
export interface PhaseEventResult {
  handled: boolean;
  newState?: CombatState;
  transitionTo?: string;
  preventDefault?: boolean;
}
```

#### 1.2: Create InfoPanelContext Interface
**File**: `react-app/src/models/combat/managers/InfoPanelContext.ts`
```typescript
export interface InfoPanelContext {
  position: 'top' | 'bottom';
  combatState: CombatState;
  encounter: CombatEncounter;
  partyUnits: CombatUnit[];
  currentUnit: CombatUnit | null;
  targetUnit: CombatUnit | null;
  spriteImages: Map<string, HTMLImageElement>;
  spriteSize: number;
  hoveredPartyMemberIndex: number | null;
}
```

#### 1.3: Add UI Configuration Methods to PhaseBase
**File**: `react-app/src/models/combat/PhaseBase.ts`

Add abstract methods:
```typescript
abstract getTopPanelRenderer(): TopPanelRenderer;
abstract getBottomInfoPanelContent(context: InfoPanelContext): PanelContent | null;
abstract getTopInfoPanelContent(context: InfoPanelContext): PanelContent | null;
abstract getCursorStyle(): string;
```

#### 1.4: Update Event Handler Signatures in PhaseBase
**File**: `react-app/src/models/combat/PhaseBase.ts`

Update optional event methods to return PhaseEventResult:
```typescript
handleCanvasMouseDown?(
  canvasX: number,
  canvasY: number,
  state: CombatState,
  encounter: CombatEncounter
): PhaseEventResult;

handleCanvasMouseUp?(
  canvasX: number,
  canvasY: number,
  state: CombatState,
  encounter: CombatEncounter
): PhaseEventResult;

handleCanvasMouseMove?(
  canvasX: number,
  canvasY: number,
  state: CombatState,
  encounter: CombatEncounter
): PhaseEventResult;

handleCanvasClick?(
  canvasX: number,
  canvasY: number,
  state: CombatState,
  encounter: CombatEncounter
): PhaseEventResult;

handleMapTileClick?(
  tileX: number,
  tileY: number,
  state: CombatState,
  encounter: CombatEncounter
): PhaseEventResult;
```

**Tasks**:
- [ ] Create PhaseEventResult.ts
- [ ] Create InfoPanelContext.ts
- [ ] Add abstract UI configuration methods to PhaseBase
- [ ] Update event handler signatures in PhaseBase
- [ ] Remove old optional methods that are replaced

---

### Phase 2: Implement Phase Configuration in DeploymentPhaseHandler ✅

**Goal**: Make DeploymentPhaseHandler provide its own UI configuration and event handling

#### 2.1: Implement UI Configuration Methods
**File**: `react-app/src/models/combat/DeploymentPhaseHandler.ts`

```typescript
getTopPanelRenderer(): TopPanelRenderer {
  return new DeploymentHeaderRenderer('Deploy Units');
}

getBottomInfoPanelContent(context: InfoPanelContext): PanelContent | null {
  if (context.partyUnits.length > 0) {
    return new PartyMembersContent(
      {
        title: 'Party Members',
        titleColor: '#ffa500',
        padding: 1,
        lineSpacing: 8,
      },
      context.partyUnits,
      context.spriteImages,
      context.spriteSize,
      context.hoveredPartyMemberIndex
    );
  }
  return null;
}

getTopInfoPanelContent(context: InfoPanelContext): PanelContent | null {
  if (context.targetUnit) {
    return new UnitInfoContent(
      {
        title: 'Unit Info',
        titleColor: '#ff6b6b',
        padding: 1,
        lineSpacing: 8,
      },
      context.targetUnit
    );
  }
  return new EmptyContent({
    title: 'Unit Info',
    titleColor: '#ff6b6b',
    padding: 1,
    lineSpacing: 8,
  });
}

getCursorStyle(): string {
  return 'pointer';
}
```

#### 2.2: Implement Event Handlers with PhaseEventResult
**File**: `react-app/src/models/combat/DeploymentPhaseHandler.ts`

```typescript
handleCanvasMouseDown(
  canvasX: number,
  canvasY: number,
  state: CombatState,
  encounter: CombatEncounter
): PhaseEventResult {
  // Check party panel clicks
  const partyPanelRegion = { x: 252, y: 120, width: 132, height: 96 };
  const partyUnits = PartyMemberRegistry.getAll().map(...);

  if (this.isPointInRegion(canvasX, canvasY, partyPanelRegion) && partyUnits.length > 0) {
    const relativeX = canvasX - partyPanelRegion.x;
    const relativeY = canvasY - partyPanelRegion.y;
    const partyMemberIndex = this.getPartyMemberAtPosition(relativeX, relativeY, partyUnits.length);

    if (partyMemberIndex !== null) {
      const newState = this.handlePartyMemberDeployment(partyMemberIndex, state, encounter);
      return {
        handled: true,
        newState: newState || undefined,
        preventDefault: true
      };
    }
  }

  // Check button clicks
  if (this.handleButtonMouseDown?.(canvasX, canvasY)) {
    return { handled: true, preventDefault: false };
  }

  return { handled: false };
}

handleCanvasClick(
  canvasX: number,
  canvasY: number,
  state: CombatState,
  encounter: CombatEncounter
): PhaseEventResult {
  // Check character dialog clicks
  const partyMembers = PartyMemberRegistry.getAll();
  const characterIndex = this.handleCharacterClick?.(canvasX, canvasY, partyMembers.length);

  if (characterIndex !== null) {
    const newState = this.handlePartyMemberDeployment(characterIndex, state, encounter);
    return {
      handled: true,
      newState: newState || undefined,
      preventDefault: true
    };
  }

  return { handled: false };
}

handleMapTileClick(
  tileX: number,
  tileY: number,
  state: CombatState,
  encounter: CombatEncounter
): PhaseEventResult {
  const zoneWasClicked = this.handleTileClick(tileX, tileY, encounter);

  return {
    handled: zoneWasClicked,
    preventDefault: false
  };
}

handleCanvasMouseMove(
  canvasX: number,
  canvasY: number,
  state: CombatState,
  encounter: CombatEncounter
): PhaseEventResult {
  const partySize = PartyMemberRegistry.getAll().length;
  this.handleMouseMove?.(canvasX, canvasY, partySize);
  this.handleButtonMouseMove?.(canvasX, canvasY);

  return { handled: true, preventDefault: false };
}
```

#### 2.3: Add Helper Methods to DeploymentPhaseHandler
```typescript
private isPointInRegion(x: number, y: number, region: { x: number, y: number, width: number, height: number }): boolean {
  return x >= region.x && x < region.x + region.width &&
         y >= region.y && y < region.y + region.height;
}

private getPartyMemberAtPosition(relativeX: number, relativeY: number, partyCount: number): number | null {
  // Same logic as PartyMembersContent.getPartyMemberAtPosition
  // But simplified for deployment handler
  const cellWidth = 132 / 2;
  const cellHeight = 12 + 8 + 6;

  // Calculate which cell was clicked
  const col = Math.floor(relativeX / cellWidth);
  const row = Math.floor(relativeY / cellHeight);
  const index = row * 2 + col;

  if (index >= 0 && index < partyCount && index < 4) {
    return index;
  }

  return null;
}
```

**Tasks**:
- [ ] Add UI configuration methods to DeploymentPhaseHandler
- [ ] Implement handleCanvasMouseDown with PhaseEventResult
- [ ] Implement handleCanvasMouseUp with PhaseEventResult
- [ ] Implement handleCanvasClick with PhaseEventResult
- [ ] Implement handleMapTileClick with PhaseEventResult
- [ ] Implement handleCanvasMouseMove with PhaseEventResult
- [ ] Add helper methods for position detection
- [ ] Import necessary types (PartyMembersContent, UnitInfoContent, etc.)

---

### Phase 3: Refactor CombatView Event Handlers ✅

**Goal**: Replace phase-specific event handling with phase-agnostic event routing

#### 3.1: Refactor handleCanvasMouseDown
**File**: `react-app/src/components/combat/CombatView.tsx` (lines 757-827)

**Before**:
```typescript
const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
  // ... coordinate conversion ...

  // Many lines of phase-specific logic checking instanceof, etc.

  if (combatState.phase === 'deployment' && phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
    const handler = phaseHandlerRef.current as DeploymentPhaseHandler;
    // ... deployment-specific logic ...
  }
}, [/* many dependencies */]);
```

**After**:
```typescript
const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = displayCanvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_WIDTH / rect.width;
  const scaleY = CANVAS_HEIGHT / rect.height;
  const canvasX = (event.clientX - rect.left) * scaleX;
  const canvasY = (event.clientY - rect.top) * scaleY;

  // Check top panel clicks first (phase-agnostic)
  if (layoutRenderer.handleTopPanelClick(canvasX, canvasY, topPanelManager)) {
    renderFrame();
    return;
  }

  // Check combat log scroll buttons (phase-agnostic)
  const combatLogScrollDirection = layoutRenderer.handleCombatLogClick(canvasX, canvasY, combatLogManager);
  if (combatLogScrollDirection === 'up') {
    scrollArrowPressedRef.current = 'logUp';
    startContinuousScroll('logUp');
    return;
  }
  if (combatLogScrollDirection === 'down') {
    scrollArrowPressedRef.current = 'logDown';
    startContinuousScroll('logDown');
    return;
  }

  // Check map scroll buttons (phase-agnostic)
  const mapScrollDirection = layoutRenderer.handleMapScrollClick(canvasX, canvasY);
  if (mapScrollDirection) {
    scrollArrowPressedRef.current = mapScrollDirection;
    startContinuousScroll(mapScrollDirection);
    return;
  }

  // Route to phase handler
  const result = phaseHandlerRef.current.handleCanvasMouseDown?.(
    canvasX,
    canvasY,
    combatState,
    encounter
  );

  if (result?.newState) {
    setCombatState(result.newState);
  }

  if (result?.handled && result.preventDefault) {
    return;
  }
}, [combatState, encounter, layoutRenderer, startContinuousScroll, topPanelManager, renderFrame]);
```

#### 3.2: Refactor handleCanvasMouseUp
**File**: `react-app/src/components/combat/CombatView.tsx` (lines 829-847)

**Before**:
```typescript
const handleCanvasMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
  // ... coordinate conversion ...

  stopContinuousScroll();

  if (combatState.phase === 'deployment' && phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
    const handler = phaseHandlerRef.current as DeploymentPhaseHandler;
    handler.handleButtonMouseUp(canvasX, canvasY);
  }
}, [combatState.phase, stopContinuousScroll]);
```

**After**:
```typescript
const handleCanvasMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = displayCanvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_WIDTH / rect.width;
  const scaleY = CANVAS_HEIGHT / rect.height;
  const canvasX = (event.clientX - rect.left) * scaleX;
  const canvasY = (event.clientY - rect.top) * scaleY;

  // Stop continuous scrolling
  stopContinuousScroll();

  // Route to phase handler
  const result = phaseHandlerRef.current.handleCanvasMouseUp?.(
    canvasX,
    canvasY,
    combatState,
    encounter
  );

  if (result?.newState) {
    setCombatState(result.newState);
  }
}, [combatState, encounter, stopContinuousScroll]);
```

#### 3.3: Refactor handleCanvasClick
**File**: `react-app/src/components/combat/CombatView.tsx` (lines 849-892)

**Before**:
```typescript
const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
  // Block input during cinematics
  if (inputHandler.isInputBlocked(cinematicManagerRef.current)) return;

  const coords = inputHandler.getCanvasCoordinates(event);
  if (!coords) return;

  const { x: canvasX, y: canvasY } = coords;

  // Check for character dialog clicks in deployment phase
  if (combatState.phase === 'deployment' && phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
    const handler = phaseHandlerRef.current as DeploymentPhaseHandler;
    // ... deployment-specific logic ...
  }

  // Try to handle as a map click
  const wasMapClick = mapRenderer.handleMapClick(...);
  // ...
}, [/* many dependencies */]);
```

**After**:
```typescript
const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
  // Block input during cinematics
  if (inputHandler.isInputBlocked(cinematicManagerRef.current)) return;

  const coords = inputHandler.getCanvasCoordinates(event);
  if (!coords) return;

  const { x: canvasX, y: canvasY } = coords;

  // Route to phase handler first
  const result = phaseHandlerRef.current.handleCanvasClick?.(
    canvasX,
    canvasY,
    combatState,
    encounter
  );

  if (result?.newState) {
    setCombatState(result.newState);
  }

  if (result?.handled && result.preventDefault) {
    return;
  }

  // Try to handle as a map click (will notify registered handlers)
  const wasMapClick = mapRenderer.handleMapClick(
    canvasX,
    canvasY,
    mapScrollX,
    mapScrollY,
    combatState.map.width,
    combatState.map.height
  );
}, [combatState, encounter, inputHandler, mapRenderer, mapScrollX, mapScrollY]);
```

#### 3.4: Refactor handleCanvasMouseMove
**File**: `react-app/src/components/combat/CombatView.tsx` (lines 894-959)

**Before**:
```typescript
const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
  // Block input during cinematics
  if (inputHandler.isInputBlocked(cinematicManagerRef.current)) return;

  const coords = inputHandler.getCanvasCoordinates(event);
  if (!coords) return;

  const { x: canvasX, y: canvasY } = coords;

  // Pass mouse move to phase handler (if deployment phase)
  if (combatState.phase === 'deployment' && phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
    const handler = phaseHandlerRef.current as DeploymentPhaseHandler;
    // ... many lines of deployment-specific logic ...
  }
}, [/* many dependencies */]);
```

**After**:
```typescript
const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
  // Block input during cinematics
  if (inputHandler.isInputBlocked(cinematicManagerRef.current)) return;

  const coords = inputHandler.getCanvasCoordinates(event);
  if (!coords) return;

  const { x: canvasX, y: canvasY } = coords;

  // Route to phase handler
  const result = phaseHandlerRef.current.handleCanvasMouseMove?.(
    canvasX,
    canvasY,
    combatState,
    encounter
  );

  if (result?.newState) {
    setCombatState(result.newState);
    renderFrame();
  }

  // Update hovered cell for map tile detection using CombatMapRenderer
  const tileCoords = mapRenderer.canvasToTileCoordinates(
    canvasX,
    canvasY,
    mapScrollX,
    mapScrollY,
    combatState.map.width,
    combatState.map.height
  );

  if (tileCoords) {
    uiStateManager.setHoveredCell({ x: tileCoords.tileX, y: tileCoords.tileY });
  } else {
    uiStateManager.setHoveredCell(null);
  }
}, [combatState, encounter, inputHandler, mapRenderer, mapScrollX, mapScrollY, uiStateManager, renderFrame]);
```

#### 3.5: Refactor Map Click Handler Registration
**File**: `react-app/src/components/combat/CombatView.tsx` (lines 961-997)

**Before**:
```typescript
useEffect(() => {
  const unsubscribe = mapRenderer.onMapClick((tileX, tileY) => {
    // Check if a unit is at the clicked position
    const unitAtPosition = combatState.unitManifest.getAllUnits().find(...);

    if (unitAtPosition) {
      targetUnitRef.current = unitAtPosition.unit;
      renderFrame();
    }

    // Handle deployment zone clicks in deployment phase
    if (combatState.phase === 'deployment' && phaseHandlerRef.current instanceof DeploymentPhaseHandler) {
      const handler = phaseHandlerRef.current as DeploymentPhaseHandler;
      // ... deployment-specific logic ...
    }
  });

  return unsubscribe;
}, [/* many dependencies */]);
```

**After**:
```typescript
useEffect(() => {
  const unsubscribe = mapRenderer.onMapClick((tileX, tileY) => {
    // Check if a unit is at the clicked position (phase-agnostic)
    const unitAtPosition = combatState.unitManifest.getAllUnits().find(
      placement => placement.position.x === tileX && placement.position.y === tileY
    );

    if (unitAtPosition) {
      targetUnitRef.current = unitAtPosition.unit;
      renderFrame();
    }

    // Route to phase handler
    const result = phaseHandlerRef.current.handleMapTileClick?.(
      tileX,
      tileY,
      combatState,
      encounter
    );

    if (result?.newState) {
      setCombatState(result.newState);
    }
  });

  return unsubscribe;
}, [mapRenderer, combatState, encounter, renderFrame]);
```

**Tasks**:
- [ ] Refactor handleCanvasMouseDown to use phase handler
- [ ] Refactor handleCanvasMouseUp to use phase handler
- [ ] Refactor handleCanvasClick to use phase handler
- [ ] Refactor handleCanvasMouseMove to use phase handler
- [ ] Refactor map click handler registration to use phase handler
- [ ] Remove all `instanceof DeploymentPhaseHandler` checks
- [ ] Remove all `combatState.phase === 'deployment'` checks from event handlers
- [ ] Simplify dependency arrays (remove phase-specific dependencies)

---

### Phase 4: Refactor CombatView UI Configuration ✅

**Goal**: Replace phase-specific UI logic with phase-provided configuration

#### 4.1: Refactor Top Panel Setup
**File**: `react-app/src/components/combat/CombatView.tsx` (lines 247-260)

**Before**:
```typescript
useEffect(() => {
  if (combatState.phase === 'deployment') {
    // Show deployment header during deployment phase
    const deploymentRenderer = new DeploymentHeaderRenderer('Deploy Units');
    topPanelManager.setRenderer(deploymentRenderer);
  } else {
    // Show turn order during combat phase
    const turnOrderRenderer = new TurnOrderRenderer(partyUnits, (clickedUnit) => {
      targetUnitRef.current = clickedUnit;
    });
    topPanelManager.setRenderer(turnOrderRenderer);
  }
}, [topPanelManager, combatState.phase, partyUnits]);
```

**After**:
```typescript
useEffect(() => {
  // Let phase handler configure the top panel
  const renderer = phaseHandlerRef.current.getTopPanelRenderer();
  topPanelManager.setRenderer(renderer);
}, [topPanelManager, phaseHandlerRef.current]);
```

#### 4.2: Refactor Info Panel Content in renderLayout
**File**: `react-app/src/models/combat/layouts/CombatLayoutManager.ts` (lines 383-432)

Move panel content logic to CombatView where phase context is available.

**In CombatView.tsx** (around line 606):

**Before**:
```typescript
layoutRenderer.renderLayout({
  ctx,
  canvasWidth: CANVAS_WIDTH,
  canvasHeight: CANVAS_HEIGHT,
  spriteSize: SPRITE_SIZE,
  fontId: unitInfoAtlasFont,
  fontAtlasImage: layoutFontAtlas,
  topPanelFontAtlasImage: topPanelFontAtlas,
  spriteImages: spriteImagesRef.current,
  currentUnit: testCurrentUnit,
  targetUnit: targetUnitRef.current,
  partyUnits: partyUnits,
  isDeploymentPhase: combatState.phase === 'deployment',
  hoveredPartyMemberIndex: hoveredPartyMemberRef.current,
  combatLogManager,
  currentUnitPanelManager,
  targetUnitPanelManager,
  topPanelManager,
});
```

**After**:
```typescript
// Get panel content from phase handler
const bottomPanelContext: InfoPanelContext = {
  position: 'bottom',
  combatState,
  encounter,
  partyUnits,
  currentUnit: testCurrentUnit,
  targetUnit: targetUnitRef.current,
  spriteImages: spriteImagesRef.current,
  spriteSize: SPRITE_SIZE,
  hoveredPartyMemberIndex: hoveredPartyMemberRef.current
};

const topPanelContext: InfoPanelContext = {
  position: 'top',
  combatState,
  encounter,
  partyUnits,
  currentUnit: testCurrentUnit,
  targetUnit: targetUnitRef.current,
  spriteImages: spriteImagesRef.current,
  spriteSize: SPRITE_SIZE,
  hoveredPartyMemberIndex: hoveredPartyMemberRef.current
};

const bottomPanelContent = phaseHandlerRef.current.getBottomInfoPanelContent(bottomPanelContext);
const topPanelContent = phaseHandlerRef.current.getTopInfoPanelContent(topPanelContext);

// Set content on panel managers
if (bottomPanelContent) {
  currentUnitPanelManager.setContent(bottomPanelContent);
}
if (topPanelContent) {
  targetUnitPanelManager.setContent(topPanelContent);
}

// Render layout (simplified context)
layoutRenderer.renderLayout({
  ctx,
  canvasWidth: CANVAS_WIDTH,
  canvasHeight: CANVAS_HEIGHT,
  spriteSize: SPRITE_SIZE,
  fontId: unitInfoAtlasFont,
  fontAtlasImage: layoutFontAtlas,
  topPanelFontAtlasImage: topPanelFontAtlas,
  spriteImages: spriteImagesRef.current,
  combatLogManager,
  currentUnitPanelManager,
  targetUnitPanelManager,
  topPanelManager,
});
```

**In CombatLayoutManager.ts** - Simplify renderBottomInfoPanel and renderTopInfoPanel:

```typescript
private renderBottomInfoPanel(
  context: LayoutRenderContext,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const { ctx, fontId, fontAtlasImage, currentUnitPanelManager } = context;
  if (!currentUnitPanelManager) return;

  // Content already set by CombatView, just render
  currentUnitPanelManager.render(
    ctx,
    { x, y, width, height },
    fontId,
    fontAtlasImage
  );
}

private renderTopInfoPanel(
  context: LayoutRenderContext,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const { ctx, fontId, fontAtlasImage, targetUnitPanelManager } = context;
  if (!targetUnitPanelManager) return;

  // Content already set by CombatView, just render
  targetUnitPanelManager.render(
    ctx,
    { x, y, width, height },
    fontId,
    fontAtlasImage
  );
}
```

#### 4.3: Refactor Cursor Style
**File**: `react-app/src/components/combat/CombatView.tsx` (line 1242)

**Before**:
```typescript
<canvas
  ref={displayCanvasRef}
  onClick={handleCanvasClick}
  onMouseDown={handleCanvasMouseDown}
  onMouseUp={handleCanvasMouseUp}
  onMouseMove={handleCanvasMouseMove}
  style={{
    ...canvasDisplayStyle,
    imageRendering: 'pixelated',
    objectFit: 'contain',
    cursor: combatState.phase === 'deployment' ? 'pointer' : 'default',
  } as React.CSSProperties}
/>
```

**After**:
```typescript
<canvas
  ref={displayCanvasRef}
  onClick={handleCanvasClick}
  onMouseDown={handleCanvasMouseDown}
  onMouseUp={handleCanvasMouseUp}
  onMouseMove={handleCanvasMouseMove}
  style={{
    ...canvasDisplayStyle,
    imageRendering: 'pixelated',
    objectFit: 'contain',
    cursor: phaseHandlerRef.current.getCursorStyle(),
  } as React.CSSProperties}
/>
```

**Tasks**:
- [ ] Refactor top panel setup to use phase handler
- [ ] Move info panel content logic from CombatLayoutManager to CombatView
- [ ] Create InfoPanelContext and pass to phase handler
- [ ] Simplify CombatLayoutManager panel rendering methods
- [ ] Refactor cursor style to use phase handler
- [ ] Remove `isDeploymentPhase` from LayoutRenderContext
- [ ] Remove phase-specific fields from LayoutRenderContext

---

### Phase 5: Clean Up and Remove Phase-Specific Code ✅

**Goal**: Remove all deployment-specific code from CombatView and related files

#### 5.1: Remove Unused Imports
**File**: `react-app/src/components/combat/CombatView.tsx`

Remove:
- `DeploymentPhaseHandler` import (line 6)
- `DeploymentHeaderRenderer` import (line 33)
- `createUnitFromPartyMember` import (if still there)

#### 5.2: Clean Up LayoutRenderContext
**File**: `react-app/src/models/combat/layouts/CombatLayoutRenderer.ts`

Remove fields:
```typescript
export interface LayoutRenderContext {
  // ... keep existing fields ...

  // REMOVE THESE:
  // currentUnit: CombatUnit | null;
  // targetUnit: CombatUnit | null;
  // partyUnits?: CombatUnit[];
  // isDeploymentPhase?: boolean;
  // hoveredPartyMemberIndex?: number | null;
}
```

#### 5.3: Remove Phase String Literals
Search for any remaining `'deployment'` strings and replace with phase-agnostic code.

#### 5.4: Verify No instanceof Checks Remain
Search for `instanceof DeploymentPhaseHandler` and ensure all are removed.

**Tasks**:
- [ ] Remove DeploymentPhaseHandler import from CombatView
- [ ] Remove DeploymentHeaderRenderer import from CombatView
- [ ] Remove phase-specific fields from LayoutRenderContext
- [ ] Search and remove any remaining `'deployment'` string literals
- [ ] Search and remove any remaining `instanceof DeploymentPhaseHandler` checks
- [ ] Clean up unused variables and dependencies

---

### Phase 6: Testing and Verification ✅

**Goal**: Ensure refactored code works identically to original

#### 6.1: Build Verification
- [ ] TypeScript build succeeds with no errors
- [ ] No unused imports or variables
- [ ] No type errors in phase handlers

#### 6.2: Functional Testing
- [ ] Test deployment phase works identically:
  - [ ] Clicking deployment zones selects them
  - [ ] Clicking party members deploys them
  - [ ] Clicking character dialog deploys units
  - [ ] Hover highlighting works on party panel
  - [ ] Start Combat button appears and works
- [ ] Test that other UI elements still work:
  - [ ] Combat log scrolling
  - [ ] Map scrolling
  - [ ] Turn order panel (if visible)

#### 6.3: Code Quality Verification
- [ ] CombatView has no phase-specific logic
- [ ] CombatView has no instanceof checks
- [ ] CombatView has no phase string literals
- [ ] Event handlers are simple routing functions
- [ ] All phase behavior is in DeploymentPhaseHandler

---

## Benefits After Refactoring

### Code Quality
- ✅ CombatView reduced by ~100+ lines
- ✅ Zero phase-specific code in CombatView
- ✅ Clear separation of concerns
- ✅ Phases are self-contained and independent

### Maintainability
- ✅ Easy to understand event flow
- ✅ Changes to phase behavior don't affect CombatView
- ✅ Easy to debug phase-specific issues
- ✅ Consistent patterns across all phases

### Extensibility
- ✅ Adding new phase = create PhaseBase subclass
- ✅ No changes to CombatView required
- ✅ No changes to other phases required
- ✅ Phase transitions handled cleanly via PhaseEventResult

### Example: Adding a New Phase

```typescript
class PlayerTurnPhase extends PhaseBase {
  getTopPanelRenderer(): TopPanelRenderer {
    return new TurnOrderRenderer(/* ... */);
  }

  getBottomInfoPanelContent(context: InfoPanelContext): PanelContent | null {
    return context.currentUnit
      ? new UnitInfoContent(/* ... */, context.currentUnit)
      : null;
  }

  getTopInfoPanelContent(context: InfoPanelContext): PanelContent | null {
    return context.targetUnit
      ? new UnitInfoContent(/* ... */, context.targetUnit)
      : new EmptyContent(/* ... */);
  }

  getCursorStyle(): string {
    return 'crosshair';
  }

  handleCanvasClick(x: number, y: number, state: CombatState, encounter: CombatEncounter): PhaseEventResult {
    // Player turn logic
    return { handled: true };
  }

  // ... other required methods ...
}
```

That's it! No changes to CombatView needed.

## Files Modified

1. **New Files**:
   - `react-app/src/models/combat/PhaseEventResult.ts`
   - `react-app/src/models/combat/managers/InfoPanelContext.ts`

2. **Modified Files**:
   - `react-app/src/models/combat/PhaseBase.ts`
   - `react-app/src/models/combat/DeploymentPhaseHandler.ts`
   - `react-app/src/components/combat/CombatView.tsx`
   - `react-app/src/models/combat/layouts/CombatLayoutManager.ts`
   - `react-app/src/models/combat/layouts/CombatLayoutRenderer.ts`

## Migration Strategy

1. Implement phases sequentially (1 → 2 → 3 → 4 → 5 → 6)
2. Build and test after each phase
3. Ensure no behavioral changes (only structural refactoring)
4. Keep all existing functionality working throughout

## Success Criteria

- [ ] CombatView contains zero phase-specific code
- [ ] CombatView contains zero `instanceof` checks for phases
- [ ] CombatView contains zero phase string literal checks
- [ ] All event handling is routed through PhaseBase interface
- [ ] All UI configuration comes from phase handlers
- [ ] DeploymentPhaseHandler implements all required methods
- [ ] TypeScript build succeeds with no errors
- [ ] All existing functionality works identically
- [ ] Code is easier to understand and maintain
- [ ] Adding new phases requires no CombatView changes
