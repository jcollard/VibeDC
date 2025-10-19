import * as THREE from 'three';

export interface SpriteCoordinates {
  x: number; // Grid X position in spritesheet (0-indexed)
  y: number; // Grid Y position in spritesheet (0-indexed)
}

export interface TileTextureMapping {
  floor?: SpriteCoordinates;
  ceiling?: SpriteCoordinates;
  wallFront?: SpriteCoordinates;
  wallBack?: SpriteCoordinates;
  wallLeft?: SpriteCoordinates;
  wallRight?: SpriteCoordinates;
}

/**
 * Loads and manages spritesheet textures for 3D rendering
 *
 * Usage:
 * ```typescript
 * const loader = new SpriteSheetLoader('/tiles/world-tiles.png', 12, 12);
 * await loader.load();
 * const floorTexture = loader.getTexture(0, 0);
 * ```
 */
export class SpriteSheetLoader {
  private spriteSheetPath: string;
  private spriteWidth: number;
  private spriteHeight: number;
  private baseTexture: THREE.Texture | null = null;
  private textureCache: Map<string, THREE.Texture> = new Map();

  /**
   * @param spriteSheetPath - Path to the spritesheet image
   * @param spriteWidth - Width of each sprite in pixels
   * @param spriteHeight - Height of each sprite in pixels
   */
  constructor(spriteSheetPath: string, spriteWidth: number, spriteHeight: number) {
    this.spriteSheetPath = spriteSheetPath;
    this.spriteWidth = spriteWidth;
    this.spriteHeight = spriteHeight;
  }

  /**
   * Load the spritesheet texture
   * Must be called before using getTexture()
   */
  async load(): Promise<void> {
    return new Promise((resolve, reject) => {
      const textureLoader = new THREE.TextureLoader();

      textureLoader.load(
        this.spriteSheetPath,
        (texture) => {
          // Configure texture settings
          texture.magFilter = THREE.NearestFilter; // Pixelated look for crisp sprites
          texture.minFilter = THREE.NearestFilter;
          texture.generateMipmaps = false;

          this.baseTexture = texture;
          resolve();
        },
        undefined,
        (error) => {
          reject(new Error(`Failed to load spritesheet: ${error}`));
        }
      );
    });
  }

  /**
   * Get a texture for a specific sprite in the sheet
   *
   * @param gridX - X position in sprite grid (0-indexed)
   * @param gridY - Y position in sprite grid (0-indexed)
   * @returns Three.js texture for the sprite
   */
  getTexture(gridX: number, gridY: number): THREE.Texture {
    if (!this.baseTexture) {
      throw new Error('SpriteSheetLoader: Must call load() before getTexture()');
    }

    // Check cache first
    const cacheKey = `${gridX},${gridY}`;
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    // Clone the base texture
    const texture = this.baseTexture.clone();
    texture.needsUpdate = true;

    // Calculate the total sheet dimensions
    const sheetWidth = this.baseTexture.image.width;
    const sheetHeight = this.baseTexture.image.height;

    // Calculate normalized UV coordinates for this sprite
    const uStart = (gridX * this.spriteWidth) / sheetWidth;
    const vStart = (gridY * this.spriteHeight) / sheetHeight;
    const uSize = this.spriteWidth / sheetWidth;
    const vSize = this.spriteHeight / sheetHeight;

    // Set texture repeat and offset to show only this sprite
    texture.repeat.set(uSize, vSize);
    texture.offset.set(uStart, 1 - vStart - vSize); // Flip V coordinate

    // Apply same filtering as base
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;

    // Cache for reuse
    this.textureCache.set(cacheKey, texture);

    return texture;
  }

  /**
   * Get textures for all faces of a tile
   *
   * @param mapping - Texture coordinates for each face
   * @returns Object with textures for each face
   */
  getTileTextures(mapping: TileTextureMapping): {
    floor?: THREE.Texture;
    ceiling?: THREE.Texture;
    wallFront?: THREE.Texture;
    wallBack?: THREE.Texture;
    wallLeft?: THREE.Texture;
    wallRight?: THREE.Texture;
  } {
    return {
      floor: mapping.floor ? this.getTexture(mapping.floor.x, mapping.floor.y) : undefined,
      ceiling: mapping.ceiling ? this.getTexture(mapping.ceiling.x, mapping.ceiling.y) : undefined,
      wallFront: mapping.wallFront ? this.getTexture(mapping.wallFront.x, mapping.wallFront.y) : undefined,
      wallBack: mapping.wallBack ? this.getTexture(mapping.wallBack.x, mapping.wallBack.y) : undefined,
      wallLeft: mapping.wallLeft ? this.getTexture(mapping.wallLeft.x, mapping.wallLeft.y) : undefined,
      wallRight: mapping.wallRight ? this.getTexture(mapping.wallRight.x, mapping.wallRight.y) : undefined,
    };
  }

  /**
   * Clear the texture cache (useful for memory management)
   */
  clearCache(): void {
    this.textureCache.forEach(texture => texture.dispose());
    this.textureCache.clear();
  }

  /**
   * Dispose of all textures and clean up
   */
  dispose(): void {
    this.clearCache();
    if (this.baseTexture) {
      this.baseTexture.dispose();
      this.baseTexture = null;
    }
  }
}
