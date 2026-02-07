

# FFk 理发店管理系统 - 云同步与全局优化计划

---

## 一、问题诊断

### 1. 云同步现状
- 云端数据库所有表**数据为 0**（members, transactions, orders, services 等全部为空）
- 前端仍在使用 **Zustand + localStorage** 作为主数据源（`useStore.ts`），并未真正读写云端
- `SyncStatusIndicator` 组件仅展示 UI，没有实际同步逻辑
- `syncManager.ts` 只是 localStorage 队列管理，无真正的云端 push/pull
- 各页面（Dashboard, Members, Cashier 等）直接从 `useStore()` 读取本地数据，未调用 `memberService`、`transactionService` 等云端 Service

### 2. UI/布局问题
- 侧边栏同步指示器功能空壳，无实际同步/数据统计
- 设置页面的"云端数据库"区域仅静态展示"已连接"，无实时数据统计
- 数据管理中的记录数量取自本地 store，非云端实际数量

### 3. 深色模式
- CSS 变量体系完整，但部分组件使用硬编码颜色类（如 `text-success`、`bg-success`），未定义 Tailwind 自定义色
- 登录页渐变背景在深色模式下需验证可读性

---

## 二、实施计划

### 阶段 1：云端数据服务层统一（核心）

**目标**：让所有页面通过 Supabase 读写数据，实现真正的云同步。

1. **创建 `src/hooks/useCloudData.ts`** — 统一云端数据 Hook
   - 使用 `@tanstack/react-query` 封装对各 Service 的查询
   - 提供 `useMembers()`, `useTransactions()`, `useServices()`, `useAppointments()`, `useOrders()` 等 Hook
   - 支持查询缓存、自动重试、后台刷新
   - 返回 `isLoading`, `error`, `data`, `refetch` 等状态

2. **重构核心页面数据源**
   - `Dashboard.tsx` — 从云端 Hook 获取统计数据
   - `Members.tsx` — 使用 `useMembers()` 替代 `useStore().members`
   - `Cashier.tsx` — 结账逻辑调用云端 Service 写入
   - `Transactions.tsx` — 使用云端查询
   - `Appointments.tsx` — 使用云端查询
   - `Services.tsx` — 使用云端查询
   - `Reports.tsx` — 使用云端聚合查询

3. **写操作迁移**
   - 新增会员 → `memberService.create()` + `queryClient.invalidate()`
   - 充值/消费 → `transactionService` + `memberService.updateBalance()`
   - 所有写操作同步写入云端，本地 store 作为缓存层

### 阶段 2：侧边栏同步状态指示器（可视化优化）

**目标**：让用户一目了然地看到云端同步状态、数据量、上次同步时间。

1. **重写 `SyncStatusIndicator.tsx`**
   - 展开模式显示：
     - 连接状态图标 + 文字（在线/离线/同步中/已同步/错误）
     - 云端数据总量（如"云端 128 条"）
     - 本地待同步数量（如"本地 3 条待同步"）
     - 上次同步时间（如"上次同步: 14:32"）
     - 手动同步按钮（点击触发全量 refetch）
   - 折叠模式：
     - 仅显示状态图标 + badge 数字
     - Tooltip 展示完整信息

2. **实现手动同步功能**
   - 点击同步按钮 → `queryClient.invalidateQueries()` 全量刷新
   - 同步过程中显示旋转动画
   - 同步完成后更新"上次同步时间"
   - 记录云端各表数据总量

3. **自动同步**
   - 网络恢复时自动触发同步
   - 定时心跳（每 5 分钟检查一次）

### 阶段 3：设置页面优化

1. **数据管理区域增强**
   - 显示云端各表的实时记录数（会员 X 条，交易 X 条，服务 X 条...）
   - 显示本地 localStorage 中的残留数据量
   - 一键"清理本地缓存"按钮
   - 导出功能改为从云端拉取数据后导出

2. **关于系统区域**
   - 系统概况中的数据统计改为从云端获取
   - 移除"Supabase"字样，统一改为"Lovable Cloud"

### 阶段 4：UI 和页面布局优化

1. **全局 Loading 状态**
   - 各页面添加骨架屏（Skeleton），数据加载时显示
   - 替代空白或闪烁的加载状态

2. **Dashboard 优化**
   - 统计卡片数据来源切换为云端
   - 最近会员/交易列表添加加载骨架屏
   - 空状态时的引导优化

3. **会员页面**
   - 搜索改为云端搜索（已有 `memberService.search()`）
   - 分页改为服务端分页（减少内存占用）

### 阶段 5：深色模式全局优化

1. **CSS 变量补全**
   - 确保 `--success` 和 `--warning` 在 Tailwind 配置中注册为自定义色
   - 在 `tailwind.config.ts` 中添加 `success` 和 `warning` 色彩映射

2. **组件审查与修复**
   - 检查所有硬编码颜色（`text-emerald-500`, `text-amber-500` 等），替换为语义化色彩变量
   - `SyncStatusIndicator` 中的状态颜色统一使用 CSS 变量
   - 登录页在深色模式下的渐变/对比度优化
   - `StatCard` 组件的 hover 效果适配深色模式

3. **边框和分割线**
   - 检查所有 `border-border/50` 在深色模式下的可见性
   - 确保 Card 组件在深色背景下有足够对比度

---

## 三、技术细节

### 新增/修改文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `src/hooks/useCloudData.ts` | 云端数据查询 Hooks |
| 修改 | `src/components/SyncStatusIndicator.tsx` | 重写为真实同步指示器 |
| 修改 | `src/components/layout/AppSidebar.tsx` | 传递同步回调 |
| 修改 | `src/pages/Dashboard.tsx` | 数据源切换为云端 |
| 修改 | `src/pages/Members.tsx` | 使用云端查询 + 服务端搜索 |
| 修改 | `src/pages/Cashier.tsx` | 写操作改为云端 |
| 修改 | `src/pages/Transactions.tsx` | 数据源切换 |
| 修改 | `src/pages/Settings.tsx` | 云端数据统计 + UI 优化 |
| 修改 | `src/pages/Services.tsx` | 数据源切换 |
| 修改 | `src/pages/Appointments.tsx` | 数据源切换 |
| 修改 | `src/pages/Reports.tsx` | 数据源切换 |
| 修改 | `src/index.css` | 深色模式颜色微调 |
| 修改 | `tailwind.config.ts` | 添加 success/warning 自定义色 |
| 修改 | `src/components/dialogs/*` | 各对话框写操作改为云端 |

### 数据库
- 无需新增表或迁移，现有表结构完全满足需求
- 需要在首次运行时插入 `shop_settings` 初始行（如果不存在）

### 测试数据
- 在阶段 1 完成后，通过 UI 手动创建 3-5 条测试会员数据
- 验证数据在云端持久化、刷新页面后不丢失

---

## 四、实施顺序

由于改动量较大，建议按以下顺序分批实施：

1. **第一批**：创建 `useCloudData.ts` + 修改 `Dashboard` + `Members` + `SyncStatusIndicator`（验证核心读写链路）
2. **第二批**：修改 `Cashier` + `Services` + `Appointments` + `Transactions`（全部页面切换云端）
3. **第三批**：`Settings` 优化 + `Reports` + 深色模式全局修复 + Tailwind 配置

