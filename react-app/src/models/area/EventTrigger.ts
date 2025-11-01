/**
 * Event trigger types determine when events fire based on player movement.
 *
 * Guidelines Compliance:
 * - Uses const object pattern instead of enum (GeneralGuidelines.md)
 * - Provides type guard for runtime validation
 */

export const EventTrigger = {
  /**
   * OnEnter: Fires when player enters area (was NOT in area previous frame)
   */
  OnEnter: "on-enter",

  /**
   * OnStep: Fires every frame player is in area (was in area previous frame)
   */
  OnStep: "on-step",

  /**
   * OnExit: Fires when player exits area (was in area previous frame)
   */
  OnExit: "on-exit",
} as const;

export type EventTrigger = typeof EventTrigger[keyof typeof EventTrigger];

/**
 * Type guard to check if a string is a valid EventTrigger
 */
export function isEventTrigger(value: string): value is EventTrigger {
  return Object.values(EventTrigger).includes(value as EventTrigger);
}
