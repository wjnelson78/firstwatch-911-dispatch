/**
 * System Settings Component
 * 
 * Global configuration settings for the dispatch monitoring system.
 * 
 * @author William Nelson
 * @created December 2025
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  RefreshCw,
  Save,
  AlertCircle,
  CheckCircle2,
  Clock,
  Shield,
  Database,
  Globe,
  Mail,
  Server
} from 'lucide-react';

interface SystemSettings {
  // General
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  
  // Dispatch
  refreshInterval: number;
  maxEventsPerPage: number;
  eventRetentionDays: number;
  
  // Notifications
  emailNotificationsEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpFromEmail: string;
  smtpFromName: string;
  
  // Security
  maxLoginAttempts: number;
  sessionTimeout: number;
  requireEmailVerification: boolean;
  
  // API
  apiRateLimit: number;
  apiEnabled: boolean;
}

const defaultSettings: SystemSettings = {
  siteName: 'Snohomish County 911 Dispatch',
  siteDescription: 'Real-time dispatch monitoring dashboard',
  maintenanceMode: false,
  refreshInterval: 30,
  maxEventsPerPage: 100,
  eventRetentionDays: 90,
  emailNotificationsEnabled: false,
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpFromEmail: '',
  smtpFromName: 'Dispatch Monitor',
  maxLoginAttempts: 5,
  sessionTimeout: 7,
  requireEmailVerification: false,
  apiRateLimit: 100,
  apiEnabled: true
};

export function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setSettings({ ...defaultSettings, ...data.settings });
      }
    } catch {
      // Use defaults if fetch fails
      console.log('Using default settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (key: keyof SystemSettings, value: unknown) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
        setHasChanges(false);
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  // Clear message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-7 w-7" />
            System Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure global system settings and preferences
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
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

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            General
          </CardTitle>
          <CardDescription>Basic site configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteName">Site Name</Label>
            <Input
              id="siteName"
              value={settings.siteName}
              onChange={(e) => handleChange('siteName', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteDescription">Site Description</Label>
            <Input
              id="siteDescription"
              value={settings.siteDescription}
              onChange={(e) => handleChange('siteDescription', e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Disable public access during maintenance
              </p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(checked: boolean) => handleChange('maintenanceMode', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dispatch Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Dispatch Feed
          </CardTitle>
          <CardDescription>Configure dispatch feed behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="refreshInterval">
                <Clock className="h-4 w-4 inline mr-1" />
                Refresh Interval (seconds)
              </Label>
              <Input
                id="refreshInterval"
                type="number"
                min={10}
                max={300}
                value={settings.refreshInterval}
                onChange={(e) => handleChange('refreshInterval', parseInt(e.target.value) || 30)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxEventsPerPage">Events Per Page</Label>
              <Input
                id="maxEventsPerPage"
                type="number"
                min={10}
                max={500}
                value={settings.maxEventsPerPage}
                onChange={(e) => handleChange('maxEventsPerPage', parseInt(e.target.value) || 100)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventRetentionDays">Event Retention (days)</Label>
              <Input
                id="eventRetentionDays"
                type="number"
                min={7}
                max={365}
                value={settings.eventRetentionDays}
                onChange={(e) => handleChange('eventRetentionDays', parseInt(e.target.value) || 90)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>Configure outgoing email settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send email alerts for incident reports
              </p>
            </div>
            <Switch
              checked={settings.emailNotificationsEnabled}
              onCheckedChange={(checked: boolean) => handleChange('emailNotificationsEnabled', checked)}
            />
          </div>
          
          {settings.emailNotificationsEnabled && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    placeholder="smtp.example.com"
                    value={settings.smtpHost}
                    onChange={(e) => handleChange('smtpHost', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={settings.smtpPort}
                    onChange={(e) => handleChange('smtpPort', parseInt(e.target.value) || 587)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">SMTP Username</Label>
                  <Input
                    id="smtpUser"
                    value={settings.smtpUser}
                    onChange={(e) => handleChange('smtpUser', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpFromEmail">From Email</Label>
                  <Input
                    id="smtpFromEmail"
                    type="email"
                    placeholder="noreply@example.com"
                    value={settings.smtpFromEmail}
                    onChange={(e) => handleChange('smtpFromEmail', e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="smtpFromName">From Name</Label>
                  <Input
                    id="smtpFromName"
                    placeholder="Dispatch Monitor"
                    value={settings.smtpFromName}
                    onChange={(e) => handleChange('smtpFromName', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Security and authentication settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                min={3}
                max={10}
                value={settings.maxLoginAttempts}
                onChange={(e) => handleChange('maxLoginAttempts', parseInt(e.target.value) || 5)}
              />
              <p className="text-xs text-muted-foreground">
                Lock account after this many failed attempts
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (days)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                min={1}
                max={30}
                value={settings.sessionTimeout}
                onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value) || 7)}
              />
              <p className="text-xs text-muted-foreground">
                Users will need to re-login after this period
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Email Verification</Label>
              <p className="text-sm text-muted-foreground">
                New users must verify their email address
              </p>
            </div>
            <Switch
              checked={settings.requireEmailVerification}
              onCheckedChange={(checked: boolean) => handleChange('requireEmailVerification', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* API Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            API
          </CardTitle>
          <CardDescription>API access and rate limiting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Public API</Label>
              <p className="text-sm text-muted-foreground">
                Allow external applications to access dispatch data
              </p>
            </div>
            <Switch
              checked={settings.apiEnabled}
              onCheckedChange={(checked: boolean) => handleChange('apiEnabled', checked)}
            />
          </div>
          {settings.apiEnabled && (
            <div className="space-y-2">
              <Label htmlFor="apiRateLimit">Rate Limit (requests/minute)</Label>
              <Input
                id="apiRateLimit"
                type="number"
                min={10}
                max={1000}
                value={settings.apiRateLimit}
                onChange={(e) => handleChange('apiRateLimit', parseInt(e.target.value) || 100)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button (bottom) */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            size="lg"
            className="shadow-lg"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save All Changes
          </Button>
        </div>
      )}
    </div>
  );
}
