#!/bin/bash

# Larkメッセージ送信ヘルパースクリプト
# 使い方: ./send_lark.sh "メッセージ内容"

set -e

# .envファイルから設定を読み込む
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# 必須変数チェック
if [ -z "$LARK_APP_ID" ] || [ -z "$LARK_APP_SECRET" ] || [ -z "$LARK_USER_ID" ]; then
  echo "❌ エラー: .envファイルにLARK_APP_ID, LARK_APP_SECRET, LARK_USER_IDが必要です"
  exit 1
fi

# メッセージ取得（引数から、またはファイルから）
if [ $# -eq 0 ]; then
  echo "使い方: $0 \"メッセージ内容\""
  echo "または: cat message.txt | $0"
  exit 1
fi

MESSAGE="$1"

echo "🔐 Larkアクセストークン取得中..."

# アクセストークン取得
TOKEN=$(curl -s -X POST https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal \
  -H "Content-Type: application/json" \
  -d "{\"app_id\":\"$LARK_APP_ID\",\"app_secret\":\"$LARK_APP_SECRET\"}" \
  | jq -r '.tenant_access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ アクセストークンの取得に失敗しました"
  exit 1
fi

echo "✅ トークン取得成功"

# contentをJSON文字列として作成
CONTENT=$(jq -n --arg text "$MESSAGE" '{"text": $text}' | jq -c .)

# リクエストボディ作成
BODY=$(jq -n \
  --arg uid "$LARK_USER_ID" \
  --arg content "$CONTENT" \
  '{receive_id: $uid, msg_type: "text", content: $content}')

echo "📤 Larkメッセージ送信中..."

# メッセージ送信
RESPONSE=$(curl -s -X POST "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=user_id" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BODY")

# 結果チェック
CODE=$(echo "$RESPONSE" | jq -r '.code')

if [ "$CODE" = "0" ]; then
  MESSAGE_ID=$(echo "$RESPONSE" | jq -r '.data.message_id')
  echo "✅ メッセージ送信成功！"
  echo "📬 Message ID: $MESSAGE_ID"
else
  echo "❌ メッセージ送信失敗"
  echo "$RESPONSE" | jq .
  exit 1
fi
