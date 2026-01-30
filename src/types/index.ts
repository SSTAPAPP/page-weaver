// 会员类型
export interface Member {
  id: string;
  phone: string;
  name: string;
  gender: 'male' | 'female';
  balance: number;
  createdAt: Date;
  cards: MemberCard[];
}

// 会员次卡
export interface MemberCard {
  id: string;
  memberId: string;
  templateId: string;
  templateName: string;
  remainingCount: number;
  services: string[];
  createdAt: Date;
  // Store original values for accurate refund calculation if template is deleted
  originalPrice: number;
  originalTotalCount: number;
}

// 次卡模板
export interface CardTemplate {
  id: string;
  name: string;
  price: number;
  totalCount: number;
  serviceIds: string[];
}

// 服务项目
export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // 分钟
  category: string;
}

// 预约
export interface Appointment {
  id: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  serviceId: string;
  serviceName: string;
  date: Date;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'noshow';
  createdAt: Date;
}

// 交易流水
export interface Transaction {
  id: string;
  memberId: string;
  memberName: string;
  type: 'recharge' | 'consume' | 'card_deduct' | 'refund' | 'price_diff';
  amount: number;
  paymentMethod?: 'balance' | 'wechat' | 'alipay' | 'cash';
  description: string;
  createdAt: Date;
  // 退款相关
  voided?: boolean;
  relatedTransactionId?: string;
  // 合并交易（储值卡/次卡+补差价）
  subTransactions?: {
    type: 'balance' | 'card' | 'price_diff';
    amount: number;
    paymentMethod?: string;
    cardId?: string; // 次卡ID，用于退款时恢复次数
  }[];
}

// 订单
export interface Order {
  id: string;
  memberId: string;
  memberName: string;
  services: OrderService[];
  totalAmount: number;
  payments: OrderPayment[];
  createdAt: Date;
}

export interface OrderService {
  serviceId: string;
  serviceName: string;
  price: number;
  useCard: boolean;
  cardId?: string;
}

export interface OrderPayment {
  method: 'balance' | 'wechat' | 'alipay' | 'cash' | 'card';
  amount: number;
  cardId?: string;
}

// 店铺信息
export interface ShopInfo {
  name: string;
  address: string;
  phone: string;
}

// 审计日志
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  action: string;
  category: 'member' | 'transaction' | 'service' | 'card' | 'system' | 'security';
  details: string;
  metadata?: Record<string, unknown>;
}

// 云端同步配置
export interface SyncConfig {
  enabled: boolean;
  apiUrl: string;
  lastSyncTime?: Date;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
}
