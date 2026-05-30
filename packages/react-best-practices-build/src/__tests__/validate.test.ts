import { describe, it, expect } from 'vitest'
import { validateRule } from '../validate.js'
import { Rule } from '../types.js'

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: '1.1',
    title: 'My Rule',
    section: 1,
    subsection: 1,
    impact: 'HIGH',
    explanation: 'This is an explanation of the rule.',
    examples: [
      {
        label: 'Incorrect',
        code: 'const bad = 1',
        language: 'typescript',
      },
      {
        label: 'Correct',
        code: 'const good = 2',
        language: 'typescript',
      },
    ],
    ...overrides,
  }
}

describe('validateRule', () => {
  describe('valid rules', () => {
    it('returns no errors for a fully valid rule', () => {
      const rule = makeRule()
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors).toHaveLength(0)
    })

    it('accepts CRITICAL impact level', () => {
      const rule = makeRule({ impact: 'CRITICAL' })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors).toHaveLength(0)
    })

    it('accepts HIGH impact level', () => {
      const rule = makeRule({ impact: 'HIGH' })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors).toHaveLength(0)
    })

    it('accepts MEDIUM-HIGH impact level', () => {
      const rule = makeRule({ impact: 'MEDIUM-HIGH' })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors).toHaveLength(0)
    })

    it('accepts MEDIUM impact level', () => {
      const rule = makeRule({ impact: 'MEDIUM' })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors).toHaveLength(0)
    })

    it('accepts LOW-MEDIUM impact level', () => {
      const rule = makeRule({ impact: 'LOW-MEDIUM' })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors).toHaveLength(0)
    })

    it('accepts LOW impact level', () => {
      const rule = makeRule({ impact: 'LOW' })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors).toHaveLength(0)
    })

    it('passes with only bad example (hasBad=true, hasGood=false)', () => {
      // The validation checks: if !hasBad && !hasGood => error
      // So having only a bad example is sufficient
      const rule = makeRule({
        examples: [{ label: 'Incorrect', code: 'const bad = 1', language: 'typescript' }],
      })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors).toHaveLength(0)
    })

    it('passes with only good example (hasBad=false, hasGood=true)', () => {
      const rule = makeRule({
        examples: [{ label: 'Correct', code: 'const good = 1', language: 'typescript' }],
      })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors).toHaveLength(0)
    })

    it('accepts "good" label as good example', () => {
      const rule = makeRule({
        examples: [{ label: 'Good', code: 'const good = 1', language: 'typescript' }],
      })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors).toHaveLength(0)
    })

    it('accepts "wrong" label as bad example', () => {
      const rule = makeRule({
        examples: [{ label: 'Wrong', code: 'const bad = 1', language: 'typescript' }],
      })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors).toHaveLength(0)
    })

    it('accepts "bad" label as bad example', () => {
      const rule = makeRule({
        examples: [{ label: 'Bad', code: 'const bad = 1', language: 'typescript' }],
      })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors).toHaveLength(0)
    })

    it('accepts "usage" label as good example', () => {
      const rule = makeRule({
        examples: [{ label: 'Usage', code: 'const x = 1', language: 'typescript' }],
      })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors).toHaveLength(0)
    })

    it('accepts "implementation" label as good example', () => {
      const rule = makeRule({
        examples: [{ label: 'Implementation', code: 'const x = 1', language: 'typescript' }],
      })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors).toHaveLength(0)
    })

    it('accepts "example" label as good example', () => {
      const rule = makeRule({
        examples: [{ label: 'Example', code: 'const x = 1', language: 'typescript' }],
      })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors).toHaveLength(0)
    })

    it('ignores examples without code when checking for bad/good (informational examples)', () => {
      // Informational examples without code are filtered out for the bad/good check
      // But we still need at least one code example
      const rule = makeRule({
        examples: [
          { label: 'Note', code: '', language: 'typescript' }, // no code - informational
          { label: 'Correct', code: 'const good = 1', language: 'typescript' },
        ],
      })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors).toHaveLength(0)
    })
  })

  describe('title validation', () => {
    it('returns error for missing title', () => {
      const rule = makeRule({ title: '' })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors.some(e => e.message.includes('title'))).toBe(true)
    })

    it('returns error for whitespace-only title', () => {
      const rule = makeRule({ title: '   ' })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors.some(e => e.message.includes('title'))).toBe(true)
    })

    it('includes filename in title error', () => {
      const rule = makeRule({ title: '' })
      const errors = validateRule(rule, 'my-rule.md')
      expect(errors[0].file).toBe('my-rule.md')
    })
  })

  describe('explanation validation', () => {
    it('returns error for missing explanation', () => {
      const rule = makeRule({ explanation: '' })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors.some(e => e.message.includes('explanation'))).toBe(true)
    })

    it('returns error for whitespace-only explanation', () => {
      const rule = makeRule({ explanation: '   ' })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors.some(e => e.message.includes('explanation'))).toBe(true)
    })
  })

  describe('examples validation', () => {
    it('returns error when examples array is empty', () => {
      const rule = makeRule({ examples: [] })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors.some(e => e.message.includes('Missing examples'))).toBe(true)
    })

    it('returns error when all examples have no code', () => {
      const rule = makeRule({
        examples: [
          { label: 'Note', code: '', language: 'typescript' },
          { label: 'Trade-off', code: '   ', language: 'typescript' },
        ],
      })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors.some(e => e.message.includes('code examples'))).toBe(true)
    })

    it('returns error when code examples are neither bad nor good', () => {
      const rule = makeRule({
        examples: [
          { label: 'Note', code: 'const x = 1', language: 'typescript' },
          { label: 'Trade-off', code: 'const y = 2', language: 'typescript' },
        ],
      })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors.some(e => e.message.includes('bad/incorrect or good/correct'))).toBe(true)
    })
  })

  describe('impact validation', () => {
    it('returns error for invalid impact level', () => {
      const rule = makeRule({ impact: 'INVALID' as any })
      const errors = validateRule(rule, 'test-rule.md')
      expect(errors.some(e => e.message.includes('Invalid impact level'))).toBe(true)
    })

    it('includes the invalid impact value in the error message', () => {
      const rule = makeRule({ impact: 'SUPER-CRITICAL' as any })
      const errors = validateRule(rule, 'test-rule.md')
      const impactError = errors.find(e => e.message.includes('Invalid impact level'))
      expect(impactError?.message).toContain('SUPER-CRITICAL')
    })

    it('error message lists valid impact levels', () => {
      const rule = makeRule({ impact: 'INVALID' as any })
      const errors = validateRule(rule, 'test-rule.md')
      const impactError = errors.find(e => e.message.includes('Invalid impact level'))
      expect(impactError?.message).toContain('CRITICAL')
      expect(impactError?.message).toContain('HIGH')
      expect(impactError?.message).toContain('LOW')
    })
  })

  describe('multiple errors', () => {
    it('collects multiple errors for a rule with several problems', () => {
      const rule = makeRule({
        title: '',
        explanation: '',
        examples: [],
        impact: 'INVALID' as any,
      })
      const errors = validateRule(rule, 'bad-rule.md')
      expect(errors.length).toBeGreaterThan(1)
    })
  })

  describe('error structure', () => {
    it('error includes file property', () => {
      const rule = makeRule({ title: '' })
      const errors = validateRule(rule, 'my-file.md')
      expect(errors[0].file).toBe('my-file.md')
    })

    it('error includes ruleId property', () => {
      const rule = makeRule({ id: '3.5', title: '' })
      const errors = validateRule(rule, 'test.md')
      expect(errors[0].ruleId).toBe('3.5')
    })

    it('error includes message property', () => {
      const rule = makeRule({ title: '' })
      const errors = validateRule(rule, 'test.md')
      expect(errors[0].message).toBeTruthy()
    })
  })

  describe('case insensitivity in label matching', () => {
    it('matches incorrect label case-insensitively', () => {
      const rule = makeRule({
        examples: [{ label: 'INCORRECT', code: 'const bad = 1', language: 'typescript' }],
      })
      const errors = validateRule(rule, 'test.md')
      expect(errors).toHaveLength(0)
    })

    it('matches correct label case-insensitively', () => {
      const rule = makeRule({
        examples: [{ label: 'CORRECT', code: 'const good = 1', language: 'typescript' }],
      })
      const errors = validateRule(rule, 'test.md')
      expect(errors).toHaveLength(0)
    })
  })
})