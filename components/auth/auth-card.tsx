import { BrandLogo } from '@/components/brand-logo'

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-9" />
          <div className="border-l pl-3 leading-tight">
            <p className="font-semibold tracking-tight">SP-Morocco Hotel Desk</p>
            <p className="text-xs text-muted-foreground">스페인 호텔 예약 대행 B2B · Portal B2B</p>
          </div>
        </div>
        <section className="flex flex-col gap-5 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight text-balance">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground text-pretty">{subtitle}</p>}
          </div>
          {children}
        </section>
      </div>
    </main>
  )
}
