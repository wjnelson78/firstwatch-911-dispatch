/**
 * Charts Component for 911 Dispatch Dashboard
 * 
 * Provides interactive data visualizations using Recharts library.
 * Renders multiple chart types to display dispatch statistics:
 * 
 * Charts included:
 *   - Activity Timeline: Area chart showing events over time
 *   - Agency Distribution: Pie chart showing Police vs Fire breakdown
 *   - Top Jurisdictions: Horizontal bar chart of busiest areas
 * 
 * All charts feature:
 *   - Dark theme styling matching the dashboard aesthetic
 *   - Custom tooltips with glassmorphism effect
 *   - Responsive sizing for different screen widths
 *   - Loading skeleton states
 *   - Animated transitions
 * 
 * @author William Nelson
 * @created December 2025
 * @license MIT
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import type { Stats, HourlyStats } from '@/types/dispatch';

/**
 * Props for the Charts component
 */
interface ChartsProps {
  /** Statistics data from the API, or null if not loaded */
  stats: Stats | null;
  /** Hourly breakdown data for timeline chart */
  hourlyData: HourlyStats[];
  /** Whether data is currently loading */
  loading: boolean;
}

/**
 * Color palette for consistent chart styling
 */
const COLORS = {
  police: '#3b82f6',  // Blue for law enforcement
  fire: '#ef4444',    // Red for fire/EMS
  purple: '#a855f7'   // Purple for combined/total
};

/**
 * Charts Component
 * 
 * Renders a grid of interactive charts displaying dispatch statistics.
 * Shows loading skeleton state while data is being fetched.
 * 
 * @param props - Component props
 * @returns Grid of chart components
 */
export function Charts({ stats, hourlyData, loading }: ChartsProps) {
  // Render loading skeleton state
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className="bg-slate-800/50 border-slate-700/50 animate-pulse">
            <CardHeader>
              <div className="h-5 w-32 bg-slate-700 rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-slate-700/50 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Build pie chart data from agency type breakdown
  const pieData = [];
  if (stats?.byType?.police) {
    pieData.push({ name: 'Police', value: stats.byType.police, color: COLORS.police });
  }
  if (stats?.byType?.fire) {
    pieData.push({ name: 'Fire/EMS', value: stats.byType.fire, color: COLORS.fire });
  }

  // Get top 10 jurisdictions for bar chart
  const topJurisdictions = stats?.byJurisdiction?.slice(0, 10) || [];

  /**
   * Custom tooltip styling for consistent dark theme appearance
   */
  const customTooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '12px',
    padding: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Activity Timeline - Area chart showing events over time */}
      <Card className="col-span-2 bg-slate-800/30 border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-white">Activity Timeline</CardTitle>
          <p className="text-sm text-slate-400">Event distribution over time</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={{ stroke: '#334155' }}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={{ stroke: '#334155' }}
                axisLine={{ stroke: '#334155' }}
              />
              <Tooltip 
                contentStyle={customTooltipStyle}
                labelStyle={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}
                itemStyle={{ color: '#a855f7' }}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                name="Events"
                stroke={COLORS.purple}
                fillOpacity={1}
                fill="url(#colorTotal)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Agency Type Distribution */}
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-white">Distribution by Type</CardTitle>
          <p className="text-sm text-slate-400">Police vs Fire/EMS calls</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={customTooltipStyle}
                formatter={(value: number, name: string) => [
                  value.toLocaleString(),
                  name
                ]}
              />
              <Legend 
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value) => <span className="chart-legend-text">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Jurisdictions */}
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-white">Top Agencies</CardTitle>
          <p className="text-sm text-slate-400">Most active jurisdictions</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart 
              data={topJurisdictions} 
              layout="vertical"
              margin={{ left: 0, right: 20 }}
            >
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <XAxis 
                type="number" 
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={{ stroke: '#334155' }}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis 
                type="category" 
                dataKey="jurisdiction" 
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                width={140}
                tickFormatter={(value) => 
                  value.length > 22 ? value.substring(0, 22) + '...' : value
                }
              />
              <Tooltip 
                contentStyle={customTooltipStyle}
                formatter={(value: number) => [value.toLocaleString(), 'Events']}
                labelStyle={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}
              />
              <Bar 
                dataKey="count" 
                fill="url(#barGradient)"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
