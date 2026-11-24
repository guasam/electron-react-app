# Testing Electron

Electron apps benefit from ordinary business tests plus a smaller suite launching the real desktop runtime. React tests alone cannot prove preload, native dependencies, profile behavior or packaged migration loading.

## Run locally

```sh
pnpm install --frozen-lockfile
pnpm run check
pnpm run check:native
pnpm run test:electron
pnpm run test:desktop
pnpm run build:unpack
pnpm run test:packaged
```

pnpm pins and provisions the Node 26 LTS development runtime. Electron ships its own runtime. The bundled better-sqlite3 Node-API binary runs under both; tests do not rebuild `node_modules` back and forth. Installation downloads Electron automatically. `pnpm run check:native` runs a real query with `ELECTRON_RUN_AS_NODE=1`; `pnpm run test:electron` runs the fast suite under that runtime. Linux needs desktop system libraries before executing Electron (CI installs them before native/desktop checks). The builder's native rebuild remains disabled because SQLite 13 already bundles binaries; review build permissions and packaging when adding native dependencies.

Use `pnpm run test:watch` for business development or `pnpm test tests/integration/settings-repository.test.ts` for one file. Production migrations are shared by startup and real-database tests.

## Suite boundaries

| Suite                                           | Evidence                                                                                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/unit`                                    | Rules, clock, DTO selection, scopes, shutdown, caller policy, chooser cancellation                                                                    |
| `tests/integration/database.test.ts`            | Creation/reopen, upgrades, rollback, recovery restoration/failure, history refusal                                                                    |
| `tests/integration/settings-repository.test.ts` | Persistence, key-ordered pagination, CAS writes, batch rollback, busy writer                                                                          |
| `tests/integration/archives.test.ts`            | Files, UTF-8/row bounds, cancellation, atomic merge, protected junctions, replacement preservation                                                    |
| `tests/react`                                   | Accessible editor validation, preserved conflict drafts and explicit reload                                                                           |
| `tests/architecture.test.ts`                    | Import direction and provider-only container resolution                                                                                               |
| `tests/desktop`                                 | Real renderer/preload/IPC/SQLite, CRUD/restart, two windows, archives, hostile callers, safe errors, profile lock/isolation and quit during selection |
| `scripts/packaged-smoke.mjs`                    | Actual package, unrelated cwd, isolated profile, native/migration loading and full restart persistence                                                |

Business tests replace repository ports. Integration tests use actual SQLite/files. Desktop archive tests replace only native chooser results, keeping files, parsing, transactions and UI real. Security tests deliberately create hostile test windows; production windows retain sandboxing, context isolation and no Node integration.

Conveyor `createCaller` bypasses router-global middleware in this version. It cannot prove ingress authorization; retain real-bridge tests. Main imports `ConveyorError` from `/main` to match the dispatcher's CommonJS class identity; the conflict desktop test protects this behavior.

Every test owns unique temporary directories, verifies its profile, closes apps/connections and removes only its own data. Never use a normal profile or live external service. Desktop failure traces under `test-results` may contain synthetic test content.

## Platforms and CI

CI runs types, lint, formatting, fast suites and production audit. A Windows/macOS/Linux matrix builds an unpacked app, runs desktop tests and launches that package from an unrelated cwd. Linux installs desktop system libraries and uses `xvfb-run`; a developer Linux session needs equivalent libraries/display. Electron tests require no separate browser download.

`PACKAGED_APP_PATH` selects an unpacked executable after downstream renaming; otherwise smoke testing recognizes this template's builder output. `STARTER_PROFILE_DIRECTORY` isolates data. `SMOKE_SCREENSHOT_PATH` optionally records a package screenshot.

Playwright requires the Node CLI inspector fuse. This starter does not change release fuses for tests. If a release disables it, use another external smoke driver against the unchanged release executable. Unpacked smoke results do not prove signing, notarization, installer/update behavior or store approval.

Actual local results and unexecuted platform checks are recorded in [verification.md](verification.md). Configured CI is not evidence of a completed run.
