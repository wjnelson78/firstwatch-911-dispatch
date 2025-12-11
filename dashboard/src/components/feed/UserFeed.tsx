/**
 * User Feed Component
 * 
 * Social media-style feed where users can post messages, photos, videos,
 * and interact with other community members through likes and comments.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/services/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageCircle, 
  Send, 
  MapPin,
  MoreHorizontal,
  X,
  Camera,
  Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_URL || '';

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
  userReaction: 'like' | 'dislike' | null;
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user: PostUser;
}

export function UserFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [postComments, setPostComments] = useState<Record<number, Comment[]>>({});
  const [newComments, setNewComments] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

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
      setPosts(data.posts);
      setError(null);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchPosts]);

  // Create new post
  const handleCreatePost = async () => {
    if (!newPostContent.trim() && selectedFiles.length === 0) return;
    
    const accessToken = getAccessToken();
    if (!accessToken) return;
    
    setIsPosting(true);
    try {
      // For now, just send text content. File upload would need a separate endpoint
      const response = await fetch(`${API_BASE}/feed/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          content: newPostContent.trim(),
          mediaUrls: [],
          mediaTypes: []
        })
      });
      
      if (!response.ok) throw new Error('Failed to create post');
      
      const newPost = await response.json();
      setPosts(prev => [newPost, ...prev]);
      setNewPostContent('');
      setSelectedFiles([]);
      setPreviewUrls([]);
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  // Handle reaction (like/dislike)
  const handleReaction = async (postId: number, reactionType: 'like' | 'dislike') => {
    const accessToken = getAccessToken();
    if (!accessToken) return;
    
    try {
      const response = await fetch(`${API_BASE}/feed/posts/${postId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ reactionType })
      });
      
      if (!response.ok) throw new Error('Failed to react');
      
      const data = await response.json();
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likesCount: data.likesCount, dislikesCount: data.dislikesCount, userReaction: data.userReaction }
          : post
      ));
    } catch (err) {
      console.error('Error reacting to post:', err);
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

  // Add comment
  const handleAddComment = async (postId: number) => {
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
        body: JSON.stringify({ content: commentText })
      });
      
      if (!response.ok) throw new Error('Failed to add comment');
      
      const newComment = await response.json();
      setPostComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment]
      }));
      setPosts(prev => prev.map(post =>
        post.id === postId ? { ...post, commentsCount: post.commentsCount + 1 } : post
      ));
      setNewComments(prev => ({ ...prev, [postId]: '' }));
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
                        <img 
                          src={url} 
                          alt="Preview" 
                          className="h-20 w-20 object-cover rounded-lg border border-slate-700"
                        />
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
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
                  {post.mediaUrls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt=""
                      className="rounded-lg w-full object-cover max-h-80"
                    />
                  ))}
                </div>
              )}

              {/* Post Location */}
              {post.location && (
                <div className="flex items-center gap-1 text-slate-500 text-sm mb-3">
                  <MapPin className="h-3 w-3" />
                  {post.location}
                </div>
              )}

              {/* Post Stats */}
              <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                {post.likesCount > 0 && <span>{post.likesCount} likes</span>}
                {post.dislikesCount > 0 && <span>{post.dislikesCount} dislikes</span>}
                {post.commentsCount > 0 && <span>{post.commentsCount} comments</span>}
              </div>

              <Separator className="bg-slate-700 mb-3" />

              {/* Post Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReaction(post.id, 'like')}
                  className={cn(
                    "flex-1 gap-2",
                    post.userReaction === 'like' 
                      ? "text-blue-400 bg-blue-500/10" 
                      : "text-slate-400 hover:text-white hover:bg-slate-700"
                  )}
                >
                  <ThumbsUp className="h-4 w-4" />
                  Like
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReaction(post.id, 'dislike')}
                  className={cn(
                    "flex-1 gap-2",
                    post.userReaction === 'dislike' 
                      ? "text-red-400 bg-red-500/10" 
                      : "text-slate-400 hover:text-white hover:bg-slate-700"
                  )}
                >
                  <ThumbsDown className="h-4 w-4" />
                  Dislike
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleComments(post.id)}
                  className={cn(
                    "flex-1 gap-2",
                    expandedComments.has(post.id)
                      ? "text-purple-400 bg-purple-500/10"
                      : "text-slate-400 hover:text-white hover:bg-slate-700"
                  )}
                >
                  <MessageCircle className="h-4 w-4" />
                  Comment
                </Button>
              </div>

              {/* Comments Section */}
              {expandedComments.has(post.id) && (
                <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                  {postComments[post.id]?.map(comment => (
                    <div key={comment.id} className="flex gap-2">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0",
                        getAvatarColor(comment.user.id)
                      )}>
                        {comment.user.initials}
                      </div>
                      <div className="flex-1 bg-slate-800/50 rounded-lg p-2">
                        <p className="text-xs font-medium text-slate-300">
                          {comment.user.firstName} {comment.user.lastName}
                          <span className="font-normal text-slate-500 ml-2">
                            {formatTime(comment.createdAt)}
                          </span>
                        </p>
                        <p className="text-sm text-slate-200">{comment.content}</p>
                      </div>
                    </div>
                  ))}

                  {/* Add Comment */}
                  {user && (
                    <div className="flex gap-2">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0",
                        getAvatarColor(user.id)
                      )}>
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </div>
                      <div className="flex-1 flex gap-2">
                        <Input
                          value={newComments[post.id] || ''}
                          onChange={(e) => setNewComments(prev => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder="Write a comment..."
                          className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                        />
                        <Button
                          size="icon"
                          onClick={() => handleAddComment(post.id)}
                          disabled={!newComments[post.id]?.trim()}
                          className="bg-purple-500 hover:bg-purple-600"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

export default UserFeed;
