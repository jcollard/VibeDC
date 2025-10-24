import type { CinematicSequence, CinematicRenderContext } from './CinematicSequence';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';

/**
 * A cinematic sequence that chains multiple sequences together
 * Each sequence plays one after another in order
 */
export class SequenceChain implements CinematicSequence {
  private sequences: CinematicSequence[];
  private currentIndex = 0;
  private complete = false;
  private state: CombatState | null = null;
  private encounter: CombatEncounter | null = null;

  constructor(sequences: CinematicSequence[]) {
    this.sequences = sequences;
  }

  start(state: CombatState, encounter: CombatEncounter): void {
    this.currentIndex = 0;
    this.complete = false;
    this.state = state;
    this.encounter = encounter;

    // Start the first sequence
    if (this.sequences.length > 0) {
      this.sequences[0].start(state, encounter);
    } else {
      this.complete = true;
    }
  }

  update(deltaTime: number): boolean {
    if (this.complete || this.currentIndex >= this.sequences.length) {
      this.complete = true;
      return true;
    }

    const currentSequence = this.sequences[this.currentIndex];
    const sequenceComplete = currentSequence.update(deltaTime);

    if (sequenceComplete) {
      // Move to next sequence
      this.currentIndex++;

      if (this.currentIndex < this.sequences.length) {
        // Start the next sequence
        if (this.state && this.encounter) {
          this.sequences[this.currentIndex].start(this.state, this.encounter);
        }
      } else {
        // All sequences complete
        this.complete = true;
        return true;
      }
    }

    return false;
  }

  render(state: CombatState, encounter: CombatEncounter, context: CinematicRenderContext): void {
    if (this.complete || this.currentIndex >= this.sequences.length) {
      return;
    }

    // Render all completed sequences (so they stay visible)
    for (let i = 0; i < this.currentIndex; i++) {
      if (this.sequences[i].isComplete()) {
        this.sequences[i].render(state, encounter, context);
      }
    }

    // Render the current sequence on top
    this.sequences[this.currentIndex].render(state, encounter, context);
  }

  isComplete(): boolean {
    return this.complete;
  }

  reset(): void {
    this.currentIndex = 0;
    this.complete = false;
    this.state = null;
    this.encounter = null;

    // Reset all sequences
    for (const sequence of this.sequences) {
      sequence.reset();
    }
  }
}
