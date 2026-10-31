'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { dictionaries, type Dict } from './i18n'
import { AGENCIES, CURRENT_AGENCY_ID, SEED_HOTELS, createSeedReservations } from './seed-data'
import type { Agency, Hotel, Lang, Reservation, Role } from './types'

export type NewReservationInput = Omit<Reservation, 'id' | 'status' | 'paid' | 'createdAt' | 'agencyId'>

interface AppContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  role: Role
  setRole: (role: Role) => void
  t: Dict
  currentAgencyId: string
  agencies: Agency[]
  agencyName: (id: string) => string
  reservations: Reservation[]
  hotels: Hotel[]
  hotelById: (id?: string) => Hotel | undefined
  agencyRates: Record<string, number>
  addReservation: (input: NewReservationInput) => Reservation
  updateReservation: (id: string, patch: Partial<Reservation>) => void
  saveHotel: (hotel: Hotel) => void
  setAgencyRate: (agencyId: string, rate: number) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const sequence = useRef(30)
  const [lang, setLang] = useState<Lang>('ko')
  const [role, setRole] = useState<Role>('client')
  const [reservations, setReservations] = useState<Reservation[]>(() => createSeedReservations())
  const [hotels, setHotels] = useState<Hotel[]>(SEED_HOTELS)
  const [agencyRates, setAgencyRates] = useState<Record<string, number>>({
    'seoul-tours': 3,
    'hangang-travel': 4,
    'bluesky-tour': 3,
  })

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const agencyName = useCallback(
    (id: string) => {
      const agency = AGENCIES.find((a) => a.id === id)
      if (!agency) return id
      return lang === 'ko' ? agency.nameKo : agency.nameEs
    },
    [lang],
  )

  const hotelById = useCallback((id?: string) => hotels.find((h) => h.id === id), [hotels])

  const addReservation = useCallback((input: NewReservationInput) => {
    const now = new Date()
    const prefix = `SPM-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`
    sequence.current += 1
    const created: Reservation = {
      ...input,
      id: `${prefix}-${String(sequence.current).padStart(3, '0')}`,
      agencyId: CURRENT_AGENCY_ID,
      status: 'pending',
      paid: false,
      createdAt: now.toISOString().slice(0, 10),
    }
    setReservations((prev) => [created, ...prev])
    return created
  }, [])

  const updateReservation = useCallback((id: string, patch: Partial<Reservation>) => {
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const saveHotel = useCallback((hotel: Hotel) => {
    setHotels((prev) =>
      prev.some((h) => h.id === hotel.id) ? prev.map((h) => (h.id === hotel.id ? hotel : h)) : [hotel, ...prev],
    )
  }, [])

  const setAgencyRate = useCallback((agencyId: string, rate: number) => {
    setAgencyRates((prev) => ({ ...prev, [agencyId]: rate }))
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      lang,
      setLang,
      role,
      setRole,
      t: dictionaries[lang],
      currentAgencyId: CURRENT_AGENCY_ID,
      agencies: AGENCIES,
      agencyName,
      reservations,
      hotels,
      hotelById,
      agencyRates,
      addReservation,
      updateReservation,
      saveHotel,
      setAgencyRate,
    }),
    [lang, role, agencyName, reservations, hotels, hotelById, agencyRates, addReservation, updateReservation, saveHotel, setAgencyRate],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
