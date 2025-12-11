/**
 * Snohomish County 911 Dispatch API Server
 * 
 * Express.js REST API server that provides endpoints for accessing 911 dispatch
 * data stored in PostgreSQL. This server powers the real-time dispatch dashboard
 * with filtering, statistics, and live event streaming capabilities.
 * 
 * Endpoints:
 *   GET /api/health        - Health check and database connection status
 *   GET /api/dispatches    - Fetch dispatch events with filtering and pagination
 *   GET /api/dispatches/latest - Fetch latest events for live updates
 *   GET /api/stats         - Aggregate statistics (counts, jurisdictions, timeline)
 *   GET /api/filters       - Available filter options (agencies, call types)
 * 
 * @author William Nelson
 * @created December 2025
 * @license MIT
 * @repository https://github.com/wnelson/firstwatch.net
 */

import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import createAuthRouter, { authenticateToken, optionalAuth } from './auth.js';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

// MinIO Configuration
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || '172.16.32.206';
const MINIO_PORT = parseInt(process.env.MINIO_PORT) || 9000;
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'firstwatch-admin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'FirstWatch911SecureStorage2025!';
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
const MINIO_BUCKET_IMAGES = process.env.MINIO_BUCKET_IMAGES || 'feed-images';
const MINIO_BUCKET_VIDEOS = process.env.MINIO_BUCKET_VIDEOS || 'feed-videos';

// MinIO public URL for serving files
const MINIO_PUBLIC_URL = `http://${MINIO_ENDPOINT}:${MINIO_PORT}`;

// Ensure uploads directory exists (for temporary storage before MinIO upload)
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images and videos only
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max (increased for videos)
    files: 4 // Max 4 files per post
  }
});

const { Pool } = pg;

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 3002;

/**
 * Active Users Tracking
 * 
 * Tracks active users via heartbeat mechanism.
 * Each visitor sends periodic heartbeats with a unique session ID.
 * Sessions are cleaned up after HEARTBEAT_TIMEOUT ms of inactivity.
 */
const activeUsers = new Map(); // Map<sessionId, { lastSeen: timestamp, isAuthenticated: boolean, userId?: string }>
const HEARTBEAT_TIMEOUT = 30000; // 30 seconds - consider user inactive after this

// Clean up stale sessions every 10 seconds
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of activeUsers.entries()) {
    if (now - data.lastSeen > HEARTBEAT_TIMEOUT) {
      activeUsers.delete(sessionId);
    }
  }
}, 10000);

/**
 * PostgreSQL Connection Pool Configuration
 * 
 * Uses environment variables for secure credential management.
 * Falls back to defaults for development environments.
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'dispatch_911',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 5000,
});

// Verify database connection on server startup
pool.query('SELECT NOW()').then(() => {
  console.log('✅ Connected to PostgreSQL database');
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
});

// Middleware configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());  // Parse JSON request bodies
app.use(cookieParser());  // Parse cookies

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Mount authentication routes
app.use('/api/auth', createAuthRouter(pool));

/**
 * Simple test endpoint for connectivity verification
 * @route GET /api/test
 */
app.get('/api/test', (req, res) => {
  res.json({ ok: true });
});

/**
 * Fetch dispatch events with optional filtering and pagination
 * 
 * @route GET /api/dispatches
 * @query {string} startDate - Filter events after this ISO date
 * @query {string} endDate - Filter events before this ISO date
 * @query {string} eventType - Filter by agency type (Police, Fire)
 * @query {string} jurisdiction - Filter by jurisdiction
 * @query {string} callType - Filter by call type
 * @query {string} search - Full-text search across call_type, address, jurisdiction
 * @query {string} sortBy - Sort field (call_created, address, call_type, jurisdiction)
 * @query {string} sortOrder - Sort direction (asc, desc)
 * @query {number} limit - Maximum results to return (default: 100)
 * @query {number} offset - Pagination offset (default: 0)
 * @returns {object} { events: Array<DispatchEvent>, total: number, limit: number, offset: number }
 */
app.get('/api/dispatches', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      eventType, 
      jurisdiction,
      callType,
      search,
      sortBy = 'call_created',
      sortOrder = 'desc',
      limit = 100,
      offset = 0 
    } = req.query;

    // Validate sort parameters to prevent SQL injection
    const allowedSortFields = ['call_created', 'address', 'call_type', 'jurisdiction', 'agency_type', 'first_seen', 'last_seen'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'call_created';
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (startDate) {
      whereClause += ` AND call_created >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND call_created <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (eventType && eventType !== 'all') {
      whereClause += ` AND LOWER(agency_type) = LOWER($${paramIndex})`;
      params.push(eventType);
      paramIndex++;
    }

    if (jurisdiction && jurisdiction !== 'all') {
      whereClause += ` AND jurisdiction = $${paramIndex}`;
      params.push(jurisdiction);
      paramIndex++;
    }

    if (callType && callType !== 'all') {
      whereClause += ` AND call_type = $${paramIndex}`;
      params.push(callType);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (
        LOWER(call_type) LIKE LOWER($${paramIndex}) OR
        LOWER(address) LIKE LOWER($${paramIndex}) OR
        LOWER(jurisdiction) LIKE LOWER($${paramIndex}) OR
        LOWER(units) LIKE LOWER($${paramIndex})
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count for pagination (deduplicated)
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM (
        SELECT DISTINCT ON (call_type, address, call_created, jurisdiction) id
        FROM events ${whereClause}
      ) as unique_events`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results (deduplicated by call attributes)
    // Uses DISTINCT ON to get unique events based on call_type, address, call_created, jurisdiction
    // This handles cases where the same incident gets multiple event_ids from the source
    const query = `
      SELECT DISTINCT ON (call_type, address, call_created, jurisdiction)
        id,
        event_id,
        call_number,
        address,
        call_type,
        units,
        call_created,
        jurisdiction,
        agency_type,
        longitude,
        latitude,
        first_seen,
        last_seen,
        times_seen
      FROM events
      ${whereClause}
      ORDER BY call_type, address, call_created, jurisdiction, first_seen DESC
    `;

    // Wrap in subquery to apply custom sorting and pagination
    const paginatedQuery = `
      SELECT * FROM (${query}) as deduplicated
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(paginatedQuery, params);
    
    res.json({
      events: result.rows,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter - show all time by default, filter only when explicitly requested
    const params = [];
    let dateFilter = '';
    
    if (startDate && endDate) {
      dateFilter = 'WHERE first_seen >= $1 AND first_seen <= $2';
      params.push(startDate, endDate);
    }

    // Run simple indexed queries in parallel for speed
    const [totalResult, byTypeResult, byJurisdictionResult, jurisdictionsResult, byHourResult, recentResult] = await Promise.all([
      // Total events
      pool.query(`SELECT COUNT(*) as total FROM events ${dateFilter}`, params),
      
      // Events by agency type
      pool.query(`
        SELECT COALESCE(LOWER(agency_type), 'unknown') as event_type, COUNT(*) as count 
        FROM events ${dateFilter}
        GROUP BY LOWER(agency_type)`, params),
      
      // Events by jurisdiction (top 10)
      pool.query(`
        SELECT COALESCE(jurisdiction, 'Unknown') as jurisdiction, COUNT(*) as count 
        FROM events ${dateFilter}
        GROUP BY jurisdiction
        ORDER BY count DESC
        LIMIT 10`, params),
      
      // Unique jurisdictions count
      pool.query(`SELECT COUNT(DISTINCT jurisdiction) as count FROM events ${dateFilter}`, params),
      
      // Events by hour (for timeline)
      pool.query(`
        SELECT DATE_TRUNC('hour', call_created) as hour, COUNT(*) as count
        FROM events ${dateFilter}
        GROUP BY DATE_TRUNC('hour', call_created)
        ORDER BY hour DESC
        LIMIT 24`, params),
      
      // Recent activity (last 6 hours) - always calculated
      pool.query(`SELECT COUNT(*) as count FROM events WHERE first_seen >= NOW() - INTERVAL '6 hours'`)
    ]);

    const stats = {
      total: parseInt(totalResult.rows[0].total),
      byType: byTypeResult.rows.reduce((acc, row) => {
        acc[row.event_type] = parseInt(row.count);
        return acc;
      }, {}),
      byJurisdiction: byJurisdictionResult.rows.map(row => ({
        jurisdiction: row.jurisdiction,
        count: parseInt(row.count)
      })),
      uniqueAgencies: parseInt(jurisdictionsResult.rows[0].count),
      timeline: byHourResult.rows.map(row => ({
        hour: row.hour,
        count: parseInt(row.count)
      })),
      recentCount: parseInt(recentResult.rows[0].count),
      recentActivity: []
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get latest events (for live mode)
app.get('/api/dispatches/latest', async (req, res) => {
  try {
    const { since, limit = 50 } = req.query;
    
    let query = `
      SELECT 
        id,
        event_id,
        call_number,
        address,
        call_type,
        units,
        call_created,
        jurisdiction,
        agency_type,
        longitude,
        latitude,
        first_seen,
        last_seen,
        times_seen
      FROM events
    `;
    
    const params = [];
    
    if (since) {
      query += ` WHERE last_seen > $1`;
      params.push(since);
    }
    
    query += ` ORDER BY call_created DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching latest events:', error);
    res.status(500).json({ error: 'Failed to fetch latest events' });
  }
});

// Get unique values for filters with counts (deduplicated)
app.get('/api/filters', async (req, res) => {
  try {
    // Use deduplicated counts for accurate filter values
    const deduplicatedCTE = `
      WITH deduplicated AS (
        SELECT DISTINCT ON (call_type, address, call_created, jurisdiction)
          call_type, address, call_created, jurisdiction, agency_type
        FROM events
        ORDER BY call_type, address, call_created, jurisdiction, first_seen DESC
      )
    `;

    const agencyTypesResult = await pool.query(
      `${deduplicatedCTE}
       SELECT COALESCE(agency_type, 'Unknown') as agency_type, COUNT(*) as count
       FROM deduplicated 
       GROUP BY agency_type
       ORDER BY count DESC`
    );
    
    const jurisdictionsResult = await pool.query(
      `${deduplicatedCTE}
       SELECT jurisdiction, COUNT(*) as count
       FROM deduplicated 
       WHERE jurisdiction IS NOT NULL
       GROUP BY jurisdiction
       ORDER BY count DESC`
    );

    const callTypesResult = await pool.query(
      `${deduplicatedCTE}
       SELECT COALESCE(call_type, 'Unknown') as call_type, 
              COALESCE(agency_type, 'Unknown') as agency_type,
              COUNT(*) as count 
       FROM deduplicated 
       GROUP BY call_type, agency_type
       ORDER BY count DESC
       LIMIT 200`
    );

    res.json({
      agencyTypes: agencyTypesResult.rows.map(r => ({ name: r.agency_type, count: parseInt(r.count) })),
      jurisdictions: jurisdictionsResult.rows.map(r => ({ name: r.jurisdiction, count: parseInt(r.count) })),
      callTypes: callTypesResult.rows.map(r => ({ 
        name: r.call_type, 
        agencyType: r.agency_type,
        count: parseInt(r.count) 
      }))
    });
  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({ error: 'Failed to fetch filters' });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

/**
 * Active Users Heartbeat
 * 
 * Clients should call this endpoint every 15 seconds to indicate they're still active.
 * 
 * @route POST /api/heartbeat
 * @body {string} sessionId - Unique session identifier (generated client-side)
 * @body {boolean} isAuthenticated - Whether the user is logged in
 * @body {string} userId - Optional user ID if authenticated
 * @returns {object} { success: true, activeUsers: count }
 */
app.post('/api/heartbeat', (req, res) => {
  const { sessionId, isAuthenticated, userId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }
  
  activeUsers.set(sessionId, {
    lastSeen: Date.now(),
    isAuthenticated: !!isAuthenticated,
    userId: userId || null
  });
  
  // Calculate stats
  const total = activeUsers.size;
  const authenticated = Array.from(activeUsers.values()).filter(u => u.isAuthenticated).length;
  const anonymous = total - authenticated;
  
  res.json({ 
    success: true,
    activeUsers: {
      total,
      authenticated,
      anonymous
    }
  });
});

/**
 * Get Active Users Count
 * 
 * Returns the current count of active users on the site.
 * 
 * @route GET /api/active-users
 * @returns {object} { total, authenticated, anonymous }
 */
app.get('/api/active-users', (req, res) => {
  const total = activeUsers.size;
  const authenticated = Array.from(activeUsers.values()).filter(u => u.isAuthenticated).length;
  const anonymous = total - authenticated;
  
  res.json({
    total,
    authenticated,
    anonymous
  });
});

// ============================================================================
// Chat API Endpoints
// ============================================================================

/**
 * Get Chat Messages
 * 
 * Retrieves chat messages with pagination. Can optionally filter by event_id
 * for incident-specific discussions.
 * 
 * @route GET /api/chat/messages
 * @query {number} limit - Max messages to return (default: 50, max: 100)
 * @query {string} before - Get messages before this timestamp (for pagination)
 * @query {number} eventId - Filter messages for a specific incident
 * @returns {object} { messages: Array, hasMore: boolean }
 */
app.get('/api/chat/messages', async (req, res) => {
  try {
    const { limit = 50, before, eventId } = req.query;
    const safeLimit = Math.min(parseInt(limit) || 50, 100);
    
    let query = `
      SELECT 
        m.id,
        m.message,
        m.event_id,
        m.created_at,
        m.user_id,
        u.first_name,
        u.last_name,
        u.email
      FROM chat_messages m
      JOIN users u ON m.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (before) {
      query += ` AND m.created_at < $${paramIndex}`;
      params.push(before);
      paramIndex++;
    }
    
    if (eventId) {
      query += ` AND m.event_id = $${paramIndex}`;
      params.push(parseInt(eventId));
      paramIndex++;
    }
    
    query += ` ORDER BY m.created_at DESC LIMIT $${paramIndex}`;
    params.push(safeLimit + 1); // Fetch one extra to check if there are more
    
    const result = await pool.query(query, params);
    const hasMore = result.rows.length > safeLimit;
    const messages = result.rows.slice(0, safeLimit).map(row => ({
      id: row.id,
      message: row.message,
      eventId: row.event_id,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        initials: `${row.first_name?.[0] || ''}${row.last_name?.[0] || ''}`.toUpperCase()
      }
    }));
    
    res.json({ messages: messages.reverse(), hasMore });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * Post Chat Message
 * 
 * Creates a new chat message. Requires authentication.
 * 
 * @route POST /api/chat/messages
 * @body {string} message - The message content (max 1000 chars)
 * @body {number} eventId - Optional event ID to link message to an incident
 * @returns {object} The created message
 */
app.post('/api/chat/messages', authenticateToken, async (req, res) => {
  try {
    const { message, eventId } = req.body;
    const userId = req.user.id;
    
    // Validation
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    
    if (trimmedMessage.length > 1000) {
      return res.status(400).json({ error: 'Message must be 1000 characters or less' });
    }
    
    // Insert message
    const result = await pool.query(
      `INSERT INTO chat_messages (user_id, message, event_id)
       VALUES ($1, $2, $3)
       RETURNING id, message, event_id, created_at`,
      [userId, trimmedMessage, eventId || null]
    );
    
    // Get user info for response
    const userResult = await pool.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];
    
    res.status(201).json({
      id: result.rows[0].id,
      message: result.rows[0].message,
      eventId: result.rows[0].event_id,
      createdAt: result.rows[0].created_at,
      user: {
        id: userId,
        firstName: user.first_name,
        lastName: user.last_name,
        initials: `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
      }
    });
  } catch (error) {
    console.error('Error posting chat message:', error);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

/**
 * Delete Chat Message
 * 
 * Deletes a chat message. Users can only delete their own messages,
 * admins can delete any message.
 * 
 * @route DELETE /api/chat/messages/:id
 * @returns {object} { success: true }
 */
app.delete('/api/chat/messages/:id', authenticateToken, async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Check if message exists and belongs to user (or user is admin)
    const check = await pool.query(
      'SELECT user_id FROM chat_messages WHERE id = $1',
      [messageId]
    );
    
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (check.rows[0].user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Cannot delete another user\'s message' });
    }
    
    await pool.query('DELETE FROM chat_messages WHERE id = $1', [messageId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// =============================================================================
// USER FEED ENDPOINTS
// =============================================================================

/**
 * Get User Feed Posts
 * 
 * Retrieves posts from the user feed with pagination.
 * Includes author info, reaction counts, and comment counts.
 * 
 * @route GET /api/feed/posts
 * @query {number} limit - Maximum results to return (default: 20)
 * @query {number} offset - Pagination offset (default: 0)
 * @returns {object[]} Array of posts with author info
 */
app.get('/api/feed/posts', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const userId = req.user?.id;

    const result = await pool.query(
      `SELECT 
        p.id, p.content, p.media_urls, p.media_types, p.location, p.latitude, p.longitude,
        p.likes_count, p.dislikes_count, p.comments_count, p.created_at, p.updated_at,
        p.dispatch_event_id,
        u.id as user_id, u.username, u.first_name, u.last_name,
        ${userId ? `(SELECT reaction_type FROM post_reactions WHERE post_id = p.id AND user_id = $3) as user_reaction` : `NULL as user_reaction`}
      FROM user_posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2`,
      userId ? [limit, offset, userId] : [limit, offset]
    );

    const posts = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      mediaUrls: row.media_urls || [],
      mediaTypes: row.media_types || [],
      location: row.location,
      latitude: row.latitude,
      longitude: row.longitude,
      dispatchEventId: row.dispatch_event_id,
      likesCount: row.likes_count,
      dislikesCount: row.dislikes_count,
      commentsCount: row.comments_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userReaction: row.user_reaction,
      author: {
        id: row.user_id,
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name,
        initials: `${row.first_name?.[0] || ''}${row.last_name?.[0] || ''}`.toUpperCase()
      }
    }));

    res.json(posts);
  } catch (error) {
    console.error('Error fetching feed posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

/**
 * Upload media files for posts to MinIO storage
 * 
 * @route POST /api/feed/upload
 * @returns {Object} { urls: string[], types: string[] }
 */
app.post('/api/feed/upload', authenticateToken, upload.array('media', 4), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const urls = [];
    const types = [];

    // Upload each file to MinIO
    for (const file of req.files) {
      const isVideo = file.mimetype.startsWith('video/');
      const bucket = isVideo ? MINIO_BUCKET_VIDEOS : MINIO_BUCKET_IMAGES;
      const type = isVideo ? 'video' : 'image';
      
      // Generate unique filename
      const ext = path.extname(file.originalname);
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
      
      try {
        // Upload to MinIO via file-storage service
        const FormData = (await import('form-data')).default;
        const formData = new FormData();
        formData.append('file', fs.createReadStream(file.path), {
          filename: file.originalname,
          contentType: file.mimetype
        });
        formData.append('bucket', bucket);

        const uploadResponse = await fetch(`http://${MINIO_ENDPOINT}:3002/upload`, {
          method: 'POST',
          body: formData,
          headers: formData.getHeaders()
        });

        if (uploadResponse.ok) {
          const data = await uploadResponse.json();
          urls.push(data.file.url);
          types.push(type);
        } else {
          console.error('MinIO upload failed:', await uploadResponse.text());
          // Fallback to local storage
          const localUrl = `${process.env.API_BASE_URL || `http://localhost:${PORT}`}/uploads/${file.filename}`;
          urls.push(localUrl);
          types.push(type);
        }
      } catch (uploadError) {
        console.error('Error uploading to MinIO:', uploadError);
        // Fallback to local storage
        const localUrl = `${process.env.API_BASE_URL || `http://localhost:${PORT}`}/uploads/${file.filename}`;
        urls.push(localUrl);
        types.push(type);
      }
      
      // Clean up temp file after MinIO upload
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    res.json({ urls, types });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

/**
 * Create a new post
 * 
 * @route POST /api/feed/posts
 * @body {string} content - Post content (required)
 * @body {string[]} mediaUrls - Array of media URLs
 * @body {string[]} mediaTypes - Array of media types (image, video)
 * @body {string} location - Location name
 * @body {number} latitude - Latitude coordinate
 * @body {number} longitude - Longitude coordinate
 * @body {string} dispatchEventId - Optional reference to a dispatch event
 */
app.post('/api/feed/posts', authenticateToken, async (req, res) => {
  try {
    const { content, mediaUrls, mediaTypes, location, latitude, longitude, dispatchEventId } = req.body;
    const userId = req.user.id;

    // Content is optional if there are media files
    if ((!content || content.trim().length === 0) && (!mediaUrls || mediaUrls.length === 0)) {
      return res.status(400).json({ error: 'Post must have content or media' });
    }

    if (content && content.length > 5000) {
      return res.status(400).json({ error: 'Post content must be 5000 characters or less' });
    }

    const result = await pool.query(
      `INSERT INTO user_posts (user_id, content, media_urls, media_types, location, latitude, longitude, dispatch_event_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, content?.trim() || '', mediaUrls || [], mediaTypes || [], location, latitude, longitude, dispatchEventId || null]
    );

    const post = result.rows[0];
    const userResult = await pool.query('SELECT username, first_name, last_name FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    res.status(201).json({
      id: post.id,
      content: post.content,
      mediaUrls: post.media_urls || [],
      mediaTypes: post.media_types || [],
      location: post.location,
      latitude: post.latitude,
      longitude: post.longitude,
      dispatchEventId: post.dispatch_event_id,
      likesCount: 0,
      dislikesCount: 0,
      commentsCount: 0,
      createdAt: post.created_at,
      user: {
        id: userId,
        firstName: user.first_name,
        lastName: user.last_name,
        initials: `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
      },
      userReaction: null
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

/**
 * React to a post (like/dislike) or remove reaction
 * 
 * @route POST /api/feed/posts/:id/react
 * @body {string|null} reactionType - 'like', 'dislike', or null to remove
 */
app.post('/api/feed/posts/:id/react', authenticateToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user.id;
    const { reactionType } = req.body;

    // Allow null to remove reaction
    if (reactionType !== null && !['like', 'dislike'].includes(reactionType)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    // Check if user already reacted
    const existing = await pool.query(
      'SELECT id, reaction_type FROM post_reactions WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let newUserReaction = null;

      if (reactionType === null) {
        // Remove existing reaction if any
        if (existing.rows.length > 0) {
          const oldType = existing.rows[0].reaction_type;
          await client.query('DELETE FROM post_reactions WHERE id = $1', [existing.rows[0].id]);
          if (oldType === 'like') {
            await client.query('UPDATE user_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1', [postId]);
          } else {
            await client.query('UPDATE user_posts SET dislikes_count = GREATEST(0, dislikes_count - 1) WHERE id = $1', [postId]);
          }
        }
      } else if (existing.rows.length > 0) {
        const oldType = existing.rows[0].reaction_type;
        if (oldType === reactionType) {
          // Same reaction - toggle off
          await client.query('DELETE FROM post_reactions WHERE id = $1', [existing.rows[0].id]);
          if (reactionType === 'like') {
            await client.query('UPDATE user_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1', [postId]);
          } else {
            await client.query('UPDATE user_posts SET dislikes_count = GREATEST(0, dislikes_count - 1) WHERE id = $1', [postId]);
          }
          newUserReaction = null;
        } else {
          // Different reaction - change
          await client.query('UPDATE post_reactions SET reaction_type = $1 WHERE id = $2', [reactionType, existing.rows[0].id]);
          if (reactionType === 'like') {
            await client.query('UPDATE user_posts SET likes_count = likes_count + 1, dislikes_count = GREATEST(0, dislikes_count - 1) WHERE id = $1', [postId]);
          } else {
            await client.query('UPDATE user_posts SET likes_count = GREATEST(0, likes_count - 1), dislikes_count = dislikes_count + 1 WHERE id = $1', [postId]);
          }
          newUserReaction = reactionType;
        }
      } else {
        // New reaction
        await client.query(
          'INSERT INTO post_reactions (post_id, user_id, reaction_type) VALUES ($1, $2, $3)',
          [postId, userId, reactionType]
        );
        if (reactionType === 'like') {
          await client.query('UPDATE user_posts SET likes_count = likes_count + 1 WHERE id = $1', [postId]);
        } else {
          await client.query('UPDATE user_posts SET dislikes_count = dislikes_count + 1 WHERE id = $1', [postId]);
        }
        newUserReaction = reactionType;
      }

      await client.query('COMMIT');

      // Get updated counts
      const updated = await pool.query('SELECT likes_count, dislikes_count FROM user_posts WHERE id = $1', [postId]);
      res.json({
        likesCount: updated.rows[0].likes_count,
        dislikesCount: updated.rows[0].dislikes_count,
        userReaction: newUserReaction
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error reacting to post:', error);
    res.status(500).json({ error: 'Failed to react to post' });
  }
});

/**
 * Get comments for a post
 * 
 * @route GET /api/feed/posts/:id/comments
 */
app.get('/api/feed/posts/:id/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const result = await pool.query(
      `SELECT c.id, c.content, c.created_at,
        u.id as user_id, u.username, u.first_name, u.last_name
       FROM post_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [postId]
    );

    const comments = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        initials: `${row.first_name?.[0] || ''}${row.last_name?.[0] || ''}`.toUpperCase()
      }
    }));

    res.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

/**
 * Add comment to a post
 * 
 * @route POST /api/feed/posts/:id/comments
 * @body {string} content - Comment content
 */
app.post('/api/feed/posts/:id/comments', authenticateToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Comment must be 1000 characters or less' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'INSERT INTO post_comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
        [postId, userId, content.trim()]
      );

      await client.query('UPDATE user_posts SET comments_count = comments_count + 1 WHERE id = $1', [postId]);

      await client.query('COMMIT');

      const userResult = await pool.query('SELECT username, first_name, last_name FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];

      res.status(201).json({
        id: result.rows[0].id,
        content: result.rows[0].content,
        createdAt: result.rows[0].created_at,
        user: {
          id: userId,
          firstName: user.first_name,
          lastName: user.last_name,
          initials: `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
        }
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// =============================================================================
// INCIDENT REPORT ENDPOINTS
// =============================================================================

/**
 * Submit an incident report
 * 
 * @route POST /api/incidents
 */
app.post('/api/incidents', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const {
      reporterName, reporterPhone, reporterEmail,
      incidentType, incidentDate, locationAddress, locationCity, locationZip,
      description, personsInvolved, vehiclesInvolved,
      injuriesReported, injuryDetails, witnessInfo
    } = req.body;

    // Validation
    if (!reporterName || !reporterPhone || !reporterEmail) {
      return res.status(400).json({ error: 'Reporter contact information is required' });
    }

    if (!incidentType || !incidentDate || !locationAddress || !description) {
      return res.status(400).json({ error: 'Incident details are required' });
    }

    // Generate incident number: YYYYMMDD-XXXXX
    const today = new Date();
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const countResult = await pool.query(
      `SELECT COUNT(*) + 1 as num FROM incident_reports 
       WHERE incident_number LIKE $1`,
      [`${datePrefix}-%`]
    );
    const sequenceNum = countResult.rows[0].num.toString().padStart(5, '0');
    const incidentNumber = `${datePrefix}-${sequenceNum}`;

    const result = await pool.query(
      `INSERT INTO incident_reports (
        incident_number, user_id, reporter_name, reporter_phone, reporter_email,
        incident_type, incident_date, location_address, location_city, location_zip,
        description, persons_involved, vehicles_involved,
        injuries_reported, injury_details, witness_info, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'submitted')
      RETURNING id, incident_number, status, created_at`,
      [
        incidentNumber, userId, reporterName, reporterPhone, reporterEmail,
        incidentType, incidentDate, locationAddress, locationCity || null, locationZip || null,
        description, personsInvolved || null, vehiclesInvolved || null,
        injuriesReported || false, injuryDetails || null, witnessInfo || null
      ]
    );

    res.status(201).json({
      id: result.rows[0].id,
      incidentNumber: result.rows[0].incident_number,
      status: result.rows[0].status,
      createdAt: result.rows[0].created_at
    });
  } catch (error) {
    console.error('Error submitting incident report:', error);
    res.status(500).json({ error: 'Failed to submit incident report' });
  }
});

/**
 * Get incident reports for current user
 * 
 * @route GET /api/incidents
 */
app.get('/api/incidents', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT id, incident_number, incident_type, incident_date, location_address,
        status, created_at, updated_at
       FROM incident_reports
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      incidentNumber: row.incident_number,
      incidentType: row.incident_type,
      incidentDate: row.incident_date,
      locationAddress: row.location_address,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })));
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// =============================================================================
// PRIVATE CHAT / CONVERSATIONS ENDPOINTS
// =============================================================================

/**
 * Get available users to start a conversation with
 * 
 * @route GET /api/users/available
 */
app.get('/api/users/available', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT id as user_id, username, first_name, last_name, role
       FROM users
       WHERE id != $1 AND is_active = true
       ORDER BY first_name, last_name`,
      [userId]
    );

    res.json(result.rows.map(row => ({
      userId: row.user_id,
      username: row.username,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role === 'agency' ? 'agency' : 'member'
    })));
  } catch (error) {
    console.error('Error fetching available users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * Get user's conversations
 * 
 * @route GET /api/conversations
 */
app.get('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get conversations user is part of
    const result = await pool.query(
      `SELECT DISTINCT c.id, c.name, c.is_group, c.created_by, c.created_at
       FROM chat_conversations c
       JOIN chat_participants cp ON c.id = cp.conversation_id
       WHERE cp.user_id = $1
       ORDER BY c.updated_at DESC`,
      [userId]
    );

    const conversations = await Promise.all(result.rows.map(async (conv) => {
      // Get participants
      const participants = await pool.query(
        `SELECT cp.user_id, cp.role, u.username, u.first_name, u.last_name
         FROM chat_participants cp
         JOIN users u ON cp.user_id = u.id
         WHERE cp.conversation_id = $1`,
        [conv.id]
      );

      // Get last message
      const lastMessage = await pool.query(
        `SELECT pm.id, pm.content, pm.created_at, pm.sender_id,
          u.first_name, u.last_name
         FROM private_messages pm
         JOIN users u ON pm.sender_id = u.id
         WHERE pm.conversation_id = $1
         ORDER BY pm.created_at DESC
         LIMIT 1`,
        [conv.id]
      );

      // Get unread count
      const unread = await pool.query(
        `SELECT COUNT(*) as count FROM private_messages
         WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
        [conv.id, userId]
      );

      return {
        id: conv.id,
        name: conv.name,
        isGroup: conv.is_group,
        createdBy: conv.created_by,
        createdAt: conv.created_at,
        participants: participants.rows.map(p => ({
          userId: p.user_id,
          username: p.username,
          firstName: p.first_name,
          lastName: p.last_name,
          role: p.role
        })),
        lastMessage: lastMessage.rows[0] ? {
          id: lastMessage.rows[0].id,
          content: lastMessage.rows[0].content,
          createdAt: lastMessage.rows[0].created_at,
          senderId: lastMessage.rows[0].sender_id,
          senderFirstName: lastMessage.rows[0].first_name,
          senderLastName: lastMessage.rows[0].last_name
        } : null,
        unreadCount: parseInt(unread.rows[0].count)
      };
    }));

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * Create a new conversation
 * 
 * @route POST /api/conversations
 * @body {number[]} participantIds - User IDs to add to conversation
 * @body {boolean} isGroup - Whether this is a group chat
 * @body {string} name - Group name (optional for groups)
 */
app.post('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { participantIds, isGroup, name } = req.body;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ error: 'Participant IDs are required' });
    }

    // For 1:1 chats, check if conversation already exists
    if (!isGroup && participantIds.length === 1) {
      const existing = await pool.query(
        `SELECT c.id FROM chat_conversations c
         JOIN chat_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
         JOIN chat_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
         WHERE c.is_group = false`,
        [userId, participantIds[0]]
      );

      if (existing.rows.length > 0) {
        // Return existing conversation
        const convId = existing.rows[0].id;
        const participants = await pool.query(
          `SELECT cp.user_id, cp.role, u.username, u.first_name, u.last_name
           FROM chat_participants cp
           JOIN users u ON cp.user_id = u.id
           WHERE cp.conversation_id = $1`,
          [convId]
        );

        return res.json({
          id: convId,
          name: null,
          isGroup: false,
          createdBy: userId,
          participants: participants.rows.map(p => ({
            userId: p.user_id,
            username: p.username,
            firstName: p.first_name,
            lastName: p.last_name,
            role: p.role
          })),
          unreadCount: 0
        });
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create conversation
      const convResult = await client.query(
        `INSERT INTO chat_conversations (name, is_group, created_by)
         VALUES ($1, $2, $3)
         RETURNING id, name, is_group, created_by, created_at`,
        [name || null, isGroup || false, userId]
      );
      const convId = convResult.rows[0].id;

      // Add creator as admin
      await client.query(
        `INSERT INTO chat_participants (conversation_id, user_id, role)
         VALUES ($1, $2, 'admin')`,
        [convId, userId]
      );

      // Add other participants
      for (const participantId of participantIds) {
        await client.query(
          `INSERT INTO chat_participants (conversation_id, user_id, role)
           VALUES ($1, $2, 'member')`,
          [convId, participantId]
        );
      }

      await client.query('COMMIT');

      // Fetch participants for response
      const participants = await pool.query(
        `SELECT cp.user_id, cp.role, u.username, u.first_name, u.last_name
         FROM chat_participants cp
         JOIN users u ON cp.user_id = u.id
         WHERE cp.conversation_id = $1`,
        [convId]
      );

      res.status(201).json({
        id: convId,
        name: convResult.rows[0].name,
        isGroup: convResult.rows[0].is_group,
        createdBy: convResult.rows[0].created_by,
        createdAt: convResult.rows[0].created_at,
        participants: participants.rows.map(p => ({
          userId: p.user_id,
          username: p.username,
          firstName: p.first_name,
          lastName: p.last_name,
          role: p.role
        })),
        unreadCount: 0
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

/**
 * Get messages in a conversation
 * 
 * @route GET /api/conversations/:id/messages
 */
app.get('/api/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const userId = req.user.id;

    // Verify user is participant
    const participant = await pool.query(
      'SELECT 1 FROM chat_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (participant.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }

    // Get messages
    const result = await pool.query(
      `SELECT pm.id, pm.conversation_id, pm.sender_id, pm.content, pm.media_url, pm.is_read, pm.created_at,
        u.username, u.first_name, u.last_name
       FROM private_messages pm
       JOIN users u ON pm.sender_id = u.id
       WHERE pm.conversation_id = $1
       ORDER BY pm.created_at ASC`,
      [conversationId]
    );

    // Mark messages as read
    await pool.query(
      `UPDATE private_messages SET is_read = true
       WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
      [conversationId, userId]
    );

    const messages = result.rows.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      senderUsername: row.username,
      senderFirstName: row.first_name,
      senderLastName: row.last_name,
      content: row.content,
      mediaUrl: row.media_url,
      isRead: row.is_read,
      createdAt: row.created_at
    }));

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * Send a message in a conversation
 * 
 * @route POST /api/conversations/:id/messages
 * @body {string} content - Message content
 */
app.post('/api/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify user is participant
    const participant = await pool.query(
      'SELECT 1 FROM chat_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (participant.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }

    // Insert message
    const result = await pool.query(
      `INSERT INTO private_messages (conversation_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, conversation_id, sender_id, content, media_url, is_read, created_at`,
      [conversationId, userId, content.trim()]
    );

    // Update conversation timestamp
    await pool.query(
      'UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );

    const userResult = await pool.query('SELECT username, first_name, last_name FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    res.status(201).json({
      id: result.rows[0].id,
      conversationId: result.rows[0].conversation_id,
      senderId: result.rows[0].sender_id,
      senderUsername: user.username,
      senderFirstName: user.first_name,
      senderLastName: user.last_name,
      content: result.rows[0].content,
      mediaUrl: result.rows[0].media_url,
      isRead: result.rows[0].is_read,
      createdAt: result.rows[0].created_at
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});
