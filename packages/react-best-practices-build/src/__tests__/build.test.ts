import { describe, it, expect } from 'vitest'
import { incrementVersion, generateMarkdown } from '../build.js'
import { Section } from '../types.js'
import { SkillConfig } from '../config.js'

const mockSkillConfig: SkillConfig = {
  name: 'react-best-practices',
  title: 'React Best Practices',
  description: 'React and Next.js codebases',
  skillDir: '/fake/skills/react-best-practices',
  rulesDir: '/fake/skills/react-best-practices/rules',
  metadataFile: '/fake/skills/react-best-practices/metadata.json',
  outputFile: '/fake/skills/react-best-practices/AGENTS.md',
  sectionMap: { async: 1, bundle: 2 },
}

const mockMetadata = {
  version: '1.2.3',
  organization: 'Vercel Engineering',
  date: 'January 2026',
  abstract: 'A comprehensive guide for React performance.',
}

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    number: 1,
    title: 'Eliminating Waterfalls',
    impact: 'CRITICAL',
    rules: [
      {
        id: '1.1',
        title: 'Promise.all for Independent Operations',
        section: 1,
        subsection: 1,
        impact: 'CRITICAL',
        explanation: 'Use Promise.all to run independent operations in parallel.',
        examples: [
          { label: 'Incorrect', code: 'const a = await fetchA()\nconst b = await fetchB()', language: 'typescript' },
          { label: 'Correct', code: 'const [a, b] = await Promise.all([fetchA(), fetchB()])', language: 'typescript' },
        ],
      },
    ],
    ...overrides,
  }
}

describe('incrementVersion', () => {
  it('increments the last part of a 3-part version', () => {
    expect(incrementVersion('1.0.0')).toBe('1.0.1')
  })

  it('increments the last part of a 2-part version', () => {
    expect(incrementVersion('0.1')).toBe('0.2')
  })

  it('increments a single-part version', () => {
    expect(incrementVersion('1')).toBe('2')
  })

  it('handles version with last part at 9', () => {
    expect(incrementVersion('0.9.9')).toBe('0.9.10')
  })

  it('increments without carrying over to previous parts', () => {
    // incrementVersion only increments the last digit, no carry
    expect(incrementVersion('1.0.9')).toBe('1.0.10')
  })

  it('handles a multi-part version like 2.5.3', () => {
    expect(incrementVersion('2.5.3')).toBe('2.5.4')
  })

  it('handles a 4-part version', () => {
    expect(incrementVersion('1.2.3.4')).toBe('1.2.3.5')
  })

  it('increments 0 to 1', () => {
    expect(incrementVersion('0.0.0')).toBe('0.0.1')
  })
})

describe('generateMarkdown', () => {
  describe('document header', () => {
    it('includes the skill title as H1', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('# React Best Practices')
    })

    it('includes the version from metadata', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('Version 1.2.3')
    })

    it('includes the organization from metadata', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('Vercel Engineering')
    })

    it('includes the date from metadata', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('January 2026')
    })

    it('includes the abstract from metadata', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('A comprehensive guide for React performance.')
    })

    it('includes the skill description in the note', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('React and Next.js codebases')
    })
  })

  describe('table of contents', () => {
    it('includes section in TOC', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('Eliminating Waterfalls')
      expect(md).toContain('CRITICAL')
    })

    it('includes rule in TOC', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('Promise.all for Independent Operations')
    })

    it('includes rule ID in TOC', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('1.1')
    })

    it('generates TOC entry with anchor for section', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('#1-eliminating-waterfalls')
    })

    it('generates TOC entry with anchor for rule (stripped of special chars)', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      // anchor: "1.1 Promise.all for Independent Operations".toLowerCase().replace spaces with -
      // and remove non-word chars: "11-promiseall-for-independent-operations"
      expect(md).toContain('#11-promiseall-for-independent-operations')
    })

    it('includes multiple sections in TOC', () => {
      const sections = [
        makeSection({ number: 1, title: 'Eliminating Waterfalls', impact: 'CRITICAL' }),
        makeSection({ number: 2, title: 'Bundle Size Optimization', impact: 'CRITICAL', rules: [] }),
      ]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('Eliminating Waterfalls')
      expect(md).toContain('Bundle Size Optimization')
    })
  })

  describe('section content', () => {
    it('renders section heading with number and title', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('## 1. Eliminating Waterfalls')
    })

    it('renders section impact', () => {
      const sections = [makeSection({ impact: 'CRITICAL' })]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('**Impact: CRITICAL**')
    })

    it('renders section impact description when present', () => {
      const sections = [makeSection({ impact: 'HIGH', impactDescription: 'major improvement' })]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('**Impact: HIGH (major improvement)**')
    })

    it('renders section introduction when present', () => {
      const sections = [makeSection({ introduction: 'Waterfalls are the #1 performance killer.' })]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('Waterfalls are the #1 performance killer.')
    })

    it('does not render introduction section when absent', () => {
      const sections = [makeSection({ introduction: undefined })]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      // Should not have two consecutive blank lines with just "---" and nothing extra
      // The introduction won't appear
      expect(md).not.toContain('undefined')
    })
  })

  describe('rule content', () => {
    it('renders rule heading with ID and title', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('### 1.1 Promise.all for Independent Operations')
    })

    it('renders rule impact', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('**Impact: CRITICAL**')
    })

    it('renders rule impact description when present', () => {
      const sections = [makeSection({
        rules: [{
          id: '1.1',
          title: 'My Rule',
          section: 1,
          subsection: 1,
          impact: 'HIGH',
          impactDescription: '2-10× improvement',
          explanation: 'Explanation.',
          examples: [],
        }],
      })]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('**Impact: HIGH (2-10× improvement)**')
    })

    it('renders rule explanation', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('Use Promise.all to run independent operations in parallel.')
    })

    it('renders code block for Incorrect example', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('**Incorrect:**')
      expect(md).toContain('```typescript')
      expect(md).toContain('const a = await fetchA()')
    })

    it('renders code block for Correct example', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('**Correct:**')
      expect(md).toContain('const [a, b] = await Promise.all([fetchA(), fetchB()])')
    })

    it('renders example with description', () => {
      const sections = [makeSection({
        rules: [{
          id: '1.1',
          title: 'My Rule',
          section: 1,
          subsection: 1,
          impact: 'HIGH',
          explanation: 'Explanation.',
          examples: [{
            label: 'Incorrect',
            description: 'sequential execution, 3 round trips',
            code: 'const bad = 1',
            language: 'typescript',
          }],
        }],
      })]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('**Incorrect: sequential execution, 3 round trips**')
    })

    it('renders example additional text when present', () => {
      const sections = [makeSection({
        rules: [{
          id: '1.1',
          title: 'My Rule',
          section: 1,
          subsection: 1,
          impact: 'HIGH',
          explanation: 'Explanation.',
          examples: [{
            label: 'Correct',
            code: 'const good = 1',
            language: 'typescript',
            additionalText: 'This is why this approach is better.',
          }],
        }],
      })]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('This is why this approach is better.')
    })

    it('skips code block when example has no code', () => {
      const sections = [makeSection({
        rules: [{
          id: '1.1',
          title: 'My Rule',
          section: 1,
          subsection: 1,
          impact: 'HIGH',
          explanation: 'Explanation.',
          examples: [{
            label: 'Note',
            code: '',
            language: 'typescript',
            additionalText: 'Some note here.',
          }],
        }],
      })]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('**Note:**')
      expect(md).toContain('Some note here.')
    })

    it('renders references when present', () => {
      const sections = [makeSection({
        rules: [{
          id: '1.1',
          title: 'My Rule',
          section: 1,
          subsection: 1,
          impact: 'HIGH',
          explanation: 'Explanation.',
          examples: [],
          references: ['https://react.dev', 'https://nextjs.org'],
        }],
      })]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('Reference:')
      expect(md).toContain('[https://react.dev](https://react.dev)')
      expect(md).toContain('[https://nextjs.org](https://nextjs.org)')
    })

    it('does not render Reference line when no references', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      // The example rule has no references, so should not render the reference line
      // (other sections might add it, but the default makeSection has no references)
      // Just check that our specific rule generates no "Reference:" line before the ---
      const lines = md.split('\n')
      const refLine = lines.find(l => l.startsWith('Reference:'))
      expect(refLine).toBeUndefined()
    })
  })

  describe('document references section', () => {
    it('renders References section when metadata.references is present', () => {
      const sections = [makeSection()]
      const metaWithRefs = { ...mockMetadata, references: ['https://react.dev', 'https://nextjs.org'] }
      const md = generateMarkdown(sections, metaWithRefs, mockSkillConfig)
      expect(md).toContain('## References')
      expect(md).toContain('1. [https://react.dev](https://react.dev)')
      expect(md).toContain('2. [https://nextjs.org](https://nextjs.org)')
    })

    it('does not render References section when metadata.references is absent', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).not.toContain('## References')
    })

    it('does not render References section when metadata.references is empty', () => {
      const sections = [makeSection()]
      const metaWithEmptyRefs = { ...mockMetadata, references: [] }
      const md = generateMarkdown(sections, metaWithEmptyRefs, mockSkillConfig)
      expect(md).not.toContain('## References')
    })
  })

  describe('section separators', () => {
    it('separates sections with ---', () => {
      const sections = [makeSection()]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      // Should have horizontal rule separators
      expect(md).toContain('\n---\n')
    })
  })

  describe('empty sections', () => {
    it('handles empty sections array gracefully', () => {
      const md = generateMarkdown([], mockMetadata, mockSkillConfig)
      // Should still have header, abstract, etc.
      expect(md).toContain('# React Best Practices')
      expect(md).toContain('## Abstract')
      expect(md).toContain('## Table of Contents')
    })
  })

  describe('code language in output', () => {
    it('uses the example language for the code block', () => {
      const sections = [makeSection({
        rules: [{
          id: '1.1',
          title: 'My Rule',
          section: 1,
          subsection: 1,
          impact: 'HIGH',
          explanation: 'Explanation.',
          examples: [{
            label: 'Correct',
            code: 'const x = <div />',
            language: 'tsx',
          }],
        }],
      })]
      const md = generateMarkdown(sections, mockSkillConfig as any, mockSkillConfig)
      const mdReal = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(mdReal).toContain('```tsx')
    })

    it('defaults to typescript when no language specified', () => {
      const sections = [makeSection({
        rules: [{
          id: '1.1',
          title: 'My Rule',
          section: 1,
          subsection: 1,
          impact: 'HIGH',
          explanation: 'Explanation.',
          examples: [{
            label: 'Correct',
            code: 'const x = 1',
            // language undefined
          }],
        }],
      })]
      const md = generateMarkdown(sections, mockMetadata, mockSkillConfig)
      expect(md).toContain('```typescript')
    })
  })
})