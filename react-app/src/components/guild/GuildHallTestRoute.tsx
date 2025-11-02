import React, { useState, useMemo, useEffect } from 'react';
import type { PartyState, GameViewType } from '../../models/game/GameState';
import { GuildHallView } from './GuildHallView';
import { ResourceManager } from '../../services/ResourceManager';

/**
 * Development-only route for testing GuildHallView in isolation
 * Accessible at /dev/guild-hall
 */
export const GuildHallTestRoute: React.FC = () => {
  // ✅ GUIDELINE: Cache ResourceManager in useMemo
  const resourceManager = useMemo(() => new ResourceManager(), []);
  const [resourcesLoaded, setResourcesLoaded] = useState(false);

  // ✅ GUIDELINE: Initialize with empty party state (immutable)
  const [partyState, setPartyState] = useState<PartyState>({
    members: [],
    guildRoster: [],
    inventory: { items: [], gold: 0 },
    equipment: new Map(),
  });

  // Load resources on mount
  useEffect(() => {
    const loadResources = async () => {
      try {
        await resourceManager.loadFonts();
        await resourceManager.loadSprites();
        console.log('[GuildHallTestRoute] Resources loaded');
        setResourcesLoaded(true);
      } catch (error) {
        console.error('[GuildHallTestRoute] Resource loading failed:', error);
      }
    };

    loadResources();
  }, [resourceManager]);

  const handlePartyStateChange = (newPartyState: PartyState) => {
    console.log('[GuildHallTestRoute] Party state changed:', newPartyState);
    setPartyState(newPartyState);
  };

  const handleNavigate = (view: GameViewType, params?: any) => {
    console.log('[GuildHallTestRoute] Navigation requested:', view, params);
    // In test mode, just log navigation (no actual navigation)
    alert(`Navigation to ${view} requested (test mode - no navigation implemented)`);
  };

  if (!resourcesLoaded) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontFamily: 'monospace',
      }}>
        Loading Guild Hall resources...
      </div>
    );
  }

  return (
    <GuildHallView
      partyState={partyState}
      onPartyStateChange={handlePartyStateChange}
      onNavigate={handleNavigate}
      resourceManager={resourceManager}
    />
  );
};
