// ============= Stage Scaling Configuration =============
// Defines per-stage scaling rules, resource profiles, and backpressure controls
// Each stage scales independently based on its characteristics

// ============= Types =============

export type StageType = 'ingestion' | 'extraction' | 'language' | 'chunking' | 'summarization' | 'indexing';
export type ResourceProfile = 'cpu-bound' | 'io-bound' | 'api-bound' | 'memory-bound';

export interface StageScalingConfig {
  stage: StageType;
  resourceProfile: ResourceProfile;
  // Concurrency limits
  minWorkers: number;
  maxWorkers: number;
  targetConcurrency: number;
  // Backpressure thresholds
  maxQueueDepth: number;
  backpressureThreshold: number; // Start slowing down at this depth
  pauseThreshold: number; // Stop accepting new jobs at this depth
  // Performance targets
  targetLatencyMs: number;
  maxLatencyMs: number;
  // Cost controls
  maxCostPerExecution: number; // USD
  dailyCostLimit: number; // USD per day
  // Retry behavior
  maxRetries: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
}

export interface BackpressureState {
  stage: StageType;
  currentDepth: number;
  status: 'normal' | 'slowing' | 'paused';
  acceptingJobs: boolean;
  throttlePercent: number; // 0-100, higher = more throttling
  lastUpdated: string;
}

export interface SystemLimits {
  // Hard limits to prevent runaway costs
  maxTotalQueueDepth: number;
  maxConcurrentDocuments: number;
  maxDailyDocuments: number;
  maxDailyCostUsd: number;
  // Database protection
  maxDbConnectionsPerStage: number;
  maxDbQueriesPerSecond: number;
  // Cache limits
  maxCacheEntries: number;
  maxCacheMemoryMb: number;
  // Growth safety valves
  scaleUpCooldownMs: number;
  scaleDownCooldownMs: number;
}

// ============= Stage Configuration =============

export const STAGE_CONFIGS: Record<StageType, StageScalingConfig> = {
  ingestion: {
    stage: 'ingestion',
    resourceProfile: 'io-bound',
    minWorkers: 1,
    maxWorkers: 10,
    targetConcurrency: 5,
    maxQueueDepth: 200,
    backpressureThreshold: 100,
    pauseThreshold: 180,
    targetLatencyMs: 2000,
    maxLatencyMs: 10000,
    maxCostPerExecution: 0.001,
    dailyCostLimit: 10,
    maxRetries: 3,
    baseBackoffMs: 1000,
    maxBackoffMs: 60000,
  },
  extraction: {
    stage: 'extraction',
    resourceProfile: 'cpu-bound',
    minWorkers: 1,
    maxWorkers: 5,
    targetConcurrency: 3,
    maxQueueDepth: 100,
    backpressureThreshold: 50,
    pauseThreshold: 90,
    targetLatencyMs: 5000,
    maxLatencyMs: 30000,
    maxCostPerExecution: 0.01,
    dailyCostLimit: 50,
    maxRetries: 3,
    baseBackoffMs: 2000,
    maxBackoffMs: 120000,
  },
  language: {
    stage: 'language',
    resourceProfile: 'api-bound',
    minWorkers: 1,
    maxWorkers: 20, // Can scale high since it's quick API calls
    targetConcurrency: 10,
    maxQueueDepth: 500,
    backpressureThreshold: 250,
    pauseThreshold: 450,
    targetLatencyMs: 500,
    maxLatencyMs: 2000,
    maxCostPerExecution: 0.001,
    dailyCostLimit: 5,
    maxRetries: 5,
    baseBackoffMs: 500,
    maxBackoffMs: 30000,
  },
  chunking: {
    stage: 'chunking',
    resourceProfile: 'memory-bound',
    minWorkers: 1,
    maxWorkers: 5,
    targetConcurrency: 3,
    maxQueueDepth: 100,
    backpressureThreshold: 50,
    pauseThreshold: 90,
    targetLatencyMs: 3000,
    maxLatencyMs: 15000,
    maxCostPerExecution: 0.005,
    dailyCostLimit: 20,
    maxRetries: 3,
    baseBackoffMs: 1000,
    maxBackoffMs: 60000,
  },
  summarization: {
    stage: 'summarization',
    resourceProfile: 'api-bound',
    minWorkers: 1,
    maxWorkers: 8,
    targetConcurrency: 4,
    maxQueueDepth: 50, // Lower - expensive stage
    backpressureThreshold: 25,
    pauseThreshold: 45,
    targetLatencyMs: 10000,
    maxLatencyMs: 60000,
    maxCostPerExecution: 0.05, // Higher - LLM calls
    dailyCostLimit: 100,
    maxRetries: 2,
    baseBackoffMs: 5000,
    maxBackoffMs: 300000,
  },
  indexing: {
    stage: 'indexing',
    resourceProfile: 'io-bound',
    minWorkers: 1,
    maxWorkers: 10,
    targetConcurrency: 5,
    maxQueueDepth: 200,
    backpressureThreshold: 100,
    pauseThreshold: 180,
    targetLatencyMs: 2000,
    maxLatencyMs: 10000,
    maxCostPerExecution: 0.01,
    dailyCostLimit: 30,
    maxRetries: 3,
    baseBackoffMs: 1000,
    maxBackoffMs: 60000,
  },
};

// ============= System Limits =============

export const SYSTEM_LIMITS: SystemLimits = {
  maxTotalQueueDepth: 1000,
  maxConcurrentDocuments: 100,
  maxDailyDocuments: 10000,
  maxDailyCostUsd: 500,
  maxDbConnectionsPerStage: 10,
  maxDbQueriesPerSecond: 100,
  maxCacheEntries: 100000,
  maxCacheMemoryMb: 1024,
  scaleUpCooldownMs: 60000, // 1 minute
  scaleDownCooldownMs: 300000, // 5 minutes
};

// ============= Growth Scenario Thresholds =============

export interface GrowthScenario {
  name: string;
  multiplier: number;
  expectedCostMultiplier: number;
  requiredChanges: string[];
  bottlenecks: string[];
  acceptable: boolean;
}

export const GROWTH_SCENARIOS: GrowthScenario[] = [
  {
    name: '2x Traffic',
    multiplier: 2,
    expectedCostMultiplier: 2.1, // Slight overhead
    requiredChanges: [
      'Increase summarization workers to 8',
      'Add extraction worker capacity',
    ],
    bottlenecks: ['summarization queue depth'],
    acceptable: true,
  },
  {
    name: '5x Traffic',
    multiplier: 5,
    expectedCostMultiplier: 5.5,
    requiredChanges: [
      'Scale all stages to max workers',
      'Consider read replica for DB',
      'Increase Redis memory',
    ],
    bottlenecks: [
      'Database connection pool',
      'Summarization API rate limits',
    ],
    acceptable: true,
  },
  {
    name: '10x Traffic',
    multiplier: 10,
    expectedCostMultiplier: 12, // Non-linear costs emerge
    requiredChanges: [
      'Database read replica required',
      'Redis cluster mode',
      'Consider dedicated embedding service',
      'Review summarization batching',
    ],
    bottlenecks: [
      'Database write throughput',
      'Embedding generation rate',
      'Cost per document increases',
    ],
    acceptable: true, // But with caveats
  },
];

// ============= Backpressure Calculator =============

export function calculateBackpressure(
  stage: StageType,
  currentQueueDepth: number
): BackpressureState {
  const config = STAGE_CONFIGS[stage];
  
  let status: BackpressureState['status'] = 'normal';
  let throttlePercent = 0;
  let acceptingJobs = true;

  if (currentQueueDepth >= config.pauseThreshold) {
    status = 'paused';
    throttlePercent = 100;
    acceptingJobs = false;
  } else if (currentQueueDepth >= config.backpressureThreshold) {
    status = 'slowing';
    // Linear throttle between threshold and pause
    const range = config.pauseThreshold - config.backpressureThreshold;
    const position = currentQueueDepth - config.backpressureThreshold;
    throttlePercent = Math.min(90, Math.floor((position / range) * 90));
    acceptingJobs = true;
  }

  return {
    stage,
    currentDepth: currentQueueDepth,
    status,
    acceptingJobs,
    throttlePercent,
    lastUpdated: new Date().toISOString(),
  };
}

// ============= Cost Estimation =============

export interface CostEstimate {
  stage: StageType;
  estimatedCostUsd: number;
  withinBudget: boolean;
  remainingDailyBudget: number;
}

export function estimateStageCost(
  stage: StageType,
  inputSizeBytes: number,
  currentDailySpend: number
): CostEstimate {
  const config = STAGE_CONFIGS[stage];
  
  // Base cost plus variable based on input size
  let estimatedCost = config.maxCostPerExecution * 0.5; // Base
  
  // Add variable cost based on input size (rough approximation)
  const sizeMb = inputSizeBytes / (1024 * 1024);
  
  switch (stage) {
    case 'extraction':
      estimatedCost += sizeMb * 0.001; // Larger docs cost more to extract
      break;
    case 'summarization':
      estimatedCost += sizeMb * 0.01; // LLM token costs scale with content
      break;
    case 'indexing':
      estimatedCost += sizeMb * 0.002; // Vector storage scales with size
      break;
    default:
      estimatedCost += sizeMb * 0.0005;
  }

  const remainingBudget = config.dailyCostLimit - currentDailySpend;

  return {
    stage,
    estimatedCostUsd: Math.min(estimatedCost, config.maxCostPerExecution),
    withinBudget: estimatedCost <= remainingBudget,
    remainingDailyBudget: Math.max(0, remainingBudget),
  };
}

// ============= Scaling Decision Engine =============

export interface ScalingDecision {
  stage: StageType;
  action: 'scale_up' | 'scale_down' | 'maintain';
  currentWorkers: number;
  targetWorkers: number;
  reason: string;
}

export function calculateScalingDecision(
  stage: StageType,
  currentWorkers: number,
  queueDepth: number,
  avgLatencyMs: number,
  errorRate: number
): ScalingDecision {
  const config = STAGE_CONFIGS[stage];
  
  // Default: maintain
  let action: ScalingDecision['action'] = 'maintain';
  let targetWorkers = currentWorkers;
  let reason = 'Metrics within acceptable range';

  // Scale UP conditions
  if (queueDepth > config.backpressureThreshold && currentWorkers < config.maxWorkers) {
    action = 'scale_up';
    targetWorkers = Math.min(currentWorkers + 1, config.maxWorkers);
    reason = `Queue depth (${queueDepth}) exceeds threshold (${config.backpressureThreshold})`;
  } else if (avgLatencyMs > config.targetLatencyMs * 1.5 && currentWorkers < config.maxWorkers) {
    action = 'scale_up';
    targetWorkers = Math.min(currentWorkers + 1, config.maxWorkers);
    reason = `Latency (${avgLatencyMs}ms) exceeds target (${config.targetLatencyMs}ms)`;
  }

  // Scale DOWN conditions (only if stable)
  if (queueDepth < config.backpressureThreshold * 0.2 && 
      avgLatencyMs < config.targetLatencyMs * 0.5 &&
      errorRate < 0.01 &&
      currentWorkers > config.minWorkers) {
    action = 'scale_down';
    targetWorkers = Math.max(currentWorkers - 1, config.minWorkers);
    reason = 'Low load and latency, reducing capacity';
  }

  // Override: never scale up if error rate is high
  if (errorRate > 0.1 && action === 'scale_up') {
    action = 'maintain';
    targetWorkers = currentWorkers;
    reason = 'High error rate - fix errors before scaling';
  }

  return {
    stage,
    action,
    currentWorkers,
    targetWorkers,
    reason,
  };
}

// ============= Maintenance Rules =============

export interface MaintenanceRule {
  id: string;
  category: 'database' | 'cache' | 'queue' | 'pipeline';
  rule: string;
  limit: number | string;
  current?: number | string;
  compliant?: boolean;
}

export const MAINTENANCE_RULES: MaintenanceRule[] = [
  {
    id: 'db-triggers',
    category: 'database',
    rule: 'Maximum database triggers',
    limit: 20,
  },
  {
    id: 'db-functions',
    category: 'database',
    rule: 'Maximum database functions',
    limit: 50,
  },
  {
    id: 'rls-policies',
    category: 'database',
    rule: 'Maximum RLS policies',
    limit: 100,
  },
  {
    id: 'cache-key-patterns',
    category: 'cache',
    rule: 'Maximum distinct cache key patterns',
    limit: 20,
  },
  {
    id: 'cache-ttl-max',
    category: 'cache',
    rule: 'Maximum cache TTL (hours)',
    limit: 24,
  },
  {
    id: 'queue-job-types',
    category: 'queue',
    rule: 'Maximum distinct job types',
    limit: 15,
  },
  {
    id: 'pipeline-stages',
    category: 'pipeline',
    rule: 'Maximum pipeline stages',
    limit: 10,
  },
  {
    id: 'background-jobs',
    category: 'queue',
    rule: 'Maximum concurrent background job types',
    limit: 5,
  },
];
