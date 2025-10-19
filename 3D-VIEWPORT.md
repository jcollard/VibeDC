# 3D First-Person Viewport

The game now includes a first-person 3D viewport using Three.js and React Three Fiber.

## Overview

The viewport displays a cell-based 3D rendering of the world from the player's perspective. Each grid tile is rendered as a 3D "cell" composed of 6 planes (top, bottom, front, back, left, right).

## Technology Stack

- **Three.js**: 3D rendering engine
- **React Three Fiber**: React renderer for Three.js
- **@react-three/drei**: Useful helpers for React Three Fiber

## Components

### FirstPersonView
Location: [react-app/src/components/FirstPersonView.tsx](react-app/src/components/FirstPersonView.tsx)

Main viewport component that:
- Sets up the Three.js Canvas
- Positions the camera at player location
- Calculates visible cells based on player direction
- Renders lighting and fog effects
- Includes a crosshair overlay

**Props:**
- `playerX`: Player's X position on grid
- `playerY`: Player's Y position on grid
- `direction`: Player's facing direction (North/East/South/West)
- `grid`: String array representing the map
- `cameraOffset`: (Optional) Camera position offset in forward direction
  - `0.0` = Centered in tile
  - `0.3` = Slightly forward (default)
  - `0.5` = At front edge of tile
  - `-0.3` = Slightly backward
  - Range: -0.5 to 0.5 recommended

### Cell
Location: [react-app/src/components/Cell.tsx](react-app/src/components/Cell.tsx)

Individual cell renderer that creates:
- **Floor plane**: Bottom of the cell
- **Ceiling plane**: Top of the cell
- **4 Wall planes**: Front, back, left, right (only for wall tiles)

**Props:**
- `x`: Lateral position (left/right from player)
- `z`: Depth position (distance from player)
- `tileType`: Grid tile type (`#` = wall, `.` = floor)

## Rendering Details

### Cell-Based System

Each grid tile is rendered as a 1x1x1 unit cube made of 6 separate planes:

```
     +-----+  Ceiling (top plane)
    /     /|
   +-----+ |
   |     | +  Right wall (side plane)
   |     |/
   +-----+    Floor (bottom plane)

   Additional planes: Front, Back, Left
```

### Coordinate System

The viewport uses Three.js standard coordinates:
- **X-axis**: Left (-) to Right (+)
- **Y-axis**: Down (-) to Up (+)
- **Z-axis**: Far (-) to Near (+)

Player is at origin (0, 0, 0) looking down the **negative Z-axis**.

### Direction Mapping

Player grid directions map to viewport coordinates:

| Player Facing | View Direction |
|---------------|----------------|
| North         | -Z (forward)   |
| South         | +Z (backward)  |
| East          | +X (right)     |
| West          | -X (left)      |

### View Distance

- **Depth**: 8 cells forward
- **Width**: 13 cells wide (6 left + center + 6 right)
- **Out of bounds**: Rendered as walls

## Visual Features

### Lighting

Three light sources:
1. **Ambient Light**: Base illumination (intensity 0.4)
2. **Directional Light**: From above (intensity 0.8)
3. **Point Light**: At player position (intensity 0.5, range 5 units)

### Fog

Distance fog creates depth perception:
- Color: `#0a0a0a` (dark)
- Near: 2 units
- Far: 10 units

### Colors

**Floor Tiles** (`.`):
- Floor: `#333333`
- Ceiling: `#2a2a2a`

**Wall Tiles** (`#`):
- Walls: `#444444`
- Floor: `#222222`
- Ceiling: `#1a1a1a`

### Crosshair

Green crosshair overlay for aiming/orientation:
- Color: `rgba(76, 175, 80, 0.6)`
- Size: 20x20 pixels
- Always centered

## Performance Optimizations

### Frustum Culling

Only cells within view distance are rendered (8 cells deep × 13 cells wide = max 117 cells).

### Simple Geometry

Each cell uses basic `PlaneGeometry` primitives (6 planes max per cell).

### Instancing Potential

Future optimization: Use instanced rendering for repeated wall/floor meshes.

## Usage Example

```tsx
import { FirstPersonView } from './components/FirstPersonView';

<FirstPersonView
  playerX={5}
  playerY={3}
  direction="North"
  grid={['####', '#..#', '####']}
/>
```

## Future Enhancements

Potential improvements:

1. **Textures**: Add texture maps instead of solid colors
2. **Player Models**: Render other players as 3D models
3. **Animations**: Smooth camera movement/rotation
4. **Minimap**: Picture-in-picture top-down view
5. **Dynamic Lighting**: Torches, day/night cycle
6. **Particle Effects**: Dust, fog particles
7. **Post-Processing**: Bloom, shadows, ambient occlusion
8. **VR Support**: WebXR for VR headsets
9. **Higher Walls**: Variable height walls/ceilings
10. **Props/Objects**: 3D objects within cells (tables, trees, etc.)

## Customization

### Changing View Distance

Edit `viewDistance` in [FirstPersonView.tsx](react-app/src/components/FirstPersonView.tsx):

```typescript
const viewDistance = 8; // Increase for farther view
const viewWidth = 6;    // Increase for wider view
```

### Changing Colors

Edit colors in [Cell.tsx](react-app/src/components/Cell.tsx):

```typescript
const wallColor = isWall ? '#444444' : '#666666';
const floorColor = isWall ? '#222222' : '#333333';
const ceilingColor = isWall ? '#1a1a1a' : '#2a2a2a';
```

### Changing Camera FOV

Edit FOV in [FirstPersonView.tsx](react-app/src/components/FirstPersonView.tsx):

```tsx
<PerspectiveCamera makeDefault position={[0, 0, 0]} fov={75} />
```

Higher FOV = wider view (fish-eye effect)
Lower FOV = narrower view (telephoto effect)

### Adjusting Camera Offset

The `cameraOffset` prop positions the camera within the player's tile:

```tsx
<FirstPersonView
  playerX={5}
  playerY={3}
  direction="North"
  grid={grid}
  cameraOffset={0.3}  // Adjust this value
/>
```

**Effect of different offsets:**

| Offset | Position | Effect |
|--------|----------|--------|
| `-0.5` | Back edge of tile | See more ahead, less behind |
| `-0.3` | Slightly back | Balanced view, more forward |
| `0.0` | Center (default classic) | Perfectly centered |
| `0.3` | Slightly forward | See immediate surroundings better |
| `0.5` | Front edge | Maximum view of current tile |

**Recommended values:**
- **Exploration**: `0.3` - See what's ahead while being aware of current tile
- **Combat/Tactical**: `0.0` - Centered view for balanced awareness
- **Scouting**: `-0.3` - See further ahead, less of current position

The offset is in the **forward direction** relative to player facing:
- Facing North with `0.3` offset = camera is 0.3 units south (behind where you're looking)
- This creates a "looking forward from back of tile" perspective

## Troubleshooting

**Black screen**:
- Check that Three.js dependencies are installed
- Verify grid array is valid
- Check browser console for errors

**Poor performance**:
- Reduce `viewDistance` and `viewWidth`
- Disable fog or lighting effects
- Check GPU hardware acceleration is enabled

**Incorrect orientation**:
- Verify player direction matches grid movement
- Check `getGridPosition` logic in FirstPersonView
- Ensure camera is at (0, 0, 0)

## Technical Notes

### Why Planes Instead of Boxes?

Using 6 separate planes instead of box geometry allows:
- Individual face culling (don't render hidden faces)
- Different materials per face
- Easier texture mapping
- Better control over lighting per face

### Coordinate Transformation

Grid coordinates (x, y) are transformed to 3D coordinates based on player facing:

```typescript
// Example: Player at (5, 5) facing North
// Cell at grid (5, 3) is 2 cells ahead
// 3D position: (0, 0, -2)
```

The transformation accounts for player rotation so "forward" always renders correctly.
