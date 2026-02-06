import { supabase } from "@/integrations/supabase/client";
import { ShopInfo, SyncConfig } from "@/types";
import { Json } from "@/integrations/supabase/types";

export interface DbShopSettings {
  id: string;
  shop_name: string | null;
  shop_address: string | null;
  shop_phone: string | null;
  admin_password_hash: string | null;
  theme: string | null;
  font_size: string | null;
  sidebar_collapsed: boolean | null;
  sync_config: Json;
  updated_at: string;
}

export interface ShopSettings {
  id: string;
  shopInfo: ShopInfo;
  adminPasswordHash: string | null;
  theme: 'light' | 'dark' | 'system';
  fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  sidebarCollapsed: boolean;
  syncConfig: SyncConfig;
  updatedAt: Date;
}

const transformDbSettings = (db: DbShopSettings): ShopSettings => ({
  id: db.id,
  shopInfo: {
    name: db.shop_name || 'FFk',
    address: db.shop_address || '',
    phone: db.shop_phone || '',
  },
  adminPasswordHash: db.admin_password_hash,
  theme: (db.theme as 'light' | 'dark' | 'system') || 'system',
  fontSize: (db.font_size as 'xs' | 'sm' | 'base' | 'lg' | 'xl') || 'base',
  sidebarCollapsed: db.sidebar_collapsed || false,
  syncConfig: (db.sync_config as unknown as SyncConfig) || {
    enabled: false,
    apiUrl: '',
    syncStatus: 'idle',
  },
  updatedAt: new Date(db.updated_at),
});

export const settingsService = {
  async get(): Promise<ShopSettings | null> {
    const { data, error } = await supabase
      .from('shop_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching settings:', error);
      return null;
    }
    return transformDbSettings(data as DbShopSettings);
  },

  async update(updates: Partial<{
    shopInfo: ShopInfo;
    adminPasswordHash: string;
    theme: 'light' | 'dark' | 'system';
    fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
    sidebarCollapsed: boolean;
    syncConfig: SyncConfig;
  }>): Promise<void> {
    const dbUpdates: Record<string, unknown> = {};
    
    if (updates.shopInfo) {
      dbUpdates.shop_name = updates.shopInfo.name;
      dbUpdates.shop_address = updates.shopInfo.address;
      dbUpdates.shop_phone = updates.shopInfo.phone;
    }
    if (updates.adminPasswordHash !== undefined) {
      dbUpdates.admin_password_hash = updates.adminPasswordHash;
    }
    if (updates.theme !== undefined) {
      dbUpdates.theme = updates.theme;
    }
    if (updates.fontSize !== undefined) {
      dbUpdates.font_size = updates.fontSize;
    }
    if (updates.sidebarCollapsed !== undefined) {
      dbUpdates.sidebar_collapsed = updates.sidebarCollapsed;
    }
    if (updates.syncConfig !== undefined) {
      dbUpdates.sync_config = updates.syncConfig as unknown as Json;
    }

    // Get the first settings row
    const { data: existing } = await supabase
      .from('shop_settings')
      .select('id')
      .limit(1)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('shop_settings')
        .update(dbUpdates)
        .eq('id', existing.id);

      if (error) throw error;
    }
  },

  async updatePassword(passwordHash: string): Promise<void> {
    const { data: existing } = await supabase
      .from('shop_settings')
      .select('id')
      .limit(1)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('shop_settings')
        .update({ admin_password_hash: passwordHash })
        .eq('id', existing.id);

      if (error) throw error;
    }
  },

  // Password hash is no longer exposed to client
  // Use server-side verification via Edge Functions instead
  async getPasswordHash(): Promise<string | null> {
    // Return null - password verification should go through Edge Function
    console.warn('getPasswordHash is deprecated. Use verifyAdminPassword from adminApi instead.');
    return null;
  },

  async updateSidebarCollapsed(collapsed: boolean): Promise<void> {
    const { data: existing } = await supabase
      .from('shop_settings')
      .select('id')
      .limit(1)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('shop_settings')
        .update({ sidebar_collapsed: collapsed })
        .eq('id', existing.id);

      if (error) throw error;
    }
  },
};
