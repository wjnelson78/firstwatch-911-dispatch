/**
 * Favorites Context
 * 
 * Provides state management for user's favorited/saved dispatch events.
 * Allows quick access to check if an event is favorited and to add/remove favorites.
 * 
 * @author William Nelson
 * @created December 2025
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { DispatchEvent } from '../types/dispatch';

interface SavedEvent {
  savedId: number;
  eventId: number;
  tags: string[];
  notes: string;
  savedAt: string;
  event: DispatchEvent | null;
}

interface FavoritesContextType {
  /** Set of favorited event IDs for quick lookup */
  favoriteIds: Set<number>;
  /** Full list of saved events with details */
  favorites: SavedEvent[];
  /** Available tags used across all favorites */
  availableTags: string[];
  /** Loading state */
  isLoading: boolean;
  /** Check if an event is favorited */
  isFavorited: (eventId: number) => boolean;
  /** Add event to favorites */
  addFavorite: (eventId: number, tags?: string[], notes?: string) => Promise<boolean>;
  /** Remove event from favorites */
  removeFavorite: (eventId: number) => Promise<boolean>;
  /** Update tags/notes for a favorite */
  updateFavorite: (eventId: number, tags: string[], notes: string) => Promise<boolean>;
  /** Toggle favorite status */
  toggleFavorite: (eventId: number) => Promise<boolean>;
  /** Refresh favorites from server */
  refreshFavorites: () => Promise<void>;
  /** Get saved data for a specific event */
  getSavedData: (eventId: number) => SavedEvent | undefined;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

interface FavoritesProviderProps {
  children: ReactNode;
}

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const { isAuthenticated } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [favorites, setFavorites] = useState<SavedEvent[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all favorite IDs when user logs in
  const fetchFavoriteIds = useCallback(async () => {
    if (!isAuthenticated) {
      setFavoriteIds(new Set());
      return;
    }

    try {
      const response = await fetch('/api/events/favorites/ids', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setFavoriteIds(new Set(data.eventIds));
      }
    } catch (error) {
      console.error('Failed to fetch favorite IDs:', error);
    }
  }, [isAuthenticated]);

  // Fetch full favorites list
  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setFavorites([]);
      setAvailableTags([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/events/favorites?limit=100', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites);
        setAvailableTags(data.availableTags || []);
        // Also update the IDs set
        setFavoriteIds(new Set(data.favorites.map((f: SavedEvent) => f.eventId)));
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load favorites when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchFavoriteIds();
    } else {
      setFavoriteIds(new Set());
      setFavorites([]);
      setAvailableTags([]);
    }
  }, [isAuthenticated, fetchFavoriteIds]);

  const isFavorited = useCallback((eventId: number) => {
    return favoriteIds.has(eventId);
  }, [favoriteIds]);

  const addFavorite = useCallback(async (eventId: number, tags: string[] = [], notes: string = '') => {
    if (!isAuthenticated) return false;

    try {
      const response = await fetch(`/api/events/${eventId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tags, notes })
      });

      if (response.ok) {
        // Optimistically update
        setFavoriteIds(prev => new Set([...prev, eventId]));
        // Refresh full list to get updated data
        await fetchFavorites();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add favorite:', error);
      return false;
    }
  }, [isAuthenticated, fetchFavorites]);

  const removeFavorite = useCallback(async (eventId: number) => {
    if (!isAuthenticated) return false;

    try {
      const response = await fetch(`/api/events/${eventId}/favorite`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        // Optimistically update
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });
        setFavorites(prev => prev.filter(f => f.eventId !== eventId));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      return false;
    }
  }, [isAuthenticated]);

  const updateFavorite = useCallback(async (eventId: number, tags: string[], notes: string) => {
    if (!isAuthenticated) return false;

    try {
      const response = await fetch(`/api/events/${eventId}/favorite`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tags, notes })
      });

      if (response.ok) {
        // Refresh to get updated data
        await fetchFavorites();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update favorite:', error);
      return false;
    }
  }, [isAuthenticated, fetchFavorites]);

  const toggleFavorite = useCallback(async (eventId: number) => {
    if (isFavorited(eventId)) {
      return removeFavorite(eventId);
    } else {
      return addFavorite(eventId);
    }
  }, [isFavorited, addFavorite, removeFavorite]);

  const getSavedData = useCallback((eventId: number) => {
    return favorites.find(f => f.eventId === eventId);
  }, [favorites]);

  const refreshFavorites = useCallback(async () => {
    await fetchFavorites();
  }, [fetchFavorites]);

  const value: FavoritesContextType = {
    favoriteIds,
    favorites,
    availableTags,
    isLoading,
    isFavorited,
    addFavorite,
    removeFavorite,
    updateFavorite,
    toggleFavorite,
    refreshFavorites,
    getSavedData
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
