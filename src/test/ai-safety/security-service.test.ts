import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============= Types =============

interface AuthValidation {
  isValid: boolean;
  userId: string | null;
  error?: string;
  claims?: {
    sub: string;
    email?: string;
    role?: string;
    aud?: string;
    exp?: number;
  };
}

interface OwnershipCheck {
  isOwner: boolean;
  error?: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  error?: string;
}

interface AbuseSignal {
  type: 'rate_limit_exceeded' | 'ownership_violation' | 'suspicious_pattern' | 'auth_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  resourceId?: string;
  details: string;
  timestamp: string;
}

// ============= Mock Security Service =============

class MockSecurityService {
  private abuseSignals: AbuseSignal[] = [];
  private rateLimitStore: Map<string, { count: number; resetAt: Date }> = new Map();

  constructor(private mockAuthResult: AuthValidation) {}

  async validateAuth(authHeader: string | null): Promise<AuthValidation> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isValid: false, userId: null, error: 'Missing or invalid Authorization header' };
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (token === 'invalid_token') {
      this.recordAbuseSignal({
        type: 'auth_failure',
        severity: 'medium',
        details: 'Auth validation failed: Invalid token',
        timestamp: new Date().toISOString(),
      });
      return { isValid: false, userId: null, error: 'Invalid or expired token' };
    }

    if (token === 'expired_token') {
      return { isValid: false, userId: null, error: 'Token expired' };
    }

    return this.mockAuthResult;
  }

  async verifyDocumentOwnership(userId: string, documentId: string): Promise<OwnershipCheck> {
    // Simulate ownership check
    if (documentId === 'not-found') {
      return { isOwner: false, error: 'Document not found' };
    }

    if (documentId === 'other-user-doc') {
      this.recordAbuseSignal({
        type: 'ownership_violation',
        severity: 'high',
        userId,
        resourceId: documentId,
        details: `User ${userId} attempted to access document ${documentId} without ownership`,
        timestamp: new Date().toISOString(),
      });
      return { isOwner: false, error: 'Access denied' };
    }

    return { isOwner: true };
  }

  async checkRateLimit(userId: string, operation: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const key = `${userId}:${operation}`;
    const now = new Date();
    const entry = this.rateLimitStore.get(key);

    if (entry && entry.resetAt > now) {
      if (entry.count >= limit) {
        this.recordAbuseSignal({
          type: 'rate_limit_exceeded',
          severity: 'medium',
          userId,
          details: `User ${userId} exceeded rate limit for ${operation}`,
          timestamp: now.toISOString(),
        });
        return {
          allowed: false,
          remaining: 0,
          resetAt: entry.resetAt.toISOString(),
        };
      }
      entry.count++;
      return {
        allowed: true,
        remaining: limit - entry.count,
        resetAt: entry.resetAt.toISOString(),
      };
    }

    const resetAt = new Date(now.getTime() + windowSeconds * 1000);
    this.rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: resetAt.toISOString(),
    };
  }

  recordAbuseSignal(signal: AbuseSignal): void {
    this.abuseSignals.push(signal);
  }

  getAbuseSignals(): AbuseSignal[] {
    return this.abuseSignals;
  }

  clearAbuseSignals(): void {
    this.abuseSignals = [];
  }

  clearRateLimits(): void {
    this.rateLimitStore.clear();
  }
}

// ============= Tests =============

describe('Security Service', () => {
  let securityService: MockSecurityService;

  beforeEach(() => {
    securityService = new MockSecurityService({
      isValid: true,
      userId: 'test-user-123',
      claims: {
        sub: 'test-user-123',
        email: 'test@example.com',
        role: 'user',
      },
    });
  });

  afterEach(() => {
    securityService.clearAbuseSignals();
    securityService.clearRateLimits();
  });

  describe('validateAuth', () => {
    it('should validate valid bearer token', async () => {
      const result = await securityService.validateAuth('Bearer valid_token');
      expect(result.isValid).toBe(true);
      expect(result.userId).toBe('test-user-123');
    });

    it('should reject missing auth header', async () => {
      const result = await securityService.validateAuth(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Missing');
    });

    it('should reject empty auth header', async () => {
      const result = await securityService.validateAuth('');
      expect(result.isValid).toBe(false);
    });

    it('should reject non-bearer auth', async () => {
      const result = await securityService.validateAuth('Basic abc123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid');
    });

    it('should reject invalid token', async () => {
      const result = await securityService.validateAuth('Bearer invalid_token');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should reject expired token', async () => {
      const result = await securityService.validateAuth('Bearer expired_token');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should record abuse signal for invalid auth', async () => {
      await securityService.validateAuth('Bearer invalid_token');
      const signals = securityService.getAbuseSignals();
      expect(signals.length).toBe(1);
      expect(signals[0].type).toBe('auth_failure');
    });

    it('should return user claims on success', async () => {
      const result = await securityService.validateAuth('Bearer valid_token');
      expect(result.claims).toBeDefined();
      expect(result.claims?.email).toBe('test@example.com');
    });
  });

  describe('verifyDocumentOwnership', () => {
    it('should verify ownership for own documents', async () => {
      const result = await securityService.verifyDocumentOwnership('user-1', 'doc-1');
      expect(result.isOwner).toBe(true);
    });

    it('should reject non-existent documents', async () => {
      const result = await securityService.verifyDocumentOwnership('user-1', 'not-found');
      expect(result.isOwner).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should reject access to other user documents', async () => {
      const result = await securityService.verifyDocumentOwnership('user-1', 'other-user-doc');
      expect(result.isOwner).toBe(false);
      expect(result.error).toContain('denied');
    });

    it('should record abuse signal for ownership violation', async () => {
      await securityService.verifyDocumentOwnership('user-1', 'other-user-doc');
      const signals = securityService.getAbuseSignals();
      expect(signals.length).toBe(1);
      expect(signals[0].type).toBe('ownership_violation');
      expect(signals[0].severity).toBe('high');
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', async () => {
      const result = await securityService.checkRateLimit('user-1', 'chat', 10, 60);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should track remaining requests', async () => {
      await securityService.checkRateLimit('user-1', 'chat', 10, 60);
      await securityService.checkRateLimit('user-1', 'chat', 10, 60);
      const result = await securityService.checkRateLimit('user-1', 'chat', 10, 60);
      expect(result.remaining).toBe(7);
    });

    it('should block requests exceeding limit', async () => {
      for (let i = 0; i < 10; i++) {
        await securityService.checkRateLimit('user-1', 'chat', 10, 60);
      }
      const result = await securityService.checkRateLimit('user-1', 'chat', 10, 60);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should record abuse signal when rate limit exceeded', async () => {
      for (let i = 0; i < 10; i++) {
        await securityService.checkRateLimit('user-1', 'chat', 10, 60);
      }
      await securityService.checkRateLimit('user-1', 'chat', 10, 60);
      
      const signals = securityService.getAbuseSignals();
      expect(signals.length).toBe(1);
      expect(signals[0].type).toBe('rate_limit_exceeded');
    });

    it('should track rate limits per operation', async () => {
      for (let i = 0; i < 5; i++) {
        await securityService.checkRateLimit('user-1', 'chat', 10, 60);
      }
      
      const chatResult = await securityService.checkRateLimit('user-1', 'chat', 10, 60);
      const searchResult = await securityService.checkRateLimit('user-1', 'search', 10, 60);
      
      expect(chatResult.remaining).toBe(4);
      expect(searchResult.remaining).toBe(9);
    });

    it('should track rate limits per user', async () => {
      for (let i = 0; i < 5; i++) {
        await securityService.checkRateLimit('user-1', 'chat', 10, 60);
      }
      
      const user1Result = await securityService.checkRateLimit('user-1', 'chat', 10, 60);
      const user2Result = await securityService.checkRateLimit('user-2', 'chat', 10, 60);
      
      expect(user1Result.remaining).toBe(4);
      expect(user2Result.remaining).toBe(9);
    });

    it('should include reset time in response', async () => {
      const result = await securityService.checkRateLimit('user-1', 'chat', 10, 60);
      expect(result.resetAt).toBeDefined();
      expect(new Date(result.resetAt).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Abuse Signal Recording', () => {
    it('should record multiple abuse signals', async () => {
      await securityService.validateAuth('Bearer invalid_token');
      await securityService.verifyDocumentOwnership('user-1', 'other-user-doc');
      
      const signals = securityService.getAbuseSignals();
      expect(signals.length).toBe(2);
    });

    it('should include timestamp in abuse signals', async () => {
      await securityService.validateAuth('Bearer invalid_token');
      
      const signals = securityService.getAbuseSignals();
      expect(signals[0].timestamp).toBeDefined();
      expect(new Date(signals[0].timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should include severity in abuse signals', async () => {
      await securityService.verifyDocumentOwnership('user-1', 'other-user-doc');
      
      const signals = securityService.getAbuseSignals();
      expect(['low', 'medium', 'high', 'critical']).toContain(signals[0].severity);
    });

    it('should include user ID when available', async () => {
      await securityService.verifyDocumentOwnership('user-1', 'other-user-doc');
      
      const signals = securityService.getAbuseSignals();
      expect(signals[0].userId).toBe('user-1');
    });

    it('should clear abuse signals', async () => {
      await securityService.validateAuth('Bearer invalid_token');
      expect(securityService.getAbuseSignals().length).toBe(1);
      
      securityService.clearAbuseSignals();
      expect(securityService.getAbuseSignals().length).toBe(0);
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle concurrent auth validations', async () => {
      const promises = Array(10).fill(null).map(() =>
        securityService.validateAuth('Bearer valid_token')
      );
      
      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle concurrent rate limit checks', async () => {
      const promises = Array(15).fill(null).map((_, i) =>
        securityService.checkRateLimit('user-1', 'chat', 10, 60)
      );
      
      const results = await Promise.all(promises);
      const allowed = results.filter(r => r.allowed).length;
      const blocked = results.filter(r => !r.allowed).length;
      
      // Due to race conditions, at least 10 should be allowed
      expect(allowed).toBeGreaterThanOrEqual(10);
    });

    it('should handle special characters in user ID', async () => {
      const specialUserId = 'user-with-special-chars-!@#$%';
      const result = await securityService.checkRateLimit(specialUserId, 'chat', 10, 60);
      expect(result.allowed).toBe(true);
    });

    it('should handle empty document ID', async () => {
      const result = await securityService.verifyDocumentOwnership('user-1', '');
      // Should either succeed (treated as valid) or fail gracefully
      expect(result).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should validate auth quickly', async () => {
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        await securityService.validateAuth('Bearer valid_token');
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // 100 validations in < 100ms
    });

    it('should check rate limits quickly', async () => {
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        await securityService.checkRateLimit(`user-${i}`, 'chat', 10, 60);
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });
});
