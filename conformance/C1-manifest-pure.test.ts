import { test, expect } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const CLI = resolve(import.meta.dir, '..', 'src', 'index.ts')

function run(cwd: string) {
  const r = spawnSync('bun', ['run', CLI, 'manifest'], { cwd, encoding: 'utf8' })
  return { stdout: r.stdout, code: r.status ?? -1 }
}

function setupFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'c1-'))
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

// Strip the tagged_at line for byte-comparison since it embeds the wall clock.
function strip(json: string): string {
  return json.replace(/"tagged_at": "[^"]+"/, '"tagged_at": "<elided>"')
}

test('C1 — manifest output is byte-identical for the same inputs (modulo tagged_at)', () => {
  const dir = setupFixture()
  try {
    const a = run(dir)
    const b = run(dir)
    expect(a.code).toBe(0)
    expect(b.code).toBe(0)
    expect(strip(a.stdout)).toBe(strip(b.stdout))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
