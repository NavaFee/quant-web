import type { Result } from './result'

export interface MonthReturn { year: number; month: number; value: number | null; partial: boolean }
const monthIndex = (ts: number) => {
  const date = new Date(ts)
  return date.getUTCFullYear() * 12 + date.getUTCMonth()
}

// A gap never borrows a non-adjacent month's base or invents an equity point.
export function monthlyReturns({ equity, meta }: Pick<Result, 'equity' | 'meta'>): MonthReturn[] {
  if (!equity.length) return []
  const closes = new Map<number, number>()
  equity.forEach((point) => closes.set(monthIndex(point.ts), point.equity))
  const first = monthIndex(equity[0].ts)
  const last = monthIndex(equity.at(-1)!.ts)
  const months: MonthReturn[] = []
  for (let index = first; index <= last; index++) {
    const year = Math.floor(index / 12)
    const month = index % 12
    const close = closes.get(index)
    const base = index === first ? meta.initial_cash : closes.get(index - 1)
    const ratio = close !== undefined && base !== undefined && base !== 0 ? close / base - 1 : null
    // setUTCFullYear also handles years 0–99 without Date.UTC's 1900 offset.
    const start = new Date(0)
    start.setUTCFullYear(year, month, 1)
    const end = new Date(start)
    end.setUTCMonth(month + 1)
    months.push({ year, month, value: ratio !== null && Number.isFinite(ratio) ? ratio : null,
      partial: meta.start > +start || meta.end < +end })
  }
  return months
}
