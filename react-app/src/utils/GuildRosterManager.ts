import type { PartyState } from '../models/game/GameState';
import type { PartyMemberDefinition } from './PartyMemberRegistry';
import { PartyMemberRegistry } from './PartyMemberRegistry';
import { GuildRosterRegistry } from './GuildRosterRegistry';
import { UnitClass } from '../models/combat/UnitClass';
import { CombatAbility } from '../models/combat/CombatAbility';
import type { CombatUnit } from '../models/combat/CombatUnit';

/**
 * Manages the guild roster (all created characters) and active party (max 4 members).
 * Provides methods for character creation, party management, and validation.
 *
 * IMPORTANT: All state updates use immutable patterns to maintain React compatibility.
 */
export class GuildRosterManager {
  private partyState: PartyState;
  private onStateChange?: (state: PartyState) => void;

  /**
   * WeakMap to track CombatUnit instances to their character IDs
   * Uses WeakMap to prevent memory leaks when units are removed
   */
  private unitToIdMap: WeakMap<CombatUnit, string> = new WeakMap();

  /**
   * Create a new GuildRosterManager
   * @param initialPartyState The initial party state (includes guild roster and active party)
   * @param onStateChange Callback to notify parent component of state changes
   */
  constructor(initialPartyState: PartyState, onStateChange?: (state: PartyState) => void) {
    this.partyState = initialPartyState;
    this.onStateChange = onStateChange;

    // Ensure all party members are in the guild roster
    this.syncPartyMembersToRoster();
  }

  /**
   * Notify parent component of state changes
   * @private
   */
  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.partyState);
    }
  }

  /**
   * Ensure all party members have corresponding definitions in the guild roster
   * This is important for default party members loaded from PartyMemberRegistry
   * @private
   */
  private syncPartyMembersToRoster(): void {
    const addedDefinitions: PartyMemberDefinition[] = [];

    for (const member of this.partyState.members) {
      // Check if this member already has a definition in the roster
      const existingDef = this.partyState.guildRoster.find(r => r.name === member.name);

      if (!existingDef) {
        // Create a definition from the CombatUnit
        const definition = this.convertUnitToDefinition(member);
        addedDefinitions.push(definition);

        // Store the mapping
        this.unitToIdMap.set(member, definition.id);

        // NOTE: Do NOT register with PartyMemberRegistry here!
        // PartyMemberRegistry is a global singleton for default party members only.
        // Guild roster is managed separately in partyState.guildRoster.
      } else {
        // Member already in roster, just ensure the mapping exists
        this.unitToIdMap.set(member, existingDef.id);
      }
    }

    // Add new definitions to roster if any were created
    if (addedDefinitions.length > 0) {
      this.partyState = {
        ...this.partyState,
        guildRoster: [...this.partyState.guildRoster, ...addedDefinitions]
      };

      // Notify state change to persist the updated roster
      this.notifyStateChange();
    }
  }

  /**
   * Convert a CombatUnit to a PartyMemberDefinition
   * @private
   */
  private convertUnitToDefinition(unit: CombatUnit): PartyMemberDefinition {
    // Generate unique ID if not already mapped
    const id = this.unitToIdMap.get(unit) || `character-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Cast to HumanoidUnit to access equipment properties
    // All party members should be HumanoidUnit instances
    const humanoid = unit as any; // Type assertion since CombatUnit doesn't expose equipment

    return {
      id,
      name: unit.name,
      unitClassId: unit.unitClass.id,
      spriteId: unit.spriteId,
      baseHealth: unit.maxHealth,
      baseMana: unit.maxMana,
      basePhysicalPower: unit.physicalPower,
      baseMagicPower: unit.magicPower,
      baseSpeed: unit.speed,
      baseMovement: unit.movement,
      basePhysicalEvade: unit.physicalEvade,
      baseMagicEvade: unit.magicEvade,
      baseCourage: unit.courage,
      baseAttunement: unit.attunement,
      leftHandId: humanoid.leftHand?.id,
      rightHandId: humanoid.rightHand?.id,
      headId: humanoid.head?.id,
      bodyId: humanoid.body?.id,
      accessoryId: humanoid.accessory?.id,
      learnedAbilityIds: Array.from(unit.learnedAbilities).map((a: CombatAbility) => a.id),
      reactionAbilityId: unit.reactionAbility?.id,
      passiveAbilityId: unit.passiveAbility?.id,
      movementAbilityId: unit.movementAbility?.id,
      totalExperience: 0,
      classExperience: {},
      classExperienceSpent: {},
      tags: ['default-party'],
    };
  }

  /**
   * Create a new character and add to guild roster
   * @param name Character name (1-12 ASCII characters)
   * @param spriteId Sprite ID for character appearance
   * @param unitClassId Unit class ID (must be a starter class with no requirements)
   * @param startingAbilityId Optional starting ability ID to learn (will grant XP for the primary class)
   * @returns The created character definition, or null if creation failed
   */
  createCharacter(name: string, spriteId: string, unitClassId: string, startingAbilityId?: string): PartyMemberDefinition | null {
    // Validate name
    if (!this.isValidName(name)) {
      console.warn('[GuildRosterManager] Invalid character name:', name);
      return null;
    }

    // Check for duplicate name
    if (this.partyState.guildRoster.some(c => c.name === name)) {
      console.warn('[GuildRosterManager] Character name already exists:', name);
      return null;
    }

    // Verify class exists and is a starter class
    const unitClass = UnitClass.getById(unitClassId);
    if (!unitClass) {
      console.error(`[GuildRosterManager] Unit class '${unitClassId}' not found`);
      return null;
    }

    if (unitClass.requirements.size > 0) {
      console.error(`[GuildRosterManager] Class '${unitClassId}' has requirements and cannot be used for character creation`);
      return null;
    }

    // Get class starter config from UnitClass
    const classConfig = unitClass.starterConfig;
    if (!classConfig) {
      console.error(`[GuildRosterManager] No starter config found for class '${unitClassId}'`);
      return null;
    }

    // Build learned abilities list and calculate XP
    const learnedAbilityIds = [...(classConfig.learnedAbilityIds || [])];
    const classExperience: Record<string, number> = {};
    const classExperienceSpent: Record<string, number> = {};

    // If a starting ability was selected, add it and grant XP for it
    if (startingAbilityId) {
      const ability = CombatAbility.getById(startingAbilityId);
      if (ability) {
        // Add ability to learned abilities
        if (!learnedAbilityIds.includes(startingAbilityId)) {
          learnedAbilityIds.push(startingAbilityId);
        }

        // Grant XP equal to the ability's cost for the primary class
        const abilityCost = ability.experiencePrice;
        classExperience[unitClassId] = abilityCost;
        classExperienceSpent[unitClassId] = abilityCost;

        console.log(`[GuildRosterManager] Character starting with ability '${ability.name}' (cost: ${abilityCost} XP for ${unitClass.name})`);
      } else {
        console.warn(`[GuildRosterManager] Starting ability '${startingAbilityId}' not found`);
      }
    }

    // Generate unique ID
    const id = `character-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Create full PartyMemberDefinition
    const character: PartyMemberDefinition = {
      id,
      name,
      unitClassId,
      spriteId,
      baseHealth: classConfig.baseHealth,
      baseMana: classConfig.baseMana,
      basePhysicalPower: classConfig.basePhysicalPower,
      baseMagicPower: classConfig.baseMagicPower,
      baseSpeed: classConfig.baseSpeed,
      baseMovement: classConfig.baseMovement,
      basePhysicalEvade: classConfig.basePhysicalEvade,
      baseMagicEvade: classConfig.baseMagicEvade,
      baseCourage: classConfig.baseCourage,
      baseAttunement: classConfig.baseAttunement,
      leftHandId: classConfig.leftHandId,
      rightHandId: classConfig.rightHandId,
      headId: classConfig.headId,
      bodyId: classConfig.bodyId,
      accessoryId: classConfig.accessoryId,
      learnedAbilityIds,
      reactionAbilityId: classConfig.reactionAbilityId,
      passiveAbilityId: classConfig.passiveAbilityId,
      movementAbilityId: classConfig.movementAbilityId,
      totalExperience: 0,
      classExperience,
      classExperienceSpent,
      tags: ['player-created'],
    };

    // Register with GuildRosterRegistry for immediate availability
    GuildRosterRegistry.register(character);

    // ⚠️ IMMUTABLE UPDATE: Create new state object with spread operator
    this.partyState = {
      ...this.partyState,
      guildRoster: [...this.partyState.guildRoster, character]
    };

    this.notifyStateChange();
    return character;
  }

  /**
   * Add a character from guild roster to active party
   * @param characterId The character ID to add
   * @returns true if added successfully, false otherwise
   */
  addToParty(characterId: string): boolean {
    // Check party size
    if (this.partyState.members.length >= 4) {
      console.warn('[GuildRosterManager] Party is full (max 4 members)');
      return false;
    }

    // Find character in guild roster
    const character = this.partyState.guildRoster.find(c => c.id === characterId);
    if (!character) {
      console.warn('[GuildRosterManager] Character not found in guild roster:', characterId);
      return false;
    }

    // Check if already in party
    if (this.partyState.members.some(p => this.unitToIdMap.get(p) === characterId)) {
      console.warn('[GuildRosterManager] Character already in party:', characterId);
      return false;
    }

    // Create CombatUnit from definition (NOT from registry)
    const combatUnit = PartyMemberRegistry.createFromDefinition(character);
    if (!combatUnit) {
      console.error('[GuildRosterManager] Failed to create CombatUnit from party member definition');
      return false;
    }

    // Store the mapping from CombatUnit to character ID
    this.unitToIdMap.set(combatUnit, characterId);

    // ⚠️ IMMUTABLE UPDATE: Create new state object with spread operator
    this.partyState = {
      ...this.partyState,
      members: [...this.partyState.members, combatUnit]
    };

    // Sync to PartyMemberRegistry (active party only)
    PartyMemberRegistry.register(character);
    PartyMemberRegistry.updateFromUnit(character.id, combatUnit as any);

    this.notifyStateChange();
    return true;
  }

  /**
   * Remove a character from active party (returns to guild roster)
   * @param characterId The character ID or name to remove
   * @returns true if removed successfully, false otherwise
   */
  removeFromParty(characterId: string): boolean {
    // Try to find by ID in WeakMap first, then fall back to matching by name
    const memberToRemove = this.partyState.members.find(c =>
      this.unitToIdMap.get(c) === characterId || c.name === characterId
    );

    if (!memberToRemove) {
      console.warn('[GuildRosterManager] Character not in party:', characterId);
      return false;
    }

    // Get the actual character ID
    const actualCharacterId = this.unitToIdMap.get(memberToRemove) || characterId;

    // ⚠️ IMMUTABLE UPDATE: Create new state object with filtered array
    this.partyState = {
      ...this.partyState,
      members: this.partyState.members.filter(c =>
        this.unitToIdMap.get(c) !== actualCharacterId && c.name !== memberToRemove.name
      )
    };

    // Remove from PartyMemberRegistry (active party only)
    PartyMemberRegistry.delete(actualCharacterId);

    this.notifyStateChange();
    return true;
  }

  /**
   * Get the active party (copy to prevent mutation)
   * @returns Array of active party members
   */
  getActiveParty(): CombatUnit[] {
    return [...this.partyState.members];
  }

  /**
   * Get available roster (characters not in active party)
   * @returns Array of available characters
   */
  getAvailableRoster(): PartyMemberDefinition[] {
    const activeIds = new Set(this.partyState.members.map(p => this.unitToIdMap.get(p)).filter(Boolean));
    return this.partyState.guildRoster.filter(c => !activeIds.has(c.id));
  }

  /**
   * Get all characters in guild roster (copy to prevent mutation)
   * @returns Array of all created characters
   */
  getAllCharacters(): PartyMemberDefinition[] {
    return [...this.partyState.guildRoster];
  }

  /**
   * Get a character by ID
   * @param id The character ID to look up
   * @returns The character definition, or undefined if not found
   */
  getCharacterById(id: string): PartyMemberDefinition | undefined {
    return this.partyState.guildRoster.find(c => c.id === id);
  }

  /**
   * Get the character ID for a CombatUnit
   * @param unit The combat unit
   * @returns The character ID, or undefined if not found
   */
  getUnitId(unit: CombatUnit): string | undefined {
    return this.unitToIdMap.get(unit);
  }

  /**
   * Validate a character name
   * @param name The name to validate
   * @returns true if valid, false otherwise
   */
  isValidName(name: string): boolean {
    if (name.length < 1 || name.length > 12) return false;
    if (name.trim().length === 0) return false;
    // ASCII alphabetic characters only (A-Z, a-z)
    const validPattern = /^[A-Za-z]+$/;
    return validPattern.test(name);
  }

  /**
   * Check if a name is already taken
   * @param name The name to check
   * @returns true if taken, false otherwise
   */
  isNameTaken(name: string): boolean {
    return this.partyState.guildRoster.some(c => c.name === name);
  }

  /**
   * Check if the party has room for more members
   * @returns true if party has fewer than 4 members
   */
  canAddToParty(): boolean {
    return this.partyState.members.length < 4;
  }

  /**
   * Get all starter classes (classes with no requirements and 'player' tag)
   * @returns Array of starter classes
   */
  getStarterClasses(): UnitClass[] {
    return UnitClass.getAll().filter(c =>
      c.requirements.size === 0 && c.tags.includes('player')
    );
  }
}
