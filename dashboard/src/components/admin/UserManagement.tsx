/**
 * User Management Component
 * 
 * Admin interface for managing user accounts.
 * Allows viewing, searching, filtering, and modifying users.
 * 
 * @author William Nelson
 * @created December 2025
 */

import { useEffect, useState, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Shield, 
  ShieldCheck, 
  User as UserIcon,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAdmin } from '@/contexts/AdminContext';

export function UserManagement() {
  const { 
    users, 
    usersPagination, 
    fetchUsers, 
    updateUser, 
    deleteUser,
    loading,
    error 
  } = useAdmin();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'role' | 'deactivate';
    userId: number;
    userName: string;
    newRole?: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch users when filters change
  useEffect(() => {
    fetchUsers({
      page: 1,
      search: debouncedSearch || undefined,
      role: roleFilter !== 'all' ? roleFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined
    });
  }, [fetchUsers, debouncedSearch, roleFilter, statusFilter]);

  const handlePageChange = useCallback((page: number) => {
    fetchUsers({
      page,
      search: debouncedSearch || undefined,
      role: roleFilter !== 'all' ? roleFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined
    });
  }, [fetchUsers, debouncedSearch, roleFilter, statusFilter]);

  const handleRoleChange = async (userId: number, newRole: string, userName: string) => {
    setConfirmDialog({
      open: true,
      type: 'role',
      userId,
      userName,
      newRole
    });
  };

  const handleDeactivate = async (userId: number, userName: string) => {
    setConfirmDialog({
      open: true,
      type: 'deactivate',
      userId,
      userName
    });
  };

  const confirmAction = async () => {
    if (!confirmDialog) return;
    
    setActionLoading(true);
    try {
      if (confirmDialog.type === 'role' && confirmDialog.newRole) {
        await updateUser(confirmDialog.userId, { role: confirmDialog.newRole });
      } else if (confirmDialog.type === 'deactivate') {
        await deleteUser(confirmDialog.userId);
      }
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setActionLoading(false);
      setConfirmDialog(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><ShieldCheck className="h-3 w-3 mr-1" />Admin</Badge>;
      case 'moderator':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Shield className="h-3 w-3 mr-1" />Moderator</Badge>;
      default:
        return <Badge variant="secondary"><UserIcon className="h-3 w-3 mr-1" />User</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
        <UserCheck className="h-3 w-3 mr-1" />Active
      </Badge>
    ) : (
      <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">
        <UserX className="h-3 w-3 mr-1" />Inactive
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="moderator">Moderators</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-600">
          {error}
        </div>
      )}

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <UserIcon className="h-12 w-12 mb-4 opacity-50" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium text-sm">User</th>
                    <th className="text-left p-4 font-medium text-sm">Role</th>
                    <th className="text-left p-4 font-medium text-sm">Status</th>
                    <th className="text-left p-4 font-medium text-sm">Joined</th>
                    <th className="text-left p-4 font-medium text-sm">Last Login</th>
                    <th className="text-right p-4 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(user.isActive)}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {user.lastLogin 
                          ? new Date(user.lastLogin).toLocaleDateString()
                          : 'Never'
                        }
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleRoleChange(user.id, 'user', `${user.firstName} ${user.lastName}`)}
                              disabled={user.role === 'user'}
                            >
                              <UserIcon className="h-4 w-4 mr-2" />
                              Set as User
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleRoleChange(user.id, 'moderator', `${user.firstName} ${user.lastName}`)}
                              disabled={user.role === 'moderator'}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Set as Moderator
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleRoleChange(user.id, 'admin', `${user.firstName} ${user.lastName}`)}
                              disabled={user.role === 'admin'}
                            >
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              Set as Admin
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeactivate(user.id, `${user.firstName} ${user.lastName}`)}
                              className="text-red-600"
                              disabled={!user.isActive}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Deactivate Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {usersPagination && usersPagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {((usersPagination.page - 1) * usersPagination.limit) + 1} to{' '}
                {Math.min(usersPagination.page * usersPagination.limit, usersPagination.total)} of{' '}
                {usersPagination.total} users
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(usersPagination.page - 1)}
                  disabled={usersPagination.page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {usersPagination.page} of {usersPagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(usersPagination.page + 1)}
                  disabled={usersPagination.page === usersPagination.totalPages || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDialog?.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.type === 'role' ? 'Change User Role' : 'Deactivate Account'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.type === 'role' ? (
                <>
                  Are you sure you want to change <strong>{confirmDialog?.userName}</strong>'s 
                  role to <strong>{confirmDialog?.newRole}</strong>?
                </>
              ) : (
                <>
                  Are you sure you want to deactivate <strong>{confirmDialog?.userName}</strong>'s account? 
                  They will no longer be able to log in.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog?.type === 'deactivate' ? 'destructive' : 'default'}
              onClick={confirmAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UserManagement;
