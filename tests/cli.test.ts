import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const CLI = resolve(import.meta.dir, '..', 'src', 'index.ts')

function runCli(args: string[], cwd: string) {
  const r = spawnSync('bun', ['run', CLI, ...args], { cwd, encoding: 'utf8' })
  return { stdout: r.stdout, stderr: r.stderr, code: r.status ?? -1 }
}

function setupFixture(version = '0.2.0') {
  const dir = mkdtempSync(join(tmpdir(), 'ap-cli-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'agent-id', version }))
  writeFileSync(
    join(dir, 'CHANGELOG.md'),
    `# Changelog\n\n## [${version}] - 2026-04-27\n\n### Added\n- the thing\n`,
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

describe('CLI', () => {
  test('manifest prints valid JSON for a fixture', () => {
    const dir = setupFixture()
    try {
      const { code, stdout } = runCli(['manifest'], dir)
      expect(code).toBe(0)
      const m = JSON.parse(stdout)
      expect(m.schema).toBe('agent-publish/release-manifest/v1')
      expect(m.version).toBe('0.2.0')
      expect(m.repo).toBe('p-vbordei/agent-id')
      expect(m.registries).toHaveLength(2)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('exits 1 on missing publish.yaml', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ap-cli-'))
    try {
      const { code } = runCli(['manifest'], dir)
      expect(code).toBe(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('exits 1 when CHANGELOG missing version section', () => {
    const dir = setupFixture('0.2.0')
    try {
      // overwrite CHANGELOG to drop the section
      writeFileSync(join(dir, 'CHANGELOG.md'), '# Changelog\n\n## [Unreleased]\n')
      const { code, stderr } = runCli(['manifest'], dir)
      expect(code).toBe(1)
      expect(stderr).toMatch(/0\.2\.0/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('exits 64 with usage on missing command', () => {
    const dir = setupFixture()
    try {
      const { code } = runCli([], dir)
      expect(code).toBe(64)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
