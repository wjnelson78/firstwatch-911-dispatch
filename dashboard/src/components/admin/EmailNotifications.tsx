/**
 * Email Notifications Component
 * 
 * Configure email notification rules and templates for incident reports.
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
import { Label } from '@/components/ui/label';
import { 
  Mail, 
  RefreshCw,
  Save,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  Send,
  AlertTriangle,
  Building2,
  Bell,
  FileText
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface NotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: 'incident_created' | 'incident_updated' | 'high_priority';
  agencyFilter?: string;
  recipients: string[];
  subject: string;
  template: string;
}

const defaultRules: NotificationRule[] = [
  {
    id: '1',
    name: 'New Incident Report',
    enabled: true,
    triggerType: 'incident_created',
    recipients: ['admin@example.com'],
    subject: 'New Incident Report Submitted',
    template: 'A new incident report has been submitted for {{agency}}.'
  },
  {
    id: '2',
    name: 'High Priority Incident',
    enabled: false,
    triggerType: 'high_priority',
    recipients: [],
    subject: 'URGENT: High Priority Incident',
    template: 'A high priority incident has been reported at {{location}}.'
  }
];

export function EmailNotifications() {
  const [rules, setRules] = useState<NotificationRule[]>(defaultRules);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/email-rules', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.rules && data.rules.length > 0) {
          setRules(data.rules);
        }
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    setRules(prev => prev.map(r => 
      r.id === ruleId ? { ...r, enabled } : r
    ));
    // Save to backend
    try {
      await fetch(`/api/admin/email-rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled })
      });
    } catch {
      // Revert on error
      setRules(prev => prev.map(r => 
        r.id === ruleId ? { ...r, enabled: !enabled } : r
      ));
    }
  };

  const handleEditRule = (rule: NotificationRule) => {
    setEditingRule({ ...rule });
    setDialogOpen(true);
  };

  const handleNewRule = () => {
    setEditingRule({
      id: `new-${Date.now()}`,
      name: 'New Rule',
      enabled: false,
      triggerType: 'incident_created',
      recipients: [],
      subject: '',
      template: ''
    });
    setDialogOpen(true);
  };

  const handleSaveRule = async () => {
    if (!editingRule) return;
    
    setSaving(true);
    try {
      const isNew = editingRule.id.startsWith('new-');
      const url = isNew 
        ? '/api/admin/email-rules' 
        : `/api/admin/email-rules/${editingRule.id}`;
      
      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingRule)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (isNew) {
          setRules(prev => [...prev, { ...editingRule, id: data.id || editingRule.id }]);
        } else {
          setRules(prev => prev.map(r => r.id === editingRule.id ? editingRule : r));
        }
        setMessage({ type: 'success', text: 'Rule saved successfully' });
        setDialogOpen(false);
      } else {
        setMessage({ type: 'error', text: 'Failed to save rule' });
      }
    } catch {
      // For demo, just update locally
      setRules(prev => {
        const exists = prev.find(r => r.id === editingRule.id);
        if (exists) {
          return prev.map(r => r.id === editingRule.id ? editingRule : r);
        }
        return [...prev, editingRule];
      });
      setMessage({ type: 'success', text: 'Rule saved (local only - no backend configured)' });
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    
    try {
      await fetch(`/api/admin/email-rules/${ruleId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
    } catch {
      // Continue anyway for demo
    }
    setRules(prev => prev.filter(r => r.id !== ruleId));
    setMessage({ type: 'success', text: 'Rule deleted' });
  };

  const handleTestEmail = async () => {
    setTestSending(true);
    try {
      const response = await fetch('/api/admin/email-test', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Test email sent successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to send test email. Check SMTP settings.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to send test email. Check SMTP settings.' });
    } finally {
      setTestSending(false);
    }
  };

  const getTriggerLabel = (trigger: string) => {
    switch (trigger) {
      case 'incident_created': return 'New Incident';
      case 'incident_updated': return 'Incident Updated';
      case 'high_priority': return 'High Priority';
      default: return trigger;
    }
  };

  const getTriggerColor = (trigger: string) => {
    switch (trigger) {
      case 'incident_created': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'incident_updated': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'high_priority': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
            <Mail className="h-7 w-7" />
            Email Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure automated email alerts and notification rules
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleTestEmail}
            disabled={testSending}
          >
            {testSending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Test Email
          </Button>
          <Button onClick={handleNewRule}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rules.length}</p>
                <p className="text-sm text-muted-foreground">Total Rules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rules.filter(r => r.enabled).length}</p>
                <p className="text-sm text-muted-foreground">Active Rules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Bell className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {rules.filter(r => r.triggerType === 'incident_created').length}
                </p>
                <p className="text-sm text-muted-foreground">Incident Rules</p>
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
                  {rules.filter(r => r.triggerType === 'high_priority').length}
                </p>
                <p className="text-sm text-muted-foreground">Priority Rules</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-semibold mb-2">No Notification Rules</h2>
            <p className="text-muted-foreground mb-4">
              Create rules to automatically send emails when events occur.
            </p>
            <Button onClick={handleNewRule}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <Card key={rule.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 rounded-lg bg-muted">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{rule.name}</h3>
                        <Badge className={getTriggerColor(rule.triggerType)} variant="secondary">
                          {getTriggerLabel(rule.triggerType)}
                        </Badge>
                        {!rule.enabled && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {rule.subject}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{rule.recipients.length} recipient(s)</span>
                        {rule.agencyFilter && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {rule.agencyFilter}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked: boolean) => handleToggleRule(rule.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditRule(rule)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRule?.id.startsWith('new-') ? 'Create Rule' : 'Edit Rule'}
            </DialogTitle>
            <DialogDescription>
              Configure when and how emails are sent
            </DialogDescription>
          </DialogHeader>

          {editingRule && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ruleName">Rule Name</Label>
                <Input
                  id="ruleName"
                  value={editingRule.name}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="triggerType">Trigger</Label>
                <Select
                  value={editingRule.triggerType}
                  onValueChange={(value: NotificationRule['triggerType']) => 
                    setEditingRule({ ...editingRule, triggerType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incident_created">New Incident Report</SelectItem>
                    <SelectItem value="incident_updated">Incident Updated</SelectItem>
                    <SelectItem value="high_priority">High Priority Incident</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipients">Recipients (comma-separated)</Label>
                <Input
                  id="recipients"
                  placeholder="email1@example.com, email2@example.com"
                  value={editingRule.recipients.join(', ')}
                  onChange={(e) => setEditingRule({ 
                    ...editingRule, 
                    recipients: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  value={editingRule.subject}
                  onChange={(e) => setEditingRule({ ...editingRule, subject: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template">Email Template</Label>
                <textarea
                  id="template"
                  className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                  placeholder="Use {{agency}}, {{location}}, {{type}} as placeholders..."
                  value={editingRule.template}
                  onChange={(e) => setEditingRule({ ...editingRule, template: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Available variables: {'{{agency}}'}, {'{{location}}'}, {'{{type}}'}, {'{{reporter}}'}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label>Enabled</Label>
                <Switch
                  checked={editingRule.enabled}
                  onCheckedChange={(checked: boolean) => setEditingRule({ ...editingRule, enabled: checked })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRule} disabled={saving}>
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
