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
   * Font used for button text
   * Default: Bitfantasy
   */
  private static _buttonFont = 'Bitfantasy';

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

  /**
   * Get the current button font
   */
  static getButtonFont(): string {
    return this._buttonFont;
  }

  /**
   * Set the button font
   */
  static setButtonFont(font: string): void {
    this._buttonFont = font;
  }
}
