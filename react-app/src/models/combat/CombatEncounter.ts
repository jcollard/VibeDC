import type { Position } from "../../types";
import type { CombatUnit } from "./CombatUnit";
import type { CombatState } from "./CombatState";
import { EnemyRegistry } from "../../utils/EnemyRegistry";
import { TilesetRegistry } from "../../utils/TilesetRegistry";
import { CombatMap, parseASCIIMap } from "./CombatMap";
import type { CombatMapJSON, ASCIIMapDefinition } from "./CombatMap";
import type {
  CombatPredicate,
  CombatPredicateJSON,
} from "./CombatPredicate";
import { CombatPredicateFactory } from "./CombatPredicate";
import type { VictoryRewards } from "./VictoryRewards";

/**
 * Represents an enemy placement on the combat map.
 * References an enemy by ID from the EnemyRegistry.
 */
export interface EnemyPlacement {
  enemyId: string;
  position: Position;
}

/**
 * Legacy interface for backwards compatibility during migration.
 * @deprecated Use EnemyPlacement instead
 */
export interface UnitPlacement {
  unit: CombatUnit;
  position: Position;
}

/**
 * CombatEncounter defines a tactical combat scenario.
 * Includes the map, victory/defeat conditions, deployment zones, and enemy placements.
 */
export class CombatEncounter {
  private static registry: Map<string, CombatEncounter> = new Map();

  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly map: CombatMap;
  readonly victoryConditions: CombatPredicate[];
  readonly defeatConditions: CombatPredicate[];
  readonly playerDeploymentZones: Position[];
  readonly enemyPlacements: EnemyPlacement[];
  readonly tilesetId?: string; // Optional tileset ID for map reference
  readonly rewards: VictoryRewards; // Victory rewards (XP, gold, items)

  constructor(
    id: string,
    name: string,
    description: string,
    map: CombatMap,
    victoryConditions: CombatPredicate[],
    defeatConditions: CombatPredicate[],
    playerDeploymentZones: Position[],
    enemyPlacements: EnemyPlacement[],
    tilesetId?: string,
    rewards?: VictoryRewards
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.map = map;
    this.victoryConditions = victoryConditions;
    this.defeatConditions = defeatConditions;
    this.playerDeploymentZones = playerDeploymentZones;
    this.enemyPlacements = enemyPlacements;
    this.tilesetId = tilesetId;

    // Calculate rewards from enemies if not explicitly provided
    this.rewards = rewards ?? this.calculateRewardsFromEnemies();

    CombatEncounter.registry.set(id, this);
  }

  /**
   * Calculates total XP and Gold rewards from all enemies in this encounter.
   * Returns a VictoryRewards object with the summed values.
   */
  private calculateRewardsFromEnemies(): VictoryRewards {
    let totalXp = 0;
    let totalGold = 0;

    for (const placement of this.enemyPlacements) {
      const enemyDef = EnemyRegistry.getById(placement.enemyId);
      if (enemyDef) {
        totalXp += enemyDef.xpValue;
        totalGold += enemyDef.goldValue;
      } else {
        console.warn(`Enemy definition not found for '${placement.enemyId}' in encounter '${this.id}'`);
      }
    }

    return {
      xp: totalXp,
      gold: totalGold,
      items: [], // Items can be added manually via rewards parameter
    };
  }

  /**
   * Creates enemy unit instances from the enemy placements.
   * Returns an array of UnitPlacement objects with instantiated CombatUnits.
   */
  createEnemyUnits(): UnitPlacement[] {
    return this.enemyPlacements
      .map((placement) => {
        const enemy = EnemyRegistry.createEnemy(placement.enemyId);
        if (!enemy) {
          console.error(
            `Failed to create enemy '${placement.enemyId}' for encounter '${this.id}'`
          );
          return null;
        }
        return {
          unit: enemy,
          position: placement.position,
        };
      })
      .filter((p): p is UnitPlacement => p !== null);
  }

  /**
   * Checks if victory conditions are met.
   * All victory conditions must be true (AND logic).
   */
  isVictory(state: CombatState): boolean {
    return this.victoryConditions.every((condition) =>
      condition.evaluate(state)
    );
  }

  /**
   * Checks if defeat conditions are met.
   * Any defeat condition being true results in defeat (OR logic).
   */
  isDefeat(state: CombatState): boolean {
    return this.defeatConditions.some((condition) =>
      condition.evaluate(state)
    );
  }

  /**
   * Gets the number of deployment slots available for players.
   */
  get deploymentSlotCount(): number {
    return this.playerDeploymentZones.length;
  }

  /**
   * Gets the number of enemy units in this encounter.
   */
  get enemyCount(): number {
    return this.enemyPlacements.length;
  }

  /**
   * Converts the encounter to a JSON-serializable format.
   */
  toJSON(): CombatEncounterJSON {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      map: this.map.toJSON(),
      victoryConditions: this.victoryConditions.map((vc) => vc.toJSON()),
      defeatConditions: this.defeatConditions.map((dc) => dc.toJSON()),
      playerDeploymentZones: this.playerDeploymentZones,
      enemyPlacements: this.enemyPlacements,
      rewards: this.rewards,
    };
  }

  /**
   * Creates a CombatEncounter from a JSON representation.
   */
  static fromJSON(json: CombatEncounterJSON): CombatEncounter {
    // Parse map - support tileset reference, ASCII, and JSON grid formats
    let map: CombatMap;
    let tilesetId: string | undefined;

    if ('tilesetId' in json.map && 'grid' in json.map) {
      // Tileset reference format - look up the tileset
      tilesetId = (json.map as any).tilesetId as string;
      const tileset = TilesetRegistry.getById(tilesetId);
      if (!tileset) {
        throw new Error(`Tileset '${tilesetId}' not found in registry for encounter '${json.id}'`);
      }
      // Create an ASCII map definition using the tileset's tileTypes
      const asciiDef: ASCIIMapDefinition = {
        tileTypes: tileset.tileTypes,
        grid: (json.map as any).grid,
      };
      map = parseASCIIMap(asciiDef);
    } else if ('tileTypes' in json.map && 'grid' in json.map) {
      // ASCII format with inline tileTypes
      map = parseASCIIMap(json.map as ASCIIMapDefinition);
    } else {
      // JSON grid format
      map = CombatMap.fromJSON(json.map as CombatMapJSON);
    }

    const victoryConditions = json.victoryConditions.map((vc) =>
      CombatPredicateFactory.fromJSON(vc)
    );
    const defeatConditions = json.defeatConditions.map((dc) =>
      CombatPredicateFactory.fromJSON(dc)
    );

    // Convert enemy placements - handle both new format (enemyId) and legacy format (unit object)
    const enemyPlacements: EnemyPlacement[] = json.enemyPlacements.map((placement) => {
      // Check if this is the new format with enemyId
      if ('enemyId' in placement) {
        return placement as EnemyPlacement;
      }
      // Legacy format - log a warning
      console.warn(
        `Encounter '${json.id}' uses legacy unit format. Please update to use enemyId references.`
      );
      // For legacy format, we can't properly convert without knowing the enemy ID
      // This is a migration issue - encounters should be updated to the new format
      throw new Error(
        `Encounter '${json.id}' uses legacy format. Please update encounter-database.yaml to use enemyId references.`
      );
    });

    return new CombatEncounter(
      json.id,
      json.name,
      json.description,
      map,
      victoryConditions,
      defeatConditions,
      json.playerDeploymentZones,
      enemyPlacements,
      tilesetId,
      json.rewards
    );
  }

  // Registry methods
  static getById(id: string): CombatEncounter | undefined {
    return CombatEncounter.registry.get(id);
  }

  static getAll(): CombatEncounter[] {
    return Array.from(CombatEncounter.registry.values());
  }

  static clearRegistry(): void {
    CombatEncounter.registry.clear();
  }
}

/**
 * JSON representation of a CombatEncounter for serialization.
 */
export interface CombatEncounterJSON {
  id: string;
  name: string;
  description: string;
  map: CombatMapJSON | ASCIIMapDefinition; // Support both formats
  victoryConditions: CombatPredicateJSON[];
  defeatConditions: CombatPredicateJSON[];
  playerDeploymentZones: Position[];
  enemyPlacements: EnemyPlacement[];
  rewards?: VictoryRewards; // Optional victory rewards
}
