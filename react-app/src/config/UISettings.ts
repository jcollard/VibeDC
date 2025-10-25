/**
 * UI Settings for the application
 * Controls display and rendering behavior
 */

export interface UISettingsConfig {
  /**
   * Enable integer scaling for the canvas
   * When true, the canvas will scale by integer multiples only (1x, 2x, 3x, 4x, 5x, etc.)
   * This ensures pixel-perfect rendering without blur or distortion
   * When false, the canvas will scale to fit the available space (may use fractional scaling)
   */
  integerScaling: boolean;

  /**
   * Manual scale factor (1-5)
   * When set to a value > 0, this overrides automatic scale calculation
   * When set to 0 (or null), automatic scaling is used based on available space
   */
  manualScale: number;
}

/**
 * Default UI settings
 */
const DEFAULT_SETTINGS: UISettingsConfig = {
  integerScaling: true, // Default to integer scaling for crisp pixel art
  manualScale: 0, // 0 = automatic scaling
};

/**
 * UISettings class manages UI configuration
 * Provides access to settings and allows runtime changes
 */
export class UISettings {
  private static settings: UISettingsConfig = { ...DEFAULT_SETTINGS };

  /**
   * Get the current UI settings
   */
  static getSettings(): Readonly<UISettingsConfig> {
    return { ...this.settings };
  }

  /**
   * Enable or disable integer scaling
   */
  static setIntegerScaling(enabled: boolean): void {
    this.settings.integerScaling = enabled;
  }

  /**
   * Check if integer scaling is enabled
   */
  static isIntegerScalingEnabled(): boolean {
    return this.settings.integerScaling;
  }

  /**
   * Set manual scale factor (0 = automatic, 1-5 = fixed scale)
   */
  static setManualScale(scale: number): void {
    this.settings.manualScale = Math.max(0, Math.min(5, Math.floor(scale)));
  }

  /**
   * Get the current manual scale factor
   */
  static getManualScale(): number {
    return this.settings.manualScale;
  }

  /**
   * Reset all settings to defaults
   */
  static resetToDefaults(): void {
    this.settings = { ...DEFAULT_SETTINGS };
  }

  /**
   * Calculate the maximum integer scale that fits within the given dimensions
   * @param canvasWidth - Native canvas width in pixels
   * @param canvasHeight - Native canvas height in pixels
   * @param containerWidth - Available container width in pixels
   * @param containerHeight - Available container height in pixels
   * @returns The maximum integer scale factor (1x, 2x, 3x, etc.)
   */
  static calculateMaxIntegerScale(
    canvasWidth: number,
    canvasHeight: number,
    containerWidth: number,
    containerHeight: number
  ): number {
    const scaleX = Math.floor(containerWidth / canvasWidth);
    const scaleY = Math.floor(containerHeight / canvasHeight);
    // Use the smaller scale to ensure the canvas fits in both dimensions
    const maxScale = Math.max(1, Math.min(scaleX, scaleY));
    return maxScale;
  }

  /**
   * Get the scaled dimensions for integer scaling
   * @param canvasWidth - Native canvas width in pixels
   * @param canvasHeight - Native canvas height in pixels
   * @param containerWidth - Available container width in pixels
   * @param containerHeight - Available container height in pixels
   * @returns Object with scaled width and height, or null if integer scaling is disabled
   */
  static getIntegerScaledDimensions(
    canvasWidth: number,
    canvasHeight: number,
    containerWidth: number,
    containerHeight: number
  ): { width: number; height: number; scale: number } | null {
    if (!this.settings.integerScaling) {
      return null;
    }

    // Use manual scale if set, otherwise calculate automatically
    let scale: number;
    if (this.settings.manualScale > 0) {
      scale = this.settings.manualScale;
    } else {
      scale = this.calculateMaxIntegerScale(
        canvasWidth,
        canvasHeight,
        containerWidth,
        containerHeight
      );
    }

    return {
      width: canvasWidth * scale,
      height: canvasHeight * scale,
      scale,
    };
  }
}
