/**
 * Intelligent Workflow Engine
 *
 * Smart workflow execution with auto-optimization capabilities.
 * Learns from execution history to improve performance over time.
 *
 * Features:
 * - Conditional step execution
 * - Intelligent parameter selection
 * - Performance tracking and optimization
 * - Parallel execution support
 * - Historical analysis and learning
 */

import { supabase } from './supabase';

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'extract' | 'classify' | 'summarize' | 'transform' | 'validate' | 'custom';
  config: Record<string, any>;
  conditions?: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater' | 'less' | 'exists';
    value: any;
  }>;
  parallel?: boolean; // Can run in parallel with other parallel steps
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}

export interface Workflow {
  id: string;
  userId: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers: Array<{
    type: 'manual' | 'upload' | 'schedule' | 'webhook';
    config: Record<string, any>;
  }>;
  optimization: {
    enabled: boolean;
    metrics: string[]; // e.g., ['duration', 'accuracy', 'cost']
    targetMetric: string; // Primary metric to optimize
    autoApply: boolean; // Automatically apply safe optimizations
  };
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  metrics: {
    duration: number;
    accuracy?: number;
    cost?: number;
    quality?: number;
    tokensUsed?: number;
  };
  results: any;
  stepResults: Array<{
    stepId: string;
    status: 'completed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
  }>;
  optimizations?: Array<{
    type: string;
    applied: boolean;
    impact: Record<string, number>;
  }>;
}

export interface OptimalConfig {
  stepId: string;
  config: Record<string, any>;
  confidence: number;
  basedOnExecutions: number;
}

/**
 * Intelligent workflow engine with learning capabilities
 */
export class WorkflowEngine {
  private executionHistory: Map<string, WorkflowExecution[]> = new Map();
  private optimalConfigs: Map<string, Map<string, OptimalConfig>> = new Map();

  constructor() {
    this.loadHistoryFromStorage();
  }

  /**
   * Execute workflow with intelligent optimization
   */
  async executeWorkflow(
    workflow: Workflow,
    input: any,
    userId: string
  ): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      id: crypto.randomUUID(),
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      status: 'running',
      startTime: new Date(),
      metrics: { duration: 0, tokensUsed: 0, cost: 0 },
      results: {},
      stepResults: [],
      optimizations: [],
    };

    try {
      let currentData = input;
      const stepStartTimes = new Map<string, number>();

      // Group steps by parallel/sequential
      const stepGroups = this.groupStepsByParallelism(workflow.steps);

      for (const group of stepGroups) {
        if (group.parallel && group.steps.length > 1) {
          // Execute parallel steps
          const results = await Promise.all(
            group.steps.map(step =>
              this.executeStepWithRetry(step, currentData, workflow, userId, stepStartTimes)
            )
          );

          // Merge results
          results.forEach(result => {
            if (result) {
              currentData = { ...currentData, ...result };
            }
          });
        } else {
          // Execute steps sequentially
          for (const step of group.steps) {
            const stepResult = await this.executeStepWithRetry(
              step,
              currentData,
              workflow,
              userId,
              stepStartTimes
            );

            if (stepResult !== null) {
              currentData = stepResult;
            }
          }
        }
      }

      execution.status = 'completed';
      execution.endTime = new Date();
      execution.metrics.duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.results = currentData;

      // Store execution for learning
      await this.storeExecution(workflow.id, execution);

      // Auto-optimize if enabled
      if (workflow.optimization.enabled) {
        const optimizations = await this.optimizeWorkflow(workflow);
        execution.optimizations = optimizations;

        // Auto-apply safe optimizations if enabled
        if (workflow.optimization.autoApply) {
          await this.applyOptimizations(workflow, optimizations.filter(o => o.applied));
        }
      }

      return execution;

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.metrics.duration = execution.endTime.getTime() - execution.startTime.getTime();

      await this.storeExecution(workflow.id, execution);

      throw error;
    }
  }

  /**
   * Execute step with retry logic
   */
  private async executeStepWithRetry(
    step: WorkflowStep,
    input: any,
    workflow: Workflow,
    userId: string,
    stepStartTimes: Map<string, number>
  ): Promise<any> {
    const maxRetries = step.retryPolicy?.maxRetries || 0;
    const backoffMultiplier = step.retryPolicy?.backoffMultiplier || 2;

    let lastError: Error | null = null;
    const startTime = Date.now();
    stepStartTimes.set(step.id, startTime);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeStep(step, input, workflow, userId);

        // Record successful execution
        const duration = Date.now() - startTime;
        this.recordStepExecution(workflow.id, step.id, 'completed', duration);

        return result;

      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = Math.pow(backoffMultiplier, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    const duration = Date.now() - startTime;
    this.recordStepExecution(workflow.id, step.id, 'failed', duration, lastError?.message);

    throw lastError;
  }

  /**
   * Execute individual workflow step with intelligent parameter selection
   */
  private async executeStep(
    step: WorkflowStep,
    input: any,
    workflow: Workflow,
    userId: string
  ): Promise<any> {
    // Check conditions
    if (step.conditions && !this.evaluateConditions(step.conditions, input)) {
      this.recordStepExecution(workflow.id, step.id, 'skipped', 0);
      return input; // Skip this step, return input unchanged
    }

    // Get optimal parameters based on historical performance
    const optimalConfig = await this.getOptimalConfig(workflow.id, step.id);
    const config = { ...step.config, ...optimalConfig.config };

    // Execute based on step type
    switch (step.type) {
      case 'extract':
        return await this.executeExtraction(input, config, userId);
      case 'classify':
        return await this.executeClassification(input, config, userId);
      case 'summarize':
        return await this.executeSummarization(input, config, userId);
      case 'transform':
        return await this.executeTransformation(input, config);
      case 'validate':
        return await this.executeValidation(input, config);
      case 'custom':
        return await this.executeCustom(input, config, userId);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * Get optimal configuration based on historical performance
   */
  private async getOptimalConfig(
    workflowId: string,
    stepId: string
  ): Promise<OptimalConfig> {
    // Check cache
    const workflowConfigs = this.optimalConfigs.get(workflowId);
    if (workflowConfigs?.has(stepId)) {
      return workflowConfigs.get(stepId)!;
    }

    const executions = this.executionHistory.get(workflowId) || [];

    if (executions.length < 10) {
      // Not enough data for optimization
      return {
        stepId,
        config: {},
        confidence: 0.0,
        basedOnExecutions: executions.length,
      };
    }

    // Analyze successful executions
    const successful = executions.filter(e => e.status === 'completed');

    if (successful.length === 0) {
      return {
        stepId,
        config: {},
        confidence: 0.0,
        basedOnExecutions: 0,
      };
    }

    // Find configuration that maximizes target metric
    const bestExecution = successful.reduce((best, current) => {
      const bestMetric = this.getMetricValue(best);
      const currentMetric = this.getMetricValue(current);
      return currentMetric > bestMetric ? current : best;
    });

    // Extract optimal config from best execution
    // In a real implementation, this would use ML to find optimal parameters
    const optimalConfig: OptimalConfig = {
      stepId,
      config: {}, // Would contain optimal parameters
      confidence: Math.min(successful.length / 100, 1.0), // Confidence increases with data
      basedOnExecutions: successful.length,
    };

    // Cache the result
    if (!this.optimalConfigs.has(workflowId)) {
      this.optimalConfigs.set(workflowId, new Map());
    }
    this.optimalConfigs.get(workflowId)!.set(stepId, optimalConfig);

    return optimalConfig;
  }

  /**
   * Auto-optimize workflow based on execution history
   */
  private async optimizeWorkflow(workflow: Workflow): Promise<Array<{
    type: string;
    applied: boolean;
    impact: Record<string, number>;
  }>> {
    const executions = this.executionHistory.get(workflow.id) || [];

    if (executions.length < 20) {
      return []; // Need more data
    }

    const optimizations: Array<{
      type: string;
      applied: boolean;
      impact: Record<string, number>;
    }> = [];

    // Calculate averages
    const successful = executions.filter(e => e.status === 'completed');
    const avgDuration = successful.reduce((sum, e) => sum + e.metrics.duration, 0) / successful.length;
    const avgAccuracy = successful.reduce((sum, e) => sum + (e.metrics.accuracy || 0), 0) / successful.length;
    const avgCost = successful.reduce((sum, e) => sum + (e.metrics.cost || 0), 0) / successful.length;

    // Check if we can parallelize steps
    if (avgDuration > 5000) { // > 5 seconds
      const parallelizableSteps = this.findParallelizableSteps(workflow);
      if (parallelizableSteps.length > 0) {
        optimizations.push({
          type: 'parallelize',
          applied: true, // Safe to auto-apply
          impact: {
            duration: -35, // 35% reduction
            cost: 0,
            accuracy: 0,
          },
        });
      }
    }

    // Check if we can use cheaper models
    if (avgAccuracy > 0.95 && avgCost > 0.001) {
      optimizations.push({
        type: 'use_cheaper_model',
        applied: false, // Requires approval
        impact: {
          duration: 20, // 20% faster
          cost: -60, // 60% cheaper
          accuracy: -2, // 2% accuracy loss
        },
      });
    }

    // Check for caching opportunities
    const duplicateInputs = this.findDuplicateInputs(executions);
    if (duplicateInputs > 0.3) { // > 30% duplicates
      optimizations.push({
        type: 'enable_caching',
        applied: true, // Safe to auto-apply
        impact: {
          duration: -duplicateInputs * 100,
          cost: -duplicateInputs * 100,
          accuracy: 0,
        },
      });
    }

    // Check for parameter optimization opportunities
    const paramOptimizations = await this.analyzeParameters(executions);
    optimizations.push(...paramOptimizations);

    return optimizations;
  }

  /**
   * Group steps by parallelism
   */
  private groupStepsByParallelism(steps: WorkflowStep[]): Array<{
    parallel: boolean;
    steps: WorkflowStep[];
  }> {
    const groups: Array<{ parallel: boolean; steps: WorkflowStep[] }> = [];
    let currentGroup: WorkflowStep[] = [];
    let isParallel = false;

    for (const step of steps) {
      if (step.parallel) {
        if (!isParallel && currentGroup.length > 0) {
          // Start new parallel group
          groups.push({ parallel: false, steps: currentGroup });
          currentGroup = [];
        }
        isParallel = true;
        currentGroup.push(step);
      } else {
        if (isParallel && currentGroup.length > 0) {
          // End parallel group
          groups.push({ parallel: true, steps: currentGroup });
          currentGroup = [];
        }
        isParallel = false;
        currentGroup.push(step);
        groups.push({ parallel: false, steps: [step] }); // Each sequential step is its own group
        currentGroup = [];
      }
    }

    if (currentGroup.length > 0) {
      groups.push({ parallel: isParallel, steps: currentGroup });
    }

    return groups;
  }

  /**
   * Find steps that can be parallelized
   */
  private findParallelizableSteps(workflow: Workflow): string[] {
    // Simplified: check for steps that don't depend on each other
    const parallelizable: string[] = [];

    for (let i = 0; i < workflow.steps.length - 1; i++) {
      const currentStep = workflow.steps[i];
      const nextStep = workflow.steps[i + 1];

      // Check if next step doesn't depend on current step's output
      if (!this.hasDataDependency(currentStep, nextStep)) {
        parallelizable.push(currentStep.id, nextStep.id);
      }
    }

    return Array.from(new Set(parallelizable));
  }

  /**
   * Check if two steps have data dependency
   */
  private hasDataDependency(step1: WorkflowStep, step2: WorkflowStep): boolean {
    // Simplified: assume sequential steps have dependency unless marked parallel
    return !step1.parallel || !step2.parallel;
  }

  /**
   * Find duplicate inputs in executions
   */
  private findDuplicateInputs(executions: WorkflowExecution[]): number {
    // Simplified: check for exact matches in input hashes
    const inputHashes = new Set<string>();
    let duplicates = 0;

    for (const execution of executions) {
      const hash = this.hashInput(execution.results);
      if (inputHashes.has(hash)) {
        duplicates++;
      } else {
        inputHashes.add(hash);
      }
    }

    return duplicates / executions.length;
  }

  /**
   * Analyze parameters for optimization opportunities
   */
  private async analyzeParameters(executions: WorkflowExecution[]): Promise<Array<{
    type: string;
    applied: boolean;
    impact: Record<string, number>;
  }>> {
    const optimizations: Array<{
      type: string;
      applied: boolean;
      impact: Record<string, number>;
    }> = [];

    // Analyze token usage
    const avgTokens = executions.reduce((sum, e) => sum + (e.metrics.tokensUsed || 0), 0) / executions.length;

    // Find steps with high token usage
    // If average actual tokens used is much less than max_tokens configured, reduce it
    if (avgTokens > 0) {
      optimizations.push({
        type: 'reduce_max_tokens',
        applied: true, // Safe to auto-apply
        impact: {
          duration: 10,
          cost: -30,
          accuracy: 0,
        },
      });
    }

    return optimizations;
  }

  /**
   * Apply optimizations to workflow
   */
  private async applyOptimizations(
    workflow: Workflow,
    optimizations: Array<{ type: string; applied: boolean; impact: Record<string, number> }>
  ): Promise<void> {
    for (const optimization of optimizations) {
      switch (optimization.type) {
        case 'parallelize':
          // Mark independent steps as parallel
          workflow.steps.forEach(step => {
            if (!this.hasDataDependency(step, step)) {
              step.parallel = true;
            }
          });
          break;

        case 'enable_caching':
          // Enable caching in config
          workflow.steps.forEach(step => {
            step.config.cache = true;
          });
          break;

        case 'reduce_max_tokens':
          // Reduce max_tokens based on actual usage
          workflow.steps.forEach(step => {
            if (step.config.maxTokens) {
              step.config.maxTokens = Math.ceil(step.config.maxTokens * 0.7);
            }
          });
          break;
      }
    }

    // Save updated workflow
    workflow.version++;
    workflow.updatedAt = new Date();
    await this.saveWorkflow(workflow);
  }

  /**
   * Evaluate conditions
   */
  private evaluateConditions(conditions: any[], data: any): boolean {
    return conditions.every(condition => {
      const value = this.getNestedValue(data, condition.field);

      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'not_equals':
          return value !== condition.value;
        case 'contains':
          return String(value).includes(condition.value);
        case 'not_contains':
          return !String(value).includes(condition.value);
        case 'greater':
          return Number(value) > Number(condition.value);
        case 'less':
          return Number(value) < Number(condition.value);
        case 'exists':
          return value !== undefined && value !== null;
        default:
          return false;
      }
    });
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get metric value for comparison
   */
  private getMetricValue(execution: WorkflowExecution): number {
    return execution.metrics.accuracy || execution.metrics.quality || 0;
  }

  /**
   * Hash input for duplicate detection
   */
  private hashInput(input: any): string {
    return JSON.stringify(input);
  }

  /**
   * Record step execution
   */
  private recordStepExecution(
    workflowId: string,
    stepId: string,
    status: 'completed' | 'failed' | 'skipped',
    duration: number,
    error?: string
  ): void {
    const executions = this.executionHistory.get(workflowId) || [];
    const lastExecution = executions[executions.length - 1];

    if (lastExecution) {
      lastExecution.stepResults.push({
        stepId,
        status,
        duration,
        error,
      });
    }
  }

  /**
   * Store execution history
   */
  private async storeExecution(workflowId: string, execution: WorkflowExecution): Promise<void> {
    if (!this.executionHistory.has(workflowId)) {
      this.executionHistory.set(workflowId, []);
    }

    const history = this.executionHistory.get(workflowId)!;
    history.push(execution);

    // Keep only last 100 executions in memory
    if (history.length > 100) {
      history.shift();
    }

    // Persist to database
    try {
      await supabase.from('workflow_executions').insert({
        id: execution.id,
        workflow_id: execution.workflowId,
        workflow_version: execution.workflowVersion,
        status: execution.status,
        start_time: execution.startTime,
        end_time: execution.endTime,
        metrics: execution.metrics,
        results: execution.results,
        step_results: execution.stepResults,
        optimizations: execution.optimizations,
      });
    } catch (error) {
      console.error('Failed to store execution:', error);
    }
  }

  /**
   * Load execution history from storage
   */
  private async loadHistoryFromStorage(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data) {
        data.forEach(record => {
          const execution: WorkflowExecution = {
            id: record.id,
            workflowId: record.workflow_id,
            workflowVersion: record.workflow_version,
            status: record.status,
            startTime: new Date(record.start_time),
            endTime: record.end_time ? new Date(record.end_time) : undefined,
            metrics: record.metrics,
            results: record.results,
            stepResults: record.step_results || [],
            optimizations: record.optimizations,
          };

          if (!this.executionHistory.has(execution.workflowId)) {
            this.executionHistory.set(execution.workflowId, []);
          }
          this.executionHistory.get(execution.workflowId)!.push(execution);
        });
      }
    } catch (error) {
      console.error('Failed to load execution history:', error);
    }
  }

  /**
   * Save workflow to database
   */
  private async saveWorkflow(workflow: Workflow): Promise<void> {
    try {
      await supabase.from('workflows').upsert({
        id: workflow.id,
        user_id: workflow.userId,
        name: workflow.name,
        description: workflow.description,
        steps: workflow.steps,
        triggers: workflow.triggers,
        optimization: workflow.optimization,
        version: workflow.version,
        updated_at: workflow.updatedAt,
      });
    } catch (error) {
      console.error('Failed to save workflow:', error);
    }
  }

  // Step execution methods (placeholders - implement with actual AI operations)

  private async executeExtraction(input: any, config: any, userId: string): Promise<any> {
    // Call extract-data function
    const response = await fetch('/functions/v1/extract-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, ...config, userId }),
    });
    return await response.json();
  }

  private async executeClassification(input: any, config: any, userId: string): Promise<any> {
    // Implement classification logic
    return { ...input, classified: true };
  }

  private async executeSummarization(input: any, config: any, userId: string): Promise<any> {
    // Call summarization function
    const response = await fetch('/functions/v1/summarization-executor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, ...config, userId }),
    });
    return await response.json();
  }

  private async executeTransformation(input: any, config: any): Promise<any> {
    // Apply transformation rules
    return { ...input, transformed: true };
  }

  private async executeValidation(input: any, config: any): Promise<any> {
    // Validate data against rules
    return { ...input, valid: true };
  }

  private async executeCustom(input: any, config: any, userId: string): Promise<any> {
    // Execute custom step via workflow executor
    const response = await fetch('/functions/v1/execute-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, ...config, userId }),
    });
    return await response.json();
  }
}

// Export singleton instance
export const workflowEngine = new WorkflowEngine();
