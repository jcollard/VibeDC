# Unit Info Abilities View Implementation Plan

## Overview
Add ability and equipment viewing functionality to `UnitInfoContent.ts` by introducing a view toggle system. Users can switch between "Stats View" (current) and "Abilities View" (new) using a button.

## Requirements
- Add "View Abilities" button in Stats View (centered below stats, above helper text)
- Add "Back" button in Abilities View (same position)
- Display 3 ability slots: Reaction, Passive, Movement
- Display 5 equipment slots for humanoid units: L.Hand, R.Hand, Head, Body, Accessory
- Empty slots show "-" (non-interactive)
- Hovering over abilities/equipment shows helper text
- If helper text exceeds available space, show "Click for Detail" and output full text to combat log
- Equipment helper text includes non-default stat modifiers (e.g., "+5 P.Pow, ×1.5 Crit")

## Architecture Alignment
✅ Follows GeneralGuidelines.md:
- Single file modification (UnitInfoContent.ts)
- Stateful cached component pattern
- No domain model changes
- Uses existing helper text infrastructure

✅ Follows CombatHierarchy.md:
- UnitInfoContent is a PanelContentRenderer (cached, stateful)
- Managed by CombatLayoutManager
- Standard hover interaction pattern

## Implementation Steps

### Step 1: Add View State Management
**File**: `react-app/src/models/combat/managers/panels/UnitInfoContent.ts`

Add state to track current view:
```typescript
private currentView: 'stats' | 'abilities' = 'stats';
```

The view state persists for each unit (due to caching), so switching between units preserves their individual view states.

### Step 2: Create View Toggle Method
Add method to switch between views:
```typescript
private toggleView(): void {
  this.currentView = this.currentView === 'stats' ? 'abilities' : 'stats';
  this.needsRedraw = true;
}
```

### Step 3: Refactor render() Method
Split rendering logic into view-specific methods:

```typescript
public render(ctx: CanvasRenderingContext2D): void {
  if (!this.needsRedraw) return;

  // Clear canvas
  ctx.clearRect(0, 0, this.width, this.height);

  // Render common header (sprite, name, class, action timer)
  const headerHeight = this.renderHeader(ctx);

  // Render view-specific content
  let contentHeight: number;
  if (this.currentView === 'stats') {
    contentHeight = this.renderStatsView(ctx, headerHeight);
  } else {
    contentHeight = this.renderAbilitiesView(ctx, headerHeight);
  }

  // Render toggle button (centered, with 2px padding above/below)
  const buttonY = contentHeight + 2;
  const buttonHeight = this.renderToggleButton(ctx, buttonY);

  // Render helper text below button
  const helperTextY = buttonY + buttonHeight + 2;
  this.renderHelperText(ctx, helperTextY);

  this.needsRedraw = false;
}
```

### Step 4: Extract Header Rendering
Move existing header rendering into separate method:
```typescript
private renderHeader(ctx: CanvasRenderingContext2D): number {
  const padding = 1;
  const lineHeight = 8;
  let y = padding;

  // Sprite (left side, 16×16px)
  const sprite = this.unit.getSprite();
  ctx.drawImage(sprite, padding, y, 16, 16);

  // Name (right of sprite)
  ctx.fillStyle = 'white';
  ctx.font = '8px "Press Start 2P"';
  ctx.fillText(this.unit.name, padding + 18, y + 6);
  y += lineHeight;

  // Class
  ctx.fillText(`Class: ${this.unit.className}`, padding, y + 6);
  y += lineHeight;

  // Action Timer
  const at = this.unit.actionTimer.toFixed(1);
  ctx.fillText(`AT: ${at}`, padding, y + 6);
  y += lineHeight;

  return y; // Return height consumed by header
}
```

### Step 5: Refactor Stats View Rendering
Move existing stats rendering into separate method:
```typescript
private renderStatsView(ctx: CanvasRenderingContext2D, startY: number): number {
  const padding = 1;
  const lineHeight = 8;
  let y = startY;

  // Existing stats rendering logic (HP, Speed, P.Pow, etc.)
  // ... copy existing implementation from current render() method ...

  return y; // Return height consumed by stats
}
```

### Step 6: Implement Abilities View Rendering
Create new method to render abilities and equipment:
```typescript
private renderAbilitiesView(ctx: CanvasRenderingContext2D, startY: number): number {
  const padding = 1;
  const lineHeight = 8;
  let y = startY;

  ctx.fillStyle = 'white';
  ctx.font = '8px "Press Start 2P"';

  // Render ability slots
  y = this.renderAbilitySlot(ctx, 'Reaction', this.unit.reactionAbility, y);
  y = this.renderAbilitySlot(ctx, 'Passive', this.unit.passiveAbility, y);
  y = this.renderAbilitySlot(ctx, 'Movement', this.unit.movementAbility, y);

  // Render equipment slots (only for humanoid units)
  if (this.unit instanceof HumanoidUnit) {
    y = this.renderEquipmentSlot(ctx, 'L.Hand', this.unit.leftHand, y);
    y = this.renderEquipmentSlot(ctx, 'R.Hand', this.unit.rightHand, y);
    y = this.renderEquipmentSlot(ctx, 'Head', this.unit.head, y);
    y = this.renderEquipmentSlot(ctx, 'Body', this.unit.body, y);
    y = this.renderEquipmentSlot(ctx, 'Accessory', this.unit.accessory, y);
  }

  return y;
}
```

### Step 7: Implement Ability Slot Rendering
```typescript
private renderAbilitySlot(
  ctx: CanvasRenderingContext2D,
  label: string,
  ability: Ability | null,
  y: number
): number {
  const padding = 1;
  const lineHeight = 8;

  // Label (left-aligned)
  ctx.fillText(label, padding, y + 6);

  // Ability name (right-aligned) or "-" if empty
  const abilityName = ability ? ability.name : '-';
  const textWidth = ctx.measureText(abilityName).width;
  ctx.fillText(abilityName, this.width - padding - textWidth, y + 6);

  return y + lineHeight;
}
```

### Step 8: Implement Equipment Slot Rendering
```typescript
private renderEquipmentSlot(
  ctx: CanvasRenderingContext2D,
  label: string,
  equipment: Equipment | null,
  y: number
): number {
  const padding = 1;
  const lineHeight = 8;

  // Label (left-aligned)
  ctx.fillText(label, padding, y + 6);

  // Equipment name (right-aligned) or "-" if empty
  const equipmentName = equipment ? equipment.name : '-';
  const textWidth = ctx.measureText(equipmentName).width;
  ctx.fillText(equipmentName, this.width - padding - textWidth, y + 6);

  return y + lineHeight;
}
```

### Step 9: Implement Toggle Button Rendering
```typescript
private renderToggleButton(ctx: CanvasRenderingContext2D, y: number): number {
  const lineHeight = 8;
  const buttonText = this.currentView === 'stats' ? 'View Abilities' : 'Back';

  ctx.fillStyle = 'white';
  ctx.font = '8px "Press Start 2P"';

  // Center the button text
  const textWidth = ctx.measureText(buttonText).width;
  const x = (this.width - textWidth) / 2;

  ctx.fillText(buttonText, x, y + 6);

  // Store button bounds for click detection
  this.buttonBounds = {
    x: x,
    y: y,
    width: textWidth,
    height: lineHeight
  };

  return lineHeight;
}
```

Add button bounds property:
```typescript
private buttonBounds: { x: number; y: number; width: number; height: number } | null = null;
```

### Step 10: Update Helper Text Logic
Refactor helper text to support abilities and equipment:

```typescript
private currentHelperText: string | null = null;
private currentHelperTextFull: string | null = null; // Store full text for "Click for Detail"
private isHelperTextTruncated: boolean = false;

private renderHelperText(ctx: CanvasRenderingContext2D, startY: number): void {
  if (!this.currentHelperText) return;

  const padding = 1;
  const lineHeight = 8;
  const availableHeight = this.height - startY - padding;

  ctx.fillStyle = 'yellow';
  ctx.font = '8px "Press Start 2P"';

  // Check if text fits in available space
  const textLines = this.wrapText(ctx, this.currentHelperText, this.width - 2 * padding);
  const requiredHeight = textLines.length * lineHeight;

  if (requiredHeight > availableHeight) {
    // Text doesn't fit - show "Click for Detail"
    this.isHelperTextTruncated = true;
    this.currentHelperTextFull = this.currentHelperText;
    ctx.fillText('Click for Detail', padding, startY + 6);
  } else {
    // Text fits - render normally
    this.isHelperTextTruncated = false;
    let y = startY;
    for (const line of textLines) {
      ctx.fillText(line, padding, y + 6);
      y += lineHeight;
    }
  }
}

private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  // Simple word-wrapping logic (implement as needed)
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = ctx.measureText(testLine).width;

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
```

### Step 11: Update Hover Handling
Modify `handleHover()` to detect abilities/equipment:

```typescript
public handleHover(x: number, y: number): boolean {
  if (this.currentView === 'stats') {
    // Existing stats hover logic (unchanged)
    return this.handleStatsHover(x, y);
  } else {
    // New abilities/equipment hover logic
    return this.handleAbilitiesHover(x, y);
  }
}

private handleAbilitiesHover(x: number, y: number): boolean {
  const padding = 1;
  const lineHeight = 8;
  const headerHeight = 3 * lineHeight + padding; // Header takes 3 lines

  // Calculate which line is being hovered
  const relativeY = y - headerHeight;
  const lineIndex = Math.floor(relativeY / lineHeight);

  // Map line index to ability/equipment
  const abilitySlots = [
    { label: 'Reaction', item: this.unit.reactionAbility },
    { label: 'Passive', item: this.unit.passiveAbility },
    { label: 'Movement', item: this.unit.movementAbility }
  ];

  let currentIndex = 0;

  // Check ability slots
  if (lineIndex < abilitySlots.length) {
    const slot = abilitySlots[lineIndex];
    if (slot.item) {
      this.currentHelperText = slot.item.description;
      this.needsRedraw = true;
      return true;
    }
  }

  currentIndex = abilitySlots.length;

  // Check equipment slots (only for humanoid units)
  if (this.unit instanceof HumanoidUnit) {
    const equipmentSlots = [
      { label: 'L.Hand', item: this.unit.leftHand },
      { label: 'R.Hand', item: this.unit.rightHand },
      { label: 'Head', item: this.unit.head },
      { label: 'Body', item: this.unit.body },
      { label: 'Accessory', item: this.unit.accessory }
    ];

    const equipmentIndex = lineIndex - currentIndex;
    if (equipmentIndex >= 0 && equipmentIndex < equipmentSlots.length) {
      const slot = equipmentSlots[equipmentIndex];
      if (slot.item) {
        this.currentHelperText = this.formatEquipmentHelperText(slot.item);
        this.needsRedraw = true;
        return true;
      }
    }
  }

  // No hover detected
  if (this.currentHelperText) {
    this.currentHelperText = null;
    this.needsRedraw = true;
  }
  return false;
}

private formatEquipmentHelperText(equipment: Equipment): string {
  let text = equipment.description;

  // Add non-default modifiers
  const modifiers: string[] = [];

  // Assuming Equipment has properties like: hpMod, speedMod, pPowMod, etc.
  // Check each modifier and add to list if non-zero
  if (equipment.hpMod && equipment.hpMod !== 0) {
    modifiers.push(`${equipment.hpMod > 0 ? '+' : ''}${equipment.hpMod} HP`);
  }
  if (equipment.speedMod && equipment.speedMod !== 0) {
    modifiers.push(`${equipment.speedMod > 0 ? '+' : ''}${equipment.speedMod} Speed`);
  }
  if (equipment.pPowMod && equipment.pPowMod !== 0) {
    modifiers.push(`${equipment.pPowMod > 0 ? '+' : ''}${equipment.pPowMod} P.Pow`);
  }
  // ... add other modifiers as needed ...

  // Check multipliers (only if non-1.0)
  if (equipment.speedMult && equipment.speedMult !== 1.0) {
    modifiers.push(`×${equipment.speedMult} Speed`);
  }
  // ... add other multipliers as needed ...

  if (modifiers.length > 0) {
    text += '\n' + modifiers.join(', ');
  }

  return text;
}
```

### Step 12: Update Click Handling
Modify `handleClick()` to handle button clicks and "Click for Detail":

```typescript
public handleClick(x: number, y: number): boolean {
  // Check if button was clicked
  if (this.buttonBounds) {
    const { x: bx, y: by, width: bw, height: bh } = this.buttonBounds;
    if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
      this.toggleView();
      this.currentHelperText = null; // Clear helper text on view switch
      return true;
    }
  }

  // Check if truncated helper text was clicked
  if (this.isHelperTextTruncated && this.currentHelperTextFull) {
    // Calculate helper text bounds (simplified - assumes single line "Click for Detail")
    const helperTextY = this.buttonBounds ? this.buttonBounds.y + this.buttonBounds.height + 2 : 0;
    const helperTextHeight = 8;

    if (y >= helperTextY && y <= helperTextY + helperTextHeight) {
      // Output full text to combat log
      this.outputToCombatLog(this.currentHelperTextFull);
      return true;
    }
  }

  return false;
}

private outputToCombatLog(text: string): void {
  // Get combat log from CombatLayoutManager and add message
  // Assuming we have access to the combat manager or log renderer
  // This will need to be passed in constructor or accessed via singleton pattern

  // Example (adjust based on actual architecture):
  const combatLog = this.combatManager.getCombatLog();
  combatLog.addMessage(text);
}
```

**Note**: The `outputToCombatLog()` method will need access to the combat log. This may require:
- Passing CombatLayoutManager reference in constructor
- Using a singleton pattern for CombatLog
- Adding a callback method

### Step 13: Update Constructor
If needed, update constructor to accept combat log reference:

```typescript
constructor(
  unit: CombatUnit,
  width: number,
  height: number,
  private combatLog: CombatLog // Add if needed for "Click for Detail"
) {
  super(width, height);
  this.unit = unit;
}
```

Update instantiation in CombatLayoutManager accordingly.

### Step 14: Add Type Imports
Ensure necessary types are imported:

```typescript
import { HumanoidUnit } from '../../HumanoidUnit';
import { Ability } from '../../abilities/Ability';
import { Equipment } from '../../equipment/Equipment';
```

## Testing Checklist

### Visual Tests
- [ ] Stats view displays correctly (existing functionality)
- [ ] "View Abilities" button appears centered below stats
- [ ] Button has 2px padding above and below
- [ ] Abilities view shows all 3 ability slots with correct labels
- [ ] Equipment slots appear only for humanoid units
- [ ] Empty slots show "-" (non-interactive)
- [ ] "Back" button appears in same position as "View Abilities"
- [ ] Helper text appears below button
- [ ] Button position doesn't move when helper text changes

### Interaction Tests
- [ ] Clicking "View Abilities" switches to abilities view
- [ ] Clicking "Back" returns to stats view
- [ ] View state persists when switching between units
- [ ] Hovering over ability shows description in helper text
- [ ] Hovering over equipment shows description + stat modifiers
- [ ] Hovering over "-" (empty slot) does nothing
- [ ] Helper text wraps correctly for long descriptions
- [ ] "Click for Detail" appears when helper text exceeds space
- [ ] Clicking "Click for Detail" outputs to combat log
- [ ] Combat log displays full text correctly

### Edge Cases
- [ ] Monster units (non-humanoid) show no equipment section
- [ ] Units with all empty ability slots display correctly
- [ ] Equipment with no stat modifiers shows description only
- [ ] Equipment with multiple modifiers formats correctly (e.g., "+5 P.Pow, ×1.5 Crit")
- [ ] Very long ability descriptions trigger "Click for Detail"
- [ ] Switching views clears helper text appropriately

### Unit Type Coverage
- [ ] Test with player HumanoidUnit (has equipment)
- [ ] Test with enemy HumanoidUnit (has equipment)
- [ ] Test with MonsterUnit (no equipment)
- [ ] Test with units having various ability combinations

## Potential Issues & Solutions

### Issue 1: Equipment Property Names Unknown
**Problem**: Equipment class properties for stat modifiers are not confirmed
**Solution**: Review Equipment.ts to identify exact property names (hpMod, speedMod, etc.)

### Issue 2: Combat Log Access
**Problem**: UnitInfoContent may not have direct access to combat log
**Solution**: Pass CombatLog reference through constructor or use event system

### Issue 3: Text Wrapping Complexity
**Problem**: Word wrapping for helper text may be more complex than anticipated
**Solution**: Can use existing text rendering utilities if available, or implement simple character-based wrapping

### Issue 4: Button Click Detection
**Problem**: Click coordinates may need transformation if panel is positioned/scaled
**Solution**: Ensure click coordinates are panel-relative before detection

## Files Modified
1. `react-app/src/models/combat/managers/panels/UnitInfoContent.ts` (primary changes)
2. `react-app/src/models/combat/managers/CombatLayoutManager.ts` (if constructor signature changes)

## Files to Review
1. `react-app/src/models/combat/CombatUnit.ts` (ability properties)
2. `react-app/src/models/combat/HumanoidUnit.ts` (equipment properties)
3. `react-app/src/models/combat/equipment/Equipment.ts` (stat modifier properties)
4. `react-app/src/models/combat/abilities/Ability.ts` (description property)

## Estimated Complexity
**Medium** - 3-4 hours of focused work
- Refactoring: 1 hour (split render() into methods)
- New rendering: 1.5 hours (abilities view, button, helper text)
- Interaction: 1 hour (click handling, hover detection)
- Testing: 0.5-1 hour (visual and interaction tests)

## Success Criteria
✅ Users can toggle between stats and abilities views
✅ Abilities and equipment display correctly with proper formatting
✅ Helper text shows ability/equipment details on hover
✅ Long descriptions use "Click for Detail" → combat log pattern
✅ View state persists per unit (due to caching)
✅ No visual glitches or layout issues
✅ All interaction patterns work smoothly
