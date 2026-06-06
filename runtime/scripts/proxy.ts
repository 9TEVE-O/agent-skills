import { startProxy } from '../src/proxy.ts'

await startProxy()

// keep the process alive
await new Promise(() => {})
