import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { RegistryResult } from '../manifest'

export class RegistryError extends Error {
  registry: string
  constructor(registry: string, message: string) {
    super(`[${registry}] ${message}`)
    this.name = 'RegistryError'
    this.registry = registry
  }
}

export type SpawnFn = (
  cmd: string,
  args: string[],
  opts: { cwd: string; env: Record<string, string | undefined> },
) => { stdout: string; stderr: string; code: number }

export interface NpmPublishOpts {
  cwd: string
  packageName: string
  version: string
  provenance: boolean
  trustedPublisher: boolean
  dryRun: boolean
  spawn: SpawnFn
  env: Record<string, string | undefined>
}

export function npmPublish(opts: NpmPublishOpts): RegistryResult {
  const args = ['publish']
  if (opts.provenance) args.push('--provenance')
  if (opts.dryRun) args.push('--dry-run')
  args.push('--access', 'public')

  let userconfig: string | undefined
  let tmpdirPath: string | undefined
  if (!opts.trustedPublisher) {
    const token = opts.env['NPM_TOKEN']
    if (!token) {
      throw new RegistryError(
        'npm',
        'NPM_TOKEN required when trusted_publisher: false',
      )
    }
    tmpdirPath = mkdtempSync(join(tmpdir(), 'agent-publish-npmrc-'))
    userconfig = join(tmpdirPath, '.npmrc')
    writeFileSync(userconfig, `//registry.npmjs.org/:_authToken=${token}\n`, { mode: 0o600 })
    args.push('--userconfig', userconfig)
  }

  try {
    const r = opts.spawn('npm', args, { cwd: opts.cwd, env: opts.env })
    if (r.code !== 0) {
      const tail = (r.stderr || r.stdout).trim().slice(-500)
      throw new RegistryError('npm', `npm publish exited ${r.code}: ${tail}`)
    }
    if (opts.dryRun) {
      return {
        name: 'npm',
        package: opts.packageName,
        version: opts.version,
        provenance: opts.provenance,
      }
    }
    // Post-publish: query integrity hash.
    const view = opts.spawn(
      'npm',
      ['view', `${opts.packageName}@${opts.version}`, 'dist.integrity', '--json'],
      { cwd: opts.cwd, env: opts.env },
    )
    let integrity = ''
    if (view.code === 0 && view.stdout.trim().length > 0) {
      try {
        const parsed = JSON.parse(view.stdout.trim())
        if (typeof parsed === 'string') integrity = parsed
      } catch {
        // tolerate parse failure; sha256 stays empty
      }
    }
    return {
      name: 'npm',
      package: opts.packageName,
      version: opts.version,
      url: `https://www.npmjs.com/package/${opts.packageName}/v/${opts.version}`,
      sha256: integrity,
      provenance: opts.provenance,
    }
  } finally {
    if (tmpdirPath) rmSync(tmpdirPath, { recursive: true, force: true })
  }
}
