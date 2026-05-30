#!/usr/bin/env node
/**
 * Validate rule files follow the correct structure
 */

import { readdir } from 'fs/promises'
import { join } from 'path'
import { parseRuleFile } from './parser.js'
import { RULES_DIR } from './config.js'
import { validateRule, ValidationError } from './utils.js'

/**
 * Main validation function
 */
async function validate() {
  try {
    console.log('Validating rule files...')
    console.log(`Rules directory: ${RULES_DIR}`)
    
    const files = await readdir(RULES_DIR)
    const ruleFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('_'))
    
    const allErrors: ValidationError[] = []
    
    for (const file of ruleFiles) {
      const filePath = join(RULES_DIR, file)
      try {
        const { rule } = await parseRuleFile(filePath)
        const errors = validateRule(rule, file)
        allErrors.push(...errors)
      } catch (error) {
        allErrors.push({ 
          file, 
          message: `Failed to parse: ${error instanceof Error ? error.message : String(error)}` 
        })
      }
    }
    
    if (allErrors.length > 0) {
      console.error('\n✗ Validation failed:\n')
      allErrors.forEach(error => {
        console.error(`  ${error.file}${error.ruleId ? ` (${error.ruleId})` : ''}: ${error.message}`)
      })
      process.exit(1)
    } else {
      console.log(`✓ All ${ruleFiles.length} rule files are valid`)
    }
  } catch (error) {
    console.error('Validation failed:', error)
    process.exit(1)
  }
}

validate()
