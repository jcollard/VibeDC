# Enemy AI Target Distance Calculation

**Version:** 1.0
**Last Updated:** 2025-10-31
**Related:** [CombatHierarchy.md](../../CombatHierarchy.md), [GeneralGuidelines.md](../../GeneralGuidelines.md)

## Purpose

This document specifies how enemy AI should calculate distances to potential targets (player units) when making tactical decisions. The current implementation uses Manhattan distance, which does not account for walls and obstacles, leading to poor AI behavior where enemies may prefer targets that are actually unreachable.

## Problem Statement

### Current Implementation Issue

The enemy AI behaviors ([MoveTowardNearestOpponent.ts](../../react-app/src/models/combat/ai/behaviors/MoveTowardNearestOpponent.ts), [DefeatNearbyOpponent.ts](../../react-app/src/models/combat/ai/behaviors/DefeatNearbyOpponent.ts), [AttackNearestOpponent.ts](../../react-app/src/models/combat/ai/behaviors/AttackNearestOpponent.ts)) use Manhattan distance via `AIContext.getDistance()` ([AIContext.ts:407](../../react-app/src/models/combat/ai/types/AIContext.ts#L407)):

```typescript
getDistance(from: Position, to: Position): number {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
}
```

**Problem:** This calculates the straight-line orthogonal distance without considering:
- Wall tiles that block movement
- Obstacles that require routing around
- Whether a path actually exists between the two positions

### Consequences

1. **Target Selection Errors:** Enemy may choose a target at Manhattan distance 5 that requires a path of 15 tiles (or no path at all), ignoring a target at Manhattan distance 7 that requires only 7 tiles to reach.

2. **Movement Decisions:** When selecting which position to move to, enemy may move toward a target they cannot actually reach, wasting their turn.

3. **Unrealistic Behavior:** Enemies appear to "not know" about walls, making decisions that look illogical to the player.

## Solution: BFS-Based Distance Calculation

### Overview

Replace Manhattan distance with **pathfinding distance** - the actual number of tiles in the shortest path between two positions, calculated using Breadth-First Search (BFS).

### Implementation Approach

#### 1. New Method: `getPathDistance()`

Add a new method to `AIContext` that calculates actual pathfinding distance:

```typescript
/**
 * Calculate the actual pathfinding distance between two positions.
 * Uses BFS to find the shortest valid path, accounting for walls and obstacles.
 *
 * @param from - Starting position
 * @param to - Ending position
 * @returns Distance in tiles, or Infinity if no path exists
 */
getPathDistance(from: Position, to: Position): number
```

#### 2. Leveraging Existing Pathfinding

The codebase already has `MovementPathfinder` ([MovementPathfinder.ts](../../react-app/src/models/combat/utils/MovementPathfinder.ts)) which implements BFS pathfinding with:
- Wall/obstacle detection via `map.isWalkable()`
- Unit collision handling
- Shortest path calculation

**Key Insight:** The pathfinding algorithm already calculates the distance implicitly - it's the length of the returned path.

#### 3. Algorithm

```
function getPathDistance(from, to):
  if from == to:
    return 0

  // Use BFS without maxRange limit (or very large limit)
  path = calculateBFS(from, to, maxRange=9999)

  if path is empty:
    return Infinity  // No valid path exists

  return path.length  // Number of steps in path
```

### BFS Pathfinding Details

The BFS algorithm (already implemented in `MovementPathfinder`) works as follows:

1. **Initialize:** Queue starts with starting position, visited set is empty
2. **Explore:** For each position in queue:
   - Check if it's the destination (return path)
   - Add valid orthogonal neighbors to queue
   - Valid neighbors are:
     - Within map bounds
     - Walkable tiles (not walls)
     - Not occupied by active enemy units
     - Can path through friendly units and KO'd units
3. **Track:** Each position tracks the path taken to reach it
4. **Result:** First path found is guaranteed to be shortest (BFS property)

## Examples

### Example 1: Simple Open Space (No Obstacles)

```
Map (8x8):
. . . . . . . .
. . . . . . . .
. . E . . . . .
. . . . . P . .
. . . . . . . .
. . . . . . . .
. . . . . . . .
. . . . . . . .

E = Enemy at (2, 2)
P = Player at (5, 3)
. = Walkable floor
```

**Analysis:**
- **Manhattan Distance:** |5-2| + |3-2| = 3 + 1 = 4
- **Path Distance:** 4 tiles
- **Path:** (2,2) → (3,2) → (4,2) → (5,2) → (5,3)
- **Expected Behavior:** Both methods agree, AI selects this target correctly

### Example 2: Wall Requiring Detour

```
Map (10x8):
. . . . . . . . . .
. . E . # . . . . .
. . . . # . P . . .
. . . . # . . . . .
. . . . . . . . . .
. . . . . . . . . .
. . . . . . . . . .
. . . . . . . . . .

E = Enemy at (2, 1)
P = Player at (6, 2)
# = Wall (not walkable)
. = Walkable floor
```

**Analysis:**
- **Manhattan Distance:** |6-2| + |2-1| = 4 + 1 = 5
- **Path Distance:** 9 tiles
- **Shortest Path:** (2,1) → (2,2) → (2,3) → (2,4) → (3,4) → (4,4) → (5,4) → (6,4) → (6,3) → (6,2)
  - Must route around wall by going down, right, then up
- **Impact:** Manhattan distance severely underestimates actual distance
- **Expected Behavior:** If another target exists at Manhattan distance 7 but path distance 7, that target should be preferred

### Example 3: Multiple Targets - Choosing Correctly

```
Map (12x8):
. . . . . . . . . . . .
. . E . . . . . . . . .
. . . . # # # . . . . .
. P1. . # . # . . P2 .
. . . . # # # . . . . .
. . . . . . . . . . . .
. . . . . . . . . . . .
. . . . . . . . . . . .

E  = Enemy at (2, 1)
P1 = Player 1 at (1, 3)
P2 = Player 2 at (9, 3)
#  = Wall
.  = Walkable floor
```

**Analysis for P1:**
- **Manhattan Distance:** |1-2| + |3-1| = 1 + 2 = 3
- **Path Distance:** 3 tiles
- **Path:** (2,1) → (2,2) → (1,2) → (1,3)

**Analysis for P2:**
- **Manhattan Distance:** |9-2| + |3-1| = 7 + 2 = 9
- **Path Distance:** 13 tiles
- **Path:** (2,1) → (1,1) → (1,2) → ... → (route around walls) → (9,3)

**Decision:**
- **Using Manhattan:** P1 is "nearer" (3 vs 9) - Correct choice
- **Using Path Distance:** P1 is nearer (3 vs 13) - Correct choice
- **Expected Behavior:** Both methods agree, but path distance is more accurate

### Example 4: No Path Exists (Complete Wall)

```
Map (10x8):
. . . . . # . . . .
. . E . . # . P . .
. . . . . # . . . .
. . . . . # . . . .
. . . . . # . . . .
. . . . . # . . . .
. . . . . # . . . .
. . . . . # . . . .

E = Enemy at (2, 1)
P = Player at (7, 1)
# = Wall (vertical barrier)
. = Walkable floor
```

**Analysis:**
- **Manhattan Distance:** |7-2| + |1-1| = 5 + 0 = 5
- **Path Distance:** Infinity (no path exists)
- **BFS Result:** Returns empty path
- **Expected Behavior:**
  - AI should **not** select this target if any reachable target exists
  - If this is the only target, AI should recognize it cannot reach it
  - Fallback behavior (e.g., DefaultBehavior) should trigger

### Example 5: Narrow Corridor - Path Much Longer Than Manhattan

```
Map (12x10):
. . . . . . . . . . . .
. E . . . . . . . . . .
. # # # # # # # # # # .
. # . . . . . . . . # .
. # . # # # # # . . # .
. # . # . . . # . . # .
. # . # . P . # . . # .
. # . # # # # # . . # .
. # . . . . . . . . # .
. # # # # # # # # # # .

E = Enemy at (1, 1)
P = Player at (5, 6)
# = Wall
. = Walkable floor
```

**Analysis:**
- **Manhattan Distance:** |5-1| + |6-1| = 4 + 5 = 9
- **Path Distance:** ~25 tiles
- **Path:** Must navigate through the maze:
  - (1,1) → (1,2) → (2,2) → ... (enter corridor) ...
  - Navigate through narrow passages
  - ... → (5,6)
- **Impact:** Manhattan distance of 9 suggests target is "close", but actual distance is nearly 3x longer
- **Expected Behavior:** If another target exists with Manhattan distance 15 but path distance 15, that target may actually be more tactically sound to pursue

### Example 6: Routing Around Friendly Units

```
Map (8x6):
. . . . . . . .
. E1 . . . . . .
. . A1 A2 . . . .
. . . . . P . .
. . . . . . . .
. . . . . . . .

E1 = Enemy at (1, 1)
A1 = Allied Enemy at (2, 2) - not KO'd
A2 = Allied Enemy at (3, 2) - not KO'd
P  = Player at (5, 3)
.  = Walkable floor
```

**Analysis:**
- **Manhattan Distance:** |5-1| + |3-1| = 4 + 2 = 6
- **Path Distance (with friendly pathing):** 6 tiles
- **Path:** (1,1) → (2,1) → (3,1) → (4,1) → (5,1) → (5,2) → (5,3)
  - OR: (1,1) → (1,2) → (1,3) → (2,3) → (3,3) → (4,3) → (5,3)
  - Can path through friendly units (per MovementPathfinder rules)
- **Note:** Even though friendly units are "in the way", BFS allows pathing through them
- **Expected Behavior:** Path distance remains accurate even with friendly units present

### Example 7: KO'd Units Don't Block Pathing

```
Map (8x6):
. . . . . . . .
. E . . . . . .
. . K1 K2 . . . .
. . . . . P . .
. . . . . . . .
. . . . . . . .

E  = Enemy at (1, 1)
K1 = KO'd unit at (2, 2)
K2 = KO'd unit at (3, 2)
P  = Player at (5, 3)
.  = Walkable floor
```

**Analysis:**
- **Manhattan Distance:** |5-1| + |3-1| = 4 + 2 = 6
- **Path Distance:** 6 tiles
- **Path:** (1,1) → (2,1) → (3,1) → (4,1) → (5,1) → (5,2) → (5,3)
  - Can path through KO'd units (per MovementPathfinder rules)
- **Expected Behavior:** KO'd units treated as passable, distance calculation unaffected

## Implementation Checklist

### Phase 1: Add Path Distance Method

- [ ] Add `getPathDistance(from: Position, to: Position): number` to `AIContext` interface
- [ ] Implement in `AIContextBuilder` (delegate to pathfinding utility)
- [ ] Create pathfinding utility that wraps `MovementPathfinder.calculatePath()` without movement range limit
- [ ] Return `Infinity` if no path exists
- [ ] Return `0` if from === to
- [ ] Add unit tests for `getPathDistance()`

### Phase 2: Update AI Behaviors

**Update the following behavior files to use `getPathDistance()` instead of `getDistance()`:**

- [ ] `MoveTowardNearestOpponent.ts`
  - Line 46-49: Finding nearest enemy
  - Line 52: Distance comparison
  - Line 64: Distance to enemy from movement position

- [ ] `DefeatNearbyOpponent.ts`
  - Line 105: Distance comparison when selecting target

- [ ] `AttackNearestOpponent.ts`
  - Line 45-48: Finding nearest target
  - Line 51: Distance comparison

### Phase 3: Handle Unreachable Targets

- [ ] Update behaviors to handle `Infinity` distance (unreachable targets)
- [ ] Filter out unreachable targets before selection
- [ ] Add logging when targets are unreachable
- [ ] Ensure fallback behavior (DefaultBehavior) triggers when no reachable targets

### Phase 4: Testing

- [ ] Create test encounters with walls
- [ ] Verify AI chooses reachable targets over unreachable ones
- [ ] Verify AI routes around obstacles correctly
- [ ] Test edge case: all targets unreachable
- [ ] Test performance (BFS for each target may be expensive)

### Phase 5: Performance Optimization (Future)

- [ ] Consider caching path distances if performance is an issue
- [ ] Profile AI decision time with new algorithm
- [ ] Optimize if necessary (e.g., early exit, distance heuristics)

## Design Decisions

### Why Not Keep Manhattan Distance?

**Manhattan distance is fundamentally incorrect for this use case:**
- It assumes a straight-line path always exists
- In tactical games with obstacles, this assumption is false
- Leads to objectively wrong decisions (choosing unreachable targets)

### Performance Considerations

**Concern:** Running BFS for every potential target could be expensive.

**Mitigation:**
1. Enemy turns are relatively infrequent (player has many units)
2. Number of targets is typically small (3-6 player units)
3. BFS is fast for small maps (typical combat map is 20x20 or less)
4. Correct behavior is more important than micro-optimizations
5. Can optimize later if profiling shows issues

**Estimated Cost:**
- BFS on 20x20 map: ~400 positions maximum
- Typical case: ~50-100 positions explored
- Per target check: <1ms
- For 4 targets: ~4ms total
- **Acceptable** for turn-based game

### Should We Keep getDistance()?

**Yes, keep Manhattan distance available as `getDistance()`:**
- Some use cases don't require pathfinding (e.g., range calculations)
- Attack range uses straight-line distance with line-of-sight
- Manhattan distance is still useful for quick approximations
- Having both methods provides flexibility

**Rename for Clarity:**
- Keep: `getDistance()` → Manhattan distance (fast, approximate)
- Add: `getPathDistance()` → BFS distance (accurate, considers obstacles)
- Documentation should clarify when to use each

## Related Systems

### Movement Range Calculation

`MovementRangeCalculator` already uses BFS to find all reachable tiles within movement range. This is similar to our path distance calculation, but:
- Limits search by movement range
- Returns all reachable positions (not just path to one target)
- Could potentially be leveraged for optimization

### Attack Range Calculation

`AttackRangeCalculator` uses Manhattan distance with line-of-sight checks. This is **correct** for attack range because:
- Ranged attacks don't require a path (projectile flies over obstacles)
- Line-of-sight is a separate check (can you see target?)
- Attack range should remain using Manhattan distance

## Testing Strategy

### Unit Tests

Create tests in `AIContext.test.ts`:

```typescript
describe('getPathDistance', () => {
  test('returns 0 for same position', () => { ... });
  test('returns correct distance in open space', () => { ... });
  test('returns Infinity when no path exists', () => { ... });
  test('calculates longer path around walls', () => { ... });
  test('handles friendly units (can path through)', () => { ... });
  test('handles enemy units (cannot path through)', () => { ... });
  test('handles KO\'d units (can path through)', () => { ... });
});
```

### Integration Tests

Create test encounters to verify AI behavior:

1. **Test Encounter: Wall Between Targets**
   - Two player units, one reachable, one behind wall
   - Verify enemy chooses reachable target

2. **Test Encounter: Maze Navigation**
   - Player unit in maze requiring complex path
   - Verify enemy attempts to navigate toward player

3. **Test Encounter: All Targets Unreachable**
   - Player units all behind impassable walls
   - Verify enemy falls back to default behavior

## References

- Current AI Behaviors:
  - [MoveTowardNearestOpponent.ts](../../react-app/src/models/combat/ai/behaviors/MoveTowardNearestOpponent.ts)
  - [DefeatNearbyOpponent.ts](../../react-app/src/models/combat/ai/behaviors/DefeatNearbyOpponent.ts)
  - [AttackNearestOpponent.ts](../../react-app/src/models/combat/ai/behaviors/AttackNearestOpponent.ts)

- AI Context:
  - [AIContext.ts](../../react-app/src/models/combat/ai/types/AIContext.ts)
  - [AIBehavior.ts](../../react-app/src/models/combat/ai/types/AIBehavior.ts)

- Pathfinding:
  - [MovementPathfinder.ts](../../react-app/src/models/combat/utils/MovementPathfinder.ts)
  - [MovementRangeCalculator.ts](../../react-app/src/models/combat/utils/MovementRangeCalculator.ts)

- Related Documentation:
  - [CombatHierarchy.md](../../CombatHierarchy.md) - Section 3.5 (AI Behavior System)
  - [GeneralGuidelines.md](../../GeneralGuidelines.md)

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-31 | AI Agent | Initial document creation with examples and implementation plan |
