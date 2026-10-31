'use client'

import { AdminBackoffice } from '@/components/admin/admin-backoffice'
import { AppHeader } from '@/components/app-header'
import { ClientPortal } from '@/components/client/client-portal'
import { useApp } from '@/lib/store'

export function AppShell() {
  const { role } = useApp()
  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 [&_[data-slot=table-container]]:rounded-b-xl">
        {role === 'client' ? <ClientPortal /> : <AdminBackoffice />}
      </main>
    </div>
  )
}
