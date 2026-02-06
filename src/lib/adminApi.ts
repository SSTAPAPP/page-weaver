// Server-side admin API client for secure operations
// All sensitive operations go through Edge Functions with server-side password verification

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/verify-password`;

interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

async function callEdgeFunction<T>(endpoint: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
export async function verifyAdminPassword(password: string): Promise<{ success: boolean; error?: string; hash?: string }> {
  const response = await callEdgeFunction<{ success: boolean; hash?: string }>('/verify', { password });
  return {
    success: response.success && response.data?.success === true,
    error: response.error,
    hash: response.data?.hash,
  };
}

/**
 * Update admin password server-side
 */
export async function updateAdminPassword(
  currentPassword: string | null, 
  newPassword: string
): Promise<{ success: boolean; error?: string; hash?: string }> {
  const response = await callEdgeFunction<{ success: boolean; hash?: string }>('/update-password', { 
    currentPassword, 
    newPassword 
  });
  return {
    success: response.success && response.data?.success === true,
    error: response.error,
    hash: response.data?.hash,
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
