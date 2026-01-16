import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ResponsiveTable, Column } from '@/components/ui/responsive-table';
import { Edit, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AdminUser, AdminUsersResponse } from '@/services/adminService';
import { UserEditDialog } from './UserEditDialog';

interface UserTableProps {
  data?: AdminUsersResponse;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onRoleFilter: (role: string) => void;
  onTierFilter: (tier: string) => void;
  onStatusFilter: (status: string) => void;
  currentPage: number;
  search: string;
  roleFilter: string;
  tierFilter: string;
  statusFilter: string;
}

const roleColors: Record<string, string> = {
  user: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const tierColors: Record<string, string> = {
  free: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  starter: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  pro: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  enterprise: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function UserTable({
  data,
  isLoading,
  onPageChange,
  onSearchChange,
  onRoleFilter,
  onTierFilter,
  onStatusFilter,
  currentPage,
  search,
  roleFilter,
  tierFilter,
  statusFilter,
}: UserTableProps) {
  const { t } = useTranslation();
  const [editUser, setEditUser] = useState<AdminUser | null>(null);

  const users = data?.data || [];
  const totalPages = data?.totalPages || 1;

  const columns: Column<AdminUser>[] = [
    {
      key: 'name',
      header: t('auth.name'),
      priority: 1,
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatarUrl} alt={`${user.name}'s avatar`} />
            <AvatarFallback aria-hidden="true">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{user.name}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: t('auth.email'),
      priority: 2,
      hideOnMobile: true,
      render: (user) => (
        <span className="text-muted-foreground">{user.email}</span>
      ),
    },
    {
      key: 'role',
      header: t('admin.users.role'),
      priority: 3,
      render: (user) => (
        <Badge variant="secondary" className={roleColors[user.role]}>
          {user.role}
        </Badge>
      ),
    },
    {
      key: 'tier',
      header: t('admin.users.tier'),
      priority: 4,
      hideOnMobile: true,
      render: (user) => (
        <Badge variant="secondary" className={tierColors[user.subscriptionTier]}>
          {user.subscriptionTier}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: t('admin.users.status'),
      priority: 5,
      hideOnTablet: true,
      render: (user) => (
        <Badge variant="secondary" className={statusColors[user.status]}>
          {user.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: t('admin.users.actions'),
      alignRight: true,
      render: (user) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setEditUser(user);
          }}
          aria-label={t('admin.users.editUser', { name: user.name }) || `Edit ${user.name}`}
        >
          <Edit className="h-4 w-4" aria-hidden="true" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div 
        className="flex flex-col gap-4 sm:flex-row sm:items-center"
        role="search"
        aria-label={t('admin.users.filterUsers') || 'Filter users'}
      >
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder={t('admin.users.search')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="ps-9"
            aria-label={t('admin.users.searchPlaceholder') || 'Search users by name or email'}
          />
        </div>
        <Select value={roleFilter} onValueChange={onRoleFilter}>
          <SelectTrigger className="w-full sm:w-[150px]" aria-label={t('admin.users.filterRole') || 'Filter by role'}>
            <SelectValue placeholder={t('admin.users.filterRole')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={onTierFilter}>
          <SelectTrigger className="w-full sm:w-[150px]" aria-label={t('admin.users.filterTier') || 'Filter by tier'}>
            <SelectValue placeholder={t('admin.users.filterTier')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={onStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]" aria-label={t('admin.users.filterStatus') || 'Filter by status'}>
            <SelectValue placeholder={t('admin.users.filterStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Responsive Table */}
      <div className="rounded-md border">
        <ResponsiveTable
          data={users}
          columns={columns}
          getRowKey={(user) => user.id}
          isLoading={isLoading}
          emptyMessage={t('common.noResults')}
          aria-label={t('admin.users.userList') || 'User list'}
          caption="List of system users with their roles and status"
          cardLayoutOnMobile
        />
      </div>

      {/* Pagination */}
      <nav 
        className="flex flex-col sm:flex-row items-center justify-between gap-4"
        role="navigation"
        aria-label={t('common.pagination') || 'Pagination'}
      >
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t('common.page')} {currentPage} / {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label={t('common.previousPage') || 'Go to previous page'}
          >
            <ChevronLeft className="h-4 w-4 me-1" aria-hidden="true" />
            <span className="hidden sm:inline">{t('common.previous')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label={t('common.nextPage') || 'Go to next page'}
          >
            <span className="hidden sm:inline">{t('common.next')}</span>
            <ChevronRight className="h-4 w-4 ms-1" aria-hidden="true" />
          </Button>
        </div>
      </nav>

      {/* Edit Dialog */}
      {editUser && (
        <UserEditDialog
          user={editUser}
          open={!!editUser}
          onOpenChange={(open) => !open && setEditUser(null)}
        />
      )}
    </div>
  );
}
