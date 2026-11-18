# Third-party notices

The report UI is independently implemented. QuantStats' tearsheet is a layout reference only;
no QuantStats, FreqUI, or other GPL project source is included.
Installed packages retain their upstream license/notice files in `node_modules`.

Runtime dependencies from the committed lockfile:

| Package | License | Source / license |
| --- | --- | --- |
| React, React DOM, Scheduler | MIT | https://github.com/facebook/react/blob/main/LICENSE |
| Zod | MIT | https://github.com/colinhacks/zod/blob/main/LICENSE |
| Apache ECharts | Apache-2.0 | https://github.com/apache/echarts/blob/master/LICENSE |
| KLineChart | Apache-2.0 | https://github.com/klinecharts/KLineChart/blob/main/LICENSE |
| zrender | BSD-3-Clause | https://github.com/ecomfe/zrender/blob/master/LICENSE |
| tslib | 0BSD | https://github.com/microsoft/tslib/blob/main/LICENSE.txt |

Build and test tools (not part of the browser application): Vite, Vitest, ESLint,
TypeScript ESLint, Testing Library, jsdom and associated plugins use MIT;
TypeScript and Playwright use Apache-2.0. Exact versions and transitive package
license metadata are recorded in `package-lock.json`.
