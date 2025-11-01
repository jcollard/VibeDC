import type { GameViewType } from '../models/game/GameState';

/**
 * ViewTransitionManager - Manages animated transitions between game views
 * Handles fade in/out animations and cleanup between view switches
 */
export class ViewTransitionManager {
  private isTransitioning: boolean = false;
  private transitionDuration: number = 500; // ms

  /**
   * Check if a transition is currently in progress
   */
  isInTransition(): boolean {
    return this.isTransitioning;
  }

  /**
   * Get the configured transition duration in milliseconds
   */
  getTransitionDuration(): number {
    return this.transitionDuration;
  }

  /**
   * Set the transition duration
   * @param durationMs Duration in milliseconds (default: 500ms)
   */
  setTransitionDuration(durationMs: number): void {
    if (durationMs < 0) {
      console.warn('[ViewTransitionManager] Duration cannot be negative, using 0');
      this.transitionDuration = 0;
      return;
    }
    this.transitionDuration = durationMs;
  }

  /**
   * Execute a view transition with fade animation
   * @param fromView Current view being transitioned from
   * @param toView Target view to transition to
   * @param onTransitionComplete Callback executed at transition midpoint (fade out complete, before fade in)
   * @returns Promise that resolves when transition is complete
   */
  async transitionTo(
    fromView: GameViewType,
    toView: GameViewType,
    onTransitionComplete: () => void
  ): Promise<void> {
    if (this.isTransitioning) {
      console.warn('[ViewTransitionManager] Transition already in progress, ignoring');
      return;
    }

    if (fromView === toView) {
      console.log('[ViewTransitionManager] Same view, skipping transition');
      onTransitionComplete();
      return;
    }

    this.isTransitioning = true;
    console.log(`[ViewTransitionManager] Transitioning from ${fromView} to ${toView}`);

    try {
      // Phase 1: Fade out current view
      await this.fadeOut();

      // Phase 2: Switch view (caller updates state)
      onTransitionComplete();

      // Phase 3: Fade in new view
      await this.fadeIn();

      console.log(`[ViewTransitionManager] Transition to ${toView} complete`);
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Fade out animation
   * @returns Promise that resolves when fade out is complete
   */
  private async fadeOut(): Promise<void> {
    return new Promise((resolve) => {
      // Animation handled by CSS classes, just wait for duration
      setTimeout(resolve, this.transitionDuration / 2);
    });
  }

  /**
   * Fade in animation
   * @returns Promise that resolves when fade in is complete
   */
  private async fadeIn(): Promise<void> {
    return new Promise((resolve) => {
      // Animation handled by CSS classes, just wait for duration
      setTimeout(resolve, this.transitionDuration / 2);
    });
  }

  /**
   * Instantly switch views without animation
   * Used for initial load or skip transitions
   */
  instantTransition(onTransitionComplete: () => void): void {
    if (this.isTransitioning) {
      console.warn('[ViewTransitionManager] Cannot instant transition during active transition');
      return;
    }

    console.log('[ViewTransitionManager] Instant transition');
    onTransitionComplete();
  }
}
