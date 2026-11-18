import type { Result } from '../lib/result'
import { number, percentage, signClass, utc } from '../lib/format'
import { monthlyReturns } from '../lib/monthly'

export function Metadata({ result }: { result: Result }) {
  const { meta } = result
  return <section className="report-meta" aria-label="回测配置">
    <div className="instrument"><span className="instrument-icon" aria-hidden="true">{meta.symbol.startsWith('BTC') ? '₿' : meta.symbol.startsWith('ETH') ? 'Ξ' : '↗'}</span>
      <div><strong>{meta.symbol}</strong><span>{meta.interval} · 现货 · 只做多</span></div>
    </div>
    <dl className="configuration">
      <div><dt>策略</dt><dd>{meta.strategy}</dd></div>
      <div><dt>初始资金</dt><dd>{number(meta.initial_cash)}</dd></div>
      <div><dt>手续费 / 滑点</dt><dd>{number(meta.fee_bps)} / {number(meta.slippage_bps)} bps</dd></div>
      <div className="date-range"><dt>数据区间 · UTC · 右端不含</dt><dd>{utc(meta.start)} → {utc(meta.end)}</dd></div>
    </dl>
    <details className="parameters"><summary>策略参数</summary><pre>{JSON.stringify(meta.params, null, 2)}</pre></details>
  </section>
}

const metrics = [
  ['total_return', '总收益', 'TOTAL RETURN', 'percent', true],
  ['annual_return', '年化收益', 'ANNUAL RETURN', 'percent', true],
  ['max_drawdown', '最大回撤', 'MAX DRAWDOWN', 'percent', true],
  ['annual_volatility', '年化波动', 'VOLATILITY', 'percent', false],
  ['sharpe', '夏普比率', 'SHARPE', 'number', false],
  ['calmar', '卡玛比率', 'CALMAR', 'number', false],
  ['win_rate', '胜率', 'WIN RATE', 'percent', false],
  ['profit_factor', '盈利因子', 'PROFIT FACTOR', 'number', false],
  ['trade_count', '完整平仓轮数', 'CLOSED ROUNDS', 'integer', false],
] as const

export function Metrics({ result }: { result: Result }) {
  return <section aria-label="绩效指标" className="metrics">
    {metrics.map(([key, label, subtitle, format, featured]) => {
      const value = result.metrics[key]
      return <article className={`metric ${featured ? 'featured' : ''}`} key={key} aria-label={label}>
        <span className="metric-label">{label}</span><span className="eyebrow">{subtitle}</span>
        <strong className={featured || key === 'sharpe' || key === 'calmar' ? signClass(value) : ''}>
          {format === 'percent' ? percentage(value) : format === 'integer' ? value : number(value)}
        </strong>
      </article>
    })}
  </section>
}

export function MonthlyHeatmap({ result }: { result: Result }) {
  const months = monthlyReturns(result)
  const years = [...new Set(months.map((cell) => cell.year))]
  const lookup = new Map(months.map((cell) => [`${cell.year}-${cell.month}`, cell]))
  return <section className="panel" aria-labelledby="monthly-title">
    <div className="section-heading"><div><span className="eyebrow">MONTHLY PERFORMANCE</span><h2 id="monthly-title">月度收益</h2></div>
      <span className="muted">UTC 月份</span></div>
    <div className="table-scroll" tabIndex={0} role="region" aria-label="月度收益热力图，可横向滚动">
      <table className="heatmap"><thead><tr><th scope="col">年份</th>{Array.from({ length: 12 }, (_, i) => <th scope="col" key={i}>{i + 1} 月</th>)}</tr></thead>
        <tbody>{years.map((year) => <tr key={year}><th scope="row">{year}</th>{Array.from({ length: 12 }, (_, month) => {
          const cell = lookup.get(`${year}-${month}`)
          const value = cell?.value ?? null
          const alpha = value === null ? 0 : 0.06 + Math.min(Math.abs(value), 0.3) * 1.5
          return <td key={month}><span className={`heat-cell ${signClass(value)}`}
            style={{ backgroundColor: value === null ? undefined : `rgb(${value < 0 ? '190 56 73' : '18 128 104'} / ${alpha})` }}
            title={`${year}-${String(month + 1).padStart(2, '0')}：${percentage(value)}${cell?.partial ? '（区间收益，不足整月）' : ''}`}>
            {percentage(value)}{cell?.partial && value !== null ? <sup>*</sup> : null}
          </span></td>
        })}</tr>)}</tbody>
      </table>
    </div>
    <p className="footnote">* 区间收益，不足整月。首月以初始资金为基数；其后使用相邻上月末权益。缺月、缺少基数或基数为 0 时显示 —。</p>
  </section>
}

export function Trades({ result }: { result: Result }) {
  return <section className="panel" aria-labelledby="trades-title">
    <div className="section-heading"><div><span className="eyebrow">TRADE HISTORY</span><h2 id="trades-title">成交明细 <span className="count">{result.trades.length}</span></h2></div>
      <span className="muted">{result.metrics.trade_count} 个完整平仓轮次</span></div>
    {result.trades.length === 0 ? <p className="empty-state">此报告没有成交记录。</p> :
      <div className="table-scroll trade-scroll" tabIndex={0} role="region" aria-label="成交列表，可滚动">
        <table className="trades"><thead><tr>{['#', '成交时间 · UTC', '方向', '成交价', '数量', '手续费'].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{result.trades.map((trade, i) => <tr key={`${trade.ts}-${i}`}>
            <td className="muted">{String(i + 1).padStart(2, '0')}</td><td>{utc(trade.ts)}</td>
            <td><span className={`side ${trade.side}`}>{trade.side === 'buy' ? '↗ 买入' : '↙ 卖出'}</span></td>
            <td>{number(trade.price)}</td><td>{trade.qty.toLocaleString('en-US', { maximumSignificantDigits: 12 })}</td><td>{number(trade.fee)}</td>
          </tr>)}</tbody></table>
      </div>}
  </section>
}
