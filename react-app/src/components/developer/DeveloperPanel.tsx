import React from 'react';

interface DeveloperPanelProps {
  onClose?: () => void;
  onOpenMapEditor?: () => void;
  onOpenSpriteRegistry?: () => void;
  onOpenDebugPanel?: () => void;
}

/**
 * Developer panel hub for accessing various development tools.
 * Only accessible in development mode via F2 key.
 */
export const DeveloperPanel: React.FC<DeveloperPanelProps> = ({
  onClose,
  onOpenMapEditor,
  onOpenSpriteRegistry,
  onOpenDebugPanel,
}) => {
  const panels = [
    {
      name: 'Map Editor',
      description: 'Edit and create game maps',
      shortcut: 'Alt+M',
      available: !!onOpenMapEditor,
      onClick: onOpenMapEditor,
    },
    {
      name: 'Sprite Registry',
      description: 'Browse and test sprites',
      shortcut: 'F2 → Sprite',
      available: !!onOpenSpriteRegistry,
      onClick: onOpenSpriteRegistry,
    },
    {
      name: 'Debug Panel',
      description: 'View debug info and controls',
      shortcut: 'Alt+D',
      available: !!onOpenDebugPanel,
      onClick: onOpenDebugPanel,
    },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0, 0, 0, 0.9)',
        border: '2px solid #666',
        padding: '20px',
        borderRadius: '8px',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '14px',
        zIndex: 2000,
        minWidth: '400px',
        maxWidth: '500px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #666',
        }}
      >
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '18px' }}>Developer Tools</div>
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
            Press F2 to toggle this panel
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: '0',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.7,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
            title="Close developer panel"
          >
            ×
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {panels.map((panel) => (
          <button
            key={panel.name}
            onClick={panel.onClick}
            disabled={!panel.available}
            style={{
              background: panel.available
                ? 'rgba(76, 175, 80, 0.2)'
                : 'rgba(128, 128, 128, 0.1)',
              border: panel.available ? '1px solid rgba(76, 175, 80, 0.5)' : '1px solid #444',
              color: panel.available ? '#fff' : '#666',
              padding: '12px',
              borderRadius: '4px',
              cursor: panel.available ? 'pointer' : 'not-allowed',
              textAlign: 'left',
              transition: 'all 0.2s',
              fontFamily: 'monospace',
            }}
            onMouseEnter={(e) => {
              if (panel.available) {
                e.currentTarget.style.background = 'rgba(76, 175, 80, 0.3)';
                e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.7)';
              }
            }}
            onMouseLeave={(e) => {
              if (panel.available) {
                e.currentTarget.style.background = 'rgba(76, 175, 80, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.5)';
              }
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                  {panel.name}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>{panel.description}</div>
              </div>
              <div
                style={{
                  fontSize: '10px',
                  opacity: 0.6,
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  whiteSpace: 'nowrap',
                }}
              >
                {panel.shortcut}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div
        style={{
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #666',
          fontSize: '11px',
          color: '#aaa',
        }}
      >
        This panel is only available in development mode.
      </div>
    </div>
  );
};
