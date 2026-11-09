import type { Hotel, HotelLocation } from './types'

/** Hosts whose links we accept as Google Maps links (and follow when shortened). */
const MAPS_HOSTS = /^(?:(?:www\.|maps\.)?google\.(?:com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})|maps\.app\.goo\.gl|goo\.gl)$/

export function isMapsHost(host: string) {
  return MAPS_HOSTS.test(host.toLowerCase())
}

/** Short share links (maps.app.goo.gl/…) carry no place data until their redirect is followed. */
export function isShortMapsLink(raw: string) {
  try {
    const host = new URL(raw.trim()).hostname.toLowerCase()
    return host === 'maps.app.goo.gl' || host === 'goo.gl'
  } catch {
    return false
  }
}

function toCoord(lat: string, lng: string) {
  const a = Number(lat)
  const b = Number(lng)
  if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a) > 90 || Math.abs(b) > 180) return undefined
  return { lat: a, lng: b }
}

/**
 * Reads the place name and coordinates out of a full Google Maps URL, e.g.
 * https://www.google.com/maps/place/Hotel+Gran+V%C3%ADa/@40.42,-3.70,17z/data=…!3d40.4201!4d-3.7058…
 * Returns null when the text is not a Google Maps link.
 */
export function parseMapsUrl(raw: string): HotelLocation | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (!isMapsHost(url.hostname)) return null

  const location: HotelLocation = { mapsUrl: url.toString() }
  const path = decodeURIComponent(url.pathname)

  const place = /\/maps\/place\/([^/]+)/.exec(path)
  if (place) {
    const name = place[1].replace(/\+/g, ' ').trim()
    // A bare coordinate pair is not a name.
    if (name && !/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(name)) location.placeName = name
  }

  // The !3d…!4d… pair is the place's own pin; @lat,lng is only the map's viewport centre.
  const pin = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(raw)
  const view = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(path)
  const q = url.searchParams.get('q') ?? url.searchParams.get('query') ?? url.searchParams.get('ll')
  const qCoord = q && /^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/.exec(q.trim())
  const coord =
    (pin && toCoord(pin[1], pin[2])) || (qCoord && toCoord(qCoord[1], qCoord[2])) || (view && toCoord(view[1], view[2]))
  if (coord) Object.assign(location, coord)

  if (!location.placeName && q && !qCoord) location.placeName = q.replace(/\+/g, ' ').trim()

  return location
}

/** The most precise text Google Maps can search for: the pin, else the name and city. */
function pointFor(hotel: Pick<Hotel, 'nameEs' | 'city' | 'location'>) {
  const loc = hotel.location
  if (loc?.lat != null && loc.lng != null) return `${loc.lat},${loc.lng}`
  return `${loc?.placeName ?? hotel.nameEs}, ${hotel.city}`
}

export function hasLocation(hotel: Pick<Hotel, 'location'> | undefined): boolean {
  return Boolean(hotel?.location?.mapsUrl)
}

/** Opens the hotel in Google Maps (the link the team pasted). */
export function mapsLinkFor(hotel: Pick<Hotel, 'nameEs' | 'city' | 'location'>) {
  return (
    hotel.location?.mapsUrl ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pointFor(hotel))}`
  )
}

/** A Google Maps view that can be shown in an iframe without an API key. */
export function mapsEmbedFor(hotel: Pick<Hotel, 'nameEs' | 'city' | 'location'>) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(pointFor(hotel))}&z=15&output=embed`
}

/** Driving directions between two hotels, for planning the next day's transfer. */
export function directionsUrl(
  from: Pick<Hotel, 'nameEs' | 'city' | 'location'>,
  to: Pick<Hotel, 'nameEs' | 'city' | 'location'>,
) {
  const params = new URLSearchParams({
    api: '1',
    origin: pointFor(from),
    destination: pointFor(to),
    travelmode: 'driving',
  })
  return `https://www.google.com/maps/dir/?${params}`
}
