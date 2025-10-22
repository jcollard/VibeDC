import type { Position } from "../../types";
import type { CombatUnit } from "./CombatUnit";
import { HumanoidUnit } from "./HumanoidUnit";
import type { HumanoidUnitJSON } from "./HumanoidUnit";
import { MonsterUnit } from "./MonsterUnit";
import type { MonsterUnitJSON } from "./MonsterUnit";
import { CombatMap, parseASCIIMap } from "./CombatMap";
import type { CombatMapJSON, ASCIIMapDefinition } from "./CombatMap";
import type {
  CombatPredicate,
  CombatPredicateJSON,
} from "./CombatPredicate";
import { CombatPredicateFactory } from "./CombatPredicate";

/**
 * Represents a unit placement on the combat map.
 */
export interface UnitPlacement {
  unit: CombatUnit;
  position: Position;
}

/**
 * JSON representation of a unit placement for serialization.
 * Supports both HumanoidUnit and MonsterUnit.
 */
export interface UnitPlacementJSON {
  unit: HumanoidUnitJSON | MonsterUnitJSON;
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
  readonly enemyPlacements: UnitPlacement[];

  constructor(
    id: string,
    name: string,
    description: string,
    map: CombatMap,
    victoryConditions: CombatPredicate[],
    defeatConditions: CombatPredicate[],
    playerDeploymentZones: Position[],
    enemyPlacements: UnitPlacement[]
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.map = map;
    this.victoryConditions = victoryConditions;
    this.defeatConditions = defeatConditions;
    this.playerDeploymentZones = playerDeploymentZones;
    this.enemyPlacements = enemyPlacements;

    CombatEncounter.registry.set(id, this);
  }

  /**
   * Checks if victory conditions are met.
   * All victory conditions must be true (AND logic).
   */
  isVictory(state: { turnNumber: number }): boolean {
    return this.victoryConditions.every((condition) =>
      condition.evaluate(state)
    );
  }

  /**
   * Checks if defeat conditions are met.
   * Any defeat condition being true results in defeat (OR logic).
   */
  isDefeat(state: { turnNumber: number }): boolean {
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
      enemyPlacements: this.enemyPlacements.map((placement) => ({
        unit: placement.unit.toJSON() as HumanoidUnitJSON,
        position: placement.position,
      })),
    };
  }

  /**
   * Creates a CombatEncounter from a JSON representation.
   */
  static fromJSON(json: CombatEncounterJSON): CombatEncounter {
    // Parse map - support both ASCII and JSON grid formats
    let map: CombatMap;
    if ('tileTypes' in json.map && 'grid' in json.map) {
      // ASCII format
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
    const enemyPlacements: UnitPlacement[] = json.enemyPlacements
      .map((placement) => {
        // Determine unit type by checking for equipment fields (HumanoidUnit) or lack thereof (MonsterUnit)
        const unitJson = placement.unit;
        let unit: CombatUnit | null = null;

        if ('leftHandId' in unitJson || 'rightHandId' in unitJson) {
          // Has equipment fields - must be HumanoidUnit
          unit = HumanoidUnit.fromJSON(unitJson as HumanoidUnitJSON);
        } else {
          // No equipment fields - must be MonsterUnit
          unit = MonsterUnit.fromJSON(unitJson as MonsterUnitJSON);
        }

        if (!unit) {
          console.error(`Failed to deserialize unit in encounter ${json.id}`);
          return null;
        }
        return {
          unit: unit as CombatUnit,
          position: placement.position,
        };
      })
      .filter((p): p is { unit: CombatUnit; position: Position } => p !== null);

    return new CombatEncounter(
      json.id,
      json.name,
      json.description,
      map,
      victoryConditions,
      defeatConditions,
      json.playerDeploymentZones,
      enemyPlacements
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
  enemyPlacements: UnitPlacementJSON[];
}
