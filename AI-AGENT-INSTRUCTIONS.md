# Instructions for AI Agents Working on VibeDC

## Overview

This project has comprehensive reference documentation for the combat system. **Do not read all documentation upfront** - use it selectively to avoid wasting tokens.

## Reference Documents

### 1. [CombatHierarchy.md](./CombatHierarchy.md)
- **Purpose**: Architecture reference - file structure, data flow, component relationships
- **Size**: ~18,000 tokens
- **Usage**: Start with Quick Reference section, then read specific sections as needed
- **When to use**: Understanding combat system architecture, finding specific files/components

### 2. [GeneralGuidelines.md](./GeneralGuidelines.md)
- **Purpose**: Coding patterns, best practices, common pitfalls
- **Size**: ~20,000 tokens
- **Usage**: Read specific sections based on task type (rendering, state, events, performance)
- **When to use**: Implementing features, debugging issues, code review

## Recommended Workflow

### For Small Tasks (< 50 lines of changes)
```
1. Read CombatHierarchy.md Quick Reference section only (~200 tokens)
2. Search for relevant file in CombatHierarchy.md
3. Read that specific section only (~500-1,000 tokens)
4. Implement changes
5. Reference GeneralGuidelines.md sections if needed

Total tokens: ~1,500-3,000
```

### For Medium Features (50-200 lines)
```
1. Read CombatHierarchy.md Quick Reference + Navigation Index (~500 tokens)
2. Read 2-3 relevant sections from CombatHierarchy.md (~3,000 tokens)
3. Read relevant sections from GeneralGuidelines.md (~2,000-5,000 tokens)
4. Implement changes

Total tokens: ~5,500-8,500
```

### For Large Features (200+ lines) or Code Reviews
```
1. Read CombatHierarchy.md Quick Reference + Navigation Index (~500 tokens)
2. Read multiple relevant sections from CombatHierarchy.md (~5,000-8,000 tokens)
3. Read full GeneralGuidelines.md or targeted sections (~5,000-20,000 tokens)
4. Read Data Flow Summary in CombatHierarchy.md if needed (~1,000 tokens)
5. Implement or review

Total tokens: ~11,500-29,500
```

## What the Human Will Say

When you receive this project, the human will typically say one of:

### Short version:
> "Use the guidelines as references - read selectively based on the task."

### Detailed version:
> "Use CombatHierarchy.md and GeneralGuidelines.md as references. Start with CombatHierarchy.md Quick Reference, then read only the sections relevant to [specific task]. Do NOT read entire files upfront."

## Key Principles

### ✅ DO:
- Read CombatHierarchy.md Quick Reference first
- Use Ctrl+F / search to find specific sections
- Read only sections relevant to current task
- Use Navigation Index to find what you need
- Ask human which sections to focus on if unclear

### ❌ DON'T:
- Read entire files before starting work
- Include full files in every conversation
- Treat documentation as required reading
- Load sections unrelated to current task
- Waste tokens on irrelevant content

## Section Quick Links

### CombatHierarchy.md Sections:
- Quick Reference - Common tasks mapped to files
- Navigation Index - Task/component type to section mapping
- Core State & Data - CombatState, CombatUnit, etc.
- Phase Handlers - Deployment, ActionTimer, UnitTurn
- Layout & UI Management - Panels, buttons, renderers
- Data Flow Summary - How components connect
- Event Handling Architecture - Input handling
- Performance Patterns - Caching strategies

### GeneralGuidelines.md Sections:
- Rendering Rules - Canvas, SpriteRenderer, FontAtlasRenderer
- State Management - WeakMap patterns, preservation
- Event Handling - Mouse events, coordinates
- Performance Patterns - Optimization techniques
- Common Pitfalls - Real bugs to avoid

## Example: Efficient Token Usage

**Bad approach** (wastes tokens):
```
1. Read all of CombatHierarchy.md (18,000 tokens)
2. Read all of GeneralGuidelines.md (20,000 tokens)
3. Start working on "Add Reset Move button"
Total: 38,000 tokens before writing any code
```

**Good approach** (efficient):
```
Task: "Add Reset Move button to actions menu"

1. Read CombatHierarchy.md Quick Reference (200 tokens)
   → Found: "Add info panel content → Implement PanelContent interface"

2. Search CombatHierarchy.md for "ActionsMenuContent" (1,000 tokens)
   → Read that section only

3. Search GeneralGuidelines.md for "State Management" (2,000 tokens)
   → Read that section only

4. Implement the feature

Total: 3,200 tokens - saved 34,800 tokens (91% reduction)
```

## Token Budget Summary

| Task Complexity | Recommended Token Usage | What to Read |
|----------------|------------------------|--------------|
| Quick lookup | ~200 tokens | Quick Reference only |
| Single file change | ~2,000 tokens | Quick Ref + 1 section |
| Small feature | ~5,000 tokens | Quick Ref + 2-3 sections |
| Medium feature | ~8,000 tokens | Quick Ref + multiple sections |
| Large feature | ~15,000 tokens | Quick Ref + Data Flow + sections |
| Code review | ~20,000-30,000 tokens | Multiple files + full guidelines |

## Questions?

If you're an AI agent unsure which sections to read, ask the human:
> "I see this task involves [X]. Should I read CombatHierarchy.md sections on [Y] and GeneralGuidelines.md sections on [Z]?"

The human can guide you to the most relevant sections for efficient token usage.

---

**Remember**: These documents are **references**, not **required reading**. Read selectively and save tokens for actual implementation work.
