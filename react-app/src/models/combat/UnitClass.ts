/**
 * Represents a character class that defines a unit's role and abilities
 */
export class UnitClass {
  public readonly name: string;
  public readonly tags: string[];
  public readonly description: string;

  // Flat modifiers
  public healthModifier: number = 0;
  public manaModifier: number = 0;
  public physicalPowerModifier: number = 0;
  public magicPowerModifier: number = 0;
  public speedModifier: number = 0;
  public movementModifier: number = 0;
  public physicalEvadeModifier: number = 0;
  public magicEvadeModifier: number = 0;

  // Multipliers (1.0 = no change, 1.5 = 150%, etc.)
  public healthMultiplier: number = 1.0;
  public manaMultiplier: number = 1.0;
  public physicalPowerMultiplier: number = 1.0;
  public magicPowerMultiplier: number = 1.0;
  public speedMultiplier: number = 1.0;
  public movementMultiplier: number = 1.0;
  public physicalEvadeMultiplier: number = 1.0;
  public magicEvadeMultiplier: number = 1.0;

  constructor(
    name: string,
    description: string,
    tags: string[] = [],
    modifiers?: Partial<{
      health: number;
      mana: number;
      physicalPower: number;
      magicPower: number;
      speed: number;
      movement: number;
      physicalEvade: number;
      magicEvade: number;
    }>,
    multipliers?: Partial<{
      health: number;
      mana: number;
      physicalPower: number;
      magicPower: number;
      speed: number;
      movement: number;
      physicalEvade: number;
      magicEvade: number;
    }>
  ) {
    this.name = name;
    this.description = description;
    this.tags = tags;

    if (modifiers) {
      this.healthModifier = modifiers.health ?? 0;
      this.manaModifier = modifiers.mana ?? 0;
      this.physicalPowerModifier = modifiers.physicalPower ?? 0;
      this.magicPowerModifier = modifiers.magicPower ?? 0;
      this.speedModifier = modifiers.speed ?? 0;
      this.movementModifier = modifiers.movement ?? 0;
      this.physicalEvadeModifier = modifiers.physicalEvade ?? 0;
      this.magicEvadeModifier = modifiers.magicEvade ?? 0;
    }

    if (multipliers) {
      this.healthMultiplier = multipliers.health ?? 1.0;
      this.manaMultiplier = multipliers.mana ?? 1.0;
      this.physicalPowerMultiplier = multipliers.physicalPower ?? 1.0;
      this.magicPowerMultiplier = multipliers.magicPower ?? 1.0;
      this.speedMultiplier = multipliers.speed ?? 1.0;
      this.movementMultiplier = multipliers.movement ?? 1.0;
      this.physicalEvadeMultiplier = multipliers.physicalEvade ?? 1.0;
      this.magicEvadeMultiplier = multipliers.magicEvade ?? 1.0;
    }
  }
}
