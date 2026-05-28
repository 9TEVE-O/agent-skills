---
category: advanced
tags: [advanced, hooks, useEffectEvent, callbacks]
---

## Use useEffectEvent for Stable Callback Refs

**Impact: LOW**

`useEffectEvent` (experimental) creates a stable function identity that always captures the latest closure values. Use it to pass callbacks to effects or subscriptions that need to see fresh state/props without being listed as reactive dependencies.

**Bad: Callback in dependency array causes effect re-runs**

```typescript
function SearchBox({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handler = debounce(() => onSearch(query), 300);
    handler();
    return handler.cancel;
  }, [query, onSearch]); // onSearch changing blows away the debounce
}
```

**Good: useEffectEvent provides stable identity**

```typescript
function SearchBox({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState('');

  const stableOnSearch = useEffectEvent((q: string) => onSearch(q));

  useEffect(() => {
    const handler = debounce(() => stableOnSearch(query), 300);
    handler();
    return handler.cancel;
  }, [query]); // Only re-runs when query changes
}
```
