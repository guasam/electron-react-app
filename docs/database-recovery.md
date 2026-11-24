# Database lifecycle and recovery

Only main opens `<userData>/database/app.sqlite`. Its directory contains WAL/SHM files and `recovery/` snapshots and is protected from archive export destinations, including canonical symlink/junction targets. Development uses a separate `-development` profile; tests choose owned absolute profiles.

## Initial baseline

`0000_initial_settings.sql` creates Settings only. The previous example baseline was unreleased and has been replaced at the user's request. Existing trial profiles are not reset, converted or deleted; use a fresh isolated profile. Never perform this baseline replacement for an application already released to users.

## Migrations

Change module schemas and run `pnpm run db:generate`. Review generated SQL, `drizzle/meta/_journal.json` and schema snapshots together. Do not use schema push against user profiles or mutate released SQL/journal entries.

Startup reads packaged migrations and opens existing nonempty databases read-only to compare applied hashes/timestamps to the exact known prefix. Populated databases without recognized history, divergent histories and newer schemas are refused. No automatic reset/downgrade occurs. Drizzle creates its ledger outside the migration transaction, so an empty ledger may remain after a failed initial attempt; application statements and history entries still roll back together.

Before an initialized database receives pending migrations, the driver's backup API creates a consistent recovery snapshot. Snapshot failure stops the upgrade. All pending migrations and bookkeeping run in one synchronous transaction in this pinned Drizzle version. On failure, startup closes the connection and leaves prior application state available to a compatible build. Generated SQL may require reviewed custom data migration; test with real old rows.

SQLite enables foreign keys, WAL, synchronous FULL and a 100 ms busy timeout. `STORAGE_BUSY` signals contention; retry explicitly after resolving it. Setting JSON archives contain bounded Setting data, not migration history or other modules.

## Development inspection

Close the application using the profile. Set an absolute `STARTER_DATABASE_PATH` and run `pnpm run db:studio` against an isolated development file. Studio uses the same Node-API driver under Node; it does not apply startup compatibility/recovery policy for you.

## Restore deliberately

Restoration replaces application data. Validate a copy first and obtain the owner's approval before replacing a real profile. This starter never performs restoration automatically.

1. Fully quit every process using the profile, including Studio. Closing the last window on macOS is insufficient.
2. Preserve the **entire failed profile**, including database, WAL/SHM files, snapshots and other module data, in a separate rollback location. With writers closed this is an offline copy. Copying only a live main database file is not a consistent backup; recent commits may reside in WAL.
3. Preserve and select a completed pre-upgrade `.sqlite` snapshot from `database/recovery`. It predates the upgrade and excludes later work. Validate integrity first; an interrupted backup file is not proof of a completed snapshot.
4. Create a separate candidate profile and copy the snapshot to `database/app.sqlite`. Do **not** place the failed database's WAL/SHM files beside it. Open the copy with a compatible binary, check SQLite integrity and expected business records. An older build can inspect pre-upgrade data; a corrected current build retries pending migrations and makes another snapshot.
5. After validation and explicit replacement approval, retain the original rollback profile and restore the target with the app closed. Keep incompatible old WAL/SHM files out of the restored database directory. Never delete the only copy of a failed-profile file.
6. Launch once, inspect records and keep rollback until acceptance. Never change recorded hashes or remove ledger rows to silence incompatibility.

Archive export creates an exclusive same-directory temporary file, syncs/closes it, then renames over the target without unlinking the old file. Replacement errors preserve the previous export. Canonical checks protect ordinary symlink/junction selections; concurrent hostile filesystem mutation by another same-user process is outside this boundary. Verify replacement on each supported OS. Directory-entry durability across abrupt power loss is not promised for exports; valuable data needs an appropriate database backup strategy.
