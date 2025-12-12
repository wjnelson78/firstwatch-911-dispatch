/**
 * Admin Dashboard Component
 * 
 * Main dashboard view showing overview statistics for the admin panel.
 * Displays user stats, incident reports, feed activity, and dispatch metrics.
 * 
 * @author William Nelson
 * @created December 2025
 */

import { useEffect } from 'react';
import { 
  Users, 
  AlertTriangle, 
  MessageSquare, 
  Radio,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldAlert,
  UserPlus,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdmin } from '@/contexts/AdminContext';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  variant?: 'default' | 'warning' | 'danger' | 'success';
}

function StatCard({ title, value, description, icon, trend, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'bg-card',
    warning: 'bg-yellow-500/10 border-yellow-500/20',
    danger: 'bg-red-500/10 border-red-500/20',
    success: 'bg-green-500/10 border-green-500/20',
  };

  const iconStyles = {
    default: 'bg-primary/10 text-primary',
    warning: 'bg-yellow-500/20 text-yellow-600',
    danger: 'bg-red-500/20 text-red-600',
    success: 'bg-green-500/20 text-green-600',
  };

  return (
    <Card className={cn("transition-all hover:shadow-md", variantStyles[variant])}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-lg", iconStyles[variant])}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        {trend && (
          <div className="flex items-center mt-2 text-xs">
            {trend.positive ? (
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span className={trend.positive ? 'text-green-600' : 'text-red-600'}>
              {trend.value}
            </span>
            <span className="text-muted-foreground ml-1">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminDashboard() {
  const { dashboardStats, fetchDashboardStats, loading } = useAdmin();

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  if (loading && !dashboardStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = dashboardStats;

  return (
    <div className="space-y-6">
      {/* User Statistics */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={stats?.users.total_users || 0}
            description="Registered accounts"
            icon={<Users className="h-4 w-4" />}
            trend={{
              value: stats?.users.new_users_week || 0,
              label: "new this week",
              positive: true
            }}
          />
          <StatCard
            title="Active Users"
            value={stats?.users.active_users || 0}
            description="Accounts in good standing"
            icon={<UserPlus className="h-4 w-4" />}
            variant="success"
          />
          <StatCard
            title="Admins"
            value={stats?.users.admin_count || 0}
            description="Administrator accounts"
            icon={<ShieldAlert className="h-4 w-4" />}
          />
          <StatCard
            title="Online Today"
            value={stats?.users.users_logged_in_today || 0}
            description="Logged in last 24 hours"
            icon={<Clock className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Incident Reports */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Incident Reports
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Reports"
            value={stats?.incidents.total_reports || 0}
            description="All time submissions"
            icon={<AlertTriangle className="h-4 w-4" />}
            trend={{
              value: stats?.incidents.reports_this_week || 0,
              label: "this week",
              positive: true
            }}
          />
          <StatCard
            title="Pending Review"
            value={stats?.incidents.pending_reports || 0}
            description="Awaiting review"
            icon={<Clock className="h-4 w-4" />}
            variant={(stats?.incidents.pending_reports || 0) > 10 ? 'warning' : 'default'}
          />
          <StatCard
            title="Under Investigation"
            value={stats?.incidents.under_review || 0}
            description="Currently being reviewed"
            icon={<AlertCircle className="h-4 w-4" />}
          />
          <StatCard
            title="Critical"
            value={stats?.incidents.critical_reports || 0}
            description="High priority reports"
            icon={<ShieldAlert className="h-4 w-4" />}
            variant={(stats?.incidents.critical_reports || 0) > 0 ? 'danger' : 'default'}
          />
        </div>
      </div>

      {/* Feed & Dispatches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feed Activity */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Feed Activity
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Total Posts"
              value={stats?.feed.total_posts || 0}
              description="Community posts"
              icon={<MessageSquare className="h-4 w-4" />}
            />
            <StatCard
              title="Posts Today"
              value={stats?.feed.posts_today || 0}
              description="Last 24 hours"
              icon={<Clock className="h-4 w-4" />}
              variant="success"
            />
          </div>
        </div>

        {/* Dispatch Metrics */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Dispatch Metrics
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Total Dispatches"
              value={stats?.dispatches.total_dispatches || 0}
              description="Events tracked"
              icon={<Radio className="h-4 w-4" />}
            />
            <StatCard
              title="Agencies"
              value={stats?.dispatches.unique_agencies || 0}
              description="Active agencies"
              icon={<Users className="h-4 w-4" />}
            />
          </div>
        </div>
      </div>

      {/* Last Updated */}
      {stats?.generatedAt && (
        <p className="text-xs text-muted-foreground text-center">
          Dashboard data last updated: {new Date(stats.generatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

export default AdminDashboard;
