import path from 'path';
import { ICodeChunk } from '../models/File';

export class FileProcessorService {
    // Supported file extensions and their languages
    private static readonly LANGUAGE_MAP: Record<string, string> = {
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.py': 'python',
        '.java': 'java',
        '.cpp': 'cpp',
        '.c': 'c',
        '.h': 'c',
        '.hpp': 'cpp',
        '.go': 'go',
        '.rs': 'rust',
        '.php': 'php',
        '.rb': 'ruby',
        '.cs': 'csharp',
        '.swift': 'swift',
        '.kt': 'kotlin',
        '.scala': 'scala',
        '.html': 'html',
        '.css': 'css',
        '.scss': 'scss',
        '.less': 'less',
        '.json': 'json',
        '.xml': 'xml',
        '.yml': 'yaml',
        '.yaml': 'yaml',
        '.md': 'markdown',
        '.txt': 'text',
        '.sh': 'bash',
        '.sql': 'sql'
    };

    // Files to exclude
    private static readonly EXCLUDED_PATTERNS = [
        /node_modules/,
        /\.git/,
        /\.DS_Store/,
        /\.env/,
        /\.log$/,
        /\.tmp$/,
        /\.cache/,
        /dist/,
        /build/,
        /coverage/,
        /\.nyc_output/
    ];

    static detectLanguage(filename: string): string {
        const ext = path.extname(filename).toLowerCase();
        return this.LANGUAGE_MAP[ext] || 'text';
    }

    static shouldProcessFile(filename: string): boolean {
        return !this.EXCLUDED_PATTERNS.some(pattern => pattern.test(filename));
    }

    static parseCodeChunks(content: string, language: string): ICodeChunk[] {
        const chunks: ICodeChunk[] = [];
        const lines = content.split('\n');

        let currentChunk: ICodeChunk | null = null;
        let chunkId = 1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lineNumber = i + 1;

            // Detect function/class/interface patterns based on language
            const patterns = this.getLanguagePatterns(language);

            for (const pattern of patterns) {
                const match = line.match(pattern.regex);
                if (match) {
                    // Close previous chunk if exists
                    if (currentChunk) {
                        currentChunk.endLine = lineNumber - 1;
                        chunks.push(currentChunk);
                    }

                    // Start new chunk
                    currentChunk = {
                        id: `chunk_${chunkId++}`,
                        content: line,
                        startLine: lineNumber,
                        endLine: lineNumber,
                        type: pattern.type
                    };
                    break;
                }
            }

            // Add line to current chunk
            if (currentChunk) {
                if (currentChunk.content) {
                    currentChunk.content += '\n' + line;
                } else {
                    currentChunk.content = line;
                }
                currentChunk.endLine = lineNumber;
            }
        }

        // Close final chunk
        if (currentChunk) {
            chunks.push(currentChunk);
        }

        // If no specific chunks found, create one large chunk
        if (chunks.length === 0) {
            chunks.push({
                id: 'chunk_1',
                content,
                startLine: 1,
                endLine: lines.length,
                type: 'other'
            });
        }

        return chunks;
    }

    private static getLanguagePatterns(language: string) {
        const patterns = [];

        switch (language) {
            case 'typescript':
            case 'javascript':
                patterns.push(
                    { regex: /^(export\s+)?(async\s+)?function\s+(\w+)/, type: 'function' as const },
                    { regex: /^(export\s+)?(abstract\s+)?class\s+(\w+)/, type: 'class' as const },
                    { regex: /^(export\s+)?interface\s+(\w+)/, type: 'interface' as const },
                    { regex: /^(export\s+)?type\s+(\w+)/, type: 'interface' as const },
                    { regex: /^const\s+(\w+)\s*=\s*(async\s+)?\(/, type: 'function' as const }
                );
                break;

            case 'python':
                patterns.push(
                    { regex: /^(async\s+)?def\s+(\w+)/, type: 'function' as const },
                    { regex: /^class\s+(\w+)/, type: 'class' as const }
                );
                break;

            case 'java':
                patterns.push(
                    { regex: /^(public|private|protected)?\s*(static\s+)?(\w+\s+)*(\w+)\s*\([^)]*\)\s*\{/, type: 'function' as const },
                    { regex: /^(public|private|protected)?\s*(abstract\s+)?class\s+(\w+)/, type: 'class' as const },
                    { regex: /^(public|private|protected)?\s*interface\s+(\w+)/, type: 'interface' as const }
                );
                break;

            case 'cpp':
            case 'c':
                patterns.push(
                    { regex: /^(\w+\s+)*(\w+)\s*\([^)]*\)\s*\{/, type: 'function' as const },
                    { regex: /^(class|struct)\s+(\w+)/, type: 'class' as const }
                );
                break;

            default:
                // Generic patterns for unknown languages
                patterns.push(
                    { regex: /^(function|def|fn)\s+(\w+)/, type: 'function' as const },
                    { regex: /^(class|struct|type)\s+(\w+)/, type: 'class' as const }
                );
        }

        return patterns;
    }

    static extractDependencies(content: string, language: string): string[] {
        const dependencies: string[] = [];
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();

            // Extract imports based on language
            switch (language) {
                case 'typescript':
                case 'javascript': {
                    const importMatch = trimmed.match(/^import.*from\s+['"]([^'"]+)['"]/);
                    const requireMatch = trimmed.match(/require\(['"]([^'"]+)['"]\)/);
                    if (importMatch) dependencies.push(importMatch[1]);
                    if (requireMatch) dependencies.push(requireMatch[1]);
                    break;
                }

                case 'python': {
                    const pythonImportMatch = trimmed.match(/^(import|from)\s+([^\s]+)/);
                    if (pythonImportMatch) dependencies.push(pythonImportMatch[2]);
                    break;
                }

                case 'java': {
                    const javaImportMatch = trimmed.match(/^import\s+([^;]+);/);
                    if (javaImportMatch) dependencies.push(javaImportMatch[1]);
                    break;
                }
            }
        }

        return [...new Set(dependencies)]; // Remove duplicates
    }

    static extractExports(content: string, language: string): string[] {
        const exports: string[] = [];
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();

            // Extract exports based on language
            switch (language) {
                case 'typescript':
                case 'javascript': {
                    const exportMatch = trimmed.match(/^export\s+(function|class|interface|type|const|let|var)\s+([^\s(]+)/);
                    const defaultExportMatch = trimmed.match(/^export\s+default\s+(function\s+)?([^\s(]+)/);
                    if (exportMatch) exports.push(exportMatch[2]);
                    if (defaultExportMatch) exports.push(defaultExportMatch[2] || 'default');
                    break;
                }
            }
        }

        return [...new Set(exports)]; // Remove duplicates
    }
}