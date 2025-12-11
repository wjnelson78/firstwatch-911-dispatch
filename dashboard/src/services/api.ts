/**
 * API Service Layer for 911 Dispatch Dashboard
 * 
 * This module provides all HTTP client functions for communicating with the
 * Express.js backend API. All data fetching operations are centralized here
 * to provide a clean separation between UI components and data access.
 * 
 * @author William Nelson
 * @created December 2025
 * @license MIT
 */

import type { DispatchEvent, Stats, FilterOptions } from '@/types/dispatch';

/**
 * Base URL for the API server
 * Uses environment variable if set, otherwise defaults to local development server
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

/**
 * Parameters for fetching dispatch events
 */
export interface FetchDispatchesParams {
  /** Filter events after this date (ISO string) */
  startDate?: string;
  /** Filter events before this date (ISO string) */
  endDate?: string;
  /** Filter by event/agency type */
  eventType?: string;
  /** Filter by jurisdiction */
  jurisdiction?: string;
  /** Filter by call type */
  callType?: string;
  /** Full-text search query */
  search?: string;
  /** Sort field */
  sortBy?: 'call_created' | 'address' | 'call_type' | 'jurisdiction' | 'agency_type' | 'first_seen' | 'last_seen';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Maximum number of results (default: 100) */
  limit?: number;
  /** Pagination offset (default: 0) */
  offset?: number;
}

/**
 * Response from the paginated dispatches endpoint
 */
export interface PaginatedDispatchesResponse {
  events: DispatchEvent[];
  total: number;
  limit: number;
  offset: number;
  pages: number;
}

/**
 * Fetch dispatch events from the API with optional filtering
 * 
 * @param params - Optional filtering and pagination parameters
 * @returns Promise resolving to paginated dispatch response
 * @throws Error if the API request fails
 * 
 * @example
 * // Fetch page 2 of police events sorted by date
 * const response = await fetchDispatches({ 
 *   eventType: 'Police', 
 *   limit: 100,
 *   offset: 100,
 *   sortBy: 'call_created',
 *   sortOrder: 'desc'
 * });
 */
export async function fetchDispatches(params?: FetchDispatchesParams): Promise<PaginatedDispatchesResponse> {
  const searchParams = new URLSearchParams();
  
  // Build query string from provided parameters
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  if (params?.eventType) searchParams.set('eventType', params.eventType);
  if (params?.jurisdiction) searchParams.set('jurisdiction', params.jurisdiction);
  if (params?.callType) searchParams.set('callType', params.callType);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const response = await fetch(`${API_BASE}/dispatches?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch dispatches');
  return response.json();
}

/**
 * Fetch aggregate statistics for dispatch events
 * 
 * Returns counts by type, jurisdiction breakdown, and timeline data
 * for charts and summary displays.
 * 
 * @param startDate - Optional start date filter (ISO string)
 * @param endDate - Optional end date filter (ISO string)
 * @returns Promise resolving to statistics object
 */
export async function fetchStats(startDate?: string, endDate?: string): Promise<Stats> {
  const searchParams = new URLSearchParams();
  if (startDate) searchParams.set('startDate', startDate);
  if (endDate) searchParams.set('endDate', endDate);
  
  const response = await fetch(`${API_BASE}/stats?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
}

/**
 * Fetch latest dispatch events for live updates
 * 
 * Used for real-time dashboard updates to get only new events
 * since the last fetch.
 * 
 * @param since - Optional timestamp to fetch events after
 * @param limit - Maximum number of results (default: 50)
 * @returns Promise resolving to array of new dispatch events
 */
export async function fetchLatestDispatches(since?: string, limit = 50): Promise<DispatchEvent[]> {
  const searchParams = new URLSearchParams();
  if (since) searchParams.set('since', since);
  searchParams.set('limit', limit.toString());
  
  const response = await fetch(`${API_BASE}/dispatches/latest?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch latest dispatches');
  return response.json();
}

/**
 * Fetch available filter options from the API
 * 
 * Returns dynamic lists of agencies, jurisdictions, and call types
 * based on actual data in the database, with event counts for each.
 * 
 * @returns Promise resolving to filter options object
 */
export async function fetchFilters(): Promise<FilterOptions> {
  const response = await fetch(`${API_BASE}/filters`);
  if (!response.ok) throw new Error('Failed to fetch filters');
  return response.json();
}

/**
 * Check API server health and database connectivity
 * 
 * @returns Promise resolving to health status object
 */
export async function checkHealth(): Promise<{ status: string; database: string }> {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
}
