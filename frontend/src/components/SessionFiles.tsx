import React, { useState } from 'react';
import { File, FileText, Code, Database, Clock, ChevronDown, ChevronRight, Eye, Trash2, X } from 'lucide-react';
import { FileUploadService, type UploadedFile } from '../services/fileUpload';
import { formatFileSize } from '../utils/helpers';
import { useFileManager, triggerFileUpdate } from '../hooks/useFileManager';
import { ConfirmationModal } from './ConfirmationModal';

interface UserFilesProps {
    onFileSelect?: (file: UploadedFile) => void;
}

export const UserFiles: React.FC<UserFilesProps> = ({
    onFileSelect
}) => {
    const { files, loading, error } = useFileManager();
    const [isExpanded, setIsExpanded] = useState(true);
    const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
    const [viewingFile, setViewingFile] = useState<{ file: UploadedFile, content: string } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<UploadedFile | null>(null);

    const getFileIcon = (language: string) => {
        const lowerLang = language.toLowerCase();

        if (['javascript', 'typescript'].includes(lowerLang)) {
            return <Code className="w-4 h-4 text-yellow-500" />;
        }
        if (lowerLang === 'python') {
            return <Code className="w-4 h-4 text-blue-500" />;
        }
        if (['java', 'c', 'c++', 'c#'].includes(lowerLang)) {
            return <Code className="w-4 h-4 text-red-500" />;
        }
        if (['json', 'xml', 'yaml'].includes(lowerLang)) {
            return <Database className="w-4 h-4 text-green-500" />;
        }
        if (['html', 'css', 'scss'].includes(lowerLang)) {
            return <FileText className="w-4 h-4 text-purple-500" />;
        }

        return <File className="w-4 h-4 text-gray-500" />;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    };

    const handleReadFile = async (file: UploadedFile) => {
        console.log('Read file button clicked for:', file.name);

        try {
            const fileWithContent = await FileUploadService.getFileById(file.id);
            console.log('File content:', fileWithContent.content);

            // Show the content in a modal for better mobile experience
            setViewingFile({
                file: file,
                content: fileWithContent.content
            });
        } catch (error) {
            console.error('Error reading file:', error);
            alert('Failed to read file: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    const handleDeleteFile = (file: UploadedFile) => {
        console.log('Delete file button clicked for:', file.name);

        // Prevent multiple clicks during deletion
        if (deletingFileId === file.id) {
            console.log('Already deleting this file, ignoring click');
            return;
        }

        console.log('Showing file confirmation modal...');
        setFileToDelete(file);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteFile = async () => {
        if (!fileToDelete) return;

        console.log('Starting file deletion process for:', fileToDelete.id);
        setDeletingFileId(fileToDelete.id);
        setShowDeleteConfirm(false);

        try {
            console.log('Calling FileUploadService.deleteFile...');
            await FileUploadService.deleteFile(fileToDelete.id);
            console.log('File deletion API call completed');

            console.log('Triggering file update...');
            triggerFileUpdate();
            console.log('File update triggered');

            // Show success feedback
            const successDiv = document.createElement('div');
            successDiv.innerHTML = `
                <div style="
                    position: fixed; 
                    top: 20px; 
                    right: 20px; 
                    background: #10b981; 
                    color: white; 
                    padding: 12px 20px; 
                    border-radius: 8px; 
                    z-index: 1000;
                    font-size: 14px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                ">
                    ✓ File "${fileToDelete.name}" deleted successfully
                </div>
            `;
            document.body.appendChild(successDiv);
            setTimeout(() => {
                document.body.removeChild(successDiv);
            }, 3000);

        } catch (error) {
            console.error('Error deleting file:', error);

            // Show error feedback
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = `
                <div style="
                    position: fixed; 
                    top: 20px; 
                    right: 20px; 
                    background: #ef4444; 
                    color: white; 
                    padding: 12px 20px; 
                    border-radius: 8px; 
                    z-index: 1000;
                    font-size: 14px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                ">
                    ✗ Failed to delete file: ${(error instanceof Error ? error.message : 'Unknown error')}
                </div>
            `;
            document.body.appendChild(errorDiv);
            setTimeout(() => {
                document.body.removeChild(errorDiv);
            }, 5000);
        } finally {
            setDeletingFileId(null);
            setFileToDelete(null);
        }
    };

    const cancelDeleteFile = () => {
        console.log('User cancelled file deletion');
        setShowDeleteConfirm(false);
        setFileToDelete(null);
    };

    return (
        <>
            <style>{`
                .file-action-button {
                    -webkit-tap-highlight-color: transparent;
                    -webkit-touch-callout: none;
                    -webkit-user-select: none;
                    -khtml-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                    touch-action: manipulation;
                }
            `}</style>
            <div className="border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        {isExpanded ?
                            <ChevronDown className="w-4 h-4 text-gray-500" /> :
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                        }
                        <span className="text-sm font-medium">My Files</span>
                        {files.length > 0 && (
                            <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                {files.length}
                            </span>
                        )}
                    </div>
                </button>

                {isExpanded && (
                    <div className="pb-2">
                        {loading && (
                            <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                Loading files...
                            </div>
                        )}

                        {error && (
                            <div className="px-3 py-2 text-sm text-red-600 dark:text-red-400 text-center">
                                {error}
                            </div>
                        )}

                        {!loading && !error && files.length === 0 && (
                            <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                No files uploaded yet
                            </div>
                        )}

                        {!loading && !error && files.length > 0 && (
                            <div className="space-y-1">
                                {files.map((file) => (
                                    <div
                                        key={file.id}
                                        className="mx-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            {getFileIcon(file.language)}
                                            <span
                                                className={`text-sm font-medium truncate flex-1 select-none ${onFileSelect ? 'cursor-pointer' : ''}`}
                                                onClick={() => onFileSelect?.(file)}
                                            >
                                                {file.name}
                                            </span>

                                            {/* Action buttons - Always visible on the right */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {file.embeddingsGenerated && (
                                                    <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded select-none">
                                                        AI Ready
                                                    </span>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        handleReadFile(file);
                                                    }}
                                                    className="file-action-button p-2 min-w-[32px] min-h-[32px] rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center cursor-pointer active:bg-gray-300 dark:active:bg-gray-600"
                                                    title="View file content"
                                                    type="button"
                                                >
                                                    <Eye className="w-4 h-4 text-blue-500" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        if (deletingFileId !== file.id) {
                                                            handleDeleteFile(file);
                                                        }
                                                    }}
                                                    className="file-action-button p-2 min-w-[32px] min-h-[32px] rounded transition-colors flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer active:bg-gray-300 dark:active:bg-gray-600"
                                                    title={deletingFileId === file.id ? "Deleting..." : "Delete file"}
                                                    type="button"
                                                    disabled={deletingFileId === file.id}
                                                >
                                                    <Trash2 className={`w-4 h-4 ${deletingFileId === file.id ? 'text-gray-400' : 'text-red-500'}`} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-gray-500 ml-6">
                                            <span>{file.language}</span>
                                            <span>{formatFileSize(file.size)}</span>
                                            <span>{file.chunks} chunks</span>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span>{formatDate(file.uploadedAt)}</span>
                                            </div>
                                        </div>

                                        {(file.dependencies > 0 || file.exports > 0) && (
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 ml-6">
                                                {file.dependencies > 0 && (
                                                    <span>{file.dependencies} dependencies</span>
                                                )}
                                                {file.exports > 0 && (
                                                    <span>{file.exports} exports</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* File Content Modal */}
            {viewingFile && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {viewingFile.file.name}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {viewingFile.file.language} • {formatFileSize(viewingFile.file.size)}
                                </p>
                            </div>
                            <button
                                onClick={() => setViewingFile(null)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title="Close"
                            >
                                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-auto p-4">
                            <pre className="text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto whitespace-pre-wrap break-words">
                                <code className="text-gray-800 dark:text-gray-200">
                                    {viewingFile.content}
                                </code>
                            </pre>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(viewingFile.content);
                                    alert('File content copied to clipboard!');
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Copy Content
                            </button>
                            <button
                                onClick={() => setViewingFile(null)}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                title="Delete File"
                message={fileToDelete ? `Are you sure you want to delete "${fileToDelete.name}"? This action cannot be undone.` : ''}
                onConfirm={confirmDeleteFile}
                onCancel={cancelDeleteFile}
                confirmText="Delete"
                cancelText="Cancel"
            />
        </>
    );
};