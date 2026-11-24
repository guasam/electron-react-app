> Superseded for the reference feature by [the 2026-11-24 Settings correction](2026-11-24-settings-baseline.md). This record describes the original implementation; current initial schema and end-to-end flow use Settings.

# Electron Business Starter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver a clone-ready Electron business starter with Awilix, Drizzle/SQLite, complete Tasks/archive flows, and automated verification.

**Architecture:** Feature-owned domain, application, infrastructure, and portable contracts. Explicit Awilix factories assemble constructor-injected services in main; a guarded Conveyor adapter carries DTOs to React. SQLite and filesystem implementations sit behind repository ports.

**Tech Stack:** Existing Electron/React/Vite/TypeScript/Conveyor/Zod/TanStack Query; Awilix; stable Drizzle and better-sqlite3; Vitest/Testing Library; Playwright.

**Spec:** `docs/superpowers/specs/2026-11-20-electron-business-starter-design.md`

## Global Constraints

- Work in the existing `feat/business-architecture` checkout; do not push or publish.
- No domain dependencies on React, Electron, Conveyor, Awilix, Zod, Drizzle, or Node I/O.
- Domain repositories return promises; synchronous database transactions stay within adapters.
- Title: trimmed, required, maximum 200 characters; description: maximum 5,000 characters.
- Pagination: keyset `(createdAt,id)`, default 25, maximum 100, fetch at most limit plus one.
- Archives: maximum 1,000 records and 5 MiB, symmetric import/export, append with fresh IDs/times.
- SQLite: foreign keys, WAL, synchronous FULL, busy timeout 100 ms; version-checked writes.
- Packaged entry: `app://starter/index.html`; validated main-frame callers; pathless archive IPC.
- Preserve released migrations; read-only history preflight; consistent snapshots before existing-profile upgrades.
- Verify current runtime/native compatibility before claiming success; distinguish Windows evidence from CI OS jobs.

## Review Focus

- A stale editor must retain its draft after cross-window invalidation; test in Task 4/6.
- A selected symlink/junction must not overwrite profile database files; test in Task 5.
- An unexpected setup/disposal exception must not leak paths or reverse a committed command; test in Task 3.
- A newer/divergent migration history must be refused without application writes; test in Task 1.
- Launching from an unrelated working directory must find packaged migrations/native modules; test in Task 6.

## Files and interfaces

- `shared/domain/errors.ts`: stable application errors; `shared/domain/ports.ts`: Clock and IdGenerator.
- `modules/tasks/domain/{task,repositories}.ts`: Task/TaskDraft and TaskRepository.
- `modules/tasks/application/{tasks,archives}.ts`: constructor-injected action services.
- `modules/tasks/contracts/tasks.ts`: portable schemas, DTOs, and explicit mappers.
- `modules/tasks/infrastructure/{schema,drizzle-task-repository,file-task-archive-repository}.ts`.
- `modules/tasks/providers.ts`: module factories, no service-locator usage in business code.
- `lib/main/infrastructure/database/{database,migrations}.ts`, `drizzle.config.ts`, `drizzle/`.
- `lib/main/bootstrap/{container,operations,lifecycle}.ts`: assembly, scopes, shutdown.
- `lib/main/{app,main,protocols,sender-policy}.ts`: guarded desktop runtime.
- `conveyor/{init,router,modules/tasks,modules/window,modules/web}.ts` and `lib/preload/preload.ts`.
- `app/features/tasks/{tasks-page,task-editor,use-tasks}.tsx/ts`; `app/app.tsx`.
- `tests/{unit,integration,react,desktop}/`, `scripts/`, Vitest/Playwright configuration.
- README, architecture/feature guides, CI, packaging, aliases, and pnpm commands.

### Task 1: Executable SQLite foundation

**Interfaces:** `openDatabase({ filename, migrationsFolder }): Promise<DatabaseResource>` exposes a typed Drizzle client and `close()`. TaskRepository supports `list`, `get`, `create`, `update`, `delete`, and atomic `createMany`.

- [x] Install compatible dependencies and establish Electron-hosted native tests/tooling; verify existing checks.
- [x] Write failing real-database tests for persistence, known-history upgrade/refusal, rollback, snapshots, CAS update/delete, busy errors, and keyset pagination.
- [x] Implement domain models/errors/ports, Drizzle schema, generated migration, database resource and repository.
- [x] Run `pnpm test tests/integration/database.test.ts tests/integration/task-repository.test.ts`; expected: all pass using isolated temporary files.
- [x] Verify native loading with the actual Electron runtime and compile the app.

### Task 2: Application services and module assembly

**Consumes:** TaskRepository, Clock, IdGenerator.
**Produces:** `TasksService` with `list`, `get`, `create`, `update`, `delete`; `registerTasks(container)` explicit factories; portable input/DTO contracts.

- [x] Write failing tests: invalid domain inputs reject without writes; timestamps/IDs are injected; expected version flows to CAS; mapper omits extra fields; separate scopes get independent operation state.
- [x] Implement small application actions, schema/DTO mapping, and Awilix factory registrations.
- [x] Run unit/application/provider tests; expected: domain rules and replacement contracts pass.

### Task 3: Guarded Electron bootstrap and IPC

**Consumes:** database resource and module providers.
**Produces:** explicit `registerRouter`, operation runner, guarded minimal bridge, profile lifecycle, safe static protocols.

- [x] Write failing tests for main-frame/document policy, safe error mapping, scope cleanup, shutdown admission, and committed-operation notification failure.
- [x] Implement profile selection/lock before database access; read-only compatibility then startup; single registration; controlled shutdown; secure custom app protocol; scoped service resolution.
- [x] Apply sender policy to shell and Tasks, allowlist bridge channels, and disable unused stream/store entry points.
- [x] Run unit/security/operation tests and `pnpm run typecheck`; expected: pass with no exposed container/native objects.
- [x] Launch a built real app and prove create/list through its preload/IPC path before extending the UI.

### Task 4: Complete React Tasks workflow

**Consumes:** typed Tasks IPC DTOs, change events, TanStack Query.
**Produces:** Tasks default view, accessible editor, CRUD/status/filter/cursor navigation, stack-tour navigation, and second-window affordance.

- [x] Write failing component tests for validation, pending/error/empty behavior, preserved stale drafts, and delete confirmation.
- [x] Implement hooks and components using existing theme/UI primitives; invalidate all list variants after committed changes.
- [x] Run component tests and desktop CRUD/restart/cross-window tests; expected: saved data survives a full quit and stale edits do not overwrite.

### Task 5: Pathless archive integration

**Consumes:** TaskRepository, Clock/IdGenerator, caller-bound chooser, cancellation signal.
**Produces:** TaskArchiveRepository, import/export services, file adapter, IPC/UI actions.

- [x] Write failing tests for exact/one-over UTF-8 and row limits, malformed/nonregular files, fresh IDs on reimport, cancellation after caller close, batch rollback, protected destinations, and failed replacement preservation.
- [x] Implement bounded file-handle reads and exclusive same-directory temporary replacement; never delete an existing target as fallback.
- [x] Add native chooser adapter in providers and pathless IPC/UI actions.
- [x] Run archive integration and desktop round-trip/cancellation tests; expected: real files and SQLite work with chooser-only substitution.

### Task 6: Release evidence and next-feature documentation

**Consumes:** complete runtime flows and tests.
**Produces:** architecture guards, repeatable pnpm commands, OS CI smoke jobs, packaged-app tests, feature/removal/recovery guides.

- [x] Add failing boundary tests for forbidden imports/container resolution, real-bridge rejection, injected error privacy, and independent profile behavior.
- [x] Implement architecture guards, runtime failure fixtures, packaging asset/native configuration, and CI packaged persistence smoke for Windows/macOS/Linux.
- [x] Run fresh install/checks/unit/integration/React/desktop suites; build and smoke-test the Windows package from another cwd.
- [x] Write README/architecture/adding-feature/testing/recovery guidance against actual commands. Preserve released migrations in the removal guide.
- [x] Run formatting, lint, typecheck, production build, audit, and final source review; fix material findings with regression tests.
- [x] Record actual evidence, remaining platform checks, and repository state. Do not push or publish.

## Execution record

The user's “Go ahead” approves implementation of the revised design. Execute inline without another approval round. Progress and verification evidence are tracked in `.superpowers/sdd/2026-11-20-electron-business-starter/progress.md`. Keep commits limited to this feature and only after checks pass.
