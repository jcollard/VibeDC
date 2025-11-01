# FirstPersonView System - Complete File Hierarchy

**Last Updated:** 2025-11-01
**Related Documentation:** [FirstPersonViewOverview.md](GDD/FirstPersonView/FirstPersonViewOverview.md), [FirstPersonViewImplementationPlan.md](GDD/FirstPersonView/FirstPersonViewImplementationPlan.md), [AreaMapHierarchy.md](AreaMapHierarchy.md)

## Table of Contents

- [System Overview](#system-overview)
- [Component Files](#component-files)
- [Model Files](#model-files)
- [Service Files](#service-files)
- [Utility Files](#utility-files)
- [Data Files](#data-files)
- [Test Files](#test-files)
- [Documentation Files](#documentation-files)
- [File Dependencies](#file-dependencies)
- [Key Interfaces and Types](#key-interfaces-and-types)
- [Method Reference](#method-reference)

---

## System Overview

The FirstPersonView System provides grid-based first-person dungeon exploration with 3D rendering, using the same 5-panel UI layout structure as the combat system. Players navigate dungeons using WASD/arrow keys, interact with objects, and trigger combat encounters.

**Architecture:**
```
FirstPersonView (main container)
├── Canvas Rendering (384×216, double buffered)
├── FirstPersonLayoutManager (5-panel layout: Top Panel, Map Panel, Combat Log, Info Panels)
├── ThreeJSViewport (3D first-person viewport in Map Panel)
├── MinimapRenderer (top-down view in Top Info Panel)
├── PartyMemberStatsPanel (HP/MP in Bottom Info Panel)
└── Input & Movement Systems (WASD navigation, collision detection)
```

**Total Files:** 35+ (4 main components, 6 model files, 2 services, 6 utilities, 9+ area map models, 4 tests, 8 docs)

---

## Component Files

Located in: `react-app/src/components/`

### `FirstPersonView.tsx` (Main Container)

**Path:** `react-app/src/components/firstperson/FirstPersonView.tsx`

**Purpose:** Main container component for first-person exploration mode.

**Lines:** 610 lines

**Key Features:**
- Manages overall first-person state and input handling
- Renders canvas with 2D UI panels and coordinates 3D viewport
- Handles player movement (forward/backward/strafe/turn)
- Integrates minimap, stats panel, and combat log
- Loads sprites and fonts for rendering
- Double-buffered canvas rendering
- Integer scaling for pixel-perfect display

**Props:**
```typescript
interface FirstPersonViewProps {
  mapId: string; // AreaMap ID to load from registry
}
```

**State:**
```typescript
const [firstPersonState, setFirstPersonState] = useState<FirstPersonState | null>()
const [spritesLoaded, setSpritesLoaded] = useState(false)
const [windowSize, setWindowSize] = useState({ width, height })
const [canvasDisplayStyle, setCanvasDisplayStyle] = useState({ width, height })
```

**Key Dependencies:**
- `FirstPersonState` - Navigation state interface
- `FirstPersonInputHandler` - Keyboard input processing
- `FirstPersonLayoutManager` - 5-panel layout manager
- `ThreeJSViewport` - 3D viewport component
- `MinimapRenderer` - Minimap rendering
- `PartyMemberStatsPanel` - Stats panel rendering
- `AreaMapRegistry` - Map data lookup
- `MovementValidator` - Movement validation
- `CombatLogManager` - Combat log messages

**Key Methods:**

#### State Management
- `useState<FirstPersonState>()` - Initializes state with player spawn from AreaMap
- `setFirstPersonState()` - Updates player position, direction, explored tiles

#### Input Handling
- `handleKeyDown(event: KeyboardEvent)` - Process WASD/QE/Space input
- `handleMovement()` - Validate and execute movement commands
- `handleRotation()` - Update player facing direction
- `handleInteract()` - Interact with targeted object

#### Rendering
- `renderFrame()` - Main render loop (60 FPS)
- `renderOffscreenCanvas()` - 3D viewport offscreen rendering
- `compositeViewport()` - Composite 3D canvas onto main canvas
- Renders: Top panel, Map panel (3D), Combat log, Minimap, Stats panel

#### Asset Loading
- `loadAssets()` - Load sprites and fonts
- `updateCanvasStyle()` - Calculate integer scaling dimensions

**Usage:**
```typescript
import { FirstPersonView } from '@/components/firstperson/FirstPersonView';

// Load specific area map
<FirstPersonView mapId="dungeon-room-1" />
```

---

### `ThreeJSViewport.tsx` (3D Rendering)

**Path:** `react-app/src/components/firstperson/ThreeJSViewport.tsx`

**Purpose:** 3D first-person viewport using React Three Fiber, rendered to offscreen canvas.

**Lines:** 252 lines

**Key Features:**
- Renders to offscreen canvas (composited onto main canvas by FirstPersonView)
- Loads sprite sheet textures for tile rendering
- Manages camera position and rotation animation
- Handles lighting (point light following camera)
- Culls non-visible tiles (view distance: 8 tiles, width: 6 tiles)
- Distance fog effect (2-10 units)

**Props:**
```typescript
interface ThreeJSViewportProps {
  areaMap: AreaMap;
  playerX: number;
  playerY: number;
  direction: CardinalDirection;
  width: number;  // Offscreen canvas width
  height: number; // Offscreen canvas height
  onAnimationComplete?: () => void;
}
```

**Key Components Used:**
- `<Canvas>` - React Three Fiber canvas
- `<AnimatedPerspectiveCamera>` - Smooth camera movement
- `<CameraLights>` - Point light following camera
- `<Cell>` - Individual 3D tile
- `<fog>` - Distance fog effect

**Rendering Pipeline:**
1. Load sprite sheet textures (SpriteSheetLoader)
2. Calculate visible cells based on player position
3. For each visible cell:
   - Get tile from AreaMap
   - Map tile to texture coordinates (tileTextureConfig)
   - Render Cell component with textures
4. Apply fog and lighting
5. Render to offscreen canvas
6. FirstPersonView composites onto main canvas

**Camera Transform Calculation:**
```typescript
const cameraTransform = useMemo(() => {
  const cameraOffset = 0.3; // Slightly forward in tile
  let worldX = playerX;
  let worldZ = playerY;
  let rotationY = 0;

  // Calculate rotation and offset based on direction
  switch (direction) {
    case 'North': rotationY = 0; offsetZ = -cameraOffset; break;
    case 'South': rotationY = Math.PI; offsetZ = cameraOffset; break;
    case 'East': rotationY = -Math.PI / 2; offsetX = cameraOffset; break;
    case 'West': rotationY = Math.PI / 2; offsetX = -cameraOffset; break;
  }

  return {
    position: [worldX + offsetX, 0, worldZ + offsetZ],
    rotation: [0, rotationY, 0]
  };
}, [playerX, playerY, direction]);
```

**Visible Cells Calculation:**
```typescript
const visibleCells = useMemo(() => {
  const cells = [];
  const viewDistance = 8;
  const viewWidth = 6;

  for (let gridY = playerY - viewDistance; gridY <= playerY + viewDistance; gridY++) {
    for (let gridX = playerX - viewWidth; gridX <= playerX + viewWidth; gridX++) {
      const tile = areaMap.getTile(gridX, gridY);
      const tileType = tile ? mapTileBehaviorToChar(tile.behavior) : '#';
      cells.push({ worldX: gridX, worldZ: gridY, tileType });
    }
  }

  return cells;
}, [playerX, playerY, areaMap]);
```

---

### `Cell.tsx` (3D Tile)

**Path:** `react-app/src/components/Cell.tsx`

**Purpose:** Renders a single 3D tile (cell) in the grid with walls, floor, and ceiling.

**Lines:** 146 lines

**Key Features:**
- Renders 6 planes: floor, ceiling, wallFront, wallBack, wallLeft, wallRight
- Supports textured rendering (from sprite sheet) or colored fallback
- Uses polygon offset to prevent z-fighting
- Optimized with shared box geometry

**Props:**
```typescript
interface CellProps {
  worldX: number;         // Grid X coordinate
  worldZ: number;         // Grid Z coordinate (grid Y)
  tileType: string;       // Tile character ('#', '.', 'D', etc.)
  textures?: TileTextures; // Optional textures from sprite sheet
}
```

**Tile Textures:**
```typescript
interface TileTextures {
  floor?: THREE.Texture;
  ceiling?: THREE.Texture;
  wallFront?: THREE.Texture;
  wallBack?: THREE.Texture;
  wallLeft?: THREE.Texture;
  wallRight?: THREE.Texture;
}
```

**Rendering:**
- **Floor**: Horizontal plane at Y = -0.5
- **Ceiling**: Horizontal plane at Y = 0.5
- **Walls**: Vertical planes at tile edges (if neighbor is wall or out of bounds)

**Z-Fighting Prevention:**
```typescript
// Floor slightly lower
<mesh position={[worldX, -0.5, worldZ]} rotation={[-Math.PI / 2, 0, 0]}>
  <planeGeometry args={[1, 1]} />
  <meshStandardMaterial
    map={textures?.floor}
    polygonOffset
    polygonOffsetFactor={1}
  />
</mesh>
```

---

### `AnimatedPerspectiveCamera.tsx`

**Path:** `react-app/src/components/AnimatedPerspectiveCamera.tsx`

**Purpose:** Perspective camera with smooth position and rotation animation.

**Lines:** 164 lines

**Key Features:**
- Smoothly interpolates position and rotation independently
- Handles angle wrapping for rotations (shortest path)
- Exposes methods via ref: `updateTarget`, `getCurrentPosition`, `getCurrentRotation`
- Uses `useFrame` for animation updates
- Triggers callback on animation complete

**Props:**
```typescript
interface AnimatedPerspectiveCameraProps {
  targetPosition: [number, number, number];
  targetRotation: [number, number, number];
  fov?: number;
  onAnimationComplete?: () => void;
}
```

**Ref Handle:**
```typescript
export interface CameraAnimationHandle {
  updateTarget: (
    newPosition: [number, number, number],
    newRotation: [number, number, number],
    movementDuration?: number,
    rotationDuration?: number
  ) => void;
  getCurrentPosition: () => [number, number, number];
  getCurrentRotation: () => [number, number, number];
}
```

**Animation Algorithm:**
```typescript
// In useFrame hook
const elapsedTime = clock.getElapsedTime();

// Lerp position
const positionT = Math.min((elapsedTime - positionStartTime) / movementDuration, 1);
camera.position.lerpVectors(positionStart, positionTarget, positionT);

// Slerp rotation with angle wrapping
const rotationT = Math.min((elapsedTime - rotationStartTime) / rotationDuration, 1);
const rotationCurrent = new THREE.Euler().setFromQuaternion(
  new THREE.Quaternion().slerpQuaternions(rotationStartQuat, rotationTargetQuat, rotationT)
);
camera.rotation.copy(rotationCurrent);

// Check if animation complete
if (positionT >= 1 && rotationT >= 1) {
  onAnimationComplete?.();
}
```

**Usage:**
```typescript
const cameraRef = useRef<CameraAnimationHandle>(null);

// Update camera target
useEffect(() => {
  cameraRef.current?.updateTarget(
    [playerX, 0, playerY],
    [0, rotationY, 0],
    0.2, // movement duration
    0.1  // rotation duration
  );
}, [playerX, playerY, rotationY]);

<AnimatedPerspectiveCamera
  ref={cameraRef}
  targetPosition={[0, 0, 0]}
  targetRotation={[0, 0, 0]}
  fov={75}
  onAnimationComplete={() => console.log('Animation done')}
/>
```

---

### `CameraLights.tsx`

**Path:** `react-app/src/components/CameraLights.tsx`

**Purpose:** Point light that follows camera position (torch effect).

**Lines:** 53 lines

**Key Features:**
- Point light attached to camera position
- Configurable intensity, distance, decay, color, Y offset
- Creates warm torch lighting effect

**Props:**
```typescript
interface CameraLightsProps {
  lightIntensity?: number;  // Default: 2.0
  lightDistance?: number;   // Default: 4 tiles
  lightYOffset?: number;    // Default: 0 (at camera height)
  lightDecay?: number;      // Default: 2 (inverse square)
  lightColor?: string;      // Default: '#ffddaa' (warm torch)
}
```

**Implementation:**
```typescript
export const CameraLights: React.FC<CameraLightsProps> = ({
  lightIntensity = 2.0,
  lightDistance = 4,
  lightYOffset = 0,
  lightDecay = 2,
  lightColor = '#ffddaa'
}) => {
  const { camera } = useThree();

  return (
    <group>
      <pointLight
        position={[camera.position.x, camera.position.y + lightYOffset, camera.position.z]}
        intensity={lightIntensity}
        distance={lightDistance}
        decay={lightDecay}
        color={lightColor}
      />
    </group>
  );
};
```

---

### `FirstPersonView.tsx` (Legacy)

**Path:** `react-app/src/components/FirstPersonView.tsx`

**Purpose:** Original simpler first-person implementation (reference only).

**Lines:** 216 lines

**Note:** This is an older implementation that uses a simple grid string array instead of the AreaMap system. It's kept for reference and used in DebugPanel for quick testing. The main implementation is `components/firstperson/FirstPersonView.tsx`.

---

## Model Files

Located in: `react-app/src/models/firstperson/`

### `FirstPersonState.ts`

**Path:** `react-app/src/models/firstperson/FirstPersonState.ts`

**Purpose:** Interface defining complete first-person navigation state.

**Interface: `FirstPersonState`**

```typescript
import type { AreaMap } from '../area/AreaMap';
import type { CardinalDirection } from '../area/InteractiveObject';
import type { CombatUnit } from '../combat/CombatUnit';
import type { InteractiveObject } from '../area/InteractiveObject';

/**
 * First person navigation state
 */
export interface FirstPersonState {
  /**
   * Player position on the grid (X coordinate)
   */
  playerX: number;

  /**
   * Player position on the grid (Y coordinate)
   */
  playerY: number;

  /**
   * Player facing direction
   */
  direction: CardinalDirection;

  /**
   * Current area map being explored
   */
  map: AreaMap;

  /**
   * Set of explored tile coordinates "x,y"
   * Used for minimap fog of war
   */
  exploredTiles: Set<string>;

  /**
   * Party member representing the player
   * Contains HP, MP, equipment, etc. (from CombatUnit)
   */
  partyMember: CombatUnit;

  /**
   * Currently targeted interactive object (if any)
   */
  targetedObject: InteractiveObject | null;
}
```

**Usage:**
```typescript
import { FirstPersonState } from '@/models/firstperson/FirstPersonState';

const [state, setState] = useState<FirstPersonState>({
  playerX: areaMap.playerSpawn.x,
  playerY: areaMap.playerSpawn.y,
  direction: areaMap.playerSpawn.direction,
  map: areaMap,
  exploredTiles: new Set([`${areaMap.playerSpawn.x},${areaMap.playerSpawn.y}`]),
  partyMember: defaultPartyMember,
  targetedObject: null
});
```

---

### `FirstPersonLayoutManager.ts`

**Path:** `react-app/src/models/firstperson/layouts/FirstPersonLayoutManager.ts`

**Purpose:** Layout manager for first-person view, extends CombatLayoutManager.

**Lines:** 76 lines

**Class: `FirstPersonLayoutManager`**

Extends `CombatLayoutManager` and overrides specific regions for first-person needs:

**Overridden Methods:**
- `getMapViewport()` - Returns slightly larger viewport for 3D rendering
- `getTurnOrderPanelRegion()` - Repurposed as minimap region (Top Info Panel)
- `getCombatLogPanelRegion()` - Adjusted for first-person context

**Layout Regions:**
```typescript
// Inherited from CombatLayoutManager:
- Top Panel (full width, ~12-15px height)
- Map Panel (center-left, ~240×150px) - 3D viewport
- Combat Log (bottom-left, ~240×40px)
- Top Info Panel (right upper, ~135×80px) - Minimap
- Bottom Info Panel (right lower, ~135×80px) - Player stats

// Overrides for first-person:
getMapViewport(): { x, y, width, height }
  - Returns region for 3D viewport (offscreen canvas)

getTurnOrderPanelRegion(): { x, y, width, height }
  - Returns region for minimap (repurposed from turn order)

getCombatLogPanelRegion(): { x, y, width, height }
  - Returns region for combat log (same position, different content)
```

**Usage:**
```typescript
import { FirstPersonLayoutManager } from '@/models/firstperson/layouts/FirstPersonLayoutManager';

const layoutManager = useMemo(() => new FirstPersonLayoutManager(), []);

// Get regions
const mapViewport = layoutManager.getMapViewport();
const minimapRegion = layoutManager.getTurnOrderPanelRegion();
const statsRegion = layoutManager.getUnitInfoPanelRegion();
const logRegion = layoutManager.getCombatLogPanelRegion();
const topPanelRegion = layoutManager.getTopPanelRegion();
```

---

### `MinimapRenderer.ts`

**Path:** `react-app/src/models/firstperson/rendering/MinimapRenderer.ts`

**Purpose:** Renders top-down minimap with fog of war.

**Lines:** 140 lines

**Class: `MinimapRenderer` (static)**

**Key Features:**
- Renders explored tiles only (fog of war)
- Shows player position with directional arrow sprite
- Color-coded tiles: Walls (grey), Floors (dark), Doors (orange)
- Scales minimap to fit region
- Centers map in region

**Method: `render`**

```typescript
static render(
  ctx: CanvasRenderingContext2D,
  areaMap: AreaMap,
  playerX: number,
  playerY: number,
  direction: CardinalDirection,
  exploredTiles: Set<string>,
  regionX: number,
  regionY: number,
  regionWidth: number,
  regionHeight: number,
  spriteImages: Map<string, HTMLImageElement>
): void
```

**Algorithm:**
1. Clear region background (black)
2. Calculate tile size to fit map in region
3. Center map within region
4. For each tile in map:
   - Check if explored (skip if not - fog of war)
   - Get tile from AreaMap
   - Choose color based on tile behavior (wall/floor/door)
   - Render tile rectangle
5. Render player arrow sprite at player position
   - Arrow direction matches player facing

**Tile Colors:**
```typescript
if (!tile.walkable) {
  color = '#666666'; // Wall: light grey
} else if (tile.behavior === 'door') {
  color = '#ffaa00'; // Door: orange
} else {
  color = '#222222'; // Floor: very dark grey
}
```

**Player Arrow Rendering:**
Uses `SpriteRenderer.renderColoredSprite()` to render directional arrow:
- North: Up arrow
- South: Down arrow
- East: Right arrow
- West: Left arrow
- Color: Green (#00ff00)

**Usage:**
```typescript
import { MinimapRenderer } from '@/models/firstperson/rendering/MinimapRenderer';

// In render loop
MinimapRenderer.render(
  ctx,
  firstPersonState.map,
  firstPersonState.playerX,
  firstPersonState.playerY,
  firstPersonState.direction,
  firstPersonState.exploredTiles,
  minimapRegion.x,
  minimapRegion.y,
  minimapRegion.width,
  minimapRegion.height,
  spriteImages
);
```

---

### `PartyMemberStatsPanel.ts`

**Path:** `react-app/src/models/firstperson/rendering/PartyMemberStatsPanel.ts`

**Purpose:** Renders party member stats panel (HP/MP bars).

**Lines:** 101 lines

**Class: `PartyMemberStatsPanel` (static)**

**Key Features:**
- Shows character name
- HP bar with current/max values
- MP bar with current/max values
- Color-coded HP bar (green/yellow/red)
- Blue MP bar
- Uses FontAtlasRenderer for text

**Method: `render`**

```typescript
static render(
  ctx: CanvasRenderingContext2D,
  partyMember: CombatUnit,
  regionX: number,
  regionY: number,
  regionWidth: number,
  regionHeight: number,
  fontId: string,
  fontAtlasImage: HTMLImageElement | null
): void
```

**Rendering Layout:**
```
+---------------------------+
| Character Name            |
| HP: 85/100                |
| [████████░░] (HP bar)     |
| MP: 50/80                 |
| [██████░░░░] (MP bar)     |
+---------------------------+
```

**HP Bar Color Logic:**
```typescript
const hpPercent = currentHp / maxHp;

let barColor;
if (hpPercent > 0.5) {
  barColor = '#00ff00'; // Green (healthy)
} else if (hpPercent > 0.25) {
  barColor = '#ffff00'; // Yellow (wounded)
} else {
  barColor = '#ff0000'; // Red (critical)
}
```

**Usage:**
```typescript
import { PartyMemberStatsPanel } from '@/models/firstperson/rendering/PartyMemberStatsPanel';

// In render loop
PartyMemberStatsPanel.render(
  ctx,
  firstPersonState.partyMember,
  statsRegion.x,
  statsRegion.y,
  statsRegion.width,
  statsRegion.height,
  '7px-04b03',
  fontAtlasImage
);
```

---

## Service Files

Located in: `react-app/src/services/`

### `FirstPersonInputHandler.ts`

**Path:** `react-app/src/services/FirstPersonInputHandler.ts`

**Purpose:** Handles keyboard input for first-person navigation.

**Lines:** 131 lines

**Const Object: `InputCommand`**

```typescript
export const InputCommand = {
  MoveForward: 'move-forward',
  MoveBackward: 'move-backward',
  StrafeLeft: 'strafe-left',
  StrafeRight: 'strafe-right',
  TurnLeft: 'turn-left',
  TurnRight: 'turn-right',
  Interact: 'interact',
} as const;

export type InputCommand = typeof InputCommand[keyof typeof InputCommand];
```

**Class: `FirstPersonInputHandler`**

**Properties:**
- `private inputBlocked: boolean` - Blocks input during animations

**Methods:**

#### Input Processing
```typescript
processKeyDown(event: KeyboardEvent): InputCommand | null
// Maps keyboard keys to input commands
// W/↑ → MoveForward
// S/↓ → MoveBackward
// A/← → TurnLeft (or StrafeLeft if configured)
// D/→ → TurnRight (or StrafeRight if configured)
// Q → StrafeLeft
// E → StrafeRight
// Space → Interact
```

#### Input Blocking
```typescript
blockInput(): void
unblockInput(): void
isInputBlocked(): boolean
```

#### Static Helper Functions

```typescript
static calculateNewDirection(
  current: CardinalDirection,
  turn: 'left' | 'right'
): CardinalDirection
// Rotates direction 90° clockwise or counter-clockwise
// North → East → South → West → North (right)
// North → West → South → East → North (left)

static calculateTargetPosition(
  x: number,
  y: number,
  direction: CardinalDirection,
  moveForward: boolean
): { x: number; y: number }
// Calculates target position after moving forward/backward
// Takes into account current direction

static calculateStrafePosition(
  x: number,
  y: number,
  direction: CardinalDirection,
  strafeRight: boolean
): { x: number; y: number }
// Calculates target position after strafing left/right
// Perpendicular to current direction
```

**Usage:**
```typescript
import { FirstPersonInputHandler, InputCommand } from '@/services/FirstPersonInputHandler';

const inputHandler = useMemo(() => new FirstPersonInputHandler(), []);

const handleKeyDown = (event: KeyboardEvent) => {
  const command = inputHandler.processKeyDown(event);

  if (command === InputCommand.MoveForward) {
    const target = FirstPersonInputHandler.calculateTargetPosition(
      playerX, playerY, direction, true
    );
    // Validate and move
  } else if (command === InputCommand.TurnLeft) {
    const newDirection = FirstPersonInputHandler.calculateNewDirection(
      direction, 'left'
    );
    // Update direction
  }
};

// Block input during animations
inputHandler.blockInput();

// Unblock after animation completes
setTimeout(() => inputHandler.unblockInput(), 200);
```

---

### `MovementValidator.ts` (Service Version)

**Path:** `react-app/src/services/MovementValidator.ts`

**Purpose:** Service wrapper for movement validation logic.

**Note:** This may be a duplicate or wrapper around `utils/MovementValidator.ts`. The utils version contains the actual validation logic.

---

## Utility Files

Located in: `react-app/src/utils/`

### `MovementValidator.ts`

**Path:** `react-app/src/utils/MovementValidator.ts`

**Purpose:** Validates player movement using AreaMap tile properties.

**Lines:** 165 lines

**Type: `MovementResult` (Discriminated Union)**

```typescript
export type MovementResult =
  | {
      success: true;
      finalX: number;
      finalY: number;
      passThroughDoor: boolean;
      doorX?: number;
      doorY?: number;
    }
  | {
      success: false;
      reason: string;
      interactiveObject?: InteractiveObject;
    };
```

**Function: `validateMovement`**

```typescript
export function validateMovement(
  areaMap: AreaMap,
  currentX: number,
  currentY: number,
  direction: CardinalDirection
): MovementResult
```

**Validation Algorithm:**
1. Calculate target position using direction offset
2. Check if target is in bounds → fail if not
3. Check if target is passable → fail if not
   - If blocked by closed door → return door object
4. Check if target is door tile (auto-continue behavior):
   - Calculate next tile after door
   - Validate next tile is in bounds → fail if not
   - Validate next tile is walkable → fail if not
   - Check for adjacent door tiles → fail if detected (prevents infinite loops)
   - Return success with final position TWO tiles ahead (door + next)
5. Check if target is walkable (normal floor tile)
   - Return success with target position
6. Return failure (not walkable)

**Door Auto-Continuation:**

The key feature of the movement system is door tile auto-continuation:

```typescript
if (areaMap.isDoorTile(targetX, targetY)) {
  // Player enters door tile but doesn't stop there
  // Automatically continues to next tile in same direction
  const nextX = targetX + dx;
  const nextY = targetY + dy;

  // Validate next tile
  if (!areaMap.isInBounds(nextX, nextY)) {
    return { success: false, reason: 'Door leads out of bounds' };
  }

  if (!areaMap.isWalkable(nextX, nextY)) {
    return { success: false, reason: 'Cannot stop after passing through door' };
  }

  // Success: Move TWO tiles (through door and into next tile)
  return {
    success: true,
    finalX: nextX,
    finalY: nextY,
    passThroughDoor: true,
    doorX: targetX,
    doorY: targetY
  };
}
```

**Why Door Auto-Continuation?**

This solves the "standing in doorway" UX problem in grid-based first-person games. When a player moves into a door tile, they automatically continue through to the next tile, preventing awkward positioning in the doorway threshold.

**Helper Functions:**

```typescript
function getDirectionOffset(direction: CardinalDirection): [number, number]
// Returns [dx, dy] offset for direction
// North: [0, -1], South: [0, 1], East: [1, 0], West: [-1, 0]

export function rotateLeft(direction: CardinalDirection): CardinalDirection
// Counter-clockwise rotation

export function rotateRight(direction: CardinalDirection): CardinalDirection
// Clockwise rotation
```

**Usage:**
```typescript
import { validateMovement } from '@/utils/MovementValidator';

const result = validateMovement(areaMap, playerX, playerY, 'North');

if (result.success) {
  // Type-safe: finalX and finalY guaranteed to exist
  playerX = result.finalX;
  playerY = result.finalY;

  if (result.passThroughDoor) {
    console.log(`Passed through door at (${result.doorX}, ${result.doorY})`);
    // Play door animation
  }
} else {
  // Type-safe: reason guaranteed to exist
  console.log(`Cannot move: ${result.reason}`);

  if (result.interactiveObject) {
    // Show interaction prompt (e.g., "Press E to open door")
    console.log('Press E to interact');
  }
}
```

---

### `SpriteSheetLoader.ts`

**Path:** `react-app/src/utils/SpriteSheetLoader.ts`

**Purpose:** Loads and manages sprite sheet textures for 3D rendering.

**Lines:** 162 lines

**Class: `SpriteSheetLoader`**

**Constructor:**
```typescript
constructor(
  spritesheetPath: string,
  spriteWidth: number,
  spriteHeight: number
)
```

**Key Features:**
- Loads sprite sheet image using THREE.TextureLoader
- Uses `NearestFilter` for crisp pixel art (no blurring)
- Caches textures by grid coordinates
- Provides texture lookup by sprite coordinates
- Disposes resources on cleanup

**Methods:**

```typescript
async load(): Promise<void>
// Loads sprite sheet image asynchronously

getTexture(spriteX: number, spriteY: number): THREE.Texture | undefined
// Gets texture for specific sprite coordinates (with caching)

getTileTextures(mapping: TileTextureMapping): TileTextures | undefined
// Gets all 6 textures for a tile (floor, ceiling, 4 walls)

clearCache(): void
// Clears texture cache

dispose(): void
// Disposes all textures and clears cache
```

**Types:**

```typescript
export interface SpriteCoordinates {
  x: number; // Sprite X in grid
  y: number; // Sprite Y in grid
}

export interface TileTextureMapping {
  floor?: SpriteCoordinates;
  ceiling?: SpriteCoordinates;
  wallFront?: SpriteCoordinates;
  wallBack?: SpriteCoordinates;
  wallLeft?: SpriteCoordinates;
  wallRight?: SpriteCoordinates;
}

export interface TileTextures {
  floor?: THREE.Texture;
  ceiling?: THREE.Texture;
  wallFront?: THREE.Texture;
  wallBack?: THREE.Texture;
  wallLeft?: THREE.Texture;
  wallRight?: THREE.Texture;
}
```

**Usage:**
```typescript
import { SpriteSheetLoader } from '@/utils/SpriteSheetLoader';

const loader = new SpriteSheetLoader('/tiles/world-tiles.png', 12, 12);
await loader.load();

// Get individual texture
const texture = loader.getTexture(0, 0); // Top-left sprite

// Get all textures for a tile
const mapping = {
  floor: { x: 0, y: 0 },
  ceiling: { x: 1, y: 0 },
  wallFront: { x: 2, y: 0 },
  wallBack: { x: 3, y: 0 },
  wallLeft: { x: 4, y: 0 },
  wallRight: { x: 5, y: 0 }
};
const textures = loader.getTileTextures(mapping);

// Cleanup
loader.dispose();
```

---

### `tileTextureConfig.ts`

**Path:** `react-app/src/utils/tileTextureConfig.ts`

**Purpose:** Texture mapping configuration for different tile types.

**Lines:** 69 lines

**Type: `TileTextureMapping`**

```typescript
export interface TileTextureMapping {
  floor?: SpriteCoordinates;
  ceiling?: SpriteCoordinates;
  wallFront?: SpriteCoordinates;
  wallBack?: SpriteCoordinates;
  wallLeft?: SpriteCoordinates;
  wallRight?: SpriteCoordinates;
}
```

**Function: `getTileTextureMapping`**

```typescript
export function getTileTextureMapping(tileType: string): TileTextureMapping
```

Maps tile characters to sprite coordinates:

**Default Mappings:**

```typescript
// Wall tile '#'
{
  floor: { x: 0, y: 0 },
  ceiling: { x: 0, y: 0 },
  wallFront: { x: 1, y: 0 },
  wallBack: { x: 1, y: 0 },
  wallLeft: { x: 1, y: 0 },
  wallRight: { x: 1, y: 0 }
}

// Floor tile '.'
{
  floor: { x: 2, y: 0 },
  ceiling: { x: 2, y: 0 }
  // No walls
}

// Door tile '+'
{
  floor: { x: 2, y: 0 },
  ceiling: { x: 2, y: 0 }
  // No walls (open passage)
}
```

**Extensibility:**

Easy to add new tile types:
```typescript
export function getTileTextureMapping(tileType: string): TileTextureMapping {
  switch (tileType) {
    case '#': return { /* wall mapping */ };
    case '.': return { /* floor mapping */ };
    case '+': return { /* door mapping */ };
    case '~': return { /* water mapping */ };
    case '^': return { /* grass mapping */ };
    default: return { /* default mapping */ };
  }
}
```

**Usage:**
```typescript
import { getTileTextureMapping } from '@/utils/tileTextureConfig';
import { SpriteSheetLoader } from '@/utils/SpriteSheetLoader';

const tileType = '#'; // Wall
const mapping = getTileTextureMapping(tileType);
const textures = spriteSheetLoader.getTileTextures(mapping);

// Pass textures to Cell component
<Cell worldX={x} worldZ={z} tileType={tileType} textures={textures} />
```

---

### Area Map Utilities

These utilities are documented in [AreaMapHierarchy.md](AreaMapHierarchy.md) but are essential for FirstPersonView:

- **`AreaMapRegistry.ts`** - Registry for all AreaMap instances
- **`AreaMapTileSetRegistry.ts`** - Registry for tileset definitions
- **`AreaMapParser.ts`** - Parses area maps from YAML
- **`SpriteRenderer.ts`** - Renders sprites (used by MinimapRenderer)
- **`FontAtlasRenderer.ts`** - Renders text (used by stats panel, combat log)

---

## Data Files

Located in: `react-app/src/data/`

### Area Map Data

- **`area-map-database.yaml`** - YAML database of all navigable area maps
- **`area-tileset-database.yaml`** - YAML database of all tileset definitions

See [AreaMapHierarchy.md](AreaMapHierarchy.md) for full documentation of area map data structures.

---

## Test Files

Located in: `react-app/src/`

### Movement Validator Tests

**Path:** `react-app/src/utils/__tests__/MovementValidator.test.ts`

**Purpose:** Unit tests for movement validation logic.

**Test Suites:**
- `validateMovement` - Movement validation with various scenarios
  - Normal floor movement
  - Wall blocking
  - Out of bounds blocking
  - Door auto-continuation
  - Door leading to wall (blocked)
  - Door leading out of bounds (blocked)
  - Adjacent door tiles (blocked, prevents loops)
- `getDirectionOffset` - Direction offset calculations
- `rotateLeft` - Counter-clockwise rotation
- `rotateRight` - Clockwise rotation

---

### Area Map Tests

See [AreaMapHierarchy.md](AreaMapHierarchy.md) for complete test documentation:

- `AreaMap.test.ts` - AreaMap class tests
- `AreaMapParser.test.ts` - ASCII parsing tests
- `AreaMapTileSetRegistry.test.ts` - Tileset registry tests

---

## Documentation Files

Located in: `GDD/FirstPersonView/`

### Main Documentation

1. **FirstPersonViewOverview.md**
   - Path: `GDD/FirstPersonView/FirstPersonViewOverview.md`
   - Comprehensive system overview and architecture
   - Feature summary, core requirements, data structures
   - UI layout specifications (5-panel structure)
   - 3D viewport system, movement system, interaction system
   - Minimap, stats panels, combat log integration
   - Encounter system, edge cases, testing checklist

2. **FirstPersonViewImplementationPlan.md**
   - Path: `GDD/FirstPersonView/FirstPersonViewImplementationPlan.md`
   - Step-by-step implementation plan
   - Phase 1: Core state & input
   - Phase 2: Layout & rendering structure
   - Phase 3: 3D viewport integration
   - Phase 4: Minimap & player stats panels
   - Phase 5: Movement & interaction systems
   - Phase 6: Test route & integration
   - Testing plan, file structure summary, success criteria

### Area Map System Documentation

See [AreaMapHierarchy.md](AreaMapHierarchy.md) for complete documentation:

- `AreaMap/README.md`
- `AreaMap/AreaMapSystemOverview.md`
- `AreaMap/AreaMapImplementationPlan.md`
- `AreaMap/AreaMapImplementationPlan-Part2.md`
- `AreaMap/ImplementationComplete.md`
- `AreaMap/DeveloperPanelComplete.md`

### Code Review

- **CodeReview-FirstPersonView-RefactorImplementation.md**
  - Path: `CodeReview-FirstPersonView-RefactorImplementation.md`
  - Code review document for FirstPersonView refactoring

---

## File Dependencies

### Dependency Graph

```
Data Files (YAML)
    ↓
AreaMapDataLoader
    ↓
AreaMapRegistry + AreaMapTileSetRegistry
    ↓
┌────────────────────────────────────────────────────────────┐
│ AreaMap System (Models)                                    │
│ - AreaMap, AreaMapTile, AreaMapTileSet                    │
│ - InteractiveObject, SpawnPoint, EncounterZone            │
└────────────────────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────────────────────┐
│ FirstPerson Models                                         │
│ - FirstPersonState                                         │
│ - FirstPersonLayoutManager                                 │
└────────────────────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────────────────────┐
│ Input & Movement Services                                  │
│ - FirstPersonInputHandler                                  │
│ - MovementValidator                                        │
└────────────────────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────────────────────┐
│ Rendering Utilities                                        │
│ - SpriteSheetLoader                                        │
│ - tileTextureConfig                                        │
│ - MinimapRenderer                                          │
│ - PartyMemberStatsPanel                                    │
└────────────────────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────────────────────┐
│ 3D Components                                              │
│ - Cell                                                     │
│ - AnimatedPerspectiveCamera                                │
│ - CameraLights                                             │
└────────────────────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────────────────────┐
│ ThreeJSViewport                                            │
│ (Integrates 3D components)                                 │
└────────────────────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────────────────────┐
│ FirstPersonView (Main Component)                           │
│ (Integrates all systems)                                   │
└────────────────────────────────────────────────────────────┘
```

### Import Relationships

**FirstPersonView.tsx** imports:
- `FirstPersonState` from `models/firstperson/FirstPersonState`
- `FirstPersonInputHandler` from `services/FirstPersonInputHandler`
- `FirstPersonLayoutManager` from `models/firstperson/layouts/FirstPersonLayoutManager`
- `ThreeJSViewport` from `components/firstperson/ThreeJSViewport`
- `MinimapRenderer` from `models/firstperson/rendering/MinimapRenderer`
- `PartyMemberStatsPanel` from `models/firstperson/rendering/PartyMemberStatsPanel`
- `AreaMapRegistry` from `utils/AreaMapRegistry`
- `MovementValidator` from `utils/MovementValidator`
- `CombatLogManager` from `models/combat/CombatLogManager`
- `SpriteAssetLoader`, `FontAtlasLoader` from services

**ThreeJSViewport.tsx** imports:
- `Canvas` from `@react-three/fiber`
- `Cell` from `components/Cell`
- `AnimatedPerspectiveCamera` from `components/AnimatedPerspectiveCamera`
- `CameraLights` from `components/CameraLights`
- `SpriteSheetLoader` from `utils/SpriteSheetLoader`
- `getTileTextureMapping` from `utils/tileTextureConfig`
- `AreaMap` from `models/area/AreaMap`

**FirstPersonInputHandler.ts** imports:
- `CardinalDirection` from `models/area/InteractiveObject`

**MovementValidator.ts** imports:
- `AreaMap` from `models/area/AreaMap`
- `CardinalDirection` from `models/area/InteractiveObject`
- `InteractiveObjectType` from `models/area/InteractiveObject`

**MinimapRenderer.ts** imports:
- `AreaMap` from `models/area/AreaMap`
- `CardinalDirection` from `models/area/InteractiveObject`
- `SpriteRenderer` from `utils/SpriteRenderer`

**PartyMemberStatsPanel.ts** imports:
- `CombatUnit` from `models/combat/CombatUnit`
- `FontAtlasRenderer` from `utils/FontAtlasRenderer`

---

## Key Interfaces and Types

### Core Types Summary

```typescript
// Cardinal Directions
type CardinalDirection = 'North' | 'South' | 'East' | 'West';

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

// Movement Result (discriminated union)
type MovementResult =
  | { success: true; finalX: number; finalY: number; passThroughDoor: boolean; doorX?: number; doorY?: number; }
  | { success: false; reason: string; interactiveObject?: InteractiveObject; };

// Sprite Coordinates
interface SpriteCoordinates {
  x: number; // Sprite X in grid
  y: number; // Sprite Y in grid
}

// Tile Texture Mapping
interface TileTextureMapping {
  floor?: SpriteCoordinates;
  ceiling?: SpriteCoordinates;
  wallFront?: SpriteCoordinates;
  wallBack?: SpriteCoordinates;
  wallLeft?: SpriteCoordinates;
  wallRight?: SpriteCoordinates;
}

// Tile Textures (THREE.js)
interface TileTextures {
  floor?: THREE.Texture;
  ceiling?: THREE.Texture;
  wallFront?: THREE.Texture;
  wallBack?: THREE.Texture;
  wallLeft?: THREE.Texture;
  wallRight?: THREE.Texture;
}
```

### Data Structure Hierarchy

```
FirstPersonState
├── playerX: number
├── playerY: number
├── direction: CardinalDirection
├── map: AreaMap
│   ├── id, name, description
│   ├── width, height
│   ├── tilesetId
│   ├── grid: AreaMapTile[][]
│   │   └── AreaMapTile
│   │       ├── behavior: TileBehavior
│   │       ├── walkable: boolean
│   │       ├── passable: boolean
│   │       ├── spriteId: string
│   │       └── terrainType?: string
│   ├── interactiveObjects: Map<string, InteractiveObject>
│   ├── playerSpawn: SpawnPoint
│   ├── npcSpawns: SpawnPoint[]
│   └── encounterZones?: EncounterZone[]
├── exploredTiles: Set<string>
├── partyMember: CombatUnit
│   ├── name, currentHealth, currentMana
│   ├── getMaxHealth(), getMaxMana()
│   └── equipment, stats, etc.
└── targetedObject: InteractiveObject | null

ThreeJSViewport Props
├── areaMap: AreaMap
├── playerX: number
├── playerY: number
├── direction: CardinalDirection
├── width: number
├── height: number
└── onAnimationComplete?: () => void

SpriteSheetLoader
├── spritesheetPath: string
├── spriteWidth: number
├── spriteHeight: number
├── texture: THREE.Texture
└── textureCache: Map<string, THREE.Texture>
```

---

## Method Reference

### FirstPersonView Component Methods

| Method | Parameters | Return Type | Description |
|--------|-----------|-------------|-------------|
| `renderFrame` | - | `void` | Main render loop (60 FPS) |
| `handleKeyDown` | `event: KeyboardEvent` | `void` | Process keyboard input |
| `handleMovement` | `command: InputCommand` | `void` | Validate and execute movement |
| `handleRotation` | `command: InputCommand` | `void` | Update player facing |
| `handleInteract` | - | `void` | Interact with targeted object |
| `loadAssets` | - | `Promise<void>` | Load sprites and fonts |
| `updateCanvasStyle` | - | `void` | Calculate integer scaling |

### FirstPersonInputHandler Methods

| Method | Parameters | Return Type | Description |
|--------|-----------|-------------|-------------|
| `processKeyDown` | `event: KeyboardEvent` | `InputCommand \| null` | Map key to command |
| `blockInput` | - | `void` | Block input during animations |
| `unblockInput` | - | `void` | Unblock input |
| `isInputBlocked` | - | `boolean` | Check if input blocked |
| `calculateNewDirection` (static) | `current: CardinalDirection, turn: 'left' \| 'right'` | `CardinalDirection` | Rotate direction |
| `calculateTargetPosition` (static) | `x: number, y: number, direction: CardinalDirection, moveForward: boolean` | `{ x: number; y: number }` | Calculate move target |
| `calculateStrafePosition` (static) | `x: number, y: number, direction: CardinalDirection, strafeRight: boolean` | `{ x: number; y: number }` | Calculate strafe target |

### MovementValidator Functions

| Function | Parameters | Return Type | Description |
|----------|-----------|-------------|-------------|
| `validateMovement` | `areaMap: AreaMap, currentX: number, currentY: number, direction: CardinalDirection` | `MovementResult` | Validate movement with door auto-continuation |
| `getDirectionOffset` | `direction: CardinalDirection` | `[number, number]` | Get [dx, dy] offset |
| `rotateLeft` | `direction: CardinalDirection` | `CardinalDirection` | Rotate counter-clockwise |
| `rotateRight` | `direction: CardinalDirection` | `CardinalDirection` | Rotate clockwise |

### SpriteSheetLoader Methods

| Method | Parameters | Return Type | Description |
|--------|-----------|-------------|-------------|
| `load` | - | `Promise<void>` | Load sprite sheet asynchronously |
| `getTexture` | `spriteX: number, spriteY: number` | `THREE.Texture \| undefined` | Get texture for sprite coordinates |
| `getTileTextures` | `mapping: TileTextureMapping` | `TileTextures \| undefined` | Get all 6 textures for tile |
| `clearCache` | - | `void` | Clear texture cache |
| `dispose` | - | `void` | Dispose textures and cache |

### MinimapRenderer Methods

| Method | Parameters | Return Type | Description |
|--------|-----------|-------------|-------------|
| `render` (static) | `ctx: CanvasRenderingContext2D, areaMap: AreaMap, playerX: number, playerY: number, direction: CardinalDirection, exploredTiles: Set<string>, regionX: number, regionY: number, regionWidth: number, regionHeight: number, spriteImages: Map<string, HTMLImageElement>` | `void` | Render minimap with fog of war |

### PartyMemberStatsPanel Methods

| Method | Parameters | Return Type | Description |
|--------|-----------|-------------|-------------|
| `render` (static) | `ctx: CanvasRenderingContext2D, partyMember: CombatUnit, regionX: number, regionY: number, regionWidth: number, regionHeight: number, fontId: string, fontAtlasImage: HTMLImageElement \| null` | `void` | Render HP/MP bars |

### AnimatedPerspectiveCamera Ref Methods

| Method | Parameters | Return Type | Description |
|--------|-----------|-------------|-------------|
| `updateTarget` | `newPosition: [number, number, number], newRotation: [number, number, number], movementDuration?: number, rotationDuration?: number` | `void` | Update camera target with animation |
| `getCurrentPosition` | - | `[number, number, number]` | Get current camera position |
| `getCurrentRotation` | - | `[number, number, number]` | Get current camera rotation |

---

## Usage Examples

### Loading and Displaying FirstPersonView

```typescript
import { FirstPersonView } from '@/components/firstperson/FirstPersonView';

// In App.tsx or route component
function FirstPersonTestRoute() {
  const { mapId } = useParams<{ mapId: string }>();

  if (!mapId) {
    return <div>Error: No map ID provided</div>;
  }

  return <FirstPersonView mapId={mapId} />;
}

// Navigate to /dev/test/dungeon-room-1
```

### Processing Movement

```typescript
import { FirstPersonInputHandler, InputCommand } from '@/services/FirstPersonInputHandler';
import { validateMovement } from '@/utils/MovementValidator';

const inputHandler = useMemo(() => new FirstPersonInputHandler(), []);

const handleKeyDown = (event: KeyboardEvent) => {
  const command = inputHandler.processKeyDown(event);
  if (!command) return;

  if (command === InputCommand.MoveForward) {
    // Validate movement
    const result = validateMovement(
      firstPersonState.map,
      firstPersonState.playerX,
      firstPersonState.playerY,
      firstPersonState.direction
    );

    if (result.success) {
      // Block input during animation
      inputHandler.blockInput();

      // Update state
      setFirstPersonState(prev => ({
        ...prev!,
        playerX: result.finalX!,
        playerY: result.finalY!,
        exploredTiles: new Set([...prev!.exploredTiles, `${result.finalX},${result.finalY}`])
      }));

      // Log message
      if (result.passThroughDoor) {
        combatLogManager.addMessage('You pass through the doorway.');
      } else {
        combatLogManager.addMessage('You move forward.');
      }
    } else {
      combatLogManager.addMessage(result.reason || 'You cannot move that way.');
    }
  } else if (command === InputCommand.TurnLeft) {
    const newDirection = FirstPersonInputHandler.calculateNewDirection(
      firstPersonState.direction,
      'left'
    );

    inputHandler.blockInput();
    setFirstPersonState(prev => ({ ...prev!, direction: newDirection }));
  }
};

// Unblock input after animation completes
const handleAnimationComplete = useCallback(() => {
  inputHandler.unblockInput();
}, [inputHandler]);
```

### Rendering Minimap

```typescript
import { MinimapRenderer } from '@/models/firstperson/rendering/MinimapRenderer';

// In render loop
const minimapRegion = layoutManager.getTurnOrderPanelRegion();

MinimapRenderer.render(
  ctx,
  firstPersonState.map,
  firstPersonState.playerX,
  firstPersonState.playerY,
  firstPersonState.direction,
  firstPersonState.exploredTiles,
  minimapRegion.x,
  minimapRegion.y,
  minimapRegion.width,
  minimapRegion.height,
  spriteImages
);
```

### Rendering Party Member Stats

```typescript
import { PartyMemberStatsPanel } from '@/models/firstperson/rendering/PartyMemberStatsPanel';

// In render loop
const statsRegion = layoutManager.getUnitInfoPanelRegion();

PartyMemberStatsPanel.render(
  ctx,
  firstPersonState.partyMember,
  statsRegion.x,
  statsRegion.y,
  statsRegion.width,
  statsRegion.height,
  '7px-04b03',
  fontAtlasImage
);
```

### Loading and Using 3D Textures

```typescript
import { SpriteSheetLoader } from '@/utils/SpriteSheetLoader';
import { getTileTextureMapping } from '@/utils/tileTextureConfig';

// Load sprite sheet
const loader = new SpriteSheetLoader('/tiles/world-tiles.png', 12, 12);
await loader.load();

// Get textures for a wall tile
const wallMapping = getTileTextureMapping('#');
const wallTextures = loader.getTileTextures(wallMapping);

// Pass to Cell component
<Cell
  worldX={5}
  worldZ={3}
  tileType="#"
  textures={wallTextures}
/>

// Cleanup on unmount
useEffect(() => {
  return () => loader.dispose();
}, []);
```

---

## Guidelines Compliance Summary

The FirstPersonView system follows these key patterns from [GeneralGuidelines.md](GeneralGuidelines.md):

### ✅ Const Object Pattern (Not Enums)
All type definitions use const objects with `as const`:
```typescript
export const InputCommand = {
  MoveForward: 'move-forward',
  TurnLeft: 'turn-left',
  // ...
} as const;
export type InputCommand = typeof InputCommand[keyof typeof InputCommand];
```

### ✅ Discriminated Union Results
Type-safe result types:
```typescript
export type MovementResult =
  | { success: true; finalX: number; finalY: number; ... }
  | { success: false; reason: string; ... };
```

### ✅ Immutable State Updates
State-modifying operations create new objects:
```typescript
setFirstPersonState(prev => ({
  ...prev!,
  playerX: newX,
  playerY: newY,
  exploredTiles: new Set([...prev!.exploredTiles, `${newX},${newY}`])
}));
```

### ✅ Canvas Rendering Best Practices
- Disable image smoothing: `ctx.imageSmoothingEnabled = false`
- Double buffering: Render to offscreen canvas, composite to display
- Integer scaling: Calculate pixel-perfect scaling factors
- Round coordinates: Prevent sub-pixel rendering

### ✅ React Three Fiber Integration
- Offscreen canvas rendering for 3D viewport
- Compositing 3D canvas onto main 2D canvas
- Texture caching for performance
- NearestFilter for pixel art textures

### ✅ Input Blocking Pattern
- Block input during animations
- Unblock on animation complete callback
- Prevents input spam and state corruption

---

## Integration Points

### FirstPersonView ↔ AreaMap System

FirstPersonView depends heavily on the AreaMap system:

1. **Map Loading**: `AreaMapRegistry.getById(mapId)`
2. **Spawn Point**: `areaMap.playerSpawn` for initial position
3. **Movement Validation**: `areaMap.isPassable()`, `areaMap.isWalkable()`, `areaMap.isDoorTile()`
4. **Tile Lookup**: `areaMap.getTile(x, y)` for rendering
5. **Interactive Objects**: `areaMap.getInteractiveObjectAt(x, y)` for interactions

### FirstPersonView ↔ Combat System

FirstPersonView integrates with the combat system:

1. **Party Members**: Uses `CombatUnit` from `PartyMemberRegistry`
2. **HP/MP Display**: Reads `currentHealth`, `currentMana`, `getMaxHealth()`, `getMaxMana()`
3. **Combat Log**: Reuses `CombatLogManager` for messages
4. **Layout**: Extends `CombatLayoutManager` for 5-panel structure
5. **Encounter Triggers**: Will transition to `CombatView` when encounter triggered

### ThreeJSViewport ↔ Sprite System

ThreeJSViewport uses sprite system for textures:

1. **Sprite Sheet**: `SpriteSheetLoader` loads tile sprite sheet
2. **Texture Mapping**: `tileTextureConfig` maps tile types to sprite coordinates
3. **Texture Caching**: Caches THREE.Texture instances by coordinates
4. **Disposal**: Cleans up textures on unmount

---

## Performance Considerations

### 3D Rendering Optimization

- **Frustum Culling**: Only render visible cells (view distance: 8, width: 6)
- **Texture Reuse**: Single sprite sheet loaded once, shared textures
- **Mesh Instancing**: Reuse box geometry for all cells
- **Low Poly**: Simple plane meshes, no complex geometry
- **No Anti-aliasing**: Pixel-art aesthetic, disable AA for performance

### Canvas Rendering Optimization

- **Double Buffering**: Render to offscreen canvas, composite to display
- **Offscreen 3D Canvas**: ThreeJSViewport renders to separate canvas
- **Integer Scaling**: Calculate once, cache display dimensions
- **Disable Image Smoothing**: Prevent browser interpolation
- **Round Coordinates**: Prevent sub-pixel rendering

### State Management

- **Immutable Updates**: React state updates, no direct mutations
- **Memoization**: Use useMemo for expensive calculations (visible cells, camera transform)
- **Refs for Animation**: Use refs for camera handle, avoid re-renders
- **Input Blocking**: Prevent input spam during animations

---

## Future Extensions

### Advanced Graphics
- **Dynamic Shadows**: Real-time shadow casting
- **Reflections**: Floor reflections for water/ice tiles
- **Particle Systems**: Torch flames, magic effects
- **Post-Processing**: Bloom, color grading, vignette

### Gameplay Features
- **Stealth System**: Sneaking past enemies
- **Puzzle Mechanics**: Switches, pressure plates, sliding blocks
- **Environmental Hazards**: Traps, lava, spikes
- **NPC Pathing**: Moving NPCs and enemies

### UI Enhancements
- **Full Inventory Screen**: Detailed inventory management
- **Quest Log**: Track active and completed quests
- **Character Sheet**: Full stats, skills, equipment
- **Settings Menu**: Graphics, controls, audio options

---

## Success Criteria

This system is complete when:

1. ✅ `/dev/test/:mapId` route loads and displays first-person view
2. ✅ 3D viewport renders in Map Panel region
3. ✅ WASD movement works with collision detection
4. ✅ A/D rotation works with smooth camera animation
5. ✅ Minimap shows explored tiles with fog of war
6. ✅ Party member stats panel displays name, HP/MP from CombatUnit
7. ✅ Combat log shows movement messages
8. ✅ Input is blocked during animations
9. ✅ Door auto-continuation works (two-tile movement)
10. ✅ All GeneralGuidelines.md patterns are followed

---

## Dependencies

- **Requires**: React Three Fiber (@react-three/fiber)
- **Requires**: Three.js (three)
- **Requires**: Area Map System (AreaMap, registries, data loaders)
- **Requires**: Combat System (CombatUnit, CombatLayoutManager, CombatLogManager)
- **Requires**: Sprite System (SpriteAssetLoader, SpriteRenderer, FontAtlasRenderer)
- **Relates To**: CombatView (shared UI layout structure)

---

## Estimated Complexity

- **Implementation Time**: 25-35 hours
  - Phase 1 (State & Input): 4-5 hours
  - Phase 2 (Layout & Skeleton): 4-5 hours
  - Phase 3 (3D Viewport): 6-8 hours
  - Phase 4 (Minimap & Stats): 4-5 hours
  - Phase 5 (Movement & Interaction): 5-7 hours
  - Phase 6 (Test Route): 1-2 hours
  - Testing & Polish: 4-5 hours

**Complexity Rating**: Medium-High (substantial 3D integration with 2D UI)

**Risk Level**: Medium
- 3D viewport performance in constrained region
- React Three Fiber integration with canvas rendering
- Camera animation timing coordination

---

**End of FirstPersonView System Hierarchy Documentation**

For implementation details, see:
- [FirstPersonViewOverview.md](GDD/FirstPersonView/FirstPersonViewOverview.md)
- [FirstPersonViewImplementationPlan.md](GDD/FirstPersonView/FirstPersonViewImplementationPlan.md)
- [AreaMapHierarchy.md](AreaMapHierarchy.md) (for AreaMap system integration)
