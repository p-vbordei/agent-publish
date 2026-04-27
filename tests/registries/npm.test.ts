import { describe, expect, test } from 'bun:test'
import { npmPublish, RegistryError, type SpawnFn } from '../../src/registries/npm'

function makeSpawn(scripted: Array<{ stdout?: string; stderr?: string; code?: number }>): SpawnFn {
  let i = 0
  return (cmd, args, _opts) => {
    const r = scripted[i] ?? {}
    i++
    return {
      stdout: r.stdout ?? '',
      stderr: r.stderr ?? '',
      code: r.code ?? 0,
    }
  }
}

describe('npmPublish', () => {
  test('dry-run: invokes npm publish --dry-run --provenance and returns result without URL', () => {
    let captured: { cmd: string; args: string[] } | undefined
    const spawn: SpawnFn = (cmd, args) => {
      captured = { cmd, args }
      return { stdout: '+ agent-id@0.2.0', stderr: '', code: 0 }
    }
    const r = npmPublish({
      cwd: '/tmp/x',
      packageName: 'agent-id',
      version: '0.2.0',
      provenance: true,
      trustedPublisher: true,
      dryRun: true,
      spawn,
      env: {},
    })
    expect(captured?.cmd).toBe('npm')
    expect(captured?.args).toContain('--dry-run')
    expect(captured?.args).toContain('--provenance')
    expect(r.url).toBeUndefined()
    expect(r.package).toBe('agent-id')
  })

  test('real publish: invokes without --dry-run, queries integrity, returns full result', () => {
    const spawn = makeSpawn([
      { stdout: '+ agent-id@0.2.0', code: 0 },
      { stdout: '"sha512-abc123=="', code: 0 },
    ])
    const r = npmPublish({
      cwd: '/tmp/x',
      packageName: 'agent-id',
      version: '0.2.0',
      provenance: true,
      trustedPublisher: true,
      dryRun: false,
      spawn,
      env: {},
    })
    expect(r.name).toBe('npm')
    expect(r.url).toBe('https://www.npmjs.com/package/agent-id/v/0.2.0')
    expect(r.sha256).toBe('sha512-abc123==')
    expect(r.provenance).toBe(true)
  })

  test('publish failure: throws RegistryError', () => {
    const spawn = makeSpawn([{ stderr: 'EPUBLISHCONFLICT', code: 1 }])
    expect(() =>
      npmPublish({
        cwd: '/tmp/x',
        packageName: 'agent-id',
        version: '0.2.0',
        provenance: true,
        trustedPublisher: true,
        dryRun: false,
        spawn,
        env: {},
      }),
    ).toThrow(RegistryError)
  })

  test('trusted_publisher:false requires NPM_TOKEN env, errors otherwise', () => {
    const spawn = makeSpawn([{ code: 0 }])
    expect(() =>
      npmPublish({
        cwd: '/tmp/x',
        packageName: 'agent-id',
        version: '0.2.0',
        provenance: true,
        trustedPublisher: false,
        dryRun: false,
        spawn,
        env: {},
      }),
    ).toThrow(/NPM_TOKEN/)
  })

  test('trusted_publisher:false with NPM_TOKEN writes ephemeral .npmrc and uses --userconfig', () => {
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
      trustedPublisher: false,
      dryRun: true,
      spawn,
      env: { NPM_TOKEN: 'npm_FAKE' },
    })
    expect(captured).toContain('--userconfig')
  })
})
