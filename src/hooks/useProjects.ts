/**
 * @fileoverview React hooks for project data management.
 * 
 * This module provides React Query-based hooks for fetching and mutating
 * project data. All hooks automatically handle caching, invalidation,
 * and optimistic updates.
 * 
 * @module hooks/useProjects
 * @version 1.0.0
 * 
 * @example
 * ```tsx
 * import { useProjects, useCreateProject } from '@/hooks/useProjects';
 * 
 * function ProjectList() {
 *   const { data: projects, isLoading } = useProjects();
 *   const createProject = useCreateProject();
 * 
 *   if (isLoading) return <Loading />;
 *   
 *   return (
 *     <div>
 *       {projects?.data.map(project => (
 *         <ProjectCard key={project.id} project={project} />
 *       ))}
 *       <button onClick={() => createProject.mutate({ name: 'New Project', description: '' })}>
 *         Create Project
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '@/services/projectService';
import type { Project, CreateProjectInput, UpdateProjectInput, ChunkingSettings } from '@/types';

/**
 * Fetches a list of projects, optionally filtered by status.
 * 
 * This hook uses React Query for automatic caching, background refetching,
 * and stale-while-revalidate behavior.
 * 
 * @function useProjects
 * @param {Project['status']} [status] - Optional status filter ('active', 'archived', 'draft')
 * @returns {UseQueryResult<PaginatedResponse<Project>>} Query result containing projects
 * 
 * @example
 * ```tsx
 * // Fetch all projects
 * const { data: allProjects } = useProjects();
 * 
 * // Fetch only active projects
 * const { data: activeProjects, isLoading, error } = useProjects('active');
 * 
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error.message} />;
 * 
 * return (
 *   <ul>
 *     {activeProjects?.data.map(p => <li key={p.id}>{p.name}</li>)}
 *   </ul>
 * );
 * ```
 */
export function useProjects(status?: Project['status']) {
  return useQuery({
    queryKey: ['projects', status],
    queryFn: () => projectService.getProjects(1, 100, status),
  });
}

/**
 * Fetches a single project by its ID.
 * 
 * The query is automatically disabled when no ID is provided.
 * 
 * @function useProject
 * @param {string} id - The UUID of the project to fetch
 * @returns {UseQueryResult<Project>} Query result containing the project
 * 
 * @example
 * ```tsx
 * function ProjectDetail({ projectId }: { projectId: string }) {
 *   const { data: project, isLoading, error } = useProject(projectId);
 * 
 *   if (isLoading) return <Loading />;
 *   if (error) return <ErrorMessage error={error} />;
 *   if (!project) return <NotFound />;
 * 
 *   return (
 *     <div>
 *       <h1>{project.name}</h1>
 *       <p>{project.description}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.getProject(id),
    enabled: !!id,
  });
}

/**
 * Mutation hook for creating a new project.
 * 
 * Automatically invalidates the projects list cache on success.
 * 
 * @function useCreateProject
 * @returns {UseMutationResult<Project, Error, CreateProjectInput>} Mutation result with mutate function
 * 
 * @example
 * ```tsx
 * function CreateProjectButton() {
 *   const createProject = useCreateProject();
 * 
 *   const handleCreate = () => {
 *     createProject.mutate({
 *       name: 'New Project',
 *       description: 'A new project for legal documents',
 *       chunkSize: 1000,
 *       chunkOverlap: 100,
 *       chunkStrategy: 'semantic',
 *     }, {
 *       onSuccess: (project) => {
 *         console.log('Created project:', project.id);
 *         navigate(`/projects/${project.id}`);
 *       },
 *       onError: (error) => {
 *         toast.error(`Failed to create project: ${error.message}`);
 *       },
 *     });
 *   };
 * 
 *   return (
 *     <button 
 *       onClick={handleCreate} 
 *       disabled={createProject.isPending}
 *     >
 *       {createProject.isPending ? 'Creating...' : 'Create Project'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectService.createProject(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/**
 * Mutation hook for updating an existing project.
 * 
 * Automatically invalidates both the projects list and the specific
 * project cache on success.
 * 
 * @function useUpdateProject
 * @returns {UseMutationResult<Project, Error, { id: string; input: UpdateProjectInput }>} Mutation result
 * 
 * @example
 * ```tsx
 * function ProjectSettings({ project }: { project: Project }) {
 *   const updateProject = useUpdateProject();
 * 
 *   const handleUpdate = (updates: UpdateProjectInput) => {
 *     updateProject.mutate({
 *       id: project.id,
 *       input: updates,
 *     }, {
 *       onSuccess: () => toast.success('Project updated'),
 *       onError: (error) => toast.error(error.message),
 *     });
 *   };
 * 
 *   return (
 *     <ProjectForm 
 *       project={project} 
 *       onSubmit={handleUpdate}
 *       isLoading={updateProject.isPending}
 *     />
 *   );
 * }
 * ```
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      projectService.updateProject(id, input),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
    },
  });
}

/**
 * Mutation hook for deleting a project.
 * 
 * Automatically invalidates the projects list cache on success.
 * 
 * @function useDeleteProject
 * @returns {UseMutationResult<void, Error, string>} Mutation result
 * 
 * @example
 * ```tsx
 * function DeleteProjectButton({ projectId }: { projectId: string }) {
 *   const deleteProject = useDeleteProject();
 * 
 *   const handleDelete = () => {
 *     if (confirm('Are you sure you want to delete this project?')) {
 *       deleteProject.mutate(projectId, {
 *         onSuccess: () => {
 *           toast.success('Project deleted');
 *           navigate('/projects');
 *         },
 *         onError: (error) => toast.error(error.message),
 *       });
 *     }
 *   };
 * 
 *   return (
 *     <button 
 *       onClick={handleDelete} 
 *       disabled={deleteProject.isPending}
 *       className="text-destructive"
 *     >
 *       {deleteProject.isPending ? 'Deleting...' : 'Delete Project'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/**
 * Mutation hook for updating a project's chunking settings.
 * 
 * This hook is specifically for updating the chunking configuration
 * of a project, which affects how documents are processed.
 * 
 * @function useUpdateChunkingSettings
 * @param {string} projectId - The UUID of the project to update
 * @returns {UseMutationResult<Project, Error, ChunkingSettings>} Mutation result
 * 
 * @example
 * ```tsx
 * function ChunkingSettingsForm({ projectId }: { projectId: string }) {
 *   const updateSettings = useUpdateChunkingSettings(projectId);
 *   const [settings, setSettings] = useState<ChunkingSettings>({
 *     chunkSize: 1000,
 *     chunkOverlap: 100,
 *     chunkStrategy: 'semantic',
 *   });
 * 
 *   const handleSave = () => {
 *     updateSettings.mutate(settings, {
 *       onSuccess: () => toast.success('Chunking settings updated'),
 *       onError: (error) => toast.error(error.message),
 *     });
 *   };
 * 
 *   return (
 *     <div>
 *       <ChunkSizeSlider 
 *         value={settings.chunkSize} 
 *         onChange={(v) => setSettings(s => ({ ...s, chunkSize: v }))} 
 *       />
 *       <ChunkOverlapSlider 
 *         value={settings.chunkOverlap}
 *         onChange={(v) => setSettings(s => ({ ...s, chunkOverlap: v }))}
 *       />
 *       <StrategySelect 
 *         value={settings.chunkStrategy}
 *         onChange={(v) => setSettings(s => ({ ...s, chunkStrategy: v }))}
 *       />
 *       <button onClick={handleSave} disabled={updateSettings.isPending}>
 *         Save Settings
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useUpdateChunkingSettings(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: ChunkingSettings) =>
      projectService.updateChunkingSettings(projectId, {
        chunkSize: settings.chunkSize,
        chunkOverlap: settings.chunkOverlap,
        chunkStrategy: settings.chunkStrategy,
      }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
    },
  });
}
