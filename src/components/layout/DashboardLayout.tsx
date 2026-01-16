// Dashboard layout with sidebar
import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { GlobalSearch } from '@/components/search/GlobalSearch';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function DashboardLayout({ 
  children, 
  title, 
  description,
  actions 
}: DashboardLayoutProps) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Skip Links - Hidden but accessible to screen readers and keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          {/* Header */}
          <header
            role="banner"
            className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6"
          >
            <SidebarTrigger className="-ml-2" />

            <div className="flex flex-1 items-center justify-between">
              <div>
                {title && (
                  <h1 className="text-lg font-semibold text-foreground">{title}</h1>
                )}
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>

              <div className="flex items-center gap-2" role="toolbar" aria-label="Header actions">
                {actions}
                <GlobalSearch />
                <NotificationDropdown />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                  aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
                >
                  {resolvedTheme === 'dark' ? (
                    <Sun className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Moon className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main
            id="main-content"
            role="main"
            aria-label="Main content"
            className="flex-1 p-6"
            tabIndex={-1}
          >
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
