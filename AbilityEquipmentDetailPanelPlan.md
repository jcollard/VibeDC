# Ability & Equipment Detail Panel Implementation Plan

**Date:** 2025-10-28
**Feature:** Hover-based ability and equipment detail panels in bottom panel
**Branch:** ability-equipment-panel
**Priority:** High
**Complexity:** Low

---

## Overview

Replace the current inline helper text approach in `UnitInfoContent` abilities view with dedicated detail panels that appear in the bottom panel on hover. When the user hovers over an ability or equipment slot in the top panel, the bottom panel temporarily displays detailed information about that item.

This approach solves the space constraint issue discovered during testing - long ability/equipment descriptions don't fit in the 2-3 lines below the back button. The bottom panel (144×108px) provides sufficient space for full descriptions and stat modifiers.

---

## Requirements

### Visual Specifications

**AbilityInfoContent Panel:**
```
┌────────────────────────┐
│    Ability Name        │ ← Centered, orange (#FFA500)
│                        │
│    Description text    │ ← White, wrapped, bottom area
│    that continues on   │
│    multiple lines...   │
└────────────────────────┘
```

**EquipmentInfoContent Panel:**
```
┌────────────────────────┐
│    Equipment Name      │ ← Centered, orange (#FFA500)
│                        │
│  HP:            +10    │ ← Two-column grid
│  Speed:          +2    │   (only non-zero modifiers)
│  P.Pow:          +5    │   (only non-1.0 multipliers)
│                        │
│    Description if      │ ← White, wrapped (if exists)
│    available...        │
└────────────────────────┘
```

**Colors:**
- Item name: `#FFA500` (orange) - define as `ITEM_NAME_COLOR` constant
- Stat labels/values: `#ffffff` (white)
- Description text: `#ffffff` (white)

**Layout:**
- Panel size: 144×108px (12 tiles × 9 tiles)
- Padding: 1px around edges
- Line spacing: 8px (7px-04b03 font)
- Name: Centered horizontally at top
- Stats grid: 2px spacing after name, same two-column layout as UnitInfoContent
- Description: Bottom area, wrapped to fit width

### Behavior Specifications

**Hover Trigger:**
- Hovering over ability/equipment row in top panel `UnitInfoContent` (abilities view)
- Must hover over filled slot (not empty "-" slots)
- Hover must be on the row area (label or value)

**Panel Swap:**
- Bottom panel content replaced with `AbilityInfoContent` or `EquipmentInfoContent`
- Original bottom panel content (e.g., `ActionsMenuContent`) hidden during hover
- Original content restored when mouse leaves the hovered row

**Restoration Timing:**
- **Option A**: Restore when mouse leaves ability/equipment row ✅ (recommended)
- Mouse movement within same row does not trigger swap/restore
- Moving to different row swaps to new detail panel

**Empty Slots:**
- Hovering over "-" (empty slots) does nothing
- No panel swap for empty slots

### Technical Requirements

- Use `FontAtlasRenderer` for ALL text rendering
- Use `SpriteRenderer` for ALL sprite rendering (if sprites added later)
- Implement `PanelContent` interface for both new panels
- Use panel-relative coordinates throughout
- No state persistence needed (panels are ephemeral)
- Must follow GeneralGuidelines.md patterns
- Reuse existing color constants where possible

---

## Architecture Alignment

✅ **Follows GeneralGuidelines.md:**
- Uses specialized renderers (FontAtlasRenderer, SpriteRenderer)
- Panel-relative coordinates (PanelContent interface)
- Hover pattern matches existing UnitInfoContent
- No stateful components (detail panels are ephemeral)

✅ **Follows CombatHierarchy.md:**
- Implements `PanelContent` interface (lines 44-87)
- Managed by `InfoPanelManager` (delegates to PanelContent)
- Follows discriminated union pattern for hover results
- Rendering uses structured Y-tracking pattern

✅ **Reuses Existing Patterns:**
- Same layout approach as `UnitInfoContent` (two-column grid, centered title)
- Same hover detection logic as abilities view
- Same panel swap mechanism as deployment phase (party member hover)

---

## File Structure

### New Files

**1. `react-app/src/models/combat/managers/panels/AbilityInfoContent.ts`** (~100 lines)
- Implements `PanelContent` interface
- Renders ability name (centered, orange) and description (wrapped)
- Simple layout: title → spacing → description

**2. `react-app/src/models/combat/managers/panels/EquipmentInfoContent.ts`** (~120 lines)
- Implements `PanelContent` interface
- Renders equipment name (centered, orange)
- Renders stat modifiers in two-column grid (non-zero only)
- Renders multipliers (non-1.0 only)
- Renders description at bottom (if available)

### Modified Files

**3. `react-app/src/models/combat/managers/panels/colors.ts`** (+1 line)
- Add `ITEM_NAME_COLOR = '#FFA500'` constant

**4. `react-app/src/models/combat/managers/panels/UnitInfoContent.ts`** (~10 lines changed)
- Modify `handleHover()` to return `{ type: 'ability-detail' | 'equipment-detail', item: Ability | Equipment }`
- Keep existing hover highlighting behavior
- No changes to rendering (keep helper text removal from previous plan)

**5. `react-app/src/models/combat/layouts/CombatLayoutManager.ts`** (~30 lines changed)
- Handle hover result from `UnitInfoContent` in top panel hover handler
- Swap bottom panel content when hover returns detail type
- Restore original content when hover returns `null`
- Cache original bottom panel content for restoration
- Track whether detail panel is currently active

---

## Implementation Steps

### Step 1: Add Color Constant
**File:** `react-app/src/models/combat/managers/panels/colors.ts`

Add new constant:
```typescript
/**
 * Orange color for item names (abilities, equipment)
 */
export const ITEM_NAME_COLOR = '#FFA500';
```

**Rationale:** Centralized color management, matches action timer value color.

---

### Step 2: Create AbilityInfoContent
**File:** `react-app/src/models/combat/managers/panels/AbilityInfoContent.ts`

```typescript
import type { CombatAbility } from '../../Ability';
import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';
import { FontRegistry } from '../../../../utils/FontRegistry';
import type { PanelContent, PanelRegion } from './PanelContent';
import { ITEM_NAME_COLOR } from './colors';

/**
 * Panel content that displays detailed information about a combat ability.
 * Shows: centered ability name (orange) and wrapped description text.
 */
export class AbilityInfoContent implements PanelContent {
  private ability: CombatAbility;
  private padding: number = 1;
  private lineSpacing: number = 8;

  constructor(ability: CombatAbility) {
    this.ability = ability;
  }

  /**
   * Update the ability being displayed
   * Allows reusing the same panel instance for different abilities
   */
  public setAbility(ability: CombatAbility): void {
    this.ability = ability;
  }

  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;
    const font = FontRegistry.getById(fontId);
    if (!font) return;

    let y = region.y + this.padding;

    // Render ability name (centered, orange)
    const nameWidth = FontAtlasRenderer.measureText(this.ability.name, font);
    const nameX = region.x + Math.floor((region.width - nameWidth) / 2);
    FontAtlasRenderer.renderText(
      ctx,
      this.ability.name,
      nameX,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      ITEM_NAME_COLOR
    );

    y += this.lineSpacing + 2; // Spacing after name

    // Render description (wrapped, white)
    const maxWidth = region.width - (this.padding * 2);
    const descriptionLines = this.wrapText(this.ability.description, maxWidth, font);

    for (const line of descriptionLines) {
      // Stop if we exceed panel height
      if (y + this.lineSpacing > region.y + region.height - this.padding) {
        break;
      }

      FontAtlasRenderer.renderText(
        ctx,
        line,
        region.x + this.padding,
        y,
        fontId,
        fontAtlasImage,
        1,
        'left',
        '#ffffff'
      );
      y += this.lineSpacing;
    }
  }

  /**
   * Wrap text to fit within maximum width
   */
  private wrapText(text: string, maxWidth: number, font: any): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = FontAtlasRenderer.measureText(testLine, font);

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(word); // Word itself too long
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [text];
  }
}
```

**Rationale:**
- Simple, read-only display. No event handlers needed.
- Reuses text wrapping pattern from UnitInfoContent.
- **Setter method**: Allows reusing same instance for different abilities, avoiding object creation on every hover change.

---

### Step 3: Create EquipmentInfoContent
**File:** `react-app/src/models/combat/managers/panels/EquipmentInfoContent.ts`

```typescript
import type { Equipment } from '../../Equipment';
import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';
import { FontRegistry } from '../../../../utils/FontRegistry';
import type { PanelContent, PanelRegion } from './PanelContent';
import { ITEM_NAME_COLOR } from './colors';

/**
 * Panel content that displays detailed information about equipment.
 * Shows: centered equipment name (orange), stat modifiers grid, optional description.
 */
export class EquipmentInfoContent implements PanelContent {
  private equipment: Equipment;
  private padding: number = 1;
  private lineSpacing: number = 8;

  constructor(equipment: Equipment) {
    this.equipment = equipment;
  }

  /**
   * Update the equipment being displayed
   * Allows reusing the same panel instance for different equipment
   */
  public setEquipment(equipment: Equipment): void {
    this.equipment = equipment;
  }

  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;
    const font = FontRegistry.getById(fontId);
    if (!font) return;

    let y = region.y + this.padding;

    // Render equipment name (centered, orange)
    const nameWidth = FontAtlasRenderer.measureText(this.equipment.name, font);
    const nameX = region.x + Math.floor((region.width - nameWidth) / 2);
    FontAtlasRenderer.renderText(
      ctx,
      this.equipment.name,
      nameX,
      y,
      fontId,
      fontAtlasImage,
      1,
      'left',
      ITEM_NAME_COLOR
    );

    y += this.lineSpacing + 2; // Spacing after name

    // Get non-zero modifiers and non-1.0 multipliers
    const displayStats = this.getDisplayStats();

    if (displayStats.length > 0) {
      // Render stats grid (two columns)
      const statsAreaWidth = region.width - (this.padding * 2);
      const columnGap = 8;
      const columnWidth = (statsAreaWidth - columnGap) / 2;
      const leftColumnX = region.x + this.padding;
      const rightColumnX = leftColumnX + columnWidth + columnGap;

      const leftColumn = displayStats.filter((_, idx) => idx % 2 === 0);
      const rightColumn = displayStats.filter((_, idx) => idx % 2 === 1);

      const maxRows = Math.max(leftColumn.length, rightColumn.length);

      for (let i = 0; i < maxRows; i++) {
        // Stop if we exceed panel height
        if (y + this.lineSpacing > region.y + region.height - this.padding) {
          break;
        }

        // Render left column stat
        if (i < leftColumn.length) {
          const stat = leftColumn[i];
          FontAtlasRenderer.renderText(
            ctx,
            stat.label,
            leftColumnX,
            y,
            fontId,
            fontAtlasImage,
            1,
            'left',
            '#ffffff'
          );

          const valueWidth = FontAtlasRenderer.measureText(stat.value, font);
          const valueX = leftColumnX + columnWidth - valueWidth;
          FontAtlasRenderer.renderText(
            ctx,
            stat.value,
            valueX,
            y,
            fontId,
            fontAtlasImage,
            1,
            'left',
            '#ffffff'
          );
        }

        // Render right column stat
        if (i < rightColumn.length) {
          const stat = rightColumn[i];
          FontAtlasRenderer.renderText(
            ctx,
            stat.label,
            rightColumnX,
            y,
            fontId,
            fontAtlasImage,
            1,
            'left',
            '#ffffff'
          );

          const valueWidth = FontAtlasRenderer.measureText(stat.value, font);
          const valueX = rightColumnX + columnWidth - valueWidth;
          FontAtlasRenderer.renderText(
            ctx,
            stat.value,
            valueX,
            y,
            fontId,
            fontAtlasImage,
            1,
            'left',
            '#ffffff'
          );
        }

        y += this.lineSpacing;
      }

      y += 2; // Spacing after stats
    }

    // Render description if available (wrapped, white)
    // Note: Equipment may not have description property - check first
    // For now, we'll skip description since Equipment.ts doesn't define it
    // Future: Add description property to Equipment class if needed
  }

  /**
   * Get list of stats to display (non-zero modifiers, non-1.0 multipliers)
   */
  private getDisplayStats(): Array<{ label: string; value: string }> {
    const stats: Array<{ label: string; value: string }> = [];
    const modifiers = this.equipment.modifiers;

    // Check modifiers (non-zero only)
    if (modifiers.health !== 0) {
      stats.push({ label: 'HP', value: this.formatModifier(modifiers.health) });
    }
    if (modifiers.mana !== 0) {
      stats.push({ label: 'MP', value: this.formatModifier(modifiers.mana) });
    }
    if (modifiers.physicalPower !== 0) {
      stats.push({ label: 'P.Pow', value: this.formatModifier(modifiers.physicalPower) });
    }
    if (modifiers.magicPower !== 0) {
      stats.push({ label: 'M.Pow', value: this.formatModifier(modifiers.magicPower) });
    }
    if (modifiers.speed !== 0) {
      stats.push({ label: 'Speed', value: this.formatModifier(modifiers.speed) });
    }
    if (modifiers.movement !== 0) {
      stats.push({ label: 'Move', value: this.formatModifier(modifiers.movement) });
    }
    if (modifiers.physicalEvade !== 0) {
      stats.push({ label: 'P.Evd', value: this.formatModifier(modifiers.physicalEvade) });
    }
    if (modifiers.magicEvade !== 0) {
      stats.push({ label: 'M.Evd', value: this.formatModifier(modifiers.magicEvade) });
    }
    if (modifiers.courage !== 0) {
      stats.push({ label: 'Courage', value: this.formatModifier(modifiers.courage) });
    }
    if (modifiers.attunement !== 0) {
      stats.push({ label: 'Attunement', value: this.formatModifier(modifiers.attunement) });
    }

    // Check multipliers (non-1.0 only)
    if (modifiers.healthMultiplier !== 1.0) {
      stats.push({ label: 'HP', value: this.formatMultiplier(modifiers.healthMultiplier) });
    }
    if (modifiers.manaMultiplier !== 1.0) {
      stats.push({ label: 'MP', value: this.formatMultiplier(modifiers.manaMultiplier) });
    }
    if (modifiers.physicalPowerMultiplier !== 1.0) {
      stats.push({ label: 'P.Pow', value: this.formatMultiplier(modifiers.physicalPowerMultiplier) });
    }
    if (modifiers.magicPowerMultiplier !== 1.0) {
      stats.push({ label: 'M.Pow', value: this.formatMultiplier(modifiers.magicPowerMultiplier) });
    }
    if (modifiers.speedMultiplier !== 1.0) {
      stats.push({ label: 'Speed', value: this.formatMultiplier(modifiers.speedMultiplier) });
    }
    if (modifiers.movementMultiplier !== 1.0) {
      stats.push({ label: 'Move', value: this.formatMultiplier(modifiers.movementMultiplier) });
    }
    if (modifiers.physicalEvadeMultiplier !== 1.0) {
      stats.push({ label: 'P.Evd', value: this.formatMultiplier(modifiers.physicalEvadeMultiplier) });
    }
    if (modifiers.magicEvadeMultiplier !== 1.0) {
      stats.push({ label: 'M.Evd', value: this.formatMultiplier(modifiers.magicEvadeMultiplier) });
    }
    if (modifiers.courageMultiplier !== 1.0) {
      stats.push({ label: 'Courage', value: this.formatMultiplier(modifiers.courageMultiplier) });
    }
    if (modifiers.attunementMultiplier !== 1.0) {
      stats.push({ label: 'Attunement', value: this.formatMultiplier(modifiers.attunementMultiplier) });
    }

    return stats;
  }

  /**
   * Format modifier value (e.g., +5, -3)
   */
  private formatModifier(value: number): string {
    if (value > 0) {
      return `+${value}`;
    }
    return value.toString();
  }

  /**
   * Format multiplier value (e.g., x1.2, x0.8)
   * Uses ASCII 'x' not multiplication symbol for compatibility
   */
  private formatMultiplier(value: number): string {
    return `x${value.toFixed(1)}`;
  }

  /**
   * Wrap text to fit within maximum width
   */
  private wrapText(text: string, maxWidth: number, font: any): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = FontAtlasRenderer.measureText(testLine, font);

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(word);
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [text];
  }
}
```

**Rationale:**
- Two-column layout matches UnitInfoContent stats. Alternates stats between columns for visual balance.
- No description for now (Equipment class doesn't define it).
- **Setter method**: Allows reusing same instance for different equipment, avoiding object creation on every hover change.

---

### Step 4: Update UnitInfoContent Hover Return Type
**File:** `react-app/src/models/combat/managers/panels/UnitInfoContent.ts`

Modify `handleHover()` return value when hovering over ability/equipment slots:

```typescript
// Add imports at top
import type { CombatAbility } from '../../Ability';
import type { Equipment } from '../../Equipment';

// Modify handleHover() method (around line 591)
public handleHover(relativeX: number, relativeY: number): unknown {
  // ... existing bounds checking code ...

  // Check for stat/ability hover
  let statId: string | null = null;
  if (this.currentView === 'stats') {
    statId = this.getStatIdAt(relativeX, relativeY);
  } else {
    statId = this.getAbilityEquipmentIdAt(relativeX, relativeY);

    // NEW: If hovering over ability/equipment, return detail info
    if (statId !== null && statId !== this.hoveredStatId) {
      const detailInfo = this.getDetailInfo(statId);
      if (detailInfo) {
        this.hoveredStatId = statId;
        return detailInfo; // { type: 'ability-detail' | 'equipment-detail', item: ... }
      }
    }
  }

  // ... rest of existing logic ...
}

// NEW: Add helper method to get detail info
private getDetailInfo(slotLabel: string): { type: string; item: any } | null {
  // Check ability slots
  if (slotLabel === 'Reaction' && this.unit.reactionAbility) {
    return { type: 'ability-detail', item: this.unit.reactionAbility };
  }
  if (slotLabel === 'Passive' && this.unit.passiveAbility) {
    return { type: 'ability-detail', item: this.unit.passiveAbility };
  }
  if (slotLabel === 'Movement' && this.unit.movementAbility) {
    return { type: 'ability-detail', item: this.unit.movementAbility };
  }

  // Check equipment slots
  if ('leftHand' in this.unit) {
    const humanoid = this.unit as any;

    if (slotLabel === 'L.Hand' && humanoid.leftHand) {
      return { type: 'equipment-detail', item: humanoid.leftHand };
    }
    if (slotLabel === 'R.Hand' && humanoid.rightHand) {
      return { type: 'equipment-detail', item: humanoid.rightHand };
    }
    if (slotLabel === 'Head' && humanoid.head) {
      return { type: 'equipment-detail', item: humanoid.head };
    }
    if (slotLabel === 'Body' && humanoid.body) {
      return { type: 'equipment-detail', item: humanoid.body };
    }
    if (slotLabel === 'Accessory' && humanoid.accessory) {
      return { type: 'equipment-detail', item: humanoid.accessory };
    }
  }

  return null;
}
```

**Rationale:** Returns structured data for phase handler to consume. Keeps existing hover highlighting behavior intact.

---

### Step 5: Handle Hover in CombatLayoutManager
**File:** `react-app/src/models/combat/layouts/CombatLayoutManager.ts`

Add instance variables to track detail panel state and cached panel instances:

```typescript
// Add to class properties
private detailPanelActive: boolean = false;
private originalBottomPanelContent: PanelContent | null = null;

// Cache detail panel instances to avoid recreating on every hover
private cachedAbilityPanel: AbilityInfoContent | null = null;
private cachedEquipmentPanel: EquipmentInfoContent | null = null;
```

Modify top panel hover handler (in `handleTopPanelHover` method or create new handler):

```typescript
// Import new panel content classes at top of file
import { AbilityInfoContent } from '../managers/panels/AbilityInfoContent';
import { EquipmentInfoContent } from '../managers/panels/EquipmentInfoContent';

// In handleTopPanelHover or similar method
public handleTopPanelHover(canvasX: number, canvasY: number): void {
  const topPanelRegion = this.getTopPanelRegion();
  if (!topPanelRegion) return;

  // Check if hover is within top panel bounds
  if (canvasX >= topPanelRegion.x && canvasX < topPanelRegion.x + topPanelRegion.width &&
      canvasY >= topPanelRegion.y && canvasY < topPanelRegion.y + topPanelRegion.height) {

    // Transform to panel-relative coordinates
    const relativeX = canvasX - topPanelRegion.x;
    const relativeY = canvasY - topPanelRegion.y;

    // Get current top panel content (should be UnitInfoContent)
    const topContent = this.topPanelManager.getCurrentContent(); // Need to add getter
    if (topContent && 'handleHover' in topContent) {
      const hoverResult = topContent.handleHover(relativeX, relativeY);

      // Check if result is detail info
      if (hoverResult && typeof hoverResult === 'object' && 'type' in hoverResult) {
        if (hoverResult.type === 'ability-detail') {
          // Cache original bottom panel content if not already cached
          if (!this.detailPanelActive && this.bottomPanelManager.getCurrentContent()) {
            this.originalBottomPanelContent = this.bottomPanelManager.getCurrentContent();
          }

          // Create or reuse cached ability panel
          if (!this.cachedAbilityPanel) {
            this.cachedAbilityPanel = new AbilityInfoContent(hoverResult.item);
          } else {
            // Update existing panel with new ability
            this.cachedAbilityPanel.setAbility(hoverResult.item);
          }

          this.bottomPanelManager.setContent(this.cachedAbilityPanel);
          this.detailPanelActive = true;
        } else if (hoverResult.type === 'equipment-detail') {
          // Cache original bottom panel content if not already cached
          if (!this.detailPanelActive && this.bottomPanelManager.getCurrentContent()) {
            this.originalBottomPanelContent = this.bottomPanelManager.getCurrentContent();
          }

          // Create or reuse cached equipment panel
          if (!this.cachedEquipmentPanel) {
            this.cachedEquipmentPanel = new EquipmentInfoContent(hoverResult.item);
          } else {
            // Update existing panel with new equipment
            this.cachedEquipmentPanel.setEquipment(hoverResult.item);
          }

          this.bottomPanelManager.setContent(this.cachedEquipmentPanel);
          this.detailPanelActive = true;
        }
      } else if (hoverResult && typeof hoverResult === 'object' && 'statId' in hoverResult && hoverResult.statId === null) {
        // Restore original bottom panel content
        if (this.detailPanelActive && this.originalBottomPanelContent) {
          this.bottomPanelManager.setContent(this.originalBottomPanelContent);
          this.detailPanelActive = false;
          this.originalBottomPanelContent = null;
        }
      }
    }
  } else if (this.detailPanelActive) {
    // Mouse left top panel area entirely - restore original content
    if (this.originalBottomPanelContent) {
      this.bottomPanelManager.setContent(this.originalBottomPanelContent);
      this.detailPanelActive = false;
      this.originalBottomPanelContent = null;
    }
  }
}
```

Hook up to mouse move handler in `CombatView.tsx`:

```typescript
// In CombatView's handleMouseMove
const layoutManager = ...; // Get reference to CombatLayoutManager
layoutManager.handleTopPanelHover(canvasX, canvasY);
```

**Rationale:**
- CombatLayoutManager coordinates all panel interactions, making it the natural place for cross-panel hover logic
- Works across all phases that use UnitInfoContent, not just unit-turn phase
- **Caching**: Creates panel instances once, then reuses them with setter methods. This avoids GC pressure since hover is checked every frame (60 FPS). Without caching, hovering 5 abilities creates 5 objects; with caching, only 2 objects total (one per panel type).

---

### Step 6: Keep Helper Text System
**File:** `react-app/src/models/combat/managers/panels/UnitInfoContent.ts`

**Decision:** Keep existing helper text and "View Abilities" / "Back" button system.

**Rationale:** User feedback confirms buttons are necessary for toggling between stats and abilities views. Helper text provides quick inline info without requiring hover on different panel. Bottom panel detail view is **additive**, not a replacement for inline helper text.

---

### Step 7: Update Panel Content Index
**File:** `react-app/src/models/combat/managers/panels/index.ts`

Add exports for new panel content:

```typescript
export { AbilityInfoContent } from './AbilityInfoContent';
export { EquipmentInfoContent } from './EquipmentInfoContent';
// ... existing exports ...
```

**Rationale:** Convenience import for consumers.

---

## Hover Event Flow

### Scenario 1: Hover Over Ability

1. Mouse enters "Reaction" row in top panel (abilities view)
2. `UnitInfoContent.handleHover(x, y)` called
3. `getAbilityEquipmentIdAt()` returns `'Reaction'`
4. `getDetailInfo('Reaction')` returns `{ type: 'ability-detail', item: reactionAbility }`
5. Phase handler receives hover result
6. Phase handler creates `new AbilityInfoContent(reactionAbility)`
7. Phase handler calls `infoPanelManager.setContent(detailPanel)` on bottom panel
8. Bottom panel renders ability details
9. Top panel continues showing abilities list with yellow highlight on "Reaction"

### Scenario 2: Mouse Leaves Row

1. Mouse moves off "Reaction" row
2. `UnitInfoContent.handleHover(x, y)` called with new coordinates
3. `getAbilityEquipmentIdAt()` returns `null`
4. `handleHover()` returns `{ statId: null }`
5. Phase handler detects `detailPanelActive === true`
6. Phase handler calls `infoPanelManager.setContent(originalContent)` on bottom panel
7. Bottom panel restores to original content (e.g., ActionsMenuContent)
8. Top panel clears yellow highlight

### Scenario 3: Rapid Hover Between Slots

1. Mouse moves from "Reaction" to "L.Hand" quickly
2. First hover returns `{ type: 'ability-detail', item: reactionAbility }`
3. Bottom panel shows AbilityInfoContent
4. Second hover returns `{ type: 'equipment-detail', item: leftHandEquipment }`
5. Bottom panel immediately swaps to EquipmentInfoContent
6. No intermediate restoration to original content

---

## Testing Checklist

### Visual Tests
- [ ] AbilityInfoContent renders ability name centered in orange
- [ ] AbilityInfoContent wraps long descriptions correctly
- [ ] EquipmentInfoContent renders equipment name centered in orange
- [ ] EquipmentInfoContent shows non-zero modifiers only
- [ ] EquipmentInfoContent shows non-1.0 multipliers only
- [ ] EquipmentInfoContent alternates stats between two columns
- [ ] Stats grid labels left-aligned, values right-aligned
- [ ] Multipliers formatted as "x1.2" not "1.2" (ASCII 'x', not multiplication symbol)
- [ ] Modifiers formatted with sign: "+5" not "5"

### Interaction Tests
- [ ] Hovering over ability row swaps bottom panel
- [ ] Hovering over equipment row swaps bottom panel
- [ ] Moving mouse off row restores original panel
- [ ] Hovering over empty "-" slots does nothing
- [ ] Rapid hover between slots swaps panels correctly
- [ ] Top panel keeps yellow highlight during hover
- [ ] Bottom panel animations disabled (instant swap)

### Edge Cases
- [ ] Equipment with no modifiers shows only name
- [ ] Equipment with many modifiers doesn't overflow panel
- [ ] Very long ability descriptions wrap correctly
- [ ] Very long equipment names don't overflow
- [ ] Monster units (no equipment) work correctly
- [ ] Units with all empty ability slots work correctly

### Integration Tests
- [ ] Works during unit-turn phase
- [ ] Doesn't interfere with action menu clicks
- [ ] Hovering button doesn't trigger detail panel
- [ ] Switching between stats/abilities views works
- [ ] Panel restoration preserves original state

---

## Implementation Order

1. Add `ITEM_NAME_COLOR` constant (Step 1) - 5 min
2. Create `AbilityInfoContent.ts` (Step 2) - 20 min
3. Create `EquipmentInfoContent.ts` (Step 3) - 30 min
4. Update `UnitInfoContent.handleHover()` (Step 4) - 15 min
5. Handle hover in CombatLayoutManager (Step 5) - 30 min
6. Update panel exports (Step 7) - 2 min
7. Test thoroughly (use checklist) - 20 min

**Total Estimated Time: ~2 hours**

---

## Success Criteria

✅ Ability details display in bottom panel on hover
✅ Equipment details display in bottom panel on hover
✅ Stat modifiers and multipliers formatted correctly
✅ Panel swapping is smooth and immediate
✅ Original panel content restores correctly
✅ No visual glitches or layout issues
✅ All rendering uses FontAtlasRenderer
✅ No violations of GeneralGuidelines.md
✅ All tests pass

---

## Guidelines Compliance Checklist

✅ Uses `FontAtlasRenderer.renderText()` for ALL text
✅ Uses `SpriteRenderer.renderSpriteById()` for sprites (if added later)
✅ Implements `PanelContent` interface
✅ Uses panel-relative coordinates
✅ Cached components for performance (panels reused via setters)
✅ Hover detection reuses existing pattern
✅ Returns discriminated union from hover
✅ No domain model changes
✅ Minimal file modifications

---

## Notes & Decisions

### Decision: No Description for Equipment
**Choice:** Skip equipment description rendering for now
**Rationale:** Equipment class doesn't define description property. Can add later if needed.
**Alternative:** Add description property to Equipment class (requires domain model change)

### Decision: Two-Column Layout for Equipment Stats
**Choice:** Alternate stats between left and right columns
**Rationale:** Matches UnitInfoContent stats layout, familiar to users
**Alternative:** Single column (wastes horizontal space)

### Decision: Hover Triggers Immediate Swap
**Choice:** No debouncing, immediate panel swap on hover
**Rationale:** Matches existing hover behavior (UnitInfoContent stats), feels responsive
**Alternative:** 100ms debounce (feels sluggish)

### Decision: Restore on Mouse Leave Row
**Choice:** Restore when mouse leaves row, not when leaving panel
**Rationale:** Allows user to move mouse within row without flicker
**Alternative:** Restore on panel exit (allows detail panel to persist longer, but may feel "sticky")

### Decision: Keep View Toggle Buttons
**Choice:** Keep "View Abilities" / "Back" button system
**Rationale:** User feedback confirms buttons are necessary for switching views. Bottom panel detail is additive, not a replacement.
**Alternative:** Remove buttons (rejected - requires hover to see abilities at all)

### Decision: Use ASCII 'x' for Multipliers
**Choice:** Format multipliers as "x1.2" using ASCII character 'x'
**Rationale:** Font atlas only supports ASCII characters, no multiplication symbol available
**Alternative:** Use '*' character (confusing with multiplication operation)

### Decision: Handle Hover in CombatLayoutManager
**Choice:** Implement hover logic in CombatLayoutManager, not phase handlers
**Rationale:** Works across all phases that use UnitInfoContent (not just unit-turn). CombatLayoutManager already coordinates panel interactions.
**Alternative:** Implement in each phase handler (duplicated code, phase-specific only)

### Decision: Cache Detail Panel Instances
**Choice:** Cache one instance per panel type, update with setters on hover change
**Rationale:** Hover is checked every frame (60 FPS). Without caching, creates new object on every hover change. With caching, creates 2 objects total (one per panel type), zero GC pressure after initial creation.
**Alternative:** Recreate on every hover (creates 1 object per hover change, unnecessary GC pressure)
**Performance:** At 60 FPS, hovering for 1 second without caching = 60 potential allocations if hover changes. With caching = 1 allocation per panel type ever.

---

**End of Implementation Plan**
