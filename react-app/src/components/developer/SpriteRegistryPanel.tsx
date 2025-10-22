import { useState, useEffect, useRef, useCallback } from 'react';
import { SpriteRegistry } from '../../utils/SpriteRegistry';

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
              {sheetInfo.tags.length > 0 && (
                <div
                  style={{
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
                    Tags
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {sheetInfo.tags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          padding: '3px 8px',
                          background: 'rgba(76, 175, 80, 0.2)',
                          border: '1px solid rgba(76, 175, 80, 0.4)',
                          borderRadius: '3px',
                          fontSize: '10px',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

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
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px', color: selectedSprite.id ? '#ffff00' : '#ff8800' }}>
                    Selected Sprite
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
                      return sprite?.tags && sprite.tags.length > 0 ? (
                        <div style={{ marginTop: '6px' }}>
                          <div><strong>Tags:</strong></div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                            {sprite.tags.map(tag => (
                              <span
                                key={tag}
                                style={{
                                  padding: '2px 6px',
                                  background: 'rgba(255, 255, 0, 0.2)',
                                  border: '1px solid rgba(255, 255, 0, 0.4)',
                                  borderRadius: '3px',
                                  fontSize: '9px',
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null;
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
            {/* Canvas - always rendered for ref */}
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
          </div>
        </div>
      </div>
    </div>
  );
};
