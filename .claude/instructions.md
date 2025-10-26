# VibeDC Project Instructions

**IMPORTANT**: Before responding to any development request, read and review `GeneralGuidelines.md` to ensure all code follows project conventions.

## Quick Reference

### Rendering (See GeneralGuidelines.md for details)
- ✅ Use `SpriteRenderer` for all sprites
- ✅ Use `FontAtlasRenderer` for all text
- ❌ Never use `ctx.drawImage()` or `ctx.fillText()` directly
- Always round coordinates to integers
- Always disable image smoothing: `ctx.imageSmoothingEnabled = false`

### State Management (See GeneralGuidelines.md for details)
- ❌ Never recreate stateful UI components every frame
- ✅ Cache components that maintain state (hover, active, selection)
- Only recreate on phase changes or significant state changes
- Call `renderFrame()` to trigger visual updates

### Coordinate Systems (See GeneralGuidelines.md for details)
- Canvas: 384×216 pixels (32 tiles wide × 18 tiles tall @ 12px per tile)
- Panel-relative: Coordinates relative to panel region origin
- Tile-based: Use tile grid for layout calculations

### Event Handling (See GeneralGuidelines.md for details)
- Mouse events flow: Canvas → Layout → Panel Manager → Panel Content
- Transform coordinates at each layer
- Call `renderFrame()` after visual state changes

---

**For complete guidelines, patterns, and examples, see `GeneralGuidelines.md`**
