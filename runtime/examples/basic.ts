import { run } from '../src/index.ts'

const result = await run(
  {
    model: 'claude-haiku-4-5-20251001',
    systemPrompt: 'You are a helpful coding assistant with access to bash and file tools.',
  },
  'List the files in /home/user/agent-skills/runtime and tell me how many TypeScript files there are.'
)

console.log(result.text)
console.log(`\n[${result.turns} turns · ${result.inputTokens}in / ${result.outputTokens}out tokens]`)
