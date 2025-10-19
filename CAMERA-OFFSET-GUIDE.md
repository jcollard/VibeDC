# Camera Offset Guide

## Overview

The camera offset allows you to position the camera at different points within the player's tile, affecting how much you see ahead vs. behind.

## Visual Explanation

```
Player's Tile (top view, facing North ↑):

┌─────────────────────┐
│                     │  ← Back of tile
│     Offset: -0.5    │     (camera far back, sees more ahead)
│         👁️          │
│                     │
│     Offset: -0.3    │
│         👁️          │
│                     │
│     Offset: 0.0     │
│         👁️          │     (camera centered)
│                     │
│     Offset: 0.3     │
│         👁️          │     (DEFAULT)
│                     │
│     Offset: 0.5     │
│         👁️          │
│                     │  ← Front of tile
└─────────────────────┘
         ↑
    Player facing North
```

## How It Works

The offset is applied in the **Z-axis** (depth) relative to the camera:
- **Positive offset** = Camera moves "back" in the tile (toward where player came from)
- **Negative offset** = Camera moves "forward" in the tile (toward where player is going)

### Example: Facing North

```
Grid (Y decreases upward):

     [5,2] [6,2] [7,2]
     [5,3] [6,3] [7,3]  ← Player at (6,3) facing North
     [5,4] [6,4] [7,4]

With offset 0.3 (default):
- Camera is at the "back" (south side) of tile [6,3]
- Player has better view of tile [6,2] ahead
- Can see floor of current tile [6,3] better

With offset -0.3:
- Camera is at the "front" (north side) of tile [6,3]
- Camera closer to next tile
- Sees further ahead but less of current tile
```

## Use Cases

### Exploration Mode (offset: 0.3)
```
Benefits:
✓ See what's immediately ahead
✓ Good view of current tile floor
✓ Natural "looking forward" feel
✓ Safe for navigation

Best for:
- Wandering through dungeons
- Searching for items on ground
- General gameplay
```

### Centered Classic (offset: 0.0)
```
Benefits:
✓ Perfectly balanced view
✓ Equal view forward and back
✓ Classic first-person perspective

Best for:
- Combat situations
- When 360° awareness matters
- Tactical positioning
```

### Scouting Mode (offset: -0.3)
```
Benefits:
✓ Maximum view distance ahead
✓ Spot enemies/obstacles earlier
✓ Better situational awareness

Drawbacks:
✗ Can't see current tile as well
✗ May feel "floating forward"

Best for:
- Long corridors
- Open areas
- When speed matters
```

### Edge Views

**Front Edge (offset: 0.5)**
```
Camera at very front of tile
- Maximum view of current floor
- Minimal view ahead
- Unusual but can be useful for puzzle games
```

**Back Edge (offset: -0.5)**
```
Camera at very back of tile
- Maximum view distance
- Almost no view of current tile
- Good for racing/speed games
```

## Code Examples

### Setting Different Offsets

```tsx
// Exploration (default)
<FirstPersonView cameraOffset={0.3} />

// Classic centered
<FirstPersonView cameraOffset={0.0} />

// Scouting ahead
<FirstPersonView cameraOffset={-0.3} />

// Dynamic based on game state
<FirstPersonView
  cameraOffset={inCombat ? 0.0 : 0.3}
/>
```

### Player Preference System

```tsx
// Store in player preferences
const [cameraOffset, setCameraOffset] = useState(0.3);

<FirstPersonView cameraOffset={cameraOffset} />

// UI control
<input
  type="range"
  min="-0.5"
  max="0.5"
  step="0.1"
  value={cameraOffset}
  onChange={(e) => setCameraOffset(Number(e.target.value))}
/>
```

## Technical Details

### Coordinate System

The offset is applied in **Three.js camera-local space**:

```typescript
// Internal calculation
const cameraPosition = [0, 0, cameraOffset] as [number, number, number];
//                      X  Y  Z
//                      |  |  └─ Forward/Back (offset applied here)
//                      |  └──── Up/Down (always 0)
//                      └─────── Left/Right (always 0)
```

### Direction Independence

The offset works the same regardless of player facing:
- Offset is **always** in the forward direction
- No need to adjust offset when turning
- Game logic handles rotation automatically

### Tile Scale

Offset is in **world units** where each tile is 1 unit:
- `0.5` = half a tile (edge)
- `1.0` = full tile (next tile's center)
- Values > 0.5 move into adjacent tiles (not recommended)

## Best Practices

### Recommended Range
```
Minimum: -0.5 (back edge)
Maximum:  0.5 (front edge)
Safe range: -0.4 to 0.4
```

### Testing Your Offset

1. Start with default (0.3)
2. Adjust by 0.1 increments
3. Walk through your map
4. Test in narrow corridors
5. Test in open areas
6. Check how walls appear

### Common Issues

**Offset too negative (< -0.3)**
- Camera may clip through walls behind player
- Disorienting in tight spaces

**Offset too positive (> 0.4)**
- Limited forward view
- May feel "stuck" in current tile

**Just right (0.2 to 0.4)**
- Balanced view
- Natural feel
- Good gameplay

## Performance Note

Camera offset has **zero performance impact**:
- It's just a position offset
- No extra calculations
- No additional rendering
- Change as often as you like

## Future Enhancements

Potential improvements:
- Auto-adjust based on surroundings (narrow vs. open)
- Smooth transitions when changing offset
- Keyboard shortcut to cycle presets
- Per-direction offsets (different for N/E/S/W)
- Dynamic offset based on movement speed
