import { useState, useEffect, useRef } from 'react';
import { PartyMemberRegistry } from '../../utils/PartyMemberRegistry';
import type { PartyMemberDefinition } from '../../utils/PartyMemberRegistry';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import { SpriteBrowser } from './SpriteBrowser';
import { EquipmentBrowser } from './EquipmentBrowser';
import { UnitClass } from '../../models/combat/UnitClass';
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedMember, setEditedMember] = useState<PartyMemberDefinition | null>(null);
  const [editError, setEditError] = useState<string>('');
  const [spriteBrowserVisible, setSpriteBrowserVisible] = useState(false);
  const [equipmentBrowserVisible, setEquipmentBrowserVisible] = useState(false);
  const [equipmentBrowserSlot, setEquipmentBrowserSlot] = useState<'leftHand' | 'rightHand' | 'head' | 'body' | 'accessory' | null>(null);
  const spriteCanvasRef = useRef<HTMLCanvasElement>(null);
  const [availableClasses, setAvailableClasses] = useState<UnitClass[]>([]);

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

    // Load available classes
    setAvailableClasses(UnitClass.getAll());

    console.log('PartyMemberRegistryPanel: Loaded party members:', allMembers.length);
  }, []);

  // Get filtered party members based on selected tag
  const filteredMembers = selectedTag
    ? partyMembers.filter(m => m.tags?.includes(selectedTag))
    : partyMembers;

  // Handle field changes during editing
  const handleFieldChange = (field: keyof PartyMemberDefinition, value: any) => {
    if (!editedMember) return;

    setEditedMember({
      ...editedMember,
      [field]: value,
    });
    setEditError('');
  };

  // Save changes
  const handleSave = () => {
    if (!editedMember) return;

    // Validate required fields
    if (!editedMember.id.trim()) {
      setEditError('ID is required');
      return;
    }
    if (!editedMember.name.trim()) {
      setEditError('Name is required');
      return;
    }
    if (!editedMember.unitClassId) {
      setEditError('Unit Class is required');
      return;
    }

    // Register the edited member
    PartyMemberRegistry.register(editedMember);

    // Update local state
    const updatedMembers = PartyMemberRegistry.getAll();
    setPartyMembers(updatedMembers);
    setSelectedMember(editedMember);
    setIsEditing(false);
    setEditError('');

    console.log('Saved party member:', editedMember.id);
  };

  // Cancel editing
  const handleCancel = () => {
    setIsEditing(false);
    setEditedMember(null);
    setEditError('');
  };

  // Start editing
  const handleEdit = () => {
    if (!selectedMember) return;
    setEditedMember({ ...selectedMember });
    setIsEditing(true);
    setEditError('');
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
    setIsEditing(false);
    setEditedMember(null);
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
    setEditedMember({ ...newMember });
    setIsEditing(true);
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

  // Render sprite preview
  useEffect(() => {
    if (!selectedMember || !spriteCanvasRef.current) return;

    const spriteId = isEditing ? editedMember?.spriteId : selectedMember.spriteId;
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
  }, [selectedMember, editedMember, isEditing, SPRITE_SIZE, PREVIEW_SCALE]);

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
                      setIsEditing(false);
                      setEditedMember(null);
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
            <div style={{ padding: '20px' }}>
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                {!isEditing ? (
                  <>
                    <button
                      onClick={handleEdit}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(33, 150, 243, 0.3)',
                        border: '1px solid rgba(33, 150, 243, 0.6)',
                        borderRadius: '4px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
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
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleSave}
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
                      Save
                    </button>
                    <button
                      onClick={handleCancel}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(158, 158, 158, 0.3)',
                        border: '1px solid rgba(158, 158, 158, 0.6)',
                        borderRadius: '4px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>

              {/* Error message */}
              {editError && (
                <div
                  style={{
                    padding: '12px',
                    marginBottom: '20px',
                    background: 'rgba(244, 67, 54, 0.2)',
                    border: '1px solid rgba(244, 67, 54, 0.4)',
                    borderRadius: '4px',
                    color: '#f44',
                  }}
                >
                  {editError}
                </div>
              )}

              {/* Sprite preview */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '8px' }}>
                  Sprite: {isEditing ? editedMember?.spriteId : selectedMember.spriteId}
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
              </div>

              {/* Party member fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11px' }}>
                {/* ID */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>ID:</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedMember?.id || ''}
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
                    <div style={{ color: '#fff' }}>{selectedMember.id}</div>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Name:</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedMember?.name || ''}
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
                    <div style={{ color: '#fff' }}>{selectedMember.name}</div>
                  )}
                </div>

                {/* Primary Class */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Primary Class:</label>
                  {isEditing ? (
                    <select
                      value={editedMember?.unitClassId || ''}
                      onChange={(e) => handleFieldChange('unitClassId', e.target.value)}
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
                    >
                      <option value="">Select a class...</option>
                      {availableClasses.map(unitClass => (
                        <option key={unitClass.id} value={unitClass.id}>
                          {unitClass.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ color: '#fff' }}>
                      {UnitClass.getById(selectedMember.unitClassId)?.name || selectedMember.unitClassId}
                    </div>
                  )}
                </div>

                {/* Secondary Class */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Secondary Class:</label>
                  {isEditing ? (
                    <select
                      value={editedMember?.secondaryClassId || ''}
                      onChange={(e) => handleFieldChange('secondaryClassId', e.target.value || undefined)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: '1px solid #666',
                        borderRadius: '3px',
                        color: '#fff',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                      }}
                    >
                      <option value="">None</option>
                      {availableClasses.map(unitClass => (
                        <option key={unitClass.id} value={unitClass.id}>
                          {unitClass.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#fff' }}>
                      {selectedMember.secondaryClassId
                        ? UnitClass.getById(selectedMember.secondaryClassId)?.name || selectedMember.secondaryClassId
                        : <span style={{ color: '#666', fontStyle: 'italic' }}>None</span>
                      }
                    </div>
                  )}
                </div>

                {/* Sprite ID */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Sprite ID:</label>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input
                        type="text"
                        value={editedMember?.spriteId || ''}
                        onChange={(e) => handleFieldChange('spriteId', e.target.value)}
                        style={{
                          flex: 1,
                          padding: '6px',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid #666',
                          borderRadius: '3px',
                          color: '#fff',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                        }}
                      />
                      <button
                        onClick={() => setSpriteBrowserVisible(true)}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(76, 175, 80, 0.3)',
                          border: '1px solid rgba(76, 175, 80, 0.6)',
                          borderRadius: '3px',
                          color: '#8bc34a',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                        }}
                      >
                        Browse...
                      </button>
                    </div>
                  ) : (
                    <div style={{ color: '#fff' }}>{selectedMember.spriteId}</div>
                  )}
                </div>
              </div>

              {/* Base Stats */}
              <div style={{ marginTop: '20px', marginBottom: '12px', fontSize: '13px', fontWeight: 'bold', color: '#4CAF50' }}>
                Base Stats
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '11px' }}>
                {/* Health */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Health:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedMember?.baseHealth || 0}
                      onChange={(e) => handleFieldChange('baseHealth', Number(e.target.value))}
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
                    <div style={{ color: '#fff' }}>{selectedMember.baseHealth}</div>
                  )}
                </div>

                {/* Mana */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Mana:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedMember?.baseMana || 0}
                      onChange={(e) => handleFieldChange('baseMana', Number(e.target.value))}
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
                    <div style={{ color: '#fff' }}>{selectedMember.baseMana}</div>
                  )}
                </div>

                {/* Physical Power */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Phys Power:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedMember?.basePhysicalPower || 0}
                      onChange={(e) => handleFieldChange('basePhysicalPower', Number(e.target.value))}
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
                    <div style={{ color: '#fff' }}>{selectedMember.basePhysicalPower}</div>
                  )}
                </div>

                {/* Magic Power */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Magic Power:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedMember?.baseMagicPower || 0}
                      onChange={(e) => handleFieldChange('baseMagicPower', Number(e.target.value))}
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
                    <div style={{ color: '#fff' }}>{selectedMember.baseMagicPower}</div>
                  )}
                </div>

                {/* Speed */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Speed:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedMember?.baseSpeed || 0}
                      onChange={(e) => handleFieldChange('baseSpeed', Number(e.target.value))}
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
                    <div style={{ color: '#fff' }}>{selectedMember.baseSpeed}</div>
                  )}
                </div>

                {/* Movement */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Movement:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedMember?.baseMovement || 0}
                      onChange={(e) => handleFieldChange('baseMovement', Number(e.target.value))}
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
                    <div style={{ color: '#fff' }}>{selectedMember.baseMovement}</div>
                  )}
                </div>

                {/* Physical Evade */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Phys Evade:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedMember?.basePhysicalEvade || 0}
                      onChange={(e) => handleFieldChange('basePhysicalEvade', Number(e.target.value))}
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
                    <div style={{ color: '#fff' }}>{selectedMember.basePhysicalEvade}</div>
                  )}
                </div>

                {/* Magic Evade */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Magic Evade:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedMember?.baseMagicEvade || 0}
                      onChange={(e) => handleFieldChange('baseMagicEvade', Number(e.target.value))}
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
                    <div style={{ color: '#fff' }}>{selectedMember.baseMagicEvade}</div>
                  )}
                </div>

                {/* Courage */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Courage:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedMember?.baseCourage || 0}
                      onChange={(e) => handleFieldChange('baseCourage', Number(e.target.value))}
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
                    <div style={{ color: '#fff' }}>{selectedMember.baseCourage}</div>
                  )}
                </div>

                {/* Attunement */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Attunement:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedMember?.baseAttunement || 0}
                      onChange={(e) => handleFieldChange('baseAttunement', Number(e.target.value))}
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
                    <div style={{ color: '#fff' }}>{selectedMember.baseAttunement}</div>
                  )}
                </div>
              </div>

              {/* Description and Tags would go here - keeping it simple for now */}

            </div>
          )}
        </div>
      </div>

      {/* Sprite Browser Modal */}
      {spriteBrowserVisible && (
        <SpriteBrowser
          selectedSpriteId={editedMember?.spriteId}
          onSelectSprite={(spriteId) => {
            handleFieldChange('spriteId', spriteId);
            setSpriteBrowserVisible(false);
          }}
          onClose={() => setSpriteBrowserVisible(false)}
        />
      )}

      {/* Equipment Browser Modal */}
      {equipmentBrowserVisible && equipmentBrowserSlot && (
        <EquipmentBrowser
          selectedEquipmentId={editedMember?.[`${equipmentBrowserSlot}Id` as keyof PartyMemberDefinition] as string | undefined}
          onSelectEquipment={(equipmentId) => {
            handleFieldChange(`${equipmentBrowserSlot}Id`, equipmentId || undefined);
            setEquipmentBrowserVisible(false);
            setEquipmentBrowserSlot(null);
          }}
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
