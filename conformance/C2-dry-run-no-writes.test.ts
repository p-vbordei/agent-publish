import { test, expect } from 'bun:test'
import { npmPublish, type SpawnFn } from '../src/registries/npm'
import { githubRelease } from '../src/registries/github-release'

test('C2 — npm dry-run does not invoke real publish (no --dry-run-strip)', () => {
  let invoked: string[][] = []
  const spawn: SpawnFn = (_cmd, args) => {
    invoked.push(args)
    return { stdout: 'ok', stderr: '', code: 0 }
  }
  npmPublish({
    cwd: '/tmp/x',
    packageName: 'x',
    version: '1.0.0',
    provenance: true,
    trustedPublisher: true,
    dryRun: true,
    spawn,
    env: {},
  })
  expect(invoked).toHaveLength(1) // only one call (no follow-up `npm view` for dry-run)
  expect(invoked[0]).toContain('--dry-run')
})

test('C2 — github-release dry-run never invokes gh', () => {
  let called = false
  const spawn: SpawnFn = () => {
    called = true
    return { stdout: '', stderr: '', code: 0 }
  }
  githubRelease({
    repo: 'o/r',
    version: '1.0.0',
    notes: 'x',
    draft: false,
    prerelease: false,
    dryRun: true,
    spawn,
    env: {},
    cwd: '/tmp/x',
  })
  expect(called).toBe(false)
})
