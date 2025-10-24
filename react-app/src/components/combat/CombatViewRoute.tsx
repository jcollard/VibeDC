import { useParams, Navigate } from 'react-router-dom';
import { CombatView } from './CombatView';
import { CombatEncounter } from '../../models/combat/CombatEncounter';

/**
 * Route wrapper for CombatView that loads an encounter by ID from the URL.
 * Development only - accessible at /combat/:encounterId
 */
export const CombatViewRoute: React.FC = () => {
  const { encounterId } = useParams<{ encounterId: string }>();

  if (!encounterId) {
    return <Navigate to="/" replace />;
  }

  // Load the encounter from the registry
  const encounter = CombatEncounter.getById(encounterId);

  if (!encounter) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          background: '#000',
          color: '#fff',
          fontFamily: 'monospace',
        }}
      >
        <h1>Encounter Not Found</h1>
        <p>No encounter found with ID: {encounterId}</p>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#444',
            border: '1px solid #666',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          Go Home
        </button>
      </div>
    );
  }

  return <CombatView encounter={encounter} />;
};
