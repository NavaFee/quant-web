import { useEffect, useRef } from 'react'
import { init, use as registerCharts } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, DataZoomComponent, AxisPointerComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { Result } from '../lib/result'
import { number, percentage, utc } from '../lib/format'

registerCharts([LineChart, GridComponent, TooltipComponent, DataZoomComponent, AxisPointerComponent, CanvasRenderer])

export default function EquityCharts({ result }: { result: Result }) {
  const element = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const chart = init(element.current!)
    chart.setOption({
      animation: false,
      useUTC: true,
      textStyle: { fontFamily: 'system-ui, sans-serif', color: '#637086' },
      grid: [{ left: 72, right: 24, top: 28, height: '46%' }, { left: 72, right: 24, top: '67%', height: '20%' }],
      tooltip: { trigger: 'axis', axisPointer: { type: 'line' }, valueFormatter: (value: number) => number(value) },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      xAxis: [0, 1].map((gridIndex) => ({ type: 'time', gridIndex,
        axisLine: { lineStyle: { color: '#e3e8ee' } }, axisTick: { show: false },
        axisLabel: { show: gridIndex === 1, hideOverlap: true, formatter: (value: number) => utc(value).slice(5, 10) },
        axisPointer: { label: { formatter: ({ value }: { value: number }) => `${utc(value)} UTC` } },
        min: result.meta.start, max: result.bars.at(-1)!.ts,
      })),
      yAxis: [
        { type: 'value', scale: true, name: '资金', splitNumber: 4, axisLabel: { formatter: (value: number) => number(value) },
          splitLine: { lineStyle: { color: '#edf0f4', type: 'dashed' } } },
        { type: 'value', gridIndex: 1, name: '回撤', max: 0, splitNumber: 2,
          axisLabel: { formatter: (value: number) => percentage(value) }, splitLine: { lineStyle: { color: '#edf0f4', type: 'dashed' } } },
      ],
      dataZoom: [{ type: 'inside', xAxisIndex: [0, 1] }, { type: 'slider', xAxisIndex: [0, 1], bottom: 0, height: 18,
        borderColor: 'transparent', fillerColor: '#e8edf5', handleStyle: { color: '#5c6bc0' }, showDetail: false }],
      series: [
        { name: '资金', type: 'line', showSymbol: false, xAxisIndex: 0, yAxisIndex: 0, smooth: false,
          data: result.equity.map((point) => [point.ts, point.equity]),
          lineStyle: { width: 2, color: '#525fc3' }, itemStyle: { color: '#525fc3' }, areaStyle: { color: '#eef0ff', opacity: 0.6 } },
        { name: '回撤', type: 'line', showSymbol: false, xAxisIndex: 1, yAxisIndex: 1,
          data: result.equity.map((point) => [point.ts, point.drawdown]),
          tooltip: { valueFormatter: (value: number) => percentage(value) },
          lineStyle: { width: 1.3, color: '#c95467' }, itemStyle: { color: '#c95467' }, areaStyle: { color: '#f9e3e8', opacity: 0.9 } },
      ],
    })
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(element.current!)
    return () => { observer.disconnect(); chart.dispose() }
  }, [result])
  return <section className="panel" aria-labelledby="equity-title">
    <div className="section-heading"><div><span className="eyebrow">PERFORMANCE OVER TIME</span><h2 id="equity-title">资金曲线与回撤</h2></div>
      <span className="legend"><i className="dot equity-dot" />资金 <i className="dot drawdown-dot" />回撤</span></div>
    <div ref={element} className="equity-chart" role="img" aria-label={`资金曲线与回撤，${result.equity.length} 个估值点，期末资金 ${number(result.equity.at(-1)!.equity)}，最大回撤 ${percentage(result.metrics.max_drawdown)}`} />
    <p className="footnote">收盘估值沿用 K 线开盘时间 · UTC。滚轮缩放，拖动底部滑块查看区间；行情缺口保留。</p>
  </section>
}
