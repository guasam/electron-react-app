# Adding a feature

Use Settings as an executable example. Keep business code in a named module, such as `modules/customers`, with React interaction in `app/features/customers`. Start with a small action exercised through the entire app.

## Trace Settings

| Step         | Reference                                                                     | Responsibility                                     |
| ------------ | ----------------------------------------------------------------------------- | -------------------------------------------------- |
| Model        | `modules/settings/domain/setting.ts`                                          | Business values/rules independent of UI/database   |
| Ports        | `modules/settings/domain/repositories.ts`                                     | Required repository behavior and consistency       |
| Application  | `modules/settings/application/settings.ts`                                    | Constructor-injected actions                       |
| Persistence  | `modules/settings/infrastructure/schema.ts`, `drizzle-settings-repository.ts` | Rows, constraints, indexes and transactions        |
| DTOs         | `modules/settings/contracts/settings.ts`                                      | Strict input schemas and selected output fields    |
| Composition  | `modules/settings/providers.ts`, `lib/main/bootstrap/container.ts`            | Explicit factories, lifetimes and scoped exposure  |
| IPC          | `conveyor/modules/settings.ts`, `conveyor/router.ts`                          | Guarded delegation to actions                      |
| Renderer     | `app/features/settings/`                                                      | Hooks, states, drafts and invalidation             |
| Verification | `tests/`                                                                      | Rules, real adapters, ingress and desktop behavior |

## Build the slice

1. Write business tests with controlled clock and a contract-respecting in-memory repository. Define normalization, conflict/missing behavior and atomicity. Avoid generic CRUD superclasses.
2. Implement the real adapter with temporary-database/filesystem integration tests. Methods return promises even when their current implementation is synchronous. Map external representations inside the adapter.
3. Add explicit Awilix factories and extend the root dependency types/service exposure for your module. Register once; resolve only in bootstrap/providers. Use operation scopes for caller-specific state and explicit constructor arguments for services.
4. Add portable strict schemas and DTO mappers. Domain rules do not import IPC schemas. File formats may have separate schemas as Settings archives do. Never accept arbitrary paths, SQL, credentials or container keys from the renderer.
5. Register the Conveyor module and use `ctx.business.run(...)`. The shared boundary applies authorization/safe errors. The preload derives allowed names from the manifest; do not widen it to raw IPC. Emit invalidation after commit; notification failure must preserve success.
6. Add hooks/views and route them from `app/app.tsx`. Show loading, empty, pending, validation, success and recoverable errors. Disable command retries. Preserve versioned drafts on refresh/conflict; require explicit reload.
7. Run `pnpm run check`, `pnpm run test:desktop`, `pnpm run build:unpack` and `pnpm run test:packaged`. Review consumers, shared resources, migration history, cache keys and new boundary rules.

For natural keys that can be deleted and recreated, include an immutable generation token alongside the integer version in update/delete predicates. A version that restarts at 1 alone cannot detect a stale draft for a previous row. Settings keeps its draft generation until explicit reload.

## Schema changes

Import the new module schema into the shared schema object in `lib/main/infrastructure/database/database.ts`. Extend `drizzle.config.ts` to include every module schema file, for example with a glob, then run `pnpm run db:generate`.

Review and commit generated SQL, journal and snapshot metadata together. Test real-row upgrades, fresh creation, failure rollback and snapshot restoration. Startup applies migrations before business IPC. Studio is for development inspection: set an absolute `STARTER_DATABASE_PATH`, close the app, and select an isolated development DB.

Do not edit SQL or timestamps released to profiles. Startup compares hashes/timestamps to the packaged prefix and refuses incompatible/newer histories. See the recovery guide.

## An HTTP repository

Define a feature-owned port in business terms, for example `CustomerDirectory.findByEmail(email): Promise<Customer | null>`. Implement `HttpCustomerDirectory` in infrastructure. Inject validated main-process configuration and a small HTTP client; application services do not read environment variables or call `fetch`.

The adapter owns authentication, bounded timeout/abort policy, response size limits, runtime response validation, provider-to-domain mapping and safe failures. A 404 may become `null`; rate limiting/unavailability need explicit codes. Do not retry a non-idempotent action without an idempotency contract. Register client/repository lifetimes and connection disposal. Credentials remain in main, outside DTOs/logs.

Test against a local controlled HTTP server for timeouts, malformed responses, missing results and provider failures. Test business decisions with a fake of the same port. A desktop test should substitute only the external boundary. This starter requires no live provider or credentials.

## Remove the example

The Stack tour is independent: remove its navigation/render branch and `Welcome` import from `app/app.tsx`, then unused `app/components/welcome` files.

To remove Settings, remove its view/hooks/navigation; its Conveyor module/registration and notifications; `registerSettings`, Setting dependency/service exposure and chooser registrations; then unused domain/application/contracts/adapters/tests. Keep the database lifecycle, guarded router/preload and operation runner, adapting host dependency types to your module. Remove the archive-only native chooser if unused. Run TypeScript and architecture checks to find consumers.

**Fresh unpublished clone with no profiles/releases:** you may intentionally establish a new baseline. Remove the example schema and generated baseline/history together, configure your module schemas, and generate a new initial migration. Delete only explicitly disposable development profiles you own after checking their resolved path. Never distribute the changed baseline to users of the original one.

**Application with existing profiles:** preserve released SQL/journal entries byte-for-byte. Remove the active Setting schema from Drizzle inputs and generate/review a new forward migration that drops its table. Keep all prior migrations/metadata packaged. Test upgrades with old data and recovery snapshots. Removing a module does not authorize deleting migration history; data deletion is a downstream product decision.
