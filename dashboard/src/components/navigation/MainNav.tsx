/**
 * Main Navigation Component
 * 
 * Provides the primary navigation menu for switching between
 * Live Dispatch Feed, User Feed, Report an Incident, and Chat sections.
 */

import { cn } from '@/lib/utils';
import { Radio, Users, FileWarning, MessageSquare } from 'lucide-react';

export type ActiveView = 'dispatch' | 'feed' | 'report' | 'chat';

interface MainNavProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
}

const navItems: { id: ActiveView; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
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
  }
];

export function MainNav({ activeView, onViewChange }: MainNavProps) {
  return (
    <nav className="border-b border-white/10 bg-slate-900/50 backdrop-blur-sm">
      <div className="container">
        <div className="flex items-center gap-1 py-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap",
                  "hover:bg-white/10",
                  isActive 
                    ? "bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border border-purple-500/30" 
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4",
                  isActive ? "text-purple-400" : ""
                )} />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default MainNav;
