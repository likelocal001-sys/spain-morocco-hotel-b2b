'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AuthCard } from '@/components/auth/auth-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password })
    if (signInError) {
      if (signInError.code === 'email_not_confirmed') {
        setError('이메일 인증이 아직 완료되지 않았습니다. 받은편지함의 인증 링크를 눌러주세요. · Confirma tu email primero.')
      } else if (signInError.status === 429) {
        setError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요. · Demasiados intentos.')
      } else if (signInError.code === 'invalid_credentials') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다. · Email o contraseña incorrectos.')
      } else {
        setError('로그인 중 예기치 않은 오류가 발생했습니다. · Error inesperado.')
      }
      setLoading(false)
      return
    }
    router.replace('/')
    router.refresh()
  }

  return (
    <AuthCard title="로그인 · Iniciar sesión" subtitle="등록된 계정으로 로그인하세요.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">이메일 · Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">비밀번호 · Contraseña</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? '로그인 중…' : '로그인'}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {'계정이 없으신가요? '}
        <Link href="/auth/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">
          회원가입 · Registrarse
        </Link>
      </p>
    </AuthCard>
  )
}
