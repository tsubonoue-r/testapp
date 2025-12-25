/**
 * Signboards Routes for Lambda
 * 看板管理API
 */

import { Hono } from 'hono';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { AppEnv } from '../index.js';

const SIGNBOARDS_TABLE = process.env.SIGNBOARDS_TABLE || 'testapp-signboards';

const signboards = new Hono<AppEnv>();

/**
 * GET /api/signboards
 */
signboards.get('/', async (c) => {
  try {
    const docClient = c.get('docClient');
    const projectId = c.req.query('projectId');

    if (!projectId) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'projectIdは必須です' } }, 400);
    }

    const result = await docClient.send(new QueryCommand({
      TableName: SIGNBOARDS_TABLE,
      IndexName: 'projectId-index',
      KeyConditionExpression: 'projectId = :projectId',
      ExpressionAttributeValues: { ':projectId': projectId },
    }));

    return c.json({ success: true, data: { items: result.Items || [] } });
  } catch (error) {
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } }, 500);
  }
});

/**
 * GET /api/signboards/:id
 */
signboards.get('/:id', async (c) => {
  try {
    const docClient = c.get('docClient');
    const id = c.req.param('id');

    const result = await docClient.send(new GetCommand({ TableName: SIGNBOARDS_TABLE, Key: { id } }));

    if (!result.Item) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: `看板が見つかりません: ${id}` } }, 404);
    }

    return c.json({ success: true, data: result.Item });
  } catch (error) {
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } }, 500);
  }
});

/**
 * POST /api/signboards
 */
signboards.post('/', async (c) => {
  try {
    const docClient = c.get('docClient');
    const body = await c.req.json<{
      projectId: string;
      title: string;
      description?: string;
      constructionName?: string;
      constructionType?: string;
      contractor?: string;
      period?: string;
    }>();

    const { projectId, title, description, constructionName, constructionType, contractor, period } = body;

    if (!projectId || !title) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'projectIdとtitleは必須です' } }, 400);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const signboard = {
      id,
      projectId,
      title,
      description: description || null,
      constructionName: constructionName || null,
      constructionType: constructionType || null,
      contractor: contractor || null,
      period: period || null,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({ TableName: SIGNBOARDS_TABLE, Item: signboard }));

    return c.json({ success: true, data: signboard, message: '看板を作成しました' }, 201);
  } catch (error) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } }, 400);
  }
});

/**
 * PUT /api/signboards/:id
 */
signboards.put('/:id', async (c) => {
  try {
    const docClient = c.get('docClient');
    const id = c.req.param('id');
    const updates = await c.req.json<Record<string, unknown>>();

    const existing = await docClient.send(new GetCommand({ TableName: SIGNBOARDS_TABLE, Key: { id } }));
    if (!existing.Item) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: `看板が見つかりません: ${id}` } }, 404);
    }

    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    const allowedFields = ['title', 'description', 'constructionName', 'constructionType', 'contractor', 'period'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateExpressions.push(`#${field} = :${field}`);
        expressionAttributeNames[`#${field}`] = field;
        expressionAttributeValues[`:${field}`] = updates[field];
      }
    }

    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    await docClient.send(new UpdateCommand({
      TableName: SIGNBOARDS_TABLE,
      Key: { id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));

    const result = await docClient.send(new GetCommand({ TableName: SIGNBOARDS_TABLE, Key: { id } }));

    return c.json({ success: true, data: result.Item, message: '看板を更新しました' });
  } catch (error) {
    return c.json({ success: false, error: { code: 'UPDATE_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } }, 400);
  }
});

/**
 * DELETE /api/signboards/:id
 */
signboards.delete('/:id', async (c) => {
  try {
    const docClient = c.get('docClient');
    const id = c.req.param('id');

    const existing = await docClient.send(new GetCommand({ TableName: SIGNBOARDS_TABLE, Key: { id } }));
    if (!existing.Item) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: `看板が見つかりません: ${id}` } }, 404);
    }

    await docClient.send(new DeleteCommand({ TableName: SIGNBOARDS_TABLE, Key: { id } }));

    return c.json({ success: true, message: '看板を削除しました' });
  } catch (error) {
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } }, 500);
  }
});

export default signboards;
