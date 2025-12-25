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
import admin from './worker-routes/admin.js';

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

/**
 * MIME Type Helper
 * ファイル拡張子から適切なContent-Typeを返す
 */
function getMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    html: 'text/html; charset=utf-8',
    js: 'application/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    css: 'text/css; charset=utf-8',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    webp: 'image/webp',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    txt: 'text/plain; charset=utf-8',
    xml: 'application/xml',
    pdf: 'application/pdf',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Cache Control Helper
 * 静的ファイルのキャッシュ制御ヘッダーを生成
 */
function getCacheControl(path: string): string {
  // Service worker and manifest should be revalidated
  if (path.includes('service-worker.js') || path.includes('manifest.json')) {
    return 'public, max-age=0, must-revalidate';
  }
  // Images and fonts can be cached for longer
  if (path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf)$/)) {
    return 'public, max-age=31536000, immutable';
  }
  // JS and CSS with versioning can be cached
  if (path.match(/\.(js|css)$/)) {
    return 'public, max-age=86400, must-revalidate';
  }
  // HTML should be revalidated
  return 'public, max-age=0, must-revalidate';
}

// APIルート
app.route('/api/auth', auth);
app.route('/api/projects', projects);
app.route('/api/signboards', signboards);
app.route('/api/photos', photos);
app.route('/api/lark', lark);
app.route('/api/admin', admin);

/**
 * Static File Serving
 * Workers Assetsを使用して静的ファイルを配信
 * 優先順位: API -> 静的ファイル -> index.html (SPA fallback)
 */
app.get('*', async (c) => {
  // Skip if this is an API route (already handled)
  if (c.req.path.startsWith('/api/')) {
    return c.notFound();
  }

  // Get the requested path
  let path = c.req.path;

  // Root path OR /pc -> device detection
  if (path === "/" || path === "/pc") {
    // デバイス判定: User-Agentから判別
    const userAgent = c.req.header("user-agent") || "";
    const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
    const isTablet = /iPad|Android.*Tablet/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;

    // PCブラウザならpc.html、スマホ・タブレットならindex.html
    path = isDesktop ? "/pc.html" : "/index.html";
  }

  try {
    // Try to fetch from Workers Assets
    if (c.env.ASSETS) {
      // Use URL string format for Workers Assets (Cloudflare recommended format)
      // See: https://developers.cloudflare.com/workers/static-assets/binding/
      const assetUrl = `https://assets.local${path}`;
      const assetResponse = await c.env.ASSETS.fetch(assetUrl);

      if (assetResponse.ok) {
        // Clone the response to modify headers
        const response = new Response(assetResponse.body, assetResponse);

        // Set appropriate headers
        response.headers.set('Content-Type', getMimeType(path));
        response.headers.set('Cache-Control', getCacheControl(path));

        // Add security headers
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('X-Frame-Options', 'SAMEORIGIN');
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

        return response;
      }
    }

    // If file not found and not a file request (no extension), try SPA fallback
    if (!path.includes('.')) {
      if (c.env.ASSETS) {
        // Use URL string format for SPA fallback
        const indexUrl = "https://assets.local/index.html";
        const indexResponse = await c.env.ASSETS.fetch(indexUrl);
        if (indexResponse.ok) {
          const response = new Response(indexResponse.body, indexResponse);
          response.headers.set('Content-Type', 'text/html; charset=utf-8');
          response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
          return response;
        }
      }
    }

    // File not found
    return c.notFound();
  } catch (error) {
    console.error('Static file serving error:', error);
    return c.notFound();
  }
});

// 404ハンドラー
app.notFound((c) => {
  // If this looks like an API request, return JSON
  if (c.req.path.startsWith('/api/')) {
    return c.json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `ルートが見つかりません: ${c.req.method} ${c.req.path}`,
      },
    }, 404);
  }

  // For other requests, return HTML 404 page
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>404 Not Found</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 50px; }
        h1 { color: #667eea; }
      </style>
    </head>
    <body>
      <h1>404 Not Found</h1>
      <p>お探しのページが見つかりませんでした。</p>
      <a href="/">ホームに戻る</a>
    </body>
    </html>
  `, 404);
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
