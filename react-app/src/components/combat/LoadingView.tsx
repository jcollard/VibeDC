import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CombatState } from '../../models/combat/CombatState';
import type { CombatLogManager } from '../../models/combat/CombatLogManager';
import { FontAtlasLoader } from '../../services/FontAtlasLoader';
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';

/**
 * Result of a load operation
 */
export interface LoadResult {
  success: boolean;
  combatState?: CombatState;
  combatLog?: CombatLogManager;
  error?: string;
}

/**
 * Props for LoadingView component
 */
export interface LoadingViewProps {
  // Control when loading is active
  isLoading: boolean;

  // Snapshot of current canvas (captured before loading starts)
  canvasSnapshot: HTMLCanvasElement | null;

  // Canvas dimensions (384x216 for combat)
  canvasWidth: number;
  canvasHeight: number;

  // Display style for scaling (should match main canvas style)
  displayStyle?: { width: string; height: string };

  // Callback: Called when fade-to-loading completes (safe to dismount underlying view)
  onFadeInComplete: () => void;

  // Callback: Perform the actual load operation (returns result)
  onLoadReady: () => Promise<LoadResult>;

  // Callback: Load operation complete (success or error)
  onComplete: (result: LoadResult) => void;

  // Callback: Called when entire animation sequence is finished
  onAnimationComplete?: () => void;
}

/**
 * Internal state machine for LoadingView
 */
const LoadingState = {
  IDLE: 'idle',
  FADE_TO_LOADING: 'fade-to-loading',
  LOADING: 'loading',
  FADE_TO_GAME: 'fade-to-game',
  COMPLETE: 'complete',
} as const;

type LoadingState = (typeof LoadingState)[keyof typeof LoadingState];

// Animation timing constants
const FADE_DURATION = 300; // milliseconds per transition (fade-in/fade-out)
const LOADING_MIN_DURATION = 100; // minimum loading screen display time
const DITHER_BLOCK_SIZE = 4; // 4x4 pixel blocks for Bayer dithering
const DITHER_RADIAL_INFLUENCE = 0.2; // center-to-edge gradient strength (0.0-1.0)

/**
 * LoadingView provides smooth dithered transitions when loading new state.
 *
 * The component renders its own canvas positioned absolutely over the game canvas.
 * It captures a snapshot of the current canvas, then dithers between:
 * 1. Current game state → Loading screen (fade-out)
 * 2. Loading screen → Transparent (fade-in, revealing remounted view beneath)
 *
 * This approach completely dismounts and remounts the underlying view,
 * avoiding React state timing issues.
 */
export const LoadingView: React.FC<LoadingViewProps> = ({
  isLoading,
  canvasSnapshot,
  canvasWidth,
  canvasHeight,
  displayStyle = { width: '100%', height: '100%' },
  onFadeInComplete,
  onLoadReady,
  onComplete,
  onAnimationComplete,
}) => {
  // State machine
  const [currentState, setCurrentState] = useState<LoadingState>(LoadingState.IDLE);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [loadResult, setLoadResult] = useState<LoadResult | null>(null);

  // Canvas references
  const loadingCanvasRef = useRef<HTMLCanvasElement>(null);
  const loadingScreenBufferRef = useRef<HTMLCanvasElement | null>(null);

  // Animation timing
  const lastFrameTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Font atlas loader for "Loading..." text
  const fontLoader = useMemo(() => new FontAtlasLoader(), []);

  // Load font atlas on mount
  useEffect(() => {
    fontLoader.load('15px-dungeonslant');
  }, [fontLoader]);

  /**
   * Create loading screen buffer (cached, only created once)
   */
  const createLoadingScreenBuffer = useCallback(
    (width: number, height: number): void => {
      if (loadingScreenBufferRef.current) return; // Already created

      const buffer = document.createElement('canvas');
      buffer.width = width;
      buffer.height = height;

      const ctx = buffer.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = false;

      // Black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Render "Loading..." text using FontAtlasRenderer
      const fontAtlas = fontLoader.get('15px-dungeonslant');
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
    [fontLoader]
  );

  /**
   * Linear easing (uniform transition speed)
   */
  const linearEasing = useCallback((t: number): number => {
    return t; // Direct 1:1 mapping for uniform progression
  }, []);

  /**
   * Bayer 4x4 dither matrix (values 0-15)
   */
  const bayer4x4 = useMemo(
    () => [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5],
    ],
    []
  );

  /**
   * Dither between two buffers
   * @param ctx - Destination context
   * @param fromBuffer - Source buffer (visible at progress=0)
   * @param toBuffer - Destination buffer (visible at progress=1)
   * @param progress - Transition progress (0.0 to 1.0)
   */
  const ditherBetweenBuffers = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      fromBuffer: HTMLCanvasElement,
      toBuffer: HTMLCanvasElement,
      progress: number
    ): void => {
      const width = ctx.canvas.width;
      const height = ctx.canvas.height;

      // Apply linear easing
      const easedProgress = linearEasing(progress);

      // First, draw FROM buffer as base
      ctx.drawImage(fromBuffer, 0, 0);

      // Then, progressively draw TO buffer using dither pattern
      for (let y = 0; y < height; y += DITHER_BLOCK_SIZE) {
        for (let x = 0; x < width; x += DITHER_BLOCK_SIZE) {
          // Calculate position-based alpha (radial gradient from center)
          const centerX = width / 2;
          const centerY = height / 2;
          const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
          const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          const distFactor = 1 - dist / maxDist; // 1.0 at center, 0.0 at edges

          // Combine global progress with distance factor
          const localProgress = easedProgress + distFactor * DITHER_RADIAL_INFLUENCE - 0.1;
          const clampedProgress = Math.max(0, Math.min(1, localProgress));

          // Get Bayer threshold for this position
          const bayerX = Math.floor((x / DITHER_BLOCK_SIZE) % 4);
          const bayerY = Math.floor((y / DITHER_BLOCK_SIZE) % 4);
          const threshold = bayer4x4[bayerY][bayerX] / 15.0;

          // Should we draw the TO buffer at this position?
          if (clampedProgress > threshold) {
            ctx.drawImage(
              toBuffer,
              x,
              y,
              DITHER_BLOCK_SIZE,
              DITHER_BLOCK_SIZE, // source
              x,
              y,
              DITHER_BLOCK_SIZE,
              DITHER_BLOCK_SIZE // destination
            );
          }
        }
      }
    },
    [linearEasing, bayer4x4]
  );

  /**
   * Dither from source buffer to transparent
   * @param ctx - Destination context
   * @param sourceBuffer - Buffer to fade out
   * @param progress - Hide progress (0.0 = fully visible, 1.0 = fully transparent)
   */
  const ditherToTransparent = useCallback(
    (ctx: CanvasRenderingContext2D, sourceBuffer: HTMLCanvasElement, progress: number): void => {
      const width = ctx.canvas.width;
      const height = ctx.canvas.height;

      // Apply easing
      const easedProgress = linearEasing(progress);

      // Clear canvas first (reveals view beneath)
      ctx.clearRect(0, 0, width, height);

      // Then selectively draw source pixels (fewer and fewer as progress increases)
      for (let y = 0; y < height; y += DITHER_BLOCK_SIZE) {
        for (let x = 0; x < width; x += DITHER_BLOCK_SIZE) {
          const centerX = width / 2;
          const centerY = height / 2;
          const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
          const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          const distFactor = 1 - dist / maxDist;

          const localProgress = easedProgress + distFactor * DITHER_RADIAL_INFLUENCE - 0.1;
          const clampedProgress = Math.max(0, Math.min(1, localProgress));

          const bayerX = Math.floor((x / DITHER_BLOCK_SIZE) % 4);
          const bayerY = Math.floor((y / DITHER_BLOCK_SIZE) % 4);
          const threshold = bayer4x4[bayerY][bayerX] / 15.0;

          // Inverted: draw source if progress LESS than threshold
          if (clampedProgress < threshold) {
            ctx.drawImage(
              sourceBuffer,
              x,
              y,
              DITHER_BLOCK_SIZE,
              DITHER_BLOCK_SIZE,
              x,
              y,
              DITHER_BLOCK_SIZE,
              DITHER_BLOCK_SIZE
            );
          }
        }
      }
    },
    [linearEasing, bayer4x4]
  );

  /**
   * Trigger fade-to-loading when isLoading becomes true
   */
  useEffect(() => {
    if (isLoading && currentState === LoadingState.IDLE) {
      setCurrentState(LoadingState.FADE_TO_LOADING);
      setElapsedTime(0);
    }
  }, [isLoading, currentState]);

  /**
   * Animation loop (runs when not IDLE or COMPLETE)
   */
  useEffect(() => {
    if (currentState === LoadingState.IDLE || currentState === LoadingState.COMPLETE) {
      return; // No animation
    }

    const animate = (timestamp: number): void => {
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

  /**
   * Handle state transitions based on elapsed time
   */
  useEffect(() => {
    switch (currentState) {
      case LoadingState.FADE_TO_LOADING:
        if (elapsedTime >= FADE_DURATION) {
          // Fade complete, notify parent (safe to dismount underlying view)
          onFadeInComplete();

          // Start load operation
          setCurrentState(LoadingState.LOADING);
          setElapsedTime(0);

          // Trigger load operation, but wait minimum duration
          Promise.all([
            onLoadReady(),
            new Promise((resolve) => setTimeout(resolve, LOADING_MIN_DURATION)),
          ])
            .then(([result]) => {
              setLoadResult(result as LoadResult);
              onComplete(result as LoadResult);

              // Transition to fade-to-game
              setCurrentState(LoadingState.FADE_TO_GAME);
              setElapsedTime(0);
            })
            .catch((error) => {
              console.error('[LoadingView] Load operation failed:', error);
              const errorResult: LoadResult = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
              setLoadResult(errorResult);
              onComplete(errorResult);

              // Transition to fade-to-game (will fade back to old snapshot)
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

          // Notify parent that animation is complete
          if (onAnimationComplete) {
            onAnimationComplete();
          }

          // Reset to IDLE on next frame
          setTimeout(() => {
            setCurrentState(LoadingState.IDLE);
            setLoadResult(null);
          }, 0);
        }
        break;
    }
  }, [currentState, elapsedTime, onFadeInComplete, onLoadReady, onComplete, onAnimationComplete]);

  /**
   * Render to loading canvas based on current state
   */
  useEffect(() => {
    const canvas = loadingCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // Ensure loading screen buffer is created
    createLoadingScreenBuffer(canvasWidth, canvasHeight);

    const loadingBuffer = loadingScreenBufferRef.current;
    if (!loadingBuffer) return;

    switch (currentState) {
      case LoadingState.IDLE:
      case LoadingState.COMPLETE:
        // Clear canvas (transparent, underlying view visible)
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        break;

      case LoadingState.FADE_TO_LOADING: {
        // Dither FROM snapshot TO loading screen
        const progress = Math.min(elapsedTime / FADE_DURATION, 1.0);
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
        const progress = Math.min(elapsedTime / FADE_DURATION, 1.0);

        if (loadResult && !loadResult.success && canvasSnapshot) {
          // Error: fade back to old snapshot
          ditherBetweenBuffers(ctx, loadingBuffer, canvasSnapshot, progress);
        } else {
          // Success: fade to transparent (reveals remounted view beneath)
          ditherToTransparent(ctx, loadingBuffer, progress);
        }
        break;
      }
    }
  }, [
    currentState,
    elapsedTime,
    canvasSnapshot,
    canvasWidth,
    canvasHeight,
    loadResult,
    createLoadingScreenBuffer,
    ditherBetweenBuffers,
    ditherToTransparent,
  ]);

  return (
    <canvas
      ref={loadingCanvasRef}
      width={canvasWidth}
      height={canvasHeight}
      style={{
        position: 'absolute',
        // Don't set top/left - let it be centered by parent flexbox like the game canvas
        ...displayStyle, // Apply same scaling as main canvas
        zIndex: 1000,
        pointerEvents: currentState === LoadingState.IDLE ? 'none' : 'auto',
        imageRendering: 'pixelated',
        objectFit: 'contain', // Match main canvas objectFit
      }}
    />
  );
};
