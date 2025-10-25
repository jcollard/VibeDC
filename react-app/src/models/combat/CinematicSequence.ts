import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';

/**
 * Context passed to cinematic sequences for rendering
 */
export interface CinematicRenderContext {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  tileSize: number;
  spriteSize: number;
  offsetX: number;
  offsetY: number;
  spriteImages: Map<string, HTMLImageElement>;
}

/**
 * Base interface for cinematic sequences that play during combat
 * Sequences are used for phase transitions, special events, etc.
 */
export interface CinematicSequence {
  /**
   * Called when the sequence starts
   */
  start(state: CombatState, encounter: CombatEncounter): void;

  /**
   * Update the sequence state
   * @param deltaTime - Time elapsed since last update in seconds
   * @returns True if the sequence is complete, false otherwise
   */
  update(deltaTime: number): boolean;

  /**
   * Render the sequence
   */
  render(state: CombatState, encounter: CombatEncounter, context: CinematicRenderContext): void;

  /**
   * Check if the sequence is complete
   */
  isComplete(): boolean;

  /**
   * Reset the sequence to its initial state
   */
  reset(): void;
}

/**
 * Manages playback of cinematic sequences
 * Handles input blocking, sequence queueing, and state management
 */
export class CinematicManager {
  private currentSequence: CinematicSequence | null = null;
  private isPlaying = false;

  /**
   * Start playing a cinematic sequence
   */
  play(sequence: CinematicSequence, state: CombatState, encounter: CombatEncounter): void {
    this.currentSequence = sequence;
    this.isPlaying = true;
    sequence.start(state, encounter);
  }

  /**
   * Update the current sequence
   * @returns True if a sequence is playing, false if complete or no sequence
   */
  update(deltaTime: number): boolean {
    if (!this.currentSequence || !this.isPlaying) {
      return false;
    }

    const complete = this.currentSequence.update(deltaTime);
    if (complete) {
      this.isPlaying = false;
      this.currentSequence = null;
      return false;
    }

    return true;
  }

  /**
   * Render the current sequence
   */
  render(state: CombatState, encounter: CombatEncounter, context: CinematicRenderContext): void {
    if (this.currentSequence && this.isPlaying) {
      this.currentSequence.render(state, encounter, context);
    }
  }

  /**
   * Check if a cinematic is currently playing
   */
  isPlayingCinematic(): boolean {
    return this.isPlaying;
  }

  /**
   * Skip the current sequence
   */
  skip(): void {
    if (this.currentSequence && this.isPlaying) {
      this.isPlaying = false;
      this.currentSequence = null;
    }
  }

  /**
   * Get the current sequence (for debugging/inspection)
   */
  getCurrentSequence(): CinematicSequence | null {
    return this.currentSequence;
  }
}
