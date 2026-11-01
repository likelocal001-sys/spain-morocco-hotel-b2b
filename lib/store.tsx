'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'
import { getStays, nightsBetween, snapshotOf, totalRooms } from './format'
import { dictionaries, type Dict } from './i18n'
import { createClient } from './supabase/client'
import type { Agency, CommissionSettlement, Hotel, Lang, Reservation, Revision, Role } from './types'

export const settlementKey = (agencyId: string, month: string) => `${agencyId}:${month}`

export type NewReservationInput = Omit<
  Reservation,
  'id' | 'status' | 'paid' | 'createdAt' | 'agencyId' | 'revisions' | 'negotiation' | 'groupChecks'
>

export interface Profile {
  id: string
  email: string
  fullName: string | null
  company: string | null
  role: Role
  agencyId: string | null
}

interface AppContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  role: Role
  profile: Profile
  signOut: () => Promise<void>
  t: Dict
  currentAgencyId: string
  agencies: Agency[]
  agencyName: (id: string) => string
  reservations: Reservation[]
  hotels: Hotel[]
  loading: boolean
  hotelById: (id?: string) => Hotel | undefined
  feeRateFor: (reservation: Reservation) => number
  feeFor: (reservation: Reservation) => number
  addReservation: (input: NewReservationInput) => Promise<Reservation | null>
  updateReservation: (id: string, patch: Partial<Reservation>) => void
  editReservation: (id: string, input: NewReservationInput) => boolean
  acknowledgeRevisions: (id: string) => void
  saveHotel: (hotel: Hotel) => void
  setHotelFeeRate: (hotelId: string, rate: number) => void
  settlements: Record<string, CommissionSettlement>
  commissionFor: (agencyId: string, month: string) => number
  reportCommissionPaid: (agencyId: string, month: string, reported: boolean) => void
  confirmCommissionReceived: (agencyId: string, month: string) => void
  members: Profile[]
  updateMember: (id: string, patch: { agencyId?: string | null; role?: Role }) => Promise<boolean>
  createAgency: (nameKo: string, nameEs: string) => Promise<Agency | null>
}

export const DEFAULT_FEE_RATE = 3
export const FEE_RATES = [2, 2.5, 3, 3.5, 4, 4.5, 5]

const AppContext = createContext<AppContextValue | null>(null)

const supabase = () => createClient()

async function fetchAgencies(): Promise<Agency[]> {
  const { data, error } = await supabase().from('agencies').select('id, name_ko, name_es').order('name_ko')
  if (error) throw error
  return data.map((a) => ({ id: a.id, nameKo: a.name_ko, nameEs: a.name_es }))
}

async function fetchHotels(): Promise<Hotel[]> {
  const { data, error } = await supabase().from('hotels').select('id, data').order('updated_at', { ascending: false })
  if (error) throw error
  return data.map((row) => ({ ...(row.data as Hotel), id: row.id }))
}

async function fetchReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase()
    .from('reservations')
    .select('id, agency_id, status, data')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
    .map((row) => ({ ...(row.data as Reservation), id: row.id, agencyId: row.agency_id, status: row.status }))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || b.id.localeCompare(a.id))
}

async function fetchSettlements(): Promise<Record<string, CommissionSettlement>> {
  const { data, error } = await supabase()
    .from('commission_settlements')
    .select('agency_id, month, reported_at, received_at, received_amount, receipt_no')
  if (error) throw error
  return Object.fromEntries(
    data.map((s) => [
      settlementKey(s.agency_id, s.month),
      {
        agencyId: s.agency_id,
        month: s.month,
        reportedAt: s.reported_at ?? undefined,
        receivedAt: s.received_at ?? undefined,
        receivedAmount: s.received_amount == null ? undefined : Number(s.received_amount),
        receiptNo: s.receipt_no ?? undefined,
      },
    ]),
  )
}

async function fetchMembers(): Promise<Profile[]> {
  const { data, error } = await supabase()
    .from('profiles')
    .select('id, email, full_name, company, role, agency_id')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((p) => ({
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    company: p.company,
    role: p.role,
    agencyId: p.agency_id,
  }))
}

const EMPTY_RESERVATIONS: Reservation[] = []
const EMPTY_HOTELS: Hotel[] = []
const EMPTY_AGENCIES: Agency[] = []
const EMPTY_MEMBERS: Profile[] = []
const EMPTY_SETTLEMENTS: Record<string, CommissionSettlement> = {}

export function AppProvider({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('ko')
  const t = dictionaries[lang]
  const role = profile.role
  const isAdmin = role === 'admin'

  const { data: agencies = EMPTY_AGENCIES, mutate: mutateAgencies } = useSWR('agencies', fetchAgencies)
  const { data: hotels = EMPTY_HOTELS, mutate: mutateHotels, isLoading: hotelsLoading } = useSWR('hotels', fetchHotels)
  const {
    data: reservations = EMPTY_RESERVATIONS,
    mutate: mutateReservations,
    isLoading: reservationsLoading,
  } = useSWR('reservations', fetchReservations)
  const { data: settlements = EMPTY_SETTLEMENTS, mutate: mutateSettlements } = useSWR('settlements', fetchSettlements)
  const { data: members = EMPTY_MEMBERS, mutate: mutateMembers } = useSWR(isAdmin ? 'members' : null, fetchMembers)

  const reservationsRef = useRef(reservations)
  reservationsRef.current = reservations
  const tRef = useRef(t)
  tRef.current = t

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const failed = useCallback((error: unknown) => {
    console.error('[v0] Supabase write failed:', error)
    toast.error(tRef.current.saveFailed)
  }, [])

  const signOut = useCallback(async () => {
    await supabase().auth.signOut()
    window.location.href = '/auth/login'
  }, [])

  const agencyName = useCallback(
    (id: string) => {
      const agency = agencies.find((a) => a.id === id)
      if (!agency) return id
      return lang === 'ko' ? agency.nameKo : agency.nameEs
    },
    [agencies, lang],
  )

  const hotelById = useCallback((id?: string) => hotels.find((h) => h.id === id), [hotels])

  const feeRateFor = useCallback(
    (reservation: Reservation) => hotelById(reservation.hotelId)?.feeRate ?? DEFAULT_FEE_RATE,
    [hotelById],
  )

  const feeFor = useCallback(
    (reservation: Reservation) =>
      getStays(reservation).reduce(
        (sum, stay) =>
          sum +
          totalRooms(reservation.rooms) *
            nightsBetween(stay.checkIn, stay.checkOut) *
            (hotelById(stay.hotelId)?.feeRate ?? DEFAULT_FEE_RATE),
        0,
      ),
    [hotelById],
  )

  const persistReservation = useCallback(
    (id: string, transform: (current: Reservation) => Reservation) => {
      const current = reservationsRef.current.find((r) => r.id === id)
      if (!current) return false
      const next = transform(current)
      const updated = reservationsRef.current.map((r) => (r.id === id ? next : r))
      reservationsRef.current = updated
      mutateReservations(updated, { revalidate: false })
      supabase()
        .from('reservations')
        .update({ data: next })
        .eq('id', id)
        .then(({ error }) => {
          if (error) {
            failed(error)
            mutateReservations()
          }
        })
      return true
    },
    [mutateReservations, failed],
  )

  const addReservation = useCallback(
    async (input: NewReservationInput) => {
      const { data, error } = await supabase().rpc('create_reservation', { payload: input })
      if (error || !data) {
        failed(error)
        return null
      }
      const created = data as Reservation
      const updated = [created, ...reservationsRef.current]
      reservationsRef.current = updated
      mutateReservations(updated, { revalidate: false })
      return created
    },
    [mutateReservations, failed],
  )

  const updateReservation = useCallback(
    (id: string, patch: Partial<Reservation>) => {
      persistReservation(id, (current) => ({ ...current, ...patch }))
    },
    [persistReservation],
  )

  const editReservation = useCallback(
    (id: string, input: NewReservationInput) => {
      const current = reservationsRef.current.find((r) => r.id === id)
      if (!current) return false
      const before = snapshotOf(current)
      const after = snapshotOf({ ...current, ...input })
      if (JSON.stringify(before) === JSON.stringify(after)) return false
      const revision: Revision = {
        id: Math.random().toString(36).slice(2, 10),
        at: new Date().toISOString(),
        before,
        after,
        seen: false,
      }
      return persistReservation(id, (r) => ({ ...r, ...input, revisions: [...(r.revisions ?? []), revision] }))
    },
    [persistReservation],
  )

  const acknowledgeRevisions = useCallback(
    (id: string) => {
      persistReservation(id, (r) => ({ ...r, revisions: r.revisions?.map((rev) => ({ ...rev, seen: true })) }))
    },
    [persistReservation],
  )

  const saveHotel = useCallback(
    (hotel: Hotel) => {
      mutateHotels(
        (prev = []) =>
          prev.some((h) => h.id === hotel.id) ? prev.map((h) => (h.id === hotel.id ? hotel : h)) : [hotel, ...prev],
        { revalidate: false },
      )
      supabase()
        .from('hotels')
        .upsert({ id: hotel.id, data: hotel, updated_at: new Date().toISOString() })
        .then(({ error }) => {
          if (error) {
            failed(error)
            mutateHotels()
          }
        })
    },
    [mutateHotels, failed],
  )

  const setHotelFeeRate = useCallback(
    (hotelId: string, rate: number) => {
      const hotel = hotels.find((h) => h.id === hotelId)
      if (hotel) saveHotel({ ...hotel, feeRate: rate })
    },
    [hotels, saveHotel],
  )

  const commissionFor = useCallback(
    (agencyId: string, month: string) =>
      reservations
        .filter((r) => r.agencyId === agencyId && r.status === 'confirmed' && r.checkIn.slice(0, 7) === month)
        .reduce((sum, r) => sum + feeFor(r), 0),
    [reservations, feeFor],
  )

  const reportCommissionPaid = useCallback(
    (agencyId: string, month: string, reported: boolean) => {
      const key = settlementKey(agencyId, month)
      mutateSettlements(
        (prev = {}) => ({
          ...prev,
          [key]: { ...prev[key], agencyId, month, reportedAt: reported ? new Date().toISOString() : undefined },
        }),
        { revalidate: false },
      )
      supabase()
        .rpc('report_commission', { p_month: month, p_reported: reported })
        .then(({ error }) => {
          if (error) failed(error)
          mutateSettlements()
        })
    },
    [mutateSettlements, failed],
  )

  const confirmCommissionReceived = useCallback(
    (agencyId: string, month: string) => {
      supabase()
        .rpc('confirm_commission', { p_agency: agencyId, p_month: month, p_amount: commissionFor(agencyId, month) })
        .then(({ error }) => {
          if (error) failed(error)
          mutateSettlements()
        })
    },
    [commissionFor, mutateSettlements, failed],
  )

  const updateMember = useCallback(
    async (id: string, patch: { agencyId?: string | null; role?: Role }) => {
      const row: Record<string, unknown> = {}
      if (patch.agencyId !== undefined) row.agency_id = patch.agencyId
      if (patch.role !== undefined) row.role = patch.role
      const { error } = await supabase().from('profiles').update(row).eq('id', id)
      if (error) {
        failed(error)
        return false
      }
      mutateMembers()
      return true
    },
    [mutateMembers, failed],
  )

  const createAgency = useCallback(
    async (nameKo: string, nameEs: string) => {
      const base = nameEs
        .toLowerCase()
        .normalize('NFD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      const id = `${base || 'agency'}-${Math.random().toString(36).slice(2, 6)}`
      const { error } = await supabase().from('agencies').insert({ id, name_ko: nameKo, name_es: nameEs })
      if (error) {
        failed(error)
        return null
      }
      const agency = { id, nameKo, nameEs }
      mutateAgencies((prev = []) => [...prev, agency], { revalidate: false })
      return agency
    },
    [mutateAgencies, failed],
  )

  const value = useMemo<AppContextValue>(
    () => ({
      lang,
      setLang,
      role,
      profile,
      signOut,
      t,
      currentAgencyId: profile.agencyId ?? '',
      agencies,
      agencyName,
      reservations,
      hotels,
      loading: hotelsLoading || reservationsLoading,
      hotelById,
      feeRateFor,
      feeFor,
      addReservation,
      updateReservation,
      editReservation,
      acknowledgeRevisions,
      saveHotel,
      setHotelFeeRate,
      settlements,
      commissionFor,
      reportCommissionPaid,
      confirmCommissionReceived,
      members,
      updateMember,
      createAgency,
    }),
    [
      lang,
      role,
      profile,
      signOut,
      t,
      agencies,
      agencyName,
      reservations,
      hotels,
      hotelsLoading,
      reservationsLoading,
      hotelById,
      feeRateFor,
      feeFor,
      addReservation,
      updateReservation,
      editReservation,
      acknowledgeRevisions,
      saveHotel,
      setHotelFeeRate,
      settlements,
      commissionFor,
      reportCommissionPaid,
      confirmCommissionReceived,
      members,
      updateMember,
      createAgency,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
