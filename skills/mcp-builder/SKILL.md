---
name: mcp-builder
description: Build high-quality MCP (Model Context Protocol) servers that connect LLMs to external services. Use when creating, designing, or debugging MCP servers. Covers the full development lifecycle: research, implementation, testing, and evaluation creation.
---

# MCP Server Builder

A four-phase guide for creating production-quality MCP servers.

## Phase 1: Research & Planning

**Start with the MCP specification:**
- Fetch the sitemap at `https://modelcontextprotocol.io/sitemap.xml`
- Read spec pages using the `.md` suffix format for markdown versions
- Review the official SDK docs for your target language

**Design principles:**
- Balance broad API endpoint coverage with specialized workflow tools
- Use clear, action-oriented tool names with consistent prefixes (e.g., `github_list_issues`)
- Tools should return focused, relevant data — not raw API responses

**Technology recommendations:**

| Context | Recommendation |
|---------|---------------|
| Language | TypeScript (strong SDK support, best AI compatibility) |
| Remote servers | Streamable HTTP transport |
| Local servers | stdio transport |

## Phase 2: Implementation

### Core Infrastructure

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { z } from "zod";

const server = new Server({ name: "my-server", version: "1.0.0" });

// Authenticated API client
const apiClient = createAuthenticatedClient(process.env.API_KEY);

// Error helper
function handleError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
```

### Tool Definition Pattern

Every tool requires:
1. **Input schema** (Zod for TypeScript, Pydantic for Python)
2. **Clear description with examples**
3. **Structured content output**
4. **Actionable error messages**

```typescript
server.tool(
  "search_issues",
  "Search issues. Example: search_issues({query: 'bug label:critical', repo: 'owner/repo'})",
  {
    query: z.string().describe("Search query"),
    repo: z.string().describe("Repository in owner/repo format"),
  },
  async ({ query, repo }) => {
    try {
      const results = await apiClient.searchIssues(query, repo);
      return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${handleError(error)}` }], isError: true };
    }
  }
);
```

## Phase 3: Review & Testing

**Code review checklist:**
- [ ] DRY — no duplicated API call patterns
- [ ] Consistent error handling across all tools
- [ ] Full TypeScript type coverage
- [ ] Input validation on all parameters

**Testing with MCP Inspector:**
```bash
npm run build
npx @modelcontextprotocol/inspector dist/index.js
```

## Phase 4: Evaluation

Create **10 complex, realistic questions** that test real LLM usage:

- Questions must be independent (no shared state)
- Read-only operations only
- Cover different tool combinations
- Produce verifiable answers

Format in XML:
```xml
<evaluation>
  <question>List all open issues labeled 'critical' in owner/repo</question>
  <expected_tools>search_issues</expected_tools>
  <verification>Response contains issue numbers and titles</verification>
</evaluation>
```

## Key References

- MCP Protocol spec: https://modelcontextprotocol.io
- TypeScript SDK: `@modelcontextprotocol/sdk`
- Python SDK: `mcp`
- MCP Inspector: `@modelcontextprotocol/inspector`
