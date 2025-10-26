# VibeDC Development Guidelines

## Rendering Rules

### Always Use Specialized Renderers
- **Sprites**: Use `@react-app/src/utils/SpriteRenderer.ts`
  - Handles sprite sheet slicing and scaling correctly
  - Example: `SpriteRenderer.renderSpriteById(ctx, 'ui-simple-4', spriteImages, 12, x, y, width, height)`
  - Never use `ctx.drawImage()` directly for sprites

- **Text**: Use `@react-app/src/utils/FontAtlasRenderer.ts`
  - Provides pixel-perfect font rendering from font atlases
  - Example: `FontAtlasRenderer.renderText(ctx, 'Hello', x, y, fontId, fontAtlas, scale, 'center', '#ffffff')`
  - Never use `ctx.fillText()` or `ctx.strokeText()`

- **Always disable image smoothing**:
  ```typescript
  ctx.imageSmoothingEnabled = false;
  ```

- **Round all coordinates** to integers for pixel-perfect rendering

## Screen Layout & Coordinate Systems

### Tile-Based Grid System
- **Canvas size**: 384×216 pixels
- **Grid**: 32 tiles wide × 18 tiles tall
- **Tile size**: 12×12 pixels

**Example positioning**:
- Rows 0-8, Columns 21-31 (top-right area):
  - x: `21 * 12 = 252px`
  - y: `0 * 12 = 0px`
  - width: `11 * 12 = 132px` (11 columns)
  - height: `9 * 12 = 108px` (9 rows)

### Coordinate Systems
1. **Absolute Canvas Coordinates** (0-384px width, 0-216px height)
   - Used by root canvas rendering
   - Mouse events are converted to these coordinates

2. **Panel-Relative Coordinates** (relative to panel region origin)
   - Used by `PanelContent` implementations
   - `InfoPanelManager` transforms canvas coords to panel-relative
   - Example: If panel is at (252, 120), a click at canvas (260, 130) becomes panel-relative (8, 10)

3. **Tile Coordinates** (0-31 columns, 0-17 rows)
   - Used for map positioning and layout calculations
   - Convert: `pixelX = tileCol * 12`, `pixelY = tileRow * 12`

## State Management

### UI Component State
- **❌ DON'T**: Recreate stateful components every frame
  ```typescript
  // BAD: Creates new button every frame, loses hover state
  render() {
    const button = new Button({ onClick: ... });
    button.render(ctx);
  }
  ```

- **✅ DO**: Cache instances that maintain state
  ```typescript
  // GOOD: Create once, reuse across frames
  private button: Button | null = null;

  render() {
    if (!this.button) {
      this.button = new Button({ onClick: ... });
    }
    this.button.render(ctx);
  }
  ```

- **When to cache**:
  - Components with hover state
  - Components with active/pressed state
  - Components with selection state
  - Any component that changes appearance based on user interaction

- **When to recreate**:
  - Phase changes (deployment → battle)
  - Content type changes (party member list → unit info)
  - Significant state changes that require full reset

### State Storage Locations
- **React state** (`useState`): For state that triggers component re-renders
  - Combat phase, turn number, unit positions
  - Anything that affects multiple systems

- **useRef**: For state that doesn't need re-renders
  - Last frame time, animation frames
  - Cached canvas buffers

- **Class instance variables**: For component-local state
  - Button hover state, scroll positions
  - State that only affects one component

### Triggering Re-renders
- Call `renderFrame()` when visual state changes:
  - Hover state changes
  - Button pressed/released
  - Unit selection changes
  - Animation updates

## Event Handling

### Mouse Event Flow
1. **Canvas event handler** (CombatView)
   - Receives browser mouse event
   - Converts to canvas coordinates using `inputHandler.getCanvasCoordinates()`

2. **Layout regions** (CombatLayoutManager)
   - Check if click is within specific regions (panels, buttons, map)
   - Transform canvas coords to region-relative coords

3. **Panel managers** (InfoPanelManager)
   - Transform canvas coords to panel-relative coords
   - Forward to panel content

4. **Panel content** (PartyMembersContent, UnitInfoContent)
   - Handle in panel-relative coordinates
   - Update component state, return results

### Coordinate Transformation Pattern
```typescript
// Canvas → Panel-relative
const relativeX = canvasX - panelRegion.x;
const relativeY = canvasY - panelRegion.y;

// Panel-relative → Component-absolute (for rendering)
const absoluteX = panelRegion.x + relativeX;
const absoluteY = panelRegion.y + relativeY;
```

### When to Call renderFrame()
- After any mouse interaction that changes visual state
- After animation updates
- When hover state changes
- When selection changes
- **Not needed**: When state change will trigger React re-render

## Component Architecture

### PanelContent Interface
Implement `PanelContent` for any content displayed in info panels:

```typescript
interface PanelContent {
  render(ctx, region, fontId, fontAtlasImage): void;
  handleClick?(relativeX, relativeY): unknown;
  handleHover?(relativeX, relativeY): unknown;
  handleMouseDown?(relativeX, relativeY): boolean;
}
```

**Key points**:
- All coordinates are **panel-relative**
- `region` parameter provides panel position/size for rendering
- Return values can be custom (number for index, string for signals, etc.)

### Creating Reusable UI Components
- Design for **panel-relative coordinates** if used in panels
- Accept callbacks via constructor (don't hardcode behavior)
- Provide methods for state queries (`isHovered()`, `isActive()`)
- Document coordinate system used

### Passing Data Through Render Context
Add properties to `LayoutRenderContext` for data needed during rendering:
- Keeps rendering code pure (no external dependencies)
- Makes data flow explicit
- Example: `deployedUnitCount`, `onEnterCombat` callback

## Common Patterns

### Conditional Rendering Based on Phase
```typescript
if (combatState.phase === 'deployment') {
  // Render deployment-specific UI
} else if (combatState.phase === 'battle') {
  // Render battle-specific UI
}
```

### Hover Detection Pattern
```typescript
handleHover(relativeX: number, relativeY: number): number | null {
  // Check bounds for each interactive element
  if (relativeX >= x && relativeX < x + width &&
      relativeY >= y && relativeY < y + height) {
    return elementIndex; // Or other identifier
  }
  return null;
}
```

### Button Click Pattern (Mouse Down + Mouse Up)
```typescript
// On mouse down: set active state
handleMouseDown(relativeX, relativeY): boolean {
  if (this.contains(relativeX, relativeY)) {
    this.isActive = true;
    return true; // Handled
  }
  return false;
}

// On mouse up: trigger action if still over button
handleMouseUp(relativeX, relativeY): boolean {
  if (this.isActive && this.contains(relativeX, relativeY)) {
    this.isActive = false;
    this.onClick?.(); // Trigger callback
    return true;
  }
  this.isActive = false;
  return false;
}
```

## Debug Tools

### Debug Grid Overlay
- Enable in CombatView settings to show 12×12 tile grid
- Shows row/column numbers for easy position reference
- Toggle with `showDebugGrid` state

### Console Logging Best Practices
- Use prefixes for filtering: `[ComponentName] message`
- Log coordinate values when debugging positioning
- Log state changes for interaction debugging
- Remove or comment out logs before committing

## Performance Considerations

- **Don't recreate heavy objects every frame** (sprites, fonts, buffers)
- **Cache computed values** when possible (text measurements, bounds)
- **Use off-screen canvases** for complex rendering (combat log buffer)
- **Limit re-renders**: Only call `renderFrame()` when visuals actually change

---

## Meta-Guidelines for AI Development

### At the Start of Each Development Session
- **Acknowledge** that you have read and reviewed these guidelines
- Confirm understanding of the relevant sections for the task at hand

### During Large Coding Tasks
- **Continuously evaluate** if new patterns or lessons learned should be added to these guidelines
- **Propose updates** to GeneralGuidelines.md when you identify:
  - New common patterns that should be standardized
  - Mistakes or anti-patterns that should be documented
  - Missing information that would prevent future issues
  - Better approaches than what's currently documented

### Updating These Guidelines
- Keep guidelines concise and actionable
- Use examples to illustrate patterns
- Document the "why" behind rules when not obvious
- Update both GeneralGuidelines.md and `.claude/instructions.md` if quick reference needs changes
