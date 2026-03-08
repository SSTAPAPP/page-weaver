import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { Transaction } from "@/types";

const typeMap: Record<string, string> = {
  recharge: "充值",
  consume: "消费",
  card_deduct: "次卡扣除",
  refund: "退款",
  price_diff: "补差价",
};

const paymentMethodMap: Record<string, string> = {
  balance: "余额",
  wechat: "微信支付",
  alipay: "支付宝",
  cash: "现金",
};

function buildBarcodeHtml(code: string): string {
  const bars: { w: number; h: number }[] = [];
  for (let i = 0; i < code.length; i++) {
    const c = code.charCodeAt(i);
    bars.push({ w: c % 2 === 0 ? 2 : 1, h: i % 7 === 0 ? 36 : 32 });
    bars.push({ w: c % 3 === 0 ? 1 : 2, h: 32 });
    bars.push({ w: c % 5 === 0 ? 3 : 1, h: 34 });
  }
  while (bars.length < 60) bars.push({ w: 1, h: 32 });
  return `<div class="barcode"><div class="barcode-bars">${bars.slice(0, 60).map(b => `<div class="barcode-bar" style="width:${b.w}px;height:${b.h}px"></div>`).join("")}</div><div class="barcode-text">${code}</div></div>`;
}

export function printTransactionReceipt(
  tx: Transaction,
  shopInfo: { name: string; address: string; phone: string },
  refundTx?: Transaction
) {
  const time = format(new Date(tx.createdAt), "yyyy-MM-dd HH:mm:ss", { locale: zhCN });
  const txType = typeMap[tx.type] || tx.type;
  const method = tx.paymentMethod ? paymentMethodMap[tx.paymentMethod] || tx.paymentMethod : "—";

  // 子交易明细
  let subHtml = "";
  if (tx.subTransactions && Array.isArray(tx.subTransactions) && (tx.subTransactions as any[]).length > 0) {
    const subItems = (tx.subTransactions as any[]).map((sub: any) => {
      const subType = sub.type === 'balance' ? '余额' : sub.type === 'card' ? '次卡' : '补差价';
      const subMethod = sub.paymentMethod ? (paymentMethodMap[sub.paymentMethod] || sub.paymentMethod) : '';
      return `<div class="row"><span class="row-label">${subType}${subMethod ? ' · ' + subMethod : ''}</span><span class="row-value">¥${Number(sub.amount).toFixed(2)}</span></div>`;
    }).join("");
    subHtml = `<div class="section"><div class="section-title">支付明细</div>${subItems}</div>`;
  }

  // 退款信息
  let refundHtml = "";
  if (refundTx) {
    refundHtml = `<div class="section refund-section"><div class="section-title">退款信息</div>
      <div class="row"><span class="row-label">退款金额</span><span class="row-value refund-amount">+¥${refundTx.amount.toFixed(2)}</span></div>
      <div class="row"><span class="row-label">退款时间</span><span class="row-value">${format(new Date(refundTx.createdAt), "yyyy-MM-dd HH:mm:ss")}</span></div>
      <div class="row"><span class="row-label">退款说明</span><span class="row-value">${refundTx.description}</span></div>
    </div>`;
  }

  const voidedHtml = tx.voided ? `<div class="voided-badge">已作废</div>` : "";

  const html = `<!DOCTYPE html><html><head><title>交易凭证</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;width:80mm;max-width:80mm;padding:8mm 5mm;color:#111;font-size:12px;line-height:1.5}
.receipt-header{text-align:center;padding-bottom:8px;border-bottom:2px solid #111;margin-bottom:8px}
.shop-name{font-size:18px;font-weight:700;letter-spacing:2px}
.shop-meta{font-size:10px;color:#666;margin-top:2px}
.receipt-type{font-size:13px;font-weight:600;color:#333;margin-top:4px;letter-spacing:1px}
.section{margin:8px 0}
.section-title{font-size:10px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;padding-bottom:2px;border-bottom:1px dashed #ccc}
.row{display:flex;justify-content:space-between;align-items:center;padding:2px 0;font-size:12px}
.row-label{color:#333}
.row-value{font-weight:500;font-variant-numeric:tabular-nums}
.divider{border:none;border-top:1px dashed #ccc;margin:8px 0}
.total-row{display:flex;justify-content:space-between;align-items:baseline;padding:8px 0;border-top:2px solid #111;margin-top:4px}
.total-label{font-size:14px;font-weight:600}
.total-value{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}
.barcode{display:flex;flex-direction:column;align-items:center;margin-top:12px;padding-top:8px;border-top:1px dashed #ccc;gap:4px}
.barcode-bars{display:flex;align-items:flex-end;height:36px;gap:0.5px}
.barcode-bar{background:#111}
.barcode-text{font-size:9px;font-family:monospace;letter-spacing:2px;color:#666}
.footer{text-align:center;margin-top:12px;padding-top:8px;border-top:1px dashed #ccc}
.footer-text{font-size:10px;color:#999}
.voided-badge{text-align:center;font-size:14px;font-weight:700;color:#dc2626;border:2px solid #dc2626;padding:4px 12px;margin:8px auto;display:inline-block;transform:rotate(-5deg);letter-spacing:4px}
.refund-section{background:#fef2f2;padding:6px;border-radius:4px;margin:8px 0}
.refund-amount{color:#16a34a;font-weight:600}
@media print{body{width:80mm}@page{size:80mm auto;margin:0}}
</style></head><body>
<div class="receipt-header">
  <div class="shop-name">${shopInfo.name || "交易凭证"}</div>
  ${shopInfo.address ? `<div class="shop-meta">${shopInfo.address}</div>` : ""}
  ${shopInfo.phone ? `<div class="shop-meta">Tel: ${shopInfo.phone}</div>` : ""}
  <div class="receipt-type">交易凭证</div>
</div>
${voidedHtml ? `<div style="text-align:center">${voidedHtml}</div>` : ""}
<div class="section">
  <div class="row"><span class="row-label">流水号</span><span class="row-value">${tx.id.substring(0, 12).toUpperCase()}</span></div>
  <div class="row"><span class="row-label">时间</span><span class="row-value">${time}</span></div>
  <div class="row"><span class="row-label">会员</span><span class="row-value">${tx.memberName}</span></div>
  <div class="row"><span class="row-label">类型</span><span class="row-value">${txType}</span></div>
  <div class="row"><span class="row-label">支付方式</span><span class="row-value">${method}</span></div>
</div>
<hr class="divider"/>
<div class="section">
  <div class="section-title">交易说明</div>
  <div style="font-size:12px;padding:4px 0">${tx.description}</div>
</div>
${subHtml}
${refundHtml}
<div class="total-row">
  <span class="total-label">交易金额</span>
  <span class="total-value">¥${tx.amount.toFixed(2)}</span>
</div>
${buildBarcodeHtml(tx.id.substring(0, 16).toUpperCase())}
<div class="footer">
  <div class="footer-text">此凭证由系统自动生成</div>
  ${shopInfo.name ? `<div class="footer-text" style="margin-top:4px">—— ${shopInfo.name} ——</div>` : ""}
</div>
</body><script>window.onload=function(){window.print();window.close()}<\/script></html>`;

  const w = window.open("", "_blank", "width=400,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
