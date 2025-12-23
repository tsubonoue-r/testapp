/**
 * Lark Base Integration API Routes for Hono
 * Lark Base統合 - 簡易版実装（環境変数がある場合のみ動作）
 */

import { Hono } from 'hono';
import { Env, HonoVariables } from '../worker-types.js';

const lark = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

/**
 * GET /api/lark/config
 * Lark Base設定情報を取得（デバッグ用）
 */
lark.get('/config', async (c) => {
  try {
    const hasAppId = !!c.env.LARK_APP_ID;
    const hasAppSecret = !!c.env.LARK_APP_SECRET;
    const hasAppToken = !!c.env.LARK_BASE_APP_TOKEN;
    const hasTableId = !!c.env.LARK_BASE_TABLE_ID;

    return c.json({
      success: true,
      data: {
        configured: hasAppId && hasAppSecret && hasAppToken && hasTableId,
        hasAppId,
        hasAppSecret,
        hasAppToken,
        hasTableId,
      },
    });
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'CONFIG_ERROR',
        message: error instanceof Error ? error.message : '設定の取得に失敗しました',
      },
    }, 500);
  }
});

/**
 * POST /api/lark/sync/project/:projectId
 * 案件データをLark Baseに同期（簡易版）
 */
lark.post('/sync/project/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId');

    // Lark設定が存在するか確認
    if (!c.env.LARK_APP_ID || !c.env.LARK_APP_SECRET) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_CONFIGURED',
          message: 'Lark API credentials not configured. Set LARK_APP_ID and LARK_APP_SECRET.',
        },
      }, 400);
    }

    // プロジェクトデータを取得
    const project = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ?'
    ).bind(projectId).first();

    if (!project) {
      return c.json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'プロジェクトが見つかりません',
        },
      }, 404);
    }

    // TODO: 実際のLark API呼び出し実装
    // LarkBaseServiceの実装が必要

    return c.json({
      success: true,
      data: {
        projectId,
        message: 'Lark統合は開発中です。完全な実装には LarkBaseService が必要です。',
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'SYNC_ERROR',
        message: error instanceof Error ? error.message : '同期に失敗しました',
      },
    }, 500);
  }
});

/**
 * POST /api/lark/upload/pdf
 * PDF写真台帳をLark Baseにアップロード（簡易版）
 */
lark.post('/upload/pdf', async (c) => {
  try {
    const body = await c.req.json<{
      projectId: string;
      pdfBase64: string;
      fileName: string;
      recordId?: string;
    }>();

    const { projectId, pdfBase64, fileName, recordId } = body;

    if (!pdfBase64 || !fileName) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'pdfBase64とfileNameは必須です',
        },
      }, 400);
    }

    // Lark設定が存在するか確認
    if (!c.env.LARK_APP_ID || !c.env.LARK_APP_SECRET) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_CONFIGURED',
          message: 'Lark API credentials not configured',
        },
      }, 400);
    }

    // TODO: 実際のLark API呼び出し実装
    // PDF upload機能の完全な実装が必要

    return c.json({
      success: true,
      data: {
        projectId,
        fileName,
        message: 'PDF Upload機能は開発中です',
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: error instanceof Error ? error.message : 'アップロードに失敗しました',
      },
    }, 500);
  }
});

/**
 * GET /api/lark/status/:projectId
 * 案件の同期ステータスを取得
 */
lark.get('/status/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId');

    // プロジェクトが存在するか確認
    const project = await c.env.DB.prepare(
      'SELECT id FROM projects WHERE id = ?'
    ).bind(projectId).first();

    if (!project) {
      return c.json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'プロジェクトが見つかりません',
        },
      }, 404);
    }

    // 仮実装 - 実際はDBに同期ステータスを保存して取得
    return c.json({
      success: true,
      data: {
        projectId,
        larkRecordId: null,
        lastSyncAt: null,
        syncStatus: 'pending',
      },
    });
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: error instanceof Error ? error.message : 'ステータス取得に失敗しました',
      },
    }, 500);
  }
});

export default lark;
