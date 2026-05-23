---
name: skill-creator
description: Create, test, evaluate, and improve Claude skills through an iterative development workflow. Use when asked to build a new skill, create a SKILL.md, design skill evaluations, or optimize a skill's trigger description.
---

# Skill Creator

An iterative workflow for developing high-quality Claude skills.

## Development Stages

### 1. Capture Intent

Before writing anything, clarify:
- What should the skill do?
- When should it trigger? (specific phrases, file patterns, contexts)
- What does success look like?
- Are test cases needed?

### 2. Interview & Research

Ask about:
- Edge cases that should and shouldn't trigger the skill
- Output format preferences
- Dependencies on external tools or files
- Success criteria and quality bar

### 3. Write SKILL.md

Structure:
```yaml
---
name: skill-name
description: Clear, specific description for accurate triggering. Include trigger phrases and anti-triggers.
---

# Skill Name

[When to use this skill - one paragraph]

## Core Workflow

[Step-by-step instructions Claude will follow]

## Key Principles

[Critical behaviors and constraints]
```

**Description writing principles:**
- Be specific enough to trigger correctly, general enough not to miss cases
- Include examples of what SHOULD trigger it
- Include examples of what should NOT (anti-triggers)

### 4. Test

Run test cases **in parallel** (with-skill and baseline simultaneously):
- Save to `evals/evals.json` with fields: `id`, `prompt`, `expected_output`, `files`
- Record `total_tokens` and `duration_ms` from task notifications immediately (arrives only once)

### 5. Evaluate

Grade outputs using these exact field names (required for viewer compatibility):
```json
{
  "text": "summary of what happened",
  "passed": true,
  "evidence": "specific quote or observation"
}
```

Run the aggregation script to produce benchmarks with pass rates, timing, and variance.

**Always launch the eval viewer before personally evaluating** — let humans review first.

### 6. Improve

**Generalize from feedback**, don't overfit to test cases. The skill must work across many different prompts.

- "Keep the prompt lean. Remove things that aren't pulling their weight."
- Avoid rigid ALL-CAPS ALWAYS/NEVER directives
- Explain the **why** behind instructions so the model understands reasoning, not just rules
- If helpers are reinvented multiple times across test cases, bundle them as scripts

### 7. Optimize Description (Optional)

Generate 20 trigger eval queries (should-trigger and should-not-trigger), have user review, then run automated optimization loop (up to 5 iterations, select best by test score to avoid overfitting).

## Platform Notes

| Platform | Notes |
|----------|-------|
| Claude Code | Full workflow: subagents, browser viewer, packaging |
| Claude.ai | Skip baseline runs, subagent features, browser reviewer. Present results inline |
| Cowork | Use `--static` flag for viewer. Feedback downloads as file |

## Key Reminder

**Always generate and launch the eval viewer before personally evaluating outputs** — humans review first, not Claude.
