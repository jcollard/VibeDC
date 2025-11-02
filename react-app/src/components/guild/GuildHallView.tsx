import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { PartyState, GameViewType } from '../../models/game/GameState';
import type { CombatUnit } from '../../models/combat/CombatUnit';
import type { PartyMemberDefinition } from '../../utils/PartyMemberRegistry';
import { GuildRosterManager } from '../../utils/GuildRosterManager';
import { GuildHallConstants as C } from '../../constants/GuildHallConstants';
import { FontRegistry } from '../../utils/FontRegistry';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';
import { SpriteRenderer } from '../../utils/SpriteRenderer';
import { PartyMemberCardRenderer } from './renderers/PartyMemberCardRenderer';
import { RosterCharacterCardRenderer } from './renderers/RosterCharacterCardRenderer';
import { UISettings } from '../../config/UISettings';
import { CharacterCreationModal } from './CharacterCreationModal';

interface GuildHallViewProps {
  partyState: PartyState;
  onPartyStateChange: (state: PartyState) => void;
  onNavigate: (view: GameViewType, params?: any) => void;
  resourceManager?: any; // TODO: Type properly
}

export const GuildHallView: React.FC<GuildHallViewProps> = ({
  partyState,
  onPartyStateChange,
  onNavigate,
  resourceManager,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [resourcesLoaded, setResourcesLoaded] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [rosterPage, setRosterPage] = useState(0); // Current page for guild roster
  const [hoveredButton, setHoveredButton] = useState<'create' | 'return' | null>(null);

  // Track window size for integer scaling
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Track canvas display style for integer scaling
  const [canvasDisplayStyle, setCanvasDisplayStyle] = useState<{ width: string; height: string }>({
    width: '100%',
    height: '100%',
  });

  // ⚠️ STATE MANAGEMENT GUIDELINE: Cache stateful components with useMemo!
  // This prevents recreating GuildRosterManager on every render
  const guildManager = useMemo(
    () => new GuildRosterManager(partyState, onPartyStateChange),
    [partyState, onPartyStateChange]
  );

  // Load resources
  useEffect(() => {
    const loadResources = async () => {
      try {
        console.log('[GuildHallView] Loading resources...');

        // Load fonts (from ResourceManager if available)
        if (resourceManager) {
          await resourceManager.loadFonts();
        } else {
          // Fonts should already be loaded by DataLoader
          // Just verify they exist
          const fontIds = FontRegistry.getAllIds();
          if (fontIds.length === 0) {
            console.error('[GuildHallView] No fonts registered!');
            return;
          }
        }

        // Sprites should already be loaded by DataLoader
        // Just verify they exist
        const spriteCount = SpriteRegistry.count;
        if (spriteCount === 0) {
          console.warn('[GuildHallView] No sprites registered!');
        }

        console.log('[GuildHallView] Resources loaded');
        setResourcesLoaded(true);
      } catch (error) {
        console.error('[GuildHallView] Resource loading failed:', error);
      }
    };

    loadResources();
  }, [resourceManager]);

  // ⚠️ PERFORMANCE GUIDELINE: Cache font/sprite lookups outside render loop!
  const fontAtlasRef = useRef<HTMLImageElement | null>(null);
  const titleFontAtlasRef = useRef<HTMLImageElement | null>(null);
  const spriteImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Reset roster page if it becomes invalid (e.g., after removing characters)
  useEffect(() => {
    const availableRoster = guildManager.getAvailableRoster();
    const maxVisible = C.GUILD_ROSTER_PANEL.MAX_VISIBLE_CARDS;
    const totalPages = Math.ceil(availableRoster.length / maxVisible);

    // If current page is beyond valid range, reset to last valid page
    if (rosterPage >= totalPages && totalPages > 0) {
      console.log('[GuildHallView] Resetting page from', rosterPage, 'to', totalPages - 1);
      setRosterPage(totalPages - 1);
    } else if (rosterPage > 0 && availableRoster.length === 0) {
      console.log('[GuildHallView] Resetting page to 0 (no roster)');
      setRosterPage(0);
    }
  }, [partyState, rosterPage]);

  // Handle window resize for integer scaling
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
      } else {
        setCanvasDisplayStyle({ width: '100%', height: '100%' });
      }
    };

    updateCanvasStyle();
    requestAnimationFrame(updateCanvasStyle);
  }, [windowSize.width, windowSize.height]);

  useEffect(() => {
    if (resourcesLoaded) {
      // Cache font atlas lookup
      const fontDef = FontRegistry.getById('7px-04b03');
      if (fontDef && resourceManager) {
        const atlas = resourceManager.getFontAtlas('7px-04b03');
        fontAtlasRef.current = atlas;
      }

      // Cache title font atlas lookup
      const titleFontDef = FontRegistry.getById('15px-dungeonslant');
      if (titleFontDef && resourceManager) {
        const titleAtlas = resourceManager.getFontAtlas('15px-dungeonslant');
        titleFontAtlasRef.current = titleAtlas;
      }

      // Cache sprite images from resource manager
      if (resourceManager) {
        spriteImagesRef.current = resourceManager.getSpriteImages();
      }
    }
  }, [resourcesLoaded, resourceManager]);

  // Render loop
  useEffect(() => {
    if (!resourcesLoaded) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ⚠️ RENDERING GUIDELINE: Disable image smoothing for pixel art!
    ctx.imageSmoothingEnabled = false;

    const fontAtlas = fontAtlasRef.current;
    if (!fontAtlas) {
      console.warn('[GuildHallView] Font atlas not loaded');
      return;
    }

    const titleFontAtlas = titleFontAtlasRef.current;
    if (!titleFontAtlas) {
      console.warn('[GuildHallView] Title font atlas not loaded');
      return;
    }

    // Render function
    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, C.CANVAS_WIDTH, C.CANVAS_HEIGHT);

      // Render title
      FontAtlasRenderer.renderText(
        ctx,
        'Guild Hall',
        Math.floor(C.CANVAS_WIDTH / 2),
        6,
        '15px-dungeonslant',
        titleFontAtlas,
        1,
        'center',
        '#ffff00'
      );

      // Render active party panel
      renderActivePartyPanel(ctx, fontAtlas);

      // Render guild roster panel
      renderGuildRosterPanel(ctx, fontAtlas);

      // Render action buttons
      renderActionButtons(ctx, fontAtlas);
    };

    render();
  }, [resourcesLoaded, partyState, rosterPage, hoveredButton]);

  const renderActivePartyPanel = (ctx: CanvasRenderingContext2D, fontAtlas: HTMLImageElement) => {
    const panel = C.ACTIVE_PARTY_PANEL;

    // Draw panel border
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);

    // ⚠️ RENDERING GUIDELINE: Use FontAtlasRenderer for ALL text!
    FontAtlasRenderer.renderText(
      ctx,
      panel.TITLE_TEXT,
      panel.x + 4,
      panel.y + 2,
      '7px-04b03',
      fontAtlas,
      1,
      'left',
      panel.TITLE_COLOR
    );

    // Draw party members or empty slots
    const activeParty = guildManager.getActiveParty();
    for (let i = 0; i < 4; i++) {
      const member = activeParty[i];
      const cardY = panel.y + 8 + (i * 40);

      if (member) {
        // TODO: Render party member card (Phase 5)
        renderPartyMemberCard(ctx, member, panel.x + 4, cardY, fontAtlas);
      } else {
        // Render empty slot (⚠️ Use FontAtlasRenderer!)
        FontAtlasRenderer.renderText(
          ctx,
          panel.EMPTY_SLOT_TEXT,
          panel.x + 8,
          cardY + 12,
          '7px-04b03',
          fontAtlas,
          1,
          'left',
          panel.EMPTY_COLOR
        );
      }
    }
  };

  const renderGuildRosterPanel = (ctx: CanvasRenderingContext2D, fontAtlas: HTMLImageElement) => {
    const panel = C.GUILD_ROSTER_PANEL;

    // Draw panel border
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);

    // Draw title
    FontAtlasRenderer.renderText(
      ctx,
      panel.TITLE_TEXT,
      panel.x + 4,
      panel.y + 2,
      '7px-04b03',
      fontAtlas,
      1,
      'left',
      panel.TITLE_COLOR
    );

    // Draw available roster with paging
    const availableRoster = guildManager.getAvailableRoster();
    if (availableRoster.length === 0) {
      FontAtlasRenderer.renderText(
        ctx,
        panel.EMPTY_TEXT,
        panel.x + 8,
        panel.y + 40,
        '7px-04b03',
        fontAtlas,
        1,
        'left',
        panel.EMPTY_COLOR
      );
    } else {
      // Calculate paging
      const maxVisible = panel.MAX_VISIBLE_CARDS;
      const totalPages = Math.ceil(availableRoster.length / maxVisible);
      const startIndex = rosterPage * maxVisible;
      const endIndex = Math.min(startIndex + maxVisible, availableRoster.length);
      const visibleRoster = availableRoster.slice(startIndex, endIndex);

      // Render visible roster cards
      visibleRoster.forEach((char, index) => {
        const cardY = panel.y + 8 + (index * panel.CARD_HEIGHT);
        renderRosterCharacterCard(ctx, char, panel.x + 4, cardY, fontAtlas);
      });

      // Render page navigation if needed (more than one page)
      if (totalPages > 1) {
        renderRosterPagination(ctx, fontAtlas, rosterPage, totalPages);
      }
    }
  };

  const renderRosterPagination = (ctx: CanvasRenderingContext2D, fontAtlas: HTMLImageElement, currentPage: number, totalPages: number) => {
    const panel = C.GUILD_ROSTER_PANEL;
    const spriteImages = spriteImagesRef.current;

    // Position pagination at the bottom of the roster panel
    const paginationY = panel.y + panel.height - 16; // 16px from bottom
    const centerX = panel.x + Math.floor(panel.width / 2);

    // Render page indicator text (e.g., "1/3")
    const pageText = `${currentPage + 1}/${totalPages}`;
    const textWidth = FontAtlasRenderer.measureTextByFontId(pageText, '7px-04b03');

    FontAtlasRenderer.renderText(
      ctx,
      pageText,
      centerX - Math.floor(textWidth / 2),
      paginationY + 4,
      '7px-04b03',
      fontAtlas,
      1,
      'left',
      panel.PAGE_INDICATOR_COLOR
    );

    // Render left arrow (minimap-8) if not on first page
    if (currentPage > 0) {
      const leftArrowX = panel.x + 8;
      const arrowY = paginationY;

      SpriteRenderer.renderSpriteById(
        ctx,
        'minimap-8',
        spriteImages,
        12,
        Math.floor(leftArrowX),
        Math.floor(arrowY),
        panel.ARROW_SIZE,
        panel.ARROW_SIZE
      );
    }

    // Render right arrow (minimap-6) if not on last page
    if (currentPage < totalPages - 1) {
      const rightArrowX = panel.x + panel.width - 8 - panel.ARROW_SIZE;
      const arrowY = paginationY;

      SpriteRenderer.renderSpriteById(
        ctx,
        'minimap-6',
        spriteImages,
        12,
        Math.floor(rightArrowX),
        Math.floor(arrowY),
        panel.ARROW_SIZE,
        panel.ARROW_SIZE
      );
    }
  };

  const renderActionButtons = (ctx: CanvasRenderingContext2D, fontAtlas: HTMLImageElement) => {
    const buttons = C.ACTION_BUTTONS;

    // Determine colors based on hover state
    const createColor = hoveredButton === 'create' ? buttons.COLOR_HOVER : buttons.COLOR_NORMAL;
    const returnColor = hoveredButton === 'return' ? buttons.COLOR_HOVER : buttons.COLOR_NORMAL;

    // ⚠️ RENDERING GUIDELINE: Use FontAtlasRenderer for button text!
    FontAtlasRenderer.renderText(
      ctx,
      buttons.CREATE_TEXT,
      100,
      buttons.y,
      '7px-04b03',
      fontAtlas,
      1,
      'left',
      createColor
    );

    FontAtlasRenderer.renderText(
      ctx,
      buttons.RETURN_TEXT,
      250,
      buttons.y,
      '7px-04b03',
      fontAtlas,
      1,
      'left',
      returnColor
    );
  };

  const renderPartyMemberCard = (ctx: CanvasRenderingContext2D, member: CombatUnit, x: number, y: number, fontAtlas: HTMLImageElement) => {
    // ⚠️ Use PartyMemberCardRenderer for proper rendering!
    PartyMemberCardRenderer.render(
      ctx,
      member,
      {
        x,
        y,
        isSelected: false,
        isHovered: false,
      },
      spriteImagesRef.current,
      fontAtlas
    );
  };

  const renderRosterCharacterCard = (ctx: CanvasRenderingContext2D, char: PartyMemberDefinition, x: number, y: number, fontAtlas: HTMLImageElement) => {
    // ⚠️ Use RosterCharacterCardRenderer for proper rendering!
    RosterCharacterCardRenderer.render(
      ctx,
      char,
      {
        x,
        y,
        isSelected: false,
        isHovered: false,
      },
      spriteImagesRef.current,
      fontAtlas
    );
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowCreateModal(false);
  };

  // Handle character created
  const handleCharacterCreated = (character: PartyMemberDefinition) => {
    console.log(`[GuildHallView] ${character.name} created!`);
    // TODO: Show success message in UI (for now, using console)
  };

  // Handle mouse input
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ⚠️ EVENT HANDLING GUIDELINE: Proper coordinate transformation is CRITICAL!
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;

    // Check action buttons for hover
    const buttons = C.ACTION_BUTTONS;

    // Create button bounds
    const createButtonX = 100;
    const createButtonWidth = FontAtlasRenderer.measureTextByFontId(buttons.CREATE_TEXT, '7px-04b03');
    const isOverCreate =
      mouseX >= createButtonX &&
      mouseX <= createButtonX + createButtonWidth &&
      mouseY >= buttons.y &&
      mouseY <= buttons.y + 12;

    // Return button bounds
    const returnButtonX = 250;
    const returnButtonWidth = FontAtlasRenderer.measureTextByFontId(buttons.RETURN_TEXT, '7px-04b03');
    const isOverReturn =
      mouseX >= returnButtonX &&
      mouseX <= returnButtonX + returnButtonWidth &&
      mouseY >= buttons.y &&
      mouseY <= buttons.y + 12;

    // Update hover state
    if (isOverCreate) {
      setHoveredButton('create');
    } else if (isOverReturn) {
      setHoveredButton('return');
    } else {
      setHoveredButton(null);
    }
  };

  const handleMouseClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ⚠️ EVENT HANDLING GUIDELINE: Proper coordinate transformation is CRITICAL!
    // Canvas coordinates ≠ Screen coordinates due to CSS scaling
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;   // 384 / CSS width
    const scaleY = canvas.height / rect.height; // 216 / CSS height
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;

    console.log('[GuildHallView] Mouse click at', mouseX, mouseY);

    // Check active party panel
    const activeParty = guildManager.getActiveParty();
    const panel = C.ACTIVE_PARTY_PANEL;

    console.log('[GuildHallView] Active party length:', activeParty.length);

    for (let i = 0; i < activeParty.length; i++) {
      const member = activeParty[i];
      // Use unit name as identifier (fallback if getUnitId returns undefined)
      const memberId = guildManager.getUnitId(member) || member.name;

      const cardY = panel.y + 8 + (i * 40);
      const cardX = panel.x + 4;

      // Debug: Log card bounds and arrow bounds
      const arrowSize = 12;
      const arrowX = cardX + C.PARTY_MEMBER_CARD.WIDTH - arrowSize - C.PARTY_MEMBER_CARD.PADDING;
      const arrowY = cardY + Math.floor((C.PARTY_MEMBER_CARD.HEIGHT - arrowSize) / 2);

      console.log('[GuildHallView] Party card', i, {
        member: member.name,
        memberId,
        cardX,
        cardY,
        arrowBounds: {
          x1: arrowX,
          x2: arrowX + arrowSize,
          y1: arrowY,
          y2: arrowY + arrowSize
        },
        mouse: { mouseX, mouseY }
      });

      // Check if remove arrow clicked
      if (PartyMemberCardRenderer.isRemoveButtonHovered(mouseX, mouseY, cardX, cardY)) {
        console.log('[GuildHallView] Remove arrow clicked for', member.name);
        guildManager.removeFromParty(memberId);
        return;
      }
    }

    // Check guild roster panel
    const availableRoster = guildManager.getAvailableRoster();
    const rosterPanel = C.GUILD_ROSTER_PANEL;

    // Check pagination arrows if there are multiple pages
    const maxVisible = rosterPanel.MAX_VISIBLE_CARDS;
    const totalPages = Math.ceil(availableRoster.length / maxVisible);

    if (totalPages > 1) {
      const paginationY = rosterPanel.y + rosterPanel.height - 16;

      // Check left arrow (previous page)
      if (rosterPage > 0) {
        const leftArrowX = rosterPanel.x + 8;
        const leftArrowBounds = {
          x1: leftArrowX,
          x2: leftArrowX + rosterPanel.ARROW_SIZE,
          y1: paginationY,
          y2: paginationY + rosterPanel.ARROW_SIZE
        };

        if (
          mouseX >= leftArrowBounds.x1 &&
          mouseX <= leftArrowBounds.x2 &&
          mouseY >= leftArrowBounds.y1 &&
          mouseY <= leftArrowBounds.y2
        ) {
          console.log('[GuildHallView] Previous page clicked', { mouseX, mouseY, bounds: leftArrowBounds });
          setRosterPage(rosterPage - 1);
          return;
        }
      }

      // Check right arrow (next page)
      if (rosterPage < totalPages - 1) {
        const rightArrowX = rosterPanel.x + rosterPanel.width - 8 - rosterPanel.ARROW_SIZE;
        const rightArrowBounds = {
          x1: rightArrowX,
          x2: rightArrowX + rosterPanel.ARROW_SIZE,
          y1: paginationY,
          y2: paginationY + rosterPanel.ARROW_SIZE
        };

        console.log('[GuildHallView] Checking right arrow', { mouseX, mouseY, bounds: rightArrowBounds, currentPage: rosterPage, totalPages });

        if (
          mouseX >= rightArrowBounds.x1 &&
          mouseX <= rightArrowBounds.x2 &&
          mouseY >= rightArrowBounds.y1 &&
          mouseY <= rightArrowBounds.y2
        ) {
          console.log('[GuildHallView] Next page clicked');
          setRosterPage(rosterPage + 1);
          return;
        }
      }
    }

    // Check roster cards (only visible cards on current page)
    const startIndex = rosterPage * maxVisible;
    const endIndex = Math.min(startIndex + maxVisible, availableRoster.length);
    const visibleRoster = availableRoster.slice(startIndex, endIndex);

    for (let i = 0; i < visibleRoster.length; i++) {
      const char = visibleRoster[i];
      const cardY = rosterPanel.y + 8 + (i * rosterPanel.CARD_HEIGHT);
      const cardX = rosterPanel.x + 4;

      // Debug: Log card bounds and arrow bounds
      const arrowSize = 12;
      const arrowX = cardX + C.ROSTER_CHARACTER_CARD.PADDING;
      const arrowY = cardY + Math.floor((C.ROSTER_CHARACTER_CARD.HEIGHT - arrowSize) / 2);

      console.log('[GuildHallView] Roster card', i, {
        character: char.name,
        cardX,
        cardY,
        arrowBounds: {
          x1: arrowX,
          x2: arrowX + arrowSize,
          y1: arrowY,
          y2: arrowY + arrowSize
        },
        mouse: { mouseX, mouseY }
      });

      // Check if add arrow clicked
      if (RosterCharacterCardRenderer.isAddButtonHovered(mouseX, mouseY, cardX, cardY)) {
        console.log('[GuildHallView] Add arrow clicked for', char.name);
        const success = guildManager.addToParty(char.id);
        if (!success) {
          // Show error message (party full)
          console.warn(C.ERROR_PARTY_FULL);
          alert(C.ERROR_PARTY_FULL); // TODO: Replace with proper UI message
        }
        return;
      }
    }

    // Check action buttons
    const buttons = C.ACTION_BUTTONS;

    // Create Character button
    const createButtonX = 100;
    const createButtonWidth = FontAtlasRenderer.measureTextByFontId(buttons.CREATE_TEXT, '7px-04b03');
    if (
      mouseX >= createButtonX &&
      mouseX <= createButtonX + createButtonWidth &&
      mouseY >= buttons.y &&
      mouseY <= buttons.y + 12
    ) {
      console.log('[GuildHallView] Create Character button clicked');
      setShowCreateModal(true);
      return;
    }

    // Exit Guild Hall button (return to exploration)
    const returnButtonX = 250;
    const returnButtonWidth = FontAtlasRenderer.measureTextByFontId(buttons.RETURN_TEXT, '7px-04b03');
    if (
      mouseX >= returnButtonX &&
      mouseX <= returnButtonX + returnButtonWidth &&
      mouseY >= buttons.y &&
      mouseY <= buttons.y + 12
    ) {
      console.log('[GuildHallView] Exit Guild Hall button clicked');
      onNavigate('exploration');
      return;
    }
  };

  if (!resourcesLoaded) {
    return (
      <div style={{
        width: `${C.CANVAS_WIDTH}px`,
        height: `${C.CANVAS_HEIGHT}px`,
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '12px',
      }}>
        Loading Guild Hall...
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          margin: 0,
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            maxWidth: '177.78vh',
            maxHeight: '56.25vw',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <canvas
            ref={canvasRef}
            width={C.CANVAS_WIDTH}
            height={C.CANVAS_HEIGHT}
            onClick={handleMouseClick}
            onMouseMove={handleMouseMove}
            style={{
              ...canvasDisplayStyle,
              imageRendering: 'pixelated',
              objectFit: 'contain',
              cursor: 'pointer',
              position: 'relative',
            } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Modal overlay - renders on top of everything */}
      {showCreateModal && (
        <CharacterCreationModal
          isOpen={showCreateModal}
          onClose={handleModalClose}
          onCharacterCreated={handleCharacterCreated}
          guildManager={guildManager}
          resourceManager={resourceManager}
        />
      )}
    </>
  );
};
