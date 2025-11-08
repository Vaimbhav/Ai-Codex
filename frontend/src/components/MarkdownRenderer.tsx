import React from 'react';
import { CodeBlock } from './CodeBlock';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

// Simple markdown parser for basic formatting
const parseMarkdown = (content: string) => {
    // Handle code blocks with language detection
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
        // Add text before code block
        if (match.index > lastIndex) {
            parts.push({
                type: 'text',
                content: content.slice(lastIndex, match.index)
            });
        }

        // Add code block
        parts.push({
            type: 'code',
            language: match[1] || 'text',
            content: match[2].trim()
        });

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
        parts.push({
            type: 'text',
            content: content.slice(lastIndex)
        });
    }

    return parts;
};

// Format text with basic markdown and colorful styling
const formatText = (text: string) => {
    return text
        // Bold text - make it colorful
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-blue-600 dark:text-blue-400">$1</strong>')
        // Italic text - subtle color
        .replace(/\*(.*?)\*/g, '<em class="italic text-purple-600 dark:text-purple-400">$1</em>')
        // Inline code - colorful with subtle background
        .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-green-600 dark:text-green-400">$1</code>')
        // Headers - different colors for hierarchy
        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium text-orange-600 dark:text-orange-400 mt-4 mb-2">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-red-600 dark:text-red-400 mt-5 mb-3">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-6 mb-4">$1</h1>')
        // Lists - colorful bullets and text
        .replace(/^- (.*$)/gim, '<li class="ml-4 text-teal-600 dark:text-teal-400"><span class="text-teal-500">•</span> <span class="text-gray-800 dark:text-gray-200">$1</span></li>')
        .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 text-cyan-600 dark:text-cyan-400">$1</li>')
        // Line breaks
        .replace(/\n/g, '<br>');
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
    const [copied, setCopied] = React.useState(false);
    const parts = parseMarkdown(content);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
    };

    return (
        <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
            {parts.map((part, index) => {
                if (part.type === 'code') {
                    return (
                        <CodeBlock
                            key={index}
                            language={part.language || 'text'}
                            code={part.content}
                        />
                    );
                } else {
                    return (
                        <div
                            key={index}
                            className="text-gray-900 dark:text-white leading-relaxed"
                            dangerouslySetInnerHTML={{
                                __html: formatText(part.content)
                            }}
                        />
                    );
                }
            })}

            {/* Copy icon at bottom like ChatGPT */}
            <div className="flex justify-end mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    title="Copy response"
                    aria-label="Copy response"
                >
                    {copied ? (
                        <>
                            {/* Checkmark icon when copied */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-green-600 dark:text-green-400">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm text-green-600 dark:text-green-400">Copied!</span>
                        </>
                    ) : (
                        <>
                            {/* Copy icon (like ChatGPT) */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" stroke="currentColor" fill="none" />
                                <rect x="3" y="3" width="13" height="13" rx="2" strokeWidth="2" stroke="currentColor" fill="none" />
                            </svg>
                            <span className="text-sm">Copy</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};