# FirstPersonView System Hierarchy

**Version:** 1.1
**Last Updated:** Sat, Nov 01, 2025 (GameView integration: state callbacks, initialState loading, combat triggering)
**Related:** [FirstPersonViewOverview.md](GDD/FirstPersonView/FirstPersonViewOverview.md), [FirstPersonViewImplementationPlan.md](GDD/FirstPersonView/FirstPersonViewImplementationPlan.md), [AreaMapHierarchy.md](AreaMapHierarchy.md), [GeneralGuidelines.md](GeneralGuidelines.md), [GDD/GameView/GameViewFeatureOverview.md](GDD/GameView/GameViewFeatureOverview.md)

## Purpose

Token-efficient reference for AI agents to understand the FirstPersonView system. Grid-based first-person dungeon exploration with 3D rendering, using 5-panel UI layout (same structure as combat). WASD movement, QE rotation, Space interact.

## How AI Agents Should Use This Document

**⚠️ IMPORTANT: Do NOT read this entire file upfront.**

This document is a **reference**, not a preamble. Reading it completely wastes tokens.

### Recommended Usage Pattern:

#### 1. **Start with Quick Reference** (below)
Read ONLY the Quick Reference section first.

#### 2. **Read Targeted Sections**
Use Navigation Index to find specific sections:
- 3D rendering → Read `#### ThreeJSViewport.tsx` only
- Movement → Read `#### FirstPersonInputHandler.ts` only
- Minimap → Read `#### MinimapRenderer.ts` only

#### 3. **Use Search (Ctrl+F)**
Search for file names or keywords (e.g., "camera", "texture", "fog")

#### 4. **Read Data Flow ONLY if confused**
If unclear how pieces connect, read `## Data Flow Summary`

### What NOT to Do:
- ❌ Don't read all sections before starting work
- ❌ Don't include entire file in every conversation
- ❌ Don't read sections unrelated to current task

### Token Budget Guidance:
- **Quick lookup**: Quick Reference only (~100 tokens)
- **Single file work**: Quick Reference + 1 section (~1,500 tokens)
- **Feature work**: Quick Reference + 2-3 sections (~3,000 tokens)
- **Only as last resort**: Read entire file (~12,000 tokens)

---

## Navigation Index

### By Task Type:
- **3D rendering** → `#### ThreeJSViewport.tsx`, `#### Cell.tsx`
- **Camera animation** → `####AnimatedPerspectiveCamera.tsx`
- **Movement** → `#### FirstPersonInputHandler.ts`, `#### MovementValidator.ts`
- **Input handling** → `#### FirstPersonInputHandler.ts`
- **Event processing** → `#### EventProcessor.ts` (see AreaMapHierarchy.md)
- **Minimap** → `#### MinimapRenderer.ts`
- **Player stats** → `#### PartyMemberStatsPanel.ts`
- **Texture loading** → `#### SpriteSheetLoader.ts`, `#### tileTextureConfig.ts`
- **Layout** → `#### FirstPersonLayoutManager.ts`

### By Component Type:
- **Main Component** → `#### FirstPersonView.tsx`
- **3D Components** → `### 2. 3D Rendering Components`
- **Models** → `### 3. Models`
- **Services** → `### 4. Services`
- **Utilities** → `### 5. Utilities`

---

## Quick Reference: Common Tasks

- **Load first-person view** → `<FirstPersonView mapId="dungeon-room-1" />`, loads AreaMap from registry
- **Process input** → `FirstPersonInputHandler.processKeyDown()`, returns InputCommand
- **Validate movement** → `validateMovement(map, x, y, dir)`, returns discriminated union with door auto-continue
- **Process events** → `eventProcessor.processMovement(state, map, oldX, oldY, newX, newY)`, returns new GameState
- **Render minimap** → `MinimapRenderer.render(ctx, map, x, y, dir, exploredTiles, ...)`, fog of war
- **Render stats** → `PartyMemberStatsPanel.render(ctx, unit, ...)`, HP/MP bars
- **Load 3D textures** → `SpriteSheetLoader.load()`, caches THREE.Texture instances
- **Map tile to texture** → `getTileTextureMapping(tileType)`, returns 6 sprite coordinates
- **Calculate camera** → `useMemo(() => ({ position: [...], rotation: [...] }))`, based on player position/direction

---

## Directory Structure

```
react-app/src/
├── components/
│   ├── firstperson/           # Main FP components (2 files)
│   ├── Cell.tsx               # 3D tile component
│   ├── AnimatedPerspectiveCamera.tsx
│   └── CameraLights.tsx
├── models/firstperson/        # FP models (4 files)
├── services/                  # Input handler (1 file)
└── utils/                     # Texture loader, config (2 files)
```

---

## File Hierarchy by Category

### 1. Main Component

Located in: `react-app/src/components/firstperson/`

#### `FirstPersonView.tsx`
**Purpose:** Main container for first-person exploration mode
**Lines:** 700+ lines (updated with event system and GameView integration)
**Props:**
```typescript
{
  mapId: string;
  onStartCombat?: (encounterId: string) => void;
  onExplorationStateChange?: (state: ExplorationState) => void;
  resourceManager?: ResourceManager;
  initialState?: ExplorationState;
  partyState?: PartyState;
  gameState?: GameState;
}
```
**State:** FirstPersonState, GameState (for events), spritesLoaded, windowSize, canvasDisplayStyle
**Key Features:**
- Manages overall state and input handling
- **Event System Integration:** Processes movement-based events, handles Teleport/StartEncounter actions
- **GameView Integration:** Syncs exploration state back to parent, supports loading from initialState
- Double-buffered canvas rendering (384×216 native)
- Integer scaling for pixel-perfect display
- 5-panel layout (Top, Map/3D, Combat Log, Minimap, Stats)
- Loads sprites and fonts
- Integrates ThreeJSViewport, MinimapRenderer, PartyMemberStatsPanel, EventProcessor
- WASD movement, QE rotation, Space interact, Esc exit
**Rendering Pipeline:**
1. Clear canvas
2. Render top panel (title)
3. Render 3D viewport (composited from ThreeJSViewport offscreen canvas)
4. Render combat log (CombatLogManager) - includes event messages
5. Render minimap (fog of war)
6. Render party stats (HP/MP bars)
**Input Handling:**
- W/↑: Move forward
- S/↓: Move backward
- A/←: Strafe left (or turn left if not strafing)
- D/→: Strafe right (or turn right if not strafing)
- Q: Turn left
- E: Turn right
- Space: Interact with targeted object
- Esc: Exit first-person view
**Event Processing Flow:**
1. Player moves from (oldX, oldY) to (newX, newY)
2. EventProcessor.processMovement() called with previous and current positions
3. Returns new GameState with updated variables, messages, combat state, etc.
4. handleEventStateChanges() processes side effects (map transitions, combat triggers)
5. If StartEncounter action triggered, calls onStartCombat(encounterId) callback

**GameView Integration:**
- **State Initialization:** If initialState prop provided, loads from ExplorationState (for save/load, combat returns)
- **State Synchronization:** useEffect monitors firstPersonState changes and calls onExplorationStateChange(state)
- **Combat Triggering:** Calls onStartCombat(encounterId) when StartEncounter event action fires
- **Bidirectional Communication:** Syncs position, direction, explored tiles back to GameView
- **Enables:** Persistent exploration state across view transitions, save/load system, seamless combat integration

**Dependencies:** FirstPersonState, GameState, ExplorationState, PartyState, EventProcessor, FirstPersonInputHandler, FirstPersonLayoutManager, ThreeJSViewport, MinimapRenderer, PartyMemberStatsPanel, AreaMapRegistry, MovementValidator, CombatLogManager, ResourceManager
**Used By:** App routing (/dev/test/:mapId), GameView orchestrator

---

### 2. 3D Rendering Components

Located in: `react-app/src/components/`

#### `ThreeJSViewport.tsx`
**Purpose:** 3D first-person viewport using React Three Fiber, renders to offscreen canvas
**Lines:** 252 lines
**Props:** `{ areaMap, playerX, playerY, direction, width, height, onAnimationComplete? }`
**Key Features:**
- Renders to offscreen canvas (composited by FirstPersonView)
- Loads sprite sheet textures for tiles
- Camera animation (smooth movement and rotation)
- Point light following camera (torch effect)
- Frustum culling (view distance: 8 tiles, width: 6 tiles)
- Distance fog (2-10 units)
**Camera Transform:**
```typescript
const cameraOffset = 0.3; // Slightly forward in tile
switch (direction) {
  case 'North': rotationY = 0; offsetZ = -cameraOffset; break;
  case 'South': rotationY = Math.PI; offsetZ = cameraOffset; break;
  case 'East': rotationY = -Math.PI/2; offsetX = cameraOffset; break;
  case 'West': rotationY = Math.PI/2; offsetX = -cameraOffset; break;
}
position: [worldX + offsetX, 0, worldZ + offsetZ]
rotation: [0, rotationY, 0]
```
**Dependencies:** Canvas (@react-three/fiber), Cell, AnimatedPerspectiveCamera, CameraLights, SpriteSheetLoader, tileTextureConfig, AreaMap
**Used By:** FirstPersonView

#### `Cell.tsx`
**Purpose:** Renders single 3D tile (cell) with walls, floor, ceiling
**Lines:** 146 lines
**Props:** `{ worldX, worldZ, tileType, textures? }`
**Key Features:**
- Renders 6 planes: floor, ceiling, 4 walls
- Textured rendering (sprite sheet) or colored fallback
- Polygon offset prevents z-fighting
- Shared box geometry for optimization
**Plane Layout:**
- Floor: Y = -0.5 (horizontal)
- Ceiling: Y = 0.5 (horizontal)
- Walls: Vertical planes at tile edges
**Dependencies:** THREE.js, TileTextures interface
**Used By:** ThreeJSViewport

#### `AnimatedPerspectiveCamera.tsx`
**Purpose:** Perspective camera with smooth position and rotation animation
**Lines:** 164 lines
**Props:** `{ targetPosition, targetRotation, fov?, onAnimationComplete? }`
**Ref Handle:** `{ updateTarget(), getCurrentPosition(), getCurrentRotation() }`
**Key Features:**
- Smooth interpolation (position and rotation independent)
- Angle wrapping for rotations (shortest path)
- useFrame for animation updates
- Triggers callback on completion
**Animation:**
- Position: Linear interpolation (lerp)
- Rotation: Spherical interpolation (slerp) with quaternions
- Independent durations for movement and rotation
**Dependencies:** THREE.js, @react-three/fiber
**Used By:** ThreeJSViewport

#### `CameraLights.tsx`
**Purpose:** Point light following camera (torch effect)
**Lines:** 53 lines
**Props:** `{ lightIntensity?, lightDistance?, lightYOffset?, lightDecay?, lightColor? }`
**Defaults:**
- Intensity: 2.0
- Distance: 4 tiles
- Color: '#ffddaa' (warm torch)
- Decay: 2 (inverse square)
**Dependencies:** THREE.js, @react-three/fiber
**Used By:** ThreeJSViewport

---

### 3. Models

Located in: `react-app/src/models/firstperson/`

#### `FirstPersonState.ts`
**Purpose:** Interface for complete first-person navigation state
**Exports:** `FirstPersonState`
**Key Properties:**
- playerX, playerY: number (grid position)
- direction: CardinalDirection (facing)
- map: AreaMap (current area)
- exploredTiles: Set<string> (fog of war, format: "x,y")
- partyMember: CombatUnit (HP/MP/equipment)
- targetedObject: InteractiveObject | null
**Related Types (from GameState.ts):**
- ExplorationState: Serializable subset for GameView save/load (position, direction, mapId, exploredTiles, targetedObject)
- PartyState: Party members, inventory, equipment (from GameState.ts)
**Dependencies:** AreaMap, CardinalDirection, CombatUnit, InteractiveObject
**Used By:** FirstPersonView, all FP components, GameView (via ExplorationState conversion)

#### `FirstPersonLayoutManager.ts`
**Purpose:** Layout manager for 5-panel UI, extends CombatLayoutManager
**Lines:** 76 lines
**Exports:** `FirstPersonLayoutManager`
**Overridden Methods:**
- getMapViewport() → 3D viewport region
- getTurnOrderPanelRegion() → Minimap region (repurposed)
- getCombatLogPanelRegion() → Combat log region
**Layout Regions:**
- Top Panel: Full width, ~12-15px
- Map Panel: Center-left, ~240×150px (3D viewport)
- Combat Log: Bottom-left, ~240×40px
- Top Info Panel: Right upper, ~135×80px (minimap)
- Bottom Info Panel: Right lower, ~135×80px (stats)
**Dependencies:** CombatLayoutManager
**Used By:** FirstPersonView

#### `MinimapRenderer.ts`
**Purpose:** Renders top-down minimap with fog of war
**Lines:** 140 lines
**Exports:** `MinimapRenderer` (static class)
**Method:** `render(ctx, areaMap, playerX, playerY, direction, exploredTiles, regionX, regionY, regionWidth, regionHeight, spriteImages)`
**Algorithm:**
1. Clear region (black background)
2. Calculate tile size to fit map
3. Center map in region
4. For each tile: check if explored → render color-coded rectangle
5. Render player arrow sprite (directional, green)
**Tile Colors:**
- Wall: '#666666' (light grey)
- Door: '#ffaa00' (orange)
- Floor: '#222222' (very dark grey)
**Player Arrow:** Green (#00ff00), rotated by direction
**Dependencies:** AreaMap, CardinalDirection, SpriteRenderer
**Used By:** FirstPersonView

#### `PartyMemberStatsPanel.ts`
**Purpose:** Renders party member stats (HP/MP bars)
**Lines:** 101 lines
**Exports:** `PartyMemberStatsPanel` (static class)
**Method:** `render(ctx, partyMember, regionX, regionY, regionWidth, regionHeight, fontId, fontAtlasImage)`
**Rendering Layout:**
```
Character Name
HP: 85/100
[████████░░] (HP bar)
MP: 50/80
[██████░░░░] (MP bar)
```
**HP Bar Color:**
- > 50%: '#00ff00' (green)
- > 25%: '#ffff00' (yellow)
- ≤ 25%: '#ff0000' (red)
**MP Bar:** '#0000ff' (blue)
**Dependencies:** CombatUnit, FontAtlasRenderer
**Used By:** FirstPersonView

---

### 4. Services

Located in: `react-app/src/services/`

#### `FirstPersonInputHandler.ts`
**Purpose:** Keyboard input handling for first-person navigation
**Lines:** 131 lines
**Exports:** `FirstPersonInputHandler`, `InputCommand`
**InputCommand Const Object:** MoveForward, MoveBackward, StrafeLeft, StrafeRight, TurnLeft, TurnRight, Interact
**Key Methods:**
- processKeyDown(event): InputCommand | null
- blockInput(), unblockInput(), isInputBlocked()
**Static Helpers:**
- calculateNewDirection(current, turn): CardinalDirection
- calculateTargetPosition(x, y, dir, forward): {x, y}
- calculateStrafePosition(x, y, dir, right): {x, y}
**Input Blocking:** Prevents spam during animations
**Dependencies:** CardinalDirection
**Used By:** FirstPersonView

---

### 5. Utilities

Located in: `react-app/src/utils/`

#### `MovementValidator.ts`
**Purpose:** Validates movement using AreaMap tile properties (same as AreaMap system)
**Lines:** 165 lines
**Exports:** `validateMovement()`, `MovementResult`, `getDirectionOffset()`, `rotateLeft()`, `rotateRight()`
**See AreaMapHierarchy.md for full details**
**Door Auto-Continuation:** Key feature - player moves TWO tiles (through door + next)
**Dependencies:** AreaMap, CardinalDirection, InteractiveObject
**Used By:** FirstPersonView

#### `SpriteSheetLoader.ts`
**Purpose:** Loads and manages sprite sheet textures for 3D rendering
**Lines:** 162 lines
**Exports:** `SpriteSheetLoader`
**Constructor:** `(spritesheetPath, spriteWidth, spriteHeight)`
**Key Methods:**
- async load(): Promise<void>
- getTexture(spriteX, spriteY): THREE.Texture | undefined
- getTileTextures(mapping): TileTextures | undefined
- dispose()
**Key Features:**
- Uses NearestFilter for pixel art (no blurring)
- Caches textures by grid coordinates
- Disposes resources on cleanup
**Types:**
```typescript
interface SpriteCoordinates { x: number; y: number; }
interface TileTextureMapping { floor?, ceiling?, wallFront?, wallBack?, wallLeft?, wallRight?: SpriteCoordinates }
interface TileTextures { floor?, ceiling?, wallFront?, wallBack?, wallLeft?, wallRight?: THREE.Texture }
```
**Dependencies:** THREE.js
**Used By:** ThreeJSViewport

#### `tileTextureConfig.ts`
**Purpose:** Texture mapping configuration for tile types
**Lines:** 69 lines
**Exports:** `getTileTextureMapping(tileType): TileTextureMapping`
**Mappings:**
- Wall '#': All 6 faces use sprite coords
- Floor '.': Floor and ceiling only
- Door '+': Floor and ceiling only (open passage)
**Extensible:** Easy to add new tile types (water, grass, lava, etc.)
**Dependencies:** SpriteCoordinates, TileTextureMapping
**Used By:** ThreeJSViewport

---

## Data Flow Summary

```
AreaMap System (YAML → AreaMapRegistry)
    ↓
FirstPersonView.tsx (main container)
    ↓
┌─────────────────────────────────────────────────────────┐
│ Input: FirstPersonInputHandler → InputCommand          │
│ Movement: MovementValidator → MovementResult            │
│ State: FirstPersonState (position, direction, explored) │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Layout: FirstPersonLayoutManager → 5 panel regions      │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ 3D Rendering:                                           │
│ - ThreeJSViewport → Offscreen Canvas                    │
│   - SpriteSheetLoader → Texture caching                 │
│   - tileTextureConfig → Tile mappings                   │
│   - Cell × N → Individual tiles                         │
│   - AnimatedPerspectiveCamera → Smooth movement         │
│   - CameraLights → Torch effect                         │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ 2D Rendering:                                           │
│ - MinimapRenderer → Fog of war                          │
│ - PartyMemberStatsPanel → HP/MP bars                    │
│ - CombatLogManager → Messages                           │
└─────────────────────────────────────────────────────────┘
    ↓
Canvas Compositing (3D offscreen → 2D main canvas)
```

---

## Key Interfaces Summary

```typescript
// Input Commands (const object pattern)
const InputCommand = {
  MoveForward: 'move-forward',
  MoveBackward: 'move-backward',
  StrafeLeft: 'strafe-left',
  StrafeRight: 'strafe-right',
  TurnLeft: 'turn-left',
  TurnRight: 'turn-right',
  Interact: 'interact',
} as const;

// First-Person State
interface FirstPersonState {
  playerX: number;
  playerY: number;
  direction: CardinalDirection;
  map: AreaMap;
  exploredTiles: Set<string>; // "x,y" format
  partyMember: CombatUnit;
  targetedObject: InteractiveObject | null;
}

// Movement Result (discriminated union, see AreaMapHierarchy.md)
type MovementResult =
  | { success: true; finalX: number; finalY: number; passThroughDoor: boolean; ... }
  | { success: false; reason: string; interactiveObject?: InteractiveObject; };

// Texture Types
interface TileTextures {
  floor?: THREE.Texture;
  ceiling?: THREE.Texture;
  wallFront?: THREE.Texture;
  wallBack?: THREE.Texture;
  wallLeft?: THREE.Texture;
  wallRight?: THREE.Texture;
}
```

---

## Usage Examples

### Loading FirstPersonView
```typescript
import { FirstPersonView } from '@/components/firstperson/FirstPersonView';

// In route component
<FirstPersonView mapId="dungeon-room-1" />
```

### Processing Movement
```typescript
const inputHandler = useMemo(() => new FirstPersonInputHandler(), []);

const handleKeyDown = (event: KeyboardEvent) => {
  const command = inputHandler.processKeyDown(event);
  if (!command) return;

  if (command === InputCommand.MoveForward) {
    const result = validateMovement(map, playerX, playerY, direction);

    if (result.success) {
      inputHandler.blockInput(); // Block during animation
      setFirstPersonState(prev => ({
        ...prev!,
        playerX: result.finalX,
        playerY: result.finalY,
        exploredTiles: new Set([...prev!.exploredTiles, `${result.finalX},${result.finalY}`])
      }));

      if (result.passThroughDoor) {
        combatLogManager.addMessage('You pass through the doorway.');
      }
    } else {
      combatLogManager.addMessage(result.reason);
    }
  }
};

// Unblock after animation
setTimeout(() => inputHandler.unblockInput(), 200);
```

### Loading 3D Textures
```typescript
import { SpriteSheetLoader } from '@/utils/SpriteSheetLoader';
import { getTileTextureMapping } from '@/utils/tileTextureConfig';

const loader = new SpriteSheetLoader('/tiles/world-tiles.png', 12, 12);
await loader.load();

const wallMapping = getTileTextureMapping('#');
const wallTextures = loader.getTileTextures(wallMapping);

<Cell worldX={5} worldZ={3} tileType="#" textures={wallTextures} />

// Cleanup
useEffect(() => () => loader.dispose(), []);
```

---

## Guidelines Compliance

### ✅ Const Object Pattern (Not Enums)
```typescript
export const InputCommand = { MoveForward: 'move-forward', ... } as const;
export type InputCommand = typeof InputCommand[keyof typeof InputCommand];
```

### ✅ Discriminated Union Results
```typescript
type MovementResult =
  | { success: true; finalX: number; ... }
  | { success: false; reason: string; ... };
```

### ✅ Immutable State Updates
```typescript
setFirstPersonState(prev => ({
  ...prev!,
  playerX: newX,
  exploredTiles: new Set([...prev!.exploredTiles, `${newX},${newY}`])
}));
```

### ✅ Canvas Rendering Best Practices
- Disable image smoothing: `ctx.imageSmoothingEnabled = false`
- Double buffering: Offscreen 3D canvas → main 2D canvas
- Integer scaling: Pixel-perfect display
- Round coordinates: Prevent sub-pixel rendering

### ✅ React Three Fiber Integration
- Offscreen canvas for 3D viewport
- Texture caching (NearestFilter for pixel art)
- Compositing onto main 2D canvas

### ✅ Input Blocking Pattern
- Block during animations
- Unblock on completion
- Prevents spam and state corruption

---

## Performance Optimization

### 3D Rendering:
- **Frustum culling**: Only render visible cells (8 tile distance, 6 tile width)
- **Texture reuse**: Single sprite sheet, shared THREE.Texture instances
- **Mesh instancing**: Shared box geometry
- **Low poly**: Simple planes only
- **No anti-aliasing**: Pixel-art aesthetic

### Canvas Rendering:
- **Double buffering**: Offscreen 3D → display canvas
- **Integer scaling**: Calculate once, cache
- **Disable smoothing**: Prevent interpolation
- **Round coords**: Prevent sub-pixel

### State Management:
- **Immutable updates**: React patterns
- **Memoization**: useMemo for expensive calculations (visible cells, camera transform)
- **Refs for animation**: Avoid re-renders
- **Input blocking**: Prevent spam

---

## Integration Points

### FirstPersonView ↔ AreaMap System
1. Map loading: `AreaMapRegistry.getById(mapId)`
2. Spawn point: `areaMap.playerSpawn`
3. Movement validation: `areaMap.isPassable()`, `areaMap.isWalkable()`, `areaMap.isDoorTile()`
4. Tile lookup: `areaMap.getTile(x, y)`
5. Interactive objects: `areaMap.getInteractiveObjectAt(x, y)`

### FirstPersonView ↔ Combat System
1. Party members: `CombatUnit` from PartyMemberRegistry
2. HP/MP display: `currentHealth`, `getMaxHealth()`, etc.
3. Combat log: Reuses `CombatLogManager`
4. Layout: Extends `CombatLayoutManager` (5-panel structure)
5. Encounter triggers: Will transition to CombatView (future)

### ThreeJSViewport ↔ Sprite System
1. Sprite sheet: `SpriteSheetLoader` loads tile textures
2. Texture mapping: `tileTextureConfig` maps types to coords
3. Texture caching: Caches by coordinates
4. Disposal: Cleans up on unmount

---

## Test Coverage

Located in: `react-app/src/utils/__tests__/`

**MovementValidator.test.ts:** Normal movement, wall blocking, out of bounds, door auto-continuation, door edge cases, rotation helpers

(See AreaMapHierarchy.md for AreaMap system tests)

---

## Success Criteria

✅ `/dev/test/:mapId` route loads first-person view
✅ 3D viewport renders in Map Panel region
✅ WASD movement with collision detection
✅ QE rotation with smooth camera animation
✅ Minimap shows explored tiles (fog of war)
✅ Party stats panel displays HP/MP from CombatUnit
✅ Combat log shows movement messages
✅ Input blocked during animations
✅ Door auto-continuation works (two-tile movement)
✅ All GeneralGuidelines.md patterns followed

---

**End of FirstPersonView System Hierarchy**

For detailed implementation, see:
- [FirstPersonViewOverview.md](GDD/FirstPersonView/FirstPersonViewOverview.md)
- [FirstPersonViewImplementationPlan.md](GDD/FirstPersonView/FirstPersonViewImplementationPlan.md)
- [AreaMapHierarchy.md](AreaMapHierarchy.md) (for AreaMap integration)
