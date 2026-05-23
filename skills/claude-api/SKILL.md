---
name: claude-api
description: Build, debug, and optimize applications using the Claude API and Anthropic SDK. Triggers when code imports `anthropic`/`@anthropic-ai/sdk`, users ask about Claude features (caching, thinking, tool use, streaming, batches, files, citations), or when migrating between Claude model versions. Handles Python, TypeScript, Java, Go, Ruby, C#, and PHP. SKIP for openai/other-provider SDK files.
---

# Claude API Skill

Comprehensive guidance for integrating Claude via the official Anthropic SDK.

## Supported Languages

Python · TypeScript · Java · Go · Ruby · C# · PHP · Raw HTTP/cURL (only when explicitly requested)

## Key Defaults

**Model**: Default to `claude-opus-4-7` — never downgrade for cost without being asked.

**Thinking**: Use `thinking: {type: "adaptive"}` for complex tasks on Opus 4.7/4.6.

**Streaming**: Default to streaming for long inputs/outputs to prevent timeouts.

```python
# Use .get_final_message() to extract complete response from stream
with client.messages.stream(...) as stream:
    message = stream.get_final_message()
```

**Caching**: Always include prompt caching in new implementations.

```python
# Verify cache hits
response.usage.cache_read_input_tokens  # > 0 means cache hit
```

## Surface Selection

| Task | Approach |
|------|----------|
| Single call (classification, Q&A, summarization) | Claude API direct |
| Multi-step workflow | Claude API + tool use (you orchestrate) |
| Server-managed agent | Managed Agents (Anthropic runs the loop) |
| Custom agent (maximum flexibility) | Claude API + tool use |

## Current Model IDs

| Model | ID |
|-------|----|  
| Opus 4.7 | `claude-opus-4-7` |
| Sonnet 4.6 | `claude-sonnet-4-6` |
| Haiku 4.5 | `claude-haiku-4-5-20251001` |

## Critical Rules

- **Never edit non-Anthropic files** with Anthropic SDK code
- **Never mix SDK and raw HTTP** in the same project
- **Never guess API signatures** — WebFetch current docs or reference official SDK
- **Confirm scope before bulk migrations** — ask which files/directories before editing
- **Preserve compaction blocks** when appending responses to message history

## Reading Sequence

1. Detect language from project files
2. Read `{language}/claude-api/README.md`
3. Consult `shared/` for advanced topics (tool use, caching, migration, Managed Agents)
4. WebFetch `shared/live-sources.md` for latest official documentation

## Managed Agents (Beta)

Server-hosted, first-party only. Requires persisted Agent config; sessions reference by ID. Not available on Bedrock, Vertex, or Foundry. Read `shared/managed-agents-overview.md` for full details.
