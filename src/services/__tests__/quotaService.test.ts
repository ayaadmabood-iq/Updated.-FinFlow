import { describe, it, expect, vi, beforeEach } from 'vitest';
import { quotaService, type QuotaInfo } from '../quotaService';

describe('QuotaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isQuotaExceeded', () => {
    it('should return false for unlimited quota', () => {
      const quota: QuotaInfo = { current: 1000, limit: null };
      expect(quotaService.isQuotaExceeded(quota)).toBe(false);
    });

    it('should return false when under limit', () => {
      const quota: QuotaInfo = { current: 5, limit: 10 };
      expect(quotaService.isQuotaExceeded(quota)).toBe(false);
    });

    it('should return true when at limit', () => {
      const quota: QuotaInfo = { current: 10, limit: 10 };
      expect(quotaService.isQuotaExceeded(quota)).toBe(true);
    });

    it('should return true when over limit', () => {
      const quota: QuotaInfo = { current: 15, limit: 10 };
      expect(quotaService.isQuotaExceeded(quota)).toBe(true);
    });
  });

  describe('isNearLimit', () => {
    it('should return false for unlimited quota', () => {
      const quota: QuotaInfo = { current: 1000, limit: null };
      expect(quotaService.isNearLimit(quota)).toBe(false);
    });

    it('should return false when under 80%', () => {
      const quota: QuotaInfo = { current: 7, limit: 10 };
      expect(quotaService.isNearLimit(quota)).toBe(false);
    });

    it('should return true when at 80%', () => {
      const quota: QuotaInfo = { current: 8, limit: 10 };
      expect(quotaService.isNearLimit(quota)).toBe(true);
    });

    it('should return true when between 80% and 100%', () => {
      const quota: QuotaInfo = { current: 9, limit: 10 };
      expect(quotaService.isNearLimit(quota)).toBe(true);
    });

    it('should return false when at or over limit', () => {
      const quota: QuotaInfo = { current: 10, limit: 10 };
      expect(quotaService.isNearLimit(quota)).toBe(false);
    });
  });

  describe('getPercentageUsed', () => {
    it('should return 0 for unlimited quota', () => {
      const quota: QuotaInfo = { current: 1000, limit: null };
      expect(quotaService.getPercentageUsed(quota)).toBe(0);
    });

    it('should return 100 when limit is 0', () => {
      const quota: QuotaInfo = { current: 0, limit: 0 };
      expect(quotaService.getPercentageUsed(quota)).toBe(100);
    });

    it('should calculate correct percentage', () => {
      const quota: QuotaInfo = { current: 5, limit: 10 };
      expect(quotaService.getPercentageUsed(quota)).toBe(50);
    });

    it('should cap at 100%', () => {
      const quota: QuotaInfo = { current: 15, limit: 10 };
      expect(quotaService.getPercentageUsed(quota)).toBe(100);
    });

    it('should round to nearest integer', () => {
      const quota: QuotaInfo = { current: 1, limit: 3 };
      expect(quotaService.getPercentageUsed(quota)).toBe(33);
    });
  });

  describe('formatBytes', () => {
    it('should format 0 bytes', () => {
      expect(quotaService.formatBytes(0)).toBe('0 B');
    });

    it('should format bytes', () => {
      expect(quotaService.formatBytes(512)).toBe('512 B');
    });

    it('should format kilobytes', () => {
      expect(quotaService.formatBytes(1024)).toBe('1 KB');
      expect(quotaService.formatBytes(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(quotaService.formatBytes(1048576)).toBe('1 MB');
      expect(quotaService.formatBytes(5242880)).toBe('5 MB');
    });

    it('should format gigabytes', () => {
      expect(quotaService.formatBytes(1073741824)).toBe('1 GB');
    });
  });

  describe('getTierDisplayName', () => {
    it('should return correct display names', () => {
      expect(quotaService.getTierDisplayName('free')).toBe('Free');
      expect(quotaService.getTierDisplayName('starter')).toBe('Starter');
      expect(quotaService.getTierDisplayName('pro')).toBe('Pro');
      expect(quotaService.getTierDisplayName('enterprise')).toBe('Enterprise');
    });
  });
});
