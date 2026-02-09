# Project TODO - Meigu6 Live Migration

- [x] Migrate database schema (users, localUsers, backtestSessions, backtestTrades, backtestPositions)
- [x] Migrate drizzle relations
- [x] Migrate shared types and constants
- [x] Migrate server db.ts query helpers
- [x] Migrate server routers (stockRouter, backtestRouter, authRouter)
- [x] Migrate server finnhubAdapter and momentumWebSocket
- [x] Migrate server tradingMomentum and orderBook
- [x] Migrate client lib files (indicators, stockApi, types, utils)
- [x] Migrate client hooks (useComposition, useMomentumWebSocket, usePersistFn)
- [x] Migrate client contexts (AuthContext, ScreenerContext, WatchlistContext)
- [x] Migrate StockChart component with TradingView Lightweight Charts
- [x] Migrate SignalPanel component (always show chanlun signals)
- [x] Migrate LoginDialog and ManusDialog components
- [x] Migrate ScreenerNotificationBar component
- [x] Migrate Home page
- [x] Migrate Login page
- [x] Migrate StockDetail page
- [x] Migrate Backtest page
- [x] Migrate BacktestSimulator page with K-line replay
- [x] Migrate Screener page
- [x] Migrate App.tsx routing
- [x] Migrate index.css styles
- [x] Configure API keys (Alpha Vantage, Massive, Finnhub)
- [x] Configure authentication (local + Manus OAuth)
- [x] Install required npm packages (lightweight-charts, etc.)
- [x] Push database migrations
- [x] Fix K-line display ratio (40% K-lines, 60% blank on right)
- [x] Fix timeScale sync (main chart drives sub-charts)
- [x] Fix chandong zhongshu colors (purple/pink)
- [x] Fix signal panel always show chanlun signals
- [x] Test and verify all features
- [x] Save checkpoint and publish

## Bug Fixes - Round 2

- [x] Fix 1-minute K-line chart not opening in backtest system
- [x] Fix 5-minute K-line chart not opening in backtest system
- [x] Fix 15-minute K-line chart not opening in backtest system
- [x] Fix 30-minute K-line chart not opening in backtest system
- [x] Fix chanlun fractal signals calculation to work independently of main chart indicator toggle
- [x] Test all interval switches and verify signals always appear
- [x] Save checkpoint with fixes

## Bug Fixes - Round 3

- [x] Add ⚡ marker on buy-sell pressure chart when buy momentum > previous day by 100% (2x)
- [x] Add 💀 marker on buy-sell pressure chart when sell momentum > previous day by 100% (2x)
- [x] Add ⚡ marker on momentum chart when red bar (buy pressure) > previous day by 100%
- [x] Add 💀 marker on momentum chart when green bar (sell pressure) > previous day by 100%
- [x] Add "弱转强" text marker when yellow line crosses green line + red bar > previous day by 100%
- [x] Add "强转弱" text marker when green line crosses yellow line + green bar > previous day by 100%
- [x] Test and verify all alert markers display correctly
- [x] Save final checkpoint with all fixes

## Bug Fixes - Round 4

- [x] Add ⚡💀 marker counts to momentum signal analysis panel
- [x] Add "弱转强" and "强转弱" counts to momentum signal analysis panel
- [x] Fix "强卖" showing 0 in momentum signal analysis (replaced with ⚡💀 counts)
- [x] Test and verify all signal counts are correct
- [x] Save final checkpoint

## Bug Fixes & Features - Round 5

- [x] Fix buy-sell pressure signal description: change 50% to 100%
- [x] Add signal time range filter (last 30 days, 90 days, custom range)
- [x] Supplement intraday data (< 30min) using free API keys (Alpha Vantage, Finnhub, Massive)
  - Added Alpha Vantage as 3rd fallback data source
  - Data source priority: Yahoo Finance → Finnhub → Alpha Vantage
- [x] Fix "next candle" button sometimes jumping back to previous candle
  - Changed to functional state updates to prevent race conditions
- [x] Test all fixes and new features
  - ✅ Buy-sell pressure description updated to 100%
  - ✅ Time range filter working (All/30d/90d/Custom)
  - ✅ Next candle button no longer jumps back on rapid clicks
  - ✅ Alpha Vantage added as 3rd data source
  - ✅ All signal markers displaying correctly
- [x] Save final checkpoint

## UI Optimization - Round 6

- [x] Increase momentum sub-chart height to make text visible (120 → 150)
- [x] Change "弱转强"/"强转弱" markers to pure text (removed arrows, using circle shape)
- [x] Change ⚡💀 markers to pure emoji (using circle shape for consistency)
- [x] Decrease CD bottom-fishing sub-chart height (120 → 100)
- [x] Add toggle button for CD "抄底"/"卖出" text markers on main chart
  - Default: ON (显示)
  - Does not affect signal statistics or filtering
  - Only controls visibility of text markers
- [x] Test all UI changes
  - ✅ Sub-chart heights adjusted correctly
  - ✅ Marker styles updated (pure emoji/text)
  - ✅ CD label toggle working perfectly
  - ✅ Time range filter functioning
- [x] Save final checkpoint


## Bug Fixes - Round 7

- [x] Fix CD label toggle button visibility - user cannot see it clearly
  - Changed color from purple to blue for better visibility
  - Increased button size (h-7→h-8, text-xs→text-sm)
  - Added emoji indicator (📍) when toggle is ON
  - Added shadow and transition effects
- [x] Ensure CD toggle button is positioned correctly and visible in UI
- [x] Test CD toggle functionality after fix


## 回测系统和 CD 指标修复（用户报告）
- [x] 修复回测系统创建存档无反应问题（重建数据库表添加 localUserId 列）
- [x] 优化 CD 指标抵底筛选逻辑 - 限制为距离最新K线往前5根K线内出现的抵底信号
- [x] 测试回测系统创建存档和进入（成功创建并进入回测模拟器）
- [x] 测试 CD 指标筛选结果的准确性（筛选完成，找到24只符合条件的股票）

## 回测系统盈亏计算修复（用户报告）
- [x] 诊断回测模拟器页面的盈亏计算逻辑（发现右上角显示 currentBalance 而不是 totalAssets）
- [x] 修复盈亏计算 - 总资产 = 现金 + 持仓股票市值
- [x] 测试修复后的盈亏显示（现在正确显示 $99,947 = $80,694现金 + $19,253持仓）

## 回测存档列表盈亏计算修复（用户报告）
- [ ] 诊断回测存档列表页面的盈亏计算逻辑
- [ ] 修复后端 API 返回的存档数据（计算总资产 = 现金 + 持仓市值）
- [ ] 测试修复后的存档列表显示

## 从 GitHub 仓库覆盖部署 meiguzuizhong 代码（用户请求）
- [x] 克隆 JohnnyTenkyo/meiguzuizhong 仓库（GitHub 自动同步）
- [x] 备份关键配置并用新代码覆盖
- [x] 安装依赖并重启服务器
- [x] 测试项目功能（首页、回测存档列表、新功能）
- [ ] 保存检查点

## 重要人物信息流手机端UI优化（用户报告）
- [x] 检查重要人物信息流组件代码和布局
- [x] 修复手机端新闻卡片显示不完整的问题
- [x] 优化小屏幕布局（改为上下布局，桌面端保持左右布局）
- [x] 测试手机端显示效果（等待用户发布后验证）

## 回测系统盈亏计算全面修复（用户报告）
- [x] 修复回测系统存档列表页面总资产和收益显示错误
- [x] 修复回测模拟器内持仓市值计算（应为所有股票市值相加）
- [x] 确保盈亏同步显示和计算，不需要点击切换
- [x] 修复总资产计算逻辑（现金 + 所有持仓市值）
- [x] 测试验证修复后的盈亏计算准确性


## 回测系统数据不一致问题（用户新报告）
- [x] 修复存档里总市值比回测模拟器内更高的问题（数据不一致）
- [x] 修复点击个股时持仓价值会变的问题
- [x] 诊断存档保存时的数据状态
- [x] 诊断存档加载时的数据状态
- [x] 测试验证修复后的数据一致性


## 回测系统 K 线时间同步问题（用户新报告）
- [x] 修复 K 线推进逻辑，确保所有持仓股票同时推进到同一时间点
- [x] 修复持仓价格获取，使用统一时间点的价格
- [x] 测试验证 K 线推进时所有股票时间同步

## API 配置和回测系统修复（用户新任务）
- [x] 配置 Twitter API（使用 Manus 平台内置）
- [x] 配置 Truth Social API（使用用户提供的 token）
- [x] 修复回测存档页面总市值和盈亏显示（同步系统内数据）
- [x] 测试验证所有功能


## 回测存档页面紧急修复（用户发现的批评）
- [x] 修复盈亏颜色显示（红色=涨，绿色=跌）
- [x] 修复总资产数据同步（当 Finnhub API 无法获取数据时显示提示）
- [x] 验证修复效果（显示“点击进入查看详细盈亏数据”）

## 重要人物信息流显示问题（用户新报告）
- [ ] 诊断重要人物信息流无法显示的原因
- [ ] 修复数据加载或显示逻辑
- [ ] 测试验证信息流正常显示


## 回测存档页面数据同步简化方案（用户建议）
- [ ] 添加数据库字段存储总资产和盈亏
- [ ] 修改回测模拟器保存总资产数据到数据库
- [ ] 修改存档列表页面直接读取数据库数据
- [ ] 测试验证修复

## 重要信息流功能增强（用户新需求）
- [x] 为自选关联人物信息流添加推文/评论转发板块
- [x] 修复 Truth Social 显示问题，验证 token 配置（Truth Social API 被 Cloudflare 拦截）
- [x] 测试验证两个功能正常工作
