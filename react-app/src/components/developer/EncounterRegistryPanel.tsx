import { useState, useEffect } from 'react';
import { CombatEncounter } from '../../models/combat/CombatEncounter';
import type { CombatEncounterJSON, EnemyPlacement } from '../../models/combat/CombatEncounter';
import { EnemyRegistry } from '../../utils/EnemyRegistry';
import { TagFilter } from './TagFilter';
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
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedEncounter(null);
  };

  const handleSaveEdit = () => {
    if (!editedEncounter) return;

    try {
      // Clear old encounter from registry
      CombatEncounter.clearRegistry();

      // Reload all encounters from their original source
      // Then update with our edited one
      const updatedEncounter = CombatEncounter.fromJSON(editedEncounter);

      setSelectedEncounter(updatedEncounter);
      setIsEditing(false);
      setEditedEncounter(null);
      loadEncounters();
    } catch (error) {
      console.error('Failed to save encounter:', error);
      alert(`Failed to save encounter: ${error}`);
    }
  };

  const handleExport = () => {
    const encountersData = {
      encounters: encounters.map(e => e.toJSON())
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
    if (!editedEncounter) return;
    const newPlacement: EnemyPlacement = {
      enemyId: EnemyRegistry.getAllIds()[0] || 'goblin',
      position: { x: 0, y: 0 },
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
    if (!editedEncounter) return;
    setEditedEncounter({
      ...editedEncounter,
      playerDeploymentZones: [...editedEncounter.playerDeploymentZones, { x: 0, y: 0 }],
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
                </div>
              </div>

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
