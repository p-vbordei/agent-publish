import { describe, expect, test } from 'bun:test'
import { extractSection, ChangelogError } from '../src/changelog'

const MD = `# Changelog

## [Unreleased]

## [0.2.0] - 2026-04-25

### Added
- thing one
- thing two

### Fixed
- bug

## [0.1.0] - 2026-04-20

### Added
- initial
`

describe('extractSection', () => {
  test('extracts the section for the requested version', () => {
    const out = extractSection(MD, '0.2.0')
    expect(out).toContain('### Added')
    expect(out).toContain('thing one')
    expect(out).toContain('### Fixed')
    expect(out).not.toContain('## [0.1.0]')
    expect(out).not.toContain('initial')
  })

  test('extracts the last section in the file', () => {
    const out = extractSection(MD, '0.1.0')
    expect(out).toContain('initial')
    expect(out).not.toContain('thing one')
  })

  test('throws when version not found', () => {
    expect(() => extractSection(MD, '0.9.9')).toThrow(ChangelogError)
  })

  test('handles version with no date suffix', () => {
    const md = '## [1.0.0]\n\n### Added\n- thing\n'
    expect(extractSection(md, '1.0.0')).toContain('thing')
  })

  test('returns trimmed content', () => {
    const out = extractSection(MD, '0.2.0')
    expect(out).not.toMatch(/^\s/)
    expect(out).not.toMatch(/\s$/)
  })
})
