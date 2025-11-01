import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { FirstPersonState } from '../../models/firstperson/FirstPersonState';
import { AreaMapRegistry } from '../../utils/AreaMapRegistry';
import { PartyMemberRegistry } from '../../utils/PartyMemberRegistry';
import { FirstPersonInputHandler, InputCommand } from '../../services/FirstPersonInputHandler';
import { MovementValidator } from '../../services/MovementValidator';
import { CombatConstants } from '../../models/combat/CombatConstants';
import { SpriteAssetLoader } from '../../services/SpriteAssetLoader';
import { FontAtlasLoader } from '../../services/FontAtlasLoader';
import { CombatLogManager } from '../../models/combat/CombatLogManager';
import { FirstPersonLayoutManager } from '../../models/firstperson/layouts/FirstPersonLayoutManager';
import { UISettings } from '../../config/UISettings';
import { ThreeJSViewport, type ThreeJSViewportHandle } from './ThreeJSViewport';
import { MinimapRenderer } from '../../models/firstperson/rendering/MinimapRenderer';
import { PartyMemberStatsPanel } from '../../models/firstperson/rendering/PartyMemberStatsPanel';
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';
import { SpriteRegistry } from '../../utils/SpriteRegistry';

interface FirstPersonViewProps {
  mapId: string; // AreaMap ID to load
}

const CANVAS_WIDTH = CombatConstants.CANVAS_WIDTH; // 384
const CANVAS_HEIGHT = CombatConstants.CANVAS_HEIGHT; // 216

/**
 * First Person View component for dungeon exploration
 * Uses same UI layout as CombatView but with 3D viewport in map panel
 */
export const FirstPersonView: React.FC<FirstPersonViewProps> = ({ mapId }) => {
  // Load area map
  const areaMap = useMemo(() => {
    const map = AreaMapRegistry.getById(mapId);
    if (!map) {
      console.error(`[FirstPersonView] Area map '${mapId}' not found`);
      return null;
    }
    return map;
  }, [mapId]);

  // Load default party member for testing
  const defaultPartyMember = useMemo(() => {
    // TODO: Later, allow selecting which party member to use
    // For now, use first available party member or create a test one
    const partyMember = PartyMemberRegistry.createPartyMember('knight-001');
    if (!partyMember) {
      console.error('[FirstPersonView] Failed to create default party member');
      return null;
    }
    return partyMember;
  }, []);

  // Initialize state
  const [firstPersonState, setFirstPersonState] = useState<FirstPersonState | null>(() => {
    if (!areaMap || !defaultPartyMember) return null;

    return {
      playerX: areaMap.playerSpawn.x,
      playerY: areaMap.playerSpawn.y,
      direction: areaMap.playerSpawn.direction,
      map: areaMap,
      exploredTiles: new Set([`${areaMap.playerSpawn.x},${areaMap.playerSpawn.y}`]),
      partyMember: defaultPartyMember,
      targetedObject: null,
    };
  });

  // Input handler
  const inputHandler = useMemo(() => new FirstPersonInputHandler(), []);

  // Sprite/font loaders
  const spriteLoader = useMemo(() => new SpriteAssetLoader(), []);
  const fontLoader = useMemo(() => new FontAtlasLoader(), []);

  // Combat log manager (reused)
  const combatLogManager = useMemo(() => new CombatLogManager({
    maxMessages: 100,
    bufferLines: 21,
    lineHeight: 8,
    defaultColor: '#ffffff',
  }), []);

  // Layout manager
  const layoutManager = useMemo(() => new FirstPersonLayoutManager(), []);

  // Canvas refs
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Track loaded sprites/fonts
  const [spritesLoaded, setSpritesLoaded] = useState(false);
  const fontAtlasRef = useRef<HTMLImageElement | null>(null);
  const spriteImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Animation timing
  const lastFrameTimeRef = useRef<number>(performance.now());
  const animationFrameRef = useRef<number | null>(null);

  // Track window size for scaling
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Track canvas display style for integer scaling
  const [canvasDisplayStyle, setCanvasDisplayStyle] = useState<{ width: string; height: string }>({
    width: '100%',
    height: '100%',
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate canvas display dimensions based on integer scaling
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
        setCanvasDisplayStyle({
          width: `${scaledDimensions.width}px`,
          height: `${scaledDimensions.height}px`,
        });
      } else {
        setCanvasDisplayStyle({ width: '100%', height: '100%' });
      }
    };

    updateCanvasStyle();
    requestAnimationFrame(updateCanvasStyle);
  }, [windowSize.width, windowSize.height]);

  // Load sprites and fonts
  useEffect(() => {
    if (!areaMap) return;

    const loadAssets = async () => {
      // Load layout sprites (dividers used by HorizontalVerticalLayout)
      const layoutSpriteIds = [
        'frames2-1', // Horizontal divider
        'frames2-2', // Vertical divider
      ];

      const spriteImages = new Map<string, HTMLImageElement>();
      const loadedSheets = new Set<string>(); // Track which sheets we've already loaded

      // Load sprites from SpriteRegistry
      const loadPromises = layoutSpriteIds.map(async (spriteId) => {
        const spriteDef = SpriteRegistry.getById(spriteId);
        if (!spriteDef) {
          console.warn(`[FirstPersonView] Sprite not found: ${spriteId}`);
          return;
        }

        // Only load each sprite sheet once (multiple sprites may use the same sheet)
        if (loadedSheets.has(spriteDef.spriteSheet)) {
          return;
        }
        loadedSheets.add(spriteDef.spriteSheet);

        // Load the sprite sheet - key by sheet path, not sprite ID
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.src = spriteDef.spriteSheet;
          img.onload = () => {
            spriteImages.set(spriteDef.spriteSheet, img); // Key by sprite sheet path!
            console.log(`[FirstPersonView] Loaded sprite sheet: ${spriteDef.spriteSheet}`);
            resolve();
          };
          img.onerror = () => {
            console.warn(`[FirstPersonView] Failed to load sprite sheet: ${spriteDef.spriteSheet}`);
            resolve();
          };
        });
      });

      await Promise.all(loadPromises);
      spriteImagesRef.current = spriteImages;
      console.log(`[FirstPersonView] Loaded ${spriteImages.size} sprite sheets`);

      // Load fonts
      await fontLoader.loadAll(['7px-04b03', '15px-dungeonslant']);
      fontAtlasRef.current = fontLoader.get('7px-04b03');

      setSpritesLoaded(true);
    };

    loadAssets().catch(console.error);
  }, [areaMap, spriteLoader, fontLoader]);

  // 3D viewport ref to access its canvas
  const viewportRef = useRef<ThreeJSViewportHandle>(null);

  // Debug mode for showing panel rectangles
  const [showDebugRectangles, setShowDebugRectangles] = useState(false);

  // Render frame function
  const renderFrame = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas || !spritesLoaded || !firstPersonState) {
      return;
    }

    // Create or get the buffer canvas
    if (!bufferCanvasRef.current) {
      bufferCanvasRef.current = document.createElement('canvas');
    }
    const bufferCanvas = bufferCanvasRef.current;

    bufferCanvas.width = CANVAS_WIDTH;
    bufferCanvas.height = CANVAS_HEIGHT;
    displayCanvas.width = CANVAS_WIDTH;
    displayCanvas.height = CANVAS_HEIGHT;

    const ctx = bufferCanvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Get layout regions
    const topPanelRegion = layoutManager.getTurnOrderPanelRegion();
    const combatLogRegion = layoutManager.getCombatLogPanelRegion();
    const topInfoRegion = layoutManager.getTopInfoPanelRegion();
    const bottomInfoRegion = layoutManager.getBottomInfoPanelRegion();
    const mapRegion = layoutManager.getMapViewport(CANVAS_WIDTH, CANVAS_HEIGHT);

    // Render 3D viewport to map region
    const viewportCanvas = viewportRef.current?.getCanvas();
    if (viewportCanvas) {
      ctx.drawImage(
        viewportCanvas,
        0, 0, viewportCanvas.width, viewportCanvas.height, // source
        mapRegion.x, mapRegion.y, mapRegion.width, mapRegion.height // destination
      );
    }

    // Render top panel content (location name)
    if (fontAtlasRef.current) {
      const locationText = firstPersonState.map.name || 'Unknown Location';
      FontAtlasRenderer.renderText(
        ctx,
        locationText,
        topPanelRegion.x + 8,
        topPanelRegion.y + 8,
        '7px-04b03',
        fontAtlasRef.current,
        1,
        'left',
        '#ffffff'
      );
    }

    // Render minimap in top info panel
    MinimapRenderer.render(
      ctx,
      firstPersonState.map,
      firstPersonState.playerX,
      firstPersonState.playerY,
      firstPersonState.direction,
      firstPersonState.exploredTiles,
      topInfoRegion.x,
      topInfoRegion.y,
      topInfoRegion.width,
      topInfoRegion.height
    );

    // Render party member stats in bottom info panel
    if (fontAtlasRef.current) {
      PartyMemberStatsPanel.render(
        ctx,
        firstPersonState.partyMember,
        bottomInfoRegion.x,
        bottomInfoRegion.y,
        bottomInfoRegion.width,
        bottomInfoRegion.height,
        '7px-04b03',
        fontAtlasRef.current
      );
    }

    // Render combat log
    if (fontAtlasRef.current) {
      combatLogManager.render(
        ctx,
        combatLogRegion.x + 4,
        combatLogRegion.y + 4,
        combatLogRegion.width - 8,
        combatLogRegion.height - 8,
        '7px-04b03',
        fontAtlasRef.current
      );
    }

    // DEBUG: Draw colored boxes for each panel region (toggle with F3)
    if (showDebugRectangles) {
      // Top panel - Red
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.fillRect(topPanelRegion.x, topPanelRegion.y, topPanelRegion.width, topPanelRegion.height);

      // Map panel - Green
      ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
      ctx.fillRect(mapRegion.x, mapRegion.y, mapRegion.width, mapRegion.height);

      // Combat log panel - Blue
      ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
      ctx.fillRect(combatLogRegion.x, combatLogRegion.y, combatLogRegion.width, combatLogRegion.height);

      // Top info panel - Yellow
      ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
      ctx.fillRect(topInfoRegion.x, topInfoRegion.y, topInfoRegion.width, topInfoRegion.height);

      // Bottom info panel - Magenta
      ctx.fillStyle = 'rgba(255, 0, 255, 0.3)';
      ctx.fillRect(bottomInfoRegion.x, bottomInfoRegion.y, bottomInfoRegion.width, bottomInfoRegion.height);
    }

    // Render layout overlay (dividers, borders) on top
    layoutManager.renderLayout({
      ctx,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      spriteSize: 12,
      fontId: '7px-04b03',
      fontAtlasImage: fontAtlasRef.current,
      spriteImages: spriteImagesRef.current,
      currentUnit: null,
      targetUnit: null,
    });

    // Copy buffer to display
    const displayCtx = displayCanvas.getContext('2d');
    if (displayCtx) {
      displayCtx.imageSmoothingEnabled = false;
      displayCtx.drawImage(bufferCanvas, 0, 0);
    }
  }, [spritesLoaded, firstPersonState, layoutManager, combatLogManager, viewportRef, showDebugRectangles]);

  // Animation loop
  useEffect(() => {
    if (!spritesLoaded || !firstPersonState) return;

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = currentTime;

      // Update combat log animations
      combatLogManager.update(deltaTime);

      // Render frame
      renderFrame();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastFrameTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [spritesLoaded, firstPersonState, renderFrame, combatLogManager]);

  // Handle F3 key for debug rectangles toggle
  useEffect(() => {
    const handleDebugToggle = (event: KeyboardEvent) => {
      if (event.key === 'F3') {
        event.preventDefault();
        setShowDebugRectangles(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleDebugToggle);
    return () => window.removeEventListener('keydown', handleDebugToggle);
  }, []);

  // Handle keyboard input
  useEffect(() => {
    if (!firstPersonState) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const command = inputHandler.processKeyDown(event);
      if (!command) return;

      if (command === InputCommand.MoveForward || command === InputCommand.MoveBackward) {
        // Calculate target position based on forward/backward
        const targetPos = FirstPersonInputHandler.calculateTargetPosition(
          firstPersonState.playerX,
          firstPersonState.playerY,
          firstPersonState.direction,
          command === InputCommand.MoveForward
        );

        // For backward movement, just check if target tile is passable (no door auto-continuation)
        if (command === InputCommand.MoveBackward) {
          const targetTile = firstPersonState.map.getTile(targetPos.x, targetPos.y);
          if (targetTile && targetTile.passable && targetTile.walkable) {
            // Block input during animation
            inputHandler.blockInput();

            // Update state
            setFirstPersonState(prev => ({
              ...prev!,
              playerX: targetPos.x,
              playerY: targetPos.y,
              exploredTiles: new Set([...prev!.exploredTiles, `${targetPos.x},${targetPos.y}`])
            }));

            combatLogManager.addMessage('You step backward.');

            // Unblock input after animation completes
            setTimeout(() => inputHandler.unblockInput(), 200);
          } else {
            combatLogManager.addMessage('You cannot move that way.');
          }
        } else {
          // Forward movement - use MovementValidator for door auto-continuation
          const result = MovementValidator.validateMovement(
            firstPersonState.map,
            firstPersonState.playerX,
            firstPersonState.playerY,
            firstPersonState.direction
          );

          if (result.success && result.finalX !== undefined && result.finalY !== undefined) {
            // Block input during animation
            inputHandler.blockInput();

            // Update state
            setFirstPersonState(prev => ({
              ...prev!,
              playerX: result.finalX!,
              playerY: result.finalY!,
              exploredTiles: new Set([...prev!.exploredTiles, `${result.finalX},${result.finalY}`])
            }));

            // Log movement
            if (result.passThroughDoor) {
              combatLogManager.addMessage('You pass through the doorway.');
            } else {
              combatLogManager.addMessage('You move forward.');
            }

            // Unblock input after animation completes (handled in ThreeJSViewport callback)
            setTimeout(() => inputHandler.unblockInput(), 200);
          } else {
            // Movement blocked
            combatLogManager.addMessage(result.reason || 'You cannot move that way.');
          }
        }
      } else if (command === InputCommand.StrafeLeft || command === InputCommand.StrafeRight) {
        // Calculate strafe target position
        const targetPos = FirstPersonInputHandler.calculateStrafePosition(
          firstPersonState.playerX,
          firstPersonState.playerY,
          firstPersonState.direction,
          command === InputCommand.StrafeLeft
        );

        // Check if target position is passable
        const targetTile = firstPersonState.map.getTile(targetPos.x, targetPos.y);
        if (targetTile && targetTile.passable && targetTile.walkable) {
          // Block input during animation
          inputHandler.blockInput();

          // Update state
          setFirstPersonState(prev => ({
            ...prev!,
            playerX: targetPos.x,
            playerY: targetPos.y,
            exploredTiles: new Set([...prev!.exploredTiles, `${targetPos.x},${targetPos.y}`])
          }));

          combatLogManager.addMessage('You sidestep.');

          // Unblock input after animation completes
          setTimeout(() => inputHandler.unblockInput(), 200);
        } else {
          combatLogManager.addMessage('You cannot move that way.');
        }
      } else if (command === InputCommand.TurnLeft || command === InputCommand.TurnRight) {
        // Calculate new direction
        const newDirection = FirstPersonInputHandler.calculateNewDirection(
          firstPersonState.direction,
          command === InputCommand.TurnLeft ? 'left' : 'right'
        );

        // Block input during rotation
        inputHandler.blockInput();

        // Update state
        setFirstPersonState(prev => ({
          ...prev!,
          direction: newDirection
        }));

        // Unblock input after rotation completes
        setTimeout(() => inputHandler.unblockInput(), 100);
      } else if (command === InputCommand.Interact) {
        // TODO: Implement interaction system (doors, chests, NPCs)
        combatLogManager.addMessage('Interact not yet implemented.');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [firstPersonState, inputHandler, combatLogManager]);

  // Show error if map not found
  if (!areaMap || !firstPersonState) {
    return (
      <div style={{ color: 'white', padding: '20px' }}>
        Error: Area map '{mapId}' not found or failed to load party member
      </div>
    );
  }

  // Calculate 3D viewport position within the scaled canvas
  const mapRegion = layoutManager.getMapViewport(CANVAS_WIDTH, CANVAS_HEIGHT);

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
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '177.78vh',
          maxHeight: '56.25vw',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Canvas with 2D UI elements */}
        <canvas
          ref={displayCanvasRef}
          style={{
            ...canvasDisplayStyle,
            imageRendering: 'pixelated',
            objectFit: 'contain',
            cursor: 'default',
            position: 'relative',
            pointerEvents: 'none',
          } as React.CSSProperties}
        />

        {/* Offscreen 3D viewport - rendered to its own canvas, then composited onto main canvas */}
        {spritesLoaded && firstPersonState && (
          <ThreeJSViewport
            ref={viewportRef}
            areaMap={firstPersonState.map}
            playerX={firstPersonState.playerX}
            playerY={firstPersonState.playerY}
            direction={firstPersonState.direction}
            width={mapRegion.width}
            height={mapRegion.height}
            onAnimationComplete={() => inputHandler.unblockInput()}
          />
        )}
      </div>
    </div>
  );
};
