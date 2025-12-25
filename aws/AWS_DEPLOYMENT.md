# AWS Deployment - 工事看板写真システム

## デプロイ完了 (2025-12-25)

AWS Free Tier対応のサーバーレスアーキテクチャでデプロイ完了。

## アクセスURL

### フロントエンド (S3 Static Website)
```
http://testapp-static-818604466217.s3-website-ap-northeast-1.amazonaws.com
```

### API (API Gateway + Lambda)
```
https://bj4xtgc6e7.execute-api.ap-northeast-1.amazonaws.com/prod/api
```

### ヘルスチェック
```
https://bj4xtgc6e7.execute-api.ap-northeast-1.amazonaws.com/prod/api/health
```

## AWS リソース構成

### DynamoDB テーブル (PAY_PER_REQUEST)
| テーブル名 | パーティションキー | GSI |
|-----------|-------------------|-----|
| testapp-users | userId | email-index |
| testapp-projects | projectId | userId-index |
| testapp-signboards | signboardId | projectId-index |
| testapp-photos | photoId | signboardId-index |

### S3 バケット
| バケット名 | 用途 |
|-----------|------|
| testapp-static-818604466217 | フロントエンド静的ファイル |
| testapp-uploads-818604466217 | 写真アップロード |

### Lambda 関数
| 関数名 | ランタイム | メモリ | タイムアウト |
|--------|-----------|--------|-------------|
| testapp-api | Node.js 20.x | 256MB | 30秒 |

### API Gateway
| API ID | タイプ | ステージ |
|--------|--------|----------|
| bj4xtgc6e7 | HTTP API (v2) | prod |

### IAM ロール
| ロール名 | 権限 |
|----------|------|
| testapp-lambda-role | CloudWatch Logs, DynamoDB, S3 |

## アーキテクチャ

```
[ブラウザ]
    ↓
[S3 Static Website] ← フロントエンド (HTML/JS/CSS)
    ↓ API リクエスト
[API Gateway HTTP API]
    ↓
[Lambda (Hono)] ← バックエンドAPI
    ↓
[DynamoDB] ← データ永続化
[S3] ← 写真ストレージ
```

## コスト (Free Tier 対応)

- **DynamoDB**: 25GB ストレージ無料、読み書きキャパシティ無料範囲内
- **Lambda**: 月100万リクエスト無料、40万GB秒無料
- **S3**: 5GB ストレージ無料、2万GETリクエスト無料
- **API Gateway**: 月100万API呼び出し無料

## デプロイ手順

### Lambda コード更新

```powershell
cd aws/lambda
npm install
npx tsc
Compress-Archive -Force -Path dist, node_modules, package.json -DestinationPath function.zip
aws lambda update-function-code --function-name testapp-api --zip-file fileb://function.zip --region ap-northeast-1
```

### フロントエンド更新

```powershell
# API URLが変更された場合はaws/public/app.jsを編集
aws s3 sync aws/public s3://testapp-static-818604466217 --region ap-northeast-1
```

## API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /api/health | ヘルスチェック |
| POST | /api/auth/login | ログイン |
| POST | /api/auth/register | ユーザー登録 |
| GET | /api/projects | 案件一覧 |
| POST | /api/projects | 案件作成 |
| GET | /api/signboards | 看板一覧 |
| POST | /api/signboards | 看板作成 |
| GET | /api/photos | 写真一覧 |
| POST | /api/photos/upload | 写真アップロード |

## ファイル構成

```
aws/
├── lambda/
│   ├── src/
│   │   ├── index.ts          # Lambda エントリポイント (Hono)
│   │   └── routes/
│   │       ├── auth.ts       # 認証API
│   │       ├── projects.ts   # 案件API
│   │       ├── signboards.ts # 看板API
│   │       └── photos.ts     # 写真API
│   ├── package.json
│   ├── tsconfig.json
│   └── function.zip          # デプロイ用ZIP
├── public/                    # AWS用フロントエンド (API URL変更済み)
├── iam-trust-policy.json      # Lambda実行ロール信頼ポリシー
├── lambda-policy.json         # Lambda権限ポリシー
├── s3-bucket-policy.json      # S3パブリックアクセスポリシー
├── deploy.ps1                 # デプロイスクリプト
└── AWS_DEPLOYMENT.md          # このファイル
```

## 注意事項

1. **CORS**: API GatewayでCORS設定済み (全オリジン許可)
2. **認証**: 現在はシンプルなJWT認証 (本番環境では強化推奨)
3. **HTTPS**: S3ウェブサイトはHTTPのみ (CloudFront追加でHTTPS対応可能)
