/**
 * Projects Routes for Lambda
 * 案件管理API
 */

import { Hono } from 'hono';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { AppEnv } from '../index.js';

const PROJECTS_TABLE = process.env.PROJECTS_TABLE || 'testapp-projects';

const projects = new Hono<AppEnv>();

/**
 * GET /api/projects
 */
projects.get('/', async (c) => {
  try {
    const docClient = c.get('docClient');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const status = c.req.query('status');

    let result;
    if (status) {
      result = await docClient.send(new ScanCommand({
        TableName: PROJECTS_TABLE,
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': status },
      }));
    } else {
      result = await docClient.send(new ScanCommand({ TableName: PROJECTS_TABLE }));
    }

    const items = result.Items || [];
    const sorted = items.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
    const total = sorted.length;
    const offset = (page - 1) * limit;
    const paginatedItems = sorted.slice(offset, offset + limit);

    return c.json({
      success: true,
      data: {
        items: paginatedItems,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } }, 500);
  }
});

/**
 * GET /api/projects/:id
 */
projects.get('/:id', async (c) => {
  try {
    const docClient = c.get('docClient');
    const id = c.req.param('id');

    const result = await docClient.send(new GetCommand({ TableName: PROJECTS_TABLE, Key: { id } }));

    if (!result.Item) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: `案件が見つかりません: ${id}` } }, 404);
    }

    return c.json({ success: true, data: result.Item });
  } catch (error) {
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } }, 500);
  }
});

/**
 * POST /api/projects
 */
projects.post('/', async (c) => {
  try {
    const docClient = c.get('docClient');
    const body = await c.req.json<{
      name: string;
      description?: string;
      location: string;
      startDate: string;
      endDate?: string;
      userId?: string;
    }>();

    const { name, description, location, startDate, endDate, userId } = body;

    if (!name || !location || !startDate) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: '名前、場所、開始日は必須です' } }, 400);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const project = {
      id,
      name,
      description: description || null,
      location,
      startDate,
      endDate: endDate || null,
      status: 'planned',
      userId: userId || 'system',
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({ TableName: PROJECTS_TABLE, Item: project }));

    return c.json({ success: true, data: project, message: '案件を作成しました' }, 201);
  } catch (error) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } }, 400);
  }
});

/**
 * PUT /api/projects/:id
 */
projects.put('/:id', async (c) => {
  try {
    const docClient = c.get('docClient');
    const id = c.req.param('id');
    const updates = await c.req.json<Record<string, unknown>>();

    const existing = await docClient.send(new GetCommand({ TableName: PROJECTS_TABLE, Key: { id } }));
    if (!existing.Item) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: `案件が見つかりません: ${id}` } }, 404);
    }

    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    const allowedFields = ['name', 'description', 'location', 'startDate', 'endDate', 'status'];
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
      TableName: PROJECTS_TABLE,
      Key: { id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));

    const result = await docClient.send(new GetCommand({ TableName: PROJECTS_TABLE, Key: { id } }));

    return c.json({ success: true, data: result.Item, message: '案件を更新しました' });
  } catch (error) {
    return c.json({ success: false, error: { code: 'UPDATE_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } }, 400);
  }
});

/**
 * DELETE /api/projects/:id
 */
projects.delete('/:id', async (c) => {
  try {
    const docClient = c.get('docClient');
    const id = c.req.param('id');

    const existing = await docClient.send(new GetCommand({ TableName: PROJECTS_TABLE, Key: { id } }));
    if (!existing.Item) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: `案件が見つかりません: ${id}` } }, 404);
    }

    await docClient.send(new DeleteCommand({ TableName: PROJECTS_TABLE, Key: { id } }));

    return c.json({ success: true, message: '案件を削除しました' });
  } catch (error) {
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } }, 500);
  }
});

export default projects;
