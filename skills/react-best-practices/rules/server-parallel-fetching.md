---
category: server
tags: [server, performance, parallel, rsc]
---

## Parallel Data Fetching with Component Composition

**Impact: CRITICAL**

In React Server Components, `await` in a parent component blocks all children. Structure your component tree so that each component fetches only its own data, allowing React to fetch data in parallel across sibling components.

**Bad: Sequential fetching in parent blocks parallelism**

```typescript
export async function Dashboard({ userId }: { userId: string }) {
  const user = await getUser(userId);
  const posts = await getPosts(userId); // Waits for user!
  const stats = await getStats(userId); // Waits for posts!

  return (
    <>
      <UserCard user={user} />
      <PostList posts={posts} />
      <StatsPanel stats={stats} />
    </>
  );
}
```

**Good: Each component fetches its own data in parallel**

```typescript
export function Dashboard({ userId }: { userId: string }) {
  return (
    <>
      <UserCard userId={userId} />
      <PostList userId={userId} />
      <StatsPanel userId={userId} />
    </>
  );
}

export async function UserCard({ userId }: { userId: string }) {
  const user = await getUser(userId); // Parallel!
  return <div>{user.name}</div>;
}

export async function PostList({ userId }: { userId: string }) {
  const posts = await getPosts(userId); // Parallel!
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}
```
