/**
 * Represents an ongoing buff or debuff effect on a combat unit
 * Modifiers are applied to unit stats for the duration of the effect
 */
export class CombatEffect {
  /**
   * Display name of the effect
   */
  public name: string;

  /**
   * Tags for categorizing/identifying effects (e.g., "buff", "debuff", "poison", "stun")
   */
  public tags: string[];

  /**
   * Number of turns remaining before the effect expires
   */
  public turnsRemaining: number;

  /**
   * Modifier applied to health stat
   */
  public healthModifier: number;

  /**
   * Modifier applied to mana stat
   */
  public manaModifier: number;

  /**
   * Modifier applied to physicalPower stat
   */
  public physicalPowerModifier: number;

  /**
   * Modifier applied to magicPower stat
   */
  public magicPowerModifier: number;

  /**
   * Modifier applied to speed stat
   */
  public speedModifier: number;

  /**
   * Modifier applied to turnGauge stat
   */
  public turnGaugeModifier: number;

  /**
   * Modifier applied to movement stat
   */
  public movementModifier: number;

  /**
   * Modifier applied to physicalEvade stat
   */
  public physicalEvadeModifier: number;

  /**
   * Modifier applied to magicEvade stat
   */
  public magicEvadeModifier: number;

  /**
   * Multiplier applied to health stat (1.0 = no change)
   */
  public healthMultiplier: number;

  /**
   * Multiplier applied to wounds stat (1.0 = no change)
   */
  public woundsMultiplier: number;

  /**
   * Multiplier applied to mana stat (1.0 = no change)
   */
  public manaMultiplier: number;

  /**
   * Multiplier applied to manaUsed stat (1.0 = no change)
   */
  public manaUsedMultiplier: number;

  /**
   * Multiplier applied to physicalPower stat (1.0 = no change)
   */
  public physicalPowerMultiplier: number;

  /**
   * Multiplier applied to magicPower stat (1.0 = no change)
   */
  public magicPowerMultiplier: number;

  /**
   * Multiplier applied to speed stat (1.0 = no change)
   */
  public speedMultiplier: number;

  /**
   * Multiplier applied to turnGauge stat (1.0 = no change)
   */
  public turnGaugeMultiplier: number;

  /**
   * Multiplier applied to movement stat (1.0 = no change)
   */
  public movementMultiplier: number;

  /**
   * Multiplier applied to physicalEvade stat (1.0 = no change)
   */
  public physicalEvadeMultiplier: number;

  /**
   * Multiplier applied to magicEvade stat (1.0 = no change)
   */
  public magicEvadeMultiplier: number;

  constructor(
    name: string,
    turnsRemaining: number,
    tags: string[] = [],
    modifiers: {
      health?: number;
      wounds?: number;
      mana?: number;
      manaUsed?: number;
      physicalPower?: number;
      magicPower?: number;
      speed?: number;
      turnGauge?: number;
      movement?: number;
      physicalEvade?: number;
      magicEvade?: number;
    } = {},
    multipliers: {
      health?: number;
      wounds?: number;
      mana?: number;
      manaUsed?: number;
      physicalPower?: number;
      magicPower?: number;
      speed?: number;
      turnGauge?: number;
      movement?: number;
      physicalEvade?: number;
      magicEvade?: number;
    } = {}
  ) {
    this.name = name;
    this.turnsRemaining = turnsRemaining;
    this.tags = tags;

    // Initialize all modifiers (default to 0 if not provided)
    this.healthModifier = modifiers.health ?? 0;
    this.manaModifier = modifiers.mana ?? 0;
    this.physicalPowerModifier = modifiers.physicalPower ?? 0;
    this.magicPowerModifier = modifiers.magicPower ?? 0;
    this.speedModifier = modifiers.speed ?? 0;
    this.turnGaugeModifier = modifiers.turnGauge ?? 0;
    this.movementModifier = modifiers.movement ?? 0;
    this.physicalEvadeModifier = modifiers.physicalEvade ?? 0;
    this.magicEvadeModifier = modifiers.magicEvade ?? 0;

    // Initialize all multipliers (default to 1.0 if not provided)
    this.healthMultiplier = multipliers.health ?? 1.0;
    this.woundsMultiplier = multipliers.wounds ?? 1.0;
    this.manaMultiplier = multipliers.mana ?? 1.0;
    this.manaUsedMultiplier = multipliers.manaUsed ?? 1.0;
    this.physicalPowerMultiplier = multipliers.physicalPower ?? 1.0;
    this.magicPowerMultiplier = multipliers.magicPower ?? 1.0;
    this.speedMultiplier = multipliers.speed ?? 1.0;
    this.turnGaugeMultiplier = multipliers.turnGauge ?? 1.0;
    this.movementMultiplier = multipliers.movement ?? 1.0;
    this.physicalEvadeMultiplier = multipliers.physicalEvade ?? 1.0;
    this.magicEvadeMultiplier = multipliers.magicEvade ?? 1.0;
  }

  /**
   * Decrements the turns remaining counter
   * Returns true if the effect has expired (turnsRemaining <= 0)
   */
  decrementTurns(): boolean {
    this.turnsRemaining--;
    return this.turnsRemaining <= 0;
  }

  /**
   * Checks if this effect has a specific tag
   */
  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }

  /**
   * Adds a tag to this effect if it doesn't already have it
   */
  addTag(tag: string): void {
    if (!this.hasTag(tag)) {
      this.tags.push(tag);
    }
  }

  /**
   * Removes a tag from this effect
   */
  removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
    }
  }

  /**
   * Creates a copy of this effect
   */
  clone(): CombatEffect {
    return new CombatEffect(
      this.name,
      this.turnsRemaining,
      [...this.tags],
      {
        health: this.healthModifier,
        mana: this.manaModifier,
        physicalPower: this.physicalPowerModifier,
        magicPower: this.magicPowerModifier,
        speed: this.speedModifier,
        turnGauge: this.turnGaugeModifier,
        movement: this.movementModifier,
        physicalEvade: this.physicalEvadeModifier,
        magicEvade: this.magicEvadeModifier,
      },
      {
        health: this.healthMultiplier,
        wounds: this.woundsMultiplier,
        mana: this.manaMultiplier,
        manaUsed: this.manaUsedMultiplier,
        physicalPower: this.physicalPowerMultiplier,
        magicPower: this.magicPowerMultiplier,
        speed: this.speedMultiplier,
        turnGauge: this.turnGaugeMultiplier,
        movement: this.movementMultiplier,
        physicalEvade: this.physicalEvadeMultiplier,
        magicEvade: this.magicEvadeMultiplier,
      }
    );
  }

  /**
   * Returns a summary string of non-zero modifiers and non-1.0 multipliers
   */
  getSummary(): string {
    const mods: string[] = [];

    if (this.healthModifier !== 0) mods.push(`Health ${this.healthModifier > 0 ? '+' : ''}${this.healthModifier}`);
    if (this.healthMultiplier !== 1.0) mods.push(`Health x${this.healthMultiplier}`);
    if (this.woundsMultiplier !== 1.0) mods.push(`Wounds x${this.woundsMultiplier}`);
    if (this.manaModifier !== 0) mods.push(`Mana ${this.manaModifier > 0 ? '+' : ''}${this.manaModifier}`);
    if (this.manaMultiplier !== 1.0) mods.push(`Mana x${this.manaMultiplier}`);
    if (this.manaUsedMultiplier !== 1.0) mods.push(`ManaUsed x${this.manaUsedMultiplier}`);
    if (this.physicalPowerModifier !== 0) mods.push(`Phys.Power ${this.physicalPowerModifier > 0 ? '+' : ''}${this.physicalPowerModifier}`);
    if (this.physicalPowerMultiplier !== 1.0) mods.push(`Phys.Power x${this.physicalPowerMultiplier}`);
    if (this.magicPowerModifier !== 0) mods.push(`Magic.Power ${this.magicPowerModifier > 0 ? '+' : ''}${this.magicPowerModifier}`);
    if (this.magicPowerMultiplier !== 1.0) mods.push(`Magic.Power x${this.magicPowerMultiplier}`);
    if (this.speedModifier !== 0) mods.push(`Speed ${this.speedModifier > 0 ? '+' : ''}${this.speedModifier}`);
    if (this.speedMultiplier !== 1.0) mods.push(`Speed x${this.speedMultiplier}`);
    if (this.turnGaugeModifier !== 0) mods.push(`Turn ${this.turnGaugeModifier > 0 ? '+' : ''}${this.turnGaugeModifier}`);
    if (this.turnGaugeMultiplier !== 1.0) mods.push(`Turn x${this.turnGaugeMultiplier}`);
    if (this.movementModifier !== 0) mods.push(`Movement ${this.movementModifier > 0 ? '+' : ''}${this.movementModifier}`);
    if (this.movementMultiplier !== 1.0) mods.push(`Movement x${this.movementMultiplier}`);
    if (this.physicalEvadeModifier !== 0) mods.push(`Phys.Evade ${this.physicalEvadeModifier > 0 ? '+' : ''}${this.physicalEvadeModifier}`);
    if (this.physicalEvadeMultiplier !== 1.0) mods.push(`Phys.Evade x${this.physicalEvadeMultiplier}`);
    if (this.magicEvadeModifier !== 0) mods.push(`Magic.Evade ${this.magicEvadeModifier > 0 ? '+' : ''}${this.magicEvadeModifier}`);
    if (this.magicEvadeMultiplier !== 1.0) mods.push(`Magic.Evade x${this.magicEvadeMultiplier}`);

    return mods.length > 0 ? mods.join(', ') : 'No modifiers';
  }
}
