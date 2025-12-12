/**
 * Agency Management Component
 * 
 * Allows administrators to configure agency settings including
 * email notification addresses for incident reports.
 * 
 * @author William Nelson
 * @created December 2025
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Building2, 
  Search, 
  Mail, 
  Shield, 
  Flame, 
  Ambulance,
  RefreshCw,
  Settings,
  Save,
  AlertCircle,
  CheckCircle2,
  Edit2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Agency {
  name: string;
  agencyType: string;
  dispatchCount?: number;
  emailEnabled: boolean;
  emailAddresses: string[];
  contactName?: string;
  contactPhone?: string;
  notes?: string;
}

export function AgencyManagement() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    emailEnabled: false,
    emailAddresses: '',
    contactName: '',
    contactPhone: '',
    notes: ''
  });

  const fetchAgencies = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/agencies', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAgencies(data.agencies || []);
      }
    } catch (error) {
      console.error('Failed to fetch agencies:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgencies();
  }, [fetchAgencies]);

  const handleEditAgency = (agency: Agency) => {
    setSelectedAgency(agency);
    setEditForm({
      emailEnabled: agency.emailEnabled || false,
      emailAddresses: (agency.emailAddresses || []).join(', '),
      contactName: agency.contactName || '',
      contactPhone: agency.contactPhone || '',
      notes: agency.notes || ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveAgency = async () => {
    if (!selectedAgency) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/agencies/${encodeURIComponent(selectedAgency.name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          emailEnabled: editForm.emailEnabled,
          emailAddresses: editForm.emailAddresses.split(',').map(e => e.trim()).filter(e => e),
          contactName: editForm.contactName,
          contactPhone: editForm.contactPhone,
          notes: editForm.notes
        })
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Agency settings saved successfully' });
        setEditDialogOpen(false);
        fetchAgencies();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save agency settings' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save agency settings' });
    } finally {
      setSaving(false);
    }
  };

  const getAgencyIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'police':
        return <Shield className="h-5 w-5 text-blue-500" />;
      case 'fire':
        return <Flame className="h-5 w-5 text-orange-500" />;
      case 'ems':
        return <Ambulance className="h-5 w-5 text-green-500" />;
      default:
        return <Building2 className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAgencyTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'police':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'fire':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'ems':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const filteredAgencies = agencies.filter(agency =>
    agency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agency.agencyType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by type
  const groupedAgencies = filteredAgencies.reduce((acc, agency) => {
    const type = agency.agencyType?.toLowerCase() || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(agency);
    return acc;
  }, {} as Record<string, Agency[]>);

  // Clear message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-7 w-7" />
            Agency Configuration
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure agency contact information and email notification settings
          </p>
        </div>
        <Button onClick={fetchAgencies} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{agencies.length}</p>
                <p className="text-sm text-muted-foreground">Total Agencies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {agencies.filter(a => a.agencyType?.toLowerCase() === 'police').length}
                </p>
                <p className="text-sm text-muted-foreground">Police Agencies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {agencies.filter(a => a.agencyType?.toLowerCase() === 'fire').length}
                </p>
                <p className="text-sm text-muted-foreground">Fire Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Mail className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {agencies.filter(a => a.emailEnabled).length}
                </p>
                <p className="text-sm text-muted-foreground">Email Enabled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search agencies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Agency List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAgencies).map(([type, typeAgencies]) => (
            <div key={type}>
              <h2 className="text-lg font-semibold capitalize mb-3 flex items-center gap-2">
                {getAgencyIcon(type)}
                {type} ({typeAgencies.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {typeAgencies.map((agency) => (
                  <Card 
                    key={agency.name} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleEditAgency(agency)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {getAgencyIcon(agency.agencyType)}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate" title={agency.name}>
                              {agency.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getAgencyTypeColor(agency.agencyType)} variant="secondary">
                                {agency.agencyType || 'Other'}
                              </Badge>
                              {agency.emailEnabled && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <Mail className="h-3 w-3 mr-1" />
                                  Email
                                </Badge>
                              )}
                            </div>
                            {agency.dispatchCount !== undefined && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {agency.dispatchCount.toLocaleString()} dispatches
                              </p>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Agency Settings
            </DialogTitle>
            <DialogDescription>
              {selectedAgency?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Email Notifications Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="emailEnabled">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive incident report emails
                </p>
              </div>
              <Switch
                id="emailEnabled"
                checked={editForm.emailEnabled}
                onCheckedChange={(checked) => 
                  setEditForm(prev => ({ ...prev, emailEnabled: checked }))
                }
              />
            </div>

            {/* Email Addresses */}
            {editForm.emailEnabled && (
              <div className="space-y-2">
                <Label htmlFor="emailAddresses">Email Addresses</Label>
                <Input
                  id="emailAddresses"
                  placeholder="email1@agency.gov, email2@agency.gov"
                  value={editForm.emailAddresses}
                  onChange={(e) => 
                    setEditForm(prev => ({ ...prev, emailAddresses: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple emails with commas
                </p>
              </div>
            )}

            {/* Contact Name */}
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                placeholder="Agency contact person"
                value={editForm.contactName}
                onChange={(e) => 
                  setEditForm(prev => ({ ...prev, contactName: e.target.value }))
                }
              />
            </div>

            {/* Contact Phone */}
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                placeholder="(555) 123-4567"
                value={editForm.contactPhone}
                onChange={(e) => 
                  setEditForm(prev => ({ ...prev, contactPhone: e.target.value }))
                }
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                placeholder="Internal notes about this agency..."
                value={editForm.notes}
                onChange={(e) => 
                  setEditForm(prev => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAgency} disabled={saving}>
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
