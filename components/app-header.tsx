'use client'

import { Building2, ShieldCheck } from 'lucide-react'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { Lang, Role } from '@/lib/types'

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: React.ReactNode }[]
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center rounded-lg bg-white/10 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none',
            value === option.value ? 'bg-white text-primary shadow-sm' : 'text-white/75 hover:text-white',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function AppHeader() {
  const { t, lang, setLang, role, setRole } = useApp()

  return (
    <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-sm">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white font-mono text-sm font-bold text-primary"
          >
            SM
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold tracking-tight md:text-base">SP-Morocco Hotel Desk</p>
            <p className="truncate text-xs text-white/70">{t.appTagline}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Lang>
            label={t.langSwitch}
            value={lang}
            onChange={setLang}
            options={[
              { value: 'ko', label: '한국어' },
              { value: 'es', label: 'Español' },
            ]}
          />
          <div className="flex items-center gap-1.5">
            <span className="hidden rounded bg-warning/90 px-1.5 py-0.5 text-[10px] font-semibold text-warning-foreground uppercase sm:inline">
              {t.testMode}
            </span>
            <Segmented<Role>
              label={t.viewSwitch}
              value={role}
              onChange={setRole}
              options={[
                {
                  value: 'client',
                  label: (
                    <>
                      <Building2 className="size-3.5" aria-hidden="true" />
                      {t.clientView}
                    </>
                  ),
                },
                {
                  value: 'admin',
                  label: (
                    <>
                      <ShieldCheck className="size-3.5" aria-hidden="true" />
                      {t.adminView}
                    </>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
