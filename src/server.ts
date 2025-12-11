/**
 * Express REST API Server
 * 工事看板写真システム
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import projectsRouter from './routes/projects.js';
import signboardsRouter from './routes/signboards.js';
import photosRouter from './routes/photos.js';
import authRouter from './routes/auth.js';
import larkRouter from './routes/lark.js';
import { initializeDatabase } from './db/database.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// データベース初期化
initializeDatabase();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静的ファイル
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../public')));

// ロガーミドルウェア
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ヘルスチェック
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    version: '1.0.0',
    service: '工事看板写真システム API',
  });
});

// ルートパスで動的アプリを提供
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/app.html'));
});

// APIルート
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/signboards', signboardsRouter);
app.use('/api/photos', photosRouter);
app.use('/api/lark', larkRouter);

// 404ハンドラー
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `ルートが見つかりません: ${req.method} ${req.path}`,
    },
  });
});

// エラーハンドラー
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('エラー:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || '内部サーバーエラー',
    },
  });
});

// サーバー起動（全てのネットワークインターフェースでリスニング）
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🌸 工事看板写真システム REST API');
  console.log('========================================');
  console.log(`🚀 サーバー起動: http://localhost:${PORT}`);
  console.log(`📱 モバイルアクセス: http://192.168.106.41:${PORT}`);
  console.log(`📊 ヘルスチェック: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('📡 APIエンドポイント:');
  console.log('');
  console.log('  🔐 認証:');
  console.log(`  - POST   /api/auth/register         ユーザー登録`);
  console.log(`  - POST   /api/auth/login            ログイン`);
  console.log(`  - GET    /api/auth/me               現在のユーザー情報`);
  console.log(`  - POST   /api/auth/change-password  パスワード変更`);
  console.log(`  - POST   /api/auth/refresh          トークンリフレッシュ`);
  console.log('');
  console.log('  📋 案件:');
  console.log(`  - GET    /api/projects              案件一覧`);
  console.log(`  - POST   /api/projects              案件作成`);
  console.log(`  - GET    /api/projects/:id          案件取得`);
  console.log(`  - PUT    /api/projects/:id          案件更新`);
  console.log(`  - DELETE /api/projects/:id          案件削除`);
  console.log('');
  console.log('  🚧 工事看板:');
  console.log(`  - GET    /api/signboards            工事看板一覧`);
  console.log(`  - POST   /api/signboards            工事看板作成`);
  console.log(`  - GET    /api/signboards/:id        工事看板取得`);
  console.log('');
  console.log('  📷 写真:');
  console.log(`  - GET    /api/photos                写真一覧`);
  console.log(`  - POST   /api/photos/upload         写真アップロード`);
  console.log(`  - GET    /api/photos/:id            写真取得`);
  console.log('');
  console.log('========================================');
  console.log('');
});

export default app;
