import { useState, useEffect, useCallback } from 'react';
import { FileUploadService, type UploadedFile } from '../services/fileUpload';

// Global file update event system
const fileUpdateListeners = new Set<() => void>();

export const triggerFileUpdate = () => {
    fileUpdateListeners.forEach(listener => listener());
};

export const useFileManager = () => {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadFiles = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const userFiles = await FileUploadService.getUserFiles();
            setFiles(userFiles);
        } catch (error) {
            console.error('Error loading user files:', error);
            setError(error instanceof Error ? error.message : 'Failed to load files');
        } finally {
            setLoading(false);
        }
    }, []);

    const addFile = useCallback((file: UploadedFile) => {
        setFiles(prev => [file, ...prev]);
    }, []);

    const addFiles = useCallback((newFiles: UploadedFile[]) => {
        setFiles(prev => [...newFiles, ...prev]);
    }, []);

    const removeFile = useCallback((fileId: string) => {
        setFiles(prev => prev.filter(file => file.id !== fileId));
    }, []);

    const refreshFiles = useCallback(() => {
        loadFiles();
    }, [loadFiles]);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    // Listen for global file updates
    useEffect(() => {
        fileUpdateListeners.add(refreshFiles);
        return () => {
            fileUpdateListeners.delete(refreshFiles);
        };
    }, [refreshFiles]);

    return {
        files,
        loading,
        error,
        addFile,
        addFiles,
        removeFile,
        refreshFiles,
        loadFiles
    };
};