import { test, expect } from 'bun:test'
import { npmPublish, type SpawnFn } from '../../src/registries/npm'

test('S5 — provenance:true is propagated to npm publish args', () => {
  let captured: string[] = []
  const spawn: SpawnFn = (_cmd, args) => {
    captured = args
    return { stdout: '+ x@1.0.0', stderr: '', code: 0 }
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
  expect(captured).toContain('--provenance')
})

test('S5 — provenance:false omits --provenance from npm publish args', () => {
  let captured: string[] = []
  const spawn: SpawnFn = (_cmd, args) => {
    captured = args
    return { stdout: '+ x@1.0.0', stderr: '', code: 0 }
  }
  npmPublish({
    cwd: '/tmp/x',
    packageName: 'x',
    version: '1.0.0',
    provenance: false,
    trustedPublisher: true,
    dryRun: true,
    spawn,
    env: {},
  })
  expect(captured).not.toContain('--provenance')
})

test('S5 — published result records the provenance flag', () => {
  const spawn: SpawnFn = () => ({ stdout: '+ x@1.0.0', stderr: '', code: 0 })
  const r = npmPublish({
    cwd: '/tmp/x',
    packageName: 'x',
    version: '1.0.0',
    provenance: true,
    trustedPublisher: true,
    dryRun: true,
    spawn,
    env: {},
  })
  expect(r.provenance).toBe(true)
})
