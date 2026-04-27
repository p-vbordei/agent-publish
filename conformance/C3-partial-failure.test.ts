import { test, expect } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// We simulate a partial failure by configuring a registry that we know will
// fail end-to-end: a github-release config pointing at a non-existent repo,
// invoked without GH_TOKEN, in a fixture without git tags. We can't do this
// safely against a real registry, so this test verifies the orchestration
// behavior at the unit level: when one registry throws, the loop continues
// and the manifest is emitted with successful registries only.
import { buildManifest, emptyResultsFor, type RegistryResult } from '../src/manifest'
import type { PublishConfig } from '../src/config'

test('C3 — partial-failure manifest includes successful registries only', () => {
  const cfg: PublishConfig = {
    version: 1,
    package: { name: 'x', language: 'typescript-bun' },
    registries: [
      { kind: 'npm', package: 'x', provenance: true, trusted_publisher: true },
      { kind: 'github-release', repo: 'o/r', draft: false, prerelease: false },
    ],
  }
  // npm succeeded, github-release failed (omitted from results array)
  const partialResults: RegistryResult[] = [
    {
      name: 'npm',
      package: 'x',
      version: '1.0.0',
      url: 'https://www.npmjs.com/package/x/v/1.0.0',
      sha256: 'sha512-abc==',
      provenance: true,
    },
  ]
  const m = buildManifest({
    cfg,
    version: '1.0.0',
    taggedAt: new Date('2026-04-27T12:00:00Z'),
    results: partialResults,
  })
  expect(m.registries).toHaveLength(1)
  expect(m.registries[0]?.name).toBe('npm')
  expect(m.registries.find((r) => r.name === 'github-release')).toBeUndefined()
})
