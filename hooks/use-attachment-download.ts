'use client'

import { toast } from 'sonner'
import { downloadAttachment } from '@/lib/attachments'
import { useApp } from '@/lib/store'
import type { AttachedFile } from '@/lib/types'

export function useAttachmentDownload() {
  const { t } = useApp()
  return async (file: AttachedFile) => {
    const ok = await downloadAttachment(file)
    if (!ok) toast.error(t.fileUnavailable, { description: file.name })
  }
}
