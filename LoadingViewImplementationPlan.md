# LoadingView Implementation Plan

**Version:** 1.0
**Date:** 2025-10-27
**Status:** Ready for Implementation

---

## Overview

Implement a generic **LoadingView** component that provides smooth dithered transitions when loading new combat state. The component completely dismounts and remounts CombatView to ensure clean state loading without React timing issues.

---

## Design Summary

### Core Concept

1. **LoadingView** is a separate, always-mounted component that renders its own canvas over the game
2. When loading starts, LoadingView captures a snapshot of the current game canvas
3. LoadingView dithers FROM snapshot TO loading screen (fade-out, 300ms)
4. CombatView dismounts safely (loading screen covers it)
5. Load operation completes, CombatView remounts with new state (still hidden)
6. LoadingView dithers FROM loading screen TO transparent (fade-in, 300ms)
7. LoadingView becomes invisible, revealing the remounted CombatView beneath

### Key Advantages

✅ **No React timing issues** - CombatView dismounts/remounts completely
✅ **Clean state separation** - LoadingView controls visual, CombatView handles game state
✅ **No stale state flicker** - New CombatView renders from scratch with fresh state
✅ **Reusable pattern** - Can be used for any full-reload scenario
✅ **Error handling via rollback** - On error, restores previous state by re-showing old canvas snapshot

---

## Architecture

### Component Hierarchy

```
<div className="combat-container" style={{ position: 'relative' }}>
  {/* Always rendered, controls loading transitions */}
  <LoadingView
    isLoading={isLoading}
    canvasSnapshot={canvasSnapshotRef.current}
    canvasWidth={384}
    canvasHeight={216}
    onFadeInComplete={() => {
      // Safe to dismount CombatView
      setShowCombatView(false);
    }}
    onLoadReady={async () => {
      // Perform load operation
      const result = await performLoad();
      return result; // { success, combatState, combatLog, error }
    }}
    onComplete={(result) => {
      if (result.success) {
        // Apply new state and remount
        setCombatState(result.combatState);
        setCombatLog(result.combatLog);
        setShowCombatView(true);
        setIsLoading(false);
      } else {
        // Error: rollback to previous state
        setIsLoading(false);
        // LoadingView will fade back to old snapshot
      }
    }}
  />

  {/* Conditionally rendered based on loading state */}
  {showCombatView && (
    <CombatView
      encounter={encounter}
      initialState={combatState}
      onStateChange={setCombatState}
    />
  )}
</div>
```

---

## State Machine

### LoadingView States

```typescript
enum LoadingState {
  IDLE = 'idle',              // Not loading, invisible
  FADE_TO_LOADING = 'fade-to-loading',  // Dithering TO loading screen (300ms)
  LOADING = 'loading',        // CombatView dismounted, load in progress
  FADE_TO_GAME = 'fade-to-game',        // Dithering TO transparent (300ms)
  COMPLETE = 'complete',      // Transition complete, back to IDLE
}
```

### State Transitions

```
IDLE
  ↓ (isLoading=true)
FADE_TO_LOADING
  ↓ (300ms elapsed)
  ↓ (call onFadeInComplete)
LOADING
  ↓ (onLoadReady resolves)
  ↓ (call onComplete with result)
  ↓ (parent remounts CombatView)
FADE_TO_GAME
  ↓ (300ms elapsed)
COMPLETE → IDLE
```

### Error Handling Flow

```
LOADING
  ↓ (onLoadReady rejects/returns error)
  ↓ (call onComplete with error result)
FADE_TO_GAME (but fading back to OLD snapshot)
  ↓ (300ms elapsed)
COMPLETE → IDLE (CombatView still showing old state)
```

---

## Implementation Details

### 1. LoadingView Component

**File:** `react-app/src/components/combat/LoadingView.tsx`

#### Component Interface

```typescript
export interface LoadingViewProps {
  // Control when loading is active
  isLoading: boolean;

  // Snapshot of current canvas (captured before loading starts)
  canvasSnapshot: HTMLCanvasElement | null;

  // Canvas dimensions (384x216)
  canvasWidth: number;
  canvasHeight: number;

  // Callback: Called when fade-to-loading completes (safe to dismount CombatView)
  onFadeInComplete: () => void;

  // Callback: Perform the actual load operation (returns result)
  onLoadReady: () => Promise<LoadResult>;

  // Callback: Load operation complete (success or error)
  onComplete: (result: LoadResult) => void;
}

export interface LoadResult {
  success: boolean;
  combatState?: CombatState;
  combatLog?: CombatLogManager;
  error?: string;
}

export const LoadingView: React.FC<LoadingViewProps> = (props) => {
  // Implementation details below
};
```

#### Internal State

```typescript
const [currentState, setCurrentState] = useState<LoadingState>(LoadingState.IDLE);
const [elapsedTime, setElapsedTime] = useState<number>(0);
const [loadResult, setLoadResult] = useState<LoadResult | null>(null);

// Canvas references
const loadingCanvasRef = useRef<HTMLCanvasElement>(null);
const loadingScreenBufferRef = useRef<HTMLCanvasElement | null>(null);

// Animation timing
const lastFrameTimeRef = useRef<number>(0);
const animationFrameRef = useRef<number | null>(null);
```

#### Rendering Buffers

**Loading Screen Buffer (created once, cached):**

```typescript
const createLoadingScreenBuffer = useCallback(
  (width: number, height: number, fontAtlas: HTMLImageElement | null) => {
    if (loadingScreenBufferRef.current) return; // Already created

    const buffer = document.createElement('canvas');
    buffer.width = width;
    buffer.height = height;

    const ctx = buffer.getContext('2d');
    if (!ctx) return;

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Render "Loading..." text using FontAtlasRenderer
    if (fontAtlas) {
      FontAtlasRenderer.renderText(
        ctx,
        'Loading...',
        width / 2,
        height / 2 - 8,
        '15px-dungeonslant',
        fontAtlas,
        1,
        'center',
        '#ffffff'
      );
    } else {
      // Fallback to canvas text
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Loading...', width / 2, height / 2);
    }

    loadingScreenBufferRef.current = buffer;
  },
  []
);
```

#### Dithering Logic

**Two-Buffer Dithering (FROM buffer A TO buffer B):**

```typescript
const ditherBetweenBuffers = (
  ctx: CanvasRenderingContext2D,
  fromBuffer: HTMLCanvasElement,
  toBuffer: HTMLCanvasElement,
  progress: number // 0.0 = all FROM, 1.0 = all TO
): void => {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const pixelSize = 4; // 4x4 dither blocks

  // Apply easing to progress
  const easedProgress = easeInOutCubic(progress);

  // Bayer matrix 4x4 (values 0-15)
  const bayer4x4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];

  // First, draw FROM buffer as base
  ctx.drawImage(fromBuffer, 0, 0);

  // Then, progressively draw TO buffer using dither pattern
  for (let y = 0; y < height; y += pixelSize) {
    for (let x = 0; x < width; x += pixelSize) {
      // Calculate position-based alpha (radial gradient from center)
      const centerX = width / 2;
      const centerY = height / 2;
      const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const distFactor = 1 - dist / maxDist; // 1.0 at center, 0.0 at edges

      // Combine global progress with distance factor
      const localProgress = easedProgress + distFactor * 0.2 - 0.1;
      const clampedProgress = Math.max(0, Math.min(1, localProgress));

      // Get Bayer threshold for this position
      const bayerX = (x / pixelSize) % 4;
      const bayerY = (y / pixelSize) % 4;
      const threshold = bayer4x4[bayerY][bayerX] / 15.0;

      // Should we draw the TO buffer at this position?
      if (clampedProgress > threshold) {
        ctx.drawImage(
          toBuffer,
          x, y, pixelSize, pixelSize, // source
          x, y, pixelSize, pixelSize  // destination
        );
      }
    }
  }
};

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
```

**For Fade-In (dither TO transparent):**

```typescript
const ditherToTransparent = (
  ctx: CanvasRenderingContext2D,
  sourceBuffer: HTMLCanvasElement,
  progress: number // 0.0 = fully visible, 1.0 = fully transparent
): void => {
  // Inverted: progressively HIDE source buffer
  const hideProgress = progress;

  // Clear canvas first (reveals CombatView beneath)
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Then selectively draw loading screen pixels (fewer and fewer as progress increases)
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const pixelSize = 4;
  const easedProgress = easeInOutCubic(hideProgress);

  const bayer4x4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];

  for (let y = 0; y < height; y += pixelSize) {
    for (let x = 0; x < width; x += pixelSize) {
      const centerX = width / 2;
      const centerY = height / 2;
      const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const distFactor = 1 - dist / maxDist;

      const localProgress = easedProgress + distFactor * 0.2 - 0.1;
      const clampedProgress = Math.max(0, Math.min(1, localProgress));

      const bayerX = (x / pixelSize) % 4;
      const bayerY = (y / pixelSize) % 4;
      const threshold = bayer4x4[bayerY][bayerX] / 15.0;

      // Inverted: draw source if progress LESS than threshold
      if (clampedProgress < threshold) {
        ctx.drawImage(
          sourceBuffer,
          x, y, pixelSize, pixelSize,
          x, y, pixelSize, pixelSize
        );
      }
    }
  }
};
```

#### Animation Loop

```typescript
useEffect(() => {
  if (currentState === LoadingState.IDLE || currentState === LoadingState.COMPLETE) {
    return; // No animation
  }

  const animate = (timestamp: number) => {
    if (lastFrameTimeRef.current === 0) {
      lastFrameTimeRef.current = timestamp;
    }

    const deltaTime = timestamp - lastFrameTimeRef.current;
    lastFrameTimeRef.current = timestamp;

    setElapsedTime((prev) => prev + deltaTime);

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Start animation loop
  lastFrameTimeRef.current = 0;
  setElapsedTime(0);
  animationFrameRef.current = requestAnimationFrame(animate);

  return () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };
}, [currentState]);
```

#### State Transitions

```typescript
// Trigger fade-to-loading when isLoading becomes true
useEffect(() => {
  if (isLoading && currentState === LoadingState.IDLE) {
    setCurrentState(LoadingState.FADE_TO_LOADING);
    setElapsedTime(0);
  }
}, [isLoading, currentState]);

// Handle state transitions based on elapsed time
useEffect(() => {
  const FADE_DURATION = 300; // milliseconds

  switch (currentState) {
    case LoadingState.FADE_TO_LOADING:
      if (elapsedTime >= FADE_DURATION) {
        // Fade complete, notify parent
        onFadeInComplete();
        // Start load operation
        setCurrentState(LoadingState.LOADING);
        setElapsedTime(0);

        // Trigger load operation
        onLoadReady().then((result) => {
          setLoadResult(result);
          onComplete(result);
          // Transition to fade-to-game
          setCurrentState(LoadingState.FADE_TO_GAME);
          setElapsedTime(0);
        });
      }
      break;

    case LoadingState.FADE_TO_GAME:
      if (elapsedTime >= FADE_DURATION) {
        // Fade complete, return to idle
        setCurrentState(LoadingState.COMPLETE);
        setElapsedTime(0);

        // Reset to IDLE on next frame
        setTimeout(() => {
          setCurrentState(LoadingState.IDLE);
          setLoadResult(null);
        }, 0);
      }
      break;
  }
}, [currentState, elapsedTime, onFadeInComplete, onLoadReady, onComplete]);
```

#### Render Method

```typescript
// Render to loading canvas based on current state
useEffect(() => {
  const canvas = loadingCanvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;

  // Ensure loading screen buffer is created
  createLoadingScreenBuffer(canvasWidth, canvasHeight, fontAtlasImage);

  const loadingBuffer = loadingScreenBufferRef.current;
  if (!loadingBuffer) return;

  switch (currentState) {
    case LoadingState.IDLE:
    case LoadingState.COMPLETE:
      // Clear canvas (transparent, CombatView visible)
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      break;

    case LoadingState.FADE_TO_LOADING: {
      // Dither FROM snapshot TO loading screen
      const progress = Math.min(elapsedTime / 300, 1.0);
      if (canvasSnapshot) {
        ditherBetweenBuffers(ctx, canvasSnapshot, loadingBuffer, progress);
      } else {
        // No snapshot, just show loading screen
        ctx.drawImage(loadingBuffer, 0, 0);
      }
      break;
    }

    case LoadingState.LOADING:
      // Show loading screen fully
      ctx.drawImage(loadingBuffer, 0, 0);
      break;

    case LoadingState.FADE_TO_GAME: {
      // Dither FROM loading screen TO transparent
      const progress = Math.min(elapsedTime / 300, 1.0);

      if (loadResult && !loadResult.success && canvasSnapshot) {
        // Error: fade back to old snapshot
        ditherBetweenBuffers(ctx, loadingBuffer, canvasSnapshot, progress);
      } else {
        // Success: fade to transparent (reveals remounted CombatView)
        ditherToTransparent(ctx, loadingBuffer, progress);
      }
      break;
    }
  }
}, [currentState, elapsedTime, canvasSnapshot, canvasWidth, canvasHeight, loadResult]);
```

#### JSX

```typescript
return (
  <canvas
    ref={loadingCanvasRef}
    width={canvasWidth}
    height={canvasHeight}
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      ...displayStyle, // Apply same scaling as main canvas (respects integer scaling)
      zIndex: 1000,
      pointerEvents: currentState === LoadingState.IDLE ? 'none' : 'auto',
      imageRendering: 'pixelated',
      objectFit: 'contain', // Match main canvas objectFit
    }}
  />
);
```

---

### 2. CombatView Updates

**File:** `react-app/src/components/combat/CombatView.tsx`

#### New State Variables

```typescript
// Loading state
const [isLoading, setIsLoading] = useState(false);
const [showCombatView, setShowCombatView] = useState(true);
const canvasSnapshotRef = useRef<HTMLCanvasElement | null>(null);
```

#### Canvas Snapshot Utility

```typescript
const captureCanvasSnapshot = useCallback((): HTMLCanvasElement | null => {
  const displayCanvas = displayCanvasRef.current;
  if (!displayCanvas) return null;

  const snapshot = document.createElement('canvas');
  snapshot.width = CANVAS_WIDTH;
  snapshot.height = CANVAS_HEIGHT;

  const ctx = snapshot.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(displayCanvas, 0, 0);

  return snapshot;
}, []);
```

#### Load Handler (Import)

```typescript
const handleImport = useCallback(async () => {
  // Show file picker
  const result = await importCombatFromFile();
  if (!result) return; // User cancelled or error

  // Capture current canvas state
  canvasSnapshotRef.current = captureCanvasSnapshot();

  // Trigger loading
  setIsLoading(true);
}, [captureCanvasSnapshot]);
```

#### LoadingView Callbacks

```typescript
const handleFadeInComplete = useCallback(() => {
  // Safe to dismount CombatView now
  setShowCombatView(false);
}, []);

const handleLoadReady = useCallback(async (): Promise<LoadResult> => {
  try {
    // Perform actual load (this is fast since file was already parsed)
    const result = await importCombatFromFile();

    if (result) {
      // Reconstruct CombatLogManager from JSON
      const newCombatLog = new CombatLogManager(
        CombatConstants.COMBAT_LOG.CONFIG
      );

      if (result.combatLog) {
        // Restore messages (without animation state)
        result.combatLog.messages.forEach((msg: string) => {
          newCombatLog.addMessage(msg, Infinity); // Instant, no animation
        });
      }

      return {
        success: true,
        combatState: result.combatState,
        combatLog: newCombatLog,
      };
    } else {
      return {
        success: false,
        error: 'Failed to load combat state',
      };
    }
  } catch (error) {
    console.error('[CombatView] Load error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}, []);

const handleLoadComplete = useCallback(
  (result: LoadResult) => {
    if (result.success && result.combatState && result.combatLog) {
      // Apply new state
      setCombatState(result.combatState);

      // Replace combat log manager
      combatLogManagerRef.current = result.combatLog;

      // Remount CombatView (will render new state)
      setShowCombatView(true);

      // Animation will continue (fade-to-game)
    } else {
      // Error: keep old state, CombatView stays dismounted briefly
      console.error('[CombatView] Load failed:', result.error);

      // Remount with OLD state (rollback)
      setShowCombatView(true);

      // Animation will fade back to old snapshot
    }
  },
  []
);
```

#### Updated JSX

```typescript
return (
  <div className="combat-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
    {/* Developer settings panel, etc. */}

    {/* LoadingView overlay */}
    <LoadingView
      isLoading={isLoading}
      canvasSnapshot={canvasSnapshotRef.current}
      canvasWidth={CANVAS_WIDTH}
      canvasHeight={CANVAS_HEIGHT}
      displayStyle={canvasDisplayStyle} // Pass scaling style for integer scaling support
      onFadeInComplete={handleFadeInComplete}
      onLoadReady={handleLoadReady}
      onComplete={handleLoadComplete}
    />

    {/* CombatView (conditionally rendered) */}
    {showCombatView && (
      <canvas
        ref={displayCanvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={canvasDisplayStyle}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onClick={handleCanvasClick}
      />
    )}
  </div>
);
```

---

## File Structure

```
react-app/src/
├── components/combat/
│   ├── LoadingView.tsx          # NEW: Generic loading transition component
│   └── CombatView.tsx           # MODIFIED: Conditional rendering, snapshot capture
```

---

## Implementation Checklist

### Phase 1: LoadingView Component (Core)

- [ ] Create `LoadingView.tsx` with TypeScript interface
- [ ] Implement state machine (enum + useState)
- [ ] Implement loading screen buffer creation (with FontAtlasRenderer)
- [ ] Implement Bayer matrix dithering utilities
- [ ] Implement `ditherBetweenBuffers()` method
- [ ] Implement `ditherToTransparent()` method
- [ ] Implement animation loop (useEffect with requestAnimationFrame)
- [ ] Implement state transition logic (useEffect watching elapsedTime)
- [ ] Implement render logic (useEffect watching currentState)
- [ ] Implement canvas JSX with proper styling

### Phase 2: CombatView Integration

- [ ] Add loading state variables (`isLoading`, `showCombatView`, `canvasSnapshotRef`)
- [ ] Implement `captureCanvasSnapshot()` utility
- [ ] Update `handleImport()` to capture snapshot and trigger loading
- [ ] Implement `handleFadeInComplete()` callback
- [ ] Implement `handleLoadReady()` callback (perform load)
- [ ] Implement `handleLoadComplete()` callback (apply state or rollback)
- [ ] Update JSX to conditionally render CombatView
- [ ] Add LoadingView component to JSX

### Phase 3: Testing

- [ ] **Test 1:** Fast load (< 300ms) - should show full 600ms transition
- [ ] **Test 2:** Slow load (> 300ms) - should show loading screen during wait
- [ ] **Test 3:** Error handling - should fade back to old state
- [ ] **Test 4:** Visual inspection - no flicker, smooth dither transitions
- [ ] **Test 5:** Text rendering - "Loading..." should be part of dither (not overlay)
- [ ] **Test 6:** State correctness - loaded state should match saved state
- [ ] **Test 7:** Canvas snapshot - old state should be preserved during error rollback
- [ ] **Test 8:** Multiple loads - should work correctly when triggered multiple times

### Phase 4: Polish

- [ ] Add error message display in LoadingView (optional)
- [ ] Add progress indicator for long loads (optional)
- [ ] Optimize dithering performance if needed
- [ ] Add comments and documentation
- [ ] Consider generic reusability (export for use elsewhere)

---

## Open Questions / Decisions

### 1. Font Atlas Loading

**Question:** What if font atlas isn't loaded when LoadingView needs it?

**Answer:** LoadingView has a fallback to canvas text rendering. This is acceptable since loading transitions are infrequent.

**Action:** Use FontAtlasLoader.get() and fallback to ctx.fillText() if null.

---

### 2. File Picker Timing

**Question:** Should file picker appear before or after fade-to-loading?

**Answer:** Per your requirements, **BEFORE**. User picks file first, THEN fade-in starts.

**Action:** Call `importCombatFromFile()` in `handleImport()`, which shows picker immediately. Only trigger loading AFTER file is selected and parsed.

---

### 3. CombatLogManager Reconstruction

**Question:** How do we handle CombatLogManager during load?

**Answer:** Create new instance, restore messages with `Infinity` chars/sec (instant, no animation). Don't restore animation state (progress, queues, etc.).

**Action:** In `handleLoadReady()`, create new CombatLogManager and restore messages from JSON.

---

### 4. Generic Reusability

**Question:** Should LoadingView be generic (not combat-specific)?

**Answer:** Per your requirements, **YES** - start generic.

**Action:** LoadingView takes canvas dimensions as props, doesn't import combat-specific code. Can be used for any full-screen transition.

---

### 5. Error Display

**Question:** Should LoadingView show error messages, or just rollback silently?

**Answer:** Start with **silent rollback** to old state. Error logging to console.

**Future Enhancement:** Add optional error message rendering (pass error string to LoadingView, render during FADE_TO_GAME if present).

---

## Performance Considerations

### Dithering Performance

- **Canvas size:** 384×216 = 82,944 pixels
- **Dither block size:** 4×4 = 16 pixels per block
- **Total blocks:** 82,944 / 16 = 5,184 blocks
- **Per-frame cost:** ~5,000 drawImage calls during transition

**Expected:** 60 FPS achievable on modern hardware. If performance issues arise, can optimize by:
1. Increase dither block size to 8×8 (reduces blocks to 1,296)
2. Pre-render intermediate frames
3. Use OffscreenCanvas for parallel rendering

### Canvas Snapshot Cost

- **Operation:** 384×216 canvas copy (~160KB of pixel data)
- **Frequency:** Once per load operation
- **Expected:** < 1ms on modern hardware

### Memory Overhead

- **Loading screen buffer:** 384×216 canvas (cached, created once)
- **Canvas snapshot:** 384×216 canvas (created per load, garbage collected after)
- **Total peak overhead:** ~320KB during transition

**Acceptable:** Negligible compared to sprite/font assets.

---

## Success Criteria

1. ✅ **Smooth fade-to-loading:** Dithers from current game TO loading screen (300ms)
2. ✅ **Loading screen displays:** "Loading..." text is part of dithered buffer (not overlay)
3. ✅ **CombatView dismounts cleanly:** No React warnings, no stale state
4. ✅ **Load operation completes:** New state is applied correctly
5. ✅ **CombatView remounts fresh:** Renders new state from scratch, no flicker
6. ✅ **Smooth fade-to-game:** Dithers from loading screen TO transparent (300ms)
7. ✅ **Error handling works:** On error, fades back to old snapshot, CombatView shows old state
8. ✅ **No visual artifacts:** No flicker, no black frames, no text overlay issues
9. ✅ **Reusable pattern:** LoadingView is generic, can be used elsewhere

---

## Risk Assessment

### High Risk

None identified. This approach sidesteps the React timing issues that plagued the phase handler approach.

### Medium Risk

- **Performance:** Dithering 5,000+ blocks per frame could be slow on low-end hardware
  - **Mitigation:** Test on target hardware, optimize if needed (larger blocks, pre-rendering)

### Low Risk

- **Font atlas loading:** May not be available when needed
  - **Mitigation:** Fallback to canvas text rendering
- **Error handling:** Edge cases in file parsing
  - **Mitigation:** Try/catch blocks, rollback to old state

---

## Estimated Effort

- **Phase 1 (LoadingView Core):** 2-3 hours
- **Phase 2 (CombatView Integration):** 1-2 hours
- **Phase 3 (Testing):** 1-2 hours
- **Phase 4 (Polish):** 0.5-1 hour

**Total:** 4.5-8 hours

**Confidence Level:** High (this approach is much simpler than phase handler approach)

---

## Future Enhancements

1. **Error message display:** Show error text during fade-to-game on failure
2. **Progress indicator:** Show percentage/spinner during long loads
3. **Customizable loading screen:** Allow passing custom buffer instead of generic "Loading..."
4. **Animation variations:** Different dither patterns, fade styles
5. **Sound effects:** Add audio cues for transitions (optional)
6. **Retry mechanism:** On error, show "Retry" button instead of automatic rollback

---

## Summary

This LoadingView approach is **significantly cleaner** than the phase handler approach:

- ✅ No React state timing issues
- ✅ No stale state flicker
- ✅ Clean separation of concerns
- ✅ Reusable pattern
- ✅ Simple error handling via rollback
- ✅ Guaranteed fresh state on remount

The key insight is that by **dismounting and remounting CombatView entirely**, we avoid all the complexity of managing state updates during transitions. LoadingView acts as a pure visual overlay that controls the transition, while CombatView handles game state in isolation.

**Ready to implement!**
