import { useState, useEffect, useRef } from 'react';
import { CombatEncounter } from '../../models/combat/CombatEncounter';
import type { CombatEncounterJSON, EnemyPlacement } from '../../models/combat/CombatEncounter';
import { CombatMap } from '../../models/combat/CombatMap';
import { EnemyRegistry } from '../../utils/EnemyRegistry';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import { TilesetRegistry } from '../../utils/TilesetRegistry';
import { TagFilter } from './TagFilter';
import { EncounterPreview } from './EncounterPreview';
import { CombatView } from '../combat/CombatView';
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

interface EncounterRegistryPanelProps {
  onClose?: () => void;
}

/**
 * Developer panel for browsing and editing combat encounters.
 * This component is only accessible in development mode.
 */
export const EncounterRegistryPanel: React.FC<EncounterRegistryPanelProps> = ({ onClose }) => {
  const [encounters, setEncounters] = useState<CombatEncounter[]>([]);
  const [selectedEncounter, setSelectedEncounter] = useState<CombatEncounter | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedEncounter, setEditedEncounter] = useState<CombatEncounterJSON | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [editedTilesetId, setEditedTilesetId] = useState<string>('');
  const [mapRenderKey, setMapRenderKey] = useState(0);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [testingEncounter, setTestingEncounter] = useState<CombatEncounter | null>(null);

  // Store original encounter state before editing (for cancel/revert)
  const originalEncounterRef = useRef<CombatEncounterJSON | null>(null);

  // Load encounters from registry
  useEffect(() => {
    loadEncounters();
  }, []);

  // Extract all unique tags when encounters change
  useEffect(() => {
    const tagSet = new Set<string>();
    encounters.forEach(_encounter => {
      // We can add tags to encounters later, for now just use empty
      // In the future: encounter.tags?.forEach(tag => tagSet.add(tag));
    });
    setAllTags(Array.from(tagSet).sort());
  }, [encounters]);

  const loadEncounters = () => {
    const allEncounters = CombatEncounter.getAll();
    setEncounters(allEncounters);
  };

  const handleSelectEncounter = (encounter: CombatEncounter) => {
    setSelectedEncounter(encounter);
    setIsEditing(false);
    setEditedEncounter(null);
  };

  const handleEdit = () => {
    if (!selectedEncounter) return;

    // Store a deep copy of the original encounter state for cancel/revert
    originalEncounterRef.current = selectedEncounter.toJSON();

    setIsEditing(true);
    setEditedEncounter(selectedEncounter.toJSON());
    setSelectedTileIndex(null); // Clear tile selection when starting to edit

    // Load the encounter's tileset if it has one, otherwise default to first available
    const tilesets = TilesetRegistry.getAll();
    setEditedTilesetId(selectedEncounter.tilesetId || (tilesets.length > 0 ? tilesets[0].id : ''));
  };

  const handleCancelEdit = () => {
    // Restore the original encounter state
    if (originalEncounterRef.current && selectedEncounter) {
      const originalData = originalEncounterRef.current;

      // Recreate the encounter from the stored JSON to restore all properties including the map
      const restoredEncounter = CombatEncounter.fromJSON(originalData);

      // Update the selectedEncounter with the restored data
      (selectedEncounter as any).id = restoredEncounter.id;
      (selectedEncounter as any).name = restoredEncounter.name;
      (selectedEncounter as any).description = restoredEncounter.description;
      (selectedEncounter as any).enemyPlacements = restoredEncounter.enemyPlacements;
      (selectedEncounter as any).playerDeploymentZones = restoredEncounter.playerDeploymentZones;
      (selectedEncounter as any).tilesetId = restoredEncounter.tilesetId;
      (selectedEncounter as any).map = restoredEncounter.map;
      (selectedEncounter as any).victoryConditions = restoredEncounter.victoryConditions;
      (selectedEncounter as any).defeatConditions = restoredEncounter.defeatConditions;

      // Clear the original state
      originalEncounterRef.current = null;
    }

    setIsEditing(false);
    setEditedEncounter(null);
    setSelectedTileIndex(null);
    setMapRenderKey(prev => prev + 1); // Force re-render with restored map
  };

  const handleSaveEdit = () => {
    if (!editedEncounter) return;

    // Validation: Check for ID conflicts
    const existingEncounter = CombatEncounter.getById(editedEncounter.id);
    if (existingEncounter && selectedEncounter && existingEncounter.id !== selectedEncounter.id) {
      alert(`Error: An encounter with ID "${editedEncounter.id}" already exists. Please use a different ID.`);
      return;
    }

    // Validation: Check for duplicate deployment zone positions
    const deploymentPositions = new Set<string>();
    for (const zone of editedEncounter.playerDeploymentZones) {
      const posKey = `${zone.x},${zone.y}`;
      if (deploymentPositions.has(posKey)) {
        alert(`Error: Duplicate deployment zone at position (${zone.x}, ${zone.y}). Each deployment zone must have a unique position.`);
        return;
      }
      deploymentPositions.add(posKey);
    }

    // Validation: Check for duplicate enemy positions
    const enemyPositions = new Set<string>();
    for (const placement of editedEncounter.enemyPlacements) {
      const posKey = `${placement.position.x},${placement.position.y}`;
      if (enemyPositions.has(posKey)) {
        alert(`Error: Duplicate enemy placement at position (${placement.position.x}, ${placement.position.y}). Each enemy must have a unique position.`);
        return;
      }
      enemyPositions.add(posKey);
    }

    // Validation: Check for positions that overlap between enemies and deployment zones
    for (const zone of editedEncounter.playerDeploymentZones) {
      const posKey = `${zone.x},${zone.y}`;
      if (enemyPositions.has(posKey)) {
        alert(`Error: Position (${zone.x}, ${zone.y}) is used by both a deployment zone and an enemy. Positions cannot overlap.`);
        return;
      }
    }

    try {
      // Always reconstruct the encounter from JSON to ensure consistency
      // This avoids mixing plain objects with class instances
      const oldId = selectedEncounter?.id;
      const idChanged = selectedEncounter && selectedEncounter.id !== editedEncounter.id;

      // Build the complete encounter data including the map
      const encounterData = {
        ...editedEncounter,
        map: {
          tilesetId: editedTilesetId,
          grid: selectedEncounter ? mapGridToASCII(selectedEncounter) : '##########\n#........#\n#........#\n#........#\n#........#\n#........#\n#........#\n##########'
        }
      };

      // If ID changed, remove the old entry from registry
      if (idChanged) {
        (CombatEncounter as any).registry.delete(oldId);
      } else if (selectedEncounter) {
        // If ID didn't change, also remove the old entry so we can recreate it
        (CombatEncounter as any).registry.delete(selectedEncounter.id);
      }

      // Create new encounter from JSON (this will auto-register it)
      const updatedEncounter = CombatEncounter.fromJSON(encounterData as any);

      // Update UI state
      setSelectedEncounter(updatedEncounter);
      setIsEditing(false);
      setEditedEncounter(null);

      // Refresh the encounter list to show the updated registry
      setEncounters(CombatEncounter.getAll());
    } catch (error) {
      console.error('Failed to save encounter:', error);
      alert(`Failed to save encounter: ${error}`);
    }
  };

  // Helper function to convert map grid to ASCII string
  const mapGridToASCII = (encounter: CombatEncounter): string => {
    const tileset = encounter.tilesetId ? TilesetRegistry.getById(encounter.tilesetId) : null;
    if (!tileset) {
      // Fallback if no tileset
      return '##########\n#........#\n#........#\n#........#\n#........#\n#........#\n#........#\n##########';
    }

    const rows: string[] = [];
    for (let y = 0; y < encounter.map.height; y++) {
      let row = '';
      for (let x = 0; x < encounter.map.width; x++) {
        const cell = encounter.map.getCell({ x, y });
        if (!cell) {
          row += '.'; // Default to floor
          continue;
        }

        // Find the matching tile type character
        const tileType = tileset.tileTypes.find(tt =>
          tt.terrain === cell.terrain &&
          tt.walkable === cell.walkable &&
          tt.spriteId === cell.spriteId
        );

        if (tileType) {
          row += tileType.char;
        } else {
          // Fallback: try to match by terrain and walkable only
          const fallbackTileType = tileset.tileTypes.find(tt =>
            tt.terrain === cell.terrain &&
            tt.walkable === cell.walkable
          );
          row += fallbackTileType ? fallbackTileType.char : '.';
        }
      }
      rows.push(row);
    }
    return rows.join('\n');
  };

  const handleExport = () => {
    // Build encounters data with tileset references
    const encountersData = {
      encounters: encounters.map(e => {
        // Use the encounter's tileset if available, otherwise use a default
        const tilesetId = e.tilesetId || 'forest';

        // Serialize the actual map grid
        const mapData = {
          tilesetId: tilesetId,
          grid: mapGridToASCII(e)
        };

        // Convert encounter to JSON, which handles converting all nested objects properly
        const json = JSON.parse(JSON.stringify(e));

        // Return the data structure for YAML export
        return {
          id: json.id,
          name: json.name,
          description: json.description,
          map: mapData,
          victoryConditions: json.victoryConditions,
          defeatConditions: json.defeatConditions,
          playerDeploymentZones: json.playerDeploymentZones,
          enemyPlacements: json.enemyPlacements,
        };
      })
    };

    const yamlString = yaml.dump(encountersData, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });

    const blob = new Blob([yamlString], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'encounter-database.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFieldChange = (field: keyof CombatEncounterJSON, value: any) => {
    if (!editedEncounter) return;
    setEditedEncounter({
      ...editedEncounter,
      [field]: value,
    });
  };

  const handleAddEnemyPlacement = () => {
    if (!editedEncounter || !selectedEncounter) return;

    // Find the first empty walkable tile
    let foundPosition: { x: number; y: number } | null = null;

    for (let y = 0; y < selectedEncounter.map.height; y++) {
      for (let x = 0; x < selectedEncounter.map.width; x++) {
        const cell = selectedEncounter.map.getCell({ x, y });

        // Check if cell is walkable
        if (!cell?.walkable) continue;

        // Check if position is occupied by an enemy
        const isOccupiedByEnemy = editedEncounter.enemyPlacements.some(
          placement => placement.position.x === x && placement.position.y === y
        );
        if (isOccupiedByEnemy) continue;

        // Check if position is occupied by a deployment zone
        const isOccupiedByDeployment = editedEncounter.playerDeploymentZones.some(
          zone => zone.x === x && zone.y === y
        );
        if (isOccupiedByDeployment) continue;

        // Found an empty walkable tile!
        foundPosition = { x, y };
        break;
      }
      if (foundPosition) break;
    }

    // If no empty position found, default to (0, 0)
    const position = foundPosition || { x: 0, y: 0 };

    const newPlacement: EnemyPlacement = {
      enemyId: EnemyRegistry.getAllIds()[0] || 'goblin',
      position: position,
    };

    const newPlacements = [...editedEncounter.enemyPlacements, newPlacement];

    setEditedEncounter({
      ...editedEncounter,
      enemyPlacements: newPlacements,
    });

    // Also update selectedEncounter for preview
    (selectedEncounter as any).enemyPlacements = newPlacements;
    setMapRenderKey(prev => prev + 1);
  };

  const handleTilePlacement = (x: number, y: number, tileTypeIndex: number, skipRerender?: boolean) => {
    if (!editedEncounter || !selectedEncounter) return;

    // Get the tileset to find the tile type
    const tileset = TilesetRegistry.getById(editedTilesetId);
    if (!tileset) return;

    const tileType = tileset.tileTypes[tileTypeIndex];
    if (!tileType) return;

    // Update the map cell
    const updatedMap = selectedEncounter.map;
    updatedMap.setCell({ x, y }, {
      terrain: tileType.terrain,
      walkable: tileType.walkable,
      spriteId: tileType.spriteId,
    });

    // Force a re-render by incrementing the render key (unless skipped for batching)
    if (!skipRerender) {
      setMapRenderKey(prev => prev + 1);
    }
  };

  // Batch update for multiple tile placements (used during drag)
  const handleBatchTilePlacement = (tiles: Array<{ x: number; y: number; tileTypeIndex: number }>) => {
    if (!editedEncounter || !selectedEncounter) return;

    // Place all tiles without re-rendering
    for (const tile of tiles) {
      handleTilePlacement(tile.x, tile.y, tile.tileTypeIndex, true);
    }

    // Single re-render after all tiles are placed
    setMapRenderKey(prev => prev + 1);
  };

  const handleResizeMap = (newWidth: number, newHeight: number) => {
    if (!editedEncounter || !selectedEncounter) return;

    const oldMap = selectedEncounter.map;
    const oldWidth = oldMap.width;
    const oldHeight = oldMap.height;

    // No change needed
    if (newWidth === oldWidth && newHeight === oldHeight) return;

    // Clamp values
    newWidth = Math.max(3, Math.min(50, newWidth));
    newHeight = Math.max(3, Math.min(50, newHeight));

    // Get the tileset to determine default tile
    const tileset = editedTilesetId ? TilesetRegistry.getById(editedTilesetId) : null;
    const floorTile = tileset?.tileTypes.find(tt => tt.walkable === true) || {
      terrain: 'floor' as const,
      walkable: true,
      spriteId: undefined,
    };

    // Create new grid preserving existing tiles
    const newGrid: any[][] = [];
    for (let y = 0; y < newHeight; y++) {
      const row: any[] = [];
      for (let x = 0; x < newWidth; x++) {
        if (x < oldWidth && y < oldHeight) {
          // Preserve existing cell
          const cell = oldMap.getCell({ x, y });
          row.push(cell || { terrain: floorTile.terrain, walkable: floorTile.walkable, spriteId: floorTile.spriteId });
        } else {
          // New cell - use floor tile
          row.push({ terrain: floorTile.terrain, walkable: floorTile.walkable, spriteId: floorTile.spriteId });
        }
      }
      newGrid.push(row);
    }

    // Create new map with the resized grid
    const newMap = new CombatMap(newWidth, newHeight, newGrid);

    // Update selectedEncounter's map
    (selectedEncounter as any).map = newMap;

    // Remove enemies and zones that are now out of bounds
    if (editedEncounter) {
      const validEnemies = editedEncounter.enemyPlacements.filter(
        p => p.position.x < newWidth && p.position.y < newHeight
      );
      const validZones = editedEncounter.playerDeploymentZones.filter(
        z => z.x < newWidth && z.y < newHeight
      );

      setEditedEncounter({
        ...editedEncounter,
        enemyPlacements: validEnemies,
        playerDeploymentZones: validZones,
      });

      // Also update selectedEncounter
      (selectedEncounter as any).enemyPlacements = validEnemies;
      (selectedEncounter as any).playerDeploymentZones = validZones;
    }

    // Force re-render
    setMapRenderKey(prev => prev + 1);
  };

  const handleAddDeploymentZone = () => {
    if (!editedEncounter || !selectedEncounter) return;

    // Find the first empty walkable tile
    let foundPosition: { x: number; y: number } | null = null;

    for (let y = 0; y < selectedEncounter.map.height; y++) {
      for (let x = 0; x < selectedEncounter.map.width; x++) {
        const cell = selectedEncounter.map.getCell({ x, y });

        // Check if cell is walkable
        if (!cell?.walkable) continue;

        // Check if position is occupied by an enemy
        const isOccupiedByEnemy = editedEncounter.enemyPlacements.some(
          placement => placement.position.x === x && placement.position.y === y
        );
        if (isOccupiedByEnemy) continue;

        // Check if position is occupied by another deployment zone
        const isOccupiedByZone = editedEncounter.playerDeploymentZones.some(
          zone => zone.x === x && zone.y === y
        );
        if (isOccupiedByZone) continue;

        // Found an empty walkable tile!
        foundPosition = { x, y };
        break;
      }
      if (foundPosition) break;
    }

    // If no empty position found, default to (0, 0)
    const position = foundPosition || { x: 0, y: 0 };

    const newZones = [...editedEncounter.playerDeploymentZones, position];

    setEditedEncounter({
      ...editedEncounter,
      playerDeploymentZones: newZones,
    });

    // Also update selectedEncounter for preview
    (selectedEncounter as any).playerDeploymentZones = newZones;
    setMapRenderKey(prev => prev + 1);
  };

  const handleDuplicate = () => {
    if (!selectedEncounter) return;

    // Generate a unique ID for the duplicated encounter
    let newId = `${selectedEncounter.id}-copy`;
    let counter = 1;
    while (CombatEncounter.getById(newId)) {
      newId = `${selectedEncounter.id}-copy-${counter}`;
      counter++;
    }

    // Create the duplicated encounter data
    const duplicatedEncounter = {
      ...selectedEncounter.toJSON(),
      id: newId,
      name: `${selectedEncounter.name} (Copy)`,
      map: {
        tilesetId: selectedEncounter.tilesetId || 'forest',
        grid: mapGridToASCII(selectedEncounter)
      }
    };

    try {
      // Create the new encounter
      const newEncounter = CombatEncounter.fromJSON(duplicatedEncounter as any);

      // Refresh the encounter list
      loadEncounters();

      // Select the newly created encounter
      setSelectedEncounter(newEncounter);

      console.log(`Duplicated encounter: ${selectedEncounter.id} -> ${newId}`);
    } catch (error) {
      console.error('Failed to duplicate encounter:', error);
      alert(`Failed to duplicate encounter: ${error}`);
    }
  };

  const handleDelete = () => {
    if (!selectedEncounter) return;

    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete the encounter "${selectedEncounter.name}" (${selectedEncounter.id})?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      // Remove the encounter from the registry
      (CombatEncounter as any).registry.delete(selectedEncounter.id);

      // Clear selection
      setSelectedEncounter(null);

      // Refresh the encounter list
      setEncounters(CombatEncounter.getAll());

      console.log(`Deleted encounter: ${selectedEncounter.id}`);
    } catch (error) {
      console.error('Failed to delete encounter:', error);
      alert(`Failed to delete encounter: ${error}`);
    }
  };

  const handleTest = () => {
    if (!selectedEncounter) return;
    setTestingEncounter(selectedEncounter);
  };

  const filteredEncounters = selectedTag
    ? encounters.filter(_encounter => {
        // Future: filter by tags when we add them to encounters
        return true;
      })
    : encounters;

  // If testing an encounter, show the CombatView instead
  if (testingEncounter) {
    return <CombatView encounter={testingEncounter} />;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0, 0, 0, 0.9)',
        border: '2px solid #666',
        padding: '20px',
        borderRadius: '8px',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 2000,
        width: '900px',
        height: '80vh',
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
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #666',
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Encounter Registry Browser</div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={handleExport}
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
            }}
            title="Export all encounters to YAML file"
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
                fontSize: '20px',
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
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Left sidebar - Encounter list */}
        <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Stats */}
          <div
            style={{
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '11px' }}>Registry Stats</div>
            <div style={{ fontSize: '10px', color: '#aaa' }}>
              <div><strong>Total Encounters:</strong> {encounters.length}</div>
              <div><strong>Filtered:</strong> {filteredEncounters.length}</div>
            </div>
          </div>

          {/* Tags */}
          <TagFilter
            tags={allTags}
            selectedTag={selectedTag}
            onTagSelect={setSelectedTag}
          />

          {/* Encounter list */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
              Encounters {selectedTag && `(${selectedTag})`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredEncounters.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', padding: '8px' }}>
                  No encounters found
                </div>
              ) : (
                filteredEncounters.map(encounter => (
                  <div
                    key={encounter.id}
                    onClick={() => handleSelectEncounter(encounter)}
                    style={{
                      padding: '8px',
                      background: selectedEncounter?.id === encounter.id
                        ? 'rgba(33, 150, 243, 0.3)'
                        : 'rgba(255, 255, 255, 0.1)',
                      border: selectedEncounter?.id === encounter.id
                        ? '1px solid rgba(33, 150, 243, 0.6)'
                        : '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{encounter.name}</div>
                    <div style={{ fontSize: '9px', color: '#aaa', marginTop: '2px' }}>
                      ID: {encounter.id}
                    </div>
                    <div style={{ fontSize: '9px', color: '#aaa' }}>
                      {encounter.enemyCount} enemies, {encounter.deploymentSlotCount} slots
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right panel - Encounter details */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0, overflow: 'auto' }}>
          {!selectedEncounter ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#666',
                fontSize: '14px',
              }}
            >
              Select an encounter to view details
            </div>
          ) : (
            <>
              {/* Encounter header */}
              <div
                style={{
                  padding: '16px',
                  background: 'rgba(33, 150, 243, 0.1)',
                  borderRadius: '4px',
                  border: '2px solid rgba(33, 150, 243, 0.4)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedEncounter?.name || ''}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      style={{
                        flex: 1,
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        color: '#fff',
                        padding: '4px 8px',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        borderRadius: '3px',
                      }}
                    />
                  ) : (
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#4fc3f7' }}>
                      {selectedEncounter.name}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!isEditing ? (
                      <>
                        <button
                          onClick={handleTest}
                          style={{
                            padding: '4px 12px',
                            background: 'rgba(33, 150, 243, 0.3)',
                            border: '1px solid rgba(33, 150, 243, 0.6)',
                            borderRadius: '3px',
                            color: '#fff',
                            fontSize: '10px',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                            fontWeight: 'bold',
                          }}
                          title="Test this encounter in combat"
                        >
                          Test
                        </button>
                        <button
                          onClick={handleEdit}
                          style={{
                            padding: '4px 12px',
                            background: 'rgba(76, 175, 80, 0.3)',
                            border: '1px solid rgba(76, 175, 80, 0.6)',
                            borderRadius: '3px',
                            color: '#fff',
                            fontSize: '10px',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={handleDuplicate}
                          style={{
                            padding: '4px 12px',
                            background: 'rgba(255, 193, 7, 0.3)',
                            border: '1px solid rgba(255, 193, 7, 0.6)',
                            borderRadius: '3px',
                            color: '#fff',
                            fontSize: '10px',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                          }}
                          title="Duplicate this encounter"
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={handleDelete}
                          style={{
                            padding: '4px 12px',
                            background: 'rgba(244, 67, 54, 0.3)',
                            border: '1px solid rgba(244, 67, 54, 0.6)',
                            borderRadius: '3px',
                            color: '#fff',
                            fontSize: '10px',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                          }}
                          title="Delete this encounter"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          style={{
                            padding: '4px 12px',
                            background: 'rgba(76, 175, 80, 0.3)',
                            border: '1px solid rgba(76, 175, 80, 0.6)',
                            borderRadius: '3px',
                            color: '#fff',
                            fontSize: '10px',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={{
                            padding: '4px 12px',
                            background: 'rgba(244, 67, 54, 0.3)',
                            border: '1px solid rgba(244, 67, 54, 0.6)',
                            borderRadius: '3px',
                            color: '#fff',
                            fontSize: '10px',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '8px' }}>
                  <strong>ID:</strong> {isEditing ? (
                    <input
                      type="text"
                      value={editedEncounter?.id || ''}
                      onChange={(e) => handleFieldChange('id', e.target.value)}
                      style={{
                        marginLeft: '8px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        color: '#fff',
                        padding: '2px 6px',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        borderRadius: '3px',
                      }}
                    />
                  ) : (
                    <span style={{ marginLeft: '8px' }}>{selectedEncounter.id}</span>
                  )}
                </div>

                <div style={{ fontSize: '11px' }}>
                  {isEditing ? (
                    <textarea
                      value={editedEncounter?.description || ''}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      rows={2}
                      style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        color: '#fff',
                        padding: '6px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        borderRadius: '3px',
                        resize: 'vertical',
                      }}
                    />
                  ) : (
                    selectedEncounter.description
                  )}
                </div>
              </div>

              {/* Map info */}
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>Map</div>
                <div style={{ fontSize: '10px', color: '#aaa' }}>
                  <div><strong>Size:</strong> {selectedEncounter.map.width} × {selectedEncounter.map.height}</div>

                  {/* Show current tileset when not editing */}
                  {!isEditing && selectedEncounter.tilesetId && (
                    <div style={{ marginTop: '4px' }}>
                      <strong>Tileset:</strong> {(() => {
                        const tileset = TilesetRegistry.getById(selectedEncounter.tilesetId!);
                        return tileset ? `${tileset.name} (${tileset.id})` : selectedEncounter.tilesetId;
                      })()}
                    </div>
                  )}
                </div>

                {/* Tileset selection in edit mode */}
                {isEditing && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#aaa' }}>
                      Tileset:
                    </label>
                    <select
                      value={editedTilesetId}
                      onChange={(e) => {
                        setEditedTilesetId(e.target.value);
                        if (selectedEncounter) {
                          (selectedEncounter as any).tilesetId = e.target.value;
                        }
                        setMapRenderKey(prev => prev + 1);
                        setSelectedTileIndex(null); // Clear tile selection when changing tileset
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        color: '#fff',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        borderRadius: '3px',
                      }}
                    >
                      <option value="">Select a tileset...</option>
                      {TilesetRegistry.getAll().map(tileset => (
                        <option key={tileset.id} value={tileset.id}>
                          {tileset.name} ({tileset.id})
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: '9px', color: '#666', marginTop: '4px', fontStyle: 'italic' }}>
                      Note: Changing the tileset will be reflected in the exported YAML. The current map grid will be preserved.
                    </div>
                  </div>
                )}

                {/* Map dimensions in edit mode */}
                {isEditing && selectedEncounter && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#aaa' }}>
                      Map Dimensions:
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '2px', fontSize: '10px', color: '#888' }}>
                          Width:
                        </label>
                        <input
                          type="number"
                          min="3"
                          max="50"
                          value={selectedEncounter.map.width}
                          onChange={(e) => {
                            const newWidth = parseInt(e.target.value) || 3;
                            handleResizeMap(newWidth, selectedEncounter.map.height);
                          }}
                          style={{
                            width: '100%',
                            padding: '6px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            color: '#fff',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '2px', fontSize: '10px', color: '#888' }}>
                          Height:
                        </label>
                        <input
                          type="number"
                          min="3"
                          max="50"
                          value={selectedEncounter.map.height}
                          onChange={(e) => {
                            const newHeight = parseInt(e.target.value) || 3;
                            handleResizeMap(selectedEncounter.map.width, newHeight);
                          }}
                          style={{
                            width: '100%',
                            padding: '6px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            color: '#fff',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: '9px', color: '#666', marginTop: '4px', fontStyle: 'italic' }}>
                      Resizing preserves existing tiles. New tiles will be floor tiles.
                    </div>
                  </div>
                )}
              </div>

              {/* Map Preview */}
              {isEditing && editedEncounter ? (
                <EncounterPreview
                  encounter={selectedEncounter}
                  isEditing={isEditing}
                  onTilePlacement={handleTilePlacement}
                  onBatchTilePlacement={handleBatchTilePlacement}
                  selectedTileIndex={selectedTileIndex}
                  onSelectedTileIndexChange={setSelectedTileIndex}
                  mapUpdateTrigger={mapRenderKey}
                  onEnemyMove={(enemyIndex, newX, newY) => {
                    if (!editedEncounter || !selectedEncounter) return;
                    const newPlacements = [...editedEncounter.enemyPlacements];
                    newPlacements[enemyIndex] = {
                      ...newPlacements[enemyIndex],
                      position: { x: newX, y: newY }
                    };
                    setEditedEncounter({
                      ...editedEncounter,
                      enemyPlacements: newPlacements,
                    });
                    // Also update selectedEncounter for preview
                    (selectedEncounter as any).enemyPlacements = newPlacements;
                    setMapRenderKey(prev => prev + 1);
                  }}
                  onDeploymentZoneMove={(zoneIndex, newX, newY) => {
                    if (!editedEncounter || !selectedEncounter) return;
                    const newZones = [...editedEncounter.playerDeploymentZones];
                    newZones[zoneIndex] = { x: newX, y: newY };
                    setEditedEncounter({
                      ...editedEncounter,
                      playerDeploymentZones: newZones,
                    });
                    // Also update selectedEncounter for preview
                    (selectedEncounter as any).playerDeploymentZones = newZones;
                    setMapRenderKey(prev => prev + 1);
                  }}
                  onEnemyRemove={(enemyIndex) => {
                    if (!editedEncounter || !selectedEncounter) return;
                    const newPlacements = editedEncounter.enemyPlacements.filter((_, i) => i !== enemyIndex);
                    setEditedEncounter({
                      ...editedEncounter,
                      enemyPlacements: newPlacements,
                    });
                    // Also update selectedEncounter for preview
                    (selectedEncounter as any).enemyPlacements = newPlacements;
                    setMapRenderKey(prev => prev + 1);
                  }}
                  onDeploymentZoneRemove={(zoneIndex) => {
                    if (!editedEncounter || !selectedEncounter) return;
                    const newZones = editedEncounter.playerDeploymentZones.filter((_, i) => i !== zoneIndex);
                    setEditedEncounter({
                      ...editedEncounter,
                      playerDeploymentZones: newZones,
                    });
                    // Also update selectedEncounter for preview
                    (selectedEncounter as any).playerDeploymentZones = newZones;
                    setMapRenderKey(prev => prev + 1);
                  }}
                  onEnemyChange={(enemyIndex, newEnemyId) => {
                    if (!editedEncounter || !selectedEncounter) return;
                    const newPlacements = [...editedEncounter.enemyPlacements];
                    newPlacements[enemyIndex] = {
                      ...newPlacements[enemyIndex],
                      enemyId: newEnemyId,
                    };
                    setEditedEncounter({
                      ...editedEncounter,
                      enemyPlacements: newPlacements,
                    });
                    // Also update selectedEncounter for preview
                    (selectedEncounter as any).enemyPlacements = newPlacements;
                    setMapRenderKey(prev => prev + 1);
                  }}
                  onAddEnemy={handleAddEnemyPlacement}
                  onAddZone={handleAddDeploymentZone}
                />
              ) : (
                <EncounterPreview encounter={selectedEncounter} />
              )}

              {/* Player Deployment Zones */}
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(76, 175, 80, 0.1)',
                  borderRadius: '4px',
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>
                  Player Deployment Zones ({isEditing ? editedEncounter?.playerDeploymentZones.length : selectedEncounter.deploymentSlotCount})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(isEditing ? editedEncounter?.playerDeploymentZones : selectedEncounter.playerDeploymentZones)?.map((zone, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        minWidth: '80px',
                      }}
                    >
                      {/* Zone Icon */}
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          background: 'rgba(76, 175, 80, 0.3)',
                          borderRadius: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid rgba(76, 175, 80, 0.6)',
                        }}
                      >
                        <span style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>P</span>
                      </div>

                      {/* Zone Label */}
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                      }}>
                        Zone {index + 1}
                      </div>

                      {/* Position */}
                      <div style={{
                        fontSize: '9px',
                        color: '#aaa',
                        fontFamily: 'monospace',
                      }}>
                        ({zone.x}, {zone.y})
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enemy Placements */}
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(244, 67, 54, 0.1)',
                  borderRadius: '4px',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>
                  Enemy Placements ({isEditing ? editedEncounter?.enemyPlacements.length : selectedEncounter.enemyCount})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(isEditing ? editedEncounter?.enemyPlacements : selectedEncounter.enemyPlacements)?.map((placement, index) => {
                    const enemy = EnemyRegistry.getById(placement.enemyId);
                    const sprite = enemy?.spriteId ? SpriteRegistry.getById(enemy.spriteId) : null;

                    return (
                      <div
                        key={index}
                        style={{
                          padding: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '4px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          minWidth: '80px',
                        }}
                      >
                        {/* Enemy Sprite */}
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            background: 'rgba(0, 0, 0, 0.5)',
                            borderRadius: '3px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {sprite ? (
                            <SpriteCanvas
                              spriteSheet={sprite.spriteSheet}
                              spriteX={sprite.x}
                              spriteY={sprite.y}
                              size={48}
                            />
                          ) : (
                            <span style={{ color: '#f44336', fontSize: '24px', fontWeight: 'bold' }}>E</span>
                          )}
                        </div>

                        {/* Enemy Name */}
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          maxWidth: '80px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {enemy?.name || placement.enemyId}
                        </div>

                        {/* Position */}
                        <div style={{
                          fontSize: '9px',
                          color: '#aaa',
                          fontFamily: 'monospace',
                        }}>
                          ({placement.position.x}, {placement.position.y})
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Victory Conditions */}
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(255, 193, 7, 0.1)',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
                  Victory Conditions ({(isEditing ? editedEncounter?.victoryConditions : selectedEncounter.victoryConditions)?.length || 0})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
                  {(isEditing ? editedEncounter?.victoryConditions : selectedEncounter.victoryConditions)?.map((condition, index) => {
                    // Handle both plain objects (from editedEncounter) and class instances (from selectedEncounter)
                    const conditionData = typeof condition.toJSON === 'function' ? condition.toJSON() : condition;
                    return (
                      <div
                        key={index}
                        style={{
                          padding: '4px 8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '3px',
                        }}
                      >
                        {conditionData.type}: {conditionData.description || 'No description'}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Defeat Conditions */}
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(156, 39, 176, 0.1)',
                  borderRadius: '4px',
                  border: '1px solid rgba(156, 39, 176, 0.3)',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
                  Defeat Conditions ({(isEditing ? editedEncounter?.defeatConditions : selectedEncounter.defeatConditions)?.length || 0})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
                  {(isEditing ? editedEncounter?.defeatConditions : selectedEncounter.defeatConditions)?.map((condition, index) => {
                    // Handle both plain objects (from editedEncounter) and class instances (from selectedEncounter)
                    const conditionData = typeof condition.toJSON === 'function' ? condition.toJSON() : condition;
                    return (
                      <div
                        key={index}
                        style={{
                          padding: '4px 8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '3px',
                        }}
                      >
                        {conditionData.type}: {conditionData.description || 'No description'}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
