'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AuthCard } from '@/components/auth/auth-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export default function SignUpPage() {
  const router = useRouter()
  const [form, setForm] = useState({ fullName: '', company: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (form.password !== form.confirm) {
      setError('비밀번호가 일치하지 않습니다. · Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: signUpError } = await createClient().auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo:
          process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
            ? process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
            : `${window.location.origin}/auth/callback`,
        data: { full_name: form.fullName.trim(), company: form.company.trim() },
      },
    })
    if (signUpError) {
      if (signUpError.code === 'weak_password') {
        setError('비밀번호가 너무 약합니다. 6자 이상으로 입력해주세요. · Contraseña demasiado débil.')
      } else if (signUpError.status === 429) {
        setError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요. · Demasiados intentos.')
      } else if (signUpError.code === 'email_address_invalid') {
        setError('사용할 수 없는 이메일 주소입니다. 실제 사용하는 주소를 입력해주세요.')
      } else {
        setError('회원가입을 완료하지 못했습니다. 잠시 후 다시 시도해주세요. · No se pudo registrar.')
      }
      setLoading(false)
      return
    }
    // Supabase returns a user with no identities (and sends no email) when the address is already registered.
    if (data.user && data.user.identities?.length === 0) {
      setError('이미 가입된 이메일입니다. 로그인해주세요. · Este email ya está registrado, inicia sesión.')
      setLoading(false)
      return
    }
    router.push('/auth/sign-up-success')
  }

  return (
    <AuthCard title="회원가입 · Registro" subtitle="가입 후 이메일 인증을 완료하면, 관리자 승인 뒤 이용할 수 있습니다.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="fullName">담당자 이름 · Nombre</Label>
          <Input id="fullName" required autoComplete="name" value={form.fullName} onChange={update('fullName')} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="company">회사명 · Empresa</Label>
          <Input
            id="company"
            required
            autoComplete="organization"
            value={form.company}
            onChange={update('company')}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">이메일 · Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={form.email} onChange={update('email')} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">비밀번호 · Contraseña</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={form.password}
            onChange={update('password')}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm">비밀번호 확인 · Repetir</Label>
          <Input
            id="confirm"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={form.confirm}
            onChange={update('confirm')}
          />
        </div>
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? '처리 중…' : '가입하기'}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {'이미 계정이 있으신가요? '}
        <Link href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">
          로그인
        </Link>
      </p>
    </AuthCard>
  )
}
