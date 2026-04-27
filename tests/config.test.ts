import { describe, expect, test } from 'bun:test'
import { loadPublishConfig, PublishConfigError } from '../src/config'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function withTmp(content: string, fn: (path: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'ap-cfg-'))
  const path = join(dir, 'publish.yaml')
  writeFileSync(path, content)
  try {
    fn(path)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const VALID = `version: 1
package:
  name: agent-id
  language: typescript-bun
registries:
  - kind: npm
    package: agent-id
    provenance: true
    trusted_publisher: true
  - kind: github-release
    repo: p-vbordei/agent-id
    draft: false
    prerelease: false
`

describe('loadPublishConfig', () => {
  test('parses valid 2-registry config', () => {
    withTmp(VALID, (p) => {
      const cfg = loadPublishConfig(p)
      expect(cfg.version).toBe(1)
      expect(cfg.package.name).toBe('agent-id')
      expect(cfg.registries).toHaveLength(2)
      expect(cfg.registries[0]?.kind).toBe('npm')
      expect(cfg.registries[1]?.kind).toBe('github-release')
    })
  })

  test('npm provenance + trusted_publisher default to true', () => {
    const yaml = `version: 1
package:
  name: x
  language: typescript-bun
registries:
  - kind: npm
`
    withTmp(yaml, (p) => {
      const cfg = loadPublishConfig(p)
      const npm = cfg.registries[0]
      if (npm?.kind === 'npm') {
        expect(npm.provenance).toBe(true)
        expect(npm.trusted_publisher).toBe(true)
      }
    })
  })

  test('rejects empty registries', () => {
    const yaml = `version: 1
package:
  name: x
  language: typescript-bun
registries: []
`
    withTmp(yaml, (p) => expect(() => loadPublishConfig(p)).toThrow(PublishConfigError))
  })

  test('rejects invalid version', () => {
    const yaml = `version: 2
package:
  name: x
  language: typescript-bun
registries:
  - kind: npm
`
    withTmp(yaml, (p) => expect(() => loadPublishConfig(p)).toThrow(/version/))
  })

  test('rejects unknown registry kind', () => {
    const yaml = `version: 1
package:
  name: x
  language: typescript-bun
registries:
  - kind: alien
`
    withTmp(yaml, (p) => expect(() => loadPublishConfig(p)).toThrow())
  })

  test('rejects extra unknown top-level key', () => {
    const yaml = `${VALID}extra: nope
`
    withTmp(yaml, (p) => expect(() => loadPublishConfig(p)).toThrow())
  })

  test('rejects extra unknown package key', () => {
    const yaml = `version: 1
package:
  name: x
  language: typescript-bun
  weird: y
registries:
  - kind: npm
`
    withTmp(yaml, (p) => expect(() => loadPublishConfig(p)).toThrow())
  })

  test('rejects unknown language', () => {
    const yaml = `version: 1
package:
  name: x
  language: rust-cargo
registries:
  - kind: npm
`
    withTmp(yaml, (p) => expect(() => loadPublishConfig(p)).toThrow(/language/))
  })

  test('rejects malformed github-release repo', () => {
    const yaml = `version: 1
package:
  name: x
  language: typescript-bun
registries:
  - kind: github-release
    repo: norepo
`
    withTmp(yaml, (p) => expect(() => loadPublishConfig(p)).toThrow(/repo/))
  })
})
