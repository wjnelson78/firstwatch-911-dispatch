/**
 * TypeScript Type Definitions for Authentication
 * 
 * Defines user, session, and authentication-related data structures
 * used throughout the dashboard application.
 * 
 * @author William Nelson
 * @created December 2025
 * @license MIT
 */

/**
 * Represents a user in the system
 */
export interface User {
  /** Unique user identifier */
  id: number;
  /** User's email address */
  email: string;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** User's role for authorization */
  role: 'user' | 'admin' | 'moderator';
  /** When the user account was created */
  createdAt?: string;
  /** Last login timestamp */
  lastLogin?: string;
}

/**
 * User preferences for dashboard customization
 */
export interface UserPreferences {
  /** Default view filter on load */
  defaultView: 'all' | 'police' | 'fire';
  /** List of favorite jurisdictions for quick filtering */
  favoriteJurisdictions: string[];
  /** Whether push notifications are enabled */
  notificationEnabled: boolean;
  /** UI theme preference */
  theme: 'dark' | 'light' | 'system';
}

/**
 * Extended user profile with preferences
 */
export interface UserProfile extends User {
  preferences: UserPreferences;
}

/**
 * Authentication state in the application
 */
export interface AuthState {
  /** Currently logged in user */
  user: User | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether auth state is being loaded */
  isLoading: boolean;
  /** Any authentication error message */
  error: string | null;
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Registration request payload
 */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/**
 * Authentication response from login/register
 */
export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * Token refresh response
 */
export interface RefreshResponse {
  accessToken: string;
}

/**
 * API error response
 */
export interface AuthError {
  error: string;
  code?: string;
}
