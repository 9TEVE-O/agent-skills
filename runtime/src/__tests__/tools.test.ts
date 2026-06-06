import { describe, test, expect, mock, beforeEach } from 'bun:test'
import { registerTool, getToolDefinitions, runTool } from '../tools.ts'
import type { ToolDefinition, ToolHandler } from '../types.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeDefinition(name: string): ToolDefinition {
  return {
    name,
    description: `Test tool: ${name}`,
    input_schema: {
      type: 'object',
      properties: { value: { type: 'string' } },
      required: ['value'],
    },
  }
}

// ---------------------------------------------------------------------------
// registerTool / getToolDefinitions
// ---------------------------------------------------------------------------
describe('registerTool', () => {
  test('registered tool appears in getToolDefinitions()', () => {
    const def = makeDefinition('test_register_tool_1')
    const handler: ToolHandler = async () => 'ok'
    registerTool(def, handler)

    const defs = getToolDefinitions()
    const found = defs.find((d) => d.name === 'test_register_tool_1')
    expect(found).toBeDefined()
    expect(found?.description).toBe('Test tool: test_register_tool_1')
  })

  test('overwriting a tool with the same name replaces it', async () => {
    const def = makeDefinition('test_overwrite_tool')
    registerTool(def, async () => 'first')
    registerTool(def, async () => 'second')

    const result = await runTool('test_overwrite_tool', {})
    expect(result).toBe('second')
  })

  test('stores input_schema on the tool definition', () => {
    const def: ToolDefinition = {
      name: 'test_schema_tool',
      description: 'Has schema',
      input_schema: {
        type: 'object',
        properties: { foo: { type: 'number' } },
        required: ['foo'],
      },
    }
    registerTool(def, async () => '')

    const defs = getToolDefinitions()
    const found = defs.find((d) => d.name === 'test_schema_tool')
    expect(found?.input_schema.required).toEqual(['foo'])
    expect(found?.input_schema.properties['foo']).toEqual({ type: 'number' })
  })
})

describe('getToolDefinitions', () => {
  test('returns an array', () => {
    const defs = getToolDefinitions()
    expect(Array.isArray(defs)).toBe(true)
  })

  test('includes built-in tools: bash, read_file, write_file', () => {
    const defs = getToolDefinitions()
    const names = defs.map((d) => d.name)
    expect(names).toContain('bash')
    expect(names).toContain('read_file')
    expect(names).toContain('write_file')
  })

  test('bash tool has correct schema', () => {
    const defs = getToolDefinitions()
    const bash = defs.find((d) => d.name === 'bash')
    expect(bash).toBeDefined()
    expect(bash?.input_schema.required).toContain('command')
    expect(bash?.input_schema.properties['command']).toBeDefined()
  })

  test('read_file tool has correct schema', () => {
    const defs = getToolDefinitions()
    const readFile = defs.find((d) => d.name === 'read_file')
    expect(readFile).toBeDefined()
    expect(readFile?.input_schema.required).toContain('path')
  })

  test('write_file tool requires path and content', () => {
    const defs = getToolDefinitions()
    const writeFile = defs.find((d) => d.name === 'write_file')
    expect(writeFile).toBeDefined()
    expect(writeFile?.input_schema.required).toContain('path')
    expect(writeFile?.input_schema.required).toContain('content')
  })

  test('returns definitions in Map insertion order', () => {
    // Built-ins were registered first (bash, read_file, write_file)
    const defs = getToolDefinitions()
    const builtInIdx = {
      bash: defs.findIndex((d) => d.name === 'bash'),
      read_file: defs.findIndex((d) => d.name === 'read_file'),
      write_file: defs.findIndex((d) => d.name === 'write_file'),
    }
    expect(builtInIdx.bash).toBeLessThan(builtInIdx.read_file)
    expect(builtInIdx.read_file).toBeLessThan(builtInIdx.write_file)
  })
})

// ---------------------------------------------------------------------------
// runTool
// ---------------------------------------------------------------------------
describe('runTool', () => {
  test('calls the registered handler with the given input', async () => {
    const handler = mock(async (input: Record<string, unknown>) => `got:${input['value']}`)
    registerTool(makeDefinition('test_run_tool_1'), handler)

    const result = await runTool('test_run_tool_1', { value: 'hello' })
    expect(result).toBe('got:hello')
    expect(handler).toHaveBeenCalledWith({ value: 'hello' })
  })

  test('throws for unknown tool name', async () => {
    await expect(runTool('no_such_tool', {})).rejects.toThrow('Unknown tool: no_such_tool')
  })

  test('propagates errors thrown by the handler', async () => {
    registerTool(makeDefinition('test_error_tool'), async () => {
      throw new Error('handler exploded')
    })
    await expect(runTool('test_error_tool', {})).rejects.toThrow('handler exploded')
  })

  test('passes complex input objects to the handler', async () => {
    let received: Record<string, unknown> = {}
    registerTool(makeDefinition('test_complex_input'), async (input) => {
      received = input
      return 'ok'
    })

    await runTool('test_complex_input', { a: 1, b: [1, 2], c: { nested: true } })
    expect(received).toEqual({ a: 1, b: [1, 2], c: { nested: true } })
  })

  test('handler return value is returned by runTool', async () => {
    registerTool(makeDefinition('test_return_value'), async () => 'specific-string-result')
    const result = await runTool('test_return_value', {})
    expect(result).toBe('specific-string-result')
  })
})

// ---------------------------------------------------------------------------
// Built-in bash tool (integration with real Bun.spawn)
// ---------------------------------------------------------------------------
describe('built-in bash tool', () => {
  test('executes a simple shell command and returns stdout', async () => {
    const result = await runTool('bash', { command: 'echo hello_world' })
    expect(result).toContain('hello_world')
  })

  test('captures stderr output', async () => {
    const result = await runTool('bash', { command: 'echo error_output >&2' })
    expect(result).toContain('error_output')
  })

  test('returns (no output) for commands that produce no output', async () => {
    const result = await runTool('bash', { command: 'true' })
    expect(result).toBe('(no output)')
  })

  test('combines stdout and stderr', async () => {
    const result = await runTool('bash', {
      command: 'echo stdout_line && echo stderr_line >&2',
    })
    expect(result).toContain('stdout_line')
    expect(result).toContain('stderr_line')
  })

  test('can run multi-step shell pipelines', async () => {
    const result = await runTool('bash', { command: 'echo "hello world" | tr " " "_"' })
    expect(result).toContain('hello_world')
  })
})

// ---------------------------------------------------------------------------
// Built-in write_file tool
// ---------------------------------------------------------------------------
describe('built-in write_file tool', () => {
  test('returns a confirmation message with byte count and path', async () => {
    const content = 'test content for write'
    const path = `/tmp/test_write_${Date.now()}.txt`
    const result = await runTool('write_file', { path, content })
    expect(result).toContain(String(content.length))
    expect(result).toContain(path)
  })
})

// ---------------------------------------------------------------------------
// Built-in read_file tool
// ---------------------------------------------------------------------------
describe('built-in read_file tool', () => {
  test('reads back content written by write_file', async () => {
    const path = `/tmp/test_rw_${Date.now()}.txt`
    const content = 'round-trip-content-12345'
    await runTool('write_file', { path, content })
    const read = await runTool('read_file', { path })
    expect(read).toBe(content)
  })
})
