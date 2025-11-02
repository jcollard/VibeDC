# Character Creation / Guild Hall - Implementation Guide

**Feature Version:** 1.0
**Last Updated:** 2025-11-01

## Quick Start

This feature allows players to create custom characters and manage their party in a Guild Hall screen. Implementation is broken into 4 parts for easier tracking and code review.

### Implementation Order

**Complete these in order:**

1. **[Part1-DataLayer.md](Part1-DataLayer.md)** (~4-6 hours)
   - ✅ Start here if you haven't begun
   - Updates GameState and serialization
   - Implements GuildRosterManager
   - Fully unit testable

2. **[Part2-GuildHallUI.md](Part2-GuildHallUI.md)** (~8-10 hours)
   - Requires Part 1 complete
   - Creates Guild Hall screen
   - Implements character cards and interaction
   - Visual testing starts here

3. **[Part3-CharacterCreationModal.md](Part3-CharacterCreationModal.md)** (~6-8 hours)
   - Requires Part 1-2 complete
   - Complex modal UI
   - Name input, sprite selection, class selection
   - Most rendering guideline violations happen here - be careful!

4. **[Part4-Integration.md](Part4-Integration.md)** (~4-6 hours)
   - Requires Part 1-3 complete
   - Integrates with GameView
   - Testing and polish
   - Final deployment checklist

**Total Time:** 22-30 hours

---

## Documents Overview

### Planning & Design
- **[CharacterCreationFeatureOverview.md](CharacterCreationFeatureOverview.md)** - Original feature design document
- **[CharacterCreationImplementationPlan.md](CharacterCreationImplementationPlan.md)** - Complete detailed plan (reference)
- **README.md** (this file) - Quick start guide

### Implementation Parts
- **[Part1-DataLayer.md](Part1-DataLayer.md)** - Data structures and business logic
- **[Part2-GuildHallUI.md](Part2-GuildHallUI.md)** - Main Guild Hall screen
- **[Part3-CharacterCreationModal.md](Part3-CharacterCreationModal.md)** - Character creation modal
- **[Part4-Integration.md](Part4-Integration.md)** - Integration, testing, polish

---

## Architecture Summary

### Data Flow

```
User → GuildHallView → GuildRosterManager → PartyState → GameView → Save/Load
                ↓
         CharacterCreationModal
```

### Key Components

1. **PartyState** (in GameState.ts)
   - `members: CombatUnit[]` - Active party (max 4)
   - `guildRoster: PartyMemberDefinition[]` - All created characters

2. **GuildRosterManager** (utils)
   - Creates characters with validation
   - Manages party membership
   - Callbacks for state changes

3. **GuildHallView** (React component)
   - Main screen (384×216 canvas)
   - Active party panel (left)
   - Guild roster panel (right)
   - Action buttons (bottom)

4. **CharacterCreationModal** (React component)
   - Name input (keyboard capture)
   - Sprite selection (8×4 grid)
   - Class selection (dropdown)
   - Create/Cancel buttons

---

## Critical Guidelines

### ⚠️ NEVER BREAK THESE RULES

1. **Text Rendering**:
   - ✅ ALWAYS: `FontAtlasRenderer.renderText()`
   - ❌ NEVER: `ctx.fillText()` or `ctx.strokeText()`

2. **Sprite Rendering**:
   - ✅ ALWAYS: `SpriteRenderer.renderSprite()`
   - ❌ NEVER: `ctx.drawImage()` on sprite sheets

3. **State Updates**:
   - ✅ ALWAYS: `state = { ...state, field: newValue }`
   - ❌ NEVER: `state.field = newValue`

4. **Performance**:
   - ❌ NEVER: Call `renderFrame()` in mouse move handlers
   - ✅ ALWAYS: Cache font/sprite lookups outside render loop

See [GeneralGuidelines.md](../../GeneralGuidelines.md) for full details.

---

## File Structure

```
react-app/src/
├── models/
│   └── game/
│       ├── GameState.ts                    (Updated: Part 1)
│       └── GameStateSerialization.ts       (Updated: Part 1)
├── utils/
│   └── GuildRosterManager.ts               (New: Part 1)
├── constants/
│   └── GuildHallConstants.ts               (New: Part 2)
├── components/
│   ├── game/
│   │   └── GameView.tsx                    (Updated: Part 4)
│   └── guild/
│       ├── GuildHallView.tsx               (New: Part 2)
│       ├── CharacterCreationModal.tsx      (New: Part 3)
│       └── renderers/
│           ├── PartyMemberCard.ts          (New: Part 2)
│           └── RosterCharacterCard.ts      (New: Part 2)
└── __tests__/
    ├── GuildRosterManager.test.ts          (New: Part 1)
    └── GameStateSerialization.guildRoster.test.ts  (New: Part 1)
```

---

## Testing Strategy

### Part 1 (Data Layer)
- **Unit tests**: 100% coverage for GuildRosterManager
- **Serialization tests**: Round-trip save/load
- **No UI required**: Can test completely in isolation

### Part 2 (Guild Hall UI)
- **Visual tests**: Render screens, verify layout
- **Interaction tests**: Click cards, test add/remove
- **Can use hardcoded test data**: Don't need Part 3 yet

### Part 3 (Character Creation Modal)
- **Input validation**: Name, sprite, class selection
- **Edge cases**: Duplicate names, invalid input
- **Visual verification**: All text crisp (no blurry rendering)

### Part 4 (Integration)
- **End-to-end**: Create character → add to party → save → load → combat
- **Cross-view**: Verify party appears in exploration and combat
- **Performance**: 60fps, no memory leaks

---

## Common Pitfalls

### 🚨 Rendering Violations (Most Common!)

**Problem**: Using `ctx.fillText()` or `ctx.drawImage()` directly
**Symptom**: Blurry text, incorrect sprite framing
**Fix**: Always use `FontAtlasRenderer` and `SpriteRenderer`

**How to detect**:
```bash
# Should return 0 results:
grep -r "ctx.fillText" src/components/guild/
grep -r "ctx.drawImage" src/components/guild/ | grep -v "SpriteRenderer"
```

### 🚨 State Mutations

**Problem**: Directly modifying state (`state.field = value`)
**Symptom**: UI doesn't update, stale closures
**Fix**: Always use spread operators (`{ ...state, field: value }`)

### 🚨 Performance Issues

**Problem**: Calling `renderFrame()` in mouse move handlers
**Symptom**: High CPU usage, 1000+ fps rendering
**Fix**: Update state only, let render loop handle rendering

---

## Progress Tracking

### Part 1: Data Layer
- [ ] GameState.ts updated
- [ ] GameStateSerialization.ts updated
- [ ] GuildRosterManager.ts created
- [ ] Unit tests pass
- [ ] Serialization tests pass

### Part 2: Guild Hall UI
- [ ] GuildHallConstants.ts created
- [ ] GuildHallView.tsx created
- [ ] PartyMemberCard.ts created
- [ ] RosterCharacterCard.ts created
- [ ] Mouse interaction works
- [ ] No rendering violations

### Part 3: Character Creation Modal
- [ ] CharacterCreationModal.tsx created
- [ ] Name input works
- [ ] Sprite selection works
- [ ] Class selection works
- [ ] Create/Cancel works
- [ ] No rendering violations

### Part 4: Integration & Polish
- [ ] GameView integration complete
- [ ] Save/load works
- [ ] Cross-view integration works
- [ ] All tests pass
- [ ] Performance verified (60fps)
- [ ] Code review complete

---

## Support & Help

### If you get stuck:

1. **Check the part document** - Each part has detailed acceptance criteria
2. **Review guidelines** - [GeneralGuidelines.md](../../GeneralGuidelines.md)
3. **Run tests** - `npm test` to verify data layer
4. **Visual inspection** - Look for blurry text (rendering violation)
5. **Check console** - Look for warnings/errors

### Common Questions:

**Q: Can I skip Part 1 and start with UI?**
A: No - Part 2 depends on GuildRosterManager from Part 1

**Q: Can I implement Parts 2 and 3 in parallel?**
A: Technically yes, but not recommended - Part 3 needs Part 2's GuildHallView

**Q: My text is blurry!**
A: You're using `ctx.fillText()` instead of `FontAtlasRenderer` - search and fix

**Q: State isn't updating!**
A: You're mutating state directly - use spread operators

**Q: Tests are failing!**
A: Check Part 1 - data layer must be solid before UI works

---

## Next Steps After Completion

Once all 4 parts are complete, consider these enhancements:

1. **Equipment Management** - Equip items in Guild Hall
2. **Character Stats Screen** - Detailed view with progression
3. **Class Change System** - Allow class changes with restrictions
4. **Character Deletion** - Remove characters from roster
5. **Sorting/Filtering** - Sort by level, class, name
6. **Custom Portraits** - Separate from combat sprite
7. **Biography System** - Character backstory field

---

**Good luck with implementation! Follow the parts in order and you'll have a fully functional system.**

For questions or issues, refer back to:
- [CharacterCreationImplementationPlan.md](CharacterCreationImplementationPlan.md) - Full detailed plan
- [GeneralGuidelines.md](../../GeneralGuidelines.md) - Rendering and architecture patterns
