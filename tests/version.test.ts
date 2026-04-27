import { describe, expect, test } from 'bun:test'
import { detectVersion, VersionError } from '../src/version'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function withTmp(pkgJson: object | string, fn: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'ap-ver-'))
  const content = typeof pkgJson === 'string' ? pkgJson : JSON.stringify(pkgJson)
  writeFileSync(join(dir, 'package.json'), content)
  try {
    fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('detectVersion', () => {
  test('reads valid semver', () => {
    withTmp({ name: 'x', version: '1.2.3' }, (dir) => {
      expect(detectVersion(dir)).toBe('1.2.3')
    })
  })

  test('reads pre-release semver', () => {
    withTmp({ name: 'x', version: '1.2.3-rc.1' }, (dir) => {
      expect(detectVersion(dir)).toBe('1.2.3-rc.1')
    })
  })

  test('rejects missing version', () => {
    withTmp({ name: 'x' }, (dir) => {
      expect(() => detectVersion(dir)).toThrow(VersionError)
    })
  })

  test('rejects non-semver version', () => {
    withTmp({ name: 'x', version: 'banana' }, (dir) => {
      expect(() => detectVersion(dir)).toThrow(/semver/)
    })
  })

  test('rejects malformed JSON', () => {
    withTmp('{not json', (dir) => {
      expect(() => detectVersion(dir)).toThrow(VersionError)
    })
  })

  test('rejects missing package.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ap-ver-'))
    try {
      expect(() => detectVersion(dir)).toThrow(VersionError)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
