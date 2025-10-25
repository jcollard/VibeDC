import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { FontAtlasGenerator } from './components/developer/FontAtlasGenerator';
import './index.css';

/**
 * Standalone Font Atlas Generator Tool
 *
 * This is a separate entry point for the font atlas generator,
 * allowing it to be deployed as a standalone tool while sharing
 * the same codebase with the main game.
 */
function FontToolApp() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#1a1a1a',
          color: '#fff',
          fontFamily: 'monospace',
        }}
      >
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '20px 40px',
            background: 'rgba(76, 175, 80, 0.3)',
            border: '2px solid rgba(76, 175, 80, 0.6)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '18px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontWeight: 'bold',
          }}
        >
          Open Font Atlas Generator
        </button>
      </div>
    );
  }

  return <FontAtlasGenerator onClose={() => setIsOpen(false)} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FontToolApp />
  </React.StrictMode>
);
