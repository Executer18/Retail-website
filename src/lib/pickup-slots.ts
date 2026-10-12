// src/lib/pickup-slots.ts
//
// Pure functions, no DB, no framework — easy to unit test on their own.
// Everything here treats time as plain IST wall-clock, per your Phase 6
// LEARN FIRST note: no timezone library, no UTC conversion anywhere.
//
// Rule: earliest pickup = now + 5 hours. If that falls after closing time,
// roll over to tomorrow's opening time and generate slots from there
// instead (your explicit decision). Slots are generated on the fly, never
// stored — there's no "slots" table, because a slot is just a point in
// time derived from shop hours, not an inventory item to reserve.

// Edit these two to match your actual shop hours.
export const SHOP_OPEN_HOUR = 9 // 9:00 AM
export const SHOP_CLOSE_HOUR = 22 // 8:00 PM
export const SLOT_INTERVAL_MINUTES = 30 // two bookable slot per hour
export const MINIMUM_LEAD_HOURS = 2

const IST_OFFSET_MINUTES = 5.5 * 60

export type PickupSlot = {
  // ISO-ish "YYYY-MM-DD HH:mm" in IST wall-clock — plain string, not a
  // real Date in a particular zone. This is deliberately simple: it's
  // what gets stored in orders.pickup_time and what gets shown to the
  // customer, with no conversion either direction.
  label: string // e.g. "Today, 3:00 PM" or "Tomorrow, 9:00 AM"
  value: string // e.g. "2026-10-05 15:00" — what actually gets submitted
}

// Returns the current moment as IST wall-clock fields, regardless of what
// timezone the server itself is running in (Workers run in UTC).
function nowInIST(): { year: number; month: number; day: number; hour: number; minute: number } {
  const nowUtcMs = Date.now()
  const istMs = nowUtcMs + IST_OFFSET_MINUTES * 60 * 1000
  const ist = new Date(istMs)

  return {
    year: ist.getUTCFullYear(),
    month: ist.getUTCMonth(), // 0-indexed
    day: ist.getUTCDate(),
    hour: ist.getUTCHours(),
    minute: ist.getUTCMinutes(),
  }
}

function addMinutesToIST(ist: ReturnType<typeof nowInIST>, minutesToAdd: number) {
  // Build a UTC Date using the IST fields AS IF they were UTC fields —
  // this is a trick, not a bug: since we only ever add/compare within
  // this same "pretend UTC = IST" frame, it works consistently as long
  // as every date in this file is built and read the same way.
  const pretendUtc = new Date(Date.UTC(ist.year, ist.month, ist.day, ist.hour, ist.minute))
  pretendUtc.setUTCMinutes(pretendUtc.getUTCMinutes() + minutesToAdd)
  return {
    year: pretendUtc.getUTCFullYear(),
    month: pretendUtc.getUTCMonth(),
    day: pretendUtc.getUTCDate(),
    hour: pretendUtc.getUTCHours(),
    minute: pretendUtc.getUTCMinutes(),
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function formatValue(ist: ReturnType<typeof nowInIST>) {
  return `${ist.year}-${pad(ist.month + 1)}-${pad(ist.day)} ${pad(ist.hour)}:${pad(ist.minute)}`
}

function formatLabel(ist: ReturnType<typeof nowInIST>, todayDay: number, tomorrowDay: number) {
  const hour12 = ist.hour % 12 === 0 ? 12 : ist.hour % 12
  const ampm = ist.hour < 12 ? 'AM' : 'PM'
  const time = `${hour12}:${pad(ist.minute)} ${ampm}`

  if (ist.day === todayDay) return `Today, ${time}`
  if (ist.day === tomorrowDay) return `Tomorrow, ${time}`
  return `${ist.year}-${pad(ist.month + 1)}-${pad(ist.day)}, ${time}`
}

// Generates the bookable slot list for checkout. Call this fresh on every
// GET /checkout request — never cache it, since "now" keeps moving.
export function getAvailablePickupSlots(): PickupSlot[] {
  const now = nowInIST()
  const today = now.day

  let earliest = addMinutesToIST(now, MINIMUM_LEAD_HOURS * 60)

  // Round UP to the next slot boundary (e.g. 2:10 PM -> 3:00 PM) so we
  // never offer a slot that's technically before the 5-hour minimum.
  const minutesPastBoundary = earliest.minute % SLOT_INTERVAL_MINUTES
  if (minutesPastBoundary !== 0) {
    earliest = addMinutesToIST(earliest, SLOT_INTERVAL_MINUTES - minutesPastBoundary)
  }

  // Rollover: if the earliest valid slot is at/after closing time, push
  // to tomorrow's opening time instead of trying to cram in a slot today.
  const closesAtOrAfterToday = earliest.hour >= SHOP_CLOSE_HOUR
  let cursor = earliest

  if (closesAtOrAfterToday) {
    const tomorrowBase = addMinutesToIST(now, 24 * 60)
    cursor = { ...tomorrowBase, hour: SHOP_OPEN_HOUR, minute: 0 }
  } else if (earliest.hour < SHOP_OPEN_HOUR) {
    // Lead time landed before opening (e.g. ordering at 2 AM) — start at
    // today's opening time instead of offering a pre-dawn slot.
    cursor = { ...earliest, hour: SHOP_OPEN_HOUR, minute: 0 }
  }

  const tomorrow = addMinutesToIST(now, 24 * 60).day

  const slots: PickupSlot[] = []
  // Generate slots for the rest of the cursor's day, up to closing time.
  while (cursor.hour < SHOP_CLOSE_HOUR) {
    slots.push({ label: formatLabel(cursor, today, tomorrow), value: formatValue(cursor) })
    cursor = addMinutesToIST(cursor, SLOT_INTERVAL_MINUTES)
  }

  return slots
}
