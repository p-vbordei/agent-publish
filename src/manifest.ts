import type { PublishConfig, RegistrySpec } from './config'

export interface RegistryResult {
  name: 'npm' | 'github-release'
  url?: string
  package?: string
  version?: string
  sha256?: string
  provenance?: boolean
}

export interface ReleaseManifest {
  schema: 'agent-publish/release-manifest/v1'
  version: string
  repo: string
  tagged_at: string
  registries: RegistryResult[]
}

export function buildManifest(args: {
  cfg: PublishConfig
  version: string
  taggedAt: Date
  results: RegistryResult[]
}): ReleaseManifest {
  return {
    schema: 'agent-publish/release-manifest/v1',
    version: args.version,
    repo: inferRepo(args.cfg),
    tagged_at: args.taggedAt.toISOString(),
    registries: args.results,
  }
}

function inferRepo(cfg: PublishConfig): string {
  const gh = cfg.registries.find(
    (r): r is Extract<RegistrySpec, { kind: 'github-release' }> => r.kind === 'github-release',
  )
  return gh?.repo ?? '<unknown>'
}

export function emptyResultsFor(cfg: PublishConfig): RegistryResult[] {
  return cfg.registries.map((r) => {
    if (r.kind === 'npm') {
      const out: RegistryResult = { name: 'npm', provenance: r.provenance }
      if (r.package !== undefined) out.package = r.package
      return out
    }
    return { name: 'github-release' }
  })
}
