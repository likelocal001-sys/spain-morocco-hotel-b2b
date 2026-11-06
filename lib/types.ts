export type Lang = 'ko' | 'es'
export type Role = 'client' | 'staff' | 'admin'
export type ReservationStatus = 'pending' | 'in_progress' | 'confirmed' | 'cancelled'
export type KnownCity =
  | 'Madrid'
  | 'Barcelona'
  | 'Sevilla'
  | 'Granada'
  | 'Valencia'
  | 'Toledo'
  | 'Malaga'
  | 'Zaragoza'
  | 'Lisboa'
  | 'Fatima'
  | 'Porto'
export type City = KnownCity | (string & {})
export type NegotiationStep = 'quoteRequested' | 'quoteReceived' | 'counterOffer' | 'termsAgreed' | 'optionHeld'
export type GroupCheck = 'roomingChecked' | 'requestsShared' | 'paymentInformed' | 'voucherSent'

export interface StayNegotiation {
  steps: NegotiationStep[]
  rate?: number
  rates?: Partial<Record<RoomType, number>>
  note?: string
  amount?: number
  paymentLimit?: string
  paid?: boolean
  paidAt?: string
  emailSentAt?: string
  emailSignature?: string
}

export type RoomType = 'single' | 'twin' | 'triple'
export type RequestTag =
  | 'lateCheckout'
  | 'earlyCheckin'
  | 'adjacentRooms'
  | 'sameFloor'
  | 'busParking'
  | 'earlyBreakfast'
  | 'dinnerIncluded'

export interface AttachedFile {
  name: string
  size: number
  url?: string
  path?: string
  }

export type RoomCounts = Record<RoomType, number>

export interface Stay {
  id: string
  city: City
  checkIn: string
  checkOut: string
  stars: number
  hotelId?: string
  requestTags?: RequestTag[]
  requestNote?: string
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
  revisions?: Revision[]
}

export interface BookingSnapshot {
  groupName: string
  stays: Stay[]
  rooms: RoomCounts
  breakfast: boolean
  roomingList?: AttachedFile
  requests: string
}

export interface Revision {
  id: string
  at: string
  before: BookingSnapshot
  after: BookingSnapshot
  seen: boolean
}

export interface HotelContact {
  id: string
  name: string
  email: string
  phone: string
}

export interface HotelBank {
  bankName: string
  holder: string
  iban: string
  bic: string
}

export interface Hotel {
  id: string
  nameEs: string
  city: City
  stars: number
  contacts: HotelContact[]
  feeRate: number
  rates?: Partial<Record<RoomType, number>>
  busParking: boolean
  notes: string
  bank?: HotelBank
  paymentDaysBefore?: number
}

export interface CommissionSettlement {
  agencyId: string
  month: string
  reportedAt?: string
  receivedAt?: string
  receivedAmount?: number
  receiptNo?: string
}

export interface Agency {
  id: string
  nameKo: string
  nameEs: string
}
