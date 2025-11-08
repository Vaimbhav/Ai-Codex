import { useState, useCallback, useRef } from 'react';
import { Upload, File, X, FolderOpen, AlertCircle } from 'lucide-react';
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

interface FileUploadProps {
    onFilesUploaded: (files: UploadedFile[], sessionId: string) => void;
    sessionId?: string;
}

export default function FileUpload({ onFilesUploaded, sessionId }: FileUploadProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            setSelectedFiles(files);
        }
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFiles(e.target.files);
        }
    }, []);

    const filterSupportedFiles = (files: FileList): File[] => {
        const supportedExtensions = [
            '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c', '.h', '.hpp',
            '.go', '.rs', '.php', '.rb', '.cs', '.swift', '.kt', '.scala', '.html',
            '.css', '.scss', '.less', '.json', '.xml', '.yml', '.yaml', '.md', '.txt',
            '.sh', '.sql'
        ];

        const excludedPatterns = [
            /node_modules/,
            /\.git/,
            /\.DS_Store/,
            /\.env/,
            /\.log$/,
            /\.tmp$/,
            /\.cache/,
            /dist/,
            /build/,
            /coverage/
        ];

        return Array.from(files).filter(file => {
            // Check if file has supported extension
            const hasValidExtension = supportedExtensions.some(ext =>
                file.name.toLowerCase().endsWith(ext)
            );

            // Check if file should be excluded
            const shouldExclude = excludedPatterns.some(pattern =>
                pattern.test(file.name) || pattern.test(file.webkitRelativePath || '')
            );

            return hasValidExtension && !shouldExclude && file.size > 0;
        });
    };

    const uploadFiles = async () => {
        if (!selectedFiles) return;

        const supportedFiles = filterSupportedFiles(selectedFiles);

        if (supportedFiles.length === 0) {
            setError('No supported files found. Please select code files (.ts, .js, .py, etc.)');
            return;
        }

        setUploading(true);
        setError(null);
        setUploadProgress(0);

        try {
            const formData = new FormData();

            supportedFiles.forEach(file => {
                formData.append('files', file);
            });

            if (sessionId) {
                formData.append('sessionId', sessionId);
            }

            const response = await fetch('http://localhost:3001/api/files/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();

            if (result.success) {
                onFilesUploaded(result.files, result.sessionId);
                setSelectedFiles(null);
                setUploadProgress(100);

                // Reset file inputs
                if (fileInputRef.current) fileInputRef.current.value = '';
                if (folderInputRef.current) folderInputRef.current.value = '';
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            setError(error instanceof Error ? error.message : 'Upload failed');
        } finally {
            setUploading(false);
            setTimeout(() => setUploadProgress(0), 2000);
        }
    };

    const removeFile = (index: number) => {
        if (!selectedFiles) return;

        const files = Array.from(selectedFiles);
        files.splice(index, 1);

        const dt = new DataTransfer();
        files.forEach(file => dt.items.add(file));
        setSelectedFiles(dt.files);
    };

    const supportedFiles = selectedFiles ? filterSupportedFiles(selectedFiles) : [];

    return (
        <div className="space-y-4">
            {/* Drop Zone */}
            <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${isDragOver
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 scale-[1.02]'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                aria-label="File upload area. Drag and drop files here or use the buttons below to select files."
            >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">
                    Drop your code files here
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                    Supports: TypeScript, JavaScript, Python, Java, C++, Go, Rust, and more
                </p>

                <div className="flex gap-2 justify-center">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all hover:shadow-lg transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-label="Select individual files"
                    >
                        Select Files
                    </button>

                    <button
                        onClick={() => folderInputRef.current?.click()}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:shadow-md transform hover:scale-[1.02] flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-label="Select entire folder"
                    >
                        <FolderOpen className="w-4 h-4" />
                        Select Folder
                    </button>
                </div>

                <label htmlFor="file-input" className="sr-only">
                    Select individual files to upload
                </label>
                <input
                    id="file-input"
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={handleFileSelect}
                    accept=".ts,.tsx,.js,.jsx,.py,.java,.cpp,.c,.h,.hpp,.go,.rs,.php,.rb,.cs,.swift,.kt,.scala,.html,.css,.scss,.less,.json,.xml,.yml,.yaml,.md,.txt,.sh,.sql"
                    aria-describedby="file-upload-description"
                />

                <label htmlFor="folder-input" className="sr-only">
                    Select entire folder to upload
                </label>
                <input
                    id="folder-input"
                    ref={folderInputRef}
                    type="file"
                    multiple
                    // @ts-expect-error webkitdirectory is a valid HTML attribute but not in TypeScript types
                    webkitdirectory=""
                    className="sr-only"
                    onChange={handleFileSelect}
                    aria-describedby="folder-upload-description"
                />

                <div id="file-upload-description" className="sr-only">
                    Select code files to upload. Supports TypeScript, JavaScript, Python, Java, C++, Go, Rust, and more.
                </div>
                <div id="folder-upload-description" className="sr-only">
                    Select an entire folder to upload. All supported code files will be processed.
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Selected Files */}
            {supportedFiles.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium">Selected Files ({supportedFiles.length})</h3>
                        {!uploading && (
                            <button
                                onClick={uploadFiles}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                Upload Files
                            </button>
                        )}
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {supportedFiles.map((file, index) => (
                            <div
                                key={`${file.name}-${index}`}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <File className="w-4 h-4 text-gray-500" />
                                    <div>
                                        <p className="text-sm font-medium">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatFileSize(file.size)}
                                        </p>
                                    </div>
                                </div>

                                {!uploading && (
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                        title={`Remove ${file.name} from upload`}
                                        aria-label={`Remove ${file.name} from upload`}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Upload Progress */}
                    {uploading && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span>Uploading files...</span>
                                <span>{Math.round(uploadProgress)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className={`bg-blue-600 h-2 rounded-full transition-all duration-300 upload-progress-bar`}
                                    data-progress={uploadProgress}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}