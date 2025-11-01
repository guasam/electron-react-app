# Element Selector Logic Flow

This document explains how the element selector feature works, from button click to code injection.

## Overview

The element selector allows users to click on DOM elements in the webview preview, automatically find the corresponding source code in the workspace, and inject it into the chat input as context.

## Component Architecture

```
Workspace (state coordinator)
├── ChatWindow (displays UI, receives context)
│   └── ChatInput (cursor button, receives selector state)
└── BrowserFrame (webview container, element selector logic)
    └── ElementSelector (injects script, handles selection)
```

## Flow Diagram

```
1. User clicks cursor button in ChatInput
   ↓
2. ChatInput calls onRequestElementSelector()
   ↓
3. Workspace.handleRequestSelector() toggles elementSelectorVisible state
   ↓
4. BrowserFrame receives showElementSelector={true}
   ↓
5. ElementSelector.enabled={true} triggers useEffect
   ↓
6. ElementSelector.injectSelector() injects JavaScript into webview
   ↓
7. Injected script creates overlay with crosshair cursor
   ↓
8. User moves mouse → onMove() highlights elements and shows info box
   ↓
9. User clicks element → onClick() sets window.__inspectorSelectorResult
   ↓
10. Polling interval (every 120ms) detects result
    ↓
11. ElementSelector.onSelected(element) callback fired
    ↓
12. BrowserFrame.handleElementSelected() searches codebase
    ↓
13. Inspector API finds matching files via IPC
    ↓
14. Best match code extracted and returned
    ↓
15. BrowserFrame.onElementContext() callback fired
    ↓
16. Workspace.handleElementContext() updates state
    ↓
17. ChatWindow receives elementContext prop
    ↓
18. useEffect appends code snippet to chat input
```

## Detailed Component Breakdown

### 1. Workspace Component (`app/components/ui/workspace/Workspace.tsx`)

**State Management:**
- `elementSelectorVisible`: Boolean controlling selector activation
- `elementContext`: Stores selected element + code snippet
- `canInspect`: Derived from `tab.git?.worktreePath` (only works with active workspace)

**Key Functions:**

```typescript
// Toggles selector on/off when cursor button clicked
handleRequestSelector() {
  setElementSelectorVisible(prev => !prev)
}

// Receives selection result, stores it, dismisses selector
handleElementContext(context) {
  setElementContext(context)
  setElementSelectorVisible(false)  // Auto-dismiss after selection
}
```

**Props Flow:**
- Passes `isElementSelectorActive` to ChatWindow → ChatInput (for blue cursor color)
- Passes `showElementSelector` to BrowserFrame → ElementSelector (for enabling selector)

### 2. BrowserFrame Component (`app/components/ui/browser/BrowserFrame.tsx`)

**Key Function: `handleElementSelected()`**

This is the bridge between DOM selection and codebase search:

```typescript
handleElementSelected(element) {
  1. Immediately dismiss selector overlay
  2. Check if workspacePath exists (required for code search)
  3. Call inspectorApi.inspectorSearchElement() with:
     - tagName (e.g., "div", "button")
     - id (if present)
     - className (if present)
     - textContent (first 160 chars)
     - componentName (from data-component, id, or first className)
  4. Receive array of matches sorted by score
  5. Get best match (index 0)
  6. Call inspectorApi.inspectorGetElementCode() to extract code block
  7. Call onElementContext() with element + codeSnippet
  8. Handle errors gracefully (fallback to element-only context)
}
```

### 3. ElementSelector Component (`app/components/ui/browser/ElementSelector.tsx`)

**State & Refs:**
- `isSelecting`: Display state ("Preparing..." vs "Click element...")
- `pollingRef`: Interval ID for polling webview
- `injectedRef`: Prevents double-injection

**Injection Script (`injectSelector`):**

Creates three DOM elements in the webview:

1. **Overlay** (`__inspector_selector_overlay`):
   - Full-screen, transparent, crosshair cursor
   - Captures all mouse events
   - z-index: 2147483646 (very high)

2. **Highlight** (`__inspector_selector_highlight`):
   - Blue border (#2563eb) with light blue background
   - Positioned over hovered element
   - Updates on mousemove

3. **Info Box** (`__inspector_selector_info`):
   - Dark tooltip showing element selector (e.g., "div#myId.button")
   - Follows mouse cursor
   - Auto-positions to stay in viewport

**Event Handlers:**

- `onMove`: Updates highlight and info box as user moves mouse
- `onClick`: Sets `window.__inspectorSelectorResult` and calls cleanup
- `onKeyDown`: ESC key dismisses selector

**Polling Mechanism:**

```typescript
setInterval(() => {
  const result = await webviewRef.current.executeJavaScript(
    'window.__inspectorSelectorResult || null'
  )
  if (result) {
    // Clear the result
    await webviewRef.current.executeJavaScript(
      'window.__inspectorSelectorResult = null'
    )
    // Reset state
    injectedRef.current = false
    setIsSelecting(false)
    // Fire callback
    onSelected(result)
  }
}, 120)  // Poll every 120ms
```

**Why polling?**
- Electron webviews don't support direct event callbacks from injected scripts
- Polling is lightweight (120ms interval)
- Result is set synchronously in onClick handler

**Cleanup:**
- When `enabled` becomes false, removes overlay and info box
- Clears polling interval
- Resets refs

### 4. IPC Handler (`lib/conveyor/handlers/inspector-handler.ts`)

**`inspector-search-element` Handler:**

```typescript
1. Recursively walks workspace directory
   - Skips: node_modules, .git, dist, build, .next, etc.
   - Only processes: .tsx, .ts, .jsx, .js, .mjs, .cjs, .html
   - Skips files > 512KB

2. For each candidate file:
   - Scores match based on:
     * Component name match: +120 points
     * Tag name match: +80 points
     * ID match: +100 points
     * Class name match: +40 points per class
     * Text content match: +30 points
   - Finds best line number (highest score within file)
   - Returns top 10 matches sorted by score

3. Returns matches with:
   - relativePath
   - lineNumber
   - preview (snippet of matching line)
   - score
```

**`inspector-get-element-code` Handler:**

```typescript
1. Reads file content
2. Extracts code block around lineNumber:
   - Looks backward for component/function/class declaration
   - Looks forward for closing brace/bracket
   - Default: 40 lines before, 60 lines after
3. Returns:
   - code (full block)
   - startLine, endLine
   - absolutePath
```

### 5. ChatWindow Component (`app/components/ChatWindow.tsx`)

**Context Injection Logic:**

```typescript
useEffect(() => {
  if (!elementContext) return
  
  // Prevent duplicate injections
  const key = [tagName, id, className, relativePath, startLine, endLine].join('|')
  if (lastContextKey.current === key) return
  
  if (elementContext.codeSnippet) {
    // Success case: code found
    const header = `@${relativePath}:${startLine}-${endLine}`
    const snippet = `${header}\n```\n${code}\n```\n`
    // Append to input with smart spacing
    setInputValue(prev => prev + spacer + snippet)
  } else {
    // Fallback: element found but no code match
    const fallback = `// Element selected: ${tagName}#${id}.${className} — source not located\n`
    setInputValue(prev => prev + spacer + fallback)
  }
  
  lastContextKey.current = key
}, [elementContext])
```

**Smart Spacing:**
- Adds `\n\n` if input doesn't end with newline
- Adds `\n` if input already ends with newline
- Adds nothing if input is empty

### 6. ChatInput Component (`app/components/ui/chat/ChatInput.tsx`)

**Cursor Button:**

```typescript
<Button
  onClick={onRequestElementSelector}  // Toggles selector
  disabled={disabled || !onRequestElementSelector}
>
  <MousePointer2 
    className={`size-4 ${
      isElementSelectorActive 
        ? 'text-blue-400 dark:text-blue-500'  // Blue when active
        : ''  // Default gray
    }`} 
  />
</Button>
```

**Visual Feedback:**
- Cursor turns light blue when selector is active
- Returns to gray when selector is dismissed or element selected

## State Synchronization

**Critical State Dependencies:**

```
Workspace.elementSelectorVisible
  ↓
BrowserFrame.showElementSelector
  ↓
ElementSelector.enabled
  ↓
ElementSelector useEffect triggers
  ↓
Script injection or cleanup
```

**Preventing Race Conditions:**

1. `injectedRef` prevents double-injection
2. `pollingRef` prevents multiple intervals
3. Dependency array excludes `isSelecting` (was causing glitches)
4. Cleanup functions in useEffect ensure proper teardown

## Error Handling

**At Each Stage:**

1. **Injection fails**: `injectedRef` reset, error logged, selector disabled
2. **No workspace path**: Element passed without code snippet
3. **No matches found**: Element passed with fallback message
4. **Code extraction fails**: Element passed without code snippet
5. **Webview unavailable**: Early returns prevent crashes

## Performance Considerations

1. **Polling interval**: 120ms balances responsiveness vs CPU usage
2. **File size limit**: 512KB prevents processing huge files
3. **Match limit**: Top 10 results prevents overwhelming response
4. **Code block size**: ~100 lines max prevents huge context blocks
5. **Debouncing**: Selection state changes don't trigger unnecessary re-renders

## Security Considerations

1. **Script injection**: Only runs in Electron webview context (isolated)
2. **File access**: Only reads files, never writes
3. **Path validation**: Uses workspace path (user-selected, trusted)
4. **No eval**: Uses structured data extraction, not arbitrary code execution

## Future Improvements

Potential enhancements:
- Cache search results for better performance
- Support for multiple frameworks (currently optimized for React)
- Visual preview of matched code before injection
- Keyboard shortcuts for element selection
- Batch selection of multiple elements

