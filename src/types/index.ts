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
  type: 'recharge' | 'consume' | 'card_deduct' | 'refund';
  amount: number;
  paymentMethod?: 'balance' | 'wechat' | 'alipay' | 'cash';
  description: string;
  createdAt: Date;
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
