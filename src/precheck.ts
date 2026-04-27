import { spawnSync } from 'node:child_process'

export class PrecheckError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PrecheckError'
  }
}

function git(args: string[], cwd: string): { stdout: string; code: number } {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' })
  return { stdout: (r.stdout ?? '').trim(), code: r.status ?? -1 }
}

export function precheck(cwd: string, version: string, opts: { fromTag?: string } = {}): void {
  const status = git(['status', '--porcelain'], cwd)
  if (status.code !== 0) {
    throw new PrecheckError(`not a git repository at ${cwd}`)
  }
  if (status.stdout.length > 0) {
    throw new PrecheckError('working tree is dirty; commit or stash before publishing')
  }
  const expectedTag = opts.fromTag ?? `v${version}`
  const tagSha = git(['rev-list', '-n', '1', expectedTag], cwd)
  if (tagSha.code !== 0) {
    throw new PrecheckError(`tag ${expectedTag} not found`)
  }
  const headSha = git(['rev-parse', 'HEAD'], cwd)
  if (tagSha.stdout !== headSha.stdout) {
    throw new PrecheckError(
      `HEAD (${headSha.stdout.slice(0, 7)}) does not match tag ${expectedTag} (${tagSha.stdout.slice(0, 7)})`,
    )
  }
}
