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
import { InventoryStatsContent, type InventoryStats } from '../../models/inventory/panels/InventoryStatsContent';
import { ItemDetailsContent } from '../../models/inventory/panels/ItemDetailsContent';
import { InfoPanelManager } from '../../models/combat/managers/InfoPanelManager';

// Canvas dimensions (same as CombatView)
const CANVAS_WIDTH = CombatConstants.CANVAS_WIDTH; // 384 pixels (32 tiles)
const CANVAS_HEIGHT = CombatConstants.CANVAS_HEIGHT; // 216 pixels (18 tiles)

/**
 * InventoryView component
 * Displays the party's inventory with filtering, sorting, pagination, and item details
 */
export const InventoryView: React.FC = () => {
  // Load initial state from localStorage
  const [viewState, setViewState] = useState<InventoryViewState>(() =>
    loadInventoryViewStateFromLocalStorage()
  );

  // Canvas refs for double buffering
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Font atlas loader
  const fontLoader = useMemo(() => new FontAtlasLoader(), []);

  // Track if fonts are loaded
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const fontAtlasImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Inventory renderer
  const renderer = useMemo(() => new InventoryRenderer(), []);

  // Layout manager (reuse CombatLayoutManager for panel regions)
  const layoutManager = useMemo(() => new CombatLayoutManager(), []);

  // Combat log manager (reuse for inventory action messages)
  const combatLogManager = useMemo(() => new CombatLogManager(), []);

  // Panel managers for top/bottom info panels
  const topPanelManager = useMemo(() => new InfoPanelManager(), []);
  const bottomPanelManager = useMemo(() => new InfoPanelManager(), []);

  // Initialize panel content
  useEffect(() => {
    // Top panel: Inventory stats
    const stats: InventoryStats = {
      totalItems: PartyInventory.getTotalItemCount(),
      uniqueItems: PartyInventory.getTotalUniqueItems(),
      gold: PartyInventory.getGold(),
    };
    topPanelManager.setContent(new InventoryStatsContent(stats));

    // Bottom panel: Item details (initially empty)
    bottomPanelManager.setContent(new ItemDetailsContent(null, 0));
  }, [topPanelManager, bottomPanelManager]);

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
  }, [viewState.category, viewState.sortMode]);

  // Calculate pagination
  const mainPanelBounds = useMemo(() => layoutManager.getMapViewport(CANVAS_WIDTH, CANVAS_HEIGHT), [layoutManager]);
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

  // Update bottom panel when selected item changes
  useEffect(() => {
    if (viewState.selectedItemId) {
      const equipment = Equipment.getById(viewState.selectedItemId);
      const quantity = PartyInventory.getItemCount(viewState.selectedItemId);
      if (equipment) {
        bottomPanelManager.setContent(new ItemDetailsContent(equipment, quantity));
      }
    } else {
      bottomPanelManager.setContent(new ItemDetailsContent(null, 0));
    }
  }, [viewState.selectedItemId, bottomPanelManager]);

  // Update top panel stats when inventory changes (simplified - just on render)
  useEffect(() => {
    const stats: InventoryStats = {
      totalItems: PartyInventory.getTotalItemCount(),
      uniqueItems: PartyInventory.getTotalUniqueItems(),
      gold: PartyInventory.getGold(),
    };
    topPanelManager.setContent(new InventoryStatsContent(stats));
  }, [filteredAndSortedItems, topPanelManager]);

  // Render frame
  const renderFrame = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas || !fontsLoaded) return;

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

    // Render top info panel (inventory stats)
    const topPanelRegion = layoutManager.getTopInfoPanelRegion();
    topPanelManager.render(
      bufferCtx,
      topPanelRegion,
      CombatConstants.INVENTORY_VIEW.TOP_INFO.FONT_ID,
      fontAtlas
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
    const logPanelRegion = layoutManager.getCombatLogPanelRegion();
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

    // Render title panel (top-left)
    const titlePanelRegion = layoutManager.getTurnOrderPanelRegion();
    const titleFontAtlas = fontAtlasImagesRef.current.get(CombatConstants.FONTS.TITLE_FONT_ID);
    if (titleFontAtlas) {
      FontAtlasRenderer.renderText(
        bufferCtx,
        CombatConstants.INVENTORY_VIEW.TEXT.TITLE,
        Math.round(titlePanelRegion.x + 4),
        Math.round(titlePanelRegion.y + 4),
        CombatConstants.FONTS.TITLE_FONT_ID,
        titleFontAtlas,
        1,
        'left',
        '#ffff00'
      );
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
    viewState,
    currentPageItems,
    totalPages,
    mainPanelBounds,
    renderer,
    layoutManager,
    topPanelManager,
    bottomPanelManager,
    combatLogManager,
  ]);

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

      // Check category tab hover
      const categoryTabs = renderer.getCategoryTabBounds(mainPanelBounds);
      let newHoveredCategory: InventoryCategory | null = null;
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

      if (newHoveredCategory !== viewState.hoveredCategory) {
        setViewState((prev) => ({ ...prev, hoveredCategory: newHoveredCategory }));
        needsRerender = true;
      }

      // Check sort dropdown hover
      const sortBounds = renderer.getSortDropdownBounds(mainPanelBounds);
      const sortHovered =
        canvasX >= sortBounds.x &&
        canvasX <= sortBounds.x + sortBounds.width &&
        canvasY >= sortBounds.y &&
        canvasY <= sortBounds.y + sortBounds.height;

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
    [viewState, mainPanelBounds, renderer, currentPageItems, totalPages, renderFrame]
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

      // Check category tab click
      const categoryTabs = renderer.getCategoryTabBounds(mainPanelBounds);
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

      // Check sort dropdown click (cycle through sort modes)
      const sortBounds = renderer.getSortDropdownBounds(mainPanelBounds);
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

      // Check item click
      const itemRows = renderer.getItemRowBounds(currentPageItems, mainPanelBounds);
      for (const row of itemRows) {
        if (
          canvasX >= row.bounds.x &&
          canvasX <= row.bounds.x + row.bounds.width &&
          canvasY >= row.bounds.y &&
          canvasY <= row.bounds.y + row.bounds.height
        ) {
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
    [viewState, mainPanelBounds, renderer, currentPageItems, totalPages, renderFrame, combatLogManager]
  );

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
      <canvas
        ref={displayCanvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ width: '100%', height: '100%', imageRendering: 'pixelated', objectFit: 'contain' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
};
