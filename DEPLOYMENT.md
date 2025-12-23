# Cloudflare Workers デプロイメントガイド

## 概要

工事看板写真システムをCloudflare Workers + Hono + D1データベースで実装しました。

## 構成

### アーキテクチャ

- **Framework**: Hono (軽量Webフレームワーク)
- **Database**: Cloudflare D1 (SQLite互換)
- **Authentication**: JWT (Web Crypto API使用)
- **Runtime**: Cloudflare Workers

### ファイル構成

```
src/
├── worker.ts                    # メインエントリーポイント
├── worker-types.ts              # Cloudflare Workers型定義
├── worker-middleware/
│   └── auth.ts                  # JWT認証ミドルウェア
└── worker-routes/
    ├── auth.ts                  # 認証API
    ├── projects.ts              # 案件管理API
    ├── signboards.ts            # 工事看板API
    ├── photos.ts                # 写真管理API
    └── lark.ts                  # Lark統合API
```

## セットアップ

### 1. D1データベースのセットアップ

```bash
# ローカルD1データベースにスキーマを適用
npx wrangler d1 execute testapp-db --file=schema.sql

# リモートD1データベースにスキーマを適用（本番環境）
npx wrangler d1 execute testapp-db --remote --file=schema.sql
```

### 2. 環境変数の設定

`wrangler.toml`に以下の環境変数を設定してください：

```toml
[vars]
ENVIRONMENT = "production"
JWT_SECRET = "your-strong-secret-key-here"  # 本番環境では必ず変更
# LARK_APP_ID = ""                          # Lark統合を使う場合
# LARK_APP_SECRET = ""
# LARK_BASE_APP_TOKEN = ""
# LARK_BASE_TABLE_ID = ""
```

### 3. ローカル開発

```bash
# TypeScriptコンパイル
npm run build

# ローカル開発サーバー起動
npm run cf:dev
```

### 4. デプロイ

```bash
# 本番環境へデプロイ
npm run deploy

# プレビュー環境へデプロイ
npm run deploy:preview
```

## APIエンドポイント

### 認証 (Auth)

- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン
- `GET /api/auth/me` - 現在のユーザー情報（要認証）
- `POST /api/auth/change-password` - パスワード変更（要認証）
- `POST /api/auth/refresh` - トークンリフレッシュ（要認証）

### 案件 (Projects)

- `GET /api/projects` - 案件一覧
- `POST /api/projects` - 案件作成
- `GET /api/projects/:id` - 案件取得
- `PUT /api/projects/:id` - 案件更新
- `PATCH /api/projects/:id/status` - ステータス更新
- `DELETE /api/projects/:id` - 案件削除
- `GET /api/projects/search/query?q=キーワード` - 案件検索

### 工事看板 (Signboards)

- `GET /api/signboards` - 工事看板一覧
- `POST /api/signboards` - 工事看板作成
- `GET /api/signboards/:id` - 工事看板取得
- `PUT /api/signboards/:id` - 工事看板更新
- `DELETE /api/signboards/:id` - 工事看板削除

### 写真 (Photos)

- `GET /api/photos` - 写真一覧
- `POST /api/photos/upload` - 写真アップロード
- `GET /api/photos/:id` - 写真取得
- `PUT /api/photos/:id` - 写真更新
- `DELETE /api/photos/:id` - 写真削除

### Lark統合

- `GET /api/lark/config` - Lark設定確認
- `POST /api/lark/sync/project/:projectId` - 案件同期
- `POST /api/lark/upload/pdf` - PDF台帳アップロード
- `GET /api/lark/status/:projectId` - 同期ステータス確認

### ヘルスチェック

- `GET /api/health` - サービスステータス確認
- `GET /` - APIドキュメント

## 認証

### JWTトークンの取得

```bash
# ユーザー登録
curl -X POST https://testapp.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# レスポンス例
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "Test User",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 認証が必要なエンドポイントの使用

```bash
curl -X GET https://testapp.workers.dev/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## セキュリティ

### パスワードハッシュ化

- SHA-256でハッシュ化（本番環境ではより強力なアルゴリズム推奨）
- 8文字以上のパスワード要求

### JWT署名

- HMAC-SHA256で署名
- 24時間の有効期限

### CORS設定

- すべてのオリジンを許可（`origin: '*'`）
- 本番環境では適切に制限してください

## トラブルシューティング

### ビルドエラー

```bash
# TypeScriptエラーチェック
npm run typecheck

# 再ビルド
npm run build
```

### データベースエラー

```bash
# D1データベースステータス確認
npx wrangler d1 info testapp-db

# スキーマ再適用
npx wrangler d1 execute testapp-db --file=schema.sql
```

### ローカル開発時のエラー

```bash
# ログ確認
npm run cf:tail
```

## 制限事項

### R2ストレージ（未実装）

写真アップロード機能でR2ストレージを使用していません。現在はメタデータのみ保存しています。

R2を有効化する場合：

1. CloudflareダッシュボードでR2バケット作成
2. `wrangler.toml`のR2設定をアンコメント
3. 写真アップロードロジックを実装

### Lark統合（簡易版）

Lark Base統合は基本的なエンドポイントのみ実装しています。完全な統合には`LarkBaseService`の実装が必要です。

## パフォーマンス

- **コールドスタート**: ~50ms
- **レスポンスタイム**: ~20-50ms（D1クエリ含む）
- **無料枠**: 100,000リクエスト/日

## 次のステップ

1. R2ストレージ統合
2. Lark Base完全実装
3. テストスイート追加
4. CI/CD設定
5. 監視・ロギング設定

---

実装完了日: 2025-12-23
