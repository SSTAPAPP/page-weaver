import { supabase } from "@/integrations/supabase/client";
import { Service } from "@/types";

export interface DbService {
  id: string;
  name: string;
  price: number;
  duration: number | null;
  category: string;
  is_active: boolean | null;
  created_at: string;
}

const transformDbService = (db: DbService): Service => ({
  id: db.id,
  name: db.name,
  price: Number(db.price) || 0,
  duration: db.duration || 0,
  category: db.category,
});

export const serviceService = {
  async getAll(): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(s => transformDbService(s as DbService));
  },

  async getById(id: string): Promise<Service | null> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return transformDbService(data as DbService);
  },

  async create(service: Omit<Service, 'id'>): Promise<Service> {
    const { data, error } = await supabase
      .from('services')
      .insert({
        name: service.name,
        price: service.price,
        duration: service.duration,
        category: service.category,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return transformDbService(data as DbService);
  },

  async update(id: string, updates: Partial<Service>): Promise<void> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
    if (updates.category !== undefined) dbUpdates.category = updates.category;

    const { error } = await supabase
      .from('services')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },
};
