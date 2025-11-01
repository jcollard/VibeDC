import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FontAtlasLoader } from '../services/FontAtlasLoader';
import { FontAtlasRenderer } from '../utils/FontAtlasRenderer';
import { FontRegistry } from '../utils/FontRegistry';
import { CombatConstants } from '../models/combat/CombatConstants';
import { UISettings } from '../config/UISettings';
import { CombatRenderer } from '../models/combat/rendering/CombatRenderer';

// Canvas dimensions - same as CombatView
const CANVAS_WIDTH = CombatConstants.CANVAS_WIDTH; // 384 pixels
const CANVAS_HEIGHT = CombatConstants.CANVAS_HEIGHT; // 216 pixels

/**
 * Title screen component that displays the game title, background story, and a Continue button.
 * Uses canvas rendering similar to CombatView for consistency.
 */
export const TitleScreen: React.FC = () => {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Font loader
  const fontLoader = useMemo(() => new FontAtlasLoader(), []);

  // Combat renderer for debug grid rendering
  const renderer = useMemo(
    () => new CombatRenderer(CANVAS_WIDTH, CANVAS_HEIGHT, 12, 12),
    []
  );

  // FPS tracking
  const fpsHistoryRef = useRef<number[]>([]);
  const currentFPSRef = useRef<number>(60);
  const lastFrameTimeRef = useRef<number>(performance.now());

  // Track if fonts are loaded
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Track hover state for Continue button
  const [isContinueHovered, setIsContinueHovered] = useState(false);

  // Track integer scaling setting
  const [integerScalingEnabled, setIntegerScalingEnabled] = useState<boolean>(
    UISettings.isIntegerScalingEnabled()
  );

  // Track manual scale factor - default to 3x
  const [manualScale, setManualScale] = useState<number>(() => {
    const savedScale = UISettings.getManualScale();
    // If no saved scale, default to 3x
    if (savedScale === 0) {
      UISettings.setManualScale(3);
      return 3;
    }
    return savedScale;
  });

  // Track debug overlays
  const [showDebugGrid, setShowDebugGrid] = useState<boolean>(false);
  const [showFPS, setShowFPS] = useState<boolean>(false);

  // Track canvas display style for integer scaling
  const [canvasDisplayStyle, setCanvasDisplayStyle] = useState<{ width: string; height: string }>({
    width: '100%',
    height: '100%',
  });

  // Load fonts
  useEffect(() => {
    const loadFonts = async () => {
      const fontIds = ['15px-dungeonslant', '7px-04b03'];
      await fontLoader.loadAll(fontIds);
      setFontsLoaded(true);
    };

    loadFonts().catch(console.error);
  }, [fontLoader]);

  // Calculate and update canvas display dimensions based on integer scaling setting
  useEffect(() => {
    const updateCanvasStyle = () => {
      const containerRef = displayCanvasRef.current?.parentElement;
      if (!containerRef) {
        setCanvasDisplayStyle({ width: '100%', height: '100%' });
        return;
      }

      const scaledDimensions = UISettings.getIntegerScaledDimensions(
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        containerRef.clientWidth,
        containerRef.clientHeight
      );

      if (scaledDimensions) {
        // Integer scaling enabled - use exact pixel dimensions
        setCanvasDisplayStyle({
          width: `${scaledDimensions.width}px`,
          height: `${scaledDimensions.height}px`,
        });
      } else {
        // Integer scaling disabled - use percentage to fill container
        setCanvasDisplayStyle({ width: '100%', height: '100%' });
      }
    };

    // Update immediately
    updateCanvasStyle();

    // Also update on next frame to ensure container is measured
    requestAnimationFrame(updateCanvasStyle);
  }, [integerScalingEnabled, manualScale]);

  // Handle integer scaling toggle
  const handleIntegerScalingToggle = useCallback((enabled: boolean) => {
    UISettings.setIntegerScaling(enabled);
    setIntegerScalingEnabled(enabled);
  }, []);

  // Handle manual scale change
  const handleManualScaleChange = useCallback((scale: number) => {
    UISettings.setManualScale(scale);
    setManualScale(scale);
  }, []);

  /**
   * Parse text with colored sections marked by **text**.
   * Returns array of text segments with color information.
   */
  const parseColoredText = useCallback((text: string, highlightColor: string = '#ffaa00'): Array<{ text: string; color: string }> => {
    const segments: Array<{ text: string; color: string }> = [];
    const regex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match (normal color)
      if (match.index > lastIndex) {
        segments.push({ text: text.substring(lastIndex, match.index), color: '#ffffff' });
      }

      // Add matched text (highlighted color)
      segments.push({ text: match[1], color: highlightColor });

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push({ text: text.substring(lastIndex), color: '#ffffff' });
    }

    return segments;
  }, []);

  /**
   * Wrap text to fit within a maximum width, handling colored segments.
   * @param text - Text to wrap (may contain **bold** markers)
   * @param maxWidth - Maximum width in pixels
   * @param fontId - Font ID for text measurement
   * @returns Array of lines, each containing segments with color
   */
  const wrapColoredText = useCallback((text: string, maxWidth: number, fontId: string): Array<Array<{ text: string; color: string }>> => {
    const font = FontRegistry.getById(fontId);
    if (!font) {
      return [[{ text, color: '#ffffff' }]];
    }

    // Parse colored segments (preserves spaces within segments)
    const segments = parseColoredText(text);

    // Split segments into individual words while preserving color
    const words: Array<{ word: string; color: string; isSpace: boolean }> = [];
    for (const segment of segments) {
      // Split by spaces but keep track of them
      const parts = segment.text.split(/( )/); // Capture spaces in the split
      for (const part of parts) {
        if (part === ' ') {
          words.push({ word: ' ', color: segment.color, isSpace: true });
        } else if (part.length > 0) {
          words.push({ word: part, color: segment.color, isSpace: false });
        }
      }
    }

    // Wrap words into lines
    const lines: Array<Array<{ text: string; color: string }>> = [];
    let currentLine: Array<{ text: string; color: string }> = [];
    let currentLineWidth = 0;

    for (let i = 0; i < words.length; i++) {
      const { word, color, isSpace } = words[i];

      if (isSpace) {
        // Check if we should add the space or start a new line
        const spaceWidth = FontAtlasRenderer.measureText(' ', font);
        if (currentLine.length > 0 && currentLineWidth + spaceWidth <= maxWidth) {
          currentLine.push({ text: ' ', color });
          currentLineWidth += spaceWidth;
        }
        // Skip spaces at the start of a new line
        continue;
      }

      const wordWidth = FontAtlasRenderer.measureText(word, font);

      if (currentLine.length === 0) {
        // First word on the line
        currentLine.push({ text: word, color });
        currentLineWidth = wordWidth;
      } else if (currentLineWidth + wordWidth <= maxWidth) {
        // Word fits on current line (space already added above)
        currentLine.push({ text: word, color });
        currentLineWidth += wordWidth;
      } else {
        // Word doesn't fit, start new line
        lines.push(currentLine);
        currentLine = [{ text: word, color }];
        currentLineWidth = wordWidth;
      }
    }

    // Add the last line
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }, [parseColoredText]);

  /**
   * Calculate button bounds for hit detection
   */
  const getContinueButtonBounds = useCallback((canvasWidth: number, canvasHeight: number): { x: number; y: number; width: number; height: number } => {
    const buttonFont = FontRegistry.getById('7px-04b03');
    if (!buttonFont) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const buttonText = 'Continue';
    const buttonWidth = FontAtlasRenderer.measureText(buttonText, buttonFont);
    const buttonHeight = buttonFont.charHeight;

    // Position at bottom center
    const x = Math.floor((canvasWidth - buttonWidth) / 2);
    const y = canvasHeight - 16; // 16px from bottom

    return { x, y, width: buttonWidth, height: buttonHeight };
  }, []);

  /**
   * Render the title screen
   */
  const renderFrame = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas || !fontsLoaded) {
      return;
    }

    // Create or get the buffer canvas
    if (!bufferCanvasRef.current) {
      bufferCanvasRef.current = document.createElement('canvas');
    }
    const bufferCanvas = bufferCanvasRef.current;

    // Set canvas sizes
    bufferCanvas.width = CANVAS_WIDTH;
    bufferCanvas.height = CANVAS_HEIGHT;
    displayCanvas.width = CANVAS_WIDTH;
    displayCanvas.height = CANVAS_HEIGHT;

    const ctx = bufferCanvas.getContext('2d');
    if (!ctx) return;

    // Disable image smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;

    // Clear canvas with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Get fonts
    const titleFont = fontLoader.get('15px-dungeonslant');
    const bodyFont = fontLoader.get('7px-04b03');

    if (!titleFont || !bodyFont) {
      return;
    }

    // Render title
    const titleText = 'Shroom of Radiance';
    const titleFontData = FontRegistry.getById('15px-dungeonslant');
    if (titleFontData) {
      const titleWidth = FontAtlasRenderer.measureText(titleText, titleFontData);
      const titleX = Math.floor((CANVAS_WIDTH - titleWidth) / 2);
      const titleY = 16; // 16px from top

      FontAtlasRenderer.renderTextWithShadow(
        ctx,
        titleText,
        titleX,
        titleY,
        '15px-dungeonslant',
        titleFont,
        1,
        'left',
        '#ffaa00' // Orange/gold color for title
      );
    }

    // Render story text
    const storyText = `Long ago, the great mushroom city of **Phlegm** thrived in harmony with the **Mycelial Network**, an ancient fungal consciousness connecting all life in the forest. But darkness came. An entity known only as **The Blight** corrupted the network's heart: the **Shroom of Radiance**, a sacred fungus where new life once flourished.

Now, most of **Phlegm** lies in ruin, overrun by zombifying spores, corrupted myconids, and nightmare creatures born from decay. Only **New Phlegm**, a small defended settlement, remains protected by brave defenders and antifungal wards.`;

    const storyLines = storyText.split('\n\n'); // Split into paragraphs
    const maxWidth = CANVAS_WIDTH - 32; // 16px padding on each side
    const lineSpacing = 8;
    let currentY = 48; // Start below title

    for (const paragraph of storyLines) {
      const wrappedLines = wrapColoredText(paragraph, maxWidth, '7px-04b03');

      for (const line of wrappedLines) {
        let currentX = 16; // Left padding

        // Render each segment in the line
        for (const segment of line) {
          FontAtlasRenderer.renderText(
            ctx,
            segment.text,
            currentX,
            currentY,
            '7px-04b03',
            bodyFont,
            1,
            'left',
            segment.color
          );

          // Move X position for next segment
          const bodyFontData = FontRegistry.getById('7px-04b03');
          if (bodyFontData) {
            currentX += FontAtlasRenderer.measureText(segment.text, bodyFontData);
          }
        }

        currentY += lineSpacing;
      }

      // Add extra spacing between paragraphs
      currentY += lineSpacing;
    }

    // Render Continue button
    const buttonBounds = getContinueButtonBounds(CANVAS_WIDTH, CANVAS_HEIGHT);
    const buttonText = 'Continue';
    const buttonColor = isContinueHovered ? '#ffff00' : '#ffffff'; // Yellow on hover, white otherwise

    FontAtlasRenderer.renderText(
      ctx,
      buttonText,
      buttonBounds.x,
      buttonBounds.y,
      '7px-04b03',
      bodyFont,
      1,
      'left',
      buttonColor
    );

    // Render debug grid overlay (if enabled)
    if (showDebugGrid) {
      const debugFontAtlas = fontLoader.get('7px-04b03');
      if (debugFontAtlas) {
        renderer.renderDebugGrid(ctx, '7px-04b03', debugFontAtlas);
      }
    }

    // Render FPS indicator (if enabled)
    if (showFPS) {
      const fpsFontAtlas = fontLoader.get('7px-04b03');
      if (fpsFontAtlas) {
        const fpsText = `FPS: ${currentFPSRef.current}`;
        const textColor = currentFPSRef.current < 30 ? '#ff0000' : currentFPSRef.current < 50 ? '#ffff00' : '#00ff00';
        FontAtlasRenderer.renderText(
          ctx,
          fpsText,
          CANVAS_WIDTH - 4,
          CANVAS_HEIGHT - 8,
          '7px-04b03',
          fpsFontAtlas,
          1,
          'right',
          textColor
        );
      }
    }

    // Copy buffer to display canvas
    const displayCtx = displayCanvas.getContext('2d');
    if (displayCtx) {
      displayCtx.imageSmoothingEnabled = false;
      displayCtx.drawImage(bufferCanvas, 0, 0);
    }
  }, [fontsLoaded, fontLoader, wrapColoredText, getContinueButtonBounds, isContinueHovered, showDebugGrid, showFPS, renderer]);

  // Animation loop (render continuously for hover updates and FPS calculation)
  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    const animate = (currentTime: number) => {
      // Calculate delta time and FPS
      const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = currentTime;

      if (deltaTime > 0) {
        const fps = 1 / deltaTime;
        fpsHistoryRef.current.push(fps);
        // Keep only last 60 frames for averaging
        if (fpsHistoryRef.current.length > 60) {
          fpsHistoryRef.current.shift();
        }
        // Calculate average FPS
        const avgFPS = fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length;
        currentFPSRef.current = Math.round(avgFPS);
      }

      renderFrame();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastFrameTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [fontsLoaded, renderFrame]);

  // Handle canvas mouse move for hover detection
  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;

    // Check if hovering over Continue button
    const buttonBounds = getContinueButtonBounds(CANVAS_WIDTH, CANVAS_HEIGHT);
    const isHovered = canvasX >= buttonBounds.x &&
                      canvasX <= buttonBounds.x + buttonBounds.width &&
                      canvasY >= buttonBounds.y &&
                      canvasY <= buttonBounds.y + buttonBounds.height;

    setIsContinueHovered(isHovered);
  }, [getContinueButtonBounds]);

  // Handle canvas click
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;

    // Check if clicking Continue button
    const buttonBounds = getContinueButtonBounds(CANVAS_WIDTH, CANVAS_HEIGHT);
    const isClicked = canvasX >= buttonBounds.x &&
                      canvasX <= buttonBounds.x + buttonBounds.width &&
                      canvasY >= buttonBounds.y &&
                      canvasY <= buttonBounds.y + buttonBounds.height;

    if (isClicked) {
      console.log('[TitleScreen] Continue button clicked!');
      // TODO: Navigate to game or next screen
    }
  }, [getContinueButtonBounds]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        zIndex: 3000,
      }}
    >
      {/* Developer Settings Panel */}
      {import.meta.env.DEV && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid #444',
            borderRadius: '4px',
            padding: '12px',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: '12px',
            zIndex: 4000,
          }}
        >
          <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>Developer Settings</div>

          {/* Integer Scaling Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={integerScalingEnabled}
              onChange={(e) => handleIntegerScalingToggle(e.target.checked)}
              style={{
                marginRight: '8px',
                cursor: 'pointer',
                width: '16px',
                height: '16px',
              }}
            />
            <span>Integer Scaling (pixel-perfect)</span>
          </label>

          {/* Debug Grid Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showDebugGrid}
              onChange={(e) => setShowDebugGrid(e.target.checked)}
              style={{
                marginRight: '8px',
                cursor: 'pointer',
                width: '16px',
                height: '16px',
              }}
            />
            <span>Show Debug Grid</span>
          </label>

          {/* FPS Indicator Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showFPS}
              onChange={(e) => setShowFPS(e.target.checked)}
              style={{
                marginRight: '8px',
                cursor: 'pointer',
                width: '16px',
                height: '16px',
              }}
            />
            <span>Show FPS</span>
          </label>

          {/* Manual Scale Selector */}
          <label style={{ display: 'block', marginBottom: '4px' }}>
            Scale Factor:
          </label>
          <select
            value={manualScale}
            onChange={(e) => handleManualScaleChange(Number(e.target.value))}
            style={{
              width: '200px',
              padding: '4px',
              background: '#222',
              border: '1px solid #555',
              borderRadius: '3px',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: '11px',
              marginBottom: '16px',
            }}
          >
            <option value={0}>Auto</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={3}>3x</option>
            <option value={4}>4x</option>
            <option value={5}>5x</option>
          </select>
        </div>
      )}

      <div
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '177.78vh', // 16:9 aspect ratio
          maxHeight: '56.25vw', // 16:9 aspect ratio
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <canvas
          ref={displayCanvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          style={{
            ...canvasDisplayStyle,
            imageRendering: 'pixelated',
            objectFit: 'contain',
            cursor: isContinueHovered ? 'pointer' : 'default',
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
};
