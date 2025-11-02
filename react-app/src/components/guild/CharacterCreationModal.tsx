import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { PartyMemberDefinition } from '../../utils/PartyMemberRegistry';
import { GuildRosterManager } from '../../utils/GuildRosterManager';
import { GuildHallConstants as C } from '../../constants/GuildHallConstants';
import { FontRegistry } from '../../utils/FontRegistry';
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';
import { SpriteRenderer } from '../../utils/SpriteRenderer';
import { UnitClass } from '../../models/combat/UnitClass';
import { UISettings } from '../../config/UISettings';

interface CharacterCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCharacterCreated: (character: PartyMemberDefinition) => void;
  guildManager: GuildRosterManager;
  resourceManager?: any; // TODO: Type properly
}

interface NameInputState {
  value: string;
  focused: boolean;
}

/**
 * Character Creation Modal
 *
 * A full-screen modal overlay for creating new characters.
 * Includes name input, sprite selection, and class selection.
 *
 * ⚠️ RENDERING GUIDELINES:
 * - ALL text uses FontAtlasRenderer (never ctx.fillText)
 * - ALL sprites use SpriteRenderer (never ctx.drawImage directly)
 * - ALL coordinates rounded with Math.floor()
 */
export const CharacterCreationModal: React.FC<CharacterCreationModalProps> = ({
  isOpen,
  onClose,
  onCharacterCreated,
  guildManager,
  resourceManager,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // State for name input
  const [nameInput, setNameInput] = useState<NameInputState>({
    value: '',
    focused: true, // Auto-focus on open
  });

  // State for sprite selection
  const [selectedSpriteIndex, setSelectedSpriteIndex] = useState<number>(0);
  const [availableSprites, setAvailableSprites] = useState<string[]>([]);

  // Derive selected sprite ID from index
  const selectedSpriteId = availableSprites[selectedSpriteIndex] || '';

  // State for class selection
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [hoveredClassId, setHoveredClassId] = useState<string | null>(null);

  // State for ability selection
  const [selectedAbilityIndex, setSelectedAbilityIndex] = useState<number>(0);

  // Create button enabled state
  const [createButtonEnabled, setCreateButtonEnabled] = useState(false);

  // Resources loaded state
  const [resourcesLoaded, setResourcesLoaded] = useState(false);

  // Track window size for integer scaling
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Track canvas display style for integer scaling
  const [canvasDisplayStyle, setCanvasDisplayStyle] = useState<{ width: string; height: string }>({
    width: '100%',
    height: '100%',
  });

  if (!isOpen) return null;

  // Window resize listener for integer scaling
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate canvas display dimensions based on integer scaling
  useEffect(() => {
    const updateCanvasStyle = () => {
      const containerRef = canvasRef.current?.parentElement;
      if (!containerRef) {
        setCanvasDisplayStyle({ width: '100%', height: '100%' });
        return;
      }

      const scaledDimensions = UISettings.getIntegerScaledDimensions(
        C.CANVAS_WIDTH,
        C.CANVAS_HEIGHT,
        containerRef.clientWidth,
        containerRef.clientHeight
      );

      if (scaledDimensions) {
        setCanvasDisplayStyle({
          width: `${scaledDimensions.width}px`,
          height: `${scaledDimensions.height}px`,
        });
      }
    };

    updateCanvasStyle();
  }, [windowSize.width, windowSize.height]);

  // Function to generate a random fantasy name based on class
  const generateFantasyName = useCallback((className: string): string => {
    // Name syllable pools by class archetype
    const syllables = {
      warrior: {
        prefixes: ['Grim', 'Thor', 'Bran', 'Rok', 'Gar', 'Drak', 'Ulf', 'Sig', 'Bal', 'Vor'],
        suffixes: ['gar', 'mund', 'thor', 'ric', 'dar', 'lok', 'dur', 'mar', 'zon', 'ak'],
      },
      mage: {
        prefixes: ['Zel', 'Myr', 'Cal', 'Eld', 'Syl', 'Tha', 'Lys', 'Mor', 'Ari', 'Vel'],
        suffixes: ['dor', 'wyn', 'ian', 'eth', 'ara', 'iris', 'andra', 'ion', 'aris', 'en'],
      },
      rogue: {
        prefixes: ['Shad', 'Rav', 'Nyx', 'Cor', 'Vex', 'Ash', 'Kael', 'Ryn', 'Zyx', 'Jin'],
        suffixes: ['ix', 'wyn', 'ra', 'en', 'is', 'ax', 'yn', 'or', 'us', 'an'],
      },
      cleric: {
        prefixes: ['Sere', 'Ael', 'Cel', 'Lum', 'Gal', 'Isa', 'Mer', 'Ade', 'Eli', 'Bene'],
        suffixes: ['neth', 'wen', 'lia', 'dra', 'na', 'ine', 'el', 'dia', 'ith', 'ara'],
      },
    };

    // Determine class archetype
    const lowerClassName = className.toLowerCase();
    let pool = syllables.warrior; // default

    if (lowerClassName.includes('mage') || lowerClassName.includes('wizard') || lowerClassName.includes('sorc')) {
      pool = syllables.mage;
    } else if (lowerClassName.includes('rogue') || lowerClassName.includes('thief') || lowerClassName.includes('assassin')) {
      pool = syllables.rogue;
    } else if (lowerClassName.includes('cleric') || lowerClassName.includes('priest') || lowerClassName.includes('paladin')) {
      pool = syllables.cleric;
    }

    // Generate name
    const prefix = pool.prefixes[Math.floor(Math.random() * pool.prefixes.length)];
    const suffix = pool.suffixes[Math.floor(Math.random() * pool.suffixes.length)];
    return prefix + suffix;
  }, []);

  // Load resources on mount and initialize with random selections
  useEffect(() => {
    // Fonts should already be loaded - just verify
    const fontIds = FontRegistry.getAllIds();
    if (fontIds.length === 0) {
      console.error('[CharacterCreationModal] No fonts registered!');
      return;
    }

    setResourcesLoaded(true);

    // Use specific Crystal Warriors sprites for character creation
    // These are the available character sprite options: crystalwarriors-0, 2, 4, 6, 8, 10, 12, 14, 16, 18
    const sprites = [
      'crystalwarriors-0',
      'crystalwarriors-2',
      'crystalwarriors-4',
      'crystalwarriors-6',
      'crystalwarriors-8',
      'crystalwarriors-10',
      'crystalwarriors-12',
      'crystalwarriors-14',
      'crystalwarriors-16',
      'crystalwarriors-18',
    ];
    setAvailableSprites(sprites);

    // Auto-select random sprite
    if (sprites.length > 0) {
      const randomSpriteIndex = Math.floor(Math.random() * sprites.length);
      setSelectedSpriteIndex(randomSpriteIndex);
    }

    // Randomly select a starter class
    const starterClasses = guildManager.getStarterClasses();
    if (starterClasses.length > 0) {
      const randomClass = starterClasses[Math.floor(Math.random() * starterClasses.length)];
      setSelectedClassId(randomClass.id);

      // Generate a random name for the selected class
      const randomName = generateFantasyName(randomClass.name);
      setNameInput({ value: randomName, focused: true });
    }
  }, [guildManager, generateFantasyName]);

  // Update create button enabled state
  useEffect(() => {
    const enabled = nameInput.value.trim().length > 0
      && selectedSpriteId !== ''
      && selectedClassId !== null
      && guildManager.isValidName(nameInput.value)
      && !guildManager.isNameTaken(nameInput.value);

    setCreateButtonEnabled(enabled);
  }, [nameInput.value, selectedSpriteId, selectedClassId, guildManager]);

  // Randomly select ability when class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSelectedAbilityIndex(0);
      return;
    }

    const unitClass = UnitClass.getById(selectedClassId);
    if (!unitClass) {
      setSelectedAbilityIndex(0);
      return;
    }

    // Filter action abilities with cost <= 250
    const affordableAbilities = unitClass.learnableAbilities.filter(
      ability => ability.abilityType === 'Action' && ability.experiencePrice <= 250
    );

    if (affordableAbilities.length > 0) {
      // Randomly select an ability
      const randomIndex = Math.floor(Math.random() * affordableAbilities.length);
      setSelectedAbilityIndex(randomIndex);
    } else {
      setSelectedAbilityIndex(0);
    }
  }, [selectedClassId]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!nameInput.focused) return;

      if (event.key === 'Backspace') {
        event.preventDefault();
        setNameInput(prev => ({ ...prev, value: prev.value.slice(0, -1) }));
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        handleCreate();
      } else if (event.key.length === 1) {
        // Validate character: ASCII alphabetic characters only (A-Z, a-z)
        if (/^[A-Za-z]$/.test(event.key) && nameInput.value.length < C.CHARACTER_CREATION_MODAL.NAME_MAX_LENGTH) {
          event.preventDefault();
          setNameInput(prev => ({ ...prev, value: prev.value + event.key }));
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [nameInput, isOpen, onClose]);

  // Handle create character
  const handleCreate = useCallback(() => {
    if (!createButtonEnabled) return;

    // Calculate selected ability ID
    let selectedAbilityId: string | undefined;
    if (selectedClassId) {
      const unitClass = UnitClass.getById(selectedClassId);
      if (unitClass) {
        const affordableAbilities = unitClass.learnableAbilities.filter(
          ability => ability.abilityType === 'Action' && ability.experiencePrice <= 250
        );

        if (affordableAbilities.length > 0 && selectedAbilityIndex < affordableAbilities.length) {
          selectedAbilityId = affordableAbilities[selectedAbilityIndex].id;
        }
      }
    }

    const character = guildManager.createCharacter(
      nameInput.value,
      selectedSpriteId,
      selectedClassId!,
      selectedAbilityId
    );

    if (character) {
      onCharacterCreated(character);
      onClose();
    }
  }, [createButtonEnabled, guildManager, nameInput.value, selectedSpriteId, selectedClassId, selectedAbilityIndex, onCharacterCreated, onClose]);

  // Mouse click handler
  const handleMouseClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;

    // Check sprite selector arrow clicks
    const MC = C.CHARACTER_CREATION_MODAL;
    const modalX = Math.floor((C.CANVAS_WIDTH - MC.MODAL_WIDTH) / 2);
    const modalY = 10;
    const selectorX = modalX + 10;
    const selectorY = modalY + 53;

    const portraitSize = 24; // 2x scale
    const arrowSize = 12; // 1x scale
    const spacing = 4;
    const totalWidth = arrowSize + spacing + portraitSize + spacing + arrowSize;
    const centerX = selectorX + (MC.INPUT_WIDTH - totalWidth) / 2; // Center beneath the 72px input box
    const arrowOffsetY = (portraitSize - arrowSize) / 2; // Center 12px arrows on 24px portrait

    // Left arrow click
    const leftArrowX = centerX;
    const leftArrowY = selectorY + arrowOffsetY;
    if (
      mouseX >= leftArrowX &&
      mouseX <= leftArrowX + arrowSize &&
      mouseY >= leftArrowY &&
      mouseY <= leftArrowY + arrowSize
    ) {
      // Cycle to previous sprite
      setSelectedSpriteIndex(prev => (prev - 1 + availableSprites.length) % availableSprites.length);
      return;
    }

    // Right arrow click
    const rightArrowX = centerX + arrowSize + spacing + portraitSize + spacing;
    const rightArrowY = selectorY + arrowOffsetY;
    if (
      mouseX >= rightArrowX &&
      mouseX <= rightArrowX + arrowSize &&
      mouseY >= rightArrowY &&
      mouseY <= rightArrowY + arrowSize
    ) {
      // Cycle to next sprite
      setSelectedSpriteIndex(prev => (prev + 1) % availableSprites.length);
      return;
    }

    // Check ability selector arrow clicks
    if (selectedClassId) {
      const unitClass = UnitClass.getById(selectedClassId);
      if (unitClass) {
        const affordableAbilities = unitClass.learnableAbilities.filter(
          ability => ability.abilityType === 'Action' && ability.experiencePrice <= 250
        );

        if (affordableAbilities.length > 1) {
          const abilityX = modalX + 130;
          const abilityY = modalY + 81;
          const abilityArrowSize = 12;

          // Fixed positions for arrows (matching rendering)
          const abilityLeftArrowX = abilityX;
          const abilityRightArrowX = modalX + MC.MODAL_WIDTH - 8 - abilityArrowSize;
          const abilityArrowY = abilityY + 10;

          // Left arrow for ability (10px below "Starting Ability" title)
          if (
            mouseX >= abilityLeftArrowX &&
            mouseX <= abilityLeftArrowX + abilityArrowSize &&
            mouseY >= abilityArrowY &&
            mouseY <= abilityArrowY + abilityArrowSize
          ) {
            setSelectedAbilityIndex(prev => (prev - 1 + affordableAbilities.length) % affordableAbilities.length);
            return;
          }

          // Right arrow for ability (8px from right edge of modal)
          if (
            mouseX >= abilityRightArrowX &&
            mouseX <= abilityRightArrowX + abilityArrowSize &&
            mouseY >= abilityArrowY &&
            mouseY <= abilityArrowY + abilityArrowSize
          ) {
            setSelectedAbilityIndex(prev => (prev + 1) % affordableAbilities.length);
            return;
          }
        }
      }
    }

    // Check class list clicks
    const starterClasses = guildManager.getStarterClasses();
    const classListX = modalX + 130;
    const classListY = modalY + 27;

    starterClasses.forEach((unitClass, index) => {
      const itemY = classListY + 2 + (index * MC.CLASS_ITEM_HEIGHT);

      if (
        mouseX >= classListX &&
        mouseX <= classListX + MC.CLASS_INFO_WIDTH &&
        mouseY >= itemY &&
        mouseY <= itemY + MC.CLASS_ITEM_HEIGHT
      ) {
        setSelectedClassId(unitClass.id);
        return;
      }
    });

    // Check Create button
    const createButtonX = modalX + 70;
    const createButtonY = modalY + 190;
    const buttonWidth = 40;
    const buttonHeight = 12;

    if (
      mouseX >= createButtonX &&
      mouseX <= createButtonX + buttonWidth &&
      mouseY >= createButtonY &&
      mouseY <= createButtonY + buttonHeight
    ) {
      handleCreate();
      return;
    }

    // Check Cancel button
    const cancelButtonX = createButtonX + 60; // Cancel is 60px to the right of Create
    const cancelButtonY = createButtonY;

    if (
      mouseX >= cancelButtonX &&
      mouseX <= cancelButtonX + buttonWidth &&
      mouseY >= cancelButtonY &&
      mouseY <= cancelButtonY + buttonHeight
    ) {
      onClose();
      return;
    }

    // Check name input focus (input box is at y + 10 from the label position)
    const nameInputX = modalX + 10;
    const nameInputY = modalY + 20 + 10; // y position + 10 for the box offset

    if (
      mouseX >= nameInputX &&
      mouseX <= nameInputX + MC.INPUT_WIDTH &&
      mouseY >= nameInputY &&
      mouseY <= nameInputY + MC.INPUT_HEIGHT
    ) {
      setNameInput(prev => ({ ...prev, focused: true }));
    }
  }, [availableSprites, guildManager, handleCreate, onClose]);

  // Handle mouse move for hover tracking
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;

    const MC = C.CHARACTER_CREATION_MODAL;
    const modalX = Math.floor((C.CANVAS_WIDTH - MC.MODAL_WIDTH) / 2);
    const modalY = 10;

    // Check class list hover
    const starterClasses = guildManager.getStarterClasses();
    const classListX = modalX + 130;
    const classListY = modalY + 27;

    let hoveredClass: string | null = null;
    starterClasses.forEach((unitClass, index) => {
      const itemY = classListY + 2 + (index * MC.CLASS_ITEM_HEIGHT);

      if (
        mouseX >= classListX &&
        mouseX <= classListX + MC.CLASS_INFO_WIDTH &&
        mouseY >= itemY &&
        mouseY <= itemY + MC.CLASS_ITEM_HEIGHT
      ) {
        hoveredClass = unitClass.id;
      }
    });

    setHoveredClassId(hoveredClass);
  }, [guildManager]);

  // Render loop
  useEffect(() => {
    if (!resourcesLoaded) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ⚠️ RENDERING GUIDELINE: Disable image smoothing for pixel art!
    ctx.imageSmoothingEnabled = false;

    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, C.CANVAS_WIDTH, C.CANVAS_HEIGHT);

      // Draw semi-transparent overlay
      ctx.fillStyle = `rgba(0, 0, 0, ${C.CHARACTER_CREATION_MODAL.OVERLAY_OPACITY})`;
      ctx.fillRect(0, 0, C.CANVAS_WIDTH, C.CANVAS_HEIGHT);

      // Draw modal panel (centered)
      const modalX = Math.floor((C.CANVAS_WIDTH - C.CHARACTER_CREATION_MODAL.MODAL_WIDTH) / 2);
      const modalY = 10;
      const modalHeight = 200;

      ctx.fillStyle = '#000000';
      ctx.fillRect(modalX, modalY, C.CHARACTER_CREATION_MODAL.MODAL_WIDTH, modalHeight);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(modalX, modalY, C.CHARACTER_CREATION_MODAL.MODAL_WIDTH, modalHeight);
      ctx.lineWidth = 1;

      // Get font atlas from resource manager
      const fontDef = FontRegistry.getById('7px-04b03');
      if (!fontDef) return;

      const fontAtlas = resourceManager?.getFontAtlas('7px-04b03');
      if (!fontAtlas) return; // Can't render without font atlas

      // Get sprite images from resource manager
      const spriteImages = resourceManager?.getSpriteImages() || new Map<string, HTMLImageElement>();

      // Draw title
      const MC = C.CHARACTER_CREATION_MODAL;
      FontAtlasRenderer.renderText(
        ctx,
        MC.TITLE_TEXT,
        Math.floor(modalX + C.CHARACTER_CREATION_MODAL.MODAL_WIDTH / 2 - 40),
        modalY + 8,
        '7px-04b03',
        fontAtlas,
        1,
        'left',
        MC.TITLE_COLOR
      );

      // Render name input
      renderNameInput(ctx, modalX + 10, modalY + 20, fontAtlas);

      // Render sprite selection with arrows (centered below name)
      renderSpriteSelector(ctx, modalX + 10, modalY + 53, spriteImages);

      // Render class selection
      renderClassList(ctx, modalX + 130, modalY + 27, fontAtlas);
      renderClassInfo(ctx, modalX + 10, modalY + 81, fontAtlas);
      renderStartingAbility(ctx, modalX + 130, modalY + 81, fontAtlas, spriteImages);

      // Render buttons
      renderButtons(ctx, modalX + 70, modalY + 190, fontAtlas);
    };

    render();
  }, [resourcesLoaded, nameInput, selectedSpriteId, selectedClassId, hoveredClassId, createButtonEnabled, availableSprites, selectedAbilityIndex]);

  // ⚠️ RENDERING GUIDELINE: Use FontAtlasRenderer for ALL text!
  const renderNameInput = (ctx: CanvasRenderingContext2D, x: number, y: number, fontAtlas: HTMLImageElement) => {
    const MC = C.CHARACTER_CREATION_MODAL;

    // Draw label
    FontAtlasRenderer.renderText(
      ctx,
      MC.NAME_LABEL,
      x,
      y,
      '7px-04b03',
      fontAtlas,
      1,
      'left',
      '#ffffff'
    );

    // Draw input box
    ctx.fillStyle = MC.INPUT_BG;
    ctx.fillRect(x, y + 10, MC.INPUT_WIDTH, MC.INPUT_HEIGHT);
    ctx.strokeStyle = nameInput.focused ? MC.INPUT_BORDER_FOCUS : MC.INPUT_BORDER_NORMAL;
    ctx.strokeRect(x, y + 10, MC.INPUT_WIDTH, MC.INPUT_HEIGHT);

    // Draw input text
    FontAtlasRenderer.renderText(
      ctx,
      nameInput.value,
      x + 4,
      y + 14,
      '7px-04b03',
      fontAtlas,
      1,
      'left',
      MC.INPUT_TEXT_COLOR
    );

    // Draw cursor (solid, no blink)
    if (nameInput.focused) {
      // Calculate exact text width using font measurement
      const textWidth = FontAtlasRenderer.measureTextByFontId(nameInput.value, '7px-04b03');
      ctx.fillStyle = MC.INPUT_TEXT_COLOR;
      ctx.fillRect(x + 4 + textWidth, y + 12, 1, MC.INPUT_HEIGHT - 4);
    }

    // Draw validation message if invalid
    if (nameInput.value.length > 0 && !guildManager.isValidName(nameInput.value)) {
      FontAtlasRenderer.renderText(
        ctx,
        C.ERROR_INVALID_NAME,
        x,
        y + 26,
        '7px-04b03',
        fontAtlas,
        1,
        'left',
        '#ff0000'
      );
    } else if (nameInput.value.length > 0 && guildManager.isNameTaken(nameInput.value)) {
      FontAtlasRenderer.renderText(
        ctx,
        C.ERROR_NAME_EXISTS,
        x,
        y + 26,
        '7px-04b03',
        fontAtlas,
        1,
        'left',
        '#ff0000'
      );
    }
  };

  // ⚠️ RENDERING GUIDELINE: Use SpriteRenderer for ALL sprites!
  const renderSpriteSelector = (ctx: CanvasRenderingContext2D, x: number, y: number, spriteImages: Map<string, HTMLImageElement>) => {
    if (!selectedSpriteId) return;

    const portraitSize = 24; // 2x scale (12px sprite * 2)
    const arrowSize = 12; // 1x scale for minimap arrows
    const spacing = 4; // Space between arrows and portrait

    // Calculate centered position beneath the name input box
    // Left arrow (minimap-8) + spacing + portrait + spacing + right arrow (minimap-6)
    const totalWidth = arrowSize + spacing + portraitSize + spacing + arrowSize;
    const MC = C.CHARACTER_CREATION_MODAL;
    const centerX = x + (MC.INPUT_WIDTH - totalWidth) / 2; // Center beneath the 72px input box

    // Calculate vertical offset to center arrows on portrait
    const arrowOffsetY = (portraitSize - arrowSize) / 2; // Center 12px arrows on 24px portrait

    // Render left arrow (minimap-8)
    SpriteRenderer.renderSpriteById(
      ctx,
      'minimap-8',
      spriteImages,
      12, // sprite size
      Math.floor(centerX),
      Math.floor(y + arrowOffsetY),
      arrowSize,
      arrowSize
    );

    // Render portrait (2x scale)
    const portraitX = centerX + arrowSize + spacing;

    SpriteRenderer.renderSpriteById(
      ctx,
      selectedSpriteId,
      spriteImages,
      12, // sprite size
      Math.floor(portraitX),
      Math.floor(y),
      portraitSize,
      portraitSize
    );

    // Render right arrow (minimap-6)
    const rightArrowX = portraitX + portraitSize + spacing;
    SpriteRenderer.renderSpriteById(
      ctx,
      'minimap-6',
      spriteImages,
      12, // sprite size
      Math.floor(rightArrowX),
      Math.floor(y + arrowOffsetY),
      arrowSize,
      arrowSize
    );
  };

  const renderClassList = (ctx: CanvasRenderingContext2D, x: number, y: number, fontAtlas: HTMLImageElement) => {
    const MC = C.CHARACTER_CREATION_MODAL;

    // Draw label
    FontAtlasRenderer.renderText(
      ctx,
      MC.CLASS_LABEL,
      x,
      y - 7,
      '7px-04b03',
      fontAtlas,
      1,
      'left',
      '#ffffff'
    );

    const starterClasses = guildManager.getStarterClasses();

    starterClasses.forEach((unitClass, index) => {
      const itemY = y + 2 + (index * MC.CLASS_ITEM_HEIGHT);

      // ⚠️ RENDERING GUIDELINE: Use FontAtlasRenderer!
      // Determine text color: green if selected, yellow if hovered (but not selected), white otherwise
      let textColor = MC.CLASS_COLOR_NORMAL; // white
      if (unitClass.id === selectedClassId) {
        textColor = '#00ff00'; // green for selected
      } else if (unitClass.id === hoveredClassId) {
        textColor = '#ffff00'; // yellow for hovered
      }

      FontAtlasRenderer.renderText(
        ctx,
        unitClass.name,
        x,
        itemY + 7,
        '7px-04b03',
        fontAtlas,
        1,
        'left',
        textColor
      );
    });
  };

  const renderClassInfo = (ctx: CanvasRenderingContext2D, x: number, y: number, fontAtlas: HTMLImageElement) => {
    if (!selectedClassId) {
      FontAtlasRenderer.renderText(
        ctx,
        'Select a class',
        x,
        y,
        '7px-04b03',
        fontAtlas,
        1,
        'left',
        '#888888'
      );
      return;
    }

    const unitClass = UnitClass.getById(selectedClassId);
    if (!unitClass) return;

    const MC = C.CHARACTER_CREATION_MODAL;

    // ⚠️ RENDERING GUIDELINE: ALL text must use FontAtlasRenderer!

    // Draw class name
    FontAtlasRenderer.renderText(
      ctx,
      unitClass.name,
      x,
      y,
      '7px-04b03',
      fontAtlas,
      1,
      'left',
      MC.CLASS_NAME_COLOR
    );

    // Draw description with word wrapping
    const description = unitClass.description || 'No description';
    const maxWidth = 110; // Available width for description text (120px total - 10px padding)

    // Split description into words and wrap to fit width
    const words = description.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = FontAtlasRenderer.measureTextByFontId(testLine, '7px-04b03');

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    // Render each line
    lines.forEach((line, index) => {
      FontAtlasRenderer.renderText(
        ctx,
        line,
        x,
        y + 10 + (index * 10), // 10px line height
        '7px-04b03',
        fontAtlas,
        1,
        'left',
        MC.CLASS_DESC_COLOR
      );
    });
  };

  const renderStartingAbility = (ctx: CanvasRenderingContext2D, x: number, y: number, fontAtlas: HTMLImageElement, spriteImages: Map<string, HTMLImageElement>) => {
    const MC = C.CHARACTER_CREATION_MODAL;

    // Draw "Starting Ability" label
    FontAtlasRenderer.renderText(
      ctx,
      'Starting Ability',
      x,
      y,
      '7px-04b03',
      fontAtlas,
      1,
      'left',
      MC.CLASS_NAME_COLOR
    );

    if (!selectedClassId) {
      return;
    }

    const unitClass = UnitClass.getById(selectedClassId);
    if (!unitClass) return;

    // Filter action abilities with cost <= 250
    const affordableAbilities = unitClass.learnableAbilities.filter(
      ability => ability.abilityType === 'Action' && ability.experiencePrice <= 250
    );

    if (affordableAbilities.length === 0) {
      // No affordable abilities
      FontAtlasRenderer.renderText(
        ctx,
        'No abilities available',
        x,
        y + 10,
        '7px-04b03',
        fontAtlas,
        1,
        'left',
        '#888888'
      );
      return;
    }

    const selectedAbility = affordableAbilities[selectedAbilityIndex];
    if (!selectedAbility) return;

    // If there's only one ability, just show the name without arrows
    if (affordableAbilities.length === 1) {
      FontAtlasRenderer.renderText(
        ctx,
        selectedAbility.name,
        x,
        y + 12,
        '7px-04b03',
        fontAtlas,
        1,
        'left',
        '#ffffff'
      );

      // Render ability description below the name
      renderAbilityDescription(ctx, x, y + 22, selectedAbility.description, fontAtlas);
      return;
    }

    // Multiple abilities: show left arrow, name (centered), right arrow
    const arrowSize = 12; // 1x scale for minimap arrows

    // Fixed positions for arrows
    const leftArrowX = x;
    const modalX = Math.floor((C.CANVAS_WIDTH - MC.MODAL_WIDTH) / 2);
    const rightArrowX = modalX + MC.MODAL_WIDTH - 8 - arrowSize;

    // Calculate available space for text between arrows
    const availableSpace = rightArrowX - (leftArrowX + arrowSize);
    const abilityNameWidth = FontAtlasRenderer.measureTextByFontId(selectedAbility.name, '7px-04b03');
    const textX = leftArrowX + arrowSize + (availableSpace - abilityNameWidth) / 2;

    // Render left arrow (minimap-8)
    SpriteRenderer.renderSpriteById(
      ctx,
      'minimap-8',
      spriteImages,
      12,
      Math.floor(leftArrowX),
      Math.floor(y + 10),
      arrowSize,
      arrowSize
    );

    // Render ability name (centered between arrows)
    FontAtlasRenderer.renderText(
      ctx,
      selectedAbility.name,
      textX,
      y + 12,
      '7px-04b03',
      fontAtlas,
      1,
      'left',
      '#ffffff'
    );

    // Render right arrow (minimap-6) - 8px from right edge of modal
    SpriteRenderer.renderSpriteById(
      ctx,
      'minimap-6',
      spriteImages,
      12,
      Math.floor(rightArrowX),
      Math.floor(y + 10),
      arrowSize,
      arrowSize
    );

    // Render ability description below the name
    renderAbilityDescription(ctx, x, y + 24, selectedAbility.description, fontAtlas);
  };

  const renderAbilityDescription = (ctx: CanvasRenderingContext2D, x: number, y: number, description: string, fontAtlas: HTMLImageElement) => {
    const MC = C.CHARACTER_CREATION_MODAL;
    const modalX = Math.floor((C.CANVAS_WIDTH - MC.MODAL_WIDTH) / 2);

    // Calculate available width (from left edge to 8px before right edge)
    const maxWidth = modalX + MC.MODAL_WIDTH - 8 - x;

    // Split description into words and wrap to fit width
    const words = description.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = FontAtlasRenderer.measureTextByFontId(testLine, '7px-04b03');

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    // Render each line
    lines.forEach((line, index) => {
      FontAtlasRenderer.renderText(
        ctx,
        line,
        x,
        y + (index * 10), // 10px line height
        '7px-04b03',
        fontAtlas,
        1,
        'left',
        MC.CLASS_DESC_COLOR
      );
    });
  };

  const renderButtons = (ctx: CanvasRenderingContext2D, x: number, y: number, fontAtlas: HTMLImageElement) => {
    const MC = C.CHARACTER_CREATION_MODAL;

    // ⚠️ RENDERING GUIDELINE: Use FontAtlasRenderer for buttons!

    // Create button
    const createColor = createButtonEnabled ? MC.BUTTON_COLOR_ENABLED : MC.BUTTON_COLOR_DISABLED;
    FontAtlasRenderer.renderText(
      ctx,
      MC.CREATE_BUTTON_TEXT,
      x,
      y,
      '7px-04b03',
      fontAtlas,
      1,
      'left',
      createColor
    );

    // Cancel button
    FontAtlasRenderer.renderText(
      ctx,
      MC.CANCEL_BUTTON_TEXT,
      x + 60,
      y,
      '7px-04b03',
      fontAtlas,
      1,
      'left',
      MC.BUTTON_COLOR_NORMAL
    );
  };

  // Modal is rendered as sibling to fullscreen container (not inside it)
  // to ensure it covers entire viewport
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <canvas
        ref={canvasRef}
        width={C.CANVAS_WIDTH}
        height={C.CANVAS_HEIGHT}
        onClick={handleMouseClick}
        onMouseMove={handleMouseMove}
        style={{
          ...canvasDisplayStyle,
          imageRendering: 'pixelated',
          cursor: 'pointer',
        }}
      />
    </div>
  );
};
