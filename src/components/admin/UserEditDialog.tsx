import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslation } from 'react-i18next';
import { AdminUser } from '@/services/adminService';
import { useUpdateUser } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';

interface UserEditDialogProps {
  user: AdminUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserEditDialog({ user, open, onOpenChange }: UserEditDialogProps) {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const updateUser = useUpdateUser();
  
  const [role, setRole] = useState(user.role);
  const [tier, setTier] = useState(user.subscriptionTier);
  const [status, setStatus] = useState(user.status);
  const [showConfirm, setShowConfirm] = useState(false);

  // Check if current user is super_admin (from profile, not localStorage for security)
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const hasChanges = role !== user.role || tier !== user.subscriptionTier || status !== user.status;
  const hasRoleChange = role !== user.role;
  const hasSuspendChange = status !== user.status && status === 'suspended';

  const handleSave = () => {
    if (hasRoleChange || hasSuspendChange) {
      setShowConfirm(true);
    } else {
      performUpdate();
    }
  };

  const performUpdate = async () => {
    try {
      await updateUser.mutateAsync({
        userId: user.id,
        role: role !== user.role ? role : undefined,
        subscriptionTier: tier !== user.subscriptionTier ? tier : undefined,
        status: status !== user.status ? status : undefined,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.edit.title')}</DialogTitle>
            <DialogDescription>
              {user.name} ({user.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('admin.users.role')}</Label>
              <Select 
                value={role} 
                onValueChange={(value: 'user' | 'admin' | 'super_admin') => setRole(value)}
                disabled={!isSuperAdmin && (user.role === 'admin' || user.role === 'super_admin')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  {isSuperAdmin && (
                    <>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {!isSuperAdmin && (
                <p className="text-xs text-muted-foreground">
                  {t('admin.edit.roleRestriction')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('admin.users.tier')}</Label>
              <Select 
                value={tier} 
                onValueChange={(value: 'free' | 'starter' | 'pro' | 'enterprise') => setTier(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('admin.users.status')}</Label>
              <Select 
                value={status} 
                onValueChange={(value: 'active' | 'suspended') => setStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('admin.edit.cancel')}
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || updateUser.isPending}
            >
              {updateUser.isPending ? t('common.loading') : t('admin.edit.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {hasRoleChange && t('admin.edit.confirmRoleChange')}
              {hasSuspendChange && t('admin.edit.confirmSuspend')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={performUpdate}>
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
