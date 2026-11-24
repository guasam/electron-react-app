# Architecture

The composition root in `lib/main/bootstrap/container.ts` connects explicit Awilix factories. Business services receive interfaces through their constructors, without knowledge of Awilix. Tests construct them directly. This is the same dependency injection principle used in Python; TypeScript's erased interfaces mean registration happens explicitly at runtime.

## Dependency direction and SOLID

`modules/<feature>/domain` owns entities, invariants and repository interfaces. `application` coordinates actions using those interfaces. `infrastructure` implements them with Drizzle, filesystem APIs or a remote client. `contracts` owns portable IPC/file values. `providers.ts` wires the module; handlers live under `conveyor/modules`; React lives under `app/features`.

- **Single responsibility:** domain rules normalize drafts; services coordinate actions; adapters persist/exchange data; handlers validate/map transport; views manage interaction.
- **Open/closed:** add modules/providers or repository implementations through composition. Services do not select adapters or discover modules dynamically.
- **Liskov substitution:** repositories preserve ordering, cursors, atomic writes, conflicts, missing records and safe failures. A fake that overwrites stale versions is not a valid substitute.
- **Interface segregation:** `SettingsRepository`, `SettingsArchiveRepository`, `Clock`, `IdGenerator` and the chooser describe distinct needs. There is no generic base repository promising unsupported operations.
- **Dependency inversion:** application services depend on feature-owned ports; infrastructure implements them and is chosen at the outer composition root.

`tests/architecture.test.ts` checks imports, including type-only, relative, dynamic and require imports, and rejects container resolution outside assembly. This is a maintainability guard, not a sandbox for hostile source code. Extend its rules as the module vocabulary grows.

## A create operation

1. `SettingEditor` validates for immediate feedback; `use-settings.ts` sends a typed command through Conveyor.
2. The sandboxed preload permits registered commands/queries and events. Main independently verifies a tracked application window, its top frame and exact document URL. Renderer checks never grant authority.
3. Strict Zod schemas reject malformed transport. Domain normalization repeats business invariants so non-IPC callers remain safe.
4. `BusinessHost.run` creates an operation scope bound to the caller and cancellation signal. The handler delegates to `SettingsService`.
5. The service uses the repository, clock and generation ID port; `DrizzleSettingsRepository` performs the write.
6. After commit, main emits invalidation to eligible live windows. A closed recipient cannot turn the committed command into a failure. The handler selects DTO fields explicitly.
7. Every window invalidates all Settings list variants, including all cursors. The editor retains its own draft/version until save or explicit reload.

Business IPC carries JSON-safe values. ORM rows, file paths, handles, containers, Electron events and native objects do not cross it. Archives use pathless commands; main owns native selection.

## Lifetimes and cleanup

| Dependency                                         | Lifetime        | Owner              |
| -------------------------------------------------- | --------------- | ------------------ |
| SQLite connection and root container               | Application     | Bootstrap          |
| Clock, generation IDs, Drizzle Settings repository | Singleton       | Root registrations |
| Settings and archive services                      | Operation scope | Operation runner   |
| Chooser, signal, file archive repository           | Operation scope | Caller-bound scope |

`registerSettings` uses explicit factory parameters and strict Awilix lifetime checks. Resolve only during assembly. Do not pass `container.cradle` into application code or inject the container itself. Singletons must not capture scoped dependencies. Register disposal for new resources with their owning lifetime; services do not close shared resources.

Closing a caller aborts chooser/file work before a new import commit. Quit stops admission, aborts choices, waits for startup/in-flight work and cleanup, then closes SQLite. A completed synchronous transaction remains committed. On macOS, closing the last window keeps resources alive; activation reopens a window until the user quits.

## Consistency and bounded work

Updates/deletes carry an expected version and generation token. SQLite matches key, generation and version in the write; updates increment the version atomically. Missing-versus-stale classification stays inside the same immediate transaction. A service-side read followed by an unconditional write cannot provide that guarantee.

The settings table uses unique natural keys and text values. Duplicate creates return `ALREADY_EXISTS`. Keys are immutable, ordered ascending for pagination. Archive import validates unique keys first, then atomically merges values, preserving existing creation times and incrementing existing versions. It does not append duplicate rows. Settings are plaintext application configuration; secrets belong behind an OS credential-store port. The shell theme remains a separate local UI preference.

The synchronous driver runs in main behind Promise-returning ports. Lists use indexed keyset pagination, maximum 100 rows plus one lookahead. Imports are capped at 1,000 records/5 MiB, validated before one transaction. A 100 ms busy timeout maps contention to `STORAGE_BUSY`; commands do not automatically retry. These limits control the example's work, not arbitrary query execution time.

Keep network, dialogs and file reads outside SQLite transactions. Never use async callbacks in synchronous Drizzle transactions. For an action that atomically changes multiple aggregates, define an application-owned transaction port, for example `PlaceOrderTransaction.execute(order, allocations)`. Its adapter uses one shared database transaction. Independently committing repositories cannot supply that guarantee.

For expensive imports, reports or CPU work, implement the asynchronous port in a worker with backpressure/cancellation. Increasing a synchronous timeout does not keep the UI responsive.

## Errors and integrations

`AppError` carries intentionally public code/message/optional field. Unexpected exceptions are logged in main and become generic `INTERNAL_ERROR`. Never include raw SQL, provider errors or file paths in public messages. The main dispatcher imports `ConveyorError` from `electron-conveyor/main`, matching its CommonJS class identity. Importing from `/define` can lose public codes in this version.

The archive adapter demonstrates an external boundary: its repository describes read/write behavior, while infrastructure owns native selection, bounded UTF-8 reads and safe replacement. Application code interprets only the portable versioned archive format. An HTTP adapter follows the same direction; see the feature guide.

There is no automatic provider discovery, generic unit of work, business service locator or live remote provider. Add facilities when a business use case requires them, with explicit contracts and ownership.
