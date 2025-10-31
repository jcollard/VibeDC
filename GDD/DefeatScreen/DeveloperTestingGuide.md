# Defeat Screen - Developer Testing Guide

## Quick Testing with Developer Console

### Force Defeat Screen (Instant)

To quickly test the defeat screen without playing through combat, use the developer console:

```javascript
// In browser console during combat:
forceDefeat()
```

This will immediately transition to the defeat screen, allowing you to test:
- Modal rendering
- Button hover states
- Try Again functionality
- Skip Encounter button (placeholder)

### Other Developer Functions

```javascript
// Set hit rate override (0.0 to 1.0)
setHitRate(1.0)  // Always hit
setHitRate(0.0)  // Always miss

// Set damage override
setDamage(999)   // Deal 999 damage per hit

// Clear overrides
clearAttackOverride()
```

## Manual Testing Workflow

### Test Scenario 1: Quick Defeat Screen Test

1. Start a combat encounter
2. Open browser console (F12)
3. Type `forceDefeat()` and press Enter
4. Verify defeat screen appears with:
   - Semi-transparent black overlay
   - Centered modal panel
   - Red "Defeat" title
   - "Try Again" button (white text)
   - "Skip Encounter" button (white text)
   - Helper text for both buttons

### Test Scenario 2: Try Again Button

1. Use `forceDefeat()` to show defeat screen
2. Hover over "Try Again" button
3. Verify text turns yellow
4. Click "Try Again" button
5. Verify combat resets to initial state (after deployment phase)
6. Verify all units are at starting positions and full health

### Test Scenario 3: Natural Defeat

If you want to test the natural defeat flow:

```javascript
// Make your units easy to kill:
setHitRate(1.0)   // Enemy always hits
setDamage(999)    // Enemy deals massive damage

// Then let the enemy attack your units
// Combat will transition to defeat screen when all players are KO'd
```

### Test Scenario 4: Multiple Retries

1. Use `forceDefeat()` to show defeat screen
2. Click "Try Again"
3. Use `forceDefeat()` again
4. Click "Try Again" again
5. Verify the snapshot is still valid after multiple retries

### Test Scenario 5: Skip Encounter (Placeholder)

1. Use `forceDefeat()` to show defeat screen
2. Hover over "Skip Encounter" button
3. Verify text turns yellow
4. Click "Skip Encounter" button
5. Check console - should see: `[DefeatPhaseHandler] Skip encounter clicked (not yet implemented)`
6. Nothing else should happen (this is expected - feature not yet implemented)

## Expected Console Output

When using `forceDefeat()`:

```
[DEV] Forcing defeat screen transition...
```

When clicking "Try Again" (if snapshot exists):

```
[DefeatPhaseHandler] Combat state restored from initial snapshot
```

When clicking "Try Again" (if NO snapshot exists):

```
[DefeatPhaseHandler] No initial state snapshot available for retry
```

When clicking "Skip Encounter":

```
[DefeatPhaseHandler] Skip encounter clicked (not yet implemented)
```

## Known Issues During Testing

### Issue: "Try Again" doesn't work

**Cause**: No initial state snapshot exists

**Solutions**:
1. Restart combat from the beginning (don't load from save)
2. Let the deployment phase complete normally
3. The snapshot is created when transitioning from enemy-deployment to action-timer

**Check**: Look in console for:
```
[EnemyDeploymentPhaseHandler] Initial state snapshot created for Try Again functionality
```

### Issue: Defeat screen doesn't appear

**Cause**: Using `forceDefeat()` outside of combat

**Solution**: Make sure you're in combat phase first. The function only works when CombatView is mounted.

### Issue: Buttons don't respond to clicks

**Cause**: Mouse coordinates not being translated correctly

**Solution**: This is a bug - please report with:
1. Browser type and version
2. Screen resolution
3. Window size
4. Whether browser is zoomed

## Testing Checklist

Before marking the feature as "Tested":

- [ ] `forceDefeat()` successfully shows defeat screen
- [ ] Defeat modal renders correctly (overlay, panel, title, buttons, helper text)
- [ ] "Try Again" button hover state works (turns yellow)
- [ ] "Skip Encounter" button hover state works (turns yellow)
- [ ] "Try Again" button click restores combat to initial state
- [ ] Multiple "Try Again" attempts work correctly
- [ ] Snapshot is created during normal combat flow
- [ ] Natural defeat (all players KO'd) transitions to defeat screen
- [ ] Console shows no errors during any of the above

## Automation Notes

While automated testing wasn't part of the initial implementation, here are areas that could benefit from automated tests in the future:

1. **Unit Tests**:
   - `AllPlayersDefeatedPredicate.evaluate()`
   - `AllEnemiesDefeatedPredicate.evaluate()`
   - `serializeCombatState()` includes `initialStateSnapshot`
   - `deserializeCombatState()` restores `initialStateSnapshot`

2. **Integration Tests**:
   - Snapshot creation during phase transition
   - Defeat screen rendering (snapshot testing)
   - Button click handling
   - State restoration from snapshot

3. **E2E Tests**:
   - Natural defeat flow
   - Try Again functionality end-to-end
   - Multiple retry attempts

## Debugging Tips

### Enable Verbose Logging

Add this to browser console to see detailed phase transitions:

```javascript
localStorage.setItem('debug', 'combat:*')
```

### Inspect Combat State

```javascript
// View current combat state (in React DevTools)
// Or add to CombatView.tsx temporarily:
console.log('Current combat state:', combatState);
```

### Check Snapshot Contents

Add to DefeatPhaseHandler.handleTryAgain (temporarily):

```typescript
console.log('Initial snapshot:', state.initialStateSnapshot);
console.log('Deserialized state:', restoredState);
```

## Contact

If you encounter any issues during testing, please:
1. Check console for error messages
2. Note which test scenario failed
3. Capture screenshots if rendering is incorrect
4. Create an issue with reproduction steps
