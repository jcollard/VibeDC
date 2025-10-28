# Unit Turn Interaction Implementation Plan

**Date:** 2025-10-27
**Feature:** Initial unit turn phase interactions - cursor display, unit selection, and movement range visualization

---

## Overview

Implementing the interactive portion of the unit turn phase where:
- Active unit receives a blinking green cursor
- Ready message displays with colored unit names (green for players, red for enemies)
- Player-controlled units wait for user input
- Clicking units selects them as targets and displays their movement range
- Target units receive a red cursor
- Movement range calculation uses flood-fill algorithm with orthogonal movement only

---

## Requirements

### Visual Feedback
- **Active Unit Cursor:** Dark green (`#006400`), sprite `particles-5`, blinks at 0.5s rate (toggle visibility)
- **Target Unit Cursor:** Red (`#ff0000`), sprite `particles-5`, always visible
- **Movement Range:** Yellow (`#ffff00`) highlights, sprite `particles-4`, 33% alpha
- **Cursor Z-Order:** Render ABOVE units (after unit rendering)

### Ready Message
- Format: `"{UNIT NAME} is ready!"`
- Player units: Name in green (`#00ff00`) - same as deployment phase
- Enemy units: Name in red (`#ff0000`) - same as enemy deployment phase

### Unit Selection
- Clicking any unit on the map sets it as the target
- Target's movement range is calculated and displayed
- Unit Info panel updates to show target's stats
- If no target selected, shows active unit's stats

### Movement Calculation
- **Algorithm:** Flood-fill (BFS) pathfinding
- **Movement Type:** Orthogonal only (4 directions: up, down, left, right)
- **Walkability:** Check `CombatCell.walkable` property
- **Unit Interaction:** Can path THROUGH friendly units, but cannot END on occupied tiles
- **Range Display:** Show all reachable tiles EXCEPT the unit's current position

### Player Control
- Add `isPlayerControlled: boolean` flag to `CombatUnit` interface
- Set during deployment (player units = true, enemies = false)
- Persist through serialization

---

## Implementation Tasks

### 1. Add `isPlayerControlled` Flag to CombatUnit

**Files:**
- `react-app/src/models/combat/CombatUnit.ts`
- `react-app/src/models/combat/HumanoidUnit.ts`
- `react-app/src/models/combat/MonsterUnit.ts`

**Changes:**

#### CombatUnit.ts
```typescript
export interface CombatUnit {
  // ... existing properties ...

  /**
   * Whether this unit is controlled by the player
   * Player-controlled units wait for input during their turn
   */
  get isPlayerControlled(): boolean;
}
```

#### HumanoidUnit.ts
```typescript
export interface HumanoidUnitJSON {
  // ... existing fields ...
  isPlayerControlled: boolean;
}

export class HumanoidUnit implements CombatUnit {
  private _isPlayerControlled: boolean = false;

  // Constructor: add optional parameter
  constructor(
    // ... existing parameters ...
    isPlayerControlled: boolean = false
  ) {
    // ... existing initialization ...
    this._isPlayerControlled = isPlayerControlled;
  }

  get isPlayerControlled(): boolean {
    return this._isPlayerControlled;
  }

  setPlayerControlled(value: boolean): void {
    this._isPlayerControlled = value;
  }

  // Update toJSON()
  toJSON(): HumanoidUnitJSON {
    return {
      // ... existing fields ...
      isPlayerControlled: this._isPlayerControlled,
    };
  }

  // Update fromJSON()
  static fromJSON(json: HumanoidUnitJSON): HumanoidUnit | null {
    const unit = new HumanoidUnit(
      // ... existing parameters ...
      json.isPlayerControlled ?? false
    );
    // ... rest of deserialization ...
  }
}
```

#### MonsterUnit.ts
Similar changes as HumanoidUnit, adding:
- `isPlayerControlled` field to `MonsterUnitJSON`
- `_isPlayerControlled` private field (default: `false`)
- Getter, setter, and serialization updates

---

### 2. Update CombatConstants.ts

**File:** `react-app/src/models/combat/CombatConstants.ts`

**Changes:**

Add new section after `ENEMY_DEPLOYMENT`:

```typescript
// Unit Turn Phase
UNIT_TURN: {
  // Ready message colors
  PLAYER_NAME_COLOR: '#00ff00',      // Green (matches deployment)
  ENEMY_NAME_COLOR: '#ff0000',       // Red (matches enemy deployment)

  // Active unit cursor (dark green, blinking)
  CURSOR_SPRITE_ID: 'particles-5',
  CURSOR_ALBEDO_DARK_GREEN: '#006400',
  CURSOR_BLINK_RATE: 0.5,            // Full cycle (on→off→on) in seconds

  // Target unit cursor (red, always visible)
  TARGET_CURSOR_SPRITE_ID: 'particles-5',
  TARGET_CURSOR_ALBEDO: '#ff0000',

  // Movement range highlights (yellow, semi-transparent)
  MOVEMENT_HIGHLIGHT_SPRITE: 'particles-4',
  MOVEMENT_HIGHLIGHT_ALBEDO: '#ffff00',
  MOVEMENT_HIGHLIGHT_ALPHA: 0.33,
},
```

---

### 3. Create MovementRangeCalculator Utility

**New File:** `react-app/src/models/combat/utils/MovementRangeCalculator.ts`

**Purpose:** Calculate movement range using flood-fill algorithm

**Implementation:**

```typescript
import type { Position } from '../../../types';
import type { CombatMap } from '../CombatMap';
import type { CombatUnitManifest } from '../CombatUnitManifest';
import type { CombatUnit } from '../CombatUnit';

export interface MovementRangeOptions {
  startPosition: Position;
  movement: number;
  map: CombatMap;
  unitManifest: CombatUnitManifest;
  activeUnit: CombatUnit;
}

interface QueueNode {
  position: Position;
  remainingMovement: number;
}

/**
 * Calculates movement ranges for units using flood-fill pathfinding
 */
export class MovementRangeCalculator {
  /**
   * Calculate all tiles reachable within movement range
   * Uses flood-fill (BFS) algorithm with orthogonal movement only
   *
   * @param options - Movement calculation parameters
   * @returns Array of reachable positions (excludes starting position)
   */
  static calculateReachableTiles(options: MovementRangeOptions): Position[] {
    const { startPosition, movement, map, unitManifest, activeUnit } = options;
    const reachable: Position[] = [];
    const visited = new Set<string>();
    const queue: QueueNode[] = [];

    // Start BFS from initial position
    queue.push({ position: startPosition, remainingMovement: movement });
    visited.add(this.positionKey(startPosition));

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.remainingMovement <= 0) continue;

      // Check all 4 orthogonal neighbors
      const neighbors = this.getOrthogonalNeighbors(current.position);

      for (const neighbor of neighbors) {
        // Skip if already visited
        const key = this.positionKey(neighbor);
        if (visited.has(key)) continue;

        // Skip if out of bounds
        if (!map.isInBounds(neighbor)) continue;

        // Skip if not walkable terrain
        if (!map.isWalkable(neighbor)) continue;

        // Check if tile is occupied
        const unitAtPosition = unitManifest.getUnitAt(neighbor.x, neighbor.y);

        if (unitAtPosition) {
          // Can path through friendly units, but cannot stop on them
          if (this.isFriendly(activeUnit, unitAtPosition.unit)) {
            // Mark as visited to continue pathfinding through this tile
            visited.add(key);
            queue.push({
              position: neighbor,
              remainingMovement: current.remainingMovement - 1
            });
          }
          // Skip adding to reachable (cannot end movement here)
          continue;
        }

        // Tile is reachable
        visited.add(key);
        reachable.push(neighbor);
        queue.push({
          position: neighbor,
          remainingMovement: current.remainingMovement - 1
        });
      }
    }

    return reachable;
  }

  /**
   * Get orthogonal neighbors (up, down, left, right)
   */
  private static getOrthogonalNeighbors(position: Position): Position[] {
    return [
      { x: position.x, y: position.y - 1 }, // Up
      { x: position.x, y: position.y + 1 }, // Down
      { x: position.x - 1, y: position.y }, // Left
      { x: position.x + 1, y: position.y }, // Right
    ];
  }

  /**
   * Check if two units are friendly (same team)
   */
  private static isFriendly(unit1: CombatUnit, unit2: CombatUnit): boolean {
    return unit1.isPlayerControlled === unit2.isPlayerControlled;
  }

  /**
   * Convert position to string key for Set/Map
   */
  private static positionKey(position: Position): string {
    return `${position.x},${position.y}`;
  }
}
```

**Algorithm Details:**
1. **BFS Queue:** Start from unit position with full movement points
2. **Orthogonal Movement:** Only check 4 neighbors (no diagonals)
3. **Terrain Check:** Use `map.isWalkable()` to validate terrain
4. **Unit Blocking:**
   - Friendly units: Can path through, cannot stop on
   - Enemy units: Block both pathing and stopping
5. **Visited Tracking:** Prevent reprocessing same tile
6. **Result:** Array of all tiles unit can move to (excluding start)

---

### 4. Update UnitTurnPhaseHandler

**File:** `react-app/src/models/combat/UnitTurnPhaseHandler.ts`

**Changes:**

#### Add Instance Variables

```typescript
export class UnitTurnPhaseHandler extends PhaseBase implements CombatPhaseHandler {
  private infoPanelContent: UnitInfoContent | null = null;

  // Turn state
  private activeUnit: CombatUnit | null = null;
  private activeUnitPosition: Position | null = null;
  private readyMessageWritten: boolean = false;

  // Target selection
  private targetedUnit: CombatUnit | null = null;
  private targetedUnitPosition: Position | null = null;
  private movementRange: Position[] = [];

  // Cursor animation
  private cursorBlinkTimer: number = 0;
  private cursorVisible: boolean = true;

  // Cached turn order renderer (maintains scroll state across renders)
  private turnOrderRenderer: TurnOrderRenderer | null = null;
```

#### Update getRequiredSprites()

```typescript
getRequiredSprites(state: CombatState, encounter: CombatEncounter): PhaseSprites {
  const spriteIds = new Set<string>();

  // Add cursor and movement highlight sprites
  spriteIds.add(CombatConstants.UNIT_TURN.CURSOR_SPRITE_ID);
  spriteIds.add(CombatConstants.UNIT_TURN.TARGET_CURSOR_SPRITE_ID);
  spriteIds.add(CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_SPRITE);

  // Add unit sprites
  for (const placement of state.unitManifest.getAllUnits()) {
    spriteIds.add(placement.unit.spriteId);
  }

  return { spriteIds };
}
```

#### Implement render() for Overlays

```typescript
render(state: CombatState, encounter: CombatEncounter, context: PhaseRenderContext): void {
  const { ctx, tileSize, spriteSize, offsetX, offsetY, spriteImages } = context;

  // Render movement range highlights (yellow tiles)
  for (const position of this.movementRange) {
    const x = offsetX + (position.x * tileSize);
    const y = offsetY + (position.y * tileSize);

    SpriteRenderer.renderSpriteById(
      ctx,
      CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_SPRITE,
      spriteImages,
      spriteSize,
      x,
      y,
      tileSize,
      tileSize,
      CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_ALBEDO,
      CombatConstants.UNIT_TURN.MOVEMENT_HIGHLIGHT_ALPHA
    );
  }
}
```

#### Implement renderUI() for Cursors

```typescript
renderUI(state: CombatState, encounter: CombatEncounter, context: PhaseRenderContext): void {
  const { ctx, tileSize, spriteSize, offsetX, offsetY, spriteImages } = context;

  // Render active unit cursor (dark green, blinking)
  if (this.activeUnitPosition && this.cursorVisible) {
    const x = offsetX + (this.activeUnitPosition.x * tileSize);
    const y = offsetY + (this.activeUnitPosition.y * tileSize);

    SpriteRenderer.renderSpriteById(
      ctx,
      CombatConstants.UNIT_TURN.CURSOR_SPRITE_ID,
      spriteImages,
      spriteSize,
      x,
      y,
      tileSize,
      tileSize,
      CombatConstants.UNIT_TURN.CURSOR_ALBEDO_DARK_GREEN
    );
  }

  // Render target cursor (red, always visible)
  if (this.targetedUnitPosition) {
    const x = offsetX + (this.targetedUnitPosition.x * tileSize);
    const y = offsetY + (this.targetedUnitPosition.y * tileSize);

    SpriteRenderer.renderSpriteById(
      ctx,
      CombatConstants.UNIT_TURN.TARGET_CURSOR_SPRITE_ID,
      spriteImages,
      spriteSize,
      x,
      y,
      tileSize,
      tileSize,
      CombatConstants.UNIT_TURN.TARGET_CURSOR_ALBEDO
    );
  }
}
```

#### Update updatePhase()

```typescript
protected updatePhase(
  state: CombatState,
  encounter: CombatEncounter,
  deltaTime: number
): CombatState | null {
  // Find the unit with highest action timer (first ready)
  const allUnits = state.unitManifest.getAllUnits();
  const sortedUnits = allUnits.sort((a, b) => {
    if (b.unit.actionTimer !== a.unit.actionTimer) {
      return b.unit.actionTimer - a.unit.actionTimer;
    }
    return a.unit.name.localeCompare(b.unit.name);
  });

  // Initialize active unit on first frame
  if (sortedUnits.length > 0 && !this.activeUnit) {
    const readyPlacement = sortedUnits[0];
    this.activeUnit = readyPlacement.unit;
    this.activeUnitPosition = readyPlacement.position;
  }

  // Write ready message once
  if (this.activeUnit && !this.readyMessageWritten) {
    const nameColor = this.activeUnit.isPlayerControlled
      ? CombatConstants.UNIT_TURN.PLAYER_NAME_COLOR
      : CombatConstants.UNIT_TURN.ENEMY_NAME_COLOR;

    const logMessage = `[color=${nameColor}]${this.activeUnit.name}[/color] is ready!`;

    // TODO: Add to combat log when available
    console.log(`[UnitTurnPhaseHandler] ${logMessage}`);

    this.readyMessageWritten = true;
  }

  // Update cursor blink timer
  this.cursorBlinkTimer += deltaTime;
  if (this.cursorBlinkTimer >= CombatConstants.UNIT_TURN.CURSOR_BLINK_RATE) {
    this.cursorBlinkTimer = 0;
    this.cursorVisible = !this.cursorVisible;
  }

  // Check victory/defeat conditions
  if (encounter.isVictory(state)) {
    return { ...state, phase: 'victory' as const };
  }
  if (encounter.isDefeat(state)) {
    return { ...state, phase: 'defeat' as const };
  }

  // Stay in unit-turn phase (waiting for action implementation)
  return state;
}
```

#### Update handleMapClick()

```typescript
handleMapClick(
  context: MouseEventContext,
  state: CombatState,
  encounter: CombatEncounter
): PhaseEventResult {
  const { tileX, tileY } = context;

  if (tileX === undefined || tileY === undefined) {
    return { handled: false };
  }

  // Check if a unit is at this position
  const unitAtPosition = state.unitManifest.getUnitAt(tileX, tileY);

  if (unitAtPosition) {
    // Set as targeted unit
    this.targetedUnit = unitAtPosition.unit;
    this.targetedUnitPosition = unitAtPosition.position;

    // Calculate movement range for this unit
    this.movementRange = MovementRangeCalculator.calculateReachableTiles({
      startPosition: this.targetedUnitPosition,
      movement: this.targetedUnit.movement,
      map: state.map,
      unitManifest: state.unitManifest,
      activeUnit: this.targetedUnit
    });

    return {
      handled: true,
      logMessage: `Selected ${unitAtPosition.unit.name}`
    };
  } else {
    // Clear target if clicking empty tile
    this.targetedUnit = null;
    this.targetedUnitPosition = null;
    this.movementRange = [];

    return {
      handled: true,
      logMessage: `Clicked tile (${tileX}, ${tileY})`
    };
  }
}
```

#### Update getInfoPanelContent()

```typescript
getInfoPanelContent(
  context: InfoPanelContext,
  state: CombatState,
  encounter: CombatEncounter
): PanelContent | null {
  // Determine which unit to display (target takes priority)
  const displayUnit = this.targetedUnit ?? this.activeUnit;

  if (!displayUnit) {
    return null;
  }

  // Create or update cached instance
  if (!this.infoPanelContent) {
    this.infoPanelContent = new UnitInfoContent(
      {
        title: 'Unit Info',
        titleColor: '#ffa500',
        padding: 1,
        lineSpacing: 8,
      },
      displayUnit
    );
  } else {
    // Update which unit is displayed
    this.infoPanelContent.updateUnit(displayUnit);
  }

  return this.infoPanelContent;
}
```

---

### 5. Refactor Deployment Phase to Set isPlayerControlled

**File:** `react-app/src/models/combat/DeploymentPhaseHandler.ts`

**Changes:**

Update `handleDeploymentAction()` method (around line 138-143):

```typescript
// Create unit and update manifest
try {
  const unit = PartyMemberRegistry.createPartyMember(selectedMember.id);
  if (!unit) {
    console.error(`Failed to create party member: ${selectedMember.id}`);
    return { handled: false };
  }

  // Set as player-controlled
  if ('setPlayerControlled' in unit && typeof unit.setPlayerControlled === 'function') {
    unit.setPlayerControlled(true);
  }

  const newManifest = new CombatUnitManifest();

  // ... rest of existing code ...
}
```

---

### 6. Verify Enemy Units Default to Not Player-Controlled

**Files to Check:**
- `react-app/src/models/combat/CombatEncounter.ts` (createEnemyUnits method)
- Enemy creation should use default `isPlayerControlled = false`

**No changes needed** if enemies are created via `MonsterUnit` constructor with defaults.

---

## Testing Plan

### Manual Testing Checklist

#### Basic Cursor Display
- [ ] Active player unit has dark green cursor
- [ ] Cursor blinks (toggles visibility every 0.5 seconds)
- [ ] Enemy active unit has no cursor (for now - AI stub)
- [ ] Cursor renders ABOVE units (visible on top)

#### Ready Messages
- [ ] Player unit ready message has green name
- [ ] Enemy unit ready message has red name (when implemented)
- [ ] Message format: "{NAME} is ready!"

#### Unit Selection
- [ ] Clicking any unit selects it as target
- [ ] Red cursor appears on targeted unit
- [ ] Red cursor does not blink (always visible)
- [ ] Unit Info panel updates to show target stats
- [ ] Clicking empty tile clears target

#### Movement Range Display
- [ ] Yellow highlights appear when unit selected
- [ ] Highlights have 33% transparency
- [ ] Movement range respects unit's movement stat
- [ ] Range excludes unit's current tile
- [ ] Range only includes orthogonally reachable tiles (no diagonals)

#### Movement Pathfinding
- [ ] Range respects walkable terrain (stops at walls)
- [ ] Can path through friendly units
- [ ] Cannot end movement on friendly units
- [ ] Cannot path through enemy units
- [ ] Cannot end movement on enemy units

#### Edge Cases
- [ ] Multiple units with same name work correctly
- [ ] Unit with 0 movement shows no range
- [ ] Unit surrounded by walls shows no range
- [ ] Unit surrounded by enemies shows no range
- [ ] Switching targets updates movement range correctly

#### Serialization
- [ ] Save combat with player-controlled units
- [ ] Load combat preserves isPlayerControlled flags
- [ ] Player units still have cursors after load
- [ ] Enemy units still behave correctly after load

---

## Implementation Order

1. **CombatUnit changes** (interface + implementations)
   - Foundation for everything else
   - Affects multiple files
   - Test serialization immediately

2. **CombatConstants updates**
   - Define all configuration values
   - Reference point for rest of implementation

3. **MovementRangeCalculator utility**
   - Independent, can be tested in isolation
   - No dependencies on other changes

4. **Deployment phase refactor**
   - Sets isPlayerControlled flag on unit creation
   - Required for ready message colors to work

5. **UnitTurnPhaseHandler implementation**
   - Main feature implementation
   - Brings all pieces together

6. **Integration testing**
   - Full combat flow from deployment to unit turn
   - Test all edge cases and interactions

---

## Notes & Decisions

### Cursor Rendering
- **Decision:** Cursors render in `renderUI()` to appear ABOVE units
- **Rationale:** User feedback - cursors should be clearly visible over unit sprites
- **Implementation:** Active cursor in `renderUI()`, movement range in `render()` (under units)

### Movement Through Units
- **Decision:** Can path through friendly units, cannot end on ANY occupied tile
- **Rationale:** Prevents unit stacking while allowing tactical positioning
- **Implementation:** Flood-fill continues through friendlies but doesn't add them to reachable tiles

### Target Selection Behavior
- **Decision:** Clicking any unit (friendly or enemy) shows their movement range
- **Rationale:** Useful for tactical planning - see where enemies can move
- **Future:** May restrict to active unit only when implementing actual movement

### Info Panel Display
- **Decision:** Targeted unit takes priority over active unit in info panel
- **Rationale:** User is interested in the unit they just clicked
- **Implementation:** `displayUnit = targetedUnit ?? activeUnit`

### Performance
- **Maps are small:** 32x18 tiles maximum
- **Flood-fill complexity:** O(tiles × movement range) - negligible for this size
- **No caching needed:** Calculate on each click is fast enough

---

## Future Enhancements (Not in Scope)

- AI turn logic (automatic actions for non-player units)
- Actual movement (click tile in range to move)
- Action menu (Attack, Ability, Item, Wait, End Turn)
- Range indicators for attacks/abilities
- Path highlighting (show exact path when hovering destination)
- Movement animation
- Action timer reset after turn completion
- Status effect processing during turn

---

## Dependencies

### Existing Systems
- `CombatUnit` interface and implementations
- `CombatMap` with walkability data
- `CombatUnitManifest` for unit tracking
- `SpriteRenderer` for cursor/highlight rendering
- `UnitInfoContent` for stat display
- Combat log system for ready messages

### New Utilities
- `MovementRangeCalculator` (flood-fill pathfinding)

### Constants
- `CombatConstants.UNIT_TURN` section

---

## Success Criteria

✅ Player unit gets blinking green cursor when their turn starts
✅ Ready message displays with correctly colored unit name
✅ Clicking units selects them and shows movement range
✅ Movement range respects terrain and unit blocking rules
✅ Target cursor (red) appears on selected units
✅ Unit Info panel updates when target changes
✅ System works with multiple units of the same name
✅ `isPlayerControlled` flag persists through save/load

---

**End of Implementation Plan**
