-- Create team_role enum
CREATE TYPE public.team_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role team_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create project_shares table
CREATE TABLE public.project_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit', 'admin')),
  shared_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, team_id)
);

-- Create team_activities table for activity feed
CREATE TABLE public.team_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  resource_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create team_invitations table for pending invites
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role team_role NOT NULL DEFAULT 'viewer',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, email)
);

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Function to check if user is team member
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND team_id = _team_id
  )
$$;

-- Function to check if user is team admin or owner
CREATE OR REPLACE FUNCTION public.is_team_admin(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND team_id = _team_id AND role IN ('owner', 'admin')
  )
$$;

-- Function to check if user is team owner
CREATE OR REPLACE FUNCTION public.is_team_owner(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND team_id = _team_id AND role = 'owner'
  )
$$;

-- Teams policies
CREATE POLICY "Users can view teams they belong to"
ON public.teams FOR SELECT
USING (is_team_member(auth.uid(), id));

CREATE POLICY "Users can create teams"
ON public.teams FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team admins can update team"
ON public.teams FOR UPDATE
USING (is_team_admin(auth.uid(), id));

CREATE POLICY "Team owner can delete team"
ON public.teams FOR DELETE
USING (owner_id = auth.uid());

-- Team members policies
CREATE POLICY "Team members can view other members"
ON public.team_members FOR SELECT
USING (is_team_member(auth.uid(), team_id));

CREATE POLICY "Team admins can add members"
ON public.team_members FOR INSERT
WITH CHECK (is_team_admin(auth.uid(), team_id));

CREATE POLICY "Team admins can update members"
ON public.team_members FOR UPDATE
USING (is_team_admin(auth.uid(), team_id) AND role != 'owner');

CREATE POLICY "Team admins can remove members"
ON public.team_members FOR DELETE
USING (is_team_admin(auth.uid(), team_id) AND role != 'owner');

-- Project shares policies
CREATE POLICY "Team members can view project shares"
ON public.project_shares FOR SELECT
USING (is_team_member(auth.uid(), team_id));

CREATE POLICY "Project owners can share projects"
ON public.project_shares FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects
  WHERE id = project_id AND owner_id = auth.uid()
));

CREATE POLICY "Project owners can update shares"
ON public.project_shares FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.projects
  WHERE id = project_id AND owner_id = auth.uid()
));

CREATE POLICY "Project owners can remove shares"
ON public.project_shares FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.projects
  WHERE id = project_id AND owner_id = auth.uid()
));

-- Team activities policies
CREATE POLICY "Team members can view activities"
ON public.team_activities FOR SELECT
USING (is_team_member(auth.uid(), team_id));

CREATE POLICY "Team members can log activities"
ON public.team_activities FOR INSERT
WITH CHECK (is_team_member(auth.uid(), team_id) AND user_id = auth.uid());

-- Team invitations policies
CREATE POLICY "Team admins can view invitations"
ON public.team_invitations FOR SELECT
USING (is_team_admin(auth.uid(), team_id));

CREATE POLICY "Team admins can create invitations"
ON public.team_invitations FOR INSERT
WITH CHECK (is_team_admin(auth.uid(), team_id));

CREATE POLICY "Team admins can delete invitations"
ON public.team_invitations FOR DELETE
USING (is_team_admin(auth.uid(), team_id));

-- Add indexes for performance
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_project_shares_project_id ON public.project_shares(project_id);
CREATE INDEX idx_project_shares_team_id ON public.project_shares(team_id);
CREATE INDEX idx_team_activities_team_id ON public.team_activities(team_id);
CREATE INDEX idx_team_activities_created_at ON public.team_activities(created_at DESC);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX idx_team_invitations_token ON public.team_invitations(token);

-- Trigger to auto-add owner as team member
CREATE OR REPLACE FUNCTION public.add_team_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_team_created
AFTER INSERT ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.add_team_owner_as_member();

-- Trigger to update teams.updated_at
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for team activities
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_activities;