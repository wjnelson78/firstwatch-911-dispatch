/**
 * Profile Modal Component for 911 Dispatch Dashboard
 * 
 * Comprehensive user profile management with avatar, account details,
 * password change, and account statistics.
 * 
 * @author William Nelson
 * @created December 2025
 * @license MIT
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { changePassword } from '@/services/auth';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Clock, 
  Lock, 
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  Crown,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const getInitials = () => {
    if (!user) return '?';
    const first = user.firstName?.[0] || '';
    const last = user.lastName?.[0] || '';
    return (first + last).toUpperCase() || user.email[0].toUpperCase();
  };

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'admin':
        return (
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
            <Crown className="w-3 h-3 mr-1" />
            Administrator
          </Badge>
        );
      case 'moderator':
        return (
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
            <Shield className="w-3 h-3 mr-1" />
            Moderator
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-600 text-white border-0">
            <User className="w-3 h-3 mr-1" />
            Member
          </Badge>
        );
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setIsChangingPassword(true);

    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setTimeout(() => {
        logout();
        onClose();
      }, 2000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-900/95 border-slate-700/50 backdrop-blur-xl p-0 overflow-hidden">
        {/* Header with gradient background */}
        <div className="relative h-32 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 15h30M15 0v30' stroke='%23ffffff' stroke-opacity='0.3' fill='none'/%3E%3C/svg%3E\")" }} />
          <div className="absolute -bottom-12 left-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl border-4 border-slate-900">
              {getInitials()}
            </div>
          </div>
        </div>

        <div className="pt-14 px-6 pb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-slate-400 text-sm">{user?.email}</p>
            </div>
            {getRoleBadge()}
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'profile'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'security'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Security
            </button>
          </div>

          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Account Info Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Mail className="w-3 h-3" />
                    Email
                  </div>
                  <p className="text-white text-sm truncate">{user?.email}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Shield className="w-3 h-3" />
                    Role
                  </div>
                  <p className="text-white text-sm capitalize">{user?.role}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Calendar className="w-3 h-3" />
                    Member Since
                  </div>
                  <p className="text-white text-sm">
                    {user?.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Clock className="w-3 h-3" />
                    Last Login
                  </div>
                  <p className="text-white text-sm">
                    {user?.lastLogin ? format(new Date(user.lastLogin), 'MMM d, h:mm a') : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                <h4 className="text-sm font-medium text-white mb-3">Activity Overview</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">0</div>
                    <div className="text-xs text-slate-400">Saved Filters</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">0</div>
                    <div className="text-xs text-slate-400">Favorites</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">Active</div>
                    <div className="text-xs text-slate-400">Status</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Lock className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">Change Password</h4>
                    <p className="text-xs text-slate-400">Update your account password</p>
                  </div>
                </div>

                {passwordSuccess && (
                  <div className="flex items-center gap-2 p-3 mb-4 text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Password changed! Signing out...</span>
                  </div>
                )}

                {passwordError && (
                  <div className="flex items-center gap-2 p-3 mb-4 text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-3">
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="Current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="bg-slate-900/50 border-slate-600 text-white pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="New password (min. 8 characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-slate-900/50 border-slate-600 text-white pr-10"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-slate-900/50 border-slate-600 text-white"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={isChangingPassword}
                    className="w-full bg-blue-600 hover:bg-blue-500"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </form>
              </div>

              {/* Session Info */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <Activity className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">Active Session</h4>
                    <p className="text-xs text-slate-400">Current device</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">This browser</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    Active
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
