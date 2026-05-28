---
category: advanced
tags: [advanced, initialization, module-level, singleton]
---

## Initialize App-Level Singletons Once, Not Per Mount

**Impact: LOW-MEDIUM**

Code that must run exactly once (SDK initialization, global store setup, analytics bootstrap) should use a module-level guard rather than `useEffect`. Effects run on every mount and twice in Strict Mode; module-level code runs once when the module is first imported.

**Bad: Initialization inside useEffect runs multiple times**

```typescript
function App() {
  useEffect(() => {
    // Runs twice in development (Strict Mode)
    analytics.init(process.env.NEXT_PUBLIC_ANALYTICS_KEY);
    thirdPartySDK.configure({ apiKey: process.env.NEXT_PUBLIC_SDK_KEY });
  }, []);

  return <RouterProvider router={router} />;
}
```

**Good: Module-level guard ensures single initialization**

```typescript
let initialized = false;

function initializeApp() {
  if (initialized) return;
  initialized = true;

  analytics.init(process.env.NEXT_PUBLIC_ANALYTICS_KEY);
  thirdPartySDK.configure({ apiKey: process.env.NEXT_PUBLIC_SDK_KEY });
}

// Call before rendering
initializeApp();

function App() {
  return <RouterProvider router={router} />;
}
```
