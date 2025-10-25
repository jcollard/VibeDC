import { useState, useRef, useEffect } from 'react';
import { generateASCIICharSet } from '../../utils/FontRegistry';

interface FontAtlasGeneratorProps {
  onClose: () => void;
}

/**
 * Tool for generating pixel-perfect font atlases from TTF files.
 * Renders characters to a canvas at specified dimensions and exports
 * both the atlas image and YAML definition.
 */
export const FontAtlasGenerator: React.FC<FontAtlasGeneratorProps> = ({ onClose }) => {
  const [fontLoaded, setFontLoaded] = useState(false);
  const [fontFamily, setFontFamily] = useState<string>('');
  const [fontId, setFontId] = useState<string>('');
  const [charWidth, setCharWidth] = useState<number>(12);
  const [charHeight, setCharHeight] = useState<number>(12);
  const [fontSize, setFontSize] = useState<number>(12);
  const [lineHeight, setLineHeight] = useState<number>(14);
  const [charSpacing, setCharSpacing] = useState<number>(1);
  const [baselineOffset, setBaselineOffset] = useState<number>(10);
  const [charsPerRow, setCharsPerRow] = useState<number>(16);
  const [previewScale, setPreviewScale] = useState<number>(4);
  const [antialiasThreshold, setAntialiasThreshold] = useState<number>(128);
  const [applyThreshold, setApplyThreshold] = useState<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // ASCII printable characters (32-126)
  const charSet = generateASCIICharSet();

  // Handle font file upload
  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFontLoaded(false);

    // Generate font family name from filename
    const familyName = `CustomFont_${Date.now()}`;
    setFontFamily(familyName);

    // Auto-generate font ID from filename
    const baseName = file.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setFontId(baseName);

    // Load the font file
    try {
      const arrayBuffer = await file.arrayBuffer();
      const fontFace = new FontFace(familyName, arrayBuffer);
      await fontFace.load();
      document.fonts.add(fontFace);
      setFontLoaded(true);
      console.log(`Font loaded: ${familyName}`);
    } catch (error) {
      console.error('Failed to load font:', error);
      alert('Failed to load font file. Please try a different TTF file.');
    }
  };

  // Generate the font atlas
  const generateAtlas = () => {
    if (!fontLoaded || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate canvas dimensions
    const totalChars = charSet.length;
    const rows = Math.ceil(totalChars / charsPerRow);
    const atlasWidth = charWidth * charsPerRow;
    const atlasHeight = charHeight * rows;

    // Set canvas size
    canvas.width = atlasWidth;
    canvas.height = atlasHeight;

    // Clear canvas
    ctx.clearRect(0, 0, atlasWidth, atlasHeight);

    // Disable image smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;

    // Set font rendering for crisp pixels
    // Use a slightly smaller font size and scale up for crisper rendering
    ctx.font = `${fontSize}px "${fontFamily}", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';

    // Enable font rendering hints for sharper text
    // Note: These don't fully prevent antialiasing in all browsers

    // Render each character
    charSet.forEach((char, index) => {
      const col = index % charsPerRow;
      const row = Math.floor(index / charsPerRow);
      const x = col * charWidth;
      const y = row * charHeight;

      // Draw character at baseline offset
      ctx.fillText(char, x, y + baselineOffset);
    });

    // Apply threshold to remove antialiasing (make pixel-perfect)
    if (applyThreshold) {
      const imageData = ctx.getImageData(0, 0, atlasWidth, atlasHeight);
      const data = imageData.data;

      // Convert to pure black/white based on threshold
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];

        // Apply threshold to alpha channel
        if (alpha >= antialiasThreshold) {
          // Solid white pixel
          data[i] = 255;     // R
          data[i + 1] = 255; // G
          data[i + 2] = 255; // B
          data[i + 3] = 255; // A
        } else {
          // Transparent pixel
          data[i] = 255;     // R
          data[i + 1] = 255; // G
          data[i + 2] = 255; // B
          data[i + 3] = 0;   // A
        }
      }

      ctx.putImageData(imageData, 0, 0);
    }

    updatePreview();
  };

  // Update the preview canvas
  const updatePreview = () => {
    if (!canvasRef.current || !previewCanvasRef.current) return;

    const sourceCanvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    // Scale up for preview
    const width = sourceCanvas.width * previewScale;
    const height = sourceCanvas.height * previewScale;

    previewCanvas.width = width;
    previewCanvas.height = height;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sourceCanvas, 0, 0, width, height);
  };

  // Auto-generate when font is loaded and parameters change
  useEffect(() => {
    if (fontLoaded) {
      generateAtlas();
    }
  }, [fontLoaded, charWidth, charHeight, fontSize, baselineOffset, charsPerRow, applyThreshold, antialiasThreshold]);

  // Update preview when scale changes
  useEffect(() => {
    updatePreview();
  }, [previewScale]);

  // Download the atlas image
  const downloadAtlas = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fontId}-atlas.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  // Download the YAML definition
  const downloadYAML = () => {
    // Generate character set as YAML array
    const charSetYAML = charSet.map(c => {
      // Escape special characters
      if (c === '"') return '\\"';
      if (c === '\\') return '\\\\';
      return c;
    }).map(c => `"${c}"`).join(', ');

    const yaml = `# Font definition for ${fontId}
# Generated from font atlas generator

fonts:
  - id: "${fontId}"
    atlasPath: "/fonts/${fontId}-atlas.png"
    charWidth: ${charWidth}
    charHeight: ${charHeight}
    lineHeight: ${lineHeight}
    charSpacing: ${charSpacing}
    baselineOffset: ${baselineOffset}
    charOffsetX: 0
    charOffsetY: 0
    fallbackChar: "?"
    charsPerRow: ${charsPerRow}
    charSet: [${charSetYAML}]
    tags: ["pixel", "game"]
`;

    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fontId}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0, 0, 0, 0.95)',
        border: '2px solid #666',
        padding: '20px',
        borderRadius: '8px',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 3000,
        width: '900px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
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
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Font Atlas Generator</div>
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
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Left Panel - Controls */}
        <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'auto' }}>
          {/* Font Upload */}
          <div
            style={{
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
              1. Upload TTF Font
            </div>
            <input
              type="file"
              accept=".ttf,.otf"
              onChange={handleFontUpload}
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid #666',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            />
            {fontLoaded && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#4CAF50' }}>
                ✓ Font loaded successfully
              </div>
            )}
          </div>

          {/* Font Configuration */}
          {fontLoaded && (
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
                  2. Configure Font
                </div>

                {/* Font ID */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#aaa' }}>
                    Font ID
                  </label>
                  <input
                    type="text"
                    value={fontId}
                    onChange={(e) => setFontId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid #666',
                      borderRadius: '3px',
                      color: '#fff',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                {/* Character Width */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#aaa' }}>
                    Char Width (px): {charWidth}
                  </label>
                  <input
                    type="range"
                    min="4"
                    max="32"
                    value={charWidth}
                    onChange={(e) => setCharWidth(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Character Height */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#aaa' }}>
                    Char Height (px): {charHeight}
                  </label>
                  <input
                    type="range"
                    min="4"
                    max="32"
                    value={charHeight}
                    onChange={(e) => setCharHeight(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Font Size */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#aaa' }}>
                    Font Size (px): {fontSize}
                  </label>
                  <input
                    type="range"
                    min="4"
                    max="32"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Baseline Offset */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#aaa' }}>
                    Baseline Offset (px): {baselineOffset}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={charHeight}
                    value={baselineOffset}
                    onChange={(e) => setBaselineOffset(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Line Height */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#aaa' }}>
                    Line Height (px): {lineHeight}
                  </label>
                  <input
                    type="range"
                    min={charHeight}
                    max={charHeight + 10}
                    value={lineHeight}
                    onChange={(e) => setLineHeight(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Character Spacing */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#aaa' }}>
                    Char Spacing (px): {charSpacing}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    value={charSpacing}
                    onChange={(e) => setCharSpacing(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Chars Per Row */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#aaa' }}>
                    Chars Per Row: {charsPerRow}
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="32"
                    value={charsPerRow}
                    onChange={(e) => setCharsPerRow(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Pixel-Perfect Toggle */}
                <div style={{ marginBottom: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={applyThreshold}
                      onChange={(e) => setApplyThreshold(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '11px', color: '#aaa' }}>
                      Pixel-Perfect (Remove AA)
                    </span>
                  </label>
                </div>

                {/* Antialias Threshold */}
                {applyThreshold && (
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#aaa' }}>
                      AA Threshold: {antialiasThreshold}
                    </label>
                    <input
                      type="range"
                      min="64"
                      max="255"
                      value={antialiasThreshold}
                      onChange={(e) => setAntialiasThreshold(Number(e.target.value))}
                      style={{ width: '100%' }}
                    />
                    <div style={{ fontSize: '9px', color: '#666', marginTop: '4px' }}>
                      Lower = thinner characters
                    </div>
                  </div>
                )}
              </div>

              {/* Export */}
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
                  3. Export
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={downloadAtlas}
                    style={{
                      padding: '8px',
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
                    Download Atlas PNG
                  </button>
                  <button
                    onClick={downloadYAML}
                    style={{
                      padding: '8px',
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
                    Download YAML
                  </button>
                </div>
              </div>

              {/* Info */}
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(255, 152, 0, 0.1)',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 152, 0, 0.3)',
                  fontSize: '10px',
                  lineHeight: '1.5',
                  color: '#aaa',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#ff9800' }}>
                  Instructions:
                </div>
                <div>1. Upload a TTF/OTF font file</div>
                <div>2. Adjust parameters to fit characters in cells</div>
                <div>3. Download both the PNG atlas and YAML definition</div>
                <div>4. Place PNG in /public/fonts/</div>
                <div>5. Load YAML definition in your game</div>
              </div>
            </>
          )}
        </div>

        {/* Right Panel - Preview */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Atlas Preview</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '11px', color: '#aaa' }}>Scale:</label>
              <select
                value={previewScale}
                onChange={(e) => setPreviewScale(Number(e.target.value))}
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

          <div
            style={{
              flex: 1,
              overflow: 'auto',
              background: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '4px',
              padding: '10px',
            }}
          >
            {fontLoaded ? (
              <canvas
                ref={previewCanvasRef}
                style={{
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  imageRendering: 'pixelated',
                  display: 'block',
                } as React.CSSProperties}
              />
            ) : (
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
                Upload a font to generate atlas
              </div>
            )}
          </div>

          {/* Atlas Info */}
          {fontLoaded && (
            <div style={{ marginTop: '12px', fontSize: '11px', color: '#aaa' }}>
              <div>Atlas Size: {charWidth * charsPerRow} × {charHeight * Math.ceil(charSet.length / charsPerRow)} px</div>
              <div>Characters: {charSet.length} (ASCII 32-126)</div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden canvas for actual generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};
