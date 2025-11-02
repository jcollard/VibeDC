import { useState } from 'react';
import type { AreaEvent } from '../../models/area/EventArea';
import type { EventPrecondition } from '../../models/area/EventPrecondition';
import type { EventAction } from '../../models/area/EventAction';
import { EventTrigger } from '../../models/area/EventTrigger';
import { PreconditionFactory } from '../../models/area/preconditions/PreconditionFactory';
import { ActionFactory } from '../../models/area/actions/ActionFactory';

interface EventEditorModalProps {
  event: AreaEvent | null; // null = creating new event
  onSave: (event: AreaEvent) => void;
  onCancel: () => void;
}

export const EventEditorModal: React.FC<EventEditorModalProps> = ({
  event,
  onSave,
  onCancel,
}) => {
  // Initialize state from event or create new
  const [eventId, setEventId] = useState(event?.id || `event-${Date.now()}`);
  const [description, setDescription] = useState(event?.description || '');
  const [trigger, setTrigger] = useState(event?.trigger || EventTrigger.OnEnter);
  const [oneTime, setOneTime] = useState(event?.oneTime || false);
  const [preconditions, setPreconditions] = useState<EventPrecondition[]>(event?.preconditions || []);
  const [actions, setActions] = useState<EventAction[]>(event?.actions || []);

  const handleSave = () => {
    const newEvent: AreaEvent = {
      id: eventId,
      trigger,
      preconditions,
      actions,
      oneTime,
      description,
    };

    onSave(newEvent);
  };

  const handleAddPrecondition = (type: string) => {
    if (!type) return;

    let newPrecondition: EventPrecondition;

    switch (type) {
      case 'GlobalVariableIs':
        newPrecondition = PreconditionFactory.fromJSON({
          type: 'GlobalVariableIs',
          variableName: 'new-variable',
          expectedValue: true,
        });
        break;
      case 'GlobalVariableIsGreaterThan':
        newPrecondition = PreconditionFactory.fromJSON({
          type: 'GlobalVariableIsGreaterThan',
          variableName: 'new-variable',
          threshold: 0,
        });
        break;
      case 'GlobalVariableIsLessThan':
        newPrecondition = PreconditionFactory.fromJSON({
          type: 'GlobalVariableIsLessThan',
          variableName: 'new-variable',
          threshold: 10,
        });
        break;
      default:
        return;
    }

    setPreconditions([...preconditions, newPrecondition]);
  };

  const handleUpdatePrecondition = (index: number, updates: Record<string, unknown>) => {
    const updated = [...preconditions];
    const current = updated[index];
    const currentJSON = current.toJSON();

    // Recreate from JSON with updates
    updated[index] = PreconditionFactory.fromJSON({
      ...currentJSON,
      ...updates,
    });

    setPreconditions(updated);
  };

  const handleDeletePrecondition = (index: number) => {
    setPreconditions(preconditions.filter((_, i) => i !== index));
  };

  const handleAddAction = (type: string) => {
    if (!type) return;

    let newAction: EventAction;

    switch (type) {
      case 'ShowMessage':
        newAction = ActionFactory.fromJSON({
          type: 'ShowMessage',
          message: 'New message',
        });
        break;
      case 'SetGlobalVariable':
        newAction = ActionFactory.fromJSON({
          type: 'SetGlobalVariable',
          variableName: 'new-variable',
          value: true,
        });
        break;
      case 'Teleport':
        newAction = ActionFactory.fromJSON({
          type: 'Teleport',
          targetMapId: 'map-id',
          targetX: 0,
          targetY: 0,
          targetDirection: 'North',
        });
        break;
      case 'Rotate':
        newAction = ActionFactory.fromJSON({
          type: 'Rotate',
          newDirection: 'North',
        });
        break;
      case 'StartEncounter':
        newAction = ActionFactory.fromJSON({
          type: 'StartEncounter',
          encounterId: 'encounter-id',
        });
        break;
      case 'GenerateRandomEncounter':
        newAction = ActionFactory.fromJSON({
          type: 'GenerateRandomEncounter',
        });
        break;
      default:
        return;
    }

    setActions([...actions, newAction]);
  };

  const handleUpdateAction = (index: number, updates: Record<string, unknown>) => {
    const updated = [...actions];
    const current = updated[index];
    const currentJSON = current.toJSON();

    // Recreate from JSON with updates
    updated[index] = ActionFactory.fromJSON({
      ...currentJSON,
      ...updates,
    });

    setActions(updated);
  };

  const handleDeleteAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleMoveActionUp = (index: number) => {
    if (index === 0) return;
    const updated = [...actions];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setActions(updated);
  };

  const handleMoveActionDown = (index: number) => {
    if (index === actions.length - 1) return;
    const updated = [...actions];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setActions(updated);
  };

  const renderPrecondition = (precondition: EventPrecondition, index: number) => {
    const json = precondition.toJSON();
    const type = json.type;

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{type}</div>
          <button
            onClick={() => handleDeletePrecondition(index)}
            style={{
              padding: '2px 6px',
              background: 'rgba(244, 67, 54, 0.3)',
              border: '1px solid rgba(244, 67, 54, 0.6)',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '10px',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            X
          </button>
        </div>

        {type === 'GlobalVariableIs' && (
          <>
            <div style={{ fontSize: '10px', marginBottom: '2px', color: '#aaa' }}>Variable Name:</div>
            <input
              type="text"
              value={(json as any).variableName || ''}
              onChange={(e) => handleUpdatePrecondition(index, { variableName: e.target.value })}
              style={{
                width: '100%',
                padding: '4px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid #666',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '10px',
                fontFamily: 'monospace',
                marginBottom: '8px',
              }}
            />
            <div style={{ fontSize: '10px', marginBottom: '2px', color: '#aaa' }}>Expected Value:</div>
            <input
              type="text"
              value={String((json as any).expectedValue ?? '')}
              onChange={(e) => {
                const val = e.target.value;
                // Try to parse as boolean or number
                let parsedVal: unknown = val;
                if (val === 'true') parsedVal = true;
                else if (val === 'false') parsedVal = false;
                else if (!isNaN(Number(val)) && val !== '') parsedVal = Number(val);

                handleUpdatePrecondition(index, { expectedValue: parsedVal });
              }}
              style={{
                width: '100%',
                padding: '4px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid #666',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '10px',
                fontFamily: 'monospace',
              }}
            />
          </>
        )}

        {(type === 'GlobalVariableIsGreaterThan' || type === 'GlobalVariableIsLessThan') && (
          <>
            <div style={{ fontSize: '10px', marginBottom: '2px', color: '#aaa' }}>Variable Name:</div>
            <input
              type="text"
              value={(json as any).variableName || ''}
              onChange={(e) => handleUpdatePrecondition(index, { variableName: e.target.value })}
              style={{
                width: '100%',
                padding: '4px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid #666',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '10px',
                fontFamily: 'monospace',
                marginBottom: '8px',
              }}
            />
            <div style={{ fontSize: '10px', marginBottom: '2px', color: '#aaa' }}>Threshold:</div>
            <input
              type="number"
              value={(json as any).threshold ?? 0}
              onChange={(e) => handleUpdatePrecondition(index, { threshold: Number(e.target.value) })}
              style={{
                width: '100%',
                padding: '4px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid #666',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '10px',
                fontFamily: 'monospace',
              }}
            />
          </>
        )}
      </div>
    );
  };

  const renderAction = (action: EventAction, index: number, isFirst: boolean, isLast: boolean) => {
    const json = action.toJSON();
    const type = json.type;

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{type}</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => handleMoveActionUp(index)}
              disabled={isFirst}
              style={{
                padding: '2px 6px',
                background: isFirst ? 'rgba(128,128,128,0.3)' : 'rgba(33, 150, 243, 0.3)',
                border: `1px solid ${isFirst ? 'rgba(128,128,128,0.6)' : 'rgba(33, 150, 243, 0.6)'}`,
                borderRadius: '3px',
                color: '#fff',
                fontSize: '10px',
                cursor: isFirst ? 'not-allowed' : 'pointer',
                fontFamily: 'monospace',
              }}
            >
              ↑
            </button>
            <button
              onClick={() => handleMoveActionDown(index)}
              disabled={isLast}
              style={{
                padding: '2px 6px',
                background: isLast ? 'rgba(128,128,128,0.3)' : 'rgba(33, 150, 243, 0.3)',
                border: `1px solid ${isLast ? 'rgba(128,128,128,0.6)' : 'rgba(33, 150, 243, 0.6)'}`,
                borderRadius: '3px',
                color: '#fff',
                fontSize: '10px',
                cursor: isLast ? 'not-allowed' : 'pointer',
                fontFamily: 'monospace',
              }}
            >
              ↓
            </button>
            <button
              onClick={() => handleDeleteAction(index)}
              style={{
                padding: '2px 6px',
                background: 'rgba(244, 67, 54, 0.3)',
                border: '1px solid rgba(244, 67, 54, 0.6)',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '10px',
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              X
            </button>
          </div>
        </div>

        {type === 'ShowMessage' && (
          <>
            <div style={{ fontSize: '10px', marginBottom: '2px', color: '#aaa' }}>Message:</div>
            <textarea
              value={(json as any).message || ''}
              onChange={(e) => handleUpdateAction(index, { message: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '4px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid #666',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '10px',
                fontFamily: 'monospace',
                resize: 'vertical',
              }}
            />
          </>
        )}

        {type === 'SetGlobalVariable' && (
          <>
            <div style={{ fontSize: '10px', marginBottom: '2px', color: '#aaa' }}>Variable Name:</div>
            <input
              type="text"
              value={(json as any).variableName || ''}
              onChange={(e) => handleUpdateAction(index, { variableName: e.target.value })}
              style={{
                width: '100%',
                padding: '4px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid #666',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '10px',
                fontFamily: 'monospace',
                marginBottom: '8px',
              }}
            />
            <div style={{ fontSize: '10px', marginBottom: '2px', color: '#aaa' }}>Value:</div>
            <input
              type="text"
              value={String((json as any).value ?? '')}
              onChange={(e) => {
                const val = e.target.value;
                // Try to parse as boolean or number
                let parsedVal: unknown = val;
                if (val === 'true') parsedVal = true;
                else if (val === 'false') parsedVal = false;
                else if (!isNaN(Number(val)) && val !== '') parsedVal = Number(val);

                handleUpdateAction(index, { value: parsedVal });
              }}
              style={{
                width: '100%',
                padding: '4px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid #666',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '10px',
                fontFamily: 'monospace',
              }}
            />
          </>
        )}

        {type === 'Teleport' && (
          <>
            <div style={{ fontSize: '10px', marginBottom: '2px', color: '#aaa' }}>Target Map ID:</div>
            <input
              type="text"
              value={(json as any).targetMapId || ''}
              onChange={(e) => handleUpdateAction(index, { targetMapId: e.target.value })}
              style={{
                width: '100%',
                padding: '4px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid #666',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '10px',
                fontFamily: 'monospace',
                marginBottom: '8px',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', marginBottom: '2px', color: '#aaa' }}>X:</div>
                <input
                  type="number"
                  value={(json as any).targetX ?? 0}
                  onChange={(e) => handleUpdateAction(index, { targetX: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '4px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid #666',
                    borderRadius: '3px',
                    color: '#fff',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', marginBottom: '2px', color: '#aaa' }}>Y:</div>
                <input
                  type="number"
                  value={(json as any).targetY ?? 0}
                  onChange={(e) => handleUpdateAction(index, { targetY: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '4px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid #666',
                    borderRadius: '3px',
                    color: '#fff',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
            </div>
            <div style={{ fontSize: '10px', marginBottom: '2px', color: '#aaa' }}>Direction:</div>
            <select
              value={(json as any).targetDirection || 'North'}
              onChange={(e) => handleUpdateAction(index, { targetDirection: e.target.value })}
              style={{
                width: '100%',
                padding: '4px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid #666',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '10px',
                fontFamily: 'monospace',
              }}
            >
              <option value="North">North</option>
              <option value="South">South</option>
              <option value="East">East</option>
              <option value="West">West</option>
            </select>
          </>
        )}

        {type === 'Rotate' && (
          <>
            <div style={{ fontSize: '10px', marginBottom: '2px', color: '#aaa' }}>New Direction:</div>
            <select
              value={(json as any).newDirection || 'North'}
              onChange={(e) => handleUpdateAction(index, { newDirection: e.target.value })}
              style={{
                width: '100%',
                padding: '4px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid #666',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '10px',
                fontFamily: 'monospace',
              }}
            >
              <option value="North">North</option>
              <option value="South">South</option>
              <option value="East">East</option>
              <option value="West">West</option>
            </select>
          </>
        )}

        {type === 'StartEncounter' && (
          <>
            <div style={{ fontSize: '10px', marginBottom: '2px', color: '#aaa' }}>Encounter ID:</div>
            <input
              type="text"
              value={(json as any).encounterId || ''}
              onChange={(e) => handleUpdateAction(index, { encounterId: e.target.value })}
              style={{
                width: '100%',
                padding: '4px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid #666',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '10px',
                fontFamily: 'monospace',
              }}
            />
          </>
        )}

        {type === 'GenerateRandomEncounter' && (
          <div style={{ fontSize: '10px', color: '#aaa', fontStyle: 'italic' }}>
            Generates a random combat encounter with procedural dungeon (21x13), enemies, and loot.
            All parameters are procedurally generated based on party stats and equipment.
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.95)',
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 3000,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '2px solid #666',
        background: 'rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
          {event ? `Edit Event: ${event.id}` : 'Create New Event'}
        </div>
        <button
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            fontSize: '24px',
            fontWeight: 'bold',
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Event Properties */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', marginBottom: '4px', color: '#aaa' }}>Event ID:</div>
            <input
              type="text"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid #666',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '12px',
                fontFamily: 'monospace',
                marginBottom: '12px',
              }}
            />

            <div style={{ fontSize: '11px', marginBottom: '4px', color: '#aaa' }}>Description (optional):</div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid #666',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '12px',
                fontFamily: 'monospace',
                marginBottom: '12px',
              }}
            />

            <div style={{ fontSize: '11px', marginBottom: '4px', color: '#aaa' }}>Trigger:</div>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as EventTrigger)}
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid #666',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '12px',
                fontFamily: 'monospace',
                marginBottom: '12px',
              }}
            >
              <option value={EventTrigger.OnEnter}>on-enter (player enters area)</option>
              <option value={EventTrigger.OnStep}>on-step (player is in area)</option>
              <option value={EventTrigger.OnExit}>on-exit (player leaves area)</option>
            </select>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={oneTime}
                onChange={(e) => setOneTime(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '11px' }}>One-time event (fires only once)</span>
            </label>
          </div>

          {/* Preconditions */}
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid #666',
            borderRadius: '4px',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
              Preconditions
            </div>
            <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '12px' }}>
              All must be true for event to fire
            </div>

            {preconditions.length === 0 ? (
              <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', marginBottom: '12px' }}>
                No preconditions (event always fires when triggered)
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {preconditions.map((precondition, index) => (
                  <div key={index} style={{
                    padding: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid #666',
                    borderRadius: '4px',
                  }}>
                    {renderPrecondition(precondition, index)}
                  </div>
                ))}
              </div>
            )}

            <select
              onChange={(e) => {
                handleAddPrecondition(e.target.value);
                e.target.value = '';
              }}
              value=""
              style={{
                width: '100%',
                padding: '6px',
                background: 'rgba(76, 175, 80, 0.3)',
                border: '1px solid rgba(76, 175, 80, 0.6)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '11px',
                fontFamily: 'monospace',
                cursor: 'pointer',
              }}
            >
              <option value="">+ Add Precondition</option>
              <option value="GlobalVariableIs">GlobalVariableIs</option>
              <option value="GlobalVariableIsGreaterThan">GlobalVariableIsGreaterThan</option>
              <option value="GlobalVariableIsLessThan">GlobalVariableIsLessThan</option>
            </select>
          </div>

          {/* Actions */}
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid #666',
            borderRadius: '4px',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
              Actions
            </div>
            <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '12px' }}>
              Execute in order when event fires
            </div>

            {actions.length === 0 ? (
              <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', marginBottom: '12px' }}>
                No actions (event does nothing)
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {actions.map((action, index) => (
                  <div key={index} style={{
                    padding: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid #666',
                    borderRadius: '4px',
                  }}>
                    {renderAction(action, index, index === 0, index === actions.length - 1)}
                  </div>
                ))}
              </div>
            )}

            <select
              onChange={(e) => {
                handleAddAction(e.target.value);
                e.target.value = '';
              }}
              value=""
              style={{
                width: '100%',
                padding: '6px',
                background: 'rgba(76, 175, 80, 0.3)',
                border: '1px solid rgba(76, 175, 80, 0.6)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '11px',
                fontFamily: 'monospace',
                cursor: 'pointer',
              }}
            >
              <option value="">+ Add Action</option>
              <option value="ShowMessage">ShowMessage</option>
              <option value="SetGlobalVariable">SetGlobalVariable</option>
              <option value="Teleport">Teleport</option>
              <option value="Rotate">Rotate</option>
              <option value="StartEncounter">StartEncounter</option>
              <option value="GenerateRandomEncounter">GenerateRandomEncounter</option>
            </select>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        padding: '16px 20px',
        borderTop: '2px solid #666',
        background: 'rgba(0,0,0,0.5)',
      }}>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            background: 'rgba(128,128,128,0.3)',
            border: '1px solid rgba(128,128,128,0.6)',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: '8px 16px',
            background: 'rgba(76, 175, 80, 0.3)',
            border: '1px solid rgba(76, 175, 80, 0.6)',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontWeight: 'bold',
          }}
        >
          Save Event
        </button>
      </div>
    </div>
  );
};
