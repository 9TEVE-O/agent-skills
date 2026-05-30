---
category: server
tags: [server, caching, performance, lru-cache]
---

## Use LRU Cache for Cross-Request Caching

**Impact: HIGH**

For data that is expensive to fetch and can be shared across multiple requests (but should be bounded in memory), use an LRU (Least Recently Used) cache. This avoids redundant fetches while preventing unbounded memory growth.

**Bad: No caching, redundant fetches across requests**

```typescript
export async function getConfig(orgId: string) {
  // Fetched on every request, even if data rarely changes
  const config = await db.config.findUnique({ where: { orgId } });
  return config;
}
```

**Good: LRU cache for bounded cross-request caching**

```typescript
import { LRUCache } from 'lru-cache';

const configCache = new LRUCache<string, Config>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
});

export async function getConfig(orgId: string) {
  const cached = configCache.get(orgId);
  if (cached) return cached;

  const config = await db.config.findUnique({ where: { orgId } });
  if (config) configCache.set(orgId, config);

  return config;
}
```
