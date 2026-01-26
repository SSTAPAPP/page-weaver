import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Member, MemberCard, CardTemplate, Service, Appointment, Transaction, Order } from '@/types';

interface Store {
  // 会员
  members: Member[];
  addMember: (member: Omit<Member, 'id' | 'createdAt' | 'cards'>) => Member;
  updateMember: (id: string, data: Partial<Member>) => void;
  getMember: (id: string) => Member | undefined;
  getMemberByPhone: (phone: string) => Member | undefined;
  searchMembers: (query: string) => Member[];
  
  // 次卡
  addCardToMember: (memberId: string, templateId: string) => void;
  deductCard: (memberId: string, cardId: string) => void;
  
  // 充值
  rechargeMember: (memberId: string, amount: number) => void;
  deductBalance: (memberId: string, amount: number) => void;
  
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
  
  // 订单
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'createdAt'>) => void;
  
  // 统计
  getTodayStats: () => {
    revenue: number;
    recharge: number;
    consumption: number;
    newMembers: number;
    appointments: number;
  };
}

const generateId = () => Math.random().toString(36).substring(2, 9);

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

      // 充值
      rechargeMember: (memberId, amount) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, balance: m.balance + amount } : m
          ),
        }));
      },
      deductBalance: (memberId, amount) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, balance: Math.max(0, m.balance - amount) } : m
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

      // 统计
      getTodayStats: () => {
        const { transactions, members, appointments } = get();
        const todayTransactions = transactions.filter((t) => isToday(new Date(t.createdAt)));
        
        const revenue = todayTransactions
          .filter((t) => t.type === 'consume' && t.paymentMethod !== 'balance')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const recharge = todayTransactions
          .filter((t) => t.type === 'recharge')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const consumption = todayTransactions
          .filter((t) => t.type === 'consume' || t.type === 'card_deduct')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const newMembers = members.filter((m) => isToday(new Date(m.createdAt))).length;
        
        const todayAppointments = appointments.filter((a) => isToday(new Date(a.date))).length;
        
        return { revenue, recharge, consumption, newMembers, appointments: todayAppointments };
      },
    }),
    {
      name: 'barber-shop-storage',
    }
  )
);
