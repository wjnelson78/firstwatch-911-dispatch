/**
 * Main Dashboard Component for Snohomish County 911 Dispatch Monitor
 * 
 * This is the primary React component that renders the full dispatch monitoring
 * dashboard interface. It provides real-time visualization of 911 calls with
 * filtering, search, and detailed event viewing capabilities.
 * 
 * Features:
 *   - Real-time event feed with auto-refresh (30 second intervals)
 *   - Granular filtering by agency type, jurisdiction, and call type
 *   - Full-text search across addresses, call types, and units
 *   - Unified and split view modes for Police/Fire separation
 *   - Interactive charts and statistics
 *   - Detailed event modal with Google Maps integration
 *   - Dark/light theme toggle
 *   - Live/paused mode toggle
 * 
 * @author William Nelson
 * @created December 2025
 * @license MIT
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatsCards } from './StatsCards';
import { Charts } from './Charts';
import { EventDetailModal } from './EventDetailModal';
import { ActiveUsers } from './ActiveUsers';
import { UserMenu } from '@/components/auth/UserMenu';
import { ChatForum, PrivateChat } from '@/components/chat';
import { UserFeed } from '@/components/feed';
import { IncidentReport } from '@/components/incident';
import { MainNav, type ActiveView } from '@/components/navigation';
import { AdminPage } from '@/components/admin';
import { fetchDispatches, fetchStats, fetchFilters } from '@/services/api';
import { 
  RefreshCw, 
  Search, 
  Radio,
  Moon,
  Sun,
  ShieldAlert,
  Flame,
  Activity,
  MapPin,
  Clock,
  Filter,
  X,
  ChevronDown,
  Siren,
  AlertTriangle,
  Check,
  LayoutGrid,
  List,
  Zap,
  TrendingUp,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  MessageCircle,
  Calendar
} from 'lucide-react';
import type { DispatchEvent, Stats, HourlyStats, FilterOptions } from '@/types/dispatch';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

/** View mode type for toggling between unified and split layouts */
type ViewMode = 'unified' | 'split';

/** Agency filter type for Police/Fire filtering */
type AgencyFilter = 'all' | 'Police' | 'Fire';

/** Sort field options */
type SortField = 'call_created' | 'address' | 'call_type' | 'jurisdiction';

/** Sort direction */
type SortOrder = 'asc' | 'desc';

/**
 * Dashboard Component
 * 
 * The main container component that manages all dashboard state and renders
 * the complete UI including header, filters, event lists, and modals.
 */
export function Dashboard() {
  // ============================================================================
  // State Management
  // ============================================================================
  
  /** Array of dispatch events fetched from the API */
  const [events, setEvents] = useState<DispatchEvent[]>([]);
  
  /** Aggregate statistics for summary cards and charts */
  const [stats, setStats] = useState<Stats | null>(null);
  
  /** Hourly breakdown data for timeline chart */
  const [hourlyData, setHourlyData] = useState<HourlyStats[]>([]);
  
  /** Available filter options (agencies, jurisdictions, call types) */
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  
  /** Loading state for data fetching operations */
  const [loading, setLoading] = useState(true);
  
  /** Error message if API call fails */
  const [error, setError] = useState<string | null>(null);
  
  /** Current search query text */
  const [searchQuery, setSearchQuery] = useState('');
  
  /** Selected agency type filter (all, Police, Fire) */
  const [agencyFilter, setAgencyFilter] = useState<AgencyFilter>('all');
  
  /** Selected jurisdiction filter value */
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>('all');
  
  /** Selected call type filter value */
  const [callTypeFilter, setCallTypeFilter] = useState<string>('all');
  
  /** Dark mode toggle state (default true) */
  const [darkMode, setDarkMode] = useState(true);
  
  /** Timestamp of last successful data fetch */
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  /** Whether auto-refresh is enabled */
  const [isLive, setIsLive] = useState(true);
  
  /** Current view mode (unified or split) */
  const [viewMode, setViewMode] = useState<ViewMode>('unified');
  
  /** Currently selected event for detail modal */
  const [selectedEvent, setSelectedEvent] = useState<DispatchEvent | null>(null);
  
  /** Event data to pre-fill in feed post or incident report */
  const [prefilledEvent, setPrefilledEvent] = useState<DispatchEvent | null>(null);
  
  /** Whether analytics panel is expanded */
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  /** Whether chat panel is expanded */
  const [showChat, setShowChat] = useState(true);
  
  /** Jurisdiction dropdown popover state */
  const [jurisdictionPopoverOpen, setJurisdictionPopoverOpen] = useState(false);
  
  /** Call type dropdown popover state */
  const [callTypePopoverOpen, setCallTypePopoverOpen] = useState(false);

  /** Date range filter - start date */
  const [startDate, setStartDate] = useState<string>('');
  
  /** Date range filter - end date */
  const [endDate, setEndDate] = useState<string>('');

  /** Currently active view/section - initialize from URL hash */
  const getInitialView = (): ActiveView => {
    const hash = window.location.hash.slice(1); // Remove the #
    const validViews: ActiveView[] = ['dispatch', 'feed', 'report', 'chat'];
    return validViews.includes(hash as ActiveView) ? (hash as ActiveView) : 'dispatch';
  };
  const [activeView, setActiveView] = useState<ActiveView>(getInitialView);

  // Update URL hash when view changes
  const handleViewChange = useCallback((view: ActiveView) => {
    setActiveView(view);
    window.location.hash = view;
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const validViews: ActiveView[] = ['dispatch', 'feed', 'report', 'chat'];
      if (validViews.includes(hash as ActiveView)) {
        setActiveView(hash as ActiveView);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // ============================================================================
  // Pagination & Sorting State
  // ============================================================================
  
  /** Items per page */
  const ITEMS_PER_PAGE = 100;
  
  /** Current page number (1-indexed) */
  const [currentPage, setCurrentPage] = useState(1);
  
  /** Total number of events in database */
  const [totalEvents, setTotalEvents] = useState(0);
  
  /** Total pages available */
  const [totalPages, setTotalPages] = useState(1);
  
  /** Sort field */
  const [sortBy, setSortBy] = useState<SortField>('call_created');
  
  /** Sort direction */
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  /** Track IDs of newly added events for animation */
  const [newEventIds, setNewEventIds] = useState<Set<number>>(new Set());
  
  /** Ref to track previous event IDs for comparison */
  const previousEventIdsRef = useRef<Set<number>>(new Set());
  
  /** Track if this is the initial load (show skeleton) vs refresh (smooth update) */
  const isInitialLoadRef = useRef(true);

  /** Whether admin panel is shown */
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  /**
   * Fetches all dashboard data from the API
   * 
   * Retrieves dispatch events, statistics, and filter options in parallel.
   * Updates state and handles error conditions.
   */
  const fetchData = useCallback(async (page = currentPage, isAutoRefresh = false) => {
    // Only show loading skeleton on initial load, not on auto-refresh
    if (!isAutoRefresh || isInitialLoadRef.current) {
      setLoading(true);
    }
    setError(null);
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      
      // Fetch all data in parallel for better performance
      const [dispatchResponse, statsData, filtersData] = await Promise.all([
        fetchDispatches({ 
          limit: ITEMS_PER_PAGE, 
          offset,
          eventType: agencyFilter !== 'all' ? agencyFilter : undefined,
          jurisdiction: jurisdictionFilter !== 'all' ? jurisdictionFilter : undefined,
          callType: callTypeFilter !== 'all' ? callTypeFilter : undefined,
          search: searchQuery || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          sortBy,
          sortOrder
        }),
        fetchStats(),
        fetchFilters()
      ]);
      
      // Identify new events for animation (only on page 1 with default sort)
      const newEvents = dispatchResponse.events;
      const newEventIdSet = new Set(newEvents.map(e => e.id));
      
      if (isAutoRefresh && page === 1 && sortBy === 'call_created' && sortOrder === 'desc') {
        // Find events that are new (not in previous set)
        const newIds = new Set<number>();
        newEvents.forEach(event => {
          if (!previousEventIdsRef.current.has(event.id)) {
            newIds.add(event.id);
          }
        });
        
        if (newIds.size > 0) {
          setNewEventIds(newIds);
          // Clear the "new" status after animation completes
          setTimeout(() => setNewEventIds(new Set()), 1000);
        }
      }
      
      // Update the previous IDs ref for next comparison
      previousEventIdsRef.current = newEventIdSet;
      
      setEvents(newEvents);
      setTotalEvents(dispatchResponse.total);
      setTotalPages(dispatchResponse.pages);
      setStats(statsData);
      setFilters(filtersData);
      
      // Transform timeline data for chart visualization
      if (statsData.timeline) {
        const hourly: HourlyStats[] = statsData.timeline.map((t) => ({
          hour: new Date(t.hour).toLocaleTimeString('en-US', { hour: '2-digit', hour12: true }),
          police: 0,
          fire: 0,
          total: t.count
        }));
        setHourlyData(hourly);
      }
      
      setLastUpdate(new Date());
      isInitialLoadRef.current = false;
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to connect to the API server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, agencyFilter, jurisdictionFilter, callTypeFilter, searchQuery, startDate, endDate, sortBy, sortOrder]);

  // ============================================================================
  // Effects
  // ============================================================================

  /** Initial data fetch on component mount */
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** Auto-refresh interval when live mode is enabled */
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => fetchData(currentPage, true), 30000); // 30 second refresh
    return () => clearInterval(interval);
  }, [isLive, fetchData, currentPage]);

  /** Apply dark mode class to document */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  /**
   * Since we're using server-side filtering/pagination now,
   * events from API are already filtered. We just use them directly.
   */
  const filteredEvents = events;

  /** Police events subset (for split view) */
  const policeEvents = events.filter(e => e.agency_type === 'Police');
  
  /** Fire events subset (for split view) */
  const fireEvents = events.filter(e => e.agency_type === 'Fire');

  /** Count of active filters for badge display */
  const activeFiltersCount = [
    agencyFilter !== 'all',
    jurisdictionFilter !== 'all',
    callTypeFilter !== 'all',
    searchQuery.length > 0,
    startDate.length > 0,
    endDate.length > 0
  ].filter(Boolean).length;

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /** Clears all active filters and search, resets to page 1 */
  const clearAllFilters = () => {
    setAgencyFilter('all');
    setJurisdictionFilter('all');
    setCallTypeFilter('all');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  /** Handle filter changes - reset to page 1 */
  const handleAgencyFilterChange = (value: AgencyFilter) => {
    setAgencyFilter(value);
    setCurrentPage(1);
  };

  const handleJurisdictionFilterChange = (value: string) => {
    setJurisdictionFilter(value);
    setCurrentPage(1);
    setJurisdictionPopoverOpen(false);
  };

  const handleCallTypeFilterChange = (value: string) => {
    setCallTypeFilter(value);
    setCurrentPage(1);
    setCallTypePopoverOpen(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  /** Handle sorting */
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      // Toggle direction if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  /** Pagination handlers */
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top of event list
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  /**
   * Call types filtered by selected agency
   * 
   * When an agency filter is applied, only shows call types that belong
   * to that agency to reduce clutter in the dropdown.
   */
  const filteredCallTypes = useMemo(() => {
    if (!filters) return [];
    if (agencyFilter === 'all') return filters.callTypes;
    return filters.callTypes.filter(ct => ct.agencyType === agencyFilter);
  }, [filters, agencyFilter]);

  // If admin panel is open, render it instead of the dashboard
  if (showAdminPanel) {
    return <AdminPage onExit={() => setShowAdminPanel(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse animation-delay-1s" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="relative">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-red-500 shadow-lg shadow-purple-500/20">
                <Siren className="h-6 w-6 text-white" />
              </div>
              {isLive && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Snohomish 911</h1>
              <p className="text-xs text-slate-400">Real-Time Dispatch Monitor</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats summary */}
            <div className="hidden md:flex items-center gap-4 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">{policeEvents.length}</span>
              </div>
              <Separator orientation="vertical" className="h-4 bg-white/20" />
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">{fireEvents.length}</span>
              </div>
            </div>

            {/* Live toggle */}
            <button 
              onClick={() => setIsLive(!isLive)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                isLive 
                  ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                  : "bg-slate-800 text-slate-400 border border-slate-700"
              )}
            >
              <Zap className={cn("h-4 w-4", isLive && "animate-pulse")} />
              <span className="text-sm font-medium">{isLive ? 'LIVE' : 'PAUSED'}</span>
            </button>

            {/* Refresh */}
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => fetchData()}
              disabled={loading}
              className="border-slate-700 bg-slate-800/50 hover:bg-slate-700"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>

            {/* Theme toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              className="border-slate-700 bg-slate-800/50 hover:bg-slate-700"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Active users indicator */}
            <ActiveUsers />

            {/* User menu / Auth */}
            <UserMenu 
              jurisdictions={filters?.jurisdictions.map(j => j.name) || []}
              callTypes={filters?.callTypes.map(c => c.name) || []}
              onApplyFilter={(filter) => {
                if (filter.jurisdictions && filter.jurisdictions.length > 0) {
                  setJurisdictionFilter(filter.jurisdictions[0]);
                }
                if (filter.callTypes && filter.callTypes.length > 0) {
                  setCallTypeFilter(filter.callTypes[0]);
                }
              }}
              onOpenAdmin={() => setShowAdminPanel(true)}
            />
          </div>
        </div>
      </header>

      {/* Main Navigation */}
      <MainNav activeView={activeView} onViewChange={handleViewChange} />

      {/* Main Content */}
      <main className="container py-6 space-y-6 relative z-10">
        {/* Error Alert - shown on all views */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-medium">Connection Error</p>
              <p className="text-sm opacity-80">{error}</p>
            </div>
          </div>
        )}

        {/* === DISPATCH VIEW === */}
        {activeView === 'dispatch' && (
          <>
        {/* Stats Cards */}
        <StatsCards stats={stats} loading={loading} />

        {/* Control Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 lg:flex-none lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search calls..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-700 focus:border-purple-500/50 text-white placeholder:text-slate-500"
              />
            </div>

            {/* Agency Type Filter */}
            <div className="flex rounded-lg overflow-hidden border border-slate-700 bg-slate-800/50">
              <button
                onClick={() => handleAgencyFilterChange('all')}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors",
                  agencyFilter === 'all' 
                    ? "bg-purple-500 text-white" 
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                )}
              >
                All
              </button>
              <button
                onClick={() => handleAgencyFilterChange('Police')}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5",
                  agencyFilter === 'Police' 
                    ? "bg-blue-500 text-white" 
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                )}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Police
              </button>
              <button
                onClick={() => handleAgencyFilterChange('Fire')}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5",
                  agencyFilter === 'Fire' 
                    ? "bg-red-500 text-white" 
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                )}
              >
                <Flame className="h-3.5 w-3.5" />
                Fire/EMS
              </button>
            </div>

            {/* Jurisdiction Filter */}
            <Popover open={jurisdictionPopoverOpen} onOpenChange={setJurisdictionPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "justify-between border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-slate-300 min-w-[180px]",
                    jurisdictionFilter !== 'all' && "border-purple-500/50 text-purple-400"
                  )}
                >
                  <Building2 className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">
                    {jurisdictionFilter === 'all' ? 'All Agencies' : jurisdictionFilter}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0 bg-slate-900 border-slate-700">
                <Command className="bg-transparent">
                  <CommandInput placeholder="Search agencies..." className="border-slate-700" />
                  <CommandList>
                    <CommandEmpty>No agency found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => handleJurisdictionFilterChange('all')}
                        className="text-slate-300 hover:bg-slate-800"
                      >
                        <Check className={cn("mr-2 h-4 w-4", jurisdictionFilter === 'all' ? "opacity-100" : "opacity-0")} />
                        All Agencies
                      </CommandItem>
                      {filters?.jurisdictions.map((j) => (
                        <CommandItem
                          key={j.name}
                          onSelect={() => handleJurisdictionFilterChange(j.name)}
                          className="text-slate-300 hover:bg-slate-800"
                        >
                          <Check className={cn("mr-2 h-4 w-4", jurisdictionFilter === j.name ? "opacity-100" : "opacity-0")} />
                          <span className="flex-1 truncate">{j.name}</span>
                          <Badge variant="secondary" className="ml-2 bg-slate-700 text-slate-300">
                            {j.count}
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Call Type Filter */}
            <Popover open={callTypePopoverOpen} onOpenChange={setCallTypePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "justify-between border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-slate-300 min-w-[180px]",
                    callTypeFilter !== 'all' && "border-purple-500/50 text-purple-400"
                  )}
                >
                  <Filter className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">
                    {callTypeFilter === 'all' ? 'All Call Types' : callTypeFilter}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0 bg-slate-900 border-slate-700">
                <Command className="bg-transparent">
                  <CommandInput placeholder="Search call types..." className="border-slate-700" />
                  <CommandList>
                    <CommandEmpty>No call type found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => handleCallTypeFilterChange('all')}
                        className="text-slate-300 hover:bg-slate-800"
                      >
                        <Check className={cn("mr-2 h-4 w-4", callTypeFilter === 'all' ? "opacity-100" : "opacity-0")} />
                        All Call Types
                      </CommandItem>
                      {filteredCallTypes.map((ct) => (
                        <CommandItem
                          key={`${ct.name}-${ct.agencyType}`}
                          onSelect={() => handleCallTypeFilterChange(ct.name)}
                          className="text-slate-300 hover:bg-slate-800"
                        >
                          <Check className={cn("mr-2 h-4 w-4", callTypeFilter === ct.name ? "opacity-100" : "opacity-0")} />
                          <span className="flex-1 truncate">{ct.name}</span>
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "ml-2",
                              ct.agencyType === 'Police' ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
                            )}
                          >
                            {ct.count}
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Start date"
                  className={cn(
                    "pl-10 w-[200px] bg-slate-800/50 border-slate-700 focus:border-purple-500/50 text-white text-sm",
                    startDate && "border-purple-500/50 text-purple-400"
                  )}
                />
              </div>
              <span className="text-slate-500">to</span>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="End date"
                className={cn(
                  "w-[200px] bg-slate-800/50 border-slate-700 focus:border-purple-500/50 text-white text-sm",
                  endDate && "border-purple-500/50 text-purple-400"
                )}
              />
            </div>

            {/* Clear filters */}
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4 mr-1" />
                Clear ({activeFiltersCount})
              </Button>
            )}
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalEvents)} of {totalEvents.toLocaleString()} events
            </span>
            
            <Separator orientation="vertical" className="h-6 bg-slate-700" />
            
            {/* View mode toggle */}
            <div className="flex rounded-lg overflow-hidden border border-slate-700 bg-slate-800/50">
              <button
                onClick={() => setViewMode('unified')}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === 'unified' 
                    ? "bg-purple-500 text-white" 
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                )}
                title="Unified view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === 'split' 
                    ? "bg-purple-500 text-white" 
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                )}
                title="Split view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            {/* Analytics toggle */}
            <Button
              variant={showAnalytics ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={cn(
                "gap-2",
                showAnalytics 
                  ? "bg-purple-500 hover:bg-purple-600" 
                  : "border-slate-700 bg-slate-800/50 hover:bg-slate-700"
              )}
            >
              <TrendingUp className="h-4 w-4" />
              Analytics
            </Button>

            {/* Chat toggle */}
            <Button
              variant={showChat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowChat(!showChat)}
              className={cn(
                "gap-2",
                showChat 
                  ? "bg-purple-500 hover:bg-purple-600" 
                  : "border-slate-700 bg-slate-800/50 hover:bg-slate-700"
              )}
            >
              <MessageCircle className="h-4 w-4" />
              Chat
            </Button>
          </div>
        </div>

        {/* Analytics Panel */}
        {showAnalytics && (
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur">
            <CardContent className="pt-6">
              <Charts stats={stats} hourlyData={hourlyData} loading={loading} />
            </CardContent>
          </Card>
        )}

        {/* Events Display */}
        {viewMode === 'unified' ? (
          /* Unified Feed */
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <Activity className="h-5 w-5 text-purple-400" />
                  Live Dispatch Feed
                  <Badge variant="secondary" className="ml-2 bg-purple-500/20 text-purple-400">
                    {totalEvents.toLocaleString()}
                  </Badge>
                </CardTitle>
                
                {/* Sort Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Sort by:</span>
                  <div className="flex rounded-lg overflow-hidden border border-slate-700 bg-slate-800/50">
                    <button
                      onClick={() => handleSort('call_created')}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1",
                        sortBy === 'call_created' 
                          ? "bg-purple-500 text-white" 
                          : "text-slate-400 hover:text-white hover:bg-slate-700"
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      Date
                      {sortBy === 'call_created' && (
                        sortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSort('call_type')}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1",
                        sortBy === 'call_type' 
                          ? "bg-purple-500 text-white" 
                          : "text-slate-400 hover:text-white hover:bg-slate-700"
                      )}
                    >
                      Type
                      {sortBy === 'call_type' && (
                        sortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSort('jurisdiction')}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1",
                        sortBy === 'jurisdiction' 
                          ? "bg-purple-500 text-white" 
                          : "text-slate-400 hover:text-white hover:bg-slate-700"
                      )}
                    >
                      Agency
                      {sortBy === 'jurisdiction' && (
                        sortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSort('address')}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1",
                        sortBy === 'address' 
                          ? "bg-purple-500 text-white" 
                          : "text-slate-400 hover:text-white hover:bg-slate-700"
                      )}
                    >
                      Address
                      {sortBy === 'address' && (
                        sortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-2">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => <EventSkeleton key={i} />)
                  ) : filteredEvents.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No events found</p>
                      <p className="text-sm">Try adjusting your filters</p>
                    </div>
                  ) : (
                    filteredEvents.map((event) => (
                      <EventCard 
                        key={event.id} 
                        event={event} 
                        isNew={newEventIds.has(event.id)}
                        onClick={() => setSelectedEvent(event)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                  <div className="text-sm text-slate-400">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={goToFirstPage}
                      disabled={currentPage === 1 || loading}
                      className="h-8 w-8 border-slate-700 bg-slate-800/50 hover:bg-slate-700 disabled:opacity-50"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1 || loading}
                      className="h-8 w-8 border-slate-700 bg-slate-800/50 hover:bg-slate-700 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    {/* Page number buttons */}
                    <div className="flex items-center gap-1 mx-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => goToPage(pageNum)}
                            disabled={loading}
                            className={cn(
                              "h-8 w-8 p-0",
                              currentPage === pageNum 
                                ? "bg-purple-500 hover:bg-purple-600" 
                                : "border-slate-700 bg-slate-800/50 hover:bg-slate-700"
                            )}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages || loading}
                      className="h-8 w-8 border-slate-700 bg-slate-800/50 hover:bg-slate-700 disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={goToLastPage}
                      disabled={currentPage === totalPages || loading}
                      className="h-8 w-8 border-slate-700 bg-slate-800/50 hover:bg-slate-700 disabled:opacity-50"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Split View */
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Police Column */}
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <ShieldAlert className="h-5 w-5 text-blue-400" />
                  Police Calls
                  <Badge variant="secondary" className="ml-2 bg-blue-500/20 text-blue-400">
                    {policeEvents.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-2">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => <EventSkeleton key={i} />)
                    ) : policeEvents.length === 0 ? (
                      <EmptyState type="Police" />
                    ) : (
                      policeEvents.map((event) => (
                        <EventCard 
                          key={event.id} 
                          event={event} 
                          compact
                          isNew={newEventIds.has(event.id)}
                          onClick={() => setSelectedEvent(event)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Fire/EMS Column */}
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur border-l-4 border-l-red-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <Flame className="h-5 w-5 text-red-400" />
                  Fire / EMS Calls
                  <Badge variant="secondary" className="ml-2 bg-red-500/20 text-red-400">
                    {fireEvents.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-2">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => <EventSkeleton key={i} />)
                    ) : fireEvents.length === 0 ? (
                      <EmptyState type="Fire" />
                    ) : (
                      fireEvents.map((event) => (
                        <EventCard 
                          key={event.id} 
                          event={event} 
                          compact
                          isNew={newEventIds.has(event.id)}
                          onClick={() => setSelectedEvent(event)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Community Chat Section (within dispatch view) */}
        {showChat && (
          <ChatForum />
        )}
          </>
        )}

        {/* === USER FEED VIEW === */}
        {activeView === 'feed' && (
          <UserFeed 
            prefilledEvent={prefilledEvent}
            onEventHandled={() => setPrefilledEvent(null)}
          />
        )}

        {/* === INCIDENT REPORT VIEW === */}
        {activeView === 'report' && (
          <IncidentReport 
            prefilledEvent={prefilledEvent}
            onEventHandled={() => setPrefilledEvent(null)}
          />
        )}

        {/* === PRIVATE CHAT VIEW === */}
        {activeView === 'chat' && (
          <PrivateChat />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 mt-8 relative z-10">
        <div className="container text-center text-sm text-slate-500">
          <p>Data sourced from Snohomish County 911 via FirstWatch</p>
          <p className="mt-1">
            Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refresh: {isLive ? 'On (30s)' : 'Off'}
          </p>
        </div>
      </footer>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onNavigate={(view, eventData) => {
          setPrefilledEvent(eventData);
          handleViewChange(view as ActiveView);
        }}
      />
    </div>
  );
}

// Event Card Component
interface EventCardProps {
  event: DispatchEvent;
  compact?: boolean;
  isNew?: boolean;
  onClick: () => void;
}

function EventCard({ event, compact, isNew, onClick }: EventCardProps) {
  const isPolice = event.agency_type === 'Police';
  const timeAgo = event.call_created 
    ? formatDistanceToNow(new Date(event.call_created), { addSuffix: true })
    : 'Unknown';

  const getTypeIcon = () => {
    if (isPolice) return <ShieldAlert className="h-4 w-4" />;
    return <Flame className="h-4 w-4" />;
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group p-4 rounded-xl transition-all duration-300 cursor-pointer",
        "bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600",
        "hover:shadow-lg",
        isPolice ? "hover:shadow-blue-500/10" : "hover:shadow-red-500/10",
        isNew && "animate-slide-in-highlight"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Type indicator */}
        <div className={cn(
          "p-2 rounded-lg shrink-0",
          isPolice ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
        )}>
          {getTypeIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
              {event.call_type}
            </h4>
            <Badge 
              variant="outline" 
              className={cn(
                "shrink-0 text-xs",
                isPolice 
                  ? "border-blue-500/30 text-blue-400 bg-blue-500/10" 
                  : "border-red-500/30 text-red-400 bg-red-500/10"
              )}
            >
              {event.agency_type}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{event.address}</span>
          </div>

          {!compact && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {event.jurisdiction}
              </span>
              {event.units && (
                <span className="flex items-center gap-1">
                  <Radio className="h-3 w-3" />
                  {event.units.split(',').length} unit(s)
                </span>
              )}
            </div>
          )}

          {compact && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{event.jurisdiction}</span>
              <span>{timeAgo}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Loading skeleton
function EventSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-700" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-3/4 bg-slate-700 rounded" />
          <div className="h-4 w-1/2 bg-slate-700/70 rounded" />
          <div className="h-3 w-1/3 bg-slate-700/50 rounded" />
        </div>
      </div>
    </div>
  );
}

// Empty state
function EmptyState({ type }: { type: string }) {
  return (
    <div className="text-center py-12 text-slate-400">
      {type === 'Police' ? (
        <ShieldAlert className="h-12 w-12 mx-auto mb-4 opacity-30" />
      ) : (
        <Flame className="h-12 w-12 mx-auto mb-4 opacity-30" />
      )}
      <p className="font-medium">No {type} calls</p>
      <p className="text-sm opacity-70">No matching events found</p>
    </div>
  );
}
