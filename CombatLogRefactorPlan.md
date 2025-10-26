# Combat Log Animation Performance Refactor Plan

## Problem Statement

The CombatLogManager currently re-renders the entire message history buffer on every animation frame, causing performance issues and visible delays in text rendering. The system calculates animation speed based on characters per second, but the overhead of re-parsing tags, re-measuring text, and re-rendering all messages creates lag.

**Root Cause**: The `update()` method sets `bufferDirty = true` on every frame during animation (line 533), which forces `renderToBuffer()` to re-render ALL visible messages, re-parse ALL tags, and re-measure ALL text segments.

## Solution: Two-Buffer System (Option A)

Split rendering into two layers:
1. **Static Buffer** - Pre-rendered complete (non-animating) messages that never change
2. **Animated Layer** - Only the currently animating message, rendered on-demand during composition

### Key Benefits
- ✅ Aligns with GeneralGuidelines.md: "Don't recreate heavy objects every frame"
- ✅ Eliminates redundant parsing and rendering of static content
- ✅ Maintains smooth animation speed calculation (chars per second)
- ✅ Uses off-screen canvases effectively (existing best practice)

## Implementation Plan

### Phase 1: Add Pre-Parsed Segment Storage

**Goal**: Parse tags once when message is added, not every frame.

**Files to Modify**:
- [CombatLogManager.ts](react-app/src/models/combat/CombatLogManager.ts)

**Changes**:
1. Create new interface for stored messages:
   ```typescript
   interface StoredMessage {
     rawText: string;
     segments: TextSegment[];
     plainTextLength: number;
   }
   ```

2. Replace `messages: string[]` with `messages: StoredMessage[]` (line 36)

3. Update `addMessage()` to pre-parse and store segments:
   ```typescript
   const segments = this.parseTags(message);
   const plainTextLength = this.getPlainTextLength(message);
   this.messages.push({ rawText: message, segments, plainTextLength });
   ```

4. Update all methods that access `this.messages` to use the new structure

**Benefit**: Eliminates tag parsing during animation frames.

---

### Phase 2: Implement Static Message Buffer

**Goal**: Render completed messages once to a dedicated buffer that contains ALL messages.

**Files to Modify**:
- [CombatLogManager.ts](react-app/src/models/combat/CombatLogManager.ts)

**Changes**:
1. Add new private fields:
   ```typescript
   private staticBuffer: HTMLCanvasElement | null = null;
   private staticBufferCtx: CanvasRenderingContext2D | null = null;
   private staticBufferDirty: boolean = true;
   private lastStaticMessageCount: number = 0;
   ```

2. Create new method `renderStaticMessages()`:
   - Renders ALL completed messages (up to maxMessages) to a tall buffer
   - Buffer height = `maxMessages * lineHeight` (can be 800+ pixels tall)
   - Each message rendered at its absolute Y position (message index * lineHeight)
   - Only re-renders when:
     - Animation completes (message becomes static)
     - New message added to queue
     - Font or width changes
     - **NOT when scroll position changes** (just crop differently)
   - Stores result in `staticBuffer`

3. Split `renderToBuffer()` logic:
   - Move static message rendering to `renderStaticMessages()`
   - Keep animation logic for composition

**Benefit**: Static content rendered once per message instead of 60+ times per second.
**Scrolling**: Works by cropping different regions of the static buffer during composition.

---

### Phase 3: Optimize Animation Rendering with Scrolling Support

**Goal**: Composite static buffer with animating message, respecting scroll position.

**Files to Modify**:
- [CombatLogManager.ts](react-app/src/models/combat/CombatLogManager.ts)

**Changes**:
1. Add new method `renderAnimatingMessage()`:
   - Takes the animating message's pre-parsed segments
   - Calculates visible character count based on `animationProgress`
   - Renders to a small temporary canvas (1 line tall, width wide)
   - Returns the temporary canvas

2. Modify `render()` method (main composition):
   ```typescript
   render(ctx, x, y, width, height, fontId, fontAtlasImage, spriteImages, spriteSize) {
     // 1. Render ALL static messages to staticBuffer (only if dirty)
     this.renderStaticMessages(...);

     // 2. Calculate which messages are visible based on scroll
     const startIdx = Math.max(0, this.messages.length - this.config.bufferLines - this.scrollOffset);
     const endIdx = this.messages.length - this.scrollOffset;

     // 3. Copy visible portion of static buffer to main canvas
     //    Skip the animating message's line if it's in the visible range
     for (let i = startIdx; i < endIdx; i++) {
       if (i === this.animatingMessageIndex) continue; // Skip, will render separately
       const sourceY = i * this.config.lineHeight;
       const destY = y + ((i - startIdx) * this.config.lineHeight);
       ctx.drawImage(this.staticBuffer, 0, sourceY, width, lineHeight, x, destY, width, lineHeight);
     }

     // 4. If animating message is visible, render it
     if (this.animatingMessageIndex >= startIdx &&
         this.animatingMessageIndex < endIdx &&
         this.animationProgress < 1) {
       const animCanvas = this.renderAnimatingMessage(...);
       const destY = y + ((this.animatingMessageIndex - startIdx) * this.config.lineHeight);
       ctx.drawImage(animCanvas, 0, 0, width, lineHeight, x, destY, width, lineHeight);
     }
   }
   ```

3. Remove old `bufferDirty` flag system
4. Remove old `renderToBuffer()` method

**Benefit**: Eliminates the entire buffer redraw during animation. Scrolling works by copying different lines from the static buffer.

---

### Phase 4: Optimize Animation Update Logic

**Goal**: Ensure `update()` doesn't trigger unnecessary work.

**Files to Modify**:
- [CombatLogManager.ts](react-app/src/models/combat/CombatLogManager.ts)

**Changes**:
1. Modify `update()` method:
   ```typescript
   update(deltaTime: number): void {
     if (this.animatingMessageIndex >= 0 && this.animationProgress < 1) {
       this.animationProgress += deltaTime / this.animationDuration;

       if (this.animationProgress >= 1) {
         this.animationProgress = 1;
         this.animatingMessageIndex = -1;

         // Mark static buffer dirty - completed message becomes static
         this.staticBufferDirty = true;

         // Process queue
         if (this.messageQueue.length > 0) {
           const next = this.messageQueue.shift()!;
           this.addMessage(next.message, next.charsPerSecond);
         }
       }

       // NO bufferDirty flag - animation renders directly during composition
     }
   }
   ```

2. Remove `this.bufferDirty = true` from `update()` (line 533)

**Benefit**: Animation updates only modify `animationProgress`, no rendering overhead.

---

### Phase 5: Update Scroll and Queue Logic

**Goal**: Ensure scroll and message queue trigger appropriate buffer updates.

**Files to Modify**:
- [CombatLogManager.ts](react-app/src/models/combat/CombatLogManager.ts)

**Changes**:
1. Update scroll methods:
   - **Remove** `bufferDirty = true` (scrolling just changes composition, not buffer)
   - Scrolling now just changes which lines are copied from staticBuffer
2. Update `addMessage()` to mark static buffer dirty when new message added
3. Update `clear()` to reset static buffer

**Benefit**: Scrolling becomes nearly free - just different drawImage() calls, no re-rendering.

---

## Testing Strategy

### Manual Testing
1. **Performance Test**: Add 20 messages rapidly and verify smooth animation
2. **Scroll Test**: Verify scrolling doesn't break during animation
3. **Queue Test**: Verify long queue triggers speed-up correctly
4. **Visual Test**: Verify no rendering artifacts or glitches

### Edge Cases
- Animation completes while scrolled up
- Multiple messages queued with different speeds
- Font or canvas width changes during animation
- Clearing log during animation

### Success Criteria
- No visible lag between character renders
- Animation speed feels consistent with configured CPS
- Static messages never re-render during animation
- All existing functionality (scrolling, colors, sprites) works

---

## Rollback Plan

If issues arise during implementation:
1. Keep old code commented out rather than deleted
2. Add feature flag to switch between old and new rendering
3. Each phase is independently reversible

---

## Performance Expectations

### Before (Current System)
- **Per frame during animation**: Parse ~20 messages, measure ~100+ text segments, render full buffer
- **Frame cost**: ~2-5ms (varies with message count)

### After (Two-Buffer System)
- **Per frame during animation**: Render 1 message's visible characters only
- **Frame cost**: ~0.1-0.3ms (1 message only)
- **Expected improvement**: 10-20x reduction in animation frame cost

---

## Notes

- This is the third attempt at fixing this animation
- Previous attempts may have focused on timing/speed rather than rendering architecture
- The two-buffer approach is fundamentally different: it separates **what changes** (animating message) from **what doesn't** (completed messages)
- Aligns with existing GeneralGuidelines.md performance patterns
- **Scrolling support**: The static buffer contains ALL messages at absolute positions. Scrolling just changes which portion we copy during composition. This means scrolling is "free" - no re-rendering needed.

---

## Questions/Decisions Needed

None - plan is ready to execute. All information available in existing codebase.
