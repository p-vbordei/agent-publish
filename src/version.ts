import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export class VersionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VersionError'
  }
}

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[\w.-]+)?(?:\+[\w.-]+)?$/

export function detectVersion(repoDir: string): string {
  const pkgPath = join(repoDir, 'package.json')
  let pkg: { version?: unknown }
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch (err) {
    throw new VersionError(`cannot read or parse ${pkgPath}: ${(err as Error).message}`)
  }
  const v = pkg.version
  if (typeof v !== 'string') {
    throw new VersionError('package.json missing string "version" field')
  }
  if (!SEMVER.test(v)) {
    throw new VersionError(`package.json version "${v}" is not valid semver`)
  }
  return v
}
