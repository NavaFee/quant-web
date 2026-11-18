import { describe, expect, it } from 'vitest'
import { monthlyReturns } from './monthly'
import { fixture } from '../test/fixture'

function months(points: [string, number][], start = '2024-01-01', end = '2024-03-01') {
  return monthlyReturns({
    meta: { ...fixture().meta, initial_cash: 100, start: Date.parse(start), end: Date.parse(end) },
    equity: points.map(([date, equity]) => ({ ts: Date.parse(date), equity, drawdown: 0 })),
  })
}

describe('UTC monthly returns', () => {
  it('uses initial cash then the immediately preceding monthly close', () => {
    const result = months([['2024-01-05', 105], ['2024-01-31', 110], ['2024-02-29', 99]])
    expect(result[0].value).toBeCloseTo(0.1, 12)
    expect(result[1].value).toBeCloseTo(-0.1, 12)
    expect(result.map((m) => m.partial)).toEqual([false, false])
  })
  it('crosses years and uses UTC rather than local calendar dates', () => {
    const result = months([['2024-01-01T00:30:00+01:00', 110], ['2024-01-31T23:00:00Z', 99]], '2023-12-01', '2024-02-01')
    expect(result.map(({ year, month }) => [year, month])).toEqual([[2023, 11], [2024, 0]])
    expect(result[1].value).toBeCloseTo(-0.1)
  })
  it('does not bridge missing months', () => {
    const result = months([['2024-01-31', 110], ['2024-03-31', 99], ['2024-04-30', 108.9]], '2024-01-01', '2024-05-01')
    expect(result.map((m) => m.value)).toEqual([expect.closeTo(0.1), null, null, expect.closeTo(0.1)])
  })
  it('preserves zero returns, handles zero bases and marks partial boundary months', () => {
    const result = months([['2024-01-15', 100], ['2024-02-29', 0], ['2024-03-05', 10]], '2024-01-15', '2024-03-06')
    expect(result.map((m) => m.value)).toEqual([0, -1, null])
    expect(result.map((m) => m.partial)).toEqual([true, false, true])
  })
  it('handles an empty series and nonfinite derived ratios', () => {
    expect(months([])).toEqual([])
    expect(months([['2024-01-01', 1e-300], ['2024-02-01', 1e300]])[1].value).toBeNull()
  })
})
