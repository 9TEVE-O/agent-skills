---
category: server
tags: [server, performance, static, module-level]
---

## Hoist Static I/O to Module Level

**Impact: HIGH**

Read static assets (fonts, SVGs, config files) at module initialization time, not inside request handlers or render functions. Module-level code runs once per server instance; moving static reads there eliminates redundant I/O on every request.

**Bad: Static file read on every request**

```typescript
export async function GET() {
  // Read on every request!
  const logo = await fs.readFile('./public/logo.svg', 'utf8');
  const config = await fs.readFile('./config.json', 'utf8');

  return new Response(processTemplate(logo, JSON.parse(config)));
}
```

**Good: Static I/O hoisted to module level**

```typescript
import { readFileSync } from 'fs';

// Read once at module initialization
const logo = readFileSync('./public/logo.svg', 'utf8');
const config = JSON.parse(readFileSync('./config.json', 'utf8'));

export async function GET() {
  return new Response(processTemplate(logo, config));
}
```
