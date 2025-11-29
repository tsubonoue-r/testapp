import { Photo, PhotoLocation, PhotoMetadata } from '../types/index.js';
import { randomUUID } from 'crypto';

/**
 * 写真モデル
 */
export class PhotoModel {
  /**
   * 新しい写真を作成
   */
  static create(data: {
    projectId: string;
    signboardId?: string;
    filename: string;
    filepath: string;
    thumbnailPath?: string;
    caption?: string;
    location?: PhotoLocation;
    metadata: PhotoMetadata;
    takenAt?: Date;
  }): Photo {
    const now = new Date();

    return {
      id: randomUUID(),
      projectId: data.projectId,
      signboardId: data.signboardId,
      filename: data.filename,
      filepath: data.filepath,
      thumbnailPath: data.thumbnailPath,
      caption: data.caption,
      location: data.location,
      metadata: data.metadata,
      takenAt: data.takenAt || now,
      uploadedAt: now,
    };
  }

  /**
   * 写真を更新
   */
  static update(
    photo: Photo,
    updates: Partial<Omit<Photo, 'id' | 'projectId' | 'uploadedAt'>>
  ): Photo {
    return {
      ...photo,
      ...updates,
    };
  }

  /**
   * キャプションを更新
   */
  static updateCaption(photo: Photo, caption: string): Photo {
    return this.update(photo, { caption });
  }

  /**
   * 位置情報を更新
   */
  static updateLocation(photo: Photo, location: PhotoLocation): Photo {
    return this.update(photo, { location });
  }

  /**
   * 工事看板に関連付け
   */
  static attachToSignboard(photo: Photo, signboardId: string): Photo {
    return this.update(photo, { signboardId });
  }

  /**
   * 工事看板との関連付けを解除
   */
  static detachFromSignboard(photo: Photo): Photo {
    return this.update(photo, { signboardId: undefined });
  }

  /**
   * バリデーション
   */
  static validate(data: Partial<Photo>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.filename && data.filename.trim().length === 0) {
      errors.push('ファイル名は必須です');
    }

    if (data.filepath && data.filepath.trim().length === 0) {
      errors.push('ファイルパスは必須です');
    }

    if (data.metadata) {
      if (data.metadata.width <= 0 || data.metadata.height <= 0) {
        errors.push('画像サイズが不正です');
      }

      if (data.metadata.size <= 0) {
        errors.push('ファイルサイズが不正です');
      }

      const validFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      if (!validFormats.includes(data.metadata.format.toLowerCase())) {
        errors.push(`サポートされていない画像形式です: ${data.metadata.format}`);
      }
    }

    if (data.location) {
      if (data.location.latitude < -90 || data.location.latitude > 90) {
        errors.push('緯度が不正です（-90〜90の範囲）');
      }

      if (data.location.longitude < -180 || data.location.longitude > 180) {
        errors.push('経度が不正です（-180〜180の範囲）');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * ファイルサイズを人間が読みやすい形式に変換
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}
