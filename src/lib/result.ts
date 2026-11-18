import { z } from 'zod'

export const intervalMs = { '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000 } as const
const finite = z.number().finite()
const timestamp = finite.int().min(0).max(8_640_000_000_000_000)
const text = z.string().refine((value) => value.trim().length > 0, '不能为空')

type Param = string | number | boolean | Param[] | { [key: string]: Param }
const param: z.ZodType<Param> = z.lazy(() => z.union([
  z.string(), finite, z.boolean(), z.array(param), z.record(z.string(), param),
]))

export const resultSchema = z.strictObject({
  meta: z.strictObject({
    strategy: text,
    symbol: text,
    interval: z.enum(['1h', '4h', '1d']),
    params: z.record(z.string(), param),
    start: timestamp,
    end: timestamp,
    initial_cash: finite.positive(),
    fee_bps: finite.min(0).lt(10000),
    slippage_bps: finite.min(0).lt(10000),
  }),
  metrics: z.strictObject({
    total_return: finite.nullable(),
    annual_return: finite.nullable(),
    annual_volatility: finite.nonnegative().nullable(),
    sharpe: finite.nullable(),
    max_drawdown: finite.min(-1).max(0).nullable(),
    calmar: finite.nullable(),
    win_rate: finite.min(0).max(1).nullable(),
    profit_factor: finite.nonnegative().nullable(),
    trade_count: finite.int().nonnegative(),
  }),
  equity: z.array(z.strictObject({
    ts: timestamp, equity: finite.nonnegative(), drawdown: finite.min(-1).max(0),
  })),
  trades: z.array(z.strictObject({
    ts: timestamp, side: z.enum(['buy', 'sell']),
    price: finite.positive(), qty: finite.positive(), fee: finite.nonnegative(),
  })),
  bars: z.array(z.strictObject({
    ts: timestamp, open: finite, high: finite,
    low: finite, close: finite, volume: finite,
  })).min(1, '至少需要一根 K 线'),
}).superRefine((result, ctx) => {
  const issue = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: 'custom', path, message })
  const { bars, equity, trades, meta } = result
  const period = intervalMs[meta.interval]
  bars.forEach((bar, i) => {
    if (i > 0 && bar.ts <= bars[i - 1].ts) issue(['bars', i, 'ts'], '时间必须升序且无重复')
  })
  if (equity.length !== bars.length) issue(['equity'], '长度必须与 bars 一致')
  equity.forEach((point, i) => {
    if (point.ts !== bars[i]?.ts) issue(['equity', i, 'ts'], '必须与对应 bars.ts 对齐')
  })
  const times = new Set(bars.map((bar) => bar.ts))
  trades.forEach((trade, i) => {
    if (!times.has(trade.ts)) issue(['trades', i, 'ts'], '成交时间必须属于 bars 时间轴')
    if (i > 0 && trade.ts < trades[i - 1].ts) issue(['trades', i, 'ts'], '成交时间必须非递减')
  })
  if (meta.start !== bars[0]?.ts) issue(['meta', 'start'], '必须等于首根 bars.ts')
  if (bars.length && meta.end !== bars.at(-1)!.ts + period) issue(['meta', 'end'], '必须等于末根 bars.ts + 周期毫秒')
})

export type Result = z.infer<typeof resultSchema>

export class ResultError extends Error {
  constructor(public readonly problems: string[]) {
    super(problems.join('\n'))
    this.name = 'ResultError'
  }
}

export function parseResult(content: string): Result {
  let raw: unknown
  try {
    raw = JSON.parse(content)
  } catch {
    throw new ResultError(['JSON 语法错误：请检查逗号、引号及非法的 NaN / Infinity。'])
  }
  const parsed = resultSchema.safeParse(raw)
  if (!parsed.success) {
    throw new ResultError(parsed.error.issues.map((error) =>
      `${error.path.join('.') || '$'}：${error.message}`))
  }
  return parsed.data
}
