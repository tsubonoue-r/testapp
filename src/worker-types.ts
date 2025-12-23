/**
 * Cloudflare Workers Type Definitions
 * Honoアプリケーション用の型定義
 */

/// <reference types="@cloudflare/workers-types" />

import { JWTPayload } from './types/index.js';

/**
 * Cloudflare Workers Environment Bindings
 */
export interface Env {
  DB: D1Database;
  UPLOADS?: R2Bucket;
  JWT_SECRET?: string;
  ENVIRONMENT?: string;
  LARK_APP_ID?: string;
  LARK_APP_SECRET?: string;
  LARK_BASE_APP_TOKEN?: string;
  LARK_BASE_TABLE_ID?: string;
}

/**
 * Hono Context Variables
 * c.get() / c.set() で使用する変数の型定義
 */
export interface HonoVariables {
  user?: JWTPayload;
}
