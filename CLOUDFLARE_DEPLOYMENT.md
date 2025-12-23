# Cloudflare デプロイメントガイド

## 概要

このプロジェクトをCloudflare Workersにデプロイする手順です。

## 前提条件

- Node.js 18以上
- Cloudflareアカウント
- Wrangler CLIのインストール

## セットアップ

### 1. 依存関係のインストール

```bash
npm install --save-dev wrangler@latest @cloudflare/workers-types@latest
```

### 2. Wranglerログイン

```bash
npx wrangler login
```

ブラウザが開き、Cloudflareアカウントでの認証が求められます。

### 3. package.jsonにスクリプト追加

`package.json`の`scripts`セクションに以下を追加:

```json
{
  "scripts": {
    "build:worker": "tsc && wrangler deploy --dry-run",
    "deploy": "wrangler deploy",
    "deploy:preview": "wrangler deploy --env preview",
    "cf:dev": "wrangler dev",
    "cf:tail": "wrangler tail"
  }
}
```

## デプロイ方法

### ローカル開発環境で実行

```bash
npm run cf:dev
```

ローカルホストでCloudflare Workers環境をシミュレート。

### プレビューデプロイ

```bash
npm run deploy:preview
```

テスト用の一時的なURLにデプロイ。

### 本番デプロイ

```bash
npm run deploy
```

本番環境にデプロイ。

## 設定ファイル

### wrangler.toml

プロジェクトルートに`wrangler.toml`が作成されています:

- **name**: Workers アプリケーション名
- **main**: エントリーポイント (`src/worker.ts`)
- **compatibility_date**: 互換性日付
- **node_compat**: Node.js互換性モード有効化

### src/worker.ts

Cloudflare Workers用のエントリーポイントファイル。
現在は基本的なヘルスチェックエンドポイント (`/api/health`) を提供。

## 現在の制限事項

### SQLiteデータベース

Cloudflare Workersは直接SQLiteをサポートしていません。
以下の選択肢があります:

1. **Cloudflare D1** - Cloudflareのサーバーレス SQLデータベース
2. **Cloudflare KV** - Key-Valueストア（シンプルなデータ向け）
3. **外部データベース** - PlanetScale、Supabaseなど

### ファイルアップロード

ファイルシステムアクセスは使えません。
**Cloudflare R2**（S3互換オブジェクトストレージ）への移行が必要です。

## 次のステップ

1. **D1データベースのセットアップ**
   ```bash
   npx wrangler d1 create testapp-db
   ```

2. **R2バケットの作成**
   ```bash
   npx wrangler r2 bucket create testapp-uploads
   ```

3. **環境変数の設定**
   ```bash
   npx wrangler secret put GITHUB_TOKEN
   npx wrangler secret put JWT_SECRET
   ```

4. **Expressアプリの完全移行**
   - `@hono/hono`や`itty-router`などの軽量フレームワークへの移行を検討
   - または`@cloudflare/workers-types`を使用したネイティブWorker実装

## リソース

- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)
- [Wrangler CLI ドキュメント](https://developers.cloudflare.com/workers/wrangler/)
- [D1 データベース](https://developers.cloudflare.com/d1/)
- [R2 オブジェクトストレージ](https://developers.cloudflare.com/r2/)

## トラブルシューティング

### "Module not found"エラー

TypeScriptのビルド設定を確認:
```bash
npm run build
```

### 認証エラー

Wranglerの再ログイン:
```bash
npx wrangler logout
npx wrangler login
```

---

作成日: 2025-12-23
更新日: 2025-12-23
