---
title: Use after() for Non-Blocking Post-Response Work
impact: MEDIUM
impactDescription: prevents post-response tasks from delaying the response
tags: server, next.js, performance, async
---

## Use after() for Non-Blocking Post-Response Work

Use Next.js `after()` to schedule work that should happen after the response is sent, such as logging, analytics, or cache invalidation. This prevents non-critical work from blocking the response and improves perceived performance.

**Bad: Blocking response with non-critical work**

```typescript
export async function POST(request: Request) {
  const data = await request.json();
  const result = await saveToDatabase(data);

  // This blocks the response
  await logAnalytics(data);
  await sendNotification(data);

  return Response.json(result);
}
```

**Good: Non-blocking post-response work with after()**

```typescript
import { after } from 'next/server';

export async function POST(request: Request) {
  const data = await request.json();
  const result = await saveToDatabase(data);

  // Schedule non-critical work after response
  after(async () => {
    await logAnalytics(data);
    await sendNotification(data);
  });

  return Response.json(result);
}
```
