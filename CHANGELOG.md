# Changelog

All notable changes to agent-publish will be documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-04-27

### Added
- `author`, `homepage`, `repository`, `bugs` fields in package.json so the npm page links back to the GitHub source and identifies Vlad Bordei <bordeivlad@gmail.com> as author. No code changes.

## [0.1.0] - 2026-04-27

### Added

- `agent-publish manifest` — emit the JSON release manifest a `publish` would produce, without publishing. Pure function of `publish.yaml` + `package.json` + `CHANGELOG.md`.
- `agent-publish publish [--dry-run] [--from-tag <tag>]` — orchestrates precheck → registries → manifest emission. Supports npm + GitHub release in v0.1.
- `publish.yaml` schema v1 (Zod-strict, discriminated union for registries).
- `src/registries/npm.ts` — `npm publish --provenance`, OIDC Trusted Publishers preferred, `NPM_TOKEN` fallback via ephemeral `.npmrc` (mode 0600, deleted after use).
- `src/registries/github-release.ts` — `gh release create` with notes file extracted from CHANGELOG.
- `src/precheck.ts` — refuse publish from a dirty tree or when HEAD doesn't match `v<version>` tag.
- Conformance vectors C1–C5 in `conformance/` (manifest pure, dry-run no writes, partial failure, schema match, strict YAML).
- Security tests S1–S5 in `tests/security/` (secret hygiene, tag mismatch, idempotent retry, provenance propagation).
- Self-contained demo in `examples/demo.ts` + `examples/demo-fixture/` — runs in <1s, no network.
- GitHub Actions `ci.yml` — install + tsc + test + compile + smoke.
- 63 tests across unit, integration, conformance, security suites.
