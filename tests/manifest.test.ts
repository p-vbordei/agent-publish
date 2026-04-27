import { describe, expect, test } from 'bun:test'
import { buildManifest, emptyResultsFor } from '../src/manifest'
import type { PublishConfig } from '../src/config'

const cfg: PublishConfig = {
  version: 1,
  package: { name: 'agent-id', language: 'typescript-bun' },
  registries: [
    { kind: 'npm', package: 'agent-id', provenance: true, trusted_publisher: true },
    { kind: 'github-release', repo: 'p-vbordei/agent-id', draft: false, prerelease: false },
  ],
}

describe('buildManifest', () => {
  test('produces v1 schema with declared shape', () => {
    const m = buildManifest({
      cfg,
      version: '0.2.0',
      taggedAt: new Date('2026-04-27T12:00:00Z'),
      results: emptyResultsFor(cfg),
    })
    expect(m.schema).toBe('agent-publish/release-manifest/v1')
    expect(m.version).toBe('0.2.0')
    expect(m.repo).toBe('p-vbordei/agent-id')
    expect(m.tagged_at).toBe('2026-04-27T12:00:00.000Z')
    expect(m.registries).toHaveLength(2)
  })

  test('includes provenance flag for npm', () => {
    const m = buildManifest({
      cfg,
      version: '0.2.0',
      taggedAt: new Date(),
      results: emptyResultsFor(cfg),
    })
    const npm = m.registries.find((r) => r.name === 'npm')
    expect(npm?.provenance).toBe(true)
    expect(npm?.package).toBe('agent-id')
  })

  test('infers repo from github-release entry', () => {
    const cfgNpmOnly: PublishConfig = {
      ...cfg,
      registries: [{ kind: 'npm', provenance: true, trusted_publisher: true }],
    }
    const m = buildManifest({
      cfg: cfgNpmOnly,
      version: '0.2.0',
      taggedAt: new Date(),
      results: emptyResultsFor(cfgNpmOnly),
    })
    expect(m.repo).toBe('<unknown>')
  })

  test('JSON-serializes cleanly', () => {
    const m = buildManifest({
      cfg,
      version: '0.2.0',
      taggedAt: new Date('2026-04-27T12:00:00Z'),
      results: emptyResultsFor(cfg),
    })
    const json = JSON.stringify(m)
    const parsed = JSON.parse(json)
    expect(parsed.schema).toBe('agent-publish/release-manifest/v1')
  })
})
