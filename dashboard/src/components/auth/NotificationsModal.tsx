/**
 * Notifications Modal Component for 911 Dispatch Dashboard
 * 
 * Manage notification preferences including browser alerts, sound alerts,
 * specific call type notifications, and jurisdiction-based alerts.
 * 
 * @author William Nelson
 * @created December 2025
 * @license MIT
 */

import { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell,
  BellOff,
  BellRing,
  Volume2,
  VolumeX,
  AlertTriangle,
  Clock,
  Smartphone,
  Monitor,
  Check,
  X,
  Zap,
  Shield,
  Flame,
  Heart,
  Car,
  Info
} from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NotificationSettings {
  browserNotifications: boolean;
  soundAlerts: boolean;
  soundVolume: number;
  desktopAlerts: boolean;
  criticalOnly: boolean;
  alertCategories: {
    fire: boolean;
    medical: boolean;
    accident: boolean;
    crime: boolean;
    other: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  jurisdictionAlerts: string[];
}

const defaultSettings: NotificationSettings = {
  browserNotifications: false,
  soundAlerts: false,
  soundVolume: 50,
  desktopAlerts: false,
  criticalOnly: false,
  alertCategories: {
    fire: true,
    medical: true,
    accident: true,
    crime: true,
    other: false
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00'
  },
  jurisdictionAlerts: []
};

// Toggle Switch Component - defined outside main component
function ToggleSwitch({ 
  enabled, 
  onToggle, 
  disabled = false 
}: { 
  enabled: boolean; 
  onToggle: () => void; 
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      title={enabled ? 'Disable' : 'Enable'}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${
        enabled 
          ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
          : 'bg-slate-700'
      }`}
    >
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-lg transition-transform duration-300 ${
        enabled ? 'translate-x-6' : 'translate-x-0'
      }`} />
    </button>
  );
}

// Category Card Component - defined outside main component
function CategoryCard({ 
  icon: Icon, 
  label, 
  colorClass, 
  enabled, 
  onToggle 
}: { 
  icon: LucideIcon; 
  label: string; 
  colorClass: string; 
  enabled: boolean; 
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
        enabled
          ? `${colorClass} border-current/30`
          : 'bg-slate-800/30 border-slate-700/50 opacity-50'
      }`}
    >
      <div className={`p-3 rounded-lg mb-2 transition-all ${
        enabled ? 'bg-white/10' : 'bg-slate-700/50'
      }`}>
        <Icon className={`w-6 h-6 ${enabled ? 'text-white' : 'text-slate-400'}`} />
      </div>
      <span className={`text-sm font-medium ${enabled ? 'text-white' : 'text-slate-400'}`}>
        {label}
      </span>
      <div className={`mt-2 w-6 h-6 rounded-full flex items-center justify-center ${
        enabled ? 'bg-green-500' : 'bg-slate-600'
      }`}>
        {enabled ? <Check className="w-4 h-4 text-white" /> : <X className="w-4 h-4 text-slate-400" />}
      </div>
    </button>
  );
}

export function NotificationsModal({ isOpen, onClose }: NotificationsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'categories' | 'schedule'>('general');
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const stored = localStorage.getItem('notificationSettings');
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  });
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() => {
    if ('Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
  }, [settings]);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      if (permission === 'granted') {
        setSettings(prev => ({ ...prev, browserNotifications: true }));
        // Show test notification
        new Notification('🚨 Notifications Enabled', {
          body: 'You will now receive dispatch alerts',
          icon: '/favicon.ico'
        });
      }
    }
  };

  const playTestSound = () => {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = settings.soundVolume / 100;
    
    oscillator.start();
    setTimeout(() => oscillator.stop(), 200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-900/95 border-slate-700/50 backdrop-blur-xl p-0 overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
              <Bell className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Notifications</h2>
              <p className="text-sm text-slate-400">Stay informed about dispatch activity</p>
            </div>
          </div>
        </div>

        {/* Permission Banner */}
        {permissionStatus !== 'granted' && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <BellOff className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-amber-300">Notifications Disabled</h4>
                <p className="text-xs text-amber-400/70 mt-1">
                  Enable browser notifications to receive real-time dispatch alerts
                </p>
                <Button
                  size="sm"
                  onClick={requestPermission}
                  className="mt-3 bg-amber-600 hover:bg-amber-500 text-white"
                >
                  <BellRing className="w-4 h-4 mr-2" />
                  Enable Notifications
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'general'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Bell className="w-4 h-4" />
              General
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'categories'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Zap className="w-4 h-4" />
              Categories
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'schedule'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg shadow-green-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Clock className="w-4 h-4" />
              Schedule
            </button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 pt-4 space-y-4">
            {activeTab === 'general' && (
              <>
                {/* Browser Notifications */}
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <Monitor className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-white">Browser Notifications</h4>
                        <p className="text-xs text-slate-400">Show desktop alerts for new dispatches</p>
                      </div>
                    </div>
                    <ToggleSwitch
                      enabled={settings.browserNotifications}
                      onToggle={() => {
                        if (!settings.browserNotifications && permissionStatus !== 'granted') {
                          requestPermission();
                        } else {
                          setSettings(prev => ({ ...prev, browserNotifications: !prev.browserNotifications }));
                        }
                      }}
                      disabled={permissionStatus === 'denied'}
                    />
                  </div>
                </div>

                {/* Sound Alerts */}
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/20">
                        {settings.soundAlerts ? <Volume2 className="w-5 h-5 text-purple-400" /> : <VolumeX className="w-5 h-5 text-purple-400" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-white">Sound Alerts</h4>
                        <p className="text-xs text-slate-400">Play audio for new dispatches</p>
                      </div>
                    </div>
                    <ToggleSwitch
                      enabled={settings.soundAlerts}
                      onToggle={() => setSettings(prev => ({ ...prev, soundAlerts: !prev.soundAlerts }))}
                    />
                  </div>
                  
                  {settings.soundAlerts && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">Volume</span>
                        <span className="text-xs text-slate-400">{settings.soundVolume}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={settings.soundVolume}
                          onChange={(e) => setSettings(prev => ({ ...prev, soundVolume: parseInt(e.target.value) }))}
                          className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                          title="Volume"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={playTestSound}
                          className="border-slate-600 text-slate-300 hover:text-white"
                        >
                          Test
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Critical Only */}
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-500/20">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-white">Critical Events Only</h4>
                        <p className="text-xs text-slate-400">Only alert for high-priority dispatches</p>
                      </div>
                    </div>
                    <ToggleSwitch
                      enabled={settings.criticalOnly}
                      onToggle={() => setSettings(prev => ({ ...prev, criticalOnly: !prev.criticalOnly }))}
                    />
                  </div>
                </div>

                {/* Status Badge */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-slate-800/50 to-slate-800/30 border border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Notification Status</span>
                    {settings.browserNotifications || settings.soundAlerts ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <BellRing className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-600/50 text-slate-400 border-slate-500/30">
                        <BellOff className="w-3 h-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'categories' && (
              <>
                <div className="text-sm text-slate-400 mb-4">
                  Select which types of incidents you want to be notified about
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <CategoryCard
                    icon={Flame}
                    label="Fire"
                    colorClass="bg-red-500/10 text-red-400"
                    enabled={settings.alertCategories.fire}
                    onToggle={() => setSettings(prev => ({
                      ...prev,
                      alertCategories: { ...prev.alertCategories, fire: !prev.alertCategories.fire }
                    }))}
                  />
                  <CategoryCard
                    icon={Heart}
                    label="Medical"
                    colorClass="bg-blue-500/10 text-blue-400"
                    enabled={settings.alertCategories.medical}
                    onToggle={() => setSettings(prev => ({
                      ...prev,
                      alertCategories: { ...prev.alertCategories, medical: !prev.alertCategories.medical }
                    }))}
                  />
                  <CategoryCard
                    icon={Car}
                    label="Accident"
                    colorClass="bg-amber-500/10 text-amber-400"
                    enabled={settings.alertCategories.accident}
                    onToggle={() => setSettings(prev => ({
                      ...prev,
                      alertCategories: { ...prev.alertCategories, accident: !prev.alertCategories.accident }
                    }))}
                  />
                  <CategoryCard
                    icon={Shield}
                    label="Crime"
                    colorClass="bg-purple-500/10 text-purple-400"
                    enabled={settings.alertCategories.crime}
                    onToggle={() => setSettings(prev => ({
                      ...prev,
                      alertCategories: { ...prev.alertCategories, crime: !prev.alertCategories.crime }
                    }))}
                  />
                  <CategoryCard
                    icon={Info}
                    label="Other"
                    colorClass="bg-slate-500/10 text-slate-400"
                    enabled={settings.alertCategories.other}
                    onToggle={() => setSettings(prev => ({
                      ...prev,
                      alertCategories: { ...prev.alertCategories, other: !prev.alertCategories.other }
                    }))}
                  />
                </div>

                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 mt-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-300">
                      Categories are automatically detected based on call type keywords. 
                      Enable the types you&apos;re most interested in monitoring.
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'schedule' && (
              <>
                {/* Quiet Hours */}
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-500/20">
                        <Clock className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-white">Quiet Hours</h4>
                        <p className="text-xs text-slate-400">Pause notifications during specific times</p>
                      </div>
                    </div>
                    <ToggleSwitch
                      enabled={settings.quietHours.enabled}
                      onToggle={() => setSettings(prev => ({
                        ...prev,
                        quietHours: { ...prev.quietHours, enabled: !prev.quietHours.enabled }
                      }))}
                    />
                  </div>

                  {settings.quietHours.enabled && (
                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-700/50">
                      <div>
                        <label className="block text-xs text-slate-400 mb-2">Start Time</label>
                        <input
                          type="time"
                          value={settings.quietHours.start}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            quietHours: { ...prev.quietHours, start: e.target.value }
                          }))}
                          className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-600 text-white text-sm"
                          title="Start time"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-2">End Time</label>
                        <input
                          type="time"
                          value={settings.quietHours.end}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            quietHours: { ...prev.quietHours, end: e.target.value }
                          }))}
                          className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-600 text-white text-sm"
                          title="End time"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Schedule Preview */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-slate-800/50 to-slate-800/30 border border-slate-700/50">
                  <h4 className="text-sm font-medium text-white mb-3">Your Schedule</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Active Notifications</span>
                      <span className="text-white">
                        {settings.quietHours.enabled 
                          ? `${settings.quietHours.end} - ${settings.quietHours.start}`
                          : '24/7'
                        }
                      </span>
                    </div>
                    {settings.quietHours.enabled && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Quiet Period</span>
                        <span className="text-indigo-400">
                          {settings.quietHours.start} - {settings.quietHours.end}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Future Feature Teaser */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30">
                  <div className="flex items-center gap-3 mb-2">
                    <Smartphone className="w-5 h-5 text-purple-400" />
                    <h4 className="text-sm font-medium text-white">Coming Soon</h4>
                  </div>
                  <p className="text-xs text-slate-400">
                    Mobile push notifications and SMS alerts will be available in a future update.
                  </p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
