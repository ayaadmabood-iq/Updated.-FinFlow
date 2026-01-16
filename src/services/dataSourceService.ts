import { supabase } from '@/integrations/supabase/client';

export interface DataSource {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  source_type: 'file' | 'url' | 'text';
  original_url?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  raw_content?: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateDataSourceInput {
  project_id: string;
  source_type: 'file' | 'url' | 'text';
  name: string;
  url?: string;
  raw_content?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
}

class DataSourceService {
  async getByProject(projectId: string): Promise<DataSource[]> {
    const { data, error } = await supabase
      .from('data_sources')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as DataSource[];
  }

  async create(input: CreateDataSourceInput): Promise<DataSource> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const response = await supabase.functions.invoke('add-data-source', {
      body: input,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to create data source');
    }

    return response.data.data as DataSource;
  }

  async delete(id: string): Promise<void> {
    // First get the data source to check for file
    const { data: dataSource, error: fetchError } = await supabase
      .from('data_sources')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Delete file from storage if exists
    if (dataSource?.file_path) {
      await supabase.storage
        .from('data-sources')
        .remove([dataSource.file_path]);
    }

    // Delete the record
    const { error } = await supabase
      .from('data_sources')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async uploadFile(projectId: string, file: File): Promise<DataSource> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const userId = userData.user.id;
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${userId}/${projectId}/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('data-sources')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Create data source record
    return this.create({
      project_id: projectId,
      source_type: 'file',
      name: file.name,
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    });
  }

  async addUrl(projectId: string, url: string, name?: string): Promise<DataSource> {
    const urlObj = new URL(url);
    const sourceName = name || urlObj.hostname + urlObj.pathname.slice(0, 50);

    const dataSource = await this.create({
      project_id: projectId,
      source_type: 'url',
      name: sourceName,
      url,
    });

    // Trigger URL fetching
    await this.fetchUrlContent(dataSource.id);

    return dataSource;
  }

  async fetchUrlContent(dataSourceId: string): Promise<DataSource> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const response = await supabase.functions.invoke('fetch-url-content', {
      body: { data_source_id: dataSourceId },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to fetch URL content');
    }

    return response.data.data as DataSource;
  }

  async addText(projectId: string, name: string, content: string): Promise<DataSource> {
    return this.create({
      project_id: projectId,
      source_type: 'text',
      name,
      raw_content: content,
    });
  }

  async bulkAddUrls(projectId: string, urls: string[]): Promise<{ data: DataSource[]; summary: { total_requested: number; valid_urls: number; created: number } }> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const response = await supabase.functions.invoke('bulk-add-sources', {
      body: { project_id: projectId, urls },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to bulk add URLs');
    }

    return response.data;
  }

  async getDownloadUrl(dataSourceId: string): Promise<string> {
    const { data: dataSource, error } = await supabase
      .from('data_sources')
      .select('file_path')
      .eq('id', dataSourceId)
      .single();

    if (error || !dataSource?.file_path) {
      throw new Error('File not found');
    }

    const { data: signedUrlData, error: signError } = await supabase.storage
      .from('data-sources')
      .createSignedUrl(dataSource.file_path, 3600);

    if (signError || !signedUrlData?.signedUrl) {
      throw new Error('Failed to generate download URL');
    }

    return signedUrlData.signedUrl;
  }
}

export const dataSourceService = new DataSourceService();
