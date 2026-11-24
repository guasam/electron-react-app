> Amended 2026-11-24: the user replaced the unreleased Tasks baseline with Settings. See [the correction plan](../plans/2026-11-24-settings-baseline.md). The original reference-feature model below is historical; current domain, schema, contracts, UI and archives use key/value Settings with atomic merge imports. Architecture and lifecycle requirements remain applicable.

# Electron business starter design

Date: 2026-11-20
Status: revised after external design review; application implementation has not started.

## Intent and confirmed requirements

Extend this Electron/React/TypeScript starter so a developer can clone it and start implementing business features using complete, working examples. Clean code, SOLID principles, maintainability, and the ability to grow the application are primary requirements.

Confirmed choices:

- Keep the existing Electron, React, Tailwind, TypeScript, Conveyor, Zod, and TanStack Query foundation.
- Add Drizzle ORM with a local SQLite database.
- Access persistence and external systems through small interfaces with replaceable implementations.
- Use dependency injection with Awilix. The user selected Awilix after discussing explicit factories and decorator-based containers.
- Establish defined contracts between domain, application, infrastructure, IPC, and React.
- Include an automated test suite and CI checks.
- Use the user's AvangPy ecosystem and FastAPI starter as architectural references: modules, service constructors, provider registration, and explicit infrastructure boundaries.

The implementation choices below are proposals by the builder, including Tasks as the reference feature. They are not additional user requirements.

## Goals and limits

Deliver a working local business feature, tested persistence, an external file integration, and documentation that explains how to add the next module. Preserve the existing window shell and stack tour, with the Tasks feature as the default app view and the tour still accessible.

This iteration does not add accounts, authentication, cloud sync, a remote backend, an update service, or a general plugin platform. It does not copy Python inheritance, reflection, or package structure mechanically. Do not introduce generic base repositories, a custom DI framework, or abstractions without a demonstrated consumer.

Scalability here primarily means adding modules, adapters, and tests without increasing coupling. Small synchronous SQLite operations are acceptable for this local starter. Expensive queries, bulk processing, and CPU-heavy work must not grow into unbounded work on the main-process event loop; the guide will explain when to introduce a worker behind a port.

## Fresh-clone and next-feature acceptance

The fresh-clone acceptance criterion is a developer following the README from a clean checkout, using its documented Node/native prerequisites, and launching into Tasks with a fresh profile. First launch creates and migrates the database automatically. The developer must be able to create, edit, complete, reopen, filter, paginate, and delete; quit and relaunch; recover from a two-window conflict; and export/reimport, cancel, and recover from a file failure through the UI. This path uses the actual providers, preload, IPC, repositories, and file adapter.

The adding-a-feature guide must identify the exact files to change for a module's contracts, provider registration, IPC registration, hooks, and first screen. A developer must be able to trace a tested mutation from UI to persistence using that guide. Implementation should begin with one create/list vertical slice and a packaged persistence smoke test before completing the remaining workflows; this is execution order, not reduced delivery scope.

## Approaches considered

1. Manual provider functions: explicit and easy to trace, but lifetime management and repeated assembly become application-maintained conventions as modules grow.
2. Awilix with explicit factories: centralized module registration, managed lifetimes and disposal, and ordinary constructors without decorator metadata. Selected by the user.
3. Decorator-driven injection: convenient automatic construction, with extra metadata and compiler requirements. Not selected.

Awilix is the assembly mechanism. Business code receives dependencies, not the container or its global cradle. No module glob discovery, constructor-name inference, or business-layer calls to `container.resolve()`.

## Project boundaries

Proposed layout:

```text
modules/
  tasks/
    domain/                  # Task model, invariants, repository contracts
    application/             # Use cases, application inputs/results, archive workflow
    infrastructure/          # Drizzle repository and JSON-file repository
    contracts/               # Feature-owned portable IPC/archive schemas and DTOs
    providers.ts             # Explicit factories for this module
shared/
  domain/                    # Small framework-free shared errors and ports
  contracts/                 # Shared transport primitives and public error contracts only
lib/main/
  bootstrap/                 # Root container, startup, shutdown, provider registration
  infrastructure/database/   # SQLite connection, Drizzle schema, migrations
conveyor/
  modules/tasks.ts           # Thin IPC adapter
  router.ts                  # Explicit router registration and exported router type
app/features/tasks/          # Components and renderer hooks
drizzle/                     # Generated SQL migrations and snapshots
tests/                       # Shared fixtures, integration, architecture, desktop tests
```

Keep focused unit tests beside the code they exercise where practical. Existing shell, preload, and UI primitives remain in their current locations. A business module owns its invariants, use cases, ports, adapters, database table definitions, and portable transport schemas. Shared infrastructure owns connection/migration setup, sender policy, error handling, and other facilities with actual cross-module or shell consumers. A module's portable contract entry point cannot re-export its services or infrastructure.

Dependency rules:

- Domain imports no React, Electron, Conveyor, Awilix, Zod, Drizzle, or Node I/O APIs.
- Application imports domain and its own framework-independent application inputs/results, never IPC schemas, infrastructure, or transport implementations. Portable archive parsing can live at the application boundary while domain invariants remain independently enforceable.
- Infrastructure implements inward-facing contracts and maps database rows or external representations into application/domain values.
- IPC imports application interfaces and portable transport schemas. It validates and maps; it does not contain business rules or SQL.
- Renderer imports feature-owned or shared portable contracts and the typed Conveyor client. It never imports main-process runtime modules, business services, or repository implementations.
- Providers and bootstrap are the places that know concrete implementations and resolve the container. A reusable operation runner in the assembly layer validates a caller, creates a scope, resolves a small service interface, invokes it, and disposes the scope. IPC handlers use that runner without receiving the container. Cross-module behavior uses public contracts rather than reaching into another module's infrastructure.
- Architecture checks enforce these rules, including relative imports and type imports that would couple domain/application to infrastructure. Renderer `import type` of the router is the intentional exception for Conveyor's inferred API.

## Awilix lifetimes and lifecycle

Use an explicitly typed root registration map, explicit factory registrations, and Awilix strict mode. Constructor dependencies remain small interfaces; do not make services accept the entire application dependency map.

- Application lifetime: configuration, SQLite connection, stateless infrastructure resources, and window registry. Register resource disposal explicitly.
- Operation lifetime: application services and any operation-specific state. Create and dispose an IPC-operation scope around each query or command, including failures.
- A native dialog's parent is derived from the validated calling window for that operation. Do not retain a window or request context in a singleton.
- Tests create their own container and replace registered ports. No process-global service locator or shared mutable test container.

Startup order is an explicit contract:

1. Select and create the profile directory, set Electron's `userData` path, and acquire its single-instance lock before any database access. Development uses a separate profile; automation explicitly supplies a unique temporary profile through main-process launch configuration, never renderer input. Register privileged custom schemes before Electron readiness.
2. Await Electron readiness, establish the approved document/origin policy and protocol handlers, and perform the existing database compatibility preflight in read-only mode.
3. Open the compatible writable SQLite connection, create any required recovery snapshot, and apply pending migrations.
4. Assemble providers, register the IPC router once, and create the first window.

Registration must be explicit, replacing the current circular import and router import side effects. A second process using the same profile exits or activates the existing instance before opening the database; independent temporary profiles can run concurrently. Verify Electron's profile-lock behavior with the supported executable identity on Windows.

If initialization or migration fails, release every resource acquired so far, show an actionable startup error, and exit cleanly; do not open an apparently working window with a broken backend. An incompatible profile directs the user to a compatible build. A failed upgrade points to the documented recovery procedure without automatically resetting or deleting data.

Normal quit stops admitting new business operations, cancels pending chooser work, cooperatively stops uncommitted asynchronous work, and waits for already-started file operations and database writes before disposing scopes and the root connection once. A committed write remains successful if its caller closes during notification or cleanup. Closing the last macOS window does not dispose the database while the application is still running; reopening creates a usable window with the existing root resources.

## Data flow and error contracts

The normal flow is React form -> renderer hook -> typed Conveyor call -> validated IPC input -> application service -> repository interface -> adapter -> SQLite or filesystem. Results return through an explicit DTO mapper and update TanStack Query caches.

Use Zod schemas for untrusted IPC input and imported JSON. Keep domain invariants in the domain model or domain operations so alternate callers cannot bypass them. Share inferred portable contract types rather than duplicating frontend/backend transport declarations.

Database row types stay in infrastructure. IPC returns plain structured-clone-compatible DTOs: string identifiers, ISO timestamp strings, numbers, booleans, arrays, and plain objects. Select DTO fields explicitly rather than spreading rows, entities, or exceptions. Do not expose driver objects, ORM entities, containers, or native handles. Use cases can use framework-independent domain objects internally. Conveyor's `returns` validation is a development check; field selection and public error mapping must operate in packaged builds as well.

Define stable error codes for invalid input, missing records, stale edits, invalid archives, unavailable/busy storage, and application shutdown. Expected failures become user-actionable transport errors with only allowlisted details, such as a field name or conflict status. Log unexpected internal failures in main and return a generic public error without SQL, filesystem paths, or stack traces. Conveyor's fallback includes exception messages, so application-owned error handling must sanitize failures before they reach that fallback, including context construction, resource setup, and operation cleanup. Disable mutation retries by default to avoid repeating side effects.

The renderer is untrusted even when the window is tracked. Its authority is limited to registered Tasks/archive operations and legitimate shell commands. Validate the invoking `webContents`, its current top-level `senderFrame`, and approved app document before resolving services or opening a chooser. Apply this to shell procedures and every privileged bridge entry point, not just Tasks. Notifications go only to still-eligible app windows.

Define document identity explicitly: development permits the exact `ELECTRON_RENDERER_URL` origin and renderer entry document selected at launch, with URL hashes allowed for app views; it does not allow arbitrary loopback hosts, ports, or paths. Packaged builds use a standard, secure custom scheme with the fixed entry `app://starter/index.html`, rather than trusting a `file:` or opaque `null` origin. Asset requests are confined to packaged renderer/static resource roots using canonical containment checks; the `res:` handler must never serve profile files. Reject unapproved navigation and popups, keep Node integration disabled and sandboxing/context isolation explicitly enabled, and retain a restrictive production CSP. External links use main-process URL validation before reaching the OS.

The app-owned preload bridge retains Conveyor's compatible client shape but allowlists registered procedure channels/methods and subscription channels. Do not expose raw Electron events, arbitrary channel forwarding, filesystem APIs, or container resolution. Archive procedures accept no renderer-supplied paths; the main-process adapter uses the chooser's result directly. Window commands act on the validated caller.

The published Conveyor 0.4.1 preload helper forwards arbitrary channel names, and its router middleware does not guard the manifest/store handlers. Implementation must inventory these entry points and guard or disable uncovered privileged handlers through an app-owned integration adapter. The manifest may expose public procedure metadata only, with no application data. This iteration registers no Conveyor stores or streams; unused stream invocation handlers should be disabled. Do not assume router-global middleware covers the entire bridge.

## SQLite and migrations

Proposed driver: stable Drizzle ORM with `better-sqlite3`, subject to verifying compatibility with the installed Electron version during implementation. Do not silently replace the runtime with a prerelease driver. If a required dependency cannot run on the supported runtime, report the concrete incompatibility before changing the agreed stack.

Store the database beneath Electron's writable `userData` directory, never in the source tree or installation directory. Keep development and automated-test profiles isolated from normal application data. Tests must explicitly provide their own temporary profile.

Use generated, versioned SQL migrations, applied at startup with Drizzle's migrator. Package those migrations and resolve them independently of the working directory in both development and packaged builds. Released migrations are immutable. Each binary supports a defined migration history, and an existing database's recorded hashes/timestamps must form an exact recognized prefix of that history before enabling writes or applying migrations. Reject newer, divergent, missing, or otherwise unrecognized history in a populated database. Distinguish a new empty database from a populated profile without a migration ledger. This preflight runs read-only before changing journal settings or schema; an incompatible database receives no migrations or application writes.

The Drizzle 0.45.4 synchronous SQLite migrator applies pending statements and migration bookkeeping in one transaction, but creates its ledger table outside that transaction and selects only the latest recorded timestamp when deciding what to apply. Do not treat it as a compatibility validator. Keep application DDL/data and ledger entries consistent on failure, while tolerating a newly created empty ledger after a failed first migration. Test the pinned implementation with a failure after a migration statement has already executed, followed by a corrected migration build, and confirm rollback/recovery. A second startup must not replay completed migrations. Test real-data upgrades, unknown/newer histories, and unchanged data on refusal.

Before applying any pending migration to an existing initialized database, create a consistent SQLite recovery snapshot through the driver's backup API. A failed snapshot stops the upgrade. This conservative rule includes every data-rewriting or destructive migration without inferring safety from SQL text. Keep snapshots in a protected database recovery directory. Document restoration with all app instances closed, preserving the failed profile and its WAL/SHM files before replacing it and using a compatible binary. Never present a copied live main database file or the bounded Tasks JSON archive as a complete recovery backup.

Enable foreign keys, WAL journaling, `synchronous=FULL`, and a 100 ms busy timeout for ordinary business operations. Map lock-timeout exhaustion to `STORAGE_BUSY` with an explicit retry action; do not automatically replay writes. The timeout bounds lock waiting, not query execution. Use keyset pagination over creation time and identifier instead of unbounded offsets, with indexes for both all-task ordering and completion-filtered ordering. Fetch at most page size plus one to compute `hasMore`; do not add a full-table count to every page. Bound archive work to its existing record/byte limits. Close the connection through the root resource lifecycle. Document and test these limits; longer operations belong behind a worker port rather than a larger synchronous main-process wait.

Atomicity for the reference feature is expressed by repository operations: single-statement create/update/delete, and one transaction for batch import. The adapter owns the synchronous Drizzle transaction body. Never put an asynchronous callback into a synchronous SQLite transaction or hold a transaction open while awaiting a file dialog or network call.

A generic cross-repository unit of work is outside this example's needs. The extension guide must explain how an additional atomic workflow receives its own transaction port implemented over a shared database transaction, rather than assembling independently committing repositories. Database transaction details remain outside business services.

Ensure native dependency installation, rebuilding, externalization, and ASAR unpacking work for Electron. Database tests must use a matching native runtime; avoid leaving `node_modules` rebuilt for ordinary Node while the application expects Electron. Drizzle developer commands must follow the same runtime convention. Extend CI to verify native loading and packaged migrations.

## Complete reference feature: Tasks

Tasks are a proposed demonstration of architecture, not a product requirement. A task has a UUID, title, description, completion flag, creation/update timestamps, and an integer version.

Working behavior:

- Create a task; titles are trimmed, required, and bounded to 200 characters. Descriptions are bounded to 5,000 characters.
- List tasks with open/completed/all filtering and cursor-based next/previous navigation. Default page size is 25 and maximum is 100, with deterministic descending ordering by creation time and identifier. Validate cursor fields and reset navigation when changing filters.
- Edit title/description, complete or reopen, and delete. Updates and deletes carry an expected version and match both identifier and version in the SQL write. An update increments its version in that same statement. When a zero-row result needs a lookup to distinguish a missing task from a stale version, perform classification in the same synchronous write transaction so another connection cannot race it. Preserve a conflicting editor's draft and offer to load the current record; do not silently overwrite it during query refresh.
- Display initial loading, query failures with retry, empty results, form validation, pending mutation state, success feedback, and actionable mutation errors. Confirm deletion through an accessible UI interaction.
- After a successful commit, notify eligible live application windows so all affected task-query variants, including filters and cursors, are invalidated. Do not publish a change event before the database operation commits. Database commit is the mutation's success boundary: a closed recipient or failed notification is logged and cannot turn that committed mutation into a failed command or trigger a retry. Remove event subscriptions when windows/components close.
- The list is persisted across a full application restart, not only a renderer reload.

Use small services with explicit dependencies. Each service represents a business action; handlers delegate to it. Group private helpers where useful without creating one-line wrapper layers around every existing API.

## External integration: task archives

Demonstrate a second external boundary with a `TaskArchiveRepository` and a native filesystem implementation. File chooser behavior is injected behind a small port so archive behavior can be tested without automating operating-system dialogs.

- Export all tasks to one versioned JSON archive through a native save dialog when the collection fits the same 1,000-record and 5 MiB limits used by import. Check the record count and serialized UTF-8 byte length before opening or replacing a destination file; if either limit is exceeded, return a clear archive-limit error and leave existing files untouched. Read at most 1,001 records to detect a collection over the record limit. The archive contains title, description, and completion state; database identifiers and timestamps are not part of the portable format.
- Import through a native open dialog. Require a regular file, check the opened handle's metadata, and read at most 5 MiB plus one byte using bounded reads; a pre-open size check is only an early rejection and cannot enforce the cap by itself. Reject invalid versions, malformed records, more than 1,000 records, or content exceeding the byte limit. Test exact and one-over limits, including multibyte UTF-8. Use the same portable format validator for exported and imported payloads, then apply domain invariants to every record before starting the batch transaction.
- Import appends tasks with fresh identifiers, current timestamps, and their exported completion state. Reimporting intentionally creates another set; there is no hidden merge or overwrite behavior.
- Import is all-or-nothing. A cancelled dialog is an ordinary cancelled result and does not change the database or show an error. If the caller closes while its chooser is pending, discard the selection as cancelled before starting new file or database work. Recheck cancellation after asynchronous reads and before an import commit. Once committed, keep the result and notify remaining eligible windows.
- Export writes a temporary file created exclusively in the destination directory, closes it successfully, and replaces the target only using a supported same-filesystem replacement operation. Preserve an existing export on failure and remove temporary files. Never unlink the existing destination as a fallback. Reject targets resolving inside the dedicated database directory, which contains the database, WAL/SHM/journal files, and recovery snapshots; check canonical parent/target paths including symlinks and junctions. Keep this directory separate from general user exports. Surface write failures clearly and verify replacement and protected-path behavior on each supported OS. Document platform-specific limits and the distinction between safe replacement and durability across abrupt power loss.

Builder decision following design review: archive limits are symmetric. Every successfully exported archive must be accepted by the archive format validator on reimport. Larger collections can continue using normal paginated task operations, but full-database backups and partitioned/streaming archives are outside this example's scope. Document this limit beside the import/export actions and test both limit boundaries.

The feature guide will map the same pattern to HTTP-backed repositories/adapters: inject configuration and an HTTP client, validate responses, map external models, define timeouts and failure codes, and keep credentials and provider-specific details in main-process infrastructure. A live remote integration is outside this iteration.

## Test strategy and acceptance evidence

Use a small set of complementary suites, each targeting observable behavior:

1. Unit tests: domain invariants and application decisions using in-memory repositories and controlled clock/identifier dependencies. Include expected failures and cancelled archive selections.
2. Repository integration tests: real temporary SQLite databases, production migrations, persistence after closing/reopening, keyset pagination, atomic version conflicts and stale deletes, constraints, and rollback on a failing batch insert. Include busy-lock exhaustion, fresh creation, real-data upgrades, history refusal without writes, mid-migration rollback, corrected-build recovery, backup failure, and snapshot restoration. Share observable repository contract tests with the in-memory implementation where appropriate.
3. Archive integration tests: real temporary files, regular-file validation, exact/one-over byte and record limits, malformed/multibyte content, cancellation after the caller closes, successful append-on-reimport round trips, protected database/recovery destinations, and preservation of a previous export when replacement fails. Stub native chooser behavior only.
4. IPC tests: schema rejection, field-selected DTOs, safe error mapping with injected path/SQL/stack-bearing exceptions, sender checks for Tasks and shell, bridge channel allowlisting, and operation-scope disposal on success and failure. Use the real preload/bridge to prove an unregistered window and child frame are rejected before any repository or chooser runs. Conveyor 0.4.1 `createCaller` skips router-global middleware, so its results cannot establish ingress-policy coverage. Test the sender decision function directly as well.
5. React tests: accessible form submission, loading/error/empty states, and user-visible failure recovery. Use Vitest and React Testing Library rather than snapshotting the entire UI.
6. Desktop tests: Playwright launches real Electron with an isolated profile and uses the production renderer/preload/IPC/repository path. Cover CRUD, full quit/relaunch persistence, cross-window refresh/conflict with preserved drafts, stale delete versus missing record, and archive cancellation/round trip with native chooser results controlled at the OS boundary. Exercise same-profile exclusion, independent temporary profiles, cleanup after startup failure, graceful quit with work in progress, and macOS close-last-window/reopen behavior on that platform.
7. Architecture tests: verify import boundaries and provider-only container resolution. Keep TypeScript checking, linting, and formatting checks.

Each test owns its data and closes resources before cleanup. E2E tests must not use the developer's normal profile, live external services, or business-service replacements.

CI runs fast suites and checks on pull requests, with real Electron smoke tests on supported desktop OS runners. Linux desktop tests use a virtual display. The existing Windows/macOS/Linux build matrix must still package successfully. Every claimed supported OS requires a packaged-app smoke test launched from an unrelated working directory with an isolated profile: create a task, quit fully, relaunch, and verify persistence. This must prove native loading and packaged migration discovery; a Vite build alone is insufficient.

Playwright's Electron launcher requires the Node CLI inspector fuse to remain available. The current starter does not configure a fuse change; do not silently disable a release security setting to make tests pass. If release fuses later disable that inspector, select a compatible alternate smoke-test driver that exercises the unchanged release executable. Report platform-specific failures instead of substituting a differently configured package.

Verification reports must distinguish local evidence from CI configuration and unexecuted platform checks. Do not claim macOS or Linux runtime success from a Windows-only local run.

## Documentation and developer workflow

Update README quick start, commands, feature description, data location, test commands, and project structure. Add a durable architecture guide and an adding-a-feature walkthrough following the actual Tasks implementation from domain contract to UI.

Explain provider registration, supported dependency lifetimes, safe external I/O, transaction ownership, domain versus transport validation, error mapping, cache invalidation, and test replacement. Include migration generation/application, native dependency recovery, packaging resources, and how to remove the example while retaining the foundations.

The original welcome-screen removal instructions must be revised because the app will now contain an independently removable example feature and a stack-tour view. Distinguish a fresh unpublished clone, where the developer can intentionally establish a new migration baseline, from a downstream app with existing profiles, where released migration history must remain intact and schema removal requires a new forward migration and recovery snapshot. Document removal of Tasks UI, hooks, handlers, providers, and feature contracts while retaining the database/IPC foundations. Keep documentation aligned with actual scripts and runtime behavior.

## External review disposition and verification limits

The review at `C:/Users/User/Downloads/electron-business-starter-design-review.md` was evaluated against the starter and upstream source. Its seven areas are incorporated: fresh-clone/module workflow; IPC authority and DTO/error mapping; migration compatibility/recovery; bounded archives and safe replacement; atomic concurrency and refresh; profile startup/shutdown; and packaged testing/removal guidance.

Source checks used the published `electron-conveyor@0.4.1` and `drizzle-orm@0.45.4` package artifacts, without installing dependencies. They confirmed the middleware, preload, fallback-error, and migrator behaviors described above. Recheck these guarantees against the versions actually pinned for implementation. Native ABI compatibility, filesystem replacement, migration rollback, and platform smoke tests are acceptance work, not results established by this design review.

The migration transaction covers all pending migrations in the checked Drizzle version, rather than necessarily committing each one individually. The design requires atomic application changes and bookkeeping, plus explicit handling of the ledger creation outside that transaction. Recovery uses SQLite snapshots and does not expand the bounded task archive into a database-backup product.

## Decisions left to implementation

- File names beneath the stated boundaries and private helper organization.
- Exact compatible dependency versions, lockfile updates, and test-runner invocation after runtime verification.
- UI composition using the existing UI primitives and theme; retain the current visual language.
- Concrete module registration and IPC scope plumbing, provided services remain constructor-injected and scopes are disposed reliably.
- The smallest reliable CI matrix that provides the stated behavioral and packaged-app evidence without duplicating every test on every OS.

Any change to the selected container, SQLite requirement, process boundaries, or removal of a complete flow requires revisiting the design with the user.

## References

- Local architecture references: `D:/vs-projects/avangpy ecosystem/avangpy-base/avangpy_base/infrastructure/setup_app.py`, `D:/vs-projects/avangpy-fastapi-starter/src/app/bootstrap/dependencies.py`, and `src/app/modules/items` in that starter. These were inspected read-only; no Python project changes are in scope.
- [Awilix: registration, scopes, strict mode, and disposal](https://github.com/jeffijoe/awilix)
- [Drizzle migration workflows](https://orm.drizzle.team/docs/migrations)
- [Electron native module requirements](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)
- [Electron automated testing](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)
- [Conveyor 0.4.1 published artifact inspected for bridge, dispatch, and caller behavior](https://registry.npmjs.org/electron-conveyor/-/electron-conveyor-0.4.1.tgz)
- [Drizzle 0.45.4 SQLite migrator implementation](https://github.com/drizzle-team/drizzle-orm/blob/0.45.4/drizzle-orm/src/sqlite-core/dialect.ts)
- [Electron profile-scoped instance locking](https://www.electronjs.org/docs/latest/api/app#apprequestsingleinstancelockadditionaldata)
- [SQLite consistent backup snapshots](https://www.sqlite.org/backup.html) and [WAL behavior](https://sqlite.org/wal.html)
- [Node file-handle bounded reads](https://nodejs.org/api/fs.html#filehandlereadbuffer-offset-length-position)
- [Playwright Electron support and inspector fuse requirement](https://playwright.dev/docs/api/class-electron)
