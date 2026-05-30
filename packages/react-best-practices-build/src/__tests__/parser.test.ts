import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { writeFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { parseRuleFile } from '../parser.js'

// ─── temp directory management ───────────────────────────────────────────────

let tmpDir: string

beforeAll(async () => {
  tmpDir = join(tmpdir(), `parser-test-${Date.now()}`)
  await mkdir(tmpDir, { recursive: true })
})

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

async function writeRule(filename: string, content: string): Promise<string> {
  const filePath = join(tmpDir, filename)
  await writeFile(filePath, content, 'utf-8')
  return filePath
}

// ─── basic parsing ───────────────────────────────────────────────────────────

describe('parseRuleFile - basic parsing', () => {
  it('parses title from ## heading', async () => {
    const path = await writeRule('async-parallel.md', `
## Avoid Sequential Awaits

**Impact: CRITICAL**

Use Promise.all() for independent operations.

**Incorrect:**

\`\`\`typescript
const a = await fetchA()
const b = await fetchB()
\`\`\`

**Correct:**

\`\`\`typescript
const [a, b] = await Promise.all([fetchA(), fetchB()])
\`\`\`
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.title).toBe('Avoid Sequential Awaits')
  })

  it('parses impact level from **Impact:** line', async () => {
    const path = await writeRule('async-simple.md', `
## Simple Rule

**Impact: HIGH**

Explanation here.

**Incorrect:**

\`\`\`typescript
bad()
\`\`\`

**Correct:**

\`\`\`typescript
good()
\`\`\`
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.impact).toBe('HIGH')
  })

  it('defaults impact to MEDIUM when not specified', async () => {
    const path = await writeRule('js-noimpact.md', `
## Rule Without Impact

Explanation.

**Incorrect:**

\`\`\`typescript
bad()
\`\`\`
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.impact).toBe('MEDIUM')
  })

  it('parses impact description from parentheses', async () => {
    const path = await writeRule('async-desc.md', `
## Rule With Impact Description

**Impact: CRITICAL (2-10× improvement)**

Explanation.

**Incorrect:**

\`\`\`typescript
bad()
\`\`\`
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.impact).toBe('CRITICAL')
    expect(rule.impactDescription).toBe('2-10× improvement')
  })

  it('parses the explanation text before examples', async () => {
    const path = await writeRule('js-explanation.md', `
## Rule Title

**Impact: MEDIUM**

This is the main explanation of the rule.
It spans multiple lines.

**Incorrect:**

\`\`\`typescript
bad()
\`\`\`
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.explanation).toContain('This is the main explanation of the rule.')
  })

  it('starts explanation accumulation before any example', async () => {
    const path = await writeRule('js-expl2.md', `
## Rule

**Impact: LOW**

First paragraph of explanation.

Second paragraph.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.explanation).toContain('First paragraph of explanation.')
    expect(rule.explanation).toContain('Second paragraph.')
  })
})

// ─── example parsing ─────────────────────────────────────────────────────────

describe('parseRuleFile - example parsing', () => {
  it('parses a single Incorrect example', async () => {
    const path = await writeRule('async-ex1.md', `
## Rule

**Impact: MEDIUM**

Explanation.

**Incorrect:**

\`\`\`typescript
const x = badCode()
\`\`\`
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.examples).toHaveLength(1)
    expect(rule.examples[0].label).toBe('Incorrect')
    expect(rule.examples[0].code).toContain('badCode()')
  })

  it('parses both Incorrect and Correct examples', async () => {
    const path = await writeRule('async-ex2.md', `
## Rule

**Impact: MEDIUM**

Explanation.

**Incorrect:**

\`\`\`typescript
bad()
\`\`\`

**Correct:**

\`\`\`typescript
good()
\`\`\`
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.examples).toHaveLength(2)
    expect(rule.examples[0].label).toBe('Incorrect')
    expect(rule.examples[1].label).toBe('Correct')
  })

  it('parses example language from code fence', async () => {
    const path = await writeRule('async-tsx.md', `
## Rule

**Impact: LOW**

Explanation.

**Correct:**

\`\`\`tsx
function App() { return <div /> }
\`\`\`
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.examples[0].language).toBe('tsx')
  })

  it('defaults language to typescript when not specified in fence', async () => {
    const path = await writeRule('async-nolang.md', `
## Rule

**Impact: LOW**

Explanation.

**Correct:**

\`\`\`
const x = 1
\`\`\`
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.examples[0].language).toBe('typescript')
  })

  it('extracts description from label parentheses', async () => {
    const path = await writeRule('async-desc-ex.md', `
## Rule

**Impact: MEDIUM**

Explanation.

**Incorrect (sequential execution, 3 round trips):**

\`\`\`typescript
const a = await fetchA()
\`\`\`
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.examples[0].label).toBe('Incorrect')
    expect(rule.examples[0].description).toBe('sequential execution, 3 round trips')
  })

  it('captures additionalText after a code block', async () => {
    const path = await writeRule('async-addltext.md', `
## Rule

**Impact: HIGH**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`

Use this when performance matters.
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.examples[0].additionalText).toContain('Use this when performance matters.')
  })

  it('handles multiple code blocks in sequence for different examples', async () => {
    const path = await writeRule('async-multi.md', `
## Multi Rule

**Impact: CRITICAL**

Explanation.

**Incorrect:**

\`\`\`typescript
const a = await fetchA()
const b = await fetchB()
\`\`\`

**Correct:**

\`\`\`typescript
const [a, b] = await Promise.all([fetchA(), fetchB()])
\`\`\`

**Alternative:**

\`\`\`typescript
const aPromise = fetchA()
const [a, b] = await Promise.all([aPromise, fetchB()])
\`\`\`
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.examples).toHaveLength(3)
    expect(rule.examples[0].label).toBe('Incorrect')
    expect(rule.examples[1].label).toBe('Correct')
    expect(rule.examples[2].label).toBe('Alternative')
  })
})

// ─── frontmatter parsing ─────────────────────────────────────────────────────

describe('parseRuleFile - frontmatter parsing', () => {
  it('extracts title from frontmatter when present', async () => {
    const path = await writeRule('async-fm.md', `---
title: My Custom Title
impact: HIGH
---

## Heading Title

**Impact: MEDIUM**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`)

    const { rule } = await parseRuleFile(path)
    // Frontmatter title takes precedence
    expect(rule.title).toBe('My Custom Title')
  })

  it('extracts impact from frontmatter when present', async () => {
    const path = await writeRule('async-fm2.md', `---
impact: CRITICAL
---

## Rule Title

**Impact: LOW**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`)

    const { rule } = await parseRuleFile(path)
    expect(rule.impact).toBe('CRITICAL')
  })

  it('extracts impactDescription from frontmatter', async () => {
    const path = await writeRule('async-fm3.md', `---
title: Rule
impactDescription: 3× faster
---

## Rule Title

**Impact: HIGH**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`)

    const { rule } = await parseRuleFile(path)
    expect(rule.impactDescription).toBe('3× faster')
  })

  it('extracts tags from frontmatter as array', async () => {
    const path = await writeRule('async-fm4.md', `---
tags: async, performance, react
---

## Rule Title

**Impact: HIGH**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`)

    const { rule } = await parseRuleFile(path)
    expect(rule.tags).toEqual(['async', 'performance', 'react'])
  })

  it('falls back to heading title when frontmatter has no title', async () => {
    const path = await writeRule('async-notitle.md', `---
impact: HIGH
---

## Heading Title Is Used

**Impact: HIGH**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`)

    const { rule } = await parseRuleFile(path)
    expect(rule.title).toBe('Heading Title Is Used')
  })

  it('handles files without frontmatter', async () => {
    const path = await writeRule('async-nofm.md', `
## No Frontmatter Rule

**Impact: LOW**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.title).toBe('No Frontmatter Rule')
  })

  it('parses frontmatter references as array', async () => {
    const path = await writeRule('async-fmrefs.md', `---
references: https://react.dev, https://nextjs.org
---

## Rule

**Impact: HIGH**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`)

    const { rule } = await parseRuleFile(path)
    expect(rule.references).toEqual(['https://react.dev', 'https://nextjs.org'])
  })
})

// ─── section inference from filename ─────────────────────────────────────────

describe('parseRuleFile - section inference', () => {
  it('infers section 1 for async-prefixed files', async () => {
    const path = await writeRule('async-parallel.md', `
## Async Rule

**Impact: CRITICAL**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`.trim())

    const { section } = await parseRuleFile(path)
    expect(section).toBe(1)
  })

  it('infers section 2 for bundle-prefixed files', async () => {
    const path = await writeRule('bundle-barrel.md', `
## Bundle Rule

**Impact: CRITICAL**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`.trim())

    const { section } = await parseRuleFile(path)
    expect(section).toBe(2)
  })

  it('infers section 8 for advanced-prefixed files', async () => {
    const path = await writeRule('advanced-init.md', `
## Advanced Rule

**Impact: LOW**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`.trim())

    const { section } = await parseRuleFile(path)
    expect(section).toBe(8)
  })

  it('uses frontmatter section override when provided', async () => {
    const path = await writeRule('async-override.md', `---
section: 5
---

## Override Rule

**Impact: MEDIUM**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`)

    const { section } = await parseRuleFile(path)
    expect(section).toBe(5)
  })

  it('returns section 0 for unrecognized file prefix', async () => {
    const path = await writeRule('unknown-rule.md', `
## Unknown Rule

**Impact: MEDIUM**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`.trim())

    const { section } = await parseRuleFile(path)
    expect(section).toBe(0)
  })

  it('uses custom sectionMap when provided', async () => {
    const path = await writeRule('rendering-opt.md', `
## Rendering Rule

**Impact: MEDIUM**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`.trim())

    const customMap = { rendering: 99 }
    const { section } = await parseRuleFile(path, customMap)
    expect(section).toBe(99)
  })

  it('uses longest prefix match for compound filenames', async () => {
    // "list-performance" should match "list-performance" key, not "list"
    const path = await writeRule('list-performance-scroll.md', `
## List Performance Rule

**Impact: HIGH**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`.trim())

    const customMap = { 'list': 1, 'list-performance': 2 }
    const { section } = await parseRuleFile(path, customMap)
    expect(section).toBe(2)
  })
})

// ─── reference parsing ────────────────────────────────────────────────────────

describe('parseRuleFile - references', () => {
  it('parses Reference: line with markdown links', async () => {
    const path = await writeRule('async-refs.md', `
## Rule With Reference

**Impact: HIGH**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`

Reference: [https://react.dev](https://react.dev)
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.references).toContain('https://react.dev')
  })

  it('parses multiple references on one Reference: line', async () => {
    const path = await writeRule('async-multirefs.md', `
## Multi Ref Rule

**Impact: HIGH**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`

Reference: [React](https://react.dev), [Next.js](https://nextjs.org)
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.references).toContain('https://react.dev')
    expect(rule.references).toContain('https://nextjs.org')
  })
})

// ─── CRLF line endings ────────────────────────────────────────────────────────

describe('parseRuleFile - CRLF normalization', () => {
  it('parses files with Windows-style CRLF line endings correctly', async () => {
    const content = '## CRLF Rule\r\n\r\n**Impact: MEDIUM**\r\n\r\nExplanation.\r\n\r\n**Correct:**\r\n\r\n```typescript\r\ngood()\r\n```\r\n'
    const path = await writeRule('js-crlf.md', content)
    const { rule } = await parseRuleFile(path)
    expect(rule.title).toBe('CRLF Rule')
    expect(rule.impact).toBe('MEDIUM')
    expect(rule.examples).toHaveLength(1)
  })
})

// ─── edge cases ───────────────────────────────────────────────────────────────

describe('parseRuleFile - edge cases', () => {
  it('assigns id as empty string (to be set by build script)', async () => {
    const path = await writeRule('async-id.md', `
## Rule

**Impact: LOW**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.id).toBe('')
  })

  it('sets subsection to 0 in returned RuleFile', async () => {
    const path = await writeRule('async-sub.md', `
## Rule

**Impact: LOW**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`.trim())

    const result = await parseRuleFile(path)
    expect(result.subsection).toBe(0)
  })

  it('rule.subsection is undefined initially', async () => {
    const path = await writeRule('async-sub2.md', `
## Rule

**Impact: LOW**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.subsection).toBeUndefined()
  })

  it('does not include ## heading text in explanation', async () => {
    const path = await writeRule('js-heading.md', `
## The Rule Title

**Impact: MEDIUM**

The explanation text.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.explanation).not.toContain('## The Rule Title')
  })

  it('handles multiple examples with same label', async () => {
    const path = await writeRule('async-dup.md', `
## Rule

**Impact: HIGH**

Explanation.

**Incorrect:**

\`\`\`typescript
bad1()
\`\`\`

**Incorrect:**

\`\`\`typescript
bad2()
\`\`\`
`.trim())

    const { rule } = await parseRuleFile(path)
    expect(rule.examples).toHaveLength(2)
    expect(rule.examples[0].code).toContain('bad1()')
    expect(rule.examples[1].code).toContain('bad2()')
  })

  it('handles all valid impact levels', async () => {
    const levels = ['CRITICAL', 'HIGH', 'MEDIUM-HIGH', 'MEDIUM', 'LOW-MEDIUM', 'LOW']
    for (const level of levels) {
      const path = await writeRule(`js-impact-${level.toLowerCase()}.md`, `
## Rule

**Impact: ${level}**

Explanation.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`.trim())

      const { rule } = await parseRuleFile(path)
      expect(rule.impact).toBe(level)
    }
  })

  // Regression: inline **bold** text in explanation should not be treated as example label
  it('does not treat inline bold text as example label', async () => {
    const path = await writeRule('js-inlinebold.md', `
## Rule

**Impact: MEDIUM**

This is an explanation with **important** bolded text inline.

**Correct:**

\`\`\`typescript
good()
\`\`\`
`.trim())

    const { rule } = await parseRuleFile(path)
    // explanation should capture the paragraph
    expect(rule.explanation).toContain('**important**')
    // "important" should not be treated as an example label
    expect(rule.examples).toHaveLength(1)
  })
})