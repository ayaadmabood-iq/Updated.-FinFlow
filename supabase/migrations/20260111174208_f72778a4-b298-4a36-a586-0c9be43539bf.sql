-- Add auto_generated and is_baseline flags to rag_experiments
-- No breaking changes, just adding new columns

ALTER TABLE public.rag_experiments 
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.rag_experiments 
ADD COLUMN IF NOT EXISTS is_baseline BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.rag_experiments 
ADD COLUMN IF NOT EXISTS generation_batch_id UUID;

-- Index for quick baseline lookup
CREATE INDEX IF NOT EXISTS idx_rag_experiments_baseline 
ON public.rag_experiments(project_id, is_baseline) 
WHERE is_baseline = true;

-- Index for auto-generated experiments
CREATE INDEX IF NOT EXISTS idx_rag_experiments_auto_generated 
ON public.rag_experiments(project_id, auto_generated) 
WHERE auto_generated = true;

-- Function to ensure only one baseline per project
CREATE OR REPLACE FUNCTION ensure_single_baseline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_baseline = true THEN
    -- Unset any existing baseline for this project
    UPDATE public.rag_experiments 
    SET is_baseline = false 
    WHERE project_id = NEW.project_id 
      AND id != NEW.id 
      AND is_baseline = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_ensure_single_baseline
BEFORE INSERT OR UPDATE ON public.rag_experiments
FOR EACH ROW
WHEN (NEW.is_baseline = true)
EXECUTE FUNCTION ensure_single_baseline();