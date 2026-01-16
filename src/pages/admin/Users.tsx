import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminRoute } from '@/components/admin/AdminRoute';
import { UserTable } from '@/components/admin/UserTable';
import { useAdminUsers } from '@/hooks/useAdmin';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@/hooks/useDebounce';

export default function AdminUsers() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const debouncedSearch = useDebounce(search, 300);

  const params = useMemo(() => ({
    page,
    pageSize: 10,
    search: debouncedSearch || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
    tier: tierFilter !== 'all' ? tierFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  }), [page, debouncedSearch, roleFilter, tierFilter, statusFilter]);

  const { data, isLoading } = useAdminUsers(params);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleRoleFilter = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleTierFilter = (value: string) => {
    setTierFilter(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <AdminRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{t('admin.users.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('admin.users.subtitle')}
            </p>
          </div>

          <UserTable
            data={data}
            isLoading={isLoading}
            onPageChange={setPage}
            onSearchChange={handleSearchChange}
            onRoleFilter={handleRoleFilter}
            onTierFilter={handleTierFilter}
            onStatusFilter={handleStatusFilter}
            currentPage={page}
            search={search}
            roleFilter={roleFilter}
            tierFilter={tierFilter}
            statusFilter={statusFilter}
          />
        </div>
      </DashboardLayout>
    </AdminRoute>
  );
}
