import api from './api';

interface CreateOrderResponse {
    success: boolean;
    order: {
        id: string;
        amount: number;
        currency: string;
        tournamentTitle: string;
        tournamentGame: string;
    };
    razorpayKeyId: string;
}

interface VerifyPaymentRequest {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    tournamentId: string;
}

interface VerifyPaymentResponse {
    success: boolean;
    message: string;
    payment: {
        id: string;
        orderId: string;
        paymentId: string;
        amount: number;
        status: string;
        paidAt: string;
    };
    tournament: {
        id: string;
        title: string;
        game: string;
    };
}

interface Payment {
    id: string;
    orderId: string;
    paymentId: string;
    amount: number;
    currency: string;
    status: string;
    tournament: {
        _id: string;
        title: string;
        game: string;
        startDate: string;
    };
    paidAt: string;
    createdAt: string;
}

interface MyPaymentsResponse {
    success: boolean;
    count: number;
    payments: Payment[];
}

// Create payment order for tournament entry
export const createPaymentOrder = async (tournamentId: string): Promise<CreateOrderResponse> => {
    const response = await api.post('/payments/create-order', { tournamentId });
    return response.data;
};

// Verify payment after Razorpay checkout
export const verifyPayment = async (paymentData: VerifyPaymentRequest): Promise<VerifyPaymentResponse> => {
    const response = await api.post('/payments/verify', paymentData);
    return response.data;
};

// Get user's payment history
export const getMyPayments = async (): Promise<MyPaymentsResponse> => {
    const response = await api.get('/payments/my-payments');
    return response.data;
};

export default {
    createPaymentOrder,
    verifyPayment,
    getMyPayments,
};
