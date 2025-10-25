import { useEffect, useState } from 'react';
import type { CombatUIState, CombatUIStateManager } from '../models/combat/CombatUIState';

/**
 * React hook for subscribing to CombatUIStateManager changes
 * Automatically re-renders when UI state changes
 *
 * @param manager - The CombatUIStateManager instance to subscribe to
 * @returns Current UI state
 */
export function useCombatUIState(manager: CombatUIStateManager): CombatUIState {
  const [state, setState] = useState<CombatUIState>(manager.getState());

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = manager.subscribe((newState) => {
      setState(newState);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [manager]);

  return state;
}
