import { test, expect } from 'bun:test'
import { precheck, PrecheckError } from '../../src/precheck'
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

test('S2 — refuse publish when HEAD does not match the v<version> tag', () => {
  const dir = mkdtempSync(join(tmpdir(), 's2-'))
  try {
    git(['init', '-b', 'main'], dir)
    git(['config', 'user.email', 't@example.com'], dir)
    git(['config', 'user.name', 'T'], dir)
    writeFileSync(join(dir, 'README.md'), '# x\n')
    git(['add', '.'], dir)
    git(['commit', '-m', 'initial'], dir)
    git(['tag', '-a', 'v0.1.0', '-m', 'v0.1.0'], dir)
    // Now move HEAD forward — tag stays put.
    writeFileSync(join(dir, 'README.md'), '# x v2\n')
    git(['add', '.'], dir)
    git(['commit', '-m', 'second'], dir)

    expect(() => precheck(dir, '0.1.0')).toThrow(PrecheckError)
    expect(() => precheck(dir, '0.1.0')).toThrow(/HEAD.*does not match/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
