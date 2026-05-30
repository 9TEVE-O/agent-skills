---
category: server
tags: [server, security, authentication, server-actions]
---

## Authenticate Server Actions Like API Routes

**Impact: CRITICAL**

Server Actions are publicly accessible endpoints. Always authenticate and authorize inside every Server Action, just as you would in an API route. Never rely on UI-level guards alone.

**Bad: Server Action without authentication**

```typescript
'use server';

export async function deletePost(postId: string) {
  // No authentication check!
  await db.post.delete({ where: { id: postId } });
}
```

**Good: Server Action with authentication**

```typescript
'use server';

import { verifySession } from '@/lib/auth';

export async function deletePost(postId: string) {
  const session = await verifySession();

  if (!session) {
    throw new Error('Unauthorized');
  }

  const post = await db.post.findUnique({ where: { id: postId } });

  if (post?.userId !== session.userId) {
    throw new Error('Forbidden');
  }

  await db.post.delete({ where: { id: postId } });
}
```
