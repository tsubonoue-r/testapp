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

## 静的ファイル配信（新機能）

### Workers Assets統合

`public/`ディレクトリ配下の全ファイルが自動的に配信されます:

- `index.html` - メインアプリケーション
- `app.html`, `app.js` - PWAアプリ
- `manifest.json` - PWAマニフェスト
- `service-worker.js` - Service Worker
- アイコン画像（PNG）

### ルーティング優先順位

1. **APIルート** (`/api/*`) - 最優先でHono APIが処理
2. **静的ファイル** (`/*.html`, `/*.js`, etc.) - Workers Assetsから配信
3. **SPA Fallback** - 拡張子がない場合は`index.html`を配信

### キャッシュ制御

ファイルタイプごとに最適なキャッシュ設定:

- **HTML**: `max-age=0, must-revalidate`（常に最新）
- **JS/CSS**: `max-age=86400, must-revalidate`（1日キャッシュ）
- **画像/フォント**: `max-age=31536000, immutable`（1年キャッシュ）
- **PWAファイル**: `max-age=0, must-revalidate`（常に最新）

## R2ストレージ統合（実装済み）

### 機能

写真アップロード機能でR2バケットを使用できます:

- ✅ **実ファイルアップロード**: multipart/form-dataで画像をR2に保存
- ✅ **画像取得API**: `/api/photos/:id/image`でR2から画像を取得
- ✅ **自動削除**: 写真削除時にR2からも削除
- ✅ **後方互換性**: JSON形式のメタデータのみアップロードも可能

### R2セットアップ

```bash
# R2バケット作成
npx wrangler r2 bucket create testapp-uploads

# バケット確認
npx wrangler r2 bucket list
```

`wrangler.toml`の設定（既に有効化済み）:

```toml
[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "testapp-uploads"
```

### 使用方法

#### 画像アップロード（R2使用）

```bash
# multipart/form-data形式でアップロード
curl -X POST https://testapp.workers.dev/api/photos/upload \
  -F "file=@/path/to/image.jpg" \
  -F "projectId=your-project-id" \
  -F "caption=テスト画像" \
  -F "metadata={\"size\":12345}"

# レスポンス
{
  "success": true,
  "data": {
    "id": "photo-uuid",
    "filepath": "photos/project-id/photo-uuid/photo-uuid.jpg",
    "imageUrl": "/api/photos/photo-uuid/image",
    ...
  },
  "message": "写真をR2にアップロードしました"
}
```

#### 画像取得

```bash
# ブラウザまたはcurlで画像を取得
curl https://testapp.workers.dev/api/photos/{photo-id}/image > downloaded.jpg
```

#### メタデータのみアップロード（従来の動作）

```bash
# JSON形式でメタデータのみ保存
curl -X POST https://testapp.workers.dev/api/photos/upload \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "your-project-id",
    "filename": "image.jpg",
    "filepath": "/local/path/image.jpg",
    "metadata": {"size": 12345}
  }'
```

### Lark統合（簡易版）

Lark Base統合は基本的なエンドポイントのみ実装しています。完全な統合には`LarkBaseService`の実装が必要です。

## パフォーマンス

- **コールドスタート**: ~50ms
- **レスポンスタイム**: ~20-50ms（D1クエリ含む）
- **無料枠**: 100,000リクエスト/日

## デプロイ前チェックリスト

- [ ] D1データベースのスキーマ適用完了
- [ ] JWT_SECRET環境変数を強力な値に変更
- [ ] R2バケット作成（画像アップロードを使用する場合）
- [ ] TypeScriptコンパイルエラー0件確認（`npm run typecheck`）
- [ ] ビルド成功確認（`npm run build`）
- [ ] ローカルテスト実施（`npm run cf:dev`）
- [ ] CORS設定を本番環境用に調整（必要に応じて）

## 次のステップ

1. ✅ ~~R2ストレージ統合~~ **実装完了**
2. ✅ ~~静的ファイル配信~~ **実装完了**
3. Lark Base完全実装
4. テストスイート追加
5. CI/CD設定（GitHub Actions）
6. 監視・ロギング設定
7. カスタムドメイン設定

## まとめ

このデプロイガイドに従って、以下の機能を持つフルスタックアプリケーションがデプロイできます:

- **REST API**: Hono + D1による高速なバックエンド
- **静的ファイル配信**: Workers Assetsによる最適化されたフロントエンド配信
- **PWA対応**: モバイルアプリとしてインストール可能
- **画像ストレージ**: R2バケットによるスケーラブルなファイル保存
- **認証**: JWT認証による安全なユーザー管理
- **グローバルCDN**: Cloudflareのエッジネットワークで高速配信

デプロイ完了後、`https://your-worker.workers.dev/`でアプリケーションにアクセスできます。

---

**最終更新日**: 2025-12-23
**実装機能**: 静的ファイル配信 + R2ストレージ統合
