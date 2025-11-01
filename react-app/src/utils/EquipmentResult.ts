import type { Equipment } from '../models/combat/Equipment';
import type { HumanoidUnit } from '../models/combat/HumanoidUnit';

/**
 * Result type for equipment operations
 */
export interface EquipmentResult {
  /**
   * Whether the equipment operation was successful
   */
  success: boolean;

  /**
   * User-friendly message describing the result
   */
  message: string;

  /**
   * Optional reason code for programmatic handling
   */
  reason?: EquipmentFailureReason;
}

/**
 * Specific reasons why equipment might fail
 */
export type EquipmentFailureReason =
  | 'two-handed-blocks-left'
  | 'two-handed-blocks-right'
  | 'two-handed-needs-empty-left'
  | 'two-handed-needs-empty-right'
  | 'two-handed-needs-both-hands'
  | 'cannot-dual-wield'
  | 'dual-wield-range-mismatch'
  | 'slot-type-mismatch';

/**
 * Helper class for creating equipment operation results with proper messages
 */
export class EquipmentResultFactory {
  /**
   * Create a success result
   */
  static success(unit: HumanoidUnit, equipment: Equipment, _slot: string): EquipmentResult {
    return {
      success: true,
      message: `${unit.name} equipped ${equipment.name}`,
    };
  }

  /**
   * Create a success result for unequipping
   */
  static successUnequip(unit: HumanoidUnit, equipment: Equipment): EquipmentResult {
    return {
      success: true,
      message: `${unit.name} removed ${equipment.name}`,
    };
  }

  /**
   * Create a success result for swapping equipment
   */
  static successSwap(
    unit: HumanoidUnit,
    newEquipment: Equipment,
    oldEquipment: Equipment
  ): EquipmentResult {
    return {
      success: true,
      message: `${unit.name} equipped ${newEquipment.name}, removed ${oldEquipment.name}`,
    };
  }

  /**
   * Left hand blocked by two-handed weapon in right hand
   */
  static twoHandedBlocksLeft(
    _unit: HumanoidUnit,
    equipment: Equipment,
    blockingWeapon: Equipment
  ): EquipmentResult {
    return {
      success: false,
      message: `Cannot equip ${equipment.name}: ${blockingWeapon.name} requires both hands`,
      reason: 'two-handed-blocks-left',
    };
  }

  /**
   * Right hand blocked by two-handed weapon in left hand
   */
  static twoHandedBlocksRight(
    _unit: HumanoidUnit,
    equipment: Equipment,
    blockingWeapon: Equipment
  ): EquipmentResult {
    return {
      success: false,
      message: `Cannot equip ${equipment.name}: ${blockingWeapon.name} requires both hands`,
      reason: 'two-handed-blocks-right',
    };
  }

  /**
   * Two-handed weapon needs empty left hand
   */
  static twoHandedNeedsEmptyLeft(
    _unit: HumanoidUnit,
    equipment: Equipment,
    blockingEquipment: Equipment
  ): EquipmentResult {
    return {
      success: false,
      message: `${equipment.name} requires 2 hands: remove ${blockingEquipment.name} first`,
      reason: 'two-handed-needs-empty-left',
    };
  }

  /**
   * Two-handed weapon needs empty right hand
   */
  static twoHandedNeedsEmptyRight(
    _unit: HumanoidUnit,
    equipment: Equipment,
    blockingEquipment: Equipment
  ): EquipmentResult {
    return {
      success: false,
      message: `${equipment.name} requires 2 hands: remove ${blockingEquipment.name} first`,
      reason: 'two-handed-needs-empty-right',
    };
  }

  /**
   * Two-handed weapon needs both hands empty (both left and right have equipment)
   */
  static twoHandedNeedsBothHands(
    _unit: HumanoidUnit,
    equipment: Equipment,
    leftHand: Equipment,
    rightHand: Equipment
  ): EquipmentResult {
    return {
      success: false,
      message: `${equipment.name} requires 2 hands: remove ${leftHand.name} and ${rightHand.name}`,
      reason: 'two-handed-needs-both-hands',
    };
  }

  /**
   * Unit cannot dual-wield weapons
   */
  static cannotDualWield(
    unit: HumanoidUnit,
    equipment: Equipment,
    otherWeapon: Equipment
  ): EquipmentResult {
    return {
      success: false,
      message: `${unit.name} requires Dual Wield to equip ${equipment.name} with ${otherWeapon.name}`,
      reason: 'cannot-dual-wield',
    };
  }

  /**
   * Dual-wielded weapons must have matching ranges
   */
  static dualWieldRangeMismatch(
    _unit: HumanoidUnit,
    equipment: Equipment,
    otherWeapon: Equipment
  ): EquipmentResult {
    const newRange = `${equipment.minRange}-${equipment.maxRange}`;
    const otherRange = `${otherWeapon.minRange}-${otherWeapon.maxRange}`;
    return {
      success: false,
      message: `Dual-wield range mismatch: ${equipment.name} (${newRange}) vs ${otherWeapon.name} (${otherRange})`,
      reason: 'dual-wield-range-mismatch',
    };
  }

  /**
   * Equipment type doesn't match slot
   */
  static slotTypeMismatch(
    _unit: HumanoidUnit,
    equipment: Equipment,
    slot: string
  ): EquipmentResult {
    return {
      success: false,
      message: `Cannot equip ${equipment.name} in ${slot} slot`,
      reason: 'slot-type-mismatch',
    };
  }
}
