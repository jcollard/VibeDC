# Unit Info Panel Revision Plan

**Date:** 2025-10-28
**Feature:** Enhanced Unit Info Panel with Sprite, Stats Grid, and Action Timer
**Related Files:** UnitInfoContent.ts
**Priority:** High
**Complexity:** Medium

---

## Overview

Revise the Unit Info panel to display comprehensive unit information in a structured layout:
- Unit sprite (top left)
- Unit name (colored, next to sprite)
- Primary/Secondary class (below name)
- Action Timer (top right corner)
- Two-column stats grid (10 stats total)

**Panel Dimensions:** 144px wide × 108px tall (12 tiles × 9 tiles)

---

## Requirements

### Visual Layout

```
┌──────────────────────────────────────────────┐
│ [Sprite] Unit Name          ACTION TIMER     │
│          Fighter/Mage           45/100       │
│                                              │
│ HP  45/50    P.Pow  12                       │
│ MP  20/25    M.Pow   8                       │
│ Spd    15    P.Evd  10                       │
│ Mov     4    M.Evd   8                       │
│              Cour   12                       │
│              Attn    6                       │
└──────────────────────────────────────────────┘
```

### Data Display Specifications

**Sprite:**
- Size: 12×12px (standard sprite size)
- Position: Top-left corner (padding)
- Source: `unit.spriteId`

**Unit Name:**
- Position: To right of sprite, aligned to top
- Color: Green (#00ff00) for player units, Red (#ff0000) for enemies
- Font: 7px-04b03

**Class Line:**
- Format: "Primary / Secondary" or just "Primary" if no secondary
- Position: Below sprite (same X as name start)
- Separator: " / " (space-slash-space)
- Color: White (#ffffff)
- Source: `unit.unitClass.name` and `unit.secondaryClass?.name`

**Action Timer:**
- Label: "ACTION TIMER" (if fits) or "AT" with small clock sprite
- Value format: "XX/100" (e.g., "45/100")
- Position: Top-right corner
- Alignment: Right-aligned
- Color: White (#ffffff) for label, Orange (#ffa500) for value

**Stats Grid (Two Columns):**

**Left Column:**
- HP: Current/Max (e.g., "45/50") - max 3 digits each
- MP: Current/Max (e.g., "20/25") - max 3 digits each
- Spd: Current value (e.g., "15") - max 2 digits
- Mov: Current value (e.g., "4") - max 2 digits

**Right Column:**
- P.Pow: Current value (e.g., "12") - max 2 digits
- M.Pow: Current value (e.g., "8") - max 2 digits
- P.Evd: Current value (e.g., "10") - max 2 digits
- M.Evd: Current value (e.g., "8") - max 2 digits
- Cour: Current value (e.g., "12") - max 2 digits
- Attn: Current value (e.g., "6") - max 2 digits

**Stat Format:**
- Pattern: `{Label} {Value}` (one space)
- Current/Max: `{Label} {Current}/{Max}` (no spaces around slash)
- Alignment: Left-aligned labels, values follow
- Color: White (#ffffff)
- Font: 7px-04b03 with 8px line spacing

### Color Specifications

All colors should use constants from colors.ts where applicable:
- Player name: #00ff00 (green) - CombatConstants.UNIT_TURN.PLAYER_NAME_COLOR
- Enemy name: #ff0000 (red) - CombatConstants.UNIT_TURN.ENEMY_NAME_COLOR
- Regular text: #ffffff (white) - ENABLED_TEXT from colors.ts
- Action Timer value: #ffa500 (orange)

---

## Layout Calculations

### Panel Dimensions
- Width: 144px
- Height: 108px
- Padding: 1px (config.padding)
- Line spacing: 8px (config.lineSpacing)
- Font height: 7px

### Vertical Layout

```
Y Position | Element
-----------|------------------------------------------
1px        | Sprite top, Name baseline, AT label
9px        | Class baseline
17px       | HP stat
25px       | MP stat
33px       | Spd stat
41px       | Mov stat
49px       | (Left column ends)
```

### Horizontal Layout

```
X Position | Element
-----------|------------------------------------------
1px        | Sprite left edge
14px       | Name start (sprite + 1px gap)
???px      | AT label (right-aligned, TBD based on measurement)
1px        | Left column stats (HP, MP, Spd, Mov)
~72px      | Right column stats (P.Pow, M.Pow, etc.) - TBD based on left column width
```

### Action Timer Positioning

**Option A: Full label "ACTION TIMER"**
- Measure text width using FontAtlasRenderer.measureTextByFontId()
- Calculate: `x = region.x + region.width - padding - textWidth`
- If textWidth > available space (~70px), fall back to Option B

**Option B: Abbreviated "AT" with clock icon**
- Clock sprite: Use icons-5 (same sprite used in TurnOrderRenderer)
- Layout: [Clock Icon] AT
- Clock size: 8×8px (scaled down from 12×12 by 0.67)
- Measure "AT" width, add clock width + 1px gap
- Calculate: `x = region.x + region.width - padding - (clockWidth + gap + atWidth)`

**Value Line:**
- Format: "XX/100" (e.g., "45/100")
- Right-aligned below label
- Color: Orange (#ffa500)
- Y position: actionTimerLabelY + lineSpacing

### Column Layout Strategy

**Two-column grid approach:**

1. **Measure left column width dynamically:**
   - Measure each left column label+value: "HP 100/100", "MP 100/100", "Spd 99", "Mov 99"
   - Take maximum width as `leftColumnWidth`
   - Add 4px gap between columns

2. **Right column start position:**
   - `rightColumnX = leftColumnX + leftColumnWidth + 4px`

3. **Alignment:**
   - Both columns left-aligned within their respective column areas
   - Values follow labels with single space

### Fitting Check

**Available height:** 108px
**Required height estimate:**
- Padding top: 1px
- Name line: 8px
- Class line: 8px
- 4 left column stats: 4 × 8px = 32px
- Padding bottom: 1px (not rendered, but for safety)
- **Total: ~50px** ✅ Plenty of room (only uses half the height)

**Right column needs 6 lines:**
- Start at same Y as left column (Y=17px for first stat)
- 6 stats × 8px = 48px
- End Y: 17 + 48 = 65px ✅ Fits comfortably

**Available width:** 144px
**Required width estimate:**
- Padding left: 1px
- Sprite: 12px
- Gap: 1px
- Name: ~40-60px (varies by name length)
- Gap to AT: variable
- Action Timer: ~40-50px (depends on Option A vs B)
- Padding right: 1px
- **Total: ~96-126px** ✅ Should fit, but tight

**Left column width estimate:**
- Widest entry: "HP 100/100" = ~50-55px (7px font, variable width)
- Right column entries: "P.Pow 99" = ~45-50px
- Column gap: 4px
- **Total columns: ~100-110px** ✅ Fits with padding

---

## Implementation Tasks

### Task 1: Add Sprite Rendering Support

**Files:** UnitInfoContent.ts

**Changes:**
- Import SpriteRenderer
- Add spriteImages and spriteSize to render() method signature (like ActionsMenuContent)
- Check if spriteImages and unit.spriteId are valid before rendering

**Code Pattern:**
```typescript
render(
  ctx: CanvasRenderingContext2D,
  region: PanelRegion,
  fontId: string,
  fontAtlasImage: HTMLImageElement | null,
  spriteImages?: Map<string, HTMLImageElement>,
  spriteSize?: number
): void {
  // Render sprite if available
  if (spriteImages && spriteSize) {
    SpriteRenderer.renderSpriteById(
      ctx,
      this.unit.spriteId,
      spriteImages,
      spriteSize,
      region.x + this.config.padding,
      region.y + this.config.padding,
      12,
      12
    );
  }
  // ... rest of rendering
}
```

**Rationale:**
- Matches pattern from other panel content implementations
- Optional parameters maintain backward compatibility
- sprite rendering happens first (behind text)

---

### Task 2: Render Unit Name and Class

**Files:** UnitInfoContent.ts

**Changes:**
```typescript
// Calculate name position (to right of sprite)
const nameX = region.x + this.config.padding + 12 + 1; // sprite + gap
const nameY = region.y + this.config.padding;

// Determine name color based on allegiance
const nameColor = this.unit.isPlayerControlled
  ? '#00ff00'  // Player green
  : '#ff0000'; // Enemy red

// Render name
FontAtlasRenderer.renderText(
  ctx,
  this.unit.name,
  nameX,
  nameY,
  fontId,
  fontAtlasImage,
  1,
  'left',
  nameColor
);

// Render class line below sprite
const classY = nameY + this.config.lineSpacing;
let classText = this.unit.unitClass.name;
if (this.unit.secondaryClass) {
  classText += ` / ${this.unit.secondaryClass.name}`;
}

FontAtlasRenderer.renderText(
  ctx,
  classText,
  nameX,
  classY,
  fontId,
  fontAtlasImage,
  1,
  'left',
  '#ffffff'
);
```

**Rationale:**
- Name positioned to right of sprite with 1px gap
- Color-coded by allegiance (player vs enemy)
- Class line uses same X as name (left-aligned)
- Conditional secondary class display

---

### Task 3: Render Action Timer (Top Right)

**Files:** UnitInfoContent.ts

**Implementation Strategy:**
1. Try to render "ACTION TIMER" label
2. If too wide (>70px), fall back to "AT" + clock icon
3. Render value "XX/100" below label, right-aligned

**Code Pattern:**
```typescript
// Import at top
import { SpriteRenderer } from '../../../../utils/SpriteRenderer';
import { FontRegistry } from '../../../../utils/FontRegistry';

// In render() method:
const font = FontRegistry.getById(fontId);
if (!font) return;

// Measure "ACTION TIMER" width
const fullLabelWidth = FontAtlasRenderer.measureText('ACTION TIMER', font);
const availableWidth = region.width - (this.config.padding * 2) - 60; // Reserve space for name

let atLabelX: number;
let atLabelY = region.y + this.config.padding;
let atLabelText: string;

if (fullLabelWidth <= availableWidth) {
  // Option A: Use full label
  atLabelText = 'ACTION TIMER';
  atLabelX = region.x + region.width - this.config.padding - fullLabelWidth;

  FontAtlasRenderer.renderText(
    ctx,
    atLabelText,
    atLabelX,
    atLabelY,
    fontId,
    fontAtlasImage,
    1,
    'left',
    '#ffffff'
  );
} else {
  // Option B: Use "AT" + clock icon
  const atWidth = FontAtlasRenderer.measureText('AT', font);
  const clockSize = 8; // 8x8 scaled down clock
  const gap = 1;
  const totalWidth = clockSize + gap + atWidth;

  atLabelX = region.x + region.width - this.config.padding - totalWidth;

  // Render clock icon
  if (spriteImages && spriteSize) {
    SpriteRenderer.renderSpriteById(
      ctx,
      'icons-5', // Clock sprite
      spriteImages,
      spriteSize,
      atLabelX,
      atLabelY,
      clockSize,
      clockSize
    );
  }

  // Render "AT" text
  FontAtlasRenderer.renderText(
    ctx,
    'AT',
    atLabelX + clockSize + gap,
    atLabelY,
    fontId,
    fontAtlasImage,
    1,
    'left',
    '#ffffff'
  );
}

// Render action timer value below label
const atValue = `${Math.floor(this.unit.actionTimer)}/100`;
const atValueWidth = FontAtlasRenderer.measureText(atValue, font);
const atValueX = region.x + region.width - this.config.padding - atValueWidth;
const atValueY = atLabelY + this.config.lineSpacing;

FontAtlasRenderer.renderText(
  ctx,
  atValue,
  atValueX,
  atValueY,
  fontId,
  fontAtlasImage,
  1,
  'left',
  '#ffa500' // Orange
);
```

**Rationale:**
- Dynamic width measurement ensures label fits
- Fallback to abbreviated form with icon maintains clarity
- Right-aligned for visual balance
- Orange color for value makes it stand out

---

### Task 4: Render Two-Column Stats Grid

**Files:** UnitInfoContent.ts

**Implementation Strategy:**
1. Define left and right column stat arrays
2. Calculate left column width dynamically
3. Render left column starting at Y position below class
4. Render right column starting at same Y, offset by left column width + gap

**Code Pattern:**
```typescript
// Define stats for each column
const leftColumnStats = [
  { label: 'HP', value: `${this.unit.health}/${this.unit.maxHealth}` },
  { label: 'MP', value: `${this.unit.mana}/${this.unit.maxMana}` },
  { label: 'Spd', value: `${this.unit.speed}` },
  { label: 'Mov', value: `${this.unit.movement}` }
];

const rightColumnStats = [
  { label: 'P.Pow', value: `${this.unit.physicalPower}` },
  { label: 'M.Pow', value: `${this.unit.magicPower}` },
  { label: 'P.Evd', value: `${this.unit.physicalEvade}` },
  { label: 'M.Evd', value: `${this.unit.magicEvade}` },
  { label: 'Cour', value: `${this.unit.courage}` },
  { label: 'Attn', value: `${this.unit.attunement}` }
];

// Calculate left column width
let maxLeftWidth = 0;
for (const stat of leftColumnStats) {
  const text = `${stat.label} ${stat.value}`;
  const width = FontAtlasRenderer.measureText(text, font);
  if (width > maxLeftWidth) {
    maxLeftWidth = width;
  }
}

// Define column positions
const leftColumnX = region.x + this.config.padding;
const rightColumnX = leftColumnX + maxLeftWidth + 4; // 4px gap between columns
let statsY = classY + this.config.lineSpacing; // Start below class line

// Render left column
for (const stat of leftColumnStats) {
  const text = `${stat.label} ${stat.value}`;
  FontAtlasRenderer.renderText(
    ctx,
    text,
    leftColumnX,
    statsY,
    fontId,
    fontAtlasImage,
    1,
    'left',
    '#ffffff'
  );
  statsY += this.config.lineSpacing;
}

// Reset Y position for right column (parallel to left)
statsY = classY + this.config.lineSpacing;

// Render right column
for (const stat of rightColumnStats) {
  const text = `${stat.label} ${stat.value}`;
  FontAtlasRenderer.renderText(
    ctx,
    text,
    rightColumnX,
    statsY,
    fontId,
    fontAtlasImage,
    1,
    'left',
    '#ffffff'
  );
  statsY += this.config.lineSpacing;
}
```

**Rationale:**
- Array-driven approach makes it easy to add/remove stats
- Dynamic width calculation ensures columns don't overlap
- Parallel rendering (reset Y) creates aligned grid
- Single loop for each column keeps code clean

---

### Task 5: Update PanelContent Interface Signature

**Files:** PanelContent.ts

**Current signature:**
```typescript
render(
  ctx: CanvasRenderingContext2D,
  region: PanelRegion,
  fontId: string,
  fontAtlasImage: HTMLImageElement | null
): void;
```

**Updated signature:**
```typescript
render(
  ctx: CanvasRenderingContext2D,
  region: PanelRegion,
  fontId: string,
  fontAtlasImage: HTMLImageElement | null,
  spriteImages?: Map<string, HTMLImageElement>,
  spriteSize?: number
): void;
```

**Rationale:**
- Optional parameters maintain backward compatibility
- Allows UnitInfoContent to access sprite rendering
- Matches pattern used elsewhere in codebase

---

### Task 6: Update InfoPanelManager to Pass Sprite Data

**Files:** InfoPanelManager.ts

**Changes:**
Update the render() method call to pass spriteImages and spriteSize to panel content:

```typescript
// In InfoPanelManager.render()
if (this.currentContent) {
  this.currentContent.render(
    ctx,
    region,
    fontId,
    fontAtlasImage,
    spriteImages,  // Add this
    spriteSize     // Add this
  );
}
```

**Also update InfoPanelManager constructor or method signature** to accept spriteImages and spriteSize if not already available.

**Rationale:**
- Enables sprite rendering in all panel content implementations
- Maintains consistency with other render paths

---

### Task 7: Update All PanelContent Implementations

**Files:**
- EmptyContent.ts
- PartyMembersContent.ts
- ActionsMenuContent.ts

**Changes:**
Add optional sprite parameters to render() signatures:

```typescript
render(
  ctx: CanvasRenderingContext2D,
  region: PanelRegion,
  fontId: string,
  fontAtlasImage: HTMLImageElement | null,
  spriteImages?: Map<string, HTMLImageElement>,
  spriteSize?: number
): void {
  // Existing implementation (ignore new params if not needed)
}
```

**Rationale:**
- Maintains interface compatibility
- No functional changes for panels that don't need sprites
- Optional parameters prevent breaking changes

---

## Testing Plan

### Visual Tests
- [ ] Sprite renders correctly in top-left corner (12×12px)
- [ ] Unit name appears to right of sprite with correct color (green for player, red for enemy)
- [ ] Primary class displays correctly
- [ ] Secondary class displays with " / " separator when present
- [ ] No secondary class display when unit.secondaryClass is null
- [ ] Action Timer label displays (full or abbreviated based on space)
- [ ] Action Timer value displays in orange, right-aligned
- [ ] Clock icon appears if using abbreviated "AT" format
- [ ] All 10 stats display in correct two-column grid
- [ ] HP and MP show current/max format (e.g., "45/50")
- [ ] Speed, Movement, and all other stats show single value
- [ ] Left and right columns aligned properly
- [ ] No text overlap or clipping
- [ ] Stats abbreviations match spec (P.Pow, M.Pow, P.Evd, M.Evd, Cour, Attn)

### Functional Tests
- [ ] Panel updates correctly when updateUnit() called
- [ ] Works for player-controlled units
- [ ] Works for enemy units
- [ ] Handles units with no secondary class
- [ ] Handles 1-digit, 2-digit, and 3-digit stat values
- [ ] Action Timer displays correctly for values 0-100+
- [ ] No errors when sprite data unavailable (graceful fallback)

### Edge Cases
- [ ] Very long unit names (truncation or overflow handling)
- [ ] Very long class names
- [ ] Units with maxHealth/maxMana = 999 (3 digits)
- [ ] Action Timer > 100 (overflow display)
- [ ] Missing spriteId (handle gracefully)

### Performance
- [ ] No per-frame allocations in render loop
- [ ] Width calculations cached if appropriate
- [ ] No visible performance degradation

---

## Implementation Order

1. **Task 5**: Update PanelContent interface (foundation)
2. **Task 7**: Update other PanelContent implementations (compatibility)
3. **Task 6**: Update InfoPanelManager (enables sprite passing)
4. **Task 1**: Add sprite rendering to UnitInfoContent
5. **Task 2**: Render name and class
6. **Task 3**: Render action timer
7. **Task 4**: Render stats grid
8. **Testing**: Validate all test cases

---

## Notes & Decisions

### Decision: Sprite Parameters Optional
- **Choice:** Add spriteImages and spriteSize as optional parameters
- **Alternative:** Make them required, or use a separate context object
- **Rationale:** Maintains backward compatibility, allows gradual rollout, matches existing patterns
- **Tradeoff:** Slightly more complex signature, but safer migration

### Decision: Dynamic Width Calculation
- **Choice:** Measure text widths at render time to calculate column positions
- **Alternative:** Use fixed pixel positions
- **Rationale:** Handles variable-width font correctly, adapts to different stat values
- **Tradeoff:** Small performance cost (negligible for single panel), but more robust

### Decision: Action Timer Fallback
- **Choice:** Automatically fall back to "AT" + clock icon if label too wide
- **Alternative:** Always use one format, or make it configurable
- **Rationale:** Adapts to available space, ensures label always fits
- **Tradeoff:** Slightly more complex code, but better UX

### Decision: Array-Driven Stat Rendering
- **Choice:** Define stats in arrays, loop to render
- **Alternative:** Hardcode each stat line individually
- **Rationale:** More maintainable, easier to reorder or add stats, less code duplication
- **Tradeoff:** Slightly more abstract, but much cleaner

### Decision: Color Constants Source
- **Choice:** Use CombatConstants for player/enemy colors, colors.ts for general UI colors
- **Alternative:** Define all colors in colors.ts
- **Rationale:** Player/enemy colors are combat-specific and already defined in CombatConstants
- **Tradeoff:** Mixed sources, but follows existing patterns

### Guidelines Compliance
- ✅ Uses SpriteRenderer for sprite rendering (never ctx.drawImage on sprite sheets)
- ✅ Uses FontAtlasRenderer exclusively for text
- ✅ No per-frame allocations (all text/width calculations in render, no cached buffers needed)
- ✅ Maintains cached component pattern (UnitInfoContent instance cached by layout manager)
- ✅ Uses existing color constants where available
- ✅ Follows State Preservation pattern (updateUnit() preserves instance)

### Performance Considerations
- Width measurements happen each frame, but only for ~6-8 text strings (negligible)
- No temporary canvases or buffers needed
- Sprite rendering uses optimized SpriteRenderer
- Font rendering uses optimized FontAtlasRenderer
- No new allocations during render loop

---

## Success Criteria

✅ All visual specs met (sprite, name, class, timer, stats grid)
✅ All functional specs met (updateUnit works, handles edge cases)
✅ All tests pass
✅ Build succeeds with no warnings
✅ 100% compliance with GeneralGuidelines.md
✅ Performance within acceptable limits
✅ Backward compatible (other panels still work)
✅ No visual regressions

---

## Recommendation: Implementation

**Complexity:** Medium
- Multiple layout regions (sprite, name, timer, grid)
- Dynamic positioning calculations
- Interface changes affecting multiple files
- Requires careful coordinate calculations

**Risk Level:** Low-Medium
- Optional parameters minimize breaking changes
- Array-driven approach reduces errors
- Clear specification reduces ambiguity

**Recommendation:** ✅ **Implement in this conversation**

The task is well-specified, follows established patterns, and has clear success criteria. We have all necessary context loaded (UnitInfoContent, PanelContent interface, layout patterns, color constants). The changes are more complex than the actions menu work, but still manageable within this conversation.

Estimated implementation: ~150-200 lines of code across 4-5 files.

---

**End of Implementation Plan**
