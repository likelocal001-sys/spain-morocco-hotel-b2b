import Link from 'next/link'
import { AuthCard } from '@/components/auth/auth-card'
import { buttonVariants } from '@/components/ui/button'

export default function AuthErrorPage() {
  return (
    <AuthCard title="인증에 실패했습니다" subtitle="No se pudo completar la verificación.">
      <p className="text-sm text-pretty">링크가 만료되었거나 이미 사용되었습니다. 다시 로그인하거나 회원가입을 진행해주세요.</p>
      <Link href="/auth/login" className={buttonVariants()}>
        로그인 화면으로
      </Link>
    </AuthCard>
  )
}
