# Phase 1: Visual Representation - Implementation Guide

**Version:** 1.0
**Created:** 2025-10-31
**Parent Plan:** [KOFeatureImplementationPlan.md](./KOFeatureImplementationPlan.md)
**Related:** [KOFeatureOverview.md](./KOFeatureOverview.md), [CombatHierarchy.md](../../CombatHierarchy.md), [GeneralGuidelines.md](../../GeneralGuidelines.md)

---

## Overview

This document provides detailed implementation guidance for **Phase 1: Visual Representation** of the Knocked Out (KO) feature. This phase establishes the complete visual representation of knocked out units on the battle map.

### What This Phase Delivers

By the end of this phase, knocked out units will:
- ✅ Have a `isKnockedOut` getter that returns `true` when `wounds >= maxHealth`
- ✅ Display with grey tint (0% saturation, 70% brightness) on the battle map
- ✅ Show red "KO" text overlay centered on their tile
- ✅ Be immediately distinguishable from healthy units

### What This Phase Does NOT Include

- ❌ Turn order display changes (that's Phase 2)
- ❌ Action timer behavior (that's Phase 2)
- ❌ Movement/pathfinding changes (that's Phase 3)
- ❌ Attack targeting/AI changes (that's Phase 4)

---

## Quick Reference

- [Files to Modify](#files-to-modify)
- [Implementation Steps](#implementation-steps)
- [Testing Guide](#testing-guide)
- [Troubleshooting](#troubleshooting)
- [Rollback Plan](#rollback-plan)

---

## Files to Modify

| File | Lines Changed | Complexity | Description |
|------|---------------|------------|-------------|
| `models/combat/CombatUnit.ts` | +7 | Low | Add interface definition |
| `models/combat/HumanoidUnit.ts` | +3 | Low | Implement getter |
| `models/combat/MonsterUnit.ts` | +3 | Low | Implement getter |
| `models/combat/CombatConstants.ts` | +13 | Low | Add visual constants |
| `models/combat/rendering/CombatRenderer.ts` | +8 | Low | Add grey tint filter |
| `models/combat/phases/UnitTurnPhaseHandler.ts` | +30 | Medium | Add KO text overlay |

**Total:** 6 files, ~64 lines of code

---

## Implementation Steps

### Step 1.1: Add Interface Definition

**File:** `react-app/src/models/combat/CombatUnit.ts`

**Location:** After `isPlayerControlled` getter definition (around line 30)

**Action:** Add the following interface definition:

```typescript
/**
 * Returns true if this unit is knocked out (wounds >= maxHealth).
 * KO'd units cannot act, don't accumulate action timer, and appear at
 * the end of the turn order list with grey tint.
 */
readonly isKnockedOut: boolean;
```

**Why This Matters:**
- Interface-first design ensures all implementations must provide this getter
- Documents the behavior contract for all unit types
- TypeScript will enforce implementation in HumanoidUnit and MonsterUnit

**Verification:**
```bash
npm run build
```
Should fail with errors about missing implementation (expected at this point).

---

### Step 1.2: Implement in HumanoidUnit

**File:** `react-app/src/models/combat/HumanoidUnit.ts`

**Location:** After `isPlayerControlled` getter implementation (around line 120)

**Action:** Add the following getter:

```typescript
get isKnockedOut(): boolean {
  return this.wounds >= this.maxHealth;
}
```

**Why This Matters:**
- Simple comparison, no additional state needed
- Derived state (calculated on-demand) means no serialization concerns
- Works automatically as wounds/maxHealth change

**Verification:**
TypeScript errors about HumanoidUnit should disappear after this step.

---

### Step 1.3: Implement in MonsterUnit

**File:** `react-app/src/models/combat/MonsterUnit.ts`

**Location:** After `isPlayerControlled` getter implementation (near other getters)

**Action:** Add the following getter:

```typescript
get isKnockedOut(): boolean {
  return this.wounds >= this.maxHealth;
}
```

**Why This Matters:**
- Identical logic to HumanoidUnit for consistency
- Both player and enemy units use the same KO detection

**Verification:**
```bash
npm run build
```
Should now succeed with no TypeScript errors.

**Test in Browser Console:**
```javascript
const units = window.combatState.unitManifest.getAllUnits();
const unit = units[0].unit;

console.log(unit.isKnockedOut);  // Should be false

unit.wounds = unit.maxHealth;
console.log(unit.isKnockedOut);  // Should be true

unit.wounds = 0;
console.log(unit.isKnockedOut);  // Should be false
```

---

### Step 1.4: Add KNOCKED_OUT Constants Section

**File:** `react-app/src/models/combat/CombatConstants.ts`

**Location:** After the `AI` section (around line 300, before the closing of the constants object)

**Action:** Add the following constant block:

```typescript
  /**
   * Constants for knocked-out unit rendering and behavior
   */
  KNOCKED_OUT: {
    // Map overlay text
    MAP_TEXT: 'KO' as const,
    MAP_TEXT_COLOR: '#ff0000' as const,     // Red
    MAP_FONT_ID: '7px-04b03' as const,

    // Turn order label
    TURN_ORDER_TEXT: 'KO' as const,
    TURN_ORDER_COLOR: '#ff0000' as const,   // Red
    TURN_ORDER_FONT_ID: '7px-04b03' as const,

    // Grey tint settings (for canvas filter)
    TINT_FILTER: 'saturate(0%) brightness(70%)' as const,
  } as const,
```

**Important Notes:**
- Don't forget the comma after the `AI` section if adding this after it
- The `as const` assertions are critical for TypeScript literal types
- Font ID `7px-04b03` must already exist in your font registry

**Why These Values:**
- **Red color (#ff0000):** High visibility, universal danger indicator
- **7px font:** Matches existing UI font sizes
- **70% brightness, 0% saturation:** Clear grey tint while preserving recognizability
- **"KO" text:** Short, universally understood in gaming contexts

**Verification:**
```bash
npm run build
```

**Test in Browser Console:**
```javascript
console.log(CombatConstants.KNOCKED_OUT.MAP_TEXT);          // "KO"
console.log(CombatConstants.KNOCKED_OUT.MAP_TEXT_COLOR);    // "#ff0000"
console.log(CombatConstants.KNOCKED_OUT.TINT_FILTER);       // "saturate(0%) brightness(70%)"
```

---

### Step 1.5: Update CombatRenderer renderUnits() Method

**File:** `react-app/src/models/combat/rendering/CombatRenderer.ts`

**Location:** In `renderUnits()` method, within the unit rendering loop

**Find This Code:**
```typescript
for (const placement of allUnits) {
  const { row, col } = placement.position;
  const screenX = col * this.tileSize;
  const screenY = row * this.tileSize;

  this.spriteRenderer.renderSprite(
    this.ctx,
    placement.unit.spriteId,
    screenX,
    screenY,
    this.spriteImages,
    this.tileSize
  );
}
```

**Replace With:**
```typescript
for (const placement of allUnits) {
  const { row, col } = placement.position;
  const screenX = col * this.tileSize;
  const screenY = row * this.tileSize;

  // Apply grey tint for KO'd units
  if (placement.unit.isKnockedOut) {
    this.ctx.filter = CombatConstants.KNOCKED_OUT.TINT_FILTER;
  }

  this.spriteRenderer.renderSprite(
    this.ctx,
    placement.unit.spriteId,
    screenX,
    screenY,
    this.spriteImages,
    this.tileSize
  );

  // Reset filter after rendering
  if (placement.unit.isKnockedOut) {
    this.ctx.filter = 'none';
  }
}
```

**Why This Works:**
- **Canvas Filter API:** Hardware-accelerated by the browser (per GeneralGuidelines.md)
- **Filter isolation:** Applied before render, reset after (no bleed to other sprites)
- **Performance:** Simple conditional check, negligible impact
- **No allocations:** Filter is a string constant, no per-frame memory allocation

**Guidelines Compliance:**
- ✅ Uses Canvas Filter API (not pixel manipulation)
- ✅ Always resets filter after use
- ✅ No per-frame allocations
- ✅ Uses existing SpriteRenderer

**Additional Check:**
Verify that the `CombatRenderer` constructor sets:
```typescript
this.ctx.imageSmoothingEnabled = false;
```

If not present, add it to the constructor per GeneralGuidelines.md.

**Verification:**
```bash
npm run build
```

**Visual Test:**
1. Open combat encounter
2. Open browser console
3. KO a unit:
   ```javascript
   const units = window.combatState.unitManifest.getAllUnits();
   units[0].unit.wounds = units[0].unit.maxHealth;
   ```
4. Observe the unit sprite on the map - it should appear grey/desaturated

**Expected Result:**
- KO'd unit sprite is clearly grey (desaturated)
- Healthy units remain in full color
- No visual artifacts or "bleeding" to other sprites
- Performance remains at 60 FPS

---

### Step 1.6: Add KO Text Rendering in UnitTurnPhaseHandler

**File:** `react-app/src/models/combat/phases/UnitTurnPhaseHandler.ts`

**Location:** In `renderUI()` method, at the **END** (after attack animations, before method closes)

**IMPORTANT:** Must be in `renderUI()`, NOT `render()`. Per GeneralGuidelines.md, `renderUI()` renders AFTER units, so text appears ON TOP. Using `render()` would place text UNDER units.

**Action:** Add the following code block:

```typescript
    // Render "KO" text overlay for knocked out units
    const allUnits = state.unitManifest.getAllUnits();
    for (const placement of allUnits) {
      if (placement.unit.isKnockedOut) {
        const { row, col } = placement.position;
        const screenX = mapOffsetX + col * tileSize;
        const screenY = mapOffsetY + row * tileSize;

        // Get KO text configuration
        const koText = CombatConstants.KNOCKED_OUT.MAP_TEXT;
        const fontId = CombatConstants.KNOCKED_OUT.MAP_FONT_ID;
        const koColor = CombatConstants.KNOCKED_OUT.MAP_TEXT_COLOR;

        // Get font for text measurement
        const fontAtlasImage = context.assets.fonts.get(fontId);
        if (!fontAtlasImage) continue;

        const font = FontRegistry.getFont(fontId);
        if (!font) continue;

        // Measure text width for centering
        const textWidth = FontAtlasRenderer.measureTextWidth(koText, font);

        // Center horizontally and vertically on tile
        // Round coordinates for pixel-perfect rendering (per GeneralGuidelines.md)
        const textX = Math.floor(screenX + (tileSize - textWidth) / 2);
        const textY = Math.floor(screenY + (tileSize - font.glyphHeight) / 2);

        // Render with shadow for visibility
        FontAtlasRenderer.renderTextWithShadow(
          context.ctx,
          koText,
          textX,
          textY,
          fontAtlasImage,
          font,
          koColor
        );
      }
    }
```

**Why This Code:**
- **Placement in renderUI():** Ensures text renders ON TOP of units (correct Z-order)
- **Math.floor():** Pixel-perfect positioning per GeneralGuidelines.md
- **renderTextWithShadow():** Ensures readability over any background
- **Graceful degradation:** Skips rendering if font not loaded (defensive programming)
- **Performance:** Loops through ~10-20 units max per frame (acceptable)

**Guidelines Compliance:**
- ✅ Uses FontAtlasRenderer (not ctx.fillText)
- ✅ Rounds coordinates with Math.floor()
- ✅ Uses centralized constants
- ✅ Renders in renderUI() for correct Z-order
- ✅ No per-frame allocations (just stack variables)

**Common Variables to Check:**
The code assumes these variables exist in the `renderUI()` context:
- `mapOffsetX` - X offset of the map rendering
- `mapOffsetY` - Y offset of the map rendering
- `tileSize` - Size of each tile
- `context` - Combat context with assets
- `state` - Combat state with unit manifest

If your code uses different variable names, adjust accordingly.

**Verification:**
```bash
npm run build
```

**Visual Test:**
1. Open combat encounter, ensure you're in unit-turn phase
2. KO a unit via console:
   ```javascript
   const units = window.combatState.unitManifest.getAllUnits();
   units[0].unit.wounds = units[0].unit.maxHealth;
   ```
3. Observe the unit on the map

**Expected Result:**
- Red "KO" text appears centered on the unit's tile
- Text has black shadow for contrast
- Text appears ON TOP of the unit sprite (not under)
- Text is clearly readable
- No "KO" text appears on healthy units

---

## Testing Guide

### Build Test

```bash
cd react-app
npm run build
```

**Expected:** Clean build with no TypeScript errors.

---

### Console Tests

Open a combat encounter, then open browser console:

#### Test 1: Check Getter Implementation

```javascript
const units = window.combatState.unitManifest.getAllUnits();
const unit = units[0].unit;

// Should be false for healthy unit
console.log(unit.isKnockedOut);

// KO the unit
unit.wounds = unit.maxHealth;
console.log(unit.isKnockedOut);  // Should be true

// Revive the unit
unit.wounds = 0;
console.log(unit.isKnockedOut);  // Should be false
```

#### Test 2: Check Constants

```javascript
console.log(CombatConstants.KNOCKED_OUT.MAP_TEXT);          // "KO"
console.log(CombatConstants.KNOCKED_OUT.MAP_TEXT_COLOR);    // "#ff0000"
console.log(CombatConstants.KNOCKED_OUT.TINT_FILTER);       // "saturate(0%) brightness(70%)"
```

#### Test 3: Visual Rendering

```javascript
const units = window.combatState.unitManifest.getAllUnits();

// KO the first unit
units[0].unit.wounds = units[0].unit.maxHealth;

// Observe on the map:
// 1. Unit sprite should appear grey/desaturated
// 2. Red "KO" text should appear centered on the unit's tile
// 3. Text should have black shadow for visibility
```

#### Test 4: Multiple Units

```javascript
const units = window.combatState.unitManifest.getAllUnits();

// KO multiple units
units[0].unit.wounds = units[0].unit.maxHealth;
units[1].unit.wounds = units[1].unit.maxHealth;
units[2].unit.wounds = units[2].unit.maxHealth;

// All KO'd units should show:
// - Grey tint
// - Red "KO" text
// - Black shadow on text
```

#### Test 5: Revive

```javascript
const units = window.combatState.unitManifest.getAllUnits();

// KO a unit
units[0].unit.wounds = units[0].unit.maxHealth;
// Observe grey tint + "KO" text

// Revive the unit
units[0].unit.wounds = 0;
// Grey tint and "KO" text should disappear immediately
```

---

### Acceptance Criteria Checklist

**Core Functionality:**
- [ ] TypeScript compiles without errors
- [ ] `isKnockedOut` getter returns `false` for healthy units
- [ ] `isKnockedOut` getter returns `true` when `wounds >= maxHealth`
- [ ] Getter works for both HumanoidUnit and MonsterUnit
- [ ] Constants accessible via `CombatConstants.KNOCKED_OUT`

**Visual Appearance:**
- [ ] KO'd unit sprite appears with grey tint on map
- [ ] Grey tint uses 0% saturation, 70% brightness
- [ ] "KO" text appears centered on KO'd unit tiles
- [ ] Text is red (#ff0000)
- [ ] Text has black shadow for visibility
- [ ] Text appears ON TOP of unit sprite (not under)
- [ ] Healthy units render with normal colors and no text

**Quality Assurance:**
- [ ] No visual artifacts or filter bleeding to other sprites
- [ ] No performance degradation (60 FPS maintained)
- [ ] Text renders at correct Z-order (on top)
- [ ] Coordinates are pixel-perfect (no blurry text)

**Edge Cases:**
- [ ] KO'd unit at edge of map (text still visible and centered)
- [ ] Multiple KO'd units (all show grey tint + "KO" text correctly)
- [ ] Font not loaded (gracefully skips text rendering, no errors)
- [ ] Rapid KO/revive (visual updates immediately)

---

## Troubleshooting

### Issue: TypeScript errors about missing `isKnockedOut`

**Symptoms:** Build fails with errors like "Property 'isKnockedOut' does not exist"

**Solutions:**
1. Check that you added the interface definition in `CombatUnit.ts` (Step 1.1)
2. Verify you implemented the getter in both `HumanoidUnit.ts` and `MonsterUnit.ts` (Steps 1.2-1.3)
3. Ensure the getter name is exactly `isKnockedOut` (case-sensitive)

---

### Issue: Grey tint not appearing

**Symptoms:** KO'd units still show full color

**Solutions:**
1. Verify you added the filter code in `CombatRenderer.ts` (Step 1.5)
2. Check that the filter is being applied BEFORE `renderSprite()`
3. Check that the filter is being reset AFTER `renderSprite()`
4. Open DevTools > Elements, inspect the canvas element, check if `filter` property is set
5. Verify `CombatConstants.KNOCKED_OUT.TINT_FILTER` has the correct value

**Debug Code:**
```javascript
// In CombatRenderer.ts, add temporary logging:
if (placement.unit.isKnockedOut) {
  console.log('Applying filter:', CombatConstants.KNOCKED_OUT.TINT_FILTER);
  this.ctx.filter = CombatConstants.KNOCKED_OUT.TINT_FILTER;
}
```

---

### Issue: "KO" text not appearing

**Symptoms:** Grey tint works but no text overlay

**Solutions:**
1. Verify you added the text rendering code to `renderUI()` (NOT `render()`) in `UnitTurnPhaseHandler.ts` (Step 1.6)
2. Check that font `7px-04b03` is loaded in FontRegistry
3. Verify the code is at the END of `renderUI()` (after all other rendering)
4. Check browser console for any errors about missing fonts

**Debug Code:**
```javascript
// In UnitTurnPhaseHandler.ts renderUI(), add temporary logging:
if (placement.unit.isKnockedOut) {
  console.log('Rendering KO text for:', placement.unit.name);
  console.log('Font loaded:', !!fontAtlasImage, !!font);
  console.log('Position:', textX, textY);
}
```

**Font Pre-loading Check:**
```javascript
// In browser console:
console.log(FontRegistry.getFont('7px-04b03'));  // Should not be null/undefined
```

---

### Issue: Text appears UNDER the unit sprite

**Symptoms:** "KO" text is partially or fully hidden behind the unit

**Solutions:**
1. Verify you added the code to `renderUI()` and NOT `render()`
2. Per GeneralGuidelines.md, `renderUI()` renders after units, ensuring correct Z-order
3. Check that the code is at the END of `renderUI()`, not the beginning

---

### Issue: Text is blurry or positioned incorrectly

**Symptoms:** "KO" text looks fuzzy or off-center

**Solutions:**
1. Verify you're using `Math.floor()` for coordinate rounding (Step 1.6)
2. Check that `imageSmoothingEnabled` is set to `false` in CombatRenderer constructor
3. Verify the centering calculations:
   - X: `Math.floor(screenX + (tileSize - textWidth) / 2)`
   - Y: `Math.floor(screenY + (tileSize - font.glyphHeight) / 2)`

---

### Issue: Performance degradation

**Symptoms:** FPS drops below 60 when units are KO'd

**Solutions:**
1. Verify you're not creating new objects in the render loop
2. Check that filter reset is happening (`this.ctx.filter = 'none'`)
3. Ensure you're using `continue` to skip units without fonts (Step 1.6)
4. Profile with Chrome DevTools > Performance tab

**Expected Performance:**
- Grey tint: ~0.1ms per KO'd unit
- Text rendering: ~0.2ms per KO'd unit
- Total: ~0.3ms per KO'd unit (well within 16.67ms budget for 60 FPS)

---

## Rollback Plan

If you encounter issues that can't be quickly resolved, you can rollback this phase:

### Complete Rollback

```bash
git checkout HEAD -- react-app/src/models/combat/CombatUnit.ts
git checkout HEAD -- react-app/src/models/combat/HumanoidUnit.ts
git checkout HEAD -- react-app/src/models/combat/MonsterUnit.ts
git checkout HEAD -- react-app/src/models/combat/CombatConstants.ts
git checkout HEAD -- react-app/src/models/combat/rendering/CombatRenderer.ts
git checkout HEAD -- react-app/src/models/combat/phases/UnitTurnPhaseHandler.ts
```

### Partial Rollback Options

**Rollback only visual rendering (keep getter and constants):**
```bash
git checkout HEAD -- react-app/src/models/combat/rendering/CombatRenderer.ts
git checkout HEAD -- react-app/src/models/combat/phases/UnitTurnPhaseHandler.ts
```

**Rollback only text overlay (keep grey tint):**
```bash
git checkout HEAD -- react-app/src/models/combat/phases/UnitTurnPhaseHandler.ts
```

---

## Performance Benchmarks

Expected performance impact of Phase 1:

| Operation | Time per Unit | Max Units | Total Impact |
|-----------|---------------|-----------|--------------|
| `isKnockedOut` check | <0.01ms | 20 | 0.2ms |
| Canvas filter apply/reset | 0.1ms | 3 KO'd | 0.3ms |
| Text rendering | 0.2ms | 3 KO'd | 0.6ms |
| **Total per frame** | - | - | **~1.1ms** |

**Acceptable?** Yes. 60 FPS = 16.67ms per frame. Phase 1 adds ~1.1ms, leaving 15.57ms for other systems.

---

## Next Steps

After Phase 1 is complete and tested:
1. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: Add visual representation for knocked out units

   - Add isKnockedOut getter to CombatUnit interface
   - Implement KO detection in HumanoidUnit and MonsterUnit
   - Add KNOCKED_OUT constants for visual configuration
   - Apply grey tint to KO'd units on battle map
   - Render red 'KO' text overlay on KO'd unit tiles

   All visual elements tested and working at 60 FPS.
   Phase 1 of 4 complete."
   ```

2. **Proceed to Phase 2:** [Turn Order and Action Timer]
3. **Update documentation:** Mark Phase 1 as complete in [KOFeatureImplementationPlan.md](./KOFeatureImplementationPlan.md)

---

## References

- **Parent Plan:** [KOFeatureImplementationPlan.md](./KOFeatureImplementationPlan.md)
- **Feature Overview:** [KOFeatureOverview.md](./KOFeatureOverview.md)
- **System Architecture:** [CombatHierarchy.md](../../CombatHierarchy.md)
- **Coding Standards:** [GeneralGuidelines.md](../../GeneralGuidelines.md)

---

**Implementation Time Estimate:** 2.5 hours
**Difficulty:** Medium
**Risk Level:** Low (isolated visual changes, easy to rollback)
