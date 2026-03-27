import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import authService from '../services/authService';
import type { User, AuthContextType, SignupRequest } from '../types/auth.types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Initialize auth state from localStorage on mount
    useEffect(() => {
        const initializeAuth = () => {
            try {
                const storedToken = authService.getToken();
                const storedUser = authService.getUser();

                if (storedToken && storedUser) {
                    setToken(storedToken);
                    setUser(storedUser);
                }
            } catch (error) {
                console.error('Failed to initialize auth:', error);
                // Clear corrupted data
                authService.logout();
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, []);

    const login = async (email: string, password: string): Promise<void> => {
        try {
            const response = await authService.login({ email, password });

            // Store token and user
            authService.setAuthData(response.token, response.user);

            // Update state
            setToken(response.token);
            setUser(response.user);
        } catch (error) {
            throw error;
        }
    };

    const signup = async (data: SignupRequest): Promise<void> => {
        try {
            const response = await authService.register(data);

            // Store token and user
            authService.setAuthData(response.token, response.user);

            // Update state
            setToken(response.token);
            setUser(response.user);
        } catch (error) {
            throw error;
        }
    };

    const googleLogin = async (idToken: string): Promise<void> => {
        try {
            const response = await authService.googleLogin(idToken);

            // Store token and user
            authService.setAuthData(response.token, response.user);

            // Update state
            setToken(response.token);
            setUser(response.user);
        } catch (error) {
            throw error;
        }
    };

    const logout = (): void => {
        // Clear localStorage
        authService.logout();

        // Clear state
        setToken(null);
        setUser(null);
    };

    const updateUser = (updated: Partial<User>): void => {
        // Read current state from localStorage (always fresh) so we can merge
        const currentToken = authService.getToken();
        const currentUser = authService.getUser();
        if (!currentUser || !currentToken) return;

        const merged: User = { ...currentUser, ...updated };
        // Persist to localStorage first
        authService.setAuthData(currentToken, merged);
        // Then update React state (plain value, no callback — avoids stale closure)
        setUser(merged);
    };

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!token && !!user,
        login,
        signup,
        googleLogin,
        logout,
        loading,
        updateUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
