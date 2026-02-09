

# FFk 理发店管理系统 -- 最终交付修复计划（17项）

本计划将按依赖顺序分阶段完成全部17项修复，确保每步构建在稳定基础之上。

---

## 阶段一：基础设施与安全（修复3, 4, 9, 10, 6）

### 修复3：Edge Function 认证方法修复
- 文件：`supabase/functions/verify-password/index.ts`
- 将第47行 `supabase.auth.getClaims(token)` 替换为 `supabase.auth.getUser(token)`
- 返回 `{ userId: user.id }`

### 修复4：密码安全升级 -- 服务端哈希
- `src/lib/crypto.ts`：删除 `SALT` 常量和 `simpleHash` 函数，保留 `isHashed` 工具函数
- `src/lib/adminApi.ts`：所有函数直接发送明文密码（不再客户端哈希）
- `supabase/functions/verify-password/index.ts`：盐值改从 `Deno.env.get('ADMIN_PASSWORD_SALT')` 读取（默认值兜底）；不再返回 `hash` 字段
- 需通过 secrets 工具添加 `ADMIN_PASSWORD_SALT` secret

### 修复9：速率限制持久化
- 新建数据库迁移：创建 `rate_limits` 表 + `check_rate_limit` RPC 函数
- Edge Function 中删除内存 Map，改调 `supabase.rpc('check_rate_limit', ...)`

### 修复10：CORS 来源限制
- Edge Function 中将 `'*'` 改为动态读取 `ALLOWED_ORIGIN` 环境变量
- 开发环境默认 `'*'`

### 修复6：TypeScript 严格模式
- `tsconfig.app.json`：`"strict": true, "strictNullChecks": true, "noImplicitAny": true`
- 保持 `"noUnusedLocals": false, "noUnusedParameters": false`
- 修复所有由此引发的类型错误（?. / ?? / null 检查）

---

## 阶段二：原子操作与竞态修复（修复1, 2）

### 修复1：收银台结账原子操作
- 新建 `supabase/functions/checkout/index.ts`：接收完整结账参数，内部调用 Postgres RPC
- 新建数据库迁移：创建 `process_checkout` PL/pgSQL 函数（事务性操作）
- 在 `supabase/config.toml` 添加 `[functions.checkout]` 配置
- `src/lib/adminApi.ts`：新增 `processCheckout()` 函数
- `src/pages/Cashier.tsx`：替换 4 步 await 为单次 Edge Function 调用

### 修复2：余额竞态条件
- 新建数据库迁移：添加 `increment_member_balance` 和 `decrement_member_balance` RPC
- `src/services/memberService.ts`：新增 `incrementBalance` / `decrementBalance` 方法
- 更新所有调用处：`QuickRechargeDialog.tsx`、`Cashier.tsx` 等

---

## 阶段三：云端同步修复（修复8）

### 修复8：预约云端同步
- `src/hooks/useCloudData.ts`：新增 `useCreateAppointment`, `useUpdateAppointment`, `useDeleteAppointment` mutations
- `src/components/dialogs/NewAppointmentDialog.tsx`：从 `useStore().addAppointment` 改为 `useCreateAppointment`；从 `useStore().members/services` 改为 `useMembers()/useServices()` cloud hooks；删除 `setTimeout(300)` 模拟延迟
- `src/components/dialogs/AppointmentDetailDialog.tsx`：状态更新改用 `useUpdateAppointment`

---

## 阶段四：Toast 统一与代码清理（修复11, 12, 15）

### 修复11：统一 Toast 为 sonner
- `src/App.tsx`：移除 `<Toaster />`（shadcn），只保留 `<Sonner position="top-right" />`
- 全局替换 15 个文件中的 `useToast` 调用：
  - `import { useToast } from "@/hooks/use-toast"` --> `import { toast } from "sonner"`
  - `toast({ title: "...", variant: "destructive" })` --> `toast.error("...")`
  - `toast({ title: "..." })` --> `toast.success("...")`
- 涉及：Cashier, Services, Settings, Dashboard, Transactions, 所有 dialogs (QuickMemberDialog, QuickRechargeDialog, MemberDetailDialog, MemberDeleteWithRefundDialog, TransactionRefundDialog, AdminPasswordDialog, NewAppointmentDialog, AppointmentDetailDialog, MigrationDialog)
- `AppSidebar.tsx`：将 "Logged out" 改为 "已退出登录"

### 修复12：清理未使用依赖
- 确认 `react-hook-form`、`@hookform/resolvers`、`zod`、`embla-carousel-react`、`react-resizable-panels` 无任何实际 import 后从 `package.json` 移除
- `package.json` name 改为 `"ffk-barber"`
- 同时删除未被引用的 shadcn 组件文件（如 carousel.tsx、resizable.tsx、form.tsx 等）

### 修复15：删除废弃代码
- 删除 `src/components/sheets/MemberDetailSheet.tsx`（已确认无引用）
- 删除 `src/lib/syncManager.ts`
- `src/components/SyncStatusIndicator.tsx`：移除对 syncManager 的引用，只保留在线状态和手动刷新
- `src/pages/NotFound.tsx`：中文化（"抱歉！"、"页面未找到"、"返回首页"）

---

## 阶段五：业务逻辑复用与分页（修复13, 14, 7）

### 修复13：营收计算去重
- 新建 `src/lib/statsCalculator.ts`：导出 `calculateStats` 和 `calculateDailyRevenue`
- `useStore.ts` 的 `getTodayStats`、`transactionService.ts` 的 `getTodayStats`、`Reports.tsx` 趋势计算均调用此共享函数

### 修复14：交易分组去重
- 新建 `src/lib/transactionGrouping.ts`：导出 `GroupedTransaction` 接口和 `groupTransactions` 函数
- `Transactions.tsx` 和 `MemberDetailDialog.tsx` 均改为 import 此共享模块

### 修复7：数据分页（服务端）
- `transactionService.ts`：新增 `getPage(page, pageSize, filters?)` + `getCount(filters?)`
- `memberService.ts`：新增 `getPage(page, pageSize, search?)` + `getCount(search?)`
- `useCloudData.ts`：`useMembers` / `useTransactions` 支持分页参数
- `Members.tsx`：改服务端分页搜索
- `Transactions.tsx`：改服务端分页
- `Dashboard.tsx`：使用 `transactionService.getRecent(5)` 替代全量加载

---

## 阶段六：性能与可靠性（修复5, 16, 17）

### 修复5：单元测试
- 新建 `src/lib/calculatePayment.ts`：从 Cashier 提取纯函数
- 新建 `src/test/calculatePayment.test.ts`：测试多种支付场景
- 新建 `src/lib/statsCalculator.ts`（修复13已创建）
- 新建 `src/test/todayStats.test.ts`
- 新建 `src/test/pinyin.test.ts`
- 新建 `src/test/memberService.test.ts`（mock Supabase）
- 删除 `src/test/example.test.ts`

### 修复16：React StrictMode + 加载状态
- `src/main.tsx`：添加 `<React.StrictMode>` 包裹
- `src/components/auth/ProtectedRoute.tsx`：loading 改为居中 spin 动画（已完成，当前使用 Loader2）

### 修复17：性能优化
- `Cashier.tsx`：`calculatePayment` 用 `useMemo` 缓存；购物车卡次计算预处理
- `vite.config.ts`：添加 `build.rollupOptions.output.manualChunks` 分包
- `Settings.tsx`：通知开关标注"即将推出"并禁用

---

## 需要的数据库迁移（合并为一次）

```text
1. rate_limits 表 + check_rate_limit RPC（修复9）
2. process_checkout RPC 函数（修复1）
3. increment_member_balance / decrement_member_balance RPC（修复2）
```

## 需要的 Edge Function

```text
1. 更新 verify-password（修复3, 4, 9, 10）
2. 新建 checkout（修复1）
```

## 需要的 Secret

```text
1. ADMIN_PASSWORD_SALT（修复4）
```

## 文件变更总览

| 操作 | 文件 |
|------|------|
| 新建 | `supabase/functions/checkout/index.ts` |
| 新建 | `src/lib/calculatePayment.ts` |
| 新建 | `src/lib/statsCalculator.ts` |
| 新建 | `src/lib/transactionGrouping.ts` |
| 新建 | `src/test/calculatePayment.test.ts` |
| 新建 | `src/test/todayStats.test.ts` |
| 新建 | `src/test/pinyin.test.ts` |
| 新建 | `src/test/memberService.test.ts` |
| 修改 | `supabase/functions/verify-password/index.ts` |
| 修改 | `supabase/config.toml` |
| 修改 | `src/lib/crypto.ts` |
| 修改 | `src/lib/adminApi.ts` |
| 修改 | `src/pages/Cashier.tsx` |
| 修改 | `src/pages/Members.tsx` |
| 修改 | `src/pages/Transactions.tsx` |
| 修改 | `src/pages/Dashboard.tsx` |
| 修改 | `src/pages/Reports.tsx` |
| 修改 | `src/pages/Settings.tsx` |
| 修改 | `src/pages/NotFound.tsx` |
| 修改 | `src/pages/Services.tsx` |
| 修改 | `src/pages/Appointments.tsx` |
| 修改 | `src/hooks/useCloudData.ts` |
| 修改 | `src/services/memberService.ts` |
| 修改 | `src/services/transactionService.ts` |
| 修改 | `src/stores/useStore.ts` |
| 修改 | `src/components/SyncStatusIndicator.tsx` |
| 修改 | `src/components/dialogs/NewAppointmentDialog.tsx` |
| 修改 | `src/components/dialogs/AppointmentDetailDialog.tsx` |
| 修改 | `src/components/dialogs/QuickMemberDialog.tsx` |
| 修改 | `src/components/dialogs/QuickRechargeDialog.tsx` |
| 修改 | `src/components/dialogs/MemberDetailDialog.tsx` |
| 修改 | `src/components/dialogs/MemberDeleteWithRefundDialog.tsx` |
| 修改 | `src/components/dialogs/TransactionRefundDialog.tsx` |
| 修改 | `src/components/dialogs/AdminPasswordDialog.tsx` |
| 修改 | `src/components/dialogs/MigrationDialog.tsx` |
| 修改 | `src/App.tsx` |
| 修改 | `src/main.tsx` |
| 修改 | `tsconfig.app.json` |
| 修改 | `vite.config.ts` |
| 修改 | `package.json` |
| 删除 | `src/components/sheets/MemberDetailSheet.tsx` |
| 删除 | `src/lib/syncManager.ts` |
| 删除 | `src/test/example.test.ts` |

