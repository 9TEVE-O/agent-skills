// bun run examples/subagents.ts
//
// Figure 4 — Subagents:
// Parent (Opus) delegates to a Haiku researcher subagent.
// The parent never sees the subagent's intermediate steps — only the final answer.
import { run, registerSubagent } from '../src/index.ts'

// Register a fast Haiku subagent for research tasks
registerSubagent({
  name: 'researcher',
  description: 'A fast subagent that answers factual questions concisely',
  model: 'claude-haiku-4-5-20251001',
  systemPrompt: 'You are a concise research assistant. Give direct, factual answers in 2-3 sentences.',
})

// Register a code-writing subagent
registerSubagent({
  name: 'coder',
  description: 'A subagent that writes clean TypeScript/JavaScript code snippets',
  model: 'claude-sonnet-4-6',
  systemPrompt: 'You are an expert TypeScript developer. Write clean, minimal code. No explanations unless asked.',
})

// Orchestrator runs on Opus, delegates cheaply to specialised subagents
const result = await run(
  {
    model: 'claude-opus-4-7',
    systemPrompt:
      'You are an orchestrator. Use the researcher and coder subagents to complete tasks efficiently.',
  },
  'Use the researcher to explain what stop_reason means in the Anthropic Messages API, ' +
  'then use the coder to write a TypeScript type for it.'
)

console.log(result.text)
console.log(`\n[${result.turns} turns · ${result.inputTokens}in / ${result.outputTokens}out tokens]`)
