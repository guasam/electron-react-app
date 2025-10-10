# Auto-Update System: Complete Beginner's Guide

## What is Auto-Update and Why Do We Need It?

Imagine you install an app on your computer, like Spotify or Slack. After a few weeks, the company releases a new version with bug fixes or new features. Instead of forcing you to uninstall the old version and manually download and install the new one, the app **automatically updates itself**. That's what auto-update does.

For your internal tool, auto-update means:
- ✅ Users always have the latest version
- ✅ Bug fixes reach everyone quickly
- ✅ No manual "download and install" process
- ✅ Users don't have to think about updates

## How Auto-Update Works (The Big Picture)

Think of auto-update like a simple conversation:

```
Your App: "Hey S3, what's the latest version available?"
S3 Server: "The latest version is 12.0.5"
Your App: "Oh, I'm only 12.0.0. Let me download the new version!"
S3 Server: *sends the new installation file*
Your App: "Got it! User, would you like to restart and install this update?"
User: *clicks "Yes"*
Your App: *installs update and restarts*
```

This happens automatically in the background while the user works!

## The Moving Parts (All the Pieces)

Let's break down every piece involved in making auto-updates work:

### 1. Your Electron App (The Desktop Application)

**What it is**: The app installed on users' computers

**What it does**:
- Checks for updates periodically
- Downloads new versions when available
- Shows notifications to users
- Installs updates when user agrees

**Files involved**:
- `lib/main/updater.ts` - The "brain" that manages updates
- `app/components/UpdateNotification.tsx` - The UI that users see

---

### 2. Amazon S3 (The File Storage)

**What it is**: Amazon's cloud storage service (like Dropbox, but for apps)

**What it does**:
- Stores your app's installation files (.exe for Windows, .dmg for Mac)
- Stores a special file called `latest.yml` that tells apps what the newest version is
- Serves these files when apps request them

**Structure**:
```
S3 Bucket: apo-internal-updates
└── releases/
    ├── win32-x64/              ← Windows builds
    │   ├── latest.yml          ← "Version 12.0.5 is available!"
    │   ├── era-Setup-12.0.5.exe
    │   └── era-12.0.5-full.nupkg
    └── darwin-x64/             ← Mac builds
        ├── latest-mac.yml      ← "Version 12.0.5 is available!"
        ├── era-12.0.5-mac.zip
        └── era-12.0.5.dmg
```

---

### 3. electron-builder (The Packaging Tool)

**What it is**: A tool that packages your code into installable apps

**What it does**:
- Takes your source code
- Creates Windows installers (.exe), Mac installers (.dmg), etc.
- Generates the `latest.yml` file with version info
- **Uploads everything to S3** (when configured)

**Configuration File**: `electron-builder.yml`

---

### 4. update-electron-app (The Update Library)

**What it is**: A simple library made by the Electron team

**What it does**:
- Checks S3 for `latest.yml` file
- Compares the version in the file vs. the installed version
- Downloads new version if available
- Handles the installation process

**Why we chose it**: It's super simple! Just 2 lines of code in your main process.

---

### 5. GitHub Actions (The Automation Robot)

**What it is**: GitHub's automation service

**What it does**:
- Automatically builds your app when you create a release
- Runs electron-builder to create installers
- Uploads everything to S3
- All without you having to manually build and upload

**File**: `.github/workflows/release.yml`

---

### 6. Conveyor (Your Custom Communication System)

**What it is**: Your app's type-safe communication system between frontend (React) and backend (Electron's main process)

**What it does**: Allows the React UI to talk to the update system
- "Hey backend, check for updates!"
- "Backend here, there's an update downloading, here's the progress: 45%"

**Files**:
- `lib/conveyor/schemas/updater-schema.ts` - Defines what messages can be sent
- `lib/conveyor/api/updater-api.ts` - Frontend API to send messages
- `lib/conveyor/handlers/updater-handler.ts` - Backend handlers to receive messages

---

## How All the Pieces Work Together

### Step 1: You Release a New Version

```bash
# You increment version in package.json
"version": "12.0.5"

# You create a git tag and push it
git tag v12.0.5
git push origin v12.0.5
```

### Step 2: GitHub Actions Kicks In

```
1. GitHub sees the new tag
2. Starts a virtual Windows/Mac computer
3. Runs: npm install
4. Runs: npm run build:win
5. electron-builder creates the installer
6. electron-builder creates latest.yml file
7. Uploads both to S3
```

Your S3 now has the new files!

### Step 3: User Opens Your App

```javascript
// lib/main/updater.ts

// When app starts, this code runs:
updateElectronApp({
  updateSource: {
    type: UpdateSourceType.StaticStorage,
    baseUrl: 'https://your-bucket.s3.amazonaws.com/releases/win32-x64'
  },
  updateInterval: '30 minutes'
})
```

This does:
1. Fetches `https://your-bucket.s3.amazonaws.com/releases/win32-x64/latest.yml`
2. Reads the version inside: `version: 12.0.5`
3. Compares to current version: `12.0.0`
4. Realizes there's an update!

### Step 4: Download Begins

```javascript
// update-electron-app automatically downloads in background
// It downloads: era-Setup-12.0.5.exe

// While downloading, your updater.ts sends status to UI:
mainWindow.webContents.send('update-status', {
  status: 'downloading',
  data: { progress: 45 }
})
```

### Step 5: UI Shows Progress

```javascript
// app/components/UpdateNotification.tsx

// Your React component receives the message:
updater.onUpdateStatus((event, data) => {
  if (data.status === 'downloading') {
    // Show: "Downloading update... 45%"
  }
})
```

User sees a nice notification with a progress bar!

### Step 6: Download Complete

```javascript
// update-electron-app says: "Download complete!"

// Your updater.ts tells the UI:
mainWindow.webContents.send('update-status', {
  status: 'downloaded'
})
```

### Step 7: User Restarts

```javascript
// User clicks "Restart & Install" in your UI
// update-electron-app installs the new version
// App restarts with version 12.0.5!
```

---

## The Files We Created (What Each One Does)

### Backend Files (Node.js/Electron Main Process)

#### `lib/main/updater.ts` - **The Update Manager**
```typescript
// This is the "boss" of the update system
// It does:
// 1. Initializes update-electron-app
// 2. Listens for update events
// 3. Sends status to the UI
// 4. Manages the update lifecycle

export class UpdateManager {
  initialize() {
    // Start update-electron-app
  }

  sendUpdateStatus(status, data) {
    // Tell the UI what's happening
  }
}
```

**Analogy**: Like a project manager who coordinates everything

---

#### `lib/conveyor/schemas/updater-schema.ts` - **The Contract**
```typescript
// Defines EXACTLY what messages can be sent
// It's like a contract:

export const updaterIpcSchema = {
  'updater-check': {
    args: z.tuple([]),      // No arguments needed
    return: z.void(),       // Returns nothing
  }
}
```

**Why?** Prevents bugs! TypeScript ensures you can't send wrong data.

**Analogy**: Like a legal contract that says "These are the only things we agree to do"

---

#### `lib/conveyor/handlers/updater-handler.ts` - **The Backend Receiver**
```typescript
// When the UI says "check for updates", this handles it:

export const registerUpdaterHandlers = () => {
  handle('updater-check', () => {
    // User clicked "Check for Updates"
    updateManager.requestUpdateCheck()
  })
}
```

**Analogy**: Like a receptionist who receives phone calls and routes them

---

#### `lib/conveyor/api/updater-api.ts` - **The Frontend API**
```typescript
// The UI uses this to talk to the backend:

export class UpdaterApi {
  checkForUpdates = () => this.invoke('updater-check')

  onUpdateStatus = (callback) => {
    // Listen for status updates
  }
}
```

**Analogy**: Like a TV remote control - simple buttons that do complex things

---

### Frontend Files (React UI)

#### `app/components/UpdateNotification.tsx` - **The User Interface**
```typescript
// This is what users SEE:
// - "Checking for updates..."
// - "Downloading update... 45%"
// - "Update ready! Restart now?"

export function UpdateNotification() {
  const { updater } = useConveyor()

  // Listen for updates
  updater.onUpdateStatus((event, data) => {
    // Update UI based on status
  })

  return (
    <div className="notification">
      {/* Beautiful UI with progress bars */}
    </div>
  )
}
```

**What it shows**:
- 🔄 "Checking for updates..." (with spinner)
- 📥 "Downloading update... [progress bar]"
- ✅ "Update ready! Restart & Install"
- ❌ "Update failed" (with retry button)

---

### Configuration Files

#### `electron-builder.yml` - **Build Configuration**
```yaml
# Tells electron-builder:
# "When you build the app, upload it to THIS S3 bucket"

publish:
  provider: s3
  bucket: apo-internal-updates  # Your S3 bucket
  region: us-east-1            # AWS region
  path: /releases              # Folder in bucket
  acl: public-read             # Anyone can download
```

---

#### `.github/workflows/release.yml` - **Automation Script**
```yaml
# Tells GitHub:
# "When someone pushes a tag like v12.0.5,
#  automatically build the app and upload to S3"

on:
  push:
    tags:
      - 'v*'  # Any tag starting with 'v'

jobs:
  build-windows:
    steps:
      - Install Node.js
      - Install dependencies
      - Run: npm run build:win
      - Upload to S3
```

---

## The latest.yml File (The Secret Sauce)

This is the MOST IMPORTANT file for updates. When electron-builder builds your app, it creates this file:

```yaml
# latest.yml (automatically generated)

version: 12.0.5
files:
  - url: era-Setup-12.0.5.exe
    sha512: abc123def456...  # Checksum for security
    size: 89234567
path: era-Setup-12.0.5.exe
sha512: abc123def456...
releaseDate: '2025-01-10T12:00:00.000Z'
```

**What update-electron-app does**:
1. Downloads this file from S3
2. Reads `version: 12.0.5`
3. Compares to installed version (from package.json)
4. If newer, downloads the file listed in `path:`

---

## The Update Flow (Detailed)

### Scenario: User has version 12.0.0, you release 12.0.5

#### 1️⃣ App Starts
```javascript
// lib/main/main.ts
app.whenReady().then(() => {
  createAppWindow()
  updateManager.initialize()  // ← Starts checking for updates
})
```

#### 2️⃣ Check for Updates
```javascript
// lib/main/updater.ts
updateElectronApp({
  updateInterval: '30 minutes'  // Check every 30 min
})

// Internally does:
fetch('https://bucket.s3.amazonaws.com/releases/win32-x64/latest.yml')
```

#### 3️⃣ Compare Versions
```javascript
// update-electron-app (internal logic)
const latestVersion = '12.0.5'  // From latest.yml
const currentVersion = '12.0.0' // From package.json

if (latestVersion > currentVersion) {
  // Update available!
  downloadUpdate()
}
```

#### 4️⃣ Download Update
```javascript
// update-electron-app downloads:
// https://bucket.s3.amazonaws.com/releases/win32-x64/era-Setup-12.0.5.exe

// Every few seconds, fires progress event:
autoUpdater.on('download-progress', (progress) => {
  updateManager.sendUpdateStatus('downloading', { progress: 45 })
})
```

#### 5️⃣ Update UI
```javascript
// app/components/UpdateNotification.tsx
updater.onUpdateStatus((event, data) => {
  if (data.status === 'downloading') {
    setUpdateStatus({
      status: 'downloading',
      progress: data.data.progress  // 45%
    })
  }
})

// Renders:
// [=============>          ] 45%
```

#### 6️⃣ Download Complete
```javascript
// update-electron-app fires event:
app.on('before-quit-for-update', () => {
  updateManager.sendUpdateStatus('installing')
})

// UI shows: "Installing update, app will restart..."
```

#### 7️⃣ Install & Restart
```javascript
// update-electron-app:
// 1. Closes the app
// 2. Runs the installer (era-Setup-12.0.5.exe)
// 3. Installer replaces old files with new ones
// 4. Starts the app again
// 5. Now running version 12.0.5! ✅
```

---

## Common Questions

### Q: Why S3 and not GitHub Releases?

**A**: For private repos, GitHub requires authentication tokens, which is complex and potentially insecure (tokens in the app code). S3 allows public read access to specific files without authentication.

### Q: Why update-electron-app instead of electron-updater?

**A**: update-electron-app is simpler:
- ✅ 2 lines of code vs 50+ lines
- ✅ Officially supported by Electron team
- ✅ Perfect for internal tools

electron-updater is more powerful but overkill for this use case.

### Q: What if the user is offline?

**A**: The update check silently fails (no error shown). When they go back online, the next check (30 minutes later) will work.

### Q: What if S3 goes down?

**A**: Same as offline - update check fails silently. The app continues working normally with the current version.

### Q: Can users cancel a download?

**A**: Not with the current implementation. update-electron-app downloads automatically in the background. But it doesn't interrupt their work.

### Q: How big are the update files?

**A**: Typically:
- Windows: ~100-200 MB (full installer)
- macOS: ~150-250 MB

Future improvement: Differential updates (only download changes, not full installer)

---

## Testing Your Updates

### Test Scenario 1: First Install
```bash
# 1. Build version 12.0.0
npm run build:win:local

# 2. Install it on your computer

# 3. Bump version to 12.0.1 in package.json

# 4. Build and publish to S3
npm run build:win

# 5. Open the installed app (version 12.0.0)

# Expected: See notification "Update available to 12.0.1"
```

### Test Scenario 2: Manual Check
```bash
# In your app, add a button somewhere:
<button onClick={() => updater.checkForUpdates()}>
  Check for Updates
</button>

# Click it and watch the notification appear!
```

---

## Troubleshooting

### "No update found" but I know there's a new version

**Checklist**:
1. ✅ Did you increment `package.json` version?
2. ✅ Does `latest.yml` exist in S3?
3. ✅ Is the `version:` in `latest.yml` higher than installed version?
4. ✅ Is the S3 bucket publicly readable?
5. ✅ Check browser: Can you visit the S3 URL directly?

```bash
# Test S3 URL (replace with your bucket):
https://apo-internal-updates.s3.us-east-1.amazonaws.com/releases/win32-x64/latest.yml
```

### "Update downloads but doesn't install"

**Possible causes**:
- Windows: User doesn't have admin permissions
- Antivirus blocking the installer
- File corrupted during download

**Solution**: Check logs at:
- Windows: `%APPDATA%/era/logs/main.log`
- macOS: `~/Library/Logs/era/main.log`

---

## Summary

You've implemented a complete auto-update system with:

1. **update-electron-app**: The simple library that checks for updates
2. **S3**: Cloud storage for your installers and metadata
3. **electron-builder**: Tool that builds and publishes to S3
4. **GitHub Actions**: Automation to build on every release
5. **Conveyor IPC**: Communication between UI and update system
6. **React UI**: Beautiful notifications showing update progress

**The magic**: When you push a tag (`v12.0.5`), everything happens automatically:
- GitHub builds the app
- Uploads to S3
- Users' apps check S3
- Find the new version
- Download and install it
- All without you doing anything! 🎉

---

## Next Steps

To make your first release:

```bash
# 1. Update version
# Edit package.json: "version": "12.0.1"

# 2. Commit changes
git add .
git commit -m "Release v12.0.1"

# 3. Create tag
git tag v12.0.1

# 4. Push everything
git push origin main
git push origin v12.0.1

# 5. Watch GitHub Actions build and publish!
# 6. Wait for users' apps to auto-update!
```

Welcome to the world of automated updates! 🚀