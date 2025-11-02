/**
 * InventoryView - Main view for displaying and interacting with the party inventory
 * Follows same 5-panel layout as CombatView (top panel, main view, log, top info, bottom info)
 * Implements double buffering, canvas-based rendering, and event handling
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { PartyInventory } from '../../utils/inventory/PartyInventory';
import { Equipment } from '../../models/combat/Equipment';
import { InventoryRenderer, type InventoryItemWithQuantity } from '../../models/inventory/InventoryRenderer';
import type { InventoryViewState, InventoryCategory, InventorySortMode } from '../../models/inventory/InventoryViewState';
import {
  loadInventoryViewStateFromLocalStorage,
  saveInventoryViewStateToLocalStorage,
} from '../../models/inventory/InventoryViewState';
import { CombatConstants } from '../../models/combat/CombatConstants';
import { CombatLayoutManager } from '../../models/combat/layouts/CombatLayoutManager';
import { CombatLogManager } from '../../models/combat/CombatLogManager';
import { FontAtlasLoader } from '../../services/FontAtlasLoader';
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';
import { InventoryTopPanelContent, type InventoryStats } from '../../models/inventory/panels/InventoryTopPanelContent';
import { EquipmentInfoContent } from '../../models/combat/managers/panels/EquipmentInfoContent';
import { AbilityInfoContent } from '../../models/combat/managers/panels/AbilityInfoContent';
import { PartyManagementUnitInfoContent } from '../../models/inventory/panels/PartyManagementUnitInfoContent';
import { EmptySlotInfoContent } from '../../models/inventory/panels/EmptySlotInfoContent';
import { EquipmentComparisonContent } from '../../models/inventory/panels/EquipmentComparisonContent';
import { SpendXpTitlePanelContent } from '../../models/inventory/panels/SpendXpTitlePanelContent';
import { SpendXpMainPanelContent } from '../../models/inventory/panels/SpendXpMainPanelContent';
import { ClassInfoContent } from '../../models/inventory/panels/ClassInfoContent';
import { SetAbilitiesTitlePanelContent } from '../../models/inventory/panels/SetAbilitiesTitlePanelContent';
import { SetAbilitiesMainPanelContent } from '../../models/inventory/panels/SetAbilitiesMainPanelContent';
import { InfoPanelManager } from '../../models/combat/managers/InfoPanelManager';
import { isEquipmentCompatibleWithSlot, isEquipmentSlot } from '../../utils/EquipmentSlotUtil';
import { UISettings } from '../../config/UISettings';
import { PartyMemberRegistry } from '../../utils/PartyMemberRegistry';
import type { PanelContent, PanelRegion } from '../../models/combat/managers/panels/PanelContent';
import type { CombatUnit } from '../../models/combat/CombatUnit';
import { CombatAbility } from '../../models/combat/CombatAbility';
import { UnitClass } from '../../models/combat/UnitClass';
import type { HumanoidUnit } from '../../models/combat/HumanoidUnit';

// Canvas dimensions (same as CombatView)
const CANVAS_WIDTH = CombatConstants.CANVAS_WIDTH; // 384 pixels (32 tiles)
const CANVAS_HEIGHT = CombatConstants.CANVAS_HEIGHT; // 216 pixels (18 tiles)

/**
 * Get custom title panel region for inventory view
 * (8px taller and 4px wider than combat layout)
 */
function getInventoryTitlePanelRegion(layoutManager: CombatLayoutManager): PanelRegion {
  const baseRegion = layoutManager.getTurnOrderPanelRegion();
  return {
    x: baseRegion.x,
    y: baseRegion.y,
    width: baseRegion.width + 4, // 4px wider
    height: baseRegion.height + 8, // 8px taller
  };
}

/**
 * Get custom log panel region for inventory view
 * (8px shorter than combat layout, aligned to bottom)
 */
function getInventoryLogPanelRegion(layoutManager: CombatLayoutManager): PanelRegion {
  const baseRegion = layoutManager.getCombatLogPanelRegion();
  return {
    x: baseRegion.x,
    y: baseRegion.y + 8, // Move down 8px (stays aligned to bottom)
    width: baseRegion.width,
    height: baseRegion.height - 8, // 8px shorter
  };
}

/**
 * Get custom main panel bounds for inventory view
 * (8px lower and 4px shorter than combat layout)
 */
function getInventoryMainPanelBounds(layoutManager: CombatLayoutManager, canvasWidth: number, canvasHeight: number): { x: number; y: number; width: number; height: number } {
  const baseViewport = layoutManager.getMapViewport(canvasWidth, canvasHeight);
  return {
    x: baseViewport.x,
    y: baseViewport.y + 8, // Move down 8px
    width: baseViewport.width,
    height: baseViewport.height - 4, // 4px shorter
  };
}

/**
 * Wraps a message into multiple lines if it exceeds the available width.
 * Returns an array of messages that fit within the width constraint.
 *
 * @param message The message to wrap
 * @param maxWidth Maximum width in pixels
 * @param fontId Font ID to use for measurement
 * @returns Array of wrapped message lines
 */
/**
 * Strip color and sprite tags from a message to get the plain text for width measurement
 */
function stripTags(message: string): string {
  return message
    .replace(/\[color=#[0-9a-fA-F]{6}\]/g, '')
    .replace(/\[\/color\]/g, '')
    .replace(/\[sprite:[\w-]+\]/g, 'S'); // Replace sprite tags with single char
}

function wrapMessage(message: string, maxWidth: number, fontId: string): string[] {
  // Strip tags for width measurement
  const plainMessage = stripTags(message);

  // Measure the full message (without tags)
  const fullWidth = FontAtlasRenderer.measureTextByFontId(plainMessage, fontId);

  // If it fits, return as-is
  if (fullWidth <= maxWidth) {
    return [message];
  }

  // Split into words
  const words = message.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine === '' ? word : `${currentLine} ${word}`;
    const testWidth = FontAtlasRenderer.measureTextByFontId(stripTags(testLine), fontId);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      // Word doesn't fit - push current line and start new one
      if (currentLine !== '') {
        lines.push(currentLine);
      }

      // Check if single word is too long
      const wordWidth = FontAtlasRenderer.measureTextByFontId(stripTags(word), fontId);
      if (wordWidth > maxWidth) {
        // Split the word by characters
        let charLine = '';
        for (const char of word) {
          const charTestLine = charLine + char;
          const charTestWidth = FontAtlasRenderer.measureTextByFontId(stripTags(charTestLine), fontId);

          if (charTestWidth <= maxWidth) {
            charLine = charTestLine;
          } else {
            if (charLine !== '') {
              lines.push(charLine);
            }
            charLine = char;
          }
        }
        currentLine = charLine;
      } else {
        currentLine = word;
      }
    }
  }

  // Push remaining line
  if (currentLine !== '') {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [message];
}

/**
 * Empty panel content for when no item is hovered
 */
class EmptyPanelContent implements PanelContent {
  render(
    ctx: CanvasRenderingContext2D,
    region: PanelRegion,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const padding = 4;
    const text = 'Hover over an item';

    FontAtlasRenderer.renderText(
      ctx,
      text,
      Math.round(region.x + padding),
      Math.round(region.y + padding),
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#888888'
    );

    ctx.restore();
  }
}

/**
 * PartyManagementView component
 * Displays the party's inventory with filtering, sorting, pagination, and item details
 */
export const PartyManagementView: React.FC = () => {
  // Load initial state from localStorage
  const [viewState, setViewState] = useState<InventoryViewState>(() =>
    loadInventoryViewStateFromLocalStorage()
  );

  // Track inventory changes (increment to force re-render when inventory data changes)
  const [inventoryVersion, setInventoryVersion] = useState(0);

  // Track debug panel visualization
  const [showDebugPanels, setShowDebugPanels] = useState(false);

  // Track window size for responsive scaling
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Track integer scaling setting
  const [integerScalingEnabled] = useState<boolean>(
    UISettings.isIntegerScalingEnabled()
  );

  // Track manual scale setting
  const [manualScale] = useState<number>(UISettings.getManualScale());

  // Track selected party member index for top info panel
  const [selectedPartyMemberIndex, setSelectedPartyMemberIndex] = useState(0);

  // Track current panel mode ('inventory', 'spend-xp', or 'set-abilities')
  const [panelMode, setPanelMode] = useState<'inventory' | 'spend-xp' | 'set-abilities'>('inventory');

  // Track ability/equipment detail panel state (for swapping bottom panel on hover)
  const detailPanelActiveRef = useRef(false);
  const originalBottomPanelContentRef = useRef<PanelContent | null>(null);

  // Track selected equipment/ability from top panel (for sticky selection on click)
  // item can be null for empty slots
  const selectedEquipmentRef = useRef<{ type: 'ability' | 'equipment'; item: any | null; slotLabel: string | null } | null>(null);

  // Track equipment slot selection version to trigger re-renders
  const [equipmentSlotSelectionVersion, setEquipmentSlotSelectionVersion] = useState(0);

  // Track bottom panel update version to force re-renders
  const [bottomPanelVersion, setBottomPanelVersion] = useState(0);

  // Canvas refs for double buffering
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animation timing
  const lastFrameTimeRef = useRef<number>(performance.now());
  const animationFrameRef = useRef<number | null>(null);

  // Font atlas loader
  const fontLoader = useMemo(() => new FontAtlasLoader(), []);

  // Track if fonts are loaded
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const fontAtlasImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Track if sprites are loaded
  const [spritesLoaded, setSpritesLoaded] = useState(false);
  const spriteImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Inventory renderer
  const renderer = useMemo(() => new InventoryRenderer(), []);

  // Layout manager (reuse CombatLayoutManager for panel regions)
  const layoutManager = useMemo(() => new CombatLayoutManager(), []);

  // Combat log manager (reuse for inventory action messages)
  const combatLogManager = useMemo(() => new CombatLogManager(), []);

  // Helper function to add messages with automatic line wrapping
  const addLogMessage = useCallback((message: string) => {
    const logPanelRegion = getInventoryLogPanelRegion(layoutManager);
    const maxWidth = logPanelRegion.width - 4; // Account for padding
    const wrappedLines = wrapMessage(message, maxWidth, CombatConstants.COMBAT_LOG.FONT_ID);

    // Add each wrapped line as a separate message
    for (const line of wrappedLines) {
      combatLogManager.addMessage(line);
    }
  }, [combatLogManager, layoutManager]);

  // Panel managers for title/bottom info panels and top info panel
  const titlePanelManager = useMemo(() => new InfoPanelManager(), []);
  const bottomPanelManager = useMemo(() => new InfoPanelManager(), []);
  const topInfoPanelManager = useMemo(() => new InfoPanelManager(), []);

  // Spend XP panel content (created when needed)
  const spendXpMainContentRef = useRef<SpendXpMainPanelContent | null>(null);

  // Set Abilities panel content (created when needed)
  const setAbilitiesMainContentRef = useRef<SetAbilitiesMainPanelContent | null>(null);
  const setAbilitiesSlotTypeRef = useRef<'Reaction' | 'Passive' | 'Movement' | null>(null);

  // Cache the selected party member to avoid recreating it every frame
  const selectedMemberRef = useRef<CombatUnit | null>(null);

  // Initialize panel content
  useEffect(() => {
    // Bottom panel: Item details (initially empty)
    bottomPanelManager.setContent(new EmptyPanelContent());
  }, [bottomPanelManager]);

  // Reset bottom panel when exiting spend-xp mode
  useEffect(() => {
    if (panelMode === 'inventory') {
      // Clear the bottom panel when returning to inventory mode
      bottomPanelManager.setContent(new EmptyPanelContent());
    }
  }, [panelMode, bottomPanelManager]);

  // Track party member changes (equipment updates) to trigger re-renders
  const [partyMemberVersion, setPartyMemberVersion] = useState(0);

  // Track current view state for top info panel
  const topInfoPanelViewRef = useRef<'stats' | 'abilities'>('stats');

  // Update top info panel when selected party member changes
  useEffect(() => {
    const partyMemberConfigs = PartyMemberRegistry.getAll();
    if (partyMemberConfigs.length > 0) {
      // Create all party member instances
      const partyMembers: CombatUnit[] = [];
      for (const config of partyMemberConfigs) {
        const member = PartyMemberRegistry.createPartyMember(config.id);
        if (member) {
          partyMembers.push(member);
        }
      }

      if (partyMembers.length > 0) {
        const selectedMember = partyMembers[selectedPartyMemberIndex] || partyMembers[0];

        const content = new PartyManagementUnitInfoContent(
          {
            title: selectedMember.name,
            titleColor: '#00ff00',
            padding: 1,
            lineSpacing: 8,
          },
          selectedMember,
          partyMembers,
          selectedPartyMemberIndex,
          (_member: CombatUnit, index: number) => {
            // Update selected party member
            setSelectedPartyMemberIndex(index);
          }
        );

        // Restore previous view if it was abilities
        if (topInfoPanelViewRef.current === 'abilities') {
          // Toggle to abilities view by simulating the button click
          (content as any).currentView = 'abilities';
        }

        topInfoPanelManager.setContent(content);
      }
    }
  }, [topInfoPanelManager, selectedPartyMemberIndex, partyMemberVersion]);

  // Track canvas display style for integer scaling
  const [canvasDisplayStyle, setCanvasDisplayStyle] = useState<{ width: string; height: string }>({
    width: '100%',
    height: '100%',
  });

  // Calculate and update canvas display dimensions based on integer scaling setting
  useEffect(() => {
    const updateCanvasStyle = () => {
      const containerRef = displayCanvasRef.current?.parentElement;
      if (!containerRef) {
        setCanvasDisplayStyle({ width: '100%', height: '100%' });
        return;
      }

      const scaledDimensions = UISettings.getIntegerScaledDimensions(
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        containerRef.clientWidth,
        containerRef.clientHeight
      );

      if (scaledDimensions) {
        // Integer scaling enabled - use exact pixel dimensions
        setCanvasDisplayStyle({
          width: `${scaledDimensions.width}px`,
          height: `${scaledDimensions.height}px`,
        });
      } else {
        // Integer scaling disabled - use percentage to fill container
        setCanvasDisplayStyle({ width: '100%', height: '100%' });
      }
    };

    // Update immediately
    updateCanvasStyle();

    // Also update on next frame to ensure container is measured
    requestAnimationFrame(updateCanvasStyle);
  }, [windowSize.width, windowSize.height, integerScalingEnabled, manualScale]);

  // Track window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load fonts
  useEffect(() => {
    const loadFonts = async () => {
      try {
        const fontIds = ['7px-04b03', '15px-dungeonslant'];
        for (const fontId of fontIds) {
          const image = await fontLoader.load(fontId);
          fontAtlasImagesRef.current.set(fontId, image);
        }
        setFontsLoaded(true);
      } catch (error) {
        console.error('Failed to load fonts:', error);
      }
    };

    loadFonts();
  }, [fontLoader]);

  // Load sprites (manually load the frames2 sprite sheet for layout dividers)
  useEffect(() => {
    const loadSprites = async () => {
      try {
        const img = new Image();
        img.src = '/spritesheets/atlas.png';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            spriteImagesRef.current.set('/spritesheets/atlas.png', img);
            setSpritesLoaded(true);
            resolve();
          };
          img.onerror = (err) => {
            console.error('Failed to load sprite sheet:', err);
            reject(err);
          };
        });
      } catch (error) {
        console.error('Failed to load sprites:', error);
      }
    };

    loadSprites();
  }, []);

  // Filter and sort items based on current state
  const filteredAndSortedItems = useMemo<InventoryItemWithQuantity[]>(() => {
    const allItems = PartyInventory.getAllItems();

    // Filter by category
    const filtered = allItems.filter((item) => {
      const equipment = Equipment.getById(item.equipmentId);
      if (!equipment) return false;

      if (viewState.category === 'all') {
        return true;
      } else if (viewState.category === 'weapons') {
        return equipment.type === 'OneHandedWeapon' || equipment.type === 'TwoHandedWeapon';
      } else if (viewState.category === 'shields') {
        return equipment.type === 'Shield';
      } else if (viewState.category === 'armor') {
        return equipment.type === 'Head' || equipment.type === 'Body';
      } else if (viewState.category === 'accessories') {
        return equipment.type === 'Accessory';
      } else if (viewState.category === 'held') {
        return equipment.type === 'Held';
      } else if (viewState.category === 'quest-items') {
        return equipment.typeTags?.includes('quest-item') ?? false;
      }

      return false;
    });

    // Convert to InventoryItemWithQuantity
    const itemsWithEquipment: InventoryItemWithQuantity[] = filtered
      .map((item) => {
        const equipment = Equipment.getById(item.equipmentId);
        if (!equipment) return null;
        return {
          equipment,
          quantity: item.quantity,
          equipmentId: item.equipmentId,
        };
      })
      .filter((item): item is InventoryItemWithQuantity => item !== null);

    // Sort items
    itemsWithEquipment.sort((a, b) => {
      if (viewState.sortMode === 'name-asc') {
        return a.equipment.name.localeCompare(b.equipment.name);
      } else if (viewState.sortMode === 'name-desc') {
        return b.equipment.name.localeCompare(a.equipment.name);
      } else if (viewState.sortMode === 'type') {
        return a.equipment.type.localeCompare(b.equipment.type);
      } else if (viewState.sortMode === 'recently-added') {
        // For now, just keep insertion order (no timestamp tracking yet)
        return 0;
      }
      return 0;
    });

    return itemsWithEquipment;
  }, [viewState.category, viewState.sortMode, inventoryVersion]);

  // Calculate pagination
  const mainPanelBounds = useMemo(() => getInventoryMainPanelBounds(layoutManager, CANVAS_WIDTH, CANVAS_HEIGHT), [layoutManager]);
  const itemsPerPage = useMemo(() => renderer.calculateItemsPerPage(mainPanelBounds.height), [renderer, mainPanelBounds.height]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredAndSortedItems.length / itemsPerPage)), [filteredAndSortedItems.length, itemsPerPage]);

  // Paginate items
  const currentPageItems = useMemo(() => {
    const startIndex = viewState.currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedItems.slice(startIndex, endIndex);
  }, [filteredAndSortedItems, viewState.currentPage, itemsPerPage]);

  // Save state to localStorage when it changes
  useEffect(() => {
    saveInventoryViewStateToLocalStorage(viewState);
  }, [viewState]);

  // Update bottom panel when hovered item changes or equipment slot selection changes
  useEffect(() => {
    // Check if an equipment slot is selected
    const selectedSlot = selectedEquipmentRef.current;
    const isEquipmentSlotSelected = selectedSlot &&
                                    selectedSlot.type === 'equipment' &&
                                    selectedSlot.slotLabel &&
                                    isEquipmentSlot(selectedSlot.slotLabel);

    // If equipment slot is selected, always show comparison panel
    if (isEquipmentSlotSelected && selectedSlot.slotLabel) {
      const currentEquipment = selectedSlot.item; // Can be null for empty slot

      // Get hovered equipment if any
      let hoveredEquipment: Equipment | null = null;
      if (viewState.hoveredItemId) {
        const equipment = Equipment.getById(viewState.hoveredItemId);
        if (equipment && isEquipmentCompatibleWithSlot(equipment, selectedSlot.slotLabel)) {
          hoveredEquipment = equipment;
        }
      }

      // Show comparison panel (with "??" if no hovered item)
      bottomPanelManager.setContent(new EquipmentComparisonContent(currentEquipment, hoveredEquipment));
    } else if (viewState.hoveredItemId) {
      // No equipment slot selected - show regular equipment info
      const hoveredEquipment = Equipment.getById(viewState.hoveredItemId);
      if (hoveredEquipment) {
        bottomPanelManager.setContent(new EquipmentInfoContent(hoveredEquipment));
      }
    } else {
      // No slot selected and no item hovered
      bottomPanelManager.setContent(new EmptyPanelContent());
    }

    // Trigger a re-render by updating version
    setBottomPanelVersion(v => v + 1);
  }, [viewState.hoveredItemId, bottomPanelManager, equipmentSlotSelectionVersion]);

  // Update top panel stats when inventory changes (simplified - just on render)
  useEffect(() => {
    const stats: InventoryStats = {
      totalItems: PartyInventory.getTotalItemCount(),
      uniqueItems: PartyInventory.getTotalUniqueItems(),
      gold: PartyInventory.getGold(),
    };
    titlePanelManager.setContent(
      new InventoryTopPanelContent(stats, viewState.category, viewState.hoveredCategory, viewState.sortMode, viewState.hoveredSort)
    );
  }, [filteredAndSortedItems, titlePanelManager, viewState.category, viewState.hoveredCategory, viewState.sortMode, viewState.hoveredSort]);

  // Render frame
  const renderFrame = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas || !fontsLoaded || !spritesLoaded) return;

    // Initialize buffer canvas if needed
    if (!bufferCanvasRef.current) {
      bufferCanvasRef.current = document.createElement('canvas');
      bufferCanvasRef.current.width = CANVAS_WIDTH;
      bufferCanvasRef.current.height = CANVAS_HEIGHT;
    }

    const bufferCanvas = bufferCanvasRef.current;
    const bufferCtx = bufferCanvas.getContext('2d');
    if (!bufferCtx) return;

    // Clear buffer
    bufferCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    bufferCtx.imageSmoothingEnabled = false;

    // Fill background
    bufferCtx.fillStyle = '#000000';
    bufferCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Get font atlas
    const fontAtlas = fontAtlasImagesRef.current.get(CombatConstants.INVENTORY_VIEW.MAIN_PANEL.CATEGORY_TABS.FONT_ID);
    if (!fontAtlas) return;

    // Calculate disabled items (when equipment slot is selected, incompatible items are disabled)
    let disabledItemIds: Set<string> | undefined;
    let classRestrictedItemIds: Set<string> | undefined;
    const selectedSlot = selectedEquipmentRef.current;
    if (selectedSlot && selectedSlot.type === 'equipment' && selectedSlot.slotLabel && isEquipmentSlot(selectedSlot.slotLabel)) {
      disabledItemIds = new Set<string>();
      classRestrictedItemIds = new Set<string>();

      // Get current party member to check class restrictions
      const partyMemberConfigs = PartyMemberRegistry.getAll();
      const selectedMember = partyMemberConfigs[selectedPartyMemberIndex];
      const currentUnit = selectedMember ? PartyMemberRegistry.createPartyMember(selectedMember.id) : null;

      // Mark all incompatible items as disabled or class-restricted
      for (const item of currentPageItems) {
        // Check slot type compatibility first
        if (!isEquipmentCompatibleWithSlot(item.equipment, selectedSlot.slotLabel)) {
          disabledItemIds.add(item.equipmentId);
        }
        // Check class restrictions (only for slot-compatible items)
        else if (currentUnit && 'unitClass' in currentUnit) {
          const humanoid = currentUnit as any;
          if (!item.equipment.canBeEquippedBy(humanoid.unitClass)) {
            classRestrictedItemIds.add(item.equipmentId);
          }
        }
      }
    }

    // Check if we're in debug log-only mode
    const isDebugLogOnly = (window as any).isDebugLogOnly?.() || false;

    // Get panel regions (needed for both rendering and debug visualization)
    const titlePanelRegion = getInventoryTitlePanelRegion(layoutManager);
    const bottomPanelRegion = layoutManager.getBottomInfoPanelRegion();
    const logPanelRegion = isDebugLogOnly
      ? { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT }
      : getInventoryLogPanelRegion(layoutManager);

    if (!isDebugLogOnly) {
      // Check if we're in spend-xp mode
      if (panelMode === 'spend-xp') {
        // Get current party member - only create if not cached or if selected index changed
        const partyMemberConfigs = PartyMemberRegistry.getAll();
        const selectedMemberConfig = partyMemberConfigs[selectedPartyMemberIndex];

        // Check if we need to create a new member instance
        if (!selectedMemberRef.current ||
            !selectedMemberConfig ||
            selectedMemberRef.current.name !== selectedMemberConfig.name) {
          if (selectedMemberConfig) {
            const newMember = PartyMemberRegistry.createPartyMember(selectedMemberConfig.id);
            selectedMemberRef.current = newMember ?? null;
          } else {
            selectedMemberRef.current = null;
          }
          // Clear spend-xp content to force recreation with new member
          spendXpMainContentRef.current = null;
        }

        const selectedMember = selectedMemberRef.current;

        if (selectedMember) {
          // Create spend-xp main content only if not already created
          if (!spendXpMainContentRef.current) {
            spendXpMainContentRef.current = new SpendXpMainPanelContent(selectedMember);

            // Set initial bottom panel to show the selected class info
            const selectedClassId = spendXpMainContentRef.current.getSelectedClassId();
            const selectedClass = UnitClass.getById(selectedClassId);
            if (selectedClass) {
              bottomPanelManager.setContent(new ClassInfoContent(selectedClass, selectedMember));
              // Add class description to combat log with orange class name
              addLogMessage(`[color=#ff8c00]${selectedClass.name}[/color] - ${selectedClass.description}`);
            }
          }

          // Render spend-xp title panel
          const spendXpTitleContent = new SpendXpTitlePanelContent();
          spendXpTitleContent.render(
            bufferCtx,
            titlePanelRegion,
            CombatConstants.INVENTORY_VIEW.TOP_INFO.FONT_ID,
            fontAtlas,
            spriteImagesRef.current,
            CombatConstants.SPRITE_SIZE,
            fontAtlasImagesRef.current
          );

          // Render spend-xp main panel
          spendXpMainContentRef.current.render(
            bufferCtx,
            mainPanelBounds,
            CombatConstants.INVENTORY_VIEW.MAIN_PANEL.CATEGORY_TABS.FONT_ID,
            fontAtlas,
            spriteImagesRef.current,
            CombatConstants.SPRITE_SIZE
          );
        }

        // Render top info panel (party member stats - still shown)
        const topInfoPanelRegion = layoutManager.getTopInfoPanelRegion();
        topInfoPanelManager.render(
          bufferCtx,
          topInfoPanelRegion,
          CombatConstants.FONTS.UI_FONT_ID,
          fontAtlas,
          spriteImagesRef.current,
          CombatConstants.SPRITE_SIZE
        );

        // Render bottom info panel (item details - still shown)
        bottomPanelManager.render(
          bufferCtx,
          bottomPanelRegion,
          CombatConstants.INVENTORY_VIEW.BOTTOM_INFO.FONT_ID,
          fontAtlas
        );
      } else if (panelMode === 'set-abilities') {
        // Get current party member - only create if not cached or if selected index changed
        const partyMemberConfigs = PartyMemberRegistry.getAll();
        const selectedMemberConfig = partyMemberConfigs[selectedPartyMemberIndex];

        // Check if we need to create a new member instance
        if (!selectedMemberRef.current ||
            !selectedMemberConfig ||
            selectedMemberRef.current.name !== selectedMemberConfig.name) {
          if (selectedMemberConfig) {
            const newMember = PartyMemberRegistry.createPartyMember(selectedMemberConfig.id);
            selectedMemberRef.current = newMember ?? null;
          } else {
            selectedMemberRef.current = null;
          }
          // Clear set-abilities content to force recreation with new member
          setAbilitiesMainContentRef.current = null;
        }

        const selectedMember = selectedMemberRef.current;
        const slotType = setAbilitiesSlotTypeRef.current;

        if (selectedMember && slotType) {
          // Create set-abilities main content only if not already created
          if (!setAbilitiesMainContentRef.current) {
            setAbilitiesMainContentRef.current = new SetAbilitiesMainPanelContent(selectedMember, slotType);
          }

          // Render set-abilities title panel
          const setAbilitiesTitleContent = new SetAbilitiesTitlePanelContent();
          setAbilitiesTitleContent.render(
            bufferCtx,
            titlePanelRegion,
            CombatConstants.INVENTORY_VIEW.TOP_INFO.FONT_ID,
            fontAtlas,
            spriteImagesRef.current,
            CombatConstants.SPRITE_SIZE,
            fontAtlasImagesRef.current
          );

          // Render set-abilities main panel
          setAbilitiesMainContentRef.current.render(
            bufferCtx,
            mainPanelBounds,
            CombatConstants.INVENTORY_VIEW.MAIN_PANEL.CATEGORY_TABS.FONT_ID,
            fontAtlas,
            spriteImagesRef.current,
            CombatConstants.SPRITE_SIZE
          );
        }

        // Render top info panel (party member stats - still shown)
        const topInfoPanelRegion = layoutManager.getTopInfoPanelRegion();
        topInfoPanelManager.render(
          bufferCtx,
          topInfoPanelRegion,
          CombatConstants.FONTS.UI_FONT_ID,
          fontAtlas,
          spriteImagesRef.current,
          CombatConstants.SPRITE_SIZE
        );

        // Render bottom info panel (ability details)
        bottomPanelManager.render(
          bufferCtx,
          bottomPanelRegion,
          CombatConstants.INVENTORY_VIEW.BOTTOM_INFO.FONT_ID,
          fontAtlas
        );
      } else {
        // Render inventory mode panels
        // Render main panel (inventory grid)
        renderer.render(
          bufferCtx,
          viewState,
          currentPageItems,
          totalPages,
          mainPanelBounds,
          fontAtlas,
          disabledItemIds,
          classRestrictedItemIds
        );

        // Render title panel (inventory stats, category tabs, and sort options)
        titlePanelManager.render(
          bufferCtx,
          titlePanelRegion,
          CombatConstants.INVENTORY_VIEW.TOP_INFO.FONT_ID,
          fontAtlas
        );

        // Render top info panel (party member stats)
        const topInfoPanelRegion = layoutManager.getTopInfoPanelRegion();
        topInfoPanelManager.render(
          bufferCtx,
          topInfoPanelRegion,
          CombatConstants.FONTS.UI_FONT_ID,
          fontAtlas,
          spriteImagesRef.current,
          CombatConstants.SPRITE_SIZE
        );

        // Render bottom info panel (item details)
        bottomPanelManager.render(
          bufferCtx,
          bottomPanelRegion,
          CombatConstants.INVENTORY_VIEW.BOTTOM_INFO.FONT_ID,
          fontAtlas
        );
      }
    }

    // Skip rendering other panels if in debug log-only mode
    if (isDebugLogOnly) {
      // Copy buffer to display
      if (displayCanvas) {
        const displayCtx = displayCanvas.getContext('2d');
        if (displayCtx) {
          displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
          displayCtx.drawImage(bufferCanvas, 0, 0);
        }
      }
      return;
    }

    // Render layout dividers (HorizontalVerticalLayout overlay)
    // Note: Don't pass panel managers here - we render them manually above
    // to avoid duplicate rendering with default "Active Unit" / "Unit Info" titles
    layoutManager.renderLayout({
      ctx: bufferCtx,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      spriteSize: CombatConstants.SPRITE_SIZE,
      fontId: CombatConstants.INVENTORY_VIEW.MAIN_PANEL.CATEGORY_TABS.FONT_ID,
      fontAtlasImage: fontAtlas,
      topPanelFontAtlasImage: fontAtlas,
      topPanelSmallFontAtlasImage: fontAtlas,
      spriteImages: spriteImagesRef.current,
      currentUnit: null,
      currentUnitPosition: undefined,
      targetUnit: null,
      targetUnitPosition: undefined,
      partyUnits: [],
      isDeploymentPhase: false,
      isEnemyDeploymentPhase: false,
      hoveredPartyMemberIndex: null,
      deployedUnitCount: 0,
      totalDeploymentZones: 0,
      onEnterCombat: () => {},
      combatLogManager,
      // Don't pass panel managers - we render them manually to avoid default titles
      currentUnitPanelManager: undefined,
      targetUnitPanelManager: undefined,
      activeAction: null,
    });

    // Debug: Render panel boundaries if enabled
    if (showDebugPanels) {
      const topInfoPanelRegion = layoutManager.getTopInfoPanelRegion();
      const panels = [
        { name: 'Title Panel (Inventory UI)', region: titlePanelRegion, color: 'rgba(255, 0, 0, 0.3)' },
        { name: 'Top Info Panel (unused)', region: topInfoPanelRegion, color: 'rgba(128, 128, 128, 0.2)' },
        { name: 'Main Panel', region: mainPanelBounds, color: 'rgba(0, 0, 255, 0.3)' },
        { name: 'Log Panel', region: logPanelRegion, color: 'rgba(255, 255, 0, 0.3)' },
        { name: 'Bottom Info Panel', region: bottomPanelRegion, color: 'rgba(255, 0, 255, 0.3)' },
      ];

      for (const panel of panels) {
        // Draw semi-transparent rectangle
        bufferCtx.fillStyle = panel.color;
        bufferCtx.fillRect(panel.region.x, panel.region.y, panel.region.width, panel.region.height);

        // Draw border
        bufferCtx.strokeStyle = panel.color.replace('0.3', '0.8');
        bufferCtx.lineWidth = 1;
        bufferCtx.strokeRect(panel.region.x, panel.region.y, panel.region.width, panel.region.height);

        // Draw label
        if (fontAtlas) {
          FontAtlasRenderer.renderText(
            bufferCtx,
            panel.name,
            Math.round(panel.region.x + 2),
            Math.round(panel.region.y + 2),
            CombatConstants.INVENTORY_VIEW.MAIN_PANEL.CATEGORY_TABS.FONT_ID,
            fontAtlas,
            1,
            'left',
            '#ffffff'
          );
        }
      }
    }

    // Copy buffer to display canvas
    const displayCtx = displayCanvas.getContext('2d');
    if (displayCtx) {
      displayCtx.imageSmoothingEnabled = false;
      displayCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      displayCtx.drawImage(bufferCanvas, 0, 0);
    }
  }, [
    fontsLoaded,
    spritesLoaded,
    viewState,
    currentPageItems,
    totalPages,
    mainPanelBounds,
    renderer,
    layoutManager,
    titlePanelManager,
    topInfoPanelManager,
    bottomPanelManager,
    combatLogManager,
    showDebugPanels,
    selectedPartyMemberIndex,
    bottomPanelVersion,
    panelMode,
  ]);

  // Expose developer mode functions to window (for testing)
  useEffect(() => {
    // Get all equipment IDs from Equipment registry
    const getAllEquipmentIds = (): string[] => {
      const allEquipment = Equipment.getAll();
      return allEquipment.map(eq => eq.id);
    };

    (window as any).giveItem = (equipmentId?: string, quantity: number = 1) => {
      let itemId = equipmentId;
      if (!itemId) {
        const allIds = getAllEquipmentIds();
        if (allIds.length === 0) {
          console.warn('[DEV] No equipment found in registry');
          return;
        }
        itemId = allIds[Math.floor(Math.random() * allIds.length)];
      }
      const equipment = Equipment.getById(itemId);
      if (!equipment) {
        console.error(`[DEV] Equipment not found: ${itemId}`);
        return;
      }
      const success = PartyInventory.addItem(itemId, quantity);
      if (success) {
        console.log(`[DEV] Added ${quantity}x ${equipment.name} (${itemId}) to inventory`);
        setInventoryVersion(v => v + 1);
      } else {
        console.error(`[DEV] Failed to add ${equipment.name} to inventory`);
      }
    };

    (window as any).giveGold = (amount: number = 100) => {
      PartyInventory.addGold(amount);
      console.log(`[DEV] Added ${amount} gold to party inventory`);
      setInventoryVersion(v => v + 1);
    };

    (window as any).clearInventory = () => {
      PartyInventory.clear();
      console.log('[DEV] Cleared party inventory');
      setInventoryVersion(v => v + 1);
    };

    (window as any).listEquipment = () => {
      const allEquipment = Equipment.getAll();
      console.log('[DEV] Available equipment:');
      allEquipment.forEach(eq => {
        console.log(`  - ${eq.id}: ${eq.name} (${eq.type})`);
      });
      console.log(`Total: ${allEquipment.length} items`);
    };

    (window as any).showInventoryPanels = (show: boolean = true) => {
      setShowDebugPanels(show);
      console.log(`[DEV] Debug panel visualization: ${show ? 'enabled' : 'disabled'}`);
      console.log('[DEV] Panel colors:');
      console.log('  - Title Panel: Red');
      console.log('  - Top Info Panel: Green');
      console.log('  - Main Panel: Blue');
      console.log('  - Log Panel: Yellow');
      console.log('  - Bottom Info Panel: Magenta');
    };

    (window as any).addLogMessage = (message?: string) => {
      const msg = message || `Test message ${Date.now()}`;
      addLogMessage(msg);
      console.log(`[DEV] Added log message: ${msg}`);
      // No need to call renderFrame() - animation loop handles it
    };

    let debugLogOnly = false;
    (window as any).showOnlyLog = () => {
      debugLogOnly = true;
      console.log('[DEV] Showing only log panel (full screen)');
      renderFrame();
    };

    (window as any).restoreLayout = () => {
      debugLogOnly = false;
      console.log('[DEV] Restored normal layout');
      renderFrame();
    };

    (window as any).isDebugLogOnly = () => debugLogOnly;

    return () => {
      delete (window as any).giveItem;
      delete (window as any).giveGold;
      delete (window as any).clearInventory;
      delete (window as any).listEquipment;
      delete (window as any).showInventoryPanels;
      delete (window as any).addLogMessage;
      delete (window as any).showOnlyLog;
      delete (window as any).restoreLayout;
    };
  }, [addLogMessage, setInventoryVersion, renderFrame, layoutManager]);

  // Render on state changes
  useEffect(() => {
    // Only render if animation loop isn't running yet
    if (!spritesLoaded || !fontsLoaded) {
      renderFrame();
    }
  }, [renderFrame, spritesLoaded, fontsLoaded]);

  // Animation loop for combat log animations
  useEffect(() => {
    if (!spritesLoaded || !fontsLoaded) return;

    const animate = (currentTime: number) => {
      // Calculate delta time in seconds
      const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = currentTime;

      // Update combat log animations
      combatLogManager.update(deltaTime);

      // Render the frame
      renderFrame();

      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop
    lastFrameTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [spritesLoaded, fontsLoaded, renderFrame, combatLogManager]);

  // Handle mouse move
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = displayCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const canvasX = (event.clientX - rect.left) * scaleX;
      const canvasY = (event.clientY - rect.top) * scaleY;

      let needsRerender = false;

      // If in spend-xp mode, handle hover for class selection
      if (panelMode === 'spend-xp' && spendXpMainContentRef.current) {
        const relativeX = canvasX - mainPanelBounds.x;
        const relativeY = canvasY - mainPanelBounds.y;

        if (relativeX >= 0 && relativeY >= 0 &&
            relativeX < mainPanelBounds.width && relativeY < mainPanelBounds.height) {
          const hoverResult = spendXpMainContentRef.current.handleHover(relativeX, relativeY);
          if (hoverResult) {
            needsRerender = true;
          }
        }
      }

      // If in set-abilities mode, handle hover for ability selection
      if (panelMode === 'set-abilities' && setAbilitiesMainContentRef.current) {
        const relativeX = canvasX - mainPanelBounds.x;
        const relativeY = canvasY - mainPanelBounds.y;

        if (relativeX >= 0 && relativeY >= 0 &&
            relativeX < mainPanelBounds.width && relativeY < mainPanelBounds.height) {
          const hoverResult = setAbilitiesMainContentRef.current.handleHover(relativeX, relativeY);
          if (hoverResult && typeof hoverResult === 'object' && 'type' in hoverResult) {
            // Handle ability hover - show ability details in bottom panel
            if (hoverResult.type === 'ability-hover' && 'abilityIndex' in hoverResult && selectedMemberRef.current) {
              const ability = setAbilitiesMainContentRef.current.getAbilityByIndex(hoverResult.abilityIndex as number);
              if (ability) {
                // Cache original bottom panel content if not already cached
                if (!detailPanelActiveRef.current && bottomPanelManager.getContent()) {
                  originalBottomPanelContentRef.current = bottomPanelManager.getContent();
                }

                // Show ability details in bottom panel
                bottomPanelManager.setContent(new AbilityInfoContent(ability, selectedMemberRef.current));
                detailPanelActiveRef.current = true;
              }
            } else if (hoverResult.type === 'hover-cleared') {
              // Restore original bottom panel content when hover is cleared
              if (detailPanelActiveRef.current && originalBottomPanelContentRef.current) {
                bottomPanelManager.setContent(originalBottomPanelContentRef.current);
                detailPanelActiveRef.current = false;
                originalBottomPanelContentRef.current = null;
              }
            }
            needsRerender = true;
          }
        }
      }

      // Skip inventory-specific hover logic when in spend-xp or set-abilities mode
      if (panelMode !== 'spend-xp' && panelMode !== 'set-abilities') {
        // Check category tab hover (now in title panel)
        const titlePanelRegion = getInventoryTitlePanelRegion(layoutManager);
        const titlePanelContent = titlePanelManager.getContent();
        let newHoveredCategory: InventoryCategory | null = null;

        if (titlePanelContent instanceof InventoryTopPanelContent) {
          const categoryTabs = titlePanelContent.getCategoryTabBounds(titlePanelRegion);
          for (const tab of categoryTabs) {
            if (
              canvasX >= tab.bounds.x &&
              canvasX <= tab.bounds.x + tab.bounds.width &&
              canvasY >= tab.bounds.y &&
              canvasY <= tab.bounds.y + tab.bounds.height
            ) {
              newHoveredCategory = tab.category;
              break;
            }
          }
        }

        if (newHoveredCategory !== viewState.hoveredCategory) {
          setViewState((prev) => ({ ...prev, hoveredCategory: newHoveredCategory }));
          needsRerender = true;
        }

        // Check sort dropdown hover (now in title panel)
        let sortHovered = false;
        if (titlePanelContent instanceof InventoryTopPanelContent) {
          const sortBounds = titlePanelContent.getSortBounds(titlePanelRegion);
          sortHovered =
            canvasX >= sortBounds.x &&
            canvasX <= sortBounds.x + sortBounds.width &&
            canvasY >= sortBounds.y &&
            canvasY <= sortBounds.y + sortBounds.height;
        }

        if (sortHovered !== viewState.hoveredSort) {
          setViewState((prev) => ({ ...prev, hoveredSort: sortHovered }));
          needsRerender = true;
        }

        // Check item hover
        // Filter by slot compatibility if an equipment slot is selected
        const selectedSlot = selectedEquipmentRef.current;
        const isEquipmentSlotSelected = selectedSlot &&
                                        selectedSlot.type === 'equipment' &&
                                        selectedSlot.slotLabel &&
                                        isEquipmentSlot(selectedSlot.slotLabel);

        const itemRows = renderer.getItemRowBounds(currentPageItems, mainPanelBounds);
        let newHoveredItemId: string | null = null;
        for (const row of itemRows) {
          if (
            canvasX >= row.bounds.x &&
            canvasX <= row.bounds.x + row.bounds.width &&
            canvasY >= row.bounds.y &&
            canvasY <= row.bounds.y + row.bounds.height
          ) {
            // If equipment slot is selected, only allow hovering compatible items
            if (isEquipmentSlotSelected) {
              const equipment = Equipment.getById(row.equipmentId);
              if (equipment && selectedSlot.slotLabel && isEquipmentCompatibleWithSlot(equipment, selectedSlot.slotLabel)) {
                newHoveredItemId = row.equipmentId;
              }
              // Otherwise, don't set hovered item (incompatible item)
            } else {
              // No filter - allow hovering all items
              newHoveredItemId = row.equipmentId;
            }
            break;
          }
        }

        if (newHoveredItemId !== viewState.hoveredItemId) {
          setViewState((prev) => ({ ...prev, hoveredItemId: newHoveredItemId }));
          needsRerender = true;
        }
      }

      // Check if hovering over top info panel (party member stats)
      const topInfoPanelRegion = layoutManager.getTopInfoPanelRegion();
      const topInfoHoverResult = topInfoPanelManager.handleHover(
        canvasX,
        canvasY,
        topInfoPanelRegion
      );
      if (topInfoHoverResult) {
        needsRerender = true;
      }

      // Handle ability/equipment detail panel swapping (similar to CombatView)
      // Skip hover changes if equipment/ability is selected (clicked)
      // Skip this logic entirely in spend-xp or set-abilities mode (bottom panel managed differently)
      if (!selectedEquipmentRef.current && panelMode !== 'spend-xp' && panelMode !== 'set-abilities') {
        if (canvasX >= topInfoPanelRegion.x && canvasX < topInfoPanelRegion.x + topInfoPanelRegion.width &&
            canvasY >= topInfoPanelRegion.y && canvasY < topInfoPanelRegion.y + topInfoPanelRegion.height) {

          // Check if hover result is detail info or empty slot
          if (topInfoHoverResult && typeof topInfoHoverResult === 'object' && 'type' in topInfoHoverResult) {
            if ('item' in topInfoHoverResult) {
              // Hovering over ability or equipment with item
              if (topInfoHoverResult.type === 'ability-detail') {
                // Cache original bottom panel content if not already cached
                if (!detailPanelActiveRef.current && bottomPanelManager.getContent()) {
                  originalBottomPanelContentRef.current = bottomPanelManager.getContent();
                }

                // Show ability details in bottom panel
                if (selectedMemberRef.current) {
                  bottomPanelManager.setContent(new AbilityInfoContent(topInfoHoverResult.item as any, selectedMemberRef.current));
                  detailPanelActiveRef.current = true;
                  needsRerender = true;
                }
              } else if (topInfoHoverResult.type === 'equipment-detail') {
                // Cache original bottom panel content if not already cached
                if (!detailPanelActiveRef.current && bottomPanelManager.getContent()) {
                  originalBottomPanelContentRef.current = bottomPanelManager.getContent();
                }

                // Show equipment details in bottom panel
                bottomPanelManager.setContent(new EquipmentInfoContent(topInfoHoverResult.item as any));
                detailPanelActiveRef.current = true;
                needsRerender = true;
              }
            } else if (topInfoHoverResult.type === 'empty-slot-detail' && 'slotLabel' in topInfoHoverResult && 'slotType' in topInfoHoverResult) {
              // Hovering over empty slot
              if (!detailPanelActiveRef.current && bottomPanelManager.getContent()) {
                originalBottomPanelContentRef.current = bottomPanelManager.getContent();
              }

              // Show empty slot info in bottom panel
              bottomPanelManager.setContent(
                new EmptySlotInfoContent(
                  topInfoHoverResult.slotLabel as string,
                  topInfoHoverResult.slotType as 'equipment' | 'ability'
                )
              );
              detailPanelActiveRef.current = true;
              needsRerender = true;
            }
          } else {
            // Not hovering detail item - restore original panel if needed
            if (detailPanelActiveRef.current && originalBottomPanelContentRef.current) {
              bottomPanelManager.setContent(originalBottomPanelContentRef.current);
              detailPanelActiveRef.current = false;
              originalBottomPanelContentRef.current = null;
              needsRerender = true;
            }
          }
        } else {
          // Mouse outside top panel - restore original panel if needed
          if (detailPanelActiveRef.current && originalBottomPanelContentRef.current) {
            bottomPanelManager.setContent(originalBottomPanelContentRef.current);
            detailPanelActiveRef.current = false;
            originalBottomPanelContentRef.current = null;
            needsRerender = true;
          }
        }
      }

      // Check pagination hover
      const paginationBounds = renderer.getPaginationButtonBounds(mainPanelBounds, totalPages);
      let newHoveredPagination: 'prev' | 'next' | null = null;
      if (paginationBounds.prev && canvasX >= paginationBounds.prev.x && canvasX <= paginationBounds.prev.x + paginationBounds.prev.width && canvasY >= paginationBounds.prev.y && canvasY <= paginationBounds.prev.y + paginationBounds.prev.height) {
        newHoveredPagination = 'prev';
      } else if (paginationBounds.next && canvasX >= paginationBounds.next.x && canvasX <= paginationBounds.next.x + paginationBounds.next.width && canvasY >= paginationBounds.next.y && canvasY <= paginationBounds.next.y + paginationBounds.next.height) {
        newHoveredPagination = 'next';
      }

      if (newHoveredPagination !== viewState.hoveredPagination) {
        setViewState((prev) => ({ ...prev, hoveredPagination: newHoveredPagination }));
        needsRerender = true;
      }

      // Check bottom panel hover (comparison panel - Cancel/Remove Item)
      const bottomPanelRegion = layoutManager.getBottomInfoPanelRegion();
      const bottomHoverResult = bottomPanelManager.handleHover(
        canvasX,
        canvasY,
        bottomPanelRegion
      );
      if (bottomHoverResult) {
        needsRerender = true;
      }

      if (needsRerender) {
        renderFrame();
      }
    },
    [viewState, mainPanelBounds, renderer, currentPageItems, totalPages, renderFrame, layoutManager, topInfoPanelManager, bottomPanelManager, panelMode]
  );

  // Handle mouse click
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = displayCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const canvasX = (event.clientX - rect.left) * scaleX;
      const canvasY = (event.clientY - rect.top) * scaleY;

      // If in spend-xp mode, handle click for class selection
      if (panelMode === 'spend-xp' && spendXpMainContentRef.current) {
        const relativeX = canvasX - mainPanelBounds.x;
        const relativeY = canvasY - mainPanelBounds.y;

        if (relativeX >= 0 && relativeY >= 0 &&
            relativeX < mainPanelBounds.width && relativeY < mainPanelBounds.height) {
          const clickResult = spendXpMainContentRef.current.handleClick(relativeX, relativeY);
          if (clickResult && clickResult.type === 'class-selected') {
            // Class was selected - show class info in bottom panel (no caching in spend-xp mode)
            const unitClass = UnitClass.getById(clickResult.classId);
            if (unitClass && selectedMemberRef.current) {
              bottomPanelManager.setContent(new ClassInfoContent(unitClass, selectedMemberRef.current));
              // Add class description to combat log with orange class name
              addLogMessage(`[color=#ff8c00]${unitClass.name}[/color] - ${unitClass.description}`);
            }
            renderFrame();
            return;
          } else if (clickResult && clickResult.type === 'ability-selected') {
            // Ability was clicked - show details in bottom panel (no caching in spend-xp mode)
            const ability = CombatAbility.getById(clickResult.abilityId);
            if (ability && selectedMemberRef.current) {
              bottomPanelManager.setContent(new AbilityInfoContent(ability, selectedMemberRef.current));
              renderFrame();
            }
            return;
          }
        }
      }

      // Skip inventory-specific click logic when in spend-xp mode
      if (panelMode === 'spend-xp') {
        // Still allow top info panel clicks (for party member selection and view toggle)
        const topInfoPanelRegion = layoutManager.getTopInfoPanelRegion();
        const topInfoClickResult = topInfoPanelManager.handleClick(
          canvasX,
          canvasY,
          topInfoPanelRegion
        );
        if (topInfoClickResult) {
          // Handle view toggle and party member selection (same as inventory mode)
          if (topInfoClickResult.type === 'view-toggled' && 'view' in topInfoClickResult) {
            topInfoPanelViewRef.current = topInfoClickResult.view as 'stats' | 'abilities';
            if (panelMode === 'spend-xp' && topInfoClickResult.view === 'abilities') {
              setPanelMode('inventory');
            }
            renderFrame();
            return;
          }

          if (topInfoClickResult.type === 'party-member' && 'index' in topInfoClickResult) {
            // Clear the spend-xp content to force recreation with new unit
            selectedMemberRef.current = null;
            spendXpMainContentRef.current = null;
            renderFrame();
            return;
          }
        }

        // Check bottom panel click in spend-xp mode (for ClassInfoContent and AbilityInfoContent menu options)
        const bottomPanelRegion = layoutManager.getBottomInfoPanelRegion();
        const bottomClickResult = bottomPanelManager.handleClick(
          canvasX,
          canvasY,
          bottomPanelRegion
        );
        if (bottomClickResult) {
          // Handle set-primary-class
          if (bottomClickResult.type === 'set-primary-class' && 'classId' in bottomClickResult) {
            addLogMessage(`Set primary class: Coming Soon`);
            renderFrame();
            return;
          }

          // Handle set-secondary-class
          if (bottomClickResult.type === 'set-secondary-class' && 'classId' in bottomClickResult) {
            addLogMessage(`Set secondary class: Coming Soon`);
            renderFrame();
            return;
          }

          // Handle cancel-ability-view
          if (bottomClickResult.type === 'cancel-ability-view') {
            if (selectedMemberRef.current && spendXpMainContentRef.current) {
              const selectedClassId = spendXpMainContentRef.current.getSelectedClassId();
              const selectedClass = UnitClass.getById(selectedClassId);
              if (selectedClass) {
                bottomPanelManager.setContent(new ClassInfoContent(selectedClass, selectedMemberRef.current));
                renderFrame();
              }
            }
            return;
          }

          // Handle learn-ability
          if (bottomClickResult.type === 'learn-ability' && 'abilityId' in bottomClickResult) {
            if (selectedMemberRef.current && spendXpMainContentRef.current) {
              const selectedClassId = spendXpMainContentRef.current.getSelectedClassId();
              const selectedClass = UnitClass.getById(selectedClassId);
              const ability = CombatAbility.getById(bottomClickResult.abilityId);

              if (selectedClass && ability) {
                // Cast to HumanoidUnit to access learnAbility method
                const humanoid = selectedMemberRef.current as HumanoidUnit;
                const success = humanoid.learnAbility(ability, selectedClass);

                if (success) {
                  addLogMessage(`Learned ${ability.name}!`);
                  // Refresh the bottom panel to show "Learned!" status
                  bottomPanelManager.setContent(new AbilityInfoContent(ability, selectedMemberRef.current));

                  // Update party member definition in registry
                  const partyMemberConfigs = PartyMemberRegistry.getAll();
                  const selectedMemberConfig = partyMemberConfigs[selectedPartyMemberIndex];
                  if (selectedMemberConfig) {
                    PartyMemberRegistry.updateFromUnit(selectedMemberConfig.id, humanoid);
                  }

                  // Trigger re-render of top info panel (to update XP display) and main panel (to update XP spent)
                  setPartyMemberVersion(v => v + 1);
                } else {
                  // Check if not enough XP
                  const unspentXp = humanoid.getUnspentClassExperience(selectedClass);
                  if (unspentXp < ability.experiencePrice) {
                    addLogMessage(`Not enough XP! Need ${ability.experiencePrice} XP, have ${unspentXp} XP.`);
                  } else {
                    addLogMessage(`Cannot learn ${ability.name}.`);
                  }
                }
                renderFrame();
              }
            }
            return;
          }
        }

        return; // Don't process other clicks in spend-xp mode
      }

      // If in set-abilities mode, handle click for ability selection
      if (panelMode === 'set-abilities' && setAbilitiesMainContentRef.current) {
        const relativeX = canvasX - mainPanelBounds.x;
        const relativeY = canvasY - mainPanelBounds.y;

        if (relativeX >= 0 && relativeY >= 0 &&
            relativeX < mainPanelBounds.width && relativeY < mainPanelBounds.height) {
          const clickResult = setAbilitiesMainContentRef.current.handleClick(relativeX, relativeY);
          if (clickResult && clickResult.type === 'ability-selected') {
            // Get the ability and slot type
            const ability = CombatAbility.getById(clickResult.abilityId);
            const slotType = setAbilitiesSlotTypeRef.current;

            if (ability && slotType && selectedMemberRef.current) {
              // Cast to HumanoidUnit to access ability slot assignment methods
              const humanoid = selectedMemberRef.current as HumanoidUnit;

              // Update the appropriate ability slot on the unit
              let success = false;
              if (slotType === 'Reaction') {
                success = humanoid.assignReactionAbility(ability);
              } else if (slotType === 'Passive') {
                success = humanoid.assignPassiveAbility(ability);
              } else if (slotType === 'Movement') {
                success = humanoid.assignMovementAbility(ability);
              }

              if (success) {
                // Update party member definition in registry to persist the change
                const partyMemberConfigs = PartyMemberRegistry.getAll();
                const selectedMemberConfig = partyMemberConfigs[selectedPartyMemberIndex];
                if (selectedMemberConfig) {
                  PartyMemberRegistry.updateFromUnit(selectedMemberConfig.id, humanoid);
                }

                // Show confirmation message
                addLogMessage(`Set ${slotType} ability to ${ability.name}`);

                // Clear the selected slot highlight in top info panel
                const topContent = topInfoPanelManager.getContent();
                if (topContent && 'setSelectedEquipmentSlot' in topContent && typeof (topContent as any).setSelectedEquipmentSlot === 'function') {
                  (topContent as any).setSelectedEquipmentSlot(null);
                }

                // Return to inventory mode
                setPanelMode('inventory');

                // Trigger re-render of top info panel to show updated ability slot
                setPartyMemberVersion(v => v + 1);
                renderFrame();
              } else {
                addLogMessage(`Cannot assign ${ability.name} - not learned or wrong type`);
                renderFrame();
              }
            }
            return;
          }
        }
      }

      // Skip inventory-specific click logic when in set-abilities mode
      if (panelMode === 'set-abilities') {
        // Still allow top info panel clicks (for party member selection and view toggle)
        const topInfoPanelRegion = layoutManager.getTopInfoPanelRegion();
        const topInfoClickResult = topInfoPanelManager.handleClick(
          canvasX,
          canvasY,
          topInfoPanelRegion
        );
        if (topInfoClickResult) {
          // Handle view toggle and party member selection (same as inventory mode)
          if (topInfoClickResult.type === 'view-toggled' && 'view' in topInfoClickResult) {
            topInfoPanelViewRef.current = topInfoClickResult.view as 'stats' | 'abilities';
            if (panelMode === 'set-abilities' && topInfoClickResult.view === 'stats') {
              // Clear the selected slot highlight when returning to inventory mode
              const topContent = topInfoPanelManager.getContent();
              if (topContent && 'setSelectedEquipmentSlot' in topContent && typeof (topContent as any).setSelectedEquipmentSlot === 'function') {
                (topContent as any).setSelectedEquipmentSlot(null);
              }
              setPanelMode('inventory');
            }
            renderFrame();
            return;
          }

          if (topInfoClickResult.type === 'party-member' && 'index' in topInfoClickResult) {
            // Clear the set-abilities content to force recreation with new unit
            selectedMemberRef.current = null;
            setAbilitiesMainContentRef.current = null;
            renderFrame();
            return;
          }

          // Handle ability slot clicked (to switch to a different slot while in set-abilities mode)
          if (topInfoClickResult.type === 'ability-slot-clicked' && 'slotType' in topInfoClickResult) {
            const newSlotType = topInfoClickResult.slotType as 'Reaction' | 'Passive' | 'Movement';

            // Only update if switching to a different slot
            if (newSlotType !== setAbilitiesSlotTypeRef.current) {
              setAbilitiesSlotTypeRef.current = newSlotType;
              setAbilitiesMainContentRef.current = null; // Clear to force recreation with new slot type

              // Update the selected ability slot highlight in the top info panel
              const topContent = topInfoPanelManager.getContent();
              if (topContent && 'setSelectedEquipmentSlot' in topContent && typeof (topContent as any).setSelectedEquipmentSlot === 'function') {
                (topContent as any).setSelectedEquipmentSlot(newSlotType);
              }

              addLogMessage(`Select a ${newSlotType} ability`);
              renderFrame();
            }
            return;
          }
        }

        // Check if clicking on equipment slot in abilities view - if so, switch back to inventory mode
        const relativeX = canvasX - topInfoPanelRegion.x;
        const relativeY = canvasY - topInfoPanelRegion.y;
        const topContent = topInfoPanelManager.getContent();
        if (topContent && 'handleHover' in topContent && typeof topContent.handleHover === 'function') {
          const hoverResult = topContent.handleHover(relativeX, relativeY);

          if (hoverResult && typeof hoverResult === 'object' && 'type' in hoverResult) {
            if ('item' in hoverResult && hoverResult.type === 'equipment-detail') {
              // Equipment slot clicked - switch to inventory mode
              const slotLabel = (topContent as any).hoveredStatId as string | null;

              // Clear the ability slot highlight
              if ('setSelectedEquipmentSlot' in topContent && typeof (topContent as any).setSelectedEquipmentSlot === 'function') {
                (topContent as any).setSelectedEquipmentSlot(slotLabel);
              }

              // Set as selected equipment
              selectedEquipmentRef.current = {
                type: 'equipment',
                item: hoverResult.item,
                slotLabel: slotLabel
              };

              // Return to inventory mode
              setPanelMode('inventory');

              // Set detail panel active and increment version to trigger re-render
              detailPanelActiveRef.current = true;
              setEquipmentSlotSelectionVersion(v => v + 1);

              return;
            }
          }
        }

        return; // Don't process other clicks in set-abilities mode
      }

      // Check category tab click (now in title panel)
      const titlePanelRegion = getInventoryTitlePanelRegion(layoutManager);
      const titlePanelContent = titlePanelManager.getContent();

      if (titlePanelContent instanceof InventoryTopPanelContent) {
        const categoryTabs = titlePanelContent.getCategoryTabBounds(titlePanelRegion);
        for (const tab of categoryTabs) {
          if (
            canvasX >= tab.bounds.x &&
            canvasX <= tab.bounds.x + tab.bounds.width &&
            canvasY >= tab.bounds.y &&
            canvasY <= tab.bounds.y + tab.bounds.height
          ) {
            setViewState((prev) => ({ ...prev, category: tab.category, currentPage: 0 }));
            renderFrame();
            return;
          }
        }
      }

      // Check sort dropdown click (now in title panel)
      if (titlePanelContent instanceof InventoryTopPanelContent) {
        const sortBounds = titlePanelContent.getSortBounds(titlePanelRegion);
        if (
          canvasX >= sortBounds.x &&
          canvasX <= sortBounds.x + sortBounds.width &&
          canvasY >= sortBounds.y &&
          canvasY <= sortBounds.y + sortBounds.height
        ) {
          const sortModes: InventorySortMode[] = ['name-asc', 'name-desc', 'type', 'recently-added'];
          const currentIndex = sortModes.indexOf(viewState.sortMode);
          const nextIndex = (currentIndex + 1) % sortModes.length;
          setViewState((prev) => ({ ...prev, sortMode: sortModes[nextIndex] }));
          renderFrame();
          return;
        }
      }

      // Check top info panel click (party member stats - for toggling views or showing details)
      const topInfoPanelRegion = layoutManager.getTopInfoPanelRegion();

      // First check if clicking on ability/equipment to select it
      // BUT: Skip this for ability slots in abilities view - let them be handled by the click handler below
      if (canvasX >= topInfoPanelRegion.x && canvasX < topInfoPanelRegion.x + topInfoPanelRegion.width &&
          canvasY >= topInfoPanelRegion.y && canvasY < topInfoPanelRegion.y + topInfoPanelRegion.height) {

        // Get hover result to see if clicking on equipment/ability
        const relativeX = canvasX - topInfoPanelRegion.x;
        const relativeY = canvasY - topInfoPanelRegion.y;
        const topContent = topInfoPanelManager.getContent();
        if (topContent && 'handleHover' in topContent && typeof topContent.handleHover === 'function') {
          const hoverResult = topContent.handleHover(relativeX, relativeY);

          // If clicking on equipment, ability, or empty slot, select it
          if (hoverResult && typeof hoverResult === 'object' && 'type' in hoverResult) {
            if ('item' in hoverResult && (hoverResult.type === 'equipment-detail' || hoverResult.type === 'ability-detail')) {
              // Check if this is an ability slot in abilities view - if so, skip this handler and let the click handler below handle it
              const slotLabel = (topContent as any).hoveredStatId as string | null;
              const currentView = topInfoPanelViewRef.current;
              const isAbilitySlot = slotLabel === 'Reaction' || slotLabel === 'Passive' || slotLabel === 'Movement';

              if (currentView === 'abilities' && isAbilitySlot) {
                // Skip - let the click handler below handle ability slot clicks in abilities view
              } else {
                // Clicking on filled equipment or ability slot (in stats view, or equipment in abilities view)
                // Set as selected
                selectedEquipmentRef.current = {
                  type: hoverResult.type === 'equipment-detail' ? 'equipment' : 'ability',
                  item: hoverResult.item,
                  slotLabel: slotLabel
                };

                // Update the top info panel to highlight the selected equipment
                if ('setSelectedEquipmentSlot' in topContent && typeof (topContent as any).setSelectedEquipmentSlot === 'function') {
                  (topContent as any).setSelectedEquipmentSlot(slotLabel);
                }

                detailPanelActiveRef.current = true;

                // Increment version to trigger re-render (this will trigger useEffect which sets bottom panel content)
                setEquipmentSlotSelectionVersion(v => v + 1);

                // Don't call renderFrame() here - let the useEffect handle it
                return;
              }
            } else if (hoverResult.type === 'empty-slot-detail' && 'slotLabel' in hoverResult && 'slotType' in hoverResult) {
              // Clicking on empty slot - show empty slot info and select the slot
              const slotLabel = hoverResult.slotLabel as string;
              const slotType = hoverResult.slotType as 'equipment' | 'ability';

              // Set as selected (no item, just slot info)
              selectedEquipmentRef.current = {
                type: slotType,
                item: null,
                slotLabel: slotLabel
              };

              // Increment version to trigger re-render
              setEquipmentSlotSelectionVersion(v => v + 1);

              // Update the top info panel to highlight the selected slot
              if ('setSelectedEquipmentSlot' in topContent && typeof (topContent as any).setSelectedEquipmentSlot === 'function') {
                (topContent as any).setSelectedEquipmentSlot(slotLabel);
              }

              // Show empty slot info in bottom panel
              bottomPanelManager.setContent(new EmptySlotInfoContent(slotLabel, slotType));
              detailPanelActiveRef.current = true;
              renderFrame();
              return;
            }
          }
        }
      }

      const topInfoClickResult = topInfoPanelManager.handleClick(
        canvasX,
        canvasY,
        topInfoPanelRegion
      );
      if (topInfoClickResult) {
        // Handle Spend XP button click
        if (topInfoClickResult.type === 'learn-abilities') {
          setPanelMode('spend-xp');
          addLogMessage('Select a class to spend XP');
          renderFrame();
          return;
        }

        // Handle ability slot clicked (to set abilities)
        if (topInfoClickResult.type === 'ability-slot-clicked' && 'slotType' in topInfoClickResult) {
          setPanelMode('set-abilities');
          setAbilitiesSlotTypeRef.current = topInfoClickResult.slotType as 'Reaction' | 'Passive' | 'Movement';
          setAbilitiesMainContentRef.current = null; // Clear to force recreation

          // Highlight the selected ability slot in green in the top info panel
          const topContent = topInfoPanelManager.getContent();
          if (topContent && 'setSelectedEquipmentSlot' in topContent && typeof (topContent as any).setSelectedEquipmentSlot === 'function') {
            (topContent as any).setSelectedEquipmentSlot(topInfoClickResult.slotType);
          }

          addLogMessage(`Select a ${topInfoClickResult.slotType} ability`);
          renderFrame();
          return;
        }

        // Handle view toggle
        if (topInfoClickResult.type === 'view-toggled' && 'view' in topInfoClickResult) {
          // Update the view ref to preserve it across re-renders
          topInfoPanelViewRef.current = topInfoClickResult.view as 'stats' | 'abilities';
          renderFrame();
          return;
        }

        // Handle party member selection
        if (topInfoClickResult.type === 'party-member' && 'index' in topInfoClickResult) {
          // Selection is already updated by the callback in InventoryUnitInfoContent
          // Clear equipment selection when changing party members
          selectedEquipmentRef.current = null;
          detailPanelActiveRef.current = false;
          originalBottomPanelContentRef.current = null;

          // Increment version to trigger re-render
          setEquipmentSlotSelectionVersion(v => v + 1);

          // Clear equipment highlight in top panel
          const topContent = topInfoPanelManager.getContent();
          if (topContent && 'setSelectedEquipmentSlot' in topContent && typeof (topContent as any).setSelectedEquipmentSlot === 'function') {
            (topContent as any).setSelectedEquipmentSlot(null);
          }

          // Just render the frame to show the updated selection
          renderFrame();
          return;
        }
        // If click result contains a message, add it to combat log
        if (topInfoClickResult.type === 'combat-log-message' && 'message' in topInfoClickResult) {
          addLogMessage(topInfoClickResult.message);
        }
        renderFrame();
        return;
      }

      // Check bottom panel click (comparison panel - Cancel/Remove Item)
      const bottomPanelRegion = layoutManager.getBottomInfoPanelRegion();
      const bottomClickResult = bottomPanelManager.handleClick(
        canvasX,
        canvasY,
        bottomPanelRegion
      );
      if (bottomClickResult) {
        // Handle cancel-selection button
        if (bottomClickResult.type === 'button' && 'buttonId' in bottomClickResult && bottomClickResult.buttonId === 'cancel-selection') {
          // Clear equipment selection
          selectedEquipmentRef.current = null;
          detailPanelActiveRef.current = false;
          originalBottomPanelContentRef.current = null;

          // Increment version to trigger re-render
          setEquipmentSlotSelectionVersion(v => v + 1);

          // Clear equipment highlight in top panel
          const topContent = topInfoPanelManager.getContent();
          if (topContent && 'setSelectedEquipmentSlot' in topContent && typeof (topContent as any).setSelectedEquipmentSlot === 'function') {
            (topContent as any).setSelectedEquipmentSlot(null);
          }

          addLogMessage('Selection cleared');
          renderFrame();
          return;
        }

        // Handle remove-item button
        if (bottomClickResult.type === 'button' && 'buttonId' in bottomClickResult && bottomClickResult.buttonId === 'remove-item') {
          const selectedSlot = selectedEquipmentRef.current;
          if (selectedSlot && selectedSlot.item && selectedSlot.slotLabel) {
            const equipment = selectedSlot.item as Equipment;

            // Get current party member
            const partyMemberConfigs = PartyMemberRegistry.getAll();
            const selectedMember = partyMemberConfigs[selectedPartyMemberIndex];

            if (selectedMember) {
              // Add item to inventory
              PartyInventory.addItem(equipment.id, 1);

              // Map slot labels to registry slot names
              const slotMap: Record<string, 'leftHand' | 'rightHand' | 'head' | 'body' | 'accessory'> = {
                'L.Hand': 'leftHand',
                'R.Hand': 'rightHand',
                'Head': 'head',
                'Body': 'body',
                'Accessory': 'accessory'
              };

              const registrySlot = slotMap[selectedSlot.slotLabel];
              if (registrySlot) {
                // Update party member definition in registry
                PartyMemberRegistry.updateEquipment(selectedMember.id, registrySlot, null);

                // Trigger re-render of party member
                setPartyMemberVersion(v => v + 1);
              }

              addLogMessage(`${selectedMember.name} removed ${equipment.name}`);
              setInventoryVersion(v => v + 1);

              // Clear selection
              selectedEquipmentRef.current = null;
              detailPanelActiveRef.current = false;
              originalBottomPanelContentRef.current = null;

              // Increment version to trigger re-render
              setEquipmentSlotSelectionVersion(v => v + 1);

              // Clear equipment highlight in top panel
              const topContent = topInfoPanelManager.getContent();
              if (topContent && 'setSelectedEquipmentSlot' in topContent && typeof (topContent as any).setSelectedEquipmentSlot === 'function') {
                (topContent as any).setSelectedEquipmentSlot(null);
              }

              renderFrame();
              return;
            }
          }
        }

        renderFrame();
        return;
      }

      // Check item click
      const itemRows = renderer.getItemRowBounds(currentPageItems, mainPanelBounds);
      for (const row of itemRows) {
        if (
          canvasX >= row.bounds.x &&
          canvasX <= row.bounds.x + row.bounds.width &&
          canvasY >= row.bounds.y &&
          canvasY <= row.bounds.y + row.bounds.height
        ) {
          const clickedEquipment = Equipment.getById(row.equipmentId);
          if (!clickedEquipment) {
            return;
          }

          // Check if we're in comparison mode (equipment slot selected)
          const selectedSlot = selectedEquipmentRef.current;
          if (selectedSlot && selectedSlot.slotLabel) {
            // We're comparing items - try to equip the clicked item
            const partyMemberConfigs = PartyMemberRegistry.getAll();
            const selectedMember = partyMemberConfigs[selectedPartyMemberIndex];
            const currentUnit = PartyMemberRegistry.createPartyMember(selectedMember.id);

            if (selectedMember && currentUnit && 'leftHand' in currentUnit) {
              const humanoid = currentUnit as any;

              // Map slot labels to registry slot names
              const slotMap: Record<string, 'leftHand' | 'rightHand' | 'head' | 'body' | 'accessory'> = {
                'L.Hand': 'leftHand',
                'R.Hand': 'rightHand',
                'Head': 'head',
                'Body': 'body',
                'Accessory': 'accessory'
              };

              const registrySlot = slotMap[selectedSlot.slotLabel];
              if (!registrySlot) {
                return;
              }

              // Check if the item is compatible with the slot (using EquipmentSlotUtil)
              const isCompatible = isEquipmentCompatibleWithSlot(clickedEquipment, selectedSlot.slotLabel);
              if (!isCompatible) {
                addLogMessage(`Cannot equip ${clickedEquipment.name} in ${selectedSlot.slotLabel} slot`);
                renderFrame();
                return;
              }

              // Try to equip the item (this will validate dual-wield rules for hands)
              let equipResult;
              const oldEquipment = humanoid[registrySlot];

              // Get currently equipped item before attempting to equip
              switch (registrySlot) {
                case 'leftHand':
                  equipResult = humanoid.equipLeftHand(clickedEquipment);
                  break;
                case 'rightHand':
                  equipResult = humanoid.equipRightHand(clickedEquipment);
                  break;
                case 'head':
                  equipResult = humanoid.equipHead(clickedEquipment);
                  break;
                case 'body':
                  equipResult = humanoid.equipBody(clickedEquipment);
                  break;
                case 'accessory':
                  equipResult = humanoid.equipAccessory(clickedEquipment);
                  break;
                default:
                  equipResult = { success: false, message: 'Invalid slot' };
              }

              if (equipResult.success) {
                // Remove the new item from inventory
                PartyInventory.removeItem(clickedEquipment.id, 1);

                // Add the removed item to inventory (if there was one)
                if (oldEquipment) {
                  PartyInventory.addItem(oldEquipment.id, 1);
                }

                // Show success message from EquipmentResult
                addLogMessage(equipResult.message);

                // Update party member definition in registry
                PartyMemberRegistry.updateEquipment(selectedMember.id, registrySlot, clickedEquipment.id);

                // Trigger re-render of party member
                setPartyMemberVersion(v => v + 1);
                setInventoryVersion(v => v + 1);

                // Clear selection
                selectedEquipmentRef.current = null;
                detailPanelActiveRef.current = false;
                originalBottomPanelContentRef.current = null;

                // Increment version to trigger re-render
                setEquipmentSlotSelectionVersion(v => v + 1);

                // Clear equipment highlight in top panel
                const topContent = topInfoPanelManager.getContent();
                if (topContent && 'setSelectedEquipmentSlot' in topContent && typeof (topContent as any).setSelectedEquipmentSlot === 'function') {
                  (topContent as any).setSelectedEquipmentSlot(null);
                }

                renderFrame();
                return;
              } else {
                // Equipment validation failed - show the detailed error message from EquipmentResult
                addLogMessage(equipResult.message);
                renderFrame();
                return;
              }
            }
          } else {
            // Not in comparison mode - just select the item for viewing details
            // Clear equipment selection when clicking on inventory items
            selectedEquipmentRef.current = null;
            detailPanelActiveRef.current = false;
            originalBottomPanelContentRef.current = null;

            // Increment version to trigger re-render
            setEquipmentSlotSelectionVersion(v => v + 1);

            // Clear equipment highlight in top panel
            const topContent = topInfoPanelManager.getContent();
            if (topContent && 'setSelectedEquipmentSlot' in topContent && typeof (topContent as any).setSelectedEquipmentSlot === 'function') {
              (topContent as any).setSelectedEquipmentSlot(null);
            }

            setViewState((prev) => ({ ...prev, selectedItemId: row.equipmentId }));
            renderFrame();
            return;
          }
        }
      }

      // Check pagination click
      const paginationBounds = renderer.getPaginationButtonBounds(mainPanelBounds, totalPages);
      if (paginationBounds.prev && canvasX >= paginationBounds.prev.x && canvasX <= paginationBounds.prev.x + paginationBounds.prev.width && canvasY >= paginationBounds.prev.y && canvasY <= paginationBounds.prev.y + paginationBounds.prev.height) {
        if (viewState.currentPage > 0) {
          setViewState((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }));
          renderFrame();
        }
        return;
      } else if (paginationBounds.next && canvasX >= paginationBounds.next.x && canvasX <= paginationBounds.next.x + paginationBounds.next.width && canvasY >= paginationBounds.next.y && canvasY <= paginationBounds.next.y + paginationBounds.next.height) {
        if (viewState.currentPage < totalPages - 1) {
          setViewState((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }));
          renderFrame();
        }
        return;
      }
    },
    [viewState, mainPanelBounds, renderer, currentPageItems, totalPages, renderFrame, combatLogManager, layoutManager, topInfoPanelManager, panelMode, selectedPartyMemberIndex, bottomPanelManager, addLogMessage, topInfoPanelViewRef]
  );

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
      <canvas
        ref={displayCanvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          width: canvasDisplayStyle.width,
          height: canvasDisplayStyle.height,
          imageRendering: 'pixelated',
          objectFit: 'contain'
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
};
