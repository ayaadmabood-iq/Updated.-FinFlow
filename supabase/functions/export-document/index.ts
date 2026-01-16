import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

type ExportFormat = 'json' | 'csv' | 'txt' | 'markdown';

interface ExportOptions {
  includeMetadata: boolean;
  includeChunks: boolean;
  includeSummary: boolean;
  includeExtractedText: boolean;
}

interface ExportRequest {
  documentId: string;
  format: ExportFormat;
  options: ExportOptions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.user.id;
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, userId, 'default', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }


    const { documentId, format, options }: ExportRequest = await req.json();

    if (!documentId || !format) {
      return new Response(JSON.stringify({ error: 'documentId and format are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validFormats: ExportFormat[] = ['json', 'csv', 'txt', 'markdown'];
    if (!validFormats.includes(format)) {
      return new Response(JSON.stringify({ error: 'Invalid format. Use: json, csv, txt, or markdown' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get document and verify ownership
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('owner_id', userId)
      .is('deleted_at', null)
      .single();

    if (docError || !document) {
      console.error('Document fetch error:', docError);
      return new Response(JSON.stringify({ error: 'Document not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get chunks if requested
    let chunks: Array<{ index: number; content: string; metadata: Record<string, unknown> | null }> = [];
    if (options.includeChunks) {
      const { data: chunkData, error: chunkError } = await supabase
        .from('chunks')
        .select('*')
        .eq('document_id', documentId)
        .order('index', { ascending: true });

      if (!chunkError && chunkData) {
        chunks = chunkData.map((c) => ({
          index: c.index,
          content: c.content,
          metadata: c.metadata,
        }));
      }
    }

    // Generate export content based on format
    let content: string;
    let mimeType: string;
    let fileExtension: string;

    const exportData = {
      document,
      chunks,
      options,
    };

    switch (format) {
      case 'json':
        content = generateJsonExport(exportData);
        mimeType = 'application/json';
        fileExtension = 'json';
        break;
      case 'csv':
        content = generateCsvExport(exportData);
        mimeType = 'text/csv';
        fileExtension = 'csv';
        break;
      case 'txt':
        content = generateTxtExport(exportData);
        mimeType = 'text/plain';
        fileExtension = 'txt';
        break;
      case 'markdown':
        content = generateMarkdownExport(exportData);
        mimeType = 'text/markdown';
        fileExtension = 'md';
        break;
      default:
        throw new Error('Invalid format');
    }

    const sanitizedName = document.name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${sanitizedName}_export.${fileExtension}`;

    

    return new Response(JSON.stringify({
      content,
      filename,
      mimeType,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

interface ExportData {
  document: Record<string, unknown>;
  chunks: Array<{ index: number; content: string; metadata: Record<string, unknown> | null }>;
  options: ExportOptions;
}

function generateJsonExport(data: ExportData): string {
  const { document, chunks, options } = data;
  
  const output: Record<string, unknown> = {};

  if (options.includeMetadata) {
    output.metadata = {
      id: document.id,
      name: document.name,
      originalName: document.original_name,
      mimeType: document.mime_type,
      sizeBytes: document.size_bytes,
      language: document.language,
      status: document.status,
      createdAt: document.created_at,
      processedAt: document.processed_at,
    };
  }

  if (options.includeSummary && document.summary) {
    output.summary = document.summary;
  }

  if (options.includeExtractedText && document.extracted_text) {
    output.extractedText = document.extracted_text;
  }

  if (options.includeChunks && chunks.length > 0) {
    output.chunks = chunks.map((c) => ({
      index: c.index,
      content: c.content,
      charCount: c.content.length,
      metadata: c.metadata,
    }));
  }

  return JSON.stringify(output, null, 2);
}

function generateCsvExport(data: ExportData): string {
  const { document, chunks, options } = data;
  const lines: string[] = [];

  if (options.includeChunks && chunks.length > 0) {
    // CSV with chunks as rows
    lines.push('index,content,charCount');
    for (const chunk of chunks) {
      const escapedContent = `"${chunk.content.replace(/"/g, '""')}"`;
      lines.push(`${chunk.index},${escapedContent},${chunk.content.length}`);
    }
  } else {
    // Flat document-level export
    lines.push('field,value');
    
    if (options.includeMetadata) {
      lines.push(`id,"${document.id}"`);
      lines.push(`name,"${String(document.name).replace(/"/g, '""')}"`);
      lines.push(`language,"${document.language || ''}"`);
      lines.push(`status,"${document.status}"`);
      lines.push(`processedAt,"${document.processed_at || ''}"`);
    }

    if (options.includeSummary && document.summary) {
      const escapedSummary = String(document.summary).replace(/"/g, '""').replace(/\n/g, ' ');
      lines.push(`summary,"${escapedSummary}"`);
    }

    if (options.includeExtractedText && document.extracted_text) {
      const escapedText = String(document.extracted_text).replace(/"/g, '""').replace(/\n/g, ' ');
      lines.push(`extractedText,"${escapedText}"`);
    }
  }

  return lines.join('\n');
}

function generateTxtExport(data: ExportData): string {
  const { document, chunks, options } = data;
  const sections: string[] = [];

  sections.push(`DOCUMENT EXPORT: ${document.name}`);
  sections.push('='.repeat(50));
  sections.push('');

  if (options.includeMetadata) {
    sections.push('--- METADATA ---');
    sections.push(`ID: ${document.id}`);
    sections.push(`Name: ${document.name}`);
    sections.push(`Original Name: ${document.original_name}`);
    sections.push(`Type: ${document.mime_type}`);
    sections.push(`Size: ${formatBytes(Number(document.size_bytes))}`);
    sections.push(`Language: ${document.language || 'Not detected'}`);
    sections.push(`Status: ${document.status}`);
    sections.push(`Created: ${document.created_at}`);
    sections.push(`Processed: ${document.processed_at || 'Not processed'}`);
    sections.push('');
  }

  if (options.includeSummary && document.summary) {
    sections.push('--- SUMMARY ---');
    sections.push(String(document.summary));
    sections.push('');
  }

  if (options.includeExtractedText && document.extracted_text) {
    sections.push('--- EXTRACTED TEXT ---');
    sections.push(String(document.extracted_text));
    sections.push('');
  }

  if (options.includeChunks && chunks.length > 0) {
    sections.push('--- CHUNKS ---');
    sections.push(`Total chunks: ${chunks.length}`);
    sections.push('');
    for (const chunk of chunks) {
      sections.push(`[Chunk ${chunk.index + 1}] (${chunk.content.length} chars)`);
      sections.push(chunk.content);
      sections.push('');
    }
  }

  return sections.join('\n');
}

function generateMarkdownExport(data: ExportData): string {
  const { document, chunks, options } = data;
  const sections: string[] = [];

  sections.push(`# ${document.name}`);
  sections.push('');

  if (options.includeMetadata) {
    sections.push('## Metadata');
    sections.push('');
    sections.push('| Property | Value |');
    sections.push('|----------|-------|');
    sections.push(`| ID | \`${document.id}\` |`);
    sections.push(`| Original Name | ${document.original_name} |`);
    sections.push(`| Type | ${document.mime_type} |`);
    sections.push(`| Size | ${formatBytes(Number(document.size_bytes))} |`);
    sections.push(`| Language | ${document.language || 'Not detected'} |`);
    sections.push(`| Status | ${document.status} |`);
    sections.push(`| Created | ${document.created_at} |`);
    sections.push(`| Processed | ${document.processed_at || 'Not processed'} |`);
    sections.push('');
  }

  if (options.includeSummary && document.summary) {
    sections.push('## Summary');
    sections.push('');
    sections.push(String(document.summary));
    sections.push('');
  }

  if (options.includeExtractedText && document.extracted_text) {
    sections.push('## Extracted Text');
    sections.push('');
    sections.push('```');
    sections.push(String(document.extracted_text));
    sections.push('```');
    sections.push('');
  }

  if (options.includeChunks && chunks.length > 0) {
    sections.push('## Chunks');
    sections.push('');
    sections.push(`Total: ${chunks.length} chunks`);
    sections.push('');
    for (const chunk of chunks) {
      sections.push(`### Chunk ${chunk.index + 1}`);
      sections.push('');
      sections.push(`*${chunk.content.length} characters*`);
      sections.push('');
      sections.push('> ' + chunk.content.split('\n').join('\n> '));
      sections.push('');
    }
  }

  return sections.join('\n');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
