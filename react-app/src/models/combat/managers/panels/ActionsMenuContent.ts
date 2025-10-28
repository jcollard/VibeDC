import { FontAtlasRenderer } from '../../../../utils/FontAtlasRenderer';
import type { PanelContent, PanelRegion, PanelClickResult } from './PanelContent';

/**
 * Configuration for actions menu panel appearance
 */
export interface ActionsMenuConfig {
  title: string;
  titleColor: string;
  padding: number;
  lineSpacing: number;
}

/**
 * Panel content that displays action menu for the active unit's turn.
 *
 * Current: Stub implementation showing "ACTIONS" title
 * Future: Will display action buttons (Attack, Move, Ability, Wait, End Turn)
 */
export class ActionsMenuContent implements PanelContent {
  private readonly config: ActionsMenuConfig;

  constructor(config: ActionsMenuConfig) {
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

    // TODO: Render action buttons here
    // Future implementation:
    // - Attack button
    // - Move button
    // - Ability button (if unit has abilities)
    // - Wait button
    // - End Turn button

    // Placeholder text
    FontAtlasRenderer.renderText(
      ctx,
      '(Menu coming soon)',
      region.x + this.config.padding,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#888888'
    );
  }

  handleClick(
    _relativeX: number,
    _relativeY: number
  ): PanelClickResult {
    // TODO: Handle action button clicks
    // Future implementation:
    // - Detect which button was clicked based on relativeX and relativeY
    // - Return { type: 'action-selected', actionId: 'attack' | 'move' | 'ability' | 'wait' | 'end-turn' }
    // - Trigger appropriate action via return value
    return null;
  }
}
