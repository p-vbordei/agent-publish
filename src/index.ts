import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { loadPublishConfig, PublishConfigError } from './config'
import { detectVersion, VersionError } from './version'
import { extractSection, ChangelogError } from './changelog'
import { buildManifest, emptyResultsFor } from './manifest'
import type { RegistryResult } from './manifest'

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
    const dryRun = process.argv.includes('--dry-run')
    const fromTagIdx = process.argv.indexOf('--from-tag')
    const fromTag = fromTagIdx > -1 ? process.argv[fromTagIdx + 1] : undefined

    let version: string
    let notes: string
    try {
      version = detectVersion(cwd)
      notes = extractSection(readFileSync(resolve(cwd, 'CHANGELOG.md'), 'utf8'), version)
      const { precheck } = await import('./precheck')
      precheck(cwd, version, fromTag !== undefined ? { fromTag } : {})
    } catch (err) {
      console.error((err as Error).message)
      process.exit(2)
    }

    const { npmPublish } = await import('./registries/npm')
    const { githubRelease } = await import('./registries/github-release')
    const { spawnSync } = await import('node:child_process')
    const spawn = (
      c: string,
      args: string[],
      o: { cwd: string; env: Record<string, string | undefined> },
    ) => {
      const r = spawnSync(c, args, {
        cwd: o.cwd,
        env: o.env as NodeJS.ProcessEnv,
        encoding: 'utf8',
      })
      return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', code: r.status ?? -1 }
    }

    const results: RegistryResult[] = []
    let failed = false
    for (const reg of cfg.registries) {
      try {
        if (reg.kind === 'npm') {
          results.push(
            npmPublish({
              cwd,
              packageName: reg.package ?? cfg.package.name,
              version,
              provenance: reg.provenance,
              trustedPublisher: reg.trusted_publisher,
              dryRun,
              spawn,
              env: process.env,
            }),
          )
        } else {
          results.push(
            githubRelease({
              repo: reg.repo,
              version,
              notes,
              draft: reg.draft,
              prerelease: reg.prerelease,
              dryRun,
              spawn,
              env: process.env,
              cwd,
            }),
          )
        }
      } catch (err) {
        failed = true
        console.error((err as Error).message)
      }
    }

    const manifest = buildManifest({ cfg, version, taggedAt: new Date(), results })
    console.log(JSON.stringify(manifest, null, 2))
    process.exit(failed ? 3 : 0)
  }

  usage()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
