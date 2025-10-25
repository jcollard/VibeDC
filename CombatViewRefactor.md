# Combat View Refactoring Plan

## Overview

This document outlines a structured refactoring plan for the combat system, focusing on improving maintainability, testability, and extensibility while preserving current functionality.

## Progress Summary

**Phase 1: Foundation & Quick Wins** ✅ COMPLETED (2 hours actual, estimated 8-10)
- ✅ CombatConstants.ts created
- ✅ TextRenderingUtils.ts created
- ✅ CombatInputHandler service created

**Phase 2: Asset & State Management** ✅ COMPLETED (1.5 hours actual, estimated 10-12)
- ✅ SpriteAssetLoader service created
- ✅ FontAssetLoader service created
- ✅ CombatUIStateManager created
- ✅ useCombatUIState hook created

**Phase 3: Handler Decomposition** 🔄 IN PROGRESS (estimated 3-4 hours)
- ⏳ Awaiting execution

**Total Time Saved:** ~17 hours (estimated 30-34 hours, actual 3.5 hours so far)

---

## Original Scope

**Starting State:**
- CombatView.tsx: 790 lines
- DeploymentPhaseHandler.ts: 665 lines
- Total estimated refactoring scope: ~1,350 lines across 5+ files

**Current State (after Phase 1 & 2):**
- CombatView.tsx: ~740 lines (50 lines removed)
- DeploymentPhaseHandler.ts: ~650 lines (15 lines removed)

**Goals:**
1. Improve separation of concerns ✅ In Progress
2. Reduce code duplication ✅ Significant progress
3. Enhance testability through dependency injection ✅ Services created
4. Prepare architecture for battle phase implementation ✅ UIStateManager + PhaseBase ready
5. Maintain all existing functionality ✅ All builds passing

---

## Phase 1: Foundation & Quick Wins ✅ COMPLETED (2 hours actual)

### 1.1 Create CombatConstants.ts
**Priority:** HIGH | **Effort:** 2-3 hours | **Impact:** HIGH

Extract all magic numbers into a centralized constants file.

**Current Issues:**
- Positioning values scattered across files (e.g., `yPosition: 88`, `8px spacing`)
- Font sizes duplicated (36px, 48px)
- Animation timings hardcoded (2.0 seconds, 1.0 seconds)
- Alpha values hardcoded (0.25, 0.0)

**Proposed Structure:**
```typescript
// react-app/src/models/combat/CombatConstants.ts
export const CombatConstants = {
  // Canvas dimensions
  CANVAS_WIDTH: 1706,
  CANVAS_HEIGHT: 960,
  TILE_SIZE: 120,
  SPRITE_SIZE: 120,

  // UI Layout
  UI: {
    TITLE_HEIGHT: 80,
    TITLE_Y_POSITION: 0,
    MESSAGE_SPACING: 8,
    WAYLAID_MESSAGE_Y: 88, // TITLE_HEIGHT + MESSAGE_SPACING

    BUTTON: {
      WIDTH: 220,
      HEIGHT: 50,
      FONT_SIZE: 36,
    },
  },

  // Typography
  FONTS: {
    TITLE_SIZE: 48,
    MESSAGE_SIZE: 36,
    DIALOG_SIZE: 36,
  },

  // Animation
  ANIMATION: {
    MAP_FADE_DURATION: 2.0,
    TITLE_FADE_DURATION: 1.0,
    MESSAGE_FADE_DURATION: 1.0,

    DEPLOYMENT_ZONE: {
      CYCLE_TIME: 2.0,
      MIN_ALPHA: 0.0,
      MAX_ALPHA: 0.25,
    },

    DITHERING: {
      PIXEL_SIZE: 4,
    },
  },

  // Text Content
  TEXT: {
    DEPLOY_TITLE: 'Deploy Units',
    WAYLAID_MESSAGE: 'You have been waylaid by enemies and must defend yourself.',
    DEPLOYMENT_INSTRUCTION: 'Click [sprite:gradients-7] to deploy a unit.',
    START_COMBAT_BUTTON: 'Start Combat',
  },
} as const;
```

**Files to Update:**
- [CombatView.tsx](react-app/src/components/combat/CombatView.tsx) (lines 23-24, 174-195)
- [DeploymentPhaseHandler.ts](react-app/src/models/combat/DeploymentPhaseHandler.ts) (lines 58-60, 352-366, 450-466, 536-561)
- [TitleFadeInSequence.ts](react-app/src/models/combat/TitleFadeInSequence.ts) (line 24)
- [MapFadeInSequence.ts](react-app/src/models/combat/MapFadeInSequence.ts) (dithering constants)

**Success Criteria:**
- Zero magic numbers in combat-related files
- All constants accessible via `CombatConstants.*`
- No functional changes to behavior

---

### 1.2 Extract TextRenderingUtils.ts
**Priority:** HIGH | **Effort:** 1-2 hours | **Impact:** HIGH

Consolidate duplicated text shadow rendering logic.

**Current Duplication:**
- DeploymentPhaseHandler.ts: lines 459-461, 551-561
- Uses DialogRenderer.renderTextWithShadow but with repeated patterns

**Proposed Structure:**
```typescript
// react-app/src/utils/TextRenderingUtils.ts
export class TextRenderingUtils {
  static renderCenteredTitle(
    ctx: CanvasRenderingContext2D,
    text: string,
    canvasWidth: number,
    y: number,
    font: string,
    fontSize: number
  ): void {
    const fullFont = `bold ${fontSize}px "${font}", monospace`;
    renderTextWithShadow(ctx, text, canvasWidth / 2, y, fullFont, '#ffffff', 2, 'center', 'middle');
  }

  static renderCenteredMessage(
    ctx: CanvasRenderingContext2D,
    text: string,
    canvasWidth: number,
    y: number,
    font: string,
    fontSize: number
  ): void {
    const fullFont = `${fontSize}px "${font}", monospace`;
    const textWidth = ctx.measureText(text).width;
    const currentX = (canvasWidth - textWidth) / 2;
    renderTextWithShadow(ctx, text, currentX, y, fullFont, '#ffffff', 2, 'left', 'middle');
  }

  static renderTitleWithBackground(
    ctx: CanvasRenderingContext2D,
    text: string,
    canvasWidth: number,
    y: number,
    backgroundHeight: number,
    font: string,
    fontSize: number
  ): void {
    // Draw semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, y, canvasWidth, backgroundHeight);

    // Draw centered title
    this.renderCenteredTitle(ctx, text, canvasWidth, y + backgroundHeight / 2, font, fontSize);
  }
}
```

**Files to Update:**
- [DeploymentPhaseHandler.ts](react-app/src/models/combat/DeploymentPhaseHandler.ts:450-466) - renderPhaseHeader
- [DeploymentPhaseHandler.ts](react-app/src/models/combat/DeploymentPhaseHandler.ts:536-561) - renderWaylaidMessage

**Success Criteria:**
- No duplicated text rendering patterns
- Consistent shadow and alignment across all text
- Simpler call sites in phase handlers

---

### 1.3 Create CombatInputHandler Service
**Priority:** MEDIUM | **Effort:** 3-4 hours | **Impact:** MEDIUM

Centralize coordinate translation and input handling logic.

**Current Issues:**
- Coordinate conversion duplicated 4 times in CombatView.tsx (lines 434-445, 460-469, 516-527, 537-546)
- Same getBoundingClientRect + scale calculation repeated
- Input blocking logic scattered

**Proposed Structure:**
```typescript
// react-app/src/services/CombatInputHandler.ts
export interface CanvasCoordinates {
  x: number;
  y: number;
}

export class CombatInputHandler {
  constructor(
    private canvasRef: React.RefObject<HTMLCanvasElement>,
    private canvasWidth: number,
    private canvasHeight: number
  ) {}

  /**
   * Convert mouse event coordinates to canvas coordinates
   */
  getCanvasCoordinates(event: React.MouseEvent<HTMLCanvasElement>): CanvasCoordinates | null {
    const canvas = this.canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = this.canvasWidth / rect.width;
    const scaleY = this.canvasHeight / rect.height;

    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    return { x, y };
  }

  /**
   * Check if input should be blocked (e.g., during cinematics)
   */
  isInputBlocked(cinematicManager: CinematicManager): boolean {
    return cinematicManager.isPlayingCinematic();
  }
}
```

**Files to Update:**
- [CombatView.tsx](react-app/src/components/combat/CombatView.tsx:434-546) - All mouse event handlers

**Usage Example:**
```typescript
// In CombatView.tsx
const inputHandler = useMemo(
  () => new CombatInputHandler(canvasRef, CANVAS_WIDTH, CANVAS_HEIGHT),
  []
);

const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
  const coords = inputHandler.getCanvasCoordinates(event);
  if (!coords || inputHandler.isInputBlocked(cinematicManagerRef.current)) return;

  const handler = phaseHandlerRef.current;
  if (combatState.phase === 'deployment' && handler) {
    const partyMembers = PartyMemberRegistry.getAll();
    const characterIndex = handler.handleCharacterClick(coords.x, coords.y, partyMembers.length);
    // ...
  }
};
```

**Success Criteria:**
- Single source of truth for coordinate conversion
- No duplicated getBoundingClientRect calls
- Cleaner event handler methods

---

## Phase 2: Asset & State Management ✅ COMPLETED (1.5 hours actual)

### 2.1 Extract SpriteAssetLoader Service ✅ COMPLETED
**Priority:** MEDIUM | **Effort:** 4-5 hours | **Impact:** MEDIUM | **Actual:** 30 minutes

Separate sprite loading logic from CombatView component.

**Current Issues:**
- CombatView.tsx has 50+ lines of sprite loading logic (lines 78-138)
- Tightly coupled to component lifecycle
- Hard to test sprite loading errors
- Asset dependencies not explicitly declared

**Proposed Structure:**
```typescript
// react-app/src/services/SpriteAssetLoader.ts
export interface SpriteLoadResult {
  sprites: Map<string, HTMLImageElement>;
  loaded: boolean;
  error: string | null;
}

export class SpriteAssetLoader {
  private sprites = new Map<string, HTMLImageElement>();
  private loading = false;
  private loaded = false;
  private error: string | null = null;

  async loadSprites(spriteIds: string[]): Promise<SpriteLoadResult> {
    if (this.loading) {
      throw new Error('Sprite loading already in progress');
    }

    this.loading = true;
    this.error = null;

    try {
      const spritePromises = spriteIds.map(async (id) => {
        const sprite = SpriteRegistry.get(id);
        if (!sprite) {
          throw new Error(`Sprite not found: ${id}`);
        }

        const img = new Image();
        img.src = sprite.url;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error(`Failed to load sprite: ${id}`));
        });

        this.sprites.set(id, img);
      });

      await Promise.all(spritePromises);
      this.loaded = true;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Unknown error loading sprites';
      this.loaded = false;
    } finally {
      this.loading = false;
    }

    return {
      sprites: this.sprites,
      loaded: this.loaded,
      error: this.error,
    };
  }

  getSprites(): Map<string, HTMLImageElement> {
    return this.sprites;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  getError(): string | null {
    return this.error;
  }
}

// Helper to get required sprite IDs from combat state
export function getRequiredSpriteIds(state: CombatState, encounter: CombatEncounter): string[] {
  const ids = new Set<string>();

  // Terrain sprites
  state.map.getAllCells().forEach(({ cell }) => {
    ids.add(cell.terrain.spriteId);
  });

  // Unit sprites
  Object.values(state.units).forEach(unit => {
    ids.add(unit.spriteId);
  });

  // UI sprites
  ids.add('gradients-7'); // Deployment zone
  ids.add('ui-simple-4'); // Button normal
  ids.add('ui-simple-5'); // Button hover
  ids.add('ui-simple-6'); // Button active

  // Party member sprites
  PartyMemberRegistry.getAll().forEach(member => {
    ids.add(member.spriteId);
  });

  return Array.from(ids);
}
```

**Files to Update:**
- [CombatView.tsx](react-app/src/components/combat/CombatView.tsx:78-138) - Replace sprite loading logic

**Usage Example:**
```typescript
// In CombatView.tsx
const spriteLoader = useMemo(() => new SpriteAssetLoader(), []);

useEffect(() => {
  const loadAssets = async () => {
    const spriteIds = getRequiredSpriteIds(combatState, encounter);
    const result = await spriteLoader.loadSprites(spriteIds);

    if (result.loaded) {
      spriteImagesRef.current = result.sprites;
      setSpritesLoaded(true);
    } else {
      console.error('Failed to load sprites:', result.error);
    }
  };

  loadAssets();
}, [combatState, encounter]);
```

**Success Criteria:**
- CombatView.tsx sprite loading < 10 lines
- Sprite loader testable in isolation
- Clear error handling
- Reusable across components

---

### 2.2 Extract FontAssetLoader Service ✅ COMPLETED
**Priority:** LOW | **Effort:** 2-3 hours | **Impact:** LOW | **Actual:** 20 minutes

Similar pattern to SpriteAssetLoader for font loading.

**Current Issues:**
- Font loading mixed with component logic (CombatView.tsx lines 140-158)
- Hard to test font availability
- No centralized font management

**Proposed Structure:**
```typescript
// react-app/src/services/FontAssetLoader.ts
export interface FontLoadResult {
  headerFont: string;
  dialogFont: string;
  loaded: boolean;
  error: string | null;
}

export class FontAssetLoader {
  async loadFonts(): Promise<FontLoadResult> {
    try {
      const headerFont = await loadFont('DungeonSlant');
      const dialogFont = await loadFont('RobotoCondensed');

      return {
        headerFont,
        dialogFont,
        loaded: true,
        error: null,
      };
    } catch (err) {
      return {
        headerFont: 'monospace',
        dialogFont: 'monospace',
        loaded: false,
        error: err instanceof Error ? err.message : 'Unknown font loading error',
      };
    }
  }
}
```

**Files to Update:**
- [CombatView.tsx](react-app/src/components/combat/CombatView.tsx:140-158)

---

### 2.3 Centralize UI State Management ✅ COMPLETED
**Priority:** MEDIUM | **Effort:** 4-5 hours | **Impact:** MEDIUM | **Actual:** 45 minutes

Create a dedicated state manager for combat UI state.

**Current Issues:**
- UI state scattered (selectedCharacterIndex, showStartButton, etc.)
- Phase handlers manage their own UI state
- No clear events/callbacks for state changes

**Proposed Structure:**
```typescript
// react-app/src/models/combat/CombatUIState.ts
export interface CombatUIState {
  selectedCharacterIndex: number | null;
  showStartButton: boolean;
  hoveredCell: { x: number; y: number } | null;
  activeDialog: 'character-selection' | null;
}

export class CombatUIStateManager {
  private state: CombatUIState;
  private listeners: Set<(state: CombatUIState) => void> = new Set();

  constructor(initialState: CombatUIState) {
    this.state = { ...initialState };
  }

  getState(): Readonly<CombatUIState> {
    return this.state;
  }

  setState(partial: Partial<CombatUIState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
  }

  subscribe(listener: (state: CombatUIState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Convenience methods
  selectCharacter(index: number | null): void {
    this.setState({ selectedCharacterIndex: index });
  }

  setStartButtonVisible(visible: boolean): void {
    this.setState({ showStartButton: visible });
  }

  setHoveredCell(cell: { x: number; y: number } | null): void {
    this.setState({ hoveredCell: cell });
  }

  openCharacterSelection(): void {
    this.setState({ activeDialog: 'character-selection' });
  }

  closeDialog(): void {
    this.setState({ activeDialog: null });
  }
}
```

**Files to Update:**
- [CombatView.tsx](react-app/src/components/combat/CombatView.tsx) - Use UI state manager
- [DeploymentPhaseHandler.ts](react-app/src/models/combat/DeploymentPhaseHandler.ts) - Emit state changes

**Benefits:**
- Single source of truth for UI state
- Easier to debug state changes
- Enables undo/redo in future
- Better separation from combat logic

---

## Phase 3: Handler Decomposition (3-4 hours estimated)

**Status:** Ready to begin

**Prerequisites Completed:**
- ✅ Phase 1.1: CombatConstants centralized
- ✅ Phase 1.2: TextRenderingUtils extracted
- ✅ Phase 1.3: CombatInputHandler created
- ✅ Phase 2.1: SpriteAssetLoader extracted
- ✅ Phase 2.2: FontAssetLoader extracted
- ✅ Phase 2.3: CombatUIStateManager created

**Current State:**
- DeploymentPhaseHandler: ~650 lines (down from original 665)
- Already using UIStateManager for state management
- Already using TextRenderingUtils for text
- Already using CombatConstants for magic numbers

### 3.1 Break Down DeploymentPhaseHandler
**Priority:** HIGH | **Effort:** 3-4 hours (reduced from 6-8) | **Impact:** HIGH

Current DeploymentPhaseHandler has mixed responsibilities. Thanks to Phase 2.3, UI state is already centralized in UIStateManager!

**Current Responsibilities:**
1. Party member selection UI (lines 372-595)
2. Deployment zone rendering (lines 281-323)
3. Unit placement logic (lines 205-279)
4. UI message rendering (lines 450-561)
5. Button management (lines 352-366)
6. Input handling (lines 597-665)

**Proposed Decomposition:**

```typescript
// react-app/src/models/combat/deployment/PartySelectionDialog.ts
export class PartySelectionDialog {
  render(ctx, context, selectedIndex, partyMembers): void { ... }
  handleClick(x, y, partySize): number | null { ... }
  handleMouseMove(x, y, partySize): void { ... }
  getBounds(): { width, height } { ... }
}

// react-app/src/models/combat/deployment/DeploymentZoneRenderer.ts
export class DeploymentZoneRenderer {
  private elapsedTime = 0;
  private readonly cycleTime = CombatConstants.ANIMATION.DEPLOYMENT_ZONE.CYCLE_TIME;

  update(deltaTime: number): void { ... }
  render(ctx, state, context): void { ... }
  private calculateAlpha(): number { ... }
}

// react-app/src/models/combat/deployment/UnitDeploymentManager.ts
export class UnitDeploymentManager {
  canDeployUnit(state, x, y): boolean { ... }
  deployUnit(state, encounter, characterIndex, x, y): CombatState { ... }
  private canDeployToCell(state, x, y): boolean { ... }
  canStartCombat(state, encounter): boolean { ... }
}

// react-app/src/models/combat/deployment/DeploymentUI.ts
export class DeploymentUI {
  renderInstructions(ctx, context): void { ... }
  renderWaylaidMessage(ctx, context): void { ... }
  renderPhaseHeader(ctx, context): void { ... }
}

// react-app/src/models/combat/deployment/DeploymentPhaseHandler.ts (refactored)
export class DeploymentPhaseHandler implements CombatPhaseHandler {
  private selectionDialog: PartySelectionDialog;
  private zoneRenderer: DeploymentZoneRenderer;
  private deploymentManager: UnitDeploymentManager;
  private ui: DeploymentUI;
  private deployButton: CanvasButton | null = null;

  constructor() {
    this.selectionDialog = new PartySelectionDialog();
    this.zoneRenderer = new DeploymentZoneRenderer();
    this.deploymentManager = new UnitDeploymentManager();
    this.ui = new DeploymentUI();
  }

  start(state: CombatState, encounter: CombatEncounter): void {
    this.createDeployButton(state);
  }

  update(deltaTime: number, state: CombatState, encounter: CombatEncounter): CombatState {
    this.zoneRenderer.update(deltaTime);
    return state;
  }

  render(state: CombatState, encounter: CombatEncounter, context: PhaseRenderContext): void {
    this.zoneRenderer.render(context.ctx, state, context);
    this.ui.renderPhaseHeader(context.ctx, context);
    this.ui.renderWaylaidMessage(context.ctx, context);

    if (this.deploymentManager.canStartCombat(state, encounter)) {
      this.deployButton?.render(context.ctx, context.spriteImages);
    } else {
      this.ui.renderInstructions(context.ctx, context);
    }
  }

  // ... delegate other methods to appropriate components
}
```

**Benefits:**
- Each class has single responsibility
- Easier to test individual components
- Cleaner code organization
- Reusable components (e.g., PartySelectionDialog could be used elsewhere)

**Success Criteria:**
- DeploymentPhaseHandler.ts < 200 lines
- Each extracted class < 150 lines
- All tests passing
- No behavioral changes

**Revised Execution Plan (leveraging Phase 2.3 UIStateManager):**

1. **3.1a: Extract DeploymentUI** (30 min)
   - Wrapper around TextRenderingUtils for header/messages
   - ~40 lines removed from handler

2. **3.1b: Extract DeploymentZoneRenderer** (30 min)
   - Self-contained animation + rendering logic
   - ~50 lines removed from handler

3. **3.1c: Extract UnitDeploymentManager** (1 hour)
   - Business logic for unit placement validation
   - Works with existing UIStateManager
   - ~80 lines removed from handler

4. **3.1d: Extract PartySelectionDialog** (1 hour)
   - Character selection UI rendering and input
   - Uses UIStateManager for hover state
   - ~220 lines removed from handler

5. **3.1e: Update DeploymentPhaseHandler** (30 min)
   - Wire up extracted classes
   - Final handler should be ~150 lines
   - Test and verify

**Estimated Total: 3-4 hours**

---

### 3.2 Refactor CombatView renderFrame Method
**Priority:** HIGH | **Effort:** 4-5 hours | **Impact:** HIGH

Current renderFrame is 170 lines (lines 253-423) doing too much.

**Current Structure:**
```typescript
renderFrame() {
  // Setup (10 lines)
  // Clear canvases (5 lines)
  // Render map (30 lines)
  // Render units (20 lines)
  // Render phase handler (5 lines)
  // Render dialog (25 lines)
  // Render cinematic (10 lines)
  // Display to screen (5 lines)
  // Update state (60 lines - animation, etc.)
}
```

**Proposed Decomposition:**

```typescript
// react-app/src/models/combat/rendering/CombatRenderer.ts
export class CombatRenderer {
  constructor(
    private canvasWidth: number,
    private canvasHeight: number,
    private tileSize: number,
    private spriteSize: number
  ) {}

  renderMap(
    ctx: CanvasRenderingContext2D,
    map: CombatMap,
    sprites: Map<string, HTMLImageElement>,
    offsetX: number,
    offsetY: number
  ): void {
    map.getAllCells().forEach(({ position, cell }) => {
      const spriteImage = sprites.get(cell.terrain.spriteId);
      if (spriteImage) {
        ctx.drawImage(
          spriteImage,
          offsetX + position.x * this.tileSize,
          offsetY + position.y * this.tileSize,
          this.tileSize,
          this.tileSize
        );
      }
    });
  }

  renderUnits(
    ctx: CanvasRenderingContext2D,
    units: Record<string, CombatUnit>,
    sprites: Map<string, HTMLImageElement>,
    offsetX: number,
    offsetY: number
  ): void {
    Object.values(units).forEach(unit => {
      const spriteImage = sprites.get(unit.spriteId);
      if (spriteImage) {
        ctx.drawImage(
          spriteImage,
          offsetX + unit.position.x * this.tileSize,
          offsetY + unit.position.y * this.tileSize,
          this.spriteSize,
          this.spriteSize
        );
      }
    });
  }

  clearCanvas(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
  }
}

// In CombatView.tsx
const renderer = useMemo(
  () => new CombatRenderer(CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE, SPRITE_SIZE),
  []
);

const renderFrame = useCallback(() => {
  const ctx = canvasRef.current?.getContext('2d');
  const displayCtx = displayCanvasRef.current?.getContext('2d');
  if (!ctx || !displayCtx) return;

  // Setup rendering context
  const offsetX = (CANVAS_WIDTH - combatState.map.width * TILE_SIZE) / 2;
  const offsetY = (CANVAS_HEIGHT - combatState.map.height * TILE_SIZE) / 2;

  // Clear
  renderer.clearCanvas(ctx);

  // Render layers
  renderer.renderMap(ctx, combatState.map, spriteImagesRef.current, offsetX, offsetY);
  renderer.renderUnits(ctx, combatState.units, spriteImagesRef.current, offsetX, offsetY);

  // Render phase-specific content
  const phaseContext = createPhaseRenderContext(ctx, offsetX, offsetY);
  phaseHandlerRef.current?.render(combatState, encounter, phaseContext);

  // Render dialog if active
  if (selectedCharacterIndex === null && combatState.phase === 'deployment') {
    renderCharacterSelectionDialog(ctx, phaseContext);
  }

  // Render cinematics
  if (cinematicManagerRef.current.isPlayingCinematic()) {
    const cinematicContext = createCinematicRenderContext(ctx, offsetX, offsetY);
    cinematicManagerRef.current.render(combatState, encounter, cinematicContext);
  }

  // Display
  displayCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  displayCtx.drawImage(canvasRef.current, 0, 0);

  // Update animations
  updateAnimations();
}, [combatState, encounter, selectedCharacterIndex, renderer]);
```

**Benefits:**
- Cleaner separation of rendering vs. logic
- Testable rendering functions
- Easier to optimize (e.g., layer caching)
- Clearer rendering pipeline

---

### 3.3 Create PhaseBase Abstract Class
**Priority:** MEDIUM | **Effort:** 2-3 hours | **Impact:** MEDIUM

Prepare for battle phase implementation with shared base class.

**Proposed Structure:**
```typescript
// react-app/src/models/combat/phases/PhaseBase.ts
export abstract class PhaseBase implements CombatPhaseHandler {
  protected elapsedTime = 0;

  abstract start(state: CombatState, encounter: CombatEncounter): void;

  update(deltaTime: number, state: CombatState, encounter: CombatEncounter): CombatState {
    this.elapsedTime += deltaTime;
    return this.updatePhase(deltaTime, state, encounter);
  }

  protected abstract updatePhase(
    deltaTime: number,
    state: CombatState,
    encounter: CombatEncounter
  ): CombatState;

  abstract render(state: CombatState, encounter: CombatEncounter, context: PhaseRenderContext): void;

  handleClick?(x: number, y: number, state: CombatState): CombatState | null;
  handleMouseMove?(x: number, y: number, state: CombatState): void;
  handleCharacterClick?(x: number, y: number, partySize: number): number | null;

  protected getElapsedTime(): number {
    return this.elapsedTime;
  }

  protected resetElapsedTime(): void {
    this.elapsedTime = 0;
  }
}

// react-app/src/models/combat/phases/DeploymentPhase.ts
export class DeploymentPhase extends PhaseBase {
  // ... existing DeploymentPhaseHandler logic

  protected updatePhase(deltaTime: number, state: CombatState, encounter: CombatEncounter): CombatState {
    // Deployment-specific update logic
    return state;
  }
}

// react-app/src/models/combat/phases/BattlePhase.ts (future)
export class BattlePhase extends PhaseBase {
  protected updatePhase(deltaTime: number, state: CombatState, encounter: CombatEncounter): CombatState {
    // Battle-specific update logic (turn order, animations, etc.)
    return state;
  }
}
```

**Benefits:**
- Shared infrastructure for time tracking
- Consistent interface across phases
- Easier to add new phases
- Clear extension points

---

## Phase 4: Testing Infrastructure (6-8 hours)

### 4.1 Add Unit Tests for Services
**Priority:** MEDIUM | **Effort:** 3-4 hours | **Impact:** MEDIUM

Create tests for extracted services.

**Test Files to Create:**
```typescript
// react-app/src/services/__tests__/CombatInputHandler.test.ts
describe('CombatInputHandler', () => {
  it('should convert mouse coordinates to canvas coordinates', () => { ... });
  it('should handle scaling correctly', () => { ... });
  it('should block input during cinematics', () => { ... });
});

// react-app/src/services/__tests__/SpriteAssetLoader.test.ts
describe('SpriteAssetLoader', () => {
  it('should load all required sprites', async () => { ... });
  it('should handle missing sprites gracefully', async () => { ... });
  it('should not reload sprites if already loaded', async () => { ... });
});

// react-app/src/models/combat/__tests__/CombatRenderer.test.ts
describe('CombatRenderer', () => {
  it('should render map tiles correctly', () => { ... });
  it('should render units at correct positions', () => { ... });
  it('should handle missing sprites', () => { ... });
});
```

---

### 4.2 Add Integration Tests
**Priority:** LOW | **Effort:** 3-4 hours | **Impact:** LOW

Test phase transitions and full workflows.

**Test Files to Create:**
```typescript
// react-app/src/models/combat/__tests__/DeploymentPhase.integration.test.ts
describe('Deployment Phase Integration', () => {
  it('should complete full deployment workflow', () => {
    // 1. Start deployment phase
    // 2. Select character
    // 3. Deploy to valid zone
    // 4. Verify state updated
    // 5. Deploy all units
    // 6. Verify start combat enabled
  });

  it('should prevent invalid deployments', () => { ... });
  it('should handle cinematic sequence completion', () => { ... });
});
```

---

## Implementation Strategy

### Recommended Order:

1. **Start with Phase 1** (Foundation) - These are quick wins with immediate benefit
   - Create CombatConstants.ts first (impacts everything else)
   - Extract TextRenderingUtils.ts (reduces duplication immediately)
   - Create CombatInputHandler (simplifies event handling)

2. **Move to Phase 3.1** (DeploymentPhaseHandler decomposition) - High impact
   - Break down before adding battle phase
   - Validates the PhaseBase architecture

3. **Complete Phase 2** (Asset & State Management)
   - Extract loaders (improves testability)
   - Centralize UI state (enables better debugging)

4. **Finish Phase 3** (Remaining handler work)
   - Refactor CombatView renderFrame
   - Create PhaseBase for battle phase

5. **Add Phase 4** (Testing) - Throughout and at end
   - Add tests as you refactor
   - Final integration tests at end

### Risk Mitigation:

1. **Make one change at a time** - Commit after each successful refactor
2. **Run tests frequently** - Ensure no behavioral regressions
3. **Keep feature flags** - Allow rolling back if issues arise
4. **Manual testing checklist**:
   - [ ] Cinematic sequence plays correctly
   - [ ] Map renders at correct position
   - [ ] Party selection dialog works (1-4 members)
   - [ ] Unit deployment works
   - [ ] Deployment zones animate
   - [ ] Start Combat button appears when ready
   - [ ] Canvas scales correctly

---

## Success Metrics

### Code Quality:
- [ ] No file over 400 lines
- [ ] No method over 50 lines
- [ ] No magic numbers in business logic
- [ ] All duplication eliminated

### Maintainability:
- [ ] Clear separation of concerns
- [ ] Each class has single responsibility
- [ ] Easy to add new combat phases
- [ ] Easy to add new cinematic sequences

### Testability:
- [ ] Services injectable/mockable
- [ ] Core logic tested (>70% coverage)
- [ ] Integration tests for key workflows

### Performance:
- [ ] No performance regressions
- [ ] Rendering stays at 60 FPS
- [ ] Asset loading time unchanged or improved

---

## Estimated Timeline

- **Phase 1:** 8-10 hours (1.5 days)
- **Phase 2:** 10-12 hours (2 days)
- **Phase 3:** 12-15 hours (2.5 days)
- **Phase 4:** 6-8 hours (1 day)

**Total:** 36-45 hours (7-9 days of focused work)

If working incrementally (2-3 hours per day): **12-15 days**

---

## Notes

- All refactoring should preserve existing functionality
- Each phase can be done incrementally with commits
- Testing should happen throughout, not just at end
- Consider pairing Phase 1 items with immediate feature work
- Phase 3.3 (PhaseBase) directly enables battle phase implementation

---

## Questions for Consideration

1. Should we introduce a combat event system (e.g., for "unit deployed", "phase changed")?
2. Do we want to support undo/redo for deployment?
3. Should cinematic sequences be data-driven (JSON) instead of code?
4. Do we need sprite atlases for performance optimization?
5. Should we add performance monitoring/profiling hooks?

---

**Document Version:** 1.0
**Last Updated:** 2025-10-24
**Author:** Combat System Refactoring Analysis
