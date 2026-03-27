import api from './api';
import type { LoginRequest, LoginResponse, SignupRequest, SignupResponse, GoogleLoginResponse } from '../types/auth.types';

class AuthService {
    /**
     * Register a new user
     */
    async register(data: SignupRequest): Promise<SignupResponse> {
        try {
            const response = await api.post<SignupResponse>('/auth/register', data);
            return response.data;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    /**
     * Login user
     */
    async login(data: LoginRequest): Promise<LoginResponse> {
        try {
            const response = await api.post<LoginResponse>('/auth/login', data);
            return response.data;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    /**
     * Login/register user via Google OAuth
     */
    async googleLogin(idToken: string): Promise<GoogleLoginResponse> {
        try {
            const response = await api.post<GoogleLoginResponse>('/auth/google', { idToken });
            return response.data;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    /**
     * Complete user profile (phone required)
     */
    async completeProfile(data: { phone: string; dateOfBirth?: string; location?: string; bio?: string; gameId?: string }): Promise<{ success: boolean; user: any }> {
        try {
            const response = await api.post('/user/complete-profile', data);
            return response.data;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    /**
     * Logout user (client-side cleanup)
     */
    logout(): void {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
    }

    /**
     * Get stored token
     */
    getToken(): string | null {
        return localStorage.getItem('accessToken');
    }

    /**
     * Get stored user
     */
    getUser(): any | null {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    /**
     * Store token and user
     */
    setAuthData(token: string, user: any): void {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('user', JSON.stringify(user));
    }

    /**
     * Handle API errors
     */
    private handleError(error: any): Error {
        if (error.response) {
            // Server responded with error
            const message = error.response.data?.message || 'An error occurred';
            return new Error(message);
        } else if (error.request) {
            // Request made but no response
            return new Error('No response from server. Please check your connection.');
        } else {
            // Something else happened
            return new Error(error.message || 'An unexpected error occurred');
        }
    }
}

export default new AuthService();
