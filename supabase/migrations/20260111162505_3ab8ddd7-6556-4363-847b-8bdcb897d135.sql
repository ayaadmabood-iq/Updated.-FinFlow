-- Add chunking configuration columns to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS chunk_size integer DEFAULT 1000,
ADD COLUMN IF NOT EXISTS chunk_overlap integer DEFAULT 200,
ADD COLUMN IF NOT EXISTS chunk_strategy text DEFAULT 'fixed';

-- Add check constraint for chunk_strategy
ALTER TABLE public.projects
ADD CONSTRAINT check_chunk_strategy 
CHECK (chunk_strategy IN ('semantic', 'fixed', 'sentence'));

-- Add check constraints for valid ranges
ALTER TABLE public.projects
ADD CONSTRAINT check_chunk_size 
CHECK (chunk_size >= 100 AND chunk_size <= 10000);

ALTER TABLE public.projects
ADD CONSTRAINT check_chunk_overlap 
CHECK (chunk_overlap >= 0 AND chunk_overlap < chunk_size);

-- Add comment for documentation
COMMENT ON COLUMN public.projects.chunk_size IS 'Number of characters per chunk (100-10000)';
COMMENT ON COLUMN public.projects.chunk_overlap IS 'Number of overlapping characters between chunks';
COMMENT ON COLUMN public.projects.chunk_strategy IS 'Chunking strategy: semantic (AI-based), fixed (character count), sentence (natural boundaries)';