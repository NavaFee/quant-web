import { describe, expect, expectTypeOf, it } from 'vitest'
import { parseResult, ResultError, resultSchema } from './result'
import type { Result } from './result'
import { fixture, sampleText } from '../test/fixture'

describe('result contract', () => {
  it('infers nullable metric types and preserves the T-75 sample', () => {
    const result = parseResult(sampleText)
    expectTypeOf(result).toEqualTypeOf<Result>()
    expectTypeOf(result.metrics.sharpe).toEqualTypeOf<number | null>()
    expectTypeOf(result.metrics.trade_count).toEqualTypeOf<number>()
    expectTypeOf(result.trades[0].side).toEqualTypeOf<'buy' | 'sell'>()
    expect(result.bars).toHaveLength(500)
    expect(result.equity).toHaveLength(500)
    expect(result.trades).toHaveLength(42)
    expect(result.metrics.trade_count).toBe(21)
    expect(result).toEqual(JSON.parse(sampleText))
  })

  it('keeps null, zero, empty trades and nested params distinct', () => {
    const result = fixture()
    result.trades = []
    result.metrics = { total_return: 0, annual_return: 0, annual_volatility: 0, max_drawdown: 0,
      sharpe: null, calmar: null, win_rate: null, profit_factor: null, trade_count: 0 }
    result.meta.params = { nested: [{ enabled: false, periods: [0, 'fast'] }] }
    expect(parseResult(JSON.stringify(result))).toEqual(result)
  })

  it('accepts gaps without filling or sorting points', () => {
    const result = fixture()
    result.bars.splice(1, 1)
    result.equity.splice(1, 1)
    result.metrics.annual_volatility = null
    result.metrics.sharpe = null
    expect(parseResult(JSON.stringify(result)).bars).toHaveLength(499)
  })

  it('accepts a single bar and zero equity', () => {
    const result = fixture()
    result.bars = result.bars.slice(0, 1)
    result.equity = [{ ts: result.bars[0].ts, equity: 0, drawdown: -1 }]
    result.meta.end = result.meta.start + 3_600_000
    result.trades = []
    expect(() => parseResult(JSON.stringify(result))).not.toThrow()
  })

  const invalid: [string, (result: Result) => void, string][] = [
    ['duplicate bar', (r) => { r.bars[1].ts = r.bars[0].ts }, 'bars.1.ts'],
    ['descending bars', (r) => { r.bars.reverse() }, 'bars.1.ts'],
    ['misaligned equity', (r) => { r.equity[2].ts++ }, 'equity.2.ts'],
    ['short equity', (r) => { r.equity.pop() }, 'equity'],
    ['unknown trade time', (r) => { r.trades[0].ts++ }, 'trades.0.ts'],
    ['descending trades', (r) => { r.trades.reverse() }, 'trades.1.ts'],
    ['wrong start', (r) => { r.meta.start++ }, 'meta.start'],
    ['wrong end', (r) => { r.meta.end-- }, 'meta.end'],
    ['zero cash', (r) => { r.meta.initial_cash = 0 }, 'meta.initial_cash'],
    ['negative fee', (r) => { r.meta.fee_bps = -1 }, 'meta.fee_bps'],
    ['out-of-range slippage', (r) => { r.meta.slippage_bps = 10000 }, 'meta.slippage_bps'],
    ['fractional timestamp', (r) => { r.bars[0].ts += 0.5 }, 'bars.0.ts'],
    ['positive drawdown', (r) => { r.equity[0].drawdown = 0.1 }, 'equity.0.drawdown'],
    ['fractional trade count', (r) => { r.metrics.trade_count = 1.5 }, 'metrics.trade_count'],
    ['empty bars', (r) => { r.bars = [] }, 'bars'],
  ]
  it.each(invalid)('rejects %s with a field path', (_, mutate, path) => {
    const result = fixture()
    mutate(result)
    expect(() => parseResult(JSON.stringify(result))).toThrow(path)
  })

  it.each(['{', 'NaN', 'Infinity', '-Infinity', '{"meta":NaN}'])('rejects malformed JSON %s', (content) => {
    expect(() => parseResult(content)).toThrow('JSON 语法错误')
  })

  it('rejects missing, extra, boolean, null and nonfinite fields without coercion', () => {
    for (const [patch, path] of [
      [{ meta: { ...fixture().meta, params: { nested: [null] } } }, 'meta.params.nested'],
      [{ metrics: { ...fixture().metrics, total_return: true } }, 'metrics.total_return'],
      [{ metrics: { ...fixture().metrics, sharpe: '0' } }, 'metrics.sharpe'],
      [{ metrics: { ...fixture().metrics, trade_count: null } }, 'metrics.trade_count'],
      [{ meta: { ...fixture().meta, initial_cash: null } }, 'meta.initial_cash'],
      [{ meta: { ...fixture().meta, initial_cash: Infinity } }, 'meta.initial_cash'],
      [{ meta: { ...fixture().meta, start: true } }, 'meta.start'],
      [{ metrics: {} }, 'metrics.total_return'],
      [{ extra: 1 }, '$'],
      [{ meta: { ...fixture().meta, extra: 1 } }, 'meta'],
    ] as const) {
      const data = { ...fixture(), ...patch }
      expect(resultSchema.safeParse(data).success).toBe(false)
      expect(() => parseResult(JSON.stringify(data))).toThrow(path)
    }
    expect(() => parseResult(sampleText.replace('10000', '1e999'))).toThrow('meta.initial_cash')
  })

  it.each(['null', '[]', 'true', '42'])('reports root errors for %s', (text) => {
    expect(() => parseResult(text)).toThrow(ResultError)
  })
})
