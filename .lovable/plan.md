

# 阶段二 + 阶段四实施计划

本次实施将完成阶段二（原子操作与竞态修复）和阶段四（Toast 统一与代码清理），并验证密码功能。

---

## 阶段二：原子操作与竞态修复

### 2A. 新建 checkout Edge Function（修复1）

**新建文件：** `supabase/functions/checkout/index.ts`
- 接收完整结账参数（memberId, cart, paymentMethod 等）
- 验证 JWT 认证
- 调用 `process_checkout` 数据库 RPC（已在之前的迁移中创建）在单一事务内完成：扣卡、扣余额、写交易、写订单
- 散客模式直接写交易和订单（无需扣余额/卡）

**修改文件：** `supabase/config.toml`
- 添加 `[functions.checkout]` 配置，设置 `verify_jwt = false`

**修改文件：** `src/lib/adminApi.ts`
- 新增 `processCheckout()` 函数，调用 checkout Edge Function

**修改文件：** `src/pages/Cashier.tsx`
- `handleConfirmCheckout` 中将4步 await（updateCard, updateBalance, create transaction, create order）替换为单次 `processCheckout()` 调用
- 移除对 `memberService`、`transactionService`、`orderService` 的直接导入（结账相关）
- 移除 `useStore` 中的 `deductBalance`、`deductCard` 等引用

### 2B. 余额竞态修复（修复2）

**修改文件：** `src/services/memberService.ts`
- 新增 `incrementBalance(memberId, amount)` 方法（调用 `increment_member_balance` RPC）
- 新增 `decrementBalance(memberId, amount)` 方法（调用 `decrement_member_balance` RPC）

**修改文件：** `src/components/dialogs/QuickRechargeDialog.tsx`
- 第86行：`updateBalance(id, balance + amount)` 改为 `incrementBalance(id, amount)`

**修改文件：** `src/components/dialogs/QuickMemberDialog.tsx`
- 第114行：`updateBalance(member.id, amount)` 改为 `incrementBalance(member.id, amount)`

---

## 阶段四：Toast 统一与代码清理

### 4A. 统一 Toast 为 sonner（修复11）

将以下 15 个文件中的 `useToast` 替换为 sonner 的 `toast`：

| 文件 | 替换方式 |
|------|---------|
| `src/App.tsx` | 移除 `<Toaster />`（shadcn），只保留 `<Sonner />` |
| `src/pages/Cashier.tsx` | `useToast` -> `import { toast } from "sonner"` |
| `src/pages/Services.tsx` | 同上 |
| `src/pages/Settings.tsx` | 同上 |
| `src/pages/Dashboard.tsx` | 无 useToast，无需改 |
| `src/components/dialogs/AdminPasswordDialog.tsx` | 同上 |
| `src/components/dialogs/QuickMemberDialog.tsx` | 同上 |
| `src/components/dialogs/QuickRechargeDialog.tsx` | 同上 |
| `src/components/dialogs/MemberDetailDialog.tsx` | 同上 |
| `src/components/dialogs/MemberDeleteWithRefundDialog.tsx` | 同上 |
| `src/components/dialogs/TransactionRefundDialog.tsx` | 同上 |
| `src/components/dialogs/NewAppointmentDialog.tsx` | 同上 |
| `src/components/dialogs/AppointmentDetailDialog.tsx` | 同上 |
| `src/components/dialogs/MigrationDialog.tsx` | 同上 |

**替换规则：**
- `toast({ title: "X", variant: "destructive" })` -> `toast.error("X")`
- `toast({ title: "X", description: "Y", variant: "destructive" })` -> `toast.error("X", { description: "Y" })`
- `toast({ title: "X" })` -> `toast.success("X")`
- `toast({ title: "X", description: "Y" })` -> `toast.success("X", { description: "Y" })`

`AppSidebar.tsx` 已经使用 sonner，无需修改。

### 4B. 验证密码功能

实施完成后，通过 Edge Function curl 工具直接测试 `verify-password` 的 `/verify` 端点，确认：
- 认证正常（JWT 校验）
- 密码验证返回正确结果
- 速率限制生效

---

## 技术细节

### checkout Edge Function 结构

```text
POST /checkout
Body: { memberId?, memberName, cart: [...], paymentMethod, isWalkIn }
Response: { success, transaction_id, order_id }
```

内部调用 `process_checkout` RPC，该 RPC 在单一数据库事务中：
1. 扣减所有次卡的 remaining_count
2. 计算并扣减余额
3. 插入 transaction 记录
4. 插入 order 记录

### memberService 新增方法

```typescript
async incrementBalance(memberId: string, amount: number): Promise<void> {
  await supabase.rpc('increment_member_balance', { p_member_id: memberId, p_amount: amount });
}

async decrementBalance(memberId: string, amount: number): Promise<void> {
  await supabase.rpc('decrement_member_balance', { p_member_id: memberId, p_amount: amount });
}
```

### 文件变更总览

| 操作 | 文件 |
|------|------|
| 新建 | `supabase/functions/checkout/index.ts` |
| 修改 | `supabase/config.toml` |
| 修改 | `src/lib/adminApi.ts` |
| 修改 | `src/pages/Cashier.tsx` |
| 修改 | `src/services/memberService.ts` |
| 修改 | `src/components/dialogs/QuickRechargeDialog.tsx` |
| 修改 | `src/components/dialogs/QuickMemberDialog.tsx` |
| 修改 | `src/App.tsx` |
| 修改 | `src/pages/Services.tsx` |
| 修改 | `src/pages/Settings.tsx` |
| 修改 | `src/components/dialogs/AdminPasswordDialog.tsx` |
| 修改 | `src/components/dialogs/MemberDetailDialog.tsx` |
| 修改 | `src/components/dialogs/MemberDeleteWithRefundDialog.tsx` |
| 修改 | `src/components/dialogs/TransactionRefundDialog.tsx` |
| 修改 | `src/components/dialogs/NewAppointmentDialog.tsx` |
| 修改 | `src/components/dialogs/AppointmentDetailDialog.tsx` |
| 修改 | `src/components/dialogs/MigrationDialog.tsx` |

