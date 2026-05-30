---
category: advanced
tags: [advanced, hooks, refs, event-handlers]
---

## Store Event Handlers in Refs for Stable Subscriptions

**Impact: LOW**

When subscribing to external systems (WebSockets, event emitters, third-party libraries), storing the latest callback in a ref lets you subscribe once and still invoke the current version of the handler. This avoids unsubscribe/resubscribe cycles on every render.

**Bad: Re-subscribing on every callback change**

```typescript
function useSocketEvent(event: string, handler: (data: unknown) => void) {
  useEffect(() => {
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [event, handler]); // Re-subscribes when handler changes
}
```

**Good: Stable subscription with ref-stored handler**

```typescript
function useSocketEvent(event: string, handler: (data: unknown) => void) {
  const handlerRef = useRef(handler);

  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const stableHandler = (data: unknown) => handlerRef.current(data);
    socket.on(event, stableHandler);
    return () => socket.off(event, stableHandler);
  }, [event]); // Subscribes only when event name changes
}
```
