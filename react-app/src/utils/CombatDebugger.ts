/**
 * CombatDebugger - Browser console debugging utilities for combat system
 *
 * Usage in browser console:
 * - window.CombatDebugger.simulateHover(260, 130) - Simulate mouse hover at canvas position
 * - window.CombatDebugger.enableHoverLogging() - Enable detailed hover event logging
 * - window.CombatDebugger.disableHoverLogging() - Disable hover event logging
 * - window.CombatDebugger.getCanvasInfo() - Get canvas and panel region information
 */

class CombatDebuggerClass {
  private hoverLoggingEnabled = false;
  private canvas: HTMLCanvasElement | null = null;

  /**
   * Find the combat canvas element
   */
  private findCanvas(): HTMLCanvasElement | null {
    if (this.canvas && document.body.contains(this.canvas)) {
      return this.canvas;
    }

    // Look for canvas in the document
    const canvases = document.querySelectorAll('canvas');
    for (const canvas of canvases) {
      // Find the canvas that's likely the combat canvas (384x216)
      if (canvas.width === 384 && canvas.height === 216) {
        this.canvas = canvas;
        return canvas;
      }
    }

    console.warn('[CombatDebugger] Could not find combat canvas (384x216)');
    return null;
  }

  /**
   * Simulate a mouse hover event at a specific canvas coordinate
   * @param canvasX - X coordinate on canvas (0-384)
   * @param canvasY - Y coordinate on canvas (0-216)
   */
  simulateHover(canvasX: number, canvasY: number): void {
    const canvas = this.findCanvas();
    if (!canvas) {
      console.error('[CombatDebugger] Canvas not found. Is combat view mounted?');
      return;
    }

    // Get canvas bounding rect to convert canvas coords to client coords
    const rect = canvas.getBoundingClientRect();

    // Calculate scale factors
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    // Convert canvas coordinates to client coordinates
    const clientX = rect.left + (canvasX * scaleX);
    const clientY = rect.top + (canvasY * scaleY);

    console.log(`[CombatDebugger] Simulating hover at canvas(${canvasX}, ${canvasY}) -> client(${clientX.toFixed(1)}, ${clientY.toFixed(1)})`);

    // Create a synthetic mouse event
    const mouseEvent = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX,
      clientY,
      screenX: window.screenX + clientX,
      screenY: window.screenY + clientY,
    });

    // Dispatch the event on the canvas
    canvas.dispatchEvent(mouseEvent);

    console.log('[CombatDebugger] Mouse move event dispatched');
  }

  /**
   * Simulate a click at a specific canvas coordinate
   * @param canvasX - X coordinate on canvas (0-384)
   * @param canvasY - Y coordinate on canvas (0-216)
   */
  simulateClick(canvasX: number, canvasY: number): void {
    const canvas = this.findCanvas();
    if (!canvas) {
      console.error('[CombatDebugger] Canvas not found. Is combat view mounted?');
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    const clientX = rect.left + (canvasX * scaleX);
    const clientY = rect.top + (canvasY * scaleY);

    console.log(`[CombatDebugger] Simulating click at canvas(${canvasX}, ${canvasY})`);

    // Dispatch mousedown, mouseup, and click
    canvas.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true, cancelable: true, view: window, clientX, clientY
    }));

    canvas.dispatchEvent(new MouseEvent('mouseup', {
      bubbles: true, cancelable: true, view: window, clientX, clientY
    }));

    canvas.dispatchEvent(new MouseEvent('click', {
      bubbles: true, cancelable: true, view: window, clientX, clientY
    }));

    console.log('[CombatDebugger] Click events dispatched');
  }

  /**
   * Enable detailed logging of hover events
   */
  enableHoverLogging(): void {
    this.hoverLoggingEnabled = true;
    console.log('[CombatDebugger] Hover logging ENABLED');
    console.log('Use window.CombatDebugger.disableHoverLogging() to disable');
  }

  /**
   * Disable hover event logging
   */
  disableHoverLogging(): void {
    this.hoverLoggingEnabled = false;
    console.log('[CombatDebugger] Hover logging DISABLED');
  }

  /**
   * Check if hover logging is enabled
   */
  isHoverLoggingEnabled(): boolean {
    return this.hoverLoggingEnabled;
  }

  /**
   * Get information about canvas and layout regions
   */
  getCanvasInfo(): void {
    const canvas = this.findCanvas();
    if (!canvas) {
      console.error('[CombatDebugger] Canvas not found');
      return;
    }

    const rect = canvas.getBoundingClientRect();
    console.log('[CombatDebugger] Canvas Info:');
    console.log(`  Canvas size: ${canvas.width}x${canvas.height}px`);
    console.log(`  Display size: ${rect.width.toFixed(1)}x${rect.height.toFixed(1)}px`);
    console.log(`  Position: (${rect.left.toFixed(1)}, ${rect.top.toFixed(1)})`);
    console.log(`  Scale: ${(rect.width / canvas.width).toFixed(3)}x`);

    console.log('\n[CombatDebugger] Common Panel Regions (canvas coords):');
    console.log('  Bottom Info Panel (deployment): x=252, y=120, width=132, height=96');
    console.log('  - Rows 10-17, Columns 21-31');
    console.log('\nTo hover over bottom panel: CombatDebugger.simulateHover(260, 130)');
  }

  /**
   * Log a hover event (called by components)
   */
  logHover(source: string, x: number, y: number, result: unknown): void {
    if (!this.hoverLoggingEnabled) return;

    console.log(`[CombatDebugger:Hover] ${source} at (${x}, ${y}):`, result);
  }

  /**
   * Log panel content state
   */
  logPanelContent(panelName: string, content: unknown): void {
    if (!this.hoverLoggingEnabled) return;

    console.log(`[CombatDebugger:Panel] ${panelName}:`, content);
  }

  /**
   * Show help text
   */
  help(): void {
    console.log(`
═══════════════════════════════════════════════════════════
  Combat Debugger - Available Commands
═══════════════════════════════════════════════════════════

Hover Simulation:
  CombatDebugger.simulateHover(x, y)
    Simulate mouse hover at canvas coordinates (x: 0-384, y: 0-216)
    Example: CombatDebugger.simulateHover(260, 130)

  CombatDebugger.simulateClick(x, y)
    Simulate mouse click at canvas coordinates
    Example: CombatDebugger.simulateClick(260, 130)

Logging:
  CombatDebugger.enableHoverLogging()
    Enable detailed logging of all hover events

  CombatDebugger.disableHoverLogging()
    Disable hover event logging

Canvas Info:
  CombatDebugger.getCanvasInfo()
    Show canvas dimensions and common panel regions

  CombatDebugger.help()
    Show this help text

═══════════════════════════════════════════════════════════
    `);
  }
}

// Create singleton instance
export const CombatDebugger = new CombatDebuggerClass();

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as any).CombatDebugger = CombatDebugger;
  console.log('[CombatDebugger] Ready! Type CombatDebugger.help() for usage');
}
