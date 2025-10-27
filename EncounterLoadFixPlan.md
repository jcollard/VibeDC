# Encounter Load Fix Plan

## Problem Statement

When loading a save file that was created during the Deployment Phase, the deployment zones are not properly available because the `CombatEncounter` object (which contains `playerDeploymentZones`) is not being restored from the save data.

**Root Cause:**
- `CombatView` receives `encounter` as a prop, which never changes
- When saving, the `encounter.id` is not passed to save functions
- When loading, the `encounterId` field in save data is unused
- Result: Loaded `combatState` has deployed units, but encounter data (deployment zones, victory conditions, etc.) comes from the original prop

## Solution Overview

Save and restore the `encounter.id` in save files, then reload the full `CombatEncounter` from the registry when loading a save.

**Key Assumption:** Encounters are always present in the registry. If an encounter is missing, this indicates a larger issue.

## Implementation Plan

### Phase 1: Update Save Operations to Include Encounter ID

**File:** `react-app/src/components/combat/CombatView.tsx`

**Changes:**
1. Line ~1076: Pass `encounter.id` to `saveCombatToLocalStorage(combatState, combatLogManager, encounter.id)`
2. Line ~1066: Pass `encounter.id` to `exportCombatToFile(combatState, combatLogManager, encounter.id)`

**Testing:** Verify that saved files now include `"encounterId": "encounter-id-here"` in JSON

---

### Phase 2: Add Loaded Encounter Ref in CombatView

**File:** `react-app/src/components/combat/CombatView.tsx`

**Changes:**
1. Add ref to track loaded encounter: `const loadedEncounterRef = useRef<CombatEncounter | null>(null);`
2. Create helper to get active encounter: `const activeEncounter = loadedEncounterRef.current ?? encounter;`
3. Replace all `encounter` references with `activeEncounter` throughout the component

**Rationale:** Using a ref (Option A) maintains backward compatibility while allowing encounter override

---

### Phase 3: Update Load Operations to Use Encounter ID

**File:** `react-app/src/components/combat/CombatView.tsx`

**Changes in `handleLoadReady()` function:**

1. After loading save data, check for `encounterId`:
   ```typescript
   if (result) {
     // Check if save has encounter ID
     if (result.encounterId) {
       const loadedEncounter = CombatEncounter.getById(result.encounterId);

       if (!loadedEncounter) {
         return {
           success: false,
           error: `Encounter '${result.encounterId}' not found in registry. This indicates a data integrity issue.`
         };
       }

       // Store loaded encounter to override prop
       loadedEncounterRef.current = loadedEncounter;
     } else {
       // Old save format without encounterId - log warning
       console.warn('[CombatView] Loading save file without encounterId. This is an old save format. Using encounter from props.');
       loadedEncounterRef.current = null; // Use prop encounter
     }

     // ... rest of existing logic
   }
   ```

**Import required:**
- Add `import { CombatEncounter } from '../../models/combat/CombatEncounter';`

---

### Phase 4: Replace Encounter References

**File:** `react-app/src/components/combat/CombatView.tsx`

**Changes:**
Search and replace all references to `encounter` with `activeEncounter` in:
- `phaseHandlerRef.current.update(combatState, activeEncounter, deltaTime)`
- `renderFrame()` calls
- `handleMapClick()` calls
- Event handlers
- Any other encounter usage

**Exception:** Keep the original `encounter` prop declaration in props interface

---

### Phase 5: Error Handling & Edge Cases

**Cases to handle:**

1. **Save has `encounterId` but encounter not in registry**
   - Return error: "Encounter not found in registry. This indicates a data integrity issue."
   - Prevent load from completing

2. **Save has no `encounterId` (old save format)**
   - Log warning to console
   - Use original `encounter` prop (backward compatibility)
   - Allow load to complete

3. **Encounter ID doesn't match current encounter prop**
   - Use loaded encounter (this is desired behavior)
   - User loaded a different encounter's save

---

## Implementation Order

1. ✅ **Step 1**: Update save operations to pass `encounter.id` (Safe, no breaking changes)
2. **Step 2**: Add `loadedEncounterRef` and `activeEncounter` helper
3. **Step 3**: Update `handleLoadReady()` to load encounter from registry with error handling
4. **Step 4**: Replace all `encounter` references with `activeEncounter`
5. **Step 5**: Manual testing - save during deployment phase, load, verify deployment zones work
6. **Step 6**: Manual testing - load old save without `encounterId`, verify backward compatibility

---

## Testing Checklist

- [ ] Save during deployment phase → Verify JSON contains `encounterId`
- [ ] Load save from deployment phase → Verify deployment zones are available
- [ ] Load save from battle phase → Verify victory/defeat conditions work
- [ ] Load old save without `encounterId` → Verify console warning appears and fallback works
- [ ] Load save with invalid `encounterId` → Verify error message appears
- [ ] Load save from different encounter → Verify correct encounter loads

---

## Risk Assessment

**Low Risk:**
- Phase 1 (saving encounter ID) - additive change, no breaking behavior

**Medium Risk:**
- Phase 4 (replacing encounter references) - many references to update, potential for missed ones

**Mitigation:**
- Use Find/Replace in IDE to ensure all references are caught
- Test each major encounter usage (deployment, battle, victory/defeat)

---

## Files Modified Summary

1. `react-app/src/components/combat/CombatView.tsx`
   - Add `loadedEncounterRef`
   - Add `activeEncounter` helper
   - Update save calls to pass `encounter.id`
   - Update load logic to reload encounter from registry
   - Replace `encounter` with `activeEncounter` throughout

---

## Notes

- No version bump needed (game not released)
- Console warning added for old save format detection (per requirement)
- Encounter registry is assumed to be populated when CombatView renders
- This fix applies to all phases, not just deployment (more complete solution)
