import { useState, useEffect, useRef } from 'react';
import { AreaMap } from '../../models/area/AreaMap';
import type { AreaMapJSON } from '../../models/area/AreaMap';
import type { InteractiveObject, CardinalDirection } from '../../models/area/InteractiveObject';
import { InteractiveObjectType, ObjectState } from '../../models/area/InteractiveObject';
import type { EncounterZone } from '../../models/area/EncounterZone';
import type { EventArea, AreaEvent } from '../../models/area/EventArea';
import { PreconditionFactory } from '../../models/area/preconditions/PreconditionFactory';
import { ActionFactory } from '../../models/area/actions/ActionFactory';
import { AreaMapRegistry } from '../../utils/AreaMapRegistry';
import { AreaMapTileSetRegistry } from '../../utils/AreaMapTileSetRegistry';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import { AreaMapTileSetEditorPanel } from './AreaMapTileSetEditorPanel';
import { EventEditorModal } from './EventEditorModal';
import * as yaml from 'js-yaml';

// Helper component to render a sprite on a canvas
const SpriteCanvas: React.FC<{ spriteSheet: string; spriteX: number; spriteY: number; size: number }> = ({
  spriteSheet,
  spriteX,
  spriteY,
  size,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const SPRITE_SIZE = 12;
    canvas.width = size;
    canvas.height = size;
    ctx.imageSmoothingEnabled = false;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(
        img,
        spriteX * SPRITE_SIZE,
        spriteY * SPRITE_SIZE,
        SPRITE_SIZE,
        SPRITE_SIZE,
        0,
        0,
        size,
        size
      );
    };
    img.src = spriteSheet;
  }, [spriteSheet, spriteX, spriteY, size]);

  return <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }} />;
};

type EditorTool = 'paint' | 'object' | 'spawn' | 'encounter' | 'events';

interface AreaMapRegistryPanelProps {
  onClose?: () => void;
}

// Hybrid type for editedMap - allows EventArea with class instances (during editing)
// but maintains compatibility with AreaMapJSON structure
type EditableAreaMapJSON = Omit<AreaMapJSON, 'eventAreas'> & {
  eventAreas?: EventArea[];
};

/**
 * Developer panel for browsing and editing area maps.
 * Full-screen editor for first-person navigation maps.
 */
export const AreaMapRegistryPanel: React.FC<AreaMapRegistryPanelProps> = ({ onClose }) => {
  const [areaMaps, setAreaMaps] = useState<AreaMap[]>([]);
  const [selectedMap, setSelectedMap] = useState<AreaMap | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMap, setEditedMap] = useState<EditableAreaMapJSON | null>(null);
  const [currentTool, setCurrentTool] = useState<EditorTool>('paint');
  const [selectedTileChar, setSelectedTileChar] = useState<string>('#');
  const [selectedObjectType, setSelectedObjectType] = useState<InteractiveObjectType>(InteractiveObjectType.ClosedDoor);
  const [tilesetEditorVisible, setTilesetEditorVisible] = useState(false);
  const [editingTilesetId, setEditingTilesetId] = useState<string | null>(null);
  const [tilesetRefreshKey, setTilesetRefreshKey] = useState(0);
  const [pendingWidth, setPendingWidth] = useState<number>(0);
  const [pendingHeight, setPendingHeight] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastDragPos, setLastDragPos] = useState<{ x: number; y: number } | null>(null);

  // Event editing state
  const [selectedEventArea, setSelectedEventArea] = useState<string | null>(null);
  const [isCreatingEventArea, setIsCreatingEventArea] = useState(false);
  const [eventAreaStartPos, setEventAreaStartPos] = useState<{ x: number; y: number } | null>(null);
  const [eventEditorVisible, setEventEditorVisible] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Store original map state before editing
  const originalMapRef = useRef<AreaMapJSON | null>(null);

  // Load area maps from registry
  useEffect(() => {
    loadAreaMaps();
  }, []);

  const loadAreaMaps = () => {
    const allMaps = AreaMapRegistry.getAll();
    setAreaMaps(allMaps);
  };

  const handleSelectMap = (map: AreaMap) => {
    setSelectedMap(map);
    setIsEditing(false);
    setEditedMap(null);
  };

  const handleEdit = () => {
    if (!selectedMap) return;

    const json = selectedMap.toJSON();
    originalMapRef.current = JSON.parse(JSON.stringify(json));

    // Convert eventAreas from JSON to class instances for editing
    const editableMap: EditableAreaMapJSON = {
      ...json,
      eventAreas: json.eventAreas ? deserializeEventAreas(json.eventAreas) : undefined,
    };

    setEditedMap(editableMap);
    setIsEditing(true);

    // Initialize pending dimensions with current dimensions
    setPendingWidth(json.grid[0]?.length || 0);
    setPendingHeight(json.grid.length);
  };

  // Helper to deserialize event areas from JSON to class instances
  const deserializeEventAreas = (eventAreasJSON: import('../../models/area/EventArea').EventAreaJSON[]): EventArea[] => {
    return eventAreasJSON.map(areaJson => ({
      id: areaJson.id,
      x: areaJson.x,
      y: areaJson.y,
      width: areaJson.width,
      height: areaJson.height,
      events: areaJson.events.map(eventJson => ({
        id: eventJson.id,
        trigger: eventJson.trigger,
        preconditions: eventJson.preconditions.map(p => PreconditionFactory.fromJSON(p)),
        actions: eventJson.actions.map(a => ActionFactory.fromJSON(a)),
        oneTime: eventJson.oneTime,
        triggered: eventJson.triggered,
        description: eventJson.description,
      } as AreaEvent)),
      description: areaJson.description,
    }));
  };

  // Helper to serialize event areas from class instances to JSON
  const serializeEventAreas = (eventAreas: EventArea[]): import('../../models/area/EventArea').EventAreaJSON[] => {
    return eventAreas.map(area => ({
      id: area.id,
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
      events: area.events.map(event => ({
        id: event.id,
        trigger: event.trigger,
        preconditions: event.preconditions.map(p => p.toJSON()),
        actions: event.actions.map(a => a.toJSON()),
        oneTime: event.oneTime,
        triggered: event.triggered,
        description: event.description,
      })),
      description: area.description,
    }));
  };

  // Convert EditableAreaMapJSON to AreaMapJSON for saving
  const toAreaMapJSON = (editable: EditableAreaMapJSON): AreaMapJSON => {
    return {
      ...editable,
      eventAreas: editable.eventAreas ? serializeEventAreas(editable.eventAreas) : undefined,
    };
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedMap(null);
    originalMapRef.current = null;
  };

  const handleSave = () => {
    if (!editedMap) return;

    try {
      // Remove old map from registry
      if (selectedMap) {
        AreaMapRegistry.unregister(selectedMap.id);
      }

      // Create new map from edited JSON (convert to AreaMapJSON first)
      const updatedMap = AreaMap.fromJSON(toAreaMapJSON(editedMap));

      // Register the new map
      AreaMapRegistry.register(updatedMap);

      // Update UI state
      setSelectedMap(updatedMap);
      setIsEditing(false);
      setEditedMap(null);

      // Refresh the map list
      setAreaMaps(AreaMapRegistry.getAll());
    } catch (error) {
      console.error('Failed to save map:', error);
      alert(`Failed to save map: ${error}`);
    }
  };

  // Helper function to convert grid to ASCII string
  const gridToASCII = (map: AreaMap): string => {
    const tileset = AreaMapTileSetRegistry.getById(map.tilesetId);
    if (!tileset) {
      return '# # #\n# . #\n# # #';
    }

    const rows: string[] = [];
    for (let y = 0; y < map.height; y++) {
      let row = '';
      for (let x = 0; x < map.width; x++) {
        const tile = map.getTile(x, y);
        if (!tile) {
          row += ' ';
          continue;
        }

        // Find matching tile type by comparing properties
        const tileType = tileset.tileTypes.find(tt =>
          tt.behavior === tile.behavior &&
          tt.spriteId === tile.spriteId
        );

        row += tileType ? tileType.char : '.';
      }
      rows.push(row);
    }
    return rows.join('\n');
  };

  const handleExportMaps = async () => {
    const mapsData = {
      areas: areaMaps.map(map => {
        const json = map.toJSON();
        const exportData: Record<string, unknown> = {
          id: json.id,
          name: json.name,
          description: json.description,
          tilesetId: json.tilesetId,
          grid: gridToASCII(map),
          playerSpawn: json.playerSpawn,
          interactiveObjects: json.interactiveObjects,
          npcSpawns: json.npcSpawns,
          encounterZones: json.encounterZones,
        };

        // Add eventAreas if they exist (json.eventAreas is already in JSON format)
        if (json.eventAreas && json.eventAreas.length > 0) {
          exportData.eventAreas = json.eventAreas;
        }

        return exportData;
      })
    };

    const yamlString = yaml.dump(mapsData, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });

    try {
      // Use File System Access API if available
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: 'area-map-database.yaml',
          types: [{
            description: 'YAML Files',
            accept: { 'text/yaml': ['.yaml', '.yml'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(yamlString);
        await writable.close();
      } else {
        // Fallback to download link for browsers without File System Access API
        const blob = new Blob([yamlString], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'area-map-database.yaml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      // User cancelled the save dialog or error occurred
      console.log('Export cancelled or failed:', error);
    }
  };

  const handleExportTilesets = async () => {
    const allTilesets = AreaMapTileSetRegistry.getAll();

    const tilesetData = {
      tilesets: allTilesets
    };

    const yamlString = yaml.dump(tilesetData, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });

    try {
      // Use File System Access API if available
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: 'area-tileset-database.yaml',
          types: [{
            description: 'YAML Files',
            accept: { 'text/yaml': ['.yaml', '.yml'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(yamlString);
        await writable.close();
      } else {
        // Fallback to download link for browsers without File System Access API
        const blob = new Blob([yamlString], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'area-tileset-database.yaml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      // User cancelled the save dialog or error occurred
      console.log('Export cancelled or failed:', error);
    }
  };

  // Reserved for future use - allows editing map properties
  // const handleFieldChange = (field: keyof AreaMapJSON, value: any) => {
  //   if (!editedMap) return;
  //   setEditedMap({
  //     ...editedMap,
  //     [field]: value,
  //   });
  // };

  // Helper function to get all grid cells between two points (Bresenham's line algorithm)
  const getLineBetween = (x0: number, y0: number, x1: number, y1: number): Array<{ x: number; y: number }> => {
    const points: Array<{ x: number; y: number }> = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      points.push({ x, y });

      if (x === x1 && y === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return points;
  };

  const paintTile = (x: number, y: number) => {
    if (!isEditing || !editedMap || !selectedMap) return;

    const tileset = AreaMapTileSetRegistry.getById(editedMap.tilesetId);
    if (!tileset) return;

    const tileType = tileset.tileTypes.find(tt => tt.char === selectedTileChar);
    if (!tileType) return;

    // Update the grid using functional state update to ensure we get the latest state
    setEditedMap(prevMap => {
      if (!prevMap) return prevMap;

      const newGrid = [...prevMap.grid];
      newGrid[y] = [...newGrid[y]];
      newGrid[y][x] = {
        behavior: tileType.behavior,
        walkable: tileType.walkable,
        passable: tileType.passable,
        spriteId: tileType.spriteId,
        terrainType: tileType.terrainType,
      };

      return {
        ...prevMap,
        grid: newGrid,
      };
    });
  };

  const handleTileClick = (x: number, y: number) => {
    if (!isEditing || !editedMap || !selectedMap) return;

    if (currentTool === 'paint') {
      paintTile(x, y);
    } else if (currentTool === 'object') {
      // Place an interactive object
      const newObject: InteractiveObject = {
        id: `${selectedObjectType}-${Date.now()}`,
        type: selectedObjectType,
        x,
        y,
        state: ObjectState.Closed,
        spriteId: 'biomes-76', // Default sprite
      };

      setEditedMap({
        ...editedMap,
        interactiveObjects: [...editedMap.interactiveObjects, newObject],
      });
    } else if (currentTool === 'spawn') {
      // Set player spawn point
      setEditedMap({
        ...editedMap,
        playerSpawn: { x, y, direction: 'North' as CardinalDirection },
      });
    } else if (currentTool === 'encounter') {
      // Add encounter zone
      const newZone: EncounterZone = {
        id: `encounter-${Date.now()}`,
        x,
        y,
        encounterId: 'goblin-patrol', // Default
        triggerType: 'enter',
        oneTime: true,
      };

      setEditedMap({
        ...editedMap,
        encounterZones: [...(editedMap.encounterZones || []), newZone],
      });
    } else if (currentTool === 'events') {
      handleEventAreaClick(x, y);
    }
  };

  const handleEventAreaClick = (x: number, y: number) => {
    if (!editedMap) return;

    if (!isCreatingEventArea) {
      // Start creating a new event area
      setIsCreatingEventArea(true);
      setEventAreaStartPos({ x, y });
    } else if (eventAreaStartPos) {
      // Finish creating the event area
      const minX = Math.min(eventAreaStartPos.x, x);
      const minY = Math.min(eventAreaStartPos.y, y);
      const maxX = Math.max(eventAreaStartPos.x, x);
      const maxY = Math.max(eventAreaStartPos.y, y);

      const newArea: EventArea = {
        id: `area-${Date.now()}`,
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        description: 'New event area',
        events: [],
      };

      setEditedMap({
        ...editedMap,
        eventAreas: [...(editedMap.eventAreas || []), newArea],
      });

      // Reset creation state
      setIsCreatingEventArea(false);
      setEventAreaStartPos(null);
      setSelectedEventArea(newArea.id);
    }
  };

  const handleRemoveEventArea = (areaId: string) => {
    if (!editedMap) return;
    setEditedMap({
      ...editedMap,
      eventAreas: (editedMap.eventAreas || []).filter(area => area.id !== areaId),
    });
    if (selectedEventArea === areaId) {
      setSelectedEventArea(null);
    }
  };

  const handleSaveEvent = (event: AreaEvent) => {
    if (!editedMap || !selectedEventArea) return;

    setEditedMap({
      ...editedMap,
      eventAreas: editedMap.eventAreas?.map(area => {
        if (area.id !== selectedEventArea) return area;

        // Check if we're editing an existing event or adding a new one
        const existingEventIndex = area.events.findIndex(e => e.id === editingEventId);

        if (existingEventIndex >= 0) {
          // Update existing event
          const updatedEvents = [...area.events];
          updatedEvents[existingEventIndex] = event;
          return { ...area, events: updatedEvents };
        } else {
          // Add new event
          return { ...area, events: [...area.events, event] };
        }
      }),
    });

    setEventEditorVisible(false);
    setEditingEventId(null);
  };

  const handleDeleteEvent = (areaId: string, eventId: string) => {
    if (!editedMap) return;

    setEditedMap({
      ...editedMap,
      eventAreas: editedMap.eventAreas?.map(area => {
        if (area.id !== areaId) return area;
        return {
          ...area,
          events: area.events.filter(e => e.id !== eventId),
        };
      }),
    });
  };

  const handleRemoveObject = (objectId: string) => {
    if (!editedMap) return;
    setEditedMap({
      ...editedMap,
      interactiveObjects: editedMap.interactiveObjects.filter(obj => obj.id !== objectId),
    });
  };

  const handleRemoveEncounterZone = (zoneId: string) => {
    if (!editedMap) return;
    setEditedMap({
      ...editedMap,
      encounterZones: (editedMap.encounterZones || []).filter(zone => zone.id !== zoneId),
    });
  };

  const handleMouseDown = (x: number, y: number) => {
    if (!isEditing || currentTool !== 'paint') return;
    setIsDragging(true);
    setLastDragPos({ x, y });
    paintTile(x, y);
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (!isDragging || !lastDragPos || currentTool !== 'paint') return;

    // Get all points between last position and current position
    const points = getLineBetween(lastDragPos.x, lastDragPos.y, x, y);

    // Paint all tiles along the line
    for (const point of points) {
      paintTile(point.x, point.y);
    }

    setLastDragPos({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setLastDragPos(null);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setLastDragPos(null);
  };

  const handleChangeDimensions = (newWidth: number, newHeight: number) => {
    if (!editedMap) return;

    const oldWidth = editedMap.grid[0]?.length || 0;
    const oldHeight = editedMap.grid.length;

    // Create new grid with new dimensions
    const newGrid: any[][] = [];
    const tileset = AreaMapTileSetRegistry.getById(editedMap.tilesetId);
    if (!tileset) return;

    // Find a default floor tile
    const defaultTile = tileset.tileTypes.find(tt => tt.behavior === 'floor') || tileset.tileTypes[0];

    for (let y = 0; y < newHeight; y++) {
      const row: any[] = [];
      for (let x = 0; x < newWidth; x++) {
        // Copy existing tile if within old bounds, otherwise use default
        if (y < oldHeight && x < oldWidth) {
          row.push(editedMap.grid[y][x]);
        } else {
          row.push({
            behavior: defaultTile.behavior,
            walkable: defaultTile.walkable,
            passable: defaultTile.passable,
            spriteId: defaultTile.spriteId,
            terrainType: defaultTile.terrainType,
          });
        }
      }
      newGrid.push(row);
    }

    // Filter out objects and spawn points that are now out of bounds
    const filteredObjects = editedMap.interactiveObjects.filter(
      obj => obj.x < newWidth && obj.y < newHeight
    );

    const filteredNpcSpawns = (editedMap.npcSpawns || []).filter(
      spawn => spawn.x < newWidth && spawn.y < newHeight
    );

    const filteredEncounterZones = (editedMap.encounterZones || []).filter(
      zone => zone.x < newWidth && zone.y < newHeight
    );

    // Adjust player spawn if out of bounds
    let playerSpawn = editedMap.playerSpawn;
    if (playerSpawn.x >= newWidth || playerSpawn.y >= newHeight) {
      playerSpawn = {
        ...playerSpawn,
        x: Math.min(playerSpawn.x, newWidth - 1),
        y: Math.min(playerSpawn.y, newHeight - 1),
      };
    }

    setEditedMap({
      ...editedMap,
      width: newWidth,
      height: newHeight,
      grid: newGrid,
      interactiveObjects: filteredObjects,
      npcSpawns: filteredNpcSpawns,
      encounterZones: filteredEncounterZones,
      playerSpawn: playerSpawn,
    });

    // Update pending dimensions to match the applied dimensions
    setPendingWidth(newWidth);
    setPendingHeight(newHeight);
  };

  const handleChangeTileset = (newTilesetId: string) => {
    if (!editedMap) return;

    // Get the new tileset
    const newTileset = AreaMapTileSetRegistry.getById(newTilesetId);
    if (!newTileset) return;

    // Remap the grid to use tiles from the new tileset
    // For each tile, find a matching tile in the new tileset based on behavior
    const newGrid = editedMap.grid.map(row =>
      row.map(tile => {
        // Find a tile in the new tileset that matches this tile's behavior
        const matchingTileDef = newTileset.tileTypes.find(
          tt => tt.behavior === tile.behavior &&
                tt.walkable === tile.walkable &&
                tt.passable === tile.passable
        );

        // If we find a match, use its spriteId; otherwise keep the old spriteId
        if (matchingTileDef) {
          return {
            ...tile,
            spriteId: matchingTileDef.spriteId,
            terrainType: matchingTileDef.terrainType,
          };
        }

        // No match found - try to find any tile with the same behavior
        const behaviorMatch = newTileset.tileTypes.find(
          tt => tt.behavior === tile.behavior
        );

        if (behaviorMatch) {
          return {
            ...tile,
            spriteId: behaviorMatch.spriteId,
            terrainType: behaviorMatch.terrainType,
            walkable: behaviorMatch.walkable,
            passable: behaviorMatch.passable,
          };
        }

        // No match at all - keep the old tile but it might not render correctly
        return tile;
      })
    );

    // Update the map's tileset and grid
    setEditedMap({
      ...editedMap,
      tilesetId: newTilesetId,
      grid: newGrid,
    });

    // Reset selected tile to first tile in new tileset
    if (newTileset.tileTypes.length > 0) {
      setSelectedTileChar(newTileset.tileTypes[0].char);
    }
  };

  const handleOpenTilesetEditor = () => {
    if (!selectedMap) return;
    setEditingTilesetId(selectedMap.tilesetId);
    setTilesetEditorVisible(true);
  };

  const handleTilesetSaved = () => {
    // When tileset is saved, we need to update the map's grid to use the new sprite IDs
    // from the updated tileset definitions

    // Helper function to remap a grid based on updated tileset
    const remapGridForTileset = (grid: any[][], tilesetId: string) => {
      const tileset = AreaMapTileSetRegistry.getById(tilesetId);
      if (!tileset) {
        console.warn('[AreaMapRegistryPanel] Tileset not found:', tilesetId);
        return grid;
      }

      console.log('[AreaMapRegistryPanel] Remapping grid after tileset save');
      console.log('[AreaMapRegistryPanel] Tileset:', tileset);

      return grid.map((row, y) =>
        row.map((tile, x) => {
          // Find ALL tileset definitions that match this tile's properties
          const matchingTileDefs = tileset.tileTypes.filter(
            tt => tt.behavior === tile.behavior &&
                  tt.walkable === tile.walkable &&
                  tt.passable === tile.passable
          );

          if (matchingTileDefs.length === 1) {
            // Exactly one match - use it
            console.log(`[${x},${y}] Unique match: ${tile.spriteId} -> ${matchingTileDefs[0].spriteId}`);
            return {
              ...tile,
              spriteId: matchingTileDefs[0].spriteId,
              terrainType: matchingTileDefs[0].terrainType,
            };
          } else if (matchingTileDefs.length > 1) {
            // Multiple matches - try to find the one with the same OLD spriteId
            // This handles the case where the user is editing an existing tile definition
            const sameSprite = matchingTileDefs.find(tt => tt.spriteId === tile.spriteId);
            if (sameSprite) {
              console.log(`[${x},${y}] Same sprite match: ${tile.spriteId} (no change)`);
              return tile; // Sprite didn't change
            }

            // Otherwise, use the first match (best guess)
            console.log(`[${x},${y}] Multiple matches, using first: ${tile.spriteId} -> ${matchingTileDefs[0].spriteId}`);
            return {
              ...tile,
              spriteId: matchingTileDefs[0].spriteId,
              terrainType: matchingTileDefs[0].terrainType,
            };
          }

          // No exact match - try matching by behavior only
          const behaviorMatches = tileset.tileTypes.filter(
            tt => tt.behavior === tile.behavior
          );

          if (behaviorMatches.length > 0) {
            console.log(`[${x},${y}] Behavior-only match: ${tile.spriteId} -> ${behaviorMatches[0].spriteId}`);
            return {
              ...tile,
              spriteId: behaviorMatches[0].spriteId,
              terrainType: behaviorMatches[0].terrainType,
            };
          }

          // No match found, keep original tile
          console.warn(`[${x},${y}] No match found for tile:`, tile);
          return tile;
        })
      );
    };

    // Update edited map if in edit mode
    if (editedMap && isEditing) {
      const newGrid = remapGridForTileset(editedMap.grid, editedMap.tilesetId);
      setEditedMap({
        ...editedMap,
        grid: newGrid,
      });
    }

    // Also update selected map if viewing (not editing)
    if (selectedMap && !isEditing) {
      const selectedMapJson = selectedMap.toJSON();
      const newGrid = remapGridForTileset(selectedMapJson.grid, selectedMap.tilesetId);
      const updatedMap = AreaMap.fromJSON({
        ...selectedMapJson,
        grid: newGrid,
      });
      setSelectedMap(updatedMap);
    }

    // Increment refresh key to force re-render of map preview
    setTilesetRefreshKey(prev => prev + 1);
  };

  // Render the grid
  const renderGrid = () => {
    const map = isEditing && editedMap ? AreaMap.fromJSON(toAreaMapJSON(editedMap)) : selectedMap;
    if (!map) return null;

    const CELL_SIZE = 32;

    const cells: React.ReactElement[] = [];

    // Render tiles
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.getTile(x, y);
        if (!tile) continue;

        const sprite = SpriteRegistry.getById(tile.spriteId);

        cells.push(
          <div
            key={`tile-${x}-${y}`}
            onClick={() => handleTileClick(x, y)}
            onMouseDown={() => handleMouseDown(x, y)}
            onMouseEnter={() => handleMouseEnter(x, y)}
            onMouseUp={handleMouseUp}
            style={{
              position: 'absolute',
              left: x * CELL_SIZE,
              top: y * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: isEditing ? 'pointer' : 'default',
              background: tile.walkable ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)',
            }}
          >
            {sprite && (
              <SpriteCanvas
                spriteSheet={sprite.spriteSheet}
                spriteX={sprite.x}
                spriteY={sprite.y}
                size={CELL_SIZE}
              />
            )}
          </div>
        );
      }
    }

    // Render interactive objects
    if (editedMap) {
      for (const obj of editedMap.interactiveObjects) {
        cells.push(
          <div
            key={`obj-${obj.id}`}
            style={{
              position: 'absolute',
              left: obj.x * CELL_SIZE,
              top: obj.y * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
              background: 'rgba(255,165,0,0.5)',
              border: '2px solid orange',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              pointerEvents: 'none',
            }}
          >
            {obj.type.charAt(0).toUpperCase()}
          </div>
        );
      }
    }

    // Render spawn point
    if (editedMap) {
      const spawn = editedMap.playerSpawn;
      cells.push(
        <div
          key="spawn"
          style={{
            position: 'absolute',
            left: spawn.x * CELL_SIZE,
            top: spawn.y * CELL_SIZE,
            width: CELL_SIZE,
            height: CELL_SIZE,
            background: 'rgba(0,255,0,0.5)',
            border: '2px solid lime',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            pointerEvents: 'none',
          }}
        >
          P
        </div>
      );
    }

    // Render encounter zones
    if (editedMap?.encounterZones) {
      for (const zone of editedMap.encounterZones) {
        cells.push(
          <div
            key={`zone-${zone.id}`}
            style={{
              position: 'absolute',
              left: zone.x * CELL_SIZE,
              top: zone.y * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
              background: 'rgba(255,0,0,0.3)',
              border: '2px solid red',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              pointerEvents: 'none',
            }}
          >
            E
          </div>
        );
      }
    }

    // Render event areas (only in events mode)
    if (currentTool === 'events' && editedMap?.eventAreas) {
      for (const area of editedMap.eventAreas) {
        const isSelected = selectedEventArea === area.id;

        cells.push(
          <div
            key={`event-area-${area.id}`}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEventArea(area.id);
            }}
            style={{
              position: 'absolute',
              left: area.x * CELL_SIZE,
              top: area.y * CELL_SIZE,
              width: area.width * CELL_SIZE,
              height: area.height * CELL_SIZE,
              background: isSelected ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 255, 0, 0.1)',
              border: isSelected ? '3px solid green' : '2px solid yellow',
              pointerEvents: 'auto',
              cursor: 'pointer',
            }}
          >
            <div style={{
              position: 'absolute',
              top: 2,
              left: 2,
              fontSize: '10px',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '2px 4px',
              borderRadius: '2px',
            }}>
              {area.id} ({area.events.length} events)
            </div>
          </div>
        );
      }
    }

    // Show preview while creating event area
    if (isCreatingEventArea && eventAreaStartPos && currentTool === 'events') {
      cells.push(
        <div
          key="event-area-preview"
          style={{
            position: 'absolute',
            left: eventAreaStartPos.x * CELL_SIZE,
            top: eventAreaStartPos.y * CELL_SIZE,
            width: CELL_SIZE,
            height: CELL_SIZE,
            background: 'rgba(255, 255, 0, 0.5)',
            border: '2px dashed yellow',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '16px',
            color: 'white',
          }}>
            +
          </div>
        </div>
      );
    }

    return (
      <div
        key={`grid-${tilesetRefreshKey}`}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'relative',
          width: map.width * CELL_SIZE,
          height: map.height * CELL_SIZE,
        }}
      >
        {cells}
      </div>
    );
  };

  // Render tile palette
  const renderTilePalette = () => {
    if (!selectedMap) return null;

    const currentTilesetId = isEditing && editedMap ? editedMap.tilesetId : selectedMap.tilesetId;
    const tileset = AreaMapTileSetRegistry.getById(currentTilesetId);
    if (!tileset) return null;

    const allTilesets = AreaMapTileSetRegistry.getAll();

    return (
      <>
        {/* Tileset selector */}
        {isEditing && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', marginBottom: '6px', color: '#aaa' }}>Tileset:</div>
            <select
              value={currentTilesetId}
              onChange={(e) => handleChangeTileset(e.target.value)}
              style={{
                width: '100%',
                padding: '6px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid #666',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
            >
              {allTilesets.map(ts => (
                <option key={ts.id} value={ts.id}>{ts.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Edit tileset button */}
        <button
          onClick={handleOpenTilesetEditor}
          style={{
            width: '100%',
            padding: '8px',
            marginBottom: '12px',
            background: 'rgba(156, 39, 176, 0.3)',
            border: '1px solid rgba(156, 39, 176, 0.6)',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '11px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontWeight: 'bold',
          }}
        >
          Edit Tileset
        </button>

        {/* Tile palette */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {tileset.tileTypes.map(tileType => {
          const sprite = SpriteRegistry.getById(tileType.spriteId);

          return (
            <div
              key={tileType.char}
              onClick={() => setSelectedTileChar(tileType.char)}
              style={{
                width: '48px',
                height: '48px',
                border: selectedTileChar === tileType.char ? '3px solid cyan' : '1px solid #666',
                cursor: 'pointer',
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
              title={`${tileType.name || tileType.char} - ${tileType.behavior}`}
            >
              {sprite && (
                <SpriteCanvas
                  spriteSheet={sprite.spriteSheet}
                  spriteX={sprite.x}
                  spriteY={sprite.y}
                  size={48}
                />
              )}
              <div style={{ position: 'absolute', bottom: '2px', right: '2px', fontSize: '10px', background: 'rgba(0,0,0,0.8)', padding: '2px' }}>
                {tileType.char}
              </div>
            </div>
          );
        })}
        </div>
      </>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.95)',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '2px solid #666',
          background: 'rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: '18px' }}>Area Map Registry Editor</div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={handleExportTilesets}
            style={{
              padding: '8px 16px',
              background: 'rgba(156, 39, 176, 0.3)',
              border: '1px solid rgba(156, 39, 176, 0.6)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold',
            }}
            title="Export all tilesets to YAML file"
          >
            Export TileSet Database
          </button>
          <button
            onClick={handleExportMaps}
            style={{
              padding: '8px 16px',
              background: 'rgba(33, 150, 243, 0.3)',
              border: '1px solid rgba(33, 150, 243, 0.6)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold',
            }}
            title="Export all area maps to YAML file"
          >
            Export AreaMap Database
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '24px',
                fontWeight: 'bold',
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left sidebar - Map list */}
        <div style={{ width: '280px', borderRight: '2px solid #666', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.3)' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #666' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>Area Maps</div>
            <div style={{ fontSize: '11px', color: '#aaa' }}>
              <div><strong>Total:</strong> {areaMaps.length}</div>
            </div>
          </div>

          {/* Map list */}
          <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {areaMaps.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', padding: '8px' }}>
                  No area maps found
                </div>
              ) : (
                areaMaps.map(map => (
                  <div
                    key={map.id}
                    onClick={() => handleSelectMap(map)}
                    style={{
                      padding: '10px',
                      background: selectedMap?.id === map.id
                        ? 'rgba(33, 150, 243, 0.3)'
                        : 'rgba(255, 255, 255, 0.1)',
                      border: selectedMap?.id === map.id
                        ? '2px solid rgba(33, 150, 243, 0.8)'
                        : '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{map.name}</div>
                    <div style={{ fontSize: '10px', color: '#aaa', marginTop: '4px' }}>
                      {map.width}x{map.height} • {map.tilesetId}
                    </div>
                    <div style={{ fontSize: '9px', color: '#888', marginTop: '2px' }}>
                      ID: {map.id}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Center - Grid editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', padding: '20px' }}>
          {!selectedMap ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '14px' }}>
              Select an area map from the list
            </div>
          ) : (
            <>
              {/* Map info */}
              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #666' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>{selectedMap.name}</div>
                <div style={{ fontSize: '11px', color: '#aaa' }}>{selectedMap.description}</div>
                <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
                  Size: {selectedMap.width}x{selectedMap.height} • Tileset: {selectedMap.tilesetId}
                </div>
              </div>

              {/* Edit controls */}
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(76, 175, 80, 0.3)',
                    border: '1px solid rgba(76, 175, 80, 0.6)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    marginBottom: '16px',
                    width: 'fit-content',
                  }}
                >
                  Edit Map
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button
                    onClick={handleSave}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(76, 175, 80, 0.3)',
                      border: '1px solid rgba(76, 175, 80, 0.6)',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                    }}
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(244, 67, 54, 0.3)',
                      border: '1px solid rgba(244, 67, 54, 0.6)',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Map dimensions */}
              {isEditing && (
                <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #666' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>Dimensions</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <div style={{ width: '80px' }}>
                      <div style={{ fontSize: '9px', color: '#888', marginBottom: '2px' }}>Width</div>
                      <input
                        type="number"
                        min="3"
                        max="100"
                        value={pendingWidth}
                        onChange={(e) => setPendingWidth(Math.max(3, Math.min(100, parseInt(e.target.value) || 3)))}
                        style={{
                          width: '100%',
                          padding: '6px',
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid #666',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                      />
                    </div>
                    <div style={{ color: '#666', fontSize: '14px', paddingBottom: '6px' }}>×</div>
                    <div style={{ width: '80px' }}>
                      <div style={{ fontSize: '9px', color: '#888', marginBottom: '2px' }}>Height</div>
                      <input
                        type="number"
                        min="3"
                        max="100"
                        value={pendingHeight}
                        onChange={(e) => setPendingHeight(Math.max(3, Math.min(100, parseInt(e.target.value) || 3)))}
                        style={{
                          width: '100%',
                          padding: '6px',
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid #666',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                      />
                    </div>
                    <button
                      onClick={() => handleChangeDimensions(pendingWidth, pendingHeight)}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(33, 150, 243, 0.3)',
                        border: '1px solid rgba(33, 150, 243, 0.6)',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}

              {/* Tool selection */}
              {isEditing && (
                <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #666' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>Tool</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setCurrentTool('paint')}
                      style={{
                        padding: '6px 12px',
                        background: currentTool === 'paint' ? 'rgba(33, 150, 243, 0.5)' : 'rgba(255,255,255,0.1)',
                        border: currentTool === 'paint' ? '2px solid cyan' : '1px solid #666',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                      }}
                    >
                      Paint Tiles
                    </button>
                    <button
                      onClick={() => setCurrentTool('object')}
                      style={{
                        padding: '6px 12px',
                        background: currentTool === 'object' ? 'rgba(255, 165, 0, 0.5)' : 'rgba(255,255,255,0.1)',
                        border: currentTool === 'object' ? '2px solid orange' : '1px solid #666',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                      }}
                    >
                      Objects
                    </button>
                    <button
                      onClick={() => setCurrentTool('spawn')}
                      style={{
                        padding: '6px 12px',
                        background: currentTool === 'spawn' ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255,255,255,0.1)',
                        border: currentTool === 'spawn' ? '2px solid lime' : '1px solid #666',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                      }}
                    >
                      Spawn
                    </button>
                    <button
                      onClick={() => setCurrentTool('encounter')}
                      style={{
                        padding: '6px 12px',
                        background: currentTool === 'encounter' ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255,255,255,0.1)',
                        border: currentTool === 'encounter' ? '2px solid red' : '1px solid #666',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                      }}
                    >
                      Encounters
                    </button>
                    <button
                      onClick={() => setCurrentTool('events')}
                      style={{
                        padding: '6px 12px',
                        background: currentTool === 'events' ? 'rgba(156, 39, 176, 0.5)' : 'rgba(255,255,255,0.1)',
                        border: currentTool === 'events' ? '2px solid purple' : '1px solid #666',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                      }}
                    >
                      Events
                    </button>
                  </div>
                </div>
              )}

              {/* Grid */}
              <div style={{ flex: 1, overflow: 'auto', border: '2px solid #666', padding: '16px', background: 'rgba(0,0,0,0.5)' }}>
                {renderGrid()}
              </div>
            </>
          )}
        </div>

        {/* Right sidebar - Tool properties */}
        {isEditing && selectedMap && (
          <div style={{ width: '300px', borderLeft: '2px solid #666', overflow: 'auto', padding: '16px', background: 'rgba(0,0,0,0.3)' }}>
            {currentTool === 'paint' && (
              <>
                <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>Tile Palette</div>
                {renderTilePalette()}
              </>
            )}

            {currentTool === 'object' && (
              <>
                <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>Interactive Objects</div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', marginBottom: '8px', color: '#aaa' }}>Object Type:</div>
                  <select
                    value={selectedObjectType}
                    onChange={(e) => setSelectedObjectType(e.target.value as InteractiveObjectType)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid #666',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {Object.values(InteractiveObjectType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>Placed Objects</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {editedMap?.interactiveObjects.map(obj => (
                    <div
                      key={obj.id}
                      style={{
                        padding: '8px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid #666',
                        borderRadius: '4px',
                        fontSize: '10px',
                      }}
                    >
                      <div style={{ fontWeight: 'bold' }}>{obj.type}</div>
                      <div style={{ color: '#aaa' }}>Position: ({obj.x}, {obj.y})</div>
                      <button
                        onClick={() => handleRemoveObject(obj.id)}
                        style={{
                          marginTop: '6px',
                          padding: '4px 8px',
                          background: 'rgba(244, 67, 54, 0.3)',
                          border: '1px solid rgba(244, 67, 54, 0.6)',
                          borderRadius: '3px',
                          color: '#fff',
                          fontSize: '9px',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {currentTool === 'spawn' && editedMap && (
              <>
                <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>Spawn Points</div>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid #666', borderRadius: '4px' }}>
                  <div style={{ fontSize: '11px', marginBottom: '8px', fontWeight: 'bold' }}>Player Spawn</div>
                  <div style={{ fontSize: '10px', color: '#aaa' }}>
                    Position: ({editedMap.playerSpawn.x}, {editedMap.playerSpawn.y})
                  </div>
                  <div style={{ fontSize: '10px', color: '#aaa' }}>
                    Direction: {editedMap.playerSpawn.direction}
                  </div>
                </div>
              </>
            )}

            {currentTool === 'encounter' && (
              <>
                <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>Encounter Zones</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {editedMap?.encounterZones?.map(zone => (
                    <div
                      key={zone.id}
                      style={{
                        padding: '8px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid #666',
                        borderRadius: '4px',
                        fontSize: '10px',
                      }}
                    >
                      <div style={{ fontWeight: 'bold' }}>{zone.encounterId}</div>
                      <div style={{ color: '#aaa' }}>Position: ({zone.x}, {zone.y})</div>
                      <div style={{ color: '#aaa' }}>Type: {zone.triggerType}</div>
                      <button
                        onClick={() => handleRemoveEncounterZone(zone.id)}
                        style={{
                          marginTop: '6px',
                          padding: '4px 8px',
                          background: 'rgba(244, 67, 54, 0.3)',
                          border: '1px solid rgba(244, 67, 54, 0.6)',
                          borderRadius: '3px',
                          color: '#fff',
                          fontSize: '9px',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {currentTool === 'events' && (
              <>
                <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>Event Areas</div>

                {isCreatingEventArea && (
                  <div style={{
                    padding: '12px',
                    background: 'rgba(255, 255, 0, 0.2)',
                    border: '1px solid yellow',
                    borderRadius: '4px',
                    marginBottom: '12px',
                    fontSize: '10px'
                  }}>
                    Click another tile to finish creating event area
                  </div>
                )}

                {selectedEventArea && editedMap?.eventAreas && (
                  <>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>Selected Area</div>
                    {(() => {
                      const area = editedMap.eventAreas.find(a => a.id === selectedEventArea);
                      if (!area) return null;

                      return (
                        <div style={{
                          padding: '12px',
                          background: 'rgba(0, 255, 0, 0.1)',
                          border: '2px solid green',
                          borderRadius: '4px',
                          marginBottom: '12px'
                        }}>
                          <div style={{ fontSize: '11px', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 'bold' }}>{area.id}</div>
                            <div style={{ color: '#aaa', fontSize: '10px', marginTop: '4px' }}>
                              Position: ({area.x}, {area.y})
                            </div>
                            <div style={{ color: '#aaa', fontSize: '10px' }}>
                              Size: {area.width}x{area.height}
                            </div>
                            <div style={{ color: '#aaa', fontSize: '10px' }}>
                              Events: {area.events.length}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                            <button
                              onClick={() => {
                                setEventEditorVisible(true);
                                setEditingEventId(null);
                              }}
                              style={{
                                flex: 1,
                                padding: '6px 8px',
                                background: 'rgba(76, 175, 80, 0.3)',
                                border: '1px solid rgba(76, 175, 80, 0.6)',
                                borderRadius: '3px',
                                color: '#fff',
                                fontSize: '9px',
                                cursor: 'pointer',
                                fontFamily: 'monospace',
                              }}
                            >
                              Add Event
                            </button>
                            <button
                              onClick={() => handleRemoveEventArea(area.id)}
                              style={{
                                flex: 1,
                                padding: '6px 8px',
                                background: 'rgba(244, 67, 54, 0.3)',
                                border: '1px solid rgba(244, 67, 54, 0.6)',
                                borderRadius: '3px',
                                color: '#fff',
                                fontSize: '9px',
                                cursor: 'pointer',
                                fontFamily: 'monospace',
                              }}
                            >
                              Delete Area
                            </button>
                          </div>

                          {area.events.length > 0 && (
                            <div style={{ marginTop: '12px' }}>
                              <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '6px' }}>Events:</div>
                              {area.events.map(event => (
                                <div
                                  key={event.id}
                                  style={{
                                    padding: '8px',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid #666',
                                    borderRadius: '4px',
                                    fontSize: '9px',
                                    marginBottom: '6px',
                                  }}
                                >
                                  <div style={{ fontWeight: 'bold' }}>{event.id}</div>
                                  <div style={{ color: '#aaa' }}>Trigger: {event.trigger}</div>
                                  <div style={{ color: '#aaa' }}>Actions: {event.actions.length}</div>
                                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                    <button
                                      onClick={() => {
                                        setEditingEventId(event.id);
                                        setEventEditorVisible(true);
                                      }}
                                      style={{
                                        flex: 1,
                                        padding: '4px 8px',
                                        background: 'rgba(33, 150, 243, 0.3)',
                                        border: '1px solid rgba(33, 150, 243, 0.6)',
                                        borderRadius: '3px',
                                        color: '#fff',
                                        fontSize: '8px',
                                        cursor: 'pointer',
                                        fontFamily: 'monospace',
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEvent(area.id, event.id)}
                                      style={{
                                        flex: 1,
                                        padding: '4px 8px',
                                        background: 'rgba(244, 67, 54, 0.3)',
                                        border: '1px solid rgba(244, 67, 54, 0.6)',
                                        borderRadius: '3px',
                                        color: '#fff',
                                        fontSize: '8px',
                                        cursor: 'pointer',
                                        fontFamily: 'monospace',
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}

                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>All Event Areas</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {editedMap?.eventAreas?.map(area => (
                    <div
                      key={area.id}
                      onClick={() => setSelectedEventArea(area.id)}
                      style={{
                        padding: '8px',
                        background: selectedEventArea === area.id ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255,255,255,0.1)',
                        border: selectedEventArea === area.id ? '2px solid green' : '1px solid #666',
                        borderRadius: '4px',
                        fontSize: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 'bold' }}>{area.id}</div>
                      <div style={{ color: '#aaa' }}>Position: ({area.x}, {area.y})</div>
                      <div style={{ color: '#aaa' }}>Size: {area.width}x{area.height}</div>
                      <div style={{ color: '#aaa' }}>Events: {area.events.length}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tileset editor modal */}
      {tilesetEditorVisible && editingTilesetId && (
        <AreaMapTileSetEditorPanel
          tilesetId={editingTilesetId}
          onClose={() => {
            setTilesetEditorVisible(false);
            setEditingTilesetId(null);
          }}
          onSave={handleTilesetSaved}
        />
      )}

      {/* Event editor modal */}
      {eventEditorVisible && selectedEventArea && editedMap && (
        <EventEditorModal
          event={
            editingEventId
              ? editedMap.eventAreas?.find(a => a.id === selectedEventArea)?.events.find(e => e.id === editingEventId) || null
              : null
          }
          onSave={handleSaveEvent}
          onCancel={() => {
            setEventEditorVisible(false);
            setEditingEventId(null);
          }}
        />
      )}
    </div>
  );
};
