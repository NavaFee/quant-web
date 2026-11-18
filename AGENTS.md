# AGENTS.md — quant-web

回测结果查看界面。纯前端，读取 quant-engine 导出的结果 JSON。不连交易所，不下单。

## 结构

```
src/pages/        页面
src/components/   组件：指标卡、资金曲线、回撤、月度收益、K 线、成交列表
src/lib/          结果 JSON 的类型定义和解析
public/samples/   示例结果 JSON
```

## 命令

```
npm install
npm run lint
npm run test
npm run build
```

使用 Node.js 22.12+。`test` 单次执行退出，`build` 先运行 TypeScript 检查。
`npm run dev` 启动本地页面；`npm run test:browser` 运行真实图表和文件加载检查，
首次需 `npx playwright install chromium`，也可设置 `PLAYWRIGHT_CHANNEL=chrome` 使用已安装 Chrome。

## 规则

- Vite + React + TypeScript。K 线图用 KLineChart（Apache-2.0）。
- 结果 JSON 的格式以 quant-context 仓库的 `product.md` 为准，类型定义放在 `src/lib/`。
- 布局参考 QuantStats 的 HTML tearsheet。可以看 FreqUI 的回测页找思路，但 freqtrade 是 GPL-3.0，不复制它的代码。
- 组件测试用 `public/samples/` 里的示例 JSON，不依赖后端。
- 所有结果先经 `src/lib/result.ts` 校验，再整体替换报告；保留失败前的成功报告，只有最新一次选择能提交状态。
- 时间按 UTC 显示，指标和回撤直接取导出值；`trade_count` 是完整平仓轮数。
- 月收益计算见 `src/lib/monthly.ts`；缺月不跨月借基数，边界不足整月要标明区间收益。
- 图表实例在切换/卸载时销毁，通过 ResizeObserver 响应容器尺寸变化。运行时依赖许可见 THIRD_PARTY_NOTICES.md。

## 禁区

- 不加登录、账户、下单、API key 相关的功能。
- 不直接提交到 main。一个任务一个分支一个 PR。
