/**
 * Settings Modal Component for 911 Dispatch Dashboard
 * 
 * Comprehensive settings panel for display preferences, data refresh,
 * map settings, accessibility options, and data management.
 * 
 * @author William Nelson
 * @created December 2025
 * @license MIT
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Settings,
  Palette,
  Monitor,
  RefreshCw,
  Layout,
  Eye,
  Moon,
  Sun,
  Sparkles,
  Database,
  Download,
  Trash2,
  Check,
  Info,
  Gauge,
  Clock,
  Grid,
  List,
  Map,
  Type,
  Accessibility,
  Volume2,
  RotateCcw
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: AppSettings) => void;
}

interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  refreshInterval: number;
  autoRefresh: boolean;
  defaultView: 'grid' | 'list' | 'map';
  itemsPerPage: number;
  showAnimations: boolean;
  compactMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
  reducedMotion: boolean;
  hapticFeedback: boolean;
  soundEffects: boolean;
  dateFormat: '12h' | '24h';
  timezone: string;
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  accentColor: '#3b82f6',
  refreshInterval: 30,
  autoRefresh: true,
  defaultView: 'grid',
  itemsPerPage: 50,
  showAnimations: true,
  compactMode: false,
  fontSize: 'medium',
  highContrast: false,
  reducedMotion: false,
  hapticFeedback: true,
  soundEffects: false,
  dateFormat: '12h',
  timezone: 'America/Los_Angeles'
};

const accentColors = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Amber', value: '#f59e0b' }
];

// Toggle Switch Component
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

export function SettingsModal({ isOpen, onClose, onSettingsChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'appearance' | 'data' | 'accessibility'>('appearance');
  const [settings, setSettings] = useState<AppSettings>(() => {
    const stored = localStorage.getItem('appSettings');
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Save settings to localStorage and notify parent
  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  const clearAllData = () => {
    if (confirm('This will clear all saved preferences, favorites, and cached data. Continue?')) {
      localStorage.clear();
      setSettings(defaultSettings);
      window.location.reload();
    }
  };

  const exportSettings = () => {
    const data = {
      settings,
      favorites: {
        jurisdictions: localStorage.getItem('favoriteJurisdictions'),
        callTypes: localStorage.getItem('favoriteCallTypes'),
        savedFilters: localStorage.getItem('savedFilters')
      },
      notifications: localStorage.getItem('notificationSettings'),
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snoco-dispatch-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl bg-slate-900/95 border-slate-700/50 backdrop-blur-xl p-0 overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-slate-500/20 to-slate-600/20 border border-slate-500/30">
                <Settings className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Settings</h2>
                <p className="text-sm text-slate-400">Customize your dashboard experience</p>
              </div>
            </div>
            {hasChanges && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <Check className="w-3 h-3 mr-1" />
                Saved
              </Badge>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl">
            <button
              onClick={() => setActiveTab('appearance')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'appearance'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Palette className="w-4 h-4" />
              Appearance
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'data'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Database className="w-4 h-4" />
              Data
            </button>
            <button
              onClick={() => setActiveTab('accessibility')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'accessibility'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg shadow-green-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Accessibility className="w-4 h-4" />
              Accessibility
            </button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-96">
          <div className="p-6 pt-4 space-y-4">
            {activeTab === 'appearance' && (
              <>
                {/* Theme Selection */}
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-slate-400" />
                    Theme
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'dark', icon: Moon, label: 'Dark' },
                      { value: 'light', icon: Sun, label: 'Light' },
                      { value: 'system', icon: Monitor, label: 'System' }
                    ].map(({ value, icon: Icon, label }) => (
                      <button
                        key={value}
                        onClick={() => updateSetting('theme', value as 'dark' | 'light' | 'system')}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                          settings.theme === value
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                            : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Color */}
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-slate-400" />
                    Accent Color
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {accentColors.map(({ name, value }) => (
                      <button
                        key={value}
                        onClick={() => updateSetting('accentColor', value)}
                        title={name}
                        className={`w-8 h-8 rounded-full transition-all ${
                          settings.accentColor === value
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900'
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: value }}
                      />
                    ))}
                  </div>
                </div>

                {/* Default View */}
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <Layout className="w-4 h-4 text-slate-400" />
                    Default View
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'grid', icon: Grid, label: 'Grid' },
                      { value: 'list', icon: List, label: 'List' },
                      { value: 'map', icon: Map, label: 'Map' }
                    ].map(({ value, icon: Icon, label }) => (
                      <button
                        key={value}
                        onClick={() => updateSetting('defaultView', value as 'grid' | 'list' | 'map')}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                          settings.defaultView === value
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                            : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual Options */}
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-4">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-slate-400" />
                    Visual Options
                  </h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-white">Animations</span>
                      <p className="text-xs text-slate-400">Enable smooth transitions</p>
                    </div>
                    <ToggleSwitch
                      enabled={settings.showAnimations}
                      onToggle={() => updateSetting('showAnimations', !settings.showAnimations)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-white">Compact Mode</span>
                      <p className="text-xs text-slate-400">Reduce padding and spacing</p>
                    </div>
                    <ToggleSwitch
                      enabled={settings.compactMode}
                      onToggle={() => updateSetting('compactMode', !settings.compactMode)}
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'data' && (
              <>
                {/* Auto Refresh */}
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <RefreshCw className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-white">Auto Refresh</h4>
                        <p className="text-xs text-slate-400">Automatically fetch new events</p>
                      </div>
                    </div>
                    <ToggleSwitch
                      enabled={settings.autoRefresh}
                      onToggle={() => updateSetting('autoRefresh', !settings.autoRefresh)}
                    />
                  </div>

                  {settings.autoRefresh && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">Refresh Interval</span>
                        <span className="text-xs text-white">{settings.refreshInterval}s</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="120"
                        step="10"
                        value={settings.refreshInterval}
                        onChange={(e) => updateSetting('refreshInterval', parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        title="Refresh interval"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>10s</span>
                        <span>60s</span>
                        <span>120s</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Items Per Page */}
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-slate-400" />
                    Items Per Page
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {[25, 50, 100, 200].map((count) => (
                      <button
                        key={count}
                        onClick={() => updateSetting('itemsPerPage', count)}
                        className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                          settings.itemsPerPage === count
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                            : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Format */}
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Time Format
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateSetting('dateFormat', '12h')}
                      className={`px-4 py-3 rounded-lg border text-sm transition-all ${
                        settings.dateFormat === '12h'
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                          : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      12-hour (AM/PM)
                    </button>
                    <button
                      onClick={() => updateSetting('dateFormat', '24h')}
                      className={`px-4 py-3 rounded-lg border text-sm transition-all ${
                        settings.dateFormat === '24h'
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                          : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      24-hour
                    </button>
                  </div>
                </div>

                {/* Data Management */}
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-3">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-slate-400" />
                    Data Management
                  </h4>
                  
                  <Button
                    variant="outline"
                    onClick={exportSettings}
                    className="w-full border-slate-600 text-slate-300 hover:text-white justify-start"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Settings & Preferences
                  </Button>

                  <Button
                    variant="outline"
                    onClick={resetToDefaults}
                    className="w-full border-amber-600/50 text-amber-400 hover:bg-amber-500/10 justify-start"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset to Defaults
                  </Button>

                  <Button
                    variant="outline"
                    onClick={clearAllData}
                    className="w-full border-red-600/50 text-red-400 hover:bg-red-500/10 justify-start"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Data
                  </Button>
                </div>
              </>
            )}

            {activeTab === 'accessibility' && (
              <>
                {/* Font Size */}
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <Type className="w-4 h-4 text-slate-400" />
                    Font Size
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'small', label: 'Small', size: 'text-xs' },
                      { value: 'medium', label: 'Medium', size: 'text-sm' },
                      { value: 'large', label: 'Large', size: 'text-base' }
                    ].map(({ value, label, size }) => (
                      <button
                        key={value}
                        onClick={() => updateSetting('fontSize', value as 'small' | 'medium' | 'large')}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                          settings.fontSize === value
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                            : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className={size}>Aa</span>
                        <span className="text-xs">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accessibility Options */}
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-4">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <Accessibility className="w-4 h-4 text-slate-400" />
                    Accessibility Options
                  </h4>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-white">High Contrast</span>
                      <p className="text-xs text-slate-400">Increase color contrast</p>
                    </div>
                    <ToggleSwitch
                      enabled={settings.highContrast}
                      onToggle={() => updateSetting('highContrast', !settings.highContrast)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-white">Reduced Motion</span>
                      <p className="text-xs text-slate-400">Minimize animations</p>
                    </div>
                    <ToggleSwitch
                      enabled={settings.reducedMotion}
                      onToggle={() => updateSetting('reducedMotion', !settings.reducedMotion)}
                    />
                  </div>
                </div>

                {/* Feedback Options */}
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-4">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-slate-400" />
                    Feedback
                  </h4>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-white">Haptic Feedback</span>
                      <p className="text-xs text-slate-400">Vibration on interactions</p>
                    </div>
                    <ToggleSwitch
                      enabled={settings.hapticFeedback}
                      onToggle={() => updateSetting('hapticFeedback', !settings.hapticFeedback)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-white">Sound Effects</span>
                      <p className="text-xs text-slate-400">Audio feedback for actions</p>
                    </div>
                    <ToggleSwitch
                      enabled={settings.soundEffects}
                      onToggle={() => updateSetting('soundEffects', !settings.soundEffects)}
                    />
                  </div>
                </div>

                {/* Info Card */}
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-green-300">
                      Accessibility settings are designed to make the dashboard usable for everyone. 
                      These preferences are saved locally on your device.
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
