// App Sidebar - Main navigation component with simplified core + gated advanced
import { 
  LayoutDashboard, 
  FolderOpen, 
  Settings, 
  User,
  LogOut,
  Cloud,
  Shield,
  Users,
  Cog,
  Search,
  Bot,
  Brain,
  Sparkles,
  BarChart3,
  BookOpen,
  Activity,
  Database,
  ChevronDown,
  FlaskConical,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureFlags } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Badge } from '@/components/ui/badge';

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { showAdvanced, toggleAdvanced } = useFeatureFlags();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // CORE navigation - always visible, maps to clear user intent
  const coreNavItems = [
    { title: t('nav.dashboard'), url: '/dashboard', icon: LayoutDashboard },
    { title: t('nav.projects'), url: '/projects', icon: FolderOpen },
    { title: t('nav.search', 'Search'), url: '/search', icon: Search },
  ];

  // ADVANCED navigation - hidden by default, revealed on toggle
  const advancedNavItems = [
    { title: t('nav.training', 'Training'), url: '/training', icon: Bot },
    { title: t('nav.datasets', 'Datasets'), url: '/datasets', icon: Database },
    { title: t('nav.models', 'Models'), url: '/models', icon: Brain },
    { title: t('nav.templates', 'Templates'), url: '/templates', icon: Sparkles },
    { title: t('nav.analytics', 'Analytics'), url: '/analytics', icon: BarChart3 },
  ];

  // Learning always available
  const learnNavItems = [
    { title: t('nav.learn', 'Learn'), url: '/learn', icon: BookOpen },
  ];

  const settingsNavItems = [
    { title: t('nav.settings'), url: '/settings', icon: Settings },
  ];

  const adminNavItems = [
    { title: t('admin.nav.dashboard'), url: '/admin', icon: Shield },
    { title: t('admin.nav.metrics'), url: '/admin/metrics', icon: Activity },
    { title: t('admin.nav.users'), url: '/admin/users', icon: Users },
    { title: t('admin.nav.settings'), url: '/admin/settings', icon: Cog },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isAdvancedActive = advancedNavItems.some(item => 
    location.pathname === item.url || location.pathname.startsWith(item.url + '/')
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderNavItem = (item: { title: string; url: string; icon: React.ComponentType<{ className?: string }> }) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton
        asChild
        isActive={isActive(item.url)}
        tooltip={collapsed ? item.title : undefined}
      >
        <NavLink
          to={item.url}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
            isActive(item.url)
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Cloud className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-lg text-sidebar-foreground">
              FineFlow
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* CORE Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted">
            {!collapsed && 'Main'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreNavItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ADVANCED Navigation - Collapsible */}
        <SidebarGroup>
          <Collapsible open={showAdvanced || isAdvancedActive} onOpenChange={toggleAdvanced}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-sidebar-muted cursor-pointer hover:bg-sidebar-accent/50 rounded-md px-2 py-1 -mx-2 flex items-center justify-between">
                {!collapsed && (
                  <>
                    <span className="flex items-center gap-2">
                      <FlaskConical className="h-3.5 w-3.5" />
                      Advanced
                    </span>
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform",
                      (showAdvanced || isAdvancedActive) && "rotate-180"
                    )} />
                  </>
                )}
                {collapsed && <FlaskConical className="h-4 w-4 mx-auto" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent className="mt-1">
                <SidebarMenu>
                  {advancedNavItems.map(renderNavItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Learn */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {learnNavItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted">
            {!collapsed && t('nav.settings')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Navigation */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-muted">
              {!collapsed && t('admin.nav.admin')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url || location.pathname.startsWith(item.url + '/')}
                      tooltip={collapsed ? item.title : undefined}
                    >
                      <NavLink
                        to={item.url}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                          (location.pathname === item.url || location.pathname.startsWith(item.url + '/'))
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Language Switcher */}
        {!collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-muted">
              {t('settings.language')}
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <LanguageSwitcher />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 px-3 py-2 h-auto',
                collapsed && 'justify-center px-0'
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium text-sidebar-foreground">
                    {user?.name || 'User'}
                  </span>
                  <span className="text-xs text-sidebar-muted truncate max-w-[140px]">
                    {user?.email || 'user@example.com'}
                  </span>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <NavLink to="/settings" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('settings.profile')}
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="flex items-center gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              {t('auth.logout', 'Sign Out')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
