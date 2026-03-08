

# Dashboard 优化 — 三轮串行改造计划

## 全局约束确认
- 首页保持"统计中心"定位，不改为待办中心
- 不改业务规则/后端接口/结算逻辑
- React + TS + Tailwind + shadcn 技术栈不变
- 兼容桌面与移动端（390x844）

---

## 第1轮：Flow-first POS（收银流程优化）

### 改动清单

| 文件 | 改动目的 |
|------|----------|
| `src/pages/Cashier.tsx` | 移动端底部固定应收栏 + Drawer 抽屉结算；步骤状态高亮（active step indicator） |
| `src/components/cashier/CartPanel.tsx` | 拆出 `MobileCheckoutBar` 逻辑：底部固定条显示金额+结账按钮，点击展开完整结算抽屉 |
| `src/components/cashier/MobileCheckoutBar.tsx` | 新建：底部固定栏组件，显示购物车数量、应付金额、结账按钮；使用 Drawer (vaul) 展开完整 CartPanel |
| `src/components/cashier/ServiceList.tsx` | 服务项增加已选数量 Badge 和"次卡可抵"标识强化（颜色区分） |
| `src/components/cashier/CartPanel.tsx` | 撤销反馈增加倒计时进度条（5秒视觉衰减） |

### 关键交互
1. **移动端**：CartPanel 隐藏，替换为底部固定栏 `[🛒 2项 | ¥128.00 | 确认结账]`，点击展开 Drawer
2. **步骤指示器**：三步 `选顾客 → 选服务 → 结算`，根据 `selectedMember`/`cart.length` 自动高亮当前步骤
3. **撤销条**：移除后显示带 5s 倒计时渐变背景的撤销提示

---

## 第2轮：Barber Atelier（品牌化升级）

### 设计令牌摘要

```text
品牌强调色：
  Light:  --brand: 30 60% 48%    (铜/琥珀 copper)
  Dark:   --brand: 30 55% 58%
  映射到：主按钮、激活态、关键数值高亮、徽章

字体规范：
  标题：font-sans (Inter) font-semibold，仅 Dashboard H1 保留 font-serif
  正文：font-sans
  数字：tabular-nums font-medium

圆角：保持 --radius: 0.625rem
阴影：card 使用 shadow-xs，hover 使用 shadow-sm（不再使用 shadow-md+）
```

### 改动清单

| 文件 | 改动目的 |
|------|----------|
| `src/index.css` | 新增 `--brand` / `--brand-foreground` CSS 变量（light+dark）|
| `tailwind.config.ts` | 注册 `brand` 颜色到 Tailwind |
| `src/components/ui/button.tsx` | default variant 映射到 `bg-brand text-brand-foreground` |
| `src/components/ui/badge.tsx` | 新增 `brand` variant |
| `src/components/dashboard/DashboardStats.tsx` | hero 数值使用 `text-brand`，highlight 指标用 `text-brand` |
| `src/components/dashboard/QuickActions.tsx` | 主按钮（快速开卡）使用 brand 色 |
| `src/components/dashboard/RecentMembers.tsx` | 头像背景使用 `bg-brand/10` |
| `src/components/dashboard/RecentTransactions.tsx` | 收入金额用 `text-brand` 替代 `text-primary` |
| `src/pages/Dashboard.tsx` | H1 保留 serif，其余 section 标题改为 sans |
| `src/components/ui/page-header.tsx` | 标题改为 `font-sans`（非 Dashboard 页） |

---

## 第3轮：Data Narrative（运营可读性）

### 改动清单

| 文件 | 改动目的 |
|------|----------|
| `src/hooks/useCloudData.ts` | `useTodayStats` 扩展：增加昨日同期数据查询，返回 `yesterdayRevenue`/`yesterdayRecharge`/`yesterdayConsumption` |
| `src/components/dashboard/DashboardStats.tsx` | hero 指标旁增加涨跌标签（`↑12%` / `↓5%` / `持平`），次指标增加 vs 昨日对比 |
| `src/components/dashboard/RecentTransactions.tsx` | 退款交易使用缩进+连接线视觉关联主交易（与 Transactions 页保持一致） |
| `src/pages/Transactions.tsx` | 退款行增加左侧竖线视觉连接；主交易+退款分组间距加大 |
| `src/components/ui/page-header.tsx` | description 移动端允许 `line-clamp-2` 替代 `truncate` |

### 可用性任务验收

| 任务 | 预期耗时 |
|------|----------|
| 看今日营收状态并判断较昨日涨跌 | <2秒（hero 数值+涨跌标签一眼可读） |
| 在交易列表中定位异常退款 | <5秒（退款行有缩进+连接线+颜色区分） |
| 识别某笔消费是否已退款 | <3秒（主交易行有"已退款"徽章+关联退款紧跟其下） |

---

## 实现顺序与依赖

```text
第1轮 (Flow-first POS)
  └─ 新建 MobileCheckoutBar.tsx
  └─ 改 Cashier.tsx (步骤指示器 + 移动端布局)
  └─ 改 CartPanel.tsx (撤销倒计时)
  └─ 改 ServiceList.tsx (已选/次卡标识)

第2轮 (Barber Atelier) — 不依赖第1轮
  └─ 改 index.css + tailwind.config.ts (brand token)
  └─ 改 button/badge (brand variant)
  └─ 改 Dashboard 系列组件 (品牌色应用)
  └─ 改 page-header (字体规范)

第3轮 (Data Narrative) — 依赖第2轮的 brand 色
  └─ 改 useCloudData.ts (昨日数据)
  └─ 改 DashboardStats.tsx (涨跌标签)
  └─ 改 Transactions.tsx (退款关联)
  └─ 改 page-header (移动端 line-clamp)
```

