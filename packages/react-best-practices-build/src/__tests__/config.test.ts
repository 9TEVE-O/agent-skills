import { describe, it, expect } from 'vitest'
import {
  SKILLS,
  DEFAULT_SKILL,
  SKILLS_DIR,
  BUILD_DIR,
  SKILL_DIR,
  RULES_DIR,
  METADATA_FILE,
  OUTPUT_FILE,
  TEST_CASES_FILE,
} from '../config.js'

describe('config - SKILLS', () => {
  it('defines the react-best-practices skill', () => {
    expect(SKILLS).toHaveProperty('react-best-practices')
  })

  it('defines the react-native-skills skill', () => {
    expect(SKILLS).toHaveProperty('react-native-skills')
  })

  it('defines the composition-patterns skill', () => {
    expect(SKILLS).toHaveProperty('composition-patterns')
  })

  it('has exactly 3 skill entries', () => {
    expect(Object.keys(SKILLS)).toHaveLength(3)
  })

  describe('react-best-practices skill config', () => {
    const skill = SKILLS['react-best-practices']

    it('has correct name', () => {
      expect(skill.name).toBe('react-best-practices')
    })

    it('has correct title', () => {
      expect(skill.title).toBe('React Best Practices')
    })

    it('has description mentioning React and Next.js', () => {
      expect(skill.description).toContain('React')
      expect(skill.description).toContain('Next.js')
    })

    it('skillDir contains "react-best-practices"', () => {
      expect(skill.skillDir).toContain('react-best-practices')
    })

    it('rulesDir is inside skillDir', () => {
      expect(skill.rulesDir).toContain(skill.skillDir)
    })

    it('metadataFile points to metadata.json', () => {
      expect(skill.metadataFile).toMatch(/metadata\.json$/)
      expect(skill.metadataFile).toContain('react-best-practices')
    })

    it('outputFile points to AGENTS.md', () => {
      expect(skill.outputFile).toMatch(/AGENTS\.md$/)
      expect(skill.outputFile).toContain('react-best-practices')
    })

    it('sectionMap has async=1', () => {
      expect(skill.sectionMap.async).toBe(1)
    })

    it('sectionMap has bundle=2', () => {
      expect(skill.sectionMap.bundle).toBe(2)
    })

    it('sectionMap has server=3', () => {
      expect(skill.sectionMap.server).toBe(3)
    })

    it('sectionMap has client=4', () => {
      expect(skill.sectionMap.client).toBe(4)
    })

    it('sectionMap has rerender=5', () => {
      expect(skill.sectionMap.rerender).toBe(5)
    })

    it('sectionMap has rendering=6', () => {
      expect(skill.sectionMap.rendering).toBe(6)
    })

    it('sectionMap has js=7', () => {
      expect(skill.sectionMap.js).toBe(7)
    })

    it('sectionMap has advanced=8', () => {
      expect(skill.sectionMap.advanced).toBe(8)
    })
  })

  describe('react-native-skills skill config', () => {
    const skill = SKILLS['react-native-skills']

    it('has correct name', () => {
      expect(skill.name).toBe('react-native-skills')
    })

    it('has correct title', () => {
      expect(skill.title).toBe('React Native Skills')
    })

    it('sectionMap has rendering=1', () => {
      expect(skill.sectionMap.rendering).toBe(1)
    })

    it('sectionMap has list-performance=2', () => {
      expect(skill.sectionMap['list-performance']).toBe(2)
    })

    it('sectionMap has animation=3', () => {
      expect(skill.sectionMap.animation).toBe(3)
    })

    it('sectionMap has fonts=14 (highest)', () => {
      expect(skill.sectionMap.fonts).toBe(14)
    })

    it('rulesDir is inside skillDir', () => {
      expect(skill.rulesDir).toContain(skill.skillDir)
    })

    it('outputFile points to AGENTS.md', () => {
      expect(skill.outputFile).toMatch(/AGENTS\.md$/)
    })
  })

  describe('composition-patterns skill config', () => {
    const skill = SKILLS['composition-patterns']

    it('has correct name', () => {
      expect(skill.name).toBe('composition-patterns')
    })

    it('has correct title', () => {
      expect(skill.title).toBe('React Composition Patterns')
    })

    it('sectionMap has architecture=1', () => {
      expect(skill.sectionMap.architecture).toBe(1)
    })

    it('sectionMap has state=2', () => {
      expect(skill.sectionMap.state).toBe(2)
    })

    it('sectionMap has patterns=3', () => {
      expect(skill.sectionMap.patterns).toBe(3)
    })

    it('sectionMap has react19=4', () => {
      expect(skill.sectionMap.react19).toBe(4)
    })
  })
})

describe('config - DEFAULT_SKILL', () => {
  it('defaults to react-best-practices', () => {
    expect(DEFAULT_SKILL).toBe('react-best-practices')
  })

  it('is a valid key in SKILLS', () => {
    expect(SKILLS).toHaveProperty(DEFAULT_SKILL)
  })
})

describe('config - legacy exports', () => {
  it('SKILL_DIR matches the default skill skillDir', () => {
    expect(SKILL_DIR).toBe(SKILLS[DEFAULT_SKILL].skillDir)
  })

  it('RULES_DIR matches the default skill rulesDir', () => {
    expect(RULES_DIR).toBe(SKILLS[DEFAULT_SKILL].rulesDir)
  })

  it('METADATA_FILE matches the default skill metadataFile', () => {
    expect(METADATA_FILE).toBe(SKILLS[DEFAULT_SKILL].metadataFile)
  })

  it('OUTPUT_FILE matches the default skill outputFile', () => {
    expect(OUTPUT_FILE).toBe(SKILLS[DEFAULT_SKILL].outputFile)
  })
})

describe('config - path structure', () => {
  it('SKILLS_DIR is an absolute path', () => {
    expect(SKILLS_DIR).toMatch(/^\//)
  })

  it('BUILD_DIR is an absolute path', () => {
    expect(BUILD_DIR).toMatch(/^\//)
  })

  it('TEST_CASES_FILE is inside BUILD_DIR', () => {
    expect(TEST_CASES_FILE).toContain(BUILD_DIR)
    expect(TEST_CASES_FILE).toMatch(/test-cases\.json$/)
  })

  it('all skill rulesDir paths are absolute', () => {
    for (const skill of Object.values(SKILLS)) {
      expect(skill.rulesDir).toMatch(/^\//)
    }
  })

  it('all skill outputFile paths end in AGENTS.md', () => {
    for (const skill of Object.values(SKILLS)) {
      expect(skill.outputFile).toMatch(/AGENTS\.md$/)
    }
  })

  it('all skill metadataFile paths end in metadata.json', () => {
    for (const skill of Object.values(SKILLS)) {
      expect(skill.metadataFile).toMatch(/metadata\.json$/)
    }
  })

  it('each skill rulesDir is a subdirectory of its skillDir', () => {
    for (const skill of Object.values(SKILLS)) {
      expect(skill.rulesDir).toContain(skill.skillDir)
    }
  })

  it('each skill metadataFile is inside its skillDir', () => {
    for (const skill of Object.values(SKILLS)) {
      expect(skill.metadataFile).toContain(skill.skillDir)
    }
  })
})