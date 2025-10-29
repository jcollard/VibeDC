import { useState, useEffect } from 'react';
import { EquipmentRegistry, type EquipmentDefinition } from '../../utils/EquipmentRegistry';
import type { EquipmentType } from '../../models/combat/Equipment';
import { EquipmentTagRegistry } from '../../utils/EquipmentTagRegistry';

interface EquipmentRegistryPanelProps {
  onClose?: () => void;
}

/**
 * Developer panel for browsing and editing equipment from the Equipment registry.
 * This component is only accessible in development mode.
 */
export const EquipmentRegistryPanel: React.FC<EquipmentRegistryPanelProps> = ({ onClose }) => {
  const [equipment, setEquipment] = useState<EquipmentDefinition[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentDefinition | null>(null);
  const [selectedType, setSelectedType] = useState<EquipmentType | ''>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedEquipment, setEditedEquipment] = useState<EquipmentDefinition | null>(null);
  const [editError, setEditError] = useState<string>('');

  const equipmentTypes: EquipmentType[] = [
    'OneHandedWeapon',
    'TwoHandedWeapon',
    'Shield',
    'Held',
    'Head',
    'Body',
    'Accessory'
  ];

  const statFields = [
    'health', 'mana', 'physicalPower', 'magicPower',
    'speed', 'movement', 'physicalEvade', 'magicEvade',
    'courage', 'attunement'
  ] as const;

  // Load all equipment
  useEffect(() => {
    const allEquipment = EquipmentRegistry.getAll().map(e => EquipmentRegistry.toDefinition(e));
    setEquipment(allEquipment);
    console.log('EquipmentRegistryPanel: Loaded equipment:', allEquipment.length);
  }, []);

  // Get filtered equipment based on selected type
  const filteredEquipment = selectedType
    ? equipment.filter(e => e.type === selectedType)
    : equipment;

  // Handle starting edit mode
  const handleStartEdit = () => {
    if (selectedEquipment) {
      setEditedEquipment({ ...selectedEquipment });
      setIsEditing(true);
      setEditError('');
    }
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedEquipment(null);
    setEditError('');
  };

  // Handle saving edited equipment
  const handleSaveEdit = () => {
    if (!editedEquipment || !selectedEquipment) return;

    // Validate required fields
    if (!editedEquipment.id.trim()) {
      setEditError('ID cannot be empty');
      return;
    }
    if (!editedEquipment.name.trim()) {
      setEditError('Name cannot be empty');
      return;
    }

    // If ID changed, check for duplicates
    if (editedEquipment.id !== selectedEquipment.id && EquipmentRegistry.has(editedEquipment.id)) {
      setEditError(`ID '${editedEquipment.id}' is already in use`);
      return;
    }

    // Register updated equipment
    EquipmentRegistry.register(editedEquipment);

    // Update local state
    setSelectedEquipment(editedEquipment);
    const allEquipment = EquipmentRegistry.getAll().map(e => EquipmentRegistry.toDefinition(e));
    setEquipment(allEquipment);

    setIsEditing(false);
    setEditedEquipment(null);
    setEditError('');
  };

  // Handle deleting equipment
  const handleDelete = () => {
    if (!selectedEquipment) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete equipment "${selectedEquipment.name}" (${selectedEquipment.id})?\n\n` +
      `This action cannot be undone (until you reload the page).`
    );

    if (!confirmed) return;

    const success = EquipmentRegistry.unregister(selectedEquipment.id);

    if (success) {
      console.log(`Deleted equipment "${selectedEquipment.id}"`);
      setSelectedEquipment(null);
      setIsEditing(false);
      setEditedEquipment(null);
      const allEquipment = EquipmentRegistry.getAll().map(e => EquipmentRegistry.toDefinition(e));
      setEquipment(allEquipment);
    }
  };

  // Handle exporting equipment definitions to YAML
  const handleExport = () => {
    const allEquipment = EquipmentRegistry.getAll().map(e => EquipmentRegistry.toDefinition(e));

    // Sort equipment by type, then by ID
    const sortedEquipment = allEquipment.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }
      return a.id.localeCompare(b.id);
    });

    // Generate YAML content
    let yaml = '# Equipment Database\n';
    yaml += '# Exported from Equipment Registry Panel\n\n';
    yaml += 'equipment:\n';

    let currentType = '';
    for (const equip of sortedEquipment) {
      // Add a comment when switching to a new equipment type
      if (equip.type !== currentType) {
        currentType = equip.type;
        yaml += `\n  # ${currentType}\n`;
      }

      yaml += `  - id: "${equip.id}"\n`;
      yaml += `    name: "${equip.name}"\n`;
      yaml += `    type: "${equip.type}"\n`;

      // Add modifiers if they exist
      if (equip.modifiers && Object.keys(equip.modifiers).length > 0) {
        yaml += `    modifiers:\n`;
        for (const [key, value] of Object.entries(equip.modifiers)) {
          yaml += `      ${key}: ${value}\n`;
        }
      }

      // Add multipliers if they exist
      if (equip.multipliers && Object.keys(equip.multipliers).length > 0) {
        yaml += `    multipliers:\n`;
        for (const [key, value] of Object.entries(equip.multipliers)) {
          yaml += `      ${key}: ${value}\n`;
        }
      }

      // Add allowed classes if they exist
      if (equip.allowedClasses && equip.allowedClasses.length > 0) {
        yaml += `    allowedClasses:\n`;
        equip.allowedClasses.forEach(classId => {
          yaml += `      - "${classId}"\n`;
        });
      }

      // Add weapon range if they exist
      if (equip.minRange !== undefined) {
        yaml += `    minRange: ${equip.minRange}\n`;
      }
      if (equip.maxRange !== undefined) {
        yaml += `    maxRange: ${equip.maxRange}\n`;
      }

      // Add type tags if they exist
      if (equip.typeTags && equip.typeTags.length > 0) {
        yaml += `    typeTags: [${equip.typeTags.map(tag => `"${tag}"`).join(', ')}]\n`;
      }

      yaml += '\n';
    }

    // Create a blob and download link
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'equipment-definitions.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Exported equipment definitions:', allEquipment.length);
  };

  // Handle creating new equipment
  const handleCreateNew = () => {
    // Generate a unique ID
    let newId = 'new-equipment';
    let counter = 1;
    while (EquipmentRegistry.has(newId)) {
      newId = `new-equipment-${counter}`;
      counter++;
    }

    // Create new equipment template
    const newEquipment: EquipmentDefinition = {
      id: newId,
      name: 'New Equipment',
      type: 'OneHandedWeapon',
      modifiers: {
        physicalPower: 5
      },
      multipliers: {}
    };

    // Register the new equipment
    EquipmentRegistry.register(newEquipment);

    // Update local state
    const allEquipment = EquipmentRegistry.getAll().map(e => EquipmentRegistry.toDefinition(e));
    setEquipment(allEquipment);
    setSelectedEquipment(newEquipment);

    // Start editing immediately
    setEditedEquipment({ ...newEquipment });
    setIsEditing(true);
    setEditError('');
  };

  // Handle field changes during edit
  const handleFieldChange = (field: keyof EquipmentDefinition, value: any) => {
    if (!editedEquipment) return;
    setEditedEquipment({ ...editedEquipment, [field]: value });
  };

  // Handle modifier changes
  const handleModifierChange = (stat: string, value: number | undefined) => {
    if (!editedEquipment) return;
    const modifiers = { ...editedEquipment.modifiers };
    if (value === undefined || value === 0) {
      delete (modifiers as any)[stat];
    } else {
      (modifiers as any)[stat] = value;
    }
    setEditedEquipment({ ...editedEquipment, modifiers: Object.keys(modifiers).length > 0 ? modifiers : undefined });
  };

  // Handle multiplier changes
  const handleMultiplierChange = (stat: string, value: number | undefined) => {
    if (!editedEquipment) return;
    const multipliers = { ...editedEquipment.multipliers };
    if (value === undefined || value === 1) {
      delete (multipliers as any)[stat];
    } else {
      (multipliers as any)[stat] = value;
    }
    setEditedEquipment({ ...editedEquipment, multipliers: Object.keys(multipliers).length > 0 ? multipliers : undefined });
  };

  // Handle tag toggle
  const handleTagToggle = (tagId: string) => {
    if (!editedEquipment) return;
    const currentTags = editedEquipment.typeTags || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(t => t !== tagId)
      : [...currentTags, tagId];
    setEditedEquipment({ ...editedEquipment, typeTags: newTags.length > 0 ? newTags : undefined });
  };

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
        fontSize: '12px',
        zIndex: 2000,
        width: '900px',
        height: '80vh',
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
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Equipment Registry Browser</div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={handleCreateNew}
            style={{
              padding: '6px 12px',
              background: 'rgba(76, 175, 80, 0.3)',
              border: '1px solid rgba(76, 175, 80, 0.6)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(76, 175, 80, 0.5)';
              e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(76, 175, 80, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.6)';
            }}
            title="Create new equipment"
          >
            + Create New
          </button>
          <button
            onClick={handleExport}
            style={{
              padding: '6px 12px',
              background: 'rgba(33, 150, 243, 0.3)',
              border: '1px solid rgba(33, 150, 243, 0.6)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(33, 150, 243, 0.5)';
              e.currentTarget.style.borderColor = 'rgba(33, 150, 243, 0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(33, 150, 243, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(33, 150, 243, 0.6)';
            }}
            title="Export all equipment definitions to YAML file"
          >
            Export YAML
          </button>
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
              title="Close equipment registry"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Left column - Equipment list and filters */}
        <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
          {/* Registry Info */}
          <div
            style={{
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
              Registry Information
            </div>
            <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
              <div><strong>Total Equipment:</strong> {equipment.length}</div>
              {selectedType && (
                <div><strong>Filtered:</strong> {filteredEquipment.length}</div>
              )}
            </div>
          </div>

          {/* Type Filter */}
          <div
            style={{
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              maxHeight: '200px',
              overflow: 'auto',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
              Filter by Type
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span
                onClick={() => setSelectedType('')}
                style={{
                  padding: '4px 8px',
                  background: !selectedType ? 'rgba(255, 255, 0, 0.3)' : 'rgba(128, 128, 128, 0.2)',
                  border: !selectedType ? '1px solid rgba(255, 255, 0, 0.6)' : '1px solid rgba(128, 128, 128, 0.4)',
                  borderRadius: '3px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                title="Show all types"
              >
                All Types
              </span>
              {equipmentTypes.map(type => {
                const isActive = selectedType === type;
                return (
                  <span
                    key={type}
                    onClick={() => setSelectedType(isActive ? '' : type)}
                    style={{
                      padding: '4px 8px',
                      background: isActive ? 'rgba(255, 255, 0, 0.3)' : 'rgba(255, 152, 0, 0.2)',
                      border: isActive ? '1px solid rgba(255, 255, 0, 0.6)' : '1px solid rgba(255, 152, 0, 0.4)',
                      borderRadius: '3px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255, 152, 0, 0.4)';
                        e.currentTarget.style.borderColor = 'rgba(255, 152, 0, 0.6)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255, 152, 0, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(255, 152, 0, 0.4)';
                      }
                    }}
                    title={isActive ? 'Click to clear filter' : `Filter by ${type}`}
                  >
                    {type}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Equipment list */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
              Equipment {selectedType && `(filtered)`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredEquipment.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', padding: '8px' }}>
                  No equipment found
                </div>
              ) : (
                filteredEquipment.map(equip => (
                  <div
                    key={equip.id}
                    onClick={() => {
                      setSelectedEquipment(equip);
                      setIsEditing(false);
                      setEditError('');
                    }}
                    style={{
                      padding: '8px',
                      background: selectedEquipment?.id === equip.id ? 'rgba(255, 255, 0, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: selectedEquipment?.id === equip.id ? '1px solid rgba(255, 255, 0, 0.6)' : '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedEquipment?.id !== equip.id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedEquipment?.id !== equip.id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{equip.name}</div>
                    <div style={{ fontSize: '9px', color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{equip.id}</span>
                      <span style={{ color: '#ff9800' }}>{equip.type}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column - Equipment details */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            minWidth: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '20px',
            overflow: 'auto',
          }}
        >
          {!selectedEquipment ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#666',
                fontSize: '14px',
              }}
            >
              Select equipment to view details
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Header with edit/delete buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#ffff00' }}>
                  {isEditing ? 'Edit Equipment' : selectedEquipment.name}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {!isEditing ? (
                    <>
                      <button
                        onClick={handleStartEdit}
                        style={{
                          padding: '4px 12px',
                          background: 'rgba(255, 255, 0, 0.2)',
                          border: '1px solid rgba(255, 255, 0, 0.4)',
                          borderRadius: '3px',
                          color: '#ffff00',
                          fontSize: '10px',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ff4444',
                          cursor: 'pointer',
                          padding: '4px',
                          fontSize: '16px',
                          lineHeight: '1',
                          opacity: 0.7,
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                        title="Delete this equipment"
                      >
                        🗑️
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        style={{
                          padding: '4px 12px',
                          background: 'rgba(76, 175, 80, 0.3)',
                          border: '1px solid rgba(76, 175, 80, 0.6)',
                          borderRadius: '3px',
                          color: '#fff',
                          fontSize: '10px',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        style={{
                          padding: '4px 12px',
                          background: 'rgba(255, 68, 68, 0.3)',
                          border: '1px solid rgba(255, 68, 68, 0.6)',
                          borderRadius: '3px',
                          color: '#fff',
                          fontSize: '10px',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editError && (
                <div style={{
                  color: '#f44',
                  fontSize: '11px',
                  padding: '8px',
                  background: 'rgba(255, 68, 68, 0.1)',
                  borderRadius: '3px',
                  border: '1px solid rgba(255, 68, 68, 0.3)',
                }}>
                  {editError}
                </div>
              )}

              {/* Basic fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11px' }}>
                {/* ID */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>ID:</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedEquipment?.id || ''}
                      onChange={(e) => handleFieldChange('id', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: '1px solid #666',
                        borderRadius: '3px',
                        color: '#fff',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                      }}
                    />
                  ) : (
                    <div style={{ color: '#fff' }}>{selectedEquipment.id}</div>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Name:</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedEquipment?.name || ''}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: '1px solid #666',
                        borderRadius: '3px',
                        color: '#fff',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                      }}
                    />
                  ) : (
                    <div style={{ color: '#fff' }}>{selectedEquipment.name}</div>
                  )}
                </div>

                {/* Type */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Type:</label>
                  {isEditing ? (
                    <select
                      value={editedEquipment?.type || 'OneHandedWeapon'}
                      onChange={(e) => handleFieldChange('type', e.target.value as EquipmentType)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: '1px solid #666',
                        borderRadius: '3px',
                        color: '#fff',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      {equipmentTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ color: '#fff' }}>{selectedEquipment.type}</div>
                  )}
                </div>
              </div>

              {/* Weapon Range Section */}
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px', color: '#9c27b0' }}>
                  Weapon Range
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11px' }}>
                  {/* Min Range */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Min Range:</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedEquipment?.minRange ?? ''}
                        onChange={(e) => handleFieldChange('minRange', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="—"
                        style={{
                          width: '100%',
                          padding: '6px',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid #666',
                          borderRadius: '3px',
                          color: '#fff',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                        }}
                      />
                    ) : (
                      <div style={{ color: selectedEquipment.minRange !== undefined ? '#9c27b0' : '#666' }}>
                        {selectedEquipment.minRange ?? '—'}
                      </div>
                    )}
                  </div>

                  {/* Max Range */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Max Range:</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedEquipment?.maxRange ?? ''}
                        onChange={(e) => handleFieldChange('maxRange', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="—"
                        style={{
                          width: '100%',
                          padding: '6px',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid #666',
                          borderRadius: '3px',
                          color: '#fff',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                        }}
                      />
                    ) : (
                      <div style={{ color: selectedEquipment.maxRange !== undefined ? '#9c27b0' : '#666' }}>
                        {selectedEquipment.maxRange ?? '—'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modifiers Section */}
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px', color: '#4caf50' }}>
                  Modifiers (Flat Bonuses)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                  {statFields.map(stat => {
                    const currentValue = isEditing
                      ? (editedEquipment?.modifiers as any)?.[stat]
                      : (selectedEquipment.modifiers as any)?.[stat];

                    return (
                      <div key={stat}>
                        <label style={{ display: 'block', marginBottom: '4px', color: '#aaa', textTransform: 'capitalize' }}>
                          {stat.replace(/([A-Z])/g, ' $1').trim()}:
                        </label>
                        {isEditing ? (
                          <input
                            type="number"
                            value={currentValue || ''}
                            onChange={(e) => handleModifierChange(stat, e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="0"
                            style={{
                              width: '100%',
                              padding: '6px',
                              background: 'rgba(0, 0, 0, 0.5)',
                              border: '1px solid #666',
                              borderRadius: '3px',
                              color: '#fff',
                              fontFamily: 'monospace',
                              fontSize: '11px',
                            }}
                          />
                        ) : (
                          <div style={{ color: currentValue ? '#4caf50' : '#666' }}>
                            {currentValue || '—'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Multipliers Section */}
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px', color: '#2196f3' }}>
                  Multipliers (Percentage Bonuses)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                  {statFields.map(stat => {
                    const currentValue = isEditing
                      ? (editedEquipment?.multipliers as any)?.[stat]
                      : (selectedEquipment.multipliers as any)?.[stat];

                    return (
                      <div key={stat}>
                        <label style={{ display: 'block', marginBottom: '4px', color: '#aaa', textTransform: 'capitalize' }}>
                          {stat.replace(/([A-Z])/g, ' $1').trim()}:
                        </label>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={currentValue || ''}
                            onChange={(e) => handleMultiplierChange(stat, e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="1.0"
                            style={{
                              width: '100%',
                              padding: '6px',
                              background: 'rgba(0, 0, 0, 0.5)',
                              border: '1px solid #666',
                              borderRadius: '3px',
                              color: '#fff',
                              fontFamily: 'monospace',
                              fontSize: '11px',
                            }}
                          />
                        ) : (
                          <div style={{ color: currentValue ? '#2196f3' : '#666' }}>
                            {currentValue ? `×${currentValue}` : '—'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Allowed Classes */}
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
                  Allowed Classes
                </div>
                <div style={{ fontSize: '11px', color: '#aaa', fontStyle: 'italic' }}>
                  {(isEditing ? editedEquipment?.allowedClasses : selectedEquipment.allowedClasses)?.length
                    ? (isEditing ? editedEquipment?.allowedClasses : selectedEquipment.allowedClasses)?.join(', ')
                    : 'All classes (empty means no restrictions)'}
                </div>
              </div>

              {/* Type Tags Section */}
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px', color: '#ff9800' }}>
                  Type Tags
                </div>
                {isEditing ? (
                  <div>
                    {EquipmentTagRegistry.getAllCategories().map(category => {
                      const tagsInCategory = EquipmentTagRegistry.getByCategory(category);
                      const visibleTags = tagsInCategory.filter(tag => !tag.hidden);

                      if (visibleTags.length === 0) return null;

                      return (
                        <div key={category} style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '11px', color: '#ff9800', marginBottom: '6px', textTransform: 'capitalize' }}>
                            {category}:
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {visibleTags.map(tag => {
                              const isSelected = editedEquipment?.typeTags?.includes(tag.id) ?? false;
                              return (
                                <label
                                  key={tag.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 8px',
                                    background: isSelected ? 'rgba(255, 152, 0, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                                    border: isSelected ? '1px solid rgba(255, 152, 0, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '3px',
                                    fontSize: '10px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    userSelect: 'none',
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) {
                                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) {
                                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                    }
                                  }}
                                  title={tag.description}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleTagToggle(tag.id)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                  <span>{tag.displayName}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#aaa' }}>
                    {selectedEquipment.typeTags && selectedEquipment.typeTags.length > 0
                      ? selectedEquipment.typeTags
                          .filter(tag => !EquipmentTagRegistry.isHidden(tag))
                          .map(tag => `${EquipmentTagRegistry.getDisplayName(tag)} (${tag})`)
                          .join(', ')
                      : 'No tags'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
