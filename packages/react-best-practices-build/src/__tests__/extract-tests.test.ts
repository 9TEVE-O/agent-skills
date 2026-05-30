import { describe, it, expect } from 'vitest'
import { extractTestCases } from '../extract-tests.js'
import { Rule } from '../types.js'

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: '1.1',
    title: 'My Rule',
    section: 1,
    subsection: 1,
    impact: 'HIGH',
    explanation: 'This is an explanation.',
    examples: [],
    ...overrides,
  }
}

describe('extractTestCases', () => {
  describe('label detection', () => {
    it('extracts bad test case for "Incorrect" label', () => {
      const rule = makeRule({
        examples: [{ label: 'Incorrect', code: 'const bad = 1', language: 'typescript' }],
      })
      const cases = extractTestCases(rule)
      expect(cases).toHaveLength(1)
      expect(cases[0].type).toBe('bad')
    })

    it('extracts bad test case for "Wrong" label', () => {
      const rule = makeRule({
        examples: [{ label: 'Wrong', code: 'const wrong = 1', language: 'typescript' }],
      })
      const cases = extractTestCases(rule)
      expect(cases).toHaveLength(1)
      expect(cases[0].type).toBe('bad')
    })

    it('extracts bad test case for "Bad" label', () => {
      const rule = makeRule({
        examples: [{ label: 'Bad', code: 'const bad = 1', language: 'typescript' }],
      })
      const cases = extractTestCases(rule)
      expect(cases).toHaveLength(1)
      expect(cases[0].type).toBe('bad')
    })

    it('extracts good test case for "Correct" label', () => {
      const rule = makeRule({
        examples: [{ label: 'Correct', code: 'const good = 1', language: 'typescript' }],
      })
      const cases = extractTestCases(rule)
      expect(cases).toHaveLength(1)
      expect(cases[0].type).toBe('good')
    })

    it('extracts good test case for "Good" label', () => {
      const rule = makeRule({
        examples: [{ label: 'Good', code: 'const good = 1', language: 'typescript' }],
      })
      const cases = extractTestCases(rule)
      expect(cases).toHaveLength(1)
      expect(cases[0].type).toBe('good')
    })

    it('ignores "Example" label (not extracted)', () => {
      const rule = makeRule({
        examples: [{ label: 'Example', code: 'const x = 1', language: 'typescript' }],
      })
      const cases = extractTestCases(rule)
      expect(cases).toHaveLength(0)
    })

    it('ignores "Usage" label (not extracted)', () => {
      const rule = makeRule({
        examples: [{ label: 'Usage', code: 'const x = 1', language: 'typescript' }],
      })
      const cases = extractTestCases(rule)
      expect(cases).toHaveLength(0)
    })

    it('ignores "Note" label (not extracted)', () => {
      const rule = makeRule({
        examples: [{ label: 'Note', code: 'const x = 1', language: 'typescript' }],
      })
      const cases = extractTestCases(rule)
      expect(cases).toHaveLength(0)
    })

    it('ignores "Alternative" label (not extracted)', () => {
      const rule = makeRule({
        examples: [{ label: 'Alternative', code: 'const x = 1', language: 'typescript' }],
      })
      const cases = extractTestCases(rule)
      expect(cases).toHaveLength(0)
    })

    it('ignores "Implementation" label (not extracted)', () => {
      const rule = makeRule({
        examples: [{ label: 'Implementation', code: 'const x = 1', language: 'typescript' }],
      })
      const cases = extractTestCases(rule)
      expect(cases).toHaveLength(0)
    })
  })

  describe('case insensitivity', () => {
    it('matches "INCORRECT" case-insensitively', () => {
      const rule = makeRule({
        examples: [{ label: 'INCORRECT', code: 'const bad = 1', language: 'typescript' }],
      })
      const cases = extractTestCases(rule)
      expect(cases[0].type).toBe('bad')
    })

    it('matches "incorrect" case-insensitively', () => {
      const rule = makeRule({
        examples: [{ label: 'incorrect', code: 'const bad = 1', language: 'typescript' }],
      })
      const cases = extractTestCases(rule)
      expect(cases[0].type).toBe('bad')
    })

    it('matches "CORRECT" case-insensitively', () => {
      const rule = makeRule({
        examples: [{ label: 'CORRECT', code: 'const good = 1', language: 'typescript' }],
      })
      const cases = extractTestCases(rule)
      expect(cases[0].type).toBe('good')
    })
  })

  describe('test case properties', () => {
    it('sets ruleId from rule.id', () => {
      const rule = makeRule({
        id: '2.3',
        examples: [{ label: 'Incorrect', code: 'const bad = 1', language: 'typescript' }],
      })
      const cases = extractTestCases(rule)
      expect(cases[0].ruleId).toBe('2.3')
    })

    it('sets ruleTitle from rule.title', () => {
      const rule = makeRule({
        title: 'Promise.all() for Independent Operations',
        examples: [{ label: 'Incorrect', code: 'const bad = 1', language: 'typescript' }],
      })
      const cases = extractTestCases(rule)
      expect(cases[0].ruleTitle).toBe('Promise.all() for Independent Operations')
    })

    it('sets code from example.code', () => {
      const rule = makeRule({
        examples: [{ label: 'Incorrect', code: 'const bad = sequentialFetch()', language: 'typescript' }],
      })
      const cases = extractTestCases(rule)
      expect(cases[0].code).toBe('const bad = sequentialFetch()')
    })

    it('sets language from example.language', () => {
      const rule = makeRule({
        examples: [{ label: 'Correct', code: 'const x = 1', language: 'tsx' }],
      })
      const cases = extractTestCases(rule)
      expect(cases[0].language).toBe('tsx')
    })

    it('defaults language to typescript when example.language is undefined', () => {
      const rule = makeRule({
        examples: [{ label: 'Correct', code: 'const x = 1', language: undefined }],
      })
      const cases = extractTestCases(rule)
      expect(cases[0].language).toBe('typescript')
    })

    it('uses example.description when available', () => {
      const rule = makeRule({
        examples: [{
          label: 'Incorrect',
          code: 'const bad = 1',
          language: 'typescript',
          description: 'Sequential execution, 3 round trips',
        }],
      })
      const cases = extractTestCases(rule)
      expect(cases[0].description).toBe('Sequential execution, 3 round trips')
    })

    it('generates description from label and title when description is undefined', () => {
      const rule = makeRule({
        title: 'Parallel Fetching',
        examples: [{ label: 'Incorrect', code: 'const bad = 1', language: 'typescript' }],
      })
      const cases = extractTestCases(rule)
      expect(cases[0].description).toBe('Incorrect example for Parallel Fetching')
    })
  })

  describe('multiple examples', () => {
    it('extracts both bad and good from a typical rule', () => {
      const rule = makeRule({
        examples: [
          { label: 'Incorrect', code: 'const bad = 1', language: 'typescript' },
          { label: 'Correct', code: 'const good = 2', language: 'typescript' },
        ],
      })
      const cases = extractTestCases(rule)
      expect(cases).toHaveLength(2)
      expect(cases[0].type).toBe('bad')
      expect(cases[1].type).toBe('good')
    })

    it('extracts only matching examples from a mixed list', () => {
      const rule = makeRule({
        examples: [
          { label: 'Incorrect', code: 'const bad = 1', language: 'typescript' },
          { label: 'Note', code: 'some note', language: 'typescript' },
          { label: 'Correct', code: 'const good = 2', language: 'typescript' },
          { label: 'Alternative', code: 'const alt = 3', language: 'typescript' },
        ],
      })
      const cases = extractTestCases(rule)
      expect(cases).toHaveLength(2)
      expect(cases[0].type).toBe('bad')
      expect(cases[1].type).toBe('good')
    })

    it('handles multiple bad and multiple good examples', () => {
      const rule = makeRule({
        examples: [
          { label: 'Incorrect', code: 'const bad1 = 1', language: 'typescript' },
          { label: 'Wrong', code: 'const bad2 = 2', language: 'typescript' },
          { label: 'Correct', code: 'const good1 = 3', language: 'typescript' },
          { label: 'Good', code: 'const good2 = 4', language: 'typescript' },
        ],
      })
      const cases = extractTestCases(rule)
      expect(cases).toHaveLength(4)
      expect(cases.filter(c => c.type === 'bad')).toHaveLength(2)
      expect(cases.filter(c => c.type === 'good')).toHaveLength(2)
    })
  })

  describe('edge cases', () => {
    it('returns empty array for empty examples list', () => {
      const rule = makeRule({ examples: [] })
      const cases = extractTestCases(rule)
      expect(cases).toHaveLength(0)
    })

    it('returns empty array when no examples match bad/good labels', () => {
      const rule = makeRule({
        examples: [
          { label: 'Example', code: 'const x = 1', language: 'typescript' },
          { label: 'Note', code: 'const y = 2', language: 'typescript' },
        ],
      })
      const cases = extractTestCases(rule)
      expect(cases).toHaveLength(0)
    })

    it('isBad takes precedence over isGood when label matches both', () => {
      // A label containing "incorrect" also doesn't contain "correct" as a substring check
      // But a label like "Not Incorrect" would match "incorrect" for bad first
      const rule = makeRule({
        examples: [{ label: 'Incorrect but also correct', code: 'const x = 1', language: 'typescript' }],
      })
      const cases = extractTestCases(rule)
      // label includes "incorrect" -> isBad=true; label also includes "correct" -> isGood=true
      // The code does: type: isBad ? 'bad' : 'good'
      // So isBad takes priority
      expect(cases[0].type).toBe('bad')
    })
  })
})