# 工事看板写真システム - Cloudflare Workers版

Cloudflare Workers + Hono + D1データベースで実装された工事看板写真管理システムです。

## クイックスタート

### 1. 依存関係のインストール

```bash
npm install
```

### 2. データベースのセットアップ

```bash
# ローカルD1データベースにスキーマを適用
npx wrangler d1 execute testapp-db --file=schema.sql

# テストユーザーを作成
npx wrangler d1 execute testapp-db --file=scripts/create-test-user.sql
```

### 3. ビルド

```bash
npm run build
```

### 4. ローカル開発サーバー起動

```bash
npm run cf:dev
```

ブラウザで http://localhost:8787 にアクセスしてください。

## テストアカウント

開発用のテストアカウントが作成されています：

### 一般ユーザー
- **Email**: test@example.com
- **Password**: testpass123

### 管理者
- **Email**: admin@example.com
- **Password**: adminpass123

## APIの使い方

### 1. ユーザー登録

```bash
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123",
    "name": "New User"
  }'
```

### 2. ログイン

```bash
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

レスポンスでJWTトークンが返されます：

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. 認証が必要なAPIの使用

取得したトークンを`Authorization`ヘッダーに含めてリクエストします：

```bash
curl -X GET http://localhost:8787/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. 案件の作成

```bash
curl -X POST http://localhost:8787/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "新規工事案件",
    "description": "テスト案件です",
    "location": "東京都渋谷区",
    "startDate": "2025-01-01",
    "userId": "test-user-001"
  }'
```

### 5. 案件一覧の取得

```bash
curl -X GET "http://localhost:8787/api/projects?page=1&limit=10"
```

### 6. 工事看板の作成

```bash
curl -X POST http://localhost:8787/api/signboards \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "project-001",
    "title": "工事看板",
    "content": {
      "projectName": "サンプル工事",
      "constructionPeriod": "2025年1月-3月",
      "contractor": "株式会社サンプル"
    },
    "template": "standard"
  }'
```

## 利用可能なコマンド

### 開発

```bash
npm run cf:dev        # ローカル開発サーバー起動
npm run cf:tail       # ログ監視
npm run typecheck     # TypeScript型チェック
npm run build         # ビルド
```

### デプロイ

```bash
npm run deploy        # 本番環境へデプロイ
npm run deploy:preview # プレビュー環境へデプロイ
```

### ビルド検証

```bash
npm run build:worker  # Dry-runビルド
```

## プロジェクト構成

```
testapp/
├── src/
│   ├── worker.ts                 # メインエントリーポイント
│   ├── worker-types.ts           # Cloudflare Workers型定義
│   ├── worker-middleware/
│   │   └── auth.ts               # JWT認証ミドルウェア
│   ├── worker-routes/
│   │   ├── auth.ts               # 認証API
│   │   ├── projects.ts           # 案件管理API
│   │   ├── signboards.ts         # 工事看板API
│   │   ├── photos.ts             # 写真管理API
│   │   └── lark.ts               # Lark統合API
│   └── types/
│       └── index.ts              # 型定義
├── schema.sql                     # D1データベーススキーマ
├── scripts/
│   └── create-test-user.sql      # テストユーザー作成
├── wrangler.toml                  # Cloudflare Workers設定
├── DEPLOYMENT.md                  # デプロイメントガイド
└── README-CLOUDFLARE-WORKERS.md  # このファイル
```

## API一覧

### 認証 (Auth)

| Method | Endpoint | 説明 | 認証 |
|--------|----------|------|------|
| POST | /api/auth/register | ユーザー登録 | - |
| POST | /api/auth/login | ログイン | - |
| GET | /api/auth/me | 現在のユーザー情報 | 必要 |
| POST | /api/auth/change-password | パスワード変更 | 必要 |
| POST | /api/auth/refresh | トークンリフレッシュ | 必要 |

### 案件 (Projects)

| Method | Endpoint | 説明 | 認証 |
|--------|----------|------|------|
| GET | /api/projects | 案件一覧 | - |
| POST | /api/projects | 案件作成 | - |
| GET | /api/projects/:id | 案件取得 | - |
| PUT | /api/projects/:id | 案件更新 | - |
| PATCH | /api/projects/:id/status | ステータス更新 | - |
| DELETE | /api/projects/:id | 案件削除 | - |
| GET | /api/projects/search/query?q= | 案件検索 | - |

### 工事看板 (Signboards)

| Method | Endpoint | 説明 | 認証 |
|--------|----------|------|------|
| GET | /api/signboards | 工事看板一覧 | - |
| POST | /api/signboards | 工事看板作成 | - |
| GET | /api/signboards/:id | 工事看板取得 | - |
| PUT | /api/signboards/:id | 工事看板更新 | - |
| DELETE | /api/signboards/:id | 工事看板削除 | - |

### 写真 (Photos)

| Method | Endpoint | 説明 | 認証 |
|--------|----------|------|------|
| GET | /api/photos | 写真一覧 | - |
| POST | /api/photos/upload | 写真アップロード | - |
| GET | /api/photos/:id | 写真取得 | - |
| PUT | /api/photos/:id | 写真更新 | - |
| DELETE | /api/photos/:id | 写真削除 | - |

### Lark統合

| Method | Endpoint | 説明 | 認証 |
|--------|----------|------|------|
| GET | /api/lark/config | Lark設定確認 | - |
| POST | /api/lark/sync/project/:projectId | 案件同期 | - |
| POST | /api/lark/upload/pdf | PDF台帳アップロード | - |
| GET | /api/lark/status/:projectId | 同期ステータス | - |

### その他

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | / | APIドキュメント |
| GET | /api/health | ヘルスチェック |

## 技術スタック

- **Framework**: Hono v4.11.1
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite互換)
- **Language**: TypeScript 5.8.3
- **Authentication**: JWT (Web Crypto API)
- **Build**: TypeScript Compiler

## セキュリティ

- JWT認証（HMAC-SHA256）
- パスワードハッシュ化（SHA-256）
- CORS設定済み
- 8文字以上のパスワード必須

## 制限事項

1. **R2ストレージ未実装**: 写真アップロードはメタデータのみ保存
2. **Lark統合簡易版**: 基本的なエンドポイントのみ実装
3. **認証なしエンドポイント**: 一部のエンドポイントで認証未実装（開発中）

## トラブルシューティング

### ビルドエラー

```bash
npm run typecheck  # 型エラーチェック
npm run build      # 再ビルド
```

### データベースエラー

```bash
# スキーマ再適用
npx wrangler d1 execute testapp-db --file=schema.sql
```

### ローカル開発時のエラー

```bash
# ログ確認
npm run cf:tail
```

## 本番デプロイ

1. 環境変数を設定（wrangler.toml）
2. リモートD1にスキーマ適用
3. デプロイ実行

```bash
# リモートD1にスキーマ適用
npx wrangler d1 execute testapp-db --remote --file=schema.sql

# 本番デプロイ
npm run deploy
```

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します。

---

開発開始日: 2025-12-23
バージョン: 1.0.0
