import { useEffect, useRef, useState } from 'react';
import { SpriteRegistry } from '../utils/SpriteRegistry';
import { loadSprites } from '../data/DataLoader';

/**
 * Example component demonstrating how to use the SpriteRegistry
 * to render sprites from sprite sheets on a canvas.
 */
export function SpriteRegistryExample() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [spriteSheets, setSpriteSheets] = useState<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    // Load sprite definitions
    loadSprites();
    setLoaded(true);
    console.log(`Loaded ${SpriteRegistry.count} sprites`);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    // Load all unique sprite sheets
    const sheetsToLoad = new Set<string>();
    for (const sprite of SpriteRegistry.getAll()) {
      sheetsToLoad.add(sprite.spriteSheet);
    }

    const loadedSheets = new Map<string, HTMLImageElement>();
    let loadedCount = 0;

    for (const sheetPath of sheetsToLoad) {
      const img = new Image();
      img.onload = () => {
        loadedSheets.set(sheetPath, img);
        loadedCount++;

        if (loadedCount === sheetsToLoad.size) {
          setSpriteSheets(loadedSheets);
        }
      };
      img.src = sheetPath;
    }
  }, [loaded]);

  useEffect(() => {
    if (spriteSheets.size === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Example 1: Draw a specific sprite by ID
    const wolfSprite = SpriteRegistry.getById('bat');
    if (wolfSprite) {
      const sheet = spriteSheets.get(wolfSprite.spriteSheet);
      if (sheet) {
        drawSprite(ctx, sheet, wolfSprite.x, wolfSprite.y, 50, 50, 16, 16);

        // Draw label
        ctx.fillStyle = 'white';
        ctx.font = '12px monospace';
        ctx.fillText('Bat (by ID)', 10, 90);
      }
    }

    // Example 2: Draw all warrior sprites
    const warriors = SpriteRegistry.getByTag('warrior');
    let x = 150;
    warriors.slice(0, 4).forEach(sprite => {
      const sheet = spriteSheets.get(sprite.spriteSheet);
      if (sheet) {
        drawSprite(ctx, sheet, sprite.x, sprite.y, x, 50, 16, 16);
        x += 70;
      }
    });
    ctx.fillStyle = 'white';
    ctx.fillText('Warriors (by tag)', 150, 90);

    // Example 3: Draw monster sprites
    const monsters = SpriteRegistry.getByTag('slime');
    x = 50;
    let y = 150;
    monsters.forEach(sprite => {
      const sheet = spriteSheets.get(sprite.spriteSheet);
      if (sheet) {
        drawSprite(ctx, sheet, sprite.x, sprite.y, x, y, 16, 16);
        x += 70;
      }
    });
    ctx.fillStyle = 'white';
    ctx.fillText('Slimes (by tag)', 50, 220);

    // Example 4: Draw undead sprites
    const undead = SpriteRegistry.getByTag('undead');
    x = 50;
    y = 250;
    undead.forEach(sprite => {
      const sheet = spriteSheets.get(sprite.spriteSheet);
      if (sheet) {
        drawSprite(ctx, sheet, sprite.x, sprite.y, x, y, 16, 16);
        x += 70;
      }
    });
    ctx.fillStyle = 'white';
    ctx.fillText('Undead (by tag)', 50, 320);

  }, [spriteSheets]);

  /**
   * Helper function to draw a sprite from a sprite sheet
   */
  const drawSprite = (
    ctx: CanvasRenderingContext2D,
    sheet: HTMLImageElement,
    gridX: number,
    gridY: number,
    canvasX: number,
    canvasY: number,
    spriteWidth: number,
    spriteHeight: number,
    scale: number = 3
  ) => {
    ctx.imageSmoothingEnabled = false; // Pixel art

    ctx.drawImage(
      sheet,
      gridX * spriteWidth,        // Source X
      gridY * spriteHeight,       // Source Y
      spriteWidth,                // Source width
      spriteHeight,               // Source height
      canvasX,                    // Dest X
      canvasY,                    // Dest Y
      spriteWidth * scale,        // Dest width (scaled)
      spriteHeight * scale        // Dest height (scaled)
    );
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1a1a', color: 'white' }}>
      <h2>Sprite Registry Example</h2>
      <p>Total sprites registered: {SpriteRegistry.count}</p>
      <p>Sprite sheets loaded: {spriteSheets.size}</p>

      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        style={{
          border: '2px solid #444',
          marginTop: '20px',
          backgroundColor: '#2a2a2a'
        }}
      />

      <div style={{ marginTop: '20px' }}>
        <h3>How to use:</h3>
        <pre style={{
          backgroundColor: '#2a2a2a',
          padding: '10px',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
{`// 1. Get sprite by ID
const sprite = SpriteRegistry.getById('bat');
if (sprite) {
  // sprite.x, sprite.y are grid coordinates
  // sprite.spriteSheet is the path
}

// 2. Get all sprites with a tag
const warriors = SpriteRegistry.getByTag('warrior');

// 3. Get all sprites from a sheet
const monsters = SpriteRegistry.getBySheet(
  '/spritesheets/monsters.png'
);

// 4. Check if sprite exists
if (SpriteRegistry.has('dragon-red')) {
  // Use sprite
}

// 5. Get just coordinates
const coords = SpriteRegistry.getCoordinates('goblin');
// Returns { x: 0, y: 4 } or undefined`}
        </pre>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Available Tags:</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {Array.from(new Set(
            SpriteRegistry.getAll()
              .flatMap(s => s.tags || [])
          )).map(tag => (
            <span
              key={tag}
              style={{
                backgroundColor: '#444',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
