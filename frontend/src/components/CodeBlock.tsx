import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { useTheme } from '../contexts/ThemeContext';

interface CodeBlockProps {
    language: string;
    code: string;
    className?: string;
}

// Custom styles with good contrast and readability
const customDarkStyle = {
    'code[class*="language-"]': {
        color: '#e5e7eb', // Light gray for better readability
        background: 'transparent',
    },
    'pre[class*="language-"]': {
        color: '#e5e7eb',
        background: 'transparent',
    },
    'comment': { color: '#9ca3af' }, // Light gray for comments
    'prolog': { color: '#9ca3af' },
    'doctype': { color: '#9ca3af' },
    'cdata': { color: '#9ca3af' },
    'punctuation': { color: '#d1d5db' }, // Light gray
    'property': { color: '#f472b6' }, // Bright pink
    'tag': { color: '#f472b6' },
    'constant': { color: '#a78bfa' }, // Light purple
    'symbol': { color: '#a78bfa' },
    'deleted': { color: '#ef4444' }, // Red
    'boolean': { color: '#60a5fa' }, // Light blue
    'number': { color: '#60a5fa' },
    'selector': { color: '#34d399' }, // Green
    'attr-name': { color: '#34d399' },
    'string': { color: '#fbbf24' }, // Yellow
    'char': { color: '#fbbf24' },
    'builtin': { color: '#38bdf8' }, // Sky blue
    'inserted': { color: '#34d399' },
    'operator': { color: '#f472b6' }, // Pink
    'entity': { color: '#e5e7eb' },
    'url': { color: '#38bdf8' },
    'variable': { color: '#e5e7eb' },
    'atrule': { color: '#38bdf8' },
    'attr-value': { color: '#fbbf24' },
    'function': { color: '#34d399' }, // Green for functions
    'class-name': { color: '#38bdf8' },
    'keyword': { color: '#f472b6' }, // Pink for keywords
    'regex': { color: '#fbbf24' },
    'important': { color: '#ef4444' },
};

const customLightStyle = {
    'code[class*="language-"]': {
        color: '#374151', // Dark gray for better readability
        background: 'transparent',
    },
    'pre[class*="language-"]': {
        color: '#374151',
        background: 'transparent',
    },
    'comment': { color: '#6b7280' }, // Medium gray for comments
    'prolog': { color: '#6b7280' },
    'doctype': { color: '#6b7280' },
    'cdata': { color: '#6b7280' },
    'punctuation': { color: '#4b5563' }, // Dark gray
    'property': { color: '#db2777' }, // Dark pink
    'tag': { color: '#db2777' },
    'constant': { color: '#7c3aed' }, // Purple
    'symbol': { color: '#7c3aed' },
    'deleted': { color: '#dc2626' }, // Red
    'boolean': { color: '#2563eb' }, // Blue
    'number': { color: '#2563eb' },
    'selector': { color: '#059669' }, // Green
    'attr-name': { color: '#059669' },
    'string': { color: '#d97706' }, // Orange
    'char': { color: '#d97706' },
    'builtin': { color: '#0284c7' }, // Sky blue
    'inserted': { color: '#059669' },
    'operator': { color: '#db2777' }, // Pink
    'entity': { color: '#374151' },
    'url': { color: '#0284c7' },
    'variable': { color: '#374151' },
    'atrule': { color: '#0284c7' },
    'attr-value': { color: '#d97706' },
    'function': { color: '#059669' }, // Green for functions
    'class-name': { color: '#0284c7' },
    'keyword': { color: '#db2777' }, // Pink for keywords
    'regex': { color: '#d97706' },
    'important': { color: '#dc2626' },
};

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code, className = '' }) => {
    const [copied, setCopied] = useState(false);
    const { actualTheme } = useTheme(); // Use actualTheme instead of theme

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
    };

    // Map common language aliases to proper syntax highlighter names
    const getLanguageName = (lang: string): string => {
        const languageMap: { [key: string]: string } = {
            'py': 'python',
            'js': 'javascript',
            'ts': 'typescript',
            'cpp': 'cpp',
            'c++': 'cpp',
            'html': 'markup',
            'xml': 'markup',
            'sh': 'bash',
            'shell': 'bash',
            'yml': 'yaml'
        };
        return languageMap[lang.toLowerCase()] || lang.toLowerCase();
    };

    return (
        <div className={`relative rounded-lg overflow-hidden my-4 border border-gray-200 dark:border-gray-700 ${className}`}>
            <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {language.toUpperCase()}
                </span>
                <button
                    onClick={handleCopy}
                    className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-400 transition-colors"
                >
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900">
                <SyntaxHighlighter
                    language={getLanguageName(language)}
                    style={actualTheme === 'dark' ? customDarkStyle : customLightStyle}
                    customStyle={{
                        margin: 0,
                        padding: '1rem',
                        fontSize: '0.875rem',
                        background: 'transparent'
                    }}
                    wrapLongLines={true}
                    showLineNumbers={false}
                >
                    {code}
                </SyntaxHighlighter>
            </div>
        </div>
    );
};