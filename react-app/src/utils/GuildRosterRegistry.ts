import type { PartyMemberDefinition } from './PartyMemberRegistry';

/**
 * GuildRosterRegistry - Global registry for ALL guild characters (both active party and available roster)
 *
 * This is separate from PartyMemberRegistry which only tracks the active party (max 4 members).
 * Guild roster includes everyone created in the guild hall, regardless of party status.
 *
 * Architecture:
 * - PartyMemberRegistry: Active party only (max 4) - used by PartyManagementView
 * - GuildRosterRegistry: All created characters - used by GuildHallView
 */
export class GuildRosterRegistry {
  private static registry: Map<string, PartyMemberDefinition> = new Map();

  /**
   * Register a new guild member
   * @param definition The party member definition to register
   */
  static register(definition: PartyMemberDefinition): void {
    if (this.registry.has(definition.id)) {
      console.warn(`[GuildRosterRegistry] Character '${definition.id}' already registered, overwriting`);
    }
    this.registry.set(definition.id, definition);
  }

  /**
   * Get a guild member by ID
   * @param id The character ID
   * @returns The character definition, or undefined if not found
   */
  static getById(id: string): PartyMemberDefinition | undefined {
    return this.registry.get(id);
  }

  /**
   * Get all guild members
   * @returns Array of all guild member definitions
   */
  static getAll(): PartyMemberDefinition[] {
    return Array.from(this.registry.values());
  }

  /**
   * Remove a guild member from the registry
   * @param id The character ID to remove
   * @returns true if removed, false if not found
   */
  static remove(id: string): boolean {
    return this.registry.delete(id);
  }

  /**
   * Clear all guild members from the registry
   */
  static clear(): void {
    this.registry.clear();
  }

  /**
   * Get the number of guild members in the registry
   */
  static get count(): number {
    return this.registry.size;
  }

  /**
   * Check if a character exists in the registry
   * @param id The character ID
   * @returns true if character exists, false otherwise
   */
  static has(id: string): boolean {
    return this.registry.has(id);
  }
}
