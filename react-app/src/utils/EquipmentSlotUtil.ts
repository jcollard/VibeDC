/**
 * Utility functions for equipment slot compatibility checking
 */

import type { Equipment, EquipmentType } from '../models/combat/Equipment';

/**
 * Map slot labels to compatible equipment types
 */
export function getCompatibleEquipmentTypes(slotLabel: string): EquipmentType[] {
  switch (slotLabel) {
    case 'L.Hand':
    case 'R.Hand':
      return ['OneHandedWeapon', 'TwoHandedWeapon', 'Shield', 'Held'];
    case 'Head':
      return ['Head'];
    case 'Body':
      return ['Body'];
    case 'Accessory':
      return ['Accessory'];
    default:
      return [];
  }
}

/**
 * Check if equipment is compatible with a slot
 */
export function isEquipmentCompatibleWithSlot(equipment: Equipment, slotLabel: string): boolean {
  const compatibleTypes = getCompatibleEquipmentTypes(slotLabel);
  return compatibleTypes.includes(equipment.type);
}

/**
 * Check if an equipment slot is an equipment slot (not an ability slot)
 */
export function isEquipmentSlot(slotLabel: string): boolean {
  const equipmentSlots = ['L.Hand', 'R.Hand', 'Head', 'Body', 'Accessory'];
  return equipmentSlots.includes(slotLabel);
}
