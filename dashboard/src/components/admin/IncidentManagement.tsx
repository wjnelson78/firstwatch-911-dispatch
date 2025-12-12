/**
 * Incident Management Component
 * 
 * Admin interface for managing incident reports.
 * Allows viewing, filtering, and updating incident status.
 * 
 * @author William Nelson
 * @created December 2025
 */

import { useEffect, useState, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  AlertTriangle,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Building2
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdmin } from '@/contexts/AdminContext';

export function IncidentManagement() {
  const { 
    incidents, 
    incidentsPagination, 
    fetchIncidents, 
    updateIncident,
    loading,
    error 
  } = useAdmin();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedIncident, setSelectedIncident] = useState<typeof incidents[0] | null>(null);
  const [statusUpdateDialog, setStatusUpdateDialog] = useState<{
    open: boolean;
    incidentId: number;
    newStatus: string;
    adminNotes: string;
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

  // Fetch incidents when filters change
  useEffect(() => {
    fetchIncidents({
      page: 1,
      search: debouncedSearch || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      severity: severityFilter !== 'all' ? severityFilter : undefined
    });
  }, [fetchIncidents, debouncedSearch, statusFilter, severityFilter]);

  const handlePageChange = useCallback((page: number) => {
    fetchIncidents({
      page,
      search: debouncedSearch || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      severity: severityFilter !== 'all' ? severityFilter : undefined
    });
  }, [fetchIncidents, debouncedSearch, statusFilter, severityFilter]);

  const handleStatusChange = async (incidentId: number, newStatus: string) => {
    setStatusUpdateDialog({
      open: true,
      incidentId,
      newStatus,
      adminNotes: ''
    });
  };

  const confirmStatusChange = async () => {
    if (!statusUpdateDialog) return;
    
    setActionLoading(true);
    try {
      await updateIncident(statusUpdateDialog.incidentId, { 
        status: statusUpdateDialog.newStatus,
        adminNotes: statusUpdateDialog.adminNotes || undefined
      });
      setStatusUpdateDialog(null);
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
      submitted: { icon: Clock, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', label: 'Pending' },
      under_review: { icon: Eye, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Under Review' },
      investigating: { icon: AlertCircle, color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', label: 'Investigating' },
      resolved: { icon: CheckCircle, color: 'bg-green-500/10 text-green-600 border-green-500/20', label: 'Resolved' },
      dismissed: { icon: XCircle, color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', label: 'Dismissed' },
    };
    const config = statusConfig[status] || statusConfig.submitted;
    const IconComponent = config.icon;
    
    return (
      <Badge className={config.color}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string | null) => {
    if (!severity) return null;
    
    const severityConfig: Record<string, string> = {
      minor: 'bg-green-500/10 text-green-600 border-green-500/20',
      moderate: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      major: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      critical: 'bg-red-500/10 text-red-600 border-red-500/20',
    };
    
    return (
      <Badge className={severityConfig[severity] || severityConfig.minor}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
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
                placeholder="Search incidents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="submitted">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>

            {/* Severity Filter */}
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
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

      {/* Incidents Table */}
      <Card>
        <CardContent className="p-0">
          {loading && incidents.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mb-4 opacity-50" />
              <p>No incidents found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium text-sm">Incident</th>
                    <th className="text-left p-4 font-medium text-sm">Agency</th>
                    <th className="text-left p-4 font-medium text-sm">Severity</th>
                    <th className="text-left p-4 font-medium text-sm">Status</th>
                    <th className="text-left p-4 font-medium text-sm">Submitted</th>
                    <th className="text-right p-4 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {incidents.map((incident) => (
                    <tr 
                      key={incident.id} 
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedIncident(incident)}
                    >
                      <td className="p-4">
                        <div className="max-w-xs">
                          <p className="font-medium truncate">
                            {incident.title || incident.incidentType}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {incident.location}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[150px]">
                            {incident.targetAgency || 'Not specified'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        {getSeverityBadge(incident.severity)}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(incident.status)}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(incident.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedIncident(incident)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(incident.id, 'under_review')}
                              disabled={incident.status === 'under_review'}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Mark Under Review
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(incident.id, 'investigating')}
                              disabled={incident.status === 'investigating'}
                            >
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Mark Investigating
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(incident.id, 'resolved')}
                              disabled={incident.status === 'resolved'}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Resolved
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(incident.id, 'dismissed')}
                              disabled={incident.status === 'dismissed'}
                              className="text-red-600"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Dismiss
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
          {incidentsPagination && incidentsPagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {((incidentsPagination.page - 1) * incidentsPagination.limit) + 1} to{' '}
                {Math.min(incidentsPagination.page * incidentsPagination.limit, incidentsPagination.total)} of{' '}
                {incidentsPagination.total} incidents
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(incidentsPagination.page - 1)}
                  disabled={incidentsPagination.page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {incidentsPagination.page} of {incidentsPagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(incidentsPagination.page + 1)}
                  disabled={incidentsPagination.page === incidentsPagination.totalPages || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incident Detail Dialog */}
      <Dialog open={!!selectedIncident} onOpenChange={(open) => !open && setSelectedIncident(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Incident Report #{selectedIncident?.id}
            </DialogTitle>
          </DialogHeader>
          
          {selectedIncident && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                {/* Status & Severity */}
                <div className="flex items-center gap-4">
                  {getStatusBadge(selectedIncident.status)}
                  {getSeverityBadge(selectedIncident.severity)}
                  {selectedIncident.urgency && (
                    <Badge variant="outline">
                      Urgency: {selectedIncident.urgency}
                    </Badge>
                  )}
                </div>

                {/* Title & Type */}
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedIncident.title || selectedIncident.incidentType}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Type: {selectedIncident.incidentType}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Description</h4>
                  <p className="text-sm">{selectedIncident.description}</p>
                </div>

                {/* Location */}
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm">{selectedIncident.location}</p>
                  </div>
                </div>

                {/* Agency */}
                {selectedIncident.targetAgency && (
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm">{selectedIncident.targetAgency}</p>
                      <p className="text-xs text-muted-foreground">{selectedIncident.agencyType}</p>
                    </div>
                  </div>
                )}

                {/* Property Damage */}
                {selectedIncident.propertyDamage && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <h4 className="font-medium text-sm mb-2">Property Damage</h4>
                    {selectedIncident.damageDescription && (
                      <p className="text-sm">{selectedIncident.damageDescription}</p>
                    )}
                    {selectedIncident.estimatedDamageValue && (
                      <p className="text-sm text-muted-foreground">
                        Estimated: ${selectedIncident.estimatedDamageValue.toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Environmental Conditions */}
                {(selectedIncident.weatherConditions || selectedIncident.lightingConditions || selectedIncident.roadConditions) && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <h4 className="font-medium text-sm mb-2">Conditions</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {selectedIncident.weatherConditions && (
                        <div>
                          <span className="text-muted-foreground">Weather:</span>{' '}
                          {selectedIncident.weatherConditions}
                        </div>
                      )}
                      {selectedIncident.lightingConditions && (
                        <div>
                          <span className="text-muted-foreground">Lighting:</span>{' '}
                          {selectedIncident.lightingConditions}
                        </div>
                      )}
                      {selectedIncident.roadConditions && (
                        <div>
                          <span className="text-muted-foreground">Road:</span>{' '}
                          {selectedIncident.roadConditions}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Reporter */}
                {selectedIncident.reporter ? (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">
                        {selectedIncident.reporter.firstName} {selectedIncident.reporter.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{selectedIncident.reporter.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">Anonymous Report</span>
                  </div>
                )}

                {/* Timestamps */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Submitted: {new Date(selectedIncident.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedIncident(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={!!statusUpdateDialog?.open} onOpenChange={(open) => !open && setStatusUpdateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Incident Status</DialogTitle>
            <DialogDescription>
              Change the status to <strong>{statusUpdateDialog?.newStatus?.replace('_', ' ')}</strong>.
              You can optionally add admin notes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Admin Notes (optional)</label>
              <textarea
                placeholder="Add any notes about this status change..."
                value={statusUpdateDialog?.adminNotes || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStatusUpdateDialog(prev => 
                  prev ? { ...prev, adminNotes: e.target.value } : null
                )}
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusUpdateDialog(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmStatusChange}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default IncidentManagement;
