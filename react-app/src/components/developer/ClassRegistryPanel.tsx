import { useState, useEffect } from 'react';
import { UnitClassRegistry, type UnitClassDefinition } from '../../utils/UnitClassRegistry';
import { UnitClass } from '../../models/combat/UnitClass';
import { CombatAbility } from '../../models/combat/CombatAbility';
import { EquipmentTagRegistry } from '../../utils/EquipmentTagRegistry';

interface ClassRegistryPanelProps {
  onClose?: () => void;
}

const statFields = [
  'health', 'mana', 'physicalPower', 'magicPower',
  'speed', 'movement', 'physicalEvade', 'magicEvade',
  'courage', 'attunement'
] as const;

/**
 * Developer panel for browsing and editing unit classes from the UnitClass registry.
 * This component is only accessible in development mode.
 */
export function ClassRegistryPanel({ onClose }: ClassRegistryPanelProps) {
  const [classes, setClasses] = useState<UnitClassDefinition[]>([]);
  const [selectedClass, setSelectedClass] = useState<UnitClassDefinition | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedClass, setEditedClass] = useState<UnitClassDefinition | null>(null);
  const [editError, setEditError] = useState<string>('');
  const [availableAbilities, setAvailableAbilities] = useState<CombatAbility[]>([]);
  const [newTag, setNewTag] = useState('');

  // Load all classes and tags
  useEffect(() => {
    const allClasses = UnitClassRegistry.getAll().map(c => UnitClassRegistry.toDefinition(c));
    setClasses(allClasses);

    // Extract all unique tags
    const tagsSet = new Set<string>();
    allClasses.forEach(unitClass => {
      unitClass.tags?.forEach(tag => tagsSet.add(tag));
    });
    setAllTags(Array.from(tagsSet).sort());

    // Load available abilities
    setAvailableAbilities(CombatAbility.getAll());

    console.log('ClassRegistryPanel: Loaded classes:', allClasses.length);
  }, []);

  // Get filtered classes based on selected tag
  const filteredClasses = selectedTag
    ? classes.filter(c => c.tags?.includes(selectedTag))
    : classes;

  // Handle starting edit mode
  const handleStartEdit = () => {
    if (selectedClass) {
      setEditedClass({ ...selectedClass });
      setIsEditing(true);
      setEditError('');
    }
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedClass(null);
    setEditError('');
  };

  // Handle saving edited class
  const handleSaveEdit = () => {
    if (!editedClass || !selectedClass) return;

    // Validate required fields
    if (!editedClass.id.trim()) {
      setEditError('ID cannot be empty');
      return;
    }
    if (!editedClass.name.trim()) {
      setEditError('Name cannot be empty');
      return;
    }
    if (!editedClass.description.trim()) {
      setEditError('Description cannot be empty');
      return;
    }

    // If ID changed, check for duplicates
    if (editedClass.id !== selectedClass.id && UnitClassRegistry.has(editedClass.id)) {
      setEditError(`ID '${editedClass.id}' is already in use`);
      return;
    }

    // If ID changed, remove the old class first
    if (editedClass.id !== selectedClass.id) {
      UnitClassRegistry.unregister(selectedClass.id);
    }

    // Register updated class
    UnitClassRegistry.register(editedClass);

    // Update local state
    setSelectedClass(editedClass);
    const allClasses = UnitClassRegistry.getAll().map(c => UnitClassRegistry.toDefinition(c));
    setClasses(allClasses);

    // Update tags
    const tagsSet = new Set<string>();
    allClasses.forEach(unitClass => {
      unitClass.tags?.forEach(tag => tagsSet.add(tag));
    });
    setAllTags(Array.from(tagsSet).sort());

    setIsEditing(false);
    setEditedClass(null);
    setEditError('');
  };

  // Handle deleting a class
  const handleDelete = () => {
    if (!selectedClass) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete class "${selectedClass.name}" (${selectedClass.id})?\n\n` +
      `This action cannot be undone (until you reload the page).`
    );

    if (!confirmed) return;

    const success = UnitClassRegistry.unregister(selectedClass.id);

    if (success) {
      console.log(`Deleted class "${selectedClass.id}"`);
      setSelectedClass(null);
      setIsEditing(false);
      setEditedClass(null);
      const allClasses = UnitClassRegistry.getAll().map(c => UnitClassRegistry.toDefinition(c));
      setClasses(allClasses);

      // Update tags
      const tagsSet = new Set<string>();
      allClasses.forEach(unitClass => {
        unitClass.tags?.forEach(tag => tagsSet.add(tag));
      });
      setAllTags(Array.from(tagsSet).sort());
    }
  };

  // Handle exporting class definitions to YAML
  const handleExport = () => {
    const allClasses = UnitClassRegistry.getAll().map(c => UnitClassRegistry.toDefinition(c));

    // Generate YAML content
    let yaml = '# Unit Class Database\n';
    yaml += 'classes:\n';

    allClasses.forEach(unitClass => {
      yaml += `  - id: "${unitClass.id}"\n`;
      yaml += `    name: "${unitClass.name}"\n`;
      yaml += `    description: "${unitClass.description}"\n`;

      if (unitClass.tags && unitClass.tags.length > 0) {
        yaml += '    tags:\n';
        unitClass.tags.forEach(tag => {
          yaml += `      - "${tag}"\n`;
        });
      }

      if (unitClass.learnableAbilities && unitClass.learnableAbilities.length > 0) {
        yaml += '    learnableAbilities:\n';
        unitClass.learnableAbilities.forEach(id => {
          yaml += `      - "${id}"\n`;
        });
      }

      if (unitClass.modifiers && Object.keys(unitClass.modifiers).length > 0) {
        yaml += '    modifiers:\n';
        Object.entries(unitClass.modifiers).forEach(([key, value]) => {
          yaml += `      ${key}: ${value}\n`;
        });
      }

      if (unitClass.multipliers && Object.keys(unitClass.multipliers).length > 0) {
        yaml += '    multipliers:\n';
        Object.entries(unitClass.multipliers).forEach(([key, value]) => {
          yaml += `      ${key}: ${value}\n`;
        });
      }

      if (unitClass.requirements && Object.keys(unitClass.requirements).length > 0) {
        yaml += '    requirements:\n';
        Object.entries(unitClass.requirements).forEach(([classId, xp]) => {
          yaml += `      "${classId}": ${xp}\n`;
        });
      }

      if (unitClass.allowedEquipmentTypes && unitClass.allowedEquipmentTypes.length > 0) {
        yaml += '    allowedEquipmentTypes:\n';
        unitClass.allowedEquipmentTypes.forEach(tag => {
          yaml += `      - "${tag}"\n`;
        });
      }

      yaml += '\n';
    });

    // Create download
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'class-database-export.yaml';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle creating a new class
  const handleCreateNew = () => {
    // Generate a unique ID for the new class
    let newId = 'new-class';
    let counter = 1;
    while (UnitClassRegistry.has(newId)) {
      newId = `new-class-${counter}`;
      counter++;
    }

    // Create a new class template with default values
    const newClass: UnitClassDefinition = {
      id: newId,
      name: 'New Class',
      description: 'Description of the new class',
      tags: [],
      learnableAbilities: [],
      modifiers: {},
      multipliers: {},
      requirements: {},
    };

    // Register the new class
    UnitClassRegistry.register(newClass);

    // Update local state
    const allClasses = UnitClassRegistry.getAll().map(c => UnitClassRegistry.toDefinition(c));
    setClasses(allClasses);
    setSelectedClass(newClass);

    // Update tags
    const tagsSet = new Set<string>();
    allClasses.forEach(unitClass => {
      unitClass.tags?.forEach(tag => tagsSet.add(tag));
    });
    setAllTags(Array.from(tagsSet).sort());

    // Start editing the new class immediately
    setEditedClass({ ...newClass });
    setIsEditing(true);
    setEditError('');
  };

  // Handle field changes during edit
  const handleFieldChange = (field: keyof UnitClassDefinition, value: any) => {
    if (!editedClass) return;
    setEditedClass({ ...editedClass, [field]: value });
  };

  // Handle modifier changes
  const handleModifierChange = (stat: string, value: number | undefined) => {
    if (!editedClass) return;
    const modifiers = { ...editedClass.modifiers };
    if (value === undefined || value === 0) {
      delete (modifiers as any)[stat];
    } else {
      (modifiers as any)[stat] = value;
    }
    setEditedClass({ ...editedClass, modifiers });
  };

  // Handle multiplier changes
  const handleMultiplierChange = (stat: string, value: number | undefined) => {
    if (!editedClass) return;
    const multipliers = { ...editedClass.multipliers };
    if (value === undefined || value === 1.0) {
      delete (multipliers as any)[stat];
    } else {
      (multipliers as any)[stat] = value;
    }
    setEditedClass({ ...editedClass, multipliers });
  };

  // Handle adding a tag
  const handleAddTag = () => {
    if (!editedClass || !newTag.trim()) return;
    const currentTags = editedClass.tags || [];
    if (currentTags.includes(newTag.trim())) {
      setNewTag('');
      return;
    }

    setEditedClass({
      ...editedClass,
      tags: [...currentTags, newTag.trim()]
    });
    setNewTag('');
  };

  // Handle removing a tag
  const handleRemoveTag = (tag: string) => {
    if (!editedClass) return;
    const currentTags = editedClass.tags || [];
    setEditedClass({
      ...editedClass,
      tags: currentTags.filter(t => t !== tag)
    });
  };

  // Handle adding an ability
  const handleAddAbility = (abilityId: string) => {
    if (!editedClass || !abilityId) return;
    const abilities = editedClass.learnableAbilities || [];
    if (abilities.includes(abilityId)) return;

    setEditedClass({
      ...editedClass,
      learnableAbilities: [...abilities, abilityId]
    });
  };

  // Handle removing an ability
  const handleRemoveAbility = (abilityId: string) => {
    if (!editedClass) return;
    const abilities = editedClass.learnableAbilities || [];
    setEditedClass({
      ...editedClass,
      learnableAbilities: abilities.filter(a => a !== abilityId)
    });
  };

  // Handle adding a requirement
  const handleAddRequirement = (classId: string, xp: number) => {
    if (!editedClass || !classId) return;
    const requirements = { ...(editedClass.requirements || {}) };
    requirements[classId] = xp;
    setEditedClass({ ...editedClass, requirements });
  };

  // Handle removing a requirement
  const handleRemoveRequirement = (classId: string) => {
    if (!editedClass) return;
    const requirements = { ...(editedClass.requirements || {}) };
    delete requirements[classId];
    setEditedClass({ ...editedClass, requirements });
  };

  // Handle updating a requirement's XP value
  const handleUpdateRequirementXP = (classId: string, xp: number) => {
    if (!editedClass) return;
    const requirements = { ...(editedClass.requirements || {}) };
    requirements[classId] = xp;
    setEditedClass({ ...editedClass, requirements });
  };

  // Handle toggling equipment type tags
  const handleEquipmentTypeToggle = (tagId: string) => {
    if (!editedClass) return;
    const currentTypes = editedClass.allowedEquipmentTypes || [];
    const newTypes = currentTypes.includes(tagId)
      ? currentTypes.filter(t => t !== tagId)
      : [...currentTypes, tagId];
    setEditedClass({ ...editedClass, allowedEquipmentTypes: newTypes.length > 0 ? newTypes : undefined });
  };

  const displayClass = isEditing ? editedClass : selectedClass;

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
        width: '1100px',
        height: '85vh',
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
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Class Registry</div>
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
            {classes.length} classes loaded
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleCreateNew}
            style={{
              background: 'rgba(76, 175, 80, 0.2)',
              border: '1px solid rgba(76, 175, 80, 0.5)',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: 'monospace',
            }}
          >
            Create New
          </button>
          <button
            onClick={handleExport}
            style={{
              background: 'rgba(33, 150, 243, 0.2)',
              border: '1px solid rgba(33, 150, 243, 0.5)',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: 'monospace',
            }}
          >
            Export
          </button>
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
            }}
            title="Close class registry"
          >
            ×
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: '16px' }}>
        {/* Left Panel - Class List */}
        <div
          style={{
            width: '280px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Tag Filter */}
          <div>
            <div style={{ fontSize: '11px', marginBottom: '6px', color: '#aaa' }}>Filter by tag:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              <button
                onClick={() => setSelectedTag('')}
                style={{
                  background: selectedTag === '' ? 'rgba(156, 39, 176, 0.3)' : 'rgba(128, 128, 128, 0.2)',
                  border: selectedTag === '' ? '1px solid rgba(156, 39, 176, 0.5)' : '1px solid #444',
                  color: '#fff',
                  padding: '4px 8px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                }}
              >
                All ({classes.length})
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  style={{
                    background: selectedTag === tag ? 'rgba(156, 39, 176, 0.3)' : 'rgba(128, 128, 128, 0.2)',
                    border: selectedTag === tag ? '1px solid rgba(156, 39, 176, 0.5)' : '1px solid #444',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Class List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              border: '1px solid #444',
              borderRadius: '4px',
            }}
          >
            {filteredClasses.map(unitClass => (
              <div
                key={unitClass.id}
                onClick={() => {
                  setSelectedClass(unitClass);
                  setIsEditing(false);
                  setEditedClass(null);
                  setEditError('');
                }}
                style={{
                  padding: '8px',
                  borderBottom: '1px solid #333',
                  cursor: 'pointer',
                  background: selectedClass?.id === unitClass.id ? 'rgba(76, 175, 80, 0.15)' : 'transparent',
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{unitClass.name}</div>
                {unitClass.tags && unitClass.tags.length > 0 && (
                  <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                    {unitClass.tags.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Class Details */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {displayClass ? (
            <>
              {/* Detail Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #444',
                }}
              >
                <div style={{ flex: 1 }}>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editedClass?.name || ''}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        placeholder="Class Name"
                        style={{
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid #666',
                          color: '#fff',
                          padding: '6px',
                          borderRadius: '4px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          width: '100%',
                          fontFamily: 'monospace',
                          marginBottom: '6px',
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '10px', color: '#888' }}>ID:</span>
                        <input
                          type="text"
                          value={editedClass?.id || ''}
                          onChange={(e) => handleFieldChange('id', e.target.value)}
                          placeholder="class-id"
                          style={{
                            background: 'rgba(0, 0, 0, 0.5)',
                            border: '1px solid #666',
                            color: '#fff',
                            padding: '4px 6px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontFamily: 'monospace',
                            flex: 1,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{displayClass.name}</div>
                      <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>ID: {displayClass.id}</div>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        style={{
                          background: 'rgba(76, 175, 80, 0.2)',
                          border: '1px solid rgba(76, 175, 80, 0.5)',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        style={{
                          background: 'rgba(128, 128, 128, 0.2)',
                          border: '1px solid #666',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleStartEdit}
                        style={{
                          background: 'rgba(33, 150, 243, 0.2)',
                          border: '1px solid rgba(33, 150, 243, 0.5)',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        style={{
                          background: 'rgba(244, 67, 54, 0.2)',
                          border: '1px solid rgba(244, 67, 54, 0.5)',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {editError && (
                <div
                  style={{
                    background: 'rgba(244, 67, 54, 0.2)',
                    border: '1px solid rgba(244, 67, 54, 0.5)',
                    color: '#ff6b6b',
                    padding: '8px',
                    borderRadius: '4px',
                    marginBottom: '12px',
                    fontSize: '11px',
                  }}
                >
                  {editError}
                </div>
              )}

              {/* Detail Content - Scrollable */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* Description */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', marginBottom: '4px', color: '#aaa' }}>Description:</div>
                  {isEditing ? (
                    <textarea
                      value={editedClass?.description || ''}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      style={{
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: '1px solid #666',
                        color: '#fff',
                        padding: '6px',
                        borderRadius: '4px',
                        width: '100%',
                        minHeight: '60px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        resize: 'vertical',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        padding: '6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                      }}
                    >
                      {displayClass.description}
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', marginBottom: '4px', color: '#aaa' }}>Tags:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {(displayClass.tags || []).map(tag => (
                      <span
                        key={tag}
                        style={{
                          background: 'rgba(156, 39, 176, 0.2)',
                          border: '1px solid rgba(156, 39, 176, 0.4)',
                          padding: '4px 8px',
                          borderRadius: '3px',
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {tag}
                        {isEditing && (
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#f44336',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '14px',
                            }}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                    {isEditing && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                          placeholder="New tag"
                          style={{
                            background: 'rgba(0, 0, 0, 0.5)',
                            border: '1px solid #666',
                            color: '#fff',
                            padding: '4px 8px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            width: '100px',
                            fontFamily: 'monospace',
                          }}
                        />
                        <button
                          onClick={handleAddTag}
                          style={{
                            background: 'rgba(76, 175, 80, 0.2)',
                            border: '1px solid rgba(76, 175, 80, 0.5)',
                            color: '#fff',
                            padding: '4px 8px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '10px',
                            fontFamily: 'monospace',
                          }}
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Two Column Layout for Stats and Abilities */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  {/* Left Column - Stats */}
                  <div style={{ flex: 1 }}>
                    {/* Modifiers */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', marginBottom: '4px', color: '#aaa' }}>Modifiers (Flat):</div>
                      <div
                        style={{
                          background: 'rgba(76, 175, 80, 0.1)',
                          border: '1px solid rgba(76, 175, 80, 0.3)',
                          borderRadius: '4px',
                          padding: '8px',
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          {statFields.map(stat => (
                            <div key={stat} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '10px', color: '#aaa', width: '90px' }}>{stat}:</span>
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={(editedClass?.modifiers as any)?.[stat] || ''}
                                  onChange={(e) =>
                                    handleModifierChange(stat, e.target.value ? Number(e.target.value) : undefined)
                                  }
                                  placeholder="0"
                                  style={{
                                    background: 'rgba(0, 0, 0, 0.5)',
                                    border: '1px solid #666',
                                    color: '#fff',
                                    padding: '3px 6px',
                                    borderRadius: '3px',
                                    fontSize: '10px',
                                    width: '60px',
                                    fontFamily: 'monospace',
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: '10px' }}>
                                  {(displayClass.modifiers as any)?.[stat] || 0}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Multipliers */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', marginBottom: '4px', color: '#aaa' }}>Multipliers (%):</div>
                      <div
                        style={{
                          background: 'rgba(33, 150, 243, 0.1)',
                          border: '1px solid rgba(33, 150, 243, 0.3)',
                          borderRadius: '4px',
                          padding: '8px',
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          {statFields.map(stat => (
                            <div key={stat} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '10px', color: '#aaa', width: '90px' }}>{stat}:</span>
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.1"
                                  value={(editedClass?.multipliers as any)?.[stat] || ''}
                                  onChange={(e) =>
                                    handleMultiplierChange(stat, e.target.value ? Number(e.target.value) : undefined)
                                  }
                                  placeholder="1.0"
                                  style={{
                                    background: 'rgba(0, 0, 0, 0.5)',
                                    border: '1px solid #666',
                                    color: '#fff',
                                    padding: '3px 6px',
                                    borderRadius: '3px',
                                    fontSize: '10px',
                                    width: '60px',
                                    fontFamily: 'monospace',
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: '10px' }}>
                                  {(displayClass.multipliers as any)?.[stat] || 1.0}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Requirements */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', marginBottom: '4px', color: '#aaa' }}>Requirements:</div>
                      <div
                        style={{
                          background: 'rgba(255, 152, 0, 0.1)',
                          border: '1px solid rgba(255, 152, 0, 0.3)',
                          borderRadius: '4px',
                          padding: '8px',
                          minHeight: '60px',
                        }}
                      >
                        {Object.entries(displayClass.requirements || {}).map(([classId, xp]) => {
                          const reqClass = UnitClass.getById(classId);
                          return (
                            <div
                              key={classId}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '4px 0',
                                borderBottom: '1px solid rgba(255, 152, 0, 0.2)',
                                gap: '8px',
                              }}
                            >
                              <span style={{ fontSize: '10px', flex: 1 }}>
                                {reqClass ? reqClass.name : classId}:
                              </span>
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={xp}
                                  onChange={(e) => handleUpdateRequirementXP(classId, Number(e.target.value))}
                                  style={{
                                    background: 'rgba(0, 0, 0, 0.5)',
                                    border: '1px solid #666',
                                    color: '#fff',
                                    padding: '3px 6px',
                                    borderRadius: '3px',
                                    fontSize: '10px',
                                    width: '60px',
                                    fontFamily: 'monospace',
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: '10px' }}>{xp} XP</span>
                              )}
                              {isEditing && (
                                <button
                                  onClick={() => handleRemoveRequirement(classId)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#f44336',
                                    cursor: 'pointer',
                                    padding: 0,
                                    fontSize: '14px',
                                  }}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {Object.keys(displayClass.requirements || {}).length === 0 && (
                          <div style={{ fontSize: '10px', color: '#666' }}>No requirements</div>
                        )}
                        {isEditing && (
                          <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAddRequirement(e.target.value, 100);
                                  e.target.value = '';
                                }
                              }}
                              style={{
                                background: 'rgba(0, 0, 0, 0.5)',
                                border: '1px solid #666',
                                color: '#fff',
                                padding: '4px',
                                borderRadius: '3px',
                                fontSize: '10px',
                                flex: 1,
                                fontFamily: 'monospace',
                              }}
                            >
                              <option value="">Add requirement...</option>
                              {classes
                                .filter(c => c.id !== displayClass.id)
                                .map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Allowed Equipment Types */}
                    <div>
                      <div style={{ fontSize: '11px', marginBottom: '4px', color: '#aaa' }}>
                        Allowed Equipment Types:
                      </div>
                      {isEditing ? (
                        <div
                          style={{
                            background: 'rgba(255, 152, 0, 0.1)',
                            border: '1px solid rgba(255, 152, 0, 0.3)',
                            borderRadius: '4px',
                            padding: '8px',
                          }}
                        >
                          {EquipmentTagRegistry.getAllCategories().map(category => {
                            const tagsInCategory = EquipmentTagRegistry.getByCategory(category);
                            const restrictionTags = tagsInCategory.filter(tag => !tag.hidden && tag.isRestriction);

                            if (restrictionTags.length === 0) return null;

                            return (
                              <div key={category} style={{ marginBottom: '8px' }}>
                                <div style={{ fontSize: '10px', color: '#ff9800', marginBottom: '4px', textTransform: 'capitalize' }}>
                                  {category}:
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {restrictionTags.map(tag => {
                                    const isSelected = editedClass?.allowedEquipmentTypes?.includes(tag.id) ?? false;
                                    return (
                                      <label
                                        key={tag.id}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '3px 6px',
                                          background: isSelected ? 'rgba(255, 152, 0, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                                          border: isSelected ? '1px solid rgba(255, 152, 0, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                                          borderRadius: '3px',
                                          fontSize: '9px',
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
                                          onChange={() => handleEquipmentTypeToggle(tag.id)}
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
                        <div
                          style={{
                            background: 'rgba(255, 152, 0, 0.1)',
                            border: '1px solid rgba(255, 152, 0, 0.3)',
                            borderRadius: '4px',
                            padding: '8px',
                            fontSize: '10px',
                            minHeight: '40px',
                          }}
                        >
                          {displayClass.allowedEquipmentTypes && displayClass.allowedEquipmentTypes.length > 0
                            ? displayClass.allowedEquipmentTypes
                                .filter(tag => !EquipmentTagRegistry.isHidden(tag))
                                .map(tag => `${EquipmentTagRegistry.getDisplayName(tag)} (${tag})`)
                                .join(', ')
                            : 'All equipment types allowed (no restrictions)'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Abilities */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', marginBottom: '4px', color: '#aaa' }}>
                      Learnable Abilities ({(displayClass.learnableAbilities || []).length}):
                    </div>
                    <div
                      style={{
                        background: 'rgba(156, 39, 176, 0.1)',
                        border: '1px solid rgba(156, 39, 176, 0.3)',
                        borderRadius: '4px',
                        padding: '8px',
                        height: '440px',
                        overflowY: 'auto',
                      }}
                    >
                      {(displayClass.learnableAbilities || []).map(abilityId => {
                        const ability = CombatAbility.getById(abilityId);
                        return (
                          <div
                            key={abilityId}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '4px 0',
                              borderBottom: '1px solid rgba(156, 39, 176, 0.2)',
                            }}
                          >
                            <span style={{ fontSize: '10px' }}>{ability ? ability.name : abilityId}</span>
                            {isEditing && (
                              <button
                                onClick={() => handleRemoveAbility(abilityId)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#f44336',
                                  cursor: 'pointer',
                                  padding: 0,
                                  fontSize: '14px',
                                }}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {(displayClass.learnableAbilities || []).length === 0 && (
                        <div style={{ fontSize: '10px', color: '#666' }}>No learnable abilities</div>
                      )}
                      {isEditing && (
                        <div style={{ marginTop: '8px' }}>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddAbility(e.target.value);
                                e.target.value = '';
                              }
                            }}
                            style={{
                              background: 'rgba(0, 0, 0, 0.5)',
                              border: '1px solid #666',
                              color: '#fff',
                              padding: '4px',
                              borderRadius: '3px',
                              fontSize: '10px',
                              width: '100%',
                              fontFamily: 'monospace',
                            }}
                          >
                            <option value="">Add ability...</option>
                            {availableAbilities.map(ability => (
                              <option key={ability.id} value={ability.id}>
                                {ability.name} ({ability.abilityType})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                fontSize: '12px',
              }}
            >
              Select a class to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
