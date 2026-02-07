import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Member, MemberCard, CardTemplate, Service, Appointment, Transaction, Order, ShopInfo, AuditLogEntry, SyncConfig } from '@/types';

interface Store {
  // 会员
  members: Member[];
  addMember: (member: Omit<Member, 'id' | 'createdAt' | 'cards'>) => Member;
  updateMember: (id: string, data: Partial<Member>) => void;
  getMember: (id: string) => Member | undefined;
  getMemberByPhone: (phone: string) => Member | undefined;
  isPhoneUnique: (phone: string, excludeMemberId?: string) => boolean;
  searchMembers: (query: string) => Member[];
  
  // 次卡
  addCardToMember: (memberId: string, templateId: string) => void;
  deductCard: (memberId: string, cardId: string) => void;
  refundCard: (memberId: string, cardId: string) => void;
  
  // 充值
  rechargeMember: (memberId: string, amount: number) => void;
  deductBalance: (memberId: string, amount: number) => void;
  refundBalance: (memberId: string, amount: number) => void;
  
  // 次卡模板
  cardTemplates: CardTemplate[];
  addCardTemplate: (template: Omit<CardTemplate, 'id'>) => void;
  updateCardTemplate: (id: string, data: Partial<CardTemplate>) => void;
  deleteCardTemplate: (id: string) => void;
  
  // 服务
  services: Service[];
  addService: (service: Omit<Service, 'id'>) => void;
  updateService: (id: string, data: Partial<Service>) => void;
  deleteService: (id: string) => void;
  
  // 预约
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => void;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  
  // 交易流水
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  voidTransaction: (id: string) => void;
  getRelatedTransactions: (transactionId: string) => Transaction[];
  
  // 订单
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'createdAt'>) => void;
  
  // 设置 - admin password is managed server-side only
  
  // 店铺信息
  shopInfo: ShopInfo;
  setShopInfo: (info: Partial<ShopInfo>) => void;
  
  // 删除会员
  deleteMember: (id: string) => void;
  
  // UI状态
  hiddenSections: string[];
  toggleSectionVisibility: (sectionId: string) => void;
  
  // 审计日志
  auditLogs: AuditLogEntry[];
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  clearAuditLogs: () => void;
  
  // 云端同步配置
  syncConfig: SyncConfig;
  setSyncConfig: (config: Partial<SyncConfig>) => void;
  
  // 统计
  getTodayStats: () => {
    revenue: number;
    recharge: number;
    consumption: number;
    newMembers: number;
    appointments: number;
  };
}

// Improved ID generator with timestamp + random to reduce collision risk
const generateId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${timestamp}-${random}`;
};

// Generate unique walk-in ID for each transaction
export const generateWalkInId = () => {
  return `walk-in-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
};

const isToday = (date: Date) => {
  const today = new Date();
  const d = new Date(date);
  return d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // 会员
      members: [],
      addMember: (memberData) => {
        const member: Member = {
          ...memberData,
          id: generateId(),
          createdAt: new Date(),
          cards: [],
        };
        set((state) => ({ members: [...state.members, member] }));
        return member;
      },
      updateMember: (id, data) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === id ? { ...m, ...data } : m
          ),
        }));
      },
      getMember: (id) => get().members.find((m) => m.id === id),
      getMemberByPhone: (phone) => get().members.find((m) => m.phone === phone),
      // Check if phone is unique (optionally excluding a specific member for edit scenarios)
      isPhoneUnique: (phone, excludeMemberId) => {
        return !get().members.some((m) => m.phone === phone && m.id !== excludeMemberId);
      },
      searchMembers: (query) => {
        const q = query.toLowerCase();
        return get().members.filter(
          (m) => m.name.toLowerCase().includes(q) || m.phone.includes(q)
        );
      },

      // 次卡
      addCardToMember: (memberId, templateId) => {
        const template = get().cardTemplates.find((t) => t.id === templateId);
        if (!template) return;
        
        const card: MemberCard = {
          id: generateId(),
          memberId,
          templateId,
          templateName: template.name,
          remainingCount: template.totalCount,
          services: template.serviceIds,
          createdAt: new Date(),
          // Store original values for accurate refund if template is deleted later
          originalPrice: template.price,
          originalTotalCount: template.totalCount,
        };
        
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, cards: [...m.cards, card] } : m
          ),
        }));
      },
      deductCard: (memberId, cardId) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId
              ? {
                  ...m,
                  cards: m.cards.map((c) =>
                    c.id === cardId
                      ? { ...c, remainingCount: Math.max(0, c.remainingCount - 1) }
                      : c
                  ),
                }
              : m
          ),
        }));
      },
      refundCard: (memberId, cardId) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId
              ? {
                  ...m,
                  cards: m.cards.map((c) =>
                    c.id === cardId
                      ? { ...c, remainingCount: c.remainingCount + 1 }
                      : c
                  ),
                }
              : m
          ),
        }));
      },

      // 充值 - 仅用于充值操作
      rechargeMember: (memberId, amount) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, balance: m.balance + amount } : m
          ),
        }));
      },
      // 扣款
      deductBalance: (memberId, amount) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, balance: Math.max(0, m.balance - amount) } : m
          ),
        }));
      },
      // 退款 - 专用于退款操作，独立于充值
      refundBalance: (memberId, amount) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, balance: m.balance + amount } : m
          ),
        }));
      },

      // 次卡模板
      cardTemplates: [
        { id: '1', name: '洗剪吹10次卡', price: 280, totalCount: 10, serviceIds: ['1'] },
        { id: '2', name: '烫发5次卡', price: 800, totalCount: 5, serviceIds: ['2'] },
      ],
      addCardTemplate: (template) => {
        set((state) => ({
          cardTemplates: [...state.cardTemplates, { ...template, id: generateId() }],
        }));
      },
      updateCardTemplate: (id, data) => {
        set((state) => ({
          cardTemplates: state.cardTemplates.map((t) =>
            t.id === id ? { ...t, ...data } : t
          ),
        }));
      },
      deleteCardTemplate: (id) => {
        set((state) => ({
          cardTemplates: state.cardTemplates.filter((t) => t.id !== id),
        }));
      },

      // 服务
      services: [
        { id: '1', name: '洗剪吹', price: 38, duration: 30, category: '剪发' },
        { id: '2', name: '烫发', price: 288, duration: 120, category: '烫染' },
        { id: '3', name: '染发', price: 188, duration: 90, category: '烫染' },
        { id: '4', name: '护理', price: 128, duration: 45, category: '护理' },
      ],
      addService: (service) => {
        set((state) => ({
          services: [...state.services, { ...service, id: generateId() }],
        }));
      },
      updateService: (id, data) => {
        set((state) => ({
          services: state.services.map((s) =>
            s.id === id ? { ...s, ...data } : s
          ),
        }));
      },
      deleteService: (id) => {
        set((state) => ({
          services: state.services.filter((s) => s.id !== id),
        }));
      },

      // 预约
      appointments: [],
      addAppointment: (appointment) => {
        set((state) => ({
          appointments: [
            ...state.appointments,
            { ...appointment, id: generateId(), createdAt: new Date() },
          ],
        }));
      },
      updateAppointment: (id, data) => {
        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === id ? { ...a, ...data } : a
          ),
        }));
      },

      // 交易流水
      transactions: [],
      addTransaction: (transaction) => {
        set((state) => ({
          transactions: [
            { ...transaction, id: generateId(), createdAt: new Date() },
            ...state.transactions,
          ],
        }));
      },
      voidTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, voided: true } : t
          ),
        }));
      },
      // 获取关联交易（消费+退款）
      getRelatedTransactions: (transactionId) => {
        const { transactions } = get();
        const mainTx = transactions.find(t => t.id === transactionId);
        if (!mainTx) return [];
        
        // 查找所有关联此交易的退款记录
        const relatedRefunds = transactions.filter(
          t => t.relatedTransactionId === transactionId
        );
        
        return [mainTx, ...relatedRefunds];
      },

      // 订单
      orders: [],
      addOrder: (order) => {
        set((state) => ({
          orders: [
            { ...order, id: generateId(), createdAt: new Date() },
            ...state.orders,
          ],
        }));
      },

      // 设置 - admin password managed server-side only (no client storage)
      
      // 店铺信息
      shopInfo: {
        name: '我的理发店',
        address: '',
        phone: '',
      },
      setShopInfo: (info) => {
        set((state) => ({
          shopInfo: { ...state.shopInfo, ...info },
        }));
      },
      
      // 删除会员
      deleteMember: (id) => {
        set((state) => ({
          members: state.members.filter((m) => m.id !== id),
        }));
      },
      
      // UI状态
      hiddenSections: [],
      toggleSectionVisibility: (sectionId) => {
        set((state) => ({
          hiddenSections: state.hiddenSections.includes(sectionId)
            ? state.hiddenSections.filter((s) => s !== sectionId)
            : [...state.hiddenSections, sectionId],
        }));
      },
      
      // 审计日志 - 限制最多1000条
      auditLogs: [],
      addAuditLog: (entry) => {
        set((state) => {
          const newLog: AuditLogEntry = {
            ...entry,
            id: generateId(),
            timestamp: new Date(),
          };
          const logs = [newLog, ...state.auditLogs].slice(0, 1000);
          return { auditLogs: logs };
        });
      },
      clearAuditLogs: () => set({ auditLogs: [] }),
      
      // 云端同步配置
      syncConfig: {
        enabled: false,
        apiUrl: '',
        syncStatus: 'idle',
      },
      setSyncConfig: (config) => {
        set((state) => ({
          syncConfig: { ...state.syncConfig, ...config },
        }));
      },

      // 统计 - 不统计已作废的交易和退款交易
      getTodayStats: () => {
        const { transactions, members, appointments } = get();
        const todayTransactions = transactions.filter((t) => 
          isToday(new Date(t.createdAt)) && !t.voided
        );
        
        // 今日实收 = 现金/微信/支付宝支付 + subTransactions中的补差价
        // 注意：退款交易不计入实收
        let revenue = todayTransactions
          .filter((t) => 
            t.type === 'consume' && 
            t.paymentMethod !== 'balance' &&
            t.paymentMethod !== undefined
          )
          .reduce((sum, t) => sum + t.amount, 0);
        
        // 加上subTransactions中的补差价（新逻辑）
        todayTransactions.forEach((t) => {
          if (t.type !== 'refund' && t.subTransactions) {
            t.subTransactions.forEach((sub) => {
              if (sub.type === 'price_diff') {
                revenue += sub.amount;
              }
            });
          }
        });
        
        // 兼容旧的price_diff交易记录
        revenue += todayTransactions
          .filter((t) => t.type === 'price_diff')
          .reduce((sum, t) => sum + t.amount, 0);
        
        // 今日充值（退款不影响充值统计，因为是预收款已收）
        const recharge = todayTransactions
          .filter((t) => t.type === 'recharge')
          .reduce((sum, t) => sum + t.amount, 0);
        
        // 今日消耗 = 储值卡/次卡消费（不包括补差价）
        // 注意：退款会减少消耗
        const consumption = todayTransactions
          .filter((t) => 
            (t.type === 'consume' && t.paymentMethod === 'balance') || 
            t.type === 'card_deduct'
          )
          .reduce((sum, t) => sum + t.amount, 0);
        
        const newMembers = members.filter((m) => isToday(new Date(m.createdAt))).length;
        
        const todayAppointments = appointments.filter((a) => isToday(new Date(a.date))).length;
        
        return { revenue, recharge, consumption, newMembers, appointments: todayAppointments };
      },
    }),
    {
      name: 'barber-shop-storage',
      partialize: (state: Record<string, unknown>) => {
        const rest = { ...state };
        delete rest.adminPassword;
        return rest;
      },
    } as any
  )
);
