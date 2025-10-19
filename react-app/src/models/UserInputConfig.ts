export type PlayerAction =
  | 'moveForward'
  | 'moveBackward'
  | 'strafeLeft'
  | 'strafeRight'
  | 'turnLeft'
  | 'turnRight';

export interface KeyBinding {
  key: string;
  action: PlayerAction;
}

export class UserInputConfig {
  private keyMap: Map<string, PlayerAction>;

  constructor(keyBindings?: KeyBinding[]) {
    this.keyMap = new Map();

    // Set default bindings if none provided
    const bindings = keyBindings || this.getDefaultBindings();
    bindings.forEach(binding => {
      this.keyMap.set(binding.key.toLowerCase(), binding.action);
    });
  }

  /**
   * Get the default QWEASD control scheme
   */
  static getDefaultBindings(): KeyBinding[] {
    return [
      // Rotation
      { key: 'q', action: 'turnLeft' },
      { key: 'Q', action: 'turnLeft' },
      { key: 'e', action: 'turnRight' },
      { key: 'E', action: 'turnRight' },

      // Relative movement
      { key: 'w', action: 'moveForward' },
      { key: 'W', action: 'moveForward' },
      { key: 'ArrowUp', action: 'moveForward' },

      { key: 's', action: 'moveBackward' },
      { key: 'S', action: 'moveBackward' },
      { key: 'ArrowDown', action: 'moveBackward' },

      { key: 'a', action: 'strafeLeft' },
      { key: 'A', action: 'strafeLeft' },
      { key: 'ArrowLeft', action: 'strafeLeft' },

      { key: 'd', action: 'strafeRight' },
      { key: 'D', action: 'strafeRight' },
      { key: 'ArrowRight', action: 'strafeRight' }
    ];
  }

  /**
   * Get default configuration
   */
  private getDefaultBindings(): KeyBinding[] {
    return UserInputConfig.getDefaultBindings();
  }

  /**
   * Get the action for a given key
   */
  getAction(key: string): PlayerAction | undefined {
    return this.keyMap.get(key.toLowerCase());
  }

  /**
   * Remap a key to a different action
   */
  remapKey(key: string, action: PlayerAction): void {
    this.keyMap.set(key.toLowerCase(), action);
  }

  /**
   * Get all current key bindings
   */
  getAllBindings(): KeyBinding[] {
    const bindings: KeyBinding[] = [];
    this.keyMap.forEach((action, key) => {
      bindings.push({ key, action });
    });
    return bindings;
  }

  /**
   * Reset to default bindings
   */
  resetToDefaults(): void {
    this.keyMap.clear();
    const defaults = this.getDefaultBindings();
    defaults.forEach(binding => {
      this.keyMap.set(binding.key.toLowerCase(), binding.action);
    });
  }

  /**
   * Clear all bindings
   */
  clearAllBindings(): void {
    this.keyMap.clear();
  }

  /**
   * Check if a key is bound to any action
   */
  isBound(key: string): boolean {
    return this.keyMap.has(key.toLowerCase());
  }

  /**
   * Get all keys bound to a specific action
   */
  getKeysForAction(action: PlayerAction): string[] {
    const keys: string[] = [];
    this.keyMap.forEach((boundAction, key) => {
      if (boundAction === action) {
        keys.push(key);
      }
    });
    return keys;
  }

  /**
   * Save configuration to localStorage
   */
  save(profileName: string = 'default'): void {
    const bindings = this.getAllBindings();
    localStorage.setItem(`input-config-${profileName}`, JSON.stringify(bindings));
  }

  /**
   * Load configuration from localStorage
   */
  static load(profileName: string = 'default'): UserInputConfig {
    const saved = localStorage.getItem(`input-config-${profileName}`);
    if (saved) {
      try {
        const bindings = JSON.parse(saved) as KeyBinding[];
        return new UserInputConfig(bindings);
      } catch (e) {
        console.error('Failed to load input config:', e);
      }
    }
    return new UserInputConfig();
  }
}
