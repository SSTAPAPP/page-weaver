import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/stores/useStore";
import { memberService } from "@/services/memberService";
import { serviceService } from "@/services/serviceService";
import { cardService } from "@/services/cardService";
import { transactionService } from "@/services/transactionService";
import { appointmentService } from "@/services/appointmentService";
import { toast } from "sonner";

/**
 * Bridges Zustand local store with Supabase cloud database.
 *
 * Strategy: Supabase is source of truth.
 * - On auth: load all data from Supabase into Zustand
 * - On mutation: update Zustand immediately (optimistic), then persist to Supabase
 * - On Supabase error: data remains in Zustand/localStorage as fallback
 */
export function useSupabaseSync() {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState(false);
  const hasSynced = useRef(false);

  // Load all data from Supabase into Zustand store
  const loadFromSupabase = useCallback(async () => {
    setIsLoading(true);
    setSyncError(false);

    try {
      const [members, services, cardTemplates, transactions, appointments] = await Promise.all([
        memberService.getAll().catch(() => null),
        serviceService.getAll().catch(() => null),
        cardService.getAll().catch(() => null),
        transactionService.getAll().catch(() => null),
        appointmentService.getAll().catch(() => null),
      ]);

      const store = useStore.getState();

      // Only replace store data if Supabase returned data
      // This preserves local data if Supabase is unreachable
      if (members !== null) {
        useStore.setState({ members });
      }
      if (services !== null) {
        useStore.setState({ services });
      }
      if (cardTemplates !== null) {
        useStore.setState({ cardTemplates });
      }
      if (transactions !== null) {
        useStore.setState({ transactions });
      }
      if (appointments !== null) {
        useStore.setState({ appointments });
      }

      setLastSyncTime(new Date());
      hasSynced.current = true;
    } catch (err) {
      console.error("Failed to load from Supabase:", err);
      setSyncError(true);
      // Don't toast on initial load to avoid noise - local data still works
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync on authentication
  useEffect(() => {
    if (isAuthenticated && !hasSynced.current) {
      loadFromSupabase();
    }
    if (!isAuthenticated) {
      hasSynced.current = false;
    }
  }, [isAuthenticated, loadFromSupabase]);

  // Manual sync trigger
  const syncNow = useCallback(async () => {
    await loadFromSupabase();
    if (!syncError) {
      toast.success("数据已同步");
    }
  }, [loadFromSupabase, syncError]);

  return { isLoading, lastSyncTime, syncError, syncNow };
}

// ============================================================
// Background write-through helpers
// Called from store actions to persist changes to Supabase.
// These are fire-and-forget - errors are logged but don't block UI.
// ============================================================

export const supabaseWriteThrough = {
  async createMember(memberData: Parameters<typeof memberService.create>[0]) {
    try {
      return await memberService.create(memberData);
    } catch (err) {
      console.error("[Sync] Failed to create member in Supabase:", err);
      return null;
    }
  },

  async updateMember(id: string, data: Record<string, unknown>) {
    try {
      await memberService.update(id, data);
    } catch (err) {
      console.error("[Sync] Failed to update member in Supabase:", err);
    }
  },

  async deleteMember(id: string) {
    try {
      await memberService.delete(id);
    } catch (err) {
      console.error("[Sync] Failed to delete member in Supabase:", err);
    }
  },

  async updateMemberBalance(memberId: string, newBalance: number) {
    try {
      await memberService.updateBalance(memberId, newBalance);
    } catch (err) {
      console.error("[Sync] Failed to update balance in Supabase:", err);
    }
  },

  async addMemberCard(memberId: string, card: Parameters<typeof memberService.addCard>[1]) {
    try {
      return await memberService.addCard(memberId, card);
    } catch (err) {
      console.error("[Sync] Failed to add card in Supabase:", err);
      return null;
    }
  },

  async updateMemberCard(cardId: string, updates: Parameters<typeof memberService.updateCard>[1]) {
    try {
      await memberService.updateCard(cardId, updates);
    } catch (err) {
      console.error("[Sync] Failed to update card in Supabase:", err);
    }
  },

  async createService(serviceData: Parameters<typeof serviceService.create>[0]) {
    try {
      return await serviceService.create(serviceData);
    } catch (err) {
      console.error("[Sync] Failed to create service in Supabase:", err);
      return null;
    }
  },

  async updateService(id: string, data: Parameters<typeof serviceService.update>[1]) {
    try {
      await serviceService.update(id, data);
    } catch (err) {
      console.error("[Sync] Failed to update service in Supabase:", err);
    }
  },

  async deleteService(id: string) {
    try {
      await serviceService.delete(id);
    } catch (err) {
      console.error("[Sync] Failed to delete service in Supabase:", err);
    }
  },

  async createCardTemplate(data: Parameters<typeof cardService.create>[0]) {
    try {
      return await cardService.create(data);
    } catch (err) {
      console.error("[Sync] Failed to create card template in Supabase:", err);
      return null;
    }
  },

  async updateCardTemplate(id: string, data: Parameters<typeof cardService.update>[1]) {
    try {
      await cardService.update(id, data);
    } catch (err) {
      console.error("[Sync] Failed to update card template in Supabase:", err);
    }
  },

  async deleteCardTemplate(id: string) {
    try {
      await cardService.delete(id);
    } catch (err) {
      console.error("[Sync] Failed to delete card template in Supabase:", err);
    }
  },

  async createTransaction(data: Parameters<typeof transactionService.create>[0]) {
    try {
      return await transactionService.create(data);
    } catch (err) {
      console.error("[Sync] Failed to create transaction in Supabase:", err);
      return null;
    }
  },

  async voidTransaction(id: string) {
    try {
      await transactionService.void(id);
    } catch (err) {
      console.error("[Sync] Failed to void transaction in Supabase:", err);
    }
  },

  async createAppointment(data: Parameters<typeof appointmentService.create>[0]) {
    try {
      return await appointmentService.create(data);
    } catch (err) {
      console.error("[Sync] Failed to create appointment in Supabase:", err);
      return null;
    }
  },

  async updateAppointment(id: string, data: Parameters<typeof appointmentService.update>[1]) {
    try {
      await appointmentService.update(id, data);
    } catch (err) {
      console.error("[Sync] Failed to update appointment in Supabase:", err);
    }
  },
};
