# VibeDC Conversation Starter Templates

Quick conversation starters for AI agents working on VibeDC combat system.

---

## Template 1: Small Task / Bug Fix

```
I'm working on [brief task description].

Use CombatHierarchy.md Quick Reference to orient yourself,
then read only relevant sections as needed.

Guidelines: Read selectively - don't load full files upfront.
```

**Example:**
```
I'm working on fixing the hover state in ActionsMenuContent.

Use CombatHierarchy.md Quick Reference to orient yourself,
then read only relevant sections as needed.

Guidelines: Read selectively - don't load full files upfront.
```

---

## Template 2: Feature Implementation

```
I need to implement [feature name]: [1-2 sentence description]

Start with CombatHierarchy.md Quick Reference, then read sections
relevant to [mention component types: phase handlers/panels/rendering/etc.].

Reference GeneralGuidelines.md sections for [rendering/state/events/performance]
patterns as needed.

Use guidelines as references - read selectively based on the task.
```

**Example:**
```
I need to implement ability targeting system: Allow players to select
targets for abilities during unit turn phase.

Start with CombatHierarchy.md Quick Reference, then read sections
relevant to phase handlers, turn strategies, and panel content.

Reference GeneralGuidelines.md sections for event handling and
state management patterns as needed.

Use guidelines as references - read selectively based on the task.
```

---

## Template 3: Code Review / Pre-Merge

```
Review the changes in [branch/PR/files] for merge readiness.

Check compliance with:
- CombatHierarchy.md architecture patterns
- GeneralGuidelines.md coding standards

Focus on: [rendering/state/events/performance/specific concerns]

For this review, reading full guidelines is appropriate.
```

**Example:**
```
Review the changes in ability-equipment-panel branch for merge readiness.

Check compliance with:
- CombatHierarchy.md architecture patterns
- GeneralGuidelines.md coding standards

Focus on: panel caching, hover state management, and WeakMap usage.

For this review, reading full guidelines is appropriate.
```

---

## Template 4: Exploration / Understanding

```
I need to understand how [system/feature] works in the combat system.

Use CombatHierarchy.md Navigation Index to find relevant sections.
Search for [keywords] in the documentation.

No implementation needed - this is research only.
Guidelines: Read targeted sections, not full files.
```

**Example:**
```
I need to understand how the action timer phase works in the combat system.

Use CombatHierarchy.md Navigation Index to find relevant sections.
Search for "ActionTimerPhaseHandler" and "discrete ticks" in the documentation.

No implementation needed - this is research only.
Guidelines: Read targeted sections, not full files.
```

---

## Template 5: New Phase Handler

```
Create a new phase handler: [phase name]

Purpose: [1-2 sentence description]

Required behavior:
- [key behavior 1]
- [key behavior 2]
- [key behavior 3]

Read CombatHierarchy.md sections:
- Quick Reference
- Phase Handlers
- Data Flow Summary

Read GeneralGuidelines.md sections:
- State Management
- Rendering Rules
- Event Handling
```

**Example:**
```
Create a new phase handler: Item Selection Phase

Purpose: Allow players to select and use items from inventory during combat
before unit turns begin.

Required behavior:
- Display inventory panel with item list
- Handle item selection and target selection
- Transition to action-timer phase after item use
- Support canceling back to previous phase

Read CombatHierarchy.md sections:
- Quick Reference
- Phase Handlers
- Data Flow Summary

Read GeneralGuidelines.md sections:
- State Management
- Rendering Rules
- Event Handling
```

---

## Template 6: Panel Content Implementation

```
Implement panel content: [panel name]

Purpose: [1-2 sentence description]
Displays: [what information/UI elements]
Interactions: [click/hover behaviors]

Read CombatHierarchy.md sections:
- Quick Reference
- Layout & UI Management ’ managers/panels/

Read GeneralGuidelines.md sections:
- Rendering Rules
- Event Handling
- State Management (for caching patterns)
```

**Example:**
```
Implement panel content: StatusEffectsContent

Purpose: Display active status effects on selected unit with tooltips
Displays: Effect icons, durations, stacked effect counts
Interactions: Hover for effect descriptions, click to inspect details

Read CombatHierarchy.md sections:
- Quick Reference
- Layout & UI Management ’ managers/panels/

Read GeneralGuidelines.md sections:
- Rendering Rules
- Event Handling
- State Management (for caching patterns)
```

---

## Template 7: Performance Issue

```
Investigate performance issue: [brief description]

Symptoms: [what's slow/laggy]
Suspected cause: [initial hypothesis if any]

Read GeneralGuidelines.md Performance Patterns section.
Read CombatHierarchy.md sections on [relevant systems].

Focus on identifying allocations, unnecessary re-renders, or missing caches.
```

**Example:**
```
Investigate performance issue: Turn order animation stuttering

Symptoms: Slide animation drops frames when 8+ units in combat
Suspected cause: Per-frame allocations or missing component cache

Read GeneralGuidelines.md Performance Patterns section.
Read CombatHierarchy.md sections on TurnOrderRenderer and ActionTimerPhaseHandler.

Focus on identifying allocations, unnecessary re-renders, or missing caches.
```

---

## Template 8: Refactoring

```
Refactor [component/system]: [brief description]

Goal: [what you want to improve]
Constraints: [backward compatibility/performance/etc.]

Read CombatHierarchy.md sections on [affected systems].
Read GeneralGuidelines.md for relevant patterns.

Ensure changes follow established architecture and patterns.
```

**Example:**
```
Refactor movement system: Extract pathfinding logic into reusable utility

Goal: Allow AI and abilities to reuse pathfinding without duplicating code
Constraints: Must maintain exact same movement behavior for player units

Read CombatHierarchy.md sections on Turn Strategies and Utilities.
Read GeneralGuidelines.md for relevant patterns.

Ensure changes follow established architecture and patterns.
```

---

## Quick Copy-Paste (Minimal)

For truly simple tasks, use this ultra-minimal starter:

```
Task: [one sentence]
Guidelines: Read selectively from CombatHierarchy.md and GeneralGuidelines.md.
```

**Example:**
```
Task: Fix typo in UnitInfoContent helper text for "Courage" stat.
Guidelines: Read selectively from CombatHierarchy.md and GeneralGuidelines.md.
```

---

## Tips for Effective Templates

1. **Be specific about sections** - Don't say "read the guidelines", say "read CombatHierarchy.md Quick Reference section"

2. **Set scope** - Clarify if this is research, implementation, or review

3. **Mention token budget** - "Read selectively" vs "reading full guidelines is appropriate"

4. **Guide to relevant sections** - List specific section names to read

5. **One-sentence task** - Keep the core task description brief

6. **Example over explanation** - Show what you want, don't just describe it

---

## Anti-Patterns to Avoid

L **Don't say**: "Read all the guidelines"
 **Instead say**: "Use CombatHierarchy.md Quick Reference, then read [specific sections]"

L **Don't say**: "Implement this feature" (vague)
 **Instead say**: "Implement [feature name]: [1-2 sentence description with key behaviors]"

L **Don't say**: "Fix this" (no context)
 **Instead say**: "Fix [specific issue] in [specific file/component]"

L **Don't say**: "Make it better" (unclear)
 **Instead say**: "Refactor [component] to [specific improvement goal]"

---

## Customization

Feel free to mix and match elements from templates:

```
[Task description from Template 1]
+ [Section guidance from Template 2]
+ [Focus areas from Template 7]
= Custom template for your specific needs
```

**Example custom mix:**
```
I'm working on fixing animation stutter in TurnOrderRenderer.

Start with CombatHierarchy.md sections on TurnOrderRenderer and
ActionTimerPhaseHandler.

Reference GeneralGuidelines.md Performance Patterns section.

Focus on: Identifying per-frame allocations and missing component caches.

Guidelines: Read selectively - don't load full files upfront.
```

---

**Remember**: The goal is to give AI agents just enough context to start efficiently, not to frontload all documentation. Keep it brief, specific, and targeted.
