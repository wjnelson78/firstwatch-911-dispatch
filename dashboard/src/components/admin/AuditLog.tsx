/**
 * Audit Log Component
 * 
 * Displays admin activity and system events for accountability
 * and troubleshooting purposes.
 * 
 * @author William Nelson
 * @created December 2025
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Clock, 
  Search, 
  RefreshCw,
  User,
  FileText,
  AlertTriangle,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AuditLogEntry {
  id: number;
  action: string;
  targetType: string;
  targetId: string | number;
  details: Record<string, unknown> | null;
  createdAt: string;
  admin: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0
  });

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/audit-log?page=${page}&limit=25`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data.auditLogs || []);
        setPagination(data.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const getActionBadge = (action: string) => {
    const actionStyles: Record<string, string> = {
      'user_create': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'user_update': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'user_delete': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'user_deactivate': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'incident_update': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'incident_resolve': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'settings_update': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      'login': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    };
    
    return actionStyles[action] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  };

  const getActionIcon = (action: string) => {
    if (action.includes('user')) return <User className="h-4 w-4" />;
    if (action.includes('incident')) return <AlertTriangle className="h-4 w-4" />;
    if (action.includes('settings')) return <Settings className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        log.action.toLowerCase().includes(query) ||
        log.admin.email.toLowerCase().includes(query) ||
        log.admin.firstName?.toLowerCase().includes(query) ||
        log.admin.lastName?.toLowerCase().includes(query) ||
        log.targetType?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    
    if (actionFilter !== 'all') {
      if (!log.action.includes(actionFilter)) return false;
    }
    
    return true;
  });

  // Get unique actions for filter
  const uniqueActions = [...new Set(logs.map(log => log.action.split('_')[0]))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-7 w-7" />
            Audit Log
          </h1>
          <p className="text-muted-foreground mt-1">
            Track admin activity and system events
          </p>
        </div>
        <Button onClick={() => fetchLogs(pagination.page)} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pagination.total}</p>
                <p className="text-sm text-muted-foreground">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <User className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {logs.filter(l => l.action.includes('user')).length}
                </p>
                <p className="text-sm text-muted-foreground">User Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {logs.filter(l => l.action.includes('incident')).length}
                </p>
                <p className="text-sm text-muted-foreground">Incident Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActions.map(action => (
              <SelectItem key={action} value={action}>
                {action.charAt(0).toUpperCase() + action.slice(1)} Actions
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Log List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-semibold mb-2">No Audit Logs</h2>
            <p className="text-muted-foreground">
              {logs.length === 0 
                ? 'No admin activity has been recorded yet.'
                : 'No logs match your search criteria.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <Card key={log.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="p-2 rounded-lg bg-muted shrink-0">
                    {getActionIcon(log.action)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getActionBadge(log.action)} variant="secondary">
                        {formatAction(log.action)}
                      </Badge>
                      {log.targetType && (
                        <Badge variant="outline">
                          {log.targetType}: {log.targetId}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      <span>
                        {log.admin.firstName} {log.admin.lastName}
                      </span>
                      <span className="text-muted-foreground/50">
                        ({log.admin.email})
                      </span>
                    </div>
                    
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2 p-2 bg-muted rounded-md text-xs font-mono">
                        {JSON.stringify(log.details, null, 2)}
                      </div>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), 'PPp')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
