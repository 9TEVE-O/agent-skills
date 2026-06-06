import { describe, test, expect, mock, beforeEach } from 'bun:test'
import type { RunResult, ToolDefinition, ToolHandler } from '../types.ts'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
// Capture registerTool calls so we can inspect what gets registered
const registeredTools: Array<{ definition: ToolDefinition; handler: ToolHandler }> = []

const mockRegisterTool = mock((definition: ToolDefinition, handler: ToolHandler): void => {
  registeredTools.push({ definition, handler })
})

const mockRun = mock(
  async (_config: unknown, _prompt: string): Promise<RunResult> => ({
    text: 'subagent result text',
    turns: 1,
    inputTokens: 10,
    outputTokens: 5,
  })
)

mock.module('../tools.ts', () => ({
  registerTool: mockRegisterTool,
  getToolDefinitions: mock(() => []),
  runTool: mock(async () => ''),
}))

mock.module('../loop.ts', () => ({
  run: mockRun,
}))

const { registerSubagent } = await import('../subagent.ts')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getLastRegistered(): { definition: ToolDefinition; handler: ToolHandler } {
  const last = registeredTools[registeredTools.length - 1]
  if (!last) throw new Error('No tool registered')
  return last
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('registerSubagent – tool definition', () => {
  beforeEach(() => {
    mockRegisterTool.mockClear()
    mockRun.mockClear()
    registeredTools.length = 0
  })

  test('registers a tool with the provided name', () => {
    registerSubagent({
      name: 'my_agent',
      description: 'A test agent',
      model: 'claude-haiku-4-5-20251001',
      systemPrompt: 'Be brief',
    })

    expect(mockRegisterTool).toHaveBeenCalledTimes(1)
    const { definition } = getLastRegistered()
    expect(definition.name).toBe('my_agent')
  })

  test('registers a tool with the provided description', () => {
    registerSubagent({
      name: 'desc_agent',
      description: 'Specific description here',
      model: 'claude-haiku-4-5-20251001',
      systemPrompt: 'Be brief',
    })

    const { definition } = getLastRegistered()
    expect(definition.description).toBe('Specific description here')
  })

  test('input_schema requires a single prompt string property', () => {
    registerSubagent({
      name: 'schema_agent',
      description: 'Schema test',
      model: 'claude-haiku-4-5-20251001',
      systemPrompt: 'Be brief',
    })

    const { definition } = getLastRegistered()
    expect(definition.input_schema.type).toBe('object')
    expect(definition.input_schema.required).toContain('prompt')
    expect(definition.input_schema.properties['prompt']).toBeDefined()
    const promptProp = definition.input_schema.properties['prompt'] as Record<string, string>
    expect(promptProp['type']).toBe('string')
  })

  test('input_schema has exactly one required field (prompt)', () => {
    registerSubagent({
      name: 'one_field_agent',
      description: 'One field test',
      model: 'claude-haiku-4-5-20251001',
      systemPrompt: 'Be brief',
    })

    const { definition } = getLastRegistered()
    expect(definition.input_schema.required).toEqual(['prompt'])
  })
})

describe('registerSubagent – handler behavior', () => {
  beforeEach(() => {
    mockRegisterTool.mockClear()
    mockRun.mockClear()
    registeredTools.length = 0
  })

  test('handler calls run() with the given prompt', async () => {
    registerSubagent({
      name: 'handler_test_agent',
      description: 'Handler test',
      model: 'claude-haiku-4-5-20251001',
      systemPrompt: 'Be brief',
    })

    const { handler } = getLastRegistered()
    await handler({ prompt: 'What is the answer?' })

    expect(mockRun).toHaveBeenCalledTimes(1)
    const [, prompt] = mockRun.mock.calls[0] as [unknown, string]
    expect(prompt).toBe('What is the answer?')
  })

  test('handler passes model from config to run()', async () => {
    registerSubagent({
      name: 'model_agent',
      description: 'Model test',
      model: 'claude-sonnet-4-6',
      systemPrompt: 'Be concise',
    })

    const { handler } = getLastRegistered()
    await handler({ prompt: 'Test prompt' })

    const [config] = mockRun.mock.calls[0] as [Record<string, unknown>, string]
    expect(config['model']).toBe('claude-sonnet-4-6')
  })

  test('handler passes systemPrompt from config to run()', async () => {
    registerSubagent({
      name: 'sysprompt_agent',
      description: 'System prompt test',
      model: 'claude-haiku-4-5-20251001',
      systemPrompt: 'Custom system prompt here',
    })

    const { handler } = getLastRegistered()
    await handler({ prompt: 'Test' })

    const [config] = mockRun.mock.calls[0] as [Record<string, unknown>, string]
    expect(config['systemPrompt']).toBe('Custom system prompt here')
  })

  test('handler passes empty tools array to run()', async () => {
    registerSubagent({
      name: 'tools_agent',
      description: 'Tools test',
      model: 'claude-haiku-4-5-20251001',
      systemPrompt: 'Be brief',
    })

    const { handler } = getLastRegistered()
    await handler({ prompt: 'Test' })

    const [config] = mockRun.mock.calls[0] as [Record<string, unknown>, string]
    expect(config['tools']).toEqual([])
  })

  test('handler passes optional maxTokens when provided', async () => {
    registerSubagent({
      name: 'maxtok_agent',
      description: 'MaxTokens test',
      model: 'claude-haiku-4-5-20251001',
      systemPrompt: 'Be brief',
      maxTokens: 512,
    })

    const { handler } = getLastRegistered()
    await handler({ prompt: 'Test' })

    const [config] = mockRun.mock.calls[0] as [Record<string, unknown>, string]
    expect(config['maxTokens']).toBe(512)
  })

  test('handler passes optional baseUrl when provided', async () => {
    registerSubagent({
      name: 'baseurl_agent',
      description: 'BaseUrl test',
      model: 'claude-haiku-4-5-20251001',
      systemPrompt: 'Be brief',
      baseUrl: 'http://custom-host:9000',
    })

    const { handler } = getLastRegistered()
    await handler({ prompt: 'Test' })

    const [config] = mockRun.mock.calls[0] as [Record<string, unknown>, string]
    expect(config['baseUrl']).toBe('http://custom-host:9000')
  })

  test('handler passes optional apiKey when provided', async () => {
    registerSubagent({
      name: 'apikey_agent',
      description: 'ApiKey test',
      model: 'claude-haiku-4-5-20251001',
      systemPrompt: 'Be brief',
      apiKey: 'sk-custom-key',
    })

    const { handler } = getLastRegistered()
    await handler({ prompt: 'Test' })

    const [config] = mockRun.mock.calls[0] as [Record<string, unknown>, string]
    expect(config['apiKey']).toBe('sk-custom-key')
  })

  test('handler returns the text from run() result', async () => {
    mockRun.mockImplementationOnce(async () => ({
      text: 'The specific result text',
      turns: 2,
      inputTokens: 100,
      outputTokens: 50,
    }))

    registerSubagent({
      name: 'return_agent',
      description: 'Return test',
      model: 'claude-haiku-4-5-20251001',
      systemPrompt: 'Be brief',
    })

    const { handler } = getLastRegistered()
    const result = await handler({ prompt: 'Test' })
    expect(result).toBe('The specific result text')
  })

  test('handler discards turn and token counts, returning only text', async () => {
    mockRun.mockImplementationOnce(async () => ({
      text: 'Only this matters',
      turns: 10,
      inputTokens: 9999,
      outputTokens: 9999,
    }))

    registerSubagent({
      name: 'discard_agent',
      description: 'Discard test',
      model: 'claude-haiku-4-5-20251001',
      systemPrompt: 'Be brief',
    })

    const { handler } = getLastRegistered()
    const result = await handler({ prompt: 'Test' })
    // The handler only returns text, not the full RunResult
    expect(typeof result).toBe('string')
    expect(result).toBe('Only this matters')
  })

  test('multiple registerSubagent calls register distinct tools', () => {
    registerSubagent({
      name: 'multi_agent_1',
      description: 'First agent',
      model: 'claude-haiku-4-5-20251001',
      systemPrompt: 'First',
    })
    registerSubagent({
      name: 'multi_agent_2',
      description: 'Second agent',
      model: 'claude-haiku-4-5-20251001',
      systemPrompt: 'Second',
    })

    expect(mockRegisterTool).toHaveBeenCalledTimes(2)
    expect(registeredTools[0]!.definition.name).toBe('multi_agent_1')
    expect(registeredTools[1]!.definition.name).toBe('multi_agent_2')
  })
})