import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  invited_by: string | null;
  invited_at: string | null;
  joined_at: string;
  profile?: {
    name: string;
    email: string;
    avatar_url: string | null;
  };
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  invited_by: string;
  expires_at: string;
  created_at: string;
}

export interface TeamActivity {
  id: string;
  team_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  profile?: {
    name: string;
    avatar_url: string | null;
  };
}

export function useTeams() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['teams', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');
        
      if (error) throw error;
      return data as Team[];
    },
    enabled: !!user,
  });
}

export function useTeam(teamId: string | null) {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      if (!teamId) return null;
      
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();
        
      if (error) throw error;
      return data as Team;
    },
    enabled: !!teamId,
  });
}

export function useTeamMembers(teamId: string | null) {
  return useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .order('role');
        
      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(m => ({
        ...m,
        profile: profileMap.get(m.user_id) || { name: 'Unknown', email: '', avatar_url: null },
      })) as TeamMember[];
    },
    enabled: !!teamId,
  });
}

export function useTeamInvitations(teamId: string | null) {
  return useQuery({
    queryKey: ['team-invitations', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('team_id', teamId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data as TeamInvitation[];
    },
    enabled: !!teamId,
  });
}

export function useTeamActivities(teamId: string | null, limit = 20) {
  return useQuery({
    queryKey: ['team-activities', teamId, limit],
    queryFn: async () => {
      if (!teamId) return [];
      
      const { data, error } = await supabase
        .from('team_activities')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(limit);
        
      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = [...new Set(data.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(a => ({
        ...a,
        profile: profileMap.get(a.user_id) || { name: 'Unknown', avatar_url: null },
      })) as TeamActivity[];
    },
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
      
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: input.name,
          slug,
          description: input.description || null,
          owner_id: user.id,
        })
        .select()
        .single();
        
      if (error) throw error;
      return data as Team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ teamId, input }: { teamId: string; input: Partial<Team> }) => {
      const { data, error } = await supabase
        .from('teams')
        .update(input)
        .eq('id', teamId)
        .select()
        .single();
        
      if (error) throw error;
      return data as Team;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['team', data.id] });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ teamId, email, role }: { teamId: string; email: string; role: TeamMember['role'] }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('team_invitations')
        .insert({
          team_id: teamId,
          email,
          role,
          invited_by: user.id,
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations', variables.teamId] });
      toast({
        title: 'Invitation sent',
        description: `Invitation sent to ${variables.email}`,
      });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ memberId, role, teamId }: { memberId: string; role: TeamMember['role']; teamId: string }) => {
      const { error } = await supabase
        .from('team_members')
        .update({ role })
        .eq('id', memberId);
        
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', variables.teamId] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ memberId, teamId }: { memberId: string; teamId: string }) => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);
        
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', variables.teamId] });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ invitationId, teamId }: { invitationId: string; teamId: string }) => {
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId);
        
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations', variables.teamId] });
    },
  });
}

export function useLogActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (activity: {
      teamId: string;
      action: string;
      resourceType: string;
      resourceId?: string;
      resourceName?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('team_activities')
        .insert({
          team_id: activity.teamId,
          user_id: user.id,
          action: activity.action,
          resource_type: activity.resourceType,
          resource_id: activity.resourceId || null,
          resource_name: activity.resourceName || null,
          metadata: activity.metadata || {},
        } as any);
        
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-activities', variables.teamId] });
    },
  });
}
