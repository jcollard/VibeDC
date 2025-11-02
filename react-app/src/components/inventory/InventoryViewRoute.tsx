/**
 * Route wrapper for InventoryView
 * Development only - accessible at /inventory
 */

import { PartyManagementView } from './PartyManagementView';

export const InventoryViewRoute: React.FC = () => {
  return <PartyManagementView />;
};
