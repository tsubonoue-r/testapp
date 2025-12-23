/**
 * Cloudflare Workers Entry Point
 * Hono Framework + D1 Database
 * 工事看板写真システム
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Env, HonoVariables } from './worker-types.js';

// ルートをインポート
import auth from './worker-routes/auth.js';
import projects from './worker-routes/projects.js';
import signboards from './worker-routes/signboards.js';
import photos from './worker-routes/photos.js';
import lark from './worker-routes/lark.js';

// Honoアプリケーション
const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// ミドルウェア
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.use('*', logger());

// ヘルスチェック
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: '工事看板写真システム API (Cloudflare Workers)',
    environment: c.env.ENVIRONMENT || 'production',
  });
});

// ルートパス
app.get('/', (c) => {
  return c.json({
    message: '工事看板写真システム API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      projects: '/api/projects/*',
      signboards: '/api/signboards/*',
      photos: '/api/photos/*',
      lark: '/api/lark/*',
    },
    documentation: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        changePassword: 'POST /api/auth/change-password',
        refresh: 'POST /api/auth/refresh',
      },
      projects: {
        list: 'GET /api/projects',
        get: 'GET /api/projects/:id',
        create: 'POST /api/projects',
        update: 'PUT /api/projects/:id',
        updateStatus: 'PATCH /api/projects/:id/status',
        delete: 'DELETE /api/projects/:id',
        search: 'GET /api/projects/search/query?q=',
      },
      signboards: {
        list: 'GET /api/signboards',
        get: 'GET /api/signboards/:id',
        create: 'POST /api/signboards',
        update: 'PUT /api/signboards/:id',
        delete: 'DELETE /api/signboards/:id',
      },
      photos: {
        list: 'GET /api/photos',
        get: 'GET /api/photos/:id',
        upload: 'POST /api/photos/upload',
        update: 'PUT /api/photos/:id',
        delete: 'DELETE /api/photos/:id',
      },
      lark: {
        config: 'GET /api/lark/config',
        sync: 'POST /api/lark/sync/project/:projectId',
        uploadPdf: 'POST /api/lark/upload/pdf',
        status: 'GET /api/lark/status/:projectId',
      },
    },
  });
});

// APIルート
app.route('/api/auth', auth);
app.route('/api/projects', projects);
app.route('/api/signboards', signboards);
app.route('/api/photos', photos);
app.route('/api/lark', lark);

// 404ハンドラー
app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `ルートが見つかりません: ${c.req.method} ${c.req.path}`,
    },
  }, 404);
});

// エラーハンドラー
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

// Cloudflare Workers fetch handler
export default app;
