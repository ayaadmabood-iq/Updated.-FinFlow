-- Create enum for annotation types
CREATE TYPE public.annotation_type AS ENUM ('highlight', 'comment', 'question', 'critical', 'action_item');

-- Create shared chat threads table
CREATE TABLE public.shared_chat_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  is_archived BOOLEAN DEFAULT false,
  last_message_at TIMESTAMPTZ,
  participant_ids UUID[] DEFAULT '{}',
  context_document_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.shared_chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL DEFAULT 'user', -- 'user' or 'ai'
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}', -- mentioned user IDs
  document_refs UUID[] DEFAULT '{}', -- referenced document IDs
  metadata JSONB DEFAULT '{}',
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create document annotations table
CREATE TABLE public.document_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  annotation_type public.annotation_type NOT NULL DEFAULT 'comment',
  content TEXT NOT NULL,
  selected_text TEXT,
  start_offset INTEGER,
  end_offset INTEGER,
  page_number INTEGER,
  position JSONB, -- {x, y, width, height} for positioning
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  replies JSONB DEFAULT '[]', -- array of reply objects
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create knowledge bases table
CREATE TABLE public.knowledge_bases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, slug)
);

-- Create knowledge base articles table
CREATE TABLE public.knowledge_base_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  knowledge_base_id UUID NOT NULL REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  summary TEXT,
  source_document_ids UUID[] DEFAULT '{}',
  source_chunk_ids UUID[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  author_id UUID NOT NULL,
  last_edited_by UUID,
  view_count INTEGER DEFAULT 0,
  search_vector tsvector,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(knowledge_base_id, slug)
);

-- Create presence tracking table (ephemeral, uses Supabase Realtime)
CREATE TABLE public.user_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- 'document', 'chat_thread', 'project'
  resource_id UUID NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, resource_type, resource_id)
);

-- Enable RLS
ALTER TABLE public.shared_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_chat_threads
CREATE POLICY "Team members can view threads"
  ON public.shared_chat_threads FOR SELECT
  USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Team members can create threads"
  ON public.shared_chat_threads FOR INSERT
  WITH CHECK (public.is_team_member(auth.uid(), team_id) AND created_by = auth.uid());

CREATE POLICY "Thread creators and team admins can update"
  ON public.shared_chat_threads FOR UPDATE
  USING (created_by = auth.uid() OR public.is_team_admin(auth.uid(), team_id));

CREATE POLICY "Thread creators and team admins can delete"
  ON public.shared_chat_threads FOR DELETE
  USING (created_by = auth.uid() OR public.is_team_admin(auth.uid(), team_id));

-- RLS Policies for chat_messages
CREATE POLICY "Team members can view messages"
  ON public.chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.shared_chat_threads t
    WHERE t.id = thread_id AND public.is_team_member(auth.uid(), t.team_id)
  ));

CREATE POLICY "Team members can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.shared_chat_threads t
      WHERE t.id = thread_id AND public.is_team_member(auth.uid(), t.team_id)
    )
  );

CREATE POLICY "Message senders can update their messages"
  ON public.chat_messages FOR UPDATE
  USING (sender_id = auth.uid());

CREATE POLICY "Message senders and admins can delete"
  ON public.chat_messages FOR DELETE
  USING (
    sender_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.shared_chat_threads t
      WHERE t.id = thread_id AND public.is_team_admin(auth.uid(), t.team_id)
    )
  );

-- RLS Policies for document_annotations
CREATE POLICY "Team members can view annotations"
  ON public.document_annotations FOR SELECT
  USING (
    user_id = auth.uid() OR
    (team_id IS NOT NULL AND public.is_team_member(auth.uid(), team_id))
  );

CREATE POLICY "Users can create annotations"
  ON public.document_annotations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their annotations"
  ON public.document_annotations FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their annotations"
  ON public.document_annotations FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for knowledge_bases
CREATE POLICY "Public KBs are viewable by all"
  ON public.knowledge_bases FOR SELECT
  USING (is_public = true OR public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Team admins can create KBs"
  ON public.knowledge_bases FOR INSERT
  WITH CHECK (public.is_team_admin(auth.uid(), team_id) AND created_by = auth.uid());

CREATE POLICY "Team admins can update KBs"
  ON public.knowledge_bases FOR UPDATE
  USING (public.is_team_admin(auth.uid(), team_id));

CREATE POLICY "Team admins can delete KBs"
  ON public.knowledge_bases FOR DELETE
  USING (public.is_team_admin(auth.uid(), team_id));

-- RLS Policies for knowledge_base_articles
CREATE POLICY "Articles viewable based on KB access"
  ON public.knowledge_base_articles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.knowledge_bases kb
    WHERE kb.id = knowledge_base_id AND (kb.is_public = true OR public.is_team_member(auth.uid(), kb.team_id))
  ));

CREATE POLICY "Team members can create articles"
  ON public.knowledge_base_articles FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.knowledge_bases kb
      WHERE kb.id = knowledge_base_id AND public.is_team_member(auth.uid(), kb.team_id)
    )
  );

CREATE POLICY "Authors and admins can update articles"
  ON public.knowledge_base_articles FOR UPDATE
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.knowledge_bases kb
      WHERE kb.id = knowledge_base_id AND public.is_team_admin(auth.uid(), kb.team_id)
    )
  );

CREATE POLICY "Authors and admins can delete articles"
  ON public.knowledge_base_articles FOR DELETE
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.knowledge_bases kb
      WHERE kb.id = knowledge_base_id AND public.is_team_admin(auth.uid(), kb.team_id)
    )
  );

-- RLS Policies for user_presence
CREATE POLICY "Anyone can view presence"
  ON public.user_presence FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their presence"
  ON public.user_presence FOR ALL
  USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_shared_chat_threads_team ON public.shared_chat_threads(team_id);
CREATE INDEX idx_shared_chat_threads_project ON public.shared_chat_threads(project_id);
CREATE INDEX idx_chat_messages_thread ON public.chat_messages(thread_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at DESC);
CREATE INDEX idx_document_annotations_document ON public.document_annotations(document_id);
CREATE INDEX idx_document_annotations_team ON public.document_annotations(team_id);
CREATE INDEX idx_knowledge_base_articles_kb ON public.knowledge_base_articles(knowledge_base_id);
CREATE INDEX idx_knowledge_base_articles_search ON public.knowledge_base_articles USING GIN(search_vector);
CREATE INDEX idx_user_presence_resource ON public.user_presence(resource_type, resource_id);

-- Triggers for updated_at
CREATE TRIGGER update_shared_chat_threads_updated_at
  BEFORE UPDATE ON public.shared_chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_annotations_updated_at
  BEFORE UPDATE ON public.document_annotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_bases_updated_at
  BEFORE UPDATE ON public.knowledge_bases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_base_articles_updated_at
  BEFORE UPDATE ON public.knowledge_base_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update article search vector
CREATE OR REPLACE FUNCTION public.update_article_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content_markdown, '')), 'C');
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_article_search
  BEFORE INSERT OR UPDATE ON public.knowledge_base_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_article_search_vector();

-- Function to update thread last_message_at
CREATE OR REPLACE FUNCTION public.update_thread_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shared_chat_threads
  SET last_message_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_thread_on_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_thread_last_message();

-- Enable realtime for collaborative features
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_chat_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_annotations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;