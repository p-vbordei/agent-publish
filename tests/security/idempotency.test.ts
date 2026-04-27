import { test, expect } from 'bun:test'
import { npmPublish, RegistryError, type SpawnFn } from '../../src/registries/npm'

test('S3 — npm publish failure (e.g., EPUBLISHCONFLICT) surfaces as RegistryError, no swallow', () => {
  const spawn: SpawnFn = () => ({
    stdout: '',
    stderr: 'npm error code EPUBLISHCONFLICT\nnpm error 403 You cannot publish over the previously published versions',
    code: 1,
  })
  expect(() =>
    npmPublish({
      cwd: '/tmp/x',
      packageName: 'x',
      version: '1.0.0',
      provenance: true,
      trustedPublisher: true,
      dryRun: false,
      spawn,
      env: {},
    }),
  ).toThrow(RegistryError)

  // Verify the error message includes the relevant npm output for diagnosis.
  let captured: Error | undefined
  try {
    npmPublish({
      cwd: '/tmp/x',
      packageName: 'x',
      version: '1.0.0',
      provenance: true,
      trustedPublisher: true,
      dryRun: false,
      spawn,
      env: {},
    })
  } catch (err) {
    captured = err as Error
  }
  expect(captured?.message).toMatch(/EPUBLISHCONFLICT/)
})
