---
title: Use useRef for Transient Values
impact: MEDIUM
impactDescription: avoids unnecessary re-renders on frequent updates
tags: rerender, useref, state, performance
---

## Use useRef for Transient Values

When a value changes frequently and you don't want a re-render on every update (e.g., mouse trackers, intervals, transient flags), store it in `useRef` instead of `useState`. Updating a ref does not trigger a re-render.

**Incorrect (renders every update):**

```tsx
function Tracker() {
  const [lastX, setLastX] = useState(0)

  useEffect(() => {
    const onMove = (e: MouseEvent) => setLastX(e.clientX)
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return <div style={{ position: 'fixed', left: lastX }} />
}
```

**Correct (no re-render for tracking):**

```tsx
function Tracker() {
  const dotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const node = dotRef.current
      if (node) {
        node.style.transform = `translateX(${e.clientX}px)`
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return <div ref={dotRef} style={{ position: 'fixed', top: 0, left: 0 }} />
}
```
