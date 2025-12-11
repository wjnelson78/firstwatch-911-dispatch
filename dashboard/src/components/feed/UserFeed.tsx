/**
 * User Feed Component
 * 
 * Social media-style feed where users can post messages, photos, videos,
 * and interact with other community members through reactions and comments.
 * Styled to match Facebook's familiar interface.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/services/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ThumbsUp, 
  MessageCircle, 
  Share2,
  Send, 
  MapPin,
  MoreHorizontal,
  X,
  Camera,
  Users,
  Smile,
  Image
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type { DispatchEvent } from '@/types/dispatch';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Reaction types with emojis
type ReactionType = 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry' | null;

const REACTIONS = [
  { type: 'like' as const, emoji: '👍', label: 'Like', color: 'text-blue-500' },
  { type: 'love' as const, emoji: '❤️', label: 'Love', color: 'text-red-500' },
  { type: 'care' as const, emoji: '🥰', label: 'Care', color: 'text-orange-400' },
  { type: 'haha' as const, emoji: '😂', label: 'Haha', color: 'text-yellow-400' },
  { type: 'wow' as const, emoji: '😮', label: 'Wow', color: 'text-yellow-400' },
  { type: 'sad' as const, emoji: '😢', label: 'Sad', color: 'text-yellow-400' },
  { type: 'angry' as const, emoji: '😡', label: 'Angry', color: 'text-orange-500' },
];

interface PostUser {
  id: number;
  firstName: string;
  lastName: string;
  initials: string;
}

interface Post {
  id: number;
  content: string;
  mediaUrls: string[];
  mediaTypes: string[];
  location: string | null;
  likesCount: number;
  dislikesCount: number;
  commentsCount: number;
  createdAt: string;
  user: PostUser;
  userReaction: ReactionType;
  dispatchEventId?: string | null;
  // New: track reaction breakdown
  reactions?: { type: string; count: number }[];
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user: PostUser;
  parentId?: number | null;
  replies?: Comment[];
  likesCount?: number;
  userLiked?: boolean;
}

// Sample posts to show when the feed is empty
const SAMPLE_POSTS: Post[] = [
  {
    id: -1,
    content: "🚒 Just witnessed Snohomish County Fire District 7 respond to a structure fire on 164th St SE. Response time was under 4 minutes - incredible work by our local heroes! Stay safe everyone.",
    mediaUrls: [],
    mediaTypes: [],
    location: "Mill Creek, WA",
    likesCount: 24,
    dislikesCount: 0,
    commentsCount: 5,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    user: {
      id: 1,
      firstName: "Sarah",
      lastName: "Mitchell",
      initials: "SM"
    },
    userReaction: null
  },
  {
    id: -2,
    content: "PSA: There's been increased traffic accidents on Highway 2 near Monroe this week due to icy conditions. Please drive carefully and give yourself extra time. Saw deputies responding to 3 fender benders this morning alone. 🚗❄️",
    mediaUrls: [],
    mediaTypes: [],
    location: "Monroe, WA",
    likesCount: 47,
    dislikesCount: 0,
    commentsCount: 3,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    user: {
      id: 2,
      firstName: "David",
      lastName: "Chen",
      initials: "DC"
    },
    userReaction: null
  },
  {
    id: -3,
    content: "Huge shoutout to the paramedics who responded to the medical emergency at Alderwood Mall yesterday. My dad had a cardiac event and they were there in minutes. He's stable now thanks to their quick action. Can't thank them enough! 💙🙏",
    mediaUrls: [],
    mediaTypes: [],
    location: "Lynnwood, WA",
    likesCount: 156,
    dislikesCount: 0,
    commentsCount: 4,
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), // 18 hours ago
    user: {
      id: 3,
      firstName: "Jennifer",
      lastName: "Park",
      initials: "JP"
    },
    userReaction: null
  }
];

// Sample comments for the sample posts
const SAMPLE_COMMENTS: Record<number, Comment[]> = {
  [-1]: [
    { id: 1, content: "So grateful for our first responders! 🙏", createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), user: { id: 4, firstName: "Mike", lastName: "Johnson", initials: "MJ" }, likesCount: 3 },
    { id: 2, content: "Was that near the Safeway? Hope everyone is okay.", createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), user: { id: 5, firstName: "Lisa", lastName: "Wong", initials: "LW" }, likesCount: 1 },
    { id: 3, content: "FD7 is the best! They've helped our family before.", createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), user: { id: 6, firstName: "Tom", lastName: "Bradley", initials: "TB" }, likesCount: 5 },
    { id: 4, content: "Stay safe out there everyone! 🔥🚒", createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(), user: { id: 7, firstName: "Amy", lastName: "Stevens", initials: "AS" }, likesCount: 2 },
    { id: 5, content: "Great response time as always!", createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), user: { id: 8, firstName: "Chris", lastName: "Martinez", initials: "CM" }, likesCount: 0 },
  ],
  [-2]: [
    { id: 6, content: "Thanks for the heads up! Taking 522 instead today.", createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), user: { id: 6, firstName: "Tom", lastName: "Bradley", initials: "TB" }, likesCount: 8 },
    { id: 7, content: "It's been crazy out there. Saw 2 accidents myself.", createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), user: { id: 9, firstName: "Rachel", lastName: "Kim", initials: "RK" }, likesCount: 4 },
    { id: 8, content: "WSDOT needs to sand these roads better 😤", createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), user: { id: 10, firstName: "Dan", lastName: "White", initials: "DW" }, likesCount: 12 },
  ],
  [-3]: [
    { id: 9, content: "So happy to hear your dad is doing better! ❤️", createdAt: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(), user: { id: 7, firstName: "Amy", lastName: "Stevens", initials: "AS" }, likesCount: 24 },
    { id: 10, content: "The medics at Station 17 are amazing. They saved my neighbor last year too.", createdAt: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(), user: { id: 8, firstName: "Chris", lastName: "Martinez", initials: "CM" }, likesCount: 12 },
    { id: 11, content: "Prayers for a full recovery! 🙏💙", createdAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(), user: { id: 11, firstName: "Susan", lastName: "Lee", initials: "SL" }, likesCount: 8 },
    { id: 12, content: "This is why we support our local EMS!", createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), user: { id: 12, firstName: "Bob", lastName: "Harris", initials: "BH" }, likesCount: 6 },
  ]
};

// CommentItem component for rendering comments with nested replies
interface CommentItemProps {
  comment: Comment;
  postId: number;
  depth: number;
  user: { id: number; firstName: string; lastName: string } | null;
  getAvatarColor: (userId: number) => string;
  formatTime: (date: string) => string;
  onReply: (commentId: number, userName: string) => void;
}

function CommentItem({ comment, postId, depth, user, getAvatarColor, formatTime, onReply }: CommentItemProps) {
  const maxDepth = 3; // Limit nesting depth for UI clarity
  const isNested = depth > 0;
  
  return (
    <div className={cn("flex flex-col", isNested && "ml-10")}>
      <div className="flex gap-2">
        <div className={cn(
          "rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0",
          isNested ? "h-6 w-6" : "h-8 w-8",
          getAvatarColor(comment.user.id)
        )}>
          {comment.user.initials}
        </div>
        <div className="flex-1">
          <div className="inline-block bg-slate-800 rounded-2xl px-3 py-2 max-w-[90%]">
            <p className="text-[13px] font-semibold text-white hover:underline cursor-pointer">
              {comment.user.firstName} {comment.user.lastName}
            </p>
            <p className={cn("text-slate-200", isNested ? "text-[13px]" : "text-[15px]")}>{comment.content}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 ml-3 text-xs">
            <span className="text-slate-500">{formatTime(comment.createdAt)}</span>
            <button 
              className="text-slate-400 hover:underline font-semibold"
              onClick={() => {
                if (!user) {
                  document.querySelector<HTMLButtonElement>('[data-auth-trigger]')?.click();
                }
              }}
              title={!user ? "Sign in to like" : "Like this comment"}
            >
              Like
            </button>
            {depth < maxDepth && (
              <button 
                className="text-slate-400 hover:underline font-semibold"
                onClick={() => {
                  if (!user) {
                    document.querySelector<HTMLButtonElement>('[data-auth-trigger]')?.click();
                  } else {
                    onReply(comment.id, `${comment.user.firstName} ${comment.user.lastName}`);
                  }
                }}
                title={!user ? "Sign in to reply" : "Reply to this comment"}
              >
                Reply
              </button>
            )}
            {(comment.likesCount ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-slate-500">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-[8px]">👍</span>
                {comment.likesCount}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              depth={depth + 1}
              user={user}
              getAvatarColor={getAvatarColor}
              formatTime={formatTime}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface UserFeedProps {
  prefilledEvent?: DispatchEvent | null;
  onEventHandled?: () => void;
}

export function UserFeed({ prefilledEvent, onEventHandled }: UserFeedProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [postComments, setPostComments] = useState<Record<number, Comment[]>>(SAMPLE_COMMENTS);
  const [newComments, setNewComments] = useState<Record<number, string>>({});
  const [replyingTo, setReplyingTo] = useState<{ postId: number; commentId: number; userName: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [hoveredReaction, setHoveredReaction] = useState<number | null>(null);
  const [linkedDispatchEventId, setLinkedDispatchEventId] = useState<string | null>(null);

  // Pre-fill post content from dispatch event
  useEffect(() => {
    if (prefilledEvent) {
      const prefillContent = `📢 ${prefilledEvent.call_type}\n\n📍 Location: ${prefilledEvent.address}, ${prefilledEvent.jurisdiction}\n🏢 Agency: ${prefilledEvent.agency_type}${prefilledEvent.units ? `\n🚔 Units: ${prefilledEvent.units}` : ''}\n\n`;
      setNewPostContent(prefillContent);
      setLinkedDispatchEventId(prefilledEvent.event_id);
      onEventHandled?.();
    }
  }, [prefilledEvent, onEventHandled]);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    try {
      const accessToken = getAccessToken();
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await fetch(`${API_BASE}/feed/posts`, { headers });
      if (!response.ok) throw new Error('Failed to fetch posts');
      
      const data = await response.json();
      // Use sample posts if feed is empty
      setPosts(data.posts.length > 0 ? data.posts : SAMPLE_POSTS);
      setError(null);
    } catch (err) {
      console.error('Error fetching posts:', err);
      // Show sample posts on error so feed isn't empty
      setPosts(SAMPLE_POSTS);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchPosts]);

  // Create new post with optional file uploads
  const handleCreatePost = async () => {
    if (!newPostContent.trim() && selectedFiles.length === 0) return;
    
    const accessToken = getAccessToken();
    if (!accessToken) return;
    
    setIsPosting(true);
    try {
      let mediaUrls: string[] = [];
      let mediaTypes: string[] = [];

      // Upload files first if any
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach(file => {
          formData.append('media', file);
        });

        const uploadResponse = await fetch(`${API_BASE}/feed/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          body: formData
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          mediaUrls = uploadData.urls;
          mediaTypes = uploadData.types;
        }
      }

      // Create the post
      const response = await fetch(`${API_BASE}/feed/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          content: newPostContent.trim(),
          mediaUrls,
          mediaTypes,
          dispatchEventId: linkedDispatchEventId
        })
      });
      
      if (!response.ok) throw new Error('Failed to create post');
      
      const newPost = await response.json();
      setPosts(prev => [newPost, ...prev]);
      setNewPostContent('');
      setSelectedFiles([]);
      setLinkedDispatchEventId(null); // Clear the linked event after posting
      // Clean up preview URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  // Handle reaction - Facebook style with emoji reactions
  const handleReaction = async (postId: number, reactionType: ReactionType) => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      // Prompt user to sign in
      document.querySelector<HTMLButtonElement>('[data-auth-trigger]')?.click();
      return;
    }
    
    // Optimistic update for instant feedback
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    // If clicking same reaction, toggle it off
    const newReaction = post.userReaction === reactionType ? null : reactionType;
    
    // Calculate new counts optimistically
    let newLikesCount = post.likesCount;
    
    // If user had a reaction, decrement count
    if (post.userReaction) newLikesCount--;
    // If setting a new reaction, increment count
    if (newReaction) newLikesCount++;
    
    // Update UI immediately
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, likesCount: newLikesCount, userReaction: newReaction }
        : p
    ));
    
    setHoveredReaction(null);
    
    // For sample posts (negative IDs), don't make API call
    if (postId < 0) return;
    
    try {
      const response = await fetch(`${API_BASE}/feed/posts/${postId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ reactionType: newReaction || 'like' })
      });
      
      if (!response.ok) throw new Error('Failed to react');
      
      const data = await response.json();
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, likesCount: data.likesCount, userReaction: data.userReaction }
          : p
      ));
    } catch (err) {
      console.error('Error reacting to post:', err);
      // Revert on error
      setPosts(prev => prev.map(p => 
        p.id === postId ? post : p
      ));
    }
  };

  // Toggle comments
  const toggleComments = async (postId: number) => {
    if (expandedComments.has(postId)) {
      setExpandedComments(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    } else {
      // Fetch comments if not already loaded
      if (!postComments[postId]) {
        try {
          const response = await fetch(`${API_BASE}/feed/posts/${postId}/comments`);
          if (response.ok) {
            const data = await response.json();
            setPostComments(prev => ({ ...prev, [postId]: data.comments }));
          }
        } catch (err) {
          console.error('Error fetching comments:', err);
        }
      }
      setExpandedComments(prev => new Set(prev).add(postId));
    }
  };

  // Add comment or reply
  const handleAddComment = async (postId: number, parentId?: number) => {
    const commentText = newComments[postId]?.trim();
    if (!commentText) return;
    
    const accessToken = getAccessToken();
    if (!accessToken) return;
    
    try {
      const response = await fetch(`${API_BASE}/feed/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ 
          content: commentText,
          parentId: parentId || null
        })
      });
      
      if (!response.ok) throw new Error('Failed to add comment');
      
      const newComment = await response.json();
      
      // Add to correct location (root or as reply)
      setPostComments(prev => {
        const comments = [...(prev[postId] || [])];
        if (parentId) {
          // Find parent comment and add reply
          const addReplyToComment = (items: Comment[]): Comment[] => {
            return items.map(comment => {
              if (comment.id === parentId) {
                return {
                  ...comment,
                  replies: [...(comment.replies || []), newComment]
                };
              }
              if (comment.replies?.length) {
                return {
                  ...comment,
                  replies: addReplyToComment(comment.replies)
                };
              }
              return comment;
            });
          };
          return { ...prev, [postId]: addReplyToComment(comments) };
        } else {
          return { ...prev, [postId]: [...comments, newComment] };
        }
      });
      
      setPosts(prev => prev.map(post =>
        post.id === postId ? { ...post, commentsCount: post.commentsCount + 1 } : post
      ));
      setNewComments(prev => ({ ...prev, [postId]: '' }));
      setReplyingTo(null);
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files].slice(0, 4)); // Max 4 files
      
      // Create preview URLs
      const urls = files.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...urls].slice(0, 4));
    }
  };

  // Remove selected file
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Get avatar color
  const getAvatarColor = (userId: number) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
      'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500'
    ];
    return colors[userId % colors.length];
  };

  // Format time
  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="bg-slate-900/50 border-slate-700/50 animate-pulse">
            <CardContent className="p-6">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-slate-700 rounded" />
                  <div className="h-20 bg-slate-700 rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Post Card */}
      {user ? (
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0",
                getAvatarColor(user.id)
              )}>
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div className="flex-1 space-y-3">
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="What's happening in your community?"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-purple-500/50 min-h-[80px]"
                  rows={3}
                />
                
                {/* File previews */}
                {previewUrls.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {previewUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        {selectedFiles[index]?.type.startsWith('video/') ? (
                          <video 
                            src={url} 
                            className="h-20 w-20 object-cover rounded-lg border border-slate-700"
                          />
                        ) : (
                          <img 
                            src={url} 
                            alt="Preview" 
                            className="h-20 w-20 object-cover rounded-lg border border-slate-700"
                          />
                        )}
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove file"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {selectedFiles[index]?.type.startsWith('video/') && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/50 rounded-full p-1">
                              <Camera className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      aria-label="Upload photo or video"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-slate-400 hover:text-white hover:bg-slate-700"
                    >
                      <Camera className="h-4 w-4 mr-1" />
                      Photo/Video
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-white hover:bg-slate-700"
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      Location
                    </Button>
                  </div>
                  <Button
                    onClick={handleCreatePost}
                    disabled={isPosting || (!newPostContent.trim() && selectedFiles.length === 0)}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    {isPosting ? 'Posting...' : 'Post'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur">
          <CardContent className="p-6 text-center">
            <p className="text-slate-400">
              <a href="#" className="text-purple-400 hover:underline" onClick={(e) => {
                e.preventDefault();
                document.querySelector<HTMLButtonElement>('[data-auth-trigger]')?.click();
              }}>Sign in</a> to post and interact with the community
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Posts Feed */}
      {posts.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur">
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-slate-600" />
            <h3 className="text-lg font-medium text-white mb-2">No posts yet</h3>
            <p className="text-slate-400">Be the first to share something with the community!</p>
          </CardContent>
        </Card>
      ) : (
        posts.map(post => (
          <Card key={post.id} className="bg-slate-900/50 border-slate-700/50 backdrop-blur">
            <CardContent className="p-4">
              {/* Post Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0",
                    getAvatarColor(post.user.id)
                  )}>
                    {post.user.initials}
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {post.user.firstName} {post.user.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{formatTime(post.createdAt)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              {/* Post Content */}
              <p className="text-slate-200 mb-3 whitespace-pre-wrap">{post.content}</p>

              {/* Post Media */}
              {post.mediaUrls && post.mediaUrls.length > 0 && (
                <div className={cn(
                  "grid gap-2 mb-3",
                  post.mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"
                )}>
                  {post.mediaUrls.map((url, index) => {
                    const isVideo = post.mediaTypes?.[index] === 'video' || url.match(/\.(mp4|mov|webm)$/i);
                    return isVideo ? (
                      <video
                        key={index}
                        src={url}
                        controls
                        className="rounded-lg w-full max-h-80 bg-black"
                      />
                    ) : (
                      <img
                        key={index}
                        src={url}
                        alt=""
                        className="rounded-lg w-full object-cover max-h-80 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(url, '_blank')}
                      />
                    );
                  })}
                </div>
              )}

              {/* Post Location */}
              {post.location && (
                <div className="flex items-center gap-1 text-slate-500 text-sm mb-3">
                  <MapPin className="h-3 w-3" />
                  {post.location}
                </div>
              )}

              {/* Post Stats - Facebook style */}
              <div className="flex items-center justify-between text-sm text-slate-500 mb-3">
                <div className="flex items-center gap-2">
                  {post.likesCount > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="flex -space-x-1">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-xs border-2 border-slate-900">👍</span>
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-xs border-2 border-slate-900">❤️</span>
                      </div>
                      <span className="ml-1 hover:underline cursor-pointer">{post.likesCount}</span>
                    </div>
                  )}
                </div>
                {post.commentsCount > 0 && (
                  <button 
                    onClick={() => toggleComments(post.id)}
                    className="hover:underline cursor-pointer"
                  >
                    {post.commentsCount} comment{post.commentsCount !== 1 ? 's' : ''}
                  </button>
                )}
              </div>

              <Separator className="bg-slate-700 mb-3" />

              {/* Post Actions - Facebook style with emoji reaction picker */}
              <div className="flex items-center gap-1 relative">
                {/* Like button with reaction picker on hover */}
                <div 
                  className="flex-1 relative group"
                  onMouseEnter={() => setHoveredReaction(post.id)}
                  onMouseLeave={() => setHoveredReaction(null)}
                >
                  {/* Emoji reaction picker popup or sign in message */}
                  {hoveredReaction === post.id && (
                    <div className="absolute bottom-full left-0 pb-2 z-50">
                      {user ? (
                        <div className="bg-slate-800 rounded-full shadow-lg border border-slate-700 px-2 py-1.5 flex gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                          {REACTIONS.map((reaction) => (
                            <button
                              key={reaction.type}
                              onClick={() => handleReaction(post.id, reaction.type)}
                              className={cn(
                                "text-2xl hover:scale-125 transition-all p-1.5 rounded-full",
                                post.userReaction === reaction.type 
                                  ? "bg-slate-600 ring-2 ring-blue-400 scale-110" 
                                  : "hover:bg-slate-700"
                              )}
                              title={reaction.label}
                            >
                              {reaction.emoji}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 px-4 py-2 animate-in fade-in slide-in-from-bottom-2 duration-200 whitespace-nowrap">
                          <button 
                            onClick={() => document.querySelector<HTMLButtonElement>('[data-auth-trigger]')?.click()}
                            className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                          >
                            Sign in to react to posts
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReaction(post.id, post.userReaction || 'like')}
                    className={cn(
                      "w-full gap-2 transition-all duration-200 font-semibold",
                      post.userReaction 
                        ? post.userReaction === 'love' ? "text-red-500 bg-red-500/10 hover:bg-red-500/20" 
                          : post.userReaction === 'like' ? "text-blue-500 bg-blue-500/10 hover:bg-blue-500/20"
                          : post.userReaction === 'haha' || post.userReaction === 'wow' || post.userReaction === 'sad' || post.userReaction === 'care' ? "text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20"
                          : post.userReaction === 'angry' ? "text-orange-500 bg-orange-500/10 hover:bg-orange-500/20"
                          : "text-slate-400 hover:text-white hover:bg-slate-700"
                        : "text-slate-400 hover:text-white hover:bg-slate-700"
                    )}
                  >
                    {post.userReaction ? (
                      <>
                        <span className="text-lg">{REACTIONS.find(r => r.type === post.userReaction)?.emoji || '👍'}</span>
                        {REACTIONS.find(r => r.type === post.userReaction)?.label || 'Like'}
                      </>
                    ) : (
                      <>
                        <ThumbsUp className="h-4 w-4" />
                        Like
                      </>
                    )}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleComments(post.id)}
                  className={cn(
                    "flex-1 gap-2 font-semibold",
                    expandedComments.has(post.id)
                      ? "text-purple-400 bg-purple-500/10"
                      : "text-slate-400 hover:text-white hover:bg-slate-700"
                  )}
                >
                  <MessageCircle className="h-4 w-4" />
                  Comment
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 gap-2 text-slate-400 hover:text-white hover:bg-slate-700 font-semibold"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>

              {/* Comments Section - Facebook style */}
              <div className="mt-3 space-y-3">
                {/* View more comments link */}
                {!expandedComments.has(post.id) && post.commentsCount > 0 && (
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="text-sm text-slate-400 hover:underline font-semibold"
                  >
                    View {post.commentsCount > 1 ? `all ${post.commentsCount} comments` : '1 comment'}
                  </button>
                )}

                {/* Existing Comments with Threaded Replies */}
                {expandedComments.has(post.id) && postComments[post.id]?.length > 0 && (
                  <div className="space-y-3">
                    {postComments[post.id].map(comment => (
                      <CommentItem 
                        key={comment.id} 
                        comment={comment} 
                        postId={post.id}
                        depth={0}
                        user={user}
                        getAvatarColor={getAvatarColor}
                        formatTime={formatTime}
                        onReply={(commentId, userName) => {
                          setReplyingTo({ postId: post.id, commentId, userName });
                          setNewComments(prev => ({ ...prev, [post.id]: `@${userName} ` }));
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Reply indicator */}
                {replyingTo?.postId === post.id && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded">
                    <span>Replying to <strong className="text-white">{replyingTo.userName}</strong></span>
                    <button 
                      onClick={() => {
                        setReplyingTo(null);
                        setNewComments(prev => ({ ...prev, [post.id]: '' }));
                      }}
                      className="text-slate-500 hover:text-white"
                      title="Cancel reply"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Comment Input - Facebook style */}
                <div className="flex gap-2">
                  {user ? (
                    <>
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0",
                        getAvatarColor(user.id)
                      )}>
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </div>
                      <div className="flex-1 relative">
                        <Input
                          value={newComments[post.id] || ''}
                          onChange={(e) => setNewComments(prev => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder={replyingTo?.postId === post.id 
                            ? `Reply to ${replyingTo.userName}...` 
                            : `Comment as ${user.firstName} ${user.lastName}`}
                          className="bg-slate-800 border-0 text-white placeholder:text-slate-500 rounded-full pr-24 focus-visible:ring-1 focus-visible:ring-slate-600"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment(post.id, replyingTo?.postId === post.id ? replyingTo.commentId : undefined);
                            }
                          }}
                          onFocus={() => {
                            if (!expandedComments.has(post.id) && post.commentsCount > 0) {
                              toggleComments(post.id);
                            }
                          }}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <button className="p-1 text-slate-500 hover:text-slate-300" title="Emoji">
                            <Smile className="h-4 w-4" />
                          </button>
                          <button className="p-1 text-slate-500 hover:text-slate-300" title="Camera">
                            <Camera className="h-4 w-4" />
                          </button>
                          <button className="p-1 text-slate-500 hover:text-slate-300" title="GIF">
                            <Image className="h-4 w-4" />
                          </button>
                          {newComments[post.id]?.trim() && (
                            <button 
                              onClick={() => handleAddComment(post.id, replyingTo?.postId === post.id ? replyingTo.commentId : undefined)}
                              className="p-1 text-purple-400 hover:text-purple-300"
                              title="Send"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <button 
                      className="flex-1 bg-slate-800 rounded-full px-4 py-2 text-sm text-slate-500 text-left hover:bg-slate-700"
                      onClick={() => document.querySelector<HTMLButtonElement>('[data-auth-trigger]')?.click()}
                    >
                      Sign in to comment...
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

export default UserFeed;
