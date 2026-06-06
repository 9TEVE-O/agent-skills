import type { ProxyLog } from './types.ts'

const UPSTREAM = 'https://api.anthropic.com'
const PORT = Number(process.env['PROXY_PORT'] ?? 8765)

const logs: ProxyLog[] = []

export function getLogs(): readonly ProxyLog[] {
  return logs
}

// Figure 1: transparent local proxy — logs every request body then forwards to the real API
// Set ANTHROPIC_BASE_URL=http://localhost:8765 to intercept Claude Code (or any SDK) traffic
export async function startProxy(): Promise<void> {
  const server = Bun.serve({
    port: PORT,
    async fetch(req) {
      const url = new URL(req.url)
      const upstream = `${UPSTREAM}${url.pathname}${url.search}`

      const bodyText =
        req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : null

      let parsed: Record<string, unknown> | null = null
      if (bodyText) {
        try {
          parsed = JSON.parse(bodyText) as Record<string, unknown>
        } catch { /* non-JSON body — pass through */ }
      }

      const upstreamRes = await fetch(upstream, {
        method: req.method,
        headers: forwardHeaders(req.headers),
        body: bodyText ?? undefined,
      })

      const responseText = await upstreamRes.text()

      if (parsed && url.pathname === '/v1/messages') {
        const log: ProxyLog = {
          ts: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          model: String(parsed['model'] ?? 'unknown'),
          systemPromptBytes:
            typeof parsed['system'] === 'string' ? parsed['system'].length : 0,
          messageCount: Array.isArray(parsed['messages']) ? parsed['messages'].length : 0,
        }

        try {
          const json = JSON.parse(responseText) as Record<string, unknown>
          const usage = json['usage'] as Record<string, number> | undefined
          log.inputTokens = usage?.['input_tokens']
          log.outputTokens = usage?.['output_tokens']
          log.stopReason = String(json['stop_reason'] ?? '')
        } catch { /* non-JSON response */ }

        logs.push(log)
        console.log(
          `[proxy] ${log.ts}` +
          `  model=${log.model}` +
          `  sys=${log.systemPromptBytes}b` +
          `  msgs=${log.messageCount}` +
          `  stop=${log.stopReason ?? '?'}` +
          `  tokens=${log.inputTokens ?? '?'}in/${log.outputTokens ?? '?'}out`
        )
      }

      return new Response(responseText, {
        status: upstreamRes.status,
        headers: cleanHeaders(upstreamRes.headers),
      })
    },
  })

  console.log(`[proxy] listening  →  http://localhost:${server.port}`)
  console.log(`[proxy] to use:       export ANTHROPIC_BASE_URL=http://localhost:${server.port}`)
}

function forwardHeaders(src: Headers): Headers {
  const out = new Headers(src)
  out.delete('host')
  return out
}

function cleanHeaders(src: Headers): Headers {
  const out = new Headers()
  src.forEach((v, k) => {
    if (k !== 'content-encoding' && k !== 'transfer-encoding') out.set(k, v)
  })
  return out
}
