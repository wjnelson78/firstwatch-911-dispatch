/**
 * Active Users Component for 911 Dispatch Dashboard
 * 
 * Displays real-time count of active users on the site.
 * Sends periodic heartbeats to the server to track presence.
 * Shows both authenticated and anonymous user counts.
 * 
 * @author William Nelson
 * @created December 2025
 * @license MIT
 */

import { useState, useEffect, useCallback } from 'react';
import { Users, UserCheck, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

// Generate a unique session ID for this browser tab
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('dispatch_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('dispatch_session_id', sessionId);
  }
  return sessionId;
};

interface ActiveUsersData {
  total: number;
  authenticated: number;
  anonymous: number;
}

/**
 * ActiveUsers Component
 * 
 * Displays a compact indicator showing how many users are currently
 * viewing the dashboard. Updates in real-time via heartbeat mechanism.
 */
export function ActiveUsers() {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState<ActiveUsersData>({ total: 1, authenticated: 0, anonymous: 1 });
  const [isOnline, setIsOnline] = useState(true);

  /**
   * Send heartbeat to server
   */
  const sendHeartbeat = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: getSessionId(),
          isAuthenticated: !!user,
          userId: user?.id || null
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setActiveUsers(data.activeUsers);
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch (error) {
      console.error('Heartbeat failed:', error);
      setIsOnline(false);
    }
  }, [user]);

  /**
   * Send initial heartbeat and set up interval
   */
  useEffect(() => {
    // Use a flag to track if component is mounted
    let isMounted = true;
    
    // Initial heartbeat with slight delay to avoid sync setState
    const initialTimeout = setTimeout(() => {
      if (isMounted) sendHeartbeat();
    }, 100);
    
    // Send heartbeat every 15 seconds
    const interval = setInterval(() => {
      if (isMounted) sendHeartbeat();
    }, 15000);
    
    // Cleanup on unmount
    return () => {
      isMounted = false;
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [sendHeartbeat]);

  /**
   * Handle page visibility changes
   * Send heartbeat when page becomes visible again
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [sendHeartbeat]);

  /**
   * Send heartbeat before page unload (cleanup)
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery during page unload
      navigator.sendBeacon(
        `${API_URL}/api/heartbeat`,
        JSON.stringify({
          sessionId: getSessionId(),
          isAuthenticated: !!user,
          userId: user?.id || null,
          leaving: true
        })
      );
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
      {/* Online indicator */}
      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
      
      {/* Total users */}
      <div className="flex items-center gap-1.5">
        <Users className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-200">
          {activeUsers.total}
        </span>
      </div>
      
      {/* Breakdown tooltip on hover */}
      <div className="group relative">
        <Eye className="h-3.5 w-3.5 text-slate-500 cursor-help" />
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 min-w-[160px]">
            <p className="text-xs font-semibold text-slate-300 mb-2">Active Viewers</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <UserCheck className="h-3.5 w-3.5 text-green-500" />
                  Signed In
                </span>
                <span className="font-medium text-green-400">{activeUsers.authenticated}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Eye className="h-3.5 w-3.5 text-blue-500" />
                  Anonymous
                </span>
                <span className="font-medium text-blue-400">{activeUsers.anonymous}</span>
              </div>
            </div>
            {/* Tooltip arrow */}
            <div className="absolute -bottom-1 right-4 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 transform rotate-45" />
          </div>
        </div>
      </div>
    </div>
  );
}
