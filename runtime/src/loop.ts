import type {
  AgentConfig,
  Message,
  ContentBlock,
  TextBlock,
  ToolUseBlock,
  RunResult,
} from './types.ts'
import { callApi } from './client.ts'
import { getToolDefinitions, runTool } from './tools.ts'

// Figure 3: the agentic loop — client loops, model does not
// while (stop_reason === 'tool_use') { runTools(); appendResults(); callAgain(); }
export async function run(config: AgentConfig, userMessage: string): Promise<RunResult> {
  const messages: Message[] = [{ role: 'user', content: userMessage }]
  const tools = config.tools ?? getToolDefinitions()

  let turns = 0
  let inputTokens = 0
  let outputTokens = 0

  while (true) {
    turns++

    const response = await callApi({
      model: config.model,
      system: config.systemPrompt,
      messages,
      tools,
      maxTokens: config.maxTokens,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
    })

    inputTokens += response.usage.input_tokens
    outputTokens += response.usage.output_tokens

    // Figure 2: client owns state — append every assistant turn to the history
    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn' || response.stop_reason === 'max_tokens') {
      const text = response.content
        .filter((b): b is TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
      return { text, turns, inputTokens, outputTokens }
    }

    // stop_reason === 'tool_use': dispatch all tool calls in parallel, append results, loop
    const calls = response.content.filter((b): b is ToolUseBlock => b.type === 'tool_use')

    const results: ContentBlock[] = await Promise.all(
      calls.map(async (call) => {
        try {
          const content = await runTool(call.name, call.input)
          return { type: 'tool_result' as const, tool_use_id: call.id, content }
        } catch (e) {
          return {
            type: 'tool_result' as const,
            tool_use_id: call.id,
            content: e instanceof Error ? e.message : String(e),
            is_error: true,
          }
        }
      })
    )

    messages.push({ role: 'user', content: results })
  }
}
