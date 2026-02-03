import { supabase } from "@/integrations/supabase/client";
import { Order } from "@/types";
import { Json } from "@/integrations/supabase/types";

export interface DbOrder {
  id: string;
  member_id: string;
  member_name: string;
  services: Json;
  total_amount: number;
  payments: Json;
  created_at: string;
}

const transformDbOrder = (db: DbOrder): Order => ({
  id: db.id,
  memberId: db.member_id,
  memberName: db.member_name,
  services: db.services as unknown as Order['services'],
  totalAmount: Number(db.total_amount) || 0,
  payments: db.payments as unknown as Order['payments'],
  createdAt: new Date(db.created_at),
});

export const orderService = {
  async getAll(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(o => transformDbOrder(o as DbOrder));
  },

  async getByMemberId(memberId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(o => transformDbOrder(o as DbOrder));
  },

  async create(order: Omit<Order, 'id' | 'createdAt'>): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        member_id: order.memberId,
        member_name: order.memberName,
        services: order.services as unknown as Json,
        total_amount: order.totalAmount,
        payments: order.payments as unknown as Json,
      })
      .select()
      .single();

    if (error) throw error;
    return transformDbOrder(data as DbOrder);
  },
};
