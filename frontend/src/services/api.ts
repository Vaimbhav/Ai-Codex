import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiResponse } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: API_URL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Request interceptor
        this.client.interceptors.request.use(
            (config) => {
                const apiKey = localStorage.getItem('gemini_api_key');
                if (apiKey) {
                    config.headers['X-API-Key'] = apiKey;
                }

                const token = localStorage.getItem('auth_token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }

                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                // Only redirect on 401 for authenticated requests, not login/register attempts
                if (error.response?.status === 401) {
                    const isAuthRequest = error.config?.url?.includes('/auth/login') ||
                        error.config?.url?.includes('/auth/register');

                    if (!isAuthRequest) {
                        localStorage.removeItem('auth_token');
                        window.location.href = '/';
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.get(url, config);
        return response.data;
    }

    async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.post(url, data, config);
        return response.data;
    }

    async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.put(url, data, config);
        return response.data;
    }

    async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.delete(url, config);
        return response.data;
    }
}

export const apiClient = new ApiClient();

// Authentication API
export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    name: string;
}

export interface AuthResponse {
    success: boolean;
    user?: {
        id: string;
        email: string;
        name: string;
        preferences: {
            theme: 'light' | 'dark' | 'system';
            language: string;
            notifications: boolean;
            contextEnabled: boolean;
            streamingEnabled: boolean;
        };
        createdAt: string;
        updatedAt: string;
    };
    token?: string;
    error?: string;
    message?: string;
}

export const authAPI = {
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        return apiClient.post('/auth/login', credentials);
    },

    async register(data: RegisterData): Promise<AuthResponse> {
        return apiClient.post('/auth/register', data);
    },

    async logout(): Promise<ApiResponse> {
        return apiClient.post('/auth/logout');
    },

    async getProfile(): Promise<AuthResponse> {
        return apiClient.get('/auth/profile');
    },

    async updateProfile(data: { name?: string; preferences?: Record<string, unknown> }): Promise<AuthResponse> {
        return apiClient.put('/auth/profile', data);
    },

    async updateApiKey(apiKey: string): Promise<ApiResponse> {
        return apiClient.put('/auth/api-key', { apiKey });
    },

    async getApiKey(): Promise<ApiResponse<{ apiKey: string | null }>> {
        return apiClient.get('/auth/api-key');
    },

    async changePassword(data: { currentPassword: string; newPassword: string }): Promise<ApiResponse> {
        return apiClient.put('/auth/change-password', data);
    },

    async forgotPassword(email: string): Promise<ApiResponse> {
        return apiClient.post('/auth/forgot-password', { email });
    },

    async resetPassword(data: { token: string; newPassword: string }): Promise<ApiResponse> {
        return apiClient.post('/auth/reset-password', data);
    },

    async deleteAccount(password: string): Promise<ApiResponse> {
        return apiClient.delete('/auth/account', { data: { password } });
    }
};
