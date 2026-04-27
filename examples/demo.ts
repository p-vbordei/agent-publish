// agent-publish demo — runs in <1s, no API keys, no network.
// Shows the manifest the `publish` command WOULD emit for a fixture package.
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const fixture = resolve(import.meta.dir, 'demo-fixture')
const cli = resolve(import.meta.dir, '..', 'src', 'index.ts')
const r = spawnSync('bun', ['run', cli, 'manifest'], { cwd: fixture, encoding: 'utf8' })
process.stdout.write(r.stdout)
process.stderr.write(r.stderr)
process.exit(r.status ?? 1)
