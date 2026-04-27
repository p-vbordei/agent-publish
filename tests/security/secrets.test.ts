import { test, expect, describe } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { buildManifest, emptyResultsFor } from '../../src/manifest'
import type { PublishConfig } from '../../src/config'

const CLI = resolve(import.meta.dir, '..', '..', 'src', 'index.ts')

function setupFixture() {
  const dir = mkdtempSync(join(tmpdir(), 's1-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'agent-id', version: '0.2.0' }))
  writeFileSync(
    join(dir, 'CHANGELOG.md'),
    `# Changelog\n\n## [0.2.0] - 2026-04-27\n\n### Added\n- thing\n`,
  )
  writeFileSync(
    join(dir, 'publish.yaml'),
    `version: 1
package:
  name: agent-id
  language: typescript-bun
registries:
  - kind: npm
    package: agent-id
  - kind: github-release
    repo: p-vbordei/agent-id
`,
  )
  return dir
}

describe('S1 + S4 — secret hygiene', () => {
  test('manifest output contains no token-shaped strings even when env has them', () => {
    const dir = setupFixture()
    try {
      const r = spawnSync('bun', ['run', CLI, 'manifest'], {
        cwd: dir,
        env: {
          ...process.env,
          NPM_TOKEN: 'npm_FAKE_FOR_TEST',
          GH_TOKEN: 'ghp_FAKE_FOR_TEST',
          ANTHROPIC_API_KEY: 'sk-ant-FAKE',
        },
        encoding: 'utf8',
      })
      expect(r.status).toBe(0)
      expect(r.stdout).not.toContain('npm_FAKE_FOR_TEST')
      expect(r.stdout).not.toContain('ghp_FAKE_FOR_TEST')
      expect(r.stdout).not.toContain('sk-ant-FAKE')
      expect(r.stderr ?? '').not.toContain('npm_FAKE_FOR_TEST')
      expect(r.stderr ?? '').not.toContain('ghp_FAKE_FOR_TEST')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('built manifest contains only declared public fields', () => {
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
    const allowed = new Set(['schema', 'version', 'repo', 'tagged_at', 'registries'])
    for (const k of Object.keys(m)) expect(allowed.has(k)).toBe(true)
    for (const reg of m.registries) {
      const allowedReg = new Set([
        'name',
        'url',
        'package',
        'version',
        'sha256',
        'provenance',
      ])
      for (const k of Object.keys(reg)) expect(allowedReg.has(k)).toBe(true)
    }
  })
})
