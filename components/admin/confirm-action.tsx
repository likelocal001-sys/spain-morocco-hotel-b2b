'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useApp } from '@/lib/store'

export function ConfirmAction({
  title,
  description,
  confirmLabel,
  destructive,
  children,
  onConfirm,
  onCancel,
}: {
  title: string
  description?: React.ReactNode
  confirmLabel: string
  destructive?: boolean
  children?: React.ReactNode
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useApp()
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription className="text-pretty">{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t.goBack}
          </Button>
          <Button type="button" variant={destructive ? 'destructive' : 'default'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
