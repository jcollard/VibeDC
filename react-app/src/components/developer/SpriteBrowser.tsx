import { useState, useEffect, useRef, useCallback } from 'react';
import { SpriteRegistry } from '../../utils/SpriteRegistry';

interface SpriteBrowserProps {
  onClose?: () => void;
  onSelectSprite?: (spriteId: string) => void;
  selectedSpriteId?: string;
}

/**
 * Read-only sprite browser for selecting sprites.
 * Used in developer panels for sprite selection.
 */
export const SpriteBrowser: React.FC<SpriteBrowserProps> = ({ onClose, onSelectSprite, selectedSpriteId }) => {
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
  const [hoveredSprite, setHoveredSprite] = useState<{ id: string; x: number; y: number } | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('');

  // Sprite size constants (12x12 pixels per sprite in the sheet)
  const SPRITE_SIZE = 12;

  // Get all unique sprite sheets from the registry
  useEffect(() => {
    const allSprites = SpriteRegistry.getAll();
    const uniqueSheets = Array.from(new Set(allSprites.map(s => s.spriteSheet))).sort();
    setSpriteSheets(uniqueSheets);

    // Select first sheet by default
    if (uniqueSheets.length > 0 && !selectedSheet) {
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
    if (selectedSpriteId) {
      const sprite = SpriteRegistry.getById(selectedSpriteId);
      if (sprite && sprite.spriteSheet === selectedSheet) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        const x = sprite.x * SPRITE_SIZE * scale;
        const y = sprite.y * SPRITE_SIZE * scale;
        const size = SPRITE_SIZE * scale;
        ctx.strokeRect(x, y, size, size);
      }
    }

    // Draw hover box if a sprite is hovered
    if (hoveredSprite) {
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 1;
      const x = hoveredSprite.x * SPRITE_SIZE * scale;
      const y = hoveredSprite.y * SPRITE_SIZE * scale;
      const size = SPRITE_SIZE * scale;
      ctx.strokeRect(x, y, size, size);
    }
  }, [scale, selectedSpriteId, hoveredSprite, selectedSheet, SPRITE_SIZE]);

  // Load sprite sheet image
  useEffect(() => {
    if (!selectedSheet || !canvasRef.current) {
      return;
    }

    setImageLoaded(false);
    setLoadError('');
    setHoveredSprite(null);

    // Load and draw the sprite sheet
    const img = new Image();
    img.src = selectedSheet;
    img.onload = () => {
      imageRef.current = img;

      // Draw the initial canvas
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
    img.onerror = () => {
      setLoadError(`Failed to load: ${selectedSheet}`);
      setImageLoaded(false);
    };
  }, [selectedSheet, scale]);

  // Redraw canvas when scale, selection, or hover changes
  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [scale, selectedSpriteId, hoveredSprite, imageLoaded, drawCanvas]);

  // Redraw canvas when returning from grid view (tag deselected)
  useEffect(() => {
    if (!selectedTag && imageLoaded) {
      drawCanvas();
    }
  }, [selectedTag, imageLoaded, drawCanvas]);

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

    // Check if click is within the sprite sheet bounds
    const maxX = Math.floor(img.width / SPRITE_SIZE) - 1;
    const maxY = Math.floor(img.height / SPRITE_SIZE) - 1;

    if (spriteX < 0 || spriteY < 0 || spriteX > maxX || spriteY > maxY) {
      return;
    }

    // Find the sprite at this position
    const sprites = SpriteRegistry.getBySheet(selectedSheet);
    const spritesAtPosition = sprites.filter(s => s.x === spriteX && s.y === spriteY);

    if (spritesAtPosition.length > 0) {
      const clickedSprite = spritesAtPosition[0];
      if (onSelectSprite && clickedSprite.id) {
        onSelectSprite(clickedSprite.id);
      }
    }
  };

  // Handle canvas mouse move for hover effect
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !selectedSheet || !img) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate which sprite is hovered (accounting for scale)
    const spriteX = Math.floor(x / (SPRITE_SIZE * scale));
    const spriteY = Math.floor(y / (SPRITE_SIZE * scale));

    // Check if hover is within the sprite sheet bounds
    const maxX = Math.floor(img.width / SPRITE_SIZE) - 1;
    const maxY = Math.floor(img.height / SPRITE_SIZE) - 1;

    if (spriteX < 0 || spriteY < 0 || spriteX > maxX || spriteY > maxY) {
      setHoveredSprite(null);
      return;
    }

    // Find the sprite at this position
    const sprites = SpriteRegistry.getBySheet(selectedSheet);
    const spritesAtPosition = sprites.filter(s => s.x === spriteX && s.y === spriteY);

    if (spritesAtPosition.length > 0) {
      const hoveredSprite = spritesAtPosition[0];
      setHoveredSprite({
        id: hoveredSprite.id,
        x: spriteX,
        y: spriteY
      });
    } else {
      setHoveredSprite(null);
    }
  };

  const handleCanvasMouseLeave = () => {
    setHoveredSprite(null);
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
        zIndex: 2001,
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
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Select Sprite</div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
              title="Close sprite browser"
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
                    Tags <span style={{ fontSize: '9px', color: '#aaa', fontWeight: 'normal' }}>(click to filter)</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {sheetInfo.tags.map(tag => {
                      const isActive = selectedTag === tag;
                      return (
                        <span
                          key={tag}
                          onClick={() => setSelectedTag(isActive ? '' : tag)}
                          style={{
                            padding: '3px 8px',
                            background: isActive
                              ? 'rgba(255, 255, 0, 0.3)'
                              : 'rgba(76, 175, 80, 0.2)',
                            border: isActive
                              ? '1px solid rgba(255, 255, 0, 0.6)'
                              : '1px solid rgba(76, 175, 80, 0.4)',
                            borderRadius: '3px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.background = 'rgba(76, 175, 80, 0.4)';
                              e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.6)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.background = 'rgba(76, 175, 80, 0.2)';
                              e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.4)';
                            }
                          }}
                          title={isActive ? 'Click to clear filter' : `Click to filter by "${tag}"`}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hovered/Selected Sprite Info */}
              {(hoveredSprite || selectedSpriteId) && (
                <div
                  style={{
                    padding: '12px',
                    background: 'rgba(255, 255, 0, 0.1)',
                    borderRadius: '4px',
                    border: '2px solid rgba(255, 255, 0, 0.4)',
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#ffff00', marginBottom: '8px' }}>
                    {hoveredSprite ? 'Hover' : 'Selected'}: {hoveredSprite?.id || selectedSpriteId}
                  </div>

                  {/* Sprite preview at 8x */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '4px', fontSize: '10px', color: '#aaa' }}>Preview (8x):</div>
                    {(() => {
                      const img = imageRef.current;
                      if (!img) return null;

                      const displaySprite = hoveredSprite || (selectedSpriteId ? SpriteRegistry.getById(selectedSpriteId) : null);
                      if (!displaySprite) return null;

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
                                ctx.clearRect(0, 0, previewSize, previewSize);
                                ctx.imageSmoothingEnabled = false;
                                ctx.drawImage(
                                  img,
                                  displaySprite.x * SPRITE_SIZE,
                                  displaySprite.y * SPRITE_SIZE,
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
                  onMouseMove={handleCanvasMouseMove}
                  onMouseLeave={handleCanvasMouseLeave}
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
                        if (onSelectSprite) {
                          onSelectSprite(sprite.id);
                        }
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '8px',
                        background: selectedSpriteId === sprite.id ? 'rgba(255, 255, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: selectedSpriteId === sprite.id ? '2px solid rgba(255, 255, 0, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedSpriteId !== sprite.id) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedSpriteId !== sprite.id) {
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
