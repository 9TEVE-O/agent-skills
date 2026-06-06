import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import type { ApiResponse } from '../types.ts'

// We mock fetch globally before importing the module under test
const mockFetch = mock(async (_url: string, _init?: RequestInit): Promise<Response> => {
  return new Response('{}', { status: 200 })
})

// Override global fetch
const originalFetch = globalThis.fetch
beforeEach(() => {
  // @ts-expect-error – replacing global fetch for tests
  globalThis.fetch = mockFetch
  mockFetch.mockClear()
})
afterEach(() => {
  globalThis.fetch = originalFetch
  delete process.env['ANTHROPIC_BASE_URL']
  delete process.env['ANTHROPIC_API_KEY']
})

// Import after mock setup (dynamic to pick up module-level code safely)
const { callApi } = await import('../client.ts')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeResponse(body: Partial<ApiResponse>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const baseApiResponse: ApiResponse = {
  id: 'msg_01',
  type: 'message',
  role: 'assistant',
  content: [{ type: 'text', text: 'Hello' }],
  model: 'claude-opus-4-7',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 10, output_tokens: 5 },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('callApi', () => {
  test('POSTs to the default Anthropic endpoint when no baseUrl is provided', async () => {
    mockFetch.mockImplementationOnce(async () => makeResponse(baseApiResponse))
    await callApi({
      model: 'claude-opus-4-7',
      system: 'Be helpful',
      messages: [{ role: 'user', content: 'Hi' }],
    })

    const [calledUrl] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(calledUrl).toBe('https://api.anthropic.com/v1/messages')
  })

  test('uses ANTHROPIC_BASE_URL env var when set', async () => {
    process.env['ANTHROPIC_BASE_URL'] = 'http://localhost:8765'
    mockFetch.mockImplementationOnce(async () => makeResponse(baseApiResponse))
    await callApi({
      model: 'claude-opus-4-7',
      system: 'Be helpful',
      messages: [{ role: 'user', content: 'Hi' }],
    })

    const [calledUrl] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(calledUrl).toBe('http://localhost:8765/v1/messages')
  })

  test('explicit baseUrl param takes precedence over env var', async () => {
    process.env['ANTHROPIC_BASE_URL'] = 'http://localhost:8765'
    mockFetch.mockImplementationOnce(async () => makeResponse(baseApiResponse))
    await callApi({
      model: 'claude-opus-4-7',
      system: 'Be helpful',
      messages: [{ role: 'user', content: 'Hi' }],
      baseUrl: 'http://custom-endpoint:9000',
    })

    const [calledUrl] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(calledUrl).toBe('http://custom-endpoint:9000/v1/messages')
  })

  test('sends correct headers including api key from env', async () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-test-key'
    mockFetch.mockImplementationOnce(async () => makeResponse(baseApiResponse))
    await callApi({
      model: 'claude-opus-4-7',
      system: 'Be helpful',
      messages: [{ role: 'user', content: 'Hi' }],
    })

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers['content-type']).toBe('application/json')
    expect(headers['x-api-key']).toBe('sk-test-key')
    expect(headers['anthropic-version']).toBe('2023-06-01')
  })

  test('explicit apiKey param takes precedence over env var', async () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-env-key'
    mockFetch.mockImplementationOnce(async () => makeResponse(baseApiResponse))
    await callApi({
      model: 'claude-opus-4-7',
      system: 'Be helpful',
      messages: [{ role: 'user', content: 'Hi' }],
      apiKey: 'sk-param-key',
    })

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers['x-api-key']).toBe('sk-param-key')
  })

  test('sends correct JSON body shape', async () => {
    mockFetch.mockImplementationOnce(async () => makeResponse(baseApiResponse))
    const messages = [{ role: 'user' as const, content: 'Hello' }]
    await callApi({
      model: 'claude-opus-4-7',
      system: 'System prompt',
      messages,
      maxTokens: 1024,
    })

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body.model).toBe('claude-opus-4-7')
    expect(body.system).toBe('System prompt')
    expect(body.messages).toEqual(messages)
    expect(body.max_tokens).toBe(1024)
  })

  test('defaults max_tokens to 4096 when not provided', async () => {
    mockFetch.mockImplementationOnce(async () => makeResponse(baseApiResponse))
    await callApi({
      model: 'claude-opus-4-7',
      system: 'Be helpful',
      messages: [{ role: 'user', content: 'Hi' }],
    })

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body.max_tokens).toBe(4096)
  })

  test('defaults tools to [] when not provided', async () => {
    mockFetch.mockImplementationOnce(async () => makeResponse(baseApiResponse))
    await callApi({
      model: 'claude-opus-4-7',
      system: 'Be helpful',
      messages: [{ role: 'user', content: 'Hi' }],
    })

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body.tools).toEqual([])
  })

  test('returns parsed JSON response', async () => {
    mockFetch.mockImplementationOnce(async () => makeResponse(baseApiResponse))
    const result = await callApi({
      model: 'claude-opus-4-7',
      system: 'Be helpful',
      messages: [{ role: 'user', content: 'Hi' }],
    })

    expect(result.id).toBe('msg_01')
    expect(result.stop_reason).toBe('end_turn')
    expect(result.usage.input_tokens).toBe(10)
    expect(result.usage.output_tokens).toBe(5)
  })

  test('throws on non-OK HTTP status', async () => {
    mockFetch.mockImplementationOnce(
      async () => new Response('Rate limit exceeded', { status: 429 })
    )
    await expect(
      callApi({
        model: 'claude-opus-4-7',
        system: 'Be helpful',
        messages: [{ role: 'user', content: 'Hi' }],
      })
    ).rejects.toThrow('API error 429: Rate limit exceeded')
  })

  test('throws on 500 server error', async () => {
    mockFetch.mockImplementationOnce(
      async () => new Response('Internal Server Error', { status: 500 })
    )
    await expect(
      callApi({
        model: 'claude-opus-4-7',
        system: 'Be helpful',
        messages: [{ role: 'user', content: 'Hi' }],
      })
    ).rejects.toThrow('API error 500:')
  })

  test('passes tools array when provided', async () => {
    mockFetch.mockImplementationOnce(async () => makeResponse(baseApiResponse))
    const tools = [
      {
        name: 'my_tool',
        description: 'Does something',
        input_schema: { type: 'object' as const, properties: {} },
      },
    ]
    await callApi({
      model: 'claude-opus-4-7',
      system: 'Be helpful',
      messages: [{ role: 'user', content: 'Hi' }],
      tools,
    })

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body.tools).toEqual(tools)
  })

  test('uses POST method', async () => {
    mockFetch.mockImplementationOnce(async () => makeResponse(baseApiResponse))
    await callApi({
      model: 'claude-opus-4-7',
      system: 'Be helpful',
      messages: [{ role: 'user', content: 'Hi' }],
    })

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
  })
})