import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { parseResult, ResultError } from '../lib/result'
import type { Result } from '../lib/result'
import { Metadata, Metrics, MonthlyHeatmap, Trades } from '../components/ReportSections'

const EquityCharts = lazy(() => import('../components/EquityCharts'))
const CandleChart = lazy(() => import('../components/CandleChart'))
type Report = { result: Result; source: string }
const sampleSource = '示例 · result.json'
async function readSample(signal: AbortSignal) {
  const response = await fetch(`${import.meta.env.BASE_URL}samples/result.json`, { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}

export default function ReportPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const latest = useRef(0)
  const sampleController = useRef<AbortController | null>(null)

  const load = useCallback((read: () => Promise<string>, source: string) => {
    const request = ++latest.current
    void Promise.resolve().then(read).then((content) => {
      const result = parseResult(content)
      if (request === latest.current) setReport({ result, source })
    }).catch((error: unknown) => {
      if (request === latest.current) setErrors(error instanceof ResultError ? error.problems :
        [`无法读取 ${source}：${error instanceof Error ? error.message : '未知错误'}。请重试或选择本地 JSON。`])
    }).finally(() => {
      if (request === latest.current) setLoading(false)
    })
  }, [])

  function loadSample() {
    sampleController.current?.abort()
    const controller = new AbortController()
    sampleController.current = controller
    setLoading(true)
    setErrors([])
    void load(() => readSample(controller.signal), sampleSource)
  }

  useEffect(() => {
    const controller = new AbortController()
    const sequence = latest
    sampleController.current = controller
    void load(() => readSample(controller.signal), sampleSource)
    return () => { ++sequence.current; controller.abort() }
  }, [load])

  function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    sampleController.current?.abort()
    setLoading(true)
    setErrors([])
    void load(() => file.text(), file.name)
  }

  return <>
    <header className="topbar"><a className="brand" href="./"><span className="brand-mark" aria-hidden="true">q.</span>quant<span className="brand-subtitle">/ research</span></a>
      <span className="local-badge"><i className="dot" />本地报告 · 浏览器内读取</span></header>
    <main>
      <div className="page-heading"><div><p className="eyebrow">RESEARCH / BACKTEST</p><h1>回测报告</h1><p className="subtitle">从策略表现到每一笔成交。</p></div>
        <div className="file-actions"><button type="button" className="button secondary" onClick={loadSample}>加载示例</button>
          <label className="button primary upload">↥ 加载 JSON<input type="file" accept=".json,application/json" aria-label="选择本地 JSON 文件" onChange={upload} /></label></div>
      </div>
      <div className="report-status" role="status"><span className="file-icon" aria-hidden="true">▤</span>
        {loading ? '正在读取报告…' : report ? report.source : '尚未加载报告'}
        {report && <span className="status-detail">{report.result.bars.length} 根 K 线 · {report.result.trades.length} 笔成交</span>}
      </div>
      {errors.length > 0 && <div className="error-box" role="alert"><strong>报告加载失败</strong>
        <ul>{errors.slice(0, 8).map((error, i) => <li key={i}>{error}</li>)}</ul>
        {errors.length > 8 && <p>另有 {errors.length - 8} 项错误，请修正后重新加载。</p>}
        <p>{report ? '当前仍展示上一次成功加载的报告。' : '请选择有效的结果 JSON，或重新加载示例。'}</p>
      </div>}
      {report && <div className="report-content" aria-busy={loading}>
        <Metadata result={report.result} /><Metrics result={report.result} />
        <Suspense fallback={<div className="panel loading-chart">正在绘制图表…</div>}><EquityCharts result={report.result} /></Suspense>
        <MonthlyHeatmap result={report.result} />
        <Suspense fallback={<div className="panel loading-chart">正在绘制 K 线…</div>}><CandleChart result={report.result} /></Suspense>
        <Trades result={report.result} />
      </div>}
      <footer><span>QUANT RESEARCH</span><p>历史回测 · 年化按 365 天 · — 表示不可计算</p><span>报告时间均为 UTC</span></footer>
    </main>
  </>
}
