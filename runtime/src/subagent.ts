import type { ToolDefinition, ToolHandler } from './types.ts'
import { run } from './loop.ts'
import { registerTool } from './tools.ts'

type SubagentConfig = {
  name: string
  description: string
  model: string
  systemPrompt: string
  maxTokens?: number
  baseUrl?: string
  apiKey?: string
}

// Figure 4: a subagent is a tool whose body runs another conversation
// The parent emits a tool_use named `name`; this handler spins up a full nested run
// and collapses the entire conversation into a single tool_result string
export function registerSubagent(config: SubagentConfig): void {
  const definition: ToolDefinition = {
    name: config.name,
    description: config.description,
    input_schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'The task for the subagent to complete' },
      },
      required: ['prompt'],
    },
  }

  const handler: ToolHandler = async (input) => {
    const { prompt } = input as { prompt: string }
    const result = await run(
      {
        model: config.model,
        systemPrompt: config.systemPrompt,
        tools: [],
        maxTokens: config.maxTokens,
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
      },
      prompt
    )
    return result.text
  }

  registerTool(definition, handler)
}
