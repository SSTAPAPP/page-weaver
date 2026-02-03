import { supabase } from "@/integrations/supabase/client";
import { Member, MemberCard } from "@/types";

export interface DbMember {
  id: string;
  phone: string;
  name: string;
  gender: string | null;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface DbMemberCard {
  id: string;
  member_id: string;
  template_id: string | null;
  template_name: string;
  remaining_count: number;
  services: string[] | null;
  original_price: number;
  original_total_count: number;
  created_at: string;
}

// Transform database member to app member
export const transformDbMember = (dbMember: DbMember, cards: MemberCard[] = []): Member => ({
  id: dbMember.id,
  phone: dbMember.phone,
  name: dbMember.name,
  gender: (dbMember.gender as 'male' | 'female') || 'male',
  balance: Number(dbMember.balance) || 0,
  createdAt: new Date(dbMember.created_at),
  cards,
});

// Transform database card to app card
export const transformDbCard = (dbCard: DbMemberCard): MemberCard => ({
  id: dbCard.id,
  memberId: dbCard.member_id,
  templateId: dbCard.template_id || '',
  templateName: dbCard.template_name,
  remainingCount: dbCard.remaining_count,
  services: dbCard.services || [],
  createdAt: new Date(dbCard.created_at),
  originalPrice: Number(dbCard.original_price) || 0,
  originalTotalCount: dbCard.original_total_count,
});

export const memberService = {
  async getAll(): Promise<Member[]> {
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });

    if (membersError) throw membersError;

    const { data: cards, error: cardsError } = await supabase
      .from('member_cards')
      .select('*');

    if (cardsError) throw cardsError;

    const cardsByMember = (cards || []).reduce((acc, card) => {
      if (!acc[card.member_id]) acc[card.member_id] = [];
      acc[card.member_id].push(transformDbCard(card as DbMemberCard));
      return acc;
    }, {} as Record<string, MemberCard[]>);

    return (members || []).map(m => 
      transformDbMember(m as DbMember, cardsByMember[m.id] || [])
    );
  },

  async getById(id: string): Promise<Member | null> {
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .single();

    if (memberError) return null;

    const { data: cards } = await supabase
      .from('member_cards')
      .select('*')
      .eq('member_id', id);

    return transformDbMember(
      member as DbMember,
      (cards || []).map(c => transformDbCard(c as DbMemberCard))
    );
  },

  async getByPhone(phone: string): Promise<Member | null> {
    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error || !member) return null;

    const { data: cards } = await supabase
      .from('member_cards')
      .select('*')
      .eq('member_id', member.id);

    return transformDbMember(
      member as DbMember,
      (cards || []).map(c => transformDbCard(c as DbMemberCard))
    );
  },

  async create(member: Omit<Member, 'id' | 'createdAt' | 'cards'>): Promise<Member> {
    const { data, error } = await supabase
      .from('members')
      .insert({
        phone: member.phone,
        name: member.name,
        gender: member.gender,
        balance: member.balance || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return transformDbMember(data as DbMember, []);
  },

  async update(id: string, updates: Partial<Member>): Promise<void> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
    if (updates.balance !== undefined) dbUpdates.balance = updates.balance;

    const { error } = await supabase
      .from('members')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async addCard(memberId: string, card: Omit<MemberCard, 'id' | 'createdAt' | 'memberId'>): Promise<MemberCard> {
    const { data, error } = await supabase
      .from('member_cards')
      .insert({
        member_id: memberId,
        template_id: card.templateId || null,
        template_name: card.templateName,
        remaining_count: card.remainingCount,
        services: card.services,
        original_price: card.originalPrice,
        original_total_count: card.originalTotalCount,
      })
      .select()
      .single();

    if (error) throw error;
    return transformDbCard(data as DbMemberCard);
  },

  async updateCard(cardId: string, updates: Partial<MemberCard>): Promise<void> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.remainingCount !== undefined) dbUpdates.remaining_count = updates.remainingCount;

    const { error } = await supabase
      .from('member_cards')
      .update(dbUpdates)
      .eq('id', cardId);

    if (error) throw error;
  },

  async deleteCard(cardId: string): Promise<void> {
    const { error } = await supabase
      .from('member_cards')
      .delete()
      .eq('id', cardId);

    if (error) throw error;
  },

  async updateBalance(memberId: string, newBalance: number): Promise<void> {
    const { error } = await supabase
      .from('members')
      .update({ balance: newBalance })
      .eq('id', memberId);

    if (error) throw error;
  },

  async search(query: string): Promise<Member[]> {
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const memberIds = (members || []).map(m => m.id);
    if (memberIds.length === 0) return [];

    const { data: cards } = await supabase
      .from('member_cards')
      .select('*')
      .in('member_id', memberIds);

    const cardsByMember = (cards || []).reduce((acc, card) => {
      if (!acc[card.member_id]) acc[card.member_id] = [];
      acc[card.member_id].push(transformDbCard(card as DbMemberCard));
      return acc;
    }, {} as Record<string, MemberCard[]>);

    return (members || []).map(m => 
      transformDbMember(m as DbMember, cardsByMember[m.id] || [])
    );
  },

  async isPhoneUnique(phone: string, excludeMemberId?: string): Promise<boolean> {
    let query = supabase
      .from('members')
      .select('id')
      .eq('phone', phone);

    if (excludeMemberId) {
      query = query.neq('id', excludeMemberId);
    }

    const { data } = await query;
    return !data || data.length === 0;
  },
};
