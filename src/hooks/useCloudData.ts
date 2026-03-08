import { useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { memberService } from "@/services/memberService";
import { transactionService } from "@/services/transactionService";
import { serviceService } from "@/services/serviceService";
import { cardService } from "@/services/cardService";
import { appointmentService } from "@/services/appointmentService";
import { orderService } from "@/services/orderService";
import { settingsService } from "@/services/settingsService";
import { supabase } from "@/integrations/supabase/client";
import { Member, Transaction, Service, CardTemplate, Appointment, Order } from "@/types";

// ========== Query Keys ==========
export const queryKeys = {
  members: ["cloud", "members"] as const,
  transactions: ["cloud", "transactions"] as const,
  services: ["cloud", "services"] as const,
  cardTemplates: ["cloud", "cardTemplates"] as const,
  appointments: ["cloud", "appointments"] as const,
  orders: ["cloud", "orders"] as const,
  todayStats: ["cloud", "todayStats"] as const,
  cloudCounts: ["cloud", "counts"] as const,
  settings: ["cloud", "settings"] as const,
};

// ========== Members ==========
export function useMembers() {
  return useQuery({
    queryKey: queryKeys.members,
    queryFn: () => memberService.getAll(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useMemberById(id: string | null) {
  return useQuery({
    queryKey: [...queryKeys.members, id],
    queryFn: () => (id ? memberService.getById(id) : null),
    enabled: !!id,
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Member, "id" | "createdAt" | "cards">) =>
      memberService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.members });
      qc.invalidateQueries({ queryKey: queryKeys.todayStats });
      qc.invalidateQueries({ queryKey: queryKeys.cloudCounts });
    },
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Member> }) =>
      memberService.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.members });
    },
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => memberService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.members });
      qc.invalidateQueries({ queryKey: queryKeys.cloudCounts });
    },
  });
}

// ========== Transactions ==========
export function useTransactions() {
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: () => transactionService.getAll(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Transaction, "id" | "createdAt">) =>
      transactionService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions });
      qc.invalidateQueries({ queryKey: queryKeys.todayStats });
      qc.invalidateQueries({ queryKey: queryKeys.cloudCounts });
    },
  });
}

// ========== Services ==========
export function useServices() {
  return useQuery({
    queryKey: queryKeys.services,
    queryFn: () => serviceService.getAll(),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Service, "id">) => serviceService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.services });
      qc.invalidateQueries({ queryKey: queryKeys.cloudCounts });
    },
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Service> }) =>
      serviceService.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.services });
    },
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => serviceService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.services });
      qc.invalidateQueries({ queryKey: queryKeys.cloudCounts });
    },
  });
}

// ========== Card Templates ==========
export function useCardTemplates() {
  return useQuery({
    queryKey: queryKeys.cardTemplates,
    queryFn: () => cardService.getAll(),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateCardTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CardTemplate, "id">) => cardService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cardTemplates });
      qc.invalidateQueries({ queryKey: queryKeys.cloudCounts });
    },
  });
}

export function useUpdateCardTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CardTemplate> }) =>
      cardService.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cardTemplates });
    },
  });
}

export function useDeleteCardTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cardService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cardTemplates });
      qc.invalidateQueries({ queryKey: queryKeys.cloudCounts });
    },
  });
}

// ========== Appointments ==========
export function useAppointments() {
  return useQuery({
    queryKey: queryKeys.appointments,
    queryFn: () => appointmentService.getAll(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<import("@/types").Appointment, "id" | "createdAt">) =>
      appointmentService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments });
      qc.invalidateQueries({ queryKey: queryKeys.todayStats });
      qc.invalidateQueries({ queryKey: queryKeys.cloudCounts });
    },
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<import("@/types").Appointment> }) =>
      appointmentService.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments });
    },
  });
}

// ========== Orders ==========
export function useOrders() {
  return useQuery({
    queryKey: queryKeys.orders,
    queryFn: () => orderService.getAll(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

// ========== Settings ==========
export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => settingsService.get(),
    staleTime: 60_000,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: Parameters<typeof settingsService.update>[0]) =>
      settingsService.update(updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings });
    },
  });
}

// ========== Today Stats (cloud) ==========
export function useTodayStats() {
  return useQuery({
    queryKey: queryKeys.todayStats,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayEnd = new Date(today);
      yesterdayEnd.setMilliseconds(-1);

      const [txStats, todayAppointments, yesterdayStats, newMembersResult, yesterdayMembersResult] = await Promise.all([
        transactionService.getTodayStats(),
        appointmentService.getTodayCount(),
        transactionService.getStatsForDateRange(yesterday, yesterdayEnd),
        supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .gte("created_at", today.toISOString()),
        supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .gte("created_at", yesterday.toISOString())
          .lt("created_at", today.toISOString()),
      ]);

      return {
        revenue: txStats.revenue,
        recharge: txStats.recharge,
        consumption: txStats.consumption,
        newMembers: newMembersResult.count || 0,
        appointments: todayAppointments,
        yesterdayRevenue: yesterdayStats.revenue,
        yesterdayRecharge: yesterdayStats.recharge,
        yesterdayConsumption: yesterdayStats.consumption,
        yesterdayNewMembers: yesterdayMembersResult.count || 0,
      };
    },
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

// ========== Cloud Record Counts ==========
export interface CloudCounts {
  members: number;
  transactions: number;
  services: number;
  cardTemplates: number;
  appointments: number;
  orders: number;
  total: number;
}

export function useCloudCounts() {
  return useQuery({
    queryKey: queryKeys.cloudCounts,
    queryFn: async (): Promise<CloudCounts> => {
      const [members, transactions, services, cardTemplates, appointments, orders] =
        await Promise.all([
          supabase.from("members").select("*", { count: "exact", head: true }),
          supabase.from("transactions").select("*", { count: "exact", head: true }),
          supabase.from("services").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("card_templates").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("appointments").select("*", { count: "exact", head: true }),
          supabase.from("orders").select("*", { count: "exact", head: true }),
        ]);

      const counts = {
        members: members.count || 0,
        transactions: transactions.count || 0,
        services: services.count || 0,
        cardTemplates: cardTemplates.count || 0,
        appointments: appointments.count || 0,
        orders: orders.count || 0,
        total: 0,
      };
      counts.total =
        counts.members +
        counts.transactions +
        counts.services +
        counts.cardTemplates +
        counts.appointments +
        counts.orders;
      return counts;
    },
    staleTime: 30_000,
  });
}

// ========== Debounced Realtime Invalidation ==========
// Batches rapid-fire realtime events into a single invalidation pass per table
type TableName = 'members' | 'transactions' | 'services' | 'card_templates' | 'appointments' | 'orders';

const TABLE_TO_KEYS: Record<TableName, readonly (readonly string[])[]> = {
  members:        [queryKeys.members, queryKeys.todayStats],
  transactions:   [queryKeys.transactions, queryKeys.todayStats],
  services:       [queryKeys.services],
  card_templates: [queryKeys.cardTemplates],
  appointments:   [queryKeys.appointments, queryKeys.todayStats],
  orders:         [queryKeys.orders],
};

class RealtimeDebouncer {
  private dirty = new Set<TableName>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly delay = 300; // ms — batch window

  constructor(private qc: QueryClient) {}

  mark(table: TableName) {
    this.dirty.add(table);
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.delay);
    }
  }

  private flush() {
    this.timer = null;
    const tables = new Set(this.dirty);
    this.dirty.clear();

    // Deduplicate query keys across all dirty tables
    const keysToInvalidate = new Set<string>();
    let needCounts = false;

    for (const table of tables) {
      const keys = TABLE_TO_KEYS[table];
      if (keys) {
        for (const key of keys) {
          keysToInvalidate.add(JSON.stringify(key));
        }
        needCounts = true; // any table change → refresh counts
      }
    }

    for (const keyStr of keysToInvalidate) {
      this.qc.invalidateQueries({ queryKey: JSON.parse(keyStr) });
    }

    if (needCounts) {
      this.qc.invalidateQueries({ queryKey: queryKeys.cloudCounts });
    }
  }

  destroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.dirty.clear();
  }
}

// ========== Realtime Subscriptions ==========
const REALTIME_TABLES: TableName[] = [
  'members', 'transactions', 'services', 'card_templates', 'appointments', 'orders'
];

export function useRealtimeSync(enabled: boolean = true) {
  const qc = useQueryClient();
  const debouncerRef = useRef<RealtimeDebouncer | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const debouncer = new RealtimeDebouncer(qc);
    debouncerRef.current = debouncer;

    let channel = supabase.channel("realtime-sync");

    for (const table of REALTIME_TABLES) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => debouncer.mark(table)
      );
    }

    channel.subscribe();

    return () => {
      debouncer.destroy();
      debouncerRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [enabled, qc]);
}

// ========== Manual Sync ==========
export function useManualSync() {
  const qc = useQueryClient();

  return useCallback(async () => {
    // Single invalidateQueries with the shared "cloud" prefix
    // triggers refetch of all active queries under that key
    await qc.invalidateQueries({ queryKey: ["cloud"] });
  }, [qc]);
}
