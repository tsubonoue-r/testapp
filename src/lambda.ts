/**
 * AWS Lambda Handler for Hono Application
 */

import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

// Import routes
import auth from './worker-routes/auth.js';
import projects from './worker-routes/projects.js';
import signboards from './worker-routes/signboards.js';
import photos from './worker-routes/photos.js';
import lark from './worker-routes/lark.js';
import admin from './worker-routes/admin.js';

const app = new Hono();

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: '工事看板写真システム API (AWS Lambda)',
    environment: process.env.ENVIRONMENT || 'production',
  });
});

// API Routes
app.route('/api/auth', auth);
app.route('/api/projects', projects);
app.route('/api/signboards', signboards);
app.route('/api/photos', photos);
app.route('/api/lark', lark);
app.route('/api/admin', admin);

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `ルートが見つかりません: ${c.req.method} ${c.req.path}`,
    },
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('エラー:', err);
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || '内部サーバーエラー',
    },
  }, 500);
});

// Export Lambda handler
export const handler = handle(app);
