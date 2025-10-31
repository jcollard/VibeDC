# Victory Screen Feature - Design Overview

**Version:** 1.0
**Created:** 2025-10-31
**Related:** [CombatHierarchy.md](../../CombatHierarchy.md), [DefeatScreenFeatureOverview.md](../DefeatScreen/DefeatScreenFeatureOverview.md)

## Purpose

This document describes the Victory Screen feature for combat encounters. When the victory condition is met (by default, all enemy units are knocked out), the combat system transitions to a victory state that displays a modal overlay showing rewards (experience, gold, items) and allows players to select which items to loot before exiting the encounter.

## Feature Summary

The Victory Screen provides players with:
- Automatic detection of victory conditions at the end of each unit's turn
- Visual feedback through a semi-transparent overlay and centered modal panel
- Combat log message announcing victory
- Display of earned rewards: Experience points and gold
- Interactive item looting system with 0-8 items displayed in a 4x2 grid
- Item selection: Click items to toggle loot status (grey → yellow hover → green selected)
- Helper text showing "Click to loot" when hovering over items
- "Loot All" button to automatically select all items
- "Exit Encounter" button to leave combat (future implementation)
- Disabled mouse inputs to all combat panels during victory state

## Core Requirements

### 1. Victory Condition System

#### Interface: CombatVictoryCondition
A pluggable interface that allows custom victory conditions to be defined:
- **Purpose**: Determine if combat has been won based on current state
- **Method**: `evaluate(state: CombatState): boolean`
- **Returns**: `true` if combat is won, `false` otherwise
- **Extensibility**: Can be extended for custom scenarios (objective completion, time survival, etc.)

#### Default Implementation: AllEnemiesKnockedOut
- **Logic**: Returns `true` when all enemy units have `isKnockedOut === true`
- **Implementation**: Filter enemy units, check if all are KO'd
- **Edge Case**: If no enemy units exist, returns `false` (combat continues)

#### Checking Timing
- **When**: At the end of each unit's turn, before returning to Action Timer Phase
- **Where**: UnitTurnPhaseHandler, after all turn actions complete
- **Frequency**: Once per unit turn (not continuously during animations)
- **Priority**: Victory condition checked BEFORE defeat condition (victory takes precedence)
- **Transition**: If condition met, set `state.phase = 'victory'` and return modified state

### 2. Combat State Management

#### Victory Phase
Add new combat phase to `CombatPhase` type (already exists):
```typescript
type CombatPhase = 'deployment' | 'enemy-deployment' | 'action-timer' | 'unit-turn' | 'victory' | 'defeat';
```

#### Victory Rewards Data
Add reward data to `CombatState` or pass through `CombatEncounter`:
```typescript
interface VictoryRewards {
  experience: number;      // XP earned from encounter
  gold: number;           // Gold found from encounter
  items: CombatItem[];    // 0-8 items available for looting
}
```

#### Looted Items Tracking
Track which items the player has selected:
```typescript
interface VictoryScreenState {
  lootedItemIds: Set<string>;  // IDs of items player has selected to loot
}
```

### 3. Visual Presentation

#### Overlay Background
- **Element**: Full-screen semi-transparent black overlay
- **Dimensions**: Covers entire map panel (full canvas)
- **Color**: Black with 70% opacity (`rgba(0, 0, 0, 0.7)`)
- **Purpose**: Dim background, indicate inactive state, focus attention on modal

#### Victory Modal Panel
- **Position**: Center of map panel (horizontally and vertically centered)
- **Size**:
  - Width: 160 pixels (wider than defeat modal to accommodate item grid)
  - Height: Auto (based on content: title + rewards + items + buttons)
- **Background**: Black background with white border (consistent with defeat modal)
- **Border**: 2px white border

#### Title Text
- **Text**: "VICTORY!"
- **Font**: `15px-dungeonslant` (title font)
- **Color**: Yellow `#ffff00` for positive emphasis
- **Position**: Top-center of panel, 8px padding from top
- **Alignment**: Horizontally centered

#### Rewards Section
Display experience and gold earned:

**Experience Display**
- **Text**: "Experience Gained: XXXX"
- **Font**: `7px-04b03` (standard UI font)
- **Color**: White `#ffffff`
- **Position**: Below title, 4px spacing
- **Alignment**: Horizontally centered

**Gold Display**
- **Text**: "Gold Found: XXXX"
- **Font**: `7px-04b03` (standard UI font)
- **Color**: Yellow `#ffff00` (gold color)
- **Position**: Below experience, 2px spacing
- **Alignment**: Horizontally centered

#### Items Section Header
- **Text**: "Items Found"
- **Font**: `7px-04b03` (standard UI font)
- **Color**: White `#ffffff`
- **Position**: Below gold, 4px spacing
- **Alignment**: Horizontally centered

#### Item Grid (0-8 items)
Interactive grid of loot items:

**Grid Layout**
- **Columns**: 4 items per row
- **Rows**: 2 rows maximum (supports 0-8 items)
- **Item Width**: 30px (enough for item name text)
- **Item Height**: 7px (font height)
- **Horizontal Spacing**: 4px between items
- **Vertical Spacing**: 2px between rows
- **Grid Position**: Centered below "Items Found" header, 4px spacing

**Item Display States**
- **Not Selected (default)**: Grey `#888888`
- **Hovered**: Yellow `#ffff00`
- **Selected (looted)**: Green `#00ff00`

**Item Interaction**
- **Hover**: Changes color to yellow, shows helper text
- **Click**: Toggles item selection (adds/removes from lootedItemIds)
- **Visual Feedback**: Immediate color change on selection state change

**Item Text**
- **Content**: Item name from CombatItem database
- **Font**: `7px-04b03` (standard UI font)
- **Truncation**: Truncate long names to fit 30px width
- **Alignment**: Left-aligned within item bounds

#### Helper Text
Contextual text shown below item grid:

**Hover Over Item**
- **Text**: "Click to loot"
- **Font**: `7px-04b03` (standard UI font)
- **Color**: Light grey `#aaaaaa`
- **Position**: Below item grid, 4px spacing
- **Alignment**: Horizontally centered
- **Visibility**: Only shown when hovering over an item

#### Action Buttons
Two buttons for player actions:

**Button 1: "Loot All"**
- **Text**: "Loot All"
- **Font**: `7px-04b03` (standard UI font)
- **Color**: White `#ffffff` (normal), Yellow `#ffff00` (hover)
- **Position**: Below item grid/helper text, first button
- **Spacing**: 16px spacing between buttons
- **Hover State**: Same as other menu buttons
- **Click Action**: Adds all items to lootedItemIds set
- **Effect**: All items turn green immediately

**Button 2: "Exit Encounter"**
- **Text**: "Exit Encounter"
- **Font**: `7px-04b03` (standard UI font)
- **Color**: White `#ffffff` (normal), Yellow `#ffff00` (hover)
- **Position**: Below item grid/helper text, second button (right of Loot All)
- **Spacing**: 16px spacing between buttons
- **Hover State**: Same as other menu buttons
- **Click Action**: Placeholder for future implementation
- **Future**: Will apply looted items to inventory, award XP/gold, exit combat

### 4. Input Handling

#### Mouse Input Disabling
When victory phase is active:
- **Map Panel**: No hover detection, no click detection on tiles/units
- **Info Panel**: All buttons disabled (if visible)
- **Turn Order Panel**: No hover/click interactions
- **Actions Menu**: Not displayed (panel hidden)
- **Only Active Elements**: Victory modal items and buttons

#### Mouse Event Flow
- **CombatView**: Check if `state.phase === 'victory'` before routing events
- **Phase Handler**: VictoryPhaseHandler handles only modal interactions
- **Other Handlers**: Return early if victory phase active

#### Item Interaction States
- **Hover Detection**: Check mouse position against each item's bounding box
- **Click Detection**: Toggle item in lootedItemIds set
- **State Update**: Trigger re-render to show new colors

### 5. Combat Log Integration

#### Victory Message
When victory condition is met:
- **Message**: "Victory! All enemies have been defeated!"
- **Timing**: Added to combat log immediately when victory condition detected
- **Color**: Green (or system default for positive messages)
- **Position**: Appended to bottom of combat log

### 6. Item Looting System

#### Item Data Source
Items are provided by `CombatEncounter`:
```typescript
interface CombatEncounter {
  // ... existing fields
  getVictoryRewards(): VictoryRewards;
}
```

#### Placeholder Item Generation
For initial implementation:
- **Source**: Randomly select 0-8 items from Equipment registry
- **Constraint**: All items must be unique (no duplicates in same reward pool)
- **Categories**: Include variety (weapons, armor, consumables if available)

#### Loot Selection Logic
- **Default State**: No items selected (all grey)
- **Click Item**: Toggle selection state
  - Not selected → Selected (grey → green)
  - Selected → Not selected (green → grey)
- **Loot All**: Selects all items at once
- **Visual Feedback**: Immediate color change, no animation needed

#### Selected Items Tracking
- **Storage**: Set<string> containing item IDs
- **Persistence**: Stored in VictoryPhaseHandler instance state
- **Transfer**: When exiting, selected items added to player inventory (future)

### 7. Exit Encounter Functionality (Future)

When "Exit Encounter" is clicked:
- **Apply Looted Items**: Add selected items to player inventory
- **Award Experience**: Add experience to party members
- **Award Gold**: Add gold to player purse
- **Mark Encounter Complete**: Update encounter completion status
- **Close Combat View**: Return to overworld or next scene
- **Clear Combat State**: Clean up combat-specific data

## Implementation Strategy

### Phase 1: Victory Condition System
1. Create `CombatVictoryCondition` interface in new file `models/combat/CombatVictoryCondition.ts`
2. Implement `AllEnemiesKnockedOutCondition` class
3. Add condition checking to `UnitTurnPhaseHandler` at end of turn
4. Ensure 'victory' phase exists in `CombatPhase` type (already should)
5. Update phase type exports and type guards

### Phase 2: Victory Rewards Data Structure
1. Define `VictoryRewards` interface in `models/combat/CombatEncounter.ts`
2. Add `getVictoryRewards()` method to CombatEncounter
3. Implement placeholder reward generation (random XP, gold, items)
4. Create item selection logic (random 0-8 unique items from Equipment registry)

### Phase 3: Victory Phase Handler
1. Create `VictoryPhaseHandler.ts` implementing `CombatPhaseHandler`
2. Add state for tracking looted items (`lootedItemIds: Set<string>`)
3. Implement `update()` method (mostly no-op, waits for user input)
4. Implement mouse event handling for item clicks and button clicks
5. Implement hover detection for items

### Phase 4: Victory Modal Renderer
1. Create `VictoryModalRenderer.ts` for rendering victory UI
2. Implement overlay rendering (full-screen semi-transparent black)
3. Implement panel rendering (centered, auto-height based on items)
4. Implement title rendering ("VICTORY!" in dungeonslant font, yellow)
5. Implement rewards rendering (experience and gold text)
6. Implement "Items Found" header rendering
7. Implement item grid rendering (4x2 grid, dynamic 0-8 items)
8. Implement item color states (grey/yellow/green based on selection/hover)
9. Implement helper text rendering ("Click to loot" on hover)
10. Implement button rendering ("Loot All" and "Exit Encounter")

### Phase 5: Input Handling Integration
1. Update `CombatView` to check phase before routing mouse events
2. Update each panel manager to disable interactions during victory phase
3. Ensure only VictoryPhaseHandler receives mouse events during victory
4. Implement item hover detection with bounding box checks
5. Implement item click detection and toggle logic
6. Implement "Loot All" button click handler
7. Implement "Exit Encounter" button placeholder

### Phase 6: Combat Log Integration
1. Add victory message to combat log when victory condition met
2. Ensure message is visible in combat log panel
3. Consider visual styling for victory messages (green color)

### Phase 7: Placeholder Item Generation
1. Query Equipment registry for all available items
2. Implement random selection algorithm (0-8 unique items)
3. Ensure no duplicate items in same reward pool
4. Format item names for display (truncate if needed)

### Phase 8: Exit Encounter Placeholder
1. Add button rendering for "Exit Encounter"
2. Implement hover state
3. Add placeholder click handler (logs to console for now)
4. Document future implementation requirements (inventory, XP, gold, scene transition)

## Technical Details

### CombatVictoryCondition Interface
```typescript
/**
 * Defines a condition that determines if combat has been won.
 * Allows for custom victory scenarios beyond the default "all enemies KO'd".
 */
export interface CombatVictoryCondition {
  /**
   * Evaluates whether the victory condition has been met.
   * @param state Current combat state
   * @returns true if combat is won, false otherwise
   */
  evaluate(state: CombatState): boolean;

  /**
   * Human-readable description of this victory condition
   */
  description: string;

  /**
   * Serializes the condition to JSON for save/load
   */
  toJSON(): CombatVictoryConditionJSON;
}

export interface CombatVictoryConditionJSON {
  type: string;
  description: string;
  [key: string]: unknown;
}
```

### AllEnemiesKnockedOutCondition Implementation
```typescript
export class AllEnemiesKnockedOutCondition implements CombatVictoryCondition {
  description = "All enemy units are knocked out";

  evaluate(state: CombatState): boolean {
    const enemyUnits = state.unitManifest.getAllUnits().filter(u => !u.isPlayerControlled);

    // If no enemy units exist, combat is not won (edge case)
    if (enemyUnits.length === 0) {
      return false;
    }

    // Victory if ALL enemy units are KO'd
    return enemyUnits.every(u => u.isKnockedOut);
  }

  toJSON(): CombatVictoryConditionJSON {
    return {
      type: "AllEnemiesKnockedOut",
      description: this.description,
    };
  }

  static fromJSON(_json: CombatVictoryConditionJSON): AllEnemiesKnockedOutCondition {
    return new AllEnemiesKnockedOutCondition();
  }
}
```

### UnitTurnPhaseHandler Integration
```typescript
// In UnitTurnPhaseHandler.update()
// After all turn actions complete, before returning to action-timer

// Check victory condition FIRST (takes precedence over defeat)
if (this.victoryCondition.evaluate(newState)) {
  // Add combat log message
  context.combatLog?.addMessage("Victory! All enemies have been defeated!");

  // Transition to victory phase
  return {
    ...newState,
    phase: 'victory'
  };
}

// Check defeat condition SECOND (only if not victorious)
if (this.defeatCondition.evaluate(newState)) {
  // Add combat log message
  context.combatLog?.addMessage(CombatConstants.DEFEAT_SCREEN.DEFEAT_MESSAGE);

  // Transition to defeat phase
  return {
    ...newState,
    phase: 'defeat'
  };
}
```

### VictoryRewards Structure
```typescript
export interface VictoryRewards {
  experience: number;
  gold: number;
  items: Equipment[];  // 0-8 items
}

// In CombatEncounter
export class CombatEncounter {
  // ... existing fields

  getVictoryRewards(): VictoryRewards {
    // Placeholder implementation - generate random rewards
    const experience = Math.floor(Math.random() * 500) + 100; // 100-600 XP
    const gold = Math.floor(Math.random() * 100) + 10; // 10-110 gold

    // Select 0-8 random unique items from Equipment registry
    const allItems = Array.from(EquipmentRegistry.getAll().values());
    const itemCount = Math.floor(Math.random() * 9); // 0-8 items
    const items: Equipment[] = [];

    const selectedIndices = new Set<number>();
    while (items.length < itemCount && items.length < allItems.length) {
      const randomIndex = Math.floor(Math.random() * allItems.length);
      if (!selectedIndices.has(randomIndex)) {
        selectedIndices.add(randomIndex);
        items.push(allItems[randomIndex]);
      }
    }

    return { experience, gold, items };
  }
}
```

### VictoryPhaseHandler Structure
```typescript
export class VictoryPhaseHandler extends PhaseBase {
  private hoveredItemId: string | null = null;
  private hoveredButton: 'loot-all' | 'exit' | null = null;
  private lootedItemIds: Set<string> = new Set();
  private renderer: VictoryModalRenderer;
  private rewards: VictoryRewards;

  constructor(rewards: VictoryRewards) {
    super();
    this.rewards = rewards;
    this.renderer = new VictoryModalRenderer();
  }

  getRequiredSprites(_state: CombatState, _encounter: CombatEncounter): PhaseSprites {
    // Victory screen only uses fonts, no sprites required
    return { spriteIds: new Set<string>() };
  }

  protected updatePhase(_state: CombatState, _encounter: CombatEncounter, _deltaTime: number): CombatState | null {
    // No automatic state changes - waits for user input
    return null;
  }

  render(_state: CombatState, _encounter: CombatEncounter, _context: PhaseRenderContext): void {
    // No overlay rendering needed (all done in renderUI to appear on top)
  }

  renderUI(state: CombatState, _encounter: CombatEncounter, context: PhaseRenderContext): void {
    // Render victory modal (overlay, panel, title, rewards, items, buttons)
    const fonts = context.fontAtlasImages ?? new Map<string, HTMLImageElement>();
    this.renderer.render(
      context.ctx,
      this.rewards,
      this.lootedItemIds,
      this.hoveredItemId,
      this.hoveredButton,
      fonts,
      { width: CombatConstants.CANVAS_WIDTH, height: CombatConstants.CANVAS_HEIGHT }
    );
  }

  handleMouseMove(
    context: MouseEventContext,
    state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    const panelBounds = { width: CombatConstants.CANVAS_WIDTH, height: CombatConstants.CANVAS_HEIGHT };
    const uiBounds = this.renderer.getUIBounds(panelBounds, this.rewards);

    // Check if hovering over an item
    let newHoveredItemId: string | null = null;
    for (let i = 0; i < this.rewards.items.length; i++) {
      const itemBounds = uiBounds.items[i];
      if (this.isPointInBounds(context.canvasX, context.canvasY, itemBounds)) {
        newHoveredItemId = this.rewards.items[i].id;
        break;
      }
    }

    // Check if hovering over buttons
    let newHoveredButton: 'loot-all' | 'exit' | null = null;
    if (this.isPointInBounds(context.canvasX, context.canvasY, uiBounds.lootAllButton)) {
      newHoveredButton = 'loot-all';
    } else if (this.isPointInBounds(context.canvasX, context.canvasY, uiBounds.exitButton)) {
      newHoveredButton = 'exit';
    }

    // Trigger re-render if hover state changed
    if (newHoveredItemId !== this.hoveredItemId || newHoveredButton !== this.hoveredButton) {
      this.hoveredItemId = newHoveredItemId;
      this.hoveredButton = newHoveredButton;
      return {
        handled: true,
        newState: state,  // Trigger re-render
      };
    }

    return { handled: false };
  }

  handleMouseDown(
    context: MouseEventContext,
    state: CombatState,
    encounter: CombatEncounter
  ): PhaseEventResult {
    const panelBounds = { width: CombatConstants.CANVAS_WIDTH, height: CombatConstants.CANVAS_HEIGHT };
    const uiBounds = this.renderer.getUIBounds(panelBounds, this.rewards);

    // Check if clicked on an item
    for (let i = 0; i < this.rewards.items.length; i++) {
      const itemBounds = uiBounds.items[i];
      if (this.isPointInBounds(context.canvasX, context.canvasY, itemBounds)) {
        this.handleItemClick(this.rewards.items[i].id);
        return {
          handled: true,
          newState: state,  // Trigger re-render
        };
      }
    }

    // Check if clicked "Loot All" button
    if (this.isPointInBounds(context.canvasX, context.canvasY, uiBounds.lootAllButton)) {
      this.handleLootAll();
      return {
        handled: true,
        newState: state,  // Trigger re-render
      };
    }

    // Check if clicked "Exit Encounter" button
    if (this.isPointInBounds(context.canvasX, context.canvasY, uiBounds.exitButton)) {
      return this.handleExitEncounter(state, encounter);
    }

    return { handled: false };
  }

  handleMouseUp(
    _context: MouseEventContext,
    _state: CombatState,
    _encounter: CombatEncounter
  ): PhaseEventResult {
    return { handled: false };
  }

  private handleItemClick(itemId: string): void {
    // Toggle item selection
    if (this.lootedItemIds.has(itemId)) {
      this.lootedItemIds.delete(itemId);
    } else {
      this.lootedItemIds.add(itemId);
    }
  }

  private handleLootAll(): void {
    // Select all items
    for (const item of this.rewards.items) {
      this.lootedItemIds.add(item.id);
    }
  }

  private handleExitEncounter(_state: CombatState, _encounter: CombatEncounter): PhaseEventResult {
    // TODO: Implement exit encounter logic
    // - Apply looted items to inventory
    // - Award experience to party
    // - Award gold to player
    // - Mark encounter as complete
    // - Transition to overworld/next scene
    console.log("[VictoryPhaseHandler] Exit encounter clicked (not yet implemented)");
    console.log("[VictoryPhaseHandler] Looted items:", Array.from(this.lootedItemIds));
    return { handled: true };
  }

  private isPointInBounds(
    x: number,
    y: number,
    bounds: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }
}
```

### VictoryModalRenderer
```typescript
export class VictoryModalRenderer {
  /**
   * Renders the complete victory modal on the given context.
   */
  render(
    ctx: CanvasRenderingContext2D,
    rewards: VictoryRewards,
    lootedItemIds: Set<string>,
    hoveredItemId: string | null,
    hoveredButton: 'loot-all' | 'exit' | null,
    fonts: Map<string, HTMLImageElement>,
    panelBounds: { width: number; height: number }
  ): void {
    // 1. Render full-screen overlay
    this.renderOverlay(ctx, panelBounds);

    // 2. Calculate modal position and dimensions
    const modalWidth = CombatConstants.VICTORY_SCREEN.MODAL_WIDTH;
    const modalHeight = this.calculateModalHeight(rewards, fonts);
    const modalX = Math.floor((panelBounds.width - modalWidth) / 2);
    const modalY = Math.floor((panelBounds.height - modalHeight) / 2);

    // 3. Render modal panel background
    this.renderPanelBackground(ctx, modalX, modalY, modalWidth, modalHeight);

    // 4. Render title
    let currentY = modalY + 8;
    currentY = this.renderTitle(ctx, modalX, modalWidth, currentY, fonts);

    // 5. Render rewards (experience and gold)
    currentY = this.renderRewards(ctx, modalX, modalWidth, currentY, rewards, fonts);

    // 6. Render "Items Found" header
    currentY = this.renderItemsHeader(ctx, modalX, modalWidth, currentY, fonts);

    // 7. Render item grid
    currentY = this.renderItemGrid(ctx, modalX, modalWidth, currentY, rewards, lootedItemIds, hoveredItemId, fonts);

    // 8. Render helper text (if item hovered)
    currentY = this.renderHelperText(ctx, modalX, modalWidth, currentY, hoveredItemId, fonts);

    // 9. Render buttons
    this.renderButtons(ctx, modalX, modalWidth, currentY, hoveredButton, fonts);
  }

  private renderOverlay(ctx: CanvasRenderingContext2D, panelBounds: { width: number; height: number }): void {
    ctx.fillStyle = `rgba(0, 0, 0, ${CombatConstants.VICTORY_SCREEN.OVERLAY_OPACITY})`;
    ctx.fillRect(0, 0, panelBounds.width, panelBounds.height);
  }

  private renderPanelBackground(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
  }

  private calculateModalHeight(rewards: VictoryRewards, fonts: Map<string, HTMLImageElement>): number {
    const titleFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.TITLE_FONT_ID);
    const uiFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.UI_FONT_ID);

    const titleHeight = titleFont?.charHeight ?? 15;
    const uiHeight = uiFont?.charHeight ?? 7;

    // Calculate: title + rewards + items header + item grid + helper + buttons + padding
    const itemRows = Math.ceil(rewards.items.length / 4);
    const itemGridHeight = itemRows * (uiHeight + 2); // 2px spacing between rows

    return 8 + // top padding
           titleHeight + 4 + // title + spacing
           uiHeight + 2 + // experience + spacing
           uiHeight + 4 + // gold + spacing
           uiHeight + 4 + // items header + spacing
           itemGridHeight + 4 + // item grid + spacing
           uiHeight + 4 + // helper text (conditional) + spacing
           uiHeight + 8; // buttons + bottom padding
  }

  private renderTitle(
    ctx: CanvasRenderingContext2D,
    modalX: number,
    modalWidth: number,
    y: number,
    fonts: Map<string, HTMLImageElement>
  ): number {
    const titleFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.TITLE_FONT_ID);
    const titleFontImage = fonts.get(CombatConstants.VICTORY_SCREEN.TITLE_FONT_ID);

    if (!titleFont || !titleFontImage) {
      return y + 15; // Fallback height
    }

    const titleText = CombatConstants.VICTORY_SCREEN.TITLE_TEXT;
    const titleWidth = FontAtlasRenderer.measureText(titleText, titleFont);
    const titleX = Math.floor(modalX + (modalWidth - titleWidth) / 2);

    FontAtlasRenderer.renderTextWithShadow(
      ctx,
      titleText,
      titleX,
      y,
      CombatConstants.VICTORY_SCREEN.TITLE_FONT_ID,
      titleFontImage,
      1,
      'left',
      CombatConstants.VICTORY_SCREEN.TITLE_COLOR
    );

    return y + titleFont.charHeight + 4;
  }

  private renderRewards(
    ctx: CanvasRenderingContext2D,
    modalX: number,
    modalWidth: number,
    y: number,
    rewards: VictoryRewards,
    fonts: Map<string, HTMLImageElement>
  ): number {
    const uiFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.UI_FONT_ID);
    const uiFontImage = fonts.get(CombatConstants.VICTORY_SCREEN.UI_FONT_ID);

    if (!uiFont || !uiFontImage) {
      return y + 14; // Fallback height
    }

    // Experience
    const expText = `Experience Gained: ${rewards.experience}`;
    const expWidth = FontAtlasRenderer.measureText(expText, uiFont);
    const expX = Math.floor(modalX + (modalWidth - expWidth) / 2);

    FontAtlasRenderer.renderText(
      ctx,
      expText,
      expX,
      y,
      CombatConstants.VICTORY_SCREEN.UI_FONT_ID,
      uiFontImage,
      1,
      'left',
      CombatConstants.VICTORY_SCREEN.REWARD_TEXT_COLOR
    );

    y += uiFont.charHeight + 2;

    // Gold
    const goldText = `Gold Found: ${rewards.gold}`;
    const goldWidth = FontAtlasRenderer.measureText(goldText, uiFont);
    const goldX = Math.floor(modalX + (modalWidth - goldWidth) / 2);

    FontAtlasRenderer.renderText(
      ctx,
      goldText,
      goldX,
      y,
      CombatConstants.VICTORY_SCREEN.UI_FONT_ID,
      uiFontImage,
      1,
      'left',
      CombatConstants.VICTORY_SCREEN.GOLD_TEXT_COLOR
    );

    return y + uiFont.charHeight + 4;
  }

  private renderItemsHeader(
    ctx: CanvasRenderingContext2D,
    modalX: number,
    modalWidth: number,
    y: number,
    fonts: Map<string, HTMLImageElement>
  ): number {
    const uiFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.UI_FONT_ID);
    const uiFontImage = fonts.get(CombatConstants.VICTORY_SCREEN.UI_FONT_ID);

    if (!uiFont || !uiFontImage) {
      return y + 7; // Fallback height
    }

    const headerText = CombatConstants.VICTORY_SCREEN.ITEMS_HEADER_TEXT;
    const headerWidth = FontAtlasRenderer.measureText(headerText, uiFont);
    const headerX = Math.floor(modalX + (modalWidth - headerWidth) / 2);

    FontAtlasRenderer.renderText(
      ctx,
      headerText,
      headerX,
      y,
      CombatConstants.VICTORY_SCREEN.UI_FONT_ID,
      uiFontImage,
      1,
      'left',
      CombatConstants.VICTORY_SCREEN.REWARD_TEXT_COLOR
    );

    return y + uiFont.charHeight + 4;
  }

  private renderItemGrid(
    ctx: CanvasRenderingContext2D,
    modalX: number,
    modalWidth: number,
    y: number,
    rewards: VictoryRewards,
    lootedItemIds: Set<string>,
    hoveredItemId: string | null,
    fonts: Map<string, HTMLImageElement>
  ): number {
    const uiFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.UI_FONT_ID);
    const uiFontImage = fonts.get(CombatConstants.VICTORY_SCREEN.UI_FONT_ID);

    if (!uiFont || !uiFontImage || rewards.items.length === 0) {
      return y;
    }

    const itemWidth = CombatConstants.VICTORY_SCREEN.ITEM_WIDTH;
    const itemSpacingH = CombatConstants.VICTORY_SCREEN.ITEM_SPACING_H;
    const itemSpacingV = CombatConstants.VICTORY_SCREEN.ITEM_SPACING_V;
    const columns = 4;

    // Calculate grid starting X (centered)
    const gridWidth = (itemWidth * columns) + (itemSpacingH * (columns - 1));
    const startX = Math.floor(modalX + (modalWidth - gridWidth) / 2);

    let currentY = y;
    for (let i = 0; i < rewards.items.length; i++) {
      const item = rewards.items[i];
      const col = i % columns;
      const row = Math.floor(i / columns);

      const itemX = startX + (col * (itemWidth + itemSpacingH));
      const itemY = currentY + (row * (uiFont.charHeight + itemSpacingV));

      // Determine color based on state
      let color: string;
      if (hoveredItemId === item.id) {
        color = CombatConstants.VICTORY_SCREEN.ITEM_COLOR_HOVER;
      } else if (lootedItemIds.has(item.id)) {
        color = CombatConstants.VICTORY_SCREEN.ITEM_COLOR_SELECTED;
      } else {
        color = CombatConstants.VICTORY_SCREEN.ITEM_COLOR_NORMAL;
      }

      // Truncate item name to fit width
      const itemName = this.truncateItemName(item.name, itemWidth, uiFont);

      FontAtlasRenderer.renderText(
        ctx,
        itemName,
        itemX,
        itemY,
        CombatConstants.VICTORY_SCREEN.UI_FONT_ID,
        uiFontImage,
        1,
        'left',
        color
      );
    }

    // Calculate height used by grid
    const rows = Math.ceil(rewards.items.length / columns);
    return currentY + (rows * (uiFont.charHeight + itemSpacingV)) - itemSpacingV + 4;
  }

  private renderHelperText(
    ctx: CanvasRenderingContext2D,
    modalX: number,
    modalWidth: number,
    y: number,
    hoveredItemId: string | null,
    fonts: Map<string, HTMLImageElement>
  ): number {
    // Only render if hovering over an item
    if (!hoveredItemId) {
      return y;
    }

    const uiFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.UI_FONT_ID);
    const uiFontImage = fonts.get(CombatConstants.VICTORY_SCREEN.UI_FONT_ID);

    if (!uiFont || !uiFontImage) {
      return y + 7; // Fallback height
    }

    const helperText = CombatConstants.VICTORY_SCREEN.HELPER_TEXT;
    const helperWidth = FontAtlasRenderer.measureText(helperText, uiFont);
    const helperX = Math.floor(modalX + (modalWidth - helperWidth) / 2);

    FontAtlasRenderer.renderText(
      ctx,
      helperText,
      helperX,
      y,
      CombatConstants.VICTORY_SCREEN.UI_FONT_ID,
      uiFontImage,
      1,
      'left',
      CombatConstants.VICTORY_SCREEN.HELPER_COLOR
    );

    return y + uiFont.charHeight + 4;
  }

  private renderButtons(
    ctx: CanvasRenderingContext2D,
    modalX: number,
    modalWidth: number,
    y: number,
    hoveredButton: 'loot-all' | 'exit' | null,
    fonts: Map<string, HTMLImageElement>
  ): number {
    const uiFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.UI_FONT_ID);
    const uiFontImage = fonts.get(CombatConstants.VICTORY_SCREEN.UI_FONT_ID);

    if (!uiFont || !uiFontImage) {
      return y + 7; // Fallback height
    }

    const lootAllText = CombatConstants.VICTORY_SCREEN.LOOT_ALL_TEXT;
    const exitText = CombatConstants.VICTORY_SCREEN.EXIT_TEXT;

    const lootAllWidth = FontAtlasRenderer.measureText(lootAllText, uiFont);
    const exitWidth = FontAtlasRenderer.measureText(exitText, uiFont);

    const buttonSpacing = CombatConstants.VICTORY_SCREEN.BUTTON_SPACING;
    const totalWidth = lootAllWidth + buttonSpacing + exitWidth;
    const startX = Math.floor(modalX + (modalWidth - totalWidth) / 2);

    // Loot All button
    const lootAllColor = hoveredButton === 'loot-all'
      ? CombatConstants.VICTORY_SCREEN.BUTTON_COLOR_HOVER
      : CombatConstants.VICTORY_SCREEN.BUTTON_COLOR_NORMAL;

    FontAtlasRenderer.renderText(
      ctx,
      lootAllText,
      startX,
      y,
      CombatConstants.VICTORY_SCREEN.UI_FONT_ID,
      uiFontImage,
      1,
      'left',
      lootAllColor
    );

    // Exit Encounter button
    const exitColor = hoveredButton === 'exit'
      ? CombatConstants.VICTORY_SCREEN.BUTTON_COLOR_HOVER
      : CombatConstants.VICTORY_SCREEN.BUTTON_COLOR_NORMAL;

    FontAtlasRenderer.renderText(
      ctx,
      exitText,
      startX + lootAllWidth + buttonSpacing,
      y,
      CombatConstants.VICTORY_SCREEN.UI_FONT_ID,
      uiFontImage,
      1,
      'left',
      exitColor
    );

    return y + uiFont.charHeight;
  }

  private truncateItemName(name: string, maxWidth: number, font: any): string {
    const fullWidth = FontAtlasRenderer.measureText(name, font);
    if (fullWidth <= maxWidth) {
      return name;
    }

    // Binary search for longest fitting substring
    let left = 0;
    let right = name.length;
    let best = 0;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const substr = name.substring(0, mid);
      const width = FontAtlasRenderer.measureText(substr, font);

      if (width <= maxWidth) {
        best = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return name.substring(0, best);
  }

  /**
   * Calculates UI element bounds for hit detection.
   */
  getUIBounds(
    panelBounds: { width: number; height: number },
    rewards: VictoryRewards
  ): {
    items: Array<{ x: number; y: number; width: number; height: number }>;
    lootAllButton: { x: number; y: number; width: number; height: number };
    exitButton: { x: number; y: number; width: number; height: number };
  } {
    const uiFont = FontRegistry.getById(CombatConstants.VICTORY_SCREEN.UI_FONT_ID);
    if (!uiFont) {
      return {
        items: [],
        lootAllButton: { x: 0, y: 0, width: 0, height: 0 },
        exitButton: { x: 0, y: 0, width: 0, height: 0 },
      };
    }

    const modalWidth = CombatConstants.VICTORY_SCREEN.MODAL_WIDTH;
    const modalX = Math.floor((panelBounds.width - modalWidth) / 2);
    const modalY = Math.floor(panelBounds.height / 2) - 50; // Approximate center

    // Calculate positions (mirroring render logic)
    let currentY = modalY + 8 + 15 + 4; // title
    currentY += 7 + 2 + 7 + 4; // rewards
    currentY += 7 + 4; // items header

    // Item grid bounds
    const itemWidth = CombatConstants.VICTORY_SCREEN.ITEM_WIDTH;
    const itemSpacingH = CombatConstants.VICTORY_SCREEN.ITEM_SPACING_H;
    const itemSpacingV = CombatConstants.VICTORY_SCREEN.ITEM_SPACING_V;
    const columns = 4;
    const gridWidth = (itemWidth * columns) + (itemSpacingH * (columns - 1));
    const startX = Math.floor(modalX + (modalWidth - gridWidth) / 2);

    const itemBounds: Array<{ x: number; y: number; width: number; height: number }> = [];
    for (let i = 0; i < rewards.items.length; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);

      const itemX = startX + (col * (itemWidth + itemSpacingH));
      const itemY = currentY + (row * (uiFont.charHeight + itemSpacingV));

      itemBounds.push({
        x: itemX,
        y: itemY,
        width: itemWidth,
        height: uiFont.charHeight,
      });
    }

    // Update currentY for buttons
    const rows = Math.ceil(rewards.items.length / columns);
    currentY += (rows * (uiFont.charHeight + itemSpacingV)) - itemSpacingV + 4;
    currentY += 7 + 4; // helper text

    // Button bounds
    const lootAllText = CombatConstants.VICTORY_SCREEN.LOOT_ALL_TEXT;
    const exitText = CombatConstants.VICTORY_SCREEN.EXIT_TEXT;
    const lootAllWidth = FontAtlasRenderer.measureText(lootAllText, uiFont);
    const exitWidth = FontAtlasRenderer.measureText(exitText, uiFont);
    const buttonSpacing = CombatConstants.VICTORY_SCREEN.BUTTON_SPACING;
    const totalWidth = lootAllWidth + buttonSpacing + exitWidth;
    const buttonStartX = Math.floor(modalX + (modalWidth - totalWidth) / 2);

    const lootAllButton = {
      x: buttonStartX,
      y: currentY,
      width: lootAllWidth,
      height: uiFont.charHeight,
    };

    const exitButton = {
      x: buttonStartX + lootAllWidth + buttonSpacing,
      y: currentY,
      width: exitWidth,
      height: uiFont.charHeight,
    };

    return { items: itemBounds, lootAllButton, exitButton };
  }
}
```

## Constants to Add

Add to `CombatConstants.ts`:

```typescript
VICTORY_SCREEN: {
  // Overlay
  OVERLAY_OPACITY: 0.7,

  // Modal dimensions
  MODAL_WIDTH: 160,

  // Title
  TITLE_TEXT: 'VICTORY!',
  TITLE_FONT_ID: '15px-dungeonslant',
  TITLE_COLOR: '#ffff00', // Yellow

  // UI elements
  UI_FONT_ID: '7px-04b03',
  REWARD_TEXT_COLOR: '#ffffff', // White
  GOLD_TEXT_COLOR: '#ffff00', // Yellow (gold color)

  // Items section
  ITEMS_HEADER_TEXT: 'Items Found',
  ITEM_WIDTH: 30, // pixels per item
  ITEM_SPACING_H: 4, // horizontal spacing between items
  ITEM_SPACING_V: 2, // vertical spacing between rows
  ITEM_COLOR_NORMAL: '#888888', // Grey (not selected)
  ITEM_COLOR_HOVER: '#ffff00', // Yellow (hovered)
  ITEM_COLOR_SELECTED: '#00ff00', // Green (looted)

  // Helper text
  HELPER_TEXT: 'Click to loot',
  HELPER_COLOR: '#aaaaaa', // Light grey

  // Buttons
  LOOT_ALL_TEXT: 'Loot All',
  EXIT_TEXT: 'Exit Encounter',
  BUTTON_SPACING: 16, // spacing between buttons
  BUTTON_COLOR_NORMAL: '#ffffff', // White
  BUTTON_COLOR_HOVER: '#ffff00', // Yellow

  // Combat log
  VICTORY_MESSAGE: 'Victory! All enemies have been defeated!',
}
```

## Files to Create

### New Files
- `models/combat/CombatVictoryCondition.ts` - Interface and implementations
- `models/combat/VictoryPhaseHandler.ts` - Victory phase handler
- `models/combat/rendering/VictoryModalRenderer.ts` - Victory modal rendering

## Files to Modify

### Core Combat System
- `models/combat/CombatState.ts` - Ensure 'victory' phase exists in type
- `models/combat/CombatConstants.ts` - Add VICTORY_SCREEN constants
- `models/combat/CombatEncounter.ts` - Add getVictoryRewards() method

### Phase Handlers
- `models/combat/UnitTurnPhaseHandler.ts` - Add victory condition checking (BEFORE defeat check)
- `components/combat/CombatView.tsx` - Add VictoryPhaseHandler to phase handler selection

### Type Exports
- `models/combat/index.ts` - Export CombatVictoryCondition types

## Edge Cases and Considerations

### 1. Victory During Animation
- **Issue**: Unit turn ends mid-animation (e.g., attack animation playing)
- **Solution**: Defer victory check until all animations complete
- **Implementation**: Check `canAct` flag before evaluating victory

### 2. Victory and Defeat Simultaneously
- **Issue**: Last enemy and last player defeat each other in same turn
- **Solution**: Check victory condition FIRST, defeat condition SECOND
- **Priority**: Victory takes precedence (player wins ties)

### 3. No Items Found
- **Display**: Show "Items Found" header with empty grid area
- **Buttons**: "Loot All" button still shown but does nothing
- **Exit**: "Exit Encounter" works normally

### 4. Single Item Found
- **Display**: Show 1 item in top-left of grid
- **Layout**: Grid still reserves space for 4 columns
- **Interaction**: Works same as multiple items

### 5. Maximum Items (8)
- **Display**: Full 4x2 grid populated
- **Interaction**: All items clickable
- **Loot All**: Selects all 8 items

### 6. Item Name Truncation
- **Long Names**: Truncate to fit 30px width
- **Algorithm**: Binary search for longest fitting substring
- **No Ellipsis**: Simply truncate (pixel-art aesthetic)

### 7. Placeholder Reward Generation
- **Randomization**: Use Math.random() for XP, gold, item count
- **Unique Items**: Ensure no duplicate items in reward pool
- **Registry Access**: Query Equipment registry for all items

### 8. Exit Without Looting
- **Allowed**: Player can exit with 0 items looted
- **Warning**: No confirmation dialog (future enhancement)
- **Loss**: Unlooted items are lost (future: could add to encounter loot pool)

## Testing Checklist

### Victory Condition Tests
- [ ] All enemies KO'd triggers victory phase
- [ ] Victory phase transition happens after last enemy unit defeated
- [ ] Victory message appears in combat log
- [ ] Victory phase does not trigger if any enemy unit alive
- [ ] Victory check happens at end of each unit turn
- [ ] Victory checked BEFORE defeat (player wins simultaneous KO)

### Visual Tests
- [ ] Overlay renders correctly (full-screen, 70% black)
- [ ] Modal renders centered on map panel
- [ ] "VICTORY!" title renders in dungeonslant font, yellow color
- [ ] Experience text renders correctly with dynamic value
- [ ] Gold text renders correctly with dynamic value (yellow color)
- [ ] "Items Found" header renders correctly
- [ ] Item grid renders with correct layout (4 columns, up to 2 rows)
- [ ] 0 items: Empty grid area shown
- [ ] 1-8 items: All items visible in grid
- [ ] Item colors correct: grey (normal), yellow (hover), green (selected)
- [ ] Helper text shows "Click to loot" when hovering item
- [ ] Helper text hidden when not hovering item
- [ ] "Loot All" button renders correctly
- [ ] "Exit Encounter" button renders correctly
- [ ] Button hover states work (color change to yellow)

### Input Handling Tests
- [ ] Map panel mouse interactions disabled during victory
- [ ] Info panel buttons disabled during victory
- [ ] Turn order panel interactions disabled during victory
- [ ] Only victory modal items and buttons respond to mouse events
- [ ] Hover detection works for all items
- [ ] Hover detection works for both buttons
- [ ] Click detection works for all items
- [ ] Click detection works for both buttons

### Item Looting Tests
- [ ] Items start in unselected state (grey)
- [ ] Clicking item toggles selection (grey → green)
- [ ] Clicking selected item deselects (green → grey)
- [ ] Multiple items can be selected simultaneously
- [ ] "Loot All" button selects all items (all turn green)
- [ ] "Loot All" works with 0 items (no error)
- [ ] "Loot All" works with 1 item
- [ ] "Loot All" works with 8 items
- [ ] Individual item selection still works after "Loot All"
- [ ] Can deselect items after "Loot All"

### Reward Generation Tests
- [ ] Experience value is random (100-600 range)
- [ ] Gold value is random (10-110 range)
- [ ] Item count is random (0-8)
- [ ] All items are unique (no duplicates)
- [ ] Items are valid Equipment instances from registry
- [ ] Empty equipment registry handled gracefully

### Edge Case Tests
- [ ] Victory during animation completes animation first
- [ ] Victory condition takes precedence over defeat
- [ ] Combat log shows victory message
- [ ] Item name truncation works for long names
- [ ] Exit without looting any items works
- [ ] Exit with partial looting works
- [ ] Exit with all items looted works
- [ ] "Exit Encounter" logs to console (placeholder)

## Performance Considerations

### Rendering
- **Overlay**: Single fillRect call, negligible performance impact
- **Modal**: Simple rectangle rendering, minimal overhead
- **Item Grid**: Up to 8 text render calls, very fast
- **Total**: No measurable performance impact

### Reward Generation
- **Randomization**: One-time cost when entering victory phase
- **Item Selection**: O(n) where n = equipment count, acceptable
- **Storage**: Small data structure, negligible memory

### Input Handling
- **Event Routing**: Early return if victory phase active (minimal overhead)
- **Hit Detection**: Bounding box checks for 8 items + 2 buttons, negligible cost

## Future Extensions

### Item Tooltips
- **Hover Display**: Show full item stats on hover
- **Positioning**: Tooltip appears next to item
- **Content**: Name, description, stats, value

### Item Rarity Colors
- **Common**: White
- **Uncommon**: Green
- **Rare**: Blue
- **Epic**: Purple
- **Legendary**: Orange

### Animated Rewards
- **Count Up**: Experience/gold count up from 0
- **Item Reveal**: Items fade in one by one
- **Loot Effect**: Green glow when item selected

### Equipment Comparison
- **Hover**: Compare item to currently equipped
- **Display**: Show stat differences (+2 ATK, -1 DEF, etc.)
- **Color Coding**: Green for upgrades, red for downgrades

### Auto-Loot by Rarity
- **Setting**: Auto-loot all items of X rarity or higher
- **Convenience**: Reduces clicking for common loot
- **Control**: Player still has final say with manual deselection

### Inventory Full Warning
- **Check**: Before allowing "Exit Encounter"
- **Warning**: "Your inventory is full. Discard items or reduce selection."
- **Handling**: Force player to deselect items or open inventory

### Victory Statistics
- **Display**: Turns taken, damage dealt, damage taken, units lost
- **Comparison**: Best previous run stats
- **Rewards**: Bonus XP/gold for good performance

## Estimated Complexity

- **Implementation Time**: 8-10 hours
  - Victory condition system: 1 hour
  - Reward data structure: 1 hour
  - Victory phase handler: 2-3 hours
  - Victory modal rendering: 3-4 hours
  - Item interaction logic: 2 hours
  - Integration and testing: 1-2 hours
- **Testing Time**: 3-4 hours
- **Total**: ~11-14 hours

**Complexity Rating**: Medium-High (more complex than defeat screen due to item interaction)

**Risk Level**: Low-Medium
- **Low Risk**: Rendering system already exists, similar to defeat screen
- **Medium Risk**: Item interaction state management, reward generation randomness

## Dependencies

- **Requires**: KO Feature (for `isKnockedOut` property)
- **Requires**: Equipment system (for item data)
- **Requires**: Existing panel rendering system
- **Requires**: Existing font system (dungeonslant, 7px-04b03)
- **Relates To**: Defeat Screen (similar modal structure)

## Compatibility

- **Save/Load**: Victory phase is transient (not typically saved)
- **Existing Features**: No breaking changes to existing combat systems
- **Future Features**: Designed to support inventory system, equipment comparison, rarity tiers

---

## Success Criteria

This feature is complete when:
1. Victory condition triggers correctly when all enemies are KO'd
2. Victory modal renders correctly with all UI elements
3. Rewards display correctly (experience, gold, 0-8 items)
4. Item grid renders correctly in 4x2 layout
5. Item selection works (click to toggle grey/green)
6. Item hover works (yellow color, helper text)
7. "Loot All" button selects all items
8. "Exit Encounter" button is present but non-functional (placeholder)
9. All mouse inputs are properly disabled during victory phase
10. Combat log shows victory message
11. Victory check happens before defeat check (player wins ties)
12. All edge cases handled gracefully (0 items, 8 items, long names, etc.)
13. Tests pass for all core functionality

---

## Notes

- This feature is the foundation for future reward mechanics (inventory, equipment, loot rarity)
- The pluggable `CombatVictoryCondition` system allows for diverse encounter objectives
- Item looting system is designed to integrate with future inventory management
- "Exit Encounter" will eventually transition back to overworld with rewards applied
- Consider adding visual feedback (animations, sounds) in future iterations
