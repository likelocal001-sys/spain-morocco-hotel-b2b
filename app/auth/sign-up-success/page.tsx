import Link from 'next/link'
import { AuthCard } from '@/components/auth/auth-card'
import { buttonVariants } from '@/components/ui/button'

export default function SignUpSuccessPage() {
  return (
    <AuthCard title="이메일을 확인해주세요" subtitle="Revisa tu correo para confirmar la cuenta.">
      <p className="text-sm leading-relaxed text-pretty">
        입력하신 주소로 인증 메일을 보냈습니다. 메일의 링크를 누르면 인증이 완료됩니다. 이후 관리자가 소속 여행사를
        지정하면 예약 기능을 사용할 수 있습니다.
      </p>
      <Link href="/auth/login" className={buttonVariants({ variant: 'outline' })}>
        로그인 화면으로
      </Link>
    </AuthCard>
  )
}
