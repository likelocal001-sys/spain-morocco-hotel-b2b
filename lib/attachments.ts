import { createClient } from '@/lib/supabase/client'
import type { AttachedFile } from '@/lib/types'

// Private bucket. Created with access policies by supabase/migrations/20261107_attachments_storage.sql
export const ATTACHMENT_BUCKET = 'attachments'
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024

export type AttachmentFolder = 'rooming' | 'voucher'

const MIME_BY_EXT: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export const ATTACHMENT_EXTENSIONS: Record<AttachmentFolder, string[]> = {
  rooming: ['xlsx', 'xls', 'pdf'],
  voucher: ['pdf', 'png', 'jpg', 'jpeg', 'webp'],
}

export const fileExtension = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '')

export type AttachmentProblem = 'type' | 'size'

/** Client-side check that mirrors the bucket's allowed MIME types and size limit. */
export function validateAttachment(file: File, folder: AttachmentFolder): AttachmentProblem | null {
  if (!ATTACHMENT_EXTENSIONS[folder].includes(fileExtension(file.name))) return 'type'
  if (file.size > MAX_ATTACHMENT_BYTES) return 'size'
  return null
}

export async function uploadAttachment(file: File, folder: AttachmentFolder): Promise<AttachedFile> {
  const ext = fileExtension(file.name)
  const path = `${folder}/${crypto.randomUUID()}.${ext || 'bin'}`
  // Browsers often report an empty type for .xlsx/.xls; derive it from the extension
  // so the bucket's allowed_mime_types check does not reject the upload.
  const contentType = MIME_BY_EXT[ext] ?? (file.type || 'application/octet-stream')
  const { error } = await createClient()
    .storage.from(ATTACHMENT_BUCKET)
    .upload(path, file, { contentType, upsert: false, cacheControl: '3600' })
  if (error) throw error
  return { name: file.name, size: file.size, path }
}

export type DownloadResult = 'ok' | 'legacy' | 'failed'

export async function downloadAttachment(file: AttachedFile): Promise<DownloadResult> {
  // Files attached before Storage was introduced only kept their name in the browser.
  if (!file.path) return 'legacy'
  const { data, error } = await createClient()
    .storage.from(ATTACHMENT_BUCKET)
    .createSignedUrl(file.path, 60, { download: file.name })
  if (error || !data?.signedUrl) return 'failed'
  const link = document.createElement('a')
  link.href = data.signedUrl
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  return 'ok'
}
