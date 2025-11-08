import { apiClient } from './api';
import axios from 'axios';

export interface UploadedFile {
    id: string;
    name: string;
    language: string;
    size: number;
    chunks: number;
    dependencies: number;
    exports: number;
    uploadedAt: string;
    embeddingsGenerated?: boolean;
    sessionId?: string;
}

export interface FileUploadResponse {
    success: boolean;
    data: { file: UploadedFile };
    message: string;
}

export interface FileUploadError {
    error: string;
}

export class FileUploadService {
    static async uploadSingleFile(file: File, apiKey?: string): Promise<FileUploadResponse> {
        const formData = new FormData();
        formData.append('file', file);

        if (apiKey) {
            formData.append('apiKey', apiKey);
        }

        try {
            // Use axios directly for file uploads to handle FormData properly
            const token = localStorage.getItem('auth_token');
            const API_URL = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || 'http://localhost:3001/api';
            const response = await axios.post(
                `${API_URL}/files/upload-single`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        ...(token && { Authorization: `Bearer ${token}` }),
                    },
                }
            );

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMessage = error.response?.data?.error || 'File upload failed';
                throw new Error(errorMessage);
            }
            throw new Error('File upload failed');
        }
    }

    static async uploadMultipleFiles(files: File[], apiKey?: string): Promise<{ success: boolean; data: { files: UploadedFile[] }; message: string }> {
        const formData = new FormData();

        // Append all files
        files.forEach(file => {
            formData.append('files', file);
        });

        if (apiKey) {
            formData.append('apiKey', apiKey);
        }

        try {
            const token = localStorage.getItem('auth_token');
            const API_URL = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || 'http://localhost:3001/api';
            const response = await axios.post(
                `${API_URL}/files/upload-multiple`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        ...(token && { Authorization: `Bearer ${token}` }),
                    },
                }
            );

            // Backend now returns: { success: true, data: { files: [...] }, message: "..." }
            const backendResponse = response.data;

            if (backendResponse.success && backendResponse.data && backendResponse.data.files) {
                return backendResponse;
            } else {
                throw new Error('Invalid response format from server');
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMessage = error.response?.data?.error || 'Multiple file upload failed';
                throw new Error(errorMessage);
            }
            throw new Error('Multiple file upload failed');
        }
    }

    static async getUserFiles(): Promise<UploadedFile[]> {
        try {
            console.log('🚀 FileUploadService: Starting to fetch user files...');

            // Check authentication first
            const authToken = localStorage.getItem('auth_token');
            if (!authToken) {
                console.warn('⚠️ No auth token found');
                throw new Error('Authentication required - please log in');
            }

            console.log('📡 Making API request to /files/user');
            const response = await apiClient.get<{ files: UploadedFile[] }>('/files/user');

            console.log('📨 API response received:', response);
            console.log('📊 Response success:', response.success);
            console.log('📊 Response data exists:', !!response.data);
            console.log('📊 Files array exists:', !!response.data?.files);
            console.log('📊 Files is array:', Array.isArray(response.data?.files));

            if (!response.success) {
                console.error('❌ API returned success: false');
                throw new Error(response.error || 'Server returned unsuccessful response');
            }

            if (!response.data) {
                console.error('❌ API response has no data property');
                throw new Error('No data in server response');
            }

            if (!response.data.files) {
                console.error('❌ API response data has no files property');
                throw new Error('No files property in server response');
            }

            if (!Array.isArray(response.data.files)) {
                console.error('❌ Files is not an array:', typeof response.data.files);
                throw new Error('Files property is not an array');
            }

            console.log(`✅ Successfully loaded ${response.data.files.length} files`);
            return response.data.files;

        } catch (error) {
            console.error('❌ FileUploadService: Get user files error:', error);

            if (axios.isAxiosError(error)) {
                console.error('❌ Axios error details:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    message: error.message
                });

                if (error.response?.status === 401) {
                    throw new Error('Authentication failed - please log in again');
                }

                const errorMessage = error.response?.data?.error || 'Failed to fetch files';
                throw new Error(errorMessage);
            }

            throw error instanceof Error ? error : new Error('Failed to fetch files');
        }
    } static async getFileById(fileId: string): Promise<UploadedFile & { content: string }> {
        try {
            const response = await apiClient.get<{ file: UploadedFile & { content: string } }>(`/files/file/${fileId}`);
            if (response.success && response.data && response.data.file) {
                return response.data.file;
            }
            throw new Error(response.error || 'File not found in response');
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMessage = error.response?.data?.error || 'Failed to fetch file';
                throw new Error(errorMessage);
            }
            throw new Error('Failed to fetch file');
        }
    }

    static async deleteFile(fileId: string): Promise<void> {
        try {
            await apiClient.delete(`/files/${fileId}`);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMessage = error.response?.data?.error || 'Failed to delete file';
                throw new Error(errorMessage);
            }
            throw new Error('Failed to delete file');
        }
    }



    // Backward compatibility method - now just returns all user files
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static async getSessionFiles(_sessionId: string): Promise<UploadedFile[]> {
        console.warn('getSessionFiles is deprecated. Use getUserFiles() instead. All files are now user-based.');
        return this.getUserFiles();
    }

    static formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static isValidFileType(fileName: string): boolean {
        const supportedExtensions = [
            '.ts', '.tsx', '.js', '.jsx',
            '.py', '.java', '.cpp', '.c',
            '.cs', '.php', '.rb', '.go',
            '.rs', '.swift', '.kt', '.scala',
            '.html', '.css', '.scss', '.sass',
            '.json', '.xml', '.yaml', '.yml',
            '.md', '.txt', '.sql'
        ];

        return supportedExtensions.some(ext =>
            fileName.toLowerCase().endsWith(ext)
        );
    }

    static async assignFilesToSession(sessionId: string): Promise<void> {
        try {
            await apiClient.post('/files/assign-to-session', { sessionId });
        } catch (error) {
            console.error('Error assigning files to session:', error);
            // Don't throw error, just log it since this is not critical
        }
    }

    static getLanguageFromFileName(fileName: string): string {
        const extension = fileName.toLowerCase().split('.').pop();

        const languageMap: Record<string, string> = {
            'ts': 'TypeScript',
            'tsx': 'TypeScript',
            'js': 'JavaScript',
            'jsx': 'JavaScript',
            'py': 'Python',
            'java': 'Java',
            'cpp': 'C++',
            'c': 'C',
            'cs': 'C#',
            'php': 'PHP',
            'rb': 'Ruby',
            'go': 'Go',
            'rs': 'Rust',
            'swift': 'Swift',
            'kt': 'Kotlin',
            'scala': 'Scala',
            'html': 'HTML',
            'css': 'CSS',
            'scss': 'SCSS',
            'sass': 'Sass',
            'json': 'JSON',
            'xml': 'XML',
            'yaml': 'YAML',
            'yml': 'YAML',
            'md': 'Markdown',
            'txt': 'Text',
            'sql': 'SQL'
        };

        return languageMap[extension || ''] || 'Unknown';
    }
}