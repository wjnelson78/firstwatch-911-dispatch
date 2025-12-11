import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/services/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Trash2, AlertCircle, Users } from 'lucide-react';

interface ChatUser {
  id: number;
  firstName: string;
  lastName: string;
  initials: string;
}

interface ChatMessage {
  id: number;
  message: string;
  eventId: number | null;
  createdAt: string;
  user: ChatUser;
}

interface ChatForumProps {
  eventId?: number;  // Optional: filter messages for specific incident
  compact?: boolean; // Optional: show in compact mode
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export function ChatForum({ eventId, compact = false }: ChatForumProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInitialLoadRef = useRef(true);

  // Fetch messages
  const fetchMessages = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const url = eventId 
        ? `${API_BASE}/chat/messages?eventId=${eventId}`
        : `${API_BASE}/chat/messages`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch messages');
      
      const data = await response.json();
      setMessages(data.messages);
      setError(null);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
      isInitialLoadRef.current = false;
    }
  }, [eventId]);

  // Initial load and polling
  useEffect(() => {
    fetchMessages(true);
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(() => fetchMessages(false), 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current && messages.length > 0) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const accessToken = getAccessToken();
    if (!accessToken || !newMessage.trim()) return;
    
    setIsSending(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          eventId: eventId || null
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }
      
      const sentMessage = await response.json();
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: number) => {
    const accessToken = getAccessToken();
    if (!accessToken) return;
    
    try {
      const response = await fetch(`${API_BASE}/chat/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete message');
      }
      
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      console.error('Error deleting message:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete message');
    }
  };

  // Format timestamp
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get avatar color based on user ID
  const getAvatarColor = (userId: number) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
      'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500'
    ];
    return colors[userId % colors.length];
  };

  if (isLoading && isInitialLoadRef.current) {
    return (
      <Card className={compact ? '' : 'h-[500px]'}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5" />
            Community Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading messages...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={compact ? '' : 'h-[500px] flex flex-col'}>
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5" />
            {eventId ? 'Incident Discussion' : 'Community Chat'}
          </div>
          <Badge variant="outline" className="font-normal">
            <Users className="h-3 w-3 mr-1" />
            {messages.length} messages
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col min-h-0 pt-0">
        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm mb-2 p-2 bg-destructive/10 rounded">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        
        {/* Messages area */}
        <ScrollArea className="flex-1 pr-4 -mr-4" ref={scrollAreaRef}>
          <div className="space-y-3 pb-2">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No messages yet</p>
                {user && <p className="text-sm">Be the first to start the conversation!</p>}
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = user?.id === msg.user.id;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 ${getAvatarColor(msg.user.id)}`}
                    >
                      {msg.user.initials || '??'}
                    </div>
                    
                    {/* Message bubble */}
                    <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : ''}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium">
                          {msg.user.firstName} {msg.user.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(msg.createdAt)}
                        </span>
                        
                        {/* Delete button */}
                        {isOwn && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            title="Delete message"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      
                      <div
                        className={`px-3 py-2 rounded-lg text-sm ${
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {msg.message}
                      </div>
                      
                      {msg.eventId && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Incident #{msg.eventId}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        
        {/* Input area */}
        {user ? (
          <form onSubmit={handleSendMessage} className="flex gap-2 mt-3 pt-3 border-t">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              maxLength={1000}
              disabled={isSending}
              className="flex-1"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={isSending || !newMessage.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <div className="mt-3 pt-3 border-t text-center text-sm text-muted-foreground">
            <a href="#" className="text-primary hover:underline" onClick={(e) => {
              e.preventDefault();
              // This will trigger the auth modal through the UserMenu
              document.querySelector<HTMLButtonElement>('[data-auth-trigger]')?.click();
            }}>
              Sign in
            </a>
            {' '}to join the conversation
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ChatForum;
