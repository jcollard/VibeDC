import type { AreaMap } from '../models/area/AreaMap';
import type { EventArea } from '../models/area/EventArea';
import { EventTrigger } from '../models/area/EventTrigger';
import type { GameState } from '../models/area/EventPrecondition';
import { isPositionInEventArea } from '../models/area/EventArea';

/**
 * Processes events based on player movement.
 *
 * Guidelines Compliance:
 * - Returns NEW game state (immutable pattern)
 * - No side effects except logging
 * - Efficient O(n) processing where n = number of event areas
 */
export class EventProcessor {
  /**
   * Process movement and trigger appropriate events.
   *
   * Algorithm:
   * 1. Determine which event areas contain previous and current positions
   * 2. Calculate entered, stayed-in, and exited areas
   * 3. Process OnExit events (player leaving areas)
   * 4. Process OnEnter events (player entering new areas)
   * 5. Process OnStep events (player still in areas)
   *
   * @param gameState Current game state
   * @param areaMap Current area map
   * @param previousX Previous player X position
   * @param previousY Previous player Y position
   * @param currentX Current player X position
   * @param currentY Current player Y position
   * @returns Modified game state after processing events
   */
  processMovement(
    gameState: GameState,
    areaMap: AreaMap,
    previousX: number,
    previousY: number,
    currentX: number,
    currentY: number
  ): GameState {
    let newState = gameState;

    // Get event areas at previous and current positions
    const previousAreas = new Set(
      (areaMap.eventAreas || [])
        .filter(area => isPositionInEventArea(area, previousX, previousY))
        .map(area => area.id)
    );

    const currentAreas = new Set(
      (areaMap.eventAreas || [])
        .filter(area => isPositionInEventArea(area, currentX, currentY))
        .map(area => area.id)
    );

    // Determine area transitions
    const enteredAreaIds = Array.from(currentAreas).filter(id => !previousAreas.has(id));
    const stayedInAreaIds = Array.from(currentAreas).filter(id => previousAreas.has(id));
    const exitedAreaIds = Array.from(previousAreas).filter(id => !currentAreas.has(id));

    // Get EventArea objects
    const eventAreasMap = new Map((areaMap.eventAreas || []).map(area => [area.id, area]));

    // Process OnExit events first (player leaving areas)
    for (const areaId of exitedAreaIds) {
      const area = eventAreasMap.get(areaId);
      if (area) {
        newState = this.processAreaEvents(newState, area, EventTrigger.OnExit);
      }
    }

    // Process OnEnter events (player entering new areas)
    for (const areaId of enteredAreaIds) {
      const area = eventAreasMap.get(areaId);
      if (area) {
        newState = this.processAreaEvents(newState, area, EventTrigger.OnEnter);
      }
    }

    // Process OnStep events (player still in areas)
    for (const areaId of stayedInAreaIds) {
      const area = eventAreasMap.get(areaId);
      if (area) {
        newState = this.processAreaEvents(newState, area, EventTrigger.OnStep);
      }
    }

    return newState;
  }

  /**
   * Process all events in an area with matching trigger type.
   *
   * @param gameState Current game state
   * @param area Event area to process
   * @param triggerType Trigger type to match
   * @returns Modified game state
   */
  private processAreaEvents(
    gameState: GameState,
    area: EventArea,
    triggerType: EventTrigger
  ): GameState {
    let newState = gameState;

    for (const event of area.events) {
      // Skip if trigger type doesn't match
      if (event.trigger !== triggerType) {
        continue;
      }

      // Skip if one-time event already triggered
      if (event.oneTime && this.isEventTriggered(newState, event.id)) {
        continue;
      }

      // Evaluate all preconditions
      const allPreconditionsPass = event.preconditions.every(precondition => {
        try {
          return precondition.evaluate(newState);
        } catch (error) {
          console.error(`Error evaluating precondition in event ${event.id}:`, error);
          return false;
        }
      });

      if (!allPreconditionsPass) {
        continue;
      }

      // Execute all actions in order
      for (const action of event.actions) {
        try {
          newState = action.execute(newState);
        } catch (error) {
          console.error(`Error executing action in event ${event.id}:`, error);
        }
      }

      // Mark one-time event as triggered
      if (event.oneTime) {
        newState = this.markEventTriggered(newState, event.id);
      }
    }

    return newState;
  }

  /**
   * Check if a one-time event has been triggered.
   *
   * @param state Game state
   * @param eventId Event ID to check
   * @returns true if event has been triggered
   */
  private isEventTriggered(state: GameState, eventId: string): boolean {
    return state.triggeredEventIds?.has(eventId) ?? false;
  }

  /**
   * Mark a one-time event as triggered.
   *
   * Guidelines Compliance:
   * - Creates NEW Set (immutable pattern)
   *
   * @param state Game state
   * @param eventId Event ID to mark
   * @returns Modified game state
   */
  private markEventTriggered(state: GameState, eventId: string): GameState {
    const newTriggeredIds = new Set<string>(state.triggeredEventIds || new Set<string>());
    newTriggeredIds.add(eventId);

    return {
      ...state,
      triggeredEventIds: newTriggeredIds,
    };
  }
}
