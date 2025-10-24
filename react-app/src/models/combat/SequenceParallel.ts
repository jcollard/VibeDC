import type { CinematicSequence, CinematicRenderContext } from './CinematicSequence';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';

/**
 * A composite sequence that runs multiple sequences in parallel.
 * All sequences start at the same time and the parallel sequence
 * completes when all child sequences have completed.
 */
export class SequenceParallel implements CinematicSequence {
  private sequences: CinematicSequence[];
  private started = false;

  /**
   * Creates a new parallel sequence.
   * @param sequences - The sequences to run in parallel
   */
  constructor(sequences: CinematicSequence[]) {
    this.sequences = sequences;
  }

  start(state: CombatState, encounter: CombatEncounter): void {
    this.started = true;
    // Start all sequences simultaneously
    if (this.sequences.length === 0) {
      return;
    }
    for (const sequence of this.sequences) {
      sequence.start(state, encounter);
    }
  }

  update(deltaTime: number): boolean {
    if (!this.started) {
      return false;
    }

    if (this.sequences.length === 0) {
      return true;
    }

    // Update all sequences
    for (const sequence of this.sequences) {
      if (!sequence.isComplete()) {
        sequence.update(deltaTime);
      }
    }

    // Return true when complete
    return this.isComplete();
  }

  render(state: CombatState, encounter: CombatEncounter, context: CinematicRenderContext): void {
    // Render all sequences (in order, so later ones render on top)
    for (const sequence of this.sequences) {
      sequence.render(state, encounter, context);
    }
  }

  isComplete(): boolean {
    // Complete when all sequences are complete
    return this.sequences.every(seq => seq.isComplete());
  }

  reset(): void {
    this.started = false;
    for (const sequence of this.sequences) {
      sequence.reset();
    }
  }
}
