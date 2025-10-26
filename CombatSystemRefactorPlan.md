# Combat System Refactor Plan
**Created**: 2025-10-26
**Based On**: CombatSystemReview.md
**Status**: Ready for Implementation

---

## Overview

This document provides a comprehensive, step-by-step refactoring plan to address the areas for improvement identified in the combat system review. Each refactor is designed to be **independent** and **incremental**, allowing implementation in any order based on priority and available time.

**Total Estimated Effort**: 8-11 hours
**Recommended Order**: Priority 1 → Priority 3 → Priority 4 → Priority 2 → Priority 5

---

## Quick Reference

| Priority | Refactor | Effort | Impact | Dependencies |
|----------|----------|--------|--------|--------------|
| 1 | Unify Event Result Handling | 2-3 hrs | High | None |
| 2 | Centralize Font Loading | 1-2 hrs | Medium | None |
| 3 | Remove Deprecated Methods | 0.5 hrs | Low | None |
| 4 | Type-Safe Click Results | 1 hr | Medium | None |
| 5 | Phase Transition Formalization | 2-3 hrs | High | None |

---

## Priority 1: Unify Event Result Handling

**Goal**: Add generic data field to `PhaseEventResult` to eliminate workarounds and type casts

**Current Problem**:
```typescript
// DeploymentPhaseHandler.ts:433-438
// Workaround: Uses preventDefault as a signal (awkward)
return {
  handled: hoveredIndex !== null,
  preventDefault: hoveredIndex !== null,
  // Note: PhaseEventResult doesn't have a generic data field
};

// CombatView.tsx:687-688
// Type cast required to access phase-specific methods
const deploymentHandler = phaseHandlerRef.current as any;
if (deploymentHandler.handlePartyMemberDeployment) { ... }
```

### Implementation Steps

#### Step 1.1: Update PhaseEventResult Interface
**File**: `react-app/src/models/combat/CombatPhaseHandler.ts`

**Changes**:
```typescript
// BEFORE
export interface PhaseEventResult {
  handled: boolean;
  newState?: CombatState;
  transitionTo?: string;
  preventDefault?: boolean;
  logMessage?: string;
}

// AFTER
export interface PhaseEventResult<TData = unknown> {
  handled: boolean;
  newState?: CombatState;
  transitionTo?: string;
  preventDefault?: boolean;
  logMessage?: string;
  data?: TData;
}
```

**Why generic type**: Allows type-safe data passing without `any` casts

---

#### Step 1.2: Update CombatPhaseHandler Method Signatures
**File**: `react-app/src/models/combat/CombatPhaseHandler.ts`

**Changes**:
```typescript
// Update all event handler signatures
export interface CombatPhaseHandler {
  handleMapClick?<TData = unknown>(
    context: MouseEventContext,
    state: CombatState,
    encounter: CombatEncounter
  ): PhaseEventResult<TData>;

  handleMouseDown?<TData = unknown>(
    context: MouseEventContext,
    state: CombatState,
    encounter: CombatEncounter
  ): PhaseEventResult<TData>;

  handleMouseUp?<TData = unknown>(
    context: MouseEventContext,
    state: CombatState,
    encounter: CombatEncounter
  ): PhaseEventResult<TData>;

  handleMouseMove?<TData = unknown>(
    context: MouseEventContext,
    state: CombatState,
    encounter: CombatEncounter
  ): PhaseEventResult<TData>;

  handleInfoPanelClick?<TData = unknown>(
    relativeX: number,
    relativeY: number,
    state: CombatState,
    encounter: CombatEncounter
  ): PhaseEventResult<TData>;

  handleInfoPanelHover?<TData = unknown>(
    relativeX: number,
    relativeY: number,
    state: CombatState,
    encounter: CombatEncounter
  ): PhaseEventResult<TData>;
}
```

---

#### Step 1.3: Add Deployment-Specific Result Type
**File**: `react-app/src/models/combat/DeploymentPhaseHandler.ts`

**Add at top of file**:
```typescript
/**
 * Data returned from deployment phase info panel interactions
 */
export interface DeploymentPanelData {
  type: 'party-member-hover';
  memberIndex: number;
}

/**
 * Data returned from deployment actions
 */
export interface DeploymentActionData {
  type: 'party-member-deployed';
  memberIndex: number;
  unit: CombatUnit;
  position: { x: number; y: number };
}
```

---

#### Step 1.4: Refactor handleInfoPanelHover to Use Data Field
**File**: `react-app/src/models/combat/DeploymentPhaseHandler.ts`

**Changes**:
```typescript
// BEFORE (lines 390-439)
handleInfoPanelHover(
  relativeX: number,
  relativeY: number,
  _state: CombatState,
  _encounter: CombatEncounter
): PhaseEventResult {
  // ... hover detection code ...
  return {
    handled: hoveredIndex !== null,
    preventDefault: hoveredIndex !== null, // Awkward workaround
  };
}

getHoveredPartyMember(): CombatUnit | null {
  return null; // TODO: Store and return hovered unit
}

// AFTER
handleInfoPanelHover(
  relativeX: number,
  relativeY: number,
  _state: CombatState,
  _encounter: CombatEncounter
): PhaseEventResult<DeploymentPanelData> {
  const partyUnits = PartyMemberRegistry.getAll()
    .map(member => PartyMemberRegistry.createPartyMember(member.id))
    .filter((unit): unit is CombatUnit => unit !== undefined);

  if (partyUnits.length === 0) {
    return { handled: false };
  }

  // Create or update cached content for hover detection
  if (!this.hoverDetectionContent) {
    this.hoverDetectionContent = new PartyMembersContent(
      {
        title: 'Party Members',
        titleColor: '#ffa500',
        padding: 1,
        lineSpacing: 8,
      },
      partyUnits,
      new Map(),
      12,
      null
    );
  } else {
    this.hoverDetectionContent.updatePartyUnits(partyUnits);
  }

  const hoveredIndex = this.hoverDetectionContent.handleHover(relativeX, relativeY);

  if (hoveredIndex !== null) {
    return {
      handled: true,
      data: {
        type: 'party-member-hover',
        memberIndex: hoveredIndex
      }
    };
  }

  return { handled: false };
}

// Remove getHoveredPartyMember() method - no longer needed
```

---

#### Step 1.5: Add handleDeploymentAction Method
**File**: `react-app/src/models/combat/DeploymentPhaseHandler.ts`

**Add new method** (replaces the confusing `handlePartyMemberDeployment`):
```typescript
/**
 * Handle deployment action - returns event result with deployment data
 * This replaces the old handlePartyMemberDeployment pattern
 */
handleDeploymentAction(
  memberIndex: number,
  combatState: CombatState,
  encounter: CombatEncounter
): PhaseEventResult<DeploymentActionData> {
  // 1. Check if a zone is selected
  const selectedZoneIndex = this.getSelectedZoneIndex();
  if (selectedZoneIndex === null) {
    return { handled: false };
  }

  // 2. Get the party member and deployment zone
  const partyMembers = PartyMemberRegistry.getAll();
  const selectedMember = partyMembers[memberIndex];
  const deploymentZone = encounter.playerDeploymentZones[selectedZoneIndex];

  if (!selectedMember || !deploymentZone) {
    return { handled: false };
  }

  // 3. Create unit and update manifest
  try {
    const unit = PartyMemberRegistry.createPartyMember(selectedMember.id);
    if (!unit) {
      console.error(`Failed to create party member: ${selectedMember.id}`);
      return { handled: false };
    }

    const newManifest = new CombatUnitManifest();

    // Copy existing units, excluding any unit at the deployment zone
    combatState.unitManifest.getAllUnits().forEach(placement => {
      if (placement.position.x !== deploymentZone.x || placement.position.y !== deploymentZone.y) {
        newManifest.addUnit(placement.unit, placement.position);
      }
    });

    // Add new unit at the deployment zone
    newManifest.addUnit(unit, deploymentZone);

    // Clear the selected zone after deploying
    this.clearSelectedZone();

    // Return event result with all data
    return {
      handled: true,
      newState: {
        ...combatState,
        unitManifest: newManifest
      },
      logMessage: `[color=#00ff00]${unit.name}[/color] deployed to (${deploymentZone.x}, ${deploymentZone.y})`,
      data: {
        type: 'party-member-deployed',
        memberIndex,
        unit,
        position: { x: deploymentZone.x, y: deploymentZone.y }
      }
    };
  } catch (error) {
    console.error('Failed to deploy unit:', error);
    return { handled: false };
  }
}
```

**Mark old method as deprecated**:
```typescript
/**
 * @deprecated Use handleDeploymentAction instead
 * This method will be removed in a future version
 */
handlePartyMemberDeployment(
  memberIndex: number,
  combatState: CombatState,
  encounter: CombatEncounter
): { newState: CombatState; logMessage: string } | null {
  const result = this.handleDeploymentAction(memberIndex, combatState, encounter);
  if (!result.handled || !result.newState || !result.logMessage) {
    return null;
  }
  return {
    newState: result.newState,
    logMessage: result.logMessage
  };
}
```

---

#### Step 1.6: Update CombatView to Use New Pattern
**File**: `react-app/src/components/combat/CombatView.tsx`

**Changes in handleCanvasMouseDown** (around line 684-721):
```typescript
// BEFORE
if (clickResult.type === 'party-member' && 'index' in clickResult && combatState.phase === 'deployment') {
  const deploymentHandler = phaseHandlerRef.current as any; // Type cast!
  if (deploymentHandler.handlePartyMemberDeployment) {
    const result = deploymentHandler.handlePartyMemberDeployment(
      (clickResult as any).index,
      combatState,
      encounter
    );

    if (result) {
      if (result.logMessage) {
        combatLogManager.addMessage(result.logMessage);
      }
      // ... button visibility logic ...
      setCombatState(result.newState);
      return;
    }
  }
}

// AFTER
if (clickResult.type === 'party-member' && 'index' in clickResult && combatState.phase === 'deployment') {
  // Type-safe access - no cast needed
  if ('handleDeploymentAction' in phaseHandlerRef.current) {
    const deploymentHandler = phaseHandlerRef.current as DeploymentPhaseHandler;
    const result = deploymentHandler.handleDeploymentAction(
      (clickResult as any).index,
      combatState,
      encounter
    );

    if (result.handled && result.newState) {
      // Add log message if provided
      if (result.logMessage) {
        combatLogManager.addMessage(result.logMessage);
      }

      // Check if button should become visible after this deployment
      const previousDeployedCount = combatState.unitManifest.getAllUnits().length;
      const newDeployedCount = result.newState.unitManifest.getAllUnits().length;
      const partySize = partyUnits.length;
      const totalZones = encounter.playerDeploymentZones.length;

      const wasButtonVisible = previousDeployedCount >= partySize || previousDeployedCount >= totalZones;
      const isButtonVisible = newDeployedCount >= partySize || newDeployedCount >= totalZones;

      // Add "Units deployed. Enter combat?" message when button becomes visible
      if (!wasButtonVisible && isButtonVisible) {
        combatLogManager.addMessage(CombatConstants.TEXT.UNITS_DEPLOYED);
      }

      // Update state
      setCombatState(result.newState);
      return;
    }
  }
}
```

**Changes in handleCanvasMouseMove** (around line 818-836):
```typescript
// BEFORE
const hoverResult = bottomInfoPanelManager.handleHover(
  canvasX,
  canvasY,
  partyPanelRegion
);

if (typeof hoverResult === 'number' && hoverResult !== null && partyUnits.length > 0) {
  targetUnitRef.current = partyUnits[hoverResult];
  hoveredPartyMemberRef.current = hoverResult;
}

// AFTER
const hoverResult = bottomInfoPanelManager.handleHover(
  canvasX,
  canvasY,
  partyPanelRegion
);

// During deployment phase, delegate to phase handler for type-safe hover handling
if (combatState.phase === 'deployment' && 'handleInfoPanelHover' in phaseHandlerRef.current) {
  const deploymentHandler = phaseHandlerRef.current as DeploymentPhaseHandler;
  const phaseHoverResult = deploymentHandler.handleInfoPanelHover(
    canvasX - partyPanelRegion.x,
    canvasY - partyPanelRegion.y,
    combatState,
    encounter
  );

  if (phaseHoverResult.handled && phaseHoverResult.data) {
    const data = phaseHoverResult.data as DeploymentPanelData;
    if (data.type === 'party-member-hover') {
      targetUnitRef.current = partyUnits[data.memberIndex];
      hoveredPartyMemberRef.current = data.memberIndex;
    }
  } else {
    if (hoveredPartyMemberRef.current !== null) {
      hoveredPartyMemberRef.current = null;
    }
  }
} else {
  // Fallback to generic hover handling
  if (typeof hoverResult === 'number' && hoverResult !== null && partyUnits.length > 0) {
    targetUnitRef.current = partyUnits[hoverResult];
    hoveredPartyMemberRef.current = hoverResult;
  } else {
    if (hoveredPartyMemberRef.current !== null) {
      hoveredPartyMemberRef.current = null;
    }
  }
}
```

---

### Testing Checklist for Priority 1

- [ ] TypeScript compiles without errors
- [ ] Deployment phase loads without errors
- [ ] Clicking deployment zone selects it (green pulse)
- [ ] Clicking party member in info panel deploys unit
- [ ] Hovering party member shows unit in target panel
- [ ] Combat log shows deployment messages
- [ ] "Enter Combat" button appears when all units deployed
- [ ] Phase transitions to enemy-deployment when button clicked
- [ ] No console errors or warnings

---

## Priority 2: Centralize Font Loading

**Goal**: Create single `FontAtlasLoader` service to eliminate duplicate font loading logic

**Current Problem**:
```typescript
// DeploymentUI.ts has its own font loading
private fontAtlasCache: Map<string, HTMLImageElement> = new Map();
private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();

// CombatView.tsx also loads fonts
const fontAtlasImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
```

### Implementation Steps

#### Step 2.1: Create FontAtlasLoader Service
**File**: `react-app/src/services/FontAtlasLoader.ts` (NEW FILE)

**Full implementation**:
```typescript
import { FontRegistry } from '../utils/FontRegistry';

/**
 * Centralized font atlas loading service
 * Manages font atlas image loading with caching and promise deduplication
 */
export class FontAtlasLoader {
  private cache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();

  /**
   * Load a single font atlas by ID
   * Returns cached image if already loaded
   */
  async load(fontId: string): Promise<HTMLImageElement> {
    // Return cached image if available
    if (this.cache.has(fontId)) {
      return this.cache.get(fontId)!;
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(fontId)) {
      return this.loadingPromises.get(fontId)!;
    }

    // Get font definition from registry
    const fontDef = FontRegistry.getById(fontId);
    if (!fontDef) {
      throw new Error(`Font '${fontId}' not found in FontRegistry`);
    }

    // Create loading promise
    const loadingPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.src = fontDef.atlasPath;
      img.onload = () => {
        this.cache.set(fontId, img);
        this.loadingPromises.delete(fontId);
        resolve(img);
      };
      img.onerror = () => {
        this.loadingPromises.delete(fontId);
        reject(new Error(`Failed to load font atlas for '${fontId}' at ${fontDef.atlasPath}`));
      };
    });

    this.loadingPromises.set(fontId, loadingPromise);
    return loadingPromise;
  }

  /**
   * Load multiple font atlases concurrently
   * Returns a map of fontId -> loaded image
   */
  async loadAll(fontIds: string[]): Promise<Map<string, HTMLImageElement>> {
    const promises = fontIds.map(async (fontId) => {
      try {
        const image = await this.load(fontId);
        return { fontId, image };
      } catch (error) {
        console.error(`Failed to load font atlas '${fontId}':`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    const loaded = new Map<string, HTMLImageElement>();

    for (const result of results) {
      if (result) {
        loaded.set(result.fontId, result.image);
      }
    }

    return loaded;
  }

  /**
   * Get a loaded font atlas image
   * Returns null if not loaded
   */
  get(fontId: string): HTMLImageElement | null {
    return this.cache.get(fontId) || null;
  }

  /**
   * Check if a font atlas is loaded
   */
  isLoaded(fontId: string): boolean {
    return this.cache.has(fontId);
  }

  /**
   * Check if a font atlas is currently loading
   */
  isLoading(fontId: string): boolean {
    return this.loadingPromises.has(fontId);
  }

  /**
   * Clear all cached font atlases
   */
  clear(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get all loaded font atlas images
   */
  getAll(): Map<string, HTMLImageElement> {
    return new Map(this.cache);
  }
}
```

---

#### Step 2.2: Update CombatView to Use FontAtlasLoader
**File**: `react-app/src/components/combat/CombatView.tsx`

**Import addition**:
```typescript
import { FontAtlasLoader } from '../../services/FontAtlasLoader';
```

**Replace font loading logic** (around lines 94-109, 281-310):
```typescript
// BEFORE
const spriteLoader = useMemo(() => new SpriteAssetLoader(), []);
const fontAtlasImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

// Load font atlas images for all fonts in FontRegistry
useEffect(() => {
  const loadFontAtlases = async () => {
    const fontIds = FontRegistry.getAllIds();
    const images = new Map<string, HTMLImageElement>();

    for (const fontId of fontIds) {
      const font = FontRegistry.getById(fontId);
      if (!font) continue;

      try {
        const img = new Image();
        img.src = font.atlasPath;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            images.set(fontId, img);
            resolve();
          };
          img.onerror = () => reject(new Error(`Failed to load font atlas: ${font.atlasPath}`));
        });
      } catch (error) {
        console.error(`Failed to load font atlas for ${fontId}:`, error);
      }
    }

    fontAtlasImagesRef.current = images;
  };

  loadFontAtlases().catch(console.error);
}, []);

// AFTER
const spriteLoader = useMemo(() => new SpriteAssetLoader(), []);
const fontLoader = useMemo(() => new FontAtlasLoader(), []);
const [fontsLoaded, setFontsLoaded] = useState(false);

// Load font atlas images using FontAtlasLoader
useEffect(() => {
  const loadFontAtlases = async () => {
    const fontIds = FontRegistry.getAllIds();
    await fontLoader.loadAll(fontIds);
    setFontsLoaded(true);
  };

  loadFontAtlases().catch(console.error);
}, [fontLoader]);
```

**Update render references** (replace `fontAtlasImagesRef.current` with `fontLoader`):
```typescript
// Find and replace pattern:
// FROM: fontAtlasImagesRef.current.get(fontId)
// TO:   fontLoader.get(fontId)

// Examples:
const layoutFontAtlas = fontLoader.get(unitInfoAtlasFont) || null;
const topPanelFontAtlas = fontLoader.get('15px-dungeonslant') || null;
const debugFontAtlas = fontLoader.get('7px-04b03') || null;
```

---

#### Step 2.3: Remove Font Loading from DeploymentUI
**File**: `react-app/src/models/combat/deployment/DeploymentUI.ts`

**Changes**:
```typescript
// BEFORE (lines 10-76)
export class DeploymentUI {
  private fontAtlasCache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();

  constructor() {
    this.preloadDefaultFonts();
  }

  private preloadDefaultFonts(): void { ... }
  private async loadFontAtlas(fontId: string): Promise<HTMLImageElement> { ... }

  renderPhaseHeader(ctx, canvasWidth, _headerFont, fontId = '15px-dungeonslant'): void {
    const atlas = this.fontAtlasCache.get(fontId);
    if (!atlas) {
      this.loadFontAtlas(fontId).catch(console.error);
      return;
    }
    // ... render code ...
  }
}

// AFTER
export class DeploymentUI {
  // No font loading - fonts passed via render methods

  renderPhaseHeader(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    fontId: string,
    fontAtlas: HTMLImageElement | null
  ): void {
    if (!fontAtlas) {
      console.warn(`Font atlas not loaded for '${fontId}'`);
      return;
    }

    const fontDef = FontRegistry.getById(fontId);
    if (!fontDef) return;

    const text = CombatConstants.TEXT.DEPLOY_TITLE;
    const scale = 1;
    const y = CombatConstants.UI.TITLE_Y_POSITION;

    // Draw semi-transparent background
    const backgroundHeight = CombatConstants.UI.TITLE_HEIGHT;
    ctx.fillStyle = `rgba(0, 0, 0, ${CombatConstants.RENDERING.BACKGROUND_ALPHA})`;
    ctx.fillRect(0, y, canvasWidth, backgroundHeight);

    // Calculate centered position for text
    const textY = y + backgroundHeight / 2 - (fontDef.charHeight * scale) / 2;

    // Render centered title
    FontAtlasRenderer.renderText(
      ctx,
      text,
      canvasWidth / 2,
      textY,
      fontId,
      fontAtlas,
      scale,
      'center'
    );
  }

  // Update other render methods similarly:
  // - renderWaylaidMessage
  // - renderInstructionMessage
}
```

---

#### Step 2.4: Update DeploymentPhaseHandler to Pass Font Atlases
**File**: `react-app/src/models/combat/DeploymentPhaseHandler.ts`

**Update renderUI method** (around line 240):
```typescript
// BEFORE
renderUI(state, encounter, context): void {
  const { ctx, canvasWidth, ... } = context;

  this.ui.renderPhaseHeader(ctx, canvasWidth, '', titleAtlasFontId || '15px-dungeonslant');
  this.ui.renderWaylaidMessage(ctx, canvasWidth, '', messageAtlasFontId || '7px-04b03');
  // ...
}

// AFTER
renderUI(state, encounter, context): void {
  const { ctx, canvasWidth, titleAtlasFontId, messageAtlasFontId, fontAtlasImages, ... } = context;

  const titleFontId = titleAtlasFontId || '15px-dungeonslant';
  const titleAtlas = fontAtlasImages?.get(titleFontId) || null;
  this.ui.renderPhaseHeader(ctx, canvasWidth, titleFontId, titleAtlas);

  const messageFontId = messageAtlasFontId || '7px-04b03';
  const messageAtlas = fontAtlasImages?.get(messageFontId) || null;
  this.ui.renderWaylaidMessage(ctx, canvasWidth, messageFontId, messageAtlas);

  // Update renderInstructionMessage similarly
  // ...
}
```

---

#### Step 2.5: Update PhaseRenderContext to Include Font Map
**File**: `react-app/src/models/combat/CombatPhaseHandler.ts`

**Ensure fontAtlasImages is available**:
```typescript
export interface PhaseRenderContext {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  tileSize: number;
  spriteSize: number;
  offsetX: number;
  offsetY: number;
  spriteImages: Map<string, HTMLImageElement>;
  titleAtlasFontId?: string;
  messageAtlasFontId?: string;
  dialogAtlasFontId?: string;
  fontAtlasImages?: Map<string, HTMLImageElement>; // ✅ Already present
}
```

**Update CombatView to pass fontAtlasImages** (around line 403):
```typescript
phaseHandlerRef.current.render(combatState, encounter, {
  ctx,
  canvasWidth: CANVAS_WIDTH,
  canvasHeight: CANVAS_HEIGHT,
  tileSize: TILE_SIZE,
  spriteSize: SPRITE_SIZE,
  offsetX,
  offsetY,
  spriteImages: spriteImagesRef.current,
  fontAtlasImages: fontLoader.getAll(), // ✅ Pass all loaded fonts
});
```

---

### Testing Checklist for Priority 2

- [ ] TypeScript compiles without errors
- [ ] All fonts load successfully (no console errors)
- [ ] Deployment phase header renders correctly
- [ ] Waylaid message renders correctly
- [ ] Instruction message with sprite renders correctly
- [ ] Party selection dialog renders correctly
- [ ] Info panels render correctly with fonts
- [ ] Combat log renders correctly
- [ ] No duplicate font loading (check network tab)

---

## Priority 3: Remove Deprecated Methods

**Goal**: Clean up `PhaseBase` by removing deprecated legacy methods

**Current Problem**: 7 deprecated methods clutter the interface

### Implementation Steps

#### Step 3.1: Remove Deprecated Methods
**File**: `react-app/src/models/combat/PhaseBase.ts`

**Delete lines 86-139**:
```typescript
// DELETE THIS ENTIRE SECTION:

// Legacy optional methods - kept for backwards compatibility with old code
// New phases should use the phase-agnostic methods from CombatPhaseHandler instead

/**
 * @deprecated Use handleMapClick instead
 */
handleClick?(
  canvasX: number,
  canvasY: number,
  tileSize: number,
  offsetX: number,
  offsetY: number,
  encounter: CombatEncounter
): boolean;

/**
 * @deprecated Internal use only - use phase-agnostic handleMouseMove from CombatPhaseHandler
 */
handleCharacterClick?(
  canvasX: number,
  canvasY: number,
  characterCount: number
): number | null;

/**
 * @deprecated Internal use only
 */
handleButtonMouseMove?(canvasX: number, canvasY: number): boolean;

/**
 * @deprecated Internal use only
 */
handleButtonMouseDown?(canvasX: number, canvasY: number): boolean;

/**
 * @deprecated Internal use only
 */
handleButtonMouseUp?(canvasX: number, canvasY: number): boolean;

/**
 * @deprecated Internal use only
 */
getSelectedZoneIndex?(): number | null;

/**
 * @deprecated Internal use only
 */
clearSelectedZone?(): void;

/**
 * @deprecated Internal use only
 */
getHoveredCharacterIndex?(): number | null;
```

---

#### Step 3.2: Verify No Code Uses Deprecated Methods
**Run this search to confirm**:
```bash
# Search for any usage of deprecated methods
grep -r "handleClick(" react-app/src/models/combat/
grep -r "handleCharacterClick" react-app/src/
grep -r "handleButtonMouseMove" react-app/src/
grep -r "handleButtonMouseDown" react-app/src/
grep -r "handleButtonMouseUp" react-app/src/
grep -r "getSelectedZoneIndex" react-app/src/
grep -r "clearSelectedZone" react-app/src/
grep -r "getHoveredCharacterIndex" react-app/src/
```

**If any usages found**:
- These methods are already exposed via `DeploymentPhaseHandler` directly
- Update calling code to use the specific handler type, not the base interface

---

#### Step 3.3: Add Migration Comment
**File**: `react-app/src/models/combat/PhaseBase.ts`

**Add at the end of the class**:
```typescript
export abstract class PhaseBase implements CombatPhaseHandler {
  // ... existing code ...

  /**
   * MIGRATION NOTE (2025-10-26):
   * Legacy optional methods (handleClick, handleCharacterClick, etc.) have been removed.
   * If you need phase-specific methods:
   * 1. Define them on your specific phase handler class
   * 2. Cast to your specific type when accessing from phaseHandlerRef
   * 3. Use 'in' operator to check if method exists before casting
   *
   * Example:
   *   if ('handleDeploymentAction' in phaseHandlerRef.current) {
   *     const handler = phaseHandlerRef.current as DeploymentPhaseHandler;
   *     handler.handleDeploymentAction(...);
   *   }
   */
}
```

---

### Testing Checklist for Priority 3

- [ ] TypeScript compiles without errors
- [ ] No grep results for deprecated method usage
- [ ] All existing functionality works unchanged
- [ ] PhaseBase interface is cleaner

---

## Priority 4: Type-Safe Click Results

**Goal**: Replace runtime type checks with compile-time type safety using discriminated unions

**Current Problem**:
```typescript
// Runtime type checking (fragile)
if (clickResult && typeof clickResult === 'object' && 'type' in clickResult) {
  if (clickResult.type === 'button') { ... }
}
```

### Implementation Steps

#### Step 4.1: Define Discriminated Union Types
**File**: `react-app/src/models/combat/managers/panels/PanelContent.ts`

**Add type definitions before the interface**:
```typescript
/**
 * Discriminated union for panel click results
 * Each panel content type can define its own specific result types
 */
export type PanelClickResult =
  | { type: 'button'; buttonId?: string }
  | { type: 'party-member'; index: number }
  | { type: 'unit-selected'; unitId: string }
  | { type: 'action-selected'; actionId: string }
  | { type: 'target-selected'; targetIndex: number }
  | null;

/**
 * Type guard to check if a value is a valid PanelClickResult
 */
export function isPanelClickResult(value: unknown): value is PanelClickResult {
  if (value === null) return true;
  if (typeof value !== 'object') return false;
  if (!('type' in value)) return false;

  const result = value as { type: string };
  return ['button', 'party-member', 'unit-selected', 'action-selected', 'target-selected'].includes(result.type);
}

/**
 * Interface for content that can be rendered in an info panel.
 */
export interface PanelContent {
  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void;

  /**
   * Handle click event on the panel content
   * Returns a discriminated union result or null
   */
  handleClick?(relativeX: number, relativeY: number): PanelClickResult;

  handleHover?(relativeX: number, relativeY: number): unknown;
  handleMouseDown?(relativeX: number, relativeY: number): boolean;
}
```

---

#### Step 4.2: Update PartyMembersContent Return Type
**File**: `react-app/src/models/combat/managers/panels/PartyMembersContent.ts`

**Update method signature** (line 171):
```typescript
// BEFORE
handleClick(relativeX: number, relativeY: number): { type: 'button' } | { type: 'party-member', index: number } | null {
  // ...
}

// AFTER
handleClick(relativeX: number, relativeY: number): PanelClickResult {
  // Check button click first (if button exists)
  if (this.enterCombatButton && this.showEnterCombatButton) {
    const buttonHandled = this.enterCombatButton.handleMouseUp(relativeX, relativeY);
    if (buttonHandled) {
      return { type: 'button' }; // Type-safe
    }
  }

  // Fall back to party member click detection
  const memberIndex = this.getPartyMemberAtPosition(relativeX, relativeY);
  if (memberIndex !== null) {
    return { type: 'party-member', index: memberIndex }; // Type-safe
  }

  return null;
}
```

---

#### Step 4.3: Update UnitInfoContent (if needed)
**File**: `react-app/src/models/combat/managers/panels/UnitInfoContent.ts`

**Add handleClick method** (if it doesn't exist):
```typescript
import type { PanelContent, PanelRegion, PanelClickResult } from './PanelContent';

export class UnitInfoContent implements PanelContent {
  // ... existing code ...

  /**
   * Handle click on unit info content
   * Currently no interactive elements, but structure is in place
   */
  handleClick(relativeX: number, relativeY: number): PanelClickResult {
    // Future: Add clickable elements (abilities, equipment, etc.)
    return null;
  }
}
```

---

#### Step 4.4: Update InfoPanelManager Return Type
**File**: `react-app/src/models/combat/managers/InfoPanelManager.ts`

**Import the new type**:
```typescript
import type { PanelContent, PanelRegion, PanelClickResult } from './panels/PanelContent';
```

**Update method signature** (line 44):
```typescript
// BEFORE
handleClick(
  canvasX: number,
  canvasY: number,
  region: PanelRegion
): unknown {
  if (!this.content || !this.content.handleClick) return null;

  const relativeX = canvasX - region.x;
  const relativeY = canvasY - region.y;

  return this.content.handleClick(relativeX, relativeY);
}

// AFTER
handleClick(
  canvasX: number,
  canvasY: number,
  region: PanelRegion
): PanelClickResult {
  if (!this.content || !this.content.handleClick) return null;

  const relativeX = canvasX - region.x;
  const relativeY = canvasY - region.y;

  return this.content.handleClick(relativeX, relativeY);
}
```

---

#### Step 4.5: Update CombatView to Use Type Guards
**File**: `react-app/src/components/combat/CombatView.tsx`

**Import the type guard**:
```typescript
import { isPanelClickResult, type PanelClickResult } from '../../models/combat/managers/panels/PanelContent';
```

**Update handleCanvasMouseDown** (around line 674):
```typescript
// BEFORE
const clickResult = bottomInfoPanelManager.handleClick(canvasX, canvasY, panelRegion);

// Check if button was clicked
if (clickResult && typeof clickResult === 'object' && 'type' in clickResult) {
  if (clickResult.type === 'button') {
    renderFrame();
    return;
  }

  if (clickResult.type === 'party-member' && 'index' in clickResult && combatState.phase === 'deployment') {
    // ...
  }
}

// AFTER
const clickResult: PanelClickResult = bottomInfoPanelManager.handleClick(canvasX, canvasY, panelRegion);

// Type-safe handling with discriminated union
if (clickResult !== null) {
  switch (clickResult.type) {
    case 'button':
      renderFrame();
      return;

    case 'party-member':
      if (combatState.phase === 'deployment') {
        if ('handleDeploymentAction' in phaseHandlerRef.current) {
          const deploymentHandler = phaseHandlerRef.current as DeploymentPhaseHandler;
          const result = deploymentHandler.handleDeploymentAction(
            clickResult.index, // Type-safe access!
            combatState,
            encounter
          );

          // ... rest of deployment logic ...
        }
      }
      return;

    case 'unit-selected':
    case 'action-selected':
    case 'target-selected':
      // Future: Handle other click types
      break;
  }
}
```

---

### Testing Checklist for Priority 4

- [ ] TypeScript compiles without errors
- [ ] Auto-complete works for clickResult.type
- [ ] Clicking "Enter Combat" button works
- [ ] Clicking party member to deploy works
- [ ] All click handlers return correct types
- [ ] No runtime type errors in console

---

## Priority 5: Phase Transition Formalization

**Goal**: Create centralized phase transition logic with clear completion signals

**Current Problem**:
- Manual transitions scattered across multiple files
- Unclear how phases signal completion
- `transitionTo` field defined but unused

### Implementation Steps

#### Step 5.1: Create PhaseTransitionManager
**File**: `react-app/src/models/combat/PhaseTransitionManager.ts` (NEW FILE)

**Full implementation**:
```typescript
import type { CombatPhase, CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';

/**
 * Context provided to phase transition logic
 */
export interface PhaseTransitionContext {
  currentState: CombatState;
  encounter: CombatEncounter;
}

/**
 * Manages phase transitions in combat
 * Centralizes all logic for determining when and how phases transition
 */
export class PhaseTransitionManager {
  /**
   * Determine the next phase based on current phase and game state
   * Returns the next phase, or the current phase if no transition should occur
   */
  getNextPhase(context: PhaseTransitionContext): CombatPhase {
    const { currentState, encounter } = context;

    switch (currentState.phase) {
      case 'deployment':
        // Transition to enemy-deployment when all units deployed
        // (This is triggered by "Enter Combat" button click)
        return 'enemy-deployment';

      case 'enemy-deployment':
        // Transition to battle after enemy deployment animation completes
        return 'battle';

      case 'battle':
        // Check victory condition
        if (this.isVictoryConditionMet(currentState, encounter)) {
          return 'victory';
        }

        // Check defeat condition
        if (this.isDefeatConditionMet(currentState, encounter)) {
          return 'defeat';
        }

        // Continue battle
        return 'battle';

      case 'victory':
      case 'defeat':
        // Terminal phases - no transition
        return currentState.phase;

      default:
        console.warn(`Unknown phase: ${currentState.phase}`);
        return currentState.phase;
    }
  }

  /**
   * Check if phase is ready to transition
   * Returns true if the phase has completed and should move to next phase
   */
  canTransition(currentPhase: CombatPhase, completionSignal?: string): boolean {
    switch (currentPhase) {
      case 'deployment':
        // Deployment transitions on explicit signal (button click)
        return completionSignal === 'deployment-complete';

      case 'enemy-deployment':
        // Enemy deployment transitions on animation complete signal
        return completionSignal === 'animation-complete';

      case 'battle':
        // Battle transitions on victory/defeat condition
        // (checked in getNextPhase)
        return false;

      case 'victory':
      case 'defeat':
        // Terminal phases never transition
        return false;

      default:
        return false;
    }
  }

  /**
   * Check if all enemies are defeated (victory condition)
   */
  private isVictoryConditionMet(state: CombatState, encounter: CombatEncounter): boolean {
    // Get all units from manifest
    const allUnits = state.unitManifest.getAllUnits();

    // Find all enemy units (units that match enemy spawns)
    const enemyUnits = allUnits.filter(placement => {
      return encounter.enemySpawns.some(spawn =>
        spawn.x === placement.position.x && spawn.y === placement.position.y
      );
    });

    // Victory if all enemies defeated (or no enemies exist)
    if (enemyUnits.length === 0) {
      return true;
    }

    // Check if all enemy units are dead (HP <= 0)
    const allEnemiesDead = enemyUnits.every(placement => {
      const unit = placement.unit;
      return 'currentHp' in unit && unit.currentHp <= 0;
    });

    return allEnemiesDead;
  }

  /**
   * Check if all player units are defeated (defeat condition)
   */
  private isDefeatConditionMet(state: CombatState, encounter: CombatEncounter): boolean {
    // Get all units from manifest
    const allUnits = state.unitManifest.getAllUnits();

    // Find all player units (units that match player deployment zones)
    const playerUnits = allUnits.filter(placement => {
      return encounter.playerDeploymentZones.some(zone =>
        zone.x === placement.position.x && zone.y === placement.position.y
      );
    });

    // Defeat if no player units exist
    if (playerUnits.length === 0) {
      return true;
    }

    // Check if all player units are dead (HP <= 0)
    const allPlayersDead = playerUnits.every(placement => {
      const unit = placement.unit;
      return 'currentHp' in unit && unit.currentHp <= 0;
    });

    return allPlayersDead;
  }

  /**
   * Get a user-friendly name for a phase
   */
  getPhaseName(phase: CombatPhase): string {
    switch (phase) {
      case 'deployment': return 'Deployment';
      case 'enemy-deployment': return 'Enemy Deployment';
      case 'battle': return 'Battle';
      case 'victory': return 'Victory';
      case 'defeat': return 'Defeat';
      default: return 'Unknown';
    }
  }

  /**
   * Check if a phase is a terminal phase (no further transitions)
   */
  isTerminalPhase(phase: CombatPhase): boolean {
    return phase === 'victory' || phase === 'defeat';
  }
}
```

---

#### Step 5.2: Update EnemyDeploymentPhaseHandler to Signal Completion
**File**: `react-app/src/models/combat/EnemyDeploymentPhaseHandler.ts`

**Add animation tracking and completion signal**:
```typescript
// BEFORE
export class EnemyDeploymentPhaseHandler extends PhaseBase {
  protected updatePhase(
    state: CombatState,
    _encounter: CombatEncounter,
    _deltaTime: number
  ): CombatState | null {
    // TODO: Implement enemy deployment animations and logic
    return state; // Return state to stay in this phase
  }
}

// AFTER
export class EnemyDeploymentPhaseHandler extends PhaseBase {
  private animationDuration = 2.0; // 2 second deployment animation
  private animationComplete = false;

  protected updatePhase(
    state: CombatState,
    _encounter: CombatEncounter,
    _deltaTime: number
  ): CombatState | null {
    // Check if animation duration has elapsed
    if (this.getElapsedTime() >= this.animationDuration && !this.animationComplete) {
      this.animationComplete = true;
      // Signal transition via return null
      return null;
    }

    // Continue animation
    return state;
  }

  /**
   * Reset animation state when phase starts
   */
  onPhaseEnter(): void {
    this.resetElapsedTime();
    this.animationComplete = false;
  }
}
```

---

#### Step 5.3: Add Phase Lifecycle Hooks to PhaseBase
**File**: `react-app/src/models/combat/PhaseBase.ts`

**Add lifecycle hooks**:
```typescript
export abstract class PhaseBase implements CombatPhaseHandler {
  protected elapsedTime = 0;

  /**
   * Called when the phase starts
   * Override to perform initialization
   */
  onPhaseEnter?(): void;

  /**
   * Called when the phase ends
   * Override to perform cleanup
   */
  onPhaseExit?(): void;

  // ... existing code ...
}
```

---

#### Step 5.4: Update CombatView to Use PhaseTransitionManager
**File**: `react-app/src/components/combat/CombatView.tsx`

**Import the manager**:
```typescript
import { PhaseTransitionManager } from '../../models/combat/PhaseTransitionManager';
```

**Create instance**:
```typescript
// Create phase transition manager
const transitionManager = useMemo(() => new PhaseTransitionManager(), []);
```

**Update phase switching logic** (around line 60-68):
```typescript
// BEFORE
useEffect(() => {
  if (combatState.phase === 'deployment') {
    phaseHandlerRef.current = new DeploymentPhaseHandler(uiStateManager);
  } else if (combatState.phase === 'enemy-deployment') {
    phaseHandlerRef.current = new EnemyDeploymentPhaseHandler();
  }
  // Add other phase handlers as needed (battle, victory, defeat)
}, [combatState.phase, uiStateManager]);

// AFTER
useEffect(() => {
  // Exit previous phase
  if (phaseHandlerRef.current.onPhaseExit) {
    phaseHandlerRef.current.onPhaseExit();
  }

  // Create new phase handler
  if (combatState.phase === 'deployment') {
    phaseHandlerRef.current = new DeploymentPhaseHandler(uiStateManager);
  } else if (combatState.phase === 'enemy-deployment') {
    phaseHandlerRef.current = new EnemyDeploymentPhaseHandler();
  }
  // Add other phase handlers as needed (battle, victory, defeat)

  // Enter new phase
  if (phaseHandlerRef.current.onPhaseEnter) {
    phaseHandlerRef.current.onPhaseEnter();
  }
}, [combatState.phase, uiStateManager]);
```

**Update animation loop to handle phase transitions** (around line 515-520):
```typescript
// BEFORE
if (!cinematicPlaying && phaseHandlerRef.current.update) {
  phaseHandlerRef.current.update(combatState, encounter, deltaTime);
}

// AFTER
if (!cinematicPlaying && phaseHandlerRef.current.update) {
  const updatedState = phaseHandlerRef.current.update(combatState, encounter, deltaTime);

  // Check if phase wants to transition (returns null)
  if (updatedState === null) {
    // Phase is complete, transition to next phase
    const nextPhase = transitionManager.getNextPhase({
      currentState: combatState,
      encounter
    });

    if (nextPhase !== combatState.phase) {
      console.log(`Transitioning from ${combatState.phase} to ${nextPhase}`);
      combatLogManager.addMessage(`[color=#ffaa00]${transitionManager.getPhaseName(nextPhase)}[/color]`);
      setCombatState({ ...combatState, phase: nextPhase });
    }
  }
}
```

**Update "Enter Combat" button callback** (around line 441-444):
```typescript
// BEFORE
onEnterCombat: () => {
  combatLogManager.addMessage(CombatConstants.TEXT.STARTING_ENEMY_DEPLOYMENT);
  setCombatState({ ...combatState, phase: 'enemy-deployment' });
}

// AFTER
onEnterCombat: () => {
  // Use transition manager for consistent phase transitions
  const nextPhase = transitionManager.getNextPhase({
    currentState: combatState,
    encounter
  });

  combatLogManager.addMessage(CombatConstants.TEXT.STARTING_ENEMY_DEPLOYMENT);
  setCombatState({ ...combatState, phase: nextPhase });
}
```

---

#### Step 5.5: Add Phase Transition Tests
**File**: `react-app/src/models/combat/PhaseTransitionManager.test.ts` (NEW FILE)

**Create unit tests**:
```typescript
import { describe, it, expect } from 'vitest';
import { PhaseTransitionManager } from './PhaseTransitionManager';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';
import { CombatMap } from './CombatMap';
import { CombatUnitManifest } from './CombatUnitManifest';

describe('PhaseTransitionManager', () => {
  const manager = new PhaseTransitionManager();

  const createMockState = (phase: CombatState['phase']): CombatState => ({
    turnNumber: 0,
    map: new CombatMap(10, 10),
    tilesetId: 'default',
    phase,
    unitManifest: new CombatUnitManifest(),
  });

  const createMockEncounter = (): CombatEncounter => ({
    id: 'test-encounter',
    name: 'Test Encounter',
    map: new CombatMap(10, 10),
    tilesetId: 'default',
    playerDeploymentZones: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
    enemySpawns: [
      { x: 9, y: 9, monsterId: 'goblin' },
    ],
  });

  describe('getNextPhase', () => {
    it('transitions from deployment to enemy-deployment', () => {
      const state = createMockState('deployment');
      const encounter = createMockEncounter();

      const nextPhase = manager.getNextPhase({ currentState: state, encounter });
      expect(nextPhase).toBe('enemy-deployment');
    });

    it('transitions from enemy-deployment to battle', () => {
      const state = createMockState('enemy-deployment');
      const encounter = createMockEncounter();

      const nextPhase = manager.getNextPhase({ currentState: state, encounter });
      expect(nextPhase).toBe('battle');
    });

    it('stays in battle phase when combat ongoing', () => {
      const state = createMockState('battle');
      const encounter = createMockEncounter();

      const nextPhase = manager.getNextPhase({ currentState: state, encounter });
      expect(nextPhase).toBe('battle');
    });

    it('stays in victory phase (terminal)', () => {
      const state = createMockState('victory');
      const encounter = createMockEncounter();

      const nextPhase = manager.getNextPhase({ currentState: state, encounter });
      expect(nextPhase).toBe('victory');
    });

    it('stays in defeat phase (terminal)', () => {
      const state = createMockState('defeat');
      const encounter = createMockEncounter();

      const nextPhase = manager.getNextPhase({ currentState: state, encounter });
      expect(nextPhase).toBe('defeat');
    });
  });

  describe('canTransition', () => {
    it('allows deployment transition with correct signal', () => {
      expect(manager.canTransition('deployment', 'deployment-complete')).toBe(true);
    });

    it('blocks deployment transition without signal', () => {
      expect(manager.canTransition('deployment', undefined)).toBe(false);
    });

    it('allows enemy-deployment transition with animation-complete signal', () => {
      expect(manager.canTransition('enemy-deployment', 'animation-complete')).toBe(true);
    });

    it('blocks terminal phase transitions', () => {
      expect(manager.canTransition('victory', 'any-signal')).toBe(false);
      expect(manager.canTransition('defeat', 'any-signal')).toBe(false);
    });
  });

  describe('isTerminalPhase', () => {
    it('identifies victory as terminal', () => {
      expect(manager.isTerminalPhase('victory')).toBe(true);
    });

    it('identifies defeat as terminal', () => {
      expect(manager.isTerminalPhase('defeat')).toBe(true);
    });

    it('identifies non-terminal phases', () => {
      expect(manager.isTerminalPhase('deployment')).toBe(false);
      expect(manager.isTerminalPhase('enemy-deployment')).toBe(false);
      expect(manager.isTerminalPhase('battle')).toBe(false);
    });
  });

  describe('getPhaseName', () => {
    it('returns friendly names for all phases', () => {
      expect(manager.getPhaseName('deployment')).toBe('Deployment');
      expect(manager.getPhaseName('enemy-deployment')).toBe('Enemy Deployment');
      expect(manager.getPhaseName('battle')).toBe('Battle');
      expect(manager.getPhaseName('victory')).toBe('Victory');
      expect(manager.getPhaseName('defeat')).toBe('Defeat');
    });
  });
});
```

---

### Testing Checklist for Priority 5

- [ ] Unit tests pass for PhaseTransitionManager
- [ ] Deployment phase transitions to enemy-deployment when button clicked
- [ ] Enemy-deployment phase transitions to battle after 2 seconds
- [ ] Combat log shows phase transition messages
- [ ] onPhaseEnter/onPhaseExit hooks are called
- [ ] Victory/defeat conditions work correctly (when implemented)
- [ ] No manual phase transitions remaining in code

---

## Implementation Order Recommendation

### Phase 1: Quick Wins (1 hour)
1. **Priority 3**: Remove deprecated methods (15-30 min)
2. **Priority 4**: Type-safe click results (1 hr)

**Why first**: These are low-risk, high-value improvements that clean up the codebase without changing behavior.

### Phase 2: Event System Improvements (2-3 hours)
3. **Priority 1**: Unify event result handling (2-3 hrs)

**Why second**: Builds on type-safe foundations from Phase 1, significantly improves event handling architecture.

### Phase 3: Infrastructure (3-5 hours)
4. **Priority 2**: Centralize font loading (1-2 hrs)
5. **Priority 5**: Phase transition formalization (2-3 hrs)

**Why last**: These are larger refactors that touch more files, but benefit from the cleaner foundation established in Phases 1 & 2.

---

## Validation Criteria

After completing all refactors, verify:

### Functional
- [ ] All deployment phase features work unchanged
- [ ] Enemy deployment transitions correctly
- [ ] No console errors or warnings
- [ ] All existing tests pass
- [ ] New tests pass (Priority 5)

### Code Quality
- [ ] No `any` type casts in event handling
- [ ] No deprecated methods in PhaseBase
- [ ] Single font loading system
- [ ] Centralized phase transition logic
- [ ] Generic PhaseEventResult data field used

### Performance
- [ ] No duplicate font loading (check network tab)
- [ ] No performance regression in rendering
- [ ] Animation frame rate unchanged

---

## Rollback Plan

If issues arise during refactoring:

1. **Each priority is independent** - can roll back individual refactors
2. **Use git branches** - one branch per priority
3. **Test after each priority** - don't stack unverified changes
4. **Keep deprecated code temporarily** - mark as deprecated before removing

**Branch strategy**:
```bash
git checkout -b refactor/priority-3-remove-deprecated
# Make changes, test, commit
git checkout main
git merge refactor/priority-3-remove-deprecated

git checkout -b refactor/priority-4-type-safe-clicks
# etc.
```

---

## Future Considerations

After completing these refactors, consider:

1. **Add more unit tests** for phase handlers
2. **Extract event handlers** from CombatView into custom hook
3. **Document phase lifecycle** in architecture docs
4. **Create phase handler template** for future phases
5. **Add TypeScript strict mode** to catch more type issues

---

## Summary

This refactor plan addresses all identified improvement areas with:
- **Clear priorities** (1-5, independent)
- **Detailed step-by-step instructions**
- **Type-safe patterns**
- **Testing checklists**
- **Estimated effort** (8-11 hours total)
- **Rollback strategy**

**Start with Priority 3 or 4** for quick wins, then tackle the larger architectural improvements in Priorities 1, 2, and 5.
