/**
 * Saved Events Component
 * 
 * Displays a list of the user's favorited/saved dispatch events
 * with filtering by tags and quick access to event details.
 * 
 * @author William Nelson
 * @created December 2025
 */

import { useState } from 'react';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Star, 
  Search, 
  MapPin, 
  Clock, 
  Shield, 
  Flame, 
  Ambulance,
  Trash2,
  Filter,
  RefreshCw,
  ChevronLeft,
  Tag
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import type { DispatchEvent } from '@/types/dispatch';

interface SavedEventsProps {
  onBack: () => void;
  onSelectEvent: (event: DispatchEvent) => void;
}

export function SavedEvents({ onBack, onSelectEvent }: SavedEventsProps) {
  const { isAuthenticated } = useAuth();
  const { favorites, availableTags, isLoading, removeFavorite, refreshFavorites } = useFavorites();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshFavorites();
    setIsRefreshing(false);
  };

  const handleRemove = async (eventId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await removeFavorite(eventId);
  };

  // Filter favorites based on search and selected tag
  const filteredFavorites = favorites.filter(fav => {
    if (!fav.event) return false;
    
    // Tag filter
    if (selectedTag && !fav.tags.includes(selectedTag)) return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const event = fav.event;
      return (
        event.call_type?.toLowerCase().includes(query) ||
        event.address?.toLowerCase().includes(query) ||
        event.jurisdiction?.toLowerCase().includes(query) ||
        event.call_number?.toLowerCase().includes(query) ||
        fav.notes?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const getAgencyIcon = (agencyType: string) => {
    switch (agencyType) {
      case 'Police':
        return <Shield className="h-4 w-4 text-blue-500" />;
      case 'Fire':
        return <Flame className="h-4 w-4 text-orange-500" />;
      default:
        return <Ambulance className="h-4 w-4 text-green-500" />;
    }
  };

  const getAgencyColor = (agencyType: string) => {
    switch (agencyType) {
      case 'Police':
        return 'border-l-blue-500';
      case 'Fire':
        return 'border-l-orange-500';
      default:
        return 'border-l-green-500';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Star className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-semibold mb-2">Sign in Required</h2>
            <p className="text-muted-foreground">
              Please sign in to view and manage your saved dispatch events.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="shrink-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
            Saved Events
          </h1>
          <p className="text-muted-foreground">
            {favorites.length} saved dispatch{favorites.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search saved events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {availableTags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedTag === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTag(null)}
            >
              <Filter className="h-3 w-3 mr-1" />
              All
            </Button>
            {availableTags.map(tag => (
              <Button
                key={tag}
                variant={selectedTag === tag ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTag(tag)}
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading saved events...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && favorites.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Star className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-semibold mb-2">No Saved Events</h2>
            <p className="text-muted-foreground mb-4">
              Click the star icon on any dispatch event to save it for quick access.
            </p>
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {!isLoading && favorites.length > 0 && filteredFavorites.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold mb-2">No Matching Events</h2>
            <p className="text-muted-foreground">
              No saved events match your search criteria.
            </p>
            <Button 
              variant="link" 
              onClick={() => { setSearchQuery(''); setSelectedTag(null); }}
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Favorites List */}
      {!isLoading && filteredFavorites.length > 0 && (
        <div className="space-y-3">
          {filteredFavorites.map(fav => (
            <Card 
              key={fav.savedId}
              className={`cursor-pointer hover:shadow-md transition-all border-l-4 ${
                fav.event ? getAgencyColor(fav.event.agency_type) : 'border-l-gray-300'
              }`}
              onClick={() => fav.event && onSelectEvent(fav.event)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Agency Icon */}
                  <div className="shrink-0 p-2 rounded-lg bg-muted">
                    {fav.event ? getAgencyIcon(fav.event.agency_type) : <Star className="h-4 w-4" />}
                  </div>
                  
                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-base">
                          {fav.event?.call_type || 'Unknown Event'}
                        </h3>
                        {fav.event?.address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{fav.event.address}</span>
                          </p>
                        )}
                      </div>
                      
                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-500 shrink-0"
                        onClick={(e) => handleRemove(fav.eventId, e)}
                        title="Remove from favorites"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {fav.event && (
                        <>
                          <Badge variant="outline" className="text-xs">
                            {fav.event.jurisdiction}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {fav.event.call_created 
                              ? formatDistanceToNow(new Date(fav.event.call_created), { addSuffix: true })
                              : 'Unknown time'
                            }
                          </span>
                        </>
                      )}
                    </div>
                    
                    {/* Tags */}
                    {fav.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {fav.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            <Tag className="h-2 w-2 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Notes */}
                    {fav.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">
                        "{fav.notes}"
                      </p>
                    )}
                    
                    {/* Saved Time */}
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      Saved {format(new Date(fav.savedAt), 'PPp')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
