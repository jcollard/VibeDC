/**
 * Encounter zone definition for combat triggers
 */
export interface EncounterZone {
  id: string;
  x: number;
  y: number;
  encounterId: string; // References CombatEncounter ID
  triggerType: 'enter' | 'interact' | 'random';
  triggerChance?: number; // For random encounters (0.0-1.0)
  oneTime?: boolean; // If true, encounter only triggers once
  triggered?: boolean; // Tracks if one-time encounter has been triggered
}
