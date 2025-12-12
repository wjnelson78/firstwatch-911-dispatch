/**
 * Admin Context
 * 
 * Provides admin-specific state and utilities for the admin interface.
 * Handles admin authentication check and admin-related data fetching.
 * 
 * @author William Nelson
 * @created December 2025
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getAccessToken } from '@/services/auth';

interface DashboardStats {
  users: {
    total_users: number;
    active_users: number;
    admin_count: number;
    moderator_count: number;
    new_users_week: number;
    users_logged_in_today: number;
  };
  incidents: {
    total_reports: number;
    pending_reports: number;
    under_review: number;
    resolved: number;
    dismissed: number;
    reports_this_week: number;
    critical_reports: number;
  };
  feed: {
    total_posts: number;
    posts_today: number;
    posts_this_week: number;
  };
  dispatches: {
    total_dispatches: number;
    dispatches_today: number;
    unique_agencies: number;
  };
  generatedAt: string;
}

interface AdminUser {
  id: number;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLogin: string | null;
}

interface AdminIncident {
  id: number;
  title: string;
  incidentType: string;
  description: string;
  location: string;
  targetAgency: string | null;
  agencyType: string | null;
  severity: string | null;
  urgency: string | null;
  status: string;
  propertyDamage: boolean;
  damageDescription: string | null;
  estimatedDamageValue: number | null;
  weatherConditions: string | null;
  lightingConditions: string | null;
  roadConditions: string | null;
  isAnonymous: boolean;
  mediaUrls: string[];
  linkedDispatchEventId: string | null;
  createdAt: string;
  updatedAt: string;
  reporter: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Agency {
  name: string;
  agencyType: string;
  dispatchCount?: number;
  emailEnabled?: boolean;
  emailAddresses?: string[];
}

interface AdminContextType {
  isAdmin: boolean;
  isModerator: boolean;
  loading: boolean;
  
  // Dashboard
  dashboardStats: DashboardStats | null;
  fetchDashboardStats: () => Promise<void>;
  
  // Users
  users: AdminUser[];
  usersPagination: Pagination | null;
  fetchUsers: (params?: { page?: number; limit?: number; search?: string; role?: string; status?: string }) => Promise<void>;
  updateUser: (id: number, updates: { role?: string; isActive?: boolean }) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
  
  // Incidents
  incidents: AdminIncident[];
  incidentsPagination: Pagination | null;
  fetchIncidents: (params?: { page?: number; limit?: number; status?: string; severity?: string; agency?: string; search?: string }) => Promise<void>;
  updateIncident: (id: number, updates: { status?: string; adminNotes?: string }) => Promise<void>;
  
  // Agencies
  agencies: Agency[];
  fetchAgencies: () => Promise<void>;
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_URL || 'http://172.16.32.201:3001';

interface AdminProviderProps {
  children: ReactNode;
}

export function AdminProvider({ children }: AdminProviderProps) {
  const { user } = useAuth();
  const token = getAccessToken();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  
  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersPagination, setUsersPagination] = useState<Pagination | null>(null);
  
  // Incidents
  const [incidents, setIncidents] = useState<AdminIncident[]>([]);
  const [incidentsPagination, setIncidentsPagination] = useState<Pagination | null>(null);
  
  // Agencies
  const [agencies, setAgencies] = useState<Agency[]>([]);
  
  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator' || isAdmin;
  
  const clearError = useCallback(() => setError(null), []);
  
  const getAuthHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }), [token]);
  
  // Fetch dashboard stats
  const fetchDashboardStats = useCallback(async () => {
    if (!isAdmin || !token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/dashboard`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      
      const data = await response.json();
      setDashboardStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, token, getAuthHeaders]);
  
  // Fetch users
  const fetchUsers = useCallback(async (params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    role?: string; 
    status?: string 
  }) => {
    if (!isAdmin || !token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.search) searchParams.set('search', params.search);
      if (params?.role) searchParams.set('role', params.role);
      if (params?.status) searchParams.set('status', params.status);
      
      const response = await fetch(
        `${API_BASE}/api/admin/users?${searchParams.toString()}`,
        { headers: getAuthHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data.users);
      setUsersPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, token, getAuthHeaders]);
  
  // Update user
  const updateUser = useCallback(async (id: number, updates: { role?: string; isActive?: boolean }) => {
    if (!isAdmin || !token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/users/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }
      
      // Refresh users list
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAdmin, token, getAuthHeaders, fetchUsers]);
  
  // Delete user
  const deleteUser = useCallback(async (id: number) => {
    if (!isAdmin || !token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }
      
      // Refresh users list
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAdmin, token, getAuthHeaders, fetchUsers]);
  
  // Fetch incidents
  const fetchIncidents = useCallback(async (params?: { 
    page?: number; 
    limit?: number; 
    status?: string; 
    severity?: string;
    agency?: string;
    search?: string 
  }) => {
    if (!isAdmin || !token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.status) searchParams.set('status', params.status);
      if (params?.severity) searchParams.set('severity', params.severity);
      if (params?.agency) searchParams.set('agency', params.agency);
      if (params?.search) searchParams.set('search', params.search);
      
      const response = await fetch(
        `${API_BASE}/api/admin/incidents?${searchParams.toString()}`,
        { headers: getAuthHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch incidents');
      }
      
      const data = await response.json();
      setIncidents(data.incidents);
      setIncidentsPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch incidents');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, token, getAuthHeaders]);
  
  // Update incident
  const updateIncident = useCallback(async (id: number, updates: { status?: string; adminNotes?: string }) => {
    if (!isAdmin || !token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/incidents/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update incident');
      }
      
      // Refresh incidents list
      await fetchIncidents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update incident');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAdmin, token, getAuthHeaders, fetchIncidents]);
  
  // Fetch agencies
  const fetchAgencies = useCallback(async () => {
    if (!isAdmin || !token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/agencies`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch agencies');
      }
      
      const data = await response.json();
      setAgencies(data.agencies);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agencies');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, token, getAuthHeaders]);
  
  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        isModerator,
        loading,
        dashboardStats,
        fetchDashboardStats,
        users,
        usersPagination,
        fetchUsers,
        updateUser,
        deleteUser,
        incidents,
        incidentsPagination,
        fetchIncidents,
        updateIncident,
        agencies,
        fetchAgencies,
        error,
        clearError
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

// Hook exported from this file - the fast refresh warning is acceptable for context files
// eslint-disable-next-line react-refresh/only-export-components
export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
