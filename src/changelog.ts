export class ChangelogError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ChangelogError'
  }
}

export function extractSection(content: string, version: string): string {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Match "## [<version>]" optionally followed by metadata then capture content
  // until the next "## [" heading at line start, or EOF.
  const re = new RegExp(
    `^## \\[${escaped}\\][^\\n]*\\n([\\s\\S]*?)(?=^## \\[|$(?![\\r\\n]))`,
    'm',
  )
  const match = content.match(re)
  if (!match || match[1] === undefined) {
    throw new ChangelogError(`version ${version} not found in CHANGELOG.md`)
  }
  return match[1].trim()
}
