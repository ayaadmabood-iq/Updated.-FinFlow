-- Dataset Versions for version control
CREATE TABLE public.dataset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.training_datasets(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  name TEXT,
  description TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}',
  changes_summary TEXT,
  pairs_count INTEGER DEFAULT 0,
  tokens_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dataset_id, version_number)
);

-- Training Config Versions
CREATE TABLE public.training_config_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, version_number)
);

-- Enable RLS
ALTER TABLE public.dataset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_config_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dataset_versions
CREATE POLICY "Users can view versions of own datasets"
  ON public.dataset_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.training_datasets
    WHERE training_datasets.id = dataset_versions.dataset_id
    AND training_datasets.user_id = auth.uid()
  ));

CREATE POLICY "Users can create versions for own datasets"
  ON public.dataset_versions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.training_datasets
    WHERE training_datasets.id = dataset_versions.dataset_id
    AND training_datasets.user_id = auth.uid()
  ) AND created_by = auth.uid());

CREATE POLICY "Users can delete versions of own datasets"
  ON public.dataset_versions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.training_datasets
    WHERE training_datasets.id = dataset_versions.dataset_id
    AND training_datasets.user_id = auth.uid()
  ));

-- RLS Policies for training_config_versions
CREATE POLICY "Users can view config versions of own projects"
  ON public.training_config_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = training_config_versions.project_id
    AND projects.owner_id = auth.uid()
  ));

CREATE POLICY "Users can create config versions for own projects"
  ON public.training_config_versions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = training_config_versions.project_id
    AND projects.owner_id = auth.uid()
  ) AND created_by = auth.uid());

-- Indexes for performance
CREATE INDEX idx_dataset_versions_dataset_id ON public.dataset_versions(dataset_id);
CREATE INDEX idx_dataset_versions_created_at ON public.dataset_versions(created_at DESC);
CREATE INDEX idx_training_config_versions_project_id ON public.training_config_versions(project_id);