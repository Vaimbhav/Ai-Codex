export interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: boolean;
}

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    preferences: UserPreferences;
    createdAt: Date;
    updatedAt: Date;
}

export type AuthMode = 'simple' | 'enhanced';

export interface AuthState {
    mode: AuthMode;
    apiKey: string | null;
    user: UserProfile | null;
    isAuthenticated: boolean;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
    codeBlocks?: CodeBlock[];
    relatedFiles?: string[];
}

export interface CodeBlock {
    language: string;
    code: string;
    startLine?: number;
    endLine?: number;
}

export interface UploadedFile {
    id: string;
    name: string;
    path: string;
    size: number;
    type: string;
    content?: string;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
