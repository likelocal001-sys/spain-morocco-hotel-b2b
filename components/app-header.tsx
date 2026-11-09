'use client'

import { LogOut } from 'lucide-react'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { Lang } from '@/lib/types'

function LangSwitch({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: Lang
  options: { value: Lang; label: string }[]
  onChange: (value: Lang) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center text-xs">
      {options.map((option, i) => (
        <span key={option.value} className="flex items-center">
          {i > 0 && (
            <span aria-hidden="true" className="px-1.5 text-border">
              /
            </span>
          )}
          <button
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'py-1 transition-colors focus-visible:underline focus-visible:outline-none',
              value === option.value
                ? 'font-semibold text-foreground underline decoration-brand decoration-2 underline-offset-4'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        </span>
      ))}
    </div>
  )
}

export function AppHeader() {
  const { t, lang, setLang, role, profile, signOut, agencyName, currentAgencyId } = useApp()

  return (
    <header className="sticky top-0 z-40 border-b border-foreground/15 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-baseline gap-3">
          <p className="truncate font-serif text-lg font-bold tracking-tight">
            SP-Morocco <span className="text-brand">Hotel Desk</span>
          </p>
          <p className="hidden truncate text-xs text-muted-foreground lg:block">{t.appTagline}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <LangSwitch
            label={t.langSwitch}
            value={lang}
            onChange={setLang}
            options={[
              { value: 'ko', label: '한국어' },
              { value: 'es', label: 'Español' },
            ]}
          />
          <span aria-hidden="true" className="hidden h-4 w-px bg-border sm:block" />
          <div className="flex items-center gap-3 text-xs">
            <div className="min-w-0 text-right leading-tight">
              <p className="font-medium">
                {role === 'admin' ? t.roleAdminBadge : role === 'staff' ? t.roleStaffBadge : agencyName(currentAgencyId)}
              </p>
              <p className="max-w-44 truncate text-[11px] text-muted-foreground">{profile.email}</p>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t.logout}</span>
              <span className="sr-only sm:hidden">{t.logout}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
