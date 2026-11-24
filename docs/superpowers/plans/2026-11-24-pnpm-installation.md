# pnpm installation and dependency refresh

> Execute inline with `superpowers:executing-plans`; perform one fresh review at the end. The user's request directly authorizes this configuration change. Do not commit or push.

**Goal:** A clone uses pnpm exclusively and installs Electron automatically, like the downloader app, with current stable compatible dependencies.

**Scope:** Package metadata, lifecycle scripts, pnpm configuration and lockfile, build configuration affected by upgrades, CI and contributor documentation. Preserve Settings behavior and migration bytes. The downloader is a read-only reference.

- [x] Query current registry versions and peer requirements. Pin pnpm and a current LTS development runtime. Keep any necessary compatibility exception explicit.
- [x] Replace manual setup and blanket script disabling with automatic Electron installation and explicit dependency build permissions. Enforce pnpm; migrate commands, lockfile, guides and CI.
- [x] Verify a fresh frozen install, native SQLite under Node/Electron, types/lint/format, existing suites, migration generation, desktop flows, unpacked packaging and packaged restart persistence. Audit production dependencies.
- [x] Review the resulting configuration with a fresh reviewer, resolve material findings and record current evidence and platform limits.

**Result:** Node and Electron each passed 45 tests; all eight desktop flows and actual Windows packaged persistence passed. Frozen installation passed in an empty fixture. Production audit found no known vulnerabilities. Schema generation produced no changes, and migration hashes were preserved. The sole direct-dependency compatibility exception is TypeScript 6.0.3. The fresh review found no material issues; see `docs/verification.md` for evidence and limits.

**Isolation:** Global pnpm remains 11.2.2 and global Node remains 24.11.1. Package-manager selection and the Node 26.13.1 runtime are local to this repository. Downloader status remained clean. No commit, merge or push was made.

**Compatibility ruling:** TypeScript must remain on the latest supported 6.0 patch while typescript-eslint requires `<6.1` and architecture checks use the JavaScript compiler API. No prereleases or forced peer overrides. ESLint can move to 10 by removing the unused React plugin (its only configured rule was disabled); retain Hooks checks.

**Lifecycle ruling:** `postinstall` downloads the Electron binary. SQLite 13 ships Node-API prebuilds, so retain `npmRebuild: false` and avoid a redundant builder rebuild. Native verification has its own command so installation does not require Linux GUI libraries merely to download dependencies.
