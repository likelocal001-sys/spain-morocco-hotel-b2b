import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { PendingApproval } from '@/components/auth/pending-approval'
import { AppProvider, type Profile } from '@/lib/store'
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, company, role, agency_id')
    .eq('id', user.id)
    .maybeSingle()

  const profile: Profile = {
    id: user.id,
    email: data?.email ?? user.email ?? '',
    fullName: data?.full_name ?? null,
    company: data?.company ?? null,
    role: data?.role === 'admin' || data?.role === 'staff' ? data.role : 'client',
    agencyId: data?.agency_id ?? null,
  }

  if (profile.role === 'client' && !profile.agencyId) return <PendingApproval email={profile.email} />

  return (
    <AppProvider profile={profile}>
      <AppShell />
    </AppProvider>
  )
}
