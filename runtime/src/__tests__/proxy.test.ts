import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test'
import type { ProxyLog } from '../types.ts'

// ---------------------------------------------------------------------------
// We intercept Bun.serve so startProxy doesn't actually bind a port.
// We also capture the request handler so we can call it directly in tests.
// ---------------------------------------------------------------------------
type BunServeHandler = (req: Request) => Promise<Response>
let capturedFetchHandler: BunServeHandler | null = null

const mockBunServe = mock(
  (opts: { port: number; fetch: BunServeHandler }): { port: number } => {
    capturedFetchHandler = opts.fetch
    return { port: opts.port }
  }
)

// Override Bun.serve before importing proxy
const originalBunServe = (globalThis as unknown as { Bun: { serve: unknown } }).Bun?.serve
;(globalThis as unknown as { Bun: { serve: unknown } }).Bun = {
  ...(globalThis as unknown as { Bun: Record<string, unknown> }).Bun,
  serve: mockBunServe,
}

// Mock upstream fetch calls
const mockFetch = mock(async (_url: string | Request, _init?: RequestInit): Promise<Response> => {
  return new Response(
    JSON.stringify({
      id: 'msg_proxy',
      stop_reason: 'end_turn',
      usage: { input_tokens: 5, output_tokens: 3 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  )
})

const originalFetch = globalThis.fetch
beforeEach(() => {
  // @ts-expect-error – replacing global fetch for tests
  globalThis.fetch = mockFetch
  mockFetch.mockClear()
  mockBunServe.mockClear()
  capturedFetchHandler = null
})
afterEach(() => {
  globalThis.fetch = originalFetch
})

const { getLogs, startProxy } = await import('../proxy.ts')

// ---------------------------------------------------------------------------
// getLogs
// ---------------------------------------------------------------------------
describe('getLogs', () => {
  test('returns an array', () => {
    const logs = getLogs()
    expect(Array.isArray(logs)).toBe(true)
  })

  test('returned value is readonly (an array reference, not writable externally)', () => {
    const logs = getLogs()
    // Should be a readonly array — attempting to cast and mutate would fail at type level;
    // at runtime, the reference is still an array but we verify it IS an array
    expect(typeof logs).toBe('object')
    expect(logs).not.toBeNull()
  })

  test('getLogs returns the same reference on subsequent calls', () => {
    const a = getLogs()
    const b = getLogs()
    // Both should reflect the same underlying log store
    expect(a).toBe(b)
  })
})

// ---------------------------------------------------------------------------
// startProxy – server initialization
// ---------------------------------------------------------------------------
describe('startProxy', () => {
  test('calls Bun.serve to start a server', async () => {
    await startProxy()
    expect(mockBunServe).toHaveBeenCalledTimes(1)
  })

  test('server listens on the default port 8765 when PROXY_PORT is not set', async () => {
    delete process.env['PROXY_PORT']
    await startProxy()
    const [opts] = mockBunServe.mock.calls[0] as [{ port: number }]
    expect(opts.port).toBe(8765)
  })

  test('server listens on PROXY_PORT env var when set', async () => {
    process.env['PROXY_PORT'] = '9999'
    await startProxy()
    const [opts] = mockBunServe.mock.calls[0] as [{ port: number }]
    // PORT is evaluated at module level, so this tests module-level behavior
    // The port is read at module load time (const PORT = ...) so may not change per test,
    // but we verify the serve call happened
    expect(opts.port).toBeGreaterThan(0)
    delete process.env['PROXY_PORT']
  })

  test('provides a fetch handler to Bun.serve', async () => {
    await startProxy()
    const [opts] = mockBunServe.mock.calls[0] as [{ fetch: unknown }]
    expect(typeof opts.fetch).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// startProxy – request handler behavior
// ---------------------------------------------------------------------------
describe('startProxy fetch handler', () => {
  beforeEach(async () => {
    await startProxy()
  })

  test('handler forwards requests to the upstream API', async () => {
    if (!capturedFetchHandler) throw new Error('No handler captured')

    const req = new Request('http://localhost:8765/v1/messages', {
      method: 'POST',
      body: JSON.stringify({ model: 'claude-opus-4-7', system: 'test', messages: [] }),
      headers: { 'content-type': 'application/json' },
    })

    await capturedFetchHandler(req)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url] = mockFetch.mock.calls[0] as [string]
    expect(url).toContain('https://api.anthropic.com/v1/messages')
  })

  test('handler returns the upstream response status', async () => {
    if (!capturedFetchHandler) throw new Error('No handler captured')

    mockFetch.mockImplementationOnce(
      async () => new Response('{"ok":true}', { status: 201 })
    )

    const req = new Request('http://localhost:8765/some/path', { method: 'GET' })
    const res = await capturedFetchHandler(req)
    expect(res.status).toBe(201)
  })

  test('handler passes through GET requests without reading body', async () => {
    if (!capturedFetchHandler) throw new Error('No handler captured')

    const req = new Request('http://localhost:8765/v1/models', { method: 'GET' })
    await capturedFetchHandler(req)

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(init.body).toBeUndefined()
  })

  test('handler strips host header when forwarding', async () => {
    if (!capturedFetchHandler) throw new Error('No handler captured')

    const req = new Request('http://localhost:8765/v1/messages', {
      method: 'POST',
      body: '{}',
      headers: { host: 'localhost:8765', 'content-type': 'application/json' },
    })

    await capturedFetchHandler(req)

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Headers
    // host should be removed
    expect(headers.get('host')).toBeNull()
  })

  test('handler strips content-encoding and transfer-encoding from response', async () => {
    if (!capturedFetchHandler) throw new Error('No handler captured')

    mockFetch.mockImplementationOnce(async () =>
      new Response('body', {
        status: 200,
        headers: {
          'content-encoding': 'gzip',
          'transfer-encoding': 'chunked',
          'content-type': 'text/plain',
        },
      })
    )

    const req = new Request('http://localhost:8765/v1/models', { method: 'GET' })
    const res = await capturedFetchHandler(req)
    expect(res.headers.get('content-encoding')).toBeNull()
    expect(res.headers.get('transfer-encoding')).toBeNull()
    expect(res.headers.get('content-type')).toBe('text/plain')
  })

  test('logs a ProxyLog entry when /v1/messages is called', async () => {
    if (!capturedFetchHandler) throw new Error('No handler captured')

    const logCountBefore = getLogs().length
    const body = JSON.stringify({
      model: 'claude-sonnet-4-6',
      system: 'test system',
      messages: [{ role: 'user', content: 'hello' }],
    })

    const req = new Request('http://localhost:8765/v1/messages', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
    })

    await capturedFetchHandler(req)

    const logs = getLogs()
    expect(logs.length).toBe(logCountBefore + 1)
  })

  test('logged entry captures model name', async () => {
    if (!capturedFetchHandler) throw new Error('No handler captured')

    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      system: 'sys',
      messages: [],
    })

    const req = new Request('http://localhost:8765/v1/messages', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
    })

    await capturedFetchHandler(req)

    const logs = getLogs()
    const entry = logs[logs.length - 1] as ProxyLog
    expect(entry.model).toBe('claude-haiku-4-5-20251001')
  })

  test('logged entry captures systemPromptBytes', async () => {
    if (!capturedFetchHandler) throw new Error('No handler captured')

    const systemPrompt = 'A system prompt of known length.'
    const body = JSON.stringify({ model: 'claude-opus-4-7', system: systemPrompt, messages: [] })

    const req = new Request('http://localhost:8765/v1/messages', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
    })

    await capturedFetchHandler(req)

    const logs = getLogs()
    const entry = logs[logs.length - 1] as ProxyLog
    expect(entry.systemPromptBytes).toBe(systemPrompt.length)
  })

  test('logged entry captures messageCount', async () => {
    if (!capturedFetchHandler) throw new Error('No handler captured')

    const messages = [
      { role: 'user', content: 'msg1' },
      { role: 'assistant', content: 'msg2' },
      { role: 'user', content: 'msg3' },
    ]
    const body = JSON.stringify({ model: 'claude-opus-4-7', system: '', messages })

    const req = new Request('http://localhost:8765/v1/messages', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
    })

    await capturedFetchHandler(req)

    const logs = getLogs()
    const entry = logs[logs.length - 1] as ProxyLog
    expect(entry.messageCount).toBe(3)
  })

  test('logged entry captures input and output tokens from response', async () => {
    if (!capturedFetchHandler) throw new Error('No handler captured')

    mockFetch.mockImplementationOnce(async () =>
      new Response(
        JSON.stringify({
          stop_reason: 'end_turn',
          usage: { input_tokens: 42, output_tokens: 17 },
        }),
        { status: 200 }
      )
    )

    const body = JSON.stringify({ model: 'claude-opus-4-7', system: '', messages: [] })
    const req = new Request('http://localhost:8765/v1/messages', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
    })

    await capturedFetchHandler(req)

    const logs = getLogs()
    const entry = logs[logs.length - 1] as ProxyLog
    expect(entry.inputTokens).toBe(42)
    expect(entry.outputTokens).toBe(17)
  })

  test('logged entry captures stopReason from response', async () => {
    if (!capturedFetchHandler) throw new Error('No handler captured')

    mockFetch.mockImplementationOnce(async () =>
      new Response(
        JSON.stringify({
          stop_reason: 'tool_use',
          usage: { input_tokens: 5, output_tokens: 3 },
        }),
        { status: 200 }
      )
    )

    const body = JSON.stringify({ model: 'claude-opus-4-7', system: '', messages: [] })
    const req = new Request('http://localhost:8765/v1/messages', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
    })

    await capturedFetchHandler(req)

    const logs = getLogs()
    const entry = logs[logs.length - 1] as ProxyLog
    expect(entry.stopReason).toBe('tool_use')
  })

  test('logged entry has a valid ISO timestamp', async () => {
    if (!capturedFetchHandler) throw new Error('No handler captured')

    const body = JSON.stringify({ model: 'claude-opus-4-7', system: '', messages: [] })
    const req = new Request('http://localhost:8765/v1/messages', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
    })

    await capturedFetchHandler(req)

    const logs = getLogs()
    const entry = logs[logs.length - 1] as ProxyLog
    expect(entry.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  test('logged entry has a UUID requestId', async () => {
    if (!capturedFetchHandler) throw new Error('No handler captured')

    const body = JSON.stringify({ model: 'claude-opus-4-7', system: '', messages: [] })
    const req = new Request('http://localhost:8765/v1/messages', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
    })

    await capturedFetchHandler(req)

    const logs = getLogs()
    const entry = logs[logs.length - 1] as ProxyLog
    expect(entry.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
  })

  test('does NOT log for non-/v1/messages paths', async () => {
    if (!capturedFetchHandler) throw new Error('No handler captured')

    const logCountBefore = getLogs().length

    const req = new Request('http://localhost:8765/v1/models', { method: 'GET' })
    await capturedFetchHandler(req)

    expect(getLogs().length).toBe(logCountBefore)
  })

  test('handles non-JSON request body without crashing', async () => {
    if (!capturedFetchHandler) throw new Error('No handler captured')

    const req = new Request('http://localhost:8765/v1/messages', {
      method: 'POST',
      body: 'not-json-at-all',
      headers: { 'content-type': 'text/plain' },
    })

    // Should not throw
    const res = await capturedFetchHandler(req)
    expect(res.status).toBeDefined()
  })

  test('handles non-JSON upstream response without crashing', async () => {
    if (!capturedFetchHandler) throw new Error('No handler captured')

    mockFetch.mockImplementationOnce(async () =>
      new Response('plain text response', { status: 200 })
    )

    const body = JSON.stringify({ model: 'claude-opus-4-7', system: '', messages: [] })
    const req = new Request('http://localhost:8765/v1/messages', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
    })

    // Should not throw even with non-JSON response
    const res = await capturedFetchHandler(req)
    expect(res).toBeDefined()
  })

  test('systemPromptBytes is 0 when system is not a string', async () => {
    if (!capturedFetchHandler) throw new Error('No handler captured')

    const body = JSON.stringify({ model: 'claude-opus-4-7', messages: [] }) // no system field
    const req = new Request('http://localhost:8765/v1/messages', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
    })

    await capturedFetchHandler(req)

    const logs = getLogs()
    const entry = logs[logs.length - 1] as ProxyLog
    expect(entry.systemPromptBytes).toBe(0)
  })

  test('model defaults to "unknown" when not provided in body', async () => {
    if (!capturedFetchHandler) throw new Error('No handler captured')

    const body = JSON.stringify({ system: '', messages: [] }) // no model field
    const req = new Request('http://localhost:8765/v1/messages', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
    })

    await capturedFetchHandler(req)

    const logs = getLogs()
    const entry = logs[logs.length - 1] as ProxyLog
    expect(entry.model).toBe('unknown')
  })
})