import { useRef } from "react";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/stores/useStore";

interface ReceiptService {
  name: string;
  price: number;
  useCard: boolean;
  cardName?: string;
}

interface ReceiptCardUsage {
  cardName: string;
  originalCount: number;
  consumedCount: number;
  remainingCount: number;
}

export interface ReceiptData {
  orderNo: string;
  isWalkIn: boolean;
  memberName?: string;
  memberPhone?: string;
  memberBalance?: number;
  balanceAfter?: number;
  services: ReceiptService[];
  cardDeductTotal: number;
  balanceDeduct: number;
  cashNeed: number;
  total: number;
  paymentMethod: string;
  cardUsageInfo: ReceiptCardUsage[];
  createdAt: Date;
}

const paymentMethodMap: Record<string, string> = {
  wechat: "微信支付",
  alipay: "支付宝",
  cash: "现金",
  balance: "余额支付",
};

// 简易条形码生成（纯CSS实现）
function Barcode({ code }: { code: string }) {
  // 将字符串转为伪随机条纹
  const bars: number[] = [];
  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    bars.push(charCode % 2 === 0 ? 2 : 1);
    bars.push(charCode % 3 === 0 ? 1 : 2);
    bars.push(charCode % 5 === 0 ? 3 : 1);
  }
  // 补齐到至少60条
  while (bars.length < 60) {
    bars.push(bars[bars.length % bars.length] || 1);
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-end h-10 gap-px">
        {bars.slice(0, 60).map((w, i) => (
          <div
            key={i}
            className="bg-foreground"
            style={{
              width: w === 3 ? 3 : w === 2 ? 2 : 1,
              height: i % 7 === 0 ? 36 : 32,
            }}
          />
        ))}
      </div>
      <span className="text-[10px] font-mono tracking-widest text-muted-foreground">
        {code}
      </span>
    </div>
  );
}

export function CheckoutReceipt({ data }: { data: ReceiptData }) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { shopInfo } = useStore();

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open("", "_blank", "width=400,height=700");
    if (!printWindow) return;

    const content = receiptRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>消费小票</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            width: 80mm;
            max-width: 80mm;
            padding: 8mm 5mm;
            color: #111;
            font-size: 12px;
            line-height: 1.5;
          }
          .receipt-header { text-align: center; padding-bottom: 8px; border-bottom: 2px solid #111; margin-bottom: 8px; }
          .shop-name { font-size: 18px; font-weight: 700; letter-spacing: 2px; }
          .shop-meta { font-size: 10px; color: #666; margin-top: 2px; }
          .section { margin: 8px 0; }
          .section-title { font-size: 10px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; padding-bottom: 2px; border-bottom: 1px dashed #ccc; }
          .row { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; font-size: 12px; }
          .row-label { color: #333; }
          .row-value { font-weight: 500; font-variant-numeric: tabular-nums; }
          .service-item { display: flex; justify-content: space-between; padding: 3px 0; }
          .service-name { flex: 1; }
          .service-tag { font-size: 9px; background: #f0f0f0; padding: 0 4px; border-radius: 2px; margin-left: 4px; }
          .service-price { font-variant-numeric: tabular-nums; }
          .service-price.card-used { text-decoration: line-through; color: #999; }
          .divider { border: none; border-top: 1px dashed #ccc; margin: 8px 0; }
          .total-row { display: flex; justify-content: space-between; align-items: baseline; padding: 8px 0; border-top: 2px solid #111; margin-top: 4px; }
          .total-label { font-size: 14px; font-weight: 600; }
          .total-value { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; }
          .barcode { display: flex; flex-direction: column; align-items: center; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #ccc; gap: 4px; }
          .barcode-bars { display: flex; align-items: flex-end; height: 36px; gap: 0.5px; }
          .barcode-bar { background: #111; }
          .barcode-text { font-size: 9px; font-family: monospace; letter-spacing: 2px; color: #666; }
          .footer { text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #ccc; }
          .footer-text { font-size: 10px; color: #999; }
          .card-change { font-size: 11px; color: #666; padding: 2px 0; }
          .highlight { font-weight: 600; color: #111; }
          @media print {
            body { width: 80mm; }
            @page { size: 80mm auto; margin: 0; }
          }
        </style>
      </head>
      <body>${content}</body>
      <script>window.onload = function() { window.print(); window.close(); }<\/script>
      </html>
    `);
    printWindow.document.close();
  };

  const orderTime = format(data.createdAt, "yyyy-MM-dd HH:mm:ss");
  const cardServices = data.services.filter(s => s.useCard);
  const paidServices = data.services.filter(s => !s.useCard);

  return (
    <div>
      {/* 隐藏的打印内容 */}
      <div ref={receiptRef} className="hidden">
        {/* 头部 */}
        <div className="receipt-header">
          <div className="shop-name">{shopInfo.name || "消费小票"}</div>
          {shopInfo.address && <div className="shop-meta">{shopInfo.address}</div>}
          {shopInfo.phone && <div className="shop-meta">Tel: {shopInfo.phone}</div>}
        </div>

        {/* 订单信息 */}
        <div className="section">
          <div className="row">
            <span className="row-label">单号</span>
            <span className="row-value">{data.orderNo}</span>
          </div>
          <div className="row">
            <span className="row-label">时间</span>
            <span className="row-value">{orderTime}</span>
          </div>
          <div className="row">
            <span className="row-label">顾客</span>
            <span className="row-value">
              {data.isWalkIn ? "散客" : `${data.memberName} (${data.memberPhone || ''})`}
            </span>
          </div>
        </div>

        <hr className="divider" />

        {/* 消费明细 */}
        <div className="section">
          <div className="section-title">消费明细 ({data.services.length}项)</div>
          {data.services.map((service, index) => (
            <div key={index} className="service-item">
              <span className="service-name">
                {index + 1}. {service.name}
                {service.useCard && (
                  <span className="service-tag">{service.cardName || '次卡'}</span>
                )}
              </span>
              <span className={`service-price ${service.useCard ? 'card-used' : ''}`}>
                ¥{service.price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <hr className="divider" />

        {/* 支付方式 */}
        <div className="section">
          <div className="section-title">支付详情</div>
          {data.cardDeductTotal > 0 && (
            <div className="row">
              <span className="row-label">次卡抵扣</span>
              <span className="row-value">-¥{data.cardDeductTotal.toFixed(2)}</span>
            </div>
          )}
          {data.balanceDeduct > 0 && (
            <div className="row">
              <span className="row-label">余额支付</span>
              <span className="row-value">-¥{data.balanceDeduct.toFixed(2)}</span>
            </div>
          )}
          {data.cashNeed > 0 && (
            <div className="row">
              <span className="row-label">{paymentMethodMap[data.paymentMethod] || data.paymentMethod}</span>
              <span className="row-value">¥{data.cashNeed.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* 次卡使用变化 */}
        {data.cardUsageInfo.length > 0 && (
          <div className="section">
            <div className="section-title">卡项变动</div>
            {data.cardUsageInfo.map((card, index) => (
              <div key={index} className="card-change">
                {card.cardName}: {card.originalCount}次 → <span className="highlight">{card.remainingCount}次</span> (本次用{card.consumedCount}次)
              </div>
            ))}
          </div>
        )}

        {/* 余额变化 */}
        {!data.isWalkIn && data.balanceDeduct > 0 && data.memberBalance !== undefined && (
          <div className="section">
            <div className="section-title">余额变动</div>
            <div className="card-change">
              ¥{data.memberBalance.toFixed(2)} → <span className="highlight">¥{data.balanceAfter?.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* 合计 */}
        <div className="total-row">
          <span className="total-label">消费合计</span>
          <span className="total-value">¥{data.total.toFixed(2)}</span>
        </div>

        {/* 防伪条码 */}
        <div className="barcode">
          <div className="barcode-bars">
            {(() => {
              const code = data.orderNo;
              const bars: { w: number; h: number }[] = [];
              for (let i = 0; i < code.length; i++) {
                const c = code.charCodeAt(i);
                bars.push({ w: c % 2 === 0 ? 2 : 1, h: i % 7 === 0 ? 36 : 32 });
                bars.push({ w: c % 3 === 0 ? 1 : 2, h: 32 });
                bars.push({ w: c % 5 === 0 ? 3 : 1, h: 34 });
              }
              while (bars.length < 60) bars.push({ w: 1, h: 32 });
              return bars.slice(0, 60).map((b, i) => (
                <div key={i} className="barcode-bar" style={{ width: b.w, height: b.h }} />
              ));
            })()}
          </div>
          <div className="barcode-text">{data.orderNo}</div>
        </div>

        {/* 底部 */}
        <div className="footer">
          <div className="footer-text">感谢您的光临，期待再次为您服务</div>
          <div className="footer-text" style={{ marginTop: '4px' }}>
            {shopInfo.name && `—— ${shopInfo.name} ——`}
          </div>
        </div>
      </div>

      {/* 打印按钮 */}
      <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
        <Printer className="h-3.5 w-3.5" />
        打印小票
      </Button>
    </div>
  );
}
