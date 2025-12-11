/**
 * Lark Base Integration API Routes
 *
 * - POST /api/lark/sync/project/:projectId - 案件データをLark Baseに同期
 * - POST /api/lark/upload/pdf - PDF写真台帳をLark Baseにアップロード
 * - GET  /api/lark/status/:projectId - 案件の同期ステータスを取得
 */

import { Router, Request, Response } from 'express';
import { LarkBaseService } from '../services/LarkBaseService.js';
import { ProjectSyncConfig } from '../types/lark.js';

const router = Router();

// Lark Base Service インスタンス
let larkService: LarkBaseService | null = null;

/**
 * Lark Base Service を初期化
 */
function getLarkService(): LarkBaseService {
  if (!larkService) {
    const appId = process.env.LARK_APP_ID;
    const appSecret = process.env.LARK_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error('Lark API credentials not configured. Set LARK_APP_ID and LARK_APP_SECRET.');
    }

    larkService = new LarkBaseService({
      appId,
      appSecret,
    });
  }

  return larkService;
}

/**
 * 同期設定を取得（環境変数から）
 */
function getSyncConfig(): ProjectSyncConfig {
  const appToken = process.env.LARK_BASE_APP_TOKEN;
  const tableId = process.env.LARK_BASE_TABLE_ID;

  if (!appToken || !tableId) {
    throw new Error('Lark Base table not configured. Set LARK_BASE_APP_TOKEN and LARK_BASE_TABLE_ID.');
  }

  return {
    table: {
      appToken,
      tableId,
    },
    fieldMapping: {
      projectName: process.env.LARK_FIELD_PROJECT_NAME || 'project_name',
      description: process.env.LARK_FIELD_DESCRIPTION || 'description',
      location: process.env.LARK_FIELD_LOCATION || 'location',
      startDate: process.env.LARK_FIELD_START_DATE || 'start_date',
      endDate: process.env.LARK_FIELD_END_DATE || 'end_date',
      status: process.env.LARK_FIELD_STATUS || 'status',
      photoLedgerPdf: process.env.LARK_FIELD_PDF || 'photo_ledger_pdf',
    },
  };
}

/**
 * POST /api/lark/sync/project/:projectId
 * 案件データをLark Baseに同期
 */
router.post('/sync/project/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { larkRecordId } = req.body; // 既存レコードIDがあれば更新

    // プロジェクトデータを取得（仮実装 - 実際はDBから取得）
    const projectData = {
      id: projectId,
      name: 'サンプル案件',
      description: 'これはテスト案件です',
      location: '東京都渋谷区',
      startDate: new Date(),
      status: 'active',
    };

    const service = getLarkService();
    const syncConfig = getSyncConfig();

    const result = await service.syncProjectToLark(projectData, syncConfig, larkRecordId);

    res.json({
      success: true,
      data: {
        projectId,
        larkRecordId: result.record.recordId,
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Lark sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/lark/upload/pdf
 * PDF写真台帳をLark Baseにアップロード
 */
router.post('/upload/pdf', async (req: Request, res: Response) => {
  try {
    const { projectId, pdfBase64, fileName, recordId } = req.body;

    if (!pdfBase64 || !fileName) {
      return res.status(400).json({
        success: false,
        error: 'pdfBase64 and fileName are required',
      });
    }

    // Base64をBufferに変換
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    const service = getLarkService();
    const syncConfig = getSyncConfig();

    if (!syncConfig.fieldMapping.photoLedgerPdf) {
      return res.status(400).json({
        success: false,
        error: 'PDF field not configured in Lark Base table',
      });
    }

    const result = await service.uploadPdfToRecord(
      syncConfig.table,
      {
        projectId,
        pdfBuffer,
        fileName,
        recordId,
      },
      syncConfig.fieldMapping.photoLedgerPdf
    );

    res.json({
      success: true,
      data: {
        projectId,
        larkRecordId: result.record.recordId,
        fileName,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('PDF upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/lark/status/:projectId
 * 案件の同期ステータスを取得
 */
router.get('/status/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // 仮実装 - 実際はDBから同期ステータスを取得
    res.json({
      success: true,
      data: {
        projectId,
        larkRecordId: null,
        lastSyncAt: null,
        syncStatus: 'pending',
      },
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/lark/config
 * Lark Base設定情報を取得（デバッグ用）
 */
router.get('/config', (req: Request, res: Response) => {
  try {
    const hasAppId = !!process.env.LARK_APP_ID;
    const hasAppSecret = !!process.env.LARK_APP_SECRET;
    const hasAppToken = !!process.env.LARK_BASE_APP_TOKEN;
    const hasTableId = !!process.env.LARK_BASE_TABLE_ID;

    res.json({
      success: true,
      data: {
        configured: hasAppId && hasAppSecret && hasAppToken && hasTableId,
        hasAppId,
        hasAppSecret,
        hasAppToken,
        hasTableId,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
