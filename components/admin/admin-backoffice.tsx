'use client'

import { Building, Calculator, Users, Workflow } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApp } from '@/lib/store'
import { BillingTab } from './billing-tab'
import { HotelsTab } from './hotels-tab'
import { MembersTab } from './members-tab'
import { PipelineTab } from './pipeline-tab'

export function AdminBackoffice() {
  const { t, members } = useApp()
  const pendingCount = members.filter((m) => m.role === 'client' && !m.agencyId).length
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-medium text-primary">Morocco–Spain DMC Operations</p>
        <h1 className="text-2xl font-bold tracking-tight text-balance">{t.adminTitle}</h1>
        <p className="text-sm text-muted-foreground text-pretty">{t.adminSubtitle}</p>
      </div>
      <Tabs defaultValue="pipeline" className="gap-4">
        <TabsList className="h-10! w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="pipeline" className="px-3">
            <Workflow aria-hidden="true" />
            {t.tabPipeline}
          </TabsTrigger>
          <TabsTrigger value="hotels" className="px-3">
            <Building aria-hidden="true" />
            {t.tabHotels}
          </TabsTrigger>
          <TabsTrigger value="billing" className="px-3">
            <Calculator aria-hidden="true" />
            {t.tabBilling}
          </TabsTrigger>
          <TabsTrigger value="members" className="px-3">
            <Users aria-hidden="true" />
            {t.tabMembers}
            {pendingCount > 0 && (
              <span className="rounded-full bg-warning px-1.5 text-[10px] font-bold text-warning-foreground">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline">
          <PipelineTab />
        </TabsContent>
        <TabsContent value="hotels">
          <HotelsTab />
        </TabsContent>
        <TabsContent value="billing">
          <BillingTab />
        </TabsContent>
        <TabsContent value="members">
          <MembersTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
