import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';

export interface MenuOption {
  label: string;
  action: () => void;
}

/**
 * Renders a menu panel with selectable options
 */
export class MenuPanel {
  private hoveredIndex: number | null = null;

  /**
   * Render menu panel in the given region
   */
  render(
    ctx: CanvasRenderingContext2D,
    options: MenuOption[],
    regionX: number,
    regionY: number,
    _regionWidth: number,
    _regionHeight: number,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;

    ctx.save();

    const lineHeight = 8;
    let currentY = regionY + 4;

    // Title "Menu" in orange
    FontAtlasRenderer.renderText(
      ctx,
      'Menu',
      regionX + 4,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ff8800' // Orange
    );
    currentY += lineHeight + 2;

    // Render menu options
    options.forEach((option, index) => {
      const isHovered = this.hoveredIndex === index;
      const color = isHovered ? '#ffff00' : '#ffffff'; // Yellow when hovered, white otherwise

      FontAtlasRenderer.renderText(
        ctx,
        option.label,
        regionX + 4,
        currentY,
        fontId,
        fontAtlasImage,
        1,
        'left',
        color
      );

      currentY += lineHeight + 2;
    });

    ctx.restore();
  }

  /**
   * Handle mouse movement for hover detection
   * @returns true if hover state changed and needs re-render
   */
  handleMouseMove(
    mouseX: number,
    mouseY: number,
    options: MenuOption[],
    regionX: number,
    regionY: number,
    regionWidth: number
  ): boolean {
    const lineHeight = 8;
    const titleHeight = lineHeight + 2;
    let optionY = regionY + 4 + titleHeight;

    let newHoveredIndex: number | null = null;

    for (let i = 0; i < options.length; i++) {
      const optionHeight = lineHeight + 2;

      // Check if mouse is over this option
      if (
        mouseX >= regionX &&
        mouseX <= regionX + regionWidth &&
        mouseY >= optionY &&
        mouseY < optionY + optionHeight
      ) {
        newHoveredIndex = i;
        break;
      }

      optionY += optionHeight;
    }

    const changed = newHoveredIndex !== this.hoveredIndex;
    this.hoveredIndex = newHoveredIndex;
    return changed;
  }

  /**
   * Handle mouse click
   * @returns true if an option was clicked
   */
  handleMouseClick(
    mouseX: number,
    mouseY: number,
    options: MenuOption[],
    regionX: number,
    regionY: number,
    regionWidth: number
  ): boolean {
    const lineHeight = 8;
    const titleHeight = lineHeight + 2;
    let optionY = regionY + 4 + titleHeight;

    for (let i = 0; i < options.length; i++) {
      const optionHeight = lineHeight + 2;

      // Check if mouse clicked this option
      if (
        mouseX >= regionX &&
        mouseX <= regionX + regionWidth &&
        mouseY >= optionY &&
        mouseY < optionY + optionHeight
      ) {
        options[i].action();
        return true;
      }

      optionY += optionHeight;
    }

    return false;
  }

  /**
   * Get the currently hovered option index
   */
  getHoveredIndex(): number | null {
    return this.hoveredIndex;
  }
}
