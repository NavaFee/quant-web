import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Result } from '../lib/result'
import { fixture, sampleText } from '../test/fixture'
import ReportPage from './ReportPage'

vi.mock('../components/EquityCharts', () => ({ default: ({ result }: { result: Result }) =>
  <div data-testid="equity-view">{result.meta.symbol}:{result.equity.at(-1)!.equity}</div> }))
vi.mock('../components/CandleChart', () => ({ default: ({ result }: { result: Result }) =>
  <div data-testid="candle-view">{result.meta.symbol}:{result.bars.length}</div> }))

afterEach(() => vi.unstubAllGlobals())
const response = (text: string, ok = true) => ({ ok, status: ok ? 200 : 503, text: async () => text })
function setup() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(sampleText)))
  render(<ReportPage />)
}
function upload(text: string | Promise<string>, name = 'local.json') {
  const file = new File([], name, { type: 'application/json' })
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) })
  fireEvent.change(screen.getByLabelText('选择本地 JSON 文件'), { target: { files: [file] } })
}

describe('report loading', () => {
  it('loads the real sample and distinguishes ratios and closed rounds', async () => {
    setup()
    expect(await screen.findByText('BTCUSDT')).toBeVisible()
    expect(within(screen.getByLabelText('完整平仓轮数')).getByText('21')).toBeVisible()
    expect(within(screen.getByLabelText('夏普比率')).getByText('-2.20')).toBeVisible()
    expect(within(screen.getByLabelText('总收益')).getByText('-15.08%')).toBeVisible()
    expect(screen.getByText('500 根 K 线 · 42 笔成交')).toBeVisible()
    expect(screen.getByRole('heading', { name: '月度收益' })).toBeVisible()
    expect(await screen.findByTestId('candle-view')).toHaveTextContent('BTCUSDT:500')
    expect(screen.getByRole('region', { name: '成交列表，可滚动' }).querySelectorAll('tbody tr')).toHaveLength(42)
    expect(screen.getByText('2024-01-01 00:00 → 2024-01-21 20:00')).toBeVisible()
  })

  it('replaces all views, preserves null and zero, and shows empty trades', async () => {
    setup()
    await screen.findByText('BTCUSDT')
    const result = fixture()
    result.meta.symbol = 'ETHUSDT'
    result.metrics.total_return = 0
    result.metrics.sharpe = null
    result.metrics.trade_count = 0
    result.trades = []
    upload(JSON.stringify(result))
    expect(await screen.findByText('ETHUSDT')).toBeVisible()
    expect(screen.queryByText('BTCUSDT')).not.toBeInTheDocument()
    expect(within(screen.getByLabelText('总收益')).getByText('0.00%')).toBeVisible()
    expect(within(screen.getByLabelText('夏普比率')).getByText('—')).toBeVisible()
    expect(screen.getByText('此报告没有成交记录。')).toBeVisible()
    expect(await screen.findByTestId('candle-view')).toHaveTextContent('ETHUSDT:500')
    expect(screen.getByTestId('equity-view')).toHaveTextContent('ETHUSDT:')
  })

  it('retains the last report after an error and accepts the same file again', async () => {
    setup()
    await screen.findByText('BTCUSDT')
    upload('{}')
    expect(await screen.findByRole('alert')).toHaveTextContent('meta')
    expect(screen.getByText('BTCUSDT')).toBeVisible()
    expect(screen.getByLabelText('选择本地 JSON 文件')).toHaveValue('')
    upload(sampleText)
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('local.json')
  })

  it('recovers from a sample fetch failure using a local file or retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response('', false)).mockResolvedValue(response(sampleText)))
    render(<ReportPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 503')
    fireEvent.click(screen.getByRole('button', { name: '加载示例' }))
    expect(await screen.findByText('BTCUSDT')).toBeVisible()
    upload(Promise.reject(new Error('文件读取失败')))
    expect(await screen.findByRole('alert')).toHaveTextContent('文件读取失败')
    upload(sampleText)
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('keeps the newest file when earlier file reads finish later', async () => {
    setup()
    await screen.findByText('BTCUSDT')
    let resolve!: (text: string) => void
    upload(new Promise<string>((done) => { resolve = done }), 'slow.json')
    const result = fixture()
    result.meta.symbol = 'LATEST'
    upload(JSON.stringify(result), 'latest.json')
    await screen.findByText('LATEST')
    await act(async () => resolve(sampleText))
    expect(screen.getByText('LATEST')).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('latest.json')
  })

  it('does not let a delayed default sample overwrite a local selection', async () => {
    let resolve!: (value: ReturnType<typeof response>) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise((done) => { resolve = done })))
    render(<ReportPage />)
    const result = fixture()
    result.meta.symbol = 'LOCAL'
    upload(JSON.stringify(result))
    await screen.findByText('LOCAL')
    await act(async () => resolve(response(sampleText)))
    expect(screen.getByText('LOCAL')).toBeVisible()
  })
})
