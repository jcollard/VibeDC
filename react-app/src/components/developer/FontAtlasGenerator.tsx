import { useState, useRef, useEffect, useCallback } from 'react';
import { generateASCIICharSet } from '../../utils/FontRegistry';
import yaml from 'js-yaml';

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
  const [showDebugGrid, setShowDebugGrid] = useState<boolean>(false);
  const [selectedCharIndex, setSelectedCharIndex] = useState<number | null>(null);
  const [charPositions, setCharPositions] = useState<{ x: number; y: number; width: number; height: number }[]>([]);
  const selectedCharCanvasRef = useRef<HTMLCanvasElement>(null);

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
    const testSizes = [8, 10, 12, 14, 16, 18, 20, 24, 32];
    let bestWidth = 12;
    let bestHeight = 12;

    // Test with various characters to get accurate measurements
    const testChars = ['M', 'W', 'A', 'g', 'j', 'y', 'Q', 'p'];

    for (const size of testSizes) {
      ctx.font = `${size}px "${fontFamilyName}", monospace`;
      ctx.textBaseline = 'top';

      // Measure width of widest characters
      let maxWidth = 0;
      for (const char of testChars) {
        const metrics = ctx.measureText(char);
        maxWidth = Math.max(maxWidth, Math.ceil(metrics.width));
      }

      // Get accurate font height by measuring actual bounding box
      let maxAscent = 0;
      let maxDescent = 0;

      for (const char of testChars) {
        const metrics = ctx.measureText(char);
        // Use actualBoundingBox for more accurate measurements
        if (metrics.actualBoundingBoxAscent !== undefined) {
          maxAscent = Math.max(maxAscent, metrics.actualBoundingBoxAscent);
        }
        if (metrics.actualBoundingBoxDescent !== undefined) {
          maxDescent = Math.max(maxDescent, metrics.actualBoundingBoxDescent);
        }
      }

      // If actualBoundingBox not supported, fall back to font size estimation
      const height = maxAscent + maxDescent > 0
        ? Math.ceil(maxAscent + maxDescent)
        : size; // Fallback to font size itself

      // Prefer sizes that result in nice pixel values (8, 12, 16, etc.)
      const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;
      const isNiceNumber = isPowerOfTwo(height) || height % 4 === 0 || height === 12;

      // Pick the first size where width and height are in a reasonable range
      if (maxWidth >= 4 && maxWidth <= 48 && height >= 4 && height <= 48) {
        bestWidth = Math.max(maxWidth, 4); // Minimum 4px
        bestHeight = Math.max(height, 4); // Minimum 4px

        // If we found a nice number, use it
        if (isNiceNumber) {
          break;
        }
      }
    }

    // Round to nearest multiple of 2 for cleaner values
    bestWidth = Math.ceil(bestWidth / 2) * 2;
    bestHeight = Math.ceil(bestHeight / 2) * 2;

    // Set the detected values - char height, font size, and line height match
    setCharWidth(bestWidth);
    setCharHeight(bestHeight);
    setFontSize(bestHeight); // Font size matches char height
    setLineHeight(bestHeight); // Line height matches char height
    // Note: baselineOffset left for user to adjust

    console.log(`Auto-detected: Width=${bestWidth}px, Height=${bestHeight}px, FontSize=${bestHeight}pt, LineHeight=${bestHeight}px`);
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

    // Placeholder for measured widths - will be calculated after rendering
    const measuredWidths: number[] = [];
    const positions: { x: number; y: number; width: number; height: number }[] = [];

    // Initially use text measurement or fixed width for rendering
    if (useVariableWidth) {
      charSet.forEach(char => {
        const metrics = ctx.measureText(char);
        const actualWidth = Math.ceil(metrics.width) + 2; // Add 2px padding
        measuredWidths.push(Math.min(actualWidth, charWidth)); // Cap at max charWidth
      });
    } else {
      // Use fixed width for all characters
      charSet.forEach(() => measuredWidths.push(charWidth));
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

    // Render each character (first pass - will refine positions after)
    charSet.forEach((char, index) => {
      const col = index % charsPerRow;
      const row = Math.floor(index / charsPerRow);
      const cellX = col * charWidth;
      const cellY = row * charHeight;
      const charActualWidth = measuredWidths[index];

      // Center character horizontally if using variable width
      const xOffset = useVariableWidth ? Math.floor((charWidth - charActualWidth) / 2) : 0;

      // Save context state
      ctx.save();

      // Clip to character cell to prevent overflow
      ctx.beginPath();
      ctx.rect(cellX, cellY, charWidth, charHeight);
      ctx.clip();

      // Draw character at baseline offset
      ctx.fillText(char, cellX + xOffset, cellY + baselineOffset);

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

    // Measure actual pixel widths by scanning the rendered characters
    if (useVariableWidth) {
      const imageData = ctx.getImageData(0, 0, atlasWidth, atlasHeight);
      const data = imageData.data;

      charSet.forEach((char, index) => {
        const col = index % charsPerRow;
        const row = Math.floor(index / charsPerRow);
        const cellX = col * charWidth;
        const cellY = row * charHeight;

        // Scan pixels to find actual bounds
        let minX = charWidth;
        let maxX = 0;

        // Scan the entire cell for non-transparent pixels
        for (let y = 0; y < charHeight; y++) {
          for (let x = 0; x < charWidth; x++) {
            const pixelX = cellX + x;
            const pixelY = cellY + y;
            const pixelIndex = (pixelY * atlasWidth + pixelX) * 4;
            const alpha = data[pixelIndex + 3];

            // If pixel has content (not transparent)
            if (alpha > 0) {
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
            }
          }
        }

        // Calculate actual width and position
        let actualWidth;
        let actualX;

        // Space character always uses full charWidth
        if (char === ' ') {
          actualWidth = charWidth;
          actualX = cellX;
        } else if (maxX >= minX) {
          // Found pixels - add 1px padding on each side
          const leftPadding = Math.max(0, minX - 1);
          const rightPadding = Math.min(charWidth - 1, maxX + 1);
          actualWidth = rightPadding - leftPadding + 1;
          actualX = cellX + leftPadding;
        } else {
          // No pixels found - use full width
          actualWidth = charWidth;
          actualX = cellX;
        }

        // Cap at max charWidth
        actualWidth = Math.min(actualWidth, charWidth);

        // Update measured width
        measuredWidths[index] = actualWidth;

        // Store actual character position
        positions.push({
          x: actualX,
          y: cellY,
          width: actualWidth,
          height: charHeight
        });
      });

      setCharWidths(measuredWidths);
    } else {
      // For fixed width, just store positions
      charSet.forEach((_char, index) => {
        const col = index % charsPerRow;
        const row = Math.floor(index / charsPerRow);
        const cellX = col * charWidth;
        const cellY = row * charHeight;

        positions.push({
          x: cellX,
          y: cellY,
          width: charWidth,
          height: charHeight
        });
      });

      setCharWidths(measuredWidths);
    }

    // Store character positions
    setCharPositions(positions);

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

    // Draw debug grid overlay if enabled
    if (showDebugGrid && charPositions.length > 0) {
      charPositions.forEach((pos, index) => {
        ctx.strokeStyle = selectedCharIndex === index ? 'rgba(255, 165, 0, 0.8)' : 'rgba(255, 255, 0, 0.4)';
        ctx.fillStyle = selectedCharIndex === index ? 'rgba(255, 165, 0, 0.2)' : 'rgba(255, 255, 0, 0.1)';
        ctx.lineWidth = selectedCharIndex === index ? 2 : 1;

        // Draw box around actual character bounds (pos already includes offset)
        const scaledX = pos.x * previewScale;
        const scaledY = pos.y * previewScale;
        const scaledWidth = pos.width * previewScale;
        const scaledHeight = pos.height * previewScale;

        ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
        ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
      });
    }
  };

  // Auto-generate when font is loaded and parameters change
  useEffect(() => {
    if (fontLoaded) {
      generateAtlas();
    }
  }, [fontLoaded, charWidth, charHeight, fontSize, baselineOffset, charsPerRow, applyThreshold, antialiasThreshold, useVariableWidth]);

  // Update preview when scale, debug grid, or selection changes
  useEffect(() => {
    updatePreview();
  }, [previewScale, showDebugGrid, selectedCharIndex, charPositions]);

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
          // Use character position if available (for custom x/y), otherwise calculate from grid
          const charPos = charPositions[charIndex];
          const srcX = charPos?.x ?? (charIndex % charsPerRow) * charWidth;
          const srcY = charPos?.y ?? Math.floor(charIndex / charsPerRow) * charHeight;
          const actualCharWidth = charPos?.width ?? charWidths[charIndex] ?? charWidth;
          const actualCharHeight = charPos?.height ?? charHeight;

          ctx.drawImage(
            atlasCanvas,
            srcX, srcY, actualCharWidth, actualCharHeight,
            x * demoScale, y * demoScale, actualCharWidth * demoScale, actualCharHeight * demoScale
          );

          // Advance by actual character width when NOT rendering monospaced
          x += (useVariableWidth && !renderMonospaced) ? actualCharWidth + charSpacing : charWidthWithSpacing;
        } else {
          x += charWidthWithSpacing;
        }
      }
    });
  }, [canvasRef, demoCanvasRef, fontLoaded, demoText, demoScale, charWidth, charHeight, charSpacing, lineHeight, charSet, charsPerRow, charWidths, charPositions, useVariableWidth, renderMonospaced]);

  // Update demo when parameters change
  useEffect(() => {
    if (fontLoaded) {
      renderDemoText();
    }
  }, [fontLoaded, demoText, demoScale, charWidth, charHeight, charSpacing, lineHeight, renderDemoText]);

  // Handle click on preview canvas to select character
  const handlePreviewClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showDebugGrid || !previewCanvasRef.current || charPositions.length === 0) return;

    const canvas = previewCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / previewScale;
    const clickY = (e.clientY - rect.top) / previewScale;

    // Find which character was clicked (pos already includes offset)
    for (let i = 0; i < charPositions.length; i++) {
      const pos = charPositions[i];

      if (clickX >= pos.x && clickX < pos.x + pos.width &&
          clickY >= pos.y && clickY < pos.y + pos.height) {
        setSelectedCharIndex(i);
        renderSelectedCharPreview(i);
        return;
      }
    }

    // Clicked outside any character
    setSelectedCharIndex(null);
  };

  // Render 4x preview of selected character
  const renderSelectedCharPreview = (index: number) => {
    if (!canvasRef.current || !selectedCharCanvasRef.current) return;

    const atlasCanvas = canvasRef.current;
    const previewCanvas = selectedCharCanvasRef.current;
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    const pos = charPositions[index];
    const scale = 4;

    // Position already includes offset, use it directly
    const sourceX = pos.x;
    const sourceY = pos.y;
    const sourceWidth = pos.width;
    const sourceHeight = pos.height;

    // Size canvas to fit the actual character bounds
    previewCanvas.width = sourceWidth * scale;
    previewCanvas.height = sourceHeight * scale;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // Draw only the character within its bounds
    ctx.drawImage(
      atlasCanvas,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, sourceWidth * scale, sourceHeight * scale
    );
  };

  // Update selected character preview when selection or atlas changes
  useEffect(() => {
    if (selectedCharIndex !== null && charPositions.length > 0) {
      renderSelectedCharPreview(selectedCharIndex);
    }
  }, [selectedCharIndex, charPositions, charWidth, charHeight]);

  // Handle character property changes
  const updateCharacterProperty = (property: 'x' | 'y' | 'width' | 'height', value: number) => {
    if (selectedCharIndex === null) return;

    const newPositions = [...charPositions];
    newPositions[selectedCharIndex] = {
      ...newPositions[selectedCharIndex],
      [property]: value
    };
    setCharPositions(newPositions);

    // Update charWidths if width changed
    if (property === 'width') {
      const newWidths = [...charWidths];
      newWidths[selectedCharIndex] = value;
      setCharWidths(newWidths);
    }

    // Regenerate atlas with new positions
    // This will be handled by the useEffect dependency on charPositions
  };

  // Download the atlas image
  const downloadAtlas = async () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const defaultName = fontId ? `${fontId}-atlas.png` : 'font-atlas.png';

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      // Try using File System Access API (modern browsers)
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: defaultName,
            types: [{
              description: 'PNG Image',
              accept: { 'image/png': ['.png'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        } catch (err) {
          // User cancelled or error occurred, fall through to legacy method
          if ((err as Error).name === 'AbortError') return;
        }
      }

      // Fallback to legacy download method
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  // Download the YAML definition
  const downloadYAML = async () => {
    const defaultName = fontId || 'font-definition';

    // Generate characters array with position and width data
    const charactersYAML = charSet.map((char, index) => {
      // Use stored character position if available, otherwise calculate from grid
      const charPos = charPositions[index];
      const x = charPos?.x ?? (index % charsPerRow) * charWidth;
      const y = charPos?.y ?? Math.floor(index / charsPerRow) * charHeight;
      const width = charPos?.width ?? charWidths[index] ?? charWidth;

      // Escape special characters
      let escapedChar = char;
      if (char === '"') escapedChar = '\\"';
      if (char === '\\') escapedChar = '\\\\';

      return `      - { char: "${escapedChar}", x: ${x}, y: ${y}, width: ${width} }`;
    }).join('\n');

    const yaml = `# Font definition for ${defaultName}
# Generated from font atlas generator
# AA Threshold: ${applyThreshold ? antialiasThreshold : 'disabled'}

fonts:
  - id: "${defaultName}"
    atlasPath: "/fonts/${defaultName}-atlas.png"
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

    // Try using File System Access API (modern browsers)
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `${defaultName}.yaml`,
          types: [{
            description: 'YAML File',
            accept: { 'text/yaml': ['.yaml', '.yml'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err) {
        // User cancelled or error occurred, fall through to legacy method
        if ((err as Error).name === 'AbortError') return;
      }
    }

    // Fallback to legacy download method
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${defaultName}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import YAML definition
  const handleImportYAML = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = yaml.load(content) as any;

        if (!parsed.fonts || !parsed.fonts[0]) {
          alert('Invalid YAML format: No font definition found');
          return;
        }

        const fontDef = parsed.fonts[0];

        // Import font settings
        if (fontDef.id) setFontId(fontDef.id);
        if (fontDef.charHeight) setCharHeight(fontDef.charHeight);
        if (fontDef.lineHeight) setLineHeight(fontDef.lineHeight);
        if (fontDef.charSpacing !== undefined) setCharSpacing(fontDef.charSpacing);
        if (fontDef.baselineOffset !== undefined) setBaselineOffset(fontDef.baselineOffset);

        // Check if variable width
        const isVariableWidth = fontDef.tags && fontDef.tags.includes('variable-width');
        setUseVariableWidth(isVariableWidth);

        // Import character widths
        if (fontDef.characters && Array.isArray(fontDef.characters)) {
          const importedWidths: number[] = [];
          const importedPositions: { x: number; y: number; width: number; height: number }[] = [];

          // Map characters by their char value to handle out-of-order definitions
          const charMap = new Map<string, any>();
          fontDef.characters.forEach((charDef: any) => {
            charMap.set(charDef.char, charDef);
          });

          // Build arrays in ASCII order (32-126)
          charSet.forEach((char) => {
            const charDef = charMap.get(char);
            if (charDef) {
              importedWidths.push(charDef.width || charWidth);
              importedPositions.push({
                x: charDef.x || 0,
                y: charDef.y || 0,
                width: charDef.width || charWidth,
                height: fontDef.charHeight || charHeight
              });
            } else {
              // Character not found in import, use default
              importedWidths.push(charWidth);
              importedPositions.push({
                x: 0,
                y: 0,
                width: charWidth,
                height: charHeight
              });
            }
          });

          setCharWidths(importedWidths);
          setCharPositions(importedPositions);
        }

        alert(`Successfully imported font definition: ${fontDef.id}`);
      } catch (error) {
        console.error('Failed to parse YAML:', error);
        alert('Failed to parse YAML file. Please check the file format.');
      }
    };

    reader.readAsText(file);
    // Reset the input so the same file can be selected again
    event.target.value = '';
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
                    <>
                      <div style={{ fontSize: '9px', color: '#666', marginTop: '4px', marginLeft: '24px' }}>
                        Each character centered in cell
                      </div>
                      <button
                        onClick={generateAtlas}
                        style={{
                          marginTop: '6px',
                          marginLeft: '24px',
                          padding: '4px 8px',
                          background: 'rgba(33, 150, 243, 0.2)',
                          border: '1px solid rgba(33, 150, 243, 0.4)',
                          borderRadius: '3px',
                          color: '#fff',
                          fontSize: '10px',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                        }}
                      >
                        Regenerate Widths
                      </button>
                    </>
                  )}
                </div>

                {/* Debug Grid Toggle */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showDebugGrid}
                      onChange={(e) => setShowDebugGrid(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '11px', color: '#aaa' }}>
                      Show Character Grid
                    </span>
                  </label>
                  {showDebugGrid && (
                    <div style={{ fontSize: '9px', color: '#666', marginTop: '4px', marginLeft: '24px' }}>
                      Click characters to edit properties
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

              {/* Import/Export */}
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
                  3. Import/Export
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label
                    htmlFor="yaml-import"
                    style={{
                      padding: '8px',
                      background: 'rgba(156, 39, 176, 0.3)',
                      border: '1px solid rgba(156, 39, 176, 0.6)',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      display: 'block',
                    }}
                  >
                    Import YAML Definition
                    <input
                      id="yaml-import"
                      type="file"
                      accept=".yaml,.yml"
                      onChange={handleImportYAML}
                      style={{ display: 'none' }}
                    />
                  </label>
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
                  onClick={handlePreviewClick}
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    imageRendering: 'pixelated',
                    display: 'block',
                    cursor: showDebugGrid ? 'pointer' : 'default',
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

          {/* Character Editor Panel */}
          {fontLoaded && showDebugGrid && selectedCharIndex !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                Character Editor: "{charSet[selectedCharIndex]}" (#{selectedCharIndex}, ASCII {charSet[selectedCharIndex].charCodeAt(0)})
              </div>

              {/* 4x Character Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '11px', color: '#aaa' }}>Preview (4x scale):</div>
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.5)',
                    borderRadius: '4px',
                    padding: '10px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <canvas
                    ref={selectedCharCanvasRef}
                    style={{
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      imageRendering: 'pixelated',
                    } as React.CSSProperties}
                  />
                </div>
              </div>

              {/* Character Properties */}
              <div style={{ display: 'flex', gap: '12px' }}>
                {/* X Position */}
                <div style={{ flex: '0 0 auto' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#aaa' }}>
                    X: {charPositions[selectedCharIndex]?.x ?? 0}
                  </label>
                  <input
                    type="number"
                    value={charPositions[selectedCharIndex]?.x ?? 0}
                    onChange={(e) => updateCharacterProperty('x', Number(e.target.value))}
                    style={{
                      width: '80px',
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

                {/* Y Position */}
                <div style={{ flex: '0 0 auto' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#aaa' }}>
                    Y: {charPositions[selectedCharIndex]?.y ?? 0}
                  </label>
                  <input
                    type="number"
                    value={charPositions[selectedCharIndex]?.y ?? 0}
                    onChange={(e) => updateCharacterProperty('y', Number(e.target.value))}
                    style={{
                      width: '80px',
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

                {/* Width */}
                <div style={{ flex: '0 0 auto' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#aaa' }}>
                    Width: {charPositions[selectedCharIndex]?.width ?? charWidth}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={charWidth}
                    value={charPositions[selectedCharIndex]?.width ?? charWidth}
                    onChange={(e) => updateCharacterProperty('width', Number(e.target.value))}
                    style={{
                      width: '80px',
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
              </div>

              <div style={{ fontSize: '9px', color: '#666', marginTop: '4px' }}>
                Tip: Adjust these values to fine-tune individual character positioning and dimensions
              </div>
            </div>
          )}

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
