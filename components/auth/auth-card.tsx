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
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex items-center gap-3 border-b border-foreground/15 pb-4">
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-sm font-bold text-primary-foreground"
          >
            SM
          </div>
          <div className="leading-tight">
            <p className="font-serif text-xl font-bold tracking-tight">
              SP-Morocco <span className="text-brand">Hotel Desk</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">스페인 호텔 예약 대행 B2B · Portal B2B</p>
          </div>
        </div>
        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-2xl font-bold text-balance">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground text-pretty">{subtitle}</p>}
          </div>
          {children}
        </section>
      </div>
    </main>
  )
}
