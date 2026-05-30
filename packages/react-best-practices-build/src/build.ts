#!/usr/bin/env node
/**
 * Build script to compile individual rule files into AGENTS.md
 */

import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { Rule, Section, ImpactLevel } from './types.js'
import { parseRuleFile, RuleFile } from './parser.js'
import { SKILLS, SkillConfig, DEFAULT_SKILL } from './config.js'
import { incrementVersion, generateMarkdown } from './utils.js'

// Parse command line arguments
const args = process.argv.slice(2)
const upgradeVersion = args.includes('--upgrade-version')
const skillArg = args.find((arg) => arg.startsWith('--skill='))
const skillName = skillArg ? skillArg.split('=')[1] : null
const buildAll = args.includes('--all')

/**
 * Build a single skill
 */
async function buildSkill(skillConfig: SkillConfig) {
  console.log(`\nBuilding ${skillConfig.name}...`)
  console.log(`  Rules directory: ${skillConfig.rulesDir}`)
  console.log(`  Output file: ${skillConfig.outputFile}`)

  // Read all rule files (exclude files starting with _ and README.md)
  const files = await readdir(skillConfig.rulesDir)
  const ruleFiles = files
    .filter((f) => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md')
    .sort() // Sort filenames for consistent ordering across systems

  const ruleData: RuleFile[] = []
  for (const file of ruleFiles) {
    const filePath = join(skillConfig.rulesDir, file)
    try {
      const parsed = await parseRuleFile(filePath, skillConfig.sectionMap)
      ruleData.push(parsed)
    } catch (error) {
      console.error(`  Error parsing ${file}:`, error)
    }
  }

  // Group rules by section
  const sectionsMap = new Map<number, Section>()

  ruleData.forEach(({ section, rule }) => {
    if (!sectionsMap.has(section)) {
      sectionsMap.set(section, {
        number: section,
        title: `Section ${section}`, // Will be overridden by section metadata
        impact: rule.impact,
        rules: [],
      })
    }
    sectionsMap.get(section)!.rules.push(rule)
  })

  // Sort rules within each section by title (using en-US locale for consistency across environments)
  sectionsMap.forEach((section) => {
    section.rules.sort((a, b) =>
      a.title.localeCompare(b.title, 'en-US', { sensitivity: 'base' })
    )

    // Assign IDs based on sorted order
    section.rules.forEach((rule, index) => {
      rule.id = `${section.number}.${index + 1}`
      rule.subsection = index + 1
    })
  })

  // Convert to array and sort
  const sections = Array.from(sectionsMap.values()).sort(
    (a, b) => a.number - b.number
  )

  // Read section metadata from consolidated _sections.md file
  const sectionsFile = join(skillConfig.rulesDir, '_sections.md')
  try {
    const sectionsContent = await readFile(sectionsFile, 'utf-8')

    // Parse sections using regex to match each section block
    const sectionBlocks = sectionsContent
      .split(/(?=^## \d+\. )/m)
      .filter(Boolean)

    for (const block of sectionBlocks) {
      // Extract section number and title, removing section ID in parentheses
      const headerMatch = block.match(/^## (\d+)\.\s+(.+?)(?:\s+\([^)]+\))?$/m)
      if (!headerMatch) continue

      const sectionNumber = parseInt(headerMatch[1])
      const sectionTitle = headerMatch[2].trim() // Strip (id) for output

      // Extract impact (format: **Impact:** CRITICAL)
      const impactMatch = block.match(/\*\*Impact:\*\*\s+(\w+(?:-\w+)?)/i)
      const impactLevel = impactMatch
        ? (impactMatch[1].toUpperCase().replace(/-/g, '-') as ImpactLevel)
        : 'MEDIUM'

      // Extract description (format: **Description:** text)
      const descMatch = block.match(/\*\*Description:\*\*\s+(.+?)(?=\n\n##|$)/s)
      const description = descMatch ? descMatch[1].trim() : ''

      // Update section if it exists
      const section = sections.find((s) => s.number === sectionNumber)
      if (section) {
        section.title = sectionTitle
        section.impact = impactLevel
        section.introduction = description
      }
    }
  } catch (error) {
    console.warn('  Warning: Could not read _sections.md, using defaults')
  }

  // Read metadata
  let metadata
  try {
    const metadataContent = await readFile(skillConfig.metadataFile, 'utf-8')
    metadata = JSON.parse(metadataContent)
  } catch {
    metadata = {
      version: '1.0.0',
      organization: 'Engineering',
      date: new Date().toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
      abstract: `Performance optimization guide for ${skillConfig.description}, ordered by impact.`,
    }
  }

  // Upgrade version if flag is passed
  if (upgradeVersion) {
    const oldVersion = metadata.version
    metadata.version = incrementVersion(oldVersion)
    console.log(`  Upgrading version: ${oldVersion} -> ${metadata.version}`)

    // Write updated metadata.json
    await writeFile(
      skillConfig.metadataFile,
      JSON.stringify(metadata, null, 2) + '\n',
      'utf-8'
    )
    console.log(`  ✓ Updated metadata.json`)

    // Update SKILL.md frontmatter if it exists
    const skillFile = join(skillConfig.skillDir, 'SKILL.md')
    try {
      const skillContent = await readFile(skillFile, 'utf-8')
      const updatedSkillContent = skillContent.replace(
        /^(---[\s\S]*?version:\s*)"[^"]*"([\s\S]*?---)$/m,
        `$1"${metadata.version}"$2`
      )
      await writeFile(skillFile, updatedSkillContent, 'utf-8')
      console.log(`  ✓ Updated SKILL.md`)
    } catch {
      // SKILL.md doesn't exist, skip
    }
  }

  // Generate markdown
  const markdown = generateMarkdown(sections, metadata, skillConfig)

  // Write output
  await writeFile(skillConfig.outputFile, markdown, 'utf-8')

  console.log(
    `  ✓ Built AGENTS.md with ${sections.length} sections and ${ruleData.length} rules`
  )
}

/**
 * Main build function
 */
async function build() {
  try {
    console.log('Building AGENTS.md from rules...')

    if (buildAll) {
      // Build all skills
      for (const skill of Object.values(SKILLS)) {
        await buildSkill(skill)
      }
    } else if (skillName) {
      // Build specific skill
      const skill = SKILLS[skillName]
      if (!skill) {
        console.error(`Unknown skill: ${skillName}`)
        console.error(`Available skills: ${Object.keys(SKILLS).join(', ')}`)
        process.exit(1)
      }
      await buildSkill(skill)
    } else {
      // Build default skill (backwards compatibility)
      await buildSkill(SKILLS[DEFAULT_SKILL])
    }

    console.log('\n✓ Build complete')
  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}

build()
