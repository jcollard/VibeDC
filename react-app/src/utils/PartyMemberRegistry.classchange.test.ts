import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PartyMemberRegistry } from './PartyMemberRegistry';
import { UnitClass } from '../models/combat/UnitClass';
import { HumanoidUnit } from '../models/combat/HumanoidUnit';

describe('PartyMemberRegistry - Class Change Base Stats Update', () => {
  let rogueClass: UnitClass;

  beforeEach(() => {
    PartyMemberRegistry.clear();
    UnitClass.clearRegistry();

    // Create Fighter class with starter config
    new UnitClass(
      'Fighter',
      'A strong fighter class',
      [],
      [],
      {},
      {},
      new Map(),
      'fighter',
      [],
      {
        baseHealth: 45,
        baseMana: 5,
        basePhysicalPower: 10,
        baseMagicPower: 5,
        baseSpeed: 8,
        baseMovement: 4,
        basePhysicalEvade: 10,
        baseMagicEvade: 7,
        baseCourage: 12,
        baseAttunement: 6
      },
      false // canDualWield
    );

    // Create Rogue class with starter config
    rogueClass = new UnitClass(
      'Rogue',
      'A nimble rogue class',
      [],
      [],
      {},
      {},
      new Map(),
      'rogue',
      [],
      {
        baseHealth: 30,
        baseMana: 15,
        basePhysicalPower: 8,
        baseMagicPower: 7,
        baseSpeed: 12,
        baseMovement: 5,
        basePhysicalEvade: 16,
        baseMagicEvade: 10,
        baseCourage: 10,
        baseAttunement: 10
      },
      true // canDualWield
    );
  });

  afterEach(() => {
    PartyMemberRegistry.clear();
    UnitClass.clearRegistry();
  });

  it('should update base stats in registry when primary class changes', () => {
    // Register a party member as a Fighter
    PartyMemberRegistry.register({
      id: 'hero-001',
      name: 'Test Hero',
      unitClassId: 'fighter',
      baseHealth: 45,
      baseMana: 5,
      basePhysicalPower: 10,
      baseMagicPower: 5,
      baseSpeed: 8,
      baseMovement: 4,
      basePhysicalEvade: 10,
      baseMagicEvade: 7,
      baseCourage: 12,
      baseAttunement: 6,
      spriteId: 'default-humanoid'
    });

    // Create the unit from registry
    const unit = PartyMemberRegistry.createPartyMember('hero-001') as HumanoidUnit;
    expect(unit).not.toBeNull();
    expect(unit.maxHealth).toBe(45);
    expect(unit.maxMana).toBe(5);
    expect(unit.physicalPower).toBe(10);

    // Change to Rogue class
    unit.setPrimaryClass(rogueClass);

    // Verify stats changed on the unit
    expect(unit.maxHealth).toBe(30);
    expect(unit.maxMana).toBe(15);
    expect(unit.physicalPower).toBe(8);
    expect(unit.speed).toBe(12);

    // Update the registry with the changed unit
    const updateSuccess = PartyMemberRegistry.updateFromUnit('hero-001', unit);
    expect(updateSuccess).toBe(true);

    // Retrieve the definition and verify base stats were updated
    const definition = PartyMemberRegistry.getById('hero-001');
    expect(definition).not.toBeUndefined();
    expect(definition!.baseHealth).toBe(30);
    expect(definition!.baseMana).toBe(15);
    expect(definition!.basePhysicalPower).toBe(8);
    expect(definition!.baseMagicPower).toBe(7);
    expect(definition!.baseSpeed).toBe(12);
    expect(definition!.baseMovement).toBe(5);
    expect(definition!.basePhysicalEvade).toBe(16);
    expect(definition!.baseMagicEvade).toBe(10);
    expect(definition!.baseCourage).toBe(10);
    expect(definition!.baseAttunement).toBe(10);

    // Verify the class ID was also updated
    expect(definition!.unitClassId).toBe('rogue');
  });

  it('should persist base stats through registry save/load cycle', () => {
    // Register a party member as a Fighter
    PartyMemberRegistry.register({
      id: 'hero-002',
      name: 'Test Hero 2',
      unitClassId: 'fighter',
      baseHealth: 45,
      baseMana: 5,
      basePhysicalPower: 10,
      baseMagicPower: 5,
      baseSpeed: 8,
      baseMovement: 4,
      basePhysicalEvade: 10,
      baseMagicEvade: 7,
      baseCourage: 12,
      baseAttunement: 6,
      spriteId: 'default-humanoid'
    });

    // Create, change class, and update registry
    const unit = PartyMemberRegistry.createPartyMember('hero-002') as HumanoidUnit;
    unit.setPrimaryClass(rogueClass);
    PartyMemberRegistry.updateFromUnit('hero-002', unit);

    // Create a new unit from the updated registry
    const newUnit = PartyMemberRegistry.createPartyMember('hero-002') as HumanoidUnit;
    expect(newUnit).not.toBeNull();

    // Verify the new unit has Rogue base stats
    expect(newUnit.maxHealth).toBe(30);
    expect(newUnit.maxMana).toBe(15);
    expect(newUnit.physicalPower).toBe(8);
    expect(newUnit.speed).toBe(12);
    expect(newUnit.unitClass.id).toBe('rogue');
  });

  it('should handle class swap correctly', () => {
    // Register a party member as a Fighter with Rogue secondary
    PartyMemberRegistry.register({
      id: 'hero-003',
      name: 'Test Hero 3',
      unitClassId: 'fighter',
      secondaryClassId: 'rogue',
      baseHealth: 45,
      baseMana: 5,
      basePhysicalPower: 10,
      baseMagicPower: 5,
      baseSpeed: 8,
      baseMovement: 4,
      basePhysicalEvade: 10,
      baseMagicEvade: 7,
      baseCourage: 12,
      baseAttunement: 6,
      spriteId: 'default-humanoid'
    });

    const unit = PartyMemberRegistry.createPartyMember('hero-003') as HumanoidUnit;

    // Swap classes (set primary to rogue, secondary to fighter)
    const oldPrimary = unit.unitClass;
    unit.setPrimaryClass(rogueClass);
    unit.setSecondaryClass(oldPrimary);

    // Update registry
    PartyMemberRegistry.updateFromUnit('hero-003', unit);

    // Verify registry has Rogue base stats
    const definition = PartyMemberRegistry.getById('hero-003');
    expect(definition!.baseHealth).toBe(30); // Rogue base
    expect(definition!.unitClassId).toBe('rogue');
    expect(definition!.secondaryClassId).toBe('fighter');

    // Recreate and verify
    const newUnit = PartyMemberRegistry.createPartyMember('hero-003') as HumanoidUnit;
    expect(newUnit.maxHealth).toBe(30);
    expect(newUnit.unitClass.id).toBe('rogue');
    expect(newUnit.secondaryClass?.id).toBe('fighter');
  });
});
