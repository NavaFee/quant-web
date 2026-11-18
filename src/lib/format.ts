const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2, minimumFractionDigits: 2 })
export const number = (value: number | null) => value === null ? '—' : decimal.format(value)
export const percentage = (value: number | null) => value === null ? '—' : percent.format(value)
export const utc = (ts: number) => new Date(ts).toISOString().replace('T', ' ').replace(':00.000Z', '')
export const signClass = (value: number | null) => value === null || value === 0 ? '' : value > 0 ? 'positive' : 'negative'
