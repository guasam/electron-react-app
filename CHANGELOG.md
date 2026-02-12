# Change Log

All notable changes to the electron-react-app (ERA) are listed here.

<br>

## v12.1.0

- 🎉 Electron version upgraded to `v40.1.0`
- Update shadcn components in use
- Added `npm run format` command for prettier code formatting
- Refactor electron-builder configuration
- Simplified error boundary component + selectable text
- Fix: window styles that caused children div elements to have full height
- Tweak titlebar icon display condition for darwin platform
- Improve welcome content text and styles
- Upgraded dependencies to latest usable versions:

<details>
<summary><strong>📋 View Dependency Updates</strong></summary>

```bash
↑ @electron-toolkit/eslint-config-prettier@3.0.0
↑ @electron-toolkit/tsconfig@2.0.0
↑ @eslint/js@10.0.1
↑ @rushstack/eslint-patch@1.15.0
↑ @tailwindcss/vite@4.1.18
↑ @types/node@25.2.3
↑ @types/react@19.2.14
↑ @types/react-dom@19.2.3
↑ @vitejs/plugin-react@5.1.4
↑ cross-env@10.1.0
↑ electron@40.4.0
↑ electron-builder@26.7.0
↑ electron-vite@5.0.0
↑ eslint@10.0.0
↑ eslint-plugin-react@7.37.5
↑ eslint-plugin-react-hooks@7.0.1
↑ framer-motion@12.34.0
↑ npm-run-all@4.1.5
↑ prettier@3.8.1
↑ react@19.2.4
↑ react-dom@19.2.4
↑ tailwindcss@4.1.18
↑ typescript@5.9.3
↑ typescript-eslint@8.55.0
↑ vite@7.3.1
↑ @electron-toolkit/preload@3.0.2
↑ @electron-toolkit/utils@4.0.0
↑ @radix-ui/react-slot@1.2.4
↑ @radix-ui/react-switch@1.2.6
↑ class-variance-authority@0.7.1
↑ clsx@2.1.1
↑ lucide-react@0.563.0
↑ tailwind-merge@3.4.0
↑ tw-animate-css@1.4.0
↑ zod@4.3.6
```

</details>

<br>

## v12.0.0

- 🎉 Electron version upgraded to `v37`
- ⛓️ **Conveyor System** - Type-safe Inter-Process Communication
  - Implemented comprehensive type-safe IPC system with Zod validation
  - Added modular API architecture for clean separation of concerns
  - Integrated global type declarations for seamless TypeScript support
  - Created React hook `useConveyor()` for easy component integration
  - Added comprehensive documentation and usage examples
  - Implemented runtime validation for enhanced security and reliability

- 🏗️ **Project Structure Optimization**
  - Reorganized file structure for better maintainability
  - Consolidated shared utilities and components
  - Improved separation of concerns between main and renderer processes
  - Enhanced module organization and import paths

- ⚡ **Component Performance Optimization**
  - Optimized React component rendering and re-renders
  - Trimmed down component bundle sizes

- 🛠️ Developer Experience
  - Updated TypeScript configuration for better type safety
  - Enhanced ESLint rules and code quality checks
  - Improved build process and error reporting
  - Added better development tooling integration
  - Enhanced project structure with better separation of concerns
  - Added cross-env for cross-platform environment variable support
  - Using npm as the package manager for the project

- 📦 Dependencies
  - Upgraded dependencies to latest versions:

<details>
<summary><strong>📋 View Dependency Updates</strong></summary>

```bash
↑ @eslint/js                   9.28.0 → 9.34.0
↑ @rushstack/eslint-patch      1.11.0 → 1.12.0
↑ @tailwindcss/vite            4.1.8  → 4.1.12
↑ @types/node                  22.15.29 → 24.3.0
↑ @types/react                 19.1.6  → 19.1.11
↑ @types/react-dom             19.1.5  → 19.1.8
↑ @vitejs/plugin-react         4.5.0   → 5.0.1
↑ electron                     36.3.2  → 37.3.1
↑ electron-vite                3.1.0   → 4.0.0
↑ eslint                       9.28.0  → 9.34.0
↑ framer-motion                12.15.0 → 12.23.12
↑ prettier                     3.5.3   → 3.6.2
↑ react                        19.1.0  → 19.1.1
↑ react-dom                    19.1.0  → 19.1.1
↑ tailwindcss                  4.1.8   → 4.1.12
↑ typescript                   5.8.3   → 5.9.2
↑ typescript-eslint            8.33.0  → 8.41.0
↑ vite                         6.3.5   → 7.1.3
↑ @radix-ui/react-switch       1.2.5   → 1.2.6
↑ lucide-react                 0.511.0 → 0.541.0
↑ tailwind-merge               3.3.0   → 3.3.1
↑ tw-animate-css               1.3.2   → 1.3.7
```

</details>

<br>

## v11.0.0

- 🎉 Electron version upgraded `v36`
- 🎨 Integrated Shadcn UI Component System
  - Added new component library with Radix UI primitives
  - Implemented accessible and customizable components
  - Added TypeScript support for better developer experience
  - Integrated with Tailwind CSS for consistent styling
  - Added new component showcase in welcome kit

- 🎨 Enhanced Design System
  - Implemented new color system with CSS variables
  - Added new design tokens for consistent theming
  - Improved dark/light mode implementation
  - Added new radius system for consistent border radius
  - Enhanced typography system
  - Added new chart color palette

- 🎨 Welcome Kit Improvements
  - Added Shadcn UI showcase section
  - Enhanced dark mode toggle
  - Added new icons and updated welcome component content
  - Updated welcome component styles to support light mode without dark class
  - Integrated dark mode toggle in WelcomeKit using Badge component

- 🎨 Developer Experience
  - Added new component configuration system
  - Improved TypeScript support
  - Enhanced component documentation
  - Added new development utilities
  - Fixed ESLint configuration issues
  - Implemented res:// protocol for app resources

- 📦 Dependencies
  - Upgraded dependencies to latest versions:

| Package                   | Version    |
| ------------------------- | ---------- |
| @electron-toolkit/preload | `^3.0.2`   |
| @electron-toolkit/utils   | `^4.0.0`   |
| @tailwindcss/vite         | `^4.1.8`   |
| @vitejs/plugin-react      | `^4.5.0`   |
| electron                  | `^36.3.2`  |
| electron-builder          | `^26.0.12` |
| electron-vite             | `^3.1.0`   |
| eslint                    | `^9.28.0`  |
| eslint-plugin-react       | `^7.37.5`  |
| framer-motion             | `^12.15.0` |
| prettier                  | `^3.5.3`   |
| react                     | `^19.1.0`  |
| react-dom                 | `^19.1.0`  |
| tailwindcss               | `^4.1.8`   |
| typescript                | `^5.8.3`   |
| vite                      | `^6.3.5`   |

<br>

## v10.2.0

- 🎉 Electron version upgraded `v35.x.x`
- 📦 Upgraded dependencies to latest versions:

| Package                            | Version    |
| ---------------------------------- | ---------- |
| @electron-toolkit/preload          | `^3.0.2`   |
| @electron-toolkit/eslint-config    | `^2.1.0`   |
| @electron-toolkit/eslint-config-ts | `^3.1.0`   |
| @rushstack/eslint-patch            | `^1.11.0`  |
| @tailwindcss/vite                  | `^4.1.4`   |
| @vitejs/plugin-react               | `^4.4.1`   |
| electron                           | `^35.2.0`  |
| electron-builder                   | `^26.0.12` |
| electron-vite                      | `^3.1.0`   |
| eslint                             | `^9.25.1`  |
| eslint-plugin-react                | `^7.37.5`  |
| framer-motion                      | `^12.7.4`  |
| prettier                           | `^3.5.3`   |
| react                              | `^19.1.0`  |
| react-dom                          | `^19.1.0`  |
| tailwindcss                        | `^4.1.4`   |
| typescript                         | `^5.8.3`   |
| vite                               | `^6.3.2`   |

<br>

## v10.1.0

- Add pnpm configuration for only built dependencies
- Prevent app from quitting on macOS when all windows are closed

<br>

## v10.0.0

- 🚀 Major overhaul: Complete migration from Webpack to Vite
- ⚡ Significantly improved build times and development experience
- 🎨 Added TailwindCSS integration for modern styling
- 🏗️ Restructured project files for better organization:
  - Moved renderer code to `app/` folder
  - Consolidated shared code in `lib/` folder
  - Moved main process code to `lib/main` folder
  - Moved preload code to `lib/preload` folder
- 💅 Refreshed UI with new design system and components
- 🌓 Enhanced dark/light mode implementation with smoother transitions
- 📦 Updated IPC communication system for better security
- 🔄 Added new welcome kit with interactive tutorial
- ⚙️ Simplified configuration files and build scripts
- 📊 Improved logging and error handling
- 🛠️ Updated Electron to latest version `v31.2.2`
- 📈 Upgraded dependencies to latest versions:

| Package              | Version   |
| -------------------- | --------- |
| electron             | `^34.3.0` |
| react                | `^19.0.0` |
| react-dom            | `^19.0.0` |
| typescript           | `^5.7.3`  |
| vite                 | `^6.2.0`  |
| tailwindcss          | `^4.0.9`  |
| electron-vite        | `^3.0.0`  |
| electron-builder     | `^25.1.8` |
| @vitejs/plugin-react | `^4.3.4`  |

<br>

## v8.1.0

- 🎉 Electron version upgraded `v23.0.0`.
- Using `eslint.config.json` as eslint configuration.
- Tweaked app themes colors.
- Upgraded outdated packages:

| Package                              | Version   |
| ------------------------------------ | --------- |
| electron                             | `^31.2.1` |
| @electron-forge                      | `7.4.0`   |
| electron-squirrel-startup            | `^1.0.1`  |
| @pmmmwh/react-refresh-webpack-plugin | `^0.5.15` |
| @typescript-eslint                   | `^7.16.1` |
| css-loader                           | `^7.1.2`  |
| eslint                               | `^9.7.0`  |
| eslint-plugin-react                  | `^7.34.4` |
| react-refresh                        | `^0.14.2` |
| sass                                 | `^1.77.8` |
| sass-loader                          | `^14.2.1` |
| style-loader                         | `^4.0.0`  |
| typescript                           | `^5.5.3`  |
| webpack                              | `^5.93.0` |
| react                                | `^18.3.1` |
| react-dom                            | `^18.3.1` |

<br>

## v8.0.0

- 🎉 Application UI and Themes (light/dark).
- Using latest Electron version `v28`
- Changed app accent colors & added credits menu item.
- Integrated `electron-window` components & modules in project's file structure.
- Separated dark/light themes from application stylesheet for easy modification.
- Added `@styles` alias for easily import stylesheets.
- Removed `less-loader` by default from project.
- Removed unused `misc` directory.
- Removed unused `src/common` directory.
- Converted `less` to `scss` for window components stylesheet.
- Updated forge config with more useful hints.
- Upgraded outdated packages to their latest supported versions.

<br>

## v7.8.0

Upgraded outdated packages:

| Package                        | Version  |
| ------------------------------ | -------- |
| electron                       | `27.1.2` |
| @electron-forge                | `7.1.0`  |
| @typescript-eslint             | `6.13.1` |
| eslint-plugin-import           | `2.29.0` |
| eslint                         | `8.54.0` |
| less                           | `4.2.0`  |
| sass                           | `1.69.5` |
| ts-loader                      | `9.5.1`  |
| typescript                     | `5.3.2`  |
| webpack                        | `5.89.0` |
| react-refresh-webpack-plugin   | `0.5.11` |
| fork-ts-checker-webpack-plugin | `9.0.2`  |

<br>

## v7.7.0

Upgraded outdated packages:

| Package                      | Version  |
| ---------------------------- | -------- |
| electron                     | `26.2.2` |
| @electron-forge              | `6.4.2`  |
| @typescript-eslint           | `6.7.3`  |
| eslint-plugin-import         | `2.28.1` |
| eslint-plugin-react          | `7.33.2` |
| eslint                       | `8.50.0` |
| less                         | `4.2.0`  |
| sass                         | `1.68.0` |
| typescript                   | `5.2.2`  |
| webpack                      | `5.88.2` |
| react-refresh-webpack-plugin | `0.5.11` |

<br>

## v7.6.0

Upgraded outdated packages:

| Package            | Version  |
| ------------------ | -------- |
| electron           | `25.2.0` |
| @electron-forge    | `6.2.1`  |
| @typescript-eslint | `6.0.0`  |
| eslint             | `8.44.0` |
| less-loader        | `11.1.3` |
| sass               | `1.63.6` |
| sass-loader        | `13.3.2` |
| ts-loader          | `9.4.4`  |
| typescript         | `5.1.6`  |
| webpack            | `5.88.1` |

<br>

## v7.5.0

Upgraded outdated packages:

| Package            | Version  |
| ------------------ | -------- |
| electron           | `25.0.1` |
| @typescript-eslint | `5.59.9` |
| css-loader         | `6.8.1`  |
| eslint             | `8.42.0` |
| less-loader        | `11.1.2` |
| sass               | `1.62.1` |
| sass-loader        | `13.3.1` |
| style-loader       | `3.3.3`  |
| ts-loader          | `9.4.3`  |
| typescript         | `5.1.3`  |
| webpack            | `5.85.1` |

<br>

## v7.3.3

Upgraded outdated packages:

| Package            | Version  |     |
| ------------------ | -------- | --- |
| electron           | `24.1.2` | ⬆️  |
| @electron-forge    | `6.1.1`  | ⬆️  |
| @typescript-eslint | `5.59.0` | ⬆️  |
| eslint             | `8.39.0` | ⬆️  |
| sass               | `1.62.0` | ⬆️  |
| sass-loader        | `13.2.2` | ⬆️  |
| typescript         | `5.0.4`  | ⬆️  |
| webpack            | `5.80.0` | ⬆️  |

<br>

## v7.3.2

Upgraded outdated packages:

| Package            | Version    |     |
| ------------------ | ---------- | --- |
| electron           | `23.2.0`   | ⬆️  |
| eslint             | `8.36.0`   | ⬆️  |
| sass               | `1.60.0`   | ⬆️  |
| sass-loader        | `13.2.1`   | ⬆️  |
| style-loader       | `3.3.2`    | ⬆️  |
| typescript         | `5.0.2`    | ⬆️  |
| webpack            | `5.76.3`   | ⬆️  |
| @types/node        | `18.15.10` | ⬆️  |
| @types/react       | `18.0.29`  | ⬆️  |
| @types/react-dom   | `18.0.11`  | ⬆️  |
| @typescript-eslint | `5.56.0`   | ⬆️  |

<br>

## v7.3.1

Upgraded outdated packages:

| Package            | Version   |     |
| ------------------ | --------- | --- |
| electron           | `23.1.2`  | ⬆️  |
| eslint             | `8.35.0`  | ⬆️  |
| sass               | `1.58.3`  | ⬆️  |
| @types/node        | `18.14.6` | ⬆️  |
| @types/react       | `18.0.28` | ⬆️  |
| @types/react-dom   | `18.0.11` | ⬆️  |
| @typescript-eslint | `5.54.0`  | ⬆️  |

<br>

## v7.3.0

- 🎉 Electron version upgraded `v23.0.0`
- Upgraded outdated packages:
  - `electron` upgraded to `v23.0.0`
  - `@electron-forge` deps upgraded to `v6.0.5`
  - `@typescript-eslint` deps upgraded to `v5.51.0`
  - `css-loader` upgraded to `v6.7.3`
  - `eslint` upgraded to `v8.33.0`
  - `eslint-plugin-import` upgraded to `v2.27.5`
  - `eslint-plugin-react` upgraded to `v7.32.2`
  - `fork-ts-checker-webpack-plugin` upgraded to `v7.3.0`
  - `sass` upgraded to `v1.58.0`
  - `typescript` upgraded to `v4.9.5`

<br>

## v7.2.0

- 🎉 Electron version upgraded `v22.0.0`
- Upgraded outdated packages:
  - `electron` upgraded to `v22.0.0`
  - `@electron-forge` deps upgraded to `v6.0.4`
  - `@pmmmwh/react-refresh-webpack-plugin` upgraded to `v0.5.10`
  - `@typescript-eslint` deps upgraded to `v5.46.0`
  - `css-loader` upgraded to `v6.7.2`
  - `eslint` upgraded to `v8.29.0`
  - `sass-loader` upgraded to `v13.2.0`
  - `ts-loader` upgraded to `v9.4.2`
  - `typescript` upgraded to `v4.9.4`
  - `webpack` upgraded to `v5.75.0`

<br>

## v7.1.0

- 🎉 Electron version upgraded to `v21.2.0`
- Fixed Devtools Console warning message caused by content policy.
- Upgraded forge config plugins format to support latest version.
- Disabled `sandbox` by default in application window.
- Upgraded outdated deps:
  - `electron` upgraded to `v21.2.0`
  - `@electron-forge` deps upgraded to `v6.0.0-beta.68`
  - `@pmmmwh/react-refresh-webpack-plugin` upgraded to `v0.5.8`
  - `@typescript-eslint` deps upgraded to `v5.41.0`
  - `classnames` upgraded to `v2.3.2`
  - `eslint` upgraded to `v8.26.0`
  - `eslint-plugin-react` upgraded to `v7.31.10`
  - `less-loader` upgraded to `v11.1.0`
  - `sass` upgraded to `v1.55.0`
  - `sass-loader` upgraded to `v13.1.0`
  - `ts-loader` upgraded to `v9.4.1`
  - `typescript` upgraded to `v4.8.4`

<br>

## v7.0.0

- 🥳 New layout for default application.
- 🤖 Overhaul for dark/light themes with new colors.
- Improved transition timing of title menus list.
- Fixed native modules compiling issue with update to related webpack loader.
- Updated forge `devContentSecurityPolicy` config for electron window.
- Upgraded outdated deps:
  - `electron` upgraded to `v19.0.14`
  - `@electron-forge` deps upgraded to `v6.0.0-beta.65`
  - `@typescript-eslint` deps upgraded to `v5.36.1`
  - `eslint` upgraded to `v8.23.0`
  - `eslint-plugin-react` upgraded to `v7.30.1`
  - `sass` upgrded to `v1.54.0`
  - `typescript` upgraded to `v4.7.4`

<br>

## v6.2.0

- Upgraded outdated deps:
  - `electron` upgraded to `^19.0.9`.
  - `@typescript-eslint` deps upgraded to `v5.30.7`.
  - `eslint` upgraded to `v8.20.0"`.
  - `fork-ts-checker-webpack-plugin` upgraded to `v7.2.13`.
  - `sass` upgraded to `v1.54.0`.
  - `sass-loader` upgraded to `v13.0.2`.
  - `webpack` upgraded to `v5.74.0`.

<br>

## v6.1.0

- 🎉 Electron version upgraded to `v19.0.6`
- Using `misc/window` for custom window without git submodule.
- Upgraded outdated deps:
  - `electron` upgraded to `v19.0.6`
  - `@electron-forge` deps upgraded to `v6.0.0-beta.64`
  - `@pmmmwh/react-refresh-webpack-plugin` upgraded to `v0.5.7`
  - `@types` deps upgraded to latest version
  - `@typescript-eslint` deps upgraded to `v5.29.0`
  - `eslint` upgraded to `v8.18.0`
  - `eslint-plugin-react` upgraded to `v7.30.1`
  - `fork-ts-checker-webpack-plugin` upgraded to `v7.2.11`
  - `less` upgraded to `v4.1.3`
  - `less-loader` upgraded to `v11.0.0`
  - `react-refresh` upgraded to `v0.14.0`
  - `sass` upgraded to `v1.53.0`
  - `sass-loader` upgraded to `v13.0.1`
  - `ts-loader` upgraded to `v9.3.1`
  - `typescript` upgraded to `v4.7.4`
  - `webpack` upgraded to `5.73.0`

<br>

## v6.0.0

- 🙌🏻 New Layout for default application.
- 🌑 Dark mode & 💡 Light Mode colors.
- 🎉 Electron version upgraded to `v18.1.0`
- Using `sass/scss` stylesheets by default for project (previously `less` was used).
- Using `React Fast Refresh` for hot reloading, removed old `hot-loader`.
- Titlebar Menus style overrides for improvements with rounded corners.
- Created a new `Theme.scss` file for adjusting light/dark mode color schemes.
- Persist theme state in `localStorage` by default.
- Using `pnpm` instead of `yarn` as package manager for project.
- Upgraded outdated deps:
  - `electron` upgraded to `v18.1.0`
  - `eslint` upgraded to `v8.13.0`
  - `typescript` upgraded to `v4.6.3`
  - `webpack` upgraded to `v5.72.0`
  - `react` deps upgraded to `v18.0.0`

<br>

## v5.5.0

- Upgraded outdated deps:
  - `electron` upgraded to `v17.2.0`
  - `eslint` ugpraded to `v8.11.0`,
  - `css-loader` upgraded to `v6.7.1`
  - `@typescript-eslint/eslint-plugin` deps upgraded to `v5.16.0`
  - `eslint-plugin-react` upgraded to `v7.29.4`
  - `ts-loader` upgraded to `v9.2.8`
  - `typescript` upgraded to `v4.6.3`
  - `webpack` upgraded to `v5.70.0`

<br>

## v5.4.0

- 🎉 Electron core upgraded `v17.0.1`
- Upgraded outdated deps:
  - `@hot-loader/react-dom` upgraded to `v17.0.2`
  - `webpack` upgraded to `v5.69.1`
  - `typescript` upgraded to `v4.5.5`
  - `fork-ts-checker-webpack-plugin` upgraded to `v7.2.1`
  - `eslint` upgraded to `v8.9.0`
  - `css-loader` upgraded to `v6.6.0`
  - `@typescript-eslint` deps upgraded to `v5.12.1`

<br>

## v5.3.0

- Electron Window : File menu visible by default
- Upgraded outdated deps:
  - `electron` upgraded to `v16.0.7`
  - `@electron-forge` deps upgraded to `v6.0.0-beta.63`
  - `@types/node` upgraded to `v17.0.8`
  - `@typescript-eslint` deps upgraded to `v5.9.1`
  - `eslint` upgraded to `v8.6.0`
  - `typescript` upgraded to `v4.5.4`
  - `webpack` upgraded to `v5.66.0`

<br>

## v5.2.0

- 🎉 Electron core upgraded `v16`
- Upgraded outdated deps:
  - `@typescript-eslint` deps upgraded to `^5.5.0`
  - `eslint` upgraded to `^8.4.0`
  - `fork-ts-checker-webpack-plugin` upgraded to `^6.5.0`
  - `typescript` upgraded to `^4.5.2`
  - `webpack` upgraded to `^5.64.4`

<br>

## v5.1.0

- Fix: CSS/LESS `background-image` corrupted image file output.
- Updated: Webpack Rules to load assets using [Webpack v5 Asset Modules](https://webpack.js.org/guides/asset-modules/) instead of `file-loader`
- Fix: Typo in eslint alias map for `@components`
- Updated: Window (submodule) to latest version.
- Removed: Unused contextBridge api declaration.

<br>

## v5.0.0

- Overhauled: Application default layout and styling.
- Overhauled: Project files structure to separate 'main' & 'renderer' modules.
- Added: Custom Window Frame.
- Added: Custom Window Titlebar.
- Added: Custom Menus for Titlebar.
- Added: Window controls for `windows` & `mac` based platform.
- Renamed: `.eslintrc.json` to `.eslintrc`
- Upgraded Outdated deps :
  - `eslint` upgraded to `v8.2.0`
  - `css-loader` upgraded to `v6.5.1`
  - `@typescript-eslint` deps upgraded to `v5.3.0`
  - `webpack` upgraded to `v5.62.1`

<br>

## v4.2.0

- 🎉 Electron core upgraded to version `v15`
- Application colors updated for vue environment
- Fix eslint script
- Default window background color updated.
- Upgrade outdated deps:
  - `electron` upgraded to `^15.0.0`
  - `@electron-forge` deps upgraded to `6.0.0-beta.61`
  - `@types/node` upgraded to `^16.9.6`
  - `@typescript-eslint` deps upgraded to `^4.31.2`
  - `css-loader` upgraded to `^6.3.0`

<br>

## v4.1.0

- 🎉 Electron core upgraded to version `v14`
- Update application style properties
- Enable `nativeWindowOpen` for main window
- Remove `enableRemoteModule` from main window
- Fix : Hot reloading issue caused by `liveReload` in webpack devServer
- Added additional Webpack `devServer` configuration in `tools/forge/forge.config.js`
- Upgraded outdated deps:
  - `@electron-forge` deps upgraded to `6.0.0-beta.60`
  - `@typescript-eslint` deps upgraded to `^4.30.0`
  - `@types/react` upgraded to `^17.0.19`
  - `electron` upgraded to `^14.0.0`
  - `eslint-plugin-import` upgraded to `^2.24.2`
  - `eslint-plugin-react` upgraded to `^7.25.1`
  - `typescript` upgraded to `^4.4.2`
  - `webpack` upgraded to `^5.51.1`

<br>

## v4.0.1

- Update file-loader configuration for `assets` files
- Add packager configuration for app executable file details
- Update `README` with similar useful projects

<br>

## v4.0.0

- Overhaul for Application default layout and styling.
- Default window background color updated.
- Default `minimal` stats output for main & renderer process via webpack.
- Upgraded outdated deps :
  - `electron` upgraded to `^13.1.9`
  - `@electron-forge` packages upgraded to `6.0.0-beta.59`
  - `@typescript-eslint` packages upgraded to `^4.29.2`
  - `css-loader` upgraded to `^6.2.0`
  - `eslint` upgraded to `^7.32.0`
  - `fork-ts-checker-webpack-plugin` upgraded to `^6.3.2`
  - `less-loader` upgraded to `10.0.1`
  - `style-loader` upgraded to `^3.2.1`
  - `ts-loader` upgraded to `9.2.5`
  - `typescript` upgraded to `^4.3.5`
  - `webpack` upgraded to `^5.50.0`

<br>

## v3.1.0

- Electron core 🚀 upgraded to version 13.
- Expose Webpack Ports settings in forge configuration.
- Upgraded outdated packages :
  - `electron` upgraded to `^13.0.1`
  - `@typescript-eslint` packages upgraded to `^4.26.0`
  - `eslint` upgraded to `^7.27.0`
  - `css-loader` upgraded to `^5.2.6`
  - `ts-loader` upgraded to `8.3.0`
  - `typescript` upgraded to `^4.3.2`
  - `webpack` upgraded to `^5.38.1`
  - `fork-ts-checker-webpack-plugin` upgraded to `^6.2.10`

<br>

## v3.0.1

- Upgraded outdated packages
  - `electron'` upgraded to `^12.0.6`
  - `react` upgraded to `^17.0.2`
  - `react-dom` upgraded to `^17.0.2`
  - `css-loader` upgraded to `^5.2.4`
  - `eslint` upgraded to `^7.25.0`
  - `node-loader` upgraded to `2.0.0`
  - `ts-loader` upgraded to `8.2.0`
  - `typescript` upgraded to `^4.2.4`
  - `webpack` upgraded to `^5.36.2`

<br>

## v3.0.0

- Overhaul for Application component layout and styling.
- Project Files structure updated.
- Move static images to `assets` directory.
- Remove `.prettierignore` file.
- Use `.tsx` file extension for `preload` and `renderer` incase we need to use components.
- Introduce new `assets` webpack alias.
- Modify aliases usage for new project structure.
- Upgraded outdated dependencies
  - `electron` upgraded to `12.0.1`
  - `css-loader` upgraded to `5.1.3`
  - `eslint` upgraded to `7.22.0`
  - `less` upgraded to `4.1.1`
  - `less-loader` upgraded to `7.3.0`
  - `ts-loader` upgraded to `8.0.18`
  - `typescript` upgraded to `4.2.3`
  - `webpack`
