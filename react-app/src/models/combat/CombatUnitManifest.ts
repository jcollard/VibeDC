import type { CombatUnit } from './CombatUnit';
import type { Position } from '../../types';

/**
 * Represents a combat unit and its position on the map
 */
export interface UnitPlacement {
  unit: CombatUnit;
  position: Position;
}

/**
 * CombatUnitManifest tracks all units and their positions in a combat encounter
 */
export class CombatUnitManifest {
  private units: Map<string, UnitPlacement>; // Map of unit name to placement

  constructor() {
    this.units = new Map();
  }

  /**
   * Add a unit to the manifest at a specific position
   */
  addUnit(unit: CombatUnit, position: Position): void {
    this.units.set(unit.name, { unit, position });
  }

  /**
   * Remove a unit from the manifest
   */
  removeUnit(unitName: string): void {
    this.units.delete(unitName);
  }

  /**
   * Get a unit by its name
   */
  getUnit(unitName: string): CombatUnit | undefined {
    return this.units.get(unitName)?.unit;
  }

  /**
   * Get the position of a unit
   */
  getUnitPosition(unitName: string): Position | undefined {
    return this.units.get(unitName)?.position;
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
  moveUnit(unitName: string, newPosition: Position): boolean {
    const placement = this.units.get(unitName);
    if (!placement) {
      return false;
    }

    placement.position = newPosition;
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
}
