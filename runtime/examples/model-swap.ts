// Figure 5 — The Brain is Swappable:
// The while-loop doesn't care which model is at the other end.
// Swap the model string (or point baseUrl at a compatible endpoint) — the loop works unchanged.
import { run } from '../src/index.ts'

const configs = [
  { label: 'Claude Opus (Anthropic)', model: 'claude-opus-4-7' },
  { label: 'Claude Haiku (Anthropic)', model: 'claude-haiku-4-5-20251001' },
  // Point ANTHROPIC_BASE_URL at an OpenAI-shim or local Ollama to use other backends:
  // { label: 'GPT-4o (OpenAI shim)', model: 'gpt-4o', baseUrl: 'https://api.openai.com/v1' },
  // { label: 'DeepSeek (local)',      model: 'deepseek-chat', baseUrl: 'http://localhost:11434/v1' },
]

for (const { label, model, ...rest } of configs) {
  console.log(`\n=== ${label} ===`)
  const result = await run(
    {
      model,
      systemPrompt: 'You are a helpful assistant.',
      tools: [], // no tools for this comparison
      ...rest,
    } as Parameters<typeof run>[0],
    'In one sentence: what is an agentic loop?'
  )
  console.log(result.text)
  console.log(`[${result.turns} turn · ${result.inputTokens}in / ${result.outputTokens}out]`)
}
