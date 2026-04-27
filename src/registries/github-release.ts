import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { RegistryResult } from '../manifest'
import { RegistryError, type SpawnFn } from './npm'

export interface GithubReleaseOpts {
  repo: string
  version: string
  notes: string
  draft: boolean
  prerelease: boolean
  dryRun: boolean
  spawn: SpawnFn
  env: Record<string, string | undefined>
  cwd: string
}

export function githubRelease(opts: GithubReleaseOpts): RegistryResult {
  const tag = `v${opts.version}`
  if (opts.dryRun) {
    return {
      name: 'github-release',
      url: `https://github.com/${opts.repo}/releases/tag/${tag}`,
    }
  }
  const dir = mkdtempSync(join(tmpdir(), 'agent-publish-notes-'))
  const notesPath = join(dir, 'notes.md')
  writeFileSync(notesPath, opts.notes)
  try {
    const args = [
      'release',
      'create',
      tag,
      '--repo',
      opts.repo,
      '--title',
      tag,
      '--notes-file',
      notesPath,
    ]
    if (opts.draft) args.push('--draft')
    if (opts.prerelease) args.push('--prerelease')
    const r = opts.spawn('gh', args, { cwd: opts.cwd, env: opts.env })
    if (r.code !== 0) {
      const tail = (r.stderr || r.stdout).trim().slice(-500)
      throw new RegistryError('github-release', `gh release create exited ${r.code}: ${tail}`)
    }
    const urlMatch = r.stdout.match(/https:\/\/github\.com\/[^\s]+/)
    return {
      name: 'github-release',
      url: urlMatch?.[0] ?? `https://github.com/${opts.repo}/releases/tag/${tag}`,
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
