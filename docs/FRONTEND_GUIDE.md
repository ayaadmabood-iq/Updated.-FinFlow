# FineFlow Frontend Guide

## Table of Contents

1. [Project Structure](#project-structure)
2. [Component Hierarchy](#component-hierarchy)
3. [State Management](#state-management)
4. [Services Layer](#services-layer)
5. [Routing Structure](#routing-structure)
6. [UI/UX Patterns](#uiux-patterns)
7. [Internationalization](#internationalization)

---

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui primitives (Button, Card, etc.)
│   ├── layout/          # Layout components
│   ├── auth/            # Authentication components
│   ├── documents/       # Document management
│   ├── training/        # Training & datasets
│   ├── search/          # Search functionality
│   ├── graph/           # Knowledge graph
│   ├── admin/           # Admin dashboard
│   ├── teams/           # Team management
│   ├── budget/          # Budget controls
│   ├── collaboration/   # Real-time collaboration
│   ├── studio/          # Content studio
│   ├── localization/    # i18n components
│   ├── mobile/          # Mobile-specific
│   └── ...
├── pages/               # Route components
│   ├── admin/           # Admin pages
│   ├── settings/        # Settings pages
│   ├── Dashboard.tsx
│   ├── Projects.tsx
│   └── ...
├── hooks/               # React hooks
├── services/            # API abstraction
├── lib/                 # Utilities
│   ├── api/             # API adapters
│   ├── utils.ts         # Utility functions
│   └── i18n.ts          # i18n configuration
├── types/               # TypeScript types
├── locales/             # Translation files
└── integrations/        # External integrations
    └── supabase/        # Supabase client & types
```

---

## Component Hierarchy

### Application Shell

```
App
├── QueryClientProvider (React Query)
├── ThemeProvider (Dark/Light mode)
├── AuthProvider (User session)
├── TooltipProvider
├── Toaster (Notifications)
└── BrowserRouter
    └── Routes
        ├── /auth → Auth (login/signup)
        ├── /learn → LearnLLM (public)
        └── /* → ProtectedRoute
            └── DashboardLayout
                ├── AppSidebar
                ├── MobileNav
                └── {Page Content}
```

### Key Component Categories

#### Layout Components

| Component | Purpose |
|-----------|---------|
| `DashboardLayout` | Main app layout with sidebar |
| `AppSidebar` | Navigation sidebar |
| `MobileNav` | Mobile navigation |
| `TabNav` | Tab navigation within pages |

#### Document Components

| Component | Purpose |
|-----------|---------|
| `FileUploadZone` | Drag-and-drop file upload |
| `FileList` | Document list with actions |
| `FilePreview` | Document content preview |
| `ChunkViewer` | View document chunks |
| `DocumentSummary` | AI-generated summary |
| `ProcessingTimeline` | Pipeline stage visualization |

#### Training Components

| Component | Purpose |
|-----------|---------|
| `DatasetBuilderDashboard` | Dataset creation workflow |
| `PairEditor` | Edit Q&A pairs |
| `DatasetPreview` | Preview training data |
| `DatasetValidation` | Validation results |
| `TrainingProgress` | Training job status |
| `TrainingJobsList` | List of training jobs |

#### Search Components

| Component | Purpose |
|-----------|---------|
| `GlobalSearch` | Command palette search |
| `SearchBar` | Main search input |
| `SearchFilters` | Filter controls |
| `SearchResults` | Results display |
| `SearchResultCard` | Individual result |

#### Graph Components

| Component | Purpose |
|-----------|---------|
| `KnowledgeGraphViewer` | Force-directed graph |
| `GraphNodeDetail` | Node information panel |
| `GraphPathfinder` | Path finding UI |
| `GraphSearchChat` | Chat with graph |
| `GraphInsightsPanel` | Graph statistics |

---

## State Management

### React Query

Primary data fetching and caching solution.

```typescript
// Hook pattern
export function useDocuments(projectId: string) {
  return useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => documentService.getDocuments(projectId),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Mutation pattern
export function useUploadDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: UploadParams) => 
      documentService.uploadDocument(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['documents', variables.projectId]
      });
      toast.success('Document uploaded');
    },
  });
}
```

### Context Providers

| Provider | Purpose | Location |
|----------|---------|----------|
| `AuthProvider` | User session & auth state | `hooks/useAuth.tsx` |
| `ThemeProvider` | Dark/light mode | `hooks/useTheme.tsx` |
| `QueryClientProvider` | React Query cache | `App.tsx` |

### Auth Context

```typescript
// Usage
const { user, isLoading, signIn, signOut } = useAuth();

// Structure
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

---

## Services Layer

### Service Pattern

Services abstract Supabase operations and provide type-safe APIs.

```typescript
// src/services/documentService.ts
class DocumentService {
  async getDocuments(projectId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async uploadDocument(params: UploadParams): Promise<Document> {
    // Check quota
    // Upload to storage
    // Create database record
    // Trigger processing
  }

  async processDocument(documentId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('process-document', {
      body: { documentId }
    });
    if (error) throw error;
  }
}

export const documentService = new DocumentService();
```

### Available Services

| Service | File | Purpose |
|---------|------|---------|
| `documentService` | `documentService.ts` | Document CRUD & processing |
| `searchService` | `searchService.ts` | Semantic & full-text search |
| `trainingService` | `trainingService.ts` | Datasets & fine-tuning |
| `projectService` | `projectService.ts` | Project management |
| `authService` | `authService.ts` | Authentication helpers |
| `quotaService` | `quotaService.ts` | Quota checking & updates |
| `budgetService` | `budgetService.ts` | Budget tracking |
| `knowledgeGraphService` | `knowledgeGraphService.ts` | Graph operations |
| `collaborationService` | `collaborationService.ts` | Real-time features |
| `exportService` | `exportService.ts` | Data export |
| `reportService` | `reportService.ts` | Report generation |
| `studioService` | `studioService.ts` | Content generation |
| `adminService` | `adminService.ts` | Admin operations |
| `auditService` | `auditService.ts` | Audit logging |

---

## Routing Structure

### Route Definitions

```typescript
// src/App.tsx
<Routes>
  {/* Public Routes */}
  <Route path="/auth" element={<Auth />} />
  <Route path="/learn" element={<LearnLLM />} />
  
  {/* Protected Routes */}
  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
  <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
  <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
  <Route path="/projects/:id/data" element={<ProtectedRoute><ProjectData /></ProtectedRoute>} />
  <Route path="/projects/:id/budget" element={<ProtectedRoute><ProjectBudget /></ProtectedRoute>} />
  <Route path="/projects/:id/studio" element={<ProtectedRoute><ProjectStudio /></ProtectedRoute>} />
  <Route path="/projects/:id/knowledge-graph" element={<ProtectedRoute><ProjectKnowledgeGraph /></ProtectedRoute>} />
  
  <Route path="/training" element={<ProtectedRoute><Training /></ProtectedRoute>} />
  <Route path="/training/:id" element={<ProtectedRoute><TrainingDetail /></ProtectedRoute>} />
  <Route path="/datasets" element={<ProtectedRoute><Datasets /></ProtectedRoute>} />
  <Route path="/datasets/:id" element={<ProtectedRoute><DatasetDetail /></ProtectedRoute>} />
  
  <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
  <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
  <Route path="/models" element={<ProtectedRoute><Models /></ProtectedRoute>} />
  <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
  <Route path="/audit-log" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
  <Route path="/settings/team" element={<ProtectedRoute><TeamSettings /></ProtectedRoute>} />
  <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
  
  {/* Admin Routes */}
  <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
  <Route path="/admin/metrics" element={<ProtectedRoute><AdminMetrics /></ProtectedRoute>} />
  <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
  <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
  
  <Route path="*" element={<NotFound />} />
</Routes>
```

### Route Protection

```typescript
// ProtectedRoute component
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// AdminRoute component  
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAdmin();

  if (isLoading) return <LoadingSpinner />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
```

---

## UI/UX Patterns

### Design System

Based on **shadcn/ui** with Tailwind CSS.

#### Color Tokens

```css
/* src/index.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --border: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark mode overrides */
}
```

#### Component Usage

```tsx
// Always use semantic tokens
<div className="bg-background text-foreground">
  <Card className="border-border">
    <CardHeader>
      <CardTitle className="text-card-foreground">Title</CardTitle>
    </CardHeader>
  </Card>
</div>

// Never use direct colors
// ❌ <div className="bg-white text-gray-900">
// ✅ <div className="bg-background text-foreground">
```

### Toast Notifications

```typescript
import { toast } from 'sonner';

// Success
toast.success('Document uploaded successfully');

// Error
toast.error('Failed to process document');

// With description
toast.success('Document ready', {
  description: 'Your document has been processed and is ready for search.'
});

// Loading state
const id = toast.loading('Processing...');
// Later:
toast.dismiss(id);
toast.success('Done!');
```

### Loading States

```tsx
// Skeleton loading
<div className="space-y-4">
  <Skeleton className="h-12 w-full" />
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
</div>

// Inline loading
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? 'Processing...' : 'Submit'}
</Button>
```

---

## Internationalization

### Configuration

```typescript
// src/lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      ar: { translation: arTranslations },
      es: { translation: esTranslations },
      // ... more languages
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar', 'es', 'fr', 'de', 'zh', 'hi'],
  });
```

### Supported Languages

| Code | Language | Direction |
|------|----------|-----------|
| `en` | English | LTR |
| `ar` | Arabic | RTL |
| `es` | Spanish | LTR |
| `fr` | French | LTR |
| `de` | German | LTR |
| `zh` | Chinese | LTR |
| `hi` | Hindi | LTR |

### Usage

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t, i18n } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.welcome', { name: user.name })}</p>
      <button onClick={() => i18n.changeLanguage('ar')}>
        العربية
      </button>
    </div>
  );
}
```

### RTL Support

```tsx
// src/components/localization/RTLWrapper.tsx
import { useTranslation } from 'react-i18next';
import { isRTL } from '@/lib/i18n';

export function RTLWrapper({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  
  return (
    <div dir={isRTL(i18n.language) ? 'rtl' : 'ltr'}>
      {children}
    </div>
  );
}
```

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Development setup
- [USER_GUIDE.md](./USER_GUIDE.md) - End-user documentation
