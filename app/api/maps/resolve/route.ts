import { NextResponse, type NextRequest } from 'next/server'
import { isMapsHost } from '@/lib/maps'
import { createClient } from '@/lib/supabase/server'

const MAX_HOPS = 5

/**
 * Follows a Google Maps short link (maps.app.goo.gl/…) to the full URL, which holds the
 * place name and coordinates. Browsers cannot read cross-origin redirects, so this runs on
 * the server. Only Google Maps hosts are ever requested.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let current: URL
  try {
    current = new URL(request.nextUrl.searchParams.get('url') ?? '')
  } catch {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 })
  }

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    // In some regions Google answers with a cookie-consent page that carries the target in `continue`.
    const consentTarget = current.hostname === 'consent.google.com' && current.searchParams.get('continue')
    if (consentTarget) current = new URL(consentTarget)
    if (current.protocol !== 'https:' || !isMapsHost(current.hostname)) {
      return NextResponse.json({ error: 'not_google_maps' }, { status: 400 })
    }
    if (current.pathname.startsWith('/maps')) return NextResponse.json({ url: current.toString() })

    const res = await fetch(current, { redirect: 'manual', cache: 'no-store' })
    const next = res.headers.get('location')
    if (!next || res.status < 300 || res.status >= 400) break
    current = new URL(next, current)
  }

  return NextResponse.json({ error: 'unresolved' }, { status: 422 })
}
