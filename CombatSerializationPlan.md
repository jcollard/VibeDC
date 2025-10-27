# Combat Serialization Plan

## Overview

This document outlines the implementation plan for adding save/load functionality to the combat system. Players will be able to export their current combat state and import it later to resume their game.

## Goals

1. Serialize the complete combat state (CombatState + CombatLog)
2. Support both file download/upload and localStorage
3. Add Export/Import buttons to Developer Settings panel in CombatView
4. Validate imported data and show error messages on failure
5. Preserve current state if import fails

## Architecture Decision: Serialization Strategy

### What to Serialize

**Full Object Graph (Option A):**
- CombatState container
- CombatMap with full grid data
- CombatUnitManifest with all unit placements
- CombatUnit instances (HumanoidUnit/MonsterUnit) with current state
- CombatLog messages

**Registry References (Option B Components):**
- Store IDs only for immutable registry items:
  - UnitClass (classId)
  - CombatAbility (abilityId)
  - Equipment (equipmentId)
  - Tileset (tilesetId)
  - Enemy templates (enemyId)

### Why This Hybrid Approach

This design balances self-contained save files with efficiency:

1. **State Changes Are Preserved**: Units have modified HP, wounds, mana, positions, equipment - these must be fully serialized
2. **Registry Items Are Immutable**: Classes, abilities, and equipment don't change during combat - only reference their IDs
3. **Reconstruction Works**: On load, we resolve IDs via registries and rebuild the object graph
4. **Validation Is Possible**: Missing registry items can be detected and reported as errors

## Serialization Format

### Top-Level Structure

```typescript
interface CombatSaveData {
  version: string;                    // Schema version (e.g., "1.0.0")
  timestamp: number;                  // Save time (Date.now())
  combatState: CombatStateJSON;       // Full combat state
  combatLog: CombatLogJSON;           // Combat log messages
  encounterId?: string;               // Reference to encounter (if from registry)
}
```

### CombatStateJSON

```typescript
interface CombatStateJSON {
  turnNumber: number;
  phase: CombatPhase;
  tilesetId: string;
  map: CombatMapJSON;
  unitManifest: CombatUnitManifestJSON;
}
```

### CombatMapJSON

Already exists in codebase:
```typescript
interface CombatMapJSON {
  width: number;
  height: number;
  grid: CombatCell[][];
}
```

### CombatUnitManifestJSON

```typescript
interface CombatUnitManifestJSON {
  units: Array<{
    unit: HumanoidUnitJSON | MonsterUnitJSON;
    position: Position;
    type: 'humanoid' | 'monster';  // Discriminator for polymorphism
  }>;
}
```

### HumanoidUnitJSON & MonsterUnitJSON

Already exist in codebase:
- `HumanoidUnitJSON` - includes equipment IDs, class IDs, ability IDs
- `MonsterUnitJSON` - simpler version without equipment

### CombatLogJSON

```typescript
interface CombatLogJSON {
  messages: string[];  // Raw message strings with formatting tags
}
```

Note: We only store the message text, not animation state or scroll position. These are UI concerns that reset on load.

## Implementation Plan

### Phase 1: Add Serialization Methods

#### 1.1 Create CombatUnitManifest Serialization

**File:** `react-app/src/models/combat/CombatUnitManifest.ts`

**Add methods:**
```typescript
toJSON(): CombatUnitManifestJSON {
  const units = this.getAllUnits().map(placement => ({
    unit: placement.unit.toJSON(),
    position: placement.position,
    type: placement.unit instanceof HumanoidUnit ? 'humanoid' : 'monster'
  }));
  return { units };
}

static fromJSON(json: CombatUnitManifestJSON): CombatUnitManifest | null {
  const manifest = new CombatUnitManifest();
  for (const placementData of json.units) {
    let unit: CombatUnit | null;
    if (placementData.type === 'humanoid') {
      unit = HumanoidUnit.fromJSON(placementData.unit as HumanoidUnitJSON);
    } else {
      unit = MonsterUnit.fromJSON(placementData.unit as MonsterUnitJSON);
    }

    if (!unit) {
      console.error('Failed to deserialize unit:', placementData);
      return null;  // Validation failure
    }

    manifest.addUnit(unit, placementData.position);
  }
  return manifest;
}
```

#### 1.2 Create CombatState Serialization

**File:** `react-app/src/models/combat/CombatState.ts`

**Add helper functions** (CombatState is an interface, not a class):
```typescript
export function serializeCombatState(state: CombatState): CombatStateJSON {
  return {
    turnNumber: state.turnNumber,
    phase: state.phase,
    tilesetId: state.tilesetId,
    map: state.map.toJSON(),
    unitManifest: state.unitManifest.toJSON()
  };
}

export function deserializeCombatState(json: CombatStateJSON): CombatState | null {
  const map = CombatMap.fromJSON(json.map);
  if (!map) {
    console.error('Failed to deserialize CombatMap');
    return null;
  }

  const unitManifest = CombatUnitManifest.fromJSON(json.unitManifest);
  if (!unitManifest) {
    console.error('Failed to deserialize CombatUnitManifest');
    return null;
  }

  return {
    turnNumber: json.turnNumber,
    phase: json.phase,
    tilesetId: json.tilesetId,
    map,
    unitManifest
  };
}
```

#### 1.3 Create CombatLog Serialization

**File:** `react-app/src/models/combat/CombatLogManager.ts`

**Add methods:**
```typescript
toJSON(): CombatLogJSON {
  return {
    messages: this.getMessages() as string[]
  };
}

static fromJSON(json: CombatLogJSON, config?: CombatLogConfig): CombatLogManager {
  const logManager = new CombatLogManager(config);
  for (const message of json.messages) {
    logManager.addMessage(message, Infinity);  // Add instantly, no animation
  }
  logManager.scrollToBottom();
  return logManager;
}
```

#### 1.4 Create Top-Level Serialization

**New File:** `react-app/src/models/combat/CombatSaveData.ts`

```typescript
import { CombatState, serializeCombatState, deserializeCombatState } from './CombatState';
import { CombatLogManager } from './CombatLogManager';

export interface CombatSaveData {
  version: string;
  timestamp: number;
  combatState: CombatStateJSON;
  combatLog: CombatLogJSON;
  encounterId?: string;
}

export function serializeCombat(
  combatState: CombatState,
  combatLog: CombatLogManager,
  encounterId?: string
): CombatSaveData {
  return {
    version: '1.0.0',
    timestamp: Date.now(),
    combatState: serializeCombatState(combatState),
    combatLog: combatLog.toJSON(),
    encounterId
  };
}

export function deserializeCombat(
  data: CombatSaveData
): { combatState: CombatState; combatLog: CombatLogManager } | null {
  // Validate version
  if (data.version !== '1.0.0') {
    console.error(`Unsupported save version: ${data.version}`);
    return null;
  }

  // Deserialize combat state
  const combatState = deserializeCombatState(data.combatState);
  if (!combatState) {
    return null;
  }

  // Deserialize combat log
  const combatLog = CombatLogManager.fromJSON(data.combatLog);

  return { combatState, combatLog };
}
```

### Phase 2: Storage Utilities

**New File:** `react-app/src/utils/combatStorage.ts`

```typescript
import { CombatSaveData, serializeCombat, deserializeCombat } from '../models/combat/CombatSaveData';
import { CombatState } from '../models/combat/CombatState';
import { CombatLogManager } from '../models/combat/CombatLogManager';

const STORAGE_KEY = 'vibedc-combat-save';

// LocalStorage functions
export function saveCombatToLocalStorage(
  combatState: CombatState,
  combatLog: CombatLogManager,
  encounterId?: string
): boolean {
  try {
    const saveData = serializeCombat(combatState, combatLog, encounterId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    return true;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    return false;
  }
}

export function loadCombatFromLocalStorage(): {
  combatState: CombatState;
  combatLog: CombatLogManager;
} | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) {
      return null;
    }

    const saveData = JSON.parse(json) as CombatSaveData;
    return deserializeCombat(saveData);
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
}

export function clearCombatFromLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// File download function
export function exportCombatToFile(
  combatState: CombatState,
  combatLog: CombatLogManager,
  encounterId?: string
): void {
  const saveData = serializeCombat(combatState, combatLog, encounterId);
  const json = JSON.stringify(saveData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `vibedc-combat-save-${timestamp}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// File upload function
export function importCombatFromFile(
  file: File
): Promise<{ combatState: CombatState; combatLog: CombatLogManager } | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const saveData = JSON.parse(json) as CombatSaveData;
        const result = deserializeCombat(saveData);
        resolve(result);
      } catch (error) {
        console.error('Failed to parse combat save file:', error);
        resolve(null);
      }
    };

    reader.onerror = () => {
      console.error('Failed to read file');
      resolve(null);
    };

    reader.readAsText(file);
  });
}
```

### Phase 3: Update CombatView UI

**File:** `react-app/src/components/combat/CombatView.tsx`

#### 3.1 Add State for Error Messages

```typescript
const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
```

#### 3.2 Add Handler Functions

```typescript
// Export to file
const handleExportToFile = useCallback(() => {
  try {
    exportCombatToFile(combatState, combatLogManager);
    setSaveErrorMessage(null);
  } catch (error) {
    setSaveErrorMessage('Failed to export combat state');
    console.error(error);
  }
}, [combatState, combatLogManager]);

// Export to localStorage
const handleSaveToLocalStorage = useCallback(() => {
  try {
    const success = saveCombatToLocalStorage(combatState, combatLogManager);
    if (success) {
      setSaveErrorMessage(null);
    } else {
      setSaveErrorMessage('Failed to save to localStorage');
    }
  } catch (error) {
    setSaveErrorMessage('Failed to save to localStorage');
    console.error(error);
  }
}, [combatState, combatLogManager]);

// Import from file
const handleImportFromFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const result = await importCombatFromFile(file);
    if (result) {
      // Update state
      setCombatState(result.combatState);
      // Recreate combat log manager with loaded messages
      const newLogManager = result.combatLog;
      // Update ref
      combatLogManagerRef.current = newLogManager;

      setSaveErrorMessage(null);
    } else {
      setSaveErrorMessage('Invalid save file or corrupted data');
    }
  } catch (error) {
    setSaveErrorMessage('Failed to import combat state');
    console.error(error);
  }

  // Reset file input
  event.target.value = '';
}, []);

// Load from localStorage
const handleLoadFromLocalStorage = useCallback(() => {
  try {
    const result = loadCombatFromLocalStorage();
    if (result) {
      setCombatState(result.combatState);
      combatLogManagerRef.current = result.combatLog;
      setSaveErrorMessage(null);
    } else {
      setSaveErrorMessage('No saved combat found in localStorage');
    }
  } catch (error) {
    setSaveErrorMessage('Failed to load from localStorage');
    console.error(error);
  }
}, []);
```

#### 3.3 Update Developer Settings Panel JSX

Add new controls to the Developer Settings panel (around line 1140):

```typescript
{/* Combat Save/Load Section */}
<div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #666' }}>
  <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Combat Save/Load</h3>

  {/* Error message display */}
  {saveErrorMessage && (
    <div style={{
      color: '#ff4444',
      backgroundColor: 'rgba(255, 68, 68, 0.1)',
      padding: '8px',
      marginBottom: '10px',
      borderRadius: '4px',
      fontSize: '11px'
    }}>
      {saveErrorMessage}
    </div>
  )}

  {/* File Export/Import */}
  <div style={{ marginBottom: '10px' }}>
    <label style={{ display: 'block', marginBottom: '5px' }}>File:</label>
    <button
      onClick={handleExportToFile}
      style={{
        padding: '5px 10px',
        marginRight: '5px',
        cursor: 'pointer',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '4px'
      }}
    >
      Export
    </button>
    <label
      htmlFor="import-file-input"
      style={{
        padding: '5px 10px',
        cursor: 'pointer',
        backgroundColor: '#2196F3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        display: 'inline-block'
      }}
    >
      Import
    </label>
    <input
      id="import-file-input"
      type="file"
      accept=".json"
      onChange={handleImportFromFile}
      style={{ display: 'none' }}
    />
  </div>

  {/* LocalStorage Save/Load */}
  <div>
    <label style={{ display: 'block', marginBottom: '5px' }}>LocalStorage:</label>
    <button
      onClick={handleSaveToLocalStorage}
      style={{
        padding: '5px 10px',
        marginRight: '5px',
        cursor: 'pointer',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '4px'
      }}
    >
      Save
    </button>
    <button
      onClick={handleLoadFromLocalStorage}
      style={{
        padding: '5px 10px',
        cursor: 'pointer',
        backgroundColor: '#2196F3',
        color: 'white',
        border: 'none',
        borderRadius: '4px'
      }}
    >
      Load
    </button>
  </div>
</div>
```

### Phase 4: Testing Strategy

#### 4.1 Manual Testing Checklist

1. **Basic Save/Load**
   - [ ] Export to file during deployment phase
   - [ ] Import file and verify units are in correct positions
   - [ ] Save to localStorage during battle phase
   - [ ] Load from localStorage and verify turn number, phase, unit stats

2. **State Preservation**
   - [ ] Damage a unit, save, load - verify wounds persist
   - [ ] Use mana, save, load - verify manaUsed persists
   - [ ] Move units, save, load - verify positions persist
   - [ ] Progress turns, save, load - verify turnNumber persists

3. **Combat Log**
   - [ ] Generate multiple log messages
   - [ ] Save and load
   - [ ] Verify all messages are restored
   - [ ] Verify scroll position resets to bottom

4. **Error Handling**
   - [ ] Import invalid JSON file - verify error message
   - [ ] Import JSON with wrong schema version - verify error message
   - [ ] Import JSON with missing registry items - verify error message
   - [ ] Load from empty localStorage - verify error message
   - [ ] Verify current state is preserved on failed import

5. **Registry Dependencies**
   - [ ] Units with custom equipment - verify equipment loads correctly
   - [ ] Units with learned abilities - verify abilities restore correctly
   - [ ] Custom tilesets - verify tileset reference works
   - [ ] Humanoid vs Monster units - verify both types deserialize correctly

#### 4.2 Edge Cases

1. **Empty Combat State**
   - No units deployed yet
   - Empty combat log

2. **Maximum Complexity**
   - All deployment slots filled
   - Units with full equipment loadouts
   - Many learned abilities
   - Long combat log (100+ messages)

3. **Phase Transitions**
   - Save during deployment, load during battle (shouldn't be possible, but validate)
   - Save during victory phase

#### 4.3 Validation Testing

1. **Schema Validation**
   - Manually edit save file to have wrong version number
   - Remove required fields
   - Add unexpected fields (should be ignored)

2. **Type Validation**
   - Change unit type discriminator ('humanoid' to 'monster')
   - Invalid position coordinates (negative, out of bounds)
   - Invalid phase value

## Potential Issues and Solutions

### Issue 1: CombatState is an Interface, Not a Class

**Problem:** We can't add methods to an interface.

**Solution:** Create standalone functions `serializeCombatState()` and `deserializeCombatState()` in the same file.

### Issue 2: Unit Polymorphism (HumanoidUnit vs MonsterUnit)

**Problem:** Need to distinguish between unit types during deserialization.

**Solution:** Add a `type` discriminator field in the serialized format ('humanoid' | 'monster').

### Issue 3: Registry Dependencies

**Problem:** Deserialization requires registries to be loaded first.

**Solution:**
- Document that registries must be initialized before loading saves
- Return null from deserialization if registry lookups fail
- Show clear error message to user

### Issue 4: Missing CombatEncounter Reference

**Problem:** Victory/defeat conditions are defined in CombatEncounter, which isn't part of CombatState.

**Solution:**
- Store optional `encounterId` in save data
- Don't require it (combat can continue without victory condition checking)
- Document that saved games should ideally store encounter ID

### Issue 5: Combat Log Animation State

**Problem:** CombatLogManager has complex animation state that shouldn't be saved.

**Solution:** Only serialize message text, reconstruct CombatLogManager with instant message addition (no animation).

### Issue 6: Large Save Files

**Problem:** Full serialization could create large JSON files.

**Solution:**
- Accept the tradeoff for correctness
- Use JSON.stringify with no indentation for localStorage (compact)
- Use JSON.stringify with indentation for file downloads (readable)
- Future optimization: gzip compression if needed

## File Changes Summary

### New Files
1. `react-app/src/models/combat/CombatSaveData.ts` - Top-level serialization
2. `react-app/src/utils/combatStorage.ts` - Storage utilities

### Modified Files
1. `react-app/src/models/combat/CombatUnitManifest.ts` - Add toJSON/fromJSON
2. `react-app/src/models/combat/CombatState.ts` - Add serialize/deserialize functions
3. `react-app/src/models/combat/CombatLogManager.ts` - Add toJSON/fromJSON
4. `react-app/src/components/combat/CombatView.tsx` - Add UI controls and handlers

### Unchanged Files (Already Have Serialization)
1. `react-app/src/models/combat/CombatMap.ts` - Already has toJSON/fromJSON
2. `react-app/src/models/combat/HumanoidUnit.ts` - Already has toJSON/fromJSON
3. `react-app/src/models/combat/MonsterUnit.ts` - Already has toJSON/fromJSON
4. `react-app/src/models/combat/CombatEncounter.ts` - Already has toJSON/fromJSON

## Success Criteria

1. **Functional:**
   - [ ] Export button downloads valid JSON file
   - [ ] Import button loads and restores combat state
   - [ ] LocalStorage save/load works correctly
   - [ ] Invalid imports show error messages
   - [ ] Current state preserved on failed import

2. **Data Integrity:**
   - [ ] All unit stats restored correctly
   - [ ] All positions restored correctly
   - [ ] Combat log messages restored correctly
   - [ ] Turn number and phase restored correctly
   - [ ] Map terrain restored correctly

3. **User Experience:**
   - [ ] Clear, actionable error messages
   - [ ] Timestamped filenames for exports
   - [ ] No data loss on failed imports
   - [ ] Buttons are clearly labeled
   - [ ] Fast load times (< 1 second for typical saves)

## Timeline Estimate

1. **Phase 1 (Serialization):** 30-45 minutes
   - Add CombatUnitManifest serialization
   - Add CombatState serialization helpers
   - Add CombatLog serialization
   - Create CombatSaveData module

2. **Phase 2 (Storage):** 15-20 minutes
   - Create combatStorage utility
   - Implement file download/upload
   - Implement localStorage access

3. **Phase 3 (UI):** 20-30 minutes
   - Add state and handlers to CombatView
   - Update Developer Settings panel JSX
   - Style buttons and error messages

4. **Phase 4 (Testing):** 30-45 minutes
   - Manual testing of all scenarios
   - Edge case validation
   - Error handling verification

**Total Estimated Time:** 1.5 - 2.5 hours

## Future Enhancements

1. **Autosave:** Automatically save to localStorage at end of each turn
2. **Multiple Save Slots:** Allow saving multiple different combat states
3. **Save Metadata:** Show timestamp, turn number, phase in load menu
4. **Compression:** Gzip large save files to reduce size
5. **Cloud Storage:** Sync saves across devices
6. **Save Validation UI:** Show detailed validation errors with suggestions
7. **Replay System:** Record and replay combat actions

## Conclusion

This plan provides a comprehensive approach to adding save/load functionality to the combat system. The hybrid serialization strategy (full state for mutable objects, IDs for registry items) balances correctness with efficiency. The phased implementation allows for incremental testing and validation at each step.
