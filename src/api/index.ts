/**
 * 工事看板写真システム API
 *
 * シンプルなAPIインターフェース
 */

import { ProjectService } from '../services/ProjectService.js';
import { SignboardService } from '../services/SignboardService.js';
import { PhotoService } from '../services/PhotoService.js';

export class ConstructionSignboardAPI {
  readonly projects: ProjectService;
  readonly signboards: SignboardService;
  readonly photos: PhotoService;

  constructor() {
    this.projects = new ProjectService();
    this.signboards = new SignboardService();
    this.photos = new PhotoService();
  }

  /**
   * APIの初期化とヘルスチェック
   */
  health(): { status: string; timestamp: Date } {
    return {
      status: 'ok',
      timestamp: new Date(),
    };
  }

  /**
   * APIのバージョン情報
   */
  version(): { version: string; name: string } {
    return {
      name: '工事看板写真システム',
      version: '1.0.0',
    };
  }
}
