/**
 * TypeScript Type Definitions for 911 Dispatch Dashboard
 * 
 * This module defines all the data structures used throughout the dashboard
 * application, including dispatch events, statistics, and filter options.
 * 
 * @author William Nelson
 * @created December 2025
 * @license MIT
 */

/**
 * Represents a single 911 dispatch event
 * 
 * Contains all information about a dispatch call including location,
 * responding units, timing, and classification data.
 */
export interface DispatchEvent {
  /** Unique database identifier */
  id: number;
  /** FirstWatch event identifier */
  event_id: string;
  /** Dispatch call number (agency-assigned) */
  call_number: string;
  /** Street address of the incident */
  address: string;
  /** Type/nature of the call (e.g., "TRAFFIC STOP", "MED1") */
  call_type: string;
  /** Comma-separated list of responding units */
  units: string;
  /** Timestamp when the call was created/dispatched */
  call_created: string;
  /** Responding agency/jurisdiction name */
  jurisdiction: string;
  /** Agency type classification */
  agency_type: 'Police' | 'Fire' | string;
  /** GPS longitude coordinate (may be null) */
  longitude: number | null;
  /** GPS latitude coordinate (may be null) */
  latitude: number | null;
  /** Timestamp when event was first captured by ingester */
  first_seen: string;
  /** Timestamp when event was last seen in API */
  last_seen: string;
  /** Number of times this event appeared in API responses */
  times_seen: number;
}

/**
 * Aggregate statistics for dispatch events
 * 
 * Used to display summary cards and charts showing event distributions
 * and trends over time.
 */
export interface Stats {
  /** Total number of events in the database */
  total: number;
  /** Event counts broken down by agency type */
  byType: {
    police?: number;
    fire?: number;
    [key: string]: number | undefined;
  };
  /** Top jurisdictions by event count */
  byJurisdiction: { jurisdiction: string; count: number }[];
  /** Number of unique jurisdictions/agencies */
  uniqueAgencies: number;
  /** Hourly event counts for timeline chart */
  timeline: { hour: string; count: number }[];
  /** Recent activity breakdown by hour and type */
  recentActivity: { hour: string; event_type: string; count: number }[];
  /** Count of events in the last 6 hours */
  recentCount?: number;
}

/**
 * Generic filter item with name and count
 * Used for agency types and jurisdictions
 */
export interface FilterItem {
  /** Display name of the filter option */
  name: string;
  /** Number of events matching this filter */
  count: number;
}

/**
 * Call type filter item with agency type association
 * Allows filtering call types by their parent agency type
 */
export interface CallTypeItem {
  /** Call type name (e.g., "TRAFFIC STOP") */
  name: string;
  /** Associated agency type (Police or Fire) */
  agencyType: string;
  /** Number of events with this call type */
  count: number;
}

/**
 * Available filter options fetched from the API
 * Populated dynamically based on actual data in the database
 */
export interface FilterOptions {
  /** Available agency types with counts */
  agencyTypes: FilterItem[];
  /** Available jurisdictions with counts */
  jurisdictions: FilterItem[];
  /** Available call types with counts and agency associations */
  callTypes: CallTypeItem[];
}

/**
 * Hourly statistics for timeline visualization
 * Used in the activity chart to show event distribution over time
 */
export interface HourlyStats {
  /** Hour label (e.g., "12 PM") */
  hour: string;
  /** Police event count for this hour */
  police: number;
  /** Fire/EMS event count for this hour */
  fire: number;
  /** Total event count for this hour */
  total: number;
}

