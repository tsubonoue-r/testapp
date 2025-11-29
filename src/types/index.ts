/**
 * 工事看板写真システム - 型定義
 */

/**
 * 案件（プロジェクト）
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  location: string;
  startDate: Date;
  endDate?: Date;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 案件ステータス
 */
export enum ProjectStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * 工事看板
 */
export interface Signboard {
  id: string;
  projectId: string;
  title: string;
  content: SignboardContent;
  template: SignboardTemplate;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 工事看板の内容
 */
export interface SignboardContent {
  projectName: string;
  constructionPeriod: string;
  contractor: string;
  supervisor?: string;
  contact?: string;
  customFields?: Record<string, string>;
}

/**
 * 工事看板テンプレート
 */
export enum SignboardTemplate {
  STANDARD = 'standard',
  DETAILED = 'detailed',
  SIMPLE = 'simple',
  CUSTOM = 'custom',
}

/**
 * 写真
 */
export interface Photo {
  id: string;
  projectId: string;
  signboardId?: string;
  filename: string;
  filepath: string;
  thumbnailPath?: string;
  caption?: string;
  location?: PhotoLocation;
  metadata: PhotoMetadata;
  takenAt: Date;
  uploadedAt: Date;
}

/**
 * 写真の位置情報
 */
export interface PhotoLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

/**
 * 写真のメタデータ
 */
export interface PhotoMetadata {
  width: number;
  height: number;
  size: number;
  format: string;
  deviceInfo?: string;
}

/**
 * API レスポンス
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

/**
 * API エラー
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * ページネーション
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * リスト結果
 */
export interface ListResult<T> {
  items: T[];
  pagination: Pagination;
}

/**
 * ユーザー
 */
export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ユーザーロール
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

/**
 * JWT ペイロード
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}
