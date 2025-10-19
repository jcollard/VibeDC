# VibeDC Controls System

## Default Control Scheme (QWEASD)

### Rotation
- **Q**: Turn Left (-90 degrees)
- **E**: Turn Right (+90 degrees)

### Relative Movement (based on facing direction)
- **W / ↑**: Move Forward (in facing direction)
- **S / ↓**: Move Backward (opposite of facing direction)
- **A / ←**: Strafe Left (perpendicular to facing direction)
- **D / →**: Strafe Right (perpendicular to facing direction)

## How Relative Movement Works

Movement is **relative to your current facing direction**, not absolute grid directions:

### Example: Facing North
- W → Move up (North)
- S → Move down (South)
- A → Move left (West)
- D → Move right (East)

### Example: Facing East
- W → Move right (East)
- S → Move left (West)
- A → Move up (North)
- D → Move down (South)

### Example: Facing South
- W → Move down (South)
- S → Move up (North)
- A → Move right (East)
- D → Move left (West)

### Example: Facing West
- W → Move left (West)
- S → Move right (East)
- A → Move down (South)
- D → Move up (North)

## Key Features

### UserInputConfig Class
Location: [react-app/src/models/UserInputConfig.ts](react-app/src/models/UserInputConfig.ts)

The `UserInputConfig` class allows for complete control remapping:

```typescript
// Load default configuration
const inputConfig = UserInputConfig.load();

// Get action for a key press
const action = inputConfig.getAction('w'); // Returns 'moveForward'

// Remap a key
inputConfig.remapKey('i', 'moveForward'); // Now 'i' moves forward

// Save custom configuration
inputConfig.save('myProfile');

// Reset to defaults
inputConfig.resetToDefaults();
```

### Player Actions

Six distinct actions are supported:

1. **moveForward**: Move in facing direction
2. **moveBackward**: Move opposite of facing direction
3. **strafeLeft**: Move perpendicular left
4. **strafeRight**: Move perpendicular right
5. **turnLeft**: Rotate counter-clockwise
6. **turnRight**: Rotate clockwise

### Server Authority

All actions are validated server-side:
- Movement checks for walls, boundaries, and collisions
- Rotation updates direction without position validation
- Strafing maintains facing direction while moving sideways

## Customization

### Creating Custom Key Bindings

```typescript
import { UserInputConfig } from './models/UserInputConfig';

// Create custom bindings
const customBindings = [
  { key: 'i', action: 'moveForward' },
  { key: 'k', action: 'moveBackward' },
  { key: 'j', action: 'turnLeft' },
  { key: 'l', action: 'turnRight' },
  // ... etc
];

const config = new UserInputConfig(customBindings);
config.save('ijkl-scheme');
```

### Loading Custom Profiles

```typescript
// Load specific profile
const config = UserInputConfig.load('ijkl-scheme');

// Load default profile
const defaultConfig = UserInputConfig.load();
```

## Implementation Details

### Cloud Function
Location: [functions/src/index.ts](functions/src/index.ts)

The `performAction` Cloud Function handles all player actions:

```typescript
performAction({
  gameId: 'test-game',
  action: 'moveForward' // or any PlayerAction
})
```

### Client Integration
Location: [react-app/src/components/Game.tsx](react-app/src/components/Game.tsx)

The Game component uses UserInputConfig for input handling:

```typescript
const inputConfig = useMemo(() => UserInputConfig.load(), []);

const handleKeyDown = (e: KeyboardEvent) => {
  const action = inputConfig.getAction(e.key);
  if (action) {
    performAction({ gameId, action });
  }
};
```

## Benefits

1. **Intuitive Controls**: Movement relative to player facing feels natural
2. **Flexible**: Easily remap any key to any action
3. **Persistent**: Configurations save to localStorage
4. **Server Authority**: All actions validated server-side for security
5. **Extensible**: Easy to add new actions in the future

## Future Enhancements

Potential additions:
- Mouse-based rotation
- Gamepad support
- Multiple control profiles (WASD, ESDF, Arrow keys, etc.)
- Key binding UI for in-game customization
- Action cooldowns
- Sprint/run modifier keys
