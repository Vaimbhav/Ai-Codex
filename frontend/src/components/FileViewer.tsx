import { useState, useEffect } from 'react';
import { X, Download, Code2, FileText } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface FileContent {
  id: string;
  name: string;
  language: string;
  content: string;
  chunks: Array<{
    id: string;
    content: string;
    startLine: number;
    endLine: number;
    type: string;
  }>;
  dependencies: string[];
  exports: string[];
}

interface FileViewerProps {
  fileId: string;
  onClose: () => void;
}

export default function FileViewer({ fileId, onClose }: FileViewerProps) {
  const [file, setFile] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'content' | 'chunks' | 'analysis'>('content');

  useEffect(() => {
    fetchFileContent();
  }, [fileId]);

  const fetchFileContent = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`http://localhost:3001/api/files/${fileId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch file content');
      }

      const result = await response.json();
      
      if (result.success) {
        setFile(result.file);
      } else {
        throw new Error(result.error || 'Failed to load file');
      }
    } catch (error) {
      console.error('Error fetching file:', error);
      setError(error instanceof Error ? error.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = () => {
    if (!file) return;

    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-center">Loading file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!file) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5" />
            <div>
              <h2 className="font-semibold">{file.name}</h2>
              <p className="text-sm text-muted-foreground capitalize">
                {file.language} • {file.content.split('\n').length} lines
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={downloadFile}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setView('content')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              view === 'content'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Content
          </button>
          <button
            onClick={() => setView('chunks')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              view === 'chunks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Code Chunks ({file.chunks.length})
          </button>
          <button
            onClick={() => setView('analysis')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              view === 'analysis'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Analysis
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {view === 'content' && (
            <div className="h-full overflow-auto">
              <SyntaxHighlighter
                language={file.language}
                style={vscDarkPlus}
                showLineNumbers
                customStyle={{
                  margin: 0,
                  height: '100%',
                  fontSize: '14px'
                }}
              >
                {file.content}
              </SyntaxHighlighter>
            </div>
          )}

          {view === 'chunks' && (
            <div className="h-full overflow-auto p-4 space-y-4">
              {file.chunks.map((chunk, index) => (
                <div key={chunk.id} className="border rounded-lg">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4" />
                      <span className="font-medium">
                        Chunk {index + 1}
                      </span>
                      <span className="text-sm text-muted-foreground capitalize">
                        {chunk.type}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Lines {chunk.startLine}-{chunk.endLine}
                    </span>
                  </div>
                  <div className="max-h-60 overflow-auto">
                    <SyntaxHighlighter
                      language={file.language}
                      style={vscDarkPlus}
                      showLineNumbers
                      startingLineNumber={chunk.startLine}
                      customStyle={{ margin: 0, fontSize: '12px' }}
                    >
                      {chunk.content}
                    </SyntaxHighlighter>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'analysis' && (
            <div className="h-full overflow-auto p-4 space-y-6">
              <div>
                <h3 className="font-medium mb-3">Dependencies ({file.dependencies.length})</h3>
                {file.dependencies.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {file.dependencies.map((dep, index) => (
                      <div key={index} className="px-3 py-2 bg-blue-50 dark:bg-blue-950 rounded text-sm">
                        {dep}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No dependencies found</p>
                )}
              </div>

              <div>
                <h3 className="font-medium mb-3">Exports ({file.exports.length})</h3>
                {file.exports.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {file.exports.map((exp, index) => (
                      <div key={index} className="px-3 py-2 bg-green-50 dark:bg-green-950 rounded text-sm">
                        {exp}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No exports found</p>
                )}
              </div>

              <div>
                <h3 className="font-medium mb-3">Code Structure</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Lines:</span>
                    <span>{file.content.split('\n').length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Code Chunks:</span>
                    <span>{file.chunks.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Functions:</span>
                    <span>{file.chunks.filter(c => c.type === 'function').length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Classes:</span>
                    <span>{file.chunks.filter(c => c.type === 'class').length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Interfaces:</span>
                    <span>{file.chunks.filter(c => c.type === 'interface').length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}