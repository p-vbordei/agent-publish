# agent-publish

> One-shot multi-registry release publisher for OSS packages. Single Bun binary. v0.1: npm + GitHub release with OIDC Trusted Publishers + SLSA provenance.

**Status:** v0.0.0 — under construction. See [SCOPE.md](./SCOPE.md), [SPEC.md](./SPEC.md), [docs/superpowers/specs/](./docs/superpowers/specs/).

## What it does

Reads `publish.yaml` in your repo and publishes the current release to every configured registry, then emits a JSON release manifest.

```bash
bun install
$EDITOR publish.yaml         # declare which registries this repo ships to
git tag v0.2.0 && git push --tags
agent-publish publish        # → npm publish --provenance + gh release create
                             # → release-manifest.json on stdout + GH release asset
```

## Scope by version

| Version | Registries |
|---|---|
| **v0.1 (current)** | npm + github-release |
| v0.2 | + cargo (crates.io) |
| v0.3 | + PyPI |
| v0.4 | + Homebrew tap |
| v0.5 | + Docker (image + manifest list) |

Only npm + github-release in v0.1 because that's the only first-party caller TODAY (the agent-* TS+Bun family). Adding a registry is one new file in `src/registries/` plus a new row in `publish.yaml`.

## What it is NOT

- Not a build system — delegates to `bun build` / `cargo build` / `python -m build`.
- Not a version-bump tool — reads version from `package.json` etc. release-please cuts versions.
- Not a changelog generator — reads `CHANGELOG.md` (release-please writes it).
- Not a multi-repo coordinator — that's `agent-orchestra` (future).

## Family

`agent-publish` is one of three sibling repos for autonomous OSS maintenance — see [`../multi-oss-launch-and-maintain/`](../multi-oss-launch-and-maintain/) for the coordination hub.

## License

Apache 2.0 — see [LICENSE](./LICENSE).
