import { useState, useEffect, useRef, useCallback } from 'react';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import { TagFilter } from './TagFilter';

interface SpriteRegistryPanelProps {
  onClose?: () => void;
}

/**
 * Developer panel for browsing and testing sprites from the SpriteRegistry.
 * This component is only accessible in development mode.
 */
export const SpriteRegistryPanel: React.FC<SpriteRegistryPanelProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [spriteSheets, setSpriteSheets] = useState<string[]>([]);
  const [sheetInfo, setSheetInfo] = useState<{
    spriteCount: number;
    tags: string[];
  }>({ spriteCount: 0, tags: [] });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string>('');
  const [scale, setScale] = useState<number>(4);
  const [selectedSprite, setSelectedSprite] = useState<{ id: string; x: number; y: number } | null>(null);
  const [isEditingId, setIsEditingId] = useState(false);
  const [editedId, setEditedId] = useState<string>('');
  const [editError, setEditError] = useState<string>('');
  const [newTag, setNewTag] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');

  // Sprite size constants (12x12 pixels per sprite in the sheet)
  const SPRITE_SIZE = 12;

  // Get all unique sprite sheets from the registry
  useEffect(() => {
    const allSprites = SpriteRegistry.getAll();
    console.log('SpriteRegistryPanel: Total sprites in registry:', allSprites.length);
    const uniqueSheets = Array.from(new Set(allSprites.map(s => s.spriteSheet))).sort();
    console.log('SpriteRegistryPanel: Unique sprite sheets:', uniqueSheets);
    setSpriteSheets(uniqueSheets);

    // Select first sheet by default
    if (uniqueSheets.length > 0 && !selectedSheet) {
      console.log('SpriteRegistryPanel: Selecting first sheet:', uniqueSheets[0]);
      setSelectedSheet(uniqueSheets[0]);
    }
  }, [selectedSheet]);

  // Update sheet info when selection changes
  useEffect(() => {
    if (!selectedSheet) return;

    const sprites = SpriteRegistry.getBySheet(selectedSheet);
    const allTags = new Set<string>();
    sprites.forEach(sprite => {
      sprite.tags?.forEach(tag => allTags.add(tag));
    });

    setSheetInfo({
      spriteCount: sprites.length,
      tags: Array.from(allTags).sort()
    });
  }, [selectedSheet]);

  // Draw the sprite sheet on the canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply user-selected scale
    const width = img.width * scale;
    const height = img.height * scale;

    canvas.width = width;
    canvas.height = height;

    // Disable smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;

    // Draw the sprite sheet at the scaled size
    ctx.drawImage(img, 0, 0, width, height);

    // Draw selection box if a sprite is selected
    if (selectedSprite) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      const x = selectedSprite.x * SPRITE_SIZE * scale;
      const y = selectedSprite.y * SPRITE_SIZE * scale;
      const size = SPRITE_SIZE * scale;
      ctx.strokeRect(x, y, size, size);
    }
  }, [scale, selectedSprite, SPRITE_SIZE]);

  // Load sprite sheet image
  useEffect(() => {
    if (!selectedSheet || !canvasRef.current) {
      console.log('SpriteRegistryPanel: Skipping draw - no sheet or canvas', { selectedSheet, hasCanvas: !!canvasRef.current });
      return;
    }

    setImageLoaded(false);
    setLoadError('');
    setSelectedSprite(null);

    console.log('SpriteRegistryPanel: Loading sprite sheet:', selectedSheet);

    // Load and draw the sprite sheet
    const img = new Image();
    img.src = selectedSheet;
    img.onload = () => {
      console.log('SpriteRegistryPanel: Image loaded successfully', { width: img.width, height: img.height });
      imageRef.current = img;

      // Draw the initial canvas (without selection)
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = img.width * scale;
          const height = img.height * scale;
          canvas.width = width;
          canvas.height = height;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, width, height);
        }
      }

      setImageLoaded(true);
    };
    img.onerror = (e) => {
      console.error(`Failed to load sprite sheet: ${selectedSheet}`, e);
      setLoadError(`Failed to load: ${selectedSheet}`);
      setImageLoaded(false);
    };
  }, [selectedSheet, scale]);

  // Redraw canvas when scale or selection changes
  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [scale, selectedSprite, imageLoaded, drawCanvas]);

  // Redraw canvas when returning from grid view (tag deselected)
  useEffect(() => {
    if (!selectedTag && imageLoaded) {
      drawCanvas();
    }
  }, [selectedTag, imageLoaded, drawCanvas]);

  // Handle starting edit mode
  const handleStartEdit = () => {
    if (selectedSprite?.id) {
      setEditedId(selectedSprite.id);
      setIsEditingId(true);
      setEditError('');
    }
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setIsEditingId(false);
    setEditedId('');
    setEditError('');
  };

  // Handle saving the new ID
  const handleSaveId = () => {
    if (!selectedSprite?.id) return;

    const trimmedId = editedId.trim();

    // Validate input
    if (!trimmedId) {
      setEditError('ID cannot be empty');
      return;
    }

    // Update the sprite ID in the registry
    const success = SpriteRegistry.updateSpriteId(selectedSprite.id, trimmedId);

    if (success) {
      // Update the selected sprite with the new ID
      setSelectedSprite({
        ...selectedSprite,
        id: trimmedId
      });
      setIsEditingId(false);
      setEditedId('');
      setEditError('');

      // Force refresh of sheet info to show updated sprite count
      const sprites = SpriteRegistry.getBySheet(selectedSheet);
      const allTags = new Set<string>();
      sprites.forEach(sprite => {
        sprite.tags?.forEach(tag => allTags.add(tag));
      });
      setSheetInfo({
        spriteCount: sprites.length,
        tags: Array.from(allTags).sort()
      });
    } else {
      // Show error - ID already exists
      setEditError(`ID '${trimmedId}' is already in use`);
    }
  };

  // Handle creating a new sprite at undefined position
  const handleCreateSprite = () => {
    if (!selectedSprite || !selectedSheet || selectedSprite.id) return;

    const newId = `sprite_${selectedSprite.x}_${selectedSprite.y}`;

    // Check if this ID already exists
    if (SpriteRegistry.has(newId)) {
      setEditError(`ID '${newId}' already exists`);
      return;
    }

    // Register the new sprite
    SpriteRegistry.register({
      id: newId,
      spriteSheet: selectedSheet,
      x: selectedSprite.x,
      y: selectedSprite.y
    });

    // Update the selected sprite
    setSelectedSprite({
      ...selectedSprite,
      id: newId
    });

    // Start editing mode so user can rename it
    setEditedId(newId);
    setIsEditingId(true);
    setEditError('');

    // Force refresh of sheet info
    const sprites = SpriteRegistry.getBySheet(selectedSheet);
    const allTags = new Set<string>();
    sprites.forEach(sprite => {
      sprite.tags?.forEach(tag => allTags.add(tag));
    });
    setSheetInfo({
      spriteCount: sprites.length,
      tags: Array.from(allTags).sort()
    });
  };

  // Handle adding a tag
  const handleAddTag = () => {
    if (!selectedSprite?.id || !newTag.trim()) return;

    const success = SpriteRegistry.addSpriteTag(selectedSprite.id, newTag.trim());

    if (success) {
      setNewTag('');
      // Force re-render by updating selected sprite state
      const sprite = SpriteRegistry.getById(selectedSprite.id);
      if (sprite) {
        // Trigger a state update to refresh the UI
        setSelectedSprite({ ...selectedSprite });
      }
    }
  };

  // Handle removing a tag
  const handleRemoveTag = (tag: string) => {
    if (!selectedSprite?.id) return;

    const success = SpriteRegistry.removeSpriteTag(selectedSprite.id, tag);

    if (success) {
      // Force re-render by updating selected sprite state
      setSelectedSprite({ ...selectedSprite });
    }
  };

  // Handle deleting a sprite from the registry
  const handleDeleteSprite = () => {
    if (!selectedSprite?.id) return;

    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete sprite "${selectedSprite.id}"?\n\n` +
      `Position: (${selectedSprite.x}, ${selectedSprite.y})\n` +
      `This action cannot be undone (until you reload the page).`
    );

    if (!confirmed) return;

    const success = SpriteRegistry.unregister(selectedSprite.id);

    if (success) {
      console.log(`Deleted sprite "${selectedSprite.id}"`);

      // Clear selection
      setSelectedSprite(null);
      setIsEditingId(false);
      setEditError('');
      setNewTag('');

      // Force refresh of sheet info
      if (selectedSheet) {
        const sprites = SpriteRegistry.getBySheet(selectedSheet);
        const allTags = new Set<string>();
        sprites.forEach(sprite => {
          sprite.tags?.forEach(tag => allTags.add(tag));
        });
        setSheetInfo({
          spriteCount: sprites.length,
          tags: Array.from(allTags).sort()
        });
      }
    }
  };

  // Handle exporting sprite definitions to YAML
  const handleExport = () => {
    const allSprites = SpriteRegistry.getAll();

    // Sort sprites by sheet, then by y, then by x for cleaner output
    const sortedSprites = allSprites.sort((a, b) => {
      if (a.spriteSheet !== b.spriteSheet) {
        return a.spriteSheet.localeCompare(b.spriteSheet);
      }
      if (a.y !== b.y) {
        return a.y - b.y;
      }
      return a.x - b.x;
    });

    // Generate YAML content
    let yaml = '# Sprite definitions for combat\n';
    yaml += '# Maps sprite IDs to their locations in sprite sheets\n';
    yaml += '# Exported from Sprite Registry Panel\n\n';
    yaml += 'sprites:\n';

    let currentSheet = '';
    for (const sprite of sortedSprites) {
      // Add a comment when switching to a new sprite sheet
      if (sprite.spriteSheet !== currentSheet) {
        currentSheet = sprite.spriteSheet;
        yaml += `\n  # Sprite sheet: ${currentSheet}\n`;
      }

      yaml += `  - id: "${sprite.id}"\n`;
      yaml += `    spriteSheet: "${sprite.spriteSheet}"\n`;
      yaml += `    x: ${sprite.x}\n`;
      yaml += `    y: ${sprite.y}\n`;

      if (sprite.width && sprite.width !== 1) {
        yaml += `    width: ${sprite.width}\n`;
      }
      if (sprite.height && sprite.height !== 1) {
        yaml += `    height: ${sprite.height}\n`;
      }
      if (sprite.tags && sprite.tags.length > 0) {
        yaml += `    tags: [${sprite.tags.map(t => `"${t}"`).join(', ')}]\n`;
      }

      yaml += '\n';
    }

    // Create a blob and download link
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sprite-definitions.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Exported sprite definitions:', {
      count: allSprites.length,
      sheets: [...new Set(allSprites.map(s => s.spriteSheet))]
    });
  };

  // Handle canvas click to select sprite
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !selectedSheet || !img) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate which sprite was clicked (accounting for scale)
    const spriteX = Math.floor(x / (SPRITE_SIZE * scale));
    const spriteY = Math.floor(y / (SPRITE_SIZE * scale));

    console.log('SpriteRegistryPanel: Click detected', {
      clientX: e.clientX,
      clientY: e.clientY,
      rectLeft: rect.left,
      rectTop: rect.top,
      canvasX: x,
      canvasY: y,
      spriteX,
      spriteY,
      scale,
      SPRITE_SIZE
    });

    // Check if click is within the sprite sheet bounds
    const maxX = Math.floor(img.width / SPRITE_SIZE) - 1;
    const maxY = Math.floor(img.height / SPRITE_SIZE) - 1;

    if (spriteX < 0 || spriteY < 0 || spriteX > maxX || spriteY > maxY) {
      // Clicked outside sprite sheet bounds
      setSelectedSprite(null);
      setIsEditingId(false);
      setEditError('');
      return;
    }

    // Find the sprite at this position
    const sprites = SpriteRegistry.getBySheet(selectedSheet);
    const spritesAtPosition = sprites.filter(s => s.x === spriteX && s.y === spriteY);

    console.log('SpriteRegistryPanel: Sprites at position', { spriteX, spriteY, count: spritesAtPosition.length, ids: spritesAtPosition.map(s => s.id) });

    // If there are multiple sprites at this position, we need to pick one
    // Strategy: If we're clicking the same position as currently selected, try to find the next sprite in the list
    let clickedSprite = spritesAtPosition[0]; // Default to first

    if (spritesAtPosition.length > 1) {
      if (selectedSprite && selectedSprite.x === spriteX && selectedSprite.y === spriteY && selectedSprite.id) {
        // Clicking the same position - cycle to the next sprite
        const currentIndex = spritesAtPosition.findIndex(s => s.id === selectedSprite.id);
        if (currentIndex !== -1) {
          // Found current sprite, select the next one (wrap around)
          const nextIndex = (currentIndex + 1) % spritesAtPosition.length;
          clickedSprite = spritesAtPosition[nextIndex];
        }
      }
      // Otherwise just use the first sprite
    }

    // Cancel edit mode when selecting a different sprite
    setIsEditingId(false);
    setEditError('');

    // Always select the sprite position, even if not defined in registry
    setSelectedSprite({
      id: clickedSprite?.id || '',
      x: spriteX,
      y: spriteY
    });
  };

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
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Sprite Registry Browser</div>
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
            title="Export all sprite definitions to YAML file"
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
                padding: '0',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.7,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
              title="Close sprite registry"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Left column - Information and controls */}
        <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0, overflow: 'auto' }}>
          {/* Sprite sheet selector */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#aaa' }}>
              Select Sprite Sheet
            </label>
            <select
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid #666',
                borderRadius: '4px',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {spriteSheets.length === 0 && (
                <option value="">No sprite sheets found</option>
              )}
              {spriteSheets.map(sheet => (
                <option key={sheet} value={sheet}>
                  {sheet.split('/').pop()}
                </option>
              ))}
            </select>
          </div>

          {/* Sprite sheet information */}
          {selectedSheet && (
            <>
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
                  Sheet Information
                </div>
                <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
                  <div><strong>Path:</strong></div>
                  <div style={{ color: '#aaa', wordBreak: 'break-all', marginBottom: '6px' }}>
                    {selectedSheet}
                  </div>
                  <div><strong>Sprites:</strong> {sheetInfo.spriteCount}</div>
                </div>
              </div>

              {/* Tags */}
              <TagFilter
                tags={sheetInfo.tags}
                selectedTag={selectedTag}
                onTagSelect={setSelectedTag}
              />

              {/* Selected Sprite Info */}
              {selectedSprite && (
                <div
                  style={{
                    padding: '12px',
                    background: selectedSprite.id ? 'rgba(255, 255, 0, 0.1)' : 'rgba(255, 128, 0, 0.1)',
                    borderRadius: '4px',
                    border: selectedSprite.id ? '2px solid rgba(255, 255, 0, 0.4)' : '2px solid rgba(255, 128, 0, 0.4)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: selectedSprite.id ? '#ffff00' : '#ff8800' }}>
                      Selected Sprite
                    </div>
                    {selectedSprite.id && (
                      <button
                        onClick={handleDeleteSprite}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ff4444',
                          cursor: 'pointer',
                          padding: '4px',
                          fontSize: '16px',
                          lineHeight: '1',
                          opacity: 0.7,
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                        title="Delete this sprite from the registry"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
                    {selectedSprite.id ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong>ID:</strong>
                          {(() => {
                            const sprites = SpriteRegistry.getBySheet(selectedSheet);
                            const spritesAtPos = sprites.filter(s => s.x === selectedSprite.x && s.y === selectedSprite.y);
                            return spritesAtPos.length > 1 ? (
                              <span style={{
                                fontSize: '9px',
                                color: '#ff8800',
                                padding: '2px 6px',
                                background: 'rgba(255, 136, 0, 0.2)',
                                borderRadius: '3px',
                                border: '1px solid rgba(255, 136, 0, 0.3)',
                              }} title={`${spritesAtPos.length} sprites at this position. Click to cycle.`}>
                                {spritesAtPos.findIndex(s => s.id === selectedSprite.id) + 1}/{spritesAtPos.length}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        {isEditingId ? (
                          <div style={{ marginBottom: '8px' }}>
                            <input
                              type="text"
                              value={editedId}
                              onChange={(e) => setEditedId(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveId();
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              autoFocus
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                background: 'rgba(0, 0, 0, 0.5)',
                                border: '1px solid #666',
                                borderRadius: '3px',
                                color: '#fff',
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                marginTop: '4px',
                                marginBottom: '6px',
                              }}
                            />
                            {editError && (
                              <div style={{
                                color: '#f44',
                                fontSize: '10px',
                                marginBottom: '6px',
                                padding: '4px',
                                background: 'rgba(255, 68, 68, 0.1)',
                                borderRadius: '3px',
                                border: '1px solid rgba(255, 68, 68, 0.3)',
                              }}>
                                {editError}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={handleSaveId}
                                style={{
                                  flex: 1,
                                  padding: '4px 8px',
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
                                  flex: 1,
                                  padding: '4px 8px',
                                  background: 'rgba(255, 68, 68, 0.3)',
                                  border: '1px solid rgba(255, 68, 68, 0.6)',
                                  borderRadius: '3px',
                                  color: '#fff',
                                  fontSize: '10px',
                                  cursor: 'pointer',
                                  fontFamily: 'monospace',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <div style={{ color: '#aaa', wordBreak: 'break-all', flex: 1, fontFamily: 'monospace' }}>
                              {selectedSprite.id}
                            </div>
                            <button
                              onClick={handleStartEdit}
                              style={{
                                padding: '3px 8px',
                                background: 'rgba(255, 255, 0, 0.2)',
                                border: '1px solid rgba(255, 255, 0, 0.4)',
                                borderRadius: '3px',
                                color: '#ffff00',
                                fontSize: '9px',
                                cursor: 'pointer',
                                fontFamily: 'monospace',
                                whiteSpace: 'nowrap',
                              }}
                              title="Edit sprite ID"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{
                        color: '#ff8800',
                        marginBottom: '6px',
                        padding: '6px',
                        background: 'rgba(255, 128, 0, 0.1)',
                        borderRadius: '3px',
                        border: '1px dashed rgba(255, 128, 0, 0.4)'
                      }}>
                        <strong>⚠ Undefined Sprite</strong>
                        <div style={{ fontSize: '10px', marginTop: '4px', marginBottom: '8px', color: '#aaa' }}>
                          This sprite position is not defined in the registry
                        </div>
                        <button
                          onClick={handleCreateSprite}
                          style={{
                            width: '100%',
                            padding: '6px',
                            background: 'rgba(76, 175, 80, 0.3)',
                            border: '1px solid rgba(76, 175, 80, 0.6)',
                            borderRadius: '3px',
                            color: '#fff',
                            fontSize: '10px',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                          }}
                        >
                          Create Sprite
                        </button>
                      </div>
                    )}
                    <div><strong>Position:</strong> ({selectedSprite.x}, {selectedSprite.y})</div>

                    {/* Sprite preview at 8x */}
                    <div style={{ marginTop: '8px', textAlign: 'center' }}>
                      <div style={{ marginBottom: '4px', fontSize: '10px', color: '#aaa' }}>Preview (8x):</div>
                      {(() => {
                        const img = imageRef.current;
                        if (!img) return null;

                        // Create a small canvas for the preview
                        const previewScale = 8;
                        const previewSize = SPRITE_SIZE * previewScale;

                        return (
                          <canvas
                            width={previewSize}
                            height={previewSize}
                            ref={(canvas) => {
                              if (canvas && img) {
                                const ctx = canvas.getContext('2d');
                                if (ctx) {
                                  // Clear the canvas first
                                  ctx.clearRect(0, 0, previewSize, previewSize);
                                  // Disable smoothing for pixel-perfect rendering
                                  ctx.imageSmoothingEnabled = false;
                                  // Draw the selected sprite
                                  ctx.drawImage(
                                    img,
                                    selectedSprite.x * SPRITE_SIZE,
                                    selectedSprite.y * SPRITE_SIZE,
                                    SPRITE_SIZE,
                                    SPRITE_SIZE,
                                    0,
                                    0,
                                    previewSize,
                                    previewSize
                                  );
                                }
                              }
                            }}
                            style={{
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              imageRendering: 'pixelated',
                              background: 'rgba(0, 0, 0, 0.3)',
                            } as React.CSSProperties}
                          />
                        );
                      })()}
                    </div>

                    {selectedSprite.id && (() => {
                      const sprite = SpriteRegistry.getById(selectedSprite.id);
                      return (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ marginBottom: '4px' }}>
                            <strong>Tags:</strong>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                            {sprite?.tags && sprite.tags.length > 0 ? (
                              sprite.tags.map(tag => (
                                <span
                                  key={tag}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 6px',
                                    background: 'rgba(255, 255, 0, 0.2)',
                                    border: '1px solid rgba(255, 255, 0, 0.4)',
                                    borderRadius: '3px',
                                    fontSize: '9px',
                                  }}
                                >
                                  {tag}
                                  <button
                                    onClick={() => handleRemoveTag(tag)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#ff4444',
                                      cursor: 'pointer',
                                      padding: '0',
                                      marginLeft: '2px',
                                      fontSize: '10px',
                                      lineHeight: '1',
                                      fontWeight: 'bold',
                                    }}
                                    title={`Remove tag "${tag}"`}
                                  >
                                    ×
                                  </button>
                                </span>
                              ))
                            ) : (
                              <div style={{ fontSize: '9px', color: '#666', fontStyle: 'italic' }}>
                                No tags
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input
                              type="text"
                              value={newTag}
                              onChange={(e) => setNewTag(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddTag();
                                }
                              }}
                              placeholder="Add tag..."
                              style={{
                                flex: 1,
                                padding: '4px 6px',
                                background: 'rgba(0, 0, 0, 0.5)',
                                border: '1px solid #666',
                                borderRadius: '3px',
                                color: '#fff',
                                fontFamily: 'monospace',
                                fontSize: '10px',
                              }}
                            />
                            <button
                              onClick={handleAddTag}
                              disabled={!newTag.trim()}
                              style={{
                                padding: '4px 8px',
                                background: newTag.trim() ? 'rgba(76, 175, 80, 0.3)' : 'rgba(100, 100, 100, 0.3)',
                                border: newTag.trim() ? '1px solid rgba(76, 175, 80, 0.6)' : '1px solid rgba(100, 100, 100, 0.6)',
                                borderRadius: '3px',
                                color: '#fff',
                                fontSize: '9px',
                                cursor: newTag.trim() ? 'pointer' : 'not-allowed',
                                fontFamily: 'monospace',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right column - Sprite sheet display */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            minWidth: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '20px',
          }}
        >
          {/* Scale selector at the top */}
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '11px', color: '#aaa' }}>Scale:</label>
              <select
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid #666',
                  borderRadius: '4px',
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                <option value="1">1x</option>
                <option value="2">2x</option>
                <option value="3">3x</option>
                <option value="4">4x</option>
              </select>
            </div>
          </div>

          {/* Preview area */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              position: 'relative',
              overflow: 'auto',
              padding: '10px',
            }}
          >
            {/* Sheet view - Canvas (when no tag filter) */}
            {!selectedTag && (
              <>
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    imageRendering: 'pixelated',
                    display: imageLoaded ? 'block' : 'none',
                    cursor: 'pointer',
                  } as React.CSSProperties}
                />

                {/* Status messages - centered when canvas not visible */}
                {!imageLoaded && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                    }}
                  >
                    {!selectedSheet && (
                      <div style={{ color: '#666', fontSize: '14px' }}>
                        Select a sprite sheet to preview
                      </div>
                    )}
                    {selectedSheet && loadError && (
                      <div style={{ color: '#f44', fontSize: '12px' }}>
                        <div style={{ marginBottom: '8px' }}>Error loading sprite sheet</div>
                        <div style={{ fontSize: '10px', color: '#aaa' }}>{loadError}</div>
                        <div style={{ fontSize: '10px', color: '#aaa', marginTop: '8px' }}>
                          Check browser console for details
                        </div>
                      </div>
                    )}
                    {selectedSheet && !loadError && (
                      <div style={{ color: '#666', fontSize: '14px' }}>
                        Loading sprite sheet...
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Grid view - Sprite grid (when tag is selected) */}
            {selectedTag && (() => {
              const allSprites = selectedSheet ? SpriteRegistry.getBySheet(selectedSheet) : [];
              const filteredSprites = selectedTag
                ? allSprites.filter(s => s.tags?.includes(selectedTag))
                : allSprites;

              if (filteredSprites.length === 0) {
                return (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      color: '#666',
                      fontSize: '14px',
                    }}
                  >
                    No sprites found{selectedTag ? ` with tag "${selectedTag}"` : ''}
                  </div>
                );
              }

              const gridSize = SPRITE_SIZE * scale;

              return (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(auto-fill, minmax(${gridSize + 40}px, 1fr))`,
                  gap: '12px',
                  padding: '4px'
                }}>
                  {filteredSprites.map((sprite) => (
                    <div
                      key={sprite.id}
                      onClick={() => {
                        setSelectedSprite({
                          id: sprite.id,
                          x: sprite.x,
                          y: sprite.y
                        });
                        // Keep the tag filter active to stay in grid view
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '8px',
                        background: selectedSprite?.id === sprite.id ? 'rgba(255, 255, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: selectedSprite?.id === sprite.id ? '2px solid rgba(255, 255, 0, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedSprite?.id !== sprite.id) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedSprite?.id !== sprite.id) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        }
                      }}
                      title={sprite.id}
                    >
                      <canvas
                        width={gridSize}
                        height={gridSize}
                        ref={(canvas) => {
                          if (canvas && imageRef.current) {
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              ctx.clearRect(0, 0, gridSize, gridSize);
                              ctx.imageSmoothingEnabled = false;
                              ctx.drawImage(
                                imageRef.current,
                                sprite.x * SPRITE_SIZE,
                                sprite.y * SPRITE_SIZE,
                                SPRITE_SIZE,
                                SPRITE_SIZE,
                                0,
                                0,
                                gridSize,
                                gridSize
                              );
                            }
                          }
                        }}
                        style={{
                          imageRendering: 'pixelated',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          background: 'rgba(0, 0, 0, 0.3)',
                        } as React.CSSProperties}
                      />
                      <div style={{
                        marginTop: '6px',
                        fontSize: '9px',
                        color: '#aaa',
                        textAlign: 'center',
                        wordBreak: 'break-word',
                        maxWidth: '100%',
                      }}>
                        {sprite.id}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
