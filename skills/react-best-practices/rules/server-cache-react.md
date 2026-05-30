---
category: server
tags: [server, caching, react, deduplication]
---

## Use React.cache() for Per-Request Deduplication

**Impact: MEDIUM**

Wrap data-fetching functions with `React.cache()` to deduplicate identical calls within a single render pass. This is especially useful when multiple Server Components need the same data—each can call the function directly without coordination.

**Bad: Duplicate database queries in the same request**

```typescript
// user-card.tsx
export async function UserCard({ userId }: { userId: string }) {
  const user = await db.user.findUnique({ where: { id: userId } });
  return <div>{user?.name}</div>;
}

// user-stats.tsx
export async function UserStats({ userId }: { userId: string }) {
  const user = await db.user.findUnique({ where: { id: userId } });
  return <div>{user?.postCount} posts</div>;
}
```

**Good: React.cache() deduplicates within a single request**

```typescript
import { cache } from 'react';

export const getUser = cache(async (userId: string) => {
  return db.user.findUnique({ where: { id: userId } });
});

// user-card.tsx
export async function UserCard({ userId }: { userId: string }) {
  const user = await getUser(userId);
  return <div>{user?.name}</div>;
}

// user-stats.tsx
export async function UserStats({ userId }: { userId: string }) {
  const user = await getUser(userId); // Deduplicated!
  return <div>{user?.postCount} posts</div>;
}
```
