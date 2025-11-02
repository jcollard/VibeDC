# Ability System - Combat Integration Plan (Index)

**Version:** 2.0
**Created:** 2025-11-01
**Updated:** 2025-11-02 (Split into 4 focused implementation documents)
**Related:** [AbilitySystemOverview.md](AbilitySystemOverview.md), [StatModifierSystem.md](StatModifierSystem.md), [CombatHierarchy.md](../../CombatHierarchy.md), [GeneralGuidelines.md](../../GeneralGuidelines.md)

## Purpose

This is the **master index** for the Ability System Combat Integration. The implementation has been split into **4 focused documents** for easier implementation and testing.

**Compliance**: This plan follows all patterns documented in [GeneralGuidelines.md](../../GeneralGuidelines.md) and [CombatHierarchy.md](../../CombatHierarchy.md) for performance, caching, rendering, and combat integration.

## Scope

**IN SCOPE:**
- ✅ Passive ability stat modifier application during combat
- ✅ Action ability execution from combat menu
- ✅ Reaction ability triggers during combat events
- ✅ Movement ability triggers after movement phase
- ✅ Effect resolution system (damage, healing, stat modifiers, mana costs)
- ✅ Combat UI integration (ability menu, targeting, feedback)

**OUT OF SCOPE:**
- ❌ Learning abilities (XP spending, class-based learning) - **Separate feature**
- ❌ Assigning abilities to slots (outside combat, camp/rest screen) - **Separate feature**
- ❌ Equipment permissions (Dual Wield, Heavy Armor, Shield Bearer)
- ❌ Status effects (Stun, Confusion, Bleeding, etc.)
- ❌ Advanced damage modifiers beyond stat modifiers

## Implementation Documents

### [Part 1: Passive Abilities](AbilityIntegrationPlan-Part1-PassiveAbilities.md)

**Goal**: Auto-apply stat modifiers when passive abilities are assigned.

**Time Estimate**: 8-12 hours

**Key Features**:
- Update `HumanoidUnit.assignPassiveAbility()` to apply/remove modifiers
- Add `AbilityEffect` interface
- Parse effects from YAML
- Integration with StatModifier system (already complete)

**Dependencies**:
- ✅ StatModifierSystem.md (Phases 1-5 COMPLETE)

**Implementable Abilities** (4):
- Meat Shield (+50 HP)
- Fast (+3 Speed)
- Dodge (+10 Physical Evasion)
- Focused (+50 Mana)

**Start Here**: This is the **easiest part** and must be completed first.

---

### [Part 2: Action Abilities](AbilityIntegrationPlan-Part2-ActionAbilities.md)

**Goal**: Enable action abilities to be executed from the combat menu during unit turns.

**Time Estimate**: 20-28 hours

**Key Features**:
- Create `AbilityExecutor` for effect resolution
- Effect handlers (damage, healing, stat modifiers, mana cost)
- Ability selection menu (`AbilityMenuContent`)
- Targeting system with coordinate transformations
- Combat integration with `UnitTurnPhaseHandler`
- Animations and visual feedback (Z-ordering, cached buffers)
- Combat log integration with color coding

**Dependencies**:
- ✅ Part 1: Passive Abilities (MUST BE COMPLETE)

**Implementable Abilities** (10+):
- Heal (restore HP)
- Harm (magical damage)
- Strength (buff Physical Power)
- Weakness (debuff Physical Power)
- Reflexes (buff evasion)
- Sluggish (debuff Speed)
- Mesmerize (reset action timer)
- Leg Strike (damage + slow debuff)
- Throw Stone (ranged physical damage)
- Sneak Attack (conditional backstab)

**Performance Patterns**:
- ✅ WeakMap for per-unit tracking (duplicate name prevention)
- ✅ Cache UI components (hover state preservation)
- ✅ No renderFrame() in mouse handlers
- ✅ Z-ordering (render() before units, renderUI() after)
- ✅ Cache animation buffers

**This is the largest part** - take time to implement correctly.

---

### [Part 3: Reaction Abilities](AbilityIntegrationPlan-Part3-ReactionAbilities.md)

**Goal**: Trigger reaction abilities automatically when specific combat events occur.

**Time Estimate**: 8-12 hours

**Key Features**:
- Define reaction triggers (before/after attack)
- Create `ReactionHandler` for automatic execution
- Integrate with attack flow in `UnitTurnPhaseHandler`
- Dual-wield support (reactions trigger per weapon)
- Combat log integration

**Dependencies**:
- ✅ Part 2: Action Abilities (MUST BE COMPLETE)

**Implementable Abilities** (1):
- Repost (counter-attack after being attacked)

**Note**: Most reaction abilities require status effects or shield system (out of scope). Focus on **Repost** for Part 3.

**Dual-Wield Integration**:
- Per [CombatHierarchy.md](../../CombatHierarchy.md), reactions must trigger **per weapon**
- Dual-wield attack → 2 before-attack triggers → 2 attacks → 2 after-attack triggers

---

### [Part 4: Movement Abilities](AbilityIntegrationPlan-Part4-MovementAbilities.md)

**Goal**: Trigger movement abilities automatically after unit moves (or chooses not to move).

**Time Estimate**: 6-8 hours

**Key Features**:
- Define movement triggers (after-move, after-no-move)
- Create `MovementAbilityHandler` for automatic execution
- Integration with movement flow in `UnitTurnPhaseHandler`
- Per-tile scaling (heal 3 HP × tiles moved)
- Percentage-based effects (restore 10% mana)
- Combat log integration

**Dependencies**:
- ✅ Part 2: Action Abilities (MUST BE COMPLETE)

**Implementable Abilities** (3):
- Meditate (restore 10% mana when not moving)
- Regenerate (heal 3 HP per tile traveled)
- Power Walker (+2 Physical Power after moving)

**Note**: XP-based movement abilities (Journeyman) require XP system changes (out of scope).

---

## Implementation Order

**REQUIRED SEQUENCE**:

```
Part 1 (Passive)
    ↓
Part 2 (Action) ← LARGEST PART
    ↓
    ├─→ Part 3 (Reaction)
    └─→ Part 4 (Movement)
```

**Part 3 and Part 4 can be done in parallel** after Part 2 is complete.

## Total Time Estimate

**Total: 42-60 hours**

- Part 1: Passive Abilities (8-12 hours)
- Part 2: Action Abilities (20-28 hours)
- Part 3: Reaction Abilities (8-12 hours)
- Part 4: Movement Abilities (6-8 hours)

## Success Criteria

### All Parts Complete When:

- ✅ **Part 1**: Passive abilities auto-apply stat modifiers
- ✅ **Part 2**: Action abilities work in combat menu with targeting
- ✅ **Part 3**: Reaction abilities trigger automatically on attack events
- ✅ **Part 4**: Movement abilities trigger after movement phase
- ✅ All tests passing (50+ unit tests total)
- ✅ Combat log integration complete
- ✅ UI/UX polished
- ✅ Full combat scenario works end-to-end

## Compliance Checklist

Per [GeneralGuidelines.md](../../GeneralGuidelines.md) and [CombatHierarchy.md](../../CombatHierarchy.md):

- ✅ **WeakMap for per-unit tracking** - prevents duplicate name bugs (Part 2.1)
- ✅ **Cache UI components** - AbilityMenuContent cached for hover state (Part 2.3.1)
- ✅ **Z-ordering correct** - render() for underlays, renderUI() for overlays (Part 2.6)
- ✅ **No renderFrame() in mouse handlers** - state-only updates (Part 2.2.4)
- ✅ **Phase handler lifecycle** - stat modifiers in HumanoidUnit, not phase handler (Part 1.1.5)
- ✅ **Cache animation buffers** - off-screen canvas cached (Part 2.6.2)
- ✅ **Dual-wield support** - reactions trigger per weapon (Part 3.3.1)
- ✅ **Combat log color coding** - player green, enemy red (Part 2.1.6)
- ✅ **Serialization pattern** - don't save mid-animation (Part 2.1.7)
- ✅ **Coordinate transformations** - canvas → tile → validation (Part 2.5.1)

## Quick Reference: Implementable Abilities

**Total: 18+ abilities across all types**

### Passive (4)
- Meat Shield, Fast, Dodge, Focused

### Action (10+)
- Heal, Harm, Strength, Weakness, Reflexes, Sluggish, Mesmerize, Leg Strike, Throw Stone, Sneak Attack

### Reaction (1)
- Repost

### Movement (3)
- Meditate, Regenerate, Power Walker

## Getting Started

1. **Read** [AbilitySystemOverview.md](AbilitySystemOverview.md) for high-level design
2. **Verify** [StatModifierSystem.md](StatModifierSystem.md) Phases 1-5 are complete
3. **Start with** [Part 1: Passive Abilities](AbilityIntegrationPlan-Part1-PassiveAbilities.md)
4. **Proceed sequentially** through Parts 2, 3, 4

## Notes

### Why Split Into Parts?

The original plan was 1430 lines covering 3 major phases with 15+ subsections. This was overwhelming and difficult to implement in one attempt.

**Benefits of split approach**:
- ✅ Clear scope for each part
- ✅ Easier to track progress
- ✅ Can complete/test one part at a time
- ✅ Incremental implementation reduces risk
- ✅ Clearer dependencies
- ✅ Easier code reviews

### Future Enhancements (Not in Current Scope)

- Ability cooldowns (add cooldown tracking to unit state)
- Area-of-effect abilities (add AoE targeting system)
- Conditional abilities (add requirement checks)
- Combo abilities (add ability chaining system)
- Equipment-based abilities (add equipment integration)
- Status effect system (Stun, Confusion, Haste, etc.)

---

**Ready to implement?** Start with [Part 1: Passive Abilities](AbilityIntegrationPlan-Part1-PassiveAbilities.md)!
