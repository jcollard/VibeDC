import React from 'react';
import './CombatView.css';

interface CombatViewProps {
  onExitCombat?: () => void;
}

export const CombatView: React.FC<CombatViewProps> = ({ onExitCombat }) => {
  return (
    <div className="combat-view">
      <div className="combat-container">
        <h1>Combat Mode</h1>
        <p>Turn-based tactical combat will be implemented here.</p>

        {onExitCombat && (
          <button
            className="exit-combat-btn"
            onClick={onExitCombat}
          >
            Exit Combat (Placeholder)
          </button>
        )}
      </div>
    </div>
  );
};
