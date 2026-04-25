# agent-publish — design v0.1

**Date:** 2026-04-25
**Status:** DRAFT — awaiting Stage 1 approval

## Problem

Releasing an OSS package today is N CLIs and N config files. For a single-language family today (TS+Bun → npm) it's: cut a version (release-please), tag, push, build, `npm publish --provenance`, write GitHub release notes. Each step has its own flags, secrets, and failure modes. As the family expands to other languages, the delta gets worse: cargo has its own dance (`cargo publish`, OIDC support added 2025), PyPI has its own (Trusted Publishers, `twine` or `uv publish`), Homebrew is a tap repo, Docker is `docker push` + manifest list.

Existing tooling solves single-registry well. **Nothing solves the unified one-shot release across multiple registries with OIDC + provenance.** Research confirmed: this is a real gap in the 2026 ecosystem.

## What agent-publish IS

A single Bun-compiled binary that reads `publish.yaml` in a target repo and publishes the current release to every configured registry, with OIDC Trusted Publishers where supported and SLSA provenance attestations.

**v0.1 scope: npm + GitHub release only** (matches the only first-party caller TODAY — the TS+Bun family). Architecture is registry-pluggable so adding cargo (v0.2), PyPI (v0.3), Homebrew (v0.4), Docker (v0.5) is each a small contained module.

## What agent-publish is NOT

- Not a build system. Each language's build is delegated (`bun build` for TS, `cargo build` for Rust, `python -m build` for Python). agent-publish ASSUMES the build artifact already exists or runs the language-canonical build with no flags.
- Not a version-bump tool. Versioning is delegated to release-please (or whatever cuts the version). agent-publish reads the version from `package.json` / `Cargo.toml` / `pyproject.toml` — never writes it.
- Not a changelog generator. release-please / git-cliff already do that. agent-publish reads `CHANGELOG.md` to extract the current version's release notes.
- Not a secret manager. Tokens come from env. OIDC comes from the GH Actions runtime.
- Not a multi-package coordinator. Each repo publishes its own packages. `agent-orchestra` (future) coordinates across repos.

## Architecture (KISS)

Single Bun binary. ~5 source files. ≤200 lines each.

```
agent-publish/
├── README.md
├── SPEC.md
├── SCOPE.md
├── CHANGELOG.md
├── LICENSE
├── package.json
├── bunfig.toml / biome.json / tsconfig.json
├── src/
│   ├── index.ts                # CLI entry, dispatch
│   ├── config.ts               # publish.yaml load + Zod validation
│   ├── version.ts              # detect version from package.json / Cargo.toml / pyproject.toml
│   ├── changelog.ts            # extract current version's notes from CHANGELOG.md
│   ├── manifest.ts             # build the JSON release manifest
│   └── registries/
│       ├── npm.ts              # v0.1
│       └── github-release.ts   # v0.1
│   # v0.2: registries/cargo.ts, v0.3: registries/pypi.ts, v0.4: registries/homebrew.ts, v0.5: registries/docker.ts
├── tests/
│   ├── config.test.ts
│   ├── version.test.ts
│   ├── changelog.test.ts
│   └── registries/npm.test.ts  # mocks npm registry
├── conformance/                # vectors
├── examples/demo.ts            # 20-line demo: publish a fixture package to npm verdaccio
└── .github/workflows/ci.yml
```

Total runtime LoC target: < 600 for v0.1.

## `publish.yaml` schema (v0.1)

```yaml
version: 1
package:
  name: agent-id              # canonical package name
  language: typescript-bun    # one of: typescript-bun (v0.1); future: rust, python
registries:
  - kind: npm
    package: agent-id         # name on npm (defaults to package.name)
    provenance: true
    trusted_publisher: true   # use OIDC; false → fall back to NPM_TOKEN env
  - kind: github-release
    repo: p-vbordei/agent-id
    draft: false
    prerelease: false
```

Validated with Zod, strict mode (no unknown keys).

## CLI surface (v0.1)

```
agent-publish publish [--dry-run] [--from-tag <tag>]
agent-publish manifest                # print the JSON manifest that WOULD be emitted, without publishing
```

Two commands. Anything else (rollback, yank, verify) is DEFERRED.

## Release flow (v0.1)

When `agent-publish publish` runs:

1. **Load** `publish.yaml`. Validate.
2. **Detect version** from `package.json` (for `typescript-bun` packages).
3. **Verify** the working tree is clean and HEAD matches a tag `v<version>` (override with `--from-tag`).
4. **Extract release notes** from `CHANGELOG.md` for the current version.
5. **Build** with `bun build` (or skip if `--no-build` flag, deferred).
6. For each registry in `publish.yaml`, in declared order:
   - Verify required secrets/OIDC available
   - Run dry-run check (e.g., `npm publish --dry-run`) — must succeed
   - Publish for real (unless `--dry-run` was passed to agent-publish itself)
   - Capture sha256 of artifact, registry URL, etc.
7. **Emit** the JSON release manifest (§COORDINATION.md) to stdout.
8. **Upload** the manifest as an asset on the GitHub release (so agent-launch can fetch it).

## Trust & secrets

- OIDC Trusted Publishers preferred for npm (`provenance: true`, `trusted_publisher: true`). Falls back to `NPM_TOKEN` env only if explicitly configured.
- `GH_TOKEN` for GitHub release creation. Fine-grained PAT scoped to the target repo.
- No tokens in `publish.yaml`. Ever.
- All secrets read from env. Never logged. Never echoed.

## Conformance preview (Stage 4 detail)

- C1: `agent-publish manifest` is a pure function of (publish.yaml, package.json, CHANGELOG.md, current git tag). Same inputs → identical JSON output, byte-for-byte.
- C2: `--dry-run` makes ZERO network writes. Verified by mocking the global fetch and asserting no POST/PUT/PATCH/DELETE.
- C3: A failed registry mid-flight does NOT roll back successful registries (we record what shipped and report cleanly; rollback is out of scope).
- C4: Manifest schema matches `agent-publish/release-manifest/v1` declared in COORDINATION.md.
- C5: `publish.yaml` with missing/extra/invalid fields fails fast with a clear error.

## Demo preview (Stage 5)

`examples/demo.ts` (≤ 20 lines): publishes a tiny fixture package to a local Verdaccio (npm registry mirror started via Docker) and prints the resulting JSON manifest. The Verdaccio dep is the ONE Docker exception in this family (per philosophy: "Docker only when a third-party service makes it unavoidable").

## Decisions taken (no further user input needed)

| Decision | Choice | Rejected alternatives |
|---|---|---|
| Form factor | Single Bun binary CLI | MCP server (defer to v0.2 if needed), GH Action (separate package later) |
| v0.1 registries | npm + github-release only | npm + cargo + pypi (no first-party Rust/Python caller TODAY) |
| Versioning | Read-only from `package.json` etc. | Cut versions ourselves (release-please does that better) |
| Changelog | Read-only from `CHANGELOG.md` | Generate (git-cliff does that better) |
| Build | Run language-canonical build (no flags) or skip | Custom build pipeline |
| Provenance | OIDC Trusted Publishers preferred | Token-only with no provenance |
| Release manifest | JSON to stdout + GH release asset | Database, Redis, anywhere else |
| Failure mode | Record what shipped, no rollback | Atomic multi-registry transaction (impossible in practice) |

## Roadmap beyond v0.1

- v0.2: cargo registry support
- v0.3: PyPI registry support  
- v0.4: Homebrew tap support
- v0.5: Docker image push with manifest list
- v0.6: yank / unpublish flow (with explicit user confirmation)

Each adds one `src/registries/<kind>.ts` file (~150 LoC) and one row in the `publish.yaml` `registries` array. The architecture is intentionally registry-pluggable from day 1 to make these adds small.

## Open questions

None blocking Stage 1.
