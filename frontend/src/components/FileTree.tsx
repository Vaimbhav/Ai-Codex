import { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, Trash2, Eye } from 'lucide-react';
import { formatFileSize } from '../utils/helpers';

interface UploadedFile {
    id: string;
    name: string;
    language: string;
    size: number;
    chunks: number;
    dependencies: number;
    exports: number;
}

interface FileTreeProps {
    files: UploadedFile[];
    onFileSelect: (fileId: string) => void;
    onFileDelete: (fileId: string) => void;
    selectedFileId?: string;
}

interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    file?: UploadedFile;
    children: TreeNode[];
}

export default function FileTree({ files, onFileSelect, onFileDelete, selectedFileId }: FileTreeProps) {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    // Build tree structure from flat file list
    const buildTree = (files: UploadedFile[]): TreeNode[] => {
        const root: TreeNode[] = [];
        const folderMap = new Map<string, TreeNode>();

        files.forEach(file => {
            const parts = file.name.split('/').filter(part => part.length > 0);
            let currentLevel = root;
            let currentPath = '';

            // Create folder structure
            for (let i = 0; i < parts.length - 1; i++) {
                const folderName = parts[i];
                currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

                let folder = currentLevel.find(node => node.name === folderName && node.type === 'folder');

                if (!folder) {
                    folder = {
                        name: folderName,
                        path: currentPath,
                        type: 'folder',
                        children: []
                    };
                    currentLevel.push(folder);
                    folderMap.set(currentPath, folder);
                }

                currentLevel = folder.children;
            }

            // Add file
            const fileName = parts[parts.length - 1];
            currentLevel.push({
                name: fileName,
                path: file.name,
                type: 'file',
                file,
                children: []
            });
        });

        return root.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'folder' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    };

    const toggleFolder = (path: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        setExpandedFolders(newExpanded);
    };

    const getLanguageColor = (language: string): string => {
        const colors: Record<string, string> = {
            typescript: 'text-blue-600',
            javascript: 'text-yellow-600',
            python: 'text-green-600',
            java: 'text-red-600',
            cpp: 'text-purple-600',
            go: 'text-cyan-600',
            rust: 'text-orange-600',
            html: 'text-red-500',
            css: 'text-blue-500',
            json: 'text-gray-600',
            markdown: 'text-gray-700'
        };
        return colors[language] || 'text-gray-500';
    };

    const renderTree = (nodes: TreeNode[], depth = 0): React.ReactNode => {
        const getDepthClass = (depth: number): string => {
            return `tree-depth-${Math.min(depth, 9)}`;
        };

        return nodes.map(node => (
            <div key={node.path} className={getDepthClass(depth)}>
                {node.type === 'folder' ? (
                    <div
                        className="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
                        onClick={() => toggleFolder(node.path)}
                    >
                        {expandedFolders.has(node.path) ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                        <Folder className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">{node.name}</span>
                    </div>
                ) : (
                    <div
                        className={`flex items-center gap-2 py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded group ${selectedFileId === node.file?.id ? 'bg-blue-50 dark:bg-blue-950' : ''
                            }`}
                        onClick={() => node.file && onFileSelect(node.file.id)}
                    >
                        <div className="w-4" /> {/* Spacer for alignment */}
                        <File className={`w-4 h-4 ${getLanguageColor(node.file?.language || '')}`} />
                        <span className="text-sm flex-1">{node.name}</span>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-muted-foreground">
                                {node.file && formatFileSize(node.file.size)}
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    node.file && onFileSelect(node.file.id);
                                }}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                title="View file"
                            >
                                <Eye className="w-3 h-3" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    node.file && onFileDelete(node.file.id);
                                }}
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
                                title="Delete file"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                )}

                {node.type === 'folder' && expandedFolders.has(node.path) && (
                    <div>
                        {renderTree(node.children, depth + 1)}
                    </div>
                )}
            </div>
        ));
    };

    const tree = buildTree(files);

    if (files.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <File className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No files uploaded yet</p>
                <p className="text-sm">Upload some code files to get started</p>
            </div>
        );
    }

    return (
        <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Project Files ({files.length})</h3>
                <div className="text-sm text-muted-foreground">
                    {files.reduce((total, file) => total + file.size, 0) > 0 &&
                        formatFileSize(files.reduce((total, file) => total + file.size, 0))
                    }
                </div>
            </div>

            <div className="space-y-1 max-h-96 overflow-y-auto">
                {renderTree(tree)}
            </div>
        </div>
    );
}