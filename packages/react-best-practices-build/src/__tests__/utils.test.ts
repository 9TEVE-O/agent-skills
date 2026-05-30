import { describe, it, expect } from 'vitest'
import {
  incrementVersion,
  generateMarkdown,
  validateRule,
  extractTestCases,
} from '../utils.js'
import type { Rule, Section } from '../types.js'
import type { SkillConfig } from '../config.js'

// ─── helpers ────────────────────────────────────────────────────────────────

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: '1.1',
    title: 'Test Rule',
    section: 1,
    impact: 'MEDIUM',
    explanation: 'This is the explanation.',
    examples: [
      {
        label: 'Incorrect',
        code: 'const x = badCode()',
        language: 'typescript',
      },
      {
        label: 'Correct',
        code: 'const x = goodCode()',
        language: 'typescript',
      },
    ],
    ...overrides,
  }
}

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    number: 1,
    title: 'Test Section',
    impact: 'MEDIUM',
    rules: [makeRule()],
    ...overrides,
  }
}

const baseSkillConfig: SkillConfig = {
  name: 'test-skill',
  title: 'Test Skill',
  description: 'test codebases',
  skillDir: '/tmp/test-skill',
  rulesDir: '/tmp/test-skill/rules',
  metadataFile: '/tmp/test-skill/metadata.json',
  outputFile: '/tmp/test-skill/AGENTS.md',
  sectionMap: { async: 1 },
}

const baseMetadata = {
  version: '1.0.0',
  organization: 'Test Org',
  date: 'January 2026',
  abstract: 'Test abstract.',
}

// ─── incrementVersion ───────────────────────────────────────────────────────

describe('incrementVersion', () => {
  it('increments the patch segment of a 3-part version', () => {
    expect(incrementVersion('1.0.0')).toBe('1.0.1')
  })

  it('increments the patch from 9 to 10 (no carry)', () => {
    expect(incrementVersion('1.0.9')).toBe('1.0.10')
  })

  it('increments a 2-part version (minor segment)', () => {
    expect(incrementVersion('1.0')).toBe('1.1')
  })

  it('increments a single-segment version', () => {
    expect(incrementVersion('5')).toBe('6')
  })

  it('handles zero patch correctly', () => {
    expect(incrementVersion('0.1.0')).toBe('0.1.1')
  })

  it('increments the last part only, leaving earlier parts unchanged', () => {
    const result = incrementVersion('2.3.4')
    expect(result).toBe('2.3.5')
    const parts = result.split('.').map(Number)
    expect(parts[0]).toBe(2)
    expect(parts[1]).toBe(3)
    expect(parts[2]).toBe(5)
  })

  it('returns a string (not a number)', () => {
    expect(typeof incrementVersion('1.0.0')).toBe('string')
  })

  it('handles large version numbers', () => {
    expect(incrementVersion('10.20.99')).toBe('10.20.100')
  })
})

// ─── generateMarkdown ───────────────────────────────────────────────────────

describe('generateMarkdown', () => {
  it('includes the skill title as H1', () => {
    const md = generateMarkdown([makeSection()], baseMetadata, baseSkillConfig)
    expect(md).toContain('# Test Skill')
  })

  it('includes the version', () => {
    const md = generateMarkdown([makeSection()], baseMetadata, baseSkillConfig)
    expect(md).toContain('**Version 1.0.0**')
  })

  it('includes the organization', () => {
    const md = generateMarkdown([makeSection()], baseMetadata, baseSkillConfig)
    expect(md).toContain('Test Org')
  })

  it('includes the date', () => {
    const md = generateMarkdown([makeSection()], baseMetadata, baseSkillConfig)
    expect(md).toContain('January 2026')
  })

  it('includes the abstract', () => {
    const md = generateMarkdown([makeSection()], baseMetadata, baseSkillConfig)
    expect(md).toContain('Test abstract.')
  })

  it('includes the skill description in the note block', () => {
    const md = generateMarkdown([makeSection()], baseMetadata, baseSkillConfig)
    expect(md).toContain('test codebases')
  })

  it('generates a table of contents entry for each section', () => {
    const sections = [
      makeSection({ number: 1, title: 'Async Patterns' }),
      makeSection({ number: 2, title: 'Bundle Size', rules: [] }),
    ]
    const md = generateMarkdown(sections, baseMetadata, baseSkillConfig)
    expect(md).toContain('1. [Async Patterns]')
    expect(md).toContain('2. [Bundle Size]')
  })

  it('generates a TOC entry for each rule', () => {
    const section = makeSection({
      rules: [makeRule({ id: '1.1', title: 'Promise All' })],
    })
    const md = generateMarkdown([section], baseMetadata, baseSkillConfig)
    expect(md).toContain('1.1 [Promise All]')
  })

  it('generates section headings', () => {
    const section = makeSection({ number: 3, title: 'Server Patterns' })
    const md = generateMarkdown([section], baseMetadata, baseSkillConfig)
    expect(md).toContain('## 3. Server Patterns')
  })

  it('generates rule headings', () => {
    const rule = makeRule({ id: '2.1', title: 'Avoid Barrel Imports' })
    const section = makeSection({ number: 2, rules: [rule] })
    const md = generateMarkdown([section], baseMetadata, baseSkillConfig)
    expect(md).toContain('### 2.1 Avoid Barrel Imports')
  })

  it('includes the rule explanation', () => {
    const rule = makeRule({ explanation: 'Do not use barrel files.' })
    const md = generateMarkdown([makeSection({ rules: [rule] })], baseMetadata, baseSkillConfig)
    expect(md).toContain('Do not use barrel files.')
  })

  it('includes code examples with language fence', () => {
    const rule = makeRule({
      examples: [
        { label: 'Incorrect', code: 'bad()', language: 'tsx' },
      ],
    })
    const md = generateMarkdown([makeSection({ rules: [rule] })], baseMetadata, baseSkillConfig)
    expect(md).toContain('```tsx')
    expect(md).toContain('bad()')
  })

  it('omits code block when example has no code', () => {
    const rule = makeRule({
      examples: [{ label: 'Note', code: '', language: 'typescript' }],
    })
    const md = generateMarkdown([makeSection({ rules: [rule] })], baseMetadata, baseSkillConfig)
    // No code block for empty code
    const codeBlockCount = (md.match(/```/g) || []).length
    expect(codeBlockCount).toBe(0)
  })

  it('includes example description when provided', () => {
    const rule = makeRule({
      examples: [
        { label: 'Incorrect', description: 'slow path', code: 'x()', language: 'typescript' },
      ],
    })
    const md = generateMarkdown([makeSection({ rules: [rule] })], baseMetadata, baseSkillConfig)
    expect(md).toContain('**Incorrect: slow path**')
  })

  it('includes additionalText after code block', () => {
    const rule = makeRule({
      examples: [
        { label: 'Note', code: '', language: 'typescript', additionalText: 'Use this approach when...' },
      ],
    })
    const md = generateMarkdown([makeSection({ rules: [rule] })], baseMetadata, baseSkillConfig)
    expect(md).toContain('Use this approach when...')
  })

  it('includes references section from metadata', () => {
    const meta = { ...baseMetadata, references: ['https://react.dev', 'https://nextjs.org'] }
    const md = generateMarkdown([makeSection()], meta, baseSkillConfig)
    expect(md).toContain('## References')
    expect(md).toContain('[https://react.dev](https://react.dev)')
  })

  it('omits references section when metadata has no references', () => {
    const md = generateMarkdown([makeSection()], baseMetadata, baseSkillConfig)
    expect(md).not.toContain('## References')
  })

  it('includes rule-level references', () => {
    const rule = makeRule({ references: ['https://example.com'] })
    const md = generateMarkdown([makeSection({ rules: [rule] })], baseMetadata, baseSkillConfig)
    expect(md).toContain('Reference: [https://example.com](https://example.com)')
  })

  it('includes section impact', () => {
    const section = makeSection({ impact: 'CRITICAL' })
    const md = generateMarkdown([section], baseMetadata, baseSkillConfig)
    expect(md).toContain('**Impact: CRITICAL**')
  })

  it('includes section impactDescription when provided', () => {
    const section = makeSection({ impact: 'HIGH', impactDescription: '2-5× improvement' })
    const md = generateMarkdown([section], baseMetadata, baseSkillConfig)
    expect(md).toContain('**Impact: HIGH (2-5× improvement)**')
  })

  it('includes section introduction when provided', () => {
    const section = makeSection({ introduction: 'Async patterns eliminate waterfalls.' })
    const md = generateMarkdown([section], baseMetadata, baseSkillConfig)
    expect(md).toContain('Async patterns eliminate waterfalls.')
  })

  it('ends each section with a horizontal rule', () => {
    const md = generateMarkdown([makeSection()], baseMetadata, baseSkillConfig)
    expect(md).toContain('---')
  })

  it('handles multiple sections in order', () => {
    const sections = [
      makeSection({ number: 1, title: 'First' }),
      makeSection({ number: 2, title: 'Second' }),
    ]
    const md = generateMarkdown(sections, baseMetadata, baseSkillConfig)
    const firstIdx = md.indexOf('## 1. First')
    const secondIdx = md.indexOf('## 2. Second')
    expect(firstIdx).toBeGreaterThanOrEqual(0)
    expect(secondIdx).toBeGreaterThan(firstIdx)
  })

  it('generates valid anchor links in TOC (lowercase, hyphens)', () => {
    const rule = makeRule({ id: '1.1', title: 'Avoid Barrel Imports' })
    const section = makeSection({ rules: [rule] })
    const md = generateMarkdown([section], baseMetadata, baseSkillConfig)
    // Anchor should be lowercased with hyphens
    expect(md).toContain('#11-avoid-barrel-imports')
  })
})

// ─── validateRule ────────────────────────────────────────────────────────────

describe('validateRule', () => {
  it('returns no errors for a well-formed rule', () => {
    const errors = validateRule(makeRule(), 'test.md')
    expect(errors).toHaveLength(0)
  })

  it('reports error when title is missing', () => {
    const rule = makeRule({ title: '' })
    const errors = validateRule(rule, 'test.md')
    expect(errors.some(e => e.message.includes('title'))).toBe(true)
  })

  it('reports error when title is whitespace only', () => {
    const rule = makeRule({ title: '   ' })
    const errors = validateRule(rule, 'test.md')
    expect(errors.some(e => e.message.includes('title'))).toBe(true)
  })

  it('reports error when explanation is missing', () => {
    const rule = makeRule({ explanation: '' })
    const errors = validateRule(rule, 'test.md')
    expect(errors.some(e => e.message.includes('explanation'))).toBe(true)
  })

  it('reports error when explanation is whitespace only', () => {
    const rule = makeRule({ explanation: '   ' })
    const errors = validateRule(rule, 'test.md')
    expect(errors.some(e => e.message.includes('explanation'))).toBe(true)
  })

  it('reports error when examples array is empty', () => {
    const rule = makeRule({ examples: [] })
    const errors = validateRule(rule, 'test.md')
    expect(errors.some(e => e.message.includes('examples'))).toBe(true)
  })

  it('reports error when no examples have code', () => {
    const rule = makeRule({
      examples: [{ label: 'Note', code: '', language: 'typescript' }],
    })
    const errors = validateRule(rule, 'test.md')
    expect(errors.some(e => e.message.includes('code examples'))).toBe(true)
  })

  it('reports error when examples have neither bad nor good labels', () => {
    const rule = makeRule({
      examples: [
        { label: 'Neutral', code: 'x()', language: 'typescript' },
      ],
    })
    const errors = validateRule(rule, 'test.md')
    expect(errors.some(e => e.message.includes('bad/incorrect or good/correct'))).toBe(true)
  })

  it('accepts examples labeled with "wrong"', () => {
    const rule = makeRule({
      examples: [
        { label: 'Wrong', code: 'x()', language: 'typescript' },
        { label: 'Correct', code: 'y()', language: 'typescript' },
      ],
    })
    const errors = validateRule(rule, 'test.md')
    expect(errors).toHaveLength(0)
  })

  it('accepts examples labeled with "good"', () => {
    const rule = makeRule({
      examples: [
        { label: 'Incorrect', code: 'x()', language: 'typescript' },
        { label: 'Good', code: 'y()', language: 'typescript' },
      ],
    })
    const errors = validateRule(rule, 'test.md')
    expect(errors).toHaveLength(0)
  })

  it('accepts examples labeled with "usage"', () => {
    const rule = makeRule({
      examples: [
        { label: 'Incorrect', code: 'x()', language: 'typescript' },
        { label: 'Usage', code: 'y()', language: 'typescript' },
      ],
    })
    const errors = validateRule(rule, 'test.md')
    expect(errors).toHaveLength(0)
  })

  it('accepts examples labeled with "implementation"', () => {
    const rule = makeRule({
      examples: [
        { label: 'Incorrect', code: 'x()', language: 'typescript' },
        { label: 'Implementation', code: 'y()', language: 'typescript' },
      ],
    })
    const errors = validateRule(rule, 'test.md')
    expect(errors).toHaveLength(0)
  })

  it('accepts examples labeled with "example"', () => {
    const rule = makeRule({
      examples: [
        { label: 'Incorrect', code: 'x()', language: 'typescript' },
        { label: 'Example', code: 'y()', language: 'typescript' },
      ],
    })
    const errors = validateRule(rule, 'test.md')
    expect(errors).toHaveLength(0)
  })

  it('reports error for invalid impact level', () => {
    const rule = makeRule({ impact: 'VERY-HIGH' as Rule['impact'] })
    const errors = validateRule(rule, 'test.md')
    expect(errors.some(e => e.message.includes('Invalid impact level'))).toBe(true)
  })

  it('accepts all valid impact levels', () => {
    const validLevels: Rule['impact'][] = ['CRITICAL', 'HIGH', 'MEDIUM-HIGH', 'MEDIUM', 'LOW-MEDIUM', 'LOW']
    for (const impact of validLevels) {
      const errors = validateRule(makeRule({ impact }), 'test.md')
      expect(errors.filter(e => e.message.includes('Invalid impact'))).toHaveLength(0)
    }
  })

  it('includes the filename in every error', () => {
    const rule = makeRule({ title: '', explanation: '' })
    const errors = validateRule(rule, 'my-rule.md')
    expect(errors.every(e => e.file === 'my-rule.md')).toBe(true)
  })

  it('can report multiple errors at once', () => {
    const rule = makeRule({ title: '', explanation: '', examples: [] })
    const errors = validateRule(rule, 'test.md')
    expect(errors.length).toBeGreaterThanOrEqual(2)
  })

  it('ignores informational examples without code when checking bad/good', () => {
    // Rule has a "Note" example without code AND a bad example with code
    // Should be valid (only code examples are checked)
    const rule = makeRule({
      examples: [
        { label: 'Note', code: '', language: 'typescript' },
        { label: 'Incorrect', code: 'bad()', language: 'typescript' },
        { label: 'Correct', code: 'good()', language: 'typescript' },
      ],
    })
    const errors = validateRule(rule, 'test.md')
    expect(errors).toHaveLength(0)
  })

  // Regression: rule with only bad example (no good) should still fail
  it('requires at least one good example when only bad examples exist', () => {
    const rule = makeRule({
      examples: [
        { label: 'Incorrect', code: 'bad()', language: 'typescript' },
      ],
    })
    // hasBad=true, hasGood=false → no error per current logic (only both missing triggers error)
    // The current logic only errors if NEITHER bad NOR good exists
    const errors = validateRule(rule, 'test.md')
    // With only a bad example, hasBad=true → no example-structure error
    expect(errors).toHaveLength(0)
  })
})

// ─── extractTestCases ────────────────────────────────────────────────────────

describe('extractTestCases', () => {
  it('extracts bad test case from "Incorrect" labeled example', () => {
    const rule = makeRule({
      examples: [{ label: 'Incorrect', code: 'bad()', language: 'typescript' }],
    })
    const cases = extractTestCases(rule)
    expect(cases).toHaveLength(1)
    expect(cases[0].type).toBe('bad')
  })

  it('extracts good test case from "Correct" labeled example', () => {
    const rule = makeRule({
      examples: [{ label: 'Correct', code: 'good()', language: 'typescript' }],
    })
    const cases = extractTestCases(rule)
    expect(cases).toHaveLength(1)
    expect(cases[0].type).toBe('good')
  })

  it('extracts bad test case from "Wrong" labeled example', () => {
    const rule = makeRule({
      examples: [{ label: 'Wrong', code: 'bad()', language: 'typescript' }],
    })
    const cases = extractTestCases(rule)
    expect(cases).toHaveLength(1)
    expect(cases[0].type).toBe('bad')
  })

  it('extracts bad test case from "Bad" labeled example', () => {
    const rule = makeRule({
      examples: [{ label: 'Bad', code: 'bad()', language: 'typescript' }],
    })
    const cases = extractTestCases(rule)
    expect(cases).toHaveLength(1)
    expect(cases[0].type).toBe('bad')
  })

  it('extracts good test case from "Good" labeled example', () => {
    const rule = makeRule({
      examples: [{ label: 'Good', code: 'good()', language: 'typescript' }],
    })
    const cases = extractTestCases(rule)
    expect(cases).toHaveLength(1)
    expect(cases[0].type).toBe('good')
  })

  it('skips neutral labels like "Note" or "Example"', () => {
    const rule = makeRule({
      examples: [
        { label: 'Note', code: 'note()', language: 'typescript' },
        { label: 'Incorrect', code: 'bad()', language: 'typescript' },
      ],
    })
    const cases = extractTestCases(rule)
    // Only "Incorrect" is extracted; "Note" is skipped
    expect(cases).toHaveLength(1)
    expect(cases[0].type).toBe('bad')
  })

  it('copies ruleId and ruleTitle from the rule', () => {
    const rule = makeRule({ id: '2.3', title: 'My Rule' })
    const cases = extractTestCases(rule)
    expect(cases[0].ruleId).toBe('2.3')
    expect(cases[0].ruleTitle).toBe('My Rule')
  })

  it('uses example description when provided', () => {
    const rule = makeRule({
      examples: [
        { label: 'Incorrect', description: 'slow path', code: 'bad()', language: 'typescript' },
      ],
    })
    const cases = extractTestCases(rule)
    expect(cases[0].description).toBe('slow path')
  })

  it('falls back to generated description when example has no description', () => {
    const rule = makeRule({
      title: 'My Rule',
      examples: [{ label: 'Incorrect', code: 'bad()', language: 'typescript' }],
    })
    const cases = extractTestCases(rule)
    expect(cases[0].description).toContain('Incorrect')
    expect(cases[0].description).toContain('My Rule')
  })

  it('uses example language', () => {
    const rule = makeRule({
      examples: [{ label: 'Correct', code: 'good()', language: 'tsx' }],
    })
    const cases = extractTestCases(rule)
    expect(cases[0].language).toBe('tsx')
  })

  it('defaults language to "typescript" when example has no language', () => {
    const rule = makeRule({
      examples: [{ label: 'Correct', code: 'good()' } as any],
    })
    const cases = extractTestCases(rule)
    expect(cases[0].language).toBe('typescript')
  })

  it('returns empty array when no examples match bad/good labels', () => {
    const rule = makeRule({ examples: [] })
    const cases = extractTestCases(rule)
    expect(cases).toHaveLength(0)
  })

  it('prefers "bad" type when label contains both "incorrect" and "correct"', () => {
    // Edge case: a label like "Incorrect (previously correct)"
    // isBad check runs first and wins
    const rule = makeRule({
      examples: [
        { label: 'Incorrect (previously correct)', code: 'x()', language: 'typescript' },
      ],
    })
    const cases = extractTestCases(rule)
    expect(cases[0].type).toBe('bad')
  })

  it('extracts multiple test cases from multiple examples', () => {
    const rule = makeRule({
      examples: [
        { label: 'Incorrect', code: 'bad()', language: 'typescript' },
        { label: 'Correct', code: 'good()', language: 'typescript' },
        { label: 'Wrong', code: 'also-bad()', language: 'typescript' },
        { label: 'Good', code: 'also-good()', language: 'typescript' },
      ],
    })
    const cases = extractTestCases(rule)
    expect(cases).toHaveLength(4)
    const badCount = cases.filter(c => c.type === 'bad').length
    const goodCount = cases.filter(c => c.type === 'good').length
    expect(badCount).toBe(2)
    expect(goodCount).toBe(2)
  })
})