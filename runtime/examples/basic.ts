// bun run examples/basic.ts
//
// Minimal example: one agent, built-in tools (bash, read_file, write_file)
import { run } from '../src/index.ts'

const result = await run(
  {
    model: 'claude-opus-4-7',
    systemPrompt: 'You are a helpful coding assistant with access to bash and file tools.',
    // tools: omit to use the default registry (bash, read_file, write_file)
  },
  'List the files in the current directory and report how many TypeScript files there are.'
)

console.log(result.text)
console.log(`\n[${result.turns} turns · ${result.inputTokens}in / ${result.outputTokens}out tokens]`)
