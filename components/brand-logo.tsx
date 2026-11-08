import { cn } from '@/lib/utils'

/**
 * Like Local wordmark. `white` is for the dark-blue header; `black` for light backgrounds and printed documents.
 * Source files live in public/brand (SVG, outlined text — no font needed).
 */
export function BrandLogo({ variant = 'black', className }: { variant?: 'black' | 'white'; className?: string }) {
  return (
    // Plain <img>: SVG needs no optimisation and must also render inside the print iframe.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/brand/likelocal-logo-${variant}.svg`}
      alt="Like Local"
      width={387}
      height={100}
      className={cn('h-7 w-auto shrink-0', className)}
    />
  )
}
