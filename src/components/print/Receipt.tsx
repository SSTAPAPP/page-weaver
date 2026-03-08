import { forwardRef } from "react";

interface ReceiptProps {
  shopName: string;
  shopPhone?: string;
  shopAddress?: string;
  memberName: string;
  isWalkIn: boolean;
  services: { name: string; price: number; useCard: boolean }[];
  cardDeduct: number;
  balanceDeduct: number;
  cashNeed: number;
  paymentMethod: string;
  total: number;
  timestamp: Date;
}

const paymentMethodLabels: Record<string, string> = {
  wechat: "微信支付",
  alipay: "支付宝",
  cash: "现金",
  balance: "余额支付",
};

/**
 * Receipt is a print-only component rendered on white paper.
 * Uses print-safe inline colors intentionally — not themed.
 */
export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ shopName, shopPhone, shopAddress, memberName, isWalkIn, services, cardDeduct, balanceDeduct, cashNeed, paymentMethod, total, timestamp }, ref) => {
    const formatTime = (date: Date) => {
      return new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    };

    const borderClass = "border-dashed border-muted-foreground/40";

    return (
      <div ref={ref} className="receipt-container w-[80mm] bg-background p-4 text-foreground font-mono text-xs print:bg-white print:text-black">
        {/* Header */}
        <div className={`text-center border-b ${borderClass} pb-3 mb-3`}>
          <div className="text-lg font-bold">{shopName}</div>
          {shopPhone && <div className="text-xs text-muted-foreground">{shopPhone}</div>}
          {shopAddress && <div className="text-xs text-muted-foreground">{shopAddress}</div>}
        </div>

        {/* Info */}
        <div className={`border-b ${borderClass} pb-3 mb-3 space-y-1`}>
          <div className="flex justify-between">
            <span>时间</span>
            <span>{formatTime(timestamp)}</span>
          </div>
          <div className="flex justify-between">
            <span>顾客</span>
            <span>{isWalkIn ? "散客" : memberName}</span>
          </div>
        </div>

        {/* Items */}
        <div className={`border-b ${borderClass} pb-3 mb-3`}>
          <div className="flex justify-between text-muted-foreground mb-2">
            <span>项目</span>
            <span>金额</span>
          </div>
          {services.map((service, index) => (
            <div key={index} className="flex justify-between py-1">
              <span>{service.name}{service.useCard ? " (次卡)" : ""}</span>
              <span>¥{service.price.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className={`border-b ${borderClass} pb-3 mb-3`}>
          <div className="flex justify-between text-base font-bold">
            <span>合计</span>
            <span>¥{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Details */}
        <div className="pb-3 mb-3 space-y-1">
          {cardDeduct > 0 && (
            <div className="flex justify-between text-success">
              <span>次卡抵扣</span>
              <span>-¥{cardDeduct.toFixed(2)}</span>
            </div>
          )}
          {balanceDeduct > 0 && (
            <div className="flex justify-between">
              <span>余额支付</span>
              <span>¥{balanceDeduct.toFixed(2)}</span>
            </div>
          )}
          {cashNeed > 0 && (
            <div className="flex justify-between">
              <span>{paymentMethodLabels[paymentMethod] || paymentMethod}</span>
              <span>¥{cashNeed.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`text-center pt-3 border-t ${borderClass}`}>
          <div className="mb-2">谢谢光临，欢迎再来！</div>
          <div className="text-xs text-muted-foreground">此小票为消费凭证，请妥善保管</div>
        </div>
      </div>
    );
  }
);

Receipt.displayName = "Receipt";
