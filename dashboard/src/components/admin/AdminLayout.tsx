/**
 * Admin Layout Component
 * 
 * Main layout wrapper for all admin pages.
 * Includes sidebar navigation and admin header.
 * 
 * @author William Nelson
 * @created December 2025
 */

import { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  AlertTriangle, 
  Building2, 
  Mail, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export type AdminView = 
  | 'dashboard' 
  | 'users' 
  | 'incidents' 
  | 'agencies' 
  | 'email' 
  | 'audit' 
  | 'settings';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentView: AdminView;
  onViewChange: (view: AdminView) => void;
}

interface NavItem {
  id: AdminView;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const navItems: NavItem[] = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: <LayoutDashboard className="h-5 w-5" />,
    description: 'Overview and statistics'
  },
  { 
    id: 'users', 
    label: 'User Management', 
    icon: <Users className="h-5 w-5" />,
    description: 'Manage user accounts'
  },
  { 
    id: 'incidents', 
    label: 'Incident Reports', 
    icon: <AlertTriangle className="h-5 w-5" />,
    description: 'Review submitted reports'
  },
  { 
    id: 'agencies', 
    label: 'Agencies', 
    icon: <Building2 className="h-5 w-5" />,
    description: 'Configure agency settings'
  },
  { 
    id: 'email', 
    label: 'Email Notifications', 
    icon: <Mail className="h-5 w-5" />,
    description: 'Configure email alerts'
  },
  { 
    id: 'audit', 
    label: 'Audit Log', 
    icon: <Clock className="h-5 w-5" />,
    description: 'View admin activity'
  },
  { 
    id: 'settings', 
    label: 'System Settings', 
    icon: <Settings className="h-5 w-5" />,
    description: 'Global configuration'
  },
];

export function AdminLayout({ children, currentView, onViewChange }: AdminLayoutProps) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside 
        className={cn(
          "border-r border-border bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-14 items-center border-b border-border px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-semibold text-foreground">Admin Panel</span>
            </div>
          )}
          {collapsed && <Shield className="h-6 w-6 text-primary mx-auto" />}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={currentView === item.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10",
                  collapsed && "justify-center px-2"
                )}
                onClick={() => onViewChange(item.id)}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </Button>
            ))}
          </nav>
        </ScrollArea>

        {/* Collapse Toggle */}
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                {navItems.find(n => n.id === currentView)?.label || 'Admin'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {navItems.find(n => n.id === currentView)?.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {user?.role}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
