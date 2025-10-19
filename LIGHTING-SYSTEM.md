# Lighting System

The game features an adjustable player light source to control visibility in the 3D first-person viewport.

## Overview

The lighting system simulates a torch or flashlight carried by the player, with adjustable intensity and range. This allows players to customize their visibility based on preference or gameplay needs.

## Light Sources

The viewport uses a multi-layer lighting approach:

### 1. Ambient Light
- **Intensity**: 0.3 (fixed)
- **Purpose**: Base illumination for entire scene
- **Effect**: Provides minimum visibility even with player light off

### 2. Directional Light
- **Intensity**: 0.5 (fixed)
- **Position**: Above and ahead
- **Purpose**: Simulates general environmental lighting
- **Effect**: Creates subtle shadows and depth

### 3. Player Point Light (Adjustable)
- **Intensity**: 0 to 3 (user controlled)
- **Distance**: 0 to 15 tiles (user controlled)
- **Color**: `#ffddaa` (warm torch-like)
- **Decay**: 2 (realistic falloff)
- **Purpose**: Main player illumination source

### 4. Player Spot Light (Adjustable)
- **Intensity**: 80% of point light
- **Distance**: 1.5x point light distance
- **Angle**: 45° cone
- **Color**: `#ffddaa` (warm torch-like)
- **Purpose**: Focused forward illumination
- **Behavior**: Only active when intensity > 0

## Light Control UI

### Quick Presets

Five preset configurations for common scenarios:

| Preset | Intensity | Range | Use Case |
|--------|-----------|-------|----------|
| **Off** | 0.0 | 0 | Complete darkness (ambient only) |
| **Dim** | 0.5 | 4 tiles | Low visibility, atmospheric |
| **Normal** | 1.0 | 8 tiles | Default balanced lighting |
| **Bright** | 1.5 | 10 tiles | Increased visibility |
| **Torch** | 2.0 | 12 tiles | Maximum illumination |

### Fine-Tune Sliders

#### Intensity Slider
```
Range: 0.0 to 3.0
Step: 0.1
Default: 1.0

Effects:
- 0.0 = Light off (ambient only)
- 0.5 = Dim candle
- 1.0 = Normal torch
- 1.5 = Bright torch
- 2.0+ = Blazing light
```

#### Distance Slider
```
Range: 0 to 15 tiles
Step: 1
Default: 8 tiles

Effects:
- 0 = No range
- 4 = Close proximity only
- 8 = Standard view distance
- 12 = Extended visibility
- 15 = Maximum range
```

### Visual Indicator

Real-time feedback showing current light state:
- **Glow effect**: Intensity represented visually
- **Text label**: "Dark" / "Dim" / "Lit" / "Blazing"
- **Shadow**: Distance represented by glow size

## Technical Implementation

### Light Position

Both lights follow camera position:
```typescript
const cameraPosition = [0, 0, cameraOffset];

<pointLight position={cameraPosition} ... />
<spotLight position={cameraPosition} ... />
```

### Warm Color Temperature

The `#ffddaa` color creates a warm, torch-like quality:
- **Red**: 255 (full)
- **Green**: 221 (slight reduction)
- **Blue**: 170 (reduced for warmth)

Result: Orange-yellow glow similar to firelight

### Light Decay

`decay={2}` provides realistic inverse-square falloff:
- Light intensity decreases with square of distance
- Creates natural-looking illumination gradients
- Prevents unrealistic "hard edge" light boundaries

### Spot Light Targeting

```typescript
target-position={[0, 0, -5]}  // 5 units forward
```

Spot light points 5 units ahead of player, illuminating the forward path.

## Usage Examples

### Code Integration

```tsx
<FirstPersonView
  playerX={x}
  playerY={y}
  direction={direction}
  grid={grid}
  lightIntensity={1.5}  // Bright
  lightDistance={10}    // 10 tiles
/>
```

### Dynamic Lighting

```tsx
// Battery/torch durability system
const [batteryLevel, setBatteryLevel] = useState(100);

const effectiveIntensity = (batteryLevel / 100) * 2.0;

<FirstPersonView
  lightIntensity={effectiveIntensity}
  lightDistance={8}
/>
```

### Environment-Based Lighting

```tsx
// Different lighting for different areas
const getLightForArea = (areaType: string) => {
  switch (areaType) {
    case 'cave': return { intensity: 2.0, distance: 6 };
    case 'dungeon': return { intensity: 1.5, distance: 8 };
    case 'outdoors': return { intensity: 0.5, distance: 12 };
    default: return { intensity: 1.0, distance: 8 };
  }
};
```

## Gameplay Implications

### Exploration

**High Light (2.0 intensity, 12+ distance)**
- Pros: See everything, spot threats early
- Cons: Less atmospheric, may miss hidden details
- Best for: First-time exploration, open areas

**Medium Light (1.0 intensity, 8 distance)**
- Pros: Balanced visibility and atmosphere
- Cons: None (recommended default)
- Best for: General gameplay

**Low Light (0.5 intensity, 4 distance)**
- Pros: Atmospheric, tense, immersive
- Cons: Limited visibility, easy to miss things
- Best for: Horror elements, puzzle solving

### Stealth/Horror Games

Low lighting creates tension:
```tsx
// Flashlight with limited battery
const [flashlightOn, setFlashlightOn] = useState(false);
const [battery, setBattery] = useState(100);

useEffect(() => {
  if (flashlightOn && battery > 0) {
    const drain = setInterval(() => {
      setBattery(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(drain);
  }
}, [flashlightOn, battery]);

<FirstPersonView
  lightIntensity={flashlightOn && battery > 0 ? 2.0 : 0.0}
  lightDistance={flashlightOn && battery > 0 ? 10 : 0}
/>
```

## Performance Considerations

### Light Count

Total light sources: **4**
- 1 Ambient
- 1 Directional
- 1 Point (player)
- 1 Spot (player, conditional)

This is well within Three.js performance limits.

### Dynamic Lighting Cost

- **Adjusting intensity/distance**: Near-zero cost (just changing properties)
- **Toggle on/off**: Minimal cost (conditional rendering)
- **Multiple players**: Each player has own lights (scales linearly)

### Optimization Tips

If performance is an issue:
1. Disable spot light (keep only point light)
2. Reduce ambient/directional intensity
3. Lower light distance
4. Use presets only (avoid real-time slider changes)

## Visual Effects

### Warm Glow
The warm color creates:
- Cozy, familiar feeling
- Medieval/fantasy atmosphere
- Natural torch simulation

### Light Falloff
Smooth gradients from:
- Bright (near player) → Dark (far from player)
- Creates depth perception
- Guides player attention

### Shadow Play
Walls and obstacles cast implicit shadows:
- Enhanced by directional light
- Creates 3D depth cues
- Helps with spatial awareness

## Customization

### Change Light Color

Make it a cool blue lantern:
```tsx
<pointLight color="#aaddff" ... />
<spotLight color="#aaddff" ... />
```

### Add Flicker Effect

Simulate torch flicker:
```tsx
const [flicker, setFlicker] = useState(1.0);

useEffect(() => {
  const interval = setInterval(() => {
    setFlicker(0.9 + Math.random() * 0.2);
  }, 100);
  return () => clearInterval(interval);
}, []);

<FirstPersonView
  lightIntensity={baseIntensity * flicker}
/>
```

### Day/Night Cycle

```tsx
const [timeOfDay, setTimeOfDay] = useState(0); // 0-24

const ambientIntensity = timeOfDay > 6 && timeOfDay < 18
  ? 0.6  // Daytime
  : 0.2; // Nighttime

const needsTorch = timeOfDay < 6 || timeOfDay > 18;

<FirstPersonView
  lightIntensity={needsTorch ? 1.5 : 0.5}
  lightDistance={needsTorch ? 10 : 6}
/>
```

## Accessibility

### Brightness Options

For visual accessibility:
```tsx
// Accessibility preset
const accessibilityPresets = {
  standard: { intensity: 1.0, distance: 8 },
  highContrast: { intensity: 2.5, distance: 15 },
  lowMotion: { intensity: 1.5, distance: 10 } // No flicker
};
```

### Photosensitivity

Avoid rapid light changes:
```tsx
// Smooth transitions
const [targetIntensity, setTargetIntensity] = useState(1.0);
const [currentIntensity, setCurrentIntensity] = useState(1.0);

useEffect(() => {
  const interval = setInterval(() => {
    setCurrentIntensity(prev => {
      const diff = targetIntensity - prev;
      if (Math.abs(diff) < 0.01) return targetIntensity;
      return prev + diff * 0.1; // Smooth interpolation
    });
  }, 16); // 60 FPS
  return () => clearInterval(interval);
}, [targetIntensity]);
```

## Future Enhancements

Potential additions:
- **Colored lights**: RGB picker for light color
- **Light patterns**: Pulsing, flickering, strobing
- **Multiple light sources**: Lanterns placed in world
- **Shadows**: Real-time shadow casting
- **Light cone visualization**: Show light range in UI
- **Power system**: Battery/fuel management
- **Environmental effects**: Fog affects light distance
- **Multiplayer**: See other players' lights
