import { useState, useEffect } from 'react';
import { TilesetRegistry } from '../../utils/TilesetRegistry';
import type { TilesetDefinition, TilesetDefinitionJSON } from '../../utils/TilesetRegistry';
import type { TileDefinition } from '../../models/combat/CombatMap';
import { TagFilter } from './TagFilter';
import * as yaml from 'js-yaml';

interface TilesetRegistryPanelProps {
  onClose?: () => void;
}

/**
 * Developer panel for browsing and editing tilesets.
 * This component is only accessible in development mode.
 */
export const TilesetRegistryPanel: React.FC<TilesetRegistryPanelProps> = ({ onClose }) => {
  const [tilesets, setTilesets] = useState<TilesetDefinition[]>([]);
  const [selectedTileset, setSelectedTileset] = useState<TilesetDefinition | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTileset, setEditedTileset] = useState<TilesetDefinitionJSON | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);

  // Load tilesets from registry
  useEffect(() => {
    loadTilesets();
  }, []);

  // Extract all unique tags when tilesets change
  useEffect(() => {
    const tagSet = new Set<string>();
    tilesets.forEach(tileset => {
      tileset.tags?.forEach(tag => tagSet.add(tag));
    });
    setAllTags(Array.from(tagSet).sort());
  }, [tilesets]);

  const loadTilesets = () => {
    const allTilesets = TilesetRegistry.getAll();
    setTilesets(allTilesets);
  };

  const handleSelectTileset = (tileset: TilesetDefinition) => {
    setSelectedTileset(tileset);
    setIsEditing(false);
    setEditedTileset(null);
  };

  const handleEdit = () => {
    if (!selectedTileset) return;
    setIsEditing(true);
    setEditedTileset({
      id: selectedTileset.id,
      name: selectedTileset.name,
      description: selectedTileset.description,
      tileTypes: [...selectedTileset.tileTypes],
      tags: selectedTileset.tags ? [...selectedTileset.tags] : [],
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedTileset(null);
  };

  const handleSaveEdit = () => {
    if (!editedTileset || !selectedTileset) return;

    try {
      // If ID changed, remove the old tileset
      if (editedTileset.id !== selectedTileset.id) {
        TilesetRegistry.unregister(selectedTileset.id);
      }

      // Register the updated tileset
      TilesetRegistry.register(editedTileset);

      setSelectedTileset(editedTileset);
      setIsEditing(false);
      setEditedTileset(null);
      loadTilesets();
    } catch (error) {
      console.error('Failed to save tileset:', error);
      alert(`Failed to save tileset: ${error}`);
    }
  };

  const handleExport = () => {
    const tilesetsData: TilesetDefinitionJSON[] = tilesets.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      tileTypes: t.tileTypes,
      tags: t.tags,
    }));

    const yamlString = yaml.dump({ tilesets: tilesetsData }, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });

    const blob = new Blob([yamlString], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tileset-database.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFieldChange = (field: keyof TilesetDefinitionJSON, value: any) => {
    if (!editedTileset) return;
    setEditedTileset({
      ...editedTileset,
      [field]: value,
    });
  };

  const handleAddTileType = () => {
    if (!editedTileset) return;
    const newTileType: TileDefinition = {
      char: '?',
      terrain: 'floor',
      walkable: true,
      spriteId: '',
    };
    setEditedTileset({
      ...editedTileset,
      tileTypes: [...editedTileset.tileTypes, newTileType],
    });
  };

  const handleRemoveTileType = (index: number) => {
    if (!editedTileset) return;
    const newTileTypes = editedTileset.tileTypes.filter((_, i) => i !== index);
    setEditedTileset({
      ...editedTileset,
      tileTypes: newTileTypes,
    });
  };

  const handleUpdateTileType = (index: number, field: keyof TileDefinition, value: any) => {
    if (!editedTileset) return;
    const newTileTypes = [...editedTileset.tileTypes];
    newTileTypes[index] = {
      ...newTileTypes[index],
      [field]: field === 'walkable' ? value === 'true' : value,
    };
    setEditedTileset({
      ...editedTileset,
      tileTypes: newTileTypes,
    });
  };

  const filteredTilesets = selectedTag
    ? tilesets.filter(tileset => tileset.tags?.includes(selectedTag))
    : tilesets;

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
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Tileset Registry Browser</div>
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
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(33, 150, 243, 0.5)';
              e.currentTarget.style.borderColor = 'rgba(33, 150, 243, 0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(33, 150, 243, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(33, 150, 243, 0.6)';
            }}
            title="Export all tilesets to YAML file"
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
        {/* Left sidebar - Tileset list */}
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
              <div><strong>Total Tilesets:</strong> {tilesets.length}</div>
              <div><strong>Filtered:</strong> {filteredTilesets.length}</div>
            </div>
          </div>

          {/* Tags */}
          <TagFilter
            tags={allTags}
            selectedTag={selectedTag}
            onTagSelect={setSelectedTag}
          />

          {/* Tileset list */}
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
              Tilesets {selectedTag && `(${selectedTag})`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredTilesets.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', padding: '8px' }}>
                  No tilesets found
                </div>
              ) : (
                filteredTilesets.map(tileset => (
                  <div
                    key={tileset.id}
                    onClick={() => handleSelectTileset(tileset)}
                    style={{
                      padding: '8px',
                      background: selectedTileset?.id === tileset.id
                        ? 'rgba(33, 150, 243, 0.3)'
                        : 'rgba(255, 255, 255, 0.1)',
                      border: selectedTileset?.id === tileset.id
                        ? '1px solid rgba(33, 150, 243, 0.6)'
                        : '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedTileset?.id !== tileset.id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedTileset?.id !== tileset.id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{tileset.name}</div>
                    <div style={{ fontSize: '9px', color: '#aaa', marginTop: '2px' }}>
                      ID: {tileset.id}
                    </div>
                    <div style={{ fontSize: '9px', color: '#aaa' }}>
                      {tileset.tileTypes.length} tile types
                    </div>
                    {tileset.tags && tileset.tags.length > 0 && (
                      <div style={{ fontSize: '9px', color: '#4caf50', marginTop: '2px' }}>
                        {tileset.tags.join(', ')}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right panel - Tileset details */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0, overflow: 'auto' }}>
          {!selectedTileset ? (
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
              Select a tileset to view details
            </div>
          ) : (
            <>
              {/* Tileset header */}
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
                      value={editedTileset?.name || ''}
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
                      {selectedTileset.name}
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
                      value={editedTileset?.id || ''}
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
                    <span style={{ marginLeft: '8px' }}>{selectedTileset.id}</span>
                  )}
                </div>

                <div style={{ fontSize: '11px', marginBottom: '8px' }}>
                  {isEditing ? (
                    <textarea
                      value={editedTileset?.description || ''}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      placeholder="Description (optional)"
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
                    selectedTileset.description || <span style={{ color: '#666', fontStyle: 'italic' }}>No description</span>
                  )}
                </div>

                {selectedTileset.tags && selectedTileset.tags.length > 0 && (
                  <div style={{ fontSize: '10px' }}>
                    <strong>Tags:</strong> <span style={{ color: '#4caf50', marginLeft: '8px' }}>
                      {selectedTileset.tags.join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Tile Types */}
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(255, 193, 7, 0.1)',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                    Tile Types ({isEditing ? editedTileset?.tileTypes.length : selectedTileset.tileTypes.length})
                  </div>
                  {isEditing && (
                    <button
                      onClick={handleAddTileType}
                      style={{
                        padding: '2px 8px',
                        background: 'rgba(255, 193, 7, 0.3)',
                        border: '1px solid rgba(255, 193, 7, 0.6)',
                        borderRadius: '3px',
                        color: '#fff',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                      }}
                    >
                      + Add Tile Type
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '10px' }}>
                  {(isEditing ? editedTileset?.tileTypes : selectedTileset.tileTypes)?.map((tile, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '3px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '80px' }}>
                              Char:
                              <input
                                type="text"
                                value={tile.char}
                                onChange={(e) => handleUpdateTileType(index, 'char', e.target.value)}
                                maxLength={1}
                                style={{
                                  width: '40px',
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  border: '1px solid rgba(255, 255, 255, 0.3)',
                                  color: '#fff',
                                  padding: '2px 4px',
                                  fontSize: '10px',
                                  fontFamily: 'monospace',
                                  borderRadius: '3px',
                                  textAlign: 'center',
                                }}
                              />
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                              Terrain:
                              <select
                                value={tile.terrain}
                                onChange={(e) => handleUpdateTileType(index, 'terrain', e.target.value)}
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
                                <option value="floor">floor</option>
                                <option value="wall">wall</option>
                                <option value="water">water</option>
                                <option value="pit">pit</option>
                                <option value="lava">lava</option>
                              </select>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              Walkable:
                              <select
                                value={tile.walkable ? 'true' : 'false'}
                                onChange={(e) => handleUpdateTileType(index, 'walkable', e.target.value)}
                                style={{
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  border: '1px solid rgba(255, 255, 255, 0.3)',
                                  color: '#fff',
                                  padding: '2px 4px',
                                  fontSize: '10px',
                                  fontFamily: 'monospace',
                                  borderRadius: '3px',
                                }}
                              >
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                              </select>
                            </label>
                            <button
                              onClick={() => handleRemoveTileType(index)}
                              style={{
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
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Sprite ID:
                            <input
                              type="text"
                              value={tile.spriteId || ''}
                              onChange={(e) => handleUpdateTileType(index, 'spriteId', e.target.value)}
                              placeholder="(optional)"
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
                            />
                          </label>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 100px', gap: '8px', alignItems: 'center' }}>
                          <div style={{
                            fontWeight: 'bold',
                            fontSize: '14px',
                            textAlign: 'center',
                            background: 'rgba(255, 255, 255, 0.1)',
                            padding: '4px',
                            borderRadius: '3px',
                          }}>
                            '{tile.char}'
                          </div>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#4fc3f7' }}>{tile.terrain}</div>
                            {tile.spriteId && (
                              <div style={{ fontSize: '9px', color: '#aaa' }}>sprite: {tile.spriteId}</div>
                            )}
                          </div>
                          <div style={{
                            color: tile.walkable ? '#4caf50' : '#f44336',
                            fontWeight: 'bold',
                          }}>
                            {tile.walkable ? '✓ Walkable' : '✗ Blocked'}
                          </div>
                        </div>
                      )}
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
