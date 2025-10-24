import { useState } from 'react';
import type { CombatState } from '../../models/combat/CombatState';
import type { CombatEncounter } from '../../models/combat/CombatEncounter';

interface CombatViewProps {
  encounter: CombatEncounter;
  onExit?: () => void;
}

/**
 * CombatView is the main view for displaying and interacting with combat encounters.
 * This is a placeholder component that will be expanded as the combat system is implemented.
 */
export const CombatView: React.FC<CombatViewProps> = ({ encounter, onExit }) => {
  // Placeholder: Initialize combat state from the encounter
  // This will be properly implemented when CombatState is fully designed
  const [combatState] = useState<CombatState>({
    turnNumber: 0,
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.95)',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '14px',
        zIndex: 3000,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '2px solid #666',
        }}
      >
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '4px' }}>
            {encounter.name}
          </div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>
            {encounter.description}
          </div>
        </div>
        {onExit && (
          <button
            onClick={onExit}
            style={{
              padding: '8px 16px',
              background: 'rgba(244, 67, 54, 0.3)',
              border: '1px solid rgba(244, 67, 54, 0.6)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold',
            }}
          >
            Exit Combat
          </button>
        )}
      </div>

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          overflow: 'auto',
        }}
      >
        {/* Combat State Info */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(33, 150, 243, 0.1)',
            borderRadius: '4px',
            border: '2px solid rgba(33, 150, 243, 0.4)',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>
            Combat State (Placeholder)
          </div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>
            <div><strong>Turn Number:</strong> {combatState.turnNumber}</div>
            <div><strong>Encounter ID:</strong> {encounter.id}</div>
            <div><strong>Map Size:</strong> {encounter.map.width} × {encounter.map.height}</div>
            <div><strong>Enemies:</strong> {encounter.enemyCount}</div>
            <div><strong>Deployment Zones:</strong> {encounter.deploymentSlotCount}</div>
          </div>
        </div>

        {/* Placeholder for map view */}
        <div
          style={{
            flex: 1,
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center', color: '#666' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚔️</div>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>Combat Map View</div>
            <div style={{ fontSize: '12px' }}>
              This area will display the combat map with units, terrain, and interactive elements.
            </div>
          </div>
        </div>

        {/* Placeholder for action panel */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(76, 175, 80, 0.1)',
            borderRadius: '4px',
            border: '1px solid rgba(76, 175, 80, 0.3)',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
            Actions
          </div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>
            Available actions will appear here (Move, Attack, Use Ability, End Turn, etc.)
          </div>
        </div>
      </div>
    </div>
  );
};
