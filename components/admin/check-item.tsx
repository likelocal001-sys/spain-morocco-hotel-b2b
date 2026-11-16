'use client'

import { useRef, useState } from 'react'
import { AlertTriangle, Paperclip, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { downloadAttachment, uploadAttachment, validateAttachment } from '@/lib/attachments'
import { useApp } from '@/lib/store'
import type { CheckRecord } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ConfirmAction } from './confirm-action'

function formatStamp(at: string, lang: 'ko' | 'es') {
  return new Date(at).toLocaleString(lang === 'ko' ? 'ko-KR' : 'es-ES', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * One checklist row. Records who ticked it and when; when `evidenceHint` is set the box can
 * only be ticked by uploading a screenshot/PDF of the email that proves the step was done.
 */
export function CheckItem({
  label,
  index,
  checked,
  record,
  evidenceHint,
  onChange,
}: {
  label: string
  index?: number
  checked: boolean
  record?: CheckRecord
  evidenceHint?: string
  onChange: (on: boolean, record?: CheckRecord) => void
}) {
  const { t, lang, profile } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [confirmingUncheck, setConfirmingUncheck] = useState(false)
  const needsEvidence = Boolean(evidenceHint)
  const missingEvidence = needsEvidence && checked && !record?.evidence

  const stamp = (evidence?: CheckRecord['evidence']): CheckRecord => ({
    at: new Date().toISOString(),
    byId: profile.id,
    byName: profile.fullName || profile.email,
    ...(evidence ? { evidence } : {}),
  })

  function handleToggle(on: boolean) {
    if (!on) {
      if (record?.evidence) setConfirmingUncheck(true)
      else onChange(false)
      return
    }
    if (needsEvidence) fileRef.current?.click()
    else onChange(true, stamp())
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    const problem = validateAttachment(file, 'evidence')
    if (problem) {
      toast.error(problem === 'type' ? t.evidenceFileError : t.errFileSize)
      return
    }
    setUploading(true)
    try {
      const evidence = await uploadAttachment(file, 'evidence')
      onChange(true, stamp(evidence))
      toast.success(t.evidenceAttachedToast)
    } catch {
      toast.error(t.uploadFailed)
    } finally {
      setUploading(false)
    }
  }

  async function openEvidence() {
    if (!record?.evidence) return
    const result = await downloadAttachment(record.evidence)
    if (result !== 'ok') toast.error(t.downloadFailed)
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-lg border px-3 py-2 text-xs transition-colors',
        missingEvidence
          ? 'border-destructive/40 bg-destructive/5'
          : checked
            ? 'border-primary/30 bg-secondary'
            : 'hover:bg-muted/60',
      )}
    >
      <Label className="cursor-pointer text-xs font-normal">
        <Checkbox checked={checked} disabled={uploading} onCheckedChange={(on) => handleToggle(Boolean(on))} />
        {index != null && <span className="font-mono text-[11px] text-muted-foreground">{index}</span>}
        <span className={cn(checked && !missingEvidence && 'text-muted-foreground line-through')}>{label}</span>
        {needsEvidence && !checked && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-sm bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning-foreground">
            <Paperclip className="size-3" aria-hidden="true" />
            {t.evidenceRequired}
          </span>
        )}
      </Label>

      {needsEvidence && !checked && (
        <p className="pl-6 text-[11px] text-muted-foreground">
          {uploading ? t.uploading : evidenceHint}
        </p>
      )}

      {checked && (record || missingEvidence) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-6 text-[11px] text-muted-foreground">
          {record && (
            <span className="font-mono">
              {record.byName} · {formatStamp(record.at, lang)}
            </span>
          )}
          {record?.evidence && (
            <button
              type="button"
              onClick={openEvidence}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <Paperclip className="size-3" aria-hidden="true" />
              {t.evidenceView}
            </button>
          )}
          {missingEvidence && (
            <>
              <span className="inline-flex items-center gap-1 font-medium text-destructive">
                <AlertTriangle className="size-3" aria-hidden="true" />
                {t.evidenceMissing}
              </span>
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload aria-hidden="true" />
                {uploading ? t.uploading : t.evidenceUpload}
              </Button>
            </>
          )}
        </div>
      )}

      {needsEvidence && (
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="sr-only"
          tabIndex={-1}
          aria-label={`${label} · ${evidenceHint}`}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            void handleFile(file)
          }}
        />
      )}

      {confirmingUncheck && (
        <ConfirmAction
          title={t.uncheckEvidenceTitle}
          description={t.uncheckEvidenceDesc}
          confirmLabel={t.uncheck}
          destructive
          onCancel={() => setConfirmingUncheck(false)}
          onConfirm={() => {
            setConfirmingUncheck(false)
            onChange(false)
          }}
        />
      )}
    </div>
  )
}
