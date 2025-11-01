import type { CardinalDirection } from '../types';

/**
 * Input command types
 */
export const InputCommand = {
  MoveForward: 'move-forward',
  MoveBackward: 'move-backward',
  TurnLeft: 'turn-left',
  TurnRight: 'turn-right',
  Interact: 'interact',
} as const;

export type InputCommand = typeof InputCommand[keyof typeof InputCommand];

/**
 * Input handler for first-person navigation
 */
export class FirstPersonInputHandler {
  private inputBlocked: boolean = false;

  /**
   * Process keyboard input and return command (if any)
   */
  processKeyDown(event: KeyboardEvent): InputCommand | null {
    if (this.inputBlocked) return null;

    const key = event.key.toLowerCase();

    // Movement
    if (key === 'w' || key === 'arrowup') return InputCommand.MoveForward;
    if (key === 's' || key === 'arrowdown') return InputCommand.MoveBackward;
    if (key === 'a' || key === 'arrowleft') return InputCommand.TurnLeft;
    if (key === 'd' || key === 'arrowright') return InputCommand.TurnRight;

    // Interaction
    if (key === ' ' || key === 'e') return InputCommand.Interact;

    return null;
  }

  /**
   * Block input (during animations, cinematics)
   */
  blockInput(): void {
    this.inputBlocked = true;
  }

  /**
   * Unblock input
   */
  unblockInput(): void {
    this.inputBlocked = false;
  }

  /**
   * Check if input is blocked
   */
  isInputBlocked(): boolean {
    return this.inputBlocked;
  }

  /**
   * Calculate new direction after turning
   */
  static calculateNewDirection(current: CardinalDirection, turn: 'left' | 'right'): CardinalDirection {
    const directions: CardinalDirection[] = ['North', 'East', 'South', 'West'];
    const currentIndex = directions.indexOf(current);

    if (turn === 'left') {
      return directions[(currentIndex + 3) % 4]; // -1 with wrap
    } else {
      return directions[(currentIndex + 1) % 4]; // +1 with wrap
    }
  }

  /**
   * Calculate target position after moving forward/backward
   */
  static calculateTargetPosition(
    x: number,
    y: number,
    direction: CardinalDirection,
    moveForward: boolean
  ): { x: number; y: number } {
    const multiplier = moveForward ? 1 : -1;

    switch (direction) {
      case 'North':
        return { x, y: y - multiplier }; // North is negative Y
      case 'South':
        return { x, y: y + multiplier }; // South is positive Y
      case 'East':
        return { x: x + multiplier, y }; // East is positive X
      case 'West':
        return { x: x - multiplier, y }; // West is negative X
    }
  }
}
