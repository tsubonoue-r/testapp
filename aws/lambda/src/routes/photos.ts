/**
 * Photos Routes for Lambda
 * 写真管理API
 */

import { Hono } from 'hono';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { AppEnv } from '../index.js';

const PHOTOS_TABLE = process.env.PHOTOS_TABLE || 'testapp-photos';
const UPLOADS_BUCKET = process.env.UPLOADS_BUCKET || 'testapp-uploads-818604466217';

const photos = new Hono<AppEnv>();

/**
 * GET /api/photos
 */
photos.get('/', async (c) => {
  try {
    const docClient = c.get('docClient');
    const signboardId = c.req.query('signboardId');

    if (!signboardId) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'signboardIdは必須です' } }, 400);
    }

    const result = await docClient.send(new QueryCommand({
      TableName: PHOTOS_TABLE,
      IndexName: 'signboardId-index',
      KeyConditionExpression: 'signboardId = :signboardId',
      ExpressionAttributeValues: { ':signboardId': signboardId },
    }));

    return c.json({ success: true, data: { items: result.Items || [] } });
  } catch (error) {
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } }, 500);
  }
});

/**
 * GET /api/photos/:id
 */
photos.get('/:id', async (c) => {
  try {
    const docClient = c.get('docClient');
    const id = c.req.param('id');

    const result = await docClient.send(new GetCommand({ TableName: PHOTOS_TABLE, Key: { id } }));

    if (!result.Item) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: `写真が見つかりません: ${id}` } }, 404);
    }

    return c.json({ success: true, data: result.Item });
  } catch (error) {
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } }, 500);
  }
});

/**
 * POST /api/photos
 * 写真メタデータを作成（実際のファイルアップロードはS3署名付きURLを使用）
 */
photos.post('/', async (c) => {
  try {
    const docClient = c.get('docClient');
    const body = await c.req.json<{
      signboardId: string;
      fileName: string;
      mimeType: string;
      description?: string;
      takenAt?: string;
      latitude?: number;
      longitude?: number;
    }>();

    const { signboardId, fileName, mimeType, description, takenAt, latitude, longitude } = body;

    if (!signboardId || !fileName || !mimeType) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'signboardId、fileName、mimeTypeは必須です' } }, 400);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const s3Key = `photos/${signboardId}/${id}/${fileName}`;

    const photo = {
      id,
      signboardId,
      fileName,
      mimeType,
      s3Key,
      s3Bucket: UPLOADS_BUCKET,
      description: description || null,
      takenAt: takenAt || now,
      latitude: latitude || null,
      longitude: longitude || null,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({ TableName: PHOTOS_TABLE, Item: photo }));

    // S3署名付きURLの生成はここで行うこともできますが、
    // 別のエンドポイント（/api/photos/:id/upload-url）で行う方がセキュアです

    return c.json({
      success: true,
      data: photo,
      message: '写真メタデータを作成しました。ファイルアップロードには署名付きURLを使用してください。'
    }, 201);
  } catch (error) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } }, 400);
  }
});

/**
 * DELETE /api/photos/:id
 */
photos.delete('/:id', async (c) => {
  try {
    const docClient = c.get('docClient');
    const id = c.req.param('id');

    const existing = await docClient.send(new GetCommand({ TableName: PHOTOS_TABLE, Key: { id } }));
    if (!existing.Item) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: `写真が見つかりません: ${id}` } }, 404);
    }

    // TODO: S3からもファイルを削除する

    await docClient.send(new DeleteCommand({ TableName: PHOTOS_TABLE, Key: { id } }));

    return c.json({ success: true, message: '写真を削除しました' });
  } catch (error) {
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } }, 500);
  }
});

export default photos;
