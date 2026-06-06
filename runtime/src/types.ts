export type Role = 'user' | 'assistant'

export type TextBlock = {
  type: 'text'
  text: string
}

export type ToolUseBlock = {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export type ToolResultBlock = {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock

export type Message = {
  role: Role
  content: string | ContentBlock[]
}

export type ToolDefinition = {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export type ToolHandler = (input: Record<string, unknown>) => Promise<string>

export type AgentConfig = {
  model: string
  systemPrompt: string
  tools?: ToolDefinition[]
  maxTokens?: number
  baseUrl?: string
  apiKey?: string
}

export type ApiResponse = {
  id: string
  type: 'message'
  role: 'assistant'
  content: ContentBlock[]
  model: string
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence'
  stop_sequence: string | null
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
}

export type RunResult = {
  text: string
  turns: number
  inputTokens: number
  outputTokens: number
}

export type ProxyLog = {
  ts: string
  requestId: string
  model: string
  systemPromptBytes: number
  messageCount: number
  inputTokens?: number
  outputTokens?: number
  stopReason?: string
}
