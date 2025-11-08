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
    const parts = parseMarkdown(content);

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
        </div>
    );
};