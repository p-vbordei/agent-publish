# SCOPE — agent-publish v0.1

Output of Stage 1 (Scope compression). Default verdict for any feature is **DEFERRED**. Inclusion in v0.1 requires either (a) a real first-party caller TODAY, or (b) the primary use case dies without it.

## Primary use case

> **"From a clean checkout of a TS+Bun OSS repo at a tagged commit, `agent-publish publish` builds, publishes to npm with OIDC + provenance, creates a GitHub release with the version's CHANGELOG section, and emits a JSON release manifest. One command. No flags."**

If a v0.2 release of `agent-id` cannot ship via this command in under a minute, agent-publish has not shipped v0.1.

---

## Features evaluated

### F1 — `publish.yaml` config (Zod-validated, strict)
- First-party caller TODAY? **Yes — `agent-id`, `agent-ask` will both add one.**
- Primary use case dies without it? **Yes — `publish` has nothing to read.**
- **VERDICT: IN-V0.1**

### F2 — `publish` command (one-shot release)
- First-party caller TODAY? **Yes — both ready repos.**
- Primary use case dies without it? **Yes — this IS the use case.**
- **VERDICT: IN-V0.1**

### F3 — `manifest` command (print would-be manifest, no publishing)
- First-party caller TODAY? **Yes — agent-launch reads manifests; useful for testing in isolation.**
- Primary use case dies without it? **No, but cheap to ship and aids testing.**
- **VERDICT: IN-V0.1**

### F4 — Version detection from `package.json`
- First-party caller TODAY? **Yes — every TS+Bun repo.**
- Primary use case dies without it? **Yes — must know what version we're publishing.**
- **VERDICT: IN-V0.1**

### F5 — CHANGELOG section extraction
- First-party caller TODAY? **Yes — every release-please-managed repo.**
- Primary use case dies without it? **Yes — GitHub release body comes from here.**
- Reinvents? **No — straightforward markdown parse for `## [<version>]` heading.**
- **VERDICT: IN-V0.1**

### F6 — npm publishing with OIDC Trusted Publishers + provenance
- First-party caller TODAY? **Yes — both ready repos publish to npm.**
- Primary use case dies without it? **Yes.**
- Reinvents? **No — wraps `npm publish --provenance`.**
- **VERDICT: IN-V0.1**

### F7 — GitHub release creation (with CHANGELOG body)
- First-party caller TODAY? **Yes — same.**
- Primary use case dies without it? **Yes — release manifest needs the GH release URL.**
- Reinvents? **No — wraps `gh release create`.**
- **VERDICT: IN-V0.1**

### F8 — JSON release manifest emission (per COORDINATION.md schema)
- First-party caller TODAY? **agent-launch will consume it.**
- Primary use case dies without it? **No, but the cross-repo contract requires it.**
- **VERDICT: IN-V0.1**

### F9 — `--dry-run` mode (no network writes)
- First-party caller TODAY? **Yes — CI smoke test, user testing changes.**
- Primary use case dies without it? **Probably yes — first-time runs without a dry-run are scary.**
- **VERDICT: IN-V0.1**

### F10 — Tag-and-clean-tree precondition checks
- First-party caller TODAY? **Yes — wouldn't want to publish from a dirty tree.**
- Primary use case dies without it? **Yes — bad releases are unrecoverable.**
- **VERDICT: IN-V0.1**

### F11 — Conformance test vectors (C1–C5)
- First-party caller TODAY? **Yes — CI runs them on every push.**
- Primary use case dies without it? **No, but releasing without conformance violates the project scaffold.**
- **VERDICT: IN-V0.1**

### F12 — 20-line demo (Verdaccio fixture publish)
- First-party caller TODAY? **Yes — the user when validating end-to-end.**
- **VERDICT: IN-V0.1**

---

### F13 — cargo registry support
- First-party caller TODAY? **None — entire current family is TS+Bun.**
- Primary use case dies without it? **No — none of the 9 family repos publishes to cargo today.**
- **VERDICT: DEFERRED-V0.2** (revisit when first Rust repo joins family)

### F14 — PyPI registry support
- First-party caller TODAY? **None.**
- **VERDICT: DEFERRED-V0.3** (after cargo)

### F15 — Homebrew tap support
- First-party caller TODAY? **None.**
- **VERDICT: DEFERRED-V0.4**

### F16 — Docker image publishing with manifest list
- First-party caller TODAY? **None — agent-* repos are libraries, not images.**
- **VERDICT: DEFERRED-V0.5**

### F17 — Yank / unpublish flow
- First-party caller TODAY? **No — no botched release yet.**
- **VERDICT: DEFERRED-V0.6**

### F18 — Multi-package coordinated release (single repo, multiple packages)
- First-party caller TODAY? **None — every family repo publishes one package.**
- **VERDICT: DEFERRED-V0.2**

### F19 — Cross-repo coordinated release (multiple repos atomically)
- First-party caller TODAY? **None.**
- Reinvents? **Arguably — atomic cross-repo is a hard distributed problem.**
- **VERDICT: CUT** (will be handled at orchestra level if ever needed)

---

### F20 — MCP server wrapping the CLI (so other agents can call it)
- First-party caller TODAY? **None — `agent-orchestra` will eventually want this, but only after v0.1 lands.**
- **VERDICT: CUT** (the CLI is enough; MCP wrapper is a thin shim that can live in `agent-orchestra` or a separate repo)

### F21 — GitHub Action wrapping the CLI
- First-party caller TODAY? **The fleet-installed `release-please.yml` could call agent-publish via `bunx`.**
- Primary use case dies without it? **No — the bare CLI works in any GH Actions step.**
- **VERDICT: CUT** (no need; runs as a step)

### F22 — Custom registry support (private npm scopes, alternative cargo registries, etc.)
- First-party caller TODAY? **None.**
- **VERDICT: CUT** (anti-pattern: configurability without a current consumer)

### F23 — Build pipeline beyond `bun build`
- First-party caller TODAY? **None — TS+Bun has one canonical build command.**
- **VERDICT: CUT** (delegate build to language-canonical commands)

### F24 — Version cutting (managing version bumps)
- First-party caller TODAY? **release-please already cuts versions per repo.**
- Reinvents? **Yes — release-please.**
- **VERDICT: CUT** (delegated to release-please)

### F25 — Changelog generation
- First-party caller TODAY? **release-please already generates them.**
- Reinvents? **Yes — release-please / git-cliff.**
- **VERDICT: CUT** (delegated)

---

## Summary

**IN-V0.1 (12):** F1 publish.yaml · F2 publish · F3 manifest · F4 version detect · F5 CHANGELOG extract · F6 npm + provenance · F7 GH release · F8 release manifest JSON · F9 dry-run · F10 precondition checks · F11 conformance · F12 demo

**DEFERRED:**
- v0.2: F13 cargo · F18 multi-package
- v0.3: F14 PyPI
- v0.4: F15 Homebrew
- v0.5: F16 Docker
- v0.6: F17 yank

**CUT (5):** F19 cross-repo atomic · F20 MCP wrapper · F21 GH Action · F22 custom registries · F23 build pipeline · F24 version cutting · F25 changelog gen

This v0.1 fits the project philosophy: ONE problem (one-shot npm release with provenance + manifest), composed of mature primitives, ~5-7 source files, single binary deliverable, < 600 LoC.
