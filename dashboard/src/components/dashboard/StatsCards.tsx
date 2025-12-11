/**
 * Statistics Cards Component for 911 Dispatch Dashboard
 * 
 * Displays key metrics and statistics in a responsive card grid layout.
 * Each card shows an animated icon with gradient background, the metric
 * value, and a descriptive label. Cards include hover effects and
 * smooth animations.
 * 
 * Metrics displayed:
 *   - Total Events: All dispatch events in the database
 *   - Police Calls: Law enforcement related dispatches
 *   - Fire Calls: Fire and rescue related dispatches
 *   - Active Agencies: Number of unique responding agencies
 *   - Recent Activity: Events in the last hour
 * 
 * @author William Nelson
 * @created December 2025
 * @license MIT
 */

import { Card, CardContent } from '@/components/ui/card';
import { 
  ShieldAlert, 
  Flame, 
  Activity, 
  Building2,
  Clock
} from 'lucide-react';
import type { Stats } from '@/types/dispatch';
import { cn } from '@/lib/utils';

/**
 * Props for the StatsCards component
 */
interface StatsCardsProps {
  /** Statistics data from the API, or null if not loaded */
  stats: Stats | null;
  /** Whether data is currently loading */
  loading: boolean;
}

/**
 * StatsCards Component
 * 
 * Renders a grid of statistics cards with animated icons and hover effects.
 * Shows a loading skeleton state while data is being fetched.
 * 
 * @param props - Component props
 * @returns Grid of statistics cards
 */
export function StatsCards({ stats, loading }: StatsCardsProps) {
  // Extract statistics with defaults
  const policeCount = stats?.byType?.police || 0;
  const fireCount = stats?.byType?.fire || 0;
  const totalCount = stats?.total || 0;
  const uniqueAgencies = stats?.uniqueAgencies || 0;

  // Get recent activity (events from the most recent hour in timeline)
  const recentCount = stats?.timeline?.[0]?.count || 0;

  // Render loading skeleton state
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="bg-slate-900/50 border-slate-700/50 backdrop-blur animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-20 bg-slate-700 rounded" />
                  <div className="h-7 w-16 bg-slate-700 rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  /**
   * Configuration array for statistics cards
   * Each entry defines the appearance and data for one card
   */
  const statsData = [
    {
      label: 'Total Events',
      value: totalCount,
      icon: Activity,
      gradient: 'from-purple-500 to-indigo-600',
      shadowColor: 'shadow-purple-500/20',
      textColor: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      description: 'All time'
    },
    {
      label: 'Police Calls',
      value: policeCount,
      icon: ShieldAlert,
      gradient: 'from-blue-500 to-cyan-600',
      shadowColor: 'shadow-blue-500/20',
      textColor: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      description: `${totalCount ? ((policeCount / totalCount) * 100).toFixed(1) : 0}% of total`
    },
    {
      label: 'Fire / EMS',
      value: fireCount,
      icon: Flame,
      gradient: 'from-red-500 to-orange-600',
      shadowColor: 'shadow-red-500/20',
      textColor: 'text-red-400',
      bgColor: 'bg-red-500/10',
      description: `${totalCount ? ((fireCount / totalCount) * 100).toFixed(1) : 0}% of total`
    },
    {
      label: 'Agencies',
      value: uniqueAgencies,
      icon: Building2,
      gradient: 'from-emerald-500 to-teal-600',
      shadowColor: 'shadow-emerald-500/20',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      description: 'Jurisdictions'
    },
    {
      label: 'Last Hour',
      value: recentCount,
      icon: Clock,
      gradient: 'from-amber-500 to-yellow-600',
      shadowColor: 'shadow-amber-500/20',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      description: 'Recent activity'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={stat.label} 
            className={cn(
              "bg-slate-900/50 border-slate-700/50 backdrop-blur",
              "hover:bg-slate-900/70 transition-all duration-300",
              "hover:border-slate-600"
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-xl",
                  `bg-gradient-to-br ${stat.gradient}`,
                  `shadow-lg ${stat.shadowColor}`
                )}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className={cn("text-2xl font-bold", stat.textColor)}>
                    {stat.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {stat.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
