/**
 * User Menu Component for 911 Dispatch Dashboard
 * 
 * Displays user avatar and dropdown menu with profile options,
 * preferences, and logout functionality.
 * 
 * @author William Nelson
 * @created December 2025
 * @license MIT
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { ProfileModal } from './ProfileModal';
import { FavoritesModal } from './FavoritesModal';
import { NotificationsModal } from './NotificationsModal';
import { SettingsModal } from './SettingsModal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  User, 
  LogOut, 
  Settings, 
  Bell, 
  Star,
  LogIn,
  UserPlus,
  ChevronDown 
} from 'lucide-react';

interface UserMenuProps {
  jurisdictions?: string[];
  callTypes?: string[];
  onApplyFilter?: (filter: { jurisdictions?: string[], callTypes?: string[] }) => void;
}

export function UserMenu({ jurisdictions = [], callTypes = [], onApplyFilter }: UserMenuProps) {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  
  // Modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleOpenLogin = () => {
    setAuthModalTab('login');
    setShowAuthModal(true);
  };

  const handleOpenRegister = () => {
    setAuthModalTab('register');
    setShowAuthModal(true);
  };

  const handleLogout = async () => {
    await logout();
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (!user) return '?';
    const first = user.firstName?.[0] || '';
    const last = user.lastName?.[0] || '';
    return (first + last).toUpperCase() || user.email[0].toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-700 animate-pulse" />
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenLogin}
            data-auth-trigger
            className="text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Sign In
          </Button>
          <Button
            size="sm"
            onClick={handleOpenRegister}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Sign Up
          </Button>
        </div>
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)}
          defaultTab={authModalTab}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 px-2 py-1 h-auto hover:bg-slate-800"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
              {getInitials()}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-sm text-white font-medium">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="text-xs text-slate-400">{user?.role}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-56 bg-slate-900 border-slate-700"
        >
          <DropdownMenuLabel className="text-slate-300">
            <div className="flex flex-col">
              <span>{user?.firstName} {user?.lastName}</span>
              <span className="text-xs font-normal text-slate-500">{user?.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-slate-700" />
          <DropdownMenuItem 
            onClick={() => setShowProfileModal(true)}
            className="text-slate-300 focus:bg-slate-800 focus:text-white cursor-pointer"
          >
            <User className="w-4 h-4 mr-2" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowFavoritesModal(true)}
            className="text-slate-300 focus:bg-slate-800 focus:text-white cursor-pointer"
          >
            <Star className="w-4 h-4 mr-2" />
            Favorites
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowNotificationsModal(true)}
            className="text-slate-300 focus:bg-slate-800 focus:text-white cursor-pointer"
          >
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowSettingsModal(true)}
            className="text-slate-300 focus:bg-slate-800 focus:text-white cursor-pointer"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-700" />
          <DropdownMenuItem 
            onClick={handleLogout}
            className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
      />

      {/* Favorites Modal */}
      <FavoritesModal 
        isOpen={showFavoritesModal} 
        onClose={() => setShowFavoritesModal(false)}
        jurisdictions={jurisdictions}
        callTypes={callTypes}
        onApplyFilter={onApplyFilter}
      />

      {/* Notifications Modal */}
      <NotificationsModal 
        isOpen={showNotificationsModal} 
        onClose={() => setShowNotificationsModal(false)} 
      />

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
      />
    </>
  );
}
