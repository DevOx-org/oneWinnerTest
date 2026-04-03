import api from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletTransaction {
    _id: string;
    type: 'credit' | 'debit' | 'tournament_entry' | 'tournament_refund' | 'winning_credit' | 'withdrawal_request' | 'withdrawal_refund' | 'manual_deposit' | 'manual_deposit_rejected';
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
        totalEarnings: number;
    };
    recentTransactions: WalletTransaction[];
    pagination: { page: number; limit: number; total: number; pages: number };
}

// ─── Manual Deposit types ─────────────────────────────────────────────────────

export interface ManualDepositRequest {
    _id: string;
    amount: number;
    paymentMethod: 'gpay' | 'phonepe' | 'paytm' | 'upi_other';
    upiReferenceId: string;
    status: 'pending' | 'approved' | 'rejected';
    adminNote?: string | null;
    createdAt: string;
    verifiedAt?: string;
}

export interface ManualDepositResponse {
    success: boolean;
    message: string;
    request: ManualDepositRequest;
}

export interface ManualDepositsListResponse {
    success: boolean;
    requests: ManualDepositRequest[];
    pagination: { page: number; limit: number; total: number; pages: number };
}

export interface UpiInfoResponse {
    success: boolean;
    upiId: string;
    accountHolder: string;
    qrImagePath: string;
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

// ── Manual Deposit endpoints ──────────────────────────────────────────────────

export const submitManualDeposit = async (
    amount: number,
    paymentMethod: string,
    upiReferenceId: string
): Promise<ManualDepositResponse> => {
    const response = await api.post('/wallet/manual-deposit', {
        amount,
        paymentMethod,
        upiReferenceId,
    });
    return response.data;
};

export const getManualDeposits = async (
    page = 1,
    limit = 20
): Promise<ManualDepositsListResponse> => {
    const response = await api.get(`/wallet/manual-deposits?page=${page}&limit=${limit}`);
    return response.data;
};

export const getUpiInfo = async (): Promise<UpiInfoResponse> => {
    const response = await api.get('/wallet/upi-info');
    return response.data;
};

// ── Wallet balance & transactions ─────────────────────────────────────────────

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

// ── Withdrawal endpoints ──────────────────────────────────────────────────────

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
    submitManualDeposit,
    getManualDeposits,
    getUpiInfo,
    getWalletBalance,
    getTransactionHistory,
    requestWithdrawal,
    getMyWithdrawals,
};
