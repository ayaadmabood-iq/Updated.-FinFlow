import { supabase } from '@/integrations/supabase/client';

export interface AdminStats {
  totalUsers: number;
  totalDocuments: number;
  totalStorageBytes: number;
  totalProcessingCount: number;
  usersByTier: Record<string, number>;
  usersByRole: Record<string, number>;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'super_admin';
  subscriptionTier: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'suspended';
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  usage?: {
    documentsCount: number;
    processingCount: number;
    storageBytes: number;
    resetDate: string;
  };
}

export interface AdminUsersResponse {
  data: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GetUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
  tier?: string;
  status?: string;
}

export interface UpdateUserInput {
  userId: string;
  role?: 'user' | 'admin' | 'super_admin';
  subscriptionTier?: 'free' | 'starter' | 'pro' | 'enterprise';
  status?: 'active' | 'suspended';
}

export interface ProcessingStageMetrics {
  stage: string;
  avgDurationMs: number;
  totalExecutions: number;
  successRate: number;
  errorCount: number;
}

export interface FileTypeMetrics {
  mimeType: string;
  totalCount: number;
  errorCount: number;
  errorRate: number;
  avgProcessingTime: number;
}

export interface ActiveUserMetrics {
  userId: string;
  userName: string;
  email: string;
  documentsCount: number;
  processingCount: number;
  lastActivity: string;
}

export interface ActiveProjectMetrics {
  projectId: string;
  projectName: string;
  ownerName: string;
  documentCount: number;
  lastUpdated: string;
}

export interface ProcessingTrend {
  date: string;
  processed: number;
  errors: number;
}

export interface CostMetrics {
  daily: Array<{ date: string; totalCost: number; totalTokens: number; documentsProcessed: number }>;
  monthly: { totalCost: number; totalTokens: number; avgCostPerDocument: number };
  byStage: Array<{ stage: string; totalCost: number; avgCost: number; totalTokens: number }>;
}

export interface PipelineHealthMetrics {
  stages: Array<{
    stage: string;
    totalLast24h: number;
    successful: number;
    failed: number;
    failureRatePercent: number;
    avgDurationMs: number;
  }>;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  unhealthyStages: string[];
}

export interface ExpensiveDocument {
  documentId: string;
  documentName: string;
  projectName: string;
  processingCostUsd: number;
  totalTokensUsed: number;
  createdAt: string;
}

export interface AdminMetrics {
  overview: {
    totalProcessed: number;
    totalErrors: number;
    overallSuccessRate: number;
    avgProcessingTimeMs: number;
    totalAiSpendUsd?: number;
    totalTokensUsed?: number;
  };
  processingStageMetrics: ProcessingStageMetrics[];
  fileTypeMetrics: FileTypeMetrics[];
  mostActiveUsers: ActiveUserMetrics[];
  mostActiveProjects: ActiveProjectMetrics[];
  auditByAction: Record<string, number>;
  processingTrends: ProcessingTrend[];
  costMetrics?: CostMetrics;
  pipelineHealth?: PipelineHealthMetrics;
  expensiveDocuments?: ExpensiveDocument[];
}

class AdminService {
  async getStats(): Promise<AdminStats> {
    const { data, error } = await supabase.functions.invoke('admin-stats', {
      method: 'GET',
    });

    if (error) {
      console.error('Failed to fetch admin stats:', error);
      throw new Error('Failed to fetch admin stats');
    }

    return data;
  }

  async getMetrics(): Promise<AdminMetrics> {
    const { data, error } = await supabase.functions.invoke('admin-metrics', {
      method: 'GET',
    });

    if (error) {
      console.error('Failed to fetch admin metrics:', error);
      throw new Error('Failed to fetch admin metrics');
    }

    return data;
  }

  async getUsers(params: GetUsersParams = {}): Promise<AdminUsersResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());
    if (params.search) queryParams.set('search', params.search);
    if (params.role) queryParams.set('role', params.role);
    if (params.tier) queryParams.set('tier', params.tier);
    if (params.status) queryParams.set('status', params.status);

    const { data, error } = await supabase.functions.invoke('admin-users', {
      method: 'GET',
      body: null,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (error) {
      console.error('Failed to fetch users:', error);
      throw new Error('Failed to fetch users');
    }

    return data;
  }

  async updateUser(input: UpdateUserInput): Promise<AdminUser> {
    const { data, error } = await supabase.functions.invoke('admin-users', {
      method: 'PATCH',
      body: input,
    });

    if (error) {
      console.error('Failed to update user:', error);
      throw new Error('Failed to update user');
    }

    return data;
  }
}

export const adminService = new AdminService();
