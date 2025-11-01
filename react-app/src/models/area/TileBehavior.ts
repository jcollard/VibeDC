/**
 * Tile behavior types for first-person navigation.
 * Determines how players interact with tiles.
 */
export const TileBehavior = {
  /**
   * Wall: Not walkable, blocks movement completely
   */
  Wall: "wall",

  /**
   * Floor: Walkable and stoppable (normal tile)
   */
  Floor: "floor",

  /**
   * Door: Passable but not stoppable (auto-continue through)
   */
  Door: "door",
} as const;

export type TileBehavior = typeof TileBehavior[keyof typeof TileBehavior];

/**
 * Type guard to check if a string is a valid TileBehavior
 */
export function isTileBehavior(value: string): value is TileBehavior {
  return Object.values(TileBehavior).includes(value as TileBehavior);
}
