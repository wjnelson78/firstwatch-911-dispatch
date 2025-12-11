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
import createAuthRouter, { authenticateToken, optionalAuth } from './auth.js';

// Load environment variables from .env file
dotenv.config();

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
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE call_created >= $1 AND call_created <= $2';
      params.push(startDate, endDate);
    }

    // Create deduplicated CTE for accurate stats
    const deduplicatedCTE = `
      WITH deduplicated AS (
        SELECT DISTINCT ON (call_type, address, call_created, jurisdiction)
          id, call_type, address, call_created, jurisdiction, agency_type
        FROM events
        ${dateFilter}
        ORDER BY call_type, address, call_created, jurisdiction, first_seen DESC
      )
    `;

    // Total events (deduplicated)
    const totalResult = await pool.query(
      `${deduplicatedCTE} SELECT COUNT(*) as total FROM deduplicated`,
      params
    );

    // Events by type (agency_type) - deduplicated
    const byTypeResult = await pool.query(
      `${deduplicatedCTE}
       SELECT 
        COALESCE(LOWER(agency_type), 'unknown') as event_type, 
        COUNT(*) as count 
       FROM deduplicated 
       GROUP BY LOWER(agency_type)`,
      params
    );

    // Events by jurisdiction (top 10) - deduplicated
    const byJurisdictionResult = await pool.query(
      `${deduplicatedCTE}
       SELECT 
        COALESCE(jurisdiction, 'Unknown') as jurisdiction, 
        COUNT(*) as count 
       FROM deduplicated 
       GROUP BY jurisdiction
       ORDER BY count DESC
       LIMIT 10`,
      params
    );

    // Unique jurisdictions - deduplicated
    const jurisdictionsResult = await pool.query(
      `${deduplicatedCTE} SELECT COUNT(DISTINCT jurisdiction) as count FROM deduplicated`,
      params
    );

    // Events by hour (for timeline) - deduplicated
    const byHourResult = await pool.query(
      `${deduplicatedCTE}
       SELECT 
        DATE_TRUNC('hour', call_created) as hour,
        COUNT(*) as count
       FROM deduplicated 
       GROUP BY DATE_TRUNC('hour', call_created)
       ORDER BY hour DESC
       LIMIT 48`,
      params
    );

    // Recent activity (last 24 hours by hour) - deduplicated
    const recentResult = await pool.query(
      `WITH recent_deduplicated AS (
        SELECT DISTINCT ON (call_type, address, call_created, jurisdiction)
          call_created, agency_type
        FROM events 
        WHERE call_created >= NOW() - INTERVAL '24 hours'
        ORDER BY call_type, address, call_created, jurisdiction, first_seen DESC
      )
       SELECT 
        DATE_TRUNC('hour', call_created) as hour,
        COALESCE(LOWER(agency_type), 'unknown') as event_type,
        COUNT(*) as count
       FROM recent_deduplicated 
       GROUP BY DATE_TRUNC('hour', call_created), LOWER(agency_type)
       ORDER BY hour`
    );

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
      recentActivity: recentResult.rows
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

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});
