import type { Message, ToolDefinition, ApiResponse } from './types.ts'

type CallParams = {
  model: string
  system: string
  messages: Message[]
  tools?: ToolDefinition[]
  maxTokens?: number
  baseUrl?: string
  apiKey?: string
}

// Figure 5: brain is swappable — any endpoint that speaks the Messages-API protocol works
export async function callApi(params: CallParams): Promise<ApiResponse> {
  const baseUrl =
    params.baseUrl ?? process.env['ANTHROPIC_BASE_URL'] ?? 'https://api.anthropic.com'
  const apiKey = params.apiKey ?? process.env['ANTHROPIC_API_KEY'] ?? ''

  // Figure 2: every turn re-sends the full system prompt + full history (stateless server)
  const body = {
    model: params.model,
    system: params.system,
    messages: params.messages,
    tools: params.tools ?? [],
    max_tokens: params.maxTokens ?? 4096,
  }

  const isSession = apiKey.startsWith('sk-ant-si-')
  const authHeaders = isSession
    ? { Authorization: `Bearer ${apiKey}` }
    : { 'x-api-key': apiKey }

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      ...authHeaders,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API error ${res.status}: ${err}`)
  }

  return res.json() as Promise<ApiResponse>
}
