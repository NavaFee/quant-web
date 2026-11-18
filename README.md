# quant-web

回测结果查看界面。纯前端，读取 [quant-engine](https://github.com/NavaFee/quant-engine) 导出的结果 JSON，展示指标、资金曲线、回撤、月度收益、K 线买卖点和成交列表。

不连接交易所，不下单。

产品说明和结果 JSON 的格式见 [quant-context/product.md](https://github.com/NavaFee/quant-context/blob/main/product.md)。开发规则见 [AGENTS.md](AGENTS.md)。

## 本地运行

使用 Node.js 22.12+ 和 npm：

```sh
npm install
npm run dev
```

打开 Vite 提示的本地地址。页面自动读取 `public/samples/result.json`；点击「加载 JSON」选择本地文件，
文件在浏览器内解析。点击「加载示例」恢复示例。没有后端请求或文件上传；样例与页面资源由本地静态服务器提供。
构建产物在 `dist/`，可用 `npm run preview` 本地查看；不能直接双击 `index.html` 运行。

## 检查

```sh
npm install && npm run lint && npm run test && npm run build
```

- ESLint 检查 TypeScript/React；`test` 是 Vitest 单次运行，覆盖契约、月收益和加载交互。
- `build` 包含 `tsc -b` 的类型检查。图表库按需导入并延迟加载。
- 测试只读仓库样例，fetch 在组件测试中替换为本地响应，不依赖外部服务。
- 真实浏览器检查自动启停本地 Vite，覆盖 K 线缩放、文件切换、失败恢复和 390px 窄屏，并输出截图至 `test-results/`：

```sh
npx playwright install chromium
npm run test:browser
# 如果已有 Chrome，可跳过浏览器下载：
PLAYWRIGHT_CHANNEL=chrome npm run test:browser
```

## 报告展示口径

- 元信息、九项指标、资金/回撤曲线、月度收益、KLineChart 买卖点和全部成交明细。
- 结果字段、配置范围、有限数值、nullable 指标、params、bars 顺序唯一性、equity 对齐、成交时间归属和 meta 区间先校验。
  语法或结构错误会显示原因与字段路径，保留上一次成功报告。快速连续选文件时只采用最新选择；同一文件可重新选择。
- 八项不可计算指标的 `null` 显示「—」，合法 `0` 显示零值。收益、波动、回撤和胜率显示百分数；Sharpe、Calmar、PF 显示数值。
  指标、回撤直接展示导出值，不在前端重算。`trade_count` 是完整平仓轮数，成交明细的条数是成交笔数。
- 时间均为 UTC 毫秒，区间是 `[start, end)`。浏览器拒绝超出 JavaScript Date 支持范围的时间并提示字段路径。
  收盘权益沿用 K 线开盘时间；行情缺口保留，不生成新数据点。年化按引擎的 365 天口径。
- 月收益按 `equity.ts` 的 UTC 月份分组，用月末最后一个权益 / 相邻上月末权益 − 1。
  首个有数据月以 `initial_cash` 为基数。无数据月、缺相邻上月基数或基数为 0 显示「—」，不跨缺口借基数。
  非有限派生结果也显示「—」。首尾未覆盖整月的收益标 `*`，代表区间收益。
- K 线 B/S 圆点使用 `trades.ts/price`，其中 price 已含滑点；B 是买入、S 是卖出。
  滚轮缩放、拖动平移查看历史。资金/回撤共享时间缩放；窄屏表格在各自区域内横向滚动。

## 样例与许可

`public/samples/result.json` 原样复制自 T-75 合入的
[quant-engine examples/result.json](https://github.com/NavaFee/quant-engine/blob/a3e704f074407c8bb680c87d2625aaf776b7dc1b/examples/result.json)。
500 根 BTCUSDT 1h K 线、500 个权益点、42 笔成交、21 个完整平仓轮次；
UTC 范围为 2024-01-01 00:00 至 2024-01-21 20:00（右端不含）。
契约基准为 quant-context 的 `product.md`，页面独立实现 QuantStats tearsheet 风格的报告布局。
没有复制 QuantStats、FreqUI 或 GPL 项目的源码；运行时依赖许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
