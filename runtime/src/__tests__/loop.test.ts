import { describe, test, expect, mock, beforeEach } from 'bun:test'
import type { ApiResponse, ToolDefinition } from '../types.ts'

// ---------------------------------------------------------------------------
// Module mocks — must be hoisted before any imports that use the modules
// ---------------------------------------------------------------------------
const mockCallApi = mock(async (_params: unknown): Promise<ApiResponse> => ({
  id: 'msg_default',
  type: 'message',
  role: 'assistant',
  content: [{ type: 'text', text: 'default response' }],
  model: 'claude-opus-4-7',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 10, output_tokens: 5 },
}))

const mockRunTool = mock(async (_name: string, _input: Record<string, unknown>): Promise<string> => 'tool output')

const mockGetToolDefinitions = mock((): ToolDefinition[] => [])

mock.module('../client.ts', () => ({ callApi: mockCallApi }))
mock.module('../tools.ts', () => ({
  getToolDefinitions: mockGetToolDefinitions,
  runTool: mockRunTool,
  registerTool: mock(() => {}),
}))

const { run } = await import('../loop.ts')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeEndTurnResponse(text: string, inputTokens = 10, outputTokens = 5): ApiResponse {
  return {
    id: 'msg_01',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text }],
    model: 'claude-opus-4-7',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  }
}

function makeToolUseResponse(
  toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }>
): ApiResponse {
  return {
    id: 'msg_02',
    type: 'message',
    role: 'assistant',
    content: toolCalls.map((c) => ({
      type: 'tool_use' as const,
      id: c.id,
      name: c.name,
      input: c.input,
    })),
    model: 'claude-opus-4-7',
    stop_reason: 'tool_use',
    stop_sequence: null,
    usage: { input_tokens: 20, output_tokens: 10 },
  }
}

// ---------------------------------------------------------------------------
// Basic single-turn tests
// ---------------------------------------------------------------------------
describe('run – single turn end_turn', () => {
  beforeEach(() => {
    mockCallApi.mockClear()
    mockRunTool.mockClear()
    mockGetToolDefinitions.mockClear()
  })

  test('returns text from assistant response', async () => {
    mockCallApi.mockImplementationOnce(async () => makeEndTurnResponse('Hello from assistant'))
    const result = await run(
      { model: 'claude-opus-4-7', systemPrompt: 'Be helpful' },
      'Say hello'
    )
    expect(result.text).toBe('Hello from assistant')
  })

  test('returns turns=1 for single-turn conversation', async () => {
    mockCallApi.mockImplementationOnce(async () => makeEndTurnResponse('Done'))
    const result = await run(
      { model: 'claude-opus-4-7', systemPrompt: 'Be helpful' },
      'Do something'
    )
    expect(result.turns).toBe(1)
  })

  test('accumulates token counts', async () => {
    mockCallApi.mockImplementationOnce(async () => makeEndTurnResponse('Done', 100, 50))
    const result = await run(
      { model: 'claude-opus-4-7', systemPrompt: 'Be helpful' },
      'Do something'
    )
    expect(result.inputTokens).toBe(100)
    expect(result.outputTokens).toBe(50)
  })

  test('calls callApi with correct parameters', async () => {
    mockCallApi.mockImplementationOnce(async () => makeEndTurnResponse('Done'))
    await run(
      { model: 'my-model', systemPrompt: 'My system', maxTokens: 2048, apiKey: 'key123', baseUrl: 'http://x' },
      'My message'
    )

    expect(mockCallApi).toHaveBeenCalledTimes(1)
    const [params] = mockCallApi.mock.calls[0] as [Parameters<typeof mockCallApi>[0]]
    expect((params as Record<string, unknown>)['model']).toBe('my-model')
    expect((params as Record<string, unknown>)['system']).toBe('My system')
    expect((params as Record<string, unknown>)['maxTokens']).toBe(2048)
    expect((params as Record<string, unknown>)['apiKey']).toBe('key123')
    expect((params as Record<string, unknown>)['baseUrl']).toBe('http://x')
  })

  test('initial message is sent as user role', async () => {
    mockCallApi.mockImplementationOnce(async () => makeEndTurnResponse('Done'))
    await run({ model: 'claude-opus-4-7', systemPrompt: 'Be helpful' }, 'User message here')

    const [params] = mockCallApi.mock.calls[0] as [Record<string, unknown>]
    const messages = params['messages'] as Array<{ role: string; content: string }>
    expect(messages[0]!.role).toBe('user')
    expect(messages[0]!.content).toBe('User message here')
  })

  test('joins multiple text blocks with newline', async () => {
    mockCallApi.mockImplementationOnce(async (): Promise<ApiResponse> => ({
      id: 'msg_multi',
      type: 'message',
      role: 'assistant',
      content: [
        { type: 'text', text: 'First part' },
        { type: 'text', text: 'Second part' },
      ],
      model: 'claude-opus-4-7',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 5, output_tokens: 10 },
    }))

    const result = await run({ model: 'claude-opus-4-7', systemPrompt: 'Be helpful' }, 'Hi')
    expect(result.text).toBe('First part\nSecond part')
  })

  test('returns empty text when no text blocks present', async () => {
    mockCallApi.mockImplementationOnce(async (): Promise<ApiResponse> => ({
      id: 'msg_notext',
      type: 'message',
      role: 'assistant',
      content: [],
      model: 'claude-opus-4-7',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 5, output_tokens: 0 },
    }))

    const result = await run({ model: 'claude-opus-4-7', systemPrompt: 'Be helpful' }, 'Hi')
    expect(result.text).toBe('')
  })

  test('uses getToolDefinitions() when config.tools is not provided', async () => {
    const customDefs: ToolDefinition[] = [
      {
        name: 'custom_tool',
        description: 'A custom tool',
        input_schema: { type: 'object', properties: {} },
      },
    ]
    mockGetToolDefinitions.mockImplementationOnce(() => customDefs)
    mockCallApi.mockImplementationOnce(async () => makeEndTurnResponse('Done'))

    await run({ model: 'claude-opus-4-7', systemPrompt: 'Be helpful' }, 'Hi')

    const [params] = mockCallApi.mock.calls[0] as [Record<string, unknown>]
    expect((params as Record<string, unknown>)['tools']).toEqual(customDefs)
  })

  test('uses config.tools when explicitly provided (even empty)', async () => {
    mockCallApi.mockImplementationOnce(async () => makeEndTurnResponse('Done'))

    await run({ model: 'claude-opus-4-7', systemPrompt: 'Be helpful', tools: [] }, 'Hi')

    expect(mockGetToolDefinitions).not.toHaveBeenCalled()
    const [params] = mockCallApi.mock.calls[0] as [Record<string, unknown>]
    expect((params as Record<string, unknown>)['tools']).toEqual([])
  })

  test('stops on max_tokens stop_reason', async () => {
    mockCallApi.mockImplementationOnce(async (): Promise<ApiResponse> => ({
      ...makeEndTurnResponse('Truncated...'),
      stop_reason: 'max_tokens',
    }))

    const result = await run({ model: 'claude-opus-4-7', systemPrompt: 'Be helpful' }, 'Hi')
    expect(result.turns).toBe(1)
    expect(result.text).toBe('Truncated...')
  })
})

// ---------------------------------------------------------------------------
// Multi-turn with tool use
// ---------------------------------------------------------------------------
describe('run – tool use loop', () => {
  beforeEach(() => {
    mockCallApi.mockClear()
    mockRunTool.mockClear()
    mockGetToolDefinitions.mockClear()
  })

  test('dispatches tool calls and loops until end_turn', async () => {
    mockCallApi
      .mockImplementationOnce(async () =>
        makeToolUseResponse([{ id: 'tool_call_1', name: 'my_tool', input: { x: 1 } }])
      )
      .mockImplementationOnce(async () => makeEndTurnResponse('Final answer'))

    mockRunTool.mockImplementationOnce(async () => 'tool result value')

    const result = await run(
      { model: 'claude-opus-4-7', systemPrompt: 'Be helpful', tools: [] },
      'Use a tool'
    )

    expect(mockCallApi).toHaveBeenCalledTimes(2)
    expect(mockRunTool).toHaveBeenCalledWith('my_tool', { x: 1 })
    expect(result.turns).toBe(2)
    expect(result.text).toBe('Final answer')
  })

  test('accumulates tokens across multiple turns', async () => {
    mockCallApi
      .mockImplementationOnce(async () =>
        makeToolUseResponse([{ id: 'tc1', name: 'tool_a', input: {} }])
      )
      .mockImplementationOnce(async () => makeEndTurnResponse('Done', 30, 15))

    // Turn 1 response has 20 input / 10 output (from makeToolUseResponse)
    const result = await run(
      { model: 'claude-opus-4-7', systemPrompt: 'Be helpful', tools: [] },
      'Use a tool'
    )

    expect(result.inputTokens).toBe(20 + 30) // 50
    expect(result.outputTokens).toBe(10 + 15) // 25
  })

  test('appends tool results as user messages', async () => {
    mockCallApi
      .mockImplementationOnce(async () =>
        makeToolUseResponse([{ id: 'tc_append', name: 'test_tool', input: {} }])
      )
      .mockImplementationOnce(async () => makeEndTurnResponse('Done'))

    mockRunTool.mockImplementationOnce(async () => 'tool output appended')

    await run({ model: 'claude-opus-4-7', systemPrompt: 'Be helpful', tools: [] }, 'Hi')

    // Second callApi invocation should contain the tool result in messages
    const [secondParams] = mockCallApi.mock.calls[1] as [Record<string, unknown>]
    const messages = secondParams['messages'] as Array<{ role: string; content: unknown }>
    // messages: [user, assistant(tool_use), user(tool_result)]
    const lastMsg = messages[messages.length - 1]!
    expect(lastMsg.role).toBe('user')
    const content = lastMsg.content as Array<{ type: string; tool_use_id: string; content: string }>
    expect(content[0]!.type).toBe('tool_result')
    expect(content[0]!.tool_use_id).toBe('tc_append')
    expect(content[0]!.content).toBe('tool output appended')
  })

  test('handles tool errors gracefully with is_error flag', async () => {
    mockCallApi
      .mockImplementationOnce(async () =>
        makeToolUseResponse([{ id: 'tc_err', name: 'failing_tool', input: {} }])
      )
      .mockImplementationOnce(async () => makeEndTurnResponse('Handled error'))

    mockRunTool.mockImplementationOnce(async () => {
      throw new Error('tool failure')
    })

    const result = await run(
      { model: 'claude-opus-4-7', systemPrompt: 'Be helpful', tools: [] },
      'Trigger error'
    )

    // Should still complete
    expect(result.text).toBe('Handled error')
    expect(result.turns).toBe(2)

    // Second call should contain tool_result with is_error=true
    const [secondParams] = mockCallApi.mock.calls[1] as [Record<string, unknown>]
    const messages = secondParams['messages'] as Array<{ role: string; content: unknown }>
    const lastMsg = messages[messages.length - 1]!
    const content = lastMsg.content as Array<{
      type: string
      tool_use_id: string
      content: string
      is_error: boolean
    }>
    expect(content[0]!.is_error).toBe(true)
    expect(content[0]!.content).toBe('tool failure')
  })

  test('handles non-Error exceptions in tool calls', async () => {
    mockCallApi
      .mockImplementationOnce(async () =>
        makeToolUseResponse([{ id: 'tc_str_err', name: 'string_err_tool', input: {} }])
      )
      .mockImplementationOnce(async () => makeEndTurnResponse('Done'))

    mockRunTool.mockImplementationOnce(async () => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw 'string error thrown'
    })

    await run({ model: 'claude-opus-4-7', systemPrompt: 'Be helpful', tools: [] }, 'Hi')

    const [secondParams] = mockCallApi.mock.calls[1] as [Record<string, unknown>]
    const messages = secondParams['messages'] as Array<{ role: string; content: unknown }>
    const lastMsg = messages[messages.length - 1]!
    const content = lastMsg.content as Array<{ content: string; is_error: boolean }>
    expect(content[0]!.is_error).toBe(true)
    expect(content[0]!.content).toBe('string error thrown')
  })

  test('dispatches multiple tool calls in parallel', async () => {
    const callOrder: string[] = []
    mockCallApi
      .mockImplementationOnce(async () =>
        makeToolUseResponse([
          { id: 'tc_p1', name: 'parallel_tool_a', input: {} },
          { id: 'tc_p2', name: 'parallel_tool_b', input: {} },
        ])
      )
      .mockImplementationOnce(async () => makeEndTurnResponse('Parallel done'))

    mockRunTool
      .mockImplementationOnce(async (name: string) => {
        callOrder.push(name as string)
        return 'result_a'
      })
      .mockImplementationOnce(async (name: string) => {
        callOrder.push(name as string)
        return 'result_b'
      })

    await run({ model: 'claude-opus-4-7', systemPrompt: 'Be helpful', tools: [] }, 'Parallel')
    expect(mockRunTool).toHaveBeenCalledTimes(2)
  })

  test('handles three-turn conversation (tool → tool → end)', async () => {
    mockCallApi
      .mockImplementationOnce(async () =>
        makeToolUseResponse([{ id: 'tc_t1', name: 'tool1', input: {} }])
      )
      .mockImplementationOnce(async () =>
        makeToolUseResponse([{ id: 'tc_t2', name: 'tool2', input: {} }])
      )
      .mockImplementationOnce(async () => makeEndTurnResponse('Three-turn done'))

    const result = await run(
      { model: 'claude-opus-4-7', systemPrompt: 'Be helpful', tools: [] },
      'Three turns'
    )

    expect(result.turns).toBe(3)
    expect(result.text).toBe('Three-turn done')
    expect(mockRunTool).toHaveBeenCalledTimes(2)
  })
})