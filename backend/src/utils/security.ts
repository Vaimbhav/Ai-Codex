/**
 * Security utilities for input validation, sanitization, and protection
 */

import crypto from 'crypto';
import { Request } from 'express';

// Input validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  filename: /^[a-zA-Z0-9._-]+$/,
  sessionId: /^[a-zA-Z0-9-_]{20,}$/,
  objectId: /^[0-9a-fA-F]{24}$/,
  geminiApiKey: /^AI[a-zA-Z0-9_-]{35,}$/,
};

// Dangerous file extensions
export const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
  'app', 'deb', 'pkg', 'rpm', 'dmg', 'iso', 'bin', 'run',
  'msi', 'dll', 'so', 'dylib', 'sys', 'drv'
]);

// Dangerous MIME types
export const DANGEROUS_MIME_TYPES = new Set([
  'application/x-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-winexe',
  'application/x-java-archive',
  'application/java-archive',
  'application/x-shockwave-flash',
]);

// XSS protection
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// SQL injection protection (for NoSQL injection)
export function sanitizeNoSQLQuery(query: any): any {
  if (!query || typeof query !== 'object') {
    return query;
  }

  if (Array.isArray(query)) {
    return query.map(sanitizeNoSQLQuery);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(query)) {
    // Remove dangerous operators
    if (key.startsWith('$') && !['$eq', '$ne', '$in', '$nin', '$exists'].includes(key)) {
      continue;
    }
    
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeNoSQLQuery(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// File upload security
export function validateFileUpload(file: Express.Multer.File): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`);
  }
  
  // Check filename
  if (!VALIDATION_PATTERNS.filename.test(file.originalname)) {
    errors.push('Invalid filename. Only alphanumeric characters, dots, hyphens, and underscores allowed');
  }
  
  // Check for dangerous extensions
  const extension = file.originalname.split('.').pop()?.toLowerCase();
  if (extension && DANGEROUS_EXTENSIONS.has(extension)) {
    errors.push(`Dangerous file extension: .${extension}`);
  }
  
  // Check MIME type
  if (DANGEROUS_MIME_TYPES.has(file.mimetype)) {
    errors.push(`Dangerous MIME type: ${file.mimetype}`);
  }
  
  // Additional checks for executables
  if (file.buffer) {
    // Check for PE header (Windows executables)
    if (file.buffer.length > 2 && file.buffer[0] === 0x4D && file.buffer[1] === 0x5A) {
      errors.push('Executable file detected (PE header)');
    }
    
    // Check for ELF header (Linux executables)
    if (file.buffer.length > 4 && 
        file.buffer[0] === 0x7F && 
        file.buffer[1] === 0x45 && 
        file.buffer[2] === 0x4C && 
        file.buffer[3] === 0x46) {
      errors.push('Executable file detected (ELF header)');
    }
    
    // Check for Mach-O header (macOS executables)
    if (file.buffer.length > 4 && 
        ((file.buffer[0] === 0xFE && file.buffer[1] === 0xED && file.buffer[2] === 0xFA && file.buffer[3] === 0xCE) ||
         (file.buffer[0] === 0xCE && file.buffer[1] === 0xFA && file.buffer[2] === 0xED && file.buffer[3] === 0xFE))) {
      errors.push('Executable file detected (Mach-O header)');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Password hashing and validation
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', '1234567890'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common and easily guessable');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Rate limiting helpers
export interface RateLimitInfo {
  requests: number;
  resetTime: number;
  remaining: number;
}

export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}
  
  public checkLimit(identifier: string): RateLimitInfo {
    const now = Date.now();
    const existing = this.requests.get(identifier);
    
    if (!existing || now > existing.resetTime) {
      // Reset window
      const resetTime = now + this.windowMs;
      this.requests.set(identifier, { count: 1, resetTime });
      
      return {
        requests: 1,
        resetTime,
        remaining: this.maxRequests - 1
      };
    }
    
    // Increment count
    existing.count++;
    this.requests.set(identifier, existing);
    
    return {
      requests: existing.count,
      resetTime: existing.resetTime,
      remaining: Math.max(0, this.maxRequests - existing.count)
    };
  }
  
  public isLimited(identifier: string): boolean {
    const info = this.checkLimit(identifier);
    return info.remaining <= 0;
  }
  
  public cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.requests.entries()) {
      if (now > value.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// CSRF token generation and validation
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) return false;
  return crypto.timingSafeEqual(
    Buffer.from(token, 'hex'),
    Buffer.from(sessionToken, 'hex')
  );
}

// Secure session ID generation
export function generateSecureSessionId(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// API key validation
export function validateGeminiApiKey(apiKey: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!apiKey) {
    errors.push('API key is required');
    return { valid: false, errors };
  }
  
  if (!VALIDATION_PATTERNS.geminiApiKey.test(apiKey)) {
    errors.push('Invalid Gemini API key format');
  }
  
  if (apiKey.length < 35) {
    errors.push('API key is too short');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Content security policy helpers
export function generateCSPNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

// Request origin validation
export function validateOrigin(req: Request, allowedOrigins: string[]): boolean {
  const origin = req.headers.origin;
  if (!origin) return false;
  
  return allowedOrigins.includes(origin) || 
         allowedOrigins.includes('*') ||
         (process.env.NODE_ENV === 'development' && origin.includes('localhost'));
}

// Input sanitization for different contexts
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 255);
}

export function sanitizeUserInput(input: string): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .substring(0, 1000); // Limit length
}

// Path traversal protection
export function validatePath(path: string): boolean {
  const normalizedPath = path.replace(/\\/g, '/');
  
  // Check for path traversal attempts
  if (normalizedPath.includes('../') || 
      normalizedPath.includes('..\\') ||
      normalizedPath.startsWith('/') ||
      normalizedPath.includes('//')) {
    return false;
  }
  
  return true;
}

// JWT token validation helpers
export function validateJWTStructure(token: string): boolean {
  if (!token) return false;
  
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  try {
    // Validate base64url encoding
    parts.forEach(part => {
      Buffer.from(part, 'base64url');
    });
    return true;
  } catch {
    return false;
  }
}

// Environment validation
export function validateEnvironmentVariables(): {
  valid: boolean;
  missing: string[];
  invalid: string[];
} {
  const required = [
    'NODE_ENV',
    'JWT_SECRET',
    'MONGODB_URI',
  ];
  
  const optional = [
    'GEMINI_API_KEY',
    'PORT',
    'CORS_ORIGIN',
  ];
  
  const missing: string[] = [];
  const invalid: string[] = [];
  
  // Check required variables
  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });
  
  // Validate JWT secret length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    invalid.push('JWT_SECRET must be at least 32 characters long');
  }
  
  // Validate MongoDB URI format
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb')) {
    invalid.push('MONGODB_URI must be a valid MongoDB connection string');
  }
  
  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid
  };
}

// Security headers
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Create global rate limiter instances
export const globalRateLimiter = new RateLimiter(100, 15 * 60 * 1000); // 100 req/15min
export const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000);     // 5 req/15min for auth
export const uploadRateLimiter = new RateLimiter(10, 60 * 1000);       // 10 req/min for uploads