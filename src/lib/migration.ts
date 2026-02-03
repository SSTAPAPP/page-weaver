import { supabase } from "@/integrations/supabase/client";
import { Member, CardTemplate, Service, Transaction, Appointment, Order, AuditLogEntry, ShopInfo, SyncConfig } from "@/types";
import { Json } from "@/integrations/supabase/types";

interface LocalStorageData {
  state: {
    members: Member[];
    cardTemplates: CardTemplate[];
    services: Service[];
    transactions: Transaction[];
    appointments: Appointment[];
    orders: Order[];
    auditLogs: AuditLogEntry[];
    adminPassword: string;
    shopInfo: ShopInfo;
    syncConfig: SyncConfig;
  };
}

export interface MigrationProgress {
  stage: string;
  current: number;
  total: number;
  percentage: number;
}

export type MigrationCallback = (progress: MigrationProgress) => void;

const STORAGE_KEY = 'barber-shop-storage';
const MIGRATED_KEY = 'cloud-migrated';

export const migrationService = {
  isMigrated(): boolean {
    return localStorage.getItem(MIGRATED_KEY) === 'true';
  },

  hasLocalData(): boolean {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return false;
    try {
      const parsed = JSON.parse(data) as LocalStorageData;
      return (parsed.state?.members?.length || 0) > 0 ||
             (parsed.state?.services?.length || 0) > 0 ||
             (parsed.state?.transactions?.length || 0) > 0;
    } catch {
      return false;
    }
  },

  getLocalData(): LocalStorageData | null {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as LocalStorageData;
    } catch {
      return null;
    }
  },

  async migrateToCloud(onProgress?: MigrationCallback): Promise<{ success: boolean; error?: string }> {
    const localData = this.getLocalData();
    if (!localData?.state) {
      return { success: true }; // Nothing to migrate
    }

    const state = localData.state;
    const stages = [
      { name: '服务项目', data: state.services || [], table: 'services' },
      { name: '次卡模板', data: state.cardTemplates || [], table: 'card_templates' },
      { name: '会员数据', data: state.members || [], table: 'members' },
      { name: '交易记录', data: state.transactions || [], table: 'transactions' },
      { name: '预约记录', data: state.appointments || [], table: 'appointments' },
      { name: '订单记录', data: state.orders || [], table: 'orders' },
      { name: '审计日志', data: state.auditLogs || [], table: 'audit_logs' },
    ];

    const totalItems = stages.reduce((sum, s) => sum + s.data.length, 0);
    let processedItems = 0;

    try {
      // Migrate services
      for (const service of (state.services || [])) {
        await supabase.from('services').upsert({
          id: service.id,
          name: service.name,
          price: service.price,
          duration: service.duration,
          category: service.category,
          is_active: true,
        });
        processedItems++;
        onProgress?.({ stage: '服务项目', current: processedItems, total: totalItems, percentage: Math.round(processedItems / totalItems * 100) });
      }

      // Migrate card templates
      for (const template of (state.cardTemplates || [])) {
        await supabase.from('card_templates').upsert({
          id: template.id,
          name: template.name,
          price: template.price,
          total_count: template.totalCount,
          service_ids: template.serviceIds,
          is_active: true,
        });
        processedItems++;
        onProgress?.({ stage: '次卡模板', current: processedItems, total: totalItems, percentage: Math.round(processedItems / totalItems * 100) });
      }

      // Migrate members and their cards
      for (const member of (state.members || [])) {
        await supabase.from('members').upsert({
          id: member.id,
          phone: member.phone,
          name: member.name,
          gender: member.gender,
          balance: member.balance,
          created_at: new Date(member.createdAt).toISOString(),
        });

        // Migrate member cards
        for (const card of (member.cards || [])) {
          await supabase.from('member_cards').upsert({
            id: card.id,
            member_id: member.id,
            template_id: card.templateId || null,
            template_name: card.templateName,
            remaining_count: card.remainingCount,
            services: card.services,
            original_price: card.originalPrice,
            original_total_count: card.originalTotalCount,
            created_at: new Date(card.createdAt).toISOString(),
          });
        }
        processedItems++;
        onProgress?.({ stage: '会员数据', current: processedItems, total: totalItems, percentage: Math.round(processedItems / totalItems * 100) });
      }

      // Migrate transactions
      for (const tx of (state.transactions || [])) {
        await supabase.from('transactions').upsert({
          id: tx.id,
          member_id: tx.memberId,
          member_name: tx.memberName,
          type: tx.type,
          amount: tx.amount,
          payment_method: tx.paymentMethod || null,
          description: tx.description,
          voided: tx.voided || false,
          related_transaction_id: tx.relatedTransactionId || null,
          sub_transactions: tx.subTransactions as unknown as Json,
          created_at: new Date(tx.createdAt).toISOString(),
        });
        processedItems++;
        onProgress?.({ stage: '交易记录', current: processedItems, total: totalItems, percentage: Math.round(processedItems / totalItems * 100) });
      }

      // Migrate appointments
      for (const apt of (state.appointments || [])) {
        const dateStr = apt.date instanceof Date 
          ? apt.date.toISOString().split('T')[0]
          : new Date(apt.date).toISOString().split('T')[0];
        
        await supabase.from('appointments').upsert({
          id: apt.id,
          member_id: apt.memberId || null,
          member_name: apt.memberName,
          member_phone: apt.memberPhone || null,
          service_id: apt.serviceId || null,
          service_name: apt.serviceName,
          date: dateStr,
          time: apt.time,
          status: apt.status,
          created_at: new Date(apt.createdAt).toISOString(),
        });
        processedItems++;
        onProgress?.({ stage: '预约记录', current: processedItems, total: totalItems, percentage: Math.round(processedItems / totalItems * 100) });
      }

      // Migrate orders
      for (const order of (state.orders || [])) {
        await supabase.from('orders').upsert({
          id: order.id,
          member_id: order.memberId,
          member_name: order.memberName,
          services: order.services as unknown as Json,
          total_amount: order.totalAmount,
          payments: order.payments as unknown as Json,
          created_at: new Date(order.createdAt).toISOString(),
        });
        processedItems++;
        onProgress?.({ stage: '订单记录', current: processedItems, total: totalItems, percentage: Math.round(processedItems / totalItems * 100) });
      }

      // Migrate audit logs (last 1000 only)
      const logsToMigrate = (state.auditLogs || []).slice(0, 1000);
      for (const log of logsToMigrate) {
        await supabase.from('audit_logs').upsert({
          id: log.id,
          action: log.action,
          category: log.category,
          details: log.details,
          metadata: log.metadata as unknown as Json,
          created_at: new Date(log.timestamp).toISOString(),
        });
        processedItems++;
        onProgress?.({ stage: '审计日志', current: processedItems, total: totalItems, percentage: Math.round(processedItems / totalItems * 100) });
      }

      // Update shop settings
      if (state.shopInfo || state.adminPassword) {
        const { data: existing } = await supabase
          .from('shop_settings')
          .select('id')
          .limit(1)
          .single();

        if (existing) {
          await supabase.from('shop_settings').update({
            shop_name: state.shopInfo?.name,
            shop_address: state.shopInfo?.address,
            shop_phone: state.shopInfo?.phone,
            admin_password_hash: state.adminPassword,
          }).eq('id', existing.id);
        }
      }

      // Mark migration as complete
      localStorage.setItem(MIGRATED_KEY, 'true');
      
      return { success: true };
    } catch (error) {
      console.error('Migration error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '迁移过程中发生错误' 
      };
    }
  },

  clearLocalData(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  resetMigration(): void {
    localStorage.removeItem(MIGRATED_KEY);
  },
};
