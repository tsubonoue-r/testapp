/**
 * AWS Lambda Entry Point
 * Hono Framework + DynamoDB
 * 工事看板写真システム - AWS Version
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handle } from 'hono/aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// ルートをインポート
import auth from './routes/auth.js';
import projects from './routes/projects.js';
import signboards from './routes/signboards.js';
import photos from './routes/photos.js';

// DynamoDB クライアント
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// 型定義
export type AppEnv = {
  Variables: {
    docClient: DynamoDBDocumentClient;
    user?: {
      userId: string;
      email: string;
      role: string;
    };
  };
};

// Honoアプリケーション（/prod ステージ対応）
const app = new Hono<AppEnv>().basePath('/prod');

// ミドルウェア
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// DynamoDBクライアントを設定
app.use('*', async (c, next) => {
  c.set('docClient', docClient);
  await next();
});

// ヘルスチェック
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: '工事看板写真システム API (AWS Lambda)',
    environment: process.env.ENVIRONMENT || 'production',
  });
});

// APIルート
app.route('/api/auth', auth);
app.route('/api/projects', projects);
app.route('/api/signboards', signboards);
app.route('/api/photos', photos);

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

// Lambda handler
export const handler = handle(app);
