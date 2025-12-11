/**
 * Private Chat Component
 * 
 * One-on-one and group messaging for users and agencies.
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/services/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Users, 
  User,
  Search,
  Plus,
  Send,
  ArrowLeft,
  CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface Conversation {
  id: number;
  name: string | null;
  isGroup: boolean;
  createdBy: number;
  createdAt: string;
  participants: Participant[];
  lastMessage?: PrivateMessage;
  unreadCount: number;
}

interface Participant {
  userId: number;
  username: string;
  firstName: string;
  lastName: string;
  role: 'member' | 'admin' | 'agency';
  isOnline?: boolean;
}

interface PrivateMessage {
  id: number;
  conversationId: number;
  senderId: number;
  senderUsername: string;
  senderFirstName: string;
  senderLastName: string;
  content: string;
  mediaUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export function PrivateChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Participant[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [groupName, setGroupName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch conversations
  useEffect(() => {
    if (user) {
      fetchConversations();
      // Poll for new conversations/messages every 10 seconds
      pollIntervalRef.current = setInterval(fetchConversations, 10000);
      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    }
  }, [user]);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      const convId = selectedConversation.id;
      fetchMessages(convId);
      // Poll for new messages every 3 seconds when in a conversation
      const messageInterval = setInterval(() => {
        fetchMessages(convId);
      }, 3000);
      return () => clearInterval(messageInterval);
    }
  }, [selectedConversation]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const accessToken = getAccessToken();
      if (!accessToken) return;

      const response = await fetch(`${API_BASE}/conversations`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (conversationId: number) => {
    try {
      const accessToken = getAccessToken();
      if (!accessToken) return;

      const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const accessToken = getAccessToken();
      if (!accessToken) return;

      const response = await fetch(`${API_BASE}/users/available`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    try {
      const accessToken = getAccessToken();
      if (!accessToken) return;

      const response = await fetch(`${API_BASE}/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ content: newMessage.trim() })
      });

      if (response.ok) {
        setNewMessage('');
        fetchMessages(selectedConversation.id);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const accessToken = getAccessToken();
      if (!accessToken) return;

      const response = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          participantIds: selectedUsers,
          isGroup: selectedUsers.length > 1,
          name: selectedUsers.length > 1 ? groupName : undefined
        })
      });

      if (response.ok) {
        const newConversation = await response.json();
        setShowNewChat(false);
        setSelectedUsers([]);
        setGroupName('');
        fetchConversations();
        setSelectedConversation(newConversation);
      }
    } catch (err) {
      console.error('Error creating conversation:', err);
    }
  };

  const getConversationName = (conv: Conversation) => {
    if (conv.name) return conv.name;
    if (conv.isGroup) return 'Group Chat';
    const otherParticipant = conv.participants.find(p => p.userId !== user?.id);
    return otherParticipant 
      ? `${otherParticipant.firstName} ${otherParticipant.lastName}` 
      : 'Unknown';
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const name = getConversationName(conv).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  // New Chat Modal
  if (showNewChat) {
    if (availableUsers.length === 0) {
      fetchAvailableUsers();
    }

    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur h-[600px] flex flex-col">
        <CardHeader className="border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNewChat(false)}
              className="text-slate-400 hover:text-white"
              title="Back to conversations"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-white">New Conversation</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-4">
          {selectedUsers.length > 1 && (
            <div className="mb-4">
              <Input
                placeholder="Group name (optional)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>
          )}
          
          <div className="mb-4">
            <p className="text-sm text-slate-400 mb-2">
              Select users to start a conversation ({selectedUsers.length} selected)
            </p>
          </div>
          
          <ScrollArea className="h-[350px]">
            <div className="space-y-2">
              {availableUsers.map(u => (
                <button
                  key={u.userId}
                  onClick={() => {
                    setSelectedUsers(prev => 
                      prev.includes(u.userId) 
                        ? prev.filter(id => id !== u.userId)
                        : [...prev, u.userId]
                    );
                  }}
                  className={cn(
                    "w-full p-3 rounded-lg flex items-center gap-3 transition-colors",
                    selectedUsers.includes(u.userId)
                      ? "bg-purple-500/20 border border-purple-500/50"
                      : "bg-slate-800/50 hover:bg-slate-700/50"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-medium">
                      {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-sm text-slate-400">@{u.username}</p>
                  </div>
                  {u.role === 'agency' && (
                    <Badge className="ml-auto bg-blue-500/20 text-blue-400">Agency</Badge>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
          
          <Button
            onClick={handleCreateConversation}
            disabled={selectedUsers.length === 0}
            className="w-full mt-4 bg-purple-500 hover:bg-purple-600"
          >
            Start Conversation
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur h-[600px] flex">
      {/* Conversations List */}
      <div className={cn(
        "w-80 border-r border-slate-700 flex flex-col",
        selectedConversation ? "hidden md:flex" : "flex w-full md:w-80"
      )}>
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-400" />
              Messages
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNewChat(true)}
              className="text-slate-400 hover:text-white"
              title="New conversation"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-white"
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 text-center text-slate-400">Loading...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400">No conversations yet</p>
              <Button
                onClick={() => setShowNewChat(true)}
                variant="outline"
                className="mt-4 border-slate-700"
              >
                Start a conversation
              </Button>
            </div>
          ) : (
            <div className="p-2">
              {filteredConversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={cn(
                    "w-full p-3 rounded-lg flex items-center gap-3 transition-colors",
                    selectedConversation?.id === conv.id
                      ? "bg-purple-500/20"
                      : "hover:bg-slate-800/50"
                  )}
                >
                  <div className="relative">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center",
                      conv.isGroup 
                        ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                        : "bg-gradient-to-br from-purple-500 to-pink-500"
                    )}>
                      {conv.isGroup ? (
                        <Users className="h-6 w-6 text-white" />
                      ) : (
                        <User className="h-6 w-6 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-white truncate">
                        {getConversationName(conv)}
                      </p>
                      {conv.lastMessage && (
                        <span className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="text-sm text-slate-400 truncate">
                        {conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {conv.unreadCount > 0 && (
                    <Badge className="bg-purple-500 text-white">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Messages View */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-700 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedConversation(null)}
              className="md:hidden text-slate-400 hover:text-white"
              title="Back to conversations"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              selectedConversation.isGroup 
                ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                : "bg-gradient-to-br from-purple-500 to-pink-500"
            )}>
              {selectedConversation.isGroup ? (
                <Users className="h-5 w-5 text-white" />
              ) : (
                <User className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-white">
                {getConversationName(selectedConversation)}
              </h3>
              {selectedConversation.isGroup && (
                <p className="text-xs text-slate-400">
                  {selectedConversation.participants.length} participants
                </p>
              )}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg, index) => {
                const isOwn = msg.senderId === user?.id;
                const showAvatar = !isOwn && (
                  index === 0 || 
                  messages[index - 1].senderId !== msg.senderId
                );
                
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-2",
                      isOwn ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isOwn && showAvatar && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-white font-medium">
                          {msg.senderFirstName.charAt(0)}{msg.senderLastName.charAt(0)}
                        </span>
                      </div>
                    )}
                    {!isOwn && !showAvatar && <div className="w-8" />}
                    <div className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2",
                      isOwn 
                        ? "bg-purple-500 text-white rounded-br-md"
                        : "bg-slate-800 text-white rounded-bl-md"
                    )}>
                      {!isOwn && showAvatar && (
                        <p className="text-xs text-slate-400 mb-1">
                          {msg.senderFirstName}
                        </p>
                      )}
                      <p className="text-sm">{msg.content}</p>
                      <div className={cn(
                        "flex items-center gap-1 mt-1",
                        isOwn ? "justify-end" : "justify-start"
                      )}>
                        <span className="text-[10px] opacity-60">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </span>
                        {isOwn && (
                          <CheckCheck className={cn(
                            "h-3 w-3",
                            msg.isRead ? "text-blue-400" : "text-slate-400"
                          )} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-slate-800/50 border-slate-700 text-white"
                disabled={isSending}
              />
              <Button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="bg-purple-500 hover:bg-purple-600"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400">Select a conversation to start messaging</p>
          </div>
        </div>
      )}
    </Card>
  );
}

export default PrivateChat;
