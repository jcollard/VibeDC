/**
 * Global UI configuration settings
 */
export class UIConfig {
  /**
   * Text highlight color used for interactive elements (e.g., hover states)
   * Default: dark yellow
   */
  private static _highlightColor = '#ccaa00';

  /**
   * Get the current highlight color
   */
  static getHighlightColor(): string {
    return this._highlightColor;
  }

  /**
   * Set the highlight color
   */
  static setHighlightColor(color: string): void {
    this._highlightColor = color;
  }
}
