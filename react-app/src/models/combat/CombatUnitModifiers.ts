/**
 * Represents modifiers and multipliers that can be applied to combat unit stats
 */
export class CombatUnitModifiers {
  // Flat modifiers
  public healthModifier: number = 0;
  public manaModifier: number = 0;
  public physicalPowerModifier: number = 0;
  public magicPowerModifier: number = 0;
  public speedModifier: number = 0;
  public movementModifier: number = 0;
  public physicalEvadeModifier: number = 0;
  public magicEvadeModifier: number = 0;
  public courageModifier: number = 0;
  public attunementModifier: number = 0;
  public woundsModifier: number = 0;
  public manaUsedModifier: number = 0;
  public actionTimerModifier: number = 0;

  // Multipliers (1.0 = no change, 1.5 = 150%, etc.)
  public healthMultiplier: number = 1.0;
  public manaMultiplier: number = 1.0;
  public physicalPowerMultiplier: number = 1.0;
  public magicPowerMultiplier: number = 1.0;
  public speedMultiplier: number = 1.0;
  public movementMultiplier: number = 1.0;
  public physicalEvadeMultiplier: number = 1.0;
  public magicEvadeMultiplier: number = 1.0;
  public courageMultiplier: number = 1.0;
  public attunementMultiplier: number = 1.0;
  public woundsMultiplier: number = 1.0;
  public manaUsedMultiplier: number = 1.0;
  public actionTimerMultiplier: number = 1.0;

  constructor(
    modifiers?: Partial<{
      health: number;
      mana: number;
      physicalPower: number;
      magicPower: number;
      speed: number;
      movement: number;
      physicalEvade: number;
      magicEvade: number;
      courage: number;
      attunement: number;
      wounds: number;
      manaUsed: number;
      actionTimer: number;
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
      courage: number;
      attunement: number;
      wounds: number;
      manaUsed: number;
      actionTimer: number;
    }>
  ) {
    if (modifiers) {
      this.healthModifier = modifiers.health ?? 0;
      this.manaModifier = modifiers.mana ?? 0;
      this.physicalPowerModifier = modifiers.physicalPower ?? 0;
      this.magicPowerModifier = modifiers.magicPower ?? 0;
      this.speedModifier = modifiers.speed ?? 0;
      this.movementModifier = modifiers.movement ?? 0;
      this.physicalEvadeModifier = modifiers.physicalEvade ?? 0;
      this.magicEvadeModifier = modifiers.magicEvade ?? 0;
      this.courageModifier = modifiers.courage ?? 0;
      this.attunementModifier = modifiers.attunement ?? 0;
      this.woundsModifier = modifiers.wounds ?? 0;
      this.manaUsedModifier = modifiers.manaUsed ?? 0;
      this.actionTimerModifier = modifiers.actionTimer ?? 0;
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
      this.courageMultiplier = multipliers.courage ?? 1.0;
      this.attunementMultiplier = multipliers.attunement ?? 1.0;
      this.woundsMultiplier = multipliers.wounds ?? 1.0;
      this.manaUsedMultiplier = multipliers.manaUsed ?? 1.0;
      this.actionTimerMultiplier = multipliers.actionTimer ?? 1.0;
    }
  }

  /**
   * Creates a copy of this modifiers object
   */
  clone(): CombatUnitModifiers {
    return new CombatUnitModifiers(
      {
        health: this.healthModifier,
        mana: this.manaModifier,
        physicalPower: this.physicalPowerModifier,
        magicPower: this.magicPowerModifier,
        speed: this.speedModifier,
        movement: this.movementModifier,
        physicalEvade: this.physicalEvadeModifier,
        magicEvade: this.magicEvadeModifier,
        courage: this.courageModifier,
        attunement: this.attunementModifier,
        wounds: this.woundsModifier,
        manaUsed: this.manaUsedModifier,
        actionTimer: this.actionTimerModifier,
      },
      {
        health: this.healthMultiplier,
        mana: this.manaMultiplier,
        physicalPower: this.physicalPowerMultiplier,
        magicPower: this.magicPowerMultiplier,
        speed: this.speedMultiplier,
        movement: this.movementMultiplier,
        physicalEvade: this.physicalEvadeMultiplier,
        magicEvade: this.magicEvadeMultiplier,
        courage: this.courageMultiplier,
        attunement: this.attunementMultiplier,
        wounds: this.woundsMultiplier,
        manaUsed: this.manaUsedMultiplier,
        actionTimer: this.actionTimerMultiplier,
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
    if (this.woundsModifier !== 0) mods.push(`Wounds ${this.woundsModifier > 0 ? '+' : ''}${this.woundsModifier}`);
    if (this.woundsMultiplier !== 1.0) mods.push(`Wounds x${this.woundsMultiplier}`);
    if (this.manaModifier !== 0) mods.push(`Mana ${this.manaModifier > 0 ? '+' : ''}${this.manaModifier}`);
    if (this.manaMultiplier !== 1.0) mods.push(`Mana x${this.manaMultiplier}`);
    if (this.manaUsedModifier !== 0) mods.push(`ManaUsed ${this.manaUsedModifier > 0 ? '+' : ''}${this.manaUsedModifier}`);
    if (this.manaUsedMultiplier !== 1.0) mods.push(`ManaUsed x${this.manaUsedMultiplier}`);
    if (this.physicalPowerModifier !== 0) mods.push(`Phys.Power ${this.physicalPowerModifier > 0 ? '+' : ''}${this.physicalPowerModifier}`);
    if (this.physicalPowerMultiplier !== 1.0) mods.push(`Phys.Power x${this.physicalPowerMultiplier}`);
    if (this.magicPowerModifier !== 0) mods.push(`Magic.Power ${this.magicPowerModifier > 0 ? '+' : ''}${this.magicPowerModifier}`);
    if (this.magicPowerMultiplier !== 1.0) mods.push(`Magic.Power x${this.magicPowerMultiplier}`);
    if (this.speedModifier !== 0) mods.push(`Speed ${this.speedModifier > 0 ? '+' : ''}${this.speedModifier}`);
    if (this.speedMultiplier !== 1.0) mods.push(`Speed x${this.speedMultiplier}`);
    if (this.actionTimerModifier !== 0) mods.push(`ActionTimer ${this.actionTimerModifier > 0 ? '+' : ''}${this.actionTimerModifier}`);
    if (this.actionTimerMultiplier !== 1.0) mods.push(`ActionTimer x${this.actionTimerMultiplier}`);
    if (this.movementModifier !== 0) mods.push(`Movement ${this.movementModifier > 0 ? '+' : ''}${this.movementModifier}`);
    if (this.movementMultiplier !== 1.0) mods.push(`Movement x${this.movementMultiplier}`);
    if (this.physicalEvadeModifier !== 0) mods.push(`Phys.Evade ${this.physicalEvadeModifier > 0 ? '+' : ''}${this.physicalEvadeModifier}`);
    if (this.physicalEvadeMultiplier !== 1.0) mods.push(`Phys.Evade x${this.physicalEvadeMultiplier}`);
    if (this.magicEvadeModifier !== 0) mods.push(`Magic.Evade ${this.magicEvadeModifier > 0 ? '+' : ''}${this.magicEvadeModifier}`);
    if (this.magicEvadeMultiplier !== 1.0) mods.push(`Magic.Evade x${this.magicEvadeMultiplier}`);
    if (this.courageModifier !== 0) mods.push(`Courage ${this.courageModifier > 0 ? '+' : ''}${this.courageModifier}`);
    if (this.courageMultiplier !== 1.0) mods.push(`Courage x${this.courageMultiplier}`);
    if (this.attunementModifier !== 0) mods.push(`Attunement ${this.attunementModifier > 0 ? '+' : ''}${this.attunementModifier}`);
    if (this.attunementMultiplier !== 1.0) mods.push(`Attunement x${this.attunementMultiplier}`);

    return mods.length > 0 ? mods.join(', ') : 'No modifiers';
  }
}
