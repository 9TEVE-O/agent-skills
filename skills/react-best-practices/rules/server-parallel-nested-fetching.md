---
category: server
tags: [server, performance, parallel, async]
---

## Parallel Nested Data Fetching with .then()

**Impact: CRITICAL**

When one fetch depends on data from another but subsequent fetches are independent, use `.then()` chaining to start dependent fetches as early as possible without blocking unrelated work.

**Bad: Unnecessary await creates sequential chain**

```typescript
export async function getPostWithAuthorAndComments(postId: string) {
  const post = await getPost(postId);
  const author = await getUser(post.authorId); // Must wait for post
  const comments = await getComments(postId);  // Could start immediately!

  return { post, author, comments };
}
```

**Good: Start independent fetches immediately with .then()**

```typescript
export async function getPostWithAuthorAndComments(postId: string) {
  const authorPromise = getPost(postId).then(post => getUser(post.authorId));
  const commentsPromise = getComments(postId); // Starts immediately!

  const [author, comments] = await Promise.all([authorPromise, commentsPromise]);
  const post = await getPost(postId); // Already cached via React.cache()

  return { post, author, comments };
}
```
