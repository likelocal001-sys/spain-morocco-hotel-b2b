'use client'

import { Clock } from 'lucide-react'
import { AuthCard } from '@/components/auth/auth-card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export function PendingApproval({ email }: { email: string }) {
  const signOut = async () => {
    await createClient().auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <AuthCard title="관리자 승인 대기 중" subtitle="Pendiente de aprobación">
      <div className="flex items-start gap-3 rounded-lg bg-warning/15 p-3 text-sm">
        <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p className="text-pretty">
          <span className="font-medium">{email}</span> 계정이 생성되었습니다. 모로코 운영팀이 소속 여행사를 지정하면
          바로 이용할 수 있습니다.
        </p>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => window.location.reload()}>
          새로고침
        </Button>
        <Button variant="outline" className="flex-1" onClick={signOut}>
          로그아웃
        </Button>
      </div>
    </AuthCard>
  )
}
