-- Add processing fields to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS extracted_text TEXT,
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- Create chunks table for document chunks
CREATE TABLE IF NOT EXISTS public.chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  index INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chunks (users can only access chunks of their own documents)
CREATE POLICY "Users can view chunks of their own documents" 
ON public.chunks 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = chunks.document_id 
    AND documents.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert chunks for their own documents" 
ON public.chunks 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = chunks.document_id 
    AND documents.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete chunks of their own documents" 
ON public.chunks 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = chunks.document_id 
    AND documents.owner_id = auth.uid()
  )
);

-- Create indexes for performance (with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON public.chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_index ON public.chunks(index);
CREATE INDEX IF NOT EXISTS idx_documents_processed_at ON public.documents(processed_at);