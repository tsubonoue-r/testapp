/**
 * Lark Base API Type Definitions
 *
 * Lark Base (Feishu Base) integration types for project data sync
 * and PDF upload functionality.
 */

/**
 * Lark API認証設定
 */
export interface LarkConfig {
  appId: string;
  appSecret: string;
  baseUrl?: string;
}

/**
 * Lark API認証トークン
 */
export interface LarkAccessToken {
  accessToken: string;
  expiresIn: number;
  expiresAt: number;
}

/**
 * Lark Baseテーブル設定
 */
export interface LarkBaseTable {
  appToken: string;  // Base ID
  tableId: string;   // Table ID
}

/**
 * Lark Base レコード
 */
export interface LarkBaseRecord {
  recordId?: string;
  fields: Record<string, any>;
}

/**
 * 案件データ同期設定
 */
export interface ProjectSyncConfig {
  table: LarkBaseTable;
  fieldMapping: {
    projectName: string;      // 案件名フィールドID
    description: string;      // 説明フィールドID
    location: string;         // 場所フィールドID
    startDate: string;        // 開始日フィールドID
    endDate: string;          // 終了日フィールドID
    status: string;           // ステータスフィールドID
    photoLedgerPdf?: string;  // 写真台帳PDFフィールドID (添付ファイル型)
  };
}

/**
 * PDF添付ファイル情報
 */
export interface LarkAttachment {
  fileName: string;
  fileType: string;
  fileToken?: string;
  url?: string;
}

/**
 * Lark API レスポンス (共通)
 */
export interface LarkApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

/**
 * Lark Base レコード作成/更新レスポンス
 */
export interface LarkRecordResponse {
  record: {
    recordId: string;
    fields: Record<string, any>;
  };
}

/**
 * Lark Base レコード一覧レスポンス
 */
export interface LarkRecordsResponse {
  hasMore: boolean;
  pageToken?: string;
  total: number;
  items: Array<{
    recordId: string;
    fields: Record<string, any>;
  }>;
}

/**
 * 同期ステータス
 */
export interface SyncStatus {
  projectId: string;
  larkRecordId?: string;
  lastSyncAt: Date;
  syncStatus: 'pending' | 'syncing' | 'success' | 'failed';
  errorMessage?: string;
}

/**
 * PDF アップロードオプション
 */
export interface PdfUploadOptions {
  projectId: string;
  pdfBuffer: Buffer;
  fileName: string;
  recordId?: string; // 既存レコードに追加する場合
}
