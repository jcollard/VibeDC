import { describe, it, expect, beforeEach } from 'vitest';
import { CombatEncounter } from './CombatEncounter';
import type { CombatState } from './CombatState';
import { CombatMap, TerrainType } from './CombatMap';
import { CombatUnitManifest } from './CombatUnitManifest';
import { UnitClass } from './UnitClass';
import { CombatAbility } from './CombatAbility';
import { EnemyRegistry } from '../../utils/EnemyRegistry';
import {
  AllEnemiesDefeatedPredicate,
  AllPlayersDefeatedPredicate,
  TurnLimitPredicate,
  OrPredicate,
  AndPredicate,
} from './CombatPredicate';

// Helper to create a minimal CombatState for testing
function createMockState(turnNumber: number): CombatState {
  return {
    turnNumber,
    map: new CombatMap(1, 1), // Minimal 1x1 map
    tilesetId: 'test',
    phase: 'deployment',
    unitManifest: new CombatUnitManifest(),
  };
}

describe('CombatEncounter', () => {
  let testClass: UnitClass;
  let basicAttack: CombatAbility;

  beforeEach(() => {
    // Clear registries before each test
    CombatEncounter.clearRegistry();
    UnitClass.clearRegistry();
    CombatAbility.clearRegistry();
    EnemyRegistry.clearRegistry();

    // Create test ability
    basicAttack = new CombatAbility(
      'Basic Attack',
      'A basic attack',
      'Action',
      0,
      ['attack'],
      'basic-attack'
    );

    // Create test class
    testClass = new UnitClass(
      'Fighter',
      'A basic fighter class',
      ['melee'],
      [basicAttack],
      { health: 10, physicalPower: 5 },
      { health: 1.2 },
      new Map(),
      'fighter'
    );
  });

  describe('Basic Encounter Creation', () => {
    it('should create a basic encounter', () => {
      const map = new CombatMap(10, 8);
      const encounter = new CombatEncounter(
        'test-encounter',
        'Test Encounter',
        'A test combat encounter',
        map,
        [new AllEnemiesDefeatedPredicate()],
        [new AllPlayersDefeatedPredicate()],
        [{ x: 1, y: 1 }, { x: 2, y: 1 }],
        []
      );

      expect(encounter.id).toBe('test-encounter');
      expect(encounter.name).toBe('Test Encounter');
      expect(encounter.description).toBe('A test combat encounter');
      expect(encounter.map.width).toBe(10);
      expect(encounter.map.height).toBe(8);
      expect(encounter.deploymentSlotCount).toBe(2);
      expect(encounter.enemyCount).toBe(0);
    });

    it('should register encounter in global registry', () => {
      const map = new CombatMap(5, 5);
      new CombatEncounter(
        'registered-encounter',
        'Registered',
        'Description',
        map,
        [],
        [],
        [],
        []
      );

      const retrieved = CombatEncounter.getById('registered-encounter');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Registered');
    });
  });

  describe('Enemy Placements', () => {
    it('should create encounter with enemy units', () => {
      const map = new CombatMap(10, 8);

      // Register a test enemy in the EnemyRegistry
      EnemyRegistry.register({
        id: 'test-goblin',
        name: 'Goblin',
        unitType: 'monster',
        unitClassId: testClass.id,
        baseHealth: 20,
        baseMana: 10,
        basePhysicalPower: 3,
        baseMagicPower: 1,
        baseSpeed: 5,
        baseMovement: 3,
        basePhysicalEvade: 1,
        baseMagicEvade: 0,
        baseCourage: 2,
        baseAttunement: 1,
        spriteId: 'goblin-sprite',
        xpValue: 10,
        goldValue: 5,
      });

      const encounter = new CombatEncounter(
        'goblin-encounter',
        'Goblin Fight',
        'Fight some goblins',
        map,
        [new AllEnemiesDefeatedPredicate()],
        [new AllPlayersDefeatedPredicate()],
        [{ x: 1, y: 7 }],
        [
          { enemyId: 'test-goblin', position: { x: 5, y: 2 } }
        ]
      );

      expect(encounter.enemyCount).toBe(1);
      expect(encounter.enemyPlacements[0].enemyId).toBe('test-goblin');
      expect(encounter.enemyPlacements[0].position).toEqual({ x: 5, y: 2 });

      // Test creating enemy units from the encounter
      const enemyUnits = encounter.createEnemyUnits();
      expect(enemyUnits.length).toBe(1);
      expect(enemyUnits[0].unit.name).toBe('Goblin');
      expect(enemyUnits[0].position).toEqual({ x: 5, y: 2 });
    });
  });

  describe('Victory and Defeat Conditions', () => {
    it('should check victory conditions (all must be true)', () => {
      const map = new CombatMap(5, 5);
      const encounter = new CombatEncounter(
        'test',
        'Test',
        'Test',
        map,
        [new AllEnemiesDefeatedPredicate()],
        [new AllPlayersDefeatedPredicate()],
        [],
        []
      );

      // AllEnemiesDefeatedPredicate returns false (not implemented yet)
      expect(encounter.isVictory(createMockState(1))).toBe(false);
    });

    it('should check defeat conditions (any can be true)', () => {
      const map = new CombatMap(5, 5);
      const encounter = new CombatEncounter(
        'test',
        'Test',
        'Test',
        map,
        [],
        [new AllPlayersDefeatedPredicate()],
        [],
        []
      );

      // AllPlayersDefeatedPredicate returns false (not implemented yet)
      expect(encounter.isDefeat(createMockState(1))).toBe(false);
    });

    it('should handle turn limit victory condition', () => {
      const map = new CombatMap(5, 5);
      const encounter = new CombatEncounter(
        'test',
        'Test',
        'Test',
        map,
        [new TurnLimitPredicate(10)],
        [],
        [],
        []
      );

      expect(encounter.isVictory(createMockState(5))).toBe(false);
      expect(encounter.isVictory(createMockState(10))).toBe(true);
      expect(encounter.isVictory(createMockState(15))).toBe(true);
    });

    it('should handle complex OR victory conditions', () => {
      const map = new CombatMap(5, 5);
      const encounter = new CombatEncounter(
        'test',
        'Test',
        'Test',
        map,
        [
          new OrPredicate([
            new TurnLimitPredicate(10),
            new AllEnemiesDefeatedPredicate(),
          ])
        ],
        [],
        [],
        []
      );

      // Victory if turn 10 reached (even if enemies not defeated)
      expect(encounter.isVictory(createMockState(10))).toBe(true);
    });

    it('should handle complex AND victory conditions', () => {
      const map = new CombatMap(5, 5);
      const encounter = new CombatEncounter(
        'test',
        'Test',
        'Test',
        map,
        [
          new AndPredicate([
            new TurnLimitPredicate(5),
            new TurnLimitPredicate(3), // Both must be true
          ])
        ],
        [],
        [],
        []
      );

      expect(encounter.isVictory(createMockState(2))).toBe(false);
      expect(encounter.isVictory(createMockState(3))).toBe(false);
      expect(encounter.isVictory(createMockState(5))).toBe(true);
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize and deserialize encounter', () => {
      const map = new CombatMap(10, 8);

      // Register a test enemy in the EnemyRegistry
      EnemyRegistry.register({
        id: 'test-enemy',
        name: 'Test Enemy',
        unitType: 'monster',
        unitClassId: testClass.id,
        baseHealth: 30,
        baseMana: 10,
        basePhysicalPower: 5,
        baseMagicPower: 2,
        baseSpeed: 4,
        baseMovement: 3,
        basePhysicalEvade: 1,
        baseMagicEvade: 1,
        baseCourage: 3,
        baseAttunement: 2,
        spriteId: 'test-sprite',
        xpValue: 20,
        goldValue: 15,
      });

      const original = new CombatEncounter(
        'serialize-test',
        'Serialize Test',
        'Test serialization',
        map,
        [new AllEnemiesDefeatedPredicate()],
        [new AllPlayersDefeatedPredicate()],
        [{ x: 1, y: 7 }, { x: 2, y: 7 }],
        [{ enemyId: 'test-enemy', position: { x: 5, y: 2 } }]
      );

      const json = original.toJSON();

      // Note: testClass and test-enemy are still in their registries from above,
      // so deserialization can find them by ID
      const deserialized = CombatEncounter.fromJSON(json);

      expect(deserialized.id).toBe(original.id);
      expect(deserialized.name).toBe(original.name);
      expect(deserialized.description).toBe(original.description);
      expect(deserialized.map.width).toBe(original.map.width);
      expect(deserialized.map.height).toBe(original.map.height);
      expect(deserialized.deploymentSlotCount).toBe(2);
      expect(deserialized.enemyCount).toBe(1);
      expect(deserialized.enemyPlacements[0].enemyId).toBe('test-enemy');
      expect(deserialized.enemyPlacements[0].position).toEqual({ x: 5, y: 2 });

      // Test creating enemy units from the deserialized encounter
      const enemyUnits = deserialized.createEnemyUnits();
      expect(enemyUnits.length).toBe(1);
      expect(enemyUnits[0].unit.name).toBe('Test Enemy');
      expect(enemyUnits[0].unit.unitClass).toBe(testClass);

      expect(deserialized.victoryConditions.length).toBe(1);
      expect(deserialized.defeatConditions.length).toBe(1);
    });

    it('should serialize map with different terrain types', () => {
      const map = new CombatMap(3, 3);
      map.setCell({ x: 0, y: 0 }, { terrain: TerrainType.Wall, walkable: false });
      map.setCell({ x: 1, y: 1 }, { terrain: TerrainType.Water, walkable: false });
      map.setCell({ x: 2, y: 2 }, { terrain: TerrainType.Floor, walkable: true });

      const encounter = new CombatEncounter(
        'terrain-test',
        'Terrain Test',
        'Test',
        map,
        [],
        [],
        [],
        []
      );

      const json = encounter.toJSON();
      const deserialized = CombatEncounter.fromJSON(json);

      expect(deserialized.map.getCell({ x: 0, y: 0 })?.terrain).toBe(TerrainType.Wall);
      expect(deserialized.map.getCell({ x: 1, y: 1 })?.terrain).toBe(TerrainType.Water);
      expect(deserialized.map.getCell({ x: 2, y: 2 })?.terrain).toBe(TerrainType.Floor);
    });
  });

  describe('CombatMap', () => {
    it('should create map with default floor cells', () => {
      const map = new CombatMap(5, 5);

      const cell = map.getCell({ x: 2, y: 2 });
      expect(cell?.terrain).toBe(TerrainType.Floor);
      expect(cell?.walkable).toBe(true);
    });

    it('should check bounds correctly', () => {
      const map = new CombatMap(5, 5);

      expect(map.isInBounds({ x: 0, y: 0 })).toBe(true);
      expect(map.isInBounds({ x: 4, y: 4 })).toBe(true);
      expect(map.isInBounds({ x: 5, y: 5 })).toBe(false);
      expect(map.isInBounds({ x: -1, y: 0 })).toBe(false);
    });

    it('should set and get cells', () => {
      const map = new CombatMap(5, 5);

      map.setCell({ x: 2, y: 3 }, { terrain: TerrainType.Wall, walkable: false });

      const cell = map.getCell({ x: 2, y: 3 });
      expect(cell?.terrain).toBe(TerrainType.Wall);
      expect(cell?.walkable).toBe(false);
    });

    it('should check walkability', () => {
      const map = new CombatMap(5, 5);

      expect(map.isWalkable({ x: 0, y: 0 })).toBe(true);

      map.setCell({ x: 1, y: 1 }, { terrain: TerrainType.Wall, walkable: false });
      expect(map.isWalkable({ x: 1, y: 1 })).toBe(false);
    });

    it('should get all cells', () => {
      const map = new CombatMap(3, 2);

      const cells = map.getAllCells();
      expect(cells.length).toBe(6); // 3 * 2

      // Check that all positions are present
      const positions = cells.map(c => `${c.position.x},${c.position.y}`);
      expect(positions).toContain('0,0');
      expect(positions).toContain('2,1');
    });
  });
});
