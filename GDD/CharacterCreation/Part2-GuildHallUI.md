# Character Creation / Guild Hall - Part 2: Guild Hall UI

**Version:** 1.0
**Created:** 2025-11-01
**Part:** 2 of 4
**Related:** [Part1-DataLayer.md](Part1-DataLayer.md), [Part3-CharacterCreationModal.md](Part3-CharacterCreationModal.md)

## Overview

This document covers the **Guild Hall UI implementation** - the main screen with party and roster panels, character cards, and interaction handlers.

**Estimated Time:** 8-10 hours

## Prerequisites

**MUST BE COMPLETED FIRST:**
- ✅ [Part1-DataLayer.md](Part1-DataLayer.md) - GameState and GuildRosterManager

**Also Required:**
- ✅ SpriteRegistry and SpriteRenderer systems exist
- ✅ FontAtlasRegistry and FontAtlasRenderer systems exist
- ✅ GameView orchestrator exists

## ⚠️ CRITICAL GUIDELINES FOR THIS PART

### Rendering Rules (NEVER BREAK THESE!)

1. **Text Rendering**:
   - ✅ ALWAYS use `FontAtlasRenderer.renderText()`
   - ❌ NEVER use `ctx.fillText()` or `ctx.strokeText()`
   - **Why**: Direct text rendering bypasses the font atlas system

2. **Sprite Rendering**:
   - ✅ ALWAYS use `SpriteRenderer.renderSprite()`
   - ❌ NEVER use `ctx.drawImage()` on sprite sheets
   - **Why**: Direct drawImage bypasses sprite registry and causes rendering errors

3. **Canvas Setup**:
   - ✅ ALWAYS set `ctx.imageSmoothingEnabled = false`
   - ✅ ALWAYS round coordinates with `Math.floor(x)`, `Math.floor(y)`
   - ✅ ALWAYS use `UISettings.getIntegerScaledDimensions()` for integer scaling (1×, 2×, 3×, etc.)
   - ✅ ALWAYS wrap canvas in fullscreen container for proper layout
   - **Why**: Prevents blurry pixel art, sub-pixel artifacts, and provides pixel-perfect scaling

### State Management Rules

1. **Component Caching**:
   - ✅ ALWAYS cache stateful components with `useMemo()`
   - ❌ NEVER recreate managers/objects in render
   - **Why**: Prevents unnecessary recreation and state loss

### Event Handling Rules

1. **NEVER call renderFrame() in mouse move handlers**
   - ❌ BAD: `onMouseMove={() => { updateHover(); renderFrame(); }}`
   - ✅ GOOD: Update state only, let the render loop handle rendering
   - **Why**: Causes 1000+ fps rendering, burns CPU

2. **Use proper coordinate transformation**:
   - Canvas coordinates ≠ Screen coordinates
   - Always scale: `mouseX = (clientX - rect.left) * (canvas.width / rect.width)`

### Performance Rules

1. **Cache font/sprite lookups outside render loop**
   - ❌ BAD: `FontAtlasRegistry.getById()` every frame
   - ✅ GOOD: Cache in `useRef` or `useMemo`

---

## Phase 3: GuildHallView Base Screen

**Goal**: Create the main Guild Hall screen component with layout and basic rendering, plus standalone test route

**Estimated Time**: 4-5 hours

### Task 3.1: Create GuildHallConstants

**File**: `react-app/src/constants/GuildHallConstants.ts`

**Implementation**: Copy from [CharacterCreationFeatureOverview.md](CharacterCreationFeatureOverview.md), section "Constants to Add"

**Required Constants**:
- Canvas dimensions (384×216)
- Active Party Panel layout
- Guild Roster Panel layout
- Action Buttons positions
- Colors (borders, text, backgrounds)
- Message strings

**Acceptance Criteria**:
- [ ] All layout constants defined
- [ ] All color constants defined
- [ ] All message constants defined
- [ ] File exports `GuildHallConstants` object

---

### Task 3.2: Create GuildHallView Component

**File**: `react-app/src/components/guild/GuildHallView.tsx`

**IMPORTANT**: This component now includes **UISettings integration** for integer scaling, following the pattern established in FirstPersonView.

**Implementation** (base structure with rendering guidelines and UISettings applied):

```typescript
import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { PartyState } from '../../models/game/GameState';
import type { GameViewType } from '../../models/game/GameState';
import { GuildRosterManager } from '../../utils/GuildRosterManager';
import { GuildHallConstants as C } from '../../constants/GuildHallConstants';
import { FontRegistry } from '../../utils/FontRegistry';
import { SpriteRegistry } from '../../utils/SpriteRegistry';
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';
import { UISettings } from '../../config/UISettings';

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
  const [selectedPartyMemberId, setSelectedPartyMemberId] = useState<string | null>(null);
  const [selectedRosterCharId, setSelectedRosterCharId] = useState<string | null>(null);

  // ⚠️ UISettings INTEGRATION: Track window size for integer scaling
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
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
        // Load fonts (from ResourceManager or directly)
        if (resourceManager) {
          await resourceManager.loadFonts();
        } else {
          await FontAtlasRegistry.loadAllFonts();
        }

        // Load sprites (always load directly - ResourceManager doesn't handle sprites yet)
        await SpriteRegistry.loadAllSprites();

        setResourcesLoaded(true);
      } catch (error) {
        console.error('[GuildHallView] Resource loading failed:', error);
      }
    };

    loadResources();
  }, [resourceManager]);

  // ⚠️ PERFORMANCE GUIDELINE: Cache font/sprite lookups outside render loop!
  const fontAtlasRef = useRef<HTMLImageElement | null>(null);
  const spriteImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // ⚠️ UISettings INTEGRATION: Handle window resize for integer scaling
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ⚠️ UISettings INTEGRATION: Calculate canvas display dimensions based on integer scaling
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
      // Cache these lookups to avoid repeated registry queries
      const fontDef = FontRegistry.getById('7px-04b03');
      if (fontDef && resourceManager) {
        const atlas = resourceManager.getFontAtlas('7px-04b03');
        fontAtlasRef.current = atlas;
      }
      // Sprite images cached in ref (placeholder for now)
      spriteImagesRef.current = new Map();
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
    if (!fontAtlas) return;

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
        12,
        '7px-04b03',
        fontAtlas.image,
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
  }, [resourcesLoaded, partyState, selectedPartyMemberId, selectedRosterCharId]);

  const renderActivePartyPanel = (ctx: CanvasRenderingContext2D, fontAtlas: any) => {
    const panel = C.ACTIVE_PARTY_PANEL;

    // Draw panel border
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);

    // ⚠️ RENDERING GUIDELINE: Use FontAtlasRenderer for ALL text!
    FontAtlasRenderer.renderText(
      ctx,
      panel.TITLE_TEXT,
      panel.x + 4,
      panel.y + 12,
      '7px-04b03',
      fontAtlas.image,
      panel.TITLE_COLOR
    );

    // Draw party members or empty slots
    const activeParty = guildManager.getActiveParty();
    for (let i = 0; i < 4; i++) {
      const member = activeParty[i];
      const cardY = panel.y + 24 + (i * 40);

      if (member) {
        // TODO: Render party member card (Phase 5)
        renderPartyMemberCard(ctx, member, panel.x + 4, cardY);
      } else {
        // Render empty slot (⚠️ Use FontAtlasRenderer!)
        FontAtlasRenderer.renderText(
          ctx,
          panel.EMPTY_SLOT_TEXT,
          panel.x + 8,
          cardY + 12,
          '7px-04b03',
          fontAtlas.image,
          panel.EMPTY_COLOR
        );
      }
    }
  };

  const renderGuildRosterPanel = (ctx: CanvasRenderingContext2D, fontAtlas: any) => {
    const panel = C.GUILD_ROSTER_PANEL;

    // Draw panel border
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);

    // Draw title
    FontAtlasRenderer.renderText(
      ctx,
      panel.TITLE_TEXT,
      panel.x + 4,
      panel.y + 12,
      '7px-04b03',
      fontAtlas.image,
      panel.TITLE_COLOR
    );

    // Draw available roster
    const availableRoster = guildManager.getAvailableRoster();
    if (availableRoster.length === 0) {
      FontAtlasRenderer.renderText(
        ctx,
        panel.EMPTY_TEXT,
        panel.x + 8,
        panel.y + 40,
        '7px-04b03',
        fontAtlas.image,
        panel.EMPTY_COLOR
      );
    } else {
      availableRoster.forEach((char, index) => {
        const cardY = panel.y + 24 + (index * 28);
        // TODO: Render roster character card (Phase 5)
        renderRosterCharacterCard(ctx, char, panel.x + 4, cardY);
      });
    }
  };

  const renderActionButtons = (ctx: CanvasRenderingContext2D, fontAtlas: any) => {
    const buttons = C.ACTION_BUTTONS;

    // ⚠️ RENDERING GUIDELINE: Use FontAtlasRenderer for button text!
    FontAtlasRenderer.renderText(
      ctx,
      buttons.CREATE_TEXT,
      100,
      buttons.y,
      '7px-04b03',
      fontAtlas.image,
      buttons.COLOR_NORMAL
    );

    FontAtlasRenderer.renderText(
      ctx,
      buttons.RETURN_TEXT,
      250,
      buttons.y,
      '7px-04b03',
      fontAtlas.image,
      buttons.COLOR_NORMAL
    );
  };

  const renderPartyMemberCard = (ctx: CanvasRenderingContext2D, member: any, x: number, y: number) => {
    // ⚠️ Implemented in Phase 5 - MUST use PartyMemberCardRenderer
    // DO NOT use ctx.fillText() here!
  };

  const renderRosterCharacterCard = (ctx: CanvasRenderingContext2D, char: any, x: number, y: number) => {
    // ⚠️ Implemented in Phase 5 - MUST use RosterCharacterCardRenderer
    // DO NOT use ctx.fillText() here!
  };

  // Handle mouse input
  const handleMouseClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // TODO: Implement in Phase 5
  };

  // ⚠️ RENDERING GUIDELINE: Use fullscreen container with integer scaling!
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
      background: '#0a0a0a',
    }}>
      <div style={{
        width: '100%',
        height: '100%',
        maxWidth: '177.78vh', // 16:9 aspect ratio
        maxHeight: '56.25vw',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <canvas
          ref={canvasRef}
          width={C.CANVAS_WIDTH}
          height={C.CANVAS_HEIGHT}
          onClick={handleMouseClick}
          style={{
            ...canvasDisplayStyle,
            imageRendering: 'pixelated',
            objectFit: 'contain',
            cursor: 'pointer',
          }}
        />
      </div>
    </div>
  );
};
```

**Acceptance Criteria**:
- [ ] Component renders 384×216 canvas with fullscreen container
- [ ] Integer scaling applied correctly (1×, 2×, 3×, etc.) using UISettings
- [ ] Window resize updates canvas display style dynamically
- [ ] Resources load correctly (fonts from ResourceManager, sprites directly)
- [ ] Title renders with FontAtlasRenderer
- [ ] Active party panel renders with title
- [ ] Guild roster panel renders with title
- [ ] Empty slots/roster shows placeholder text
- [ ] Action buttons render (placeholder)
- [ ] No console errors
- [ ] No `ctx.fillText()` or `ctx.strokeText()` anywhere

---

### Task 3.3: Create GuildHallTestRoute Component

**File**: `react-app/src/components/guild/GuildHallTestRoute.tsx`

**Implementation**:
```typescript
import React, { useState, useMemo, useEffect } from 'react';
import type { PartyState } from '../../models/game/GameState';
import { GuildHallView } from './GuildHallView';
import { ResourceManager } from '../../services/ResourceManager';

/**
 * Development-only route for testing GuildHallView in isolation
 * Accessible at /dev/guild-hall
 */
export const GuildHallTestRoute: React.FC = () => {
  // ✅ GUIDELINE: Cache ResourceManager in useMemo
  const resourceManager = useMemo(() => new ResourceManager(), []);
  const [resourcesLoaded, setResourcesLoaded] = useState(false);

  // ✅ GUIDELINE: Initialize with empty party state (immutable)
  const [partyState, setPartyState] = useState<PartyState>({
    members: [],
    guildRoster: [],
    inventory: { items: [], gold: 0 },
    equipment: new Map(),
  });

  // Load resources on mount
  useEffect(() => {
    resourceManager.loadFonts()
      .then(() => {
        console.log('[GuildHallTestRoute] Resources loaded');
        setResourcesLoaded(true);
      })
      .catch(error => {
        console.error('[GuildHallTestRoute] Resource loading failed:', error);
      });
  }, [resourceManager]);

  const handlePartyStateChange = (newPartyState: PartyState) => {
    console.log('[GuildHallTestRoute] Party state changed:', newPartyState);
    setPartyState(newPartyState);
  };

  const handleNavigate = (view: string, params?: any) => {
    console.log('[GuildHallTestRoute] Navigation requested:', view, params);
    // In test mode, just log navigation (no actual navigation)
    alert(`Navigation to ${view} requested (test mode - no navigation implemented)`);
  };

  if (!resourcesLoaded) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontFamily: 'monospace',
      }}>
        Loading Guild Hall resources...
      </div>
    );
  }

  // ✅ GUIDELINE: GuildHallView now handles fullscreen layout, no wrapper needed
  return (
    <GuildHallView
      partyState={partyState}
      onPartyStateChange={handlePartyStateChange}
      onNavigate={handleNavigate}
      resourceManager={resourceManager}
    />
  );
};
```

**Note**: The original design included a wrapper div with dev mode indicators, but this was simplified since GuildHallView now handles the fullscreen container layout itself. If dev mode indicators are desired, they can be added as overlays within GuildHallView or via browser dev tools.

**Previous design (for reference)**:
```typescript
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        padding: '20px',
        border: '2px solid #ffff00',
        background: '#0a0a0a',
      }}>
        <div style={{
          color: '#ffff00',
          fontFamily: 'monospace',
          marginBottom: '10px',
          fontSize: '12px',
        }}>
          🛠️ DEV MODE - Guild Hall Test Route
        </div>
        <GuildHallView
          partyState={partyState}
          onPartyStateChange={handlePartyStateChange}
          onNavigate={handleNavigate}
          resourceManager={resourceManager}
        />
        <div style={{
          color: '#888888',
          fontFamily: 'monospace',
          marginTop: '10px',
          fontSize: '10px',
        }}>
          Check console for state changes and navigation events
        </div>
      </div>
    </div>
  );
};
```


**Acceptance Criteria**:
- [ ] Component created and compiles
- [ ] ResourceManager created and cached with useMemo
- [ ] Resources load on mount
- [ ] Loading screen displays while resources load
- [ ] GuildHallView renders after resources load
- [ ] Party state changes logged to console
- [ ] Navigation attempts show alert (no actual navigation)
- [ ] No TypeScript errors

---

### Task 3.4: Add /dev/guild-hall Route to App.tsx

**File**: `react-app/src/App.tsx`

**Changes**:

1. **Add import** (add near top with other imports):
```typescript
import { GuildHallTestRoute } from './components/guild/GuildHallTestRoute'
```

2. **Add route** (add in the dev-only routes section, around line 55):
```typescript
{/* Development-only route for testing Guild Hall */}
{import.meta.env.DEV && (
  <Route path="/dev/guild-hall" element={<GuildHallTestRoute />} />
)}
```

**Full context** (for reference):
```typescript
{/* Development-only routes */}
{import.meta.env.DEV && (
  <>
    <Route path="/combat/:encounterId" element={<CombatViewRoute />} />
    <Route path="/title" element={<TitleScreen />} />
  </>
)}

{/* Development-only route for developer panel */}
{import.meta.env.DEV && (
  <Route path="/dev" element={<DevRoute />} />
)}

{/* Development-only route for testing first-person exploration */}
{import.meta.env.DEV && (
  <Route path="/dev/test/:mapId" element={<FirstPersonTestRoute />} />
)}

{/* Development-only route for testing Guild Hall */}
{import.meta.env.DEV && (
  <Route path="/dev/guild-hall" element={<GuildHallTestRoute />} />
)}
```

**Acceptance Criteria**:
- [ ] Import added to App.tsx
- [ ] Route added to dev-only routes section
- [ ] Can navigate to `http://localhost:5173/dev/guild-hall` (or appropriate port)
- [ ] Guild Hall test route loads and renders
- [ ] No TypeScript errors
- [ ] No console errors on route load

---

## Phase 5: Party Management UI

**Goal**: Implement party member and roster character cards with interaction handlers

**Estimated Time**: 3-4 hours

### Task 5.1: Create PartyMemberCard Renderer

**File**: `react-app/src/components/guild/renderers/PartyMemberCard.ts`

**Implementation**:
```typescript
import type { CombatUnit } from '../../../models/combat/CombatUnit';
import { GuildHallConstants as C } from '../../../constants/GuildHallConstants';
import { SpriteRenderer } from '../../../utils/SpriteRenderer';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';

export interface PartyMemberCardOptions {
  x: number;
  y: number;
  isSelected?: boolean;
  isHovered?: boolean;
  showRemoveButton?: boolean;
}

export class PartyMemberCardRenderer {
  static render(
    ctx: CanvasRenderingContext2D,
    member: CombatUnit,
    options: PartyMemberCardOptions,
    spriteImages: Map<string, HTMLImageElement>,
    fontAtlasImage: HTMLImageElement
  ): void {
    const { x, y, isSelected, isHovered, showRemoveButton } = options;
    const card = C.PARTY_MEMBER_CARD;

    // Draw background
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, card.WIDTH, card.HEIGHT);

    // Draw border
    if (isSelected) {
      ctx.strokeStyle = card.BORDER_SELECTED;
      ctx.lineWidth = 2;
    } else if (isHovered) {
      ctx.strokeStyle = card.BORDER_HOVER;
      ctx.lineWidth = 1;
    } else {
      ctx.strokeStyle = card.BORDER_NORMAL;
      ctx.lineWidth = 1;
    }
    ctx.strokeRect(x, y, card.WIDTH, card.HEIGHT);
    ctx.lineWidth = 1;

    // ⚠️ RENDERING GUIDELINE: Use SpriteRenderer + round coordinates!
    SpriteRenderer.renderSprite(
      ctx,
      member.spriteId,
      Math.floor(x + card.PADDING),
      Math.floor(y + card.PADDING),
      spriteImages,
      2 // scale
    );

    // ⚠️ RENDERING GUIDELINE: Use FontAtlasRenderer for all text!
    FontAtlasRenderer.renderText(
      ctx,
      member.name,
      Math.floor(x + card.SPRITE_SIZE + card.PADDING * 2),
      Math.floor(y + card.PADDING),
      '7px-04b03',
      fontAtlasImage,
      card.NAME_COLOR
    );

    // Render class
    FontAtlasRenderer.renderText(
      ctx,
      member.getClass().name,
      Math.floor(x + card.SPRITE_SIZE + card.PADDING * 2),
      Math.floor(y + card.PADDING + 8),
      '7px-04b03',
      fontAtlasImage,
      card.CLASS_COLOR
    );

    // Render level (TODO: calculate from totalExperience)
    const level = 1;
    FontAtlasRenderer.renderText(
      ctx,
      `Lv. ${level}`,
      Math.floor(x + card.SPRITE_SIZE + card.PADDING * 2),
      Math.floor(y + card.PADDING + 16),
      '7px-04b03',
      fontAtlasImage,
      card.LEVEL_COLOR
    );

    // Render HP bar
    const hpPercent = member.currentHealth / member.getMaxHealth();
    this.renderStatBar(
      ctx,
      Math.floor(x + card.SPRITE_SIZE + card.PADDING * 2),
      Math.floor(y + card.PADDING + 24),
      card.BAR_WIDTH,
      card.BAR_HEIGHT,
      hpPercent,
      card.HP_BAR_COLOR
    );

    // Render MP bar
    const mpPercent = member.currentMana / member.getMaxMana();
    this.renderStatBar(
      ctx,
      Math.floor(x + card.SPRITE_SIZE + card.PADDING * 2),
      Math.floor(y + card.PADDING + 28),
      card.BAR_WIDTH,
      card.BAR_HEIGHT,
      mpPercent,
      card.MANA_BAR_COLOR
    );

    // Render remove button (if hovered)
    if (showRemoveButton) {
      FontAtlasRenderer.renderText(
        ctx,
        '×',
        Math.floor(x + card.WIDTH - 12),
        Math.floor(y + card.PADDING),
        '7px-04b03',
        fontAtlasImage,
        card.REMOVE_BUTTON_COLOR
      );
    }
  }

  private static renderStatBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    percent: number,
    color: string
  ): void {
    // Draw background
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y, width, height);

    // Draw fill
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width * percent, height);

    // Draw border
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(x, y, width, height);
  }

  static isRemoveButtonHovered(
    mouseX: number,
    mouseY: number,
    cardX: number,
    cardY: number
  ): boolean {
    const card = C.PARTY_MEMBER_CARD;
    const buttonX = cardX + card.WIDTH - 12;
    const buttonY = cardY + card.PADDING;
    const buttonSize = 12;

    return (
      mouseX >= buttonX &&
      mouseX <= buttonX + buttonSize &&
      mouseY >= buttonY &&
      mouseY <= buttonY + buttonSize
    );
  }
}
```

**Acceptance Criteria**:
- [ ] Card renders with correct layout
- [ ] Sprite renders at 2× scale using SpriteRenderer
- [ ] Name, class, level render using FontAtlasRenderer
- [ ] HP/MP bars render with correct percentages
- [ ] Border changes based on state (normal/hover/selected)
- [ ] Remove button shows on hover
- [ ] No `ctx.fillText()` or `ctx.drawImage()` used

---

### Task 5.2: Create RosterCharacterCard Renderer

**File**: `react-app/src/components/guild/renderers/RosterCharacterCard.ts`

**Implementation**: Similar to PartyMemberCard but:
- Smaller size (192×24)
- 1× sprite scale
- Add button instead of remove button
- Simplified layout

**Acceptance Criteria**:
- [ ] Card renders with correct layout (192×24)
- [ ] Sprite renders at 1× scale using SpriteRenderer
- [ ] Name, class, level render using FontAtlasRenderer
- [ ] Add button shows on hover
- [ ] Background changes on hover/selected
- [ ] No `ctx.fillText()` or `ctx.drawImage()` used

---

### Task 5.3: Implement Mouse Input Handling

**File**: `react-app/src/components/guild/GuildHallView.tsx`

**Implementation**:
```typescript
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

  // Check active party panel
  const activeParty = guildManager.getActiveParty();
  for (let i = 0; i < activeParty.length; i++) {
    const cardY = C.ACTIVE_PARTY_PANEL.y + 24 + (i * 40);
    const cardX = C.ACTIVE_PARTY_PANEL.x + 4;

    // Check if remove button clicked
    if (PartyMemberCardRenderer.isRemoveButtonHovered(mouseX, mouseY, cardX, cardY)) {
      guildManager.removeFromParty(activeParty[i].id);
      return;
    }

    // Check if card clicked (select)
    if (
      mouseX >= cardX &&
      mouseX <= cardX + C.PARTY_MEMBER_CARD.WIDTH &&
      mouseY >= cardY &&
      mouseY <= cardY + C.PARTY_MEMBER_CARD.HEIGHT
    ) {
      setSelectedPartyMemberId(activeParty[i].id);
      return;
    }
  }

  // Check guild roster panel
  const availableRoster = guildManager.getAvailableRoster();
  for (let i = 0; i < availableRoster.length; i++) {
    const cardY = C.GUILD_ROSTER_PANEL.y + 24 + (i * 28);
    const cardX = C.GUILD_ROSTER_PANEL.x + 4;

    // Check if add button clicked
    if (RosterCharacterCardRenderer.isAddButtonHovered(mouseX, mouseY, cardX, cardY)) {
      const success = guildManager.addToParty(availableRoster[i].id);
      if (!success) {
        // Show error message (party full)
        console.warn(C.ERROR_PARTY_FULL);
      }
      return;
    }

    // Check if card clicked (select)
    if (
      mouseX >= cardX &&
      mouseX <= cardX + C.ROSTER_CHARACTER_CARD.WIDTH &&
      mouseY >= cardY &&
      mouseY <= cardY + C.ROSTER_CHARACTER_CARD.HEIGHT
    ) {
      setSelectedRosterCharId(availableRoster[i].id);
      return;
    }
  }

  // Check action buttons
  if (isCreateButtonHovered(mouseX, mouseY)) {
    setShowCreateModal(true);
    return;
  }

  if (isReturnButtonHovered(mouseX, mouseY)) {
    onNavigate('menu');
    return;
  }
};

const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
  // ⚠️ EVENT HANDLING GUIDELINE: NEVER call renderFrame() here!
  // Only update state - the useEffect render loop will handle rendering

  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (event.clientX - rect.left) * scaleX;
  const mouseY = (event.clientY - rect.top) * scaleY;

  // Update hover states (state changes will trigger re-render via useEffect)
  // Do NOT call renderFrame() manually!
  updateHoverStates(mouseX, mouseY);
};
```

**Acceptance Criteria**:
- [ ] Click on party member card selects it
- [ ] Click on remove button removes from party
- [ ] Click on roster card selects it
- [ ] Click on add button adds to party
- [ ] Click on Create Character opens modal (placeholder for now)
- [ ] Click on Return navigates to menu
- [ ] Mouse coordinates scaled correctly
- [ ] No `renderFrame()` calls in mouse handlers

---

## Completion Checklist

### Phase 3: GuildHallView Base
- [ ] GuildHallConstants created with all layout/color constants
- [ ] GuildHallView component created
- [ ] Canvas renders at 384×216
- [ ] Resources load correctly (fonts from ResourceManager, sprites directly)
- [ ] All text uses FontAtlasRenderer
- [ ] Font/sprite lookups cached in refs
- [ ] GuildRosterManager cached with useMemo
- [ ] Image smoothing disabled
- [ ] GuildHallTestRoute component created
- [ ] `/dev/guild-hall` route added to App.tsx
- [ ] Can access test route in browser
- [ ] No TypeScript errors

### Phase 5: Party Management UI
- [ ] PartyMemberCardRenderer implemented
- [ ] RosterCharacterCardRenderer implemented
- [ ] All card rendering uses SpriteRenderer/FontAtlasRenderer
- [ ] All coordinates rounded with Math.floor()
- [ ] Mouse click handler implemented
- [ ] Mouse move handler implemented (no renderFrame calls)
- [ ] Coordinate transformation correct
- [ ] Party add/remove works
- [ ] Selection states work
- [ ] No TypeScript errors

### Visual Verification
- [ ] Title displays "Guild Hall"
- [ ] Active party panel shows 4 slots
- [ ] Guild roster panel shows available characters
- [ ] Empty states show placeholder text
- [ ] Character cards render correctly
- [ ] Borders render correctly
- [ ] Buttons visible

---

## Next Steps

Once this part is complete:

1. **Access Test Route**: Navigate to `http://localhost:5173/dev/guild-hall` in your browser
2. **Manual Test**: Verify UI renders (empty party slots, empty roster message)
3. **Test Interaction**: Try clicking empty slots (should do nothing yet - cards implemented in Phase 5)
4. **Create Test Characters**: Use browser console to test GuildRosterManager:
   ```javascript
   // This will be available in the console logs when state changes
   // You can manually trigger character creation via console if needed for testing
   ```
5. **Review**: Check code against guidelines (no ctx.fillText, no ctx.drawImage, etc.)
6. **Commit**: Commit with message like "feat: Add Guild Hall UI with test route (Part 2)"
7. **Proceed**: Move to [Part3-CharacterCreationModal.md](Part3-CharacterCreationModal.md)

**Testing Tips**:
- The test route logs all party state changes to console
- Navigation attempts show alerts (no actual navigation in test mode)
- Check browser DevTools console for resource loading status
- Verify all text is crisp (not blurry) - confirms FontAtlasRenderer usage

---

**End of Part 2**
