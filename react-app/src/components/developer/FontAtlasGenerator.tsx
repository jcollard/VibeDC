import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [baselineOffset, setBaselineOffset] = useState<number>(0);
  const [charsPerRow, setCharsPerRow] = useState<number>(16);
  const [previewScale, setPreviewScale] = useState<number>(2);
  const [antialiasThreshold, setAntialiasThreshold] = useState<number>(200);
  const [applyThreshold, setApplyThreshold] = useState<boolean>(true);
  const [useVariableWidth, setUseVariableWidth] = useState<boolean>(true);
  const [renderMonospaced, setRenderMonospaced] = useState<boolean>(true);
  const [demoText, setDemoText] = useState<string>('The quick brown fox jumps over the lazy dog!\n0123456789 @#$%^&*()_+-=[]{}|;:\'".,<>?/`~\\');
  const [demoScale, setDemoScale] = useState<number>(2);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const demoCanvasRef = useRef<HTMLCanvasElement>(null);
  const [charWidths, setCharWidths] = useState<number[]>([]);

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

      // Auto-detect optimal font dimensions
      autoDetectFontDimensions(familyName);

      setFontLoaded(true);
      console.log(`Font loaded: ${familyName}`);
    } catch (error) {
      console.error('Failed to load font:', error);
      alert('Failed to load font file. Please try a different TTF file.');
    }
  };

  // Auto-detect optimal font dimensions
  const autoDetectFontDimensions = (fontFamilyName: string) => {
    // Create a temporary canvas for measurements
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Test multiple font sizes to find optimal dimensions
    const testSizes = [8, 10, 12, 14, 16, 18, 20, 24];
    let bestSize = 12;
    let bestWidth = 12;
    let bestHeight = 12;

    // Test with capital 'M' (typically widest character) and lowercase letters
    const testChars = ['M', 'W', 'A', 'g', 'j', 'y'];

    for (const size of testSizes) {
      ctx.font = `${size}px "${fontFamilyName}", monospace`;

      // Measure width of widest characters
      let maxWidth = 0;
      for (const char of testChars) {
        const metrics = ctx.measureText(char);
        maxWidth = Math.max(maxWidth, Math.ceil(metrics.width));
      }

      // Get font height using font metrics
      const metrics = ctx.measureText('M');
      const height = Math.ceil(
        (metrics.actualBoundingBoxAscent || size) +
        (metrics.actualBoundingBoxDescent || size * 0.2)
      );

      // Prefer sizes that result in nice pixel values (8, 12, 16, etc.)
      const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;
      const isNiceNumber = isPowerOfTwo(maxWidth) || maxWidth % 4 === 0 || maxWidth === 12;

      // Pick the first size where width and height are in a reasonable range
      if (maxWidth >= 6 && maxWidth <= 32 && height >= 6 && height <= 32) {
        bestSize = size;
        bestWidth = Math.max(maxWidth, 8); // Minimum 8px
        bestHeight = Math.max(height, 8); // Minimum 8px

        // If we found a nice number, use it
        if (isNiceNumber) {
          break;
        }
      }
    }

    // Round to nearest multiple of 2 for cleaner values
    bestWidth = Math.ceil(bestWidth / 2) * 2;
    bestHeight = Math.ceil(bestHeight / 2) * 2;

    // Set the detected values
    setCharWidth(bestWidth);
    setCharHeight(bestHeight);
    setFontSize(bestSize);
    // Note: lineHeight and baselineOffset left for user to adjust

    console.log(`Auto-detected dimensions: ${bestWidth}×${bestHeight}px at ${bestSize}pt font size`);
  };

  // Generate the font atlas
  const generateAtlas = () => {
    if (!fontLoaded || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set font for measurements
    ctx.font = `${fontSize}px "${fontFamily}", monospace`;
    ctx.textBaseline = 'top';

    // Measure character widths if using variable width
    const measuredWidths: number[] = [];
    if (useVariableWidth) {
      charSet.forEach(char => {
        const metrics = ctx.measureText(char);
        const actualWidth = Math.ceil(metrics.width) + 2; // Add 2px padding
        measuredWidths.push(Math.min(actualWidth, charWidth)); // Cap at max charWidth
      });
      setCharWidths(measuredWidths);
    } else {
      // Use fixed width for all characters
      charSet.forEach(() => measuredWidths.push(charWidth));
      setCharWidths(measuredWidths);
    }

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
      const charActualWidth = measuredWidths[index];

      // Save context state
      ctx.save();

      // Clip to character cell to prevent overflow
      ctx.beginPath();
      ctx.rect(x, y, charWidth, charHeight);
      ctx.clip();

      // Center character horizontally if using variable width
      const xOffset = useVariableWidth ? Math.floor((charWidth - charActualWidth) / 2) : 0;

      // Draw character at baseline offset
      ctx.fillText(char, x + xOffset, y + baselineOffset);

      // Restore context state
      ctx.restore();
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

    // Draw grid overlay to visualize character cells (optional debug)
    // Uncomment to see cell boundaries
    // ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    // ctx.lineWidth = 1;
    // const rows = Math.ceil(charSet.length / charsPerRow);
    // for (let row = 0; row <= rows; row++) {
    //   ctx.beginPath();
    //   ctx.moveTo(0, row * charHeight * previewScale);
    //   ctx.lineTo(width, row * charHeight * previewScale);
    //   ctx.stroke();
    // }
    // for (let col = 0; col <= charsPerRow; col++) {
    //   ctx.beginPath();
    //   ctx.moveTo(col * charWidth * previewScale, 0);
    //   ctx.lineTo(col * charWidth * previewScale, height);
    //   ctx.stroke();
    // }
  };

  // Auto-generate when font is loaded and parameters change
  useEffect(() => {
    if (fontLoaded) {
      generateAtlas();
    }
  }, [fontLoaded, charWidth, charHeight, fontSize, baselineOffset, charsPerRow, applyThreshold, antialiasThreshold, useVariableWidth]);

  // Update preview when scale changes
  useEffect(() => {
    updatePreview();
  }, [previewScale]);

  // Render demo text using the generated atlas
  const renderDemoText = useCallback(() => {
    if (!canvasRef.current || !demoCanvasRef.current || !fontLoaded || !demoText) return;

    const atlasCanvas = canvasRef.current;
    const demoCanvas = demoCanvasRef.current;
    const ctx = demoCanvas.getContext('2d');
    if (!ctx) return;

    // Calculate dimensions for multi-line text
    const maxLineWidth = 500; // Max width before wrapping
    const charWidthWithSpacing = charWidth + charSpacing;
    const charsPerLine = Math.floor(maxLineWidth / charWidthWithSpacing);

    // Split by newlines first, then word wrap each line
    const inputLines = demoText.split('\n');
    const lines: string[] = [];

    for (const inputLine of inputLines) {
      if (!inputLine.trim()) {
        // Empty line - preserve it
        lines.push('');
        continue;
      }

      // Word wrap this line
      const words = inputLine.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length <= charsPerLine) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
    }

    // Calculate canvas size
    const maxCharsInLine = Math.max(...lines.map(line => line.length));
    const textWidth = maxCharsInLine * charWidthWithSpacing;
    const textHeight = lines.length * lineHeight;

    demoCanvas.width = textWidth * demoScale;
    demoCanvas.height = textHeight * demoScale;

    // Clear canvas
    ctx.clearRect(0, 0, demoCanvas.width, demoCanvas.height);
    ctx.imageSmoothingEnabled = false;

    // Render each line
    lines.forEach((line, lineIndex) => {
      let x = 0;
      const y = lineIndex * lineHeight;

      // Render each character in the line
      for (const char of line) {
        const charIndex = charSet.indexOf(char);
        if (charIndex !== -1) {
          const col = charIndex % charsPerRow;
          const row = Math.floor(charIndex / charsPerRow);
          const srcX = col * charWidth;
          const srcY = row * charHeight;

          // Use measured width if available, otherwise use fixed width
          const actualCharWidth = charWidths[charIndex] || charWidth;

          ctx.drawImage(
            atlasCanvas,
            srcX, srcY, charWidth, charHeight,
            x * demoScale, y * demoScale, charWidth * demoScale, charHeight * demoScale
          );

          // Advance by actual character width when NOT rendering monospaced
          x += (useVariableWidth && !renderMonospaced) ? actualCharWidth + charSpacing : charWidthWithSpacing;
        } else {
          x += charWidthWithSpacing;
        }
      }
    });
  }, [canvasRef, demoCanvasRef, fontLoaded, demoText, demoScale, charWidth, charHeight, charSpacing, lineHeight, charSet, charsPerRow, charWidths, useVariableWidth, renderMonospaced]);

  // Update demo when parameters change
  useEffect(() => {
    if (fontLoaded) {
      renderDemoText();
    }
  }, [fontLoaded, demoText, demoScale, charWidth, charHeight, charSpacing, lineHeight, renderDemoText]);

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
    // Generate characters array with position and width data
    const charactersYAML = charSet.map((char, index) => {
      const col = index % charsPerRow;
      const row = Math.floor(index / charsPerRow);
      const x = col * charWidth;
      const y = row * charHeight;
      const width = charWidths[index] || charWidth;

      // Escape special characters
      let escapedChar = char;
      if (char === '"') escapedChar = '\\"';
      if (char === '\\') escapedChar = '\\\\';

      return `      - { char: "${escapedChar}", x: ${x}, y: ${y}, width: ${width} }`;
    }).join('\n');

    const yaml = `# Font definition for ${fontId}
# Generated from font atlas generator

fonts:
  - id: "${fontId}"
    atlasPath: "/fonts/${fontId}-atlas.png"
    charHeight: ${charHeight}
    lineHeight: ${lineHeight}
    charSpacing: ${charSpacing}
    baselineOffset: ${baselineOffset}
    fallbackChar: "?"
    tags: ["pixel", "game"${useVariableWidth ? ', "variable-width"' : ''}]
    characters:
${charactersYAML}
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
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.95)',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 3000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
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
          padding: '20px 20px 16px 20px',
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
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0, padding: '20px' }}>
        {/* Left Panel - Controls */}
        <div style={{ flex: '0 0 400px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'auto', paddingRight: '10px' }}>
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

                {/* Variable Width Toggle */}
                <div style={{ marginBottom: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={useVariableWidth}
                      onChange={(e) => setUseVariableWidth(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '11px', color: '#aaa' }}>
                      Variable Width (Auto-detect)
                    </span>
                  </label>
                  {useVariableWidth && (
                    <div style={{ fontSize: '9px', color: '#666', marginTop: '4px', marginLeft: '24px' }}>
                      Each character centered in cell
                    </div>
                  )}
                </div>

                {/* Pixel-Perfect Toggle */}
                <div style={{ marginBottom: '8px' }}>
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
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#ff9800' }}>
                  Instructions:
                </div>
                <div style={{ wordWrap: 'break-word' }}>1. Upload a TTF/OTF font file</div>
                <div style={{ wordWrap: 'break-word' }}>2. Adjust parameters to fit characters in cells</div>
                <div style={{ wordWrap: 'break-word' }}>3. Download both PNG atlas and YAML</div>
                <div style={{ wordWrap: 'break-word' }}>4. Place PNG in /public/fonts/</div>
                <div style={{ wordWrap: 'break-word' }}>5. Load YAML in your game</div>
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
            overflow: 'auto',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '20px',
            gap: '20px',
          }}
        >
          {/* Atlas Preview Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                maxHeight: '400px',
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
                    height: '200px',
                    color: '#666',
                    fontSize: '14px',
                  }}
                >
                  Upload a font to generate atlas
                </div>
              )}
            </div>

            {/* Atlas Info */}
            {fontLoaded && (() => {
              const rows = Math.ceil(charSet.length / charsPerRow);
              const atlasWidth = charWidth * charsPerRow;
              const atlasHeight = charHeight * rows;
              return (
                <div style={{ fontSize: '11px', color: '#aaa' }}>
                  <div>Atlas Size: {atlasWidth} × {atlasHeight} px</div>
                  <div>Grid: {charsPerRow} cols × {rows} rows</div>
                  <div>Characters: {charSet.length} (ASCII 32-126)</div>
                </div>
              );
            })()}
          </div>

          {/* Demo Text Section */}
          {fontLoaded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Text Preview</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '11px', color: '#aaa' }}>Scale:</label>
                  <select
                    value={demoScale}
                    onChange={(e) => setDemoScale(Number(e.target.value))}
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

              <textarea
                value={demoText}
                onChange={(e) => setDemoText(e.target.value)}
                placeholder="Enter text to preview..."
                style={{
                  width: '100%',
                  minHeight: '60px',
                  padding: '8px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid #666',
                  borderRadius: '4px',
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  resize: 'vertical',
                }}
              />

              {/* Render Monospaced Toggle */}
              {useVariableWidth && (
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={renderMonospaced}
                      onChange={(e) => setRenderMonospaced(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '11px', color: '#aaa' }}>
                      Render Monospaced
                    </span>
                  </label>
                  <div style={{ fontSize: '9px', color: '#666', marginTop: '4px', marginLeft: '24px' }}>
                    {renderMonospaced ? 'Fixed spacing (default)' : 'Proportional spacing'}
                  </div>
                </div>
              )}

              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.5)',
                  borderRadius: '4px',
                  padding: '12px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <canvas
                  ref={demoCanvasRef}
                  style={{
                    imageRendering: 'pixelated',
                    display: 'block',
                  } as React.CSSProperties}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden canvas for actual generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};
