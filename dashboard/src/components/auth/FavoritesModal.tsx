/**
 * Favorites Modal Component for 911 Dispatch Dashboard
 * 
 * Manage favorite jurisdictions, call types, and saved search filters
 * for quick access to frequently monitored areas and events.
 * 
 * @author William Nelson
 * @created December 2025
 * @license MIT
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Star,
  StarOff,
  MapPin,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  X,
  Trash2,
  Heart,
  Bookmark,
  Clock,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  jurisdictions?: string[];
  callTypes?: string[];
  onApplyFilter?: (filter: { jurisdictions?: string[], callTypes?: string[] }) => void;
}

interface SavedFilter {
  id: string;
  name: string;
  jurisdictions: string[];
  callTypes: string[];
  createdAt: Date;
}

export function FavoritesModal({ isOpen, onClose, jurisdictions = [], callTypes = [], onApplyFilter }: FavoritesModalProps) {
  const [activeTab, setActiveTab] = useState<'jurisdictions' | 'calltypes' | 'filters'>('jurisdictions');
  const [searchTerm, setSearchTerm] = useState('');

  // Load favorites from localStorage on mount
  const [favoriteJurisdictions, setFavoriteJurisdictions] = useState<string[]>(() => {
    const stored = localStorage.getItem('favoriteJurisdictions');
    return stored ? JSON.parse(stored) : [];
  });
  const [favoriteCallTypes, setFavoriteCallTypes] = useState<string[]>(() => {
    const stored = localStorage.getItem('favoriteCallTypes');
    return stored ? JSON.parse(stored) : [];
  });
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    const stored = localStorage.getItem('savedFilters');
    return stored ? JSON.parse(stored) : [];
  });
  const [isCreatingFilter, setIsCreatingFilter] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('favoriteJurisdictions', JSON.stringify(favoriteJurisdictions));
  }, [favoriteJurisdictions]);

  useEffect(() => {
    localStorage.setItem('favoriteCallTypes', JSON.stringify(favoriteCallTypes));
  }, [favoriteCallTypes]);

  useEffect(() => {
    localStorage.setItem('savedFilters', JSON.stringify(savedFilters));
  }, [savedFilters]);

  const toggleJurisdiction = (jurisdiction: string) => {
    setFavoriteJurisdictions(prev => 
      prev.includes(jurisdiction) 
        ? prev.filter(j => j !== jurisdiction)
        : [...prev, jurisdiction]
    );
  };

  const toggleCallType = (callType: string) => {
    setFavoriteCallTypes(prev => 
      prev.includes(callType) 
        ? prev.filter(c => c !== callType)
        : [...prev, callType]
    );
  };

  const createSavedFilter = () => {
    if (!newFilterName.trim()) return;
    
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: newFilterName,
      jurisdictions: favoriteJurisdictions,
      callTypes: favoriteCallTypes,
      createdAt: new Date()
    };
    
    setSavedFilters(prev => [...prev, newFilter]);
    setNewFilterName('');
    setIsCreatingFilter(false);
  };

  const deleteFilter = (id: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== id));
  };

  const applyFilter = (filter: SavedFilter) => {
    if (onApplyFilter) {
      onApplyFilter({
        jurisdictions: filter.jurisdictions,
        callTypes: filter.callTypes
      });
    }
    onClose();
  };

  const filteredJurisdictions = jurisdictions.filter(j => 
    j.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCallTypes = callTypes.filter(c => 
    c.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryIcon = (callType: string) => {
    const type = callType.toLowerCase();
    if (type.includes('fire') || type.includes('burn')) return '🔥';
    if (type.includes('medic') || type.includes('aid') || type.includes('injury')) return '🚑';
    if (type.includes('accident') || type.includes('collision')) return '🚗';
    if (type.includes('assault') || type.includes('weapon') || type.includes('shooting')) return '⚠️';
    if (type.includes('theft') || type.includes('burglary')) return '🔒';
    if (type.includes('alarm')) return '🔔';
    return '📍';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-slate-900/95 border-slate-700/50 backdrop-blur-xl p-0 overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
              <Star className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Favorites & Filters</h2>
              <p className="text-sm text-slate-400">Quick access to your preferred monitoring areas</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl">
            <button
              onClick={() => setActiveTab('jurisdictions')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'jurisdictions'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Jurisdictions
              {favoriteJurisdictions.length > 0 && (
                <Badge className="ml-1 bg-blue-400/20 text-blue-300 border-0 text-xs">
                  {favoriteJurisdictions.length}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab('calltypes')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'calltypes'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Call Types
              {favoriteCallTypes.length > 0 && (
                <Badge className="ml-1 bg-purple-400/20 text-purple-300 border-0 text-xs">
                  {favoriteCallTypes.length}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab('filters')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'filters'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg shadow-green-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Saved Filters
              {savedFilters.length > 0 && (
                <Badge className="ml-1 bg-green-400/20 text-green-300 border-0 text-xs">
                  {savedFilters.length}
                </Badge>
              )}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {activeTab !== 'filters' && (
          <div className="px-6 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={`Search ${activeTab === 'jurisdictions' ? 'jurisdictions' : 'call types'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 pt-4">
          {activeTab === 'jurisdictions' && (
            <div className="space-y-4">
              {/* Favorite Jurisdictions */}
              {favoriteJurisdictions.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Your Favorites
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {favoriteJurisdictions.map(jurisdiction => (
                      <Badge
                        key={jurisdiction}
                        className="bg-amber-500/20 text-amber-300 border-amber-500/30 cursor-pointer hover:bg-amber-500/30 transition-colors"
                        onClick={() => toggleJurisdiction(jurisdiction)}
                      >
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        {jurisdiction}
                        <X className="w-3 h-3 ml-1 hover:text-red-400" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <ScrollArea className="h-64">
                <div className="grid grid-cols-2 gap-2">
                  {filteredJurisdictions.map(jurisdiction => {
                    const isFavorite = favoriteJurisdictions.includes(jurisdiction);
                    return (
                      <button
                        key={jurisdiction}
                        onClick={() => toggleJurisdiction(jurisdiction)}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          isFavorite
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : 'bg-slate-800/30 border-slate-700/50 text-slate-300 hover:bg-slate-800/50 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-sm truncate">{jurisdiction}</span>
                        {isFavorite ? (
                          <Star className="w-4 h-4 fill-current flex-shrink-0 ml-2" />
                        ) : (
                          <StarOff className="w-4 h-4 flex-shrink-0 ml-2 opacity-50" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {activeTab === 'calltypes' && (
            <div className="space-y-4">
              {/* Favorite Call Types */}
              {favoriteCallTypes.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Your Favorites
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {favoriteCallTypes.map(callType => (
                      <Badge
                        key={callType}
                        className="bg-purple-500/20 text-purple-300 border-purple-500/30 cursor-pointer hover:bg-purple-500/30 transition-colors"
                        onClick={() => toggleCallType(callType)}
                      >
                        {getCategoryIcon(callType)} {callType}
                        <X className="w-3 h-3 ml-1 hover:text-red-400" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <ScrollArea className="h-64">
                <div className="grid grid-cols-2 gap-2">
                  {filteredCallTypes.map(callType => {
                    const isFavorite = favoriteCallTypes.includes(callType);
                    return (
                      <button
                        key={callType}
                        onClick={() => toggleCallType(callType)}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          isFavorite
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                            : 'bg-slate-800/30 border-slate-700/50 text-slate-300 hover:bg-slate-800/50 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-sm truncate flex items-center gap-2">
                          <span>{getCategoryIcon(callType)}</span>
                          {callType}
                        </span>
                        {isFavorite ? (
                          <Heart className="w-4 h-4 fill-current flex-shrink-0 ml-2" />
                        ) : (
                          <Heart className="w-4 h-4 flex-shrink-0 ml-2 opacity-50" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {activeTab === 'filters' && (
            <div className="space-y-4">
              {/* Create New Filter */}
              {isCreatingFilter ? (
                <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30">
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="w-5 h-5 text-green-400" />
                    <span className="text-white font-medium">Create New Filter</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">
                    Save your current favorites as a quick filter
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Filter name..."
                      value={newFilterName}
                      onChange={(e) => setNewFilterName(e.target.value)}
                      className="flex-1 bg-slate-800/50 border-slate-600 text-white"
                    />
                    <Button
                      onClick={createSavedFilter}
                      className="bg-green-600 hover:bg-green-500"
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setIsCreatingFilter(false)}
                      className="text-slate-400"
                    >
                      Cancel
                    </Button>
                  </div>
                  {favoriteJurisdictions.length > 0 || favoriteCallTypes.length > 0 ? (
                    <div className="mt-3 text-xs text-slate-400">
                      Will include: {favoriteJurisdictions.length} jurisdictions, {favoriteCallTypes.length} call types
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-amber-400">
                      Select some favorites first in the other tabs
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  onClick={() => setIsCreatingFilter(true)}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Filter from Favorites
                </Button>
              )}

              {/* Saved Filters List */}
              <ScrollArea className="h-64">
                {savedFilters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Filter className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">No saved filters yet</p>
                    <p className="text-xs mt-1">Create one to quickly apply your favorite selections</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedFilters.map(filter => (
                      <div
                        key={filter.id}
                        className="group p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-white">{filter.name}</h4>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteFilter(filter.id)}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {filter.jurisdictions.length} jurisdictions
                          </span>
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {filter.callTypes.length} call types
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(filter.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => applyFilter(filter)}
                          className="w-full bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30"
                        >
                          Apply Filter
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {activeTab !== 'filters' && (
          <div className="px-6 pb-6 pt-2 border-t border-slate-700/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                {activeTab === 'jurisdictions' 
                  ? `${favoriteJurisdictions.length} selected`
                  : `${favoriteCallTypes.length} selected`
                }
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (activeTab === 'jurisdictions') {
                      setFavoriteJurisdictions([]);
                    } else {
                      setFavoriteCallTypes([]);
                    }
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  Clear All
                </Button>
                <Button
                  onClick={() => {
                    if (onApplyFilter) {
                      onApplyFilter({
                        jurisdictions: activeTab === 'jurisdictions' ? favoriteJurisdictions : undefined,
                        callTypes: activeTab === 'calltypes' ? favoriteCallTypes : undefined
                      });
                    }
                    onClose();
                  }}
                  className="bg-blue-600 hover:bg-blue-500"
                  disabled={
                    (activeTab === 'jurisdictions' && favoriteJurisdictions.length === 0) ||
                    (activeTab === 'calltypes' && favoriteCallTypes.length === 0)
                  }
                >
                  Apply Selection
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
