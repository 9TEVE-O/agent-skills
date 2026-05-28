---
category: server
tags: [server, rsc, state, concurrency]
---

## Avoid Shared Mutable Module State for Request Data

**Impact: HIGH**

In server environments, module-level variables are shared across all concurrent requests. Storing per-request data (current user, request ID, etc.) in module scope causes data leaks between users. Use `AsyncLocalStorage` or pass data explicitly via function arguments.

**Bad: Per-request data stored in module scope**

```typescript
// Shared across ALL concurrent requests!
let currentUser: User | null = null;

export async function setCurrentUser(user: User) {
  currentUser = user; // Race condition!
}

export function getCurrentUser() {
  return currentUser; // Returns wrong user under concurrency!
}
```

**Good: Per-request data via AsyncLocalStorage**

```typescript
import { AsyncLocalStorage } from 'async_hooks';

const userStore = new AsyncLocalStorage<User>();

export function withUser<T>(user: User, fn: () => T): T {
  return userStore.run(user, fn);
}

export function getCurrentUser(): User | undefined {
  return userStore.getStore();
}
```
