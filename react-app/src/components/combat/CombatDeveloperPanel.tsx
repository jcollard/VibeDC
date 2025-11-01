import React, { useState, useEffect } from 'react';
import type { SaveSlotMetadata } from '../../utils/combatStorage';

interface CombatDeveloperPanelProps {
  // Display settings
  integerScalingEnabled: boolean;
  onIntegerScalingChange: (enabled: boolean) => void;
  manualScale: number;
  onManualScaleChange: (scale: number) => void;
  maxFPS: number;
  onMaxFPSChange: (fps: number) => void;

  // Debug overlays
  showDebugGrid: boolean;
  onDebugGridChange: (show: boolean) => void;
  showFPS: boolean;
  onShowFPSChange: (show: boolean) => void;

  // Save/Load
  saveErrorMessage: string | null;
  slotMetadata: (SaveSlotMetadata | null)[];
  onExportToFile: () => void;
  onImportFromFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveToLocalStorage: () => void;
  onLoadFromLocalStorage: () => void;
  onSaveToSlot: (index: number) => void;
  onLoadFromSlot: (index: number) => void;
}

const STORAGE_KEY = 'vibedc_dev_panel_expanded';

/**
 * Developer settings panel for CombatView
 * Provides controls for display settings, debugging, and save/load functionality
 * Collapsible with persistent state
 */
export const CombatDeveloperPanel: React.FC<CombatDeveloperPanelProps> = ({
  integerScalingEnabled,
  onIntegerScalingChange,
  manualScale,
  onManualScaleChange,
  maxFPS,
  onMaxFPSChange,
  showDebugGrid,
  onDebugGridChange,
  showFPS,
  onShowFPSChange,
  saveErrorMessage,
  slotMetadata,
  onExportToFile,
  onImportFromFile,
  onSaveToLocalStorage,
  onLoadFromLocalStorage,
  onSaveToSlot,
  onLoadFromSlot,
}) => {
  // Load expanded state from localStorage (default: collapsed)
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  // Persist expanded state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isExpanded));
  }, [isExpanded]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Format slot metadata for display
  const formatSlotMetadata = (metadata: SaveSlotMetadata | null): string => {
    if (!metadata) {
      return 'Empty';
    }

    const date = new Date(metadata.timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const phaseStr = metadata.phase.charAt(0).toUpperCase() + metadata.phase.slice(1).replace('-', ' ');
    return `Turn ${metadata.turnNumber} (${phaseStr}) - ${timeStr}`;
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        border: '2px solid #444',
        borderRadius: '4px',
        padding: '12px',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 4000,
        minWidth: isExpanded ? '220px' : 'auto',
      }}
    >
      {/* Collapsible Title */}
      <div
        onClick={toggleExpanded}
        style={{
          marginBottom: isExpanded ? '12px' : '0',
          fontWeight: 'bold',
          cursor: 'pointer',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '14px' }}>{isExpanded ? '▼' : '▶'}</span>
        <span>Developer Settings</span>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div>

      {/* Integer Scaling Toggle */}
      <label style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={integerScalingEnabled}
          onChange={(e) => onIntegerScalingChange(e.target.checked)}
          style={{
            marginRight: '8px',
            cursor: 'pointer',
            width: '16px',
            height: '16px',
          }}
        />
        <span>Integer Scaling (pixel-perfect)</span>
      </label>

      {/* Debug Grid Toggle */}
      <label style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={showDebugGrid}
          onChange={(e) => onDebugGridChange(e.target.checked)}
          style={{
            marginRight: '8px',
            cursor: 'pointer',
            width: '16px',
            height: '16px',
          }}
        />
        <span>Show Debug Grid</span>
      </label>

      {/* FPS Indicator Toggle */}
      <label style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={showFPS}
          onChange={(e) => onShowFPSChange(e.target.checked)}
          style={{
            marginRight: '8px',
            cursor: 'pointer',
            width: '16px',
            height: '16px',
          }}
        />
        <span>Show FPS</span>
      </label>

      {/* Manual Scale Selector */}
      <label style={{ display: 'block', marginBottom: '4px' }}>
        Scale Factor:
      </label>
      <select
        value={manualScale}
        onChange={(e) => onManualScaleChange(Number(e.target.value))}
        style={{
          width: '200px',
          padding: '4px',
          background: '#222',
          border: '1px solid #555',
          borderRadius: '3px',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: '11px',
          marginBottom: '16px',
        }}
      >
        <option value={0}>Auto</option>
        <option value={1}>1x</option>
        <option value={2}>2x</option>
        <option value={3}>3x</option>
        <option value={4}>4x</option>
        <option value={5}>5x</option>
      </select>

      {/* Max FPS Selector */}
      <label style={{ display: 'block', marginBottom: '4px' }}>
        Max FPS (0 = unlimited):
      </label>
      <select
        value={maxFPS}
        onChange={(e) => onMaxFPSChange(Number(e.target.value))}
        style={{
          width: '200px',
          padding: '4px',
          background: '#222',
          border: '1px solid #555',
          borderRadius: '3px',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: '11px',
          marginBottom: '16px',
        }}
      >
        <option value={0}>Unlimited (~60 FPS)</option>
        <option value={1}>1 FPS (debugging)</option>
        <option value={5}>5 FPS (debugging)</option>
        <option value={10}>10 FPS</option>
        <option value={15}>15 FPS</option>
        <option value={30}>30 FPS</option>
        <option value={60}>60 FPS</option>
      </select>

      {/* Combat Save/Load Section */}
      <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #666' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>Combat Save/Load</h3>

        {/* Error message display */}
        {saveErrorMessage && (
          <div style={{
            color: '#ff4444',
            backgroundColor: 'rgba(255, 68, 68, 0.1)',
            padding: '8px',
            marginBottom: '10px',
            borderRadius: '4px',
            fontSize: '11px',
            border: '1px solid #ff4444',
          }}>
            {saveErrorMessage}
          </div>
        )}

        {/* File Export/Import */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px' }}>File:</label>
          <button
            onClick={onExportToFile}
            style={{
              padding: '6px 12px',
              marginRight: '8px',
              cursor: 'pointer',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'monospace',
            }}
          >
            Export
          </button>
          <label
            htmlFor="import-file-input"
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              display: 'inline-block',
              fontSize: '11px',
              fontFamily: 'monospace',
            }}
          >
            Import
          </label>
          <input
            id="import-file-input"
            type="file"
            accept=".json"
            onChange={onImportFromFile}
            style={{ display: 'none' }}
          />
        </div>

        {/* LocalStorage Save/Load */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px' }}>LocalStorage:</label>
          <button
            onClick={onSaveToLocalStorage}
            style={{
              padding: '6px 12px',
              marginRight: '8px',
              cursor: 'pointer',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'monospace',
            }}
          >
            Save
          </button>
          <button
            onClick={onLoadFromLocalStorage}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'monospace',
            }}
          >
            Load
          </button>
        </div>

        {/* Quick Save Slots */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>Quick Save Slots:</label>
          {[0, 1, 2, 3].map((slotIndex) => {
            const metadata = slotMetadata[slotIndex];
            const slotLabel = formatSlotMetadata(metadata);
            const isEmpty = metadata === null;

            return (
              <div
                key={slotIndex}
                style={{
                  marginBottom: '8px',
                  padding: '8px',
                  background: '#1a1a1a',
                  border: '1px solid #555',
                  borderRadius: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#aaa' }}>
                      Slot {slotIndex + 1}
                    </div>
                    <div style={{ fontSize: '10px', color: isEmpty ? '#666' : '#ccc' }}>
                      {slotLabel}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => onSaveToSlot(slotIndex)}
                      style={{
                        padding: '4px 10px',
                        cursor: 'pointer',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => onLoadFromSlot(slotIndex)}
                      disabled={isEmpty}
                      style={{
                        padding: '4px 10px',
                        cursor: isEmpty ? 'not-allowed' : 'pointer',
                        backgroundColor: isEmpty ? '#444' : '#2196F3',
                        color: isEmpty ? '#888' : 'white',
                        border: 'none',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        opacity: isEmpty ? 0.5 : 1,
                      }}
                    >
                      Load
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
        </div>
      )}
    </div>
  );
};
