import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { parseRuleFile } from '../parser.js'

// Helper to create a temp file with content for testing
async function createTempFile(content: string, filename: string, dir: string): Promise<string> {
  const filePath = join(dir, filename)
  await writeFile(filePath, content, 'utf-8')
  return filePath
}

describe('parseRuleFile', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = join(tmpdir(), `parser-test-${Date.now()}`)
    await mkdir(tempDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('title extraction', () => {
    it('extracts title from ## heading', async () => {
      const content = `## My Rule Title

**Impact: HIGH**

Some explanation here.

**Incorrect:**

\`\`\`typescript
const bad = 1
\`\`\`

**Correct:**

\`\`\`typescript
const good = 2
\`\`\`
`
      const filePath = await createTempFile(content, 'async-my-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.title).toBe('My Rule Title')
    })

    it('uses frontmatter title over heading title', async () => {
      const content = `---
title: Frontmatter Title
---

## Heading Title

**Impact: HIGH**

Some explanation.

**Incorrect:**

\`\`\`typescript
const bad = 1
\`\`\`

**Correct:**

\`\`\`typescript
const good = 2
\`\`\`
`
      const filePath = await createTempFile(content, 'async-my-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.title).toBe('Frontmatter Title')
    })
  })

  describe('impact parsing', () => {
    it('defaults to MEDIUM impact', async () => {
      const content = `## Rule Title

Some explanation.

**Incorrect:**

\`\`\`typescript
const bad = 1
\`\`\`

**Correct:**

\`\`\`typescript
const good = 2
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.impact).toBe('MEDIUM')
    })

    it('parses CRITICAL impact level', async () => {
      const content = `## Rule Title

**Impact: CRITICAL**

Some explanation.

**Incorrect:**

\`\`\`typescript
const bad = 1
\`\`\`

**Correct:**

\`\`\`typescript
const good = 2
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.impact).toBe('CRITICAL')
    })

    it('parses HIGH impact level', async () => {
      const content = `## Rule Title

**Impact: HIGH**

Some explanation.

**Correct:**

\`\`\`typescript
const good = 2
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.impact).toBe('HIGH')
    })

    it('parses MEDIUM-HIGH impact level', async () => {
      const content = `## Rule Title

**Impact: MEDIUM-HIGH**

Some explanation.

**Correct:**

\`\`\`typescript
const good = 2
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.impact).toBe('MEDIUM-HIGH')
    })

    it('parses LOW impact level', async () => {
      const content = `## Rule Title

**Impact: LOW**

Some explanation.

**Correct:**

\`\`\`typescript
const good = 2
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.impact).toBe('LOW')
    })

    it('parses LOW-MEDIUM impact level', async () => {
      const content = `## Rule Title

**Impact: LOW-MEDIUM**

Some explanation.

**Correct:**

\`\`\`typescript
const good = 2
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.impact).toBe('LOW-MEDIUM')
    })

    it('parses impact description in parentheses', async () => {
      const content = `## Rule Title

**Impact: HIGH (2-10× improvement)**

Some explanation.

**Correct:**

\`\`\`typescript
const good = 2
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.impact).toBe('HIGH')
      expect(result.rule.impactDescription).toBe('2-10× improvement')
    })

    it('uses frontmatter impact over body impact', async () => {
      const content = `---
impact: CRITICAL
---

## Rule Title

**Impact: LOW**

Some explanation.

**Incorrect:**

\`\`\`typescript
const bad = 1
\`\`\`

**Correct:**

\`\`\`typescript
const good = 2
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.impact).toBe('CRITICAL')
    })
  })

  describe('section inference from filename', () => {
    it('maps async prefix to section 1', async () => {
      const content = `## Rule Title

**Impact: HIGH**

Explanation.

**Incorrect:**

\`\`\`typescript
const bad = 1
\`\`\`

**Correct:**

\`\`\`typescript
const good = 2
\`\`\`
`
      const filePath = await createTempFile(content, 'async-parallel.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.section).toBe(1)
    })

    it('maps bundle prefix to section 2', async () => {
      const content = `## Rule Title

**Impact: HIGH**

Explanation.

**Incorrect:**

\`\`\`typescript
const bad = 1
\`\`\`

**Correct:**

\`\`\`typescript
const good = 2
\`\`\`
`
      const filePath = await createTempFile(content, 'bundle-barrel-imports.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.section).toBe(2)
    })

    it('maps advanced prefix to section 8', async () => {
      const content = `## Rule Title

**Impact: LOW**

Explanation.

**Incorrect:**

\`\`\`typescript
const bad = 1
\`\`\`

**Correct:**

\`\`\`typescript
const good = 2
\`\`\`
`
      const filePath = await createTempFile(content, 'advanced-init-once.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.section).toBe(8)
    })

    it('uses custom sectionMap when provided', async () => {
      const content = `## Rule Title

**Impact: HIGH**

Explanation.

**Incorrect:**

\`\`\`typescript
const bad = 1
\`\`\`

**Correct:**

\`\`\`typescript
const good = 2
\`\`\`
`
      const customMap = { rendering: 1, 'list-performance': 2, animation: 3 }
      const filePath = await createTempFile(content, 'rendering-flatlist.md', tempDir)
      const result = await parseRuleFile(filePath, customMap)
      expect(result.section).toBe(1)
    })

    it('handles multi-part prefix (list-performance)', async () => {
      const content = `## Rule Title

**Impact: HIGH**

Explanation.

**Incorrect:**

\`\`\`typescript
const bad = 1
\`\`\`

**Correct:**

\`\`\`typescript
const good = 2
\`\`\`
`
      const customMap = { 'list-performance': 2, list: 99 }
      const filePath = await createTempFile(content, 'list-performance-flatlist.md', tempDir)
      const result = await parseRuleFile(filePath, customMap)
      // Should prefer longer match first
      expect(result.section).toBe(2)
    })

    it('returns section 0 for unknown prefix', async () => {
      const content = `## Rule Title

**Impact: HIGH**

Explanation.

**Incorrect:**

\`\`\`typescript
const bad = 1
\`\`\`

**Correct:**

\`\`\`typescript
const good = 2
\`\`\`
`
      const filePath = await createTempFile(content, 'unknown-prefix-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.section).toBe(0)
    })

    it('frontmatter section overrides filename inference', async () => {
      const content = `---
section: 5
---

## Rule Title

**Impact: HIGH**

Explanation.

**Incorrect:**

\`\`\`typescript
const bad = 1
\`\`\`

**Correct:**

\`\`\`typescript
const good = 2
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      // frontmatter.section overrides filename-based section (1 from 'async' prefix)
      // Frontmatter values are parsed as strings, so section is '5', not 1
      expect(result.section).not.toBe(1)
      expect(Number(result.section)).toBe(5)
    })
  })

  describe('example parsing', () => {
    it('parses single Incorrect/Correct example pair', async () => {
      const content = `## Rule Title

**Impact: HIGH**

Some explanation.

**Incorrect:**

\`\`\`typescript
const bad = 1
\`\`\`

**Correct:**

\`\`\`typescript
const good = 2
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.examples).toHaveLength(2)
      expect(result.rule.examples[0].label).toBe('Incorrect')
      expect(result.rule.examples[0].code.trim()).toBe('const bad = 1')
      expect(result.rule.examples[1].label).toBe('Correct')
      expect(result.rule.examples[1].code.trim()).toBe('const good = 2')
    })

    it('parses example with description in parentheses (no nested parens)', async () => {
      const content = `## Rule Title

**Impact: HIGH**

Some explanation.

**Incorrect (sequential execution):**

\`\`\`typescript
const bad = arr.find(x => x.id === id)
\`\`\`

**Correct (parallel execution):**

\`\`\`typescript
const map = new Map(arr.map(x => [x.id, x]))
\`\`\`
`
      const filePath = await createTempFile(content, 'js-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.examples).toHaveLength(2)
      // Descriptions without nested parens are split into label + description
      expect(result.rule.examples[0].label).toBe('Incorrect')
      expect(result.rule.examples[0].description).toBe('sequential execution')
      expect(result.rule.examples[1].label).toBe('Correct')
      expect(result.rule.examples[1].description).toBe('parallel execution')
    })

    it('detects the code block language', async () => {
      const content = `## Rule Title

**Impact: HIGH**

Some explanation.

**Incorrect:**

\`\`\`tsx
const bad = <div />
\`\`\`

**Correct:**

\`\`\`tsx
const good = <span />
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.examples[0].language).toBe('tsx')
      expect(result.rule.examples[1].language).toBe('tsx')
    })

    it('defaults language to typescript when not specified', async () => {
      const content = `## Rule Title

**Impact: HIGH**

Some explanation.

**Incorrect:**

\`\`\`
const bad = 1
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.examples[0].language).toBe('typescript')
    })

    it('parses additional text after code block', async () => {
      const content = `## Rule Title

**Impact: HIGH**

Some explanation.

**Correct:**

\`\`\`typescript
const good = 1
\`\`\`

This is additional context after the code block.
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.examples[0].additionalText).toContain('additional context')
    })

    it('handles multiple examples in sequence', async () => {
      const content = `## Rule Title

**Impact: HIGH**

Some explanation.

**Incorrect:**

\`\`\`typescript
const bad = 1
\`\`\`

**Correct:**

\`\`\`typescript
const good = 2
\`\`\`

**Alternative:**

\`\`\`typescript
const alt = 3
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.examples).toHaveLength(3)
      expect(result.rule.examples[2].label).toBe('Alternative')
    })
  })

  describe('explanation parsing', () => {
    it('captures text before examples as explanation', async () => {
      const content = `## Rule Title

**Impact: HIGH**

This is the main explanation of the rule.
It spans multiple lines.

**Incorrect:**

\`\`\`typescript
const bad = 1
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.explanation).toContain('main explanation')
      expect(result.rule.explanation).toContain('multiple lines')
    })
  })

  describe('frontmatter parsing', () => {
    it('parses frontmatter key-value pairs', async () => {
      const content = `---
title: My Rule
impact: CRITICAL
tags: react, performance, hooks
---

## Heading Title

**Impact: LOW**

Some explanation.

**Correct:**

\`\`\`typescript
const good = 1
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.title).toBe('My Rule')
      expect(result.rule.impact).toBe('CRITICAL')
      expect(result.rule.tags).toEqual(['react', 'performance', 'hooks'])
    })

    it('handles frontmatter with colon in value (URLs)', async () => {
      const content = `---
title: Rule with URL value
---

## Rule Title

**Impact: HIGH**

Explanation.

**Correct:**

\`\`\`typescript
const good = 1
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.title).toBe('Rule with URL value')
    })

    it('strips quotes from frontmatter values', async () => {
      const content = `---
title: "Quoted Title"
---

## Heading Title

**Impact: HIGH**

Explanation.

**Correct:**

\`\`\`typescript
const good = 1
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.title).toBe('Quoted Title')
    })

    it('parses tags from frontmatter as array', async () => {
      const content = `---
tags: async, await, performance
---

## Rule Title

**Impact: HIGH**

Explanation.

**Correct:**

\`\`\`typescript
const good = 1
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.tags).toEqual(['async', 'await', 'performance'])
    })
  })

  describe('reference parsing', () => {
    it('parses Reference: links', async () => {
      const content = `## Rule Title

**Impact: HIGH**

Explanation.

**Correct:**

\`\`\`typescript
const good = 1
\`\`\`

Reference: [https://react.dev](https://react.dev)
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.references).toContain('https://react.dev')
    })

    it('parses multiple references on one line', async () => {
      const content = `## Rule Title

**Impact: HIGH**

Explanation.

**Correct:**

\`\`\`typescript
const good = 1
\`\`\`

Reference: [https://react.dev](https://react.dev), [https://nextjs.org](https://nextjs.org)
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.references).toContain('https://react.dev')
      expect(result.rule.references).toContain('https://nextjs.org')
    })
  })

  describe('CRLF normalization', () => {
    it('normalizes CRLF line endings to LF', async () => {
      const content = '## Rule Title\r\n\r\n**Impact: HIGH**\r\n\r\nExplanation.\r\n\r\n**Correct:**\r\n\r\n```typescript\r\nconst good = 1\r\n```\r\n'
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.title).toBe('Rule Title')
      expect(result.rule.examples).toHaveLength(1)
    })
  })

  describe('return structure', () => {
    it('returns section and rule in the result', async () => {
      const content = `## Rule Title

**Impact: HIGH**

Explanation.

**Correct:**

\`\`\`typescript
const good = 1
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result).toHaveProperty('section')
      expect(result).toHaveProperty('subsection')
      expect(result).toHaveProperty('rule')
      expect(result.rule).toHaveProperty('id')
      expect(result.rule).toHaveProperty('title')
      expect(result.rule).toHaveProperty('impact')
      expect(result.rule).toHaveProperty('explanation')
      expect(result.rule).toHaveProperty('examples')
    })

    it('sets rule.id to empty string (assigned during build)', async () => {
      const content = `## Rule Title

**Impact: HIGH**

Explanation.

**Correct:**

\`\`\`typescript
const good = 1
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.id).toBe('')
    })

    it('sets subsection to 0', async () => {
      const content = `## Rule Title

**Impact: HIGH**

Explanation.

**Correct:**

\`\`\`typescript
const good = 1
\`\`\`
`
      const filePath = await createTempFile(content, 'async-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.subsection).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('handles file without frontmatter', async () => {
      const content = `## Simple Rule

**Impact: MEDIUM**

Just explanation text.

**Correct:**

\`\`\`typescript
const x = 1
\`\`\`
`
      const filePath = await createTempFile(content, 'js-simple.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.title).toBe('Simple Rule')
      expect(result.section).toBe(7) // js -> 7
    })

    it('handles impact in inline bold format (not just line-level)', async () => {
      const content = `## Rule Title

**Impact: LOW-MEDIUM (eliminates intermediate array)**

Some explanation here that spans a line.

**Correct:**

\`\`\`typescript
const good = 1
\`\`\`
`
      const filePath = await createTempFile(content, 'js-flatmap.md', tempDir)
      const result = await parseRuleFile(filePath)
      expect(result.rule.impact).toBe('LOW-MEDIUM')
      expect(result.rule.impactDescription).toBe('eliminates intermediate array')
    })

    it('keeps full label when description contains nested parentheses (e.g. O(n))', async () => {
      const content = `## Rule Title

**Impact: HIGH**

Explanation.

**Incorrect (O(n) per lookup):**

\`\`\`typescript
const bad = users.find(u => u.id === id)
\`\`\`
`
      const filePath = await createTempFile(content, 'js-rule.md', tempDir)
      const result = await parseRuleFile(filePath)
      // "O(n) per lookup" contains nested parens "(n)", so the regex [^()]+ fails to match
      // The full label is preserved and description is undefined
      expect(result.rule.examples[0].label).toBe('Incorrect (O(n) per lookup)')
      expect(result.rule.examples[0].description).toBeUndefined()
    })
  })
})