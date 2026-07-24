# Cosmos Framework

Cosmos Framework is an open-source, production-oriented **horizontal SSR micro-frontend platform prototype** built for organizations that need multiple independent frontend teams to deliver in one shared product surface.

The repository demonstrates a practical composition model where micro-frontends self-register, expose SSR fragments, and are assembled by a shell application at request time.

<img width="1254" height="884" alt="welcome" src="https://github.com/user-attachments/assets/7aae03ef-ec42-4d29-a6f9-b064b8524a0a" />

## Why this project exists

Large frontend organizations often face the same set of scaling constraints:

- **Fragmented delivery ownership** across teams and domains.
- **Framework lock-in** when one stack is enforced for every team.
- **Operational drift** when each team invents its own runtime and integration approach.

Cosmos addresses these by combining:

- Dynamic **service discovery** for runtime registration and health.
- A server-side **HTML composition shell**.
- Independent **micro-frontend runtimes** with explicit boundaries.

## Architecture at a glance

### Shell (`apps/shell-astro`)

- Built with Astro and runs as the SSR composition layer.
- On each request, fetches the current manifest from discovery.
- Resolves route-to-micro-frontend mapping and injects SSR HTML fragments.

### Service Discovery (`apps/service-discovery`)

- Node.js HTTP service with in-memory registry and TTL leasing.
- Provides registration, heartbeat, manifest and health endpoints.
- Validates contracts via Zod.

### Micro-frontends (`apps/mf-*`)

- Independently executable SSR services.
- Register on startup and heartbeat periodically.
- Return HTML fragments from `/ssr` endpoints.

## Monorepo layout

```txt
apps/
  shell-astro/            Astro SSR shell + composition middleware
  service-discovery/      Node.js discovery service
  mf-react-catalog/       React + React Router SSR catalog MFE
  mf-header-ssr/          SSR header MFE
  mf-footer-ssr/          SSR footer MFE
  mf-auth-client/         Client-side auth MFE

libs/
  discovery-contracts/    Shared Zod schemas + TS types
  discovery-client/       Shared discovery registration/heartbeat client
  shared-types/           Optional shared platform types
  mfe-infrastructure/     Nx orchestration targets
  vitest-config/          Shared Vitest helpers
```

## Runtime flow

### SSR composition flow

1. Browser requests a route from `shell-astro`.
2. Shell middleware fetches `GET /manifest` from discovery.
3. Shell resolves matching micro-frontend(s).
4. Shell fetches fragment HTML from target `ssrUrl`.
5. Shell returns composed SSR response.

### Registration flow

1. Micro-frontend starts.
2. Sends `POST /register`.
3. Discovery stores the entry with lease metadata.
4. Micro-frontend sends periodic `POST /heartbeat`.
5. Expired entries are removed and no longer appear in manifest.

## Ports (local defaults)

- Shell: `4300`
- Discovery: `4400`
- Catalog MFE: `4500`
- Header MFE: `4501`
- Footer MFE: `4502`
- Auth MFE: `4503`

## Dependency strategy for micro-frontends (Nx-aligned)

Each micro-frontend now owns a local `package.json` (`apps/mf-*/package.json`) and declares only the dependencies it needs to run.

This follows Nx guidance for JS/TS workspaces:

- Project relationships can be inferred from source imports and `package.json`.
- Workspace packages should be referenced via `workspace:*`.
- Runtime dependencies are declared at the project level, while shared tooling can stay at root.

In this repository, each MFE explicitly depends on `@cosmos/discovery-client` via `workspace:*`, and React-based MFEs declare React runtime dependencies locally.

## Getting started

> Requirements: Node.js 20+, pnpm.

```bash
pnpm install
```

### Start full platform

```bash
pnpm serve:platform
```

### Start services individually

```bash
pnpm serve:discovery
pnpm serve:catalog
pnpm serve:header
pnpm serve:footer
pnpm serve:auth
pnpm serve:shell
```


Or try running all together:

```bash
pnpm serve:all
```

Developer-friendly aliases for full platform:

```bash
pnpm dev:platform
pnpm prod:platform
```

- `dev:platform` runs registry + shell + all micro-frontends in development mode.
- `prod:platform` builds everything and starts registry + shell + all micro-frontends from build artifacts.

Or run only MFE servers (without shell/discovery):

```bash
pnpm serve:mfe-infrastructure
```

## Useful URLs

- Shell home: http://localhost:4300/
- Catalog list: http://localhost:4300/catalog
- Catalog details: http://localhost:4300/catalog/1
- Discovery health: http://localhost:4400/health
- Discovery manifest: http://localhost:4400/manifest

## Nx commands


- `nx serve service-discovery`
- `nx serve mf-react-catalog`
- `nx serve mf-header-ssr`
- `nx serve mf-footer-ssr`
- `nx serve mf-auth-client`
- `nx serve shell-astro`
- `nx run-many -t serve -p service-discovery,mf-react-catalog,shell-astro --parallel=3`
- `nx serve mfe-infrastructure`
- `nx run mfe-infrastructure:serve:platform`
- `nx run mfe-infrastructure:serve:platform:prod`
- `nx run-many -t build -p discovery-contracts,discovery-client,service-discovery,mf-react-catalog,shell-astro`
- `nx run-many -t typecheck -p discovery-contracts,discovery-client,service-discovery,mf-react-catalog,shell-astro`


## Roadmap direction

This prototype intentionally optimizes for clarity and extensibility:

- Move discovery from in-memory registry to durable storage.
- Add multi-fragment orchestration and caching policies in shell.
- Expand observability, authN/authZ, tenancy and rollout controls.
- Formalize team-level contracts for independently deployable MFEs.

If you are exploring enterprise SSR micro-frontends with explicit runtime boundaries, Cosmos is a strong starting baseline.
