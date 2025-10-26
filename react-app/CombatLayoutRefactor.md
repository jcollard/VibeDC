# Combat Layout Refactor Plan

## Overview
Refactor `CombatLayout6LeftMapRenderer` from a monolithic layout renderer into a modular system with dedicated panel managers. This layout is now the permanent combat layout, so we can remove abstraction layers and focus on maintainability and extensibility.

## Current Architecture
- `CombatLayout6LeftMapRenderer`: Handles layout, rendering, and interaction for all 5 panels
- Direct rendering of turn order, unit info, combat log, and map
- Scroll button logic embedded in layout renderer
- Hard-coded positions and dimensions

## Target Architecture
```
CombatView.tsx
  ├── TopPanelManager (phase-aware container)
  │   ├── TurnOrderRenderer (combat phase)
  │   └── DeploymentHeaderRenderer (deployment phase)
  ├── InfoPanelManager (current unit - right column top)
  ├── InfoPanelManager (target unit - right column bottom)
  ├── CombatMapRenderer (existing, with scroll management)
  └── CombatLogManager (existing, with scroll management)
```

## Design Principles
1. **Separation of Concerns**: Layout defines regions; managers handle content
2. **Panel Autonomy**: Each manager handles its own rendering, state, and interactions
3. **Phase-Aware Content**: Top panel switches content based on game phase
4. **Type-Safe Content**: InfoPanelManager uses union types for different content types
5. **No Unnecessary Abstraction**: Remove layout swapping infrastructure

---

## Phase 1: Create InfoPanelManager

### Goals
- Extract unit info rendering from layout renderer
- Support different content types (unit, terrain, item, empty)
- Handle both current and target unit panels

### Tasks
1. Create `InfoPanelManager.ts`
   - Define `InfoPanelContent` union type
   - Implement `render(ctx, region, content)` method
   - Port unit rendering logic from `renderCurrentUnitPanel` and `renderTargetUnitPanel`

2. Update `CombatView.tsx`
   - Instantiate two InfoPanelManager instances
   - Pass current/target unit data to managers
   - Call manager render methods

3. Update `CombatLayout6LeftMapRenderer`
   - Replace direct rendering with manager delegation for unit panels
   - Keep frame/border rendering

### Files to Create
- `react-app/src/models/combat/managers/InfoPanelManager.ts`

### Files to Modify
- `react-app/src/components/combat/CombatView.tsx`
- `react-app/src/models/combat/layouts/CombatLayout6LeftMapRenderer.ts`

### Testing
- Verify current unit displays correctly
- Verify target unit displays correctly
- Test empty state (no unit selected)

---

## Phase 2: Create TopPanelManager and TurnOrderRenderer

### Goals
- Extract turn order rendering from layout renderer
- Enable phase-based content switching in top panel
- Add interaction support for turn order (click to select units)

### Tasks
1. Create `TopPanelRenderer.ts` interface
   - Define common interface for top panel content renderers
   - `render(ctx, region): void`
   - `handleClick(x, y, region): boolean` (optional)

2. Create `TurnOrderRenderer.ts`
   - Port turn order rendering logic from `renderTurnOrderPanel`
   - Implement click detection for unit selection
   - Handle scroll if turn order is too long

3. Create `DeploymentHeaderRenderer.ts`
   - Simple text renderer for deployment phase
   - Show deployment instructions/status

4. Create `TopPanelManager.ts`
   - Manage current renderer based on game phase
   - Delegate rendering to current renderer
   - Handle click events and route to renderer

5. Update `CombatView.tsx`
   - Instantiate TopPanelManager
   - Set renderer based on combat phase
   - Wire up click handlers
   - Pass turn order data

6. Update `CombatLayout6LeftMapRenderer`
   - Replace direct turn order rendering with manager delegation

### Files to Create
- `react-app/src/models/combat/managers/TopPanelRenderer.ts` (interface)
- `react-app/src/models/combat/managers/renderers/TurnOrderRenderer.ts`
- `react-app/src/models/combat/managers/renderers/DeploymentHeaderRenderer.ts`
- `react-app/src/models/combat/managers/TopPanelManager.ts`

### Files to Modify
- `react-app/src/components/combat/CombatView.tsx`
- `react-app/src/models/combat/layouts/CombatLayout6LeftMapRenderer.ts`

### Testing
- Verify turn order displays correctly
- Test unit selection by clicking turn order
- Test phase transition (combat ↔ deployment)
- Verify deployment header shows in deployment phase

---

## Phase 3: Simplify CombatLayout6LeftMapRenderer

### Goals
- Remove all direct rendering logic (now handled by managers)
- Focus on frame/border rendering and region definitions
- Remove unused abstraction layers
- Clean up scroll button logic (now in managers)

### Tasks
1. Update `CombatLayout6LeftMapRenderer`
   - Remove `renderTurnOrderPanel`, `renderCurrentUnitPanel`, `renderTargetUnitPanel` methods
   - Remove scroll button rendering for map (handled by CombatMapRenderer)
   - Keep only frame/border rendering
   - Simplify to just region definitions + frame rendering

2. Review `LayoutRenderContext`
   - Remove unused properties now that managers are self-contained
   - Consider splitting into smaller contexts per manager

3. Remove unused files/interfaces
   - Evaluate if `CombatLayoutRenderer` interface is still needed
   - Remove if this is the only layout

4. Update `CombatView.tsx`
   - Simplify layout renderer usage
   - Ensure all managers are properly wired up

### Files to Modify
- `react-app/src/models/combat/layouts/CombatLayout6LeftMapRenderer.ts`
- `react-app/src/components/combat/CombatView.tsx`
- `react-app/src/models/combat/layouts/LayoutRenderContext.ts` (potentially remove/simplify)

### Files to Potentially Remove
- `react-app/src/models/combat/layouts/CombatLayoutRenderer.ts` (if abstraction no longer needed)

### Testing
- Full combat layout rendering
- All panels display correctly
- All interactions work (scrolling, clicking units, etc.)
- Frame/borders render correctly

---

## Phase 4: Polish and Optimization

### Goals
- Improve code quality and consistency
- Add proper TypeScript types
- Performance optimization if needed
- Documentation

### Tasks
1. Code Review
   - Ensure consistent naming conventions
   - Verify proper TypeScript types throughout
   - Check for any remaining hard-coded values

2. Add Documentation
   - Document manager responsibilities
   - Add JSDoc comments to public methods
   - Update architecture diagrams if they exist

3. Performance Review
   - Profile rendering performance
   - Optimize if needed (likely not necessary)

4. Testing
   - Add unit tests for managers
   - Integration tests for full combat layout
   - Edge case testing (empty states, phase transitions, etc.)

### Files to Review
- All newly created manager files
- `CombatView.tsx`
- `CombatLayout6LeftMapRenderer.ts`

---

## Migration Strategy

1. **Incremental**: Each phase can be completed and tested independently
2. **Backward Compatible**: Existing functionality preserved during each phase
3. **Manager-First**: Create managers before removing old code
4. **Test-Driven**: Test after each phase before proceeding

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Breaking existing interactions | Test thoroughly after each phase |
| Performance regression | Profile before/after, optimize if needed |
| State management complexity | Keep state in CombatView, managers are stateless renderers |
| Hard-coded positions break | Derive all positions from layout regions |

## Success Criteria

- [ ] All 5 panels render correctly with new manager system
- [ ] Turn order is interactive (click to select)
- [ ] Phase transitions work (deployment ↔ combat)
- [ ] Scrolling works in all scrollable panels
- [ ] No rendering regressions
- [ ] Code is more maintainable and testable
- [ ] Reduced coupling between layout and content

## Future Enhancements (Post-Refactor)

- Additional top panel renderers (ability selection, victory screen)
- InfoPanelManager content types (terrain, items, status effects)
- Animated transitions between phases
- Customizable panel sizes
- Touch/mobile support for interactions
