import axios, { AxiosError } from 'axios';

// Create axios instance with base configuration
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Attach JWT token to every request
api.interceptors.request.use(
    (config: any) => {
        const token = localStorage.getItem('accessToken');

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle 401 errors (auto-logout)
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error: AxiosError) => {
        // Handle 401 Unauthorized - Token expired or invalid
        if (error.response?.status === 401) {
            // Clear token and redirect to login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');

            // Only redirect if not already on login/signup page
            if (!window.location.pathname.includes('/login') &&
                !window.location.pathname.includes('/signup')) {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api;
