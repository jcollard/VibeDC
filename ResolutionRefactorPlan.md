# Resolution Refactor Plan: 32x18 Tiles (384x216 Base Resolution)

## Executive Summary

This document outlines the plan to refactor the VibeDC combat system from the current resolution of **1706x960** with 4x scaling to a new base resolution of **384x216** (32x18 tiles of 12x12 pixels) with optional integer scaling via CSS.

### Current System
- Canvas Resolution: 1706x960 pixels
- Tile Size: 48px (12px sprites × 4 scale)
- Sprite Size: 12px
- Scale Factor: 4x (hardcoded in rendering)
- Aspect Ratio: ~16:9.5 (1.78:1)

### Target System
- Base Canvas Resolution: **384x216 pixels** (32 tiles × 18 tiles)
- Tile Size: **12px** (1:1 with sprite size)
- Sprite Size: 12px (unchanged)
- Scale Factor: **1x** (no internal scaling, use CSS for display)
- Aspect Ratio: **16:9** (perfect for modern displays)
- Display Scaling: CSS `image-rendering: pixelated` with integer scaling (2x, 3x, 4x, 5x)

### Benefits
- ✅ Perfect 16:9 aspect ratio (5x scaling = exactly 1920x1080)
- ✅ Simpler rendering logic (no scale calculations)
- ✅ Better performance (smaller canvas)
- ✅ Cleaner code (separation of logical and display sizes)
- ✅ Flexible display sizing via CSS
- ✅ More screen real estate for UI elements

---

## Phase 1: Update Constants and Core Configuration

### Files to Modify

#### 1. `CombatConstants.ts`
**Changes:**
- Update canvas dimensions from 1706x960 to 384x216
- Update tile/sprite sizes to 12px (remove 4x scaling)
- Recalculate all UI layout constants for new resolution
- Update font scaling factors (reduce by 4x where appropriate)

**Current:**
```typescript
CANVAS_WIDTH: 1706,
CANVAS_HEIGHT: 960,
TILE_SIZE: 120,      // Was 12 * 10 (incorrect comment?)
SPRITE_SIZE: 120,    // Was 12 * 10 (incorrect comment?)
```

**New:**
```typescript
CANVAS_WIDTH: 384,   // 32 tiles × 12px
CANVAS_HEIGHT: 216,  // 18 tiles × 12px
TILE_SIZE: 12,       // 1:1 with sprite size
SPRITE_SIZE: 12,     // Base sprite size (unchanged)
```

**UI Constants to Recalculate:**
- `TITLE_HEIGHT: 80` → **20** (÷4)
- `TITLE_Y_POSITION: 0` → **0** (unchanged)
- `MESSAGE_SPACING: 8` → **2** (÷4)
- `WAYLAID_MESSAGE_Y: 88` → **22** (÷4)
- `BUTTON.WIDTH: 220` → **55** (÷4)
- `BUTTON.HEIGHT: 50` → **13** (÷4)
- `BUTTON.FONT_SIZE: 36` → **9** (÷4)

**Font Sizes (used for documentation, actual scaling handled elsewhere):**
- `FONTS.TITLE_SIZE: 48` → **12** (÷4)
- `FONTS.MESSAGE_SIZE: 36` → **9** (÷4)
- `FONTS.DIALOG_SIZE: 36` → **9** (÷4)

**Animation Constants (pixel-based values need adjustment):**
- `DITHERING.PIXEL_SIZE: 4` → **1** (÷4)
- Other animation constants are time-based and alpha-based (no changes needed)

---

## Phase 2: Update CombatView Component

### Files to Modify

#### 1. `CombatView.tsx`
**Major Changes:**

1. **Remove Local Constants** (lines 29-33)
   - Delete `SCALE = 4` constant
   - Update `SPRITE_SIZE` to use `CombatConstants.SPRITE_SIZE` (12)
   - Update `TILE_SIZE` to use `CombatConstants.TILE_SIZE` (12)
   - Use `CombatConstants.CANVAS_WIDTH` and `CANVAS_HEIGHT` directly

2. **Update Renderer Initialization** (line 81-84)
   ```typescript
   // Before:
   const renderer = useMemo(
     () => new CombatRenderer(CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE, SPRITE_SIZE),
     []
   );

   // After: (TILE_SIZE and SPRITE_SIZE are now both 12)
   const renderer = useMemo(
     () => new CombatRenderer(
       CombatConstants.CANVAS_WIDTH,
       CombatConstants.CANVAS_HEIGHT,
       CombatConstants.TILE_SIZE,
       CombatConstants.SPRITE_SIZE
     ),
     []
   );
   ```

3. **Update Cinematic Sequences** (lines 190-212)
   - Change title scale from `3` to **1** (line 195)
   - Change message scale factors from `2` to **1** (lines 202, 209)
   - Update position calculations using new constants

4. **Update Dialog Rendering** (lines 356-383)
   - Update `BORDER_INSET` from `6 * 4` to **6** (line 363)
   - Update dialog scale from `4` to **1** (line 381)
   - Update unit info scale from `2` to **1** (line 358)
   - Update margin from `16` to **4** (line 369)

5. **Update CSS Scaling** (lines 759-772)
   ```typescript
   // Current: Canvas is rendered at native size with CSS letterboxing
   // New: Canvas is 384x216, scaled up with CSS integer scaling

   style={{
     width: '100%',
     height: '100%',
     imageRendering: 'pixelated',  // Keep this for sharp pixels
     objectFit: 'contain',
     cursor: combatState.phase === 'deployment' ? 'pointer' : 'default',
   }}
   ```

6. **Update Input Coordinate Scaling** (lines 437-456)
   - The coordinate conversion will work the same way
   - `scaleX` and `scaleY` calculations remain valid
   - Canvas dimensions will automatically adjust

---

## Phase 3: Update Rendering Components

### Files to Modify

#### 1. `CombatRenderer.ts`
**Changes:**
- No logic changes needed (receives dimensions as parameters)
- All rendering uses `this.tileSize` and `this.spriteSize` which will now both be 12

#### 2. `DeploymentUI.ts`
**Font Scaling Changes:**
- Line 95: Title scale from `3` → **1**
- Line 132: Message scale from `2` → **1**
- Line 171: Instruction scale from `2` → **1**
- Line 182: Sprite display size calculation (already uses `fontDef.charHeight * scale`)
- Line 228: Gap calculation `4 * scale` → remains the same (will be smaller due to scale=1)

#### 3. `DeploymentPhaseHandler.ts`
**Changes:**
- Line 339: Update title scale passed to `renderPhaseHeader` from implied `3` to **1**
- Line 342: Update message scale from implied `2` to **1**
- Line 357: Update instruction scale from implied `2` to **1**
- Line 202: Update message scale from `2` to **1**
- Line 209: Update message scale from `2` to **1**
- Lines 364-395: Button font scale handling (check if needs adjustment)

#### 4. `PartySelectionDialog.ts` (if exists - referenced but not read)
**Likely Changes:**
- Update dialog positioning and sizing
- Adjust font scales for character names

#### 5. `CharacterSelectionDialogContent.ts`
**Changes:**
- Line 57: `TITLE_SCALE = 2` → **1**
- Line 58: `NAME_SCALE = 2` → **1**
- Line 59: `SPRITE_SIZE_PIXELS = this.tileSize * 1` → remains (will be 12px now)
- Line 60: `ROW_HEIGHT = 48` → **12** (÷4)
- Line 61: `TITLE_SPACING = 8` → **2** (÷4)
- Line 62: `NAME_OFFSET = 8` → **2** (÷4)
- Line 137-142: Update scale constants in `getBounds()` to match

#### 6. `CombatUnitInfoDialogContent.ts` (referenced but not read)
**Expected Changes:**
- Update all hardcoded pixel values (÷4)
- Update font scale factors

---

## Phase 4: Update Dialog and UI Components

### Files to Modify

#### 1. `DialogRenderer.ts`
**Changes:**
- Line 69: `BORDER_INSET = 6 * scale` → Keep formula, but default scale should be **1**
- Line 132: Default scale parameter from `4` → **1**
- Line 258: Default scale parameter from `4` → **1**
- Line 261: `BORDER_INSET = 6 * scale` → Keep formula

**Note:** The 9-slice rendering logic is scale-agnostic, so only default parameters need updating.

#### 2. `CanvasButton.ts`
**Changes:**
- Line 59: Border size calculation `this.borderSize * 4` → `this.borderSize * 1`
- Line 89: Default `fontScale` from `2` → **1**
- Line 216: Comment update `borderScale = 4` → `borderScale = 1`
- Line 214: `spriteSize = 12` → Keep (correct)
- Line 215: `borderSizeInSprite = 3` → Keep (correct)
- Line 217: `scaledBorderSize = borderSizeInSprite * borderScale` → Update borderScale to 1

**Button State Management:**
- No changes needed (logic is pixel-agnostic)

---

## Phase 5: Update Cinematic Sequences

### Files to Modify

#### 1. `MessageFadeInSequence.ts`
**Changes:**
- Line 44: Default `scale = 2` → **1**
- Line 44: Default `yPosition = 140` → **35** (÷4)
- Line 230: Gap calculation `4 * this.scale` → Keep formula
- Line 262: Gap calculation `4 * this.scale` → Keep formula

#### 2. `TitleFadeInSequence.ts` (not read, but inferred from usage)
**Expected Changes:**
- Update default scale factor
- Update default Y position

#### 3. `MapFadeInSequence.ts` (not read, but likely minimal changes)
**Expected Changes:**
- Dithering pixel size (uses `CombatConstants.ANIMATION.DITHERING.PIXEL_SIZE`)
- Already updated in Phase 1

---

## Phase 6: Update Deployment Zone Rendering

### Files to Modify

#### 1. `DeploymentZoneRenderer.ts` (referenced but not read)
**Expected Changes:**
- Update any hardcoded sizes or positions
- Dithering implementation (pixel size from constants)
- Zone highlighting (should be tile-based, likely no changes)

#### 2. `UnitDeploymentManager.ts` (referenced but not read)
**Expected Changes:**
- Click detection (uses tile-based coordinates, should be fine)
- Possible edge case handling for smaller canvas

---

## Phase 7: Update Developer Tools and Previews

### Files to Modify

All developer panels likely have hardcoded preview sizes that need adjustment:

#### 1. `EncounterPreview.tsx`
- Update preview canvas size
- Update tile rendering scale

#### 2. `MapEditor.tsx`
- Update editor canvas size
- Update grid rendering

#### 3. `DebugPanel.tsx`
- Update any resolution-dependent debug info

#### 4. Developer Registry Panels
- `EncounterRegistryPanel.tsx`
- `PartyMemberRegistryPanel.tsx`
- `EnemyRegistryPanel.tsx`
- `TilesetRegistryPanel.tsx`
- `SpriteRegistryPanel.tsx`
- `SpriteBrowser.tsx`

**Common Changes:**
- Update preview canvas sizes (÷4)
- Update scale factors for sprite rendering
- Update any hardcoded pixel dimensions

---

## Phase 8: Testing and Validation

### Test Cases

#### 1. **Visual Regression Tests**
- [ ] Map renders correctly at new resolution
- [ ] Units are positioned correctly on tiles
- [ ] Deployment zones are visible and correctly sized
- [ ] UI elements (title, messages, buttons) are properly positioned
- [ ] Dialogs (party selection, unit info) render correctly
- [ ] Font rendering is crisp and readable
- [ ] Sprites are sharp (no blurring)

#### 2. **Interaction Tests**
- [ ] Click detection works for deployment zones
- [ ] Character selection in dialog responds to clicks
- [ ] Button hover and click states work
- [ ] Mouse move detection for unit info hover
- [ ] Canvas coordinate conversion is accurate

#### 3. **Animation Tests**
- [ ] Intro cinematic (map fade, title, messages) plays correctly
- [ ] Deployment zone pulsing animation works
- [ ] Button hover/active state transitions
- [ ] Letter-by-letter message reveals

#### 4. **Scaling Tests**
- [ ] CSS scaling maintains pixel-perfect rendering
- [ ] Integer scaling (2x, 3x, 4x, 5x) works on different window sizes
- [ ] Aspect ratio is preserved
- [ ] No sub-pixel rendering artifacts

#### 5. **Layout Tests**
- [ ] UI fits within new canvas bounds
- [ ] No elements render off-canvas
- [ ] Dialogs position correctly relative to canvas size
- [ ] Text wrapping works within new constraints

---

## Phase 9: Edge Cases and Considerations

### Potential Issues

1. **Text Length Constraints**
   - With 32 tiles (384px), horizontal text space is limited
   - May need to truncate longer messages or split into multiple lines
   - Font atlas rendering at scale=1 produces smaller text

2. **UI Element Sizing**
   - Buttons may be too small at base resolution
   - Consider adjusting padding/sizes if needed after visual testing
   - Unit info dialog may need layout adjustments

3. **Map Centering**
   - Smaller maps will have less padding
   - Larger maps (if any exist >32x18) will need scrolling or won't fit
   - Verify all encounter maps fit within new dimensions

4. **Developer Tools**
   - Preview canvases may be too small for detailed editing
   - Consider keeping developer tools at higher scale factors
   - Map editor may need zoom functionality

5. **Font Readability**
   - Fonts at scale=1 will be smaller
   - Verify all fonts are readable at target display scales
   - May need to adjust which fonts are used where

---

## Phase 10: Implementation Order

### Recommended Sequence

1. **Start with Constants** (Phase 1)
   - Update `CombatConstants.ts`
   - Run tests to see what breaks
   - This provides a clear picture of dependencies

2. **Fix Core Rendering** (Phases 2-3)
   - Update `CombatView.tsx`
   - Update `CombatRenderer.ts`
   - Get basic map and unit rendering working

3. **Fix UI Components** (Phases 4-5)
   - Update dialogs and buttons
   - Fix cinematic sequences
   - Get deployment phase fully functional

4. **Fix Deployment Rendering** (Phase 6)
   - Update zone rendering
   - Test deployment interaction

5. **Fix Developer Tools** (Phase 7)
   - Update all preview components
   - These are less critical for core functionality

6. **Comprehensive Testing** (Phase 8)
   - Manual testing of all features
   - Visual inspection at different scales
   - Edge case validation

---

## Rollback Plan

If the refactor causes significant issues:

1. **Git Checkpoint**: Create a branch before starting
2. **Constant Toggling**: Add a feature flag to switch between old/new constants
3. **Incremental Rollback**: Roll back phases in reverse order if needed

---

## Success Criteria

The refactor is complete when:

- ✅ All combat features work at 384x216 base resolution
- ✅ Canvas scales cleanly to common resolutions (1920x1080, 1280x720, etc.)
- ✅ No visual artifacts or rendering issues
- ✅ All interactions (clicks, hover) work correctly
- ✅ Performance is equal or better than before
- ✅ All existing tests pass (or are updated to reflect new constants)
- ✅ Developer tools are functional

---

## Estimated Impact

### Files Modified: ~25-30 files

**Critical Path (must be done together):**
- CombatConstants.ts
- CombatView.tsx
- CombatRenderer.ts
- DeploymentUI.ts
- DeploymentPhaseHandler.ts

**Secondary (can be done incrementally):**
- Dialog components (3-5 files)
- Cinematic sequences (3-4 files)
- UI components (2-3 files)
- Developer tools (7-8 files)

**Estimated Time:**
- Phase 1-6: 3-4 hours (core functionality)
- Phase 7: 1-2 hours (developer tools)
- Phase 8: 2-3 hours (testing and bug fixes)
- **Total: 6-9 hours**

---

## Notes and Warnings

### Critical Considerations

1. **All hardcoded pixel values must be divided by 4**
   - Search for: `* 4`, `* 2`, `* 3` (scaling operations)
   - Search for: numbers like `48`, `96`, `144`, `192` (multiples of 12)
   - Search for: `SCALE`, `scale`, `fontScale`

2. **CSS scaling is now the primary scaling mechanism**
   - Canvas is rendered at native 384x216
   - CSS handles display scaling
   - `image-rendering: pixelated` is essential

3. **Font scales need careful attention**
   - Current fonts use scale factors 2x, 3x, 4x
   - New system should use 1x primarily
   - May need new font definitions or scale adjustments

4. **Coordinate systems remain the same**
   - Tile coordinates (x, y in map grid) unchanged
   - Pixel coordinates scaled down 4x
   - Input handling needs verification

5. **Sprite rendering is 1:1**
   - 12px sprites render at 12px on canvas
   - No more `drawImage` with scaled destination sizes
   - Simpler, faster rendering

---

## Additional Resources

### Key Formulas

**Old System:**
```
display_size = sprite_size (12px) × scale (4) = 48px
canvas_size = 1706×960
tile_size = 48px
```

**New System:**
```
display_size = canvas_size (384×216) × CSS_scale (1x-5x)
canvas_size = 384×216
tile_size = 12px
sprite_size = 12px
```

**Conversion Factor:**
```
old_value ÷ 4 = new_value
```

### Search Patterns for Finding Code to Update

```typescript
// Find scaling operations
grep -r "* 4" --include="*.ts" --include="*.tsx"
grep -r "SCALE" --include="*.ts" --include="*.tsx"

// Find hardcoded sizes
grep -r "48\|96\|144\|192" --include="*.ts" --include="*.tsx"

// Find font scales
grep -r "fontScale" --include="*.ts" --include="*.tsx"
grep -r "TITLE_SCALE\|MESSAGE_SCALE\|NAME_SCALE" --include="*.ts" --include="*.tsx"
```

---

## Conclusion

This refactor will significantly simplify the rendering system while providing better display flexibility and performance. The main challenge is ensuring all hardcoded pixel values and scale factors are updated consistently across ~25-30 files. Following this plan phase-by-phase will minimize risk and make it easier to identify and fix issues as they arise.

The new 32×18 tile system (384×216 base resolution) with 16:9 aspect ratio is an excellent choice that will scale perfectly to 1920×1080 at 5× magnification.
