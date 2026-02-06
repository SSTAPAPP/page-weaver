import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { memberService } from "@/services/memberService";
import { transactionService } from "@/services/transactionService";
import { serviceService } from "@/services/serviceService";
import { appointmentService } from "@/services/appointmentService";
import { orderService } from "@/services/orderService";
import { supabase } from "@/integrations/supabase/client";
import { Member, Transaction, Service, Appointment, Order } from "@/types";

// ========== Query Keys ==========
export const queryKeys = {
  members: ["cloud", "members"] as const,
  transactions: ["cloud", "transactions"] as const,
  services: ["cloud", "services"] as const,
  appointments: ["cloud", "appointments"] as const,
  orders: ["cloud", "orders"] as const,
  todayStats: ["cloud", "todayStats"] as const,
  cloudCounts: ["cloud", "counts"] as const,
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

// ========== Appointments ==========
export function useAppointments() {
  return useQuery({
    queryKey: queryKeys.appointments,
    queryFn: () => appointmentService.getAll(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
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

// ========== Today Stats (cloud) ==========
export function useTodayStats() {
  return useQuery({
    queryKey: queryKeys.todayStats,
    queryFn: async () => {
      const [txStats, todayAppointments] = await Promise.all([
        transactionService.getTodayStats(),
        appointmentService.getTodayCount(),
      ]);

      // Count today's new members
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: newMembers } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      return {
        revenue: txStats.revenue,
        recharge: txStats.recharge,
        consumption: txStats.consumption,
        newMembers: newMembers || 0,
        appointments: todayAppointments,
      };
    },
    staleTime: 15_000,
    refetchInterval: 60_000, // auto refresh every minute
  });
}

// ========== Cloud Record Counts ==========
export interface CloudCounts {
  members: number;
  transactions: number;
  services: number;
  appointments: number;
  orders: number;
  total: number;
}

export function useCloudCounts() {
  return useQuery({
    queryKey: queryKeys.cloudCounts,
    queryFn: async (): Promise<CloudCounts> => {
      const [members, transactions, services, appointments, orders] =
        await Promise.all([
          supabase.from("members").select("*", { count: "exact", head: true }),
          supabase.from("transactions").select("*", { count: "exact", head: true }),
          supabase.from("services").select("*", { count: "exact", head: true }),
          supabase.from("appointments").select("*", { count: "exact", head: true }),
          supabase.from("orders").select("*", { count: "exact", head: true }),
        ]);

      const counts = {
        members: members.count || 0,
        transactions: transactions.count || 0,
        services: services.count || 0,
        appointments: appointments.count || 0,
        orders: orders.count || 0,
        total: 0,
      };
      counts.total =
        counts.members +
        counts.transactions +
        counts.services +
        counts.appointments +
        counts.orders;
      return counts;
    },
    staleTime: 30_000,
  });
}

// ========== Manual Sync (invalidate all) ==========
export function useManualSync() {
  const qc = useQueryClient();

  const sync = async () => {
    await qc.invalidateQueries({ queryKey: ["cloud"] });
    // Wait for all queries to settle
    await Promise.allSettled([
      qc.refetchQueries({ queryKey: queryKeys.members }),
      qc.refetchQueries({ queryKey: queryKeys.transactions }),
      qc.refetchQueries({ queryKey: queryKeys.services }),
      qc.refetchQueries({ queryKey: queryKeys.appointments }),
      qc.refetchQueries({ queryKey: queryKeys.orders }),
      qc.refetchQueries({ queryKey: queryKeys.cloudCounts }),
      qc.refetchQueries({ queryKey: queryKeys.todayStats }),
    ]);
  };

  return sync;
}
