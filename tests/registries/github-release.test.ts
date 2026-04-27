import { describe, expect, test } from 'bun:test'
import { githubRelease } from '../../src/registries/github-release'
import { RegistryError, type SpawnFn } from '../../src/registries/npm'

describe('githubRelease', () => {
  test('dry-run: skips gh, returns predicted URL', () => {
    let called = false
    const spawn: SpawnFn = () => {
      called = true
      return { stdout: '', stderr: '', code: 0 }
    }
    const r = githubRelease({
      repo: 'p-vbordei/agent-id',
      version: '0.2.0',
      notes: '### Added\n- thing\n',
      draft: false,
      prerelease: false,
      dryRun: true,
      spawn,
      env: {},
      cwd: '/tmp/x',
    })
    expect(called).toBe(false)
    expect(r.url).toBe('https://github.com/p-vbordei/agent-id/releases/tag/v0.2.0')
  })

  test('real release: invokes gh release create with notes file', () => {
    let captured: { cmd: string; args: string[] } | undefined
    const spawn: SpawnFn = (cmd, args) => {
      captured = { cmd, args }
      return {
        stdout: 'https://github.com/p-vbordei/agent-id/releases/tag/v0.2.0\n',
        stderr: '',
        code: 0,
      }
    }
    const r = githubRelease({
      repo: 'p-vbordei/agent-id',
      version: '0.2.0',
      notes: '### Added\n- thing\n',
      draft: false,
      prerelease: false,
      dryRun: false,
      spawn,
      env: {},
      cwd: '/tmp/x',
    })
    expect(captured?.cmd).toBe('gh')
    expect(captured?.args).toContain('release')
    expect(captured?.args).toContain('create')
    expect(captured?.args).toContain('v0.2.0')
    expect(captured?.args).toContain('--notes-file')
    expect(r.url).toBe('https://github.com/p-vbordei/agent-id/releases/tag/v0.2.0')
  })

  test('passes --draft and --prerelease when configured', () => {
    let captured: string[] = []
    const spawn: SpawnFn = (_cmd, args) => {
      captured = args
      return { stdout: 'https://github.com/o/r/releases/tag/v1', stderr: '', code: 0 }
    }
    githubRelease({
      repo: 'o/r',
      version: '1.0.0',
      notes: 'x',
      draft: true,
      prerelease: true,
      dryRun: false,
      spawn,
      env: {},
      cwd: '/tmp/x',
    })
    expect(captured).toContain('--draft')
    expect(captured).toContain('--prerelease')
  })

  test('failure: throws RegistryError', () => {
    const spawn: SpawnFn = () => ({ stdout: '', stderr: 'release exists', code: 1 })
    expect(() =>
      githubRelease({
        repo: 'o/r',
        version: '1.0.0',
        notes: 'x',
        draft: false,
        prerelease: false,
        dryRun: false,
        spawn,
        env: {},
        cwd: '/tmp/x',
      }),
    ).toThrow(RegistryError)
  })
})
