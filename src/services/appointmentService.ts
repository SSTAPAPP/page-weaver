import { supabase } from "@/integrations/supabase/client";
import { Appointment } from "@/types";

export interface DbAppointment {
  id: string;
  member_id: string | null;
  member_name: string;
  member_phone: string | null;
  service_id: string | null;
  service_name: string;
  date: string;
  time: string;
  status: string | null;
  created_at: string;
}

const transformDbAppointment = (db: DbAppointment): Appointment => ({
  id: db.id,
  memberId: db.member_id || '',
  memberName: db.member_name,
  memberPhone: db.member_phone || '',
  serviceId: db.service_id || '',
  serviceName: db.service_name,
  date: new Date(db.date),
  time: db.time,
  status: (db.status as Appointment['status']) || 'pending',
  createdAt: new Date(db.created_at),
});

export const appointmentService = {
  async getAll(): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) throw error;
    return (data || []).map(a => transformDbAppointment(a as DbAppointment));
  },

  async getByDate(date: Date): Promise<Appointment[]> {
    const dateStr = date.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('date', dateStr)
      .order('time', { ascending: true });

    if (error) throw error;
    return (data || []).map(a => transformDbAppointment(a as DbAppointment));
  },

  async getByMemberId(memberId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('member_id', memberId)
      .order('date', { ascending: false });

    if (error) throw error;
    return (data || []).map(a => transformDbAppointment(a as DbAppointment));
  },

  async create(appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> {
    const dateStr = appointment.date instanceof Date 
      ? appointment.date.toISOString().split('T')[0]
      : appointment.date;

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        member_id: appointment.memberId || null,
        member_name: appointment.memberName,
        member_phone: appointment.memberPhone || null,
        service_id: appointment.serviceId || null,
        service_name: appointment.serviceName,
        date: dateStr,
        time: appointment.time,
        status: appointment.status || 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return transformDbAppointment(data as DbAppointment);
  },

  async update(id: string, updates: Partial<Appointment>): Promise<void> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.memberName !== undefined) dbUpdates.member_name = updates.memberName;
    if (updates.memberPhone !== undefined) dbUpdates.member_phone = updates.memberPhone;
    if (updates.serviceName !== undefined) dbUpdates.service_name = updates.serviceName;
    if (updates.date !== undefined) {
      dbUpdates.date = updates.date instanceof Date 
        ? updates.date.toISOString().split('T')[0]
        : updates.date;
    }
    if (updates.time !== undefined) dbUpdates.time = updates.time;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const { error } = await supabase
      .from('appointments')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getTodayCount(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    
    const { count, error } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('date', today);

    if (error) throw error;
    return count || 0;
  },
};
