import type { CinematicSequence, CinematicRenderContext } from './CinematicSequence';
import type { CombatState } from './CombatState';
import type { CombatEncounter } from './CombatEncounter';

/**
 * Internal tracking structure for staggered sequences
 */
interface StaggeredSequenceItem {
  sequence: CinematicSequence;
  startTime: number; // When this sequence should start (in seconds)
  started: boolean;
}

/**
 * Manages multiple cinematic sequences with staggered start times.
 * Sequences can overlap - later sequences start before earlier ones complete.
 *
 * Example: With 0.5s stagger and 1.0s duration:
 * - Sequence 0 runs from 0.0s to 1.0s
 * - Sequence 1 runs from 0.5s to 1.5s
 * - Sequence 2 runs from 1.0s to 2.0s
 */
export class StaggeredSequenceManager implements CinematicSequence {
  private sequences: StaggeredSequenceItem[] = [];
  private elapsedTime = 0;
  private complete = false;
  private state: CombatState | null = null;
  private encounter: CombatEncounter | null = null;

  /**
   * @param sequences - Array of sequences to play in staggered order
   * @param staggerDelay - Time delay between each sequence start in seconds (default: 0.5)
   */
  constructor(
    sequences: CinematicSequence[],
    staggerDelay: number = 0.5
  ) {
    // Calculate start times for each sequence
    this.sequences = sequences.map((seq, index) => ({
      sequence: seq,
      startTime: index * staggerDelay,
      started: false,
    }));
  }

  start(state: CombatState, encounter: CombatEncounter): void {
    this.elapsedTime = 0;
    this.complete = false;
    this.state = state;
    this.encounter = encounter;

    // Reset all sequences
    for (const item of this.sequences) {
      item.started = false;
      item.sequence.reset();
    }
  }

  update(deltaTime: number): boolean {
    this.elapsedTime += deltaTime;

    // Start sequences when their time comes
    for (const item of this.sequences) {
      if (!item.started && this.elapsedTime >= item.startTime) {
        item.started = true;
        if (this.state && this.encounter) {
          item.sequence.start(this.state, this.encounter);
        }
      }

      // Update started sequences
      if (item.started) {
        item.sequence.update(deltaTime);
      }
    }

    // Complete when all sequences are complete
    this.complete = this.sequences.every(item =>
      item.started && item.sequence.isComplete()
    );

    return this.complete;
  }

  render(state: CombatState, encounter: CombatEncounter, context: CinematicRenderContext): void {
    // Render all started sequences
    for (const item of this.sequences) {
      if (item.started) {
        item.sequence.render(state, encounter, context);
      }
    }
  }

  isComplete(): boolean {
    return this.complete;
  }

  reset(): void {
    this.elapsedTime = 0;
    this.complete = false;
    this.state = null;
    this.encounter = null;

    for (const item of this.sequences) {
      item.started = false;
      item.sequence.reset();
    }
  }

  /**
   * Get the number of sequences being managed
   */
  getSequenceCount(): number {
    return this.sequences.length;
  }

  /**
   * Get the number of sequences that have started
   */
  getStartedCount(): number {
    return this.sequences.filter(item => item.started).length;
  }

  /**
   * Get the number of sequences that have completed
   */
  getCompletedCount(): number {
    return this.sequences.filter(item => item.started && item.sequence.isComplete()).length;
  }
}
