export type Lang = 'ko' | 'es'
export type Role = 'client' | 'admin'
export type ReservationStatus = 'pending' | 'in_progress' | 'confirmed' | 'cancelled'
export type KnownCity =
  | 'Madrid'
  | 'Barcelona'
  | 'Sevilla'
  | 'Granada'
  | 'Valencia'
  | 'Toledo'
  | 'Malaga'
  | 'Lisboa'
  | 'Fatima'
  | 'Porto'
export type City = KnownCity | (string & {})
export type NegotiationStep = 'quoteRequested' | 'quoteReceived' | 'counterOffer' | 'termsAgreed' | 'optionHeld'
export type GroupCheck = 'roomingChecked' | 'requestsShared' | 'paymentInformed' | 'voucherSent'

export interface StayNegotiation {
  steps: NegotiationStep[]
  rate?: number
  note?: string
}
export type RequestTag =
  | 'lateCheckout'
  | 'earlyCheckin'
  | 'adjacentRooms'
  | 'sameFloor'
  | 'busParking'
  | 'earlyBreakfast'

export interface AttachedFile {
  name: string
  size: number
  url?: string
}

export interface RoomCounts {
  single: number
  twin: number
  triple: number
}

export interface Stay {
  id: string
  city: City
  checkIn: string
  checkOut: string
  stars: number
  hotelId?: string
  requestTags?: RequestTag[]
}

export interface Reservation {
  id: string
  agencyId: string
  groupName: string
  checkIn: string
  checkOut: string
  city: City
  hotelId?: string
  preferredStars?: number
  stays?: Stay[]
  rooms: RoomCounts
  breakfast: boolean
  roomingList?: AttachedFile
  requestTags: RequestTag[]
  requests: string
  status: ReservationStatus
  paymentLimit?: string
  finalAmount?: number
  voucherFile?: AttachedFile
  paid: boolean
  createdAt: string
  negotiation?: Record<string, StayNegotiation>
  groupChecks?: GroupCheck[]
}

export interface HotelContact {
  id: string
  name: string
  email: string
  phone: string
}

export interface Hotel {
  id: string
  nameEs: string
  city: City
  stars: number
  contacts: HotelContact[]
  feeRate: number
  busParking: boolean
  notes: string
}

export interface Agency {
  id: string
  nameKo: string
  nameEs: string
}
