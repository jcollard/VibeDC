# Debugging the Hover Issue

## Debug Tools Available

I've added a **CombatDebugger** utility that you can use in the browser console to simulate mouse events and trace the hover event flow.

## How to Use the Debugger

### 1. Open the combat view in your browser
Start a combat encounter to get to the deployment phase.

### 2. Open Browser Console
Press F12 or right-click and select "Inspect" → "Console"

### 3. Available Commands

#### Show Help
```javascript
CombatDebugger.help()
```

#### Enable Detailed Logging
```javascript
CombatDebugger.enableHoverLogging()
```
This will log every hover event as it flows through the system:
- DeploymentPhaseHandler.handleInfoPanelHover
- PartyMembersContent.handleHover
- Hover state updates

#### Get Canvas Info
```javascript
CombatDebugger.getCanvasInfo()
```
Shows:
- Canvas dimensions
- Display size and scaling
- Common panel regions

#### Simulate Hover at Specific Position
```javascript
// Hover over bottom info panel (party members)
CombatDebugger.simulateHover(260, 130)

// Hover over different positions
CombatDebugger.simulateHover(300, 150)
CombatDebugger.simulateHover(320, 170)
```

#### Simulate Click
```javascript
CombatDebugger.simulateClick(260, 130)
```

#### Disable Logging
```javascript
CombatDebugger.disableHoverLogging()
```

## Debugging the Hover Issue

### Step 1: Enable Logging
```javascript
CombatDebugger.enableHoverLogging()
```

### Step 2: Get Panel Region Info
```javascript
CombatDebugger.getCanvasInfo()
```
This will show you the exact canvas coordinates for the bottom info panel.

### Step 3: Simulate Hover
```javascript
// Try hovering at the center of the bottom panel
CombatDebugger.simulateHover(318, 168)

// Or try different positions within the panel
CombatDebugger.simulateHover(260, 130)  // Top-left area
CombatDebugger.simulateHover(320, 160)  // Center
CombatDebugger.simulateHover(370, 200)  // Bottom-right
```

### Step 4: Check Console Output
You should see logs like:
```
[DeploymentPhaseHandler] handleInfoPanelHover at (66, 48)
[DeploymentPhaseHandler] handleHover returned: 0
[DeploymentPhaseHandler] Updated hover index to: 0
```

### What to Look For

**If hover IS working:**
- You'll see the party member name change color to #ccaa00 (dark yellow)
- Logs show the correct member index (0-3)
- `updateHoveredIndex` is called with the correct index

**If hover is NOT working:**
- Check if `handleInfoPanelHover` is being called at all
- Check what `handleHover` is returning (should be a number 0-3 or null)
- Check if `updateHoveredIndex` is being called
- Check the coordinates - are they within the panel bounds?

## Panel Layout Reference

The **bottom info panel** (party members during deployment):
- **Canvas coordinates:** x=252, y=120, width=132, height=96
- **Grid position:** Rows 10-17, Columns 21-31

To hover over the first party member, try:
```javascript
CombatDebugger.simulateHover(280, 145)
```

## Common Issues to Check

1. **Is the phase handler method being called?**
   - If you don't see `[DeploymentPhaseHandler] handleInfoPanelHover` logs, the event isn't reaching the phase handler

2. **Is hover detection returning the correct index?**
   - Look for `handleHover returned: X` in the logs
   - Should be 0, 1, 2, or 3 for party members, or null if not hovering

3. **Is the hover state being updated on the cached instance?**
   - Look for `Updated hover index to: X` in the logs
   - This confirms `updateHoveredIndex` was called

4. **Is the same instance being rendered?**
   - The cached instance should be created once and reused
   - Look for `Created cachedPartyMembersContent` - should only appear once per deployment phase

## Next Steps

After running the debugger:

1. Share the console output so we can see what's happening
2. Try hovering manually and see if any logs appear
3. Try the simulate commands and compare the output
4. Check if clicking works (it should if hover detection is working)

The debug logging will help us identify exactly where in the event flow things are breaking down.
