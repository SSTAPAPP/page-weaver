import { useStore } from "@/stores/useStore";
import { format } from "date-fns";

export interface ReceiptData {
  orderNo: string;
  isWalkIn: boolean;
  memberName?: string;
  memberPhone?: string;
  memberBalance?: number;
  balanceAfter?: number;
  services: { name: string; price: number; useCard: boolean; cardName?: string }[];
  cardDeductTotal: number;
  balanceDeduct: number;
  cashNeed: number;
  total: number;
  paymentMethod: string;
  cardUsageInfo: { cardName: string; originalCount: number; consumedCount: number; remainingCount: number }[];
  createdAt: Date;
}

const paymentMethodMap: Record<string, string> = {
  wechat: "微信支付",
  alipay: "支付宝",
  cash: "现金",
  balance: "余额支付",
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
  const barsHtml = bars.slice(0, 60).map(b => `<div class="barcode-bar" style="width:${b.w}px;height:${b.h}px"></div>`).join("");
  return `<div class="barcode"><div class="barcode-bars">${barsHtml}</div><div class="barcode-text">${code}</div></div>`;
}

export function printReceipt(data: ReceiptData, shopInfo: { name: string; address: string; phone: string }) {
  const orderTime = format(data.createdAt, "yyyy-MM-dd HH:mm:ss");

  const servicesHtml = data.services.map((s, i) =>
    `<div class="service-item"><span class="service-name">${i + 1}. ${s.name}${s.useCard ? `<span class="service-tag">${s.cardName || '次卡'}</span>` : ''}</span><span class="service-price${s.useCard ? ' card-used' : ''}">¥${s.price.toFixed(2)}</span></div>`
  ).join("");

  let paymentHtml = "";
  if (data.cardDeductTotal > 0) paymentHtml += `<div class="row"><span class="row-label">次卡抵扣</span><span class="row-value">-¥${data.cardDeductTotal.toFixed(2)}</span></div>`;
  if (data.balanceDeduct > 0) paymentHtml += `<div class="row"><span class="row-label">余额支付</span><span class="row-value">-¥${data.balanceDeduct.toFixed(2)}</span></div>`;
  if (data.cashNeed > 0) paymentHtml += `<div class="row"><span class="row-label">${paymentMethodMap[data.paymentMethod] || data.paymentMethod}</span><span class="row-value">¥${data.cashNeed.toFixed(2)}</span></div>`;

  let cardChangeHtml = "";
  if (data.cardUsageInfo.length > 0) {
    cardChangeHtml = `<div class="section"><div class="section-title">卡项变动</div>${data.cardUsageInfo.map(c =>
      `<div class="card-change">${c.cardName}: ${c.originalCount}次 → <span class="highlight">${c.remainingCount}次</span> (本次用${c.consumedCount}次)</div>`
    ).join("")}</div>`;
  }

  let balanceChangeHtml = "";
  if (!data.isWalkIn && data.balanceDeduct > 0 && data.memberBalance !== undefined) {
    balanceChangeHtml = `<div class="section"><div class="section-title">余额变动</div><div class="card-change">¥${data.memberBalance.toFixed(2)} → <span class="highlight">¥${data.balanceAfter?.toFixed(2)}</span></div></div>`;
  }

  const html = `<!DOCTYPE html><html><head><title>消费小票</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;width:80mm;max-width:80mm;padding:8mm 5mm;color:#111;font-size:12px;line-height:1.5}
.receipt-header{text-align:center;padding-bottom:8px;border-bottom:2px solid #111;margin-bottom:8px}
.shop-name{font-size:18px;font-weight:700;letter-spacing:2px}
.shop-meta{font-size:10px;color:#666;margin-top:2px}
.section{margin:8px 0}
.section-title{font-size:10px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;padding-bottom:2px;border-bottom:1px dashed #ccc}
.row{display:flex;justify-content:space-between;align-items:center;padding:2px 0;font-size:12px}
.row-label{color:#333}
.row-value{font-weight:500;font-variant-numeric:tabular-nums}
.service-item{display:flex;justify-content:space-between;padding:3px 0}
.service-name{flex:1}
.service-tag{font-size:9px;background:#f0f0f0;padding:0 4px;border-radius:2px;margin-left:4px}
.service-price{font-variant-numeric:tabular-nums}
.service-price.card-used{text-decoration:line-through;color:#999}
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
.card-change{font-size:11px;color:#666;padding:2px 0}
.highlight{font-weight:600;color:#111}
@media print{body{width:80mm}@page{size:80mm auto;margin:0}}
</style></head><body>
<div class="receipt-header">
  <div class="shop-name">${shopInfo.name || "消费小票"}</div>
  ${shopInfo.address ? `<div class="shop-meta">${shopInfo.address}</div>` : ""}
  ${shopInfo.phone ? `<div class="shop-meta">Tel: ${shopInfo.phone}</div>` : ""}
</div>
<div class="section">
  <div class="row"><span class="row-label">单号</span><span class="row-value">${data.orderNo}</span></div>
  <div class="row"><span class="row-label">时间</span><span class="row-value">${orderTime}</span></div>
  <div class="row"><span class="row-label">顾客</span><span class="row-value">${data.isWalkIn ? "散客" : `${data.memberName} (${data.memberPhone || ""})`}</span></div>
</div>
<hr class="divider"/>
<div class="section">
  <div class="section-title">消费明细 (${data.services.length}项)</div>
  ${servicesHtml}
</div>
<hr class="divider"/>
<div class="section">
  <div class="section-title">支付详情</div>
  ${paymentHtml}
</div>
${cardChangeHtml}
${balanceChangeHtml}
<div class="total-row">
  <span class="total-label">消费合计</span>
  <span class="total-value">¥${data.total.toFixed(2)}</span>
</div>
${buildBarcodeHtml(data.orderNo)}
<div class="footer">
  <div class="footer-text">感谢您的光临，期待再次为您服务</div>
  ${shopInfo.name ? `<div class="footer-text" style="margin-top:4px">—— ${shopInfo.name} ——</div>` : ""}
</div>
</body><script>window.onload=function(){window.print();window.close()}<\/script></html>`;

  const printWindow = window.open("", "_blank", "width=400,height=700");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}
