'use client'

import { toast } from 'sonner'
import { downloadAttachment } from '@/lib/attachments'
import { useApp } from '@/lib/store'
import type { AttachedFile } from '@/lib/types'

export function useAttachmentDownload() {
  const { t } = useApp()
  return async (file: AttachedFile) => {
    const result = await downloadAttachment(file)
    if (result === 'legacy') toast.error(t.fileUnavailable, { description: file.name })
    else if (result === 'failed') toast.error(t.downloadFailed, { description: file.name })
  }
}
