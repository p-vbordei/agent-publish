import { test, expect, describe } from 'bun:test'
import { loadPublishConfig, PublishConfigError } from '../src/config'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function withTmp(yaml: string, fn: (path: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'c5-'))
  const p = join(dir, 'publish.yaml')
  writeFileSync(p, yaml)
  try {
    fn(p)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('C5 — publish.yaml strict schema', () => {
  test('rejects empty registries', () => {
    withTmp(
      `version: 1
package:
  name: x
  language: typescript-bun
registries: []
`,
      (p) => expect(() => loadPublishConfig(p)).toThrow(PublishConfigError),
    )
  })

  test('rejects missing version key', () => {
    withTmp(
      `package:
  name: x
  language: typescript-bun
registries:
  - kind: npm
`,
      (p) => expect(() => loadPublishConfig(p)).toThrow(PublishConfigError),
    )
  })

  test('rejects unknown top-level key', () => {
    withTmp(
      `version: 1
package:
  name: x
  language: typescript-bun
registries:
  - kind: npm
extra: y
`,
      (p) => expect(() => loadPublishConfig(p)).toThrow(),
    )
  })

  test('rejects unknown registry kind', () => {
    withTmp(
      `version: 1
package:
  name: x
  language: typescript-bun
registries:
  - kind: alien
`,
      (p) => expect(() => loadPublishConfig(p)).toThrow(),
    )
  })

  test('rejects unknown package field', () => {
    withTmp(
      `version: 1
package:
  name: x
  language: typescript-bun
  weird: y
registries:
  - kind: npm
`,
      (p) => expect(() => loadPublishConfig(p)).toThrow(),
    )
  })

  test('rejects unknown registry field (npm)', () => {
    withTmp(
      `version: 1
package:
  name: x
  language: typescript-bun
registries:
  - kind: npm
    weird: y
`,
      (p) => expect(() => loadPublishConfig(p)).toThrow(),
    )
  })

  test('rejects malformed github-release repo', () => {
    withTmp(
      `version: 1
package:
  name: x
  language: typescript-bun
registries:
  - kind: github-release
    repo: norepo
`,
      (p) => expect(() => loadPublishConfig(p)).toThrow(/repo/),
    )
  })

  test('rejects unknown language', () => {
    withTmp(
      `version: 1
package:
  name: x
  language: rust-cargo
registries:
  - kind: npm
`,
      (p) => expect(() => loadPublishConfig(p)).toThrow(/language/),
    )
  })
})
