// Figure 1 — The Setup: run the proxy first, then run this example to see every API call logged.
//
// Terminal 1:  bun run proxy
// Terminal 2:  ANTHROPIC_BASE_URL=http://localhost:8765 bun run examples/with-proxy.ts
//
// The proxy logs: model, system-prompt size, message count, stop_reason, token usage
import { run, registerSubagent } from '../src/index.ts'

registerSubagent({
  name: 'researcher',
  description: 'Research subagent',
  model: 'claude-haiku-4-5-20251001',
  systemPrompt: 'Answer questions concisely.',
})

const result = await run(
  {
    model: 'claude-opus-4-7',
    systemPrompt: 'You are a helpful assistant. Use the researcher subagent for factual questions.',
    // baseUrl inherits ANTHROPIC_BASE_URL — proxy intercepts both this agent AND the subagent
  },
  'Use the researcher subagent: what is prompt caching in the Anthropic API?'
)

console.log(result.text)
console.log(`\n[${result.turns} turns · ${result.inputTokens}in / ${result.outputTokens}out tokens]`)
