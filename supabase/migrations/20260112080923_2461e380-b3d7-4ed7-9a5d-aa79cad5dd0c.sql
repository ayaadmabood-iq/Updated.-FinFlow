-- Task 9.1: Real-time Collaborative Intelligence and Team Knowledge Sync

-- Add parent_thread_id column to shared_chat_threads for thread branching
ALTER TABLE public.shared_chat_threads 
ADD COLUMN IF NOT EXISTS parent_thread_id UUID REFERENCES public.shared_chat_threads(id),
ADD COLUMN IF NOT EXISTS branch_point_message_id UUID,
ADD COLUMN IF NOT EXISTS branch_context TEXT;

-- Create index for thread branching
CREATE INDEX IF NOT EXISTS idx_shared_chat_threads_parent ON public.shared_chat_threads(parent_thread_id);

-- Create document_locks table for soft locking mechanism
CREATE TABLE IF NOT EXISTS public.document_locks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(document_id, field_name, user_id)
);

-- Create index for document locks
CREATE INDEX idx_document_locks_document ON public.document_locks(document_id);
CREATE INDEX idx_document_locks_expires ON public.document_locks(expires_at);

-- Enable RLS on document_locks
ALTER TABLE public.document_locks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_locks
CREATE POLICY "Users can view locks on documents they can access"
ON public.document_locks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_locks.document_id
    AND d.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create locks"
ON public.document_locks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own locks"
ON public.document_locks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own locks"
ON public.document_locks FOR DELETE
USING (auth.uid() = user_id);

-- Create collaborative_edits table for version history
CREATE TABLE IF NOT EXISTS public.collaborative_edits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  edit_type TEXT NOT NULL DEFAULT 'update',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_reverted BOOLEAN DEFAULT false,
  reverted_by UUID,
  reverted_at TIMESTAMP WITH TIME ZONE
);

-- Create index for collaborative_edits
CREATE INDEX idx_collaborative_edits_document ON public.collaborative_edits(document_id);
CREATE INDEX idx_collaborative_edits_user ON public.collaborative_edits(user_id);
CREATE INDEX idx_collaborative_edits_created ON public.collaborative_edits(created_at DESC);

-- Enable RLS on collaborative_edits
ALTER TABLE public.collaborative_edits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collaborative_edits
CREATE POLICY "Users can view edits on documents they can access"
ON public.collaborative_edits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = collaborative_edits.document_id
    AND d.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create edits on documents they can access"
ON public.collaborative_edits FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = collaborative_edits.document_id
    AND d.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own edits"
ON public.collaborative_edits FOR UPDATE
USING (auth.uid() = user_id);

-- Add AI mention support to document_annotations
ALTER TABLE public.document_annotations
ADD COLUMN IF NOT EXISTS mentions TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_response TEXT,
ADD COLUMN IF NOT EXISTS ai_responded_at TIMESTAMP WITH TIME ZONE;

-- Create user_cursors table for cursor sync
CREATE TABLE IF NOT EXISTS public.user_cursors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  cursor_position JSONB,
  selection JSONB,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, resource_type, resource_id)
);

-- Create index for user_cursors
CREATE INDEX idx_user_cursors_resource ON public.user_cursors(resource_type, resource_id);

-- Enable RLS on user_cursors
ALTER TABLE public.user_cursors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_cursors
CREATE POLICY "Users can view all cursors"
ON public.user_cursors FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own cursors"
ON public.user_cursors FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cursors"
ON public.user_cursors FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cursors"
ON public.user_cursors FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_locks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaborative_edits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_cursors;