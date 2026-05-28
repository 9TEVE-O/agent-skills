---
category: advanced
tags: [advanced, hooks, useEffectEvent, dependencies]
---

## Do Not Put Effect Events in Dependency Arrays

**Impact: LOW**

`useEffectEvent` creates a stable function reference that always sees the latest props and state. Including it in a dependency array defeats its purpose and may trigger lint errors. Effect Events should be called from inside effects but never listed as dependencies.

**Bad: Effect Event listed as dependency**

```typescript
function ChatRoom({ roomId, onMessage }: Props) {
  const handleMessage = useEffectEvent((msg: Message) => {
    onMessage(msg);
  });

  useEffect(() => {
    const socket = connect(roomId);
    socket.on('message', handleMessage);
    return () => socket.disconnect();
  }, [roomId, handleMessage]); // handleMessage causes unnecessary reconnects
}
```

**Good: Effect Event excluded from dependency array**

```typescript
function ChatRoom({ roomId, onMessage }: Props) {
  const handleMessage = useEffectEvent((msg: Message) => {
    onMessage(msg);
  });

  useEffect(() => {
    const socket = connect(roomId);
    socket.on('message', handleMessage);
    return () => socket.disconnect();
  }, [roomId]); // Only reactive dependencies
}
```
