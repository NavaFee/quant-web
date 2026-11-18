import { useEffect, useRef } from 'react'
import { init, dispose, registerOverlay } from 'klinecharts'
import type { Result } from '../lib/result'

registerOverlay({
  name: 'tradeMarker', totalStep: 1,
  needDefaultPointFigure: false, needDefaultXAxisFigure: false, needDefaultYAxisFigure: false,
  createPointFigures: ({ coordinates, overlay }) => {
    const point = coordinates[0]
    if (!point) return []
    const buy = overlay.extendData === 'buy'
    const color = buy ? '#128068' : '#be3849'
    const labelY = point.y + (buy ? 19 : -19)
    return [
      { type: 'line', attrs: { coordinates: [point, { x: point.x, y: labelY }] }, styles: { color, size: 1 }, ignoreEvent: true },
      { type: 'circle', attrs: { x: point.x, y: point.y, r: 3 }, styles: { color, style: 'fill' }, ignoreEvent: true },
      { type: 'text', attrs: { x: point.x, y: labelY, text: buy ? 'B' : 'S', align: 'center', baseline: 'middle' },
        styles: { color: '#ffffff', backgroundColor: color, size: 10, paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, borderRadius: 3 }, ignoreEvent: true },
    ]
  },
})

export default function CandleChart({ result }: { result: Result }) {
  const element = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const container = element.current!
    const chart = init(container, { timezone: 'UTC', locale: 'zh-CN', styles: {
      grid: { horizontal: { color: '#edf0f4' }, vertical: { color: '#edf0f4' } },
      candle: { bar: { upColor: '#128068', downColor: '#be3849', upBorderColor: '#128068', downBorderColor: '#be3849',
        upWickColor: '#128068', downWickColor: '#be3849' } },
    } })!
    chart.setPriceVolumePrecision(2, 6)
    chart.applyNewData(result.bars.map(({ ts, ...bar }) => ({ timestamp: ts, ...bar })))
    result.trades.forEach((trade, index) => chart.createOverlay({
      name: 'tradeMarker', id: `trade-${index}`, lock: true,
      points: [{ timestamp: trade.ts, value: trade.price }], extendData: trade.side,
    }))
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(container)
    return () => { observer.disconnect(); dispose(container) }
  }, [result])
  return <section className="panel" aria-labelledby="candle-title">
    <div className="section-heading"><div><span className="eyebrow">PRICE & FILLS</span><h2 id="candle-title">行情与买卖点</h2></div>
      <span className="legend"><span className="marker buy">B</span> 买入 <span className="marker sell">S</span> 卖出</span></div>
    <div ref={element} className="candle-chart" role="img" aria-label={`${result.meta.symbol} K 线，${result.bars.length} 根，${result.trades.length} 个成交标记`} />
    <p className="footnote">标记圆点对应实际成交时间与成交价（含滑点）· UTC。滚轮缩放、拖动平移；明细见下方成交列表。</p>
  </section>
}
