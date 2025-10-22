import { useState, useEffect, useCallback } from 'react';
import { UnitClassRegistry, type UnitClassDefinition } from '../../utils/UnitClassRegistry';
import { UnitClass } from '../../models/combat/UnitClass';
import { CombatAbility } from '../../models/combat/CombatAbility';
import yaml from 'js-yaml';

interface ClassRegistryPanelProps {
  onClose?: () => void;
}

const statFields = [
  'health', 'mana', 'physicalPower', 'magicPower',
  'speed', 'movement', 'physicalEvade', 'magicEvade',
  'courage', 'attunement'
] as const;

export function ClassRegistryPanel({ onClose }: ClassRegistryPanelProps) {
  const [classes, setClasses] = useState<UnitClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<UnitClass | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedClass, setEditedClass] = useState<UnitClassDefinition | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [newAbilityId, setNewAbilityId] = useState('');
  const [newRequirementClassId, setNewRequirementClassId] = useState('');
  const [newRequirementXP, setNewRequirementXP] = useState('');
  const [availableAbilities, setAvailableAbilities] = useState<CombatAbility[]>([]);

  const loadClasses = useCallback(() => {
    const allClasses = UnitClassRegistry.getAll();
    setClasses(allClasses);

    // Extract all unique tags
    const tags = new Set<string>();
    allClasses.forEach(c => c.tags.forEach(tag => tags.add(tag)));
    setAllTags(Array.from(tags).sort());
  }, []);

  const loadAbilities = useCallback(() => {
    setAvailableAbilities(CombatAbility.getAll());
  }, []);

  useEffect(() => {
    loadClasses();
    loadAbilities();
  }, [loadClasses, loadAbilities]);

  const filteredClasses = tagFilter
    ? classes.filter(c => c.tags.includes(tagFilter))
    : classes;

  const handleSelectClass = (unitClass: UnitClass) => {
    setSelectedClass(unitClass);
    setIsEditing(false);
  };

  const handleEdit = () => {
    if (!selectedClass) return;
    setEditedClass(UnitClassRegistry.toDefinition(selectedClass));
    setIsEditing(true);
  };

  const handleCreate = () => {
    setEditedClass({
      id: crypto.randomUUID(),
      name: 'New Class',
      description: 'A new unit class',
      tags: [],
      learnableAbilities: [],
      modifiers: {},
      multipliers: {},
      requirements: {},
    });
    setSelectedClass(null);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editedClass) return;

    UnitClassRegistry.register(editedClass);
    loadClasses();

    const updated = UnitClassRegistry.getById(editedClass.id);
    setSelectedClass(updated || null);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedClass(null);
  };

  const handleDelete = () => {
    if (!selectedClass) return;
    if (!confirm(`Delete class "${selectedClass.name}"?`)) return;

    UnitClassRegistry.unregister(selectedClass.id);
    loadClasses();
    setSelectedClass(null);
    setIsEditing(false);
  };

  const handleFieldChange = (field: keyof UnitClassDefinition, value: any) => {
    if (!editedClass) return;
    setEditedClass({ ...editedClass, [field]: value });
  };

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

  const handleAddTag = () => {
    if (!editedClass || !newTag.trim()) return;
    const tags = [...(editedClass.tags || [])];
    if (!tags.includes(newTag.trim())) {
      tags.push(newTag.trim());
      setEditedClass({ ...editedClass, tags });
    }
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    if (!editedClass) return;
    const tags = (editedClass.tags || []).filter(t => t !== tag);
    setEditedClass({ ...editedClass, tags });
  };

  const handleAddAbility = () => {
    if (!editedClass || !newAbilityId.trim()) return;
    const abilities = [...(editedClass.learnableAbilities || [])];
    if (!abilities.includes(newAbilityId.trim())) {
      abilities.push(newAbilityId.trim());
      setEditedClass({ ...editedClass, learnableAbilities: abilities });
    }
    setNewAbilityId('');
  };

  const handleRemoveAbility = (abilityId: string) => {
    if (!editedClass) return;
    const abilities = (editedClass.learnableAbilities || []).filter(a => a !== abilityId);
    setEditedClass({ ...editedClass, learnableAbilities: abilities });
  };

  const handleAddRequirement = () => {
    if (!editedClass || !newRequirementClassId.trim() || !newRequirementXP) return;
    const requirements = { ...(editedClass.requirements || {}) };
    requirements[newRequirementClassId.trim()] = Number(newRequirementXP);
    setEditedClass({ ...editedClass, requirements });
    setNewRequirementClassId('');
    setNewRequirementXP('');
  };

  const handleRemoveRequirement = (classId: string) => {
    if (!editedClass) return;
    const requirements = { ...(editedClass.requirements || {}) };
    delete requirements[classId];
    setEditedClass({ ...editedClass, requirements });
  };

  const handleExport = () => {
    const definitions = classes.map(c => UnitClassRegistry.toDefinition(c));
    const yamlData = yaml.dump({ classes: definitions }, { lineWidth: -1, noRefs: true });

    const blob = new Blob([yamlData], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'class-registry-export.yaml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const displayClass = isEditing ? editedClass : (selectedClass ? UnitClassRegistry.toDefinition(selectedClass) : null);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#1a1a1a',
        border: '2px solid #4CAF50',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '1400px',
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        color: '#e0e0e0',
      }}>
        {/* Header */}
        <div style={{
          padding: '15px 20px',
          borderBottom: '2px solid #4CAF50',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, color: '#4CAF50' }}>Class Registry</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCreate}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Create New
            </button>
            <button
              onClick={handleExport}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Export to YAML
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Panel - List */}
          <div style={{
            width: '350px',
            borderRight: '2px solid #4CAF50',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Tag Filter */}
            <div style={{ padding: '10px', borderBottom: '1px solid #333' }}>
              <div style={{ fontSize: '12px', marginBottom: '5px', color: '#4CAF50' }}>Filter by Tag:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                <button
                  onClick={() => setTagFilter(null)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: tagFilter === null ? '#4CAF50' : '#333',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  All ({classes.length})
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tag)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: tagFilter === tag ? '#4CAF50' : '#333',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Class List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredClasses.map(unitClass => (
                <div
                  key={unitClass.id}
                  onClick={() => handleSelectClass(unitClass)}
                  style={{
                    padding: '10px',
                    borderBottom: '1px solid #333',
                    cursor: 'pointer',
                    backgroundColor: selectedClass?.id === unitClass.id ? '#2a2a2a' : 'transparent',
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{unitClass.name}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                    {unitClass.tags.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Details */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {displayClass ? (
              <>
                {/* Detail Header */}
                <div style={{
                  padding: '15px 20px',
                  borderBottom: '1px solid #333',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <h3 style={{ margin: 0 }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedClass?.name || ''}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        style={{
                          backgroundColor: '#2a2a2a',
                          color: '#e0e0e0',
                          border: '1px solid #4CAF50',
                          borderRadius: '4px',
                          padding: '8px',
                          fontSize: '18px',
                          width: '300px',
                        }}
                      />
                    ) : (
                      displayClass.name
                    )}
                  </h3>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSave}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#666',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleEdit}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={handleDelete}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Detail Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                  {/* Description */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', marginBottom: '5px', color: '#4CAF50' }}>Description:</div>
                    {isEditing ? (
                      <textarea
                        value={editedClass?.description || ''}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                        style={{
                          backgroundColor: '#2a2a2a',
                          color: '#e0e0e0',
                          border: '1px solid #4CAF50',
                          borderRadius: '4px',
                          padding: '8px',
                          width: '100%',
                          minHeight: '60px',
                          fontFamily: 'inherit',
                        }}
                      />
                    ) : (
                      <div style={{ padding: '8px', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
                        {displayClass.description}
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', marginBottom: '5px', color: '#4CAF50' }}>Tags:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {(displayClass.tags || []).map(tag => (
                        <span
                          key={tag}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: 'rgba(76, 175, 80, 0.2)',
                            border: '1px solid #4CAF50',
                            borderRadius: '4px',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
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
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                            placeholder="New tag"
                            style={{
                              backgroundColor: '#2a2a2a',
                              color: '#e0e0e0',
                              border: '1px solid #4CAF50',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              width: '100px',
                            }}
                          />
                          <button
                            onClick={handleAddTag}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#4CAF50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px',
                            }}
                          >
                            Add
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Learnable Abilities */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', marginBottom: '5px', color: '#4CAF50' }}>
                      Learnable Abilities ({(displayClass.learnableAbilities || []).length}):
                    </div>
                    <div style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      backgroundColor: '#2a2a2a',
                      borderRadius: '4px',
                      padding: '8px',
                    }}>
                      {(displayClass.learnableAbilities || []).map(abilityId => {
                        const ability = CombatAbility.getById(abilityId);
                        return (
                          <div
                            key={abilityId}
                            style={{
                              padding: '4px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid #333',
                            }}
                          >
                            <span style={{ fontSize: '11px' }}>
                              {ability ? ability.name : abilityId}
                            </span>
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
                      {isEditing && (
                        <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                          <select
                            value={newAbilityId}
                            onChange={(e) => setNewAbilityId(e.target.value)}
                            style={{
                              backgroundColor: '#2a2a2a',
                              color: '#e0e0e0',
                              border: '1px solid #4CAF50',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              flex: 1,
                            }}
                          >
                            <option value="">Select ability...</option>
                            {availableAbilities.map(ability => (
                              <option key={ability.id} value={ability.id}>
                                {ability.name} ({ability.abilityType})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handleAddAbility}
                            disabled={!newAbilityId}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: newAbilityId ? '#4CAF50' : '#555',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: newAbilityId ? 'pointer' : 'not-allowed',
                              fontSize: '11px',
                            }}
                          >
                            Add
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Requirements */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', marginBottom: '5px', color: '#4CAF50' }}>
                      Requirements:
                    </div>
                    <div style={{
                      backgroundColor: '#2a2a2a',
                      borderRadius: '4px',
                      padding: '8px',
                    }}>
                      {Object.entries(displayClass.requirements || {}).map(([classId, xp]) => {
                        const reqClass = UnitClass.getById(classId);
                        return (
                          <div
                            key={classId}
                            style={{
                              padding: '4px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid #333',
                            }}
                          >
                            <span style={{ fontSize: '11px' }}>
                              {reqClass ? reqClass.name : classId}: {xp} XP
                            </span>
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
                        <div style={{ fontSize: '11px', color: '#888' }}>No requirements</div>
                      )}
                      {isEditing && (
                        <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                          <select
                            value={newRequirementClassId}
                            onChange={(e) => setNewRequirementClassId(e.target.value)}
                            style={{
                              backgroundColor: '#2a2a2a',
                              color: '#e0e0e0',
                              border: '1px solid #4CAF50',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              flex: 1,
                            }}
                          >
                            <option value="">Select class...</option>
                            {classes.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={newRequirementXP}
                            onChange={(e) => setNewRequirementXP(e.target.value)}
                            placeholder="XP"
                            style={{
                              backgroundColor: '#2a2a2a',
                              color: '#e0e0e0',
                              border: '1px solid #4CAF50',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              width: '80px',
                            }}
                          />
                          <button
                            onClick={handleAddRequirement}
                            disabled={!newRequirementClassId || !newRequirementXP}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: (newRequirementClassId && newRequirementXP) ? '#4CAF50' : '#555',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: (newRequirementClassId && newRequirementXP) ? 'pointer' : 'not-allowed',
                              fontSize: '11px',
                            }}
                          >
                            Add
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modifiers */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      fontSize: '12px',
                      marginBottom: '5px',
                      color: 'rgba(76, 175, 80, 0.9)',
                      fontWeight: 'bold',
                    }}>
                      Modifiers (Flat Bonuses):
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: '10px',
                      padding: '10px',
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                      border: '1px solid rgba(76, 175, 80, 0.3)',
                      borderRadius: '4px',
                    }}>
                      {statFields.map(stat => (
                        <div key={stat}>
                          <div style={{ fontSize: '10px', marginBottom: '2px', color: '#aaa' }}>
                            {stat}:
                          </div>
                          {isEditing ? (
                            <input
                              type="number"
                              value={(editedClass?.modifiers as any)?.[stat] || ''}
                              onChange={(e) => handleModifierChange(stat, e.target.value ? Number(e.target.value) : undefined)}
                              placeholder="0"
                              style={{
                                backgroundColor: '#2a2a2a',
                                color: '#e0e0e0',
                                border: '1px solid rgba(76, 175, 80, 0.5)',
                                borderRadius: '4px',
                                padding: '4px',
                                width: '100%',
                                fontSize: '11px',
                              }}
                            />
                          ) : (
                            <div style={{ fontSize: '11px', padding: '4px' }}>
                              {(displayClass.modifiers as any)?.[stat] || 0}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Multipliers */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      fontSize: '12px',
                      marginBottom: '5px',
                      color: 'rgba(33, 150, 243, 0.9)',
                      fontWeight: 'bold',
                    }}>
                      Multipliers (Percentage Bonuses):
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: '10px',
                      padding: '10px',
                      backgroundColor: 'rgba(33, 150, 243, 0.1)',
                      border: '1px solid rgba(33, 150, 243, 0.3)',
                      borderRadius: '4px',
                    }}>
                      {statFields.map(stat => (
                        <div key={stat}>
                          <div style={{ fontSize: '10px', marginBottom: '2px', color: '#aaa' }}>
                            {stat}:
                          </div>
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.1"
                              value={(editedClass?.multipliers as any)?.[stat] || ''}
                              onChange={(e) => handleMultiplierChange(stat, e.target.value ? Number(e.target.value) : undefined)}
                              placeholder="1.0"
                              style={{
                                backgroundColor: '#2a2a2a',
                                color: '#e0e0e0',
                                border: '1px solid rgba(33, 150, 243, 0.5)',
                                borderRadius: '4px',
                                padding: '4px',
                                width: '100%',
                                fontSize: '11px',
                              }}
                            />
                          ) : (
                            <div style={{ fontSize: '11px', padding: '4px' }}>
                              {(displayClass.multipliers as any)?.[stat] || 1.0}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ID */}
                  <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
                    <div style={{ fontSize: '10px', color: '#888' }}>ID: {displayClass.id}</div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
              }}>
                Select a class to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
