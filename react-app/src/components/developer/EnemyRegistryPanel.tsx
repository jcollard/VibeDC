import { useState, useEffect, useRef } from 'react';
import { EnemyRegistry } from '../../utils/EnemyRegistry';
import type { EnemyDefinition } from '../../utils/EnemyRegistry';
import { SpriteRegistry } from '../../utils/SpriteRegistry';

interface EnemyRegistryPanelProps {
  onClose?: () => void;
}

/**
 * Developer panel for browsing and editing enemies from the EnemyRegistry.
 * This component is only accessible in development mode.
 */
export const EnemyRegistryPanel: React.FC<EnemyRegistryPanelProps> = ({ onClose }) => {
  const [enemies, setEnemies] = useState<EnemyDefinition[]>([]);
  const [selectedEnemy, setSelectedEnemy] = useState<EnemyDefinition | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedEnemy, setEditedEnemy] = useState<EnemyDefinition | null>(null);
  const [editError, setEditError] = useState<string>('');
  const spriteCanvasRef = useRef<HTMLCanvasElement>(null);

  // Sprite size constant
  const SPRITE_SIZE = 12;
  const PREVIEW_SCALE = 8;

  // Load all enemies and tags
  useEffect(() => {
    const allEnemies = EnemyRegistry.getAll();
    setEnemies(allEnemies);

    // Extract all unique tags
    const tagsSet = new Set<string>();
    allEnemies.forEach(enemy => {
      enemy.tags?.forEach(tag => tagsSet.add(tag));
    });
    setAllTags(Array.from(tagsSet).sort());

    console.log('EnemyRegistryPanel: Loaded enemies:', allEnemies.length);
  }, []);

  // Get filtered enemies based on selected tag
  const filteredEnemies = selectedTag
    ? enemies.filter(e => e.tags?.includes(selectedTag))
    : enemies;

  // Draw sprite preview when selected enemy changes
  useEffect(() => {
    if (!selectedEnemy || !spriteCanvasRef.current) return;

    const sprite = SpriteRegistry.getById(selectedEnemy.spriteId);
    if (!sprite) {
      console.warn('Sprite not found:', selectedEnemy.spriteId);
      return;
    }

    // Load sprite sheet image
    const img = new Image();
    img.src = sprite.spriteSheet;
    img.onload = () => {
      const canvas = spriteCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const previewSize = SPRITE_SIZE * PREVIEW_SCALE;
      canvas.width = previewSize;
      canvas.height = previewSize;

      ctx.clearRect(0, 0, previewSize, previewSize);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        img,
        sprite.x * SPRITE_SIZE,
        sprite.y * SPRITE_SIZE,
        SPRITE_SIZE,
        SPRITE_SIZE,
        0,
        0,
        previewSize,
        previewSize
      );
    };
    img.onerror = () => {
      console.error('Failed to load sprite sheet:', sprite.spriteSheet);
    };
  }, [selectedEnemy, SPRITE_SIZE, PREVIEW_SCALE]);

  // Handle starting edit mode
  const handleStartEdit = () => {
    if (selectedEnemy) {
      setEditedEnemy({ ...selectedEnemy });
      setIsEditing(true);
      setEditError('');
    }
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedEnemy(null);
    setEditError('');
  };

  // Handle saving edited enemy
  const handleSaveEdit = () => {
    if (!editedEnemy || !selectedEnemy) return;

    // Validate required fields
    if (!editedEnemy.id.trim()) {
      setEditError('ID cannot be empty');
      return;
    }
    if (!editedEnemy.name.trim()) {
      setEditError('Name cannot be empty');
      return;
    }

    // If ID changed, check for duplicates
    if (editedEnemy.id !== selectedEnemy.id && EnemyRegistry.has(editedEnemy.id)) {
      setEditError(`ID '${editedEnemy.id}' is already in use`);
      return;
    }

    // Remove old entry if ID changed
    if (editedEnemy.id !== selectedEnemy.id) {
      EnemyRegistry.unregister(selectedEnemy.id);
    }

    // Register updated enemy
    EnemyRegistry.register(editedEnemy);

    // Update local state
    setSelectedEnemy(editedEnemy);
    setEnemies(EnemyRegistry.getAll());

    // Update tags
    const tagsSet = new Set<string>();
    EnemyRegistry.getAll().forEach(enemy => {
      enemy.tags?.forEach(tag => tagsSet.add(tag));
    });
    setAllTags(Array.from(tagsSet).sort());

    setIsEditing(false);
    setEditedEnemy(null);
    setEditError('');
  };

  // Handle deleting an enemy
  const handleDelete = () => {
    if (!selectedEnemy) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete enemy "${selectedEnemy.name}" (${selectedEnemy.id})?\n\n` +
      `This action cannot be undone (until you reload the page).`
    );

    if (!confirmed) return;

    const success = EnemyRegistry.unregister(selectedEnemy.id);

    if (success) {
      console.log(`Deleted enemy "${selectedEnemy.id}"`);
      setSelectedEnemy(null);
      setIsEditing(false);
      setEditedEnemy(null);
      setEnemies(EnemyRegistry.getAll());

      // Update tags
      const tagsSet = new Set<string>();
      EnemyRegistry.getAll().forEach(enemy => {
        enemy.tags?.forEach(tag => tagsSet.add(tag));
      });
      setAllTags(Array.from(tagsSet).sort());
    }
  };

  // Handle exporting enemy definitions to YAML
  const handleExport = () => {
    const allEnemies = EnemyRegistry.getAll();

    // Sort enemies by ID for cleaner output
    const sortedEnemies = allEnemies.sort((a, b) => a.id.localeCompare(b.id));

    // Generate YAML content
    let yaml = '# Enemy definitions for combat\n';
    yaml += '# Exported from Enemy Registry Panel\n\n';
    yaml += 'enemies:\n';

    for (const enemy of sortedEnemies) {
      yaml += `  - id: "${enemy.id}"\n`;
      yaml += `    name: "${enemy.name}"\n`;
      yaml += `    unitClassId: "${enemy.unitClassId}"\n`;
      yaml += `    baseHealth: ${enemy.baseHealth}\n`;
      yaml += `    baseMana: ${enemy.baseMana}\n`;
      yaml += `    basePhysicalPower: ${enemy.basePhysicalPower}\n`;
      yaml += `    baseMagicPower: ${enemy.baseMagicPower}\n`;
      yaml += `    baseSpeed: ${enemy.baseSpeed}\n`;
      yaml += `    baseMovement: ${enemy.baseMovement}\n`;
      yaml += `    basePhysicalEvade: ${enemy.basePhysicalEvade}\n`;
      yaml += `    baseMagicEvade: ${enemy.baseMagicEvade}\n`;
      yaml += `    baseCourage: ${enemy.baseCourage}\n`;
      yaml += `    baseAttunement: ${enemy.baseAttunement}\n`;
      yaml += `    spriteId: "${enemy.spriteId}"\n`;

      if (enemy.learnedAbilityIds && enemy.learnedAbilityIds.length > 0) {
        yaml += `    learnedAbilityIds: [${enemy.learnedAbilityIds.map(id => `"${id}"`).join(', ')}]\n`;
      }
      if (enemy.reactionAbilityId) {
        yaml += `    reactionAbilityId: "${enemy.reactionAbilityId}"\n`;
      }
      if (enemy.passiveAbilityId) {
        yaml += `    passiveAbilityId: "${enemy.passiveAbilityId}"\n`;
      }
      if (enemy.movementAbilityId) {
        yaml += `    movementAbilityId: "${enemy.movementAbilityId}"\n`;
      }
      if (enemy.tags && enemy.tags.length > 0) {
        yaml += `    tags: [${enemy.tags.map(t => `"${t}"`).join(', ')}]\n`;
      }
      if (enemy.description) {
        yaml += `    description: "${enemy.description}"\n`;
      }

      yaml += '\n';
    }

    // Create a blob and download link
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enemy-definitions.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Exported enemy definitions:', allEnemies.length);
  };

  // Handle creating a new enemy
  const handleCreateNew = () => {
    // Generate a unique ID for the new enemy
    let newId = 'new-enemy';
    let counter = 1;
    while (EnemyRegistry.has(newId)) {
      newId = `new-enemy-${counter}`;
      counter++;
    }

    // Create a new enemy template with default values
    const newEnemy: EnemyDefinition = {
      id: newId,
      name: 'New Enemy',
      unitClassId: 'monster',
      baseHealth: 20,
      baseMana: 10,
      basePhysicalPower: 5,
      baseMagicPower: 5,
      baseSpeed: 5,
      baseMovement: 3,
      basePhysicalEvade: 5,
      baseMagicEvade: 5,
      baseCourage: 5,
      baseAttunement: 5,
      spriteId: 'monsters-0',
      tags: [],
      description: '',
    };

    // Register the new enemy
    EnemyRegistry.register(newEnemy);

    // Update local state
    setEnemies(EnemyRegistry.getAll());
    setSelectedEnemy(newEnemy);

    // Update tags
    const tagsSet = new Set<string>();
    EnemyRegistry.getAll().forEach(enemy => {
      enemy.tags?.forEach(tag => tagsSet.add(tag));
    });
    setAllTags(Array.from(tagsSet).sort());

    // Start editing the new enemy immediately
    setEditedEnemy({ ...newEnemy });
    setIsEditing(true);
    setEditError('');
  };

  // Handle field changes during edit
  const handleFieldChange = (field: keyof EnemyDefinition, value: any) => {
    if (!editedEnemy) return;
    setEditedEnemy({ ...editedEnemy, [field]: value });
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
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Enemy Registry Browser</div>
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
            title="Create a new enemy template"
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
            title="Export all enemy definitions to YAML file"
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
              title="Close enemy registry"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Left column - Enemy list and tags */}
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
              <div><strong>Total Enemies:</strong> {enemies.length}</div>
              {selectedTag && (
                <div><strong>Filtered:</strong> {filteredEnemies.length}</div>
              )}
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
                        background: isActive
                          ? 'rgba(255, 255, 0, 0.3)'
                          : 'rgba(76, 175, 80, 0.2)',
                        border: isActive
                          ? '1px solid rgba(255, 255, 0, 0.6)'
                          : '1px solid rgba(76, 175, 80, 0.4)',
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

          {/* Enemy list */}
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
              Enemies {selectedTag && `(${selectedTag})`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredEnemies.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', padding: '8px' }}>
                  No enemies found
                </div>
              ) : (
                filteredEnemies.map(enemy => (
                  <div
                    key={enemy.id}
                    onClick={() => {
                      setSelectedEnemy(enemy);
                      setIsEditing(false);
                      setEditError('');
                    }}
                    style={{
                      padding: '8px',
                      background: selectedEnemy?.id === enemy.id
                        ? 'rgba(255, 255, 0, 0.2)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: selectedEnemy?.id === enemy.id
                        ? '1px solid rgba(255, 255, 0, 0.6)'
                        : '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedEnemy?.id !== enemy.id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedEnemy?.id !== enemy.id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{enemy.name}</div>
                    <div style={{ fontSize: '9px', color: '#aaa' }}>{enemy.id}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column - Enemy details */}
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
          {!selectedEnemy ? (
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
              Select an enemy to view details
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Header with edit/delete buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#ffff00' }}>
                  {isEditing ? 'Edit Enemy' : selectedEnemy.name}
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
                        title="Delete this enemy"
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

              {/* Sprite preview */}
              <div style={{ textAlign: 'center', padding: '12px' }}>
                <canvas
                  ref={spriteCanvasRef}
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    imageRendering: 'pixelated',
                    background: 'rgba(0, 0, 0, 0.3)',
                  } as React.CSSProperties}
                />
                <div style={{ marginTop: '4px', fontSize: '9px', color: '#aaa' }}>
                  Sprite: {isEditing ? editedEnemy?.spriteId : selectedEnemy.spriteId}
                </div>
              </div>

              {/* Enemy fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11px' }}>
                {/* ID */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>ID:</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedEnemy?.id || ''}
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
                    <div style={{ color: '#fff' }}>{selectedEnemy.id}</div>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Name:</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedEnemy?.name || ''}
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
                    <div style={{ color: '#fff' }}>{selectedEnemy.name}</div>
                  )}
                </div>

                {/* Unit Class */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Unit Class:</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedEnemy?.unitClassId || ''}
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
                    />
                  ) : (
                    <div style={{ color: '#fff' }}>{selectedEnemy.unitClassId}</div>
                  )}
                </div>

                {/* Sprite ID */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Sprite ID:</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedEnemy?.spriteId || ''}
                      onChange={(e) => handleFieldChange('spriteId', e.target.value)}
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
                    <div style={{ color: '#fff' }}>{selectedEnemy.spriteId}</div>
                  )}
                </div>

                {/* Base Stats */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Health:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedEnemy?.baseHealth || 0}
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
                    <div style={{ color: '#fff' }}>{selectedEnemy.baseHealth}</div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Mana:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedEnemy?.baseMana || 0}
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
                    <div style={{ color: '#fff' }}>{selectedEnemy.baseMana}</div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Physical Power:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedEnemy?.basePhysicalPower || 0}
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
                    <div style={{ color: '#fff' }}>{selectedEnemy.basePhysicalPower}</div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Magic Power:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedEnemy?.baseMagicPower || 0}
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
                    <div style={{ color: '#fff' }}>{selectedEnemy.baseMagicPower}</div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Speed:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedEnemy?.baseSpeed || 0}
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
                    <div style={{ color: '#fff' }}>{selectedEnemy.baseSpeed}</div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Movement:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedEnemy?.baseMovement || 0}
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
                    <div style={{ color: '#fff' }}>{selectedEnemy.baseMovement}</div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Physical Evade:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedEnemy?.basePhysicalEvade || 0}
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
                    <div style={{ color: '#fff' }}>{selectedEnemy.basePhysicalEvade}</div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Magic Evade:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedEnemy?.baseMagicEvade || 0}
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
                    <div style={{ color: '#fff' }}>{selectedEnemy.baseMagicEvade}</div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Courage:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedEnemy?.baseCourage || 0}
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
                    <div style={{ color: '#fff' }}>{selectedEnemy.baseCourage}</div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>Attunement:</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedEnemy?.baseAttunement || 0}
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
                    <div style={{ color: '#fff' }}>{selectedEnemy.baseAttunement}</div>
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
                    value={editedEnemy?.description || ''}
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
                      minHeight: '60px',
                      resize: 'vertical',
                    }}
                  />
                ) : (
                  <div style={{ color: '#fff', fontSize: '11px', fontStyle: selectedEnemy.description ? 'normal' : 'italic', opacity: selectedEnemy.description ? 1 : 0.5 }}>
                    {selectedEnemy.description || 'No description'}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', color: '#aaa', fontSize: '11px' }}>
                  Tags:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(isEditing ? editedEnemy?.tags : selectedEnemy.tags)?.map(tag => (
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
