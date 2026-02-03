import { supabase } from "@/integrations/supabase/client";
import { AuditLogEntry } from "@/types";
import { Json } from "@/integrations/supabase/types";

export interface DbAuditLog {
  id: string;
  action: string;
  category: string;
  details: string | null;
  metadata: Json;
  created_at: string;
}

const transformDbAuditLog = (db: DbAuditLog): AuditLogEntry => ({
  id: db.id,
  action: db.action,
  category: db.category as AuditLogEntry['category'],
  details: db.details || '',
  metadata: db.metadata as Record<string, unknown>,
  timestamp: new Date(db.created_at),
});

// Mask phone number for privacy (show last 4 digits)
export const maskPhone = (phone: string): string => {
  if (!phone || phone.length < 4) return phone;
  return '*'.repeat(phone.length - 4) + phone.slice(-4);
};

// Mask amount for privacy
export const maskAmount = (amount: number): string => {
  return '***.**';
};

export const auditService = {
  async getAll(limit = 1000): Promise<AuditLogEntry[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(a => transformDbAuditLog(a as DbAuditLog));
  },

  async getByCategory(category: AuditLogEntry['category']): Promise<AuditLogEntry[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(a => transformDbAuditLog(a as DbAuditLog));
  },

  async create(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        action: entry.action,
        category: entry.category,
        details: entry.details,
        metadata: entry.metadata as Json,
      })
      .select()
      .single();

    if (error) throw error;
    return transformDbAuditLog(data as DbAuditLog);
  },

  async clear(): Promise<void> {
    const { error } = await supabase
      .from('audit_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) throw error;
  },

  async cleanup(keepCount = 1000): Promise<void> {
    // Get IDs of logs to keep
    const { data: toKeep, error: selectError } = await supabase
      .from('audit_logs')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(keepCount);

    if (selectError) throw selectError;

    const keepIds = (toKeep || []).map(l => l.id);
    if (keepIds.length === 0) return;

    // Delete older logs
    const { error: deleteError } = await supabase
      .from('audit_logs')
      .delete()
      .not('id', 'in', `(${keepIds.join(',')})`);

    // Note: This deletion may fail if there are no logs to delete, which is fine
    if (deleteError && !deleteError.message.includes('no rows')) {
      throw deleteError;
    }
  },

  async search(query: string): Promise<AuditLogEntry[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .or(`action.ilike.%${query}%,details.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;
    return (data || []).map(a => transformDbAuditLog(a as DbAuditLog));
  },

  async getByDateRange(startDate: Date, endDate: Date): Promise<AuditLogEntry[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(a => transformDbAuditLog(a as DbAuditLog));
  },
};
