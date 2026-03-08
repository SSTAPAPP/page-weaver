import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types";
import { Json } from "@/integrations/supabase/types";

export interface DbTransaction {
  id: string;
  member_id: string;
  member_name: string;
  type: string;
  amount: number;
  payment_method: string | null;
  description: string | null;
  voided: boolean | null;
  related_transaction_id: string | null;
  sub_transactions: Json;
  created_at: string;
}

const transformDbTransaction = (db: DbTransaction): Transaction => ({
  id: db.id,
  memberId: db.member_id,
  memberName: db.member_name,
  type: db.type as Transaction['type'],
  amount: Number(db.amount) || 0,
  paymentMethod: db.payment_method as Transaction['paymentMethod'],
  description: db.description || '',
  voided: db.voided || false,
  relatedTransactionId: db.related_transaction_id || undefined,
  subTransactions: db.sub_transactions as Transaction['subTransactions'],
  createdAt: new Date(db.created_at),
});

function computeTransactionStats(transactions: Transaction[]): {
  revenue: number;
  recharge: number;
  consumption: number;
} {
  let revenue = transactions
    .filter(t => t.type === 'consume' && t.paymentMethod !== 'balance' && t.paymentMethod !== undefined)
    .reduce((sum, t) => sum + t.amount, 0);
  transactions.forEach(t => {
    if (t.type !== 'refund' && t.subTransactions) {
      t.subTransactions.forEach(sub => {
        if (sub.type === 'price_diff') { revenue += sub.amount; }
      });
    }
  });
  revenue += transactions.filter(t => t.type === 'price_diff').reduce((sum, t) => sum + t.amount, 0);
  const recharge = transactions.filter(t => t.type === 'recharge').reduce((sum, t) => sum + t.amount, 0);
  const consumption = transactions
    .filter(t => (t.type === 'consume' && t.paymentMethod === 'balance') || t.type === 'card_deduct')
    .reduce((sum, t) => sum + t.amount, 0);
  return { revenue, recharge, consumption };
}

export const transactionService = {
  async getAll(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(t => transformDbTransaction(t as DbTransaction));
  },

  async getByMemberId(memberId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(t => transformDbTransaction(t as DbTransaction));
  },

  async getRelated(transactionId: string): Promise<Transaction[]> {
    const { data: mainTx, error: mainError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (mainError || !mainTx) return [];

    const { data: relatedTxs, error: relatedError } = await supabase
      .from('transactions')
      .select('*')
      .eq('related_transaction_id', transactionId);

    if (relatedError) return [transformDbTransaction(mainTx as DbTransaction)];

    return [
      transformDbTransaction(mainTx as DbTransaction),
      ...(relatedTxs || []).map(t => transformDbTransaction(t as DbTransaction))
    ];
  },

  async create(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        member_id: transaction.memberId,
        member_name: transaction.memberName,
        type: transaction.type,
        amount: transaction.amount,
        payment_method: transaction.paymentMethod || null,
        description: transaction.description,
        voided: transaction.voided || false,
        related_transaction_id: transaction.relatedTransactionId || null,
        sub_transactions: transaction.subTransactions as Json,
      })
      .select()
      .single();

    if (error) throw error;
    return transformDbTransaction(data as DbTransaction);
  },

  async void(id: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .update({ voided: true })
      .eq('id', id);

    if (error) throw error;
  },

  async getTodayStats(): Promise<{
    revenue: number;
    recharge: number;
    consumption: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', today.toISOString())
      .eq('voided', false);
    if (error) throw error;
    return computeTransactionStats((data || []).map(t => transformDbTransaction(t as DbTransaction)));
  },

  async getStatsForDateRange(startDate: Date, endDate: Date): Promise<{
    revenue: number;
    recharge: number;
    consumption: number;
  }> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .eq('voided', false);
    if (error) throw error;
    return computeTransactionStats((data || []).map(t => transformDbTransaction(t as DbTransaction)));
  },
};
