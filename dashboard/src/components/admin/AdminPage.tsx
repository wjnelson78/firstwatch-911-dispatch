/**
 * Admin Page Component
 * 
 * Main container component for the admin interface.
 * Handles view routing and admin access control.
 * 
 * @author William Nelson
 * @created December 2025
 */

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AdminLayout, type AdminView } from './AdminLayout';
import { AdminDashboard } from './AdminDashboard';
import { UserManagement } from './UserManagement';
import { IncidentManagement } from './IncidentManagement';
import { AgencyManagement } from './AgencyManagement';
import { EmailNotifications } from './EmailNotifications';
import { AuditLog } from './AuditLog';
import { SystemSettings } from './SystemSettings';
import { useAdmin } from '@/contexts/AdminContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AdminPageProps {
  onExit?: () => void;
}

export function AdminPage({ onExit }: AdminPageProps) {
  const { isAdmin, loading } = useAdmin();
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Access denied if not admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You don't have permission to access the admin panel. 
              This area is restricted to administrators only.
            </p>
            {onExit && (
              <Button onClick={onExit} variant="outline" className="w-full">
                Return to Dashboard
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render admin interface
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'users':
        return <UserManagement />;
      case 'incidents':
        return <IncidentManagement />;
      case 'agencies':
        return <AgencyManagement />;
      case 'email':
        return <EmailNotifications />;
      case 'audit':
        return <AuditLog />;
      case 'settings':
        return <SystemSettings />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <AdminLayout currentView={currentView} onViewChange={setCurrentView}>
      {renderView()}
    </AdminLayout>
  );
}

export default AdminPage;
