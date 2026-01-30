// Print utility functions for receipt and report printing

interface ReceiptData {
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

export function generateReceiptHTML(data: ReceiptData): string {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const servicesHTML = data.services
    .map(
      (s) => `
      <tr>
        <td style="text-align:left;padding:4px 0;">${s.name}${s.useCard ? " (次卡)" : ""}</td>
        <td style="text-align:right;padding:4px 0;">¥${s.price.toFixed(2)}</td>
      </tr>
    `
    )
    .join("");

  let paymentDetailsHTML = "";
  if (data.cardDeduct > 0) {
    paymentDetailsHTML += `<div style="display:flex;justify-content:space-between;font-size:12px;color:#666;"><span>次卡抵扣</span><span style="color:#10b981;">-¥${data.cardDeduct.toFixed(2)}</span></div>`;
  }
  if (data.balanceDeduct > 0) {
    paymentDetailsHTML += `<div style="display:flex;justify-content:space-between;font-size:12px;"><span>余额支付</span><span>¥${data.balanceDeduct.toFixed(2)}</span></div>`;
  }
  if (data.cashNeed > 0) {
    paymentDetailsHTML += `<div style="display:flex;justify-content:space-between;font-size:12px;"><span>${paymentMethodLabels[data.paymentMethod] || data.paymentMethod}</span><span>¥${data.cashNeed.toFixed(2)}</span></div>`;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>消费小票</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: "Microsoft YaHei", "SimHei", sans-serif;
          font-size: 12px;
          width: 80mm;
          padding: 10px;
          background: white;
          color: #333;
        }
        .header {
          text-align: center;
          padding-bottom: 10px;
          border-bottom: 1px dashed #ccc;
        }
        .shop-name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        .shop-info {
          font-size: 10px;
          color: #666;
        }
        .section {
          padding: 10px 0;
          border-bottom: 1px dashed #ccc;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 12px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .total-section {
          padding: 10px 0;
          border-bottom: 1px dashed #ccc;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 16px;
          font-weight: bold;
        }
        .payment-section {
          padding: 10px 0;
        }
        .footer {
          text-align: center;
          padding-top: 15px;
          font-size: 12px;
        }
        .footer-text {
          margin-top: 8px;
          font-size: 10px;
          color: #999;
        }
        @media print {
          body {
            width: 80mm;
            min-height: auto;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">${data.shopName}</div>
        ${data.shopPhone ? `<div class="shop-info">${data.shopPhone}</div>` : ""}
        ${data.shopAddress ? `<div class="shop-info">${data.shopAddress}</div>` : ""}
      </div>
      
      <div class="section">
        <div class="info-row">
          <span>时间</span>
          <span>${formatTime(data.timestamp)}</span>
        </div>
        <div class="info-row">
          <span>顾客</span>
          <span>${data.isWalkIn ? "散客" : data.memberName}</span>
        </div>
      </div>
      
      <div class="section">
        <table class="items-table">
          <thead>
            <tr style="border-bottom:1px solid #eee;">
              <th style="text-align:left;padding:4px 0;font-weight:normal;color:#666;">项目</th>
              <th style="text-align:right;padding:4px 0;font-weight:normal;color:#666;">金额</th>
            </tr>
          </thead>
          <tbody>
            ${servicesHTML}
          </tbody>
        </table>
      </div>
      
      <div class="total-section">
        <div class="total-row">
          <span>合计</span>
          <span>¥${data.total.toFixed(2)}</span>
        </div>
      </div>
      
      <div class="payment-section">
        ${paymentDetailsHTML}
      </div>
      
      <div class="footer">
        <div>谢谢光临，欢迎再来！</div>
        <div class="footer-text">此小票为消费凭证，请妥善保管</div>
      </div>
    </body>
    </html>
  `;
}

export function printReceipt(data: ReceiptData): void {
  const html = generateReceiptHTML(data);
  const printWindow = window.open("", "_blank", "width=350,height=600");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}

export function printReport(): void {
  window.print();
}

// Calculate storage usage
export function getStorageUsage(): { 
  used: number; 
  usedKB: string; 
  usedMB: string; 
  maxMB: number; 
  percentage: number;
} {
  const data = localStorage.getItem("barber-shop-storage");
  const bytes = new Blob([data || ""]).size;
  const kb = bytes / 1024;
  const mb = kb / 1024;
  const maxMB = 5;
  
  return {
    used: bytes,
    usedKB: kb.toFixed(2),
    usedMB: mb.toFixed(2),
    maxMB,
    percentage: Math.round((mb / maxMB) * 100),
  };
}

// Generate Excel-compatible CSV with BOM
export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((h) => {
        const value = row[h];
        // Escape quotes and wrap in quotes
        const stringValue = String(value ?? "").replace(/"/g, '""');
        return `"${stringValue}"`;
      }).join(",")
    ),
  ].join("\n");

  // Add BOM for Excel compatibility
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
