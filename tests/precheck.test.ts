import { describe, expect, test } from 'bun:test'
import { precheck, PrecheckError } from '../src/precheck'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

function git(args: string[], cwd: string) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if ((r.status ?? -1) !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`)
  }
  return r.stdout?.trim() ?? ''
}

function setupRepo(opts: { tagName?: string; dirty?: boolean; tagAtFirstCommit?: boolean } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ap-pre-'))
  git(['init', '-b', 'main'], dir)
  git(['config', 'user.email', 'test@example.com'], dir)
  git(['config', 'user.name', 'Test'], dir)
  writeFileSync(join(dir, 'README.md'), '# x\n')
  git(['add', '.'], dir)
  git(['commit', '-m', 'initial'], dir)
  if (opts.tagAtFirstCommit && opts.tagName) {
    git(['tag', '-a', opts.tagName, '-m', opts.tagName], dir)
    // Make a 2nd commit so HEAD != tag.
    writeFileSync(join(dir, 'README.md'), '# x v2\n')
    git(['add', '.'], dir)
    git(['commit', '-m', 'second'], dir)
  } else if (opts.tagName) {
    git(['tag', '-a', opts.tagName, '-m', opts.tagName], dir)
  }
  if (opts.dirty) writeFileSync(join(dir, 'README.md'), '# dirty\n')
  return dir
}

describe('precheck', () => {
  test('passes when tree is clean and HEAD matches tag', () => {
    const dir = setupRepo({ tagName: 'v0.1.0' })
    try {
      expect(() => precheck(dir, '0.1.0')).not.toThrow()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('rejects dirty working tree', () => {
    const dir = setupRepo({ tagName: 'v0.1.0', dirty: true })
    try {
      expect(() => precheck(dir, '0.1.0')).toThrow(/dirty/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('rejects when tag missing', () => {
    const dir = setupRepo()
    try {
      expect(() => precheck(dir, '0.1.0')).toThrow(/v0\.1\.0/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('rejects when HEAD does not match tag', () => {
    const dir = setupRepo({ tagName: 'v0.1.0', tagAtFirstCommit: true })
    try {
      expect(() => precheck(dir, '0.1.0')).toThrow(PrecheckError)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('honors --from-tag override', () => {
    const dir = setupRepo({ tagName: 'release-0.1.0' })
    try {
      expect(() => precheck(dir, '0.1.0', { fromTag: 'release-0.1.0' })).not.toThrow()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
