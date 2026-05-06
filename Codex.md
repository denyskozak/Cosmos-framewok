# Codex Notes

## Project Intent

This repository is a prototype of an enterprise SSR micro-frontend platform around Astro.
Treat Astro as the shell and UI composer: it resolves the active manifest, fetches server-rendered HTML fragments, and assembles the page. Micro-frontends are independent runtime services that expose SSR endpoints and register themselves through service discovery.

This is not classic browser-side Module Federation. The core idea is HTML-over-the-wire composition with optional client islands where a micro-frontend truly needs browser behavior.

## Current Runtime Shape

- `apps/shell-astro` is the SSR shell on port `4300`.
- `apps/service-discovery` is a native Node HTTP registry on port `4400`.
- `apps/mf-react-catalog` is a React + React Router SSR content MFE on port `4500`.
- `apps/mf-header-ssr` is a global header SSR MFE on port `4501`.
- `apps/mf-footer-ssr` is a global footer SSR MFE on port `4502`.
- `apps/mf-auth-client` is a client-oriented auth fragment on port `4503`.
- `libs/discovery-contracts` owns Zod schemas and inferred TypeScript contracts.
- `libs/discovery-client` owns registration and heartbeat HTTP behavior.
- `libs/mfe-infrastructure` owns orchestration project lists and Nx serve targets.

Request flow:

1. Browser requests a route from `shell-astro`.
2. Astro middleware fetches `GET /manifest` from `service-discovery`.
3. Shell selects global slots by `metadata.slot` and content by route match.
4. Shell calls each selected MFE `ssrUrl?route=<path>`.
5. Shell injects returned `{ html }` into `ShellLayout.astro`.

Registration flow:

1. MFE starts its own Node HTTP server.
2. MFE registers with `POST /register`.
3. Discovery stores registration in memory with `ttlSec`.
4. MFE sends periodic `POST /heartbeat`.
5. Discovery prunes expired records.

## Commands

Use pnpm scripts as the public interface:

```bash
pnpm serve:all
pnpm serve:discovery
pnpm serve:shell
pnpm serve:catalog
pnpm serve:header
pnpm serve:footer
pnpm serve:auth
pnpm build
pnpm check
```

Useful Nx commands:

```bash
pnpm nx run-many -t serve -p service-discovery,mf-react-catalog,mf-header-ssr,mf-footer-ssr,mf-auth-client,shell-astro --parallel=6
pnpm nx run-many -t typecheck -p discovery-contracts,discovery-client,service-discovery,mf-react-catalog,mf-header-ssr,mf-footer-ssr,mf-auth-client,shell-astro
pnpm nx run-many -t build -p discovery-contracts,discovery-client,service-discovery,mf-react-catalog,mf-header-ssr,mf-footer-ssr,mf-auth-client,shell-astro
```

Package manager note: `package.json` declares `pnpm@10.0.0`, but `package-lock.json` is present. Prefer pnpm and avoid adding npm lockfile churn unless the project intentionally changes package managers.

## Development Rules

- Keep platform contracts in `libs/discovery-contracts`; do not duplicate request or manifest shapes inside apps.
- Validate external/runtime payloads with Zod at boundaries.
- Put reusable discovery behavior in `libs/discovery-client`, not in individual MFEs.
- Keep each MFE independently runnable with its own `serve`, `build`, and `typecheck` targets.
- When adding an MFE, register it through discovery with `name`, `version`, `basePath`, `ssrUrl`, `routes`, `ttlSec`, `instanceId`, and meaningful `metadata`.
- Use `metadata.slot` for global shell regions such as `header`, `auth`, and `footer`; omit or set `content` for route-owned page content.
- Preserve the shell's request-time discovery model. Avoid hardcoding concrete MFE URLs in the shell unless building a deliberate fallback.
- Keep HTML-over-the-wire as the default. Add client JavaScript only for behavior that needs browser state, events, or hydration.
- Keep shared UI assumptions minimal because future MFEs may use React, Vue, Angular, or server-only rendering.
- Prefer small native Node HTTP services until there is a clear need for a framework.

## Adding A New SSR MFE

1. Create `apps/mf-<name>-ssr` with `src/server/main.ts`, `src/server/render.tsx` or equivalent, and app route components.
2. Add a `project.json` with `serve`, `build`, and `typecheck`.
3. Expose `GET /health`.
4. Expose `GET /ssr?route=<path>` returning JSON `{ "html": "<fragment>" }`.
5. Register on startup with `createDiscoveryClient`.
6. Send heartbeats more frequently than `ttlSec`.
7. Add the project to `libs/mfe-infrastructure/src/index.ts` and platform serve targets if it should run with `pnpm serve:all`.
8. Add TypeScript path aliases only for shared libraries, not for app-to-app imports.

## Shell Composition Notes

The current shell composition lives in `apps/shell-astro/src/pages/[...path].astro`.

Current behavior:

- It renders at most one content MFE for the current route.
- It renders first matching entries for `header`, `auth`, and `footer`.
- It fetches fragments in parallel.
- If discovery or an SSR endpoint fails, it renders empty fallback content.

Be careful with:

- `set:html` injects raw HTML. Treat MFE output as trusted platform output for now, but plan a sanitization, CSP, or trust-boundary story before production.
- Route matching is intentionally simple. If route patterns become richer, replace the ad hoc regex generation with a small tested matcher.
- Discovery is fetched on every request. Add caching only with clear invalidation or TTL semantics.
- Multiple instances of the same MFE currently sort by name only. If load balancing or canary behavior matters, add explicit selection policy.

## Known Gaps And Risks

- No tests are currently registered in `vitest.workspace.ts`.
- Discovery is in-memory; restarts lose registrations.
- Registration `ssrUrl` values are local URLs built from service ports. Production needs externally reachable service addresses.
- Fragment payload only returns `html`; there is no contract yet for assets, preload hints, status codes, redirects, headers, or SEO metadata.
- Client auth fragment pulls React, ReactDOM, and EventEmitter3 from unpkg. For production, bundle or serve assets through a controlled asset pipeline.
- Header/auth cross-MFE communication uses a global `window.__COSMOS_EVENT_BUS__`; this is fine for the prototype, but event names and payloads need typed contracts before growth.
- Shell fallback hides SSR endpoint errors. Add structured logging and observability before treating this as production behavior.
- There is no authentication, authorization, tenancy, rollout, or version compatibility policy yet.

## Near-Term Evolution Path

Prioritize in this order:

1. Add tests around discovery contracts, registry TTL behavior, discovery client failures, and shell route matching.
2. Extract repeated MFE server bootstrap logic into a shared helper if one more MFE repeats the same register/heartbeat/server pattern.
3. Introduce typed fragment response contracts: `html`, `status`, `headers`, `assets`, and optional metadata.
4. Add shell-level observability for discovery fetches and fragment fetches.
5. Add controlled client asset handling for client MFEs.
6. Define version compatibility between shell, discovery contracts, and MFEs.
7. Consider persistent discovery storage or platform-native service discovery.

## Verification Before Changes Are Done

For most code changes, run:

```bash
pnpm check
pnpm build
```

For runtime composition changes, also run the platform and inspect:

```bash
pnpm serve:all
```

Then check:

- `http://localhost:4400/manifest`
- `http://localhost:4300/`
- `http://localhost:4300/catalog`
- `http://localhost:4300/catalog/1`

For frontend-affecting shell changes, verify the rendered page in a browser at desktop and mobile widths.

## Coding Style

- TypeScript strict mode is enabled; keep it clean.
- Use explicit contracts and small functions.
- Keep runtime defaults close to each service's `main.ts`, but promote shared behavior once duplication becomes real.
- Prefer readable names over clever abstractions.
- Avoid broad refactors while the architecture is still stabilizing.
- Keep README user-facing; keep this file as Codex-facing engineering memory.
