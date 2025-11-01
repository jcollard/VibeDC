import type { EventPrecondition, EventPreconditionJSON } from '../EventPrecondition';
import { GlobalVariableIs } from './GlobalVariableIs';
import { GlobalVariableIsGreaterThan } from './GlobalVariableIsGreaterThan';
import { GlobalVariableIsLessThan } from './GlobalVariableIsLessThan';

/**
 * Factory for creating precondition instances from JSON.
 * Centralizes deserialization logic.
 */
export class PreconditionFactory {
  static fromJSON(json: EventPreconditionJSON): EventPrecondition {
    switch (json.type) {
      case "GlobalVariableIs":
        return GlobalVariableIs.fromJSON(json);
      case "GlobalVariableIsGreaterThan":
        return GlobalVariableIsGreaterThan.fromJSON(json);
      case "GlobalVariableIsLessThan":
        return GlobalVariableIsLessThan.fromJSON(json);
      default:
        throw new Error(`Unknown precondition type: ${json.type}`);
    }
  }
}
