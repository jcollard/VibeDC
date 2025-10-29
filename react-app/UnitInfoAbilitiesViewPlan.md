# Unit Info Abilities View Implementation Plan

**Date:** 2025-10-28
**Feature:** Add abilities/equipment view toggle to UnitInfoContent
**Complexity:** Medium (3-4 hours)

---

## Overview

Add a view toggle system to `UnitInfoContent.ts` that allows users to switch between:
- **Stats View** (current): Shows unit stats (HP, MP, Speed, etc.)
- **Abilities View** (new): Shows assigned ability slots and equipment (humanoid only)

Users toggle between views using a centered button positioned between content and helper text.

---

## Requirements

### Visual Specifications
- **Button**: "View Abilities" in stats view, "Back" in abilities view
- **Button position**: Centered horizontally, between content and helper text
- **Button padding**: 2px above and below
- **Ability slots**: "Reaction", "Passive", "Movement" (left-aligned labels, right-aligned values)
- **Equipment slots**: "L.Hand", "R.Hand", "Head", "Body", "Accessory" (same alignment)
- **Empty slots**: Show "-" (non-interactive)
- **Colors**: White text for all content, yellow (#ffff00) for helper text

### Behavioral Specifications
- Clicking button toggles between views
- View state persists per unit (due to caching)
- Hovering over ability shows description in helper text area
- Hovering over equipment shows description + stat modifiers in helper text
- Hovering over "-" does nothing (not interactive)
- If helper text exceeds available vertical space, show "Click for Detail"
- Clicking "Click for Detail" outputs full text to combat log
- Switching views clears helper text

### Technical Requirements
- Use `FontAtlasRenderer` for ALL text rendering (no `ctx.fillText()`)
- Use `SpriteRenderer` for ALL sprite rendering (no `ctx.drawImage()` on sprite sheets)
- Use existing `PanelContent` interface signature
- Equipment modifiers from `CombatUnitModifiers.getSummary()` method
- Abilities from `CombatUnit.reactionAbility`, `passiveAbility`, `movementAbility`
- Equipment from `HumanoidUnit.leftHand`, `rightHand`, `head`, `body`, `accessory`
- Must follow all GeneralGuidelines.md patterns

---

## Architecture Alignment

✅ **Follows GeneralGuidelines.md:**
- Uses `FontAtlasRenderer.renderText()` for all text (lines 12-15)
- Uses `SpriteRenderer.renderSpriteById()` for sprites (lines 6-9)
- Caches stateful component (UnitInfoContent already cached)
- No domain model changes
- Single file modification

✅ **Follows CombatHierarchy.md:**
- UnitInfoContent is PanelContentRenderer (cached, stateful)
- Managed by CombatLayoutManager
- Standard hover interaction pattern

---

## Implementation Steps

### Step 1: Add View State Management
**File**: `react-app/src/models/combat/managers/panels/UnitInfoContent.ts`

Add instance variables for view state:
```typescript
private currentView: 'stats' | 'abilities' = 'stats';
private buttonBounds: { x: number; y: number; width: number; height: number } | null = null;
```

**Rationale**: View state persists per unit instance due to caching pattern.

---

### Step 2: Add Toggle Method
Add method to switch between views:
```typescript
private toggleView(): void {
  this.currentView = this.currentView === 'stats' ? 'abilities' : 'stats';
  this.hoveredStatId = null; // Clear hover state
}
```

**Rationale**: Simple state toggle, clears helper text on view change.

---

### Step 3: Refactor render() Method Structure
Split rendering into view-specific methods (modify existing `render()` method):

```typescript
public render(
  ctx: CanvasRenderingContext2D,
  region: PanelRegion,
  fontId: string,
  fontAtlasImage: HTMLImageElement | null,
  spriteImages?: Map<string, HTMLImageElement>,
  spriteSize?: number
): void {
  if (!fontAtlasImage) return;
  const font = FontRegistry.getById(fontId);
  if (!font) return;

  // Cache region dimensions for hit detection
  this.lastRegionWidth = region.width;
  this.lastRegionHeight = region.height;

  // Render common header (sprite, name, class, action timer)
  let currentY = this.renderHeader(ctx, region, fontId, fontAtlasImage, font, spriteImages, spriteSize);

  // Render view-specific content
  if (this.currentView === 'stats') {
    currentY = this.renderStatsView(ctx, region, fontId, fontAtlasImage, font, currentY);
  } else {
    currentY = this.renderAbilitiesView(ctx, region, fontId, fontAtlasImage, font, currentY);
  }

  // Render toggle button (centered, with 2px padding)
  currentY += 2; // Padding above button
  currentY = this.renderToggleButton(ctx, region, fontId, fontAtlasImage, font, currentY);
  currentY += 2; // Padding below button

  // Render helper text (if any)
  this.renderHelperText(ctx, region, fontId, fontAtlasImage, font, currentY);
}
```

**Rationale**: Structured flow - header → content → button → helper text. Each section returns its consumed height.

---

### Step 4: Extract Header Rendering
Move existing header code into separate method:
```typescript
private renderHeader(
  ctx: CanvasRenderingContext2D,
  region: PanelRegion,
  fontId: string,
  fontAtlasImage: HTMLImageElement,
  font: any,
  spriteImages?: Map<string, HTMLImageElement>,
  spriteSize?: number
): number {
  // Copy existing header rendering logic (lines 66-202)
  // Sprite, name, class, action timer
  // Return: classY + this.config.lineSpacing (Y position after header)

  const spriteX = region.x + this.config.padding;
  const spriteY = region.y + this.config.padding;

  // Sprite rendering (existing code)
  if (spriteImages && spriteSize) {
    SpriteRenderer.renderSpriteById(ctx, this.unit.spriteId, spriteImages, spriteSize, spriteX, spriteY, 12, 12);
  }

  // Name rendering (existing code)
  const nameX = spriteX + 12 + 2;
  const nameY = spriteY;
  const nameColor = this.unit.isPlayerControlled ? '#00ff00' : '#ff0000';
  FontAtlasRenderer.renderText(ctx, this.unit.name, nameX, nameY, fontId, fontAtlasImage, 1, 'left', nameColor);

  // Class rendering (existing code)
  const classY = nameY + this.config.lineSpacing;
  let classText = this.unit.unitClass.name;
  if (this.unit.secondaryClass) {
    classText += `/${this.unit.secondaryClass.name}`;
  }
  FontAtlasRenderer.renderText(ctx, classText, nameX, classY, fontId, fontAtlasImage, 1, 'left', '#ffffff');

  // Action Timer rendering (existing code, lines 121-201)
  // ... (keep existing logic) ...

  return classY + this.config.lineSpacing;
}
```

**Rationale**: Reuses existing header rendering unchanged. Returns Y position for next section.

---

### Step 5: Refactor Stats View Rendering
Move existing stats grid into separate method:
```typescript
private renderStatsView(
  ctx: CanvasRenderingContext2D,
  region: PanelRegion,
  fontId: string,
  fontAtlasImage: HTMLImageElement,
  font: any,
  startY: number
): number {
  // Copy existing stats grid rendering (lines 203-310)
  // Two-column layout with left/right aligned values
  // Return: final statsY position after all stats rendered

  const leftColumnStats = [
    { label: 'HP', value: `${this.unit.health}/${this.unit.maxHealth}` },
    { label: 'P.Pow', value: `${this.unit.physicalPower}` },
    { label: 'M.Pow', value: `${this.unit.magicPower}` },
    { label: 'Move', value: `${this.unit.movement}` },
    { label: 'Courage', value: `${this.unit.courage}` }
  ];

  const rightColumnStats = [
    { label: 'MP', value: `${this.unit.mana}/${this.unit.maxMana}` },
    { label: 'P.Evd', value: `${this.unit.physicalEvade}` },
    { label: 'M.Evd', value: `${this.unit.magicEvade}` },
    { label: 'Speed', value: `${this.unit.speed}` },
    { label: 'Attunement', value: `${this.unit.attunement}` }
  ];

  const statsAreaWidth = region.width - (this.config.padding * 2);
  const columnGap = 8;
  const columnWidth = (statsAreaWidth - columnGap) / 2;
  const leftColumnX = region.x + this.config.padding;
  const rightColumnX = leftColumnX + columnWidth + columnGap;
  let statsY = startY + 4; // 4px spacing before stats

  // Render left column (existing logic, lines 236-270)
  for (const stat of leftColumnStats) {
    const isHovered = this.hoveredStatId === stat.label;
    const color = isHovered ? HOVERED_TEXT : '#ffffff';

    FontAtlasRenderer.renderText(ctx, stat.label, leftColumnX, statsY, fontId, fontAtlasImage, 1, 'left', color);

    const valueWidth = FontAtlasRenderer.measureText(stat.value, font);
    const valueX = leftColumnX + columnWidth - valueWidth;
    FontAtlasRenderer.renderText(ctx, stat.value, valueX, statsY, fontId, fontAtlasImage, 1, 'left', color);

    statsY += this.config.lineSpacing;
  }

  // Render right column (existing logic, lines 272-310)
  statsY = startY + 4; // Reset for parallel rendering
  for (const stat of rightColumnStats) {
    const isHovered = this.hoveredStatId === stat.label;
    const color = isHovered ? HOVERED_TEXT : '#ffffff';

    FontAtlasRenderer.renderText(ctx, stat.label, rightColumnX, statsY, fontId, fontAtlasImage, 1, 'left', color);

    const valueWidth = FontAtlasRenderer.measureText(stat.value, font);
    const valueX = rightColumnX + columnWidth - valueWidth;
    FontAtlasRenderer.renderText(ctx, stat.value, valueX, statsY, fontId, fontAtlasImage, 1, 'left', color);

    statsY += this.config.lineSpacing;
  }

  return statsY; // Return Y position after last stat row
}
```

**Rationale**: Minimal changes - just extracted existing code into method.

---

### Step 6: Implement Abilities View Rendering
Create new method for abilities/equipment view:
```typescript
private renderAbilitiesView(
  ctx: CanvasRenderingContext2D,
  region: PanelRegion,
  fontId: string,
  fontAtlasImage: HTMLImageElement,
  font: any,
  startY: number
): number {
  const padding = this.config.padding;
  const lineSpacing = this.config.lineSpacing;
  let y = startY + 4; // 4px spacing before abilities

  // Render ability slots
  y = this.renderAbilitySlot(ctx, region, 'Reaction', this.unit.reactionAbility, fontId, fontAtlasImage, font, y);
  y = this.renderAbilitySlot(ctx, region, 'Passive', this.unit.passiveAbility, fontId, fontAtlasImage, font, y);
  y = this.renderAbilitySlot(ctx, region, 'Movement', this.unit.movementAbility, fontId, fontAtlasImage, font, y);

  // Render equipment slots (only for humanoid units)
  if ('leftHand' in this.unit) {
    const humanoid = this.unit as any; // Type assertion for equipment access
    y = this.renderEquipmentSlot(ctx, region, 'L.Hand', humanoid.leftHand, fontId, fontAtlasImage, font, y);
    y = this.renderEquipmentSlot(ctx, region, 'R.Hand', humanoid.rightHand, fontId, fontAtlasImage, font, y);
    y = this.renderEquipmentSlot(ctx, region, 'Head', humanoid.head, fontId, fontAtlasImage, font, y);
    y = this.renderEquipmentSlot(ctx, region, 'Body', humanoid.body, fontId, fontAtlasImage, font, y);
    y = this.renderEquipmentSlot(ctx, region, 'Accessory', humanoid.accessory, fontId, fontAtlasImage, font, y);
  }

  return y;
}
```

**Rationale**: Checks for equipment properties at runtime (humanoid vs monster). Returns Y position after all slots.

---

### Step 7: Implement Ability Slot Rendering
```typescript
private renderAbilitySlot(
  ctx: CanvasRenderingContext2D,
  region: PanelRegion,
  label: string,
  ability: CombatAbility | null,
  fontId: string,
  fontAtlasImage: HTMLImageElement,
  font: any,
  y: number
): number {
  const padding = this.config.padding;
  const lineSpacing = this.config.lineSpacing;

  // Determine color based on hover
  const isHovered = this.hoveredStatId === label;
  const color = isHovered ? HOVERED_TEXT : '#ffffff';

  // Render label (left-aligned)
  const labelX = region.x + padding;
  FontAtlasRenderer.renderText(ctx, label, labelX, y, fontId, fontAtlasImage, 1, 'left', color);

  // Render ability name or "-" (right-aligned)
  const abilityName = ability ? ability.name : '-';
  const valueWidth = FontAtlasRenderer.measureText(abilityName, font);
  const valueX = region.x + region.width - padding - valueWidth;
  FontAtlasRenderer.renderText(ctx, abilityName, valueX, y, fontId, fontAtlasImage, 1, 'left', color);

  return y + lineSpacing;
}
```

**Rationale**: Same layout pattern as stats (label left, value right). Uses `hoveredStatId` for consistency.

---

### Step 8: Implement Equipment Slot Rendering
```typescript
private renderEquipmentSlot(
  ctx: CanvasRenderingContext2D,
  region: PanelRegion,
  label: string,
  equipment: any, // Equipment | null
  fontId: string,
  fontAtlasImage: HTMLImageElement,
  font: any,
  y: number
): number {
  const padding = this.config.padding;
  const lineSpacing = this.config.lineSpacing;

  // Determine color based on hover
  const isHovered = this.hoveredStatId === label;
  const color = isHovered ? HOVERED_TEXT : '#ffffff';

  // Render label (left-aligned)
  const labelX = region.x + padding;
  FontAtlasRenderer.renderText(ctx, label, labelX, y, fontId, fontAtlasImage, 1, 'left', color);

  // Render equipment name or "-" (right-aligned)
  const equipmentName = equipment ? equipment.name : '-';
  const valueWidth = FontAtlasRenderer.measureText(equipmentName, font);
  const valueX = region.x + region.width - padding - valueWidth;
  FontAtlasRenderer.renderText(ctx, equipmentName, valueX, y, fontId, fontAtlasImage, 1, 'left', color);

  return y + lineSpacing;
}
```

**Rationale**: Identical to ability slot rendering. Same hover pattern.

---

### Step 9: Implement Toggle Button Rendering
```typescript
private renderToggleButton(
  ctx: CanvasRenderingContext2D,
  region: PanelRegion,
  fontId: string,
  fontAtlasImage: HTMLImageElement,
  font: any,
  y: number
): number {
  const lineSpacing = this.config.lineSpacing;
  const buttonText = this.currentView === 'stats' ? 'View Abilities' : 'Back';

  // Measure text width for centering
  const textWidth = FontAtlasRenderer.measureText(buttonText, font);
  const textX = region.x + Math.floor((region.width - textWidth) / 2);

  // Render button text (centered)
  FontAtlasRenderer.renderText(ctx, buttonText, textX, y, fontId, fontAtlasImage, 1, 'left', '#ffffff');

  // Store button bounds for click detection
  this.buttonBounds = {
    x: textX - region.x, // Panel-relative X
    y: y - region.y,     // Panel-relative Y
    width: textWidth,
    height: lineSpacing
  };

  return y + lineSpacing;
}
```

**Rationale**: Centered text, stores bounds for click detection. Returns Y position after button.

---

### Step 10: Update Helper Text Rendering
Modify existing `renderHelperText()` to support "Click for Detail" pattern:

```typescript
private currentHelperTextFull: string | null = null;
private isHelperTextTruncated: boolean = false;

private renderHelperText(
  ctx: CanvasRenderingContext2D,
  region: PanelRegion,
  fontId: string,
  fontAtlasImage: HTMLImageElement,
  font: any,
  startY: number
): void {
  // Get helper text from appropriate source
  let helperText: string | null = null;

  if (this.hoveredStatId !== null) {
    if (this.currentView === 'stats') {
      // Stats view - use existing helper text
      helperText = this.statHelperText[this.hoveredStatId] || null;
    } else {
      // Abilities view - get from ability/equipment
      helperText = this.getAbilityEquipmentHelperText(this.hoveredStatId);
    }
  }

  if (!helperText) {
    this.currentHelperTextFull = null;
    this.isHelperTextTruncated = false;
    return;
  }

  const padding = this.config.padding;
  const lineSpacing = this.config.lineSpacing;
  const availableHeight = region.height - (startY - region.y) - padding;

  // Wrap text
  const wrappedLines = this.wrapText(helperText, region.width - (padding * 2), fontId);
  const requiredHeight = wrappedLines.length * lineSpacing;

  if (requiredHeight > availableHeight) {
    // Text doesn't fit - show "Click for Detail"
    this.isHelperTextTruncated = true;
    this.currentHelperTextFull = helperText;

    FontAtlasRenderer.renderText(
      ctx,
      'Click for Detail',
      region.x + padding,
      startY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      HELPER_TEXT
    );
  } else {
    // Text fits - render normally
    this.isHelperTextTruncated = false;
    this.currentHelperTextFull = null;

    let y = startY;
    for (const line of wrappedLines) {
      FontAtlasRenderer.renderText(
        ctx,
        line,
        region.x + padding,
        y,
        fontId,
        fontAtlasImage,
        1,
        'left',
        HELPER_TEXT
      );
      y += lineSpacing;
    }
  }
}
```

**Rationale**: Extends existing helper text logic with overflow handling. Stores full text for click handler.

---

### Step 11: Implement Helper Text Retrieval
```typescript
private getAbilityEquipmentHelperText(slotLabel: string): string | null {
  // Check ability slots
  if (slotLabel === 'Reaction' && this.unit.reactionAbility) {
    return this.unit.reactionAbility.description;
  }
  if (slotLabel === 'Passive' && this.unit.passiveAbility) {
    return this.unit.passiveAbility.description;
  }
  if (slotLabel === 'Movement' && this.unit.movementAbility) {
    return this.unit.movementAbility.description;
  }

  // Check equipment slots (only for humanoid units)
  if ('leftHand' in this.unit) {
    const humanoid = this.unit as any;

    if (slotLabel === 'L.Hand' && humanoid.leftHand) {
      return this.formatEquipmentHelperText(humanoid.leftHand);
    }
    if (slotLabel === 'R.Hand' && humanoid.rightHand) {
      return this.formatEquipmentHelperText(humanoid.rightHand);
    }
    if (slotLabel === 'Head' && humanoid.head) {
      return this.formatEquipmentHelperText(humanoid.head);
    }
    if (slotLabel === 'Body' && humanoid.body) {
      return this.formatEquipmentHelperText(humanoid.body);
    }
    if (slotLabel === 'Accessory' && humanoid.accessory) {
      return this.formatEquipmentHelperText(humanoid.accessory);
    }
  }

  return null;
}

private formatEquipmentHelperText(equipment: any): string {
  // Equipment doesn't have description property, so we use the modifier summary
  // Format: "Equipment Name\nStat modifiers"
  const modifierSummary = equipment.modifiers.getSummary();

  if (modifierSummary === 'No modifiers') {
    return equipment.name;
  }

  return `${equipment.name}\n${modifierSummary}`;
}
```

**Rationale**: Uses existing `CombatUnitModifiers.getSummary()` method. Returns formatted string with modifiers.

---

### Step 12: Update Hover Handling
Modify existing `handleHover()` to support abilities view:

```typescript
public handleHover(relativeX: number, relativeY: number): unknown {
  // Check if mouse is outside panel bounds (existing logic)
  if (relativeX < 0 || relativeY < 0 ||
      relativeX >= this.lastRegionWidth ||
      relativeY >= this.lastRegionHeight) {
    if (this.hoveredStatId !== null) {
      this.hoveredStatId = null;
      return { statId: null };
    }
    return null;
  }

  let statId: string | null = null;

  if (this.currentView === 'stats') {
    // Use existing getStatIdAt logic
    statId = this.getStatIdAt(relativeX, relativeY);
  } else {
    // New abilities view logic
    statId = this.getAbilityEquipmentIdAt(relativeX, relativeY);
  }

  // Update hover state if changed
  if (statId !== this.hoveredStatId) {
    this.hoveredStatId = statId;
    return { statId };
  }

  return null;
}
```

**Rationale**: Reuses existing hover logic for stats, adds new method for abilities.

---

### Step 13: Implement Abilities Hover Detection
```typescript
private getAbilityEquipmentIdAt(relativeX: number, relativeY: number): string | null {
  const padding = this.config.padding;
  const lineSpacing = this.config.lineSpacing;

  // Calculate header height (sprite + name + class = 3 lines)
  const headerHeight = padding + (lineSpacing * 3);

  // Calculate abilities start Y
  const abilitiesStartY = headerHeight + 4; // 4px spacing

  // Check if Y is below header
  if (relativeY < abilitiesStartY) {
    return null;
  }

  // Calculate row index
  const rowY = relativeY - abilitiesStartY;
  const rowIndex = Math.floor(rowY / lineSpacing);

  // Ability slots (rows 0-2)
  const abilitySlots = ['Reaction', 'Passive', 'Movement'];
  if (rowIndex >= 0 && rowIndex < abilitySlots.length) {
    const label = abilitySlots[rowIndex];

    // Check if slot is empty (show "-")
    if (label === 'Reaction' && !this.unit.reactionAbility) return null;
    if (label === 'Passive' && !this.unit.passiveAbility) return null;
    if (label === 'Movement' && !this.unit.movementAbility) return null;

    return label;
  }

  // Equipment slots (rows 3-7, only for humanoid units)
  if ('leftHand' in this.unit) {
    const equipmentSlots = ['L.Hand', 'R.Hand', 'Head', 'Body', 'Accessory'];
    const equipmentRowIndex = rowIndex - abilitySlots.length;

    if (equipmentRowIndex >= 0 && equipmentRowIndex < equipmentSlots.length) {
      const label = equipmentSlots[equipmentRowIndex];
      const humanoid = this.unit as any;

      // Check if slot is empty (show "-")
      if (label === 'L.Hand' && !humanoid.leftHand) return null;
      if (label === 'R.Hand' && !humanoid.rightHand) return null;
      if (label === 'Head' && !humanoid.head) return null;
      if (label === 'Body' && !humanoid.body) return null;
      if (label === 'Accessory' && !humanoid.accessory) return null;

      return label;
    }
  }

  return null;
}
```

**Rationale**: Similar structure to `getStatIdAt()`. Returns null for empty slots (non-interactive "-").

---

### Step 14: Update Click Handling
Add new `handleClick()` method for button and "Click for Detail":

```typescript
public handleClick(relativeX: number, relativeY: number): unknown {
  // Check if button was clicked
  if (this.buttonBounds) {
    const { x, y, width, height } = this.buttonBounds;
    if (relativeX >= x && relativeX <= x + width &&
        relativeY >= y && relativeY <= y + height) {
      this.toggleView();
      return { type: 'view-toggled', view: this.currentView };
    }
  }

  // Check if truncated helper text was clicked
  if (this.isHelperTextTruncated && this.currentHelperTextFull) {
    // Helper text region starts after button + 2px padding
    const helperTextY = this.buttonBounds ? this.buttonBounds.y + this.buttonBounds.height + 2 : 0;
    const helperTextHeight = this.config.lineSpacing;

    if (relativeY >= helperTextY && relativeY <= helperTextY + helperTextHeight) {
      return {
        type: 'combat-log-message',
        message: this.currentHelperTextFull
      };
    }
  }

  return null;
}
```

**Rationale**: Returns discriminated union for different click types. Combat log output handled by caller.

---

### Step 15: Add Type Imports
Add necessary imports at top of file:

```typescript
import type { CombatAbility } from '../../CombatAbility';
// HumanoidUnit import not needed - we use duck typing ('leftHand' in this.unit)
```

**Rationale**: Minimal imports. Duck typing avoids circular dependency with HumanoidUnit.

---

## Testing Checklist

### Visual Tests
- [ ] Stats view displays correctly (existing functionality)
- [ ] "View Abilities" button appears centered below stats
- [ ] Button has 2px padding above and below
- [ ] Button position stable when helper text changes
- [ ] Abilities view shows 3 ability slots with correct labels
- [ ] Ability names right-aligned, labels left-aligned
- [ ] Equipment slots appear only for humanoid units
- [ ] Equipment names right-aligned, labels left-aligned
- [ ] Empty slots show "-" (not interactive)
- [ ] "Back" button appears in same position as "View Abilities"
- [ ] Helper text appears below button in yellow

### Interaction Tests
- [ ] Clicking "View Abilities" switches to abilities view
- [ ] Clicking "Back" returns to stats view
- [ ] View state persists when switching between units
- [ ] Hovering over ability shows description
- [ ] Hovering over equipment shows name + modifiers
- [ ] Hovering over "-" (empty slot) does nothing
- [ ] Helper text wraps correctly
- [ ] "Click for Detail" appears when helper text too long
- [ ] Clicking "Click for Detail" triggers combat log output
- [ ] Switching views clears helper text

### Edge Cases
- [ ] Monster units show no equipment section
- [ ] Units with all empty ability slots display correctly
- [ ] Equipment with no modifiers shows name only
- [ ] Equipment with multiple modifiers formats correctly
- [ ] Very long ability descriptions trigger "Click for Detail"
- [ ] Panel works at minimum size (144×108px)

### Unit Type Coverage
- [ ] Test with player HumanoidUnit (has equipment)
- [ ] Test with enemy HumanoidUnit (has equipment)
- [ ] Test with MonsterUnit (no equipment)
- [ ] Test with units having various ability slot combinations

---

## Potential Issues & Solutions

### Issue 1: Combat Log Access
**Problem**: UnitInfoContent doesn't have direct access to combat log for "Click for Detail"
**Solution**: Return `{ type: 'combat-log-message', message: string }` from `handleClick()`. Let parent (phase handler or layout manager) output to combat log.

### Issue 2: Equipment Has No Description Property
**Problem**: Equipment class doesn't have `description` property
**Solution**: Use equipment `name` + `modifiers.getSummary()` as helper text. This shows stat bonuses which is what users need.

### Issue 3: Type Safety for HumanoidUnit Equipment
**Problem**: CombatUnit interface doesn't include equipment properties
**Solution**: Use duck typing with `'leftHand' in this.unit` check. Cast to `any` when accessing equipment. This avoids import cycles.

### Issue 4: Helper Text Area Calculation
**Problem**: Need to calculate available vertical space for helper text
**Solution**: Track Y position throughout render. Available space = `region.height - (currentY - region.y) - padding`

---

## Files Modified

1. `react-app/src/models/combat/managers/panels/UnitInfoContent.ts` (primary changes)

---

## Files to Review (for reference)

1. `react-app/src/models/combat/CombatUnit.ts` (ability properties)
2. `react-app/src/models/combat/HumanoidUnit.ts` (equipment properties)
3. `react-app/src/models/combat/Equipment.ts` (modifiers)
4. `react-app/src/models/combat/CombatUnitModifiers.ts` (getSummary method)
5. `react-app/src/models/combat/CombatAbility.ts` (description property)

---

## Implementation Order

1. Add state variables (Step 1)
2. Add toggle method (Step 2)
3. Refactor existing render() - extract header, stats (Steps 3-5)
4. Implement abilities view rendering (Steps 6-8)
5. Implement button rendering (Step 9)
6. Update helper text logic (Steps 10-11)
7. Update hover handling (Steps 12-13)
8. Add click handling (Step 14)
9. Add imports (Step 15)
10. Test thoroughly (use checklist)

---

## Success Criteria

✅ Users can toggle between stats and abilities views
✅ Abilities and equipment display with correct formatting
✅ Helper text shows ability/equipment details on hover
✅ Long descriptions use "Click for Detail" pattern
✅ View state persists per unit
✅ No visual glitches or layout issues
✅ All rendering uses FontAtlasRenderer and SpriteRenderer
✅ No violations of GeneralGuidelines.md
✅ All tests pass

---

## Guidelines Compliance Checklist

✅ Uses `FontAtlasRenderer.renderText()` for ALL text (no `ctx.fillText()`)
✅ Uses `SpriteRenderer.renderSpriteById()` for ALL sprites (no direct `ctx.drawImage()`)
✅ Caches stateful component (UnitInfoContent already cached)
✅ Uses existing `PanelContent` interface
✅ No domain model changes
✅ Single file modification (UnitInfoContent.ts)
✅ Returns Y position from each render section (structured layout)
✅ Immutable state updates (toggle creates new state)
✅ Hover detection uses panel-relative coordinates
✅ Click handling returns discriminated union

---

**End of Implementation Plan**
