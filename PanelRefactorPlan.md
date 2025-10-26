# InfoPanelManager Refactoring Plan

## Overview
Refactor InfoPanelManager to separate rendering concerns by creating dedicated panel content components that implement a common interface.

## Goals
- Separate content rendering logic into individual, reusable components
- Create a clean interface for panel content that can be rendered in info panels
- Make InfoPanelManager a thin coordinator that delegates rendering and input handling
- Support easy addition of new content types in the future

## Design Principles

### 1. InfoPanelManager Role
The manager becomes a thin coordinator that:
- Receives a `PanelContent` implementation
- Forwards `render()` calls with the full region
- Transforms canvas coordinates to panel-relative coordinates
- Forwards click/hover events to content implementations
- Does NOT render any content itself (including titles)

### 2. PanelContent Interface
Each content implementation is responsible for:
- Rendering everything (including its own title if desired)
- Handling its own layout and positioning
- Responding to interaction events with panel-relative coordinates
- Always using FontAtlasRenderer and SpriteRenderer (never direct rendering)

### 3. Event System
- Click and hover events are transformed from canvas coordinates to panel-relative coordinates
- Content implementations receive relative coordinates (0,0 = top-left of panel)
- This makes content independent of panel position, enabling easy repositioning

### 4. Layout & Sizing
- Content implementations calculate their own layout based on provided region
- Layout calculations are done per render (no caching initially)
- Sprite constants (12x12) are defined but layout is dynamic based on region

## Implementation Tasks

### Phase 1: Create Infrastructure
- [ ] Create `react-app/src/models/combat/managers/panels/` directory
- [ ] Define `PanelContent` interface in `PanelContent.ts`
- [ ] Define shared types (PanelRegion, etc.) if needed

### Phase 2: Create Content Implementations
- [ ] Create `UnitInfoContent.ts` - renders single unit information
- [ ] Create `PartyMembersContent.ts` - renders party grid with interaction
- [ ] Create `EmptyContent.ts` - renders empty state

### Phase 3: Refactor InfoPanelManager
- [ ] Update InfoPanelManager to accept PanelContent implementations
- [ ] Implement coordinate transformation for events
- [ ] Remove direct rendering logic (keep only delegation)
- [ ] Update InfoPanelContent type to reference new content classes

### Phase 4: Update Consumers
- [ ] Find all files that use InfoPanelManager
- [ ] Update to use new PanelContent implementations
- [ ] Ensure proper content instantiation with required dependencies

### Phase 5: Testing
- [ ] Test unit info panel rendering
- [ ] Test party members panel rendering and interaction
- [ ] Test empty state rendering
- [ ] Test panel repositioning/resizing
- [ ] Test click and hover event handling

## Technical Details

### PanelContent Interface (Draft)
```typescript
interface PanelContent {
  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void;

  handleClick?(relativeX: number, relativeY: number): T | null;
  handleHover?(relativeX: number, relativeY: number): T | null;
}
```

### Content Implementations

#### UnitInfoContent
- Displays: name, class, HP, MP, speed, movement
- Title: Configurable (e.g., "Current Unit", "Target Unit")
- Interactions: None

#### PartyMembersContent
- Displays: 2x2 grid of sprites with names
- Title: Configurable (e.g., "Party")
- Interactions: Click returns unit index, hover returns unit index
- Requires: sprite images map, sprite size

#### EmptyContent
- Displays: dash or empty message
- Title: Configurable
- Interactions: None

## Migration Strategy
1. Create new components alongside existing code
2. Refactor InfoPanelManager to use new system
3. Update all consumers in one pass
4. Remove old code from InfoPanelManager

## Future Enhancements
- Add caching for layout calculations if performance becomes an issue
- Add more content types (terrain, items, status effects, etc.)
- Add animation support for content transitions
- Add scrolling support for content that exceeds panel size
