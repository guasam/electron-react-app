# Conveyor System

A type-safe IPC communication system for Electron applications that provides end-to-end type safety between renderer and main processes.

## Overview

The Conveyor system consists of four main components:

- **APIs**: Type-safe client interfaces for the renderer process
- **Handlers**: Server-side implementations in the main process
- **Schemas**: Zod-based validation and type definitions
- **Global Types**: Type declarations for global window access

<br />

## How to Use Existing Definitions

### In Renderer Process

```typescript
// Access the conveyor APIs through the global window object
const appVersion = await window.conveyor.app.version()
const windowInfo = await window.conveyor.window.windowInit()

// Window operations
await window.conveyor.window.windowMinimize()
await window.conveyor.window.windowMaximize()
await window.conveyor.window.windowClose()

// Web content operations
await window.conveyor.window.webCopy()
await window.conveyor.window.webPaste()
await window.conveyor.window.webOpenUrl('https://example.com')
```

### In React Components

```typescript
import { useConveyor } from '@/app/hooks/use-conveyor'

// Use specific API (recommended for components)
const appApi = useConveyor('app')
const windowApi = useConveyor('window')

// Or use all APIs
const conveyor = useConveyor()

// Examples with specific APIs
const appVersion = await appApi.version()
const windowInfo = await windowApi.windowInit()

// Window operations
await windowApi.windowMinimize()
await windowApi.windowMaximize()
await windowApi.windowClose()

// Web content operations
await windowApi.webCopy()
await windowApi.webPaste()
await windowApi.webOpenUrl('https://example.com')
```

### In Main Process

Handlers are registered by importing their registrar modules in the main process. Each handler module exports a registration function that sets up the IPC listeners with runtime validation.

```typescript
// lib/main/app.ts
import { registerAppHandlers } from '@/lib/conveyor/handlers/app-handler'

// In your app initialization
registerAppHandlers(app)
```

<br />

## How to Add New IPC Channel

To add a new IPC channel, follow these steps in order:

### 1. Define the Schema

Create a schema file in `lib/conveyor/schemas/`:

```typescript
// lib/conveyor/schemas/file-schema.ts
import { z } from 'zod'

export const fileIpcSchema = {
  'file-read': {
    args: z.tuple([z.string()]),
    return: z.string(),
  },
  'file-write': {
    args: z.tuple([z.string(), z.string()]),
    return: z.void(),
  },
  'file-delete': {
    args: z.tuple([z.string()]),
    return: z.void(),
  },
}
```

**Schema Purpose:**

- **`args`**: Defines the expected arguments that will be passed from the renderer to the main process. These are validated at runtime using Zod.
- **`return`**: Defines the expected return type from the main process back to the renderer. This ensures type safety and runtime validation of the response.

### 2. Add to the main schemas export

```typescript
// lib/conveyor/schemas/index.ts
import { fileIpcSchema } from './file-schema'

export const ipcSchemas = {
  ...windowIpcSchema,
  ...appIpcSchema,
  ...fileIpcSchema, // Add your new schema
} as const
```

### 3. Create the API class

Create a new API class in `lib/conveyor/api/`:

```typescript
// lib/conveyor/api/file-api.ts
import { ConveyorApi } from '@/lib/preload/shared'

export class FileApi extends ConveyorApi {
  readFile = (path: string) => this.invoke('file-read', path)
  writeFile = (path: string, content: string) => this.invoke('file-write', path, content)
  deleteFile = (path: string) => this.invoke('file-delete', path)
}
```

### 4. Add to the main conveyor export

```typescript
// lib/conveyor/api/index.ts
import { FileApi } from './file-api'

export const conveyor = {
  app: new AppApi(electronAPI),
  window: new WindowApi(electronAPI),
  file: new FileApi(electronAPI), // Add your new API
}

export type ConveyorApi = typeof conveyor
```

The `ConveyorApi` type is automatically derived from the conveyor object structure, ensuring type safety and eliminating the need for manual type maintenance.

### 5. Create the handler

Create a handler file in `lib/conveyor/handlers/`:

```typescript
// lib/conveyor/handlers/file-handler.ts
import { handle } from '@/lib/main/shared'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'

export const registerFileHandlers = () => {
  handle('file-read', (path: string) => {
    return readFileSync(path, 'utf-8')
  })

  handle('file-write', (path: string, content: string) => {
    writeFileSync(path, content, 'utf-8')
  })

  handle('file-delete', (path: string) => {
    unlinkSync(path)
  })
}
```

### 6. Register handlers in main process

```typescript
// lib/main/app.ts
import { registerFileHandlers } from '@/lib/conveyor/handlers/file-handler'

// In your app initialization
registerFileHandlers()
```

**Note**: Global types are automatically updated when you add new APIs to the conveyor export, so no manual updates are needed!

## Type Safety Features

- **Compile-time validation**: TypeScript ensures correct method calls
- **Runtime validation**: Zod schemas validate arguments and return values
- **Auto-completion**: Full IntelliSense support in your IDE
- **Automatic type inference**: Types are derived from schemas automatically

## Preload Integration

The preload script exposes the conveyor APIs to the renderer with proper error handling:

```typescript
// lib/preload/preload.ts
import { contextBridge } from 'electron'
import { conveyor } from '@/lib/conveyor/api'

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('conveyor', conveyor)
  } catch (error) {
    console.error(error)
  }
} else {
  window.conveyor = conveyor
}
```

## Best Practices

1. **Naming Convention**: Use kebab-case for channel names (e.g., `file-read`, `window-minimize`)
2. **Schema Validation**: Always define Zod schemas for both arguments and return values
3. **Error Handling**: The system automatically logs errors, but you can add custom error handling in handlers
4. **Type Safety**: Leverage TypeScript's type inference - don't use `any` types
5. **Modular Design**: Keep related functionality in separate api/handler/schema files
6. **Consistent Structure**: Follow the existing pattern of api/handler/schema files for new features
