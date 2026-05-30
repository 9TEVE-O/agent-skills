---
title: Use Activity Component for Show/Hide
impact: MEDIUM
impactDescription: preserves state/DOM
tags: rendering, activity, visibility, state-preservation
---

## Use Activity Component for Show/Hide

Use React's `<Activity>` to preserve state/DOM for expensive components that frequently toggle visibility.

**Incorrect (unmounts and remounts on every toggle):**

```tsx
function Dropdown({ isOpen }: { isOpen: boolean }) {
  // ExpensiveMenu is destroyed and rebuilt each time isOpen flips
  return <div>{isOpen && <ExpensiveMenu />}</div>
}
```

**Correct (keeps mounted, hides instead):**

```tsx
import { Activity } from 'react'

function Dropdown({ isOpen }: { isOpen: boolean }) {
  return (
    <div>
      <Activity mode={isOpen ? 'visible' : 'hidden'}>
        <ExpensiveMenu />
      </Activity>
    </div>
  )
}
```

Avoids expensive re-renders and state loss when toggling visibility.
