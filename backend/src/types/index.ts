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

export interface AuthModeConfig {
    type: AuthMode;
    apiKey?: string;
    user?: UserProfile;
    sessionId?: string;
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

export type ProgrammingLanguage =
    | 'typescript'
    | 'javascript'
    | 'python'
    | 'java'
    | 'cpp'
    | 'go'
    | 'rust'
    | 'other';

export interface ProcessedFile {
    id: string;
    name: string;
    path: string;
    content: string;
    language: ProgrammingLanguage;
    size: number;
    chunks?: CodeChunk[];
    embeddings?: number[][];
    dependencies?: string[];
    exports?: string[];
    createdAt: Date;
}

export interface CodeChunk {
    id: string;
    content: string;
    startLine: number;
    endLine: number;
    type: 'function' | 'class' | 'interface' | 'block';
    embedding?: number[];
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
