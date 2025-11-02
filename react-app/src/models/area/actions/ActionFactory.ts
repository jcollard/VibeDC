import type { EventAction, EventActionJSON } from '../EventAction';
import { ShowMessage } from './ShowMessage';
import { Teleport } from './Teleport';
import { Rotate } from './Rotate';
import { StartEncounter } from './StartEncounter';
import { SetGlobalVariable } from './SetGlobalVariable';
import { GenerateRandomEncounter } from './GenerateRandomEncounter';

/**
 * Factory for creating action instances from JSON.
 * Centralizes deserialization logic.
 */
export class ActionFactory {
  static fromJSON(json: EventActionJSON): EventAction {
    switch (json.type) {
      case "ShowMessage":
        return ShowMessage.fromJSON(json);
      case "Teleport":
        return Teleport.fromJSON(json);
      case "Rotate":
        return Rotate.fromJSON(json);
      case "StartEncounter":
        return StartEncounter.fromJSON(json);
      case "SetGlobalVariable":
        return SetGlobalVariable.fromJSON(json);
      case "GenerateRandomEncounter":
        return GenerateRandomEncounter.fromJSON(json);
      default:
        throw new Error(`Unknown action type: ${json.type}`);
    }
  }
}
