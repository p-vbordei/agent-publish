import { readFileSync } from 'node:fs'
import { load } from 'js-yaml'
import { z } from 'zod'

export class PublishConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PublishConfigError'
  }
}

const NpmRegistrySchema = z
  .object({
    kind: z.literal('npm'),
    package: z
      .string()
      .regex(/^(@[^/]+\/)?[a-z0-9][a-z0-9._-]*$/, 'invalid npm package name')
      .optional(),
    provenance: z.boolean().default(true),
    trusted_publisher: z.boolean().default(true),
  })
  .strict()

const GithubReleaseSchema = z
  .object({
    kind: z.literal('github-release'),
    repo: z.string().regex(/^[^/]+\/[^/]+$/, 'repo must be "owner/name"'),
    draft: z.boolean().default(false),
    prerelease: z.boolean().default(false),
  })
  .strict()

const RegistrySchema = z.discriminatedUnion('kind', [NpmRegistrySchema, GithubReleaseSchema])

const PackageSchema = z
  .object({
    name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    language: z.literal('typescript-bun'),
  })
  .strict()

const PublishConfigSchema = z
  .object({
    version: z.literal(1),
    package: PackageSchema,
    registries: z.array(RegistrySchema).min(1, 'registries must contain at least one entry'),
  })
  .strict()

export type PublishConfig = z.infer<typeof PublishConfigSchema>
export type RegistrySpec = z.infer<typeof RegistrySchema>
export type NpmRegistry = z.infer<typeof NpmRegistrySchema>
export type GithubReleaseRegistry = z.infer<typeof GithubReleaseSchema>

export function loadPublishConfig(path: string): PublishConfig {
  let raw: unknown
  try {
    raw = load(readFileSync(path, 'utf8'))
  } catch (err) {
    throw new PublishConfigError(`failed to read or parse ${path}: ${(err as Error).message}`)
  }
  const result = PublishConfigSchema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ')
    throw new PublishConfigError(`invalid publish.yaml: ${issues}`)
  }
  return result.data
}
