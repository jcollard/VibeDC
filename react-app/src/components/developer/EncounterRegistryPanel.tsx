import { useState, useEffect } from 'react';
import { CombatEncounter } from '../../models/combat/CombatEncounter';
import type { CombatEncounterJSON, EnemyPlacement } from '../../models/combat/CombatEncounter';
import { EnemyRegistry } from '../../utils/EnemyRegistry';
import { TilesetRegistry } from '../../utils/TilesetRegistry';
import { TagFilter } from './TagFilter';
import { EncounterPreview } from './EncounterPreview';
import * as yaml from 'js-yaml';

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
    setIsEditing(true);
    setEditedEncounter(selectedEncounter.toJSON());

    // Load the encounter's tileset if it has one, otherwise default to first available
    const tilesets = TilesetRegistry.getAll();
    setEditedTilesetId(selectedEncounter.tilesetId || (tilesets.length > 0 ? tilesets[0].id : ''));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedEncounter(null);
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
      // Update the encounter's map to include the edited tileset ID
      // We need to create a map object that includes the tilesetId
      const encounterWithTileset = {
        ...editedEncounter,
        map: {
          tilesetId: editedTilesetId,
          grid: '##########\n#........#\n#........#\n#........#\n#........#\n#........#\n#........#\n##########' // Placeholder grid
        }
      };

      // Remove the old encounter from registry if ID changed
      // (The new one will be auto-registered by the constructor)
      if (selectedEncounter && selectedEncounter.id !== editedEncounter.id) {
        // Manually remove from the registry since there's no unregister method
        // The constructor will add the new one with the new ID
        (CombatEncounter as any).registry.delete(selectedEncounter.id);
      }

      // Create the updated encounter (will auto-register with potentially new ID)
      const updatedEncounter = CombatEncounter.fromJSON(encounterWithTileset as any);

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

  const handleExport = () => {
    // Build encounters data with tileset references
    const encountersData = {
      encounters: encounters.map(e => {
        const json = e.toJSON();

        // Use the encounter's tileset if available, otherwise use a default
        const tilesetId = e.tilesetId || 'forest';

        // Create a simple grid representation
        // In a real implementation, you'd want to serialize the actual map grid
        const mapData = {
          tilesetId: tilesetId,
          grid: '##########\n#........#\n#........#\n#........#\n#........#\n#........#\n#........#\n##########'
        };

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

    setEditedEncounter({
      ...editedEncounter,
      enemyPlacements: [...editedEncounter.enemyPlacements, newPlacement],
    });
  };

  const handleRemoveEnemyPlacement = (index: number) => {
    if (!editedEncounter) return;
    const newPlacements = editedEncounter.enemyPlacements.filter((_, i) => i !== index);
    setEditedEncounter({
      ...editedEncounter,
      enemyPlacements: newPlacements,
    });
  };

  const handleUpdateEnemyPlacement = (index: number, field: 'enemyId' | 'x' | 'y', value: string | number) => {
    if (!editedEncounter) return;
    const newPlacements = [...editedEncounter.enemyPlacements];
    if (field === 'enemyId') {
      newPlacements[index] = { ...newPlacements[index], enemyId: value as string };
    } else if (field === 'x') {
      newPlacements[index] = {
        ...newPlacements[index],
        position: { ...newPlacements[index].position, x: Number(value) }
      };
    } else if (field === 'y') {
      newPlacements[index] = {
        ...newPlacements[index],
        position: { ...newPlacements[index].position, y: Number(value) }
      };
    }
    setEditedEncounter({
      ...editedEncounter,
      enemyPlacements: newPlacements,
    });
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

    setEditedEncounter({
      ...editedEncounter,
      playerDeploymentZones: [...editedEncounter.playerDeploymentZones, position],
    });
  };

  const handleRemoveDeploymentZone = (index: number) => {
    if (!editedEncounter) return;
    const newZones = editedEncounter.playerDeploymentZones.filter((_, i) => i !== index);
    setEditedEncounter({
      ...editedEncounter,
      playerDeploymentZones: newZones,
    });
  };

  const handleUpdateDeploymentZone = (index: number, field: 'x' | 'y', value: number) => {
    if (!editedEncounter) return;
    const newZones = [...editedEncounter.playerDeploymentZones];
    newZones[index] = { ...newZones[index], [field]: value };
    setEditedEncounter({
      ...editedEncounter,
      playerDeploymentZones: newZones,
    });
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
        grid: '##########\n#........#\n#........#\n#........#\n#........#\n#........#\n#........#\n##########'
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

  const filteredEncounters = selectedTag
    ? encounters.filter(_encounter => {
        // Future: filter by tags when we add them to encounters
        return true;
      })
    : encounters;

  const availableEnemies = EnemyRegistry.getAllIds();

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
                      onChange={(e) => setEditedTilesetId(e.target.value)}
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
              </div>

              {/* Map Preview */}
              {isEditing && editedEncounter ? (
                <EncounterPreview
                  encounter={CombatEncounter.fromJSON({
                    ...editedEncounter,
                    map: {
                      tilesetId: editedTilesetId,
                      grid: '##########\n#........#\n#........#\n#........#\n#........#\n#........#\n#........#\n##########'
                    }
                  } as any)}
                  isEditing={isEditing}
                  onEnemyMove={(enemyIndex, newX, newY) => {
                    if (!editedEncounter) return;
                    const newPlacements = [...editedEncounter.enemyPlacements];
                    newPlacements[enemyIndex] = {
                      ...newPlacements[enemyIndex],
                      position: { x: newX, y: newY }
                    };
                    setEditedEncounter({
                      ...editedEncounter,
                      enemyPlacements: newPlacements,
                    });
                  }}
                  onDeploymentZoneMove={(zoneIndex, newX, newY) => {
                    if (!editedEncounter) return;
                    const newZones = [...editedEncounter.playerDeploymentZones];
                    newZones[zoneIndex] = { x: newX, y: newY };
                    setEditedEncounter({
                      ...editedEncounter,
                      playerDeploymentZones: newZones,
                    });
                  }}
                  onEnemyRemove={(enemyIndex) => {
                    if (!editedEncounter) return;
                    const newPlacements = editedEncounter.enemyPlacements.filter((_, i) => i !== enemyIndex);
                    setEditedEncounter({
                      ...editedEncounter,
                      enemyPlacements: newPlacements,
                    });
                  }}
                  onDeploymentZoneRemove={(zoneIndex) => {
                    if (!editedEncounter) return;
                    const newZones = editedEncounter.playerDeploymentZones.filter((_, i) => i !== zoneIndex);
                    setEditedEncounter({
                      ...editedEncounter,
                      playerDeploymentZones: newZones,
                    });
                  }}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                    Player Deployment Zones ({isEditing ? editedEncounter?.playerDeploymentZones.length : selectedEncounter.deploymentSlotCount})
                  </div>
                  {isEditing && (
                    <button
                      onClick={handleAddDeploymentZone}
                      style={{
                        padding: '2px 8px',
                        background: 'rgba(76, 175, 80, 0.3)',
                        border: '1px solid rgba(76, 175, 80, 0.6)',
                        borderRadius: '3px',
                        color: '#fff',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                      }}
                    >
                      + Add Zone
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
                  {(isEditing ? editedEncounter?.playerDeploymentZones : selectedEncounter.playerDeploymentZones)?.map((zone, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {isEditing ? (
                        <>
                          <span>Zone {index + 1}:</span>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            X:
                            <input
                              type="number"
                              value={zone.x}
                              onChange={(e) => handleUpdateDeploymentZone(index, 'x', Number(e.target.value))}
                              style={{
                                width: '50px',
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                color: '#fff',
                                padding: '2px 4px',
                                fontSize: '10px',
                                fontFamily: 'monospace',
                                borderRadius: '3px',
                              }}
                            />
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Y:
                            <input
                              type="number"
                              value={zone.y}
                              onChange={(e) => handleUpdateDeploymentZone(index, 'y', Number(e.target.value))}
                              style={{
                                width: '50px',
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                color: '#fff',
                                padding: '2px 4px',
                                fontSize: '10px',
                                fontFamily: 'monospace',
                                borderRadius: '3px',
                              }}
                            />
                          </label>
                          <button
                            onClick={() => handleRemoveDeploymentZone(index)}
                            style={{
                              marginLeft: 'auto',
                              padding: '2px 6px',
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
                        </>
                      ) : (
                        <span>Zone {index + 1}: ({zone.x}, {zone.y})</span>
                      )}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                    Enemy Placements ({isEditing ? editedEncounter?.enemyPlacements.length : selectedEncounter.enemyCount})
                  </div>
                  {isEditing && (
                    <button
                      onClick={handleAddEnemyPlacement}
                      style={{
                        padding: '2px 8px',
                        background: 'rgba(244, 67, 54, 0.3)',
                        border: '1px solid rgba(244, 67, 54, 0.6)',
                        borderRadius: '3px',
                        color: '#fff',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                      }}
                    >
                      + Add Enemy
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '10px' }}>
                  {(isEditing ? editedEncounter?.enemyPlacements : selectedEncounter.enemyPlacements)?.map((placement, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '6px 8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '3px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Enemy {index + 1}</span>
                            <button
                              onClick={() => handleRemoveEnemyPlacement(index)}
                              style={{
                                marginLeft: 'auto',
                                padding: '2px 6px',
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                              Enemy:
                              <select
                                value={placement.enemyId}
                                onChange={(e) => handleUpdateEnemyPlacement(index, 'enemyId', e.target.value)}
                                style={{
                                  flex: 1,
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  border: '1px solid rgba(255, 255, 255, 0.3)',
                                  color: '#fff',
                                  padding: '2px 4px',
                                  fontSize: '10px',
                                  fontFamily: 'monospace',
                                  borderRadius: '3px',
                                }}
                              >
                                {availableEnemies.map(enemyId => (
                                  <option key={enemyId} value={enemyId}>
                                    {enemyId}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              X:
                              <input
                                type="number"
                                value={placement.position.x}
                                onChange={(e) => handleUpdateEnemyPlacement(index, 'x', e.target.value)}
                                style={{
                                  width: '50px',
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  border: '1px solid rgba(255, 255, 255, 0.3)',
                                  color: '#fff',
                                  padding: '2px 4px',
                                  fontSize: '10px',
                                  fontFamily: 'monospace',
                                  borderRadius: '3px',
                                }}
                              />
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              Y:
                              <input
                                type="number"
                                value={placement.position.y}
                                onChange={(e) => handleUpdateEnemyPlacement(index, 'y', e.target.value)}
                                style={{
                                  width: '50px',
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  border: '1px solid rgba(255, 255, 255, 0.3)',
                                  color: '#fff',
                                  padding: '2px 4px',
                                  fontSize: '10px',
                                  fontFamily: 'monospace',
                                  borderRadius: '3px',
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontWeight: 'bold' }}>Enemy {index + 1}: {placement.enemyId}</div>
                          <div style={{ color: '#aaa', marginTop: '2px' }}>
                            Position: ({placement.position.x}, {placement.position.y})
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
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
                  Victory Conditions ({selectedEncounter.victoryConditions.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
                  {selectedEncounter.victoryConditions.map((condition, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '3px',
                      }}
                    >
                      {condition.toJSON().type}: {condition.toJSON().description || 'No description'}
                    </div>
                  ))}
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
                  Defeat Conditions ({selectedEncounter.defeatConditions.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
                  {selectedEncounter.defeatConditions.map((condition, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '3px',
                      }}
                    >
                      {condition.toJSON().type}: {condition.toJSON().description || 'No description'}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
