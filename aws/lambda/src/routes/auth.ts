/**
 * Authentication Routes for Lambda
 * ユーザー登録・ログイン・トークン管理
 */

import { Hono } from 'hono';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { AppEnv } from '../index.js';

const USERS_TABLE = process.env.USERS_TABLE || 'testapp-users';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const auth = new Hono<AppEnv>();

/**
 * パスワードをハッシュ化
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * パスワードを検証
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedPassword = await hashPassword(password);
  return hashedPassword === hash;
}

/**
 * JWTトークンを生成
 */
async function generateToken(user: { id: string; email: string; role: string }): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const keyData = encoder.encode(JWT_SECRET);

  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

/**
 * POST /api/auth/register
 */
auth.post('/register', async (c) => {
  try {
    const docClient = c.get('docClient');
    const body = await c.req.json<{ email: string; password: string; name: string; role?: string }>();
    const { email, password, name, role } = body;

    if (!email || !password || !name) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'メールアドレス、パスワード、名前は必須です' } }, 400);
    }

    if (password.length < 8) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'パスワードは8文字以上である必要があります' } }, 400);
    }

    // メールアドレスの重複チェック
    const existingResult = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
    }));

    if (existingResult.Items && existingResult.Items.length > 0) {
      return c.json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'このメールアドレスは既に登録されています' } }, 400);
    }

    const hashedPassword = await hashPassword(password);
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    const user = {
      id: userId,
      email,
      password: hashedPassword,
      name,
      role: role || 'user',
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: user }));

    const { password: _, ...userWithoutPassword } = user;
    const token = await generateToken(userWithoutPassword);

    return c.json({ success: true, data: { user: userWithoutPassword, token }, message: 'ユーザー登録が完了しました' }, 201);
  } catch (error) {
    return c.json({ success: false, error: { code: 'REGISTRATION_ERROR', message: error instanceof Error ? error.message : '登録に失敗しました' } }, 400);
  }
});

/**
 * POST /api/auth/login
 */
auth.post('/login', async (c) => {
  try {
    const docClient = c.get('docClient');
    const body = await c.req.json<{ email: string; password: string }>();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'メールアドレスとパスワードは必須です' } }, 400);
    }

    const result = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
    }));

    if (!result.Items || result.Items.length === 0) {
      return c.json({ success: false, error: { code: 'LOGIN_ERROR', message: 'メールアドレスまたはパスワードが正しくありません' } }, 401);
    }

    const user = result.Items[0] as { id: string; email: string; password: string; name: string; role: string };
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return c.json({ success: false, error: { code: 'LOGIN_ERROR', message: 'メールアドレスまたはパスワードが正しくありません' } }, 401);
    }

    const { password: _, ...userWithoutPassword } = user;
    const token = await generateToken(userWithoutPassword);

    return c.json({ success: true, data: { user: userWithoutPassword, token }, message: 'ログインしました' });
  } catch (error) {
    return c.json({ success: false, error: { code: 'LOGIN_ERROR', message: error instanceof Error ? error.message : 'ログインに失敗しました' } }, 401);
  }
});

export default auth;
