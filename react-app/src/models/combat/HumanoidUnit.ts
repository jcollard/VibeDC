import type { CombatUnit } from './CombatUnit';
import { Equipment } from './Equipment';
import { UnitClass } from './UnitClass';
import { CombatAbility } from './CombatAbility';
import type { EquipmentResult } from '../../utils/EquipmentResult';
import { EquipmentResultFactory } from '../../utils/EquipmentResult';

/**
 * JSON representation of a HumanoidUnit for serialization
 */
export interface HumanoidUnitJSON {
  name: string;
  unitClassId: string;
  secondaryClassId: string | null;
  learnedAbilityIds: string[];
  totalExperience: number;
  classExperience: Record<string, number>;
  classExperienceSpent: Record<string, number>;
  reactionAbilityId: string | null;
  passiveAbilityId: string | null;
  movementAbilityId: string | null;
  baseHealth: number;
  baseMana: number;
  basePhysicalPower: number;
  baseMagicPower: number;
  baseSpeed: number;
  baseMovement: number;
  basePhysicalEvade: number;
  baseMagicEvade: number;
  baseCourage: number;
  baseAttunement: number;
  wounds: number;
  manaUsed: number;
  actionTimer: number;
  leftHandId: string | null;
  rightHandId: string | null;
  headId: string | null;
  bodyId: string | null;
  accessoryId: string | null;
  spriteId: string;
  isPlayerControlled: boolean;
  canDualWield: boolean;
}

/**
 * Implementation of CombatUnit for humanoid characters
 */
export class HumanoidUnit implements CombatUnit {
  private _name: string;
  private _unitClass: UnitClass;
  private _secondaryClass: UnitClass | null = null;
  private _learnedAbilities: Set<CombatAbility> = new Set();
  private _totalExperience: number = 0;
  private _classExperience: Map<string, number> = new Map();
  private _classExperienceSpent: Map<string, number> = new Map();

  // Assignable ability slots
  private _reactionAbility: CombatAbility | null = null;
  private _passiveAbility: CombatAbility | null = null;
  private _movementAbility: CombatAbility | null = null;

  private baseHealth: number;
  private baseMana: number;
  private basePhysicalPower: number;
  private baseMagicPower: number;
  private baseSpeed: number;
  private baseMovement: number;
  private basePhysicalEvade: number;
  private baseMagicEvade: number;
  private baseCourage: number;
  private baseAttunement: number;

  private _wounds: number = 0;
  private _manaUsed: number = 0;
  private _actionTimer: number = 0;

  // Equipment slots
  private _leftHand: Equipment | null = null;
  private _rightHand: Equipment | null = null;
  private _head: Equipment | null = null;
  private _body: Equipment | null = null;
  private _accessory: Equipment | null = null;

  private _spriteId: string;
  private _isPlayerControlled: boolean = false;
  private _canDualWield: boolean = false;

  constructor(
    name: string,
    unitClass: UnitClass,
    baseHealth: number,
    baseMana: number,
    basePhysicalPower: number,
    baseMagicPower: number,
    baseSpeed: number,
    baseMovement: number,
    basePhysicalEvade: number,
    baseMagicEvade: number,
    baseCourage: number,
    baseAttunement: number,
    spriteId: string = "default-humanoid",
    isPlayerControlled: boolean = false
  ) {
    this._name = name;
    this._unitClass = unitClass;
    this.baseHealth = baseHealth;
    this.baseMana = baseMana;
    this.basePhysicalPower = basePhysicalPower;
    this.baseMagicPower = baseMagicPower;
    this.baseSpeed = baseSpeed;
    this.baseMovement = baseMovement;
    this.basePhysicalEvade = basePhysicalEvade;
    this.baseMagicEvade = baseMagicEvade;
    this.baseCourage = baseCourage;
    this.baseAttunement = baseAttunement;
    this._spriteId = spriteId;
    this._isPlayerControlled = isPlayerControlled;
  }

  get name(): string {
    return this._name;
  }

  get unitClass(): UnitClass {
    return this._unitClass;
  }

  get secondaryClass(): UnitClass | null {
    return this._secondaryClass;
  }

  get learnedAbilities(): ReadonlySet<CombatAbility> {
    return this._learnedAbilities;
  }

  get reactionAbility(): CombatAbility | null {
    return this._reactionAbility;
  }

  get passiveAbility(): CombatAbility | null {
    return this._passiveAbility;
  }

  get movementAbility(): CombatAbility | null {
    return this._movementAbility;
  }

  get totalExperience(): number {
    return this._totalExperience;
  }

  get classExperience(): ReadonlyMap<string, number> {
    return this._classExperience;
  }

  get classExperienceSpent(): ReadonlyMap<string, number> {
    return this._classExperienceSpent;
  }

  get health(): number {
    return Math.max(0, this.maxHealth - this._wounds);
  }

  get maxHealth(): number {
    return this.baseHealth;
  }

  get wounds(): number {
    return this._wounds;
  }

  get mana(): number {
    return Math.max(0, this.maxMana - this._manaUsed);
  }

  get maxMana(): number {
    return this.baseMana;
  }

  get manaUsed(): number {
    return this._manaUsed;
  }

  get physicalPower(): number {
    return this.basePhysicalPower;
  }

  get magicPower(): number {
    return this.baseMagicPower;
  }

  get speed(): number {
    return this.baseSpeed;
  }

  get actionTimer(): number {
    return this._actionTimer;
  }

  get movement(): number {
    return this.baseMovement;
  }

  get physicalEvade(): number {
    return this.basePhysicalEvade;
  }

  get magicEvade(): number {
    return this.baseMagicEvade;
  }

  get courage(): number {
    return this.baseCourage;
  }

  get attunement(): number {
    return this.baseAttunement;
  }

  get spriteId(): string {
    return this._spriteId;
  }

  get isPlayerControlled(): boolean {
    return this._isPlayerControlled;
  }

  get isKnockedOut(): boolean {
    return this.wounds >= this.maxHealth;
  }

  setPlayerControlled(value: boolean): void {
    this._isPlayerControlled = value;
  }

  get canDualWield(): boolean {
    return this._canDualWield;
  }

  setCanDualWield(value: boolean): void {
    this._canDualWield = value;
  }

  // Equipment slot getters
  get leftHand(): Equipment | null {
    return this._leftHand;
  }

  get rightHand(): Equipment | null {
    return this._rightHand;
  }

  get head(): Equipment | null {
    return this._head;
  }

  get body(): Equipment | null {
    return this._body;
  }

  get accessory(): Equipment | null {
    return this._accessory;
  }

  // Equipment management methods
  equipLeftHand(equipment: Equipment | null): EquipmentResult {
    // Allow unequipping
    if (equipment === null) {
      const oldEquipment = this._leftHand;
      this._leftHand = null;
      if (oldEquipment) {
        return EquipmentResultFactory.successUnequip(this, oldEquipment);
      }
      return { success: true, message: 'Left hand unequipped' };
    }

    // Validate against TwoHandedWeapon in right hand
    if (this._rightHand !== null && this._rightHand.type === 'TwoHandedWeapon') {
      return EquipmentResultFactory.twoHandedBlocksLeft(this, equipment, this._rightHand);
    }

    // Validate TwoHandedWeapon: right hand must be empty
    if (equipment.type === 'TwoHandedWeapon') {
      if (this._rightHand !== null) {
        return EquipmentResultFactory.twoHandedNeedsEmptyRight(this, equipment, this._rightHand);
      }
    }

    // Validate OneHandedWeapon dual-wield rules
    if (equipment.type === 'OneHandedWeapon') {
      if (this._rightHand !== null && this._rightHand.isWeapon()) {
        // Right hand has a weapon
        if (!this._canDualWield) {
          return EquipmentResultFactory.cannotDualWield(this, equipment, this._rightHand);
        }
        // Can dual-wield, check range compatibility
        if (equipment.minRange !== this._rightHand.minRange ||
            equipment.maxRange !== this._rightHand.maxRange) {
          return EquipmentResultFactory.dualWieldRangeMismatch(this, equipment, this._rightHand);
        }
      }
    }

    const oldEquipment = this._leftHand;
    this._leftHand = equipment;

    if (oldEquipment) {
      return EquipmentResultFactory.successSwap(this, equipment, oldEquipment);
    }
    return EquipmentResultFactory.success(this, equipment, 'Left Hand');
  }

  equipRightHand(equipment: Equipment | null): EquipmentResult {
    // Allow unequipping
    if (equipment === null) {
      const oldEquipment = this._rightHand;
      this._rightHand = null;
      if (oldEquipment) {
        return EquipmentResultFactory.successUnequip(this, oldEquipment);
      }
      return { success: true, message: 'Right hand unequipped' };
    }

    // Validate against TwoHandedWeapon in left hand
    if (this._leftHand !== null && this._leftHand.type === 'TwoHandedWeapon') {
      return EquipmentResultFactory.twoHandedBlocksRight(this, equipment, this._leftHand);
    }

    // Validate TwoHandedWeapon: left hand must be empty
    if (equipment.type === 'TwoHandedWeapon') {
      if (this._leftHand !== null) {
        return EquipmentResultFactory.twoHandedNeedsEmptyLeft(this, equipment, this._leftHand);
      }
    }

    // Validate OneHandedWeapon dual-wield rules
    if (equipment.type === 'OneHandedWeapon') {
      if (this._leftHand !== null && this._leftHand.isWeapon()) {
        // Left hand has a weapon
        if (!this._canDualWield) {
          return EquipmentResultFactory.cannotDualWield(this, equipment, this._leftHand);
        }
        // Can dual-wield, check range compatibility
        if (equipment.minRange !== this._leftHand.minRange ||
            equipment.maxRange !== this._leftHand.maxRange) {
          return EquipmentResultFactory.dualWieldRangeMismatch(this, equipment, this._leftHand);
        }
      }
    }

    const oldEquipment = this._rightHand;
    this._rightHand = equipment;

    if (oldEquipment) {
      return EquipmentResultFactory.successSwap(this, equipment, oldEquipment);
    }
    return EquipmentResultFactory.success(this, equipment, 'Right Hand');
  }

  equipHead(equipment: Equipment | null): EquipmentResult {
    const oldEquipment = this._head;
    this._head = equipment;

    if (equipment === null) {
      if (oldEquipment) {
        return EquipmentResultFactory.successUnequip(this, oldEquipment);
      }
      return { success: true, message: 'Head unequipped' };
    }

    if (oldEquipment) {
      return EquipmentResultFactory.successSwap(this, equipment, oldEquipment);
    }
    return EquipmentResultFactory.success(this, equipment, 'Head');
  }

  equipBody(equipment: Equipment | null): EquipmentResult {
    const oldEquipment = this._body;
    this._body = equipment;

    if (equipment === null) {
      if (oldEquipment) {
        return EquipmentResultFactory.successUnequip(this, oldEquipment);
      }
      return { success: true, message: 'Body unequipped' };
    }

    if (oldEquipment) {
      return EquipmentResultFactory.successSwap(this, equipment, oldEquipment);
    }
    return EquipmentResultFactory.success(this, equipment, 'Body');
  }

  equipAccessory(equipment: Equipment | null): EquipmentResult {
    const oldEquipment = this._accessory;
    this._accessory = equipment;

    if (equipment === null) {
      if (oldEquipment) {
        return EquipmentResultFactory.successUnequip(this, oldEquipment);
      }
      return { success: true, message: 'Accessory unequipped' };
    }

    if (oldEquipment) {
      return EquipmentResultFactory.successSwap(this, equipment, oldEquipment);
    }
    return EquipmentResultFactory.success(this, equipment, 'Accessory');
  }

  unequipLeftHand(): Equipment | null {
    const item = this._leftHand;
    this._leftHand = null;
    return item;
  }

  unequipRightHand(): Equipment | null {
    const item = this._rightHand;
    this._rightHand = null;
    return item;
  }

  unequipHead(): Equipment | null {
    const item = this._head;
    this._head = null;
    return item;
  }

  unequipBody(): Equipment | null {
    const item = this._body;
    this._body = null;
    return item;
  }

  unequipAccessory(): Equipment | null {
    const item = this._accessory;
    this._accessory = null;
    return item;
  }

  /**
   * Get all weapons currently equipped in hand slots
   * @returns Array of equipped weapons (0-2 items)
   */
  getEquippedWeapons(): Equipment[] {
    const weapons: Equipment[] = [];
    if (this._leftHand?.isWeapon()) {
      weapons.push(this._leftHand);
    }
    if (this._rightHand?.isWeapon()) {
      weapons.push(this._rightHand);
    }
    return weapons;
  }

  // Experience management methods
  /**
   * Add experience points to this unit
   * @param amount The amount of experience to add
   * @param unitClass Optional class to attribute the experience to
   */
  addExperience(amount: number, unitClass?: UnitClass): void {
    if (amount < 0) {
      throw new Error("Cannot add negative experience");
    }
    this._totalExperience += amount;

    // If a class is specified, add to that class's experience using the class ID
    if (unitClass) {
      const currentClassXp = this._classExperience.get(unitClass.id) ?? 0;
      this._classExperience.set(unitClass.id, currentClassXp + amount);
    }
  }

  /**
   * Get experience earned in a specific class
   * @param unitClass The class to check
   * @returns The amount of experience earned in that class
   */
  getClassExperience(unitClass: UnitClass): number {
    return this._classExperience.get(unitClass.id) ?? 0;
  }

  /**
   * Get the amount of unspent experience (total - spent on abilities)
   */
  get unspentExperience(): number {
    let spent = 0;
    for (const classSpent of this._classExperienceSpent.values()) {
      spent += classSpent;
    }
    return this._totalExperience - spent;
  }

  /**
   * Get the amount of unspent experience for a specific class
   * @param unitClass The class to check
   * @returns The amount of unspent experience for that class
   */
  getUnspentClassExperience(unitClass: UnitClass): number {
    const earned = this._classExperience.get(unitClass.id) ?? 0;
    const spent = this._classExperienceSpent.get(unitClass.id) ?? 0;
    return earned - spent;
  }

  // Ability management methods
  /**
   * Learn a new ability from a specific class
   * @param ability The ability to learn
   * @param fromClass The class this ability is being learned from
   * @returns true if the ability was learned, false if it was already known or couldn't afford it
   */
  learnAbility(ability: CombatAbility, fromClass: UnitClass): boolean {
    if (this._learnedAbilities.has(ability)) {
      return false;
    }

    // Check if the class offers this ability
    if (!fromClass.learnableAbilities.includes(ability)) {
      console.warn(`Ability ${ability.name} is not learnable from class ${fromClass.name}`);
      return false;
    }

    // Check if the unit has enough class experience
    if (this.getUnspentClassExperience(fromClass) < ability.experiencePrice) {
      return false;
    }

    // Learn the ability and track the spent experience
    this._learnedAbilities.add(ability);
    const currentSpent = this._classExperienceSpent.get(fromClass.id) ?? 0;
    this._classExperienceSpent.set(fromClass.id, currentSpent + ability.experiencePrice);
    return true;
  }

  /**
   * Check if this unit has learned a specific ability
   */
  hasAbility(ability: CombatAbility): boolean {
    return this._learnedAbilities.has(ability);
  }

  /**
   * Add a learned ability directly without class checks
   * Used for initializing party members who may have learned abilities from previous classes
   * @param ability The ability to add
   */
  addLearnedAbility(ability: CombatAbility): void {
    this._learnedAbilities.add(ability);
  }

  /**
   * Forget an ability and refund experience to the class
   * @param ability The ability to forget
   * @param fromClass The class this ability was learned from
   * @returns true if the ability was forgotten, false if it wasn't known
   */
  forgetAbility(ability: CombatAbility, fromClass: UnitClass): boolean {
    if (!this._learnedAbilities.delete(ability)) {
      return false;
    }

    // Refund the experience to the class
    const currentSpent = this._classExperienceSpent.get(fromClass.id) ?? 0;
    this._classExperienceSpent.set(fromClass.id, Math.max(0, currentSpent - ability.experiencePrice));
    return true;
  }

  /**
   * Check if this unit can afford to learn an ability from a specific class
   * @param ability The ability to learn
   * @param fromClass The class to learn it from
   * @returns true if the unit has enough class experience
   */
  canAffordAbility(ability: CombatAbility, fromClass: UnitClass): boolean {
    return this.getUnspentClassExperience(fromClass) >= ability.experiencePrice;
  }

  /**
   * Get the class experience spent on a specific ability (for tracking purposes)
   * @param unitClass The class to check
   * @returns The amount of experience spent on abilities from that class
   */
  getClassExperienceSpent(unitClass: UnitClass): number {
    return this._classExperienceSpent.get(unitClass.id) ?? 0;
  }

  // Class management methods
  /**
   * Set the secondary class for this unit
   * @param unitClass The class to set as secondary, or null to clear
   */
  setSecondaryClass(unitClass: UnitClass | null): void {
    this._secondaryClass = unitClass;
  }

  /**
   * Get action abilities available from the primary class
   * @returns Array of learned action abilities from the primary class
   */
  getPrimaryActions(): CombatAbility[] {
    const available: CombatAbility[] = [];

    for (const ability of this._unitClass.learnableAbilities) {
      if (ability.abilityType === "Action" && this.hasAbility(ability)) {
        available.push(ability);
      }
    }

    return available;
  }

  /**
   * Get action abilities available from the secondary class
   * @returns Array of learned action abilities from the secondary class (empty if no secondary class)
   */
  getSecondaryActions(): CombatAbility[] {
    const available: CombatAbility[] = [];

    if (this._secondaryClass) {
      for (const ability of this._secondaryClass.learnableAbilities) {
        if (ability.abilityType === "Action" && this.hasAbility(ability)) {
          available.push(ability);
        }
      }
    }

    return available;
  }

  // Ability assignment methods
  /**
   * Assign a reaction ability to the reaction slot
   * @param ability The ability to assign (must be Reaction type and learned)
   * @returns true if assigned successfully, false otherwise
   */
  assignReactionAbility(ability: CombatAbility | null): boolean {
    if (ability === null) {
      this._reactionAbility = null;
      return true;
    }

    if (ability.abilityType !== "Reaction") {
      return false;
    }

    if (!this.hasAbility(ability)) {
      return false;
    }

    this._reactionAbility = ability;
    return true;
  }

  /**
   * Assign a passive ability to the passive slot
   * @param ability The ability to assign (must be Passive type and learned)
   * @returns true if assigned successfully, false otherwise
   */
  assignPassiveAbility(ability: CombatAbility | null): boolean {
    if (ability === null) {
      this._passiveAbility = null;
      return true;
    }

    if (ability.abilityType !== "Passive") {
      return false;
    }

    if (!this.hasAbility(ability)) {
      return false;
    }

    this._passiveAbility = ability;
    return true;
  }

  /**
   * Assign a movement ability to the movement slot
   * @param ability The ability to assign (must be Movement type and learned)
   * @returns true if assigned successfully, false otherwise
   */
  assignMovementAbility(ability: CombatAbility | null): boolean {
    if (ability === null) {
      this._movementAbility = null;
      return true;
    }

    if (ability.abilityType !== "Movement") {
      return false;
    }

    if (!this.hasAbility(ability)) {
      return false;
    }

    this._movementAbility = ability;
    return true;
  }

  // Serialization methods
  /**
   * Convert this HumanoidUnit to a JSON-serializable object
   * @returns JSON representation of this unit
   */
  toJSON(): HumanoidUnitJSON {
    return {
      name: this._name,
      unitClassId: this._unitClass.id,
      secondaryClassId: this._secondaryClass?.id ?? null,
      learnedAbilityIds: Array.from(this._learnedAbilities).map(a => a.id),
      totalExperience: this._totalExperience,
      classExperience: Object.fromEntries(this._classExperience),
      classExperienceSpent: Object.fromEntries(this._classExperienceSpent),
      reactionAbilityId: this._reactionAbility?.id ?? null,
      passiveAbilityId: this._passiveAbility?.id ?? null,
      movementAbilityId: this._movementAbility?.id ?? null,
      baseHealth: this.baseHealth,
      baseMana: this.baseMana,
      basePhysicalPower: this.basePhysicalPower,
      baseMagicPower: this.baseMagicPower,
      baseSpeed: this.baseSpeed,
      baseMovement: this.baseMovement,
      basePhysicalEvade: this.basePhysicalEvade,
      baseMagicEvade: this.baseMagicEvade,
      baseCourage: this.baseCourage,
      baseAttunement: this.baseAttunement,
      wounds: this._wounds,
      manaUsed: this._manaUsed,
      actionTimer: this._actionTimer,
      leftHandId: this._leftHand?.id ?? null,
      rightHandId: this._rightHand?.id ?? null,
      headId: this._head?.id ?? null,
      bodyId: this._body?.id ?? null,
      accessoryId: this._accessory?.id ?? null,
      spriteId: this._spriteId,
      isPlayerControlled: this._isPlayerControlled,
      canDualWield: this._canDualWield,
    };
  }

  /**
   * Create a HumanoidUnit from a JSON object
   * @param json The JSON representation
   * @returns A new HumanoidUnit instance, or null if deserialization fails
   */
  static fromJSON(json: HumanoidUnitJSON): HumanoidUnit | null {
    // Look up the unit class
    const unitClass = UnitClass.getById(json.unitClassId);
    if (!unitClass) {
      console.error(`Failed to deserialize HumanoidUnit: UnitClass with id ${json.unitClassId} not found`);
      return null;
    }

    // Create the unit
    const unit = new HumanoidUnit(
      json.name,
      unitClass,
      json.baseHealth,
      json.baseMana,
      json.basePhysicalPower,
      json.baseMagicPower,
      json.baseSpeed,
      json.baseMovement,
      json.basePhysicalEvade,
      json.baseMagicEvade,
      json.baseCourage,
      json.baseAttunement,
      json.spriteId ?? "default-humanoid",
      json.isPlayerControlled ?? false
    );

    // Restore secondary class
    if (json.secondaryClassId) {
      const secondaryClass = UnitClass.getById(json.secondaryClassId);
      if (secondaryClass) {
        unit._secondaryClass = secondaryClass;
      } else {
        console.warn(`Secondary class with id ${json.secondaryClassId} not found`);
      }
    }

    // Restore learned abilities
    for (const abilityId of json.learnedAbilityIds) {
      const ability = CombatAbility.getById(abilityId);
      if (ability) {
        unit._learnedAbilities.add(ability);
      } else {
        console.warn(`Ability with id ${abilityId} not found`);
      }
    }

    // Restore experience
    unit._totalExperience = json.totalExperience;
    unit._classExperience = new Map(Object.entries(json.classExperience));
    unit._classExperienceSpent = new Map(Object.entries(json.classExperienceSpent ?? {}));

    // Restore assigned abilities
    if (json.reactionAbilityId) {
      const ability = CombatAbility.getById(json.reactionAbilityId);
      if (ability) {
        unit._reactionAbility = ability;
      } else {
        console.warn(`Reaction ability with id ${json.reactionAbilityId} not found`);
      }
    }

    if (json.passiveAbilityId) {
      const ability = CombatAbility.getById(json.passiveAbilityId);
      if (ability) {
        unit._passiveAbility = ability;
      } else {
        console.warn(`Passive ability with id ${json.passiveAbilityId} not found`);
      }
    }

    if (json.movementAbilityId) {
      const ability = CombatAbility.getById(json.movementAbilityId);
      if (ability) {
        unit._movementAbility = ability;
      } else {
        console.warn(`Movement ability with id ${json.movementAbilityId} not found`);
      }
    }

    // Restore combat state
    unit._wounds = json.wounds;
    unit._manaUsed = json.manaUsed;
    unit._actionTimer = json.actionTimer;

    // Restore equipment
    if (json.leftHandId) {
      const equipment = Equipment.getById(json.leftHandId);
      if (equipment) {
        unit._leftHand = equipment;
      } else {
        console.warn(`Left hand equipment with id ${json.leftHandId} not found`);
      }
    }

    if (json.rightHandId) {
      const equipment = Equipment.getById(json.rightHandId);
      if (equipment) {
        unit._rightHand = equipment;
      } else {
        console.warn(`Right hand equipment with id ${json.rightHandId} not found`);
      }
    }

    if (json.headId) {
      const equipment = Equipment.getById(json.headId);
      if (equipment) {
        unit._head = equipment;
      } else {
        console.warn(`Head equipment with id ${json.headId} not found`);
      }
    }

    if (json.bodyId) {
      const equipment = Equipment.getById(json.bodyId);
      if (equipment) {
        unit._body = equipment;
      } else {
        console.warn(`Body equipment with id ${json.bodyId} not found`);
      }
    }

    if (json.accessoryId) {
      const equipment = Equipment.getById(json.accessoryId);
      if (equipment) {
        unit._accessory = equipment;
      } else {
        console.warn(`Accessory equipment with id ${json.accessoryId} not found`);
      }
    }

    // Restore dual-wield capability
    unit._canDualWield = json.canDualWield ?? false;

    return unit;
  }
}
