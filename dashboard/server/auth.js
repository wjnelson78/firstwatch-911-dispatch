/**
 * Authentication Module for 911 Dispatch Dashboard
 * 
 * Handles user registration, login, logout, and JWT token management.
 * Uses bcrypt for password hashing and JWT for stateless authentication.
 * 
 * @author William Nelson
 * @created December 2025
 * @license MIT
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '15m';  // Access token expires in 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Generate JWT access token
 * @param {Object} user - User object with id, email, role
 * @returns {string} JWT token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Generate random refresh token
 * @returns {string} Random hex token
 */
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

/**
 * Create auth router with database pool
 * @param {Pool} pool - PostgreSQL connection pool
 * @returns {Router} Express router with auth routes
 */
export default function createAuthRouter(pool) {
  
  /**
   * Register a new user
   * @route POST /api/auth/register
   * @body {string} email - User email address
   * @body {string} password - User password (min 8 characters)
   * @body {string} firstName - User's first name
   * @body {string} lastName - User's last name
   */
  router.post('/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Insert new user
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, verification_token)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, first_name, last_name, role, created_at`,
        [email.toLowerCase(), passwordHash, firstName, lastName, verificationToken]
      );

      const user = result.rows[0];

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken();

      // Store refresh token
      await pool.query(
        `INSERT INTO user_sessions (user_id, refresh_token, expires_at, ip_address)
         VALUES ($1, $2, $3, $4)`,
        [
          user.id,
          refreshToken,
          new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN),
          req.ip
        ]
      );

      // Create default preferences
      await pool.query(
        `INSERT INTO user_preferences (user_id) VALUES ($1)`,
        [user.id]
      );

      res.status(201).json({
        message: 'Account created successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        },
        accessToken,
        refreshToken
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Failed to create account' });
    }
  });

  /**
   * Login user
   * @route POST /api/auth/login
   * @body {string} email - User email address
   * @body {string} password - User password
   */
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Find user
      const result = await pool.query(
        `SELECT id, email, password_hash, first_name, last_name, role, is_active
         FROM users WHERE email = $1`,
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = result.rows[0];

      // Check if account is active
      if (!user.is_active) {
        return res.status(403).json({ error: 'Account has been deactivated' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken();

      // Store refresh token
      await pool.query(
        `INSERT INTO user_sessions (user_id, refresh_token, expires_at, ip_address)
         VALUES ($1, $2, $3, $4)`,
        [
          user.id,
          refreshToken,
          new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN),
          req.ip
        ]
      );

      // Update last login
      await pool.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        },
        accessToken,
        refreshToken
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  /**
   * Refresh access token
   * @route POST /api/auth/refresh
   * @body {string} refreshToken - Valid refresh token
   */
  router.post('/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      // Find valid session
      const sessionResult = await pool.query(
        `SELECT s.*, u.id, u.email, u.first_name, u.last_name, u.role, u.is_active
         FROM user_sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.refresh_token = $1 AND s.expires_at > NOW()`,
        [refreshToken]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }

      const session = sessionResult.rows[0];

      if (!session.is_active) {
        return res.status(403).json({ error: 'Account has been deactivated' });
      }

      // Generate new access token
      const accessToken = generateAccessToken({
        id: session.id,
        email: session.email,
        role: session.role,
        first_name: session.first_name,
        last_name: session.last_name
      });

      res.json({ accessToken });

    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  });

  /**
   * Logout user (invalidate refresh token)
   * @route POST /api/auth/logout
   * @body {string} refreshToken - Refresh token to invalidate
   */
  router.post('/logout', async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await pool.query(
          'DELETE FROM user_sessions WHERE refresh_token = $1',
          [refreshToken]
        );
      }

      res.json({ message: 'Logged out successfully' });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  /**
   * Get current user profile
   * @route GET /api/auth/me
   * @header Authorization - Bearer token
   */
  router.get('/me', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.created_at, u.last_login,
                p.default_view, p.favorite_jurisdictions, p.notification_enabled, p.theme
         FROM users u
         LEFT JOIN user_preferences p ON u.id = p.user_id
         WHERE u.id = $1`,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.rows[0];
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        preferences: {
          defaultView: user.default_view,
          favoriteJurisdictions: user.favorite_jurisdictions || [],
          notificationEnabled: user.notification_enabled,
          theme: user.theme
        }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  });

  /**
   * Update user preferences
   * @route PUT /api/auth/preferences
   * @header Authorization - Bearer token
   */
  router.put('/preferences', authenticateToken, async (req, res) => {
    try {
      const { defaultView, favoriteJurisdictions, notificationEnabled, theme } = req.body;

      await pool.query(
        `UPDATE user_preferences 
         SET default_view = COALESCE($1, default_view),
             favorite_jurisdictions = COALESCE($2, favorite_jurisdictions),
             notification_enabled = COALESCE($3, notification_enabled),
             theme = COALESCE($4, theme),
             updated_at = NOW()
         WHERE user_id = $5`,
        [defaultView, favoriteJurisdictions, notificationEnabled, theme, req.user.id]
      );

      res.json({ message: 'Preferences updated successfully' });

    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  });

  /**
   * Change password
   * @route PUT /api/auth/password
   * @header Authorization - Bearer token
   * @body {string} currentPassword - Current password
   * @body {string} newPassword - New password (min 8 characters)
   */
  router.put('/password', authenticateToken, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new passwords are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }

      // Get current password hash
      const result = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [req.user.id]
      );

      const user = result.rows[0];

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, req.user.id]
      );

      // Invalidate all sessions (force re-login)
      await pool.query(
        'DELETE FROM user_sessions WHERE user_id = $1',
        [req.user.id]
      );

      res.json({ message: 'Password changed successfully. Please log in again.' });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  });

  return router;
}

/**
 * JWT Authentication Middleware
 * Verifies the access token and attaches user info to request
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

/**
 * Optional authentication middleware
 * Attaches user if token present, continues without if not
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
}

/**
 * Role-based authorization middleware
 * @param {...string} roles - Allowed roles
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
