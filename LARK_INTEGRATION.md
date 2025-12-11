# Lark Base 連携ガイド

工事写真システムとLark Base (Feishu Base) の連携機能ドキュメント

## 📋 概要

このシステムはLark Base APIと連携し、以下の機能を提供します:

1. **案件データの同期** - システム内の案件情報をLark Baseテーブルに自動同期
2. **PDF直接アップロード** - 生成した写真台帳PDFをLark Baseの添付ファイルフィールドに直接アップロード
3. **双方向データ連携** - Lark Base側での変更を検知・同期（今後実装予定）

## 🚀 セットアップ

### 1. Lark アプリケーション作成

1. [Lark Open Platform](https://open.feishu.cn/app) にアクセス
2. 新しいアプリケーションを作成
3. App ID と App Secret を取得
4. 必要な権限を付与:
   - `bitable:app` - Base アプリへのアクセス
   - `bitable:app:readonly` - Base データ読み取り
   - `drive:drive` - ファイルアップロード

### 2. Lark Base テーブル準備

Lark Baseで新しいテーブルを作成し、以下のフィールドを追加:

| フィールド名 | タイプ | 説明 |
|------------|--------|------|
| project_name | テキスト | 案件名 |
| description | 複数行テキスト | 説明 |
| location | テキスト | 場所 |
| start_date | 日付 | 開始日 |
| end_date | 日付 | 終了日 |
| status | 単一選択 | ステータス (active/completed/archived) |
| photo_ledger_pdf | 添付ファイル | 写真台帳PDF |

### 3. 環境変数設定

`.env.example` を `.env` にコピーして設定:

```bash
cp .env.example .env
```

`.env` ファイルを編集:

```env
# Lark API認証情報
LARK_APP_ID=cli_xxxxxxxxxx
LARK_APP_SECRET=xxxxxxxxxxxxx

# Lark Base設定
LARK_BASE_APP_TOKEN=bascnxxxxxxxxxx
LARK_BASE_TABLE_ID=tblxxxxxxxxxx

# フィールドマッピング (カスタマイズ可能)
LARK_FIELD_PROJECT_NAME=project_name
LARK_FIELD_DESCRIPTION=description
LARK_FIELD_LOCATION=location
LARK_FIELD_START_DATE=start_date
LARK_FIELD_END_DATE=end_date
LARK_FIELD_STATUS=status
LARK_FIELD_PDF=photo_ledger_pdf
```

### 4. サーバー再起動

```bash
npm run server
```

## 📡 API エンドポイント

### 1. 設定確認

```http
GET /api/lark/config
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "configured": true,
    "hasAppId": true,
    "hasAppSecret": true,
    "hasAppToken": true,
    "hasTableId": true
  }
}
```

### 2. 案件データ同期

```http
POST /api/lark/sync/project/:projectId
Content-Type: application/json

{
  "larkRecordId": "recxxxxxxxx"  // オプション: 既存レコード更新の場合
}
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "projectId": "project-123",
    "larkRecordId": "recxxxxxxxx",
    "syncedAt": "2025-12-11T10:00:00.000Z"
  }
}
```

### 3. PDF アップロード

```http
POST /api/lark/upload/pdf
Content-Type: application/json

{
  "projectId": "project-123",
  "pdfBase64": "JVBERi0xLjQK...",  // Base64エンコードされたPDF
  "fileName": "写真台帳_2025-12-11.pdf",
  "recordId": "recxxxxxxxx"  // オプション: 既存レコードに追加
}
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "projectId": "project-123",
    "larkRecordId": "recxxxxxxxx",
    "fileName": "写真台帳_2025-12-11.pdf",
    "uploadedAt": "2025-12-11T10:05:00.000Z"
  }
}
```

### 4. 同期ステータス確認

```http
GET /api/lark/status/:projectId
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "projectId": "project-123",
    "larkRecordId": "recxxxxxxxx",
    "lastSyncAt": "2025-12-11T10:00:00.000Z",
    "syncStatus": "success"
  }
}
```

## 💻 使用例

### JavaScript/TypeScript

```typescript
// 案件データを同期
async function syncProjectToLark(projectId: string) {
  const response = await fetch(`/api/lark/sync/project/${projectId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  
  const data = await response.json();
  console.log('Sync result:', data);
}

// PDFをアップロード
async function uploadPdfToLark(projectId: string, pdfBlob: Blob) {
  // BlobをBase64に変換
  const reader = new FileReader();
  reader.readAsDataURL(pdfBlob);
  reader.onloadend = async () => {
    const base64 = reader.result.split(',')[1];
    
    const response = await fetch('/api/lark/upload/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        pdfBase64: base64,
        fileName: `写真台帳_${new Date().toISOString().split('T')[0]}.pdf`,
      }),
    });
    
    const data = await response.json();
    console.log('Upload result:', data);
  };
}
```

### curl

```bash
# 設定確認
curl http://localhost:3000/api/lark/config

# 案件同期
curl -X POST http://localhost:3000/api/lark/sync/project/project-123 \
  -H "Content-Type: application/json" \
  -d '{}'

# PDFアップロード
curl -X POST http://localhost:3000/api/lark/upload/pdf \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "project-123",
    "pdfBase64": "JVBERi0xLjQK...",
    "fileName": "test.pdf"
  }'
```

## 🏗️ アーキテクチャ

### ファイル構成

```
src/
├── types/
│   └── lark.ts                 # Lark API型定義
├── services/
│   └── LarkBaseService.ts      # Lark Base APIクライアント
└── routes/
    └── lark.ts                 # Lark連携APIルート
```

### データフロー

```
[フロントエンド]
     ↓
[API Routes] /api/lark/*
     ↓
[LarkBaseService]
     ↓
[Lark Base API] https://open.feishu.cn/open-apis/*
     ↓
[Lark Base テーブル]
```

## 🔒 セキュリティ

- **認証トークンの管理**: トークンは自動的にキャッシュされ、有効期限の90%で自動更新
- **環境変数**: 認証情報は環境変数で管理、リポジトリにコミットしない
- **エラーハンドリング**: API エラーは適切にハンドリングされ、ユーザーにフィードバック

## 🧪 テスト

```bash
# 設定確認
npm run server
curl http://localhost:3000/api/lark/config

# レスポンスで configured: true を確認
```

## 📝 TODO / 今後の実装

- [ ] Lark Base → システム への双方向同期
- [ ] Webhook による自動同期
- [ ] バッチ同期機能
- [ ] 同期履歴の保存
- [ ] リトライ機能
- [ ] レート制限対応

## 🐛 トラブルシューティング

### エラー: "Lark API credentials not configured"

**原因**: 環境変数が設定されていない

**解決方法**:
1. `.env` ファイルが存在するか確認
2. `LARK_APP_ID` と `LARK_APP_SECRET` が設定されているか確認
3. サーバーを再起動

### エラー: "Lark認証エラー"

**原因**: App ID または App Secret が間違っている

**解決方法**:
1. Lark Open Platform で認証情報を再確認
2. `.env` ファイルの値を修正
3. サーバーを再起動

### エラー: "Lark Base レコード作成エラー"

**原因**: テーブル設定またはフィールドマッピングが間違っている

**解決方法**:
1. `LARK_BASE_APP_TOKEN` と `LARK_BASE_TABLE_ID` を確認
2. フィールドIDが正しいか確認 (Lark Baseのテーブル設定から確認)
3. アプリに必要な権限が付与されているか確認

## 📚 参考リンク

- [Lark Open Platform ドキュメント](https://open.feishu.cn/document)
- [Lark Base API リファレンス](https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/create)
- [認証ガイド](https://open.feishu.cn/document/server-docs/authentication-management/access-token/tenant_access_token_internal)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
