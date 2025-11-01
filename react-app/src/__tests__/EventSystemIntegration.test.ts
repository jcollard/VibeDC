import { describe, it, expect, beforeEach } from 'vitest';
import { AreaMapDataLoader } from '../services/AreaMapDataLoader';
import { AreaMapRegistry } from '../utils/AreaMapRegistry';
import { EventProcessor } from '../utils/EventProcessor';
import type { GameState } from '../models/area/EventPrecondition';
import areaTilesetYaml from '../data/area-tileset-database.yaml?raw';
import areaMapYaml from '../data/area-map-database.yaml?raw';

describe('Event System Integration', () => {
  let processor: EventProcessor;
  let gameState: GameState;

  beforeEach(async () => {
    // Load test data
    await AreaMapDataLoader.loadAll(areaTilesetYaml, areaMapYaml);

    processor = new EventProcessor();
    gameState = {
      globalVariables: new Map(),
      messageLog: [],
      triggeredEventIds: new Set(),
    };
  });

  it('should load demo map with event areas', () => {
    const map = AreaMapRegistry.getById('event-demo-map');
    expect(map).toBeDefined();
    expect(map!.eventAreas).toBeDefined();
    expect(map!.eventAreas!.length).toBeGreaterThan(0);
  });

  it('should process events in demo map', () => {
    const map = AreaMapRegistry.getById('event-demo-map');
    expect(map).toBeDefined();

    // Enter entrance area (x: 1-3, y: 1-2) - move from OUTSIDE to INSIDE
    let state = processor.processMovement(gameState, map!, 2, 3, 2, 1);

    // Should have welcome message
    expect(state.messageLog!.some(m => m.text.includes('Welcome'))).toBe(true);
    expect(state.globalVariables.get('visited-demo')).toBe(true);

    // Re-enter should not show message again (one-time)
    // Move out and back in to trigger on-enter again
    state = processor.processMovement(state, map!, 2, 1, 2, 3); // Move out
    state = processor.processMovement(state, map!, 2, 3, 2, 1); // Move back in
    const welcomeCount = state.messageLog!.filter(m => m.text.includes('Welcome')).length;
    expect(welcomeCount).toBe(1);
  });

  it('should handle door unlock sequence', () => {
    const map = AreaMapRegistry.getById('event-demo-map');
    let state = gameState;

    // Initialize has-demo-key as false
    state = {
      ...state,
      globalVariables: new Map(state.globalVariables).set('has-demo-key', false)
    };

    // Try door without key (x: 4, y: 3) - need to STEP on the door (stay on it)
    // First enter the tile
    state = processor.processMovement(state, map!, 4, 2, 4, 3);
    // Then step on it (trigger on-step event)
    state = processor.processMovement(state, map!, 4, 3, 4, 3);
    expect(state.messageLog!.some(m => m.text.includes('locked'))).toBe(true);

    // Get key (x: 7, y: 1) - need to STEP on the key tile
    state = processor.processMovement(state, map!, 7, 2, 7, 1); // Enter
    state = processor.processMovement(state, map!, 7, 1, 7, 1); // Step (trigger on-step event)
    expect(state.globalVariables.get('has-demo-key')).toBe(true);

    // Try door with key - need to step on the door again
    state = processor.processMovement(state, map!, 4, 2, 4, 3); // Enter
    state = processor.processMovement(state, map!, 4, 3, 4, 3); // Step (trigger on-step event)
    expect(state.messageLog!.some(m => m.text.includes('unlock'))).toBe(true);
    expect(state.globalVariables.get('door-unlocked')).toBe(true);
  });

  it('should fire exit events', () => {
    const map = AreaMapRegistry.getById('event-demo-map');
    let state = gameState;

    // Initialize the global variable for precondition test
    state = {
      ...state,
      globalVariables: new Map(state.globalVariables).set('entered-counter-area', true)
    };

    // Enter counter area (x: 5-7, y: 4) from outside
    state = processor.processMovement(state, map!, 5, 3, 5, 4);
    // The on-enter event should have set the variable (it's already set in our test state)

    // Exit counter area - move from (5,4) to outside the area at (5,3)
    state = processor.processMovement(state, map!, 5, 4, 5, 3);
    expect(state.messageLog!.some(m => m.text.includes('Thanks for visiting'))).toBe(true);
  });
});
