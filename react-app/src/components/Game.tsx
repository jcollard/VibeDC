import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { FirstPersonView } from './FirstPersonView';
import { DebugPanel } from './DebugPanel';
import { MapEditor } from './MapEditor';
import { CombatView } from './CombatView';
import { parseMap } from '../utils/mapParser';
import { UserInputConfig, type PlayerAction } from '../models/UserInputConfig';
import { Player } from '../models/Player';
import { MapData } from '../models/MapData';
import './Game.css';

interface SinglePlayerState {
  map: MapData;
  player: Player;
}

export const Game: React.FC = () => {
  const [gameState, setGameState] = useState<SinglePlayerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Light control state
  const [lightIntensity, setLightIntensity] = useState<number>(3.0);
  const [lightDistance, setLightDistance] = useState<number>(6.0);
  const [lightYOffset, setLightYOffset] = useState<number>(0.0);
  const [lightDecay, setLightDecay] = useState<number>(0.5);
  const [lightColor, setLightColor] = useState<string>('#fff7e5');

  // Debug panel visibility
  const [debugPanelVisible, setDebugPanelVisible] = useState<boolean>(false);

  // Map editor visibility
  const [mapEditorVisible, setMapEditorVisible] = useState<boolean>(false);

  // Combat view visibility
  const [combatViewVisible, setCombatViewVisible] = useState<boolean>(false);

  // Initialize input configuration
  const inputConfig = useMemo(() => UserInputConfig.load(), []);

  // Expose debug panel toggle to console
  useEffect(() => {
    (window as any).showDebugInfo = () => {
      setDebugPanelVisible(true);
      console.log('Debug panel shown');
    };
    (window as any).hideDebugInfo = () => {
      setDebugPanelVisible(false);
      console.log('Debug panel hidden');
    };
    (window as any).toggleDebugInfo = () => {
      setDebugPanelVisible(prev => !prev);
      console.log('Debug panel toggled');
    };

    return () => {
      delete (window as any).showDebugInfo;
      delete (window as any).hideDebugInfo;
      delete (window as any).toggleDebugInfo;
    };
  }, []);

  // Expose map editor toggle to console (development only)
  useEffect(() => {
    // Only expose map editor in development mode
    if (import.meta.env.DEV) {
      (window as any).showMapEditor = () => {
        setMapEditorVisible(true);
        console.log('Map editor shown');
      };
      (window as any).hideMapEditor = () => {
        setMapEditorVisible(false);
        console.log('Map editor hidden');
      };
      (window as any).toggleMapEditor = () => {
        setMapEditorVisible(prev => !prev);
        console.log('Map editor toggled');
      };

      return () => {
        delete (window as any).showMapEditor;
        delete (window as any).hideMapEditor;
        delete (window as any).toggleMapEditor;
      };
    }
  }, []);

  // Initialize game
  useEffect(() => {
    const initGame = async () => {
      try {
        // Load map
        const response = await fetch('/test.map');
        const mapText = await response.text();
        const { grid } = parseMap(mapText);

        // Convert to MapData
        const map = MapData.fromStringArray(grid, 'Test Map');

        // Find spawn point (first '.' in the grid)
        let spawnX = 1;
        let spawnY = 1;

        for (let y = 0; y < map.height; y++) {
          for (let x = 0; x < map.width; x++) {
            const cell = map.getCell(x, y);
            if (cell && cell.tileType === '.') {
              spawnX = x;
              spawnY = y;
              break;
            }
          }
          const spawnCell = map.getCell(spawnX, spawnY);
          if (spawnCell && spawnCell.tileType === '.') break;
        }

        // Create single player
        const player = new Player('player', spawnX, spawnY, 'North', 'Player');

        setGameState({
          map,
          player
        });

        setLoading(false);
      } catch (err) {
        console.error('Error initializing game:', err);
        setError('Failed to initialize game: ' + (err as Error).message);
        setLoading(false);
      }
    };

    initGame();
  }, []);

  // Check if a tile is walkable
  const isWalkable = useCallback((x: number, y: number, map: MapData): boolean => {
    return map.isWalkable(x, y);
  }, []);

  // Track pressed keys across renders to prevent key repeat
  const pressedKeysRef = useRef(new Set<string>());
  const isAnimatingRef = useRef(false);

  // Handle player action
  const handleAction = useCallback((action: PlayerAction) => {
    if (!gameState) {
      isAnimatingRef.current = false;
      return;
    }

    const { player, map } = gameState;
    let newX = player.x;
    let newY = player.y;
    let newDirection = player.direction;

    switch (action) {
      case 'moveForward': {
        const pos = player.moveForward();
        newX = pos.x;
        newY = pos.y;
        break;
      }
      case 'moveBackward': {
        const pos = player.moveBackward();
        newX = pos.x;
        newY = pos.y;
        break;
      }
      case 'strafeLeft': {
        const pos = player.strafeLeft();
        newX = pos.x;
        newY = pos.y;
        break;
      }
      case 'strafeRight': {
        const pos = player.strafeRight();
        newX = pos.x;
        newY = pos.y;
        break;
      }
      case 'turnLeft':
        newDirection = player.turnLeft();
        break;
      case 'turnRight':
        newDirection = player.turnRight();
        break;
    }

    // Validate movement (only for position changes)
    if (newX !== player.x || newY !== player.y) {
      if (!isWalkable(newX, newY, map)) {
        // Invalid move - reset animation state and check for held keys
        isAnimatingRef.current = false;

        // Check if any keys are still pressed and retry
        setTimeout(() => {
          for (const key of pressedKeysRef.current) {
            const nextAction = inputConfig.getAction(key);
            if (nextAction) {
              isAnimatingRef.current = true;
              handleAction(nextAction);
              break;
            }
          }
        }, 0);
        return;
      }

      // Check if we landed on a door - if so, push through to the next cell
      const landedCell = map.getCell(newX, newY);
      if (landedCell && landedCell.isDoor()) {
        // Calculate the movement delta to know which direction we moved
        const deltaX = newX - player.x;
        const deltaY = newY - player.y;

        // Try to move one more cell in the same direction
        const beyondX = newX + deltaX;
        const beyondY = newY + deltaY;

        // If the cell beyond the door is walkable, move there instead
        if (isWalkable(beyondX, beyondY, map)) {
          newX = beyondX;
          newY = beyondY;
        }
        // Otherwise, stay on the door tile (player gets stuck in doorway)
      }
    }

    // Update player state
    const updatedPlayer = new Player(
      player.id,
      newX,
      newY,
      newDirection,
      player.name
    );

    setGameState({
      map,
      player: updatedPlayer
    });
  }, [gameState, isWalkable, inputConfig]);

  // Handle animation complete - check if any movement keys are still held
  const handleAnimationComplete = useCallback(() => {
    isAnimatingRef.current = false;

    // Check if any keys are still pressed
    for (const key of pressedKeysRef.current) {
      const action = inputConfig.getAction(key);
      if (action) {
        // Key is still held, trigger the action again
        isAnimatingRef.current = true;
        handleAction(action);
        break; // Only process one key at a time
      }
    }
  }, [handleAction, inputConfig]);

  // Handle keyboard input using UserInputConfig
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+M to toggle map editor (development only)
      if (import.meta.env.DEV && e.altKey && e.key === 'm') {
        e.preventDefault();
        setMapEditorVisible(prev => !prev);
        return;
      }

      // Alt+D to toggle debug panel
      if (e.altKey && e.key === 'd') {
        e.preventDefault();
        setDebugPanelVisible(prev => !prev);
        return;
      }

      // Alt+C to toggle combat view (development only)
      if (import.meta.env.DEV && e.altKey && e.key === 'c') {
        e.preventDefault();
        setCombatViewVisible(prev => !prev);
        return;
      }

      // Ignore if this key is already pressed (prevents key repeat)
      if (pressedKeysRef.current.has(e.key)) {
        return;
      }

      const action = inputConfig.getAction(e.key);

      if (action) {
        e.preventDefault();
        pressedKeysRef.current.add(e.key);

        // Only trigger action if not currently animating
        if (!isAnimatingRef.current) {
          isAnimatingRef.current = true;
          handleAction(action);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeysRef.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleAction, inputConfig]);

  if (loading) {
    return <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000',
      color: '#fff'
    }}>Loading...</div>;
  }

  if (error) {
    return <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000',
      color: '#f00'
    }}>{error}</div>;
  }

  if (!gameState) {
    return <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000',
      color: '#fff'
    }}>Initializing...</div>;
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000'
    }}>
      <div style={{
        width: '100%',
        height: '100%',
        maxWidth: '177.78vh', // 16:9 aspect ratio (16/9 * 100vh)
        maxHeight: '56.25vw', // 16:9 aspect ratio (9/16 * 100vw)
        position: 'relative'
      }}>
        {/* Combat view - only available in development mode */}
        {import.meta.env.DEV && combatViewVisible ? (
          <CombatView
            onExitCombat={() => setCombatViewVisible(false)}
          />
        ) : (
          <>
            <FirstPersonView
              playerX={gameState.player.x}
              playerY={gameState.player.y}
              direction={gameState.player.direction}
              grid={gameState.map.toStringArray()}
              cameraOffset={-0.3}
              lightIntensity={lightIntensity}
              lightDistance={lightDistance}
              lightYOffset={lightYOffset}
              lightDecay={lightDecay}
              lightColor={lightColor}
              movementDuration={0.2}
              rotationDuration={0.2}
              onAnimationComplete={handleAnimationComplete}
            />

            {debugPanelVisible && (
              <DebugPanel
                playerX={gameState.player.x}
                playerY={gameState.player.y}
                direction={gameState.player.direction}
                map={gameState.map}
                lightIntensity={lightIntensity}
                lightDistance={lightDistance}
                lightYOffset={lightYOffset}
                lightDecay={lightDecay}
                lightColor={lightColor}
                onLightIntensityChange={setLightIntensity}
                onLightDistanceChange={setLightDistance}
                onLightYOffsetChange={setLightYOffset}
                onLightDecayChange={setLightDecay}
                onLightColorChange={setLightColor}
                onClose={() => setDebugPanelVisible(false)}
              />
            )}

            {/* Map editor - only available in development mode */}
            {import.meta.env.DEV && mapEditorVisible && (
              <MapEditor
                map={gameState.map}
                onClose={() => setMapEditorVisible(false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
