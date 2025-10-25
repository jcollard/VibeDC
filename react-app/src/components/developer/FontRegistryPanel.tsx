import { useState, useEffect, useRef, useCallback } from 'react';
import { FontRegistry } from '../../utils/FontRegistry';
import { FontAtlasGenerator } from './FontAtlasGenerator';
import { TagFilter } from './TagFilter';

interface FontRegistryPanelProps {
  onClose?: () => void;
}

/**
 * Developer panel for browsing fonts and generating font atlases.
 * This component is only accessible in development mode.
 */
export const FontRegistryPanel: React.FC<FontRegistryPanelProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [selectedFont, setSelectedFont] = useState<string>('');
  const [fontIds, setFontIds] = useState<string[]>([]);
  const [fontInfo, setFontInfo] = useState<{
    atlasPath: string;
    charWidth: number;
    charHeight: number;
    charCount: number;
    tags: string[];
  } | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string>('');
  const [scale, setScale] = useState<number>(4);
  const [previewText, setPreviewText] = useState<string>('The quick brown fox jumps over the lazy dog');
  const [isEditingId, setIsEditingId] = useState(false);
  const [editedId, setEditedId] = useState<string>('');
  const [editError, setEditError] = useState<string>('');
  const [newTag, setNewTag] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [showGenerator, setShowGenerator] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);

  // Get all font IDs from the registry
  useEffect(() => {
    const ids = FontRegistry.getAllIds().sort();
    console.log('FontRegistryPanel: Total fonts in registry:', ids.length);
    setFontIds(ids);

    // Collect all unique tags
    const tagSet = new Set<string>();
    FontRegistry.getAll().forEach(font => {
      font.tags?.forEach(tag => tagSet.add(tag));
    });
    setAllTags(Array.from(tagSet).sort());

    // Select first font by default
    if (ids.length > 0 && !selectedFont) {
      console.log('FontRegistryPanel: Selecting first font:', ids[0]);
      setSelectedFont(ids[0]);
    }
  }, [selectedFont, showGenerator]); // Refresh when generator closes

  // Update font info when selection changes
  useEffect(() => {
    if (!selectedFont) {
      setFontInfo(null);
      return;
    }

    const font = FontRegistry.getById(selectedFont);
    if (!font) {
      setFontInfo(null);
      return;
    }

    setFontInfo({
      atlasPath: font.atlasPath,
      charWidth: font.charWidth,
      charHeight: font.charHeight,
      charCount: font.charSet.length,
      tags: font.tags || [],
    });
  }, [selectedFont]);

  // Load font atlas image
  useEffect(() => {
    if (!selectedFont || !fontInfo) {
      console.log('FontRegistryPanel: Skipping load - no font or info');
      return;
    }

    setImageLoaded(false);
    setLoadError('');

    console.log('FontRegistryPanel: Loading font atlas:', fontInfo.atlasPath);

    const img = new Image();
    img.src = fontInfo.atlasPath;
    img.onload = () => {
      console.log('FontRegistryPanel: Atlas loaded successfully', { width: img.width, height: img.height });
      imageRef.current = img;
      setImageLoaded(true);
      drawAtlas();
    };
    img.onerror = (e) => {
      console.error(`Failed to load font atlas: ${fontInfo.atlasPath}`, e);
      setLoadError(`Failed to load: ${fontInfo.atlasPath}`);
      setImageLoaded(false);
    };
  }, [selectedFont, fontInfo]);

  // Draw the font atlas
  const drawAtlas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = img.width * scale;
    const height = img.height * scale;

    canvas.width = width;
    canvas.height = height;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, width, height);
  }, [scale]);

  // Redraw when scale changes
  useEffect(() => {
    if (imageLoaded) {
      drawAtlas();
    }
  }, [scale, imageLoaded, drawAtlas]);

  // Handle starting edit mode
  const handleStartEdit = () => {
    if (selectedFont) {
      setEditedId(selectedFont);
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
    if (!selectedFont) return;

    const trimmedId = editedId.trim();

    if (!trimmedId) {
      setEditError('ID cannot be empty');
      return;
    }

    const success = FontRegistry.updateFontId(selectedFont, trimmedId);

    if (success) {
      setSelectedFont(trimmedId);
      setIsEditingId(false);
      setEditedId('');
      setEditError('');

      // Refresh font list
      const ids = FontRegistry.getAllIds().sort();
      setFontIds(ids);
    } else {
      setEditError(`ID '${trimmedId}' is already in use`);
    }
  };

  // Handle adding a tag
  const handleAddTag = () => {
    if (!selectedFont || !newTag.trim()) return;

    const success = FontRegistry.addFontTag(selectedFont, newTag.trim());

    if (success) {
      setNewTag('');
      // Refresh font info
      const font = FontRegistry.getById(selectedFont);
      if (font) {
        setFontInfo({
          atlasPath: font.atlasPath,
          charWidth: font.charWidth,
          charHeight: font.charHeight,
          charCount: font.charSet.length,
          tags: font.tags || [],
        });
      }
      // Refresh all tags
      const tagSet = new Set<string>();
      FontRegistry.getAll().forEach(f => {
        f.tags?.forEach(tag => tagSet.add(tag));
      });
      setAllTags(Array.from(tagSet).sort());
    }
  };

  // Handle removing a tag
  const handleRemoveTag = (tag: string) => {
    if (!selectedFont) return;

    const success = FontRegistry.removeFontTag(selectedFont, tag);

    if (success) {
      // Refresh font info
      const font = FontRegistry.getById(selectedFont);
      if (font) {
        setFontInfo({
          atlasPath: font.atlasPath,
          charWidth: font.charWidth,
          charHeight: font.charHeight,
          charCount: font.charSet.length,
          tags: font.tags || [],
        });
      }
      // Refresh all tags
      const tagSet = new Set<string>();
      FontRegistry.getAll().forEach(f => {
        f.tags?.forEach(tag => tagSet.add(tag));
      });
      setAllTags(Array.from(tagSet).sort());
    }
  };

  // Handle deleting a font
  const handleDeleteFont = () => {
    if (!selectedFont) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete font "${selectedFont}"?\n\n` +
      `This action cannot be undone (until you reload the page).`
    );

    if (!confirmed) return;

    const success = FontRegistry.unregister(selectedFont);

    if (success) {
      console.log(`Deleted font "${selectedFont}"`);
      setSelectedFont('');
      setFontInfo(null);
      setIsEditingId(false);
      setEditError('');
      setNewTag('');

      // Refresh font list
      const ids = FontRegistry.getAllIds().sort();
      setFontIds(ids);
    }
  };

  // Handle exporting font definitions to YAML
  const handleExport = () => {
    const allFonts = FontRegistry.getAll();

    // Sort fonts by ID for cleaner output
    const sortedFonts = allFonts.sort((a, b) => a.id.localeCompare(b.id));

    // Generate YAML content
    let yaml = '# Font definitions\n';
    yaml += '# Maps font IDs to their atlas configurations\n';
    yaml += '# Exported from Font Registry Panel\n\n';
    yaml += 'fonts:\n';

    for (const font of sortedFonts) {
      yaml += `  - id: "${font.id}"\n`;
      yaml += `    atlasPath: "${font.atlasPath}"\n`;
      yaml += `    charWidth: ${font.charWidth}\n`;
      yaml += `    charHeight: ${font.charHeight}\n`;
      yaml += `    lineHeight: ${font.lineHeight || font.charHeight}\n`;
      yaml += `    charSpacing: ${font.charSpacing || 0}\n`;
      yaml += `    baselineOffset: ${font.baselineOffset || 0}\n`;
      yaml += `    charOffsetX: ${font.charOffsetX || 0}\n`;
      yaml += `    charOffsetY: ${font.charOffsetY || 0}\n`;
      yaml += `    fallbackChar: "${font.fallbackChar || '?'}"\n`;
      yaml += `    charsPerRow: ${font.charsPerRow}\n`;

      // Character set
      const charSetYAML = font.charSet.map(c => {
        if (c === '"') return '\\"';
        if (c === '\\') return '\\\\';
        return c;
      }).map(c => `"${c}"`).join(', ');
      yaml += `    charSet: [${charSetYAML}]\n`;

      if (font.tags && font.tags.length > 0) {
        yaml += `    tags: [${font.tags.map(t => `"${t}"`).join(', ')}]\n`;
      }

      yaml += '\n';
    }

    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'font-definitions.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Exported font definitions:', { count: allFonts.length });
  };

  if (showGenerator) {
    return <FontAtlasGenerator onClose={() => setShowGenerator(false)} />;
  }

  const filteredFontIds = selectedTag
    ? fontIds.filter(id => {
        const font = FontRegistry.getById(id);
        return font?.tags?.includes(selectedTag);
      })
    : fontIds;

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
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
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
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Font Registry Browser</div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => setShowGenerator(true)}
            style={{
              padding: '6px 12px',
              background: 'rgba(156, 39, 176, 0.3)',
              border: '1px solid rgba(156, 39, 176, 0.6)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(156, 39, 176, 0.5)';
              e.currentTarget.style.borderColor = 'rgba(156, 39, 176, 0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(156, 39, 176, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(156, 39, 176, 0.6)';
            }}
            title="Open font atlas generator"
          >
            Generate Font
          </button>
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
            title="Export all font definitions to YAML file"
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
              title="Close font registry"
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
          {/* Font selector */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#aaa' }}>
              Select Font
            </label>
            <select
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value)}
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
              {filteredFontIds.length === 0 && (
                <option value="">No fonts found</option>
              )}
              {filteredFontIds.map(id => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <TagFilter
            tags={allTags}
            selectedTag={selectedTag}
            onTagSelect={setSelectedTag}
          />

          {/* Font information */}
          {selectedFont && fontInfo && (
            <>
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                    Font Information
                  </div>
                  <button
                    onClick={handleDeleteFont}
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
                    title="Delete this font from the registry"
                  >
                    🗑️
                  </button>
                </div>

                <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
                  {/* Font ID */}
                  <div style={{ marginBottom: '8px' }}>
                    <strong>ID:</strong>
                    {isEditingId ? (
                      <div style={{ marginTop: '4px' }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <div style={{ color: '#aaa', wordBreak: 'break-all', flex: 1, fontFamily: 'monospace' }}>
                          {selectedFont}
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
                          title="Edit font ID"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>

                  <div><strong>Atlas:</strong></div>
                  <div style={{ color: '#aaa', wordBreak: 'break-all', marginBottom: '6px' }}>
                    {fontInfo.atlasPath}
                  </div>
                  <div><strong>Char Size:</strong> {fontInfo.charWidth}×{fontInfo.charHeight} px</div>
                  <div><strong>Characters:</strong> {fontInfo.charCount}</div>

                  {/* Tags */}
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Tags:</strong>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                      {fontInfo.tags && fontInfo.tags.length > 0 ? (
                        fontInfo.tags.map(tag => (
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
                </div>
              </div>

              {/* Preview Text Input */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#aaa' }}>
                  Preview Text
                </label>
                <input
                  type="text"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid #666',
                    borderRadius: '4px',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Right column - Font atlas and preview */}
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
          {/* Scale selector */}
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
                <option value="6">6x</option>
                <option value="8">8x</option>
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
            {selectedFont && imageLoaded ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Font Atlas */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', color: '#aaa' }}>
                    Font Atlas:
                  </div>
                  <canvas
                    ref={canvasRef}
                    style={{
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      imageRendering: 'pixelated',
                      display: 'block',
                    } as React.CSSProperties}
                  />
                </div>

                {/* Text Preview */}
                {previewText && (() => {
                  const font = FontRegistry.getById(selectedFont);
                  if (!font) return null;

                  const img = imageRef.current;
                  if (!img) return null;

                  // Calculate preview dimensions
                  const maxLineWidth = previewText.length * (font.charWidth + (font.charSpacing || 0));
                  const previewHeight = font.charHeight;

                  return (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', color: '#aaa' }}>
                        Text Preview:
                      </div>
                      <canvas
                        width={maxLineWidth * scale}
                        height={previewHeight * scale}
                        ref={(canvas) => {
                          if (canvas && img) {
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              ctx.clearRect(0, 0, canvas.width, canvas.height);
                              ctx.imageSmoothingEnabled = false;

                              let x = 0;
                              for (const char of previewText) {
                                const coords = FontRegistry.getCharCoordinates(font, char);
                                if (coords) {
                                  const srcX = coords.x * font.charWidth;
                                  const srcY = coords.y * font.charHeight;

                                  ctx.drawImage(
                                    img,
                                    srcX, srcY, font.charWidth, font.charHeight,
                                    x * scale, 0, font.charWidth * scale, font.charHeight * scale
                                  );
                                }
                                x += font.charWidth + (font.charSpacing || 0);
                              }
                            }
                          }
                        }}
                        style={{
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          imageRendering: 'pixelated',
                          background: 'rgba(0, 0, 0, 0.5)',
                        } as React.CSSProperties}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}
              >
                {!selectedFont && (
                  <div style={{ color: '#666', fontSize: '14px' }}>
                    Select a font to preview
                  </div>
                )}
                {selectedFont && loadError && (
                  <div style={{ color: '#f44', fontSize: '12px' }}>
                    <div style={{ marginBottom: '8px' }}>Error loading font atlas</div>
                    <div style={{ fontSize: '10px', color: '#aaa' }}>{loadError}</div>
                  </div>
                )}
                {selectedFont && !loadError && !imageLoaded && (
                  <div style={{ color: '#666', fontSize: '14px' }}>
                    Loading font atlas...
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
