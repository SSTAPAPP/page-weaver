import { supabase } from "@/integrations/supabase/client";
import { CardTemplate } from "@/types";

export interface DbCardTemplate {
  id: string;
  name: string;
  price: number;
  total_count: number;
  service_ids: string[] | null;
  is_active: boolean | null;
  created_at: string;
}

const transformDbCardTemplate = (db: DbCardTemplate): CardTemplate => ({
  id: db.id,
  name: db.name,
  price: Number(db.price) || 0,
  totalCount: db.total_count,
  serviceIds: db.service_ids || [],
});

export const cardService = {
  async getAll(): Promise<CardTemplate[]> {
    const { data, error } = await supabase
      .from('card_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(c => transformDbCardTemplate(c as DbCardTemplate));
  },

  async getById(id: string): Promise<CardTemplate | null> {
    const { data, error } = await supabase
      .from('card_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return transformDbCardTemplate(data as DbCardTemplate);
  },

  async create(template: Omit<CardTemplate, 'id'>): Promise<CardTemplate> {
    const { data, error } = await supabase
      .from('card_templates')
      .insert({
        name: template.name,
        price: template.price,
        total_count: template.totalCount,
        service_ids: template.serviceIds,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return transformDbCardTemplate(data as DbCardTemplate);
  },

  async update(id: string, updates: Partial<CardTemplate>): Promise<void> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.totalCount !== undefined) dbUpdates.total_count = updates.totalCount;
    if (updates.serviceIds !== undefined) dbUpdates.service_ids = updates.serviceIds;

    const { error } = await supabase
      .from('card_templates')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('card_templates')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },
};
