import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

interface AdminRouteProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

export function AdminRoute({ children, requireSuperAdmin = false }: AdminRouteProps) {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';
  const isSuperAdmin = user.role === 'super_admin';

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold text-destructive">
          {t('common.accessDenied')}
        </h1>
        <p className="text-muted-foreground">
          {t('admin.accessDeniedMessage')}
        </p>
      </div>
    );
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold text-destructive">
          {t('common.accessDenied')}
        </h1>
        <p className="text-muted-foreground">
          {t('admin.superAdminRequired')}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
