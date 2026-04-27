# agent-publish

> One-shot multi-registry release publisher for OSS packages. Single Bun binary. v0.1: npm + GitHub release with OIDC Trusted Publishers + SLSA provenance.

**Status:** v0.1.0 — see [CHANGELOG.md](./CHANGELOG.md), [SPEC.md](./SPEC.md), [SCOPE.md](./SCOPE.md).

## What it does

Reads `publish.yaml` in your repo and publishes the current release to every configured registry, then emits a JSON release manifest.

```bash
bun install
bun run examples/demo.ts     # self-contained, no network — prints the JSON manifest
                             # for the fixture in examples/demo-fixture/

# In your own TS+Bun OSS repo:
cp publish.yaml.example publish.yaml && $EDITOR publish.yaml
git tag v0.2.0
agent-publish manifest                   # preview the manifest (no publish)
agent-publish publish --dry-run          # full flow, no network writes
agent-publish publish                    # for real: npm + GH release + manifest
```

To produce a single binary:

```bash
bun build --compile --outfile agent-publish src/index.ts
./agent-publish manifest
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
