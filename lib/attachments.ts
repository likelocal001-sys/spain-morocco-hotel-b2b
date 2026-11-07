import { createClient } from '@/lib/supabase/client'
import type { AttachedFile } from '@/lib/types'

const BUCKET = 'attachments'

export async function uploadAttachment(file: File, folder: 'rooming' | 'voucher'): Promise<AttachedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await createClient()
    .storage.from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false })
  if (error) throw error
  return { name: file.name, size: file.size, path }
}

export async function downloadAttachment(file: AttachedFile): Promise<boolean> {
  if (!file.path) return false
  const { data, error } = await createClient()
    .storage.from(BUCKET)
    .createSignedUrl(file.path, 60, { download: file.name })
  if (error || !data?.signedUrl) return false
  const link = document.createElement('a')
  link.href = data.signedUrl
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  return true
}
