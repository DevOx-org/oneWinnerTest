// Authentication type definitions
export interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gameId?: string;
    location?: string;
    bio?: string;
    role?: 'user' | 'admin' | 'tester';
    walletBalance?: number;
    profileCompleted?: boolean;
    matchCount?: number;     // lifetime tournament participation counter
    winCount?: number;       // lifetime tournament win counter
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    user: User;
}

export interface SignupRequest {
    name: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    password: string;
}

export interface SignupResponse {
    token: string;
    user: User;
}

export interface GoogleLoginResponse {
    token: string;
    user: User;
}

export interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (data: SignupRequest) => Promise<void>;
    googleLogin: (idToken: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
    updateUser: (updated: Partial<User>) => void;
}

export interface ApiError {
    message: string;
    errors?: Record<string, string[]>;
}
