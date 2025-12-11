/**
 * Event Detail Modal Component for 911 Dispatch Dashboard
 * 
 * Displays comprehensive information about a selected dispatch event
 * in a modal dialog. Shows all available event data including:
 *   - Call type and agency information
 *   - Location with Google Maps integration
 *   - Timestamp and response time information
 *   - Responding units and jurisdiction details
 *   - Priority/urgency indicators
 * 
 * The modal uses a glassmorphism design consistent with the dashboard
 * theme and includes animated color gradients based on agency type.
 * 
 * @author William Nelson
 * @created December 2025
 * @license MIT
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Clock, 
  Radio, 
  Building2, 
  Hash, 
  CalendarDays,
  Navigation,
  Eye,
  Shield,
  Flame,
  Ambulance,
  AlertTriangle,
  MessageSquarePlus,
  FileWarning
} from 'lucide-react';
import type { DispatchEvent } from '@/types/dispatch';
import { format, formatDistanceToNow } from 'date-fns';

/**
 * Props for the EventDetailModal component
 */
interface EventDetailModalProps {
  /** The dispatch event to display, or null if no event selected */
  event: DispatchEvent | null;
  /** Whether the modal is open */
  open: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback to navigate to a view with pre-filled event data */
  onNavigate?: (view: string, eventData: DispatchEvent) => void;
}

/**
 * EventDetailModal Component
 * 
 * Renders a modal dialog with comprehensive event information.
 * Automatically adapts styling based on agency type (Police/Fire/EMS).
 * 
 * @param props - Component props
 * @returns Modal dialog component or null if no event selected
 */
export function EventDetailModal({ event, open, onClose, onNavigate }: EventDetailModalProps) {
  // Don't render if no event is selected
  if (!event) return null;

  const handleCreatePost = () => {
    onNavigate?.('feed', event);
    onClose();
  };

  const handleReportIncident = () => {
    onNavigate?.('report', event);
    onClose();
  };

  // Determine agency type for styling
  const isPolice = event.agency_type === 'Police';
  const isFire = event.agency_type === 'Fire';
  
  /**
   * Returns the appropriate icon based on agency type
   */
  const getIcon = () => {
    if (isPolice) return <Shield className="h-6 w-6" />;
    if (isFire) return <Flame className="h-6 w-6" />;
    return <Ambulance className="h-6 w-6" />;
  };

  /**
   * Returns the gradient colors based on agency type
   */
  const getGradient = () => {
    if (isPolice) return 'from-blue-500 to-blue-700';
    if (isFire) return 'from-red-500 to-orange-600';
    return 'from-green-500 to-emerald-600';
  };

  const getBgGradient = () => {
    if (isPolice) return 'from-blue-500/10 to-blue-700/5';
    if (isFire) return 'from-red-500/10 to-orange-600/5';
    return 'from-green-500/10 to-emerald-600/5';
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, 'PPpp'); // "Apr 29, 2023, 9:30 AM"
    } catch {
      return dateStr;
    }
  };

  const timeAgo = event.call_created 
    ? formatDistanceToNow(new Date(event.call_created), { addSuffix: true })
    : 'Unknown';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header with gradient */}
        <div className={`bg-gradient-to-r ${getGradient()} p-6 text-white rounded-t-lg`}>
          <DialogHeader>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                {getIcon()}
              </div>
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold text-white mb-1">
                  {event.call_type}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-2 text-white/90">
                  <Badge variant="outline" className="border-white/30 text-white bg-white/10">
                    {event.agency_type}
                  </Badge>
                  <span className="text-sm">{timeAgo}</span>
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className={`p-6 bg-gradient-to-b ${getBgGradient()}`}>
          {/* Priority Alert Banner */}
          {event.call_type?.toLowerCase().includes('priority') && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className="font-medium text-amber-700 dark:text-amber-400">Priority Call</span>
            </div>
          )}

          {/* Location Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Location
            </h3>
            <div className="bg-background rounded-xl p-4 border shadow-sm">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${getGradient()} text-white`}>
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{event.address}</p>
                  <p className="text-muted-foreground">{event.jurisdiction}</p>
                  {(event.latitude && event.longitude) && (
                    <a 
                      href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-sm text-primary hover:underline"
                    >
                      <Navigation className="h-4 w-4" />
                      View on Google Maps
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Call Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Call Details
              </h3>
              
              <DetailRow 
                icon={<Hash className="h-4 w-4" />}
                label="Call Number"
                value={event.call_number}
              />
              
              <DetailRow 
                icon={<Building2 className="h-4 w-4" />}
                label="Jurisdiction"
                value={event.jurisdiction}
              />

              {/* Actions */}
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-4">
                Actions
              </h3>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2 h-auto py-3"
                  onClick={handleCreatePost}
                >
                  <MessageSquarePlus className="h-4 w-4 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium">Post to Community Feed</p>
                    <p className="text-xs text-muted-foreground">Share updates with the community</p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2 h-auto py-3"
                  onClick={handleReportIncident}
                >
                  <FileWarning className="h-4 w-4 text-orange-500" />
                  <div className="text-left">
                    <p className="font-medium">Report Incident</p>
                    <p className="text-xs text-muted-foreground">Create a detailed incident report</p>
                  </div>
                </Button>
              </div>
            </div>

            {/* Time Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Timing
              </h3>
              
              <DetailRow 
                icon={<CalendarDays className="h-4 w-4" />}
                label="Call Created"
                value={formatDate(event.call_created)}
              />
              
              <DetailRow 
                icon={<Clock className="h-4 w-4" />}
                label="First Seen"
                value={formatDate(event.first_seen)}
              />

              <DetailRow 
                icon={<Eye className="h-4 w-4" />}
                label="Times Observed"
                value={`${event.times_seen} time${event.times_seen !== 1 ? 's' : ''}`}
              />
            </div>
          </div>

          {/* Units Responding */}
          {event.units && (
            <>
              <Separator className="my-4" />
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Units Responding
                </h3>
                <div className="bg-background rounded-xl p-4 border shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${getGradient()} text-white`}>
                      <Radio className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2">
                        {event.units.split(',').map((unit, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary"
                            className="font-mono text-sm"
                          >
                            {unit.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Coordinates */}
          {(event.latitude && event.longitude) && (
            <>
              <Separator className="my-4" />
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Coordinates
                </h3>
                <div className="flex gap-4">
                  <div className="bg-background rounded-lg px-4 py-2 border font-mono text-sm">
                    <span className="text-muted-foreground">Lat:</span> {event.latitude?.toFixed(6)}
                  </div>
                  <div className="bg-background rounded-lg px-4 py-2 border font-mono text-sm">
                    <span className="text-muted-foreground">Lng:</span> {event.longitude?.toFixed(6)}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium break-all">{value || 'N/A'}</p>
      </div>
    </div>
  );
}
