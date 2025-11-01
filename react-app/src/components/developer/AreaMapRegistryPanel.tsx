import { useState, useEffect, useRef } from 'react';
import { AreaMap } from '../../models/area/AreaMap';
import type { AreaMapJSON } from '../../models/area/AreaMap';
import type { InteractiveObject, CardinalDirection } from '../../models/area/InteractiveObject';
import { InteractiveObjectType, ObjectState } from '../../models/area/InteractiveObject';
import type { EncounterZone } from '../../models/area/EncounterZone';
import { AreaMapRegistry } from '../../utils/AreaMapRegistry';
import { AreaMapTileSetRegistry } from '../../utils/AreaMapTileSetRegistry';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
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

type EditorTool = 'paint' | 'object' | 'spawn' | 'encounter';

interface AreaMapRegistryPanelProps {
  onClose?: () => void;
}

/**
 * Developer panel for browsing and editing area maps.
 * Full-screen editor for first-person navigation maps.
 */
export const AreaMapRegistryPanel: React.FC<AreaMapRegistryPanelProps> = ({ onClose }) => {
  const [areaMaps, setAreaMaps] = useState<AreaMap[]>([]);
  const [selectedMap, setSelectedMap] = useState<AreaMap | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMap, setEditedMap] = useState<AreaMapJSON | null>(null);
  const [currentTool, setCurrentTool] = useState<EditorTool>('paint');
  const [selectedTileChar, setSelectedTileChar] = useState<string>('#');
  const [selectedObjectType, setSelectedObjectType] = useState<InteractiveObjectType>(InteractiveObjectType.ClosedDoor);

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
    setEditedMap(json);
    setIsEditing(true);
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

      // Create new map from edited JSON
      const updatedMap = AreaMap.fromJSON(editedMap);

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

  const handleExport = () => {
    const mapsData = {
      areas: areaMaps.map(map => {
        const json = map.toJSON();
        return {
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
      })
    };

    const yamlString = yaml.dump(mapsData, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });

    const blob = new Blob([yamlString], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'area-map-database.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Reserved for future use - allows editing map properties
  // const handleFieldChange = (field: keyof AreaMapJSON, value: any) => {
  //   if (!editedMap) return;
  //   setEditedMap({
  //     ...editedMap,
  //     [field]: value,
  //   });
  // };

  const handleTileClick = (x: number, y: number) => {
    if (!isEditing || !editedMap || !selectedMap) return;

    if (currentTool === 'paint') {
      // Paint a tile
      const tileset = AreaMapTileSetRegistry.getById(editedMap.tilesetId);
      if (!tileset) return;

      const tileType = tileset.tileTypes.find(tt => tt.char === selectedTileChar);
      if (!tileType) return;

      // Update the grid
      const newGrid = [...editedMap.grid];
      newGrid[y] = [...newGrid[y]];
      newGrid[y][x] = {
        behavior: tileType.behavior,
        walkable: tileType.walkable,
        passable: tileType.passable,
        spriteId: tileType.spriteId,
        terrainType: tileType.terrainType,
      };

      setEditedMap({
        ...editedMap,
        grid: newGrid,
      });
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
    }
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

  // Render the grid
  const renderGrid = () => {
    const map = isEditing && editedMap ? AreaMap.fromJSON(editedMap) : selectedMap;
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
                spriteSheet={`/assets/${sprite.spriteSheet}.png`}
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

    return (
      <div
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

    const tileset = AreaMapTileSetRegistry.getById(selectedMap.tilesetId);
    if (!tileset) return null;

    return (
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
                  spriteSheet={`/assets/${sprite.spriteSheet}.png`}
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
            onClick={handleExport}
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
            Export YAML
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
          </div>
        )}
      </div>
    </div>
  );
};
