import { useState, useEffect, useRef } from 'react';
import { CombatAbility, type AbilityType } from '../../models/combat/CombatAbility';

interface AbilityBrowserProps {
  onClose?: () => void;
  onSelectAbility?: (abilityId: string) => void;
  selectedAbilityId?: string;
  filterType?: AbilityType; // Optional filter by ability type
  learnedAbilityIds?: string[]; // IDs of abilities already learned by the unit
}

/**
 * Ability browser for selecting combat abilities.
 * Used in developer panels for ability selection.
 */
export const AbilityBrowser: React.FC<AbilityBrowserProps> = ({
  onClose,
  onSelectAbility,
  selectedAbilityId,
  filterType,
  learnedAbilityIds = [],
}) => {
  const [allAbilities, setAllAbilities] = useState<CombatAbility[]>([]);
  const [selectedType, setSelectedType] = useState<AbilityType | ''>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load all abilities on mount
  useEffect(() => {
    const abilities = CombatAbility.getAll();
    setAllAbilities(abilities);

    // Set initial filter type if provided
    if (filterType) {
      setSelectedType(filterType);
    }

    // Focus the search input when the component mounts
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [filterType]);

  // Handle Escape key to close the browser
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Filter abilities based on type and search
  const filteredAbilities = allAbilities.filter((ability) => {
    // Filter by type
    if (selectedType && ability.abilityType !== selectedType) {
      return false;
    }

    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      return (
        ability.name.toLowerCase().includes(lowerSearch) ||
        ability.id.toLowerCase().includes(lowerSearch) ||
        ability.description.toLowerCase().includes(lowerSearch) ||
        ability.tags.some(tag => tag.toLowerCase().includes(lowerSearch))
      );
    }

    return true;
  });

  // Group abilities by type
  const abilitiesByType = filteredAbilities.reduce((acc, ability) => {
    if (!acc[ability.abilityType]) {
      acc[ability.abilityType] = [];
    }
    acc[ability.abilityType].push(ability);
    return acc;
  }, {} as Record<AbilityType, CombatAbility[]>);

  // Get all ability types
  const allTypes: AbilityType[] = ['Action', 'Reaction', 'Passive', 'Movement'];

  // Get color for ability type
  const getTypeColor = (type: AbilityType): string => {
    switch (type) {
      case 'Action':
        return '#2196F3'; // Blue
      case 'Reaction':
        return '#FF9800'; // Orange
      case 'Passive':
        return '#9C27B0'; // Purple
      case 'Movement':
        return '#4CAF50'; // Green
    }
  };

  // Format tags for display
  const formatTags = (ability: CombatAbility): string => {
    return ability.tags.length > 0 ? ability.tags.join(', ') : 'No tags';
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0, 0, 0, 0.95)',
        border: '2px solid #666',
        padding: '20px',
        borderRadius: '8px',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 2001,
        width: '700px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
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
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Select Ability</div>
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
            title="Close ability browser"
          >
            ×
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        {/* Search box */}
        <div style={{ flex: 1 }}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name, ID, description, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredAbilities.length === 1) {
                // If there's exactly one match, select it
                onSelectAbility?.(filteredAbilities[0].id);
              }
            }}
            style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid #666',
              borderRadius: '4px',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: '12px',
            }}
          />
        </div>

        {/* Type filter */}
        <div style={{ flex: '0 0 200px' }}>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as AbilityType | '')}
            disabled={!!filterType} // Disable if filter type is provided as prop
            style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid #666',
              borderRadius: '4px',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: '12px',
              cursor: filterType ? 'not-allowed' : 'pointer',
              opacity: filterType ? 0.6 : 1,
            }}
          >
            <option value="">All Types</option>
            {allTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ability list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          background: 'rgba(0, 0, 0, 0.3)',
        }}
      >
        {filteredAbilities.length === 0 ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: '#666',
              fontSize: '14px',
            }}
          >
            No abilities found
          </div>
        ) : (
          <div style={{ padding: '8px' }}>
            {/* Group by type if no type filter is active */}
            {!selectedType ? (
              allTypes.map((type) => {
                const items = abilitiesByType[type] || [];
                if (items.length === 0) return null;

                return (
                  <div key={type} style={{ marginBottom: '16px' }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: getTypeColor(type),
                        marginBottom: '8px',
                        paddingBottom: '4px',
                        borderBottom: `1px solid ${getTypeColor(type)}33`,
                      }}
                    >
                      {type} ({items.length})
                    </div>
                    {items.map((ability) => (
                      <div
                        key={ability.id}
                        onClick={() => onSelectAbility?.(ability.id)}
                        style={{
                          padding: '10px',
                          marginBottom: '6px',
                          background:
                            selectedAbilityId === ability.id
                              ? 'rgba(255, 255, 0, 0.2)'
                              : 'rgba(255, 255, 255, 0.05)',
                          border:
                            selectedAbilityId === ability.id
                              ? '2px solid rgba(255, 255, 0, 0.6)'
                              : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedAbilityId !== ability.id) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedAbilityId !== ability.id) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '2px' }}>
                              {ability.name}
                            </div>
                            <div style={{ fontSize: '10px', color: '#888', fontFamily: 'monospace' }}>
                              {ability.id}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <div
                              style={{
                                padding: '2px 6px',
                                background: `${getTypeColor(ability.abilityType)}33`,
                                border: `1px solid ${getTypeColor(ability.abilityType)}66`,
                                borderRadius: '3px',
                                fontSize: '10px',
                                color: getTypeColor(ability.abilityType),
                                whiteSpace: 'nowrap',
                              }}
                            >
                              XP: {ability.experiencePrice}
                            </div>
                            {learnedAbilityIds.includes(ability.id) && (
                              <div
                                style={{
                                  padding: '2px 6px',
                                  background: 'rgba(76, 175, 80, 0.3)',
                                  border: '1px solid rgba(76, 175, 80, 0.6)',
                                  borderRadius: '3px',
                                  fontSize: '10px',
                                  color: '#8bc34a',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Learned
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '4px' }}>
                          {ability.description}
                        </div>
                        <div style={{ fontSize: '10px', color: '#888' }}>
                          Tags: {formatTags(ability)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            ) : (
              // Show flat list if type filter is active
              filteredAbilities.map((ability) => (
                <div
                  key={ability.id}
                  onClick={() => onSelectAbility?.(ability.id)}
                  style={{
                    padding: '10px',
                    marginBottom: '6px',
                    background:
                      selectedAbilityId === ability.id
                        ? 'rgba(255, 255, 0, 0.2)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border:
                      selectedAbilityId === ability.id
                        ? '2px solid rgba(255, 255, 0, 0.6)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedAbilityId !== ability.id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedAbilityId !== ability.id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '2px' }}>
                        {ability.name}
                      </div>
                      <div style={{ fontSize: '10px', color: '#888', fontFamily: 'monospace' }}>
                        {ability.id}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <div
                        style={{
                          padding: '2px 6px',
                          background: `${getTypeColor(ability.abilityType)}33`,
                          border: `1px solid ${getTypeColor(ability.abilityType)}66`,
                          borderRadius: '3px',
                          fontSize: '10px',
                          color: getTypeColor(ability.abilityType),
                          whiteSpace: 'nowrap',
                        }}
                      >
                        XP: {ability.experiencePrice}
                      </div>
                      {learnedAbilityIds.includes(ability.id) && (
                        <div
                          style={{
                            padding: '2px 6px',
                            background: 'rgba(76, 175, 80, 0.3)',
                            border: '1px solid rgba(76, 175, 80, 0.6)',
                            borderRadius: '3px',
                            fontSize: '10px',
                            color: '#8bc34a',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Learned
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '4px' }}>
                    {ability.description}
                  </div>
                  <div style={{ fontSize: '10px', color: '#888' }}>
                    Tags: {formatTags(ability)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div
        style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #666',
          fontSize: '11px',
          color: '#666',
          textAlign: 'center',
        }}
      >
        {filteredAbilities.length} abilit{filteredAbilities.length !== 1 ? 'ies' : 'y'} found
      </div>
    </div>
  );
};
