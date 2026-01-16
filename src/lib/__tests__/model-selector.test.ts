import { describe, it, expect, beforeEach } from 'vitest';
import {
  selectModel,
  selectModelByTier,
  estimateCost,
  getOperationsForModel,
  selectBatchModel,
  getCachedModelConfig,
  clearModelCache,
  AVAILABLE_MODELS,
  type AIOperation,
} from '../model-selector';

describe('Model Selector', () => {
  beforeEach(() => {
    clearModelCache();
  });

  describe('selectModel', () => {
    it('should return a model config for valid operations', () => {
      const operations: AIOperation[] = [
        'suggested_questions',
        'simple_extraction',
        'classification',
        'summarization',
        'report_generation',
        'chat_response',
        'embeddings',
      ];

      operations.forEach((op) => {
        const config = selectModel(op);
        expect(config).toBeDefined();
        expect(config.model).toBeDefined();
        expect(config.maxTokens).toBeGreaterThan(0);
      });
    });

    it('should throw for unknown operations', () => {
      expect(() => selectModel('unknown_operation' as AIOperation)).toThrow();
    });

    it('should use economy models for simple tasks', () => {
      const config = selectModel('suggested_questions');
      expect(config.model).toMatch(/mini|3\.5/);
    });

    it('should use premium models for complex tasks', () => {
      const config = selectModel('report_generation');
      expect(config.model).toMatch(/gpt-4|claude/);
    });

    it('should use embedding model for embeddings', () => {
      const config = selectModel('embeddings');
      expect(config.model).toContain('embedding');
    });

    it('should apply temperature overrides', () => {
      const classificationConfig = selectModel('classification');
      expect(classificationConfig.temperature).toBeLessThan(0.5);

      const creativeConfig = selectModel('suggested_questions');
      expect(creativeConfig.temperature).toBeGreaterThan(0.5);
    });

    it('should apply maxTokens overrides', () => {
      const classificationConfig = selectModel('classification');
      expect(classificationConfig.maxTokens).toBe(200);

      const reportConfig = selectModel('report_generation');
      expect(reportConfig.maxTokens).toBe(4000);
    });
  });

  describe('selectModelByTier', () => {
    it('should return economy tier models', () => {
      const config = selectModelByTier('chat_response', 'economy');
      expect(config.costPer1MInputTokens).toBeLessThan(1);
    });

    it('should return standard tier models', () => {
      const config = selectModelByTier('chat_response', 'standard');
      expect(config).toBeDefined();
    });

    it('should return premium tier models', () => {
      const config = selectModelByTier('report_generation', 'premium');
      expect(config.model).toMatch(/gpt-4|claude/);
    });

    it('should fallback to default when tier model unavailable', () => {
      const config = selectModelByTier('embeddings', 'premium');
      expect(config.model).toContain('embedding');
    });
  });

  describe('estimateCost', () => {
    it('should calculate cost correctly', () => {
      const estimate = estimateCost('chat_response', 1000, 500);
      
      expect(estimate.model).toBeDefined();
      expect(estimate.inputCost).toBeGreaterThanOrEqual(0);
      expect(estimate.outputCost).toBeGreaterThanOrEqual(0);
      expect(estimate.totalCost).toBe(estimate.inputCost + estimate.outputCost);
      expect(estimate.currency).toBe('USD');
    });

    it('should return higher costs for premium operations', () => {
      const simpleEstimate = estimateCost('suggested_questions', 1000, 500);
      const complexEstimate = estimateCost('report_generation', 1000, 500);
      
      expect(complexEstimate.totalCost).toBeGreaterThan(simpleEstimate.totalCost);
    });

    it('should return zero output cost for embeddings', () => {
      const estimate = estimateCost('embeddings', 1000, 0);
      expect(estimate.outputCost).toBe(0);
    });

    it('should scale with token count', () => {
      const smallEstimate = estimateCost('chat_response', 100, 50);
      const largeEstimate = estimateCost('chat_response', 1000, 500);
      
      expect(largeEstimate.totalCost).toBeGreaterThan(smallEstimate.totalCost);
    });
  });

  describe('getOperationsForModel', () => {
    it('should return operations for GPT-4o', () => {
      const operations = getOperationsForModel('gpt-4o');
      expect(operations).toContain('report_generation');
      expect(operations).toContain('complex_reasoning');
    });

    it('should return operations for GPT-3.5-turbo', () => {
      const operations = getOperationsForModel('gpt-3.5-turbo');
      expect(operations).toContain('chat_response');
      expect(operations).toContain('summarization');
    });

    it('should return limited operations for embedding models', () => {
      const operations = getOperationsForModel('text-embedding-3-small');
      expect(operations).toContain('embeddings');
      expect(operations).not.toContain('chat_response');
    });

    it('should return empty array for unknown model', () => {
      const operations = getOperationsForModel('unknown-model');
      expect(operations).toHaveLength(0);
    });
  });

  describe('selectBatchModel', () => {
    it('should prefer economy for large batches', () => {
      const config = selectBatchModel('simple_extraction', 500, 200);
      expect(config.model).toMatch(/mini|3\.5/);
    });

    it('should include estimated total cost', () => {
      const config = selectBatchModel('summarization', 100, 500);
      expect(config.estimatedTotalCost).toBeGreaterThan(0);
    });

    it('should scale cost with item count', () => {
      const smallBatch = selectBatchModel('chat_response', 10, 100);
      const largeBatch = selectBatchModel('chat_response', 100, 100);
      
      expect(largeBatch.estimatedTotalCost).toBeGreaterThan(smallBatch.estimatedTotalCost);
    });
  });

  describe('getCachedModelConfig', () => {
    it('should return cached config on subsequent calls', () => {
      const config1 = getCachedModelConfig('chat_response');
      const config2 = getCachedModelConfig('chat_response');
      
      expect(config1).toEqual(config2);
    });

    it('should return different configs for different operations', () => {
      const chatConfig = getCachedModelConfig('chat_response');
      const reportConfig = getCachedModelConfig('report_generation');
      
      expect(chatConfig.model).not.toBe(reportConfig.model);
    });
  });

  describe('clearModelCache', () => {
    it('should clear the cache', () => {
      getCachedModelConfig('chat_response');
      clearModelCache();
      // No direct way to test cache is cleared, but function should not throw
      expect(() => getCachedModelConfig('chat_response')).not.toThrow();
    });
  });

  describe('AVAILABLE_MODELS', () => {
    it('should have required properties for all models', () => {
      Object.values(AVAILABLE_MODELS).forEach((model) => {
        expect(model.model).toBeDefined();
        expect(model.maxTokens).toBeGreaterThan(0);
        expect(model.temperature).toBeGreaterThanOrEqual(0);
        expect(model.costPer1MInputTokens).toBeGreaterThanOrEqual(0);
        expect(model.costPer1MOutputTokens).toBeGreaterThanOrEqual(0);
        expect(model.contextWindow).toBeGreaterThan(0);
        expect(model.capabilities).toBeInstanceOf(Array);
      });
    });

    it('should include both OpenAI and embedding models', () => {
      const modelNames = Object.keys(AVAILABLE_MODELS);
      expect(modelNames.some((name) => name.includes('gpt'))).toBe(true);
      expect(modelNames.some((name) => name.includes('embedding'))).toBe(true);
    });
  });
});
