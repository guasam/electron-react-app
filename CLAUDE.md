# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron desktop application built with React, Vite, TypeScript, and TailwindCSS. The project features a custom type-safe IPC (Inter-Process Communication) system called "Conveyor" that enables secure communication between the React frontend (renderer process) and Electron's main process.

## Development Commands

```bash
# Start development server with hot-reload
npm run dev

# Format code with Prettier
npm run format

# Lint code with ESLint
npm run lint

# Build for production
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
npm run build:unpack # All platforms (unpacked)
```

## Debugging

VS Code debugging is pre-configured in `.vscode/launch.json`:
- **Debug Main Process**: Debug Electron's main process
- **Debug Renderer Process**: Debug React renderer process
- **Debug All**: Debug both processes simultaneously

## Architecture

### Three-Process Architecture

This Electron app follows the standard three-process model:

1. **Main Process** (`lib/main/`): Node.js environment that manages app lifecycle, window creation, and system integration
2. **Renderer Process** (`app/`): Browser environment running the React application
3. **Preload Scripts** (`lib/preload/`): Security bridge that safely exposes APIs from main to renderer

### Conveyor IPC System

Conveyor is the core communication layer providing type-safe IPC with runtime validation:

**Flow**: Renderer (React) → Preload (API) → Main Process (Handler) → Back to Renderer

**Key Components**:
- **Schemas** (`lib/conveyor/schemas/`): Zod schemas defining argument and return types for each IPC channel
- **APIs** (`lib/conveyor/api/`): Client-side classes (extend `ConveyorApi`) that provide typed methods for the renderer
- **Handlers** (`lib/conveyor/handlers/`): Server-side implementations in the main process registered via `handle()` helper
- **Type Safety**: Full TypeScript support with compile-time and runtime validation

### Adding a New IPC Channel

Follow this exact order:

1. **Define schema** in `lib/conveyor/schemas/[name]-schema.ts`:
   ```typescript
   export const myIpcSchema = {
     'my-method': {
       args: z.tuple([z.string()]),
       return: z.boolean(),
     },
   } as const
   ```

2. **Export schema** in `lib/conveyor/schemas/index.ts`:
   ```typescript
   export const ipcSchemas = {
     ...windowIpcSchema,
     ...appIpcSchema,
     ...myIpcSchema, // Add here
   } as const
   ```

3. **Create API class** in `lib/conveyor/api/[name]-api.ts`:
   ```typescript
   export class MyApi extends ConveyorApi {
     myMethod = (arg: string) => this.invoke('my-method', arg)
   }
   ```

4. **Register API** in `lib/conveyor/api/index.ts`:
   ```typescript
   export const conveyor = {
     app: new AppApi(electronAPI),
     window: new WindowApi(electronAPI),
     my: new MyApi(electronAPI), // Add here
   }
   ```

5. **Create handler** in `lib/conveyor/handlers/[name]-handler.ts`:
   ```typescript
   export const registerMyHandlers = () => {
     handle('my-method', (arg: string) => {
       // Implementation
       return true
     })
   }
   ```

6. **Register handler** in `lib/main/app.ts` during initialization:
   ```typescript
   registerMyHandlers()
   ```

**Important**: The `handle()` helper in `lib/main/shared.ts` automatically validates arguments and return values using the Zod schemas.

### Project Structure

```
app/                     # Renderer process (React application)
  ├── components/        # React components
  │   ├── window/        # Custom titlebar and menus
  │   ├── welcome/       # Welcome kit with animations
  │   └── ui/            # Shadcn UI components
  ├── hooks/             # React hooks (including useConveyor)
  └── styles/            # TailwindCSS styles

lib/
  ├── conveyor/          # Type-safe IPC system
  │   ├── api/           # Client-side API classes
  │   ├── handlers/      # Server-side IPC handlers
  │   └── schemas/       # Zod validation schemas
  ├── main/              # Main process
  │   ├── main.ts        # Entry point
  │   ├── app.ts         # Window creation and handler registration
  │   ├── protocols.ts   # Custom protocols (res://)
  │   └── shared.ts      # handle() helper for IPC
  └── preload/           # Preload scripts
      ├── preload.ts     # Exposes conveyor to renderer
      └── shared.ts      # ConveyorApi base class
```

## Path Aliases

Configured in `tsconfig.json` and `electron.vite.config.ts`:
- `@/` → Root directory
- `@/app/` → Renderer process code
- `@/lib/` → Shared library code (conveyor, main, preload)
- `@/resources/` → Build resources

## Custom Features

### Window Components
- Custom titlebar with window controls (minimize, maximize, close)
- Menu system toggled with `Alt` (Windows) or `Option` (macOS)
- Menu items defined in `app/components/window/menus.ts`

### Resource Protocol
- Access local files via `res://` protocol
- Registered in `lib/main/protocols.ts`

### Theme Switching
- Built-in dark/light mode support
- Uses Shadcn UI components with TailwindCSS

## Using Conveyor in React

```typescript
// Method 1: Hook with specific API (recommended)
const { version } = useConveyor('app')
await version()

// Method 2: Global conveyor object
const conveyor = useConveyor()
await conveyor.app.version()

// Method 3: Window object
await window.conveyor.app.version()
```

## Build System

- **electron-vite**: Build tool for fast development with HMR
- **electron-builder**: Packaging for production builds
- Configuration in `electron.vite.config.ts` and `electron-builder.yml`

## Technology Stack

- Electron 37.3.1
- React 19.1.1
- TypeScript 5.9.2
- Vite 7.1.3
- TailwindCSS 4.1.12
- Shadcn UI
- Zod 4.1.3 (runtime validation)
- memo