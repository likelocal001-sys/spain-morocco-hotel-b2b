'use client'

import { AttendanceTab } from './attendance-tab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApp } from '@/lib/store'
import { BillingTab } from './billing-tab'
import { HotelsTab } from './hotels-tab'
import { MembersTab } from './members-tab'
import { PipelineTab } from './pipeline-tab'

export function AdminBackoffice() {
  const { t, members, role } = useApp()
  const isManager = role === 'admin'
  const pendingCount = members.filter((m) => m.role === 'client' && !m.agencyId).length
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs tracking-wide text-muted-foreground uppercase">Morocco–Spain DMC Operations</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-balance">{t.adminTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">{t.adminSubtitle}</p>
      </div>
      <Tabs defaultValue="pipeline" className="gap-6">
        <TabsList variant="line" className="h-10! w-full justify-start gap-4 overflow-x-auto border-b">
          <TabsTrigger value="pipeline" className="flex-none px-0.5">
            {t.tabPipeline}
          </TabsTrigger>
          <TabsTrigger value="hotels" className="flex-none px-0.5">
            {t.tabHotels}
          </TabsTrigger>
          {isManager && (
            <TabsTrigger value="billing" className="flex-none px-0.5">
              {t.tabBilling}
            </TabsTrigger>
          )}
          {isManager && (
            <TabsTrigger value="members" className="flex-none px-0.5">
              {t.tabMembers}
              {pendingCount > 0 && (
                <span className="rounded-sm bg-warning px-1 font-mono text-[10px] font-semibold text-warning-foreground">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="attendance" className="flex-none px-0.5">
            {t.tabAttendance}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline">
          <PipelineTab />
        </TabsContent>
        <TabsContent value="hotels">
          <HotelsTab />
        </TabsContent>
        {isManager && (
          <TabsContent value="billing">
            <BillingTab />
          </TabsContent>
        )}
        {isManager && (
          <TabsContent value="members">
            <MembersTab />
          </TabsContent>
        )}
        <TabsContent value="attendance">
          <AttendanceTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
