import { load as loadYAML } from 'js-yaml';
import { FontRegistry } from './FontRegistry';
import type { FontDefinition, CharacterDefinition } from './FontRegistry';

/**
 * YAML structure for font files
 */
interface FontYAML {
  fonts: Array<{
    id: string;
    atlasPath: string;
    charHeight: number;
    lineHeight?: number;
    charSpacing?: number;
    baselineOffset?: number;
    charOffsetX?: number;
    charOffsetY?: number;
    fallbackChar?: string;
    tags?: string[];
    characters: Array<{
      char: string;
      x: number;
      y: number;
      width: number;
    }>;
  }>;
}

/**
 * Load a font from a YAML string
 */
export async function loadFontFromYAML(yamlContent: string): Promise<FontDefinition[]> {
  try {
    const data = loadYAML(yamlContent) as FontYAML;

    if (!data.fonts || !Array.isArray(data.fonts)) {
      throw new Error('Invalid font YAML: missing "fonts" array');
    }

    const fonts: FontDefinition[] = [];

    for (const fontData of data.fonts) {
      // Convert YAML character definitions to FontDefinition format
      const characters: CharacterDefinition[] = fontData.characters.map(char => ({
        char: char.char,
        x: char.x,
        y: char.y,
        width: char.width,
      }));

      const font: FontDefinition = {
        id: fontData.id,
        atlasPath: fontData.atlasPath,
        charHeight: fontData.charHeight,
        lineHeight: fontData.lineHeight,
        charSpacing: fontData.charSpacing ?? 0,
        baselineOffset: fontData.baselineOffset ?? 0,
        charOffsetX: fontData.charOffsetX,
        charOffsetY: fontData.charOffsetY,
        fallbackChar: fontData.fallbackChar ?? '?',
        characters,
        tags: fontData.tags,
      };

      fonts.push(font);
    }

    return fonts;
  } catch (error) {
    console.error('Error loading font from YAML:', error);
    throw error;
  }
}

/**
 * Load a font from a YAML file URL and register it
 */
export async function loadAndRegisterFont(url: string): Promise<FontDefinition[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch font file: ${response.statusText}`);
    }

    const yamlContent = await response.text();
    const fonts = await loadFontFromYAML(yamlContent);

    // Register all fonts
    FontRegistry.registerAll(fonts);

    console.log(`Loaded ${fonts.length} font(s) from ${url}`);
    return fonts;
  } catch (error) {
    console.error(`Error loading font from ${url}:`, error);
    throw error;
  }
}

/**
 * Load multiple font files
 */
export async function loadFonts(urls: string[]): Promise<FontDefinition[]> {
  const allFonts: FontDefinition[] = [];

  for (const url of urls) {
    try {
      const fonts = await loadAndRegisterFont(url);
      allFonts.push(...fonts);
    } catch (error) {
      console.error(`Skipping ${url} due to error:`, error);
    }
  }

  return allFonts;
}

/**
 * Load all fonts from the /data/fonts/ directory
 * This should be called during app initialization
 */
export async function loadAllFonts(): Promise<FontDefinition[]> {
  const fontFiles = [
    '/src/data/fonts/8px-habbo8.yaml',
    '/src/data/fonts/9px-habbo.yaml',
    '/src/data/fonts/10px-bitfantasy.yaml',
    '/src/data/fonts/15px-dungeonslant.yaml',
  ];

  console.log('Loading fonts...');
  const fonts = await loadFonts(fontFiles);
  console.log(`Successfully loaded ${fonts.length} font(s)`);
  console.log('Available fonts:', FontRegistry.getAllIds());

  return fonts;
}
