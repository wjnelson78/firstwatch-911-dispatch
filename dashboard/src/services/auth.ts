/**
 * Authentication Service for 911 Dispatch Dashboard
 * 
 * Handles all authentication-related API calls including login, registration,
 * token management, and user profile operations.
 * 
 * @author William Nelson
 * @created December 2025
 * @license MIT
 */

import type { 
  User, 
  UserProfile,
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  RefreshResponse,
  UserPreferences 
} from '@/types/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

// Token storage keys
const ACCESS_TOKEN_KEY = 'dispatch_access_token';
const REFRESH_TOKEN_KEY = 'dispatch_refresh_token';
const USER_KEY = 'dispatch_user';

/**
 * Store authentication tokens in localStorage
 */
export function storeTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get stored refresh token
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Store user data in localStorage
 */
export function storeUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Get stored user data
 */
export function getStoredUser(): User | null {
  const userData = localStorage.getItem(USER_KEY);
  if (!userData) return null;
  try {
    return JSON.parse(userData);
  } catch {
    return null;
  }
}

/**
 * Clear all authentication data from storage
 */
export function clearAuthData(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Check if user is authenticated (has valid tokens)
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken() && !!getStoredUser();
}

/**
 * Make authenticated API request with automatic token refresh
 */
export async function authFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = getAccessToken();
  
  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  
  let response = await fetch(url, {
    ...options,
    headers,
  });

  // If token expired, try to refresh
  if (response.status === 401) {
    const data = await response.json();
    if (data.code === 'TOKEN_EXPIRED') {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry original request with new token
        headers.set('Authorization', `Bearer ${getAccessToken()}`);
        response = await fetch(url, {
          ...options,
          headers,
        });
      }
    }
  }

  return response;
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearAuthData();
      return false;
    }

    const data: RefreshResponse = await response.json();
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    return true;
  } catch {
    clearAuthData();
    return false;
  }
}

/**
 * Register a new user account
 */
export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  const result: AuthResponse = await response.json();
  storeTokens(result.accessToken, result.refreshToken);
  storeUser(result.user);
  return result;
}

/**
 * Login with email and password
 */
export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const result: AuthResponse = await response.json();
  storeTokens(result.accessToken, result.refreshToken);
  storeUser(result.user);
  return result;
}

/**
 * Logout the current user
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Ignore logout errors
  }
  
  clearAuthData();
}

/**
 * Get current user profile
 */
export async function getProfile(): Promise<UserProfile> {
  const response = await authFetch(`${API_BASE}/auth/me`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get profile');
  }

  return response.json();
}

/**
 * Update user preferences
 */
export async function updatePreferences(
  preferences: Partial<UserPreferences>
): Promise<void> {
  const response = await authFetch(`${API_BASE}/auth/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update preferences');
  }
}

/**
 * Change user password
 */
export async function changePassword(
  currentPassword: string, 
  newPassword: string
): Promise<void> {
  const response = await authFetch(`${API_BASE}/auth/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to change password');
  }

  // Clear tokens after password change (force re-login)
  clearAuthData();
}
