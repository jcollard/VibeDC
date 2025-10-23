import { useState, useEffect } from 'react';
import { Equipment, type EquipmentType } from '../../models/combat/Equipment';

interface EquipmentBrowserProps {
  onClose?: () => void;
  onSelectEquipment?: (equipmentId: string) => void;
  selectedEquipmentId?: string;
  filterType?: EquipmentType; // Optional filter by equipment type
}

/**
 * Equipment browser for selecting equipment items.
 * Used in developer panels for equipment selection.
 */
export const EquipmentBrowser: React.FC<EquipmentBrowserProps> = ({
  onClose,
  onSelectEquipment,
  selectedEquipmentId,
  filterType,
}) => {
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
  const [selectedType, setSelectedType] = useState<EquipmentType | ''>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Load all equipment on mount
  useEffect(() => {
    const equipment = Equipment.getAll();
    setAllEquipment(equipment);

    // Set initial filter type if provided
    if (filterType) {
      setSelectedType(filterType);
    }
  }, [filterType]);

  // Filter equipment based on type and search
  const filteredEquipment = allEquipment.filter((equipment) => {
    // Filter by type
    if (selectedType && equipment.type !== selectedType) {
      return false;
    }

    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      return (
        equipment.name.toLowerCase().includes(lowerSearch) ||
        equipment.id.toLowerCase().includes(lowerSearch)
      );
    }

    return true;
  });

  // Group equipment by type
  const equipmentByType = filteredEquipment.reduce((acc, equipment) => {
    if (!acc[equipment.type]) {
      acc[equipment.type] = [];
    }
    acc[equipment.type].push(equipment);
    return acc;
  }, {} as Record<EquipmentType, Equipment[]>);

  // Get all equipment types
  const allTypes: EquipmentType[] = [
    'OneHandedWeapon',
    'TwoHandedWeapon',
    'Shield',
    'Held',
    'Head',
    'Body',
    'Accessory',
  ];

  // Format equipment type for display
  const formatType = (type: EquipmentType): string => {
    return type.replace(/([A-Z])/g, ' $1').trim();
  };

  // Format modifiers for display
  const formatModifiers = (equipment: Equipment): string => {
    const modifiers = equipment.modifiers;
    const parts: string[] = [];

    // Add flat modifiers
    if (modifiers.healthModifier !== 0) parts.push(`HP +${modifiers.healthModifier}`);
    if (modifiers.manaModifier !== 0) parts.push(`MP +${modifiers.manaModifier}`);
    if (modifiers.physicalPowerModifier !== 0) parts.push(`Phys +${modifiers.physicalPowerModifier}`);
    if (modifiers.magicPowerModifier !== 0) parts.push(`Mag +${modifiers.magicPowerModifier}`);
    if (modifiers.speedModifier !== 0) parts.push(`Spd +${modifiers.speedModifier}`);
    if (modifiers.movementModifier !== 0) parts.push(`Mov +${modifiers.movementModifier}`);
    if (modifiers.physicalEvadeModifier !== 0) parts.push(`P.Eva +${modifiers.physicalEvadeModifier}`);
    if (modifiers.magicEvadeModifier !== 0) parts.push(`M.Eva +${modifiers.magicEvadeModifier}`);
    if (modifiers.courageModifier !== 0) parts.push(`Cou +${modifiers.courageModifier}`);
    if (modifiers.attunementModifier !== 0) parts.push(`Att +${modifiers.attunementModifier}`);

    return parts.join(', ') || 'No modifiers';
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
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Select Equipment</div>
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
            title="Close equipment browser"
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
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
            onChange={(e) => setSelectedType(e.target.value as EquipmentType | '')}
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
                {formatType(type)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clear selection button */}
      {selectedEquipmentId && (
        <div style={{ marginBottom: '12px' }}>
          <button
            onClick={() => onSelectEquipment?.('')}
            style={{
              padding: '6px 12px',
              background: 'rgba(255, 0, 0, 0.2)',
              border: '1px solid rgba(255, 0, 0, 0.4)',
              borderRadius: '4px',
              color: '#ff6666',
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 0, 0, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 0, 0, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.4)';
            }}
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Equipment list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          background: 'rgba(0, 0, 0, 0.3)',
        }}
      >
        {filteredEquipment.length === 0 ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: '#666',
              fontSize: '14px',
            }}
          >
            No equipment found
          </div>
        ) : (
          <div style={{ padding: '8px' }}>
            {/* Group by type if no type filter is active */}
            {!selectedType ? (
              allTypes.map((type) => {
                const items = equipmentByType[type] || [];
                if (items.length === 0) return null;

                return (
                  <div key={type} style={{ marginBottom: '16px' }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: '#4CAF50',
                        marginBottom: '8px',
                        paddingBottom: '4px',
                        borderBottom: '1px solid rgba(76, 175, 80, 0.3)',
                      }}
                    >
                      {formatType(type)} ({items.length})
                    </div>
                    {items.map((equipment) => (
                      <div
                        key={equipment.id}
                        onClick={() => onSelectEquipment?.(equipment.id)}
                        style={{
                          padding: '10px',
                          marginBottom: '6px',
                          background:
                            selectedEquipmentId === equipment.id
                              ? 'rgba(255, 255, 0, 0.2)'
                              : 'rgba(255, 255, 255, 0.05)',
                          border:
                            selectedEquipmentId === equipment.id
                              ? '2px solid rgba(255, 255, 0, 0.6)'
                              : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedEquipmentId !== equipment.id) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedEquipmentId !== equipment.id) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{equipment.name}</div>
                          <div style={{ fontSize: '10px', color: '#888', fontFamily: 'monospace' }}>
                            {equipment.id}
                          </div>
                        </div>
                        <div style={{ fontSize: '11px', color: '#aaa' }}>{formatModifiers(equipment)}</div>
                      </div>
                    ))}
                  </div>
                );
              })
            ) : (
              // Show flat list if type filter is active
              filteredEquipment.map((equipment) => (
                <div
                  key={equipment.id}
                  onClick={() => onSelectEquipment?.(equipment.id)}
                  style={{
                    padding: '10px',
                    marginBottom: '6px',
                    background:
                      selectedEquipmentId === equipment.id
                        ? 'rgba(255, 255, 0, 0.2)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border:
                      selectedEquipmentId === equipment.id
                        ? '2px solid rgba(255, 255, 0, 0.6)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedEquipmentId !== equipment.id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedEquipmentId !== equipment.id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{equipment.name}</div>
                    <div style={{ fontSize: '10px', color: '#888', fontFamily: 'monospace' }}>
                      {equipment.id}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#aaa' }}>{formatModifiers(equipment)}</div>
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
        {filteredEquipment.length} item{filteredEquipment.length !== 1 ? 's' : ''} found
      </div>
    </div>
  );
};
