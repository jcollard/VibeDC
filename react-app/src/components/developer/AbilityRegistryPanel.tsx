import { useState, useEffect } from 'react';
import { CombatAbilityRegistry, type AbilityDefinition } from '../../utils/CombatAbilityRegistry';
import type { AbilityType } from '../../models/combat/CombatAbility';

interface AbilityRegistryPanelProps {
  onClose?: () => void;
}

/**
 * Developer panel for browsing and editing abilities from the CombatAbility registry.
 * This component is only accessible in development mode.
 */
export const AbilityRegistryPanel: React.FC<AbilityRegistryPanelProps> = ({ onClose }) => {
  const [abilities, setAbilities] = useState<AbilityDefinition[]>([]);
  const [selectedAbility, setSelectedAbility] = useState<AbilityDefinition | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedType, setSelectedType] = useState<AbilityType | ''>('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAbility, setEditedAbility] = useState<AbilityDefinition | null>(null);
  const [editError, setEditError] = useState<string>('');

  const abilityTypes: AbilityType[] = ['Action', 'Reaction', 'Passive', 'Movement'];

  // Load all abilities and tags
  useEffect(() => {
    const allAbilities = CombatAbilityRegistry.getAll().map(a => CombatAbilityRegistry.toDefinition(a));
    setAbilities(allAbilities);

    // Extract all unique tags
    const tagsSet = new Set<string>();
    allAbilities.forEach(ability => {
      ability.tags?.forEach(tag => tagsSet.add(tag));
    });
    setAllTags(Array.from(tagsSet).sort());

    console.log('AbilityRegistryPanel: Loaded abilities:', allAbilities.length);
  }, []);

  // Get filtered abilities based on selected tag and type
  const filteredAbilities = abilities.filter(a => {
    if (selectedTag && !a.tags?.includes(selectedTag)) return false;
    if (selectedType && a.abilityType !== selectedType) return false;
    return true;
  });

  // Handle starting edit mode
  const handleStartEdit = () => {
    if (selectedAbility) {
      setEditedAbility({ ...selectedAbility });
      setIsEditing(true);
      setEditError('');
    }
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedAbility(null);
    setEditError('');
  };

  // Handle saving edited ability
  const handleSaveEdit = () => {
    if (!editedAbility || !selectedAbility) return;

    // Validate required fields
    if (!editedAbility.id.trim()) {
      setEditError('ID cannot be empty');
      return;
    }
    if (!editedAbility.name.trim()) {
      setEditError('Name cannot be empty');
      return;
    }
    if (!editedAbility.description.trim()) {
      setEditError('Description cannot be empty');
      return;
    }

    // If ID changed, check for duplicates
    if (editedAbility.id !== selectedAbility.id && CombatAbilityRegistry.has(editedAbility.id)) {
      setEditError(`ID '${editedAbility.id}' is already in use`);
      return;
    }

    // Register updated ability (will replace if ID changed)
    CombatAbilityRegistry.register(editedAbility);

    // Update local state
    setSelectedAbility(editedAbility);
    const allAbilities = CombatAbilityRegistry.getAll().map(a => CombatAbilityRegistry.toDefinition(a));
    setAbilities(allAbilities);

    // Update tags
    const tagsSet = new Set<string>();
    allAbilities.forEach(ability => {
      ability.tags?.forEach(tag => tagsSet.add(tag));
    });
    setAllTags(Array.from(tagsSet).sort());

    setIsEditing(false);
    setEditedAbility(null);
    setEditError('');
  };

  // Handle deleting an ability
  const handleDelete = () => {
    if (!selectedAbility) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ability "${selectedAbility.name}" (${selectedAbility.id})?\n\n` +
      `This action cannot be undone (until you reload the page).`
    );

    if (!confirmed) return;

    const success = CombatAbilityRegistry.unregister(selectedAbility.id);

    if (success) {
      console.log(`Deleted ability "${selectedAbility.id}"`);
      setSelectedAbility(null);
      setIsEditing(false);
      setEditedAbility(null);
      const allAbilities = CombatAbilityRegistry.getAll().map(a => CombatAbilityRegistry.toDefinition(a));
      setAbilities(allAbilities);

      // Update tags
      const tagsSet = new Set<string>();
      allAbilities.forEach(ability => {
        ability.tags?.forEach(tag => tagsSet.add(tag));
      });
      setAllTags(Array.from(tagsSet).sort());
    }
  };

  // Handle exporting ability definitions to YAML
  const handleExport = () => {
    const allAbilities = CombatAbilityRegistry.getAll().map(a => CombatAbilityRegistry.toDefinition(a));

    // Sort abilities by type, then by ID for cleaner output
    const sortedAbilities = allAbilities.sort((a, b) => {
      if (a.abilityType !== b.abilityType) {
        return a.abilityType.localeCompare(b.abilityType);
      }
      return a.id.localeCompare(b.id);
    });

    // Generate YAML content
    let yaml = '# Combat Ability Database\n';
    yaml += '# Exported from Ability Registry Panel\n\n';
    yaml += 'abilities:\n';

    let currentType = '';
    for (const ability of sortedAbilities) {
      // Add a comment when switching to a new ability type
      if (ability.abilityType !== currentType) {
        currentType = ability.abilityType;
        yaml += `\n  # ${currentType} Abilities\n`;
      }

      yaml += `  - id: "${ability.id}"\n`;
      yaml += `    name: "${ability.name}"\n`;
      yaml += `    description: "${ability.description}"\n`;
      yaml += `    abilityType: "${ability.abilityType}"\n`;
      yaml += `    experiencePrice: ${ability.experiencePrice}\n`;

      if (ability.tags && ability.tags.length > 0) {
        yaml += `    tags:\n`;
        ability.tags.forEach(tag => {
          yaml += `      - "${tag}"\n`;
        });
      }

      yaml += '\n';
    }

    // Create a blob and download link
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ability-definitions.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Exported ability definitions:', allAbilities.length);
  };

  // Handle creating a new ability
  const handleCreateNew = () => {
    // Generate a unique ID for the new ability
    let newId = 'new-ability';
    let counter = 1;
    while (CombatAbilityRegistry.has(newId)) {
      newId = `new-ability-${counter}`;
      counter++;
    }

    // Create a new ability template with default values
    const newAbility: AbilityDefinition = {
      id: newId,
      name: 'New Ability',
      description: 'Description of the new ability',
      abilityType: 'Action',
      experiencePrice: 100,
      tags: [],
    };

    // Register the new ability
    CombatAbilityRegistry.register(newAbility);

    // Update local state
    const allAbilities = CombatAbilityRegistry.getAll().map(a => CombatAbilityRegistry.toDefinition(a));
    setAbilities(allAbilities);
    setSelectedAbility(newAbility);

    // Update tags
    const tagsSet = new Set<string>();
    allAbilities.forEach(ability => {
      ability.tags?.forEach(tag => tagsSet.add(tag));
    });
    setAllTags(Array.from(tagsSet).sort());

    // Start editing the new ability immediately
    setEditedAbility({ ...newAbility });
    setIsEditing(true);
    setEditError('');
  };

  // Handle field changes during edit
  const handleFieldChange = (field: keyof AbilityDefinition, value: any) => {
    if (!editedAbility) return;
    setEditedAbility({ ...editedAbility, [field]: value });
  };

  // Handle adding a tag
  const handleAddTag = (tag: string) => {
    if (!editedAbility || !tag.trim()) return;
    const currentTags = editedAbility.tags || [];
    if (currentTags.includes(tag.trim())) return;

    setEditedAbility({
      ...editedAbility,
      tags: [...currentTags, tag.trim()]
    });
  };

  // Handle removing a tag
  const handleRemoveTag = (tag: string) => {
    if (!editedAbility) return;
    const currentTags = editedAbility.tags || [];
    setEditedAbility({
      ...editedAbility,
      tags: currentTags.filter(t => t !== tag)
    });
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
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Ability Registry Browser</div>
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
            title="Create a new ability"
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
            title="Export all ability definitions to YAML file"
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
              title="Close ability registry"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Left column - Ability list and filters */}
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
              <div><strong>Total Abilities:</strong> {abilities.length}</div>
              {(selectedTag || selectedType) && (
                <div><strong>Filtered:</strong> {filteredAbilities.length}</div>
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
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
              Filter by Type
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <span
                onClick={() => setSelectedType('')}
                style={{
                  padding: '3px 8px',
                  background: !selectedType ? 'rgba(255, 255, 0, 0.3)' : 'rgba(128, 128, 128, 0.2)',
                  border: !selectedType ? '1px solid rgba(255, 255, 0, 0.6)' : '1px solid rgba(128, 128, 128, 0.4)',
                  borderRadius: '3px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                title="Show all types"
              >
                All
              </span>
              {abilityTypes.map(type => {
                const isActive = selectedType === type;
                return (
                  <span
                    key={type}
                    onClick={() => setSelectedType(isActive ? '' : type)}
                    style={{
                      padding: '3px 8px',
                      background: isActive ? 'rgba(255, 255, 0, 0.3)' : 'rgba(156, 39, 176, 0.2)',
                      border: isActive ? '1px solid rgba(255, 255, 0, 0.6)' : '1px solid rgba(156, 39, 176, 0.4)',
                      borderRadius: '3px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(156, 39, 176, 0.4)';
                        e.currentTarget.style.borderColor = 'rgba(156, 39, 176, 0.6)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(156, 39, 176, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(156, 39, 176, 0.4)';
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

          {/* Tags */}
          {allTags.length > 0 && (
            <div
              style={{
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
                Tags <span style={{ fontSize: '9px', color: '#aaa', fontWeight: 'normal' }}>(click to filter)</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {allTags.map(tag => {
                  const isActive = selectedTag === tag;
                  return (
                    <span
                      key={tag}
                      onClick={() => setSelectedTag(isActive ? '' : tag)}
                      style={{
                        padding: '3px 8px',
                        background: isActive ? 'rgba(255, 255, 0, 0.3)' : 'rgba(76, 175, 80, 0.2)',
                        border: isActive ? '1px solid rgba(255, 255, 0, 0.6)' : '1px solid rgba(76, 175, 80, 0.4)',
                        borderRadius: '3px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(76, 175, 80, 0.4)';
                          e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.6)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(76, 175, 80, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.4)';
                        }
                      }}
                      title={isActive ? 'Click to clear filter' : `Click to filter by "${tag}"`}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ability list */}
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
              Abilities {(selectedTag || selectedType) && `(filtered)`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredAbilities.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', padding: '8px' }}>
                  No abilities found
                </div>
              ) : (
                filteredAbilities.map(ability => (
                  <div
                    key={ability.id}
                    onClick={() => {
                      setSelectedAbility(ability);
                      setIsEditing(false);
                      setEditError('');
                    }}
                    style={{
                      padding: '8px',
                      background: selectedAbility?.id === ability.id ? 'rgba(255, 255, 0, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: selectedAbility?.id === ability.id ? '1px solid rgba(255, 255, 0, 0.6)' : '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedAbility?.id !== ability.id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedAbility?.id !== ability.id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{ability.name}</div>
                    <div style={{ fontSize: '9px', color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{ability.id}</span>
                      <span style={{ color: '#9c27b0' }}>{ability.abilityType}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column - Ability details */}
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
          {!selectedAbility ? (
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
              Select an ability to view details
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Header with edit/delete buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#ffff00' }}>
                  {isEditing ? 'Edit Ability' : selectedAbility.name}
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
                        title="Delete this ability"
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

              {/* Ability fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11px' }}>
                {/* ID */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>ID:</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedAbility?.id || ''}
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
                    <div style={{ color: '#fff' }}>{selectedAbility.id}</div>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Name:</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedAbility?.name || ''}
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
                    <div style={{ color: '#fff' }}>{selectedAbility.name}</div>
                  )}
                </div>

                {/* Ability Type */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Type:</label>
                  {isEditing ? (
                    <select
                      value={editedAbility?.abilityType || 'Action'}
                      onChange={(e) => handleFieldChange('abilityType', e.target.value as AbilityType)}
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
                      {abilityTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ color: '#fff' }}>{selectedAbility.abilityType}</div>
                  )}
                </div>

                {/* Experience Price */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Experience Price:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedAbility?.experiencePrice || 0}
                      onChange={(e) => handleFieldChange('experiencePrice', Number(e.target.value))}
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
                    <div style={{ color: '#fff' }}>{selectedAbility.experiencePrice}</div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', color: '#aaa', fontSize: '11px' }}>
                  Description:
                </label>
                {isEditing ? (
                  <textarea
                    value={editedAbility?.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid #666',
                      borderRadius: '3px',
                      color: '#fff',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      minHeight: '80px',
                      resize: 'vertical',
                    }}
                  />
                ) : (
                  <div style={{ color: '#fff', fontSize: '11px' }}>
                    {selectedAbility.description}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', color: '#aaa', fontSize: '11px' }}>
                  Tags:
                </label>
                {isEditing ? (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                      {editedAbility?.tags?.map(tag => (
                        <span
                          key={tag}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 6px',
                            background: 'rgba(76, 175, 80, 0.2)',
                            border: '1px solid rgba(76, 175, 80, 0.4)',
                            borderRadius: '3px',
                            fontSize: '9px',
                          }}
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ff4444',
                              cursor: 'pointer',
                              padding: '0',
                              marginLeft: '2px',
                              fontSize: '10px',
                              lineHeight: '1',
                              fontWeight: 'bold',
                            }}
                            title={`Remove tag "${tag}"`}
                          >
                            ×
                          </button>
                        </span>
                      )) || (
                        <div style={{ fontSize: '9px', color: '#666', fontStyle: 'italic' }}>
                          No tags
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input
                        type="text"
                        placeholder="Add tag..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '4px 6px',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid #666',
                          borderRadius: '3px',
                          color: '#fff',
                          fontFamily: 'monospace',
                          fontSize: '10px',
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {selectedAbility.tags?.map(tag => (
                      <span
                        key={tag}
                        style={{
                          padding: '2px 6px',
                          background: 'rgba(76, 175, 80, 0.2)',
                          border: '1px solid rgba(76, 175, 80, 0.4)',
                          borderRadius: '3px',
                          fontSize: '9px',
                        }}
                      >
                        {tag}
                      </span>
                    )) || (
                      <span style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>No tags</span>
                    )}
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
