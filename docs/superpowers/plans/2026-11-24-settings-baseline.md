# Settings baseline correction

The user replaces the unreleased Tasks example with a settings table. This instruction amends the approved architecture; Awilix, repository ports, guarded IPC, lifecycle, migration safeguards and complete tested flows remain.

Implementation choice: application settings are unique, trimmed keys (1-100 ASCII letters/digits/dots/underscores/hyphens) with string values (up to 5,000 characters), timestamps and an integer version. This is an extensible configuration store, separate from the existing shell's local theme preference. Updates/deletes atomically check a generation token and expected version; keys are immutable. Duplicate creates return ALREADY_EXISTS.

Archives contain version 1 and settings key/value pairs. Import validates every row and rejects duplicate keys before one atomic merge: existing values are replaced, their creation timestamps preserved and versions incremented. Reimport does not duplicate settings. Cancellation, protected destinations and byte/row limits remain.

The initial migration is untracked/unreleased, so regenerate it as 0000_initial_settings; never create a Tasks table. Do not mutate existing trial profiles: their old migration hash remains incompatible and a fresh isolated profile is required. Released downstream migrations must still remain immutable.

- [x] Add failing baseline/domain/repository tests; implement Settings domain, services, Drizzle schema/repository; generate the initial migration.
- [x] Adapt archives, explicit providers, IPC and the native chooser; retain scoped cancellation and safe DTO/error selection.
- [x] Replace the Tasks UI with complete Settings CRUD, keyset pagination, conflict recovery and import/export; adapt real desktop/package tests.
- [x] Update guides, test setup explanation and verification evidence; run checks, native/desktop/package verification and final independent review.

Do not commit, merge, push, reset user data, or edit unrelated working tree content. Record decisions and actual platform evidence.
