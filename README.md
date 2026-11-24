# Electron Business Starter

An Electron, React, TypeScript, Tailwind and Shadcn UI starter with a working business feature. Awilix assembles constructor-injected services; Drizzle manages a local SQLite database. Settings demonstrates the complete renderer -> typed IPC -> application -> repository -> SQLite path, plus filesystem access behind its own repository.

## Start developing

Use pnpm (see [installation](https://pnpm.io/installation) if it is unavailable). The `packageManager` field selects pnpm 12.23.0 for this repository. Compatible pnpm launchers switch to that version automatically; an older launcher may need updating to support it. This project pin leaves other repositories' package-manager choices independent. Installation also provisions the pinned Node.js 26 LTS development runtime locally. From this checkout:

```sh
pnpm install
pnpm dev
```

Installation downloads Electron automatically through `postinstall`. SQLite uses the driver's bundled Node-API binaries on supported desktop architectures. There is no separate setup command or C++ rebuild step. Use pnpm for all package operations; `pnpm-lock.yaml` is the sole lockfile, and CI installs with `pnpm install --frozen-lockfile`.

Reviewed dependency build permissions live in [pnpm-workspace.yaml](pnpm-workspace.yaml). When adding a dependency with an install script, inspect it and update that policy deliberately. TypeScript remains on the latest supported 6.0 patch because the current lint parser requires `<6.1`; other direct dependencies use current compatible stable releases.

The Settings screen supports creating key/value pairs, editing values, cursor navigation, confirmed deletion, full restart persistence and two-window conflict recovery. Keys are unique and immutable; values are plain text up to 5,000 characters. Native JSON import/export supports at most 1,000 settings and 5 MiB; import merges by key and replaces existing values atomically. Archives are not database backups. The original Stack tour remains available in navigation.

## Structure

```text
app/features/settings/          React views, editor, query hooks
conveyor/modules/settings.ts    Thin typed IPC handlers
modules/settings/
  domain/                    Models, rules, repository interfaces
  application/               Constructor-injected business services
  contracts/                 Portable IPC DTOs and archive format
  infrastructure/            Drizzle and filesystem implementations
  providers.ts               Explicit Awilix factories
shared/domain/               Application errors, clock and ID ports
lib/main/bootstrap/          Composition root and operation lifecycle
lib/main/infrastructure/     SQLite resource and native chooser
lib/preload/                 Minimal allowlisted bridge
drizzle/                     Generated SQL and migration metadata
tests/                       Unit, integration, React and desktop suites
```

Domain and application code do not resolve the container or import Electron/Drizzle. External access is behind feature-owned interfaces. Infrastructure maps external data; IPC selects DTO fields and exposes safe errors. Architecture tests enforce dependency direction.

## Commands

| Command                                            | Purpose                                                    |
| -------------------------------------------------- | ---------------------------------------------------------- |
| `pnpm run check`                                   | Types, lint, formatting and fast tests                     |
| `pnpm test`                                        | Unit, real SQLite/filesystem, React and boundary tests     |
| `pnpm run test:watch`                              | Watch fast tests                                           |
| `pnpm run check:native`                            | Real in-memory SQLite query under Electron                 |
| `pnpm run test:electron`                           | Fast tests under Electron's Node runtime                   |
| `pnpm run test:desktop`                            | Build and exercise real Electron flows                     |
| `pnpm run build:unpack`                            | Unpacked app for the current OS                            |
| `pnpm run test:packaged`                           | Persistence smoke test against that package                |
| `pnpm run db:generate`                             | Generate migrations after schema edits                     |
| `pnpm run db:studio`                               | Inspect an explicit `STARTER_DATABASE_PATH` development DB |
| `pnpm run build:win` / `build:mac` / `build:linux` | Distribution targets                                       |

Migrations run at startup before business IPC/windows are available. Do not use schema push against existing profiles. Signing, notarization and publishing remain downstream deployment choices; the builder produces unsigned development artifacts.

## What installation does

`pnpm install` installs the locked dependencies and runs the project's `postinstall` command, `install-electron`, to download/extract the selected Electron executable. The local development Node runtime is recorded with its checksum in the lockfile; Electron ships its own separate runtime.

`pnpm run check:native` optionally verifies the native driver by running Electron in Node mode, loading better-sqlite3, querying `sqlite_version()` in memory, closing the connection and exiting. Linux needs its desktop system libraries installed before executing Electron; downloading it does not require a display.

Installation and the native check do not create the application's database, run migrations, seed settings or start the UI. Application startup owns database creation/migration.

## Profiles and data

The initial migration creates only `settings` (key, value, generation token, created/updated timestamps, version), plus Drizzle migration bookkeeping. The database is `<userData>/database/app.sqlite`. Development appends `-development` to Electron's default userData path; packaged apps use the normal platform-specific userData directory. One process owns each profile; a second launch focuses the existing instance. Separate profiles run independently.

Override the profile with an **absolute** `STARTER_PROFILE_DIRECTORY` for isolated development. Tests must never use a normal profile. Change application identity/product settings before distributing a clone so unrelated apps do not share packaged data.

```powershell
$env:STARTER_PROFILE_DIRECTORY = 'D:\scratch\my-electron-profile'
pnpm dev
```

This unreleased baseline replaces the former example migration. Existing trial profiles using that history remain untouched and are incompatible; select a fresh profile with `STARTER_PROFILE_DIRECTORY`. Future released migration histories must remain immutable.

Existing-profile upgrades validate migration history and create a SQLite recovery snapshot. Incompatible/newer histories stop startup without resetting data. Read [database and recovery](docs/database-recovery.md) before touching a real profile.

## Extend the starter

- [Architecture and dependency injection](docs/architecture.md): SOLID, scopes, transactions and data flow.
- [Add or remove a feature](docs/adding-a-feature.md): actual Settings files and an HTTP integration pattern.
- [Testing](docs/testing.md): suite boundaries, commands and safe desktop tests.
- [Database and recovery](docs/database-recovery.md): migrations, snapshots and restoration.
- [Verification evidence](docs/verification.md): local results and platform limits.

MIT license; see [LICENSE](LICENSE) for the retained copyright and permission notice.
