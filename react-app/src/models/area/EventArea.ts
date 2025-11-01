import type { EventTrigger } from './EventTrigger';
import type { EventPrecondition, EventPreconditionJSON } from './EventPrecondition';
import type { EventAction, EventActionJSON } from './EventAction';

/**
 * Represents a single event that can be triggered in an event area
 */
export interface AreaEvent {
  /**
   * Unique identifier for this event (within parent EventArea)
   */
  id: string;

  /**
   * When this event should trigger
   */
  trigger: EventTrigger;

  /**
   * Conditions that must ALL be true for event to fire
   */
  preconditions: EventPrecondition[];

  /**
   * Actions to execute when event fires (in order)
   */
  actions: EventAction[];

  /**
   * If true, event only triggers once per game (not once per entry)
   */
  oneTime?: boolean;

  /**
   * Tracks if one-time event has been triggered
   */
  triggered?: boolean;

  /**
   * Optional human-readable description
   */
  description?: string;
}

/**
 * Represents a rectangular area on the map that can trigger events
 */
export interface EventArea {
  /**
   * Unique identifier for this event area
   */
  id: string;

  /**
   * Top-left X coordinate (grid position)
   */
  x: number;

  /**
   * Top-left Y coordinate (grid position)
   */
  y: number;

  /**
   * Width in tiles
   */
  width: number;

  /**
   * Height in tiles
   */
  height: number;

  /**
   * Events that can trigger in this area
   */
  events: AreaEvent[];

  /**
   * Optional human-readable description
   */
  description?: string;
}

/**
 * JSON representation of an EventArea
 */
export interface EventAreaJSON {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  events: AreaEventJSON[];
  description?: string;
}

/**
 * JSON representation of an AreaEvent
 */
export interface AreaEventJSON {
  id: string;
  trigger: EventTrigger;
  preconditions: EventPreconditionJSON[];
  actions: EventActionJSON[];
  oneTime?: boolean;
  triggered?: boolean;
  description?: string;
}

/**
 * Helper function to check if a position is within the event area bounds
 */
export function isPositionInEventArea(area: EventArea, x: number, y: number): boolean {
  return x >= area.x &&
         x < area.x + area.width &&
         y >= area.y &&
         y < area.y + area.height;
}

/**
 * Gets all events in this area with a specific trigger type
 */
export function getEventsByTrigger(area: EventArea, trigger: EventTrigger): AreaEvent[] {
  return area.events.filter(event => event.trigger === trigger);
}

/**
 * Gets all one-time events that have not been triggered yet
 */
export function getPendingOneTimeEvents(area: EventArea): AreaEvent[] {
  return area.events.filter(event => event.oneTime && !event.triggered);
}
