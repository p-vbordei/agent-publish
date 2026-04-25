# SPEC — agent-publish v0.1 (DRAFT)

**Status:** DRAFT 0.1 — flips to 1.0 at release per project scaffold.
**Last updated:** 2026-04-25

## 1. Overview

agent-publish is a single Bun-compiled binary. From a clean working tree of a tagged TS+Bun OSS repo, one command publishes the release to npm (with OIDC Trusted Publishers + provenance) and creates a GitHub release, emitting a JSON release manifest.

## 2. Data model

### 2.1 `publish.yaml` (v0.1, strict)

```yaml
version: 1
package:
  name: <string>             # canonical package name; matches /^[a-z0-9][a-z0-9-]*$/
  language: <string>         # v0.1: only "typescript-bun"
registries:
  - kind: npm
    package: <string>        # name on npm; defaults to package.name
    provenance: <bool>       # default true
    trusted_publisher: <bool># default true; if false, falls back to NPM_TOKEN env
  - kind: github-release
    repo: <string>           # GitHub coordinate "owner/name"
    draft: <bool>            # default false
    prerelease: <bool>       # default false
```

Required: `version`, `package.name`, `package.language`, `registries` (non-empty array). Strict — unknown keys reject.

### 2.2 Release manifest (v1, output)

Schema name: `agent-publish/release-manifest/v1`. Format declared in [`multi-oss-launch-and-maintain/COORDINATION.md`](../multi-oss-launch-and-maintain/COORDINATION.md). Reproduced here for completeness:

```json
{
  "schema": "agent-publish/release-manifest/v1",
  "version": "<semver>",
  "repo": "<owner/name>",
  "tagged_at": "<ISO 8601 UTC>",
  "registries": [
    {"name": "npm", "package": "<name>", "version": "<semver>", "url": "<url>", "sha256": "<hex>", "provenance": true},
    {"name": "github-release", "url": "<url>"}
  ]
}
```

Manifest is canonicalized per RFC 8785 JCS before sha-stamping or signing (deferred to v0.2).

## 3. CLI

```
agent-publish publish [--dry-run] [--from-tag <tag>]
agent-publish manifest [--from-tag <tag>]
```

### 3.1 `publish`

**Behavior:**
1. Load and validate `publish.yaml`.
2. Detect version from `package.json` (for `typescript-bun`).
3. Verify clean working tree. Verify HEAD matches tag `v<version>` (override with `--from-tag`).
4. Extract release notes from `CHANGELOG.md` for the current version (heading `## [<version>]`).
5. Run `bun build` if a `build` script exists in `package.json`. (No flags. Skip if absent.)
6. For each registry in declared order:
   - Verify required credentials available (OIDC env vars or fallback token)
   - Dry-run check (e.g., `npm publish --dry-run`)
   - If `--dry-run` was passed to agent-publish itself, stop here for this registry and record `dry-run-passed`
   - Otherwise: publish, capture sha256, URL, etc.
7. Build release manifest. Print JSON to stdout.
8. If `github-release` was a target, upload the manifest as an asset named `release-manifest.json` on the GitHub release.

**Exit codes:**
- 0 success (every registry published or `--dry-run-passed`)
- 1 publish.yaml invalid or version detection failed
- 2 working tree dirty or tag mismatch
- 3 a registry publish failed mid-flight (manifest still emitted with partial state)
- 4 missing required credentials

### 3.2 `manifest`

Same as steps 1-4 of `publish`, then prints the JSON manifest that WOULD be emitted, without publishing or building. Used by tests and by users to verify config.

Exit codes: 0 success, otherwise same as `publish`.

## 4. Registry adapters

### 4.1 npm

- If `trusted_publisher: true`: rely on `npm publish` reading the OIDC env vars set by GitHub Actions (`ACTIONS_ID_TOKEN_REQUEST_URL`, `ACTIONS_ID_TOKEN_REQUEST_TOKEN`). Run with `--provenance`.
- Else: read `NPM_TOKEN` from env; configure `~/.npmrc` ephemerally for the duration of the publish; clean up after. Run with `--provenance` if `provenance: true`.
- After publish: query `npm view <package>@<version> dist.integrity` for the sha512 (npm's canonical), convert to sha256 by re-hashing the published tarball if needed for the manifest. v0.1 records sha512 from npm directly to avoid a re-download.

### 4.2 github-release

- Use `gh release create v<version> --title "v<version>" --notes-file <changelog-section> [--draft] [--prerelease] --repo <repo>`
- Then `gh release upload v<version> release-manifest.json --repo <repo>` once manifest is built.

## 5. Conformance clauses

- **C1 — Manifest is pure.** `agent-publish manifest` produces byte-identical JSON when given the same inputs (publish.yaml, package.json, CHANGELOG.md, git tag). Verified by running twice and diffing.
- **C2 — `--dry-run` makes zero network writes.** Verified by intercepting fetch and any spawned `npm`/`gh` invocations in the test harness; assert no `POST/PUT/PATCH/DELETE` and no `npm publish` or `gh release create` (only `--dry-run` variants).
- **C3 — Partial-failure manifest.** When registry N fails after registries 1..N-1 succeeded, the emitted manifest contains only successful registries, exit code is 3, and stderr names the failed registry.
- **C4 — Manifest schema match.** Emitted JSON validates against the schema declared in COORDINATION.md (Zod schema test).
- **C5 — publish.yaml strict.** Loading a publish.yaml with missing/extra/invalid fields fails fast with a non-zero exit and a clear error message.

A test in `conformance/` validates each clause. Full conformance run completes in < 30 seconds.

## 6. Security considerations

- **S1 — Secrets.** `NPM_TOKEN`, `GH_TOKEN`, OIDC tokens are read from env only. Never logged. Never written to persistent disk. Ephemeral `~/.npmrc` is in a tmpdir, deleted on exit (including SIGTERM).
- **S2 — Tag verification.** Refuse to publish from an unsigned tag if a signed tag exists for the same SHA. Refuse if HEAD doesn't match the tag.
- **S3 — Idempotency on retry.** Re-running publish for an already-published version: npm rejects (correct), gh release create fails (correct). Both are caught and reported, exit code 3.
- **S4 — No secrets in manifest.** Manifest contains only public fields (URLs, hashes, version, sha). Never tokens, never internal hashes.
- **S5 — Provenance.** When `provenance: true`, the npm publish MUST attach a SLSA provenance attestation. Verified by post-publish check: `npm view <package>@<version> --json | jq '.dist.attestations'` is non-null.

## 7. Versioning

- agent-publish itself follows semver.
- `publish.yaml` schema is versioned in the `version: 1` field. Schema breaks require a new value here (and corresponding agent-publish major bump).
- Release manifest schema is versioned in the `schema` field.

## 8. Deliverables checklist (Stage 6)

- [ ] `bun install && bun test` green on a clean checkout
- [ ] `bun build --compile --outfile agent-publish src/index.ts` produces a single binary
- [ ] `examples/demo.ts` publishes a fixture package to local Verdaccio + a real GitHub repo (test repo) end-to-end
- [ ] All conformance clauses pass
- [ ] CHANGELOG.md v0.1.0 entry
- [ ] SPEC.md banner flipped DRAFT → 1.0 (at v1.0, NOT at v0.1)
- [ ] Git tag v0.1.0 created locally; push deferred to user confirmation
