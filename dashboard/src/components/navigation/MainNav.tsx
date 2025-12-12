/**
 * Main Navigation Component
 * 
 * Provides the primary navigation menu for switching between
 * Live Dispatch Feed, User Feed, Report an Incident, Chat, and Saved sections.
 */

import { cn } from '@/lib/utils';
import { Radio, Users, FileWarning, MessageSquare, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';

export type ActiveView = 'dispatch' | 'feed' | 'report' | 'chat' | 'saved';

interface MainNavProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
}

const navItems: { id: ActiveView; label: string; icon: React.ComponentType<{ className?: string }>; description: string; authRequired?: boolean }[] = [
  {
    id: 'dispatch',
    label: 'Live Dispatch',
    icon: Radio,
    description: 'Real-time 911 calls'
  },
  {
    id: 'feed',
    label: 'Community Feed',
    icon: Users,
    description: 'Community posts & updates'
  },
  {
    id: 'report',
    label: 'Report Incident',
    icon: FileWarning,
    description: 'Submit an incident report'
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: MessageSquare,
    description: 'Message users & agencies'
  },
  {
    id: 'saved',
    label: 'Saved',
    icon: Star,
    description: 'Your saved dispatches',
    authRequired: true
  }
];

export function MainNav({ activeView, onViewChange }: MainNavProps) {
  const { isAuthenticated } = useAuth();
  const { favoriteIds } = useFavorites();
  const savedCount = favoriteIds.size;

  return (
    <nav className="border-b border-white/10 bg-slate-900/50 backdrop-blur-sm">
      <div className="container">
        <div className="flex items-center gap-1 py-2 overflow-x-auto">
          {navItems.map((item) => {
            // Hide auth-required items if not authenticated
            if (item.authRequired && !isAuthenticated) return null;

            const Icon = item.icon;
            const isActive = activeView === item.id;
            const showBadge = item.id === 'saved' && savedCount > 0;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap relative",
                  "hover:bg-white/10",
                  isActive 
                    ? "bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border border-purple-500/30" 
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4",
                  isActive ? "text-purple-400" : "",
                  item.id === 'saved' && isActive ? "fill-yellow-400 text-yellow-400" : ""
                )} />
                <span className="font-medium text-sm">{item.label}</span>
                {showBadge && (
                  <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {savedCount > 99 ? '99+' : savedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
