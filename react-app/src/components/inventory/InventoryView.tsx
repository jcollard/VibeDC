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
import { InventoryUnitInfoContent } from '../../models/inventory/panels/InventoryUnitInfoContent';
import { InfoPanelManager } from '../../models/combat/managers/InfoPanelManager';
import { UISettings } from '../../config/UISettings';
import { PartyMemberRegistry } from '../../utils/PartyMemberRegistry';
import type { PanelContent, PanelRegion } from '../../models/combat/managers/panels/PanelContent';
import type { CombatUnit } from '../../models/combat/CombatUnit';

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
 * InventoryView component
 * Displays the party's inventory with filtering, sorting, pagination, and item details
 */
export const InventoryView: React.FC = () => {
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

  // Track ability/equipment detail panel state (for swapping bottom panel on hover)
  const detailPanelActiveRef = useRef(false);
  const originalBottomPanelContentRef = useRef<PanelContent | null>(null);

  // Track selected equipment/ability from top panel (for sticky selection on click)
  const selectedEquipmentRef = useRef<{ type: 'ability' | 'equipment'; item: any; slotLabel: string | null } | null>(null);

  // Canvas refs for double buffering
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Panel managers for title/bottom info panels and top info panel
  const titlePanelManager = useMemo(() => new InfoPanelManager(), []);
  const bottomPanelManager = useMemo(() => new InfoPanelManager(), []);
  const topInfoPanelManager = useMemo(() => new InfoPanelManager(), []);

  // Initialize panel content
  useEffect(() => {
    // Bottom panel: Item details (initially empty)
    bottomPanelManager.setContent(new EmptyPanelContent());
  }, [bottomPanelManager]);

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

        topInfoPanelManager.setContent(
          new InventoryUnitInfoContent(
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
          )
        );
      }
    }
  }, [topInfoPanelManager, selectedPartyMemberIndex]);

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

  // Update bottom panel when hovered item changes
  useEffect(() => {
    if (viewState.hoveredItemId) {
      const equipment = Equipment.getById(viewState.hoveredItemId);
      if (equipment) {
        bottomPanelManager.setContent(new EquipmentInfoContent(equipment));
      }
    } else {
      bottomPanelManager.setContent(new EmptyPanelContent());
    }
  }, [viewState.hoveredItemId, bottomPanelManager]);

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
    bufferCtx.fillStyle = '#1a1a1a';
    bufferCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Get font atlas
    const fontAtlas = fontAtlasImagesRef.current.get(CombatConstants.INVENTORY_VIEW.MAIN_PANEL.CATEGORY_TABS.FONT_ID);
    if (!fontAtlas) return;

    // Render main panel (inventory grid)
    renderer.render(
      bufferCtx,
      viewState,
      currentPageItems,
      totalPages,
      mainPanelBounds,
      fontAtlas
    );

    // Render title panel (inventory stats, category tabs, and sort options)
    const titlePanelRegion = getInventoryTitlePanelRegion(layoutManager);
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
    const bottomPanelRegion = layoutManager.getBottomInfoPanelRegion();
    bottomPanelManager.render(
      bufferCtx,
      bottomPanelRegion,
      CombatConstants.INVENTORY_VIEW.BOTTOM_INFO.FONT_ID,
      fontAtlas
    );

    // Render combat log panel (inventory actions)
    const logPanelRegion = getInventoryLogPanelRegion(layoutManager);
    const logFontAtlas = fontAtlasImagesRef.current.get(CombatConstants.COMBAT_LOG.FONT_ID);
    if (logFontAtlas) {
      combatLogManager.render(
        bufferCtx,
        logPanelRegion.x,
        logPanelRegion.y,
        logPanelRegion.width,
        logPanelRegion.height,
        CombatConstants.COMBAT_LOG.FONT_ID,
        logFontAtlas
      );
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
        combatLogManager.addMessage(`Added ${quantity}x ${equipment.name}`);
        setInventoryVersion(v => v + 1);
      } else {
        console.error(`[DEV] Failed to add ${equipment.name} to inventory`);
      }
    };

    (window as any).giveGold = (amount: number = 100) => {
      PartyInventory.addGold(amount);
      console.log(`[DEV] Added ${amount} gold to party inventory`);
      combatLogManager.addMessage(`Added ${amount} gold`);
      setInventoryVersion(v => v + 1);
    };

    (window as any).clearInventory = () => {
      PartyInventory.clear();
      console.log('[DEV] Cleared party inventory');
      combatLogManager.addMessage('Inventory cleared');
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

    return () => {
      delete (window as any).giveItem;
      delete (window as any).giveGold;
      delete (window as any).clearInventory;
      delete (window as any).listEquipment;
      delete (window as any).showInventoryPanels;
    };
  }, [combatLogManager, setInventoryVersion]);

  // Render on state changes
  useEffect(() => {
    renderFrame();
  }, [renderFrame]);

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
      const itemRows = renderer.getItemRowBounds(currentPageItems, mainPanelBounds);
      let newHoveredItemId: string | null = null;
      for (const row of itemRows) {
        if (
          canvasX >= row.bounds.x &&
          canvasX <= row.bounds.x + row.bounds.width &&
          canvasY >= row.bounds.y &&
          canvasY <= row.bounds.y + row.bounds.height
        ) {
          newHoveredItemId = row.equipmentId;
          break;
        }
      }

      if (newHoveredItemId !== viewState.hoveredItemId) {
        setViewState((prev) => ({ ...prev, hoveredItemId: newHoveredItemId }));
        needsRerender = true;
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
      if (!selectedEquipmentRef.current) {
        if (canvasX >= topInfoPanelRegion.x && canvasX < topInfoPanelRegion.x + topInfoPanelRegion.width &&
            canvasY >= topInfoPanelRegion.y && canvasY < topInfoPanelRegion.y + topInfoPanelRegion.height) {

          // Check if hover result is detail info
          if (topInfoHoverResult && typeof topInfoHoverResult === 'object' && 'type' in topInfoHoverResult && 'item' in topInfoHoverResult) {
            if (topInfoHoverResult.type === 'ability-detail') {
              // Cache original bottom panel content if not already cached
              if (!detailPanelActiveRef.current && bottomPanelManager.getContent()) {
                originalBottomPanelContentRef.current = bottomPanelManager.getContent();
              }

              // Show ability details in bottom panel
              bottomPanelManager.setContent(new AbilityInfoContent(topInfoHoverResult.item as any));
              detailPanelActiveRef.current = true;
              needsRerender = true;
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

      if (needsRerender) {
        renderFrame();
      }
    },
    [viewState, mainPanelBounds, renderer, currentPageItems, totalPages, renderFrame, layoutManager, topInfoPanelManager, bottomPanelManager]
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
            combatLogManager.addMessage(`Filtered by ${tab.category}`);
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
          combatLogManager.addMessage(`Sort changed to ${sortModes[nextIndex]}`);
          renderFrame();
          return;
        }
      }

      // Check top info panel click (party member stats - for toggling views or showing details)
      const topInfoPanelRegion = layoutManager.getTopInfoPanelRegion();

      // First check if clicking on ability/equipment to select it
      if (canvasX >= topInfoPanelRegion.x && canvasX < topInfoPanelRegion.x + topInfoPanelRegion.width &&
          canvasY >= topInfoPanelRegion.y && canvasY < topInfoPanelRegion.y + topInfoPanelRegion.height) {

        // Get hover result to see if clicking on equipment/ability
        const relativeX = canvasX - topInfoPanelRegion.x;
        const relativeY = canvasY - topInfoPanelRegion.y;
        const topContent = topInfoPanelManager.getContent();
        if (topContent && 'handleHover' in topContent && typeof topContent.handleHover === 'function') {
          const hoverResult = topContent.handleHover(relativeX, relativeY);

          // If clicking on equipment or ability, select it
          if (hoverResult && typeof hoverResult === 'object' && 'type' in hoverResult && 'item' in hoverResult) {
            if (hoverResult.type === 'equipment-detail' || hoverResult.type === 'ability-detail') {
              // Get the slot label from hoveredStatId
              const slotLabel = (topContent as any).hoveredStatId as string | null;

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

              // Show in bottom panel
              if (hoverResult.type === 'equipment-detail') {
                bottomPanelManager.setContent(new EquipmentInfoContent(hoverResult.item as any));
              } else {
                bottomPanelManager.setContent(new AbilityInfoContent(hoverResult.item as any));
              }

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
        // Handle party member selection
        if (topInfoClickResult.type === 'party-member' && 'index' in topInfoClickResult) {
          // Selection is already updated by the callback in InventoryUnitInfoContent
          // Clear equipment selection when changing party members
          selectedEquipmentRef.current = null;
          detailPanelActiveRef.current = false;
          originalBottomPanelContentRef.current = null;

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
          combatLogManager.addMessage(topInfoClickResult.message);
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
          // Clear equipment selection when clicking on inventory items
          selectedEquipmentRef.current = null;
          detailPanelActiveRef.current = false;
          originalBottomPanelContentRef.current = null;

          // Clear equipment highlight in top panel
          const topContent = topInfoPanelManager.getContent();
          if (topContent && 'setSelectedEquipmentSlot' in topContent && typeof (topContent as any).setSelectedEquipmentSlot === 'function') {
            (topContent as any).setSelectedEquipmentSlot(null);
          }

          setViewState((prev) => ({ ...prev, selectedItemId: row.equipmentId }));
          const equipment = Equipment.getById(row.equipmentId);
          if (equipment) {
            combatLogManager.addMessage(`Selected: ${equipment.name}`);
          }
          renderFrame();
          return;
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
    [viewState, mainPanelBounds, renderer, currentPageItems, totalPages, renderFrame, combatLogManager, layoutManager, topInfoPanelManager]
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
