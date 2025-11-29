# API ドキュメント

工事看板写真システム REST API

## ベースURL

```
http://localhost:3000/api
```

## 認証

現在は認証なし。今後JWT認証を実装予定。

## エンドポイント

### ヘルスチェック

```
GET /api/health
```

レスポンス:
```json
{
  "status": "ok",
  "timestamp": "2025-11-29T...",
  "version": "1.0.0",
  "service": "工事看板写真システム API"
}
```

### 案件管理

#### 案件一覧取得
```
GET /api/projects?page=1&limit=10&status=in_progress
```

#### 案件作成
```
POST /api/projects
Content-Type: application/json

{
  "name": "道路拡張工事",
  "description": "国道123号線の拡張工事",
  "location": "東京都千代田区",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}
```

#### 案件取得
```
GET /api/projects/:id
```

#### 案件更新
```
PUT /api/projects/:id
```

#### ステータス更新
```
PATCH /api/projects/:id/status
Content-Type: application/json

{
  "status": "in_progress"
}
```

#### 案件削除
```
DELETE /api/projects/:id
```

#### 案件検索
```
GET /api/projects/search/query?q=道路
```

### 工事看板管理

#### 工事看板一覧
```
GET /api/signboards?projectId=xxx
```

#### 工事看板作成
```
POST /api/signboards
Content-Type: application/json

{
  "projectId": "xxx",
  "title": "道路拡張工事看板",
  "content": {
    "projectName": "道路拡張工事",
    "constructionPeriod": "2025年1月〜2025年12月",
    "contractor": "株式会社建設テック",
    "supervisor": "山田太郎",
    "contact": "03-1234-5678"
  },
  "template": "standard"
}
```

### 写真管理

#### 写真一覧
```
GET /api/photos?projectId=xxx&page=1&limit=20
```

#### 写真アップロード
```
POST /api/photos/upload
Content-Type: multipart/form-data

photo: (binary)
projectId: xxx
signboardId: yyy (optional)
caption: 着工前の現場写真 (optional)
```

#### 写真取得
```
GET /api/photos/:id
```

#### 写真更新
```
PUT /api/photos/:id
```

#### 写真削除
```
DELETE /api/photos/:id
```

## エラーレスポンス

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "案件が見つかりません"
  }
}
```

## 今後の実装予定

- [ ] JWT認証
- [ ] リフレッシュトークン
- [ ] レート制限
- [ ] Swagger/OpenAPI仕様
