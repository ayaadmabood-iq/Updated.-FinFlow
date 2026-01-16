# FineFlow Developer Guide

## Table of Contents

1. [Local Development](#local-development)
2. [Code Structure](#code-structure)
3. [Adding Features](#adding-features)
4. [Testing](#testing)
5. [Contributing](#contributing)

---

## Local Development

### Setup

```bash
# Clone and install
git clone <repo-url>
cd fineflow
npm install

# Start dev server
npm run dev
```

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run test` | Run tests |
| `npm run typecheck` | Type checking |
| `npm run lint` | ESLint |

---

## Code Structure

```
src/
├── components/      # UI components by feature
├── pages/          # Route pages
├── hooks/          # React hooks (data fetching)
├── services/       # API abstraction layer
├── lib/            # Utilities
├── types/          # TypeScript types
└── locales/        # Translation files

supabase/functions/ # Edge functions (Deno)
docs/               # Documentation
```

### Key Patterns

**Services**: Wrap Supabase calls
```typescript
// services/documentService.ts
export const documentService = {
  getDocuments: (projectId) => supabase.from('documents')...
};
```

**Hooks**: Use React Query
```typescript
// hooks/useDocuments.ts
export function useDocuments(projectId: string) {
  return useQuery(['documents', projectId], () => ...);
}
```

**Components**: Use semantic tokens
```tsx
// ✅ Correct
<div className="bg-background text-foreground">

// ❌ Avoid
<div className="bg-white text-gray-900">
```

---

## Adding Features

### New Component

1. Create in appropriate `components/` subdirectory
2. Use shadcn/ui primitives
3. Add translations to `locales/*.json`
4. Export from index if shared

### New Edge Function

1. Create `supabase/functions/my-function/index.ts`
2. Add CORS headers
3. Validate authentication
4. Handle errors consistently

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Auth check
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return new Response('Unauthorized', { status: 401 });
  
  // Your logic here
});
```

### Database Changes

Use Lovable chat to request migrations. Never edit types.ts directly.

---

## Testing

```bash
npm run test        # Run all tests
npm run test:ui     # Interactive UI
```

### Test Location

```
src/services/__tests__/notificationService.test.ts
```

---

## Contributing

### Code Style

- TypeScript strict mode
- ESLint + Prettier
- Semantic commit messages: `feat:`, `fix:`, `docs:`

### PR Process

1. Create feature branch
2. Make changes with tests
3. Update documentation
4. Submit PR with description

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [API_REFERENCE.md](./API_REFERENCE.md) - API docs
- [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md) - Frontend details
