import { useState, useEffect, useRef } from 'react';
import type { AreaMapTileSet } from '../../models/area/AreaMapTileSet';
import type { AreaMapTileDefinition } from '../../models/area/AreaMapTileDefinition';
import { AreaMapTileSetRegistry } from '../../utils/AreaMapTileSetRegistry';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import { TileBehavior } from '../../models/area/TileBehavior';
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

interface AreaMapTileSetEditorPanelProps {
  tilesetId: string;
  onClose: () => void;
}

/**
 * Editor panel for modifying area map tilesets.
 * Allows editing tileset properties and tile definitions.
 */
export const AreaMapTileSetEditorPanel: React.FC<AreaMapTileSetEditorPanelProps> = ({ tilesetId, onClose }) => {
  const [editedTileset, setEditedTileset] = useState<AreaMapTileSet | null>(null);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);

  useEffect(() => {
    const tileset = AreaMapTileSetRegistry.getById(tilesetId);
    if (tileset) {
      // Create a deep copy for editing
      setEditedTileset(JSON.parse(JSON.stringify(tileset)));
    }
  }, [tilesetId]);

  const handleSave = () => {
    if (!editedTileset) return;

    try {
      // Unregister old tileset
      AreaMapTileSetRegistry.unregister(tilesetId);

      // Register updated tileset
      AreaMapTileSetRegistry.register(editedTileset);

      alert('Tileset saved successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to save tileset:', error);
      alert(`Failed to save tileset: ${error}`);
    }
  };

  const handleExport = () => {
    if (!editedTileset) return;

    const tilesetData = {
      tilesets: [editedTileset]
    };

    const yamlString = yaml.dump(tilesetData, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });

    const blob = new Blob([yamlString], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editedTileset.id}-tileset.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTilesetFieldChange = (field: keyof AreaMapTileSet, value: any) => {
    if (!editedTileset) return;
    setEditedTileset({
      ...editedTileset,
      [field]: value,
    });
  };

  const handleTileDefChange = (index: number, field: keyof AreaMapTileDefinition, value: any) => {
    if (!editedTileset) return;

    const newTileTypes = [...editedTileset.tileTypes];
    newTileTypes[index] = {
      ...newTileTypes[index],
      [field]: value,
    };

    setEditedTileset({
      ...editedTileset,
      tileTypes: newTileTypes,
    });
  };

  const handleAddTile = () => {
    if (!editedTileset) return;

    const newTile: AreaMapTileDefinition = {
      char: '?',
      behavior: TileBehavior.Floor,
      walkable: true,
      passable: true,
      spriteId: 'biomes-0',
      name: 'New Tile',
    };

    setEditedTileset({
      ...editedTileset,
      tileTypes: [...editedTileset.tileTypes, newTile],
    });

    setSelectedTileIndex(editedTileset.tileTypes.length);
  };

  const handleRemoveTile = (index: number) => {
    if (!editedTileset) return;

    const newTileTypes = editedTileset.tileTypes.filter((_, i) => i !== index);

    setEditedTileset({
      ...editedTileset,
      tileTypes: newTileTypes,
    });

    if (selectedTileIndex === index) {
      setSelectedTileIndex(null);
    }
  };

  if (!editedTileset) {
    return <div style={{ color: '#fff', padding: '20px' }}>Loading tileset...</div>;
  }

  const selectedTile = selectedTileIndex !== null ? editedTileset.tileTypes[selectedTileIndex] : null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '900px',
        height: '80vh',
        background: 'rgba(0, 0, 0, 0.95)',
        border: '3px solid #9c27b0',
        borderRadius: '8px',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 3000,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 30px rgba(156, 39, 176, 0.5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '2px solid #9c27b0',
          background: 'rgba(156, 39, 176, 0.2)',
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
          Tileset Editor: {editedTileset.name}
        </div>
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
          >
            Export YAML
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '6px 12px',
              background: 'rgba(76, 175, 80, 0.3)',
              border: '1px solid rgba(76, 175, 80, 0.6)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold',
            }}
          >
            Save Changes
          </button>
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
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left sidebar - Tileset properties */}
        <div style={{ width: '280px', borderRight: '2px solid #9c27b0', padding: '16px', overflow: 'auto', background: 'rgba(156, 39, 176, 0.1)' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>Tileset Properties</div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '4px' }}>ID:</label>
            <input
              type="text"
              value={editedTileset.id}
              onChange={(e) => handleTilesetFieldChange('id', e.target.value)}
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

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Name:</label>
            <input
              type="text"
              value={editedTileset.name}
              onChange={(e) => handleTilesetFieldChange('name', e.target.value)}
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

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Description:</label>
            <textarea
              value={editedTileset.description || ''}
              onChange={(e) => handleTilesetFieldChange('description', e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '6px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid #666',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '11px',
                fontFamily: 'monospace',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Sprite Sheet:</label>
            <input
              type="text"
              value={editedTileset.spriteSheet || ''}
              onChange={(e) => handleTilesetFieldChange('spriteSheet', e.target.value)}
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
              placeholder="biomes"
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Tags (comma-separated):</label>
            <input
              type="text"
              value={editedTileset.tags?.join(', ') || ''}
              onChange={(e) => handleTilesetFieldChange('tags', e.target.value.split(',').map(t => t.trim()))}
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
              placeholder="dungeon, stone"
            />
          </div>

          <div style={{ fontSize: '10px', color: '#888', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #666' }}>
            <div><strong>Tiles:</strong> {editedTileset.tileTypes.length}</div>
          </div>
        </div>

        {/* Center - Tile list */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Tile Types</div>
            <button
              onClick={handleAddTile}
              style={{
                padding: '6px 12px',
                background: 'rgba(76, 175, 80, 0.3)',
                border: '1px solid rgba(76, 175, 80, 0.6)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '11px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontWeight: 'bold',
              }}
            >
              + Add Tile
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {editedTileset.tileTypes.map((tileDef, index) => {
              const sprite = SpriteRegistry.getById(tileDef.spriteId);
              const isSelected = selectedTileIndex === index;

              return (
                <div
                  key={index}
                  onClick={() => setSelectedTileIndex(index)}
                  style={{
                    width: '60px',
                    padding: '4px',
                    border: isSelected ? '3px solid #9c27b0' : '1px solid #666',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(156, 39, 176, 0.3)' : 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                  title={tileDef.name || tileDef.char}
                >
                  {sprite && (
                    <SpriteCanvas
                      spriteSheet={`/assets/${sprite.spriteSheet}.png`}
                      spriteX={sprite.x}
                      spriteY={sprite.y}
                      size={48}
                    />
                  )}
                  <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: 'bold' }}>
                    {tileDef.char}
                  </div>
                  <div style={{ fontSize: '8px', color: '#aaa' }}>
                    {tileDef.behavior}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right sidebar - Tile properties */}
        {selectedTile && (
          <div style={{ width: '280px', borderLeft: '2px solid #9c27b0', padding: '16px', overflow: 'auto', background: 'rgba(156, 39, 176, 0.1)' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>
              Tile Properties
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Character:</label>
              <input
                type="text"
                maxLength={1}
                value={selectedTile.char}
                onChange={(e) => handleTileDefChange(selectedTileIndex!, 'char', e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid #666',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  fontWeight: 'bold',
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Behavior:</label>
              <select
                value={selectedTile.behavior}
                onChange={(e) => handleTileDefChange(selectedTileIndex!, 'behavior', e.target.value)}
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
                <option value={TileBehavior.Wall}>wall</option>
                <option value={TileBehavior.Floor}>floor</option>
                <option value={TileBehavior.Door}>door</option>
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={selectedTile.walkable}
                  onChange={(e) => handleTileDefChange(selectedTileIndex!, 'walkable', e.target.checked)}
                />
                Walkable
              </label>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={selectedTile.passable}
                  onChange={(e) => handleTileDefChange(selectedTileIndex!, 'passable', e.target.checked)}
                />
                Passable
              </label>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Sprite ID:</label>
              <input
                type="text"
                value={selectedTile.spriteId}
                onChange={(e) => handleTileDefChange(selectedTileIndex!, 'spriteId', e.target.value)}
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
                placeholder="biomes-0"
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Name:</label>
              <input
                type="text"
                value={selectedTile.name || ''}
                onChange={(e) => handleTileDefChange(selectedTileIndex!, 'name', e.target.value)}
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
                placeholder="Stone Wall"
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Description:</label>
              <textarea
                value={selectedTile.description || ''}
                onChange={(e) => handleTileDefChange(selectedTileIndex!, 'description', e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '6px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid #666',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                }}
                placeholder="A solid stone wall"
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Terrain Type:</label>
              <input
                type="text"
                value={selectedTile.terrainType || ''}
                onChange={(e) => handleTileDefChange(selectedTileIndex!, 'terrainType', e.target.value)}
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
                placeholder="stone"
              />
            </div>

            <button
              onClick={() => handleRemoveTile(selectedTileIndex!)}
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '16px',
                background: 'rgba(244, 67, 54, 0.3)',
                border: '1px solid rgba(244, 67, 54, 0.6)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '11px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontWeight: 'bold',
              }}
            >
              Remove Tile
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
