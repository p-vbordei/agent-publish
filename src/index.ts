import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { loadPublishConfig, PublishConfigError } from './config'
import { detectVersion, VersionError } from './version'
import { extractSection, ChangelogError } from './changelog'
import { buildManifest, emptyResultsFor } from './manifest'

function usage(): never {
  console.error('Usage: agent-publish <publish|manifest> [args]')
  process.exit(64)
}

async function main() {
  const [, , cmd] = process.argv
  if (!cmd) usage()

  const cwd = process.cwd()
  let cfg
  try {
    cfg = loadPublishConfig(resolve(cwd, 'publish.yaml'))
  } catch (err) {
    if (err instanceof PublishConfigError) {
      console.error(err.message)
      process.exit(1)
    }
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`publish.yaml not found at ${resolve(cwd, 'publish.yaml')}`)
      process.exit(1)
    }
    throw err
  }

  if (cmd === 'manifest') {
    try {
      const version = detectVersion(cwd)
      const chPath = resolve(cwd, 'CHANGELOG.md')
      // Verify the CHANGELOG section exists (don't print it for `manifest`):
      extractSection(readFileSync(chPath, 'utf8'), version)
      const manifest = buildManifest({
        cfg,
        version,
        taggedAt: new Date(),
        results: emptyResultsFor(cfg),
      })
      console.log(JSON.stringify(manifest, null, 2))
      process.exit(0)
    } catch (err) {
      if (err instanceof VersionError || err instanceof ChangelogError) {
        console.error(err.message)
        process.exit(1)
      }
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        console.error(`CHANGELOG.md not found at ${resolve(cwd, 'CHANGELOG.md')}`)
        process.exit(1)
      }
      throw err
    }
  }

  if (cmd === 'publish') {
    console.error('publish: not yet implemented (Stage 2.2)')
    process.exit(2)
  }

  usage()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
