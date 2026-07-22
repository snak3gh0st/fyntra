import { randomUUID } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'

export function sanitizeFilename(name: string): string {
  const parts = name.split(/[/\\]/).filter((part) => part && part !== '..')
  const base = parts.join('_') || 'file'
  return base.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function buildStoredPath(
  policyId: string,
  originalFilename: string,
  uuidGenerator: () => string = randomUUID,
  subdir?: string,
): string {
  const safeName = sanitizeFilename(originalFilename)
  const base = `policies/${policyId}`
  if (!subdir) return `${base}/${uuidGenerator()}-${safeName}`
  return `${base}/${subdir}/${uuidGenerator()}-${safeName}`
}

export async function saveUploadedFile(
  uploadsDir: string,
  relativePath: string,
  buffer: Buffer,
): Promise<void> {
  const fullPath = join(uploadsDir, relativePath)
  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, buffer)
}

export async function readStoredFile(uploadsDir: string, relativePath: string): Promise<Buffer> {
  return readFile(join(uploadsDir, relativePath))
}
