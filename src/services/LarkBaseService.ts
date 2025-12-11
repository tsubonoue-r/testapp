/**
 * Lark Base API Service
 *
 * Lark Base (Feishu Base) との連携を担当するサービスクラス
 * - 認証トークン管理
 * - レコードCRUD操作
 * - ファイルアップロード
 */

import {
  LarkConfig,
  LarkAccessToken,
  LarkBaseTable,
  LarkBaseRecord,
  LarkApiResponse,
  LarkRecordResponse,
  LarkRecordsResponse,
  LarkAttachment,
  PdfUploadOptions,
  ProjectSyncConfig,
} from '../types/lark.js';

export class LarkBaseService {
  private config: LarkConfig;
  private accessToken: LarkAccessToken | null = null;
  private readonly BASE_URL = 'https://open.feishu.cn/open-apis';

  constructor(config: LarkConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || this.BASE_URL,
    };
  }

  /**
   * アクセストークンを取得 (tenant_access_token)
   */
  private async getAccessToken(): Promise<string> {
    // トークンがキャッシュされていて、有効期限内なら再利用
    if (this.accessToken && Date.now() < this.accessToken.expiresAt) {
      return this.accessToken.accessToken;
    }

    // 新しいトークンを取得
    const response = await fetch(`${this.config.baseUrl}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: this.config.appId,
        app_secret: this.config.appSecret,
      }),
    });

    const data = (await response.json()) as LarkApiResponse<{
      tenant_access_token: string;
      expire: number;
    }>;

    if (data.code !== 0) {
      throw new Error(`Lark認証エラー: ${data.msg}`);
    }

    // トークンをキャッシュ (有効期限の90%で更新)
    const expiresIn = data.data.expire * 1000;
    this.accessToken = {
      accessToken: data.data.tenant_access_token,
      expiresIn,
      expiresAt: Date.now() + expiresIn * 0.9,
    };

    return this.accessToken.accessToken;
  }

  /**
   * APIリクエストヘッダーを生成
   */
  private async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Lark Base レコードを作成
   */
  async createRecord(
    table: LarkBaseTable,
    record: LarkBaseRecord
  ): Promise<LarkRecordResponse> {
    const headers = await this.getHeaders();
    const url = `${this.config.baseUrl}/bitable/v1/apps/${table.appToken}/tables/${table.tableId}/records`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ fields: record.fields }),
    });

    const data = (await response.json()) as LarkApiResponse<LarkRecordResponse>;

    if (data.code !== 0) {
      throw new Error(`Lark Base レコード作成エラー: ${data.msg}`);
    }

    return data.data;
  }

  /**
   * Lark Base レコードを更新
   */
  async updateRecord(
    table: LarkBaseTable,
    recordId: string,
    fields: Record<string, any>
  ): Promise<LarkRecordResponse> {
    const headers = await this.getHeaders();
    const url = `${this.config.baseUrl}/bitable/v1/apps/${table.appToken}/tables/${table.tableId}/records/${recordId}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ fields }),
    });

    const data = (await response.json()) as LarkApiResponse<LarkRecordResponse>;

    if (data.code !== 0) {
      throw new Error(`Lark Base レコード更新エラー: ${data.msg}`);
    }

    return data.data;
  }

  /**
   * Lark Base レコードを取得
   */
  async getRecord(table: LarkBaseTable, recordId: string): Promise<LarkBaseRecord> {
    const headers = await this.getHeaders();
    const url = `${this.config.baseUrl}/bitable/v1/apps/${table.appToken}/tables/${table.tableId}/records/${recordId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = (await response.json()) as LarkApiResponse<{
      record: { recordId: string; fields: Record<string, any> };
    }>;

    if (data.code !== 0) {
      throw new Error(`Lark Base レコード取得エラー: ${data.msg}`);
    }

    return {
      recordId: data.data.record.recordId,
      fields: data.data.record.fields,
    };
  }

  /**
   * Lark Base レコード一覧を取得
   */
  async listRecords(
    table: LarkBaseTable,
    options?: {
      pageSize?: number;
      pageToken?: string;
      filter?: string;
    }
  ): Promise<LarkRecordsResponse> {
    const headers = await this.getHeaders();
    const params = new URLSearchParams();

    if (options?.pageSize) params.append('page_size', options.pageSize.toString());
    if (options?.pageToken) params.append('page_token', options.pageToken);
    if (options?.filter) params.append('filter', options.filter);

    const url = `${this.config.baseUrl}/bitable/v1/apps/${table.appToken}/tables/${table.tableId}/records?${params}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = (await response.json()) as LarkApiResponse<LarkRecordsResponse>;

    if (data.code !== 0) {
      throw new Error(`Lark Base レコード一覧取得エラー: ${data.msg}`);
    }

    return data.data;
  }

  /**
   * ファイルをLarkにアップロード
   */
  async uploadFile(file: Buffer, fileName: string, fileType: string): Promise<string> {
    const token = await this.getAccessToken();
    const url = `${this.config.baseUrl}/drive/v1/medias/upload_all`;

    const formData = new FormData();
    formData.append('file_name', fileName);
    formData.append('parent_type', 'bitable_file');
    formData.append('parent_node', 'bitable');
    formData.append('size', file.length.toString());
    formData.append('file', new Blob([file], { type: fileType }), fileName);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = (await response.json()) as LarkApiResponse<{ file_token: string }>;

    if (data.code !== 0) {
      throw new Error(`ファイルアップロードエラー: ${data.msg}`);
    }

    return data.data.file_token;
  }

  /**
   * PDFを直接Lark Baseの添付ファイルフィールドにアップロード
   */
  async uploadPdfToRecord(
    table: LarkBaseTable,
    options: PdfUploadOptions,
    attachmentFieldId: string
  ): Promise<LarkRecordResponse> {
    // 1. PDFファイルをLarkにアップロード
    const fileToken = await this.uploadFile(options.pdfBuffer, options.fileName, 'application/pdf');

    // 2. 添付ファイルフィールドを更新
    const attachmentData = [
      {
        file_token: fileToken,
        name: options.fileName,
        type: 'pdf',
      },
    ];

    if (options.recordId) {
      // 既存レコードに追加
      return await this.updateRecord(table, options.recordId, {
        [attachmentFieldId]: attachmentData,
      });
    } else {
      // 新規レコード作成
      return await this.createRecord(table, {
        fields: {
          [attachmentFieldId]: attachmentData,
        },
      });
    }
  }

  /**
   * 案件データをLark Baseに同期
   */
  async syncProjectToLark(
    projectData: {
      id: string;
      name: string;
      description?: string;
      location: string;
      startDate: Date;
      endDate?: Date;
      status: string;
    },
    syncConfig: ProjectSyncConfig,
    existingRecordId?: string
  ): Promise<LarkRecordResponse> {
    const fields: Record<string, any> = {
      [syncConfig.fieldMapping.projectName]: projectData.name,
      [syncConfig.fieldMapping.description]: projectData.description || '',
      [syncConfig.fieldMapping.location]: projectData.location,
      [syncConfig.fieldMapping.startDate]: projectData.startDate.getTime(),
      [syncConfig.fieldMapping.status]: projectData.status,
    };

    if (projectData.endDate) {
      fields[syncConfig.fieldMapping.endDate] = projectData.endDate.getTime();
    }

    if (existingRecordId) {
      // 既存レコード更新
      return await this.updateRecord(syncConfig.table, existingRecordId, fields);
    } else {
      // 新規レコード作成
      return await this.createRecord(syncConfig.table, { fields });
    }
  }
}
