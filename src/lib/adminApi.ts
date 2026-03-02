// Server-side admin API client for secure operations
// All sensitive operations go through Edge Functions with server-side password verification

import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/verify-password`;

interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

async function callEdgeFunction<T>(endpoint: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${EDGE_FUNCTION_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Request failed with status ${response.status}`,
      };
    }

    return {
      success: data.success,
      error: data.error,
      data: data as T,
    };
  } catch (error) {
    console.error('Edge function call failed:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection.',
    };
  }
}

/**
 * Verify admin password server-side
 */
export async function verifyAdminPassword(password: string): Promise<{ success: boolean; error?: string }> {
  const response = await callEdgeFunction<{ success: boolean }>('/verify', { password });
  return {
    success: response.success && response.data?.success === true,
    error: response.error,
  };
}

/**
 * Update admin password server-side
 */
export async function updateAdminPassword(
  currentPassword: string | null, 
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const response = await callEdgeFunction<{ success: boolean }>('/update-password', { 
    currentPassword, 
    newPassword 
  });
  return {
    success: response.success && response.data?.success === true,
    error: response.error,
  };
}

/**
 * Delete member with refund - atomic server-side operation
 */
export async function deleteMemberWithRefund(
  password: string,
  memberId: string,
  refundAmount: number,
  refundDescription: string
): Promise<{ success: boolean; error?: string; memberName?: string; refundAmount?: number }> {
  const response = await callEdgeFunction<{ success: boolean; error?: string; member_name?: string; refund_amount?: number }>('/delete-member', {
    password,
    memberId,
    refundAmount,
    refundDescription,
  });
  
  return {
    success: response.success && response.data?.success === true,
    error: response.error || response.data?.error,
    memberName: response.data?.member_name,
    refundAmount: response.data?.refund_amount,
  };
}

/**
 * Void transaction - atomic server-side operation
 */
export async function voidTransaction(
  password: string,
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  const response = await callEdgeFunction<{ success: boolean; error?: string }>('/void-transaction', {
    password,
    transactionId,
  });
  
  return {
    success: response.success && response.data?.success === true,
    error: response.error || response.data?.error,
  };
}

/**
 * Process checkout atomically via Edge Function
 */
export interface CheckoutParams {
  memberId?: string;
  memberName: string;
  cart: { serviceId: string; serviceName: string; price: number; useCard: boolean; cardId?: string }[];
  paymentMethod: string;
  isWalkIn: boolean;
  balanceDeduct: number;
  cardDeductTotal: number;
  cashNeed: number;
  total: number;
  cardUsageMap: Record<string, number>;
  subTransactions?: { type: string; amount: number; paymentMethod?: string; cardId?: string }[];
  transactionType?: string;
  transactionDescription?: string;
  payments: { method: string; amount: number }[];
}

export async function processCheckout(
  params: CheckoutParams
): Promise<{ success: boolean; error?: string; transaction_id?: string; order_id?: string }> {
  const checkoutUrl = `${SUPABASE_URL}/functions/v1/checkout`;
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(checkoutUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || `Request failed with status ${response.status}` };
    }
    return { success: data.success, error: data.error, transaction_id: data.transaction_id, order_id: data.order_id };
  } catch (error) {
    console.error('Checkout failed:', error);
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

export interface RefundSubTransaction {
  type: 'balance' | 'card' | 'price_diff';
  amount: number;
  cardId?: string;
  paymentMethod?: string;
}

export interface RefundTransactionParams {
  password: string;
  transactionId: string;
  memberId: string;
  memberName: string;
  originalAmount: number;
  description: string;
  subTransactions?: RefundSubTransaction[];
  paymentMethod?: string;
}

/**
 * Refund transaction - atomic server-side operation with password verification
 */
export async function refundTransaction(
  params: RefundTransactionParams
): Promise<{ success: boolean; error?: string; refundAmount?: number; fundTrail?: string[] }> {
  const body: Record<string, unknown> = { ...params };
  const response = await callEdgeFunction<{
    success: boolean; 
    error?: string; 
    refund_amount?: number;
    fund_trail?: string[];
  }>('/refund-transaction', body);
  
  return {
    success: response.success && response.data?.success === true,
    error: response.error || response.data?.error,
    refundAmount: response.data?.refund_amount,
    fundTrail: response.data?.fund_trail,
  };
}
