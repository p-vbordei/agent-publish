import { test, expect } from 'bun:test'
import { z } from 'zod'
import { buildManifest, emptyResultsFor } from '../src/manifest'
import type { PublishConfig } from '../src/config'

// This Zod schema mirrors SPEC.md §2.2 exactly. If the SPEC's release-manifest/v1
// schema changes, this test fails — surfacing cross-repo contract drift to
// agent-launch (the consumer).
const ManifestSchema = z
  .object({
    schema: z.literal('agent-publish/release-manifest/v1'),
    version: z.string(),
    repo: z.string(),
    tagged_at: z.string().datetime(),
    registries: z.array(
      z
        .object({
          name: z.enum(['npm', 'github-release']),
          url: z.string().url().optional(),
          package: z.string().optional(),
          version: z.string().optional(),
          sha256: z.string().optional(),
          provenance: z.boolean().optional(),
        })
        .strict(),
    ),
  })
  .strict()

test('C4 — emitted manifest validates against agent-publish/release-manifest/v1', () => {
  const cfg: PublishConfig = {
    version: 1,
    package: { name: 'agent-id', language: 'typescript-bun' },
    registries: [
      { kind: 'npm', package: 'agent-id', provenance: true, trusted_publisher: true },
      { kind: 'github-release', repo: 'p-vbordei/agent-id', draft: false, prerelease: false },
    ],
  }
  const m = buildManifest({
    cfg,
    version: '0.2.0',
    taggedAt: new Date('2026-04-27T12:00:00Z'),
    results: [
      {
        name: 'npm',
        package: 'agent-id',
        version: '0.2.0',
        url: 'https://www.npmjs.com/package/agent-id/v/0.2.0',
        sha256: 'sha512-abc==',
        provenance: true,
      },
      {
        name: 'github-release',
        url: 'https://github.com/p-vbordei/agent-id/releases/tag/v0.2.0',
      },
    ],
  })
  const result = ManifestSchema.safeParse(m)
  if (!result.success) console.error(result.error.issues)
  expect(result.success).toBe(true)
})

test('C4 — emptyResultsFor produces schema-valid result entries', () => {
  const cfg: PublishConfig = {
    version: 1,
    package: { name: 'x', language: 'typescript-bun' },
    registries: [{ kind: 'npm', provenance: true, trusted_publisher: true }],
  }
  const m = buildManifest({
    cfg,
    version: '1.0.0',
    taggedAt: new Date(),
    results: emptyResultsFor(cfg),
  })
  expect(ManifestSchema.safeParse(m).success).toBe(true)
})
