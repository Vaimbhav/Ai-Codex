/**
 * File utility functions for handling file operations, validation, and formatting
 */

// Supported code file extensions
const CODE_EXTENSIONS = new Set([
  // JavaScript/TypeScript
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  // Python
  'py', 'pyw', 'ipynb',
  // Java
  'java', 'class', 'jar',
  // C/C++
  'c', 'cpp', 'cxx', 'cc', 'h', 'hpp', 'hxx',
  // C#
  'cs', 'vb',
  // Go
  'go',
  // Rust
  'rs',
  // PHP
  'php', 'phtml',
  // Ruby
  'rb', 'gem',
  // Swift
  'swift',
  // Kotlin
  'kt', 'kts',
  // Scala
  'scala', 'sc',
  // Shell
  'sh', 'bash', 'zsh', 'fish',
  // Web
  'html', 'htm', 'css', 'scss', 'sass', 'less',
  // Config/Data
  'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'conf',
  // Markdown/Docs
  'md', 'txt', 'rst',
  // SQL
  'sql',
  // R
  'r',
  // Matlab
  'm',
  // Docker
  'dockerfile',
]);

// Language mapping for syntax highlighting
const LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  pyw: 'python',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  cxx: 'cpp',
  cc: 'cpp',
  h: 'c',
  hpp: 'cpp',
  hxx: 'cpp',
  cs: 'csharp',
  vb: 'vbnet',
  go: 'go',
  rs: 'rust',
  php: 'php',
  phtml: 'php',
  rb: 'ruby',
  swift: 'swift',
  kt: 'kotlin',
  kts: 'kotlin',
  scala: 'scala',
  sc: 'scala',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  fish: 'bash',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  ini: 'ini',
  conf: 'ini',
  md: 'markdown',
  txt: 'text',
  rst: 'rst',
  sql: 'sql',
  r: 'r',
  m: 'matlab',
  dockerfile: 'dockerfile',
};

// File type icons
const FILE_ICONS: Record<string, string> = {
  js: '📄',
  jsx: '📄',
  ts: '📘',
  tsx: '📘',
  py: '🐍',
  java: '☕',
  c: '🔧',
  cpp: '🔧',
  cs: '💜',
  go: '🐹',
  rs: '🦀',
  php: '🐘',
  rb: '💎',
  swift: '🍃',
  kt: '🎯',
  scala: '🎭',
  html: '🌐',
  css: '🎨',
  scss: '🎨',
  sass: '🎨',
  json: '📋',
  xml: '📋',
  yaml: '📋',
  yml: '📋',
  md: '📝',
  txt: '📄',
  sql: '🗃️',
  sh: '⚡',
  dockerfile: '🐳',
};

/**
 * Extract file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  
  const extension = filename.slice(lastDot + 1).toLowerCase();
  
  // Handle special cases like .gitignore, .env
  if (lastDot === 0) return extension;
  
  return extension;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (isNaN(bytes) || bytes < 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  const formattedSize = unitIndex === 0 ? size.toString() : size.toFixed(1);
  return `${formattedSize} ${units[unitIndex]}`;
}

/**
 * Check if file is a valid code file based on extension
 */
export function isValidCodeFile(filename: string): boolean {
  const extension = getFileExtension(filename);
  return CODE_EXTENSIONS.has(extension);
}

/**
 * Get programming language from file extension
 */
export function getLanguageFromExtension(extension: string): string {
  const normalizedExt = extension.toLowerCase();
  return LANGUAGE_MAP[normalizedExt] || 'text';
}

/**
 * Generate unique file ID
 */
export function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate file type against allowed types
 */
export function validateFileType(fileType: string, allowedTypes: string[]): boolean {
  if (allowedTypes.length === 0) return false;
  
  return allowedTypes.some(allowedType => {
    if (allowedType.endsWith('/*')) {
      const baseType = allowedType.slice(0, -1);
      return fileType.startsWith(baseType);
    }
    return fileType === allowedType;
  });
}

/**
 * Get icon for file type
 */
export function getFileIcon(extension: string): string {
  const normalizedExt = extension.toLowerCase();
  return FILE_ICONS[normalizedExt] || '📄';
}

/**
 * Check if file size is within limits
 */
export function isFileSizeValid(size: number, maxSize: number = 50 * 1024 * 1024): boolean {
  return size <= maxSize && size > 0;
}

/**
 * Extract filename without extension
 */
export function getFileNameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return filename;
  return filename.slice(0, lastDot);
}

/**
 * Generate safe filename for storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Get file type category
 */
export function getFileCategory(extension: string): string {
  const ext = extension.toLowerCase();
  
  if (['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs'].includes(ext)) {
    return 'JavaScript/TypeScript';
  }
  
  if (['py', 'pyw', 'ipynb'].includes(ext)) {
    return 'Python';
  }
  
  if (['html', 'htm', 'css', 'scss', 'sass', 'less'].includes(ext)) {
    return 'Web';
  }
  
  if (['json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'conf'].includes(ext)) {
    return 'Configuration';
  }
  
  if (['md', 'txt', 'rst'].includes(ext)) {
    return 'Documentation';
  }
  
  if (['c', 'cpp', 'cxx', 'cc', 'h', 'hpp', 'hxx'].includes(ext)) {
    return 'C/C++';
  }
  
  return 'Other';
}

/**
 * Sort files by type and name
 */
export function sortFiles<T extends { name: string }>(files: T[]): T[] {
  return [...files].sort((a, b) => {
    const aExt = getFileExtension(a.name);
    const bExt = getFileExtension(b.name);
    const aCategory = getFileCategory(aExt);
    const bCategory = getFileCategory(bExt);
    
    // First sort by category
    if (aCategory !== bCategory) {
      return aCategory.localeCompare(bCategory);
    }
    
    // Then sort by name
    return a.name.localeCompare(b.name);
  });
}

/**
 * Filter code files from file list
 */
export function filterCodeFiles<T extends { name: string }>(files: T[]): T[] {
  return files.filter(file => isValidCodeFile(file.name));
}

/**
 * Group files by category
 */
export function groupFilesByCategory<T extends { name: string }>(files: T[]): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  
  files.forEach(file => {
    const extension = getFileExtension(file.name);
    const category = getFileCategory(extension);
    
    if (!groups[category]) {
      groups[category] = [];
    }
    
    groups[category].push(file);
  });
  
  // Sort files within each category
  Object.keys(groups).forEach(category => {
    groups[category].sort((a, b) => a.name.localeCompare(b.name));
  });
  
  return groups;
}