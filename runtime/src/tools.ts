import type { ToolDefinition, ToolHandler } from './types.ts'

const registry = new Map<string, { definition: ToolDefinition; handler: ToolHandler }>()

export function registerTool(definition: ToolDefinition, handler: ToolHandler): void {
  registry.set(definition.name, { definition, handler })
}

export function getToolDefinitions(): ToolDefinition[] {
  return [...registry.values()].map((t) => t.definition)
}

export async function runTool(name: string, input: Record<string, unknown>): Promise<string> {
  const tool = registry.get(name)
  if (!tool) throw new Error(`Unknown tool: ${name}`)
  return tool.handler(input)
}

// Built-in: run shell commands
registerTool(
  {
    name: 'bash',
    description: 'Run a shell command and return stdout + stderr',
    input_schema: {
      type: 'object',
      properties: { command: { type: 'string', description: 'Shell command to execute' } },
      required: ['command'],
    },
  },
  async (input) => {
    const { command } = input as { command: string }
    const proc = Bun.spawn(['sh', '-c', command], { stdout: 'pipe', stderr: 'pipe' })
    const [out, err] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ])
    await proc.exited
    return [out, err].filter(Boolean).join('\n').trim() || '(no output)'
  }
)

// Built-in: read a file
registerTool(
  {
    name: 'read_file',
    description: 'Read the contents of a file from the filesystem',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'File path to read' } },
      required: ['path'],
    },
  },
  async (input) => {
    const { path } = input as { path: string }
    return Bun.file(path).text()
  }
)

// Built-in: write a file
registerTool(
  {
    name: 'write_file',
    description: 'Write content to a file on the filesystem',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to write' },
        content: { type: 'string', description: 'Content to write' },
      },
      required: ['path', 'content'],
    },
  },
  async (input) => {
    const { path, content } = input as { path: string; content: string }
    await Bun.write(path, content)
    return `Wrote ${(content as string).length} bytes to ${path}`
  }
)
