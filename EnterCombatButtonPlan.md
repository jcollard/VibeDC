# Enter Combat Button Implementation Plan

## Overview
Add an "Enter Combat" button to the Party Members panel during the deployment phase. The button should appear when deployment is complete and transition to an enemy-deployment phase when clicked.

## Requirements

### Button Visibility
- Button appears when: `deployedUnitCount >= totalPartySize OR deployedUnitCount >= totalDeploymentZones`
- Button disappears if units are removed and conditions no longer met
- Button positioned at bottom of Party Members panel, centered horizontally

### Button Behavior
- Shows hover state when mouse hovers over it
- Shows active/pressed state on mouse down
- Triggers onClick callback on mouse up (if still over button)
- Uses 9-slice sprite rendering with configurable sprites:
  - Normal: `ui-simple-4`
  - Hover: `ui-simple-5`
  - Active: `ui-simple-6`

### Combat Log Message
- When button is clicked, add message: "Units deployed. Begin combat?"
- Message constant: `CombatConstants.TEXT.UNITS_DEPLOYED`

### Phase Transition
- Button click transitions from `'deployment'` phase to `'enemy-deployment'` phase
- Create placeholder `EnemyDeploymentPhaseHandler` for future implementation

## Architecture

### 1. PanelButton Class (`react-app/src/models/combat/managers/panels/PanelButton.ts`)
**Purpose**: Reusable button component for use within PanelContent implementations

**Key Features**:
- Works with **panel-relative coordinates** (not absolute canvas coordinates)
- Auto-sizes based on text + font + padding
- 9-slice sprite rendering (3px border, scaled 1x)
- Handles hover, active, and normal states
- Methods:
  - `handleMouseMove(relativeX, relativeY)` - Updates hover state
  - `handleMouseDown(relativeX, relativeY)` - Sets active state
  - `handleMouseUp(relativeX, relativeY)` - Triggers onClick if over button
  - `render(ctx, panelX, panelY, spriteImages)` - Renders at panel-relative position

**Constructor Parameters**:
```typescript
{
  label: string;
  x: number;  // Panel-relative X
  y: number;  // Panel-relative Y
  width?: number;  // Auto-calculated if not provided
  height?: number;  // Auto-calculated if not provided
  padding?: number;  // Default: 1
  spriteId?: string;  // Default: 'ui-simple-4'
  hoverSpriteId?: string;  // Default: 'ui-simple-5'
  activeSpriteId?: string;  // Default: 'ui-simple-6'
  fontId: string;
  fontAtlasImage: HTMLImageElement | null;
  fontScale?: number;  // Default: 1
  textColor?: string;  // Default: '#ffffff'
  enabled?: boolean;  // Default: true
  onClick?: () => void;
}
```

### 2. PartyMembersContent Updates (`react-app/src/models/combat/managers/panels/PartyMembersContent.ts`)

**New Constructor Parameter** (optional):
```typescript
deploymentInfo?: {
  deployedUnitCount: number;
  totalPartySize: number;
  totalDeploymentZones: number;
  onEnterCombat?: () => void;
}
```

**New Private Members**:
- `enterCombatButton: PanelButton | null` - Button instance
- `showEnterCombatButton: boolean` - Calculated from deployment info
- `deployedUnitCount`, `totalPartySize`, `totalDeploymentZones` - Stored for condition checking
- `onEnterCombat?: () => void` - Callback to invoke

**Button Positioning**:
- Centered horizontally: `buttonX = (region.width - buttonWidth) / 2`
- Bottom of panel: `buttonY = region.height - buttonHeight - padding`

**Updated Methods**:

1. `render()` - Calls `renderEnterCombatButton()` if `showEnterCombatButton` is true

2. `renderEnterCombatButton()` - Creates button on first render, positions it, renders it

3. `handleClick()` - Returns `'button' | number | null`
   - Checks button click first (if button exists)
   - Falls back to party member click detection

4. `handleHover()` - Returns `number | null`
   - Updates button hover state (if button exists)
   - Returns hovered party member index

5. `handleMouseDown()` - Returns `boolean`
   - Forwards to button's handleMouseDown (if button exists)

### 3. InfoPanelManager Updates (`react-app/src/models/combat/managers/InfoPanelManager.ts`)

**New Method**:
```typescript
handleMouseDown(canvasX: number, canvasY: number, region: PanelRegion): boolean
```
- Transforms canvas coords to panel-relative coords
- Forwards to `content.handleMouseDown()` if available

### 4. PanelContent Interface Updates (`react-app/src/models/combat/managers/panels/PanelContent.ts`)

**New Optional Method**:
```typescript
handleMouseDown?(relativeX: number, relativeY: number): boolean;
```

### 5. LayoutRenderContext Updates (`react-app/src/models/combat/layouts/CombatLayoutRenderer.ts`)

**New Properties**:
```typescript
deployedUnitCount?: number;
totalDeploymentZones?: number;
onEnterCombat?: () => void;
```

### 6. CombatLayoutManager Updates (`react-app/src/models/combat/layouts/CombatLayoutManager.ts`)

**In `renderBottomInfoPanel()`**:
- Extract new context properties: `deployedUnitCount`, `totalDeploymentZones`, `onEnterCombat`
- Pass them to PartyMembersContent constructor as `deploymentInfo`

### 7. CombatView Updates (`react-app/src/components/combat/CombatView.tsx`)

**In `renderFrame()`** - Add to `layoutRenderer.renderLayout()` call:
```typescript
deployedUnitCount: combatState.unitManifest.getAllUnits().length,
totalDeploymentZones: encounter.playerDeploymentZones.length,
onEnterCombat: () => {
  combatLogManager.addMessage(CombatConstants.TEXT.UNITS_DEPLOYED);
  setCombatState({ ...combatState, phase: 'enemy-deployment' });
}
```

**In `handleCanvasMouseDown()`** - Add button mouse down handling:
```typescript
// Check if clicking on bottom info panel
const panelRegion = layoutRenderer.getBottomInfoPanelRegion();
if (canvasX >= panelRegion.x && ...) {
  const mouseDownHandled = bottomInfoPanelManager.handleMouseDown(canvasX, canvasY, panelRegion);
  if (mouseDownHandled) {
    renderFrame(); // Re-render to show button press state
    return;
  }
  // ... existing party member click handling
}
```

**In `handleCanvasMouseUp()`** - Add button click handling:
```typescript
// Check if clicking on bottom info panel (for button clicks)
const panelRegion = layoutRenderer.getBottomInfoPanelRegion();
if (canvasX >= panelRegion.x && ...) {
  const clickResult = bottomInfoPanelManager.handleClick(canvasX, canvasY, panelRegion);
  if (clickResult === 'button') {
    renderFrame(); // Re-render after button click
    return;
  }
}
```

### 8. Phase System Updates

**CombatState.ts**:
- Add `'enemy-deployment'` to `CombatPhase` type

**CombatConstants.ts**:
- Add `UNITS_DEPLOYED: 'Units deployed. Begin combat?'` to `TEXT` object

**EnemyDeploymentPhaseHandler.ts** (new file):
- Create placeholder phase handler extending `PhaseBase`
- Implement minimal required methods
- Ready for future enemy deployment logic

## Event Flow

### Hover
1. User moves mouse over button area
2. `handleCanvasMouseMove()` called
3. `bottomInfoPanelManager.handleHover()` called
4. `PartyMembersContent.handleHover()` called
5. `PanelButton.handleMouseMove()` called
6. Button updates `isHovered` state
7. Returns `number | null` (for party member hover)
8. `renderFrame()` called (if party member hover changed)
9. Next render shows button in hover state

### Click
1. User presses mouse button over button
2. `handleCanvasMouseDown()` called
3. `bottomInfoPanelManager.handleMouseDown()` called
4. `PartyMembersContent.handleMouseDown()` called
5. `PanelButton.handleMouseDown()` called
6. Button sets `isActive = true`
7. `renderFrame()` called
8. Next render shows button in active state
9. User releases mouse button
10. `handleCanvasMouseUp()` called
11. `bottomInfoPanelManager.handleClick()` called
12. `PartyMembersContent.handleClick()` called
13. `PanelButton.handleMouseUp()` called
14. Button's `onClick` callback invoked
15. Adds combat log message
16. Transitions to enemy-deployment phase

## Files to Create
1. `react-app/src/models/combat/managers/panels/PanelButton.ts`
2. `react-app/src/models/combat/EnemyDeploymentPhaseHandler.ts`

## Files to Modify
1. `react-app/src/models/combat/managers/panels/PartyMembersContent.ts`
2. `react-app/src/models/combat/managers/panels/PanelContent.ts`
3. `react-app/src/models/combat/managers/panels/index.ts`
4. `react-app/src/models/combat/managers/InfoPanelManager.ts`
5. `react-app/src/models/combat/layouts/CombatLayoutRenderer.ts`
6. `react-app/src/models/combat/layouts/CombatLayoutManager.ts`
7. `react-app/src/components/combat/CombatView.tsx`
8. `react-app/src/models/combat/CombatState.ts`
9. `react-app/src/models/combat/CombatConstants.ts`

## Known Issues with Initial Implementation

### Issue: Button Hover State Not Persisting
**Problem**: PartyMembersContent was being recreated every frame in `CombatLayoutManager.renderBottomInfoPanel()`, which meant the PanelButton inside was also recreated every frame, losing its hover state.

**Why it happened**:
- `renderLayout()` is called every frame
- Each call creates a new `PartyMembersContent` instance
- Each `PartyMembersContent` creates a new `PanelButton` in its constructor
- New button has `isHovered = false`, losing previous hover state

**Attempted Fix**: Cache `PartyMembersContent` instance in `CombatLayoutManager`
- Added `cachedPartyMembersContent` property
- Only create once when entering deployment phase
- Reuse same instance across frames

**Result**: Did not work (reason unclear - needs investigation)

### Potential Solutions to Explore

1. **Store button state externally**: Move button instance outside PartyMembersContent
   - Store in InfoPanelManager or CombatLayoutManager
   - Pass button reference to PartyMembersContent

2. **Static button registry**: Use a singleton pattern for buttons
   - Map of button IDs to button instances
   - PartyMembersContent looks up button by ID

3. **Different content lifecycle**: Don't recreate content every frame
   - Only create content when phase changes
   - Update properties instead of recreating

4. **Stateless rendering**: Don't store state in button
   - Store hover state in CombatView or layout manager
   - Pass state to button as render parameter

5. **React-style approach**: Treat content as immutable
   - Store all UI state in React state (CombatView)
   - Pass everything down as props
   - Content is purely a renderer

## Testing Checklist
- [ ] Button appears when all party members deployed
- [ ] Button appears when all deployment zones filled
- [ ] Button disappears if unit removed and conditions not met
- [ ] Button shows hover state (ui-simple-5 sprite)
- [ ] Button shows active state on mouse down (ui-simple-6 sprite)
- [ ] Button shows normal state when not interacting (ui-simple-4 sprite)
- [ ] Button click adds "Units deployed. Begin combat?" to combat log
- [ ] Button click transitions to enemy-deployment phase
- [ ] Button is properly centered horizontally in panel
- [ ] Button is positioned at bottom of panel
- [ ] Clicking party members still works for deployment
- [ ] Party member hover still shows unit info in target panel
