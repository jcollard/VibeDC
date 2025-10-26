import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';
import type { PanelContent, PanelRegion } from './PanelContent';

/**
 * Configuration for empty panel appearance
 */
export interface EmptyContentConfig {
  title: string;
  titleColor: string;
  padding: number;
  lineSpacing: number;
}

/**
 * Panel content that displays an empty state (no content to display).
 * Shows title and a dash to indicate nothing is selected.
 */
export class EmptyContent implements PanelContent {
  private readonly config: EmptyContentConfig;

  constructor(config: EmptyContentConfig) {
    this.config = config;
  }

  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;

    let currentY = region.y + this.config.padding;

    // Render title
    FontAtlasRenderer.renderText(
      ctx,
      this.config.title,
      region.x + this.config.padding,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      this.config.titleColor
    );
    currentY += this.config.lineSpacing;

    // Render empty indicator
    FontAtlasRenderer.renderText(
      ctx,
      '-',
      region.x + this.config.padding,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#666666'
    );
  }

  // No interaction handling needed for empty content
}
