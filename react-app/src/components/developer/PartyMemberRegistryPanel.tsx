import { useState, useEffect, useRef } from 'react';
import { PartyMemberRegistry } from '../../utils/PartyMemberRegistry';
import type { PartyMemberDefinition } from '../../utils/PartyMemberRegistry';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import { SpriteBrowser } from './SpriteBrowser';
import { EquipmentBrowser } from './EquipmentBrowser';
import { UnitClass } from '../../models/combat/UnitClass';
import { CombatAbility } from '../../models/combat/CombatAbility';
import { Equipment } from '../../models/combat/Equipment';
import { TagFilter } from './TagFilter';

interface PartyMemberRegistryPanelProps {
  onClose?: () => void;
}

/**
 * Developer panel for browsing and editing party members from the PartyMemberRegistry.
 * This component is only accessible in development mode.
 */
export const PartyMemberRegistryPanel: React.FC<PartyMemberRegistryPanelProps> = ({ onClose }) => {
  const [partyMembers, setPartyMembers] = useState<PartyMemberDefinition[]>([]);
  const [selectedMember, setSelectedMember] = useState<PartyMemberDefinition | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);

  // Inline editing state - track which field is being edited and its temporary value
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<any>(null);

  const [spriteBrowserVisible, setSpriteBrowserVisible] = useState(false);
  const [equipmentBrowserVisible, setEquipmentBrowserVisible] = useState(false);
  const [equipmentBrowserSlot, setEquipmentBrowserSlot] = useState<'leftHand' | 'rightHand' | 'head' | 'body' | 'accessory' | null>(null);
  const spriteCanvasRef = useRef<HTMLCanvasElement>(null);
  const [availableClasses, setAvailableClasses] = useState<UnitClass[]>([]);
  const [availableAbilities, setAvailableAbilities] = useState<CombatAbility[]>([]);

  // Sprite size constant
  const SPRITE_SIZE = 12;
  const PREVIEW_SCALE = 8;

  // Load all party members and tags
  useEffect(() => {
    const allMembers = PartyMemberRegistry.getAll();
    setPartyMembers(allMembers);

    // Extract all unique tags
    const tagsSet = new Set<string>();
    allMembers.forEach(member => {
      member.tags?.forEach(tag => tagsSet.add(tag));
    });
    setAllTags(Array.from(tagsSet).sort());

    // Load available classes and abilities
    setAvailableClasses(UnitClass.getAll());
    setAvailableAbilities(CombatAbility.getAll());

    console.log('PartyMemberRegistryPanel: Loaded party members:', allMembers.length);
  }, []);

  // Get filtered party members based on selected tag
  const filteredMembers = selectedTag
    ? partyMembers.filter(m => m.tags?.includes(selectedTag))
    : partyMembers;

  // Start editing a field
  const startEditing = (fieldName: string, currentValue: any) => {
    setEditingField(fieldName);
    setEditingValue(currentValue);
  };

  // Save the current field being edited
  const saveField = () => {
    if (!selectedMember || !editingField) return;

    const updatedMember: PartyMemberDefinition = {
      ...selectedMember,
      [editingField]: editingValue,
    };

    // Register the updated member
    PartyMemberRegistry.register(updatedMember);

    // Update local state
    const updatedMembers = PartyMemberRegistry.getAll();
    setPartyMembers(updatedMembers);
    setSelectedMember(updatedMember);

    // Clear editing state
    setEditingField(null);
    setEditingValue(null);

    console.log(`Saved field ${editingField} for party member:`, selectedMember.id);
  };

  // Cancel editing the current field
  const cancelEditing = () => {
    setEditingField(null);
    setEditingValue(null);
  };

  // Handle keyboard shortcuts (Enter to save, Escape to cancel)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveField();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  // Delete party member
  const handleDelete = () => {
    if (!selectedMember) return;

    const confirmed = window.confirm(`Delete party member "${selectedMember.name}"?`);
    if (!confirmed) return;

    PartyMemberRegistry.delete(selectedMember.id);
    const updatedMembers = PartyMemberRegistry.getAll();
    setPartyMembers(updatedMembers);
    setSelectedMember(null);
    setEditingField(null);
    setEditingValue(null);
  };

  // Create new party member
  const handleCreateNew = () => {
    // Generate a unique ID
    let counter = 1;
    let newId = `new-party-${counter}`;
    while (PartyMemberRegistry.getById(newId)) {
      counter++;
      newId = `new-party-${counter}`;
    }

    // Create a new party member template with default values
    const newMember: PartyMemberDefinition = {
      id: newId,
      name: 'New Party Member',
      unitClassId: 'warrior',
      baseHealth: 30,
      baseMana: 20,
      basePhysicalPower: 10,
      baseMagicPower: 10,
      baseSpeed: 10,
      baseMovement: 4,
      basePhysicalEvade: 10,
      baseMagicEvade: 10,
      baseCourage: 10,
      baseAttunement: 10,
      spriteId: 'default-humanoid',
      tags: [],
      description: '',
      totalExperience: 0,
    };

    // Register the new member
    PartyMemberRegistry.register(newMember);

    // Update state
    const updatedMembers = PartyMemberRegistry.getAll();
    setPartyMembers(updatedMembers);
    setSelectedMember(newMember);
  };

  // Export to YAML
  const handleExportYAML = () => {
    const sortedMembers = [...partyMembers].sort((a, b) => a.id.localeCompare(b.id));

    let yaml = '# Party Member definitions for testing\n';
    yaml += '# Exported from Party Member Registry Panel\n\n';
    yaml += 'partyMembers:\n';

    for (const member of sortedMembers) {
      yaml += `  - id: "${member.id}"\n`;
      yaml += `    name: "${member.name}"\n`;
      yaml += `    unitClassId: "${member.unitClassId}"\n`;
      yaml += `    baseHealth: ${member.baseHealth}\n`;
      yaml += `    baseMana: ${member.baseMana}\n`;
      yaml += `    basePhysicalPower: ${member.basePhysicalPower}\n`;
      yaml += `    baseMagicPower: ${member.baseMagicPower}\n`;
      yaml += `    baseSpeed: ${member.baseSpeed}\n`;
      yaml += `    baseMovement: ${member.baseMovement}\n`;
      yaml += `    basePhysicalEvade: ${member.basePhysicalEvade}\n`;
      yaml += `    baseMagicEvade: ${member.baseMagicEvade}\n`;
      yaml += `    baseCourage: ${member.baseCourage}\n`;
      yaml += `    baseAttunement: ${member.baseAttunement}\n`;
      yaml += `    spriteId: "${member.spriteId}"\n`;

      if (member.secondaryClassId) {
        yaml += `    secondaryClassId: "${member.secondaryClassId}"\n`;
      }

      if (member.learnedAbilityIds && member.learnedAbilityIds.length > 0) {
        yaml += `    learnedAbilityIds: [${member.learnedAbilityIds.map(id => `"${id}"`).join(', ')}]\n`;
      }
      if (member.reactionAbilityId) {
        yaml += `    reactionAbilityId: "${member.reactionAbilityId}"\n`;
      }
      if (member.passiveAbilityId) {
        yaml += `    passiveAbilityId: "${member.passiveAbilityId}"\n`;
      }
      if (member.movementAbilityId) {
        yaml += `    movementAbilityId: "${member.movementAbilityId}"\n`;
      }

      // Equipment
      if (member.leftHandId) {
        yaml += `    leftHandId: "${member.leftHandId}"\n`;
      }
      if (member.rightHandId) {
        yaml += `    rightHandId: "${member.rightHandId}"\n`;
      }
      if (member.headId) {
        yaml += `    headId: "${member.headId}"\n`;
      }
      if (member.bodyId) {
        yaml += `    bodyId: "${member.bodyId}"\n`;
      }
      if (member.accessoryId) {
        yaml += `    accessoryId: "${member.accessoryId}"\n`;
      }

      if (member.tags && member.tags.length > 0) {
        yaml += `    tags: [${member.tags.map(t => `"${t}"`).join(', ')}]\n`;
      }
      if (member.description) {
        yaml += `    description: "${member.description}"\n`;
      }
      if (member.totalExperience && member.totalExperience > 0) {
        yaml += `    totalExperience: ${member.totalExperience}\n`;
      }
      if (member.classExperience && Object.keys(member.classExperience).length > 0) {
        yaml += `    classExperience:\n`;
        for (const [classId, exp] of Object.entries(member.classExperience)) {
          yaml += `      ${classId}: ${exp}\n`;
        }
      }
      if (member.classExperienceSpent && Object.keys(member.classExperienceSpent).length > 0) {
        yaml += `    classExperienceSpent:\n`;
        for (const [classId, spent] of Object.entries(member.classExperienceSpent)) {
          yaml += `      ${classId}: ${spent}\n`;
        }
      }

      yaml += '\n';
    }

    // Create a blob and download link
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'party-definitions.yaml';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle equipment browser selection
  const handleEquipmentSelect = (equipmentId: string) => {
    if (!selectedMember || !equipmentBrowserSlot) return;

    const fieldName = `${equipmentBrowserSlot}Id`;
    const updatedMember: PartyMemberDefinition = {
      ...selectedMember,
      [fieldName]: equipmentId || undefined,
    };

    PartyMemberRegistry.register(updatedMember);
    const updatedMembers = PartyMemberRegistry.getAll();
    setPartyMembers(updatedMembers);
    setSelectedMember(updatedMember);
    setEquipmentBrowserVisible(false);
    setEquipmentBrowserSlot(null);
  };

  // Handle sprite browser selection
  const handleSpriteSelect = (spriteId: string) => {
    if (!selectedMember) return;

    const updatedMember: PartyMemberDefinition = {
      ...selectedMember,
      spriteId,
    };

    PartyMemberRegistry.register(updatedMember);
    const updatedMembers = PartyMemberRegistry.getAll();
    setPartyMembers(updatedMembers);
    setSelectedMember(updatedMember);
    setSpriteBrowserVisible(false);
  };

  // Render sprite preview
  useEffect(() => {
    if (!selectedMember || !spriteCanvasRef.current) return;

    const spriteId = selectedMember.spriteId;
    if (!spriteId) return;

    const sprite = SpriteRegistry.getById(spriteId);
    if (!sprite) {
      console.warn(`Sprite not found: ${spriteId}`);
      return;
    }

    const canvas = spriteCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = sprite.spriteSheet;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        img,
        sprite.x * SPRITE_SIZE,
        sprite.y * SPRITE_SIZE,
        SPRITE_SIZE,
        SPRITE_SIZE,
        0,
        0,
        SPRITE_SIZE * PREVIEW_SCALE,
        SPRITE_SIZE * PREVIEW_SCALE
      );
    };
  }, [selectedMember, SPRITE_SIZE, PREVIEW_SCALE]);

  // Render inline editable field component
  const renderInlineEdit = (
    fieldName: string,
    label: string,
    type: 'text' | 'number' | 'select' | 'textarea' = 'text',
    options?: { value: string; label: string }[],
    gridColumn?: string
  ) => {
    if (!selectedMember) return null;

    const currentValue = selectedMember[fieldName as keyof PartyMemberDefinition];
    const isEditing = editingField === fieldName;

    return (
      <div style={{ gridColumn }}>
        <label style={{ display: 'block', marginBottom: '2px', color: '#aaa', fontSize: '10px' }}>{label}:</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isEditing ? (
            <>
              {type === 'text' && (
                <input
                  type="text"
                  value={editingValue ?? ''}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '4px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid #666',
                    borderRadius: '2px',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                  }}
                />
              )}
              {type === 'number' && (
                <input
                  type="number"
                  value={editingValue ?? 0}
                  onChange={(e) => setEditingValue(Number(e.target.value))}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  style={{
                    width: '60px',
                    padding: '4px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid #666',
                    borderRadius: '2px',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                  }}
                />
              )}
              {type === 'select' && options && (
                <select
                  value={editingValue ?? ''}
                  onChange={(e) => setEditingValue(e.target.value || undefined)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '4px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid #666',
                    borderRadius: '2px',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                  }}
                >
                  {options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
              {type === 'textarea' && (
                <textarea
                  value={editingValue ?? ''}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '4px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid #666',
                    borderRadius: '2px',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    resize: 'vertical',
                  }}
                />
              )}
              <button
                onClick={saveField}
                title="Save (Enter)"
                style={{
                  padding: '2px 6px',
                  background: 'rgba(76, 175, 80, 0.3)',
                  border: '1px solid rgba(76, 175, 80, 0.6)',
                  borderRadius: '2px',
                  color: '#8bc34a',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  flexShrink: 0,
                }}
              >
                ✓
              </button>
              <button
                onClick={cancelEditing}
                title="Cancel (Escape)"
                style={{
                  padding: '2px 6px',
                  background: 'rgba(244, 67, 54, 0.3)',
                  border: '1px solid rgba(244, 67, 54, 0.6)',
                  borderRadius: '2px',
                  color: '#f44',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  flexShrink: 0,
                }}
              >
                ✗
              </button>
            </>
          ) : (
            <div
              onClick={() => startEditing(fieldName, currentValue)}
              style={{
                display: 'inline-block',
                color: '#fff',
                fontSize: '11px',
                padding: '4px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '2px',
                cursor: 'pointer',
                transition: 'background 0.2s',
                minWidth: type === 'number' ? '60px' : '120px',
                maxWidth: type === 'textarea' ? '100%' : type === 'select' ? '200px' : '180px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(33, 150, 243, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(33, 150, 243, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              {currentValue !== undefined && currentValue !== null && currentValue !== ''
                ? String(currentValue)
                : <span style={{ color: '#666', fontStyle: 'italic' }}>None</span>
              }
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render equipment field with browse button
  const renderEquipmentField = (
    slot: 'leftHand' | 'rightHand' | 'head' | 'body' | 'accessory',
    label: string,
    gridColumn?: string
  ) => {
    if (!selectedMember) return null;

    const fieldName = `${slot}Id` as keyof PartyMemberDefinition;
    const equipmentId = selectedMember[fieldName] as string | undefined;
    const equipment = equipmentId ? Equipment.getById(equipmentId) : null;

    return (
      <div style={{ gridColumn }}>
        <label style={{ display: 'block', marginBottom: '2px', color: '#aaa', fontSize: '10px' }}>{label}:</label>
        <div
          onClick={() => {
            setEquipmentBrowserSlot(slot);
            setEquipmentBrowserVisible(true);
          }}
          style={{
            display: 'inline-block',
            color: '#fff',
            fontSize: '11px',
            padding: '4px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '2px',
            cursor: 'pointer',
            transition: 'background 0.2s',
            minWidth: '120px',
            maxWidth: '200px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(33, 150, 243, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(33, 150, 243, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          {equipment
            ? equipment.name
            : <span style={{ color: '#666', fontStyle: 'italic' }}>None</span>
          }
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.95)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
        color: '#fff',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid #666',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '20px' }}>Party Member Registry</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleExportYAML}
            style={{
              padding: '8px 16px',
              background: 'rgba(76, 175, 80, 0.3)',
              border: '1px solid rgba(76, 175, 80, 0.6)',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Export YAML
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: 'rgba(244, 67, 54, 0.3)',
                border: '1px solid rgba(244, 67, 54, 0.6)',
                borderRadius: '4px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left sidebar - Party member list */}
        <div
          style={{
            width: '300px',
            borderRight: '1px solid #666',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Tag filter */}
          <div style={{ padding: '12px', borderBottom: '1px solid #666' }}>
            <TagFilter
              tags={allTags}
              selectedTag={selectedTag}
              onTagSelect={setSelectedTag}
            />
          </div>

          {/* Create new button */}
          <div style={{ padding: '12px', borderBottom: '1px solid #666' }}>
            <button
              onClick={handleCreateNew}
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(33, 150, 243, 0.3)',
                border: '1px solid rgba(33, 150, 243, 0.6)',
                borderRadius: '4px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              + Create New Party Member
            </button>
          </div>

          {/* Party member list */}
          <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
            {filteredMembers.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                No party members found
              </div>
            ) : (
              filteredMembers.map((member) => {
                const sprite = SpriteRegistry.getById(member.spriteId);
                const spriteScale = 4;
                const spriteDisplaySize = SPRITE_SIZE * spriteScale;

                return (
                  <div
                    key={member.id}
                    onClick={() => {
                      setSelectedMember(member);
                      setEditingField(null);
                      setEditingValue(null);
                    }}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background:
                        selectedMember?.id === member.id
                          ? 'rgba(33, 150, 243, 0.3)'
                          : 'rgba(255, 255, 255, 0.05)',
                      border:
                        selectedMember?.id === member.id
                          ? '1px solid rgba(33, 150, 243, 0.6)'
                          : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center',
                    }}
                  >
                    {/* Sprite preview */}
                    {sprite && (
                      <canvas
                        width={spriteDisplaySize}
                        height={spriteDisplaySize}
                        ref={(canvas) => {
                          if (canvas) {
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              const img = new Image();
                              img.src = sprite.spriteSheet;
                              img.onload = () => {
                                ctx.clearRect(0, 0, spriteDisplaySize, spriteDisplaySize);
                                ctx.imageSmoothingEnabled = false;
                                ctx.drawImage(
                                  img,
                                  sprite.x * SPRITE_SIZE,
                                  sprite.y * SPRITE_SIZE,
                                  SPRITE_SIZE,
                                  SPRITE_SIZE,
                                  0,
                                  0,
                                  spriteDisplaySize,
                                  spriteDisplaySize
                                );
                              };
                            }
                          }
                        }}
                        style={{
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          imageRendering: 'pixelated',
                          background: 'rgba(0, 0, 0, 0.3)',
                          flexShrink: 0,
                        } as React.CSSProperties}
                      />
                    )}

                    {/* Text content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        {member.name}
                      </div>
                      <div style={{ fontSize: '10px', color: '#888' }}>{member.id}</div>
                      {member.tags && member.tags.length > 0 && (
                        <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {member.tags.slice(0, 3).map((tag) => (
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
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Status bar */}
          <div
            style={{
              padding: '12px',
              borderTop: '1px solid #666',
              fontSize: '11px',
              color: '#666',
            }}
          >
            {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
            {selectedTag && ` (filtered by "${selectedTag}")`}
          </div>
        </div>

        {/* Right panel - Details */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          {!selectedMember ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                fontSize: '16px',
              }}
            >
              Select a party member to view details
            </div>
          ) : (
            <div style={{ padding: '12px' }}>
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                  onClick={handleDelete}
                  style={{
                    padding: '4px 12px',
                    background: 'rgba(244, 67, 54, 0.3)',
                    border: '1px solid rgba(244, 67, 54, 0.6)',
                    borderRadius: '2px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  Delete
                </button>
              </div>

              {/* Sprite preview */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ fontSize: '11px', color: '#aaa' }}>
                    Sprite Preview
                  </div>
                  <button
                    onClick={() => setSpriteBrowserVisible(true)}
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(76, 175, 80, 0.3)',
                      border: '1px solid rgba(76, 175, 80, 0.6)',
                      borderRadius: '2px',
                      color: '#8bc34a',
                      fontSize: '10px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                    }}
                  >
                    Change Sprite...
                  </button>
                </div>
                <canvas
                  ref={spriteCanvasRef}
                  width={SPRITE_SIZE * PREVIEW_SCALE}
                  height={SPRITE_SIZE * PREVIEW_SCALE}
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    imageRendering: 'pixelated',
                    background: 'rgba(0, 0, 0, 0.3)',
                  } as React.CSSProperties}
                />
                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                  {selectedMember.spriteId}
                </div>
              </div>

              {/* Party member fields */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', fontSize: '11px' }}>
                {renderInlineEdit('id', 'ID')}
                {renderInlineEdit('name', 'Name')}
                {renderInlineEdit(
                  'unitClassId',
                  'Primary Class',
                  'select',
                  [
                    { value: '', label: 'Select a class...' },
                    ...availableClasses.map(c => ({ value: c.id, label: c.name }))
                  ]
                )}
                {renderInlineEdit(
                  'secondaryClassId',
                  'Secondary Class',
                  'select',
                  [
                    { value: '', label: 'None' },
                    ...availableClasses.map(c => ({ value: c.id, label: c.name }))
                  ]
                )}
              </div>

              {/* Base Stats */}
              <div style={{ marginTop: '8px', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#4CAF50' }}>
                Base Stats
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', fontSize: '11px' }}>
                {renderInlineEdit('baseHealth', 'HP', 'number')}
                {renderInlineEdit('baseMana', 'MP', 'number')}
                {renderInlineEdit('basePhysicalPower', 'P.Pow', 'number')}
                {renderInlineEdit('baseMagicPower', 'M.Pow', 'number')}
                {renderInlineEdit('baseSpeed', 'Spd', 'number')}
                {renderInlineEdit('baseMovement', 'Move', 'number')}
                {renderInlineEdit('basePhysicalEvade', 'P.Evd', 'number')}
                {renderInlineEdit('baseMagicEvade', 'M.Evd', 'number')}
                {renderInlineEdit('baseCourage', 'Cour', 'number')}
                {renderInlineEdit('baseAttunement', 'Attn', 'number')}
              </div>

              {/* Equipment Section */}
              <div style={{ marginTop: '8px', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#4CAF50' }}>
                Equipment
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', fontSize: '11px' }}>
                {renderEquipmentField('leftHand', 'Left Hand')}
                {renderEquipmentField('rightHand', 'Right Hand')}
                {renderEquipmentField('head', 'Head')}
                {renderEquipmentField('body', 'Body')}
                {renderEquipmentField('accessory', 'Accessory')}
              </div>

              {/* Abilities Section */}
              <div style={{ marginTop: '8px', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#4CAF50' }}>
                Abilities
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', fontSize: '11px' }}>
                {renderInlineEdit(
                  'reactionAbilityId',
                  'Reaction Ability',
                  'select',
                  [
                    { value: '', label: 'None' },
                    ...availableAbilities.filter(a => a.abilityType === 'Reaction').map(a => ({ value: a.id, label: a.name }))
                  ]
                )}
                {renderInlineEdit(
                  'passiveAbilityId',
                  'Passive Ability',
                  'select',
                  [
                    { value: '', label: 'None' },
                    ...availableAbilities.filter(a => a.abilityType === 'Passive').map(a => ({ value: a.id, label: a.name }))
                  ]
                )}
                {renderInlineEdit(
                  'movementAbilityId',
                  'Movement Ability',
                  'select',
                  [
                    { value: '', label: 'None' },
                    ...availableAbilities.filter(a => a.abilityType === 'Movement').map(a => ({ value: a.id, label: a.name }))
                  ]
                )}
              </div>

              {/* Tags Section - Custom rendering for tag display */}
              <div style={{ marginTop: '8px', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#4CAF50' }}>
                Tags
              </div>
              <div style={{ fontSize: '11px' }}>
                <label style={{ display: 'block', marginBottom: '2px', color: '#aaa', fontSize: '10px' }}>Tags:</label>
                {editingField === 'tags' ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', maxWidth: '400px' }}>
                    <input
                      type="text"
                      value={Array.isArray(editingValue) ? editingValue.join(', ') : ''}
                      onChange={(e) => {
                        const tagsString = e.target.value;
                        const tagsArray = tagsString
                          .split(',')
                          .map(tag => tag.trim())
                          .filter(tag => tag.length > 0);
                        setEditingValue(tagsArray);
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="tag1, tag2, tag3"
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '4px',
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: '1px solid #666',
                        borderRadius: '2px',
                        color: '#fff',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                      }}
                    />
                    <button
                      onClick={saveField}
                      title="Save (Enter)"
                      style={{
                        padding: '2px 6px',
                        background: 'rgba(76, 175, 80, 0.3)',
                        border: '1px solid rgba(76, 175, 80, 0.6)',
                        borderRadius: '2px',
                        color: '#8bc34a',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={cancelEditing}
                      title="Cancel (Escape)"
                      style={{
                        padding: '2px 6px',
                        background: 'rgba(244, 67, 54, 0.3)',
                        border: '1px solid rgba(244, 67, 54, 0.6)',
                        borderRadius: '2px',
                        color: '#f44',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        flexShrink: 0,
                      }}
                    >
                      ✗
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => startEditing('tags', selectedMember.tags || [])}
                    style={{
                      display: 'inline-block',
                      padding: '4px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      minHeight: '24px',
                      minWidth: '120px',
                      maxWidth: '400px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(33, 150, 243, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(33, 150, 243, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                  >
                    {selectedMember.tags && selectedMember.tags.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {selectedMember.tags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              padding: '2px 6px',
                              background: 'rgba(76, 175, 80, 0.2)',
                              border: '1px solid rgba(76, 175, 80, 0.4)',
                              borderRadius: '2px',
                              fontSize: '10px',
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#666', fontStyle: 'italic' }}>No tags</span>
                    )}
                  </div>
                )}
                {editingField === 'tags' && (
                  <div style={{ marginTop: '2px', fontSize: '9px', color: '#aaa' }}>
                    Separate tags with commas
                  </div>
                )}
              </div>

              {/* Description Section */}
              <div style={{ marginTop: '8px', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#4CAF50' }}>
                Description
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px', fontSize: '11px' }}>
                {renderInlineEdit('description', 'Description', 'textarea')}
              </div>

              {/* Experience Section */}
              <div style={{ marginTop: '8px', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#4CAF50' }}>
                Experience
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', fontSize: '11px' }}>
                {renderInlineEdit('totalExperience', 'Total XP', 'number')}
              </div>

              {/* Class Experience Section */}
              <div style={{ marginTop: '8px', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#9C27B0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Class Experience</span>
                <button
                  onClick={() => {
                    const currentExperience = selectedMember.classExperience || {};
                    const usedClassIds = new Set(Object.keys(currentExperience));
                    const firstUnusedClass = availableClasses.find(c => !usedClassIds.has(c.id));

                    if (firstUnusedClass) {
                      const updatedExperience = { ...currentExperience, [firstUnusedClass.id]: 0 };
                      // Calculate total experience as sum of all class experience
                      const totalExperience = Object.values(updatedExperience).reduce((sum, exp) => sum + exp, 0);
                      const updatedMember: PartyMemberDefinition = {
                        ...selectedMember,
                        classExperience: updatedExperience,
                        totalExperience,
                      };
                      PartyMemberRegistry.register(updatedMember);
                      setPartyMembers(PartyMemberRegistry.getAll());
                      setSelectedMember(updatedMember);
                    }
                  }}
                  style={{
                    padding: '2px 6px',
                    background: 'rgba(156, 39, 176, 0.3)',
                    border: '1px solid rgba(156, 39, 176, 0.6)',
                    borderRadius: '2px',
                    color: '#ce93d8',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                  }}
                  title="Add new class experience"
                >
                  +
                </button>
              </div>
              <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {selectedMember.classExperience && Object.keys(selectedMember.classExperience).length > 0 ? (
                  Object.entries(selectedMember.classExperience).map(([classId, exp]) => (
                    <div key={classId} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {/* Class dropdown */}
                      {editingField === `classExp_class_${classId}` ? (
                        <>
                          <select
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            autoFocus
                            style={{
                              padding: '4px',
                              background: 'rgba(0, 0, 0, 0.5)',
                              border: '1px solid #666',
                              borderRadius: '2px',
                              color: '#fff',
                              fontSize: '11px',
                              minWidth: '120px',
                            }}
                          >
                            {availableClasses.map(cls => (
                              <option key={cls.id} value={cls.id}>
                                {cls.name} ({cls.id})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              const newClassId = editingValue;
                              if (newClassId !== classId) {
                                const currentExperience = { ...selectedMember.classExperience };
                                const expValue = currentExperience[classId];
                                delete currentExperience[classId];
                                currentExperience[newClassId] = expValue;

                                // Calculate total experience as sum of all class experience
                                const totalExperience = Object.values(currentExperience).reduce((sum, exp) => sum + exp, 0);
                                const updatedMember: PartyMemberDefinition = {
                                  ...selectedMember,
                                  classExperience: currentExperience,
                                  totalExperience,
                                };
                                PartyMemberRegistry.register(updatedMember);
                                setPartyMembers(PartyMemberRegistry.getAll());
                                setSelectedMember(updatedMember);
                              }
                              cancelEditing();
                            }}
                            style={{
                              padding: '2px 6px',
                              background: 'rgba(76, 175, 80, 0.3)',
                              border: '1px solid rgba(76, 175, 80, 0.6)',
                              borderRadius: '2px',
                              color: '#8bc34a',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontFamily: 'monospace',
                            }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditing}
                            style={{
                              padding: '2px 6px',
                              background: 'rgba(244, 67, 54, 0.3)',
                              border: '1px solid rgba(244, 67, 54, 0.6)',
                              borderRadius: '2px',
                              color: '#f44',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontFamily: 'monospace',
                            }}
                          >
                            ✗
                          </button>
                        </>
                      ) : (
                        <div
                          onClick={() => startEditing(`classExp_class_${classId}`, classId)}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(156, 39, 176, 0.2)',
                            border: '1px solid rgba(156, 39, 176, 0.4)',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            minWidth: '120px',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(156, 39, 176, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(156, 39, 176, 0.2)';
                          }}
                        >
                          {availableClasses.find(c => c.id === classId)?.name || classId}
                        </div>
                      )}

                      {/* Experience amount */}
                      {editingField === `classExp_amount_${classId}` ? (
                        <>
                          <input
                            type="number"
                            value={editingValue ?? 0}
                            onChange={(e) => setEditingValue(parseInt(e.target.value, 10) || 0)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const currentExperience = { ...selectedMember.classExperience };
                                currentExperience[classId] = editingValue ?? 0;

                                // Calculate total experience as sum of all class experience
                                const totalExperience = Object.values(currentExperience).reduce((sum, exp) => sum + exp, 0);
                                const updatedMember: PartyMemberDefinition = {
                                  ...selectedMember,
                                  classExperience: currentExperience,
                                  totalExperience,
                                };
                                PartyMemberRegistry.register(updatedMember);
                                setPartyMembers(PartyMemberRegistry.getAll());
                                setSelectedMember(updatedMember);
                                cancelEditing();
                              } else if (e.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                            autoFocus
                            style={{
                              padding: '4px',
                              background: 'rgba(0, 0, 0, 0.5)',
                              border: '1px solid #666',
                              borderRadius: '2px',
                              color: '#fff',
                              fontSize: '11px',
                              width: '80px',
                            }}
                          />
                          <button
                            onClick={() => {
                              const currentExperience = { ...selectedMember.classExperience };
                              currentExperience[classId] = editingValue ?? 0;

                              // Calculate total experience as sum of all class experience
                              const totalExperience = Object.values(currentExperience).reduce((sum, exp) => sum + exp, 0);
                              const updatedMember: PartyMemberDefinition = {
                                ...selectedMember,
                                classExperience: currentExperience,
                                totalExperience,
                              };
                              PartyMemberRegistry.register(updatedMember);
                              setPartyMembers(PartyMemberRegistry.getAll());
                              setSelectedMember(updatedMember);
                              cancelEditing();
                            }}
                            style={{
                              padding: '2px 6px',
                              background: 'rgba(76, 175, 80, 0.3)',
                              border: '1px solid rgba(76, 175, 80, 0.6)',
                              borderRadius: '2px',
                              color: '#8bc34a',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontFamily: 'monospace',
                            }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditing}
                            style={{
                              padding: '2px 6px',
                              background: 'rgba(244, 67, 54, 0.3)',
                              border: '1px solid rgba(244, 67, 54, 0.6)',
                              borderRadius: '2px',
                              color: '#f44',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontFamily: 'monospace',
                            }}
                          >
                            ✗
                          </button>
                        </>
                      ) : (
                        <div
                          onClick={() => startEditing(`classExp_amount_${classId}`, exp)}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            width: '80px',
                            textAlign: 'right',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(33, 150, 243, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(33, 150, 243, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          }}
                        >
                          {exp}
                        </div>
                      )}

                      {/* Delete button */}
                      <button
                        onClick={() => {
                          const currentExperience = { ...selectedMember.classExperience };
                          delete currentExperience[classId];

                          // Calculate total experience as sum of all class experience
                          const totalExperience = Object.values(currentExperience).reduce((sum, exp) => sum + exp, 0);
                          const updatedMember: PartyMemberDefinition = {
                            ...selectedMember,
                            classExperience: Object.keys(currentExperience).length > 0 ? currentExperience : undefined,
                            totalExperience,
                          };
                          PartyMemberRegistry.register(updatedMember);
                          setPartyMembers(PartyMemberRegistry.getAll());
                          setSelectedMember(updatedMember);
                        }}
                        style={{
                          padding: '2px 6px',
                          background: 'rgba(244, 67, 54, 0.3)',
                          border: '1px solid rgba(244, 67, 54, 0.6)',
                          borderRadius: '2px',
                          color: '#f44',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                        }}
                        title="Remove this class experience"
                      >
                        −
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#666', fontStyle: 'italic', fontSize: '10px' }}>
                    No class experience. Click + to add.
                  </div>
                )}
              </div>

              {/* Class Experience Spent Section */}
              <div style={{ marginTop: '8px', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#FF9800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Class Experience Spent</span>
                <button
                  onClick={() => {
                    const currentSpent = selectedMember.classExperienceSpent || {};
                    const usedClassIds = new Set(Object.keys(currentSpent));
                    const firstUnusedClass = availableClasses.find(c => !usedClassIds.has(c.id));

                    if (firstUnusedClass) {
                      const updatedSpent = { ...currentSpent, [firstUnusedClass.id]: 0 };
                      const updatedMember: PartyMemberDefinition = {
                        ...selectedMember,
                        classExperienceSpent: updatedSpent,
                      };
                      PartyMemberRegistry.register(updatedMember);
                      setPartyMembers(PartyMemberRegistry.getAll());
                      setSelectedMember(updatedMember);
                    }
                  }}
                  style={{
                    padding: '2px 6px',
                    background: 'rgba(255, 152, 0, 0.3)',
                    border: '1px solid rgba(255, 152, 0, 0.6)',
                    borderRadius: '2px',
                    color: '#ffb74d',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                  }}
                  title="Add new class experience spent"
                >
                  +
                </button>
              </div>
              <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {selectedMember.classExperienceSpent && Object.keys(selectedMember.classExperienceSpent).length > 0 ? (
                  Object.entries(selectedMember.classExperienceSpent).map(([classId, spent]) => (
                    <div key={classId} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {/* Class dropdown */}
                      {editingField === `classExpSpent_class_${classId}` ? (
                        <>
                          <select
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            autoFocus
                            style={{
                              padding: '4px',
                              background: 'rgba(0, 0, 0, 0.5)',
                              border: '1px solid #666',
                              borderRadius: '2px',
                              color: '#fff',
                              fontSize: '11px',
                              minWidth: '120px',
                            }}
                          >
                            {availableClasses.map(cls => (
                              <option key={cls.id} value={cls.id}>
                                {cls.name} ({cls.id})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              const newClassId = editingValue;
                              if (newClassId !== classId) {
                                const currentSpent = { ...selectedMember.classExperienceSpent };
                                const spentValue = currentSpent[classId];
                                delete currentSpent[classId];
                                currentSpent[newClassId] = spentValue;

                                const updatedMember: PartyMemberDefinition = {
                                  ...selectedMember,
                                  classExperienceSpent: currentSpent,
                                };
                                PartyMemberRegistry.register(updatedMember);
                                setPartyMembers(PartyMemberRegistry.getAll());
                                setSelectedMember(updatedMember);
                              }
                              cancelEditing();
                            }}
                            style={{
                              padding: '2px 6px',
                              background: 'rgba(76, 175, 80, 0.3)',
                              border: '1px solid rgba(76, 175, 80, 0.6)',
                              borderRadius: '2px',
                              color: '#8bc34a',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontFamily: 'monospace',
                            }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditing}
                            style={{
                              padding: '2px 6px',
                              background: 'rgba(244, 67, 54, 0.3)',
                              border: '1px solid rgba(244, 67, 54, 0.6)',
                              borderRadius: '2px',
                              color: '#f44',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontFamily: 'monospace',
                            }}
                          >
                            ✗
                          </button>
                        </>
                      ) : (
                        <div
                          onClick={() => startEditing(`classExpSpent_class_${classId}`, classId)}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(255, 152, 0, 0.2)',
                            border: '1px solid rgba(255, 152, 0, 0.4)',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            minWidth: '120px',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 152, 0, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 152, 0, 0.2)';
                          }}
                        >
                          {availableClasses.find(c => c.id === classId)?.name || classId}
                        </div>
                      )}

                      {/* Spent amount */}
                      {editingField === `classExpSpent_amount_${classId}` ? (
                        <>
                          <input
                            type="number"
                            value={editingValue ?? 0}
                            onChange={(e) => setEditingValue(parseInt(e.target.value, 10) || 0)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const currentSpent = { ...selectedMember.classExperienceSpent };
                                currentSpent[classId] = editingValue ?? 0;

                                const updatedMember: PartyMemberDefinition = {
                                  ...selectedMember,
                                  classExperienceSpent: currentSpent,
                                };
                                PartyMemberRegistry.register(updatedMember);
                                setPartyMembers(PartyMemberRegistry.getAll());
                                setSelectedMember(updatedMember);
                                cancelEditing();
                              } else if (e.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                            autoFocus
                            style={{
                              padding: '4px',
                              background: 'rgba(0, 0, 0, 0.5)',
                              border: '1px solid #666',
                              borderRadius: '2px',
                              color: '#fff',
                              fontSize: '11px',
                              width: '80px',
                            }}
                          />
                          <button
                            onClick={() => {
                              const currentSpent = { ...selectedMember.classExperienceSpent };
                              currentSpent[classId] = editingValue ?? 0;

                              const updatedMember: PartyMemberDefinition = {
                                ...selectedMember,
                                classExperienceSpent: currentSpent,
                              };
                              PartyMemberRegistry.register(updatedMember);
                              setPartyMembers(PartyMemberRegistry.getAll());
                              setSelectedMember(updatedMember);
                              cancelEditing();
                            }}
                            style={{
                              padding: '2px 6px',
                              background: 'rgba(76, 175, 80, 0.3)',
                              border: '1px solid rgba(76, 175, 80, 0.6)',
                              borderRadius: '2px',
                              color: '#8bc34a',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontFamily: 'monospace',
                            }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditing}
                            style={{
                              padding: '2px 6px',
                              background: 'rgba(244, 67, 54, 0.3)',
                              border: '1px solid rgba(244, 67, 54, 0.6)',
                              borderRadius: '2px',
                              color: '#f44',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontFamily: 'monospace',
                            }}
                          >
                            ✗
                          </button>
                        </>
                      ) : (
                        <div
                          onClick={() => startEditing(`classExpSpent_amount_${classId}`, spent)}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            width: '80px',
                            textAlign: 'right',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(33, 150, 243, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(33, 150, 243, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          }}
                        >
                          {spent}
                        </div>
                      )}

                      {/* Delete button */}
                      <button
                        onClick={() => {
                          const currentSpent = { ...selectedMember.classExperienceSpent };
                          delete currentSpent[classId];

                          const updatedMember: PartyMemberDefinition = {
                            ...selectedMember,
                            classExperienceSpent: Object.keys(currentSpent).length > 0 ? currentSpent : undefined,
                          };
                          PartyMemberRegistry.register(updatedMember);
                          setPartyMembers(PartyMemberRegistry.getAll());
                          setSelectedMember(updatedMember);
                        }}
                        style={{
                          padding: '2px 6px',
                          background: 'rgba(244, 67, 54, 0.3)',
                          border: '1px solid rgba(244, 67, 54, 0.6)',
                          borderRadius: '2px',
                          color: '#f44',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                        }}
                        title="Remove this class experience spent"
                      >
                        −
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#666', fontStyle: 'italic', fontSize: '10px' }}>
                    No class experience spent. Click + to add.
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Sprite Browser Modal */}
      {spriteBrowserVisible && (
        <SpriteBrowser
          selectedSpriteId={selectedMember?.spriteId}
          onSelectSprite={handleSpriteSelect}
          onClose={() => setSpriteBrowserVisible(false)}
        />
      )}

      {/* Equipment Browser Modal */}
      {equipmentBrowserVisible && equipmentBrowserSlot && (
        <EquipmentBrowser
          selectedEquipmentId={selectedMember?.[`${equipmentBrowserSlot}Id` as keyof PartyMemberDefinition] as string | undefined}
          onSelectEquipment={handleEquipmentSelect}
          onClose={() => {
            setEquipmentBrowserVisible(false);
            setEquipmentBrowserSlot(null);
          }}
          filterType={
            equipmentBrowserSlot === 'head' ? 'Head' :
            equipmentBrowserSlot === 'body' ? 'Body' :
            equipmentBrowserSlot === 'accessory' ? 'Accessory' :
            undefined
          }
        />
      )}
    </div>
  );
};
