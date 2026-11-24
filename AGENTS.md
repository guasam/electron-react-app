# Project conventions

- Always use pnpm for installation, scripts, dependency changes and executable tools. Use the version declared in `package.json` and maintain `pnpm-lock.yaml` as the sole package lockfile.
- Preserve the domain/application/repository boundaries described in `docs/architecture.md`. Resolve Awilix only in the composition root and provider factories.
- Review affected consumers, IPC contracts, migrations and resource lifecycles when changing behavior. Released migrations are immutable.
- Run appropriate checks from `docs/testing.md`. Desktop tests and packaged smoke checks must use isolated temporary profiles.
