import api from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletTransaction {
    _id: string;
    type: 'credit' | 'debit' | 'tournament_entry' | 'tournament_refund' | 'winning_credit' | 'withdrawal_request' | 'withdrawal_refund';
    amount: number;
    balanceAfter: number;
    description: string;
    reference?: string;
    balanceType?: 'depositBalance' | 'winningBalance' | 'lockedBalance' | 'combined';
    createdAt: string;
}

export interface WalletBalanceResponse {
    success: boolean;
    walletBalance: number;
    wallet?: {
        depositBalance: number;
        winningBalance: number;
        lockedBalance: number;
        lifetimeWithdrawn: number;
    };
    recentTransactions: WalletTransaction[];
    pagination: { page: number; limit: number; total: number; pages: number };
}

export interface TopUpOrderResponse {
    success: boolean;
    order: {
        id: string;
        amount: number;     // in paise
        amountRupees: number;
        currency: string;
    };
    razorpayKeyId: string;
}

export interface VerifyTopUpResponse {
    success: boolean;
    message: string;
    walletBalance: number;
    transaction: {
        id: string;
        amount: number;
        type: string;
        description: string;
    };
}

// ─── Withdrawal types ─────────────────────────────────────────────────────────



export interface WithdrawalRequest {
    _id: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    upiId: string;
    adminNote?: string | null;
    createdAt: string;
    processedAt?: string;
}

export interface WithdrawalResponse {
    success: boolean;
    message: string;
    request: WithdrawalRequest;
    walletBalance: number;
    wallet?: {
        winningBalance: number;
        lockedBalance: number;
        depositBalance: number;
    };
}

export interface WithdrawalsListResponse {
    success: boolean;
    requests: WithdrawalRequest[];
    pagination: { page: number; limit: number; total: number; pages: number };
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const createTopUpOrder = async (amountRupees: number): Promise<TopUpOrderResponse> => {
    const response = await api.post('/wallet/create-order', { amount: amountRupees });
    return response.data;
};

export const verifyTopUp = async (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}): Promise<VerifyTopUpResponse> => {
    const response = await api.post('/wallet/verify', payload);
    return response.data;
};

export const getWalletBalance = async (): Promise<WalletBalanceResponse> => {
    const response = await api.get('/wallet/balance');
    return response.data;
};

export const getTransactionHistory = async (
    page = 1,
    limit = 20
): Promise<WalletBalanceResponse> => {
    const response = await api.get(`/wallet/transactions?page=${page}&limit=${limit}`);
    return response.data;
};

/**
 * Submit a withdrawal request. Holds the amount from the wallet immediately.
 * Min ₹100.
 */
export const requestWithdrawal = async (
    amount: number,
    upiId: string
): Promise<WithdrawalResponse> => {
    const response = await api.post('/wallet/withdraw', { amount, upiId });
    return response.data;
};

/**
 * Get the current user's withdrawal request history.
 */
export const getMyWithdrawals = async (
    page = 1,
    limit = 20
): Promise<WithdrawalsListResponse> => {
    const response = await api.get(`/wallet/withdrawals?page=${page}&limit=${limit}`);
    return response.data;
};

export default {
    createTopUpOrder,
    verifyTopUp,
    getWalletBalance,
    getTransactionHistory,
    requestWithdrawal,
    getMyWithdrawals,
};
