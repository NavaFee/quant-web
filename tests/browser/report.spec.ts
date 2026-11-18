import { expect, test } from '@playwright/test'
import sample from '../../public/samples/result.json' with { type: 'json' }

test('desktop report, real charts, local switch, error recovery and narrow layout', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByText('BTCUSDT', { exact: true })).toBeVisible()
  await expect(page.locator('.equity-chart canvas')).toHaveCount(1)
  await expect(page.locator('.candle-chart canvas').first()).toBeVisible()
  await expect(page.locator('.trades tbody tr')).toHaveCount(42)
  await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true })

  const candle = page.locator('.candle-chart')
  await candle.scrollIntoViewIfNeeded()
  const beforeZoom = await candle.screenshot()
  await candle.hover()
  await page.mouse.wheel(0, -500)
  await page.mouse.move(10, 10)
  // Poll rendered pixels so this exercises the real KLineChart zoom handler.
  await expect.poll(async () => (await candle.screenshot()).equals(beforeZoom)).toBe(false)
  await page.screenshot({ path: testInfo.outputPath('candles-zoomed.png') })

  const input = page.getByLabel('选择本地 JSON 文件')
  await input.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"meta":{}}') })
  await expect(page.getByRole('alert')).toContainText('meta.strategy')
  await expect(page.getByText('BTCUSDT', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('invalid-file.png'), fullPage: true })
  const local = structuredClone(sample)
  local.meta.symbol = 'ETHUSDT'
  local.trades = []
  local.metrics.trade_count = 0
  await input.setInputFiles({ name: 'local.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(local)) })
  await expect(page.getByText('ETHUSDT', { exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByText('此报告没有成交记录。')).toBeVisible()
  await expect(page.getByRole('img', { name: /ETHUSDT K 线.*0 个成交标记/ })).toBeVisible()
  await page.getByRole('button', { name: '加载示例' }).click()
  await expect(page.getByText('BTCUSDT', { exact: true })).toBeVisible()
  await expect(page.locator('.trades tbody tr')).toHaveCount(42)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => {
    const container = document.querySelector('.candle-chart')!
    return Math.max(...Array.from(container.querySelectorAll('canvas'), (canvas) => canvas.getBoundingClientRect().width)) <= container.clientWidth
  })).toBe(true)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await expect(page.getByRole('region', { name: '月度收益热力图，可横向滚动' })).toBeVisible()
  expect(errors).toEqual([])
})
