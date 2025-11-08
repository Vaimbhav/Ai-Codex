import { BrainCircuit, Loader2, Sparkles } from 'lucide-react';

interface ContextToggleProps {
    useContext: boolean;
    onToggle: (enabled: boolean) => void;
    onGenerateEmbeddings: () => void;
    isGeneratingEmbeddings: boolean;
    hasFiles: boolean;
}

export default function ContextToggle({
    useContext,
    onToggle,
    onGenerateEmbeddings,
    isGeneratingEmbeddings,
    hasFiles
}: ContextToggleProps) {
    return (
        <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-purple-600" />
                    <h3 className="font-medium">Context-Aware AI</h3>
                </div>

                <button
                    onClick={() => onToggle(!useContext)}
                    aria-label={`Toggle context-aware AI ${useContext ? 'off' : 'on'}`}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useContext ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useContext ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>

            <p className="text-sm text-muted-foreground mb-3">
                {useContext
                    ? 'AI will analyze your uploaded files to provide contextual responses'
                    : 'AI will respond without analyzing your uploaded files'
                }
            </p>

            {hasFiles && (
                <div className="flex items-center gap-2">
                    <button
                        onClick={onGenerateEmbeddings}
                        disabled={isGeneratingEmbeddings}
                        className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                        {isGeneratingEmbeddings ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Analyzing Code...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Enhance Context
                            </>
                        )}
                    </button>

                    <span className="text-xs text-muted-foreground">
                        Generate embeddings for better code understanding
                    </span>
                </div>
            )}
        </div>
    );
}