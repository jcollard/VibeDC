import type { CombatUnit } from './CombatUnit';
import type { Position } from '../../types';
import { HumanoidUnit, type HumanoidUnitJSON } from './HumanoidUnit';
import { MonsterUnit, type MonsterUnitJSON } from './MonsterUnit';

/**
 * Represents a combat unit and its position on the map
 */
export interface UnitPlacement {
  unit: CombatUnit;
  position: Position;
}

/**
 * JSON representation of UnitPlacement for serialization
 */
export interface UnitPlacementJSON {
  unit: HumanoidUnitJSON | MonsterUnitJSON;
  position: Position;
  type: 'humanoid' | 'monster';
}

/**
 * JSON representation of CombatUnitManifest for serialization
 */
export interface CombatUnitManifestJSON {
  units: UnitPlacementJSON[];
}

/**
 * CombatUnitManifest tracks all units and their positions in a combat encounter
 */
export class CombatUnitManifest {
  private units: Map<string, UnitPlacement>; // Map of unique unit ID to placement
  private nextUnitId: number = 0; // Auto-incrementing ID generator
  private unitToId: WeakMap<CombatUnit, string> = new WeakMap(); // Track unit -> ID mapping

  constructor() {
    this.units = new Map();
  }

  /**
   * Generate a unique ID for a unit
   * Format: "unitName-X" where X is an auto-incrementing number
   */
  private generateUnitId(unit: CombatUnit): string {
    // Check if this unit already has an ID
    const existingId = this.unitToId.get(unit);
    if (existingId) {
      return existingId;
    }

    // Generate new unique ID
    const id = `${unit.name}-${this.nextUnitId++}`;
    this.unitToId.set(unit, id);
    return id;
  }

  /**
   * Add a unit to the manifest at a specific position
   */
  addUnit(unit: CombatUnit, position: Position): void {
    const id = this.generateUnitId(unit);
    this.units.set(id, { unit, position });
  }

  /**
   * Remove a unit from the manifest by unit instance
   */
  removeUnit(unit: CombatUnit): void {
    const id = this.unitToId.get(unit);
    if (id) {
      this.units.delete(id);
      this.unitToId.delete(unit);
    }
  }

  /**
   * Get a unit by its instance
   */
  getUnit(unit: CombatUnit): CombatUnit | undefined {
    const id = this.unitToId.get(unit);
    if (!id) return undefined;
    return this.units.get(id)?.unit;
  }

  /**
   * Get the position of a unit by instance
   */
  getUnitPosition(unit: CombatUnit): Position | undefined {
    const id = this.unitToId.get(unit);
    if (!id) return undefined;
    return this.units.get(id)?.position;
  }

  /**
   * Get the unit at a specific position
   */
  getUnitAtPosition(position: Position): CombatUnit | undefined {
    for (const placement of this.units.values()) {
      if (placement.position.x === position.x && placement.position.y === position.y) {
        return placement.unit;
      }
    }
    return undefined;
  }

  /**
   * Move a unit to a new position
   */
  moveUnit(unit: CombatUnit, newPosition: Position): boolean {
    const id = this.unitToId.get(unit);
    if (!id) return false;

    const placement = this.units.get(id);
    if (!placement) {
      return false;
    }

    placement.position = newPosition;
    return true;
  }

  /**
   * Update a unit in the manifest with a new unit instance
   * Preserves position and ID, updates unit reference
   * @param updatedUnit - The updated unit instance (must already be in manifest)
   * @param newUnitData - The new unit instance to replace it with
   * @returns true if update succeeded, false if unit not found
   */
  updateUnit(oldUnit: CombatUnit, newUnit: CombatUnit): boolean {
    const id = this.unitToId.get(oldUnit);
    if (!id) {
      console.warn('[CombatUnitManifest] Cannot update unit: not found in manifest');
      return false;
    }

    const placement = this.units.get(id);
    if (!placement) {
      console.warn('[CombatUnitManifest] Unit ID exists but placement not found');
      return false;
    }

    // Update the placement with new unit instance
    placement.unit = newUnit;

    // Update WeakMap to point to new unit instance
    this.unitToId.delete(oldUnit);
    this.unitToId.set(newUnit, id);

    return true;
  }

  /**
   * Get all units
   */
  getAllUnits(): UnitPlacement[] {
    return Array.from(this.units.values());
  }

  /**
   * Get all player units
   * Note: Currently we can't differentiate - all units in manifest are considered players
   */
  getPlayerUnits(): UnitPlacement[] {
    return this.getAllUnits();
  }

  /**
   * Get all enemy units
   * Note: Currently we can't differentiate - returns empty array
   */
  getEnemyUnits(): UnitPlacement[] {
    // TODO: Add isEnemy property or faction tracking to CombatUnit
    return [];
  }

  /**
   * Check if a position is occupied
   */
  isPositionOccupied(position: Position): boolean {
    return this.getUnitAtPosition(position) !== undefined;
  }

  /**
   * Get the count of units
   */
  getUnitCount(): number {
    return this.units.size;
  }

  /**
   * Clear all units from the manifest
   */
  clear(): void {
    this.units.clear();
  }

  /**
   * Convert this CombatUnitManifest to a JSON-serializable object
   */
  toJSON(): CombatUnitManifestJSON {
    const units: UnitPlacementJSON[] = this.getAllUnits().map(placement => {
      const isHumanoid = placement.unit instanceof HumanoidUnit;
      return {
        unit: placement.unit.toJSON() as HumanoidUnitJSON | MonsterUnitJSON,
        position: placement.position,
        type: isHumanoid ? 'humanoid' : 'monster'
      };
    });
    return { units };
  }

  /**
   * Create a CombatUnitManifest from a JSON object
   * @param json The JSON representation
   * @returns A new CombatUnitManifest instance, or null if deserialization fails
   */
  static fromJSON(json: CombatUnitManifestJSON): CombatUnitManifest | null {
    const manifest = new CombatUnitManifest();

    for (const placementData of json.units) {
      let unit: CombatUnit | null;

      if (placementData.type === 'humanoid') {
        unit = HumanoidUnit.fromJSON(placementData.unit as HumanoidUnitJSON);
      } else if (placementData.type === 'monster') {
        unit = MonsterUnit.fromJSON(placementData.unit as MonsterUnitJSON);
      } else {
        console.error('Failed to deserialize unit: unknown type', placementData.type);
        return null;
      }

      if (!unit) {
        console.error('Failed to deserialize unit:', placementData);
        return null;
      }

      manifest.addUnit(unit, placementData.position);
    }

    return manifest;
  }
}
